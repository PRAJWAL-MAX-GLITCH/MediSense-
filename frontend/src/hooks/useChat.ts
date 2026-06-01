'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  parsed?: any
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = 'medisense_chats'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hello! I am your AI health assistant.\nDescribe your symptoms to get started.',
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    return newSession
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const restored = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }))
        setSessions(restored)
        setCurrentSessionId(restored[0]?.id ?? null)
      } catch {
        createNewChat()
      }
    } else {
      createNewChat()
    }
  }, [])

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions, isLoading])

  const getCurrentSession = useCallback(
    () => sessions.find(s => s.id === currentSessionId),
    [sessions, currentSessionId]
  )

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    setIsLoading(true)

    let activeSessionId = currentSessionId
    const cleanContent = content.trim()

    // Dynamically create a new session if none is currently active
    if (!activeSessionId) {
      const newId = Date.now().toString()
      const newSession: ChatSession = {
        id: newId,
        title: cleanContent.substring(0, 35) + '...',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setSessions(prev => [newSession, ...prev])
      setCurrentSessionId(newId)
      activeSessionId = newId
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cleanContent,
      timestamp: new Date(),
    }

    const targetSessionId = activeSessionId

    setSessions(prev => prev.map(s =>
      s.id === targetSessionId
        ? { ...s, messages: [...s.messages, userMsg], updatedAt: new Date() }
        : s
    ))

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: cleanContent }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      let parsed: any = null
      try { parsed = JSON.parse(data.response) } catch { parsed = null }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        parsed,
      }

      setSessions(prev => prev.map(s =>
        s.id === targetSessionId
          ? {
              ...s,
              messages: [...s.messages, assistantMsg],
              title: s.title === 'New Chat' || s.title.includes('...') ? cleanContent.substring(0, 35) + '...' : s.title,
              updatedAt: new Date(),
            }
          : s
      ))
    } catch (err) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: JSON.stringify({ type: 'general', answer: '❌ Could not connect to backend. Make sure the Python server is running on port 8000.' }),
        timestamp: new Date(),
      }
      setSessions(prev => prev.map(s =>
        s.id === targetSessionId
          ? { ...s, messages: [...s.messages, errMsg], updatedAt: new Date() }
          : s
      ))
    } finally {
      setIsLoading(false)
    }
  }, [currentSessionId])

  const deleteChat = useCallback((sessionId: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId)
      if (currentSessionId === sessionId) {
        setCurrentSessionId(remaining[0]?.id ?? null)
      }
      return remaining
    })
  }, [currentSessionId])

  return {
    sessions,
    currentSessionId,
    currentSession: getCurrentSession(),
    isLoading,
    messagesEndRef,
    createNewChat,
    sendMessage,
    deleteChat,
    setCurrentSessionId,
  }
}
