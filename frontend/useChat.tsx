'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  sources?: string[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = 'medisense_chats'

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      setSessions(parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      })))
    } else {
      createNewChat()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: '👋 Hello! I am your AI health assistant. Describe your symptoms to get started.',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    return newSession
  }, [])

  const getCurrentSession = useCallback(
    () => sessions.find(s => s.id === currentSessionId),
    [sessions, currentSessionId]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentSessionId || !content.trim()) return

      setIsLoading(true)
      const session = getCurrentSession()
      if (!session) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: [...s.messages, userMessage],
                updatedAt: new Date(),
              }
            : s
        )
      )

      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
        ).then(() => {})
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
        const res = await fetch(`${apiUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symptoms: content.trim() }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.message || 'No response',
          timestamp: new Date(),
        }

        setSessions(prev =>
          prev.map(s =>
            s.id === currentSessionId
              ? {
                  ...s,
                  messages: [...s.messages, assistantMessage],
                  updatedAt: new Date(),
                }
              : s
          )
        )

        if (session.messages.length === 1) {
          setSessions(prev =>
            prev.map(s =>
              s.id === currentSessionId
                ? { ...s, title: content.trim().substring(0, 30) + '...' }
                : s
            )
          )
        }
      } catch (error) {
        console.error('Failed:', error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Failed to get response. Please try again.',
          timestamp: new Date(),
        }
        setSessions(prev =>
          prev.map(s =>
            s.id === currentSessionId
              ? {
                  ...s,
                  messages: [...s.messages, errorMessage],
                  updatedAt: new Date(),
                }
              : s
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [currentSessionId, getCurrentSession]
  )

  const deleteChat = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId)
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id)
      } else {
        createNewChat()
      }
    }
  }, [currentSessionId, sessions, createNewChat])

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
