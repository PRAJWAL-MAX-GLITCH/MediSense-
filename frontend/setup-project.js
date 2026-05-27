#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

// Files to create with their content
const files = {
  // Layout and main pages
  'src/app/layout.tsx': `import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'MediSense AI',
  description: 'Advanced AI Health Assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen bg-dark-bg text-white">
        <Sidebar />
        {children}
      </body>
    </html>
  )
}`,

  'src/app/page.tsx': `'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'

export default function Home() {
  return <ChatInterface />
}`,

  'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  transition: colors 0.2s;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #0a0e27;
  color: white;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1f3a;
}

::-webkit-scrollbar-thumb {
  background: #2d3248;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.gradient-text {
  background: linear-gradient(to right, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chat-bubble {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.3s ease-in-out;
}

.chat-bubble:hover {
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typing {
  0%, 10%, 20%, 50%, 60%, 100% {
    opacity: 0.4;
  }
  30%, 40%, 90% {
    opacity: 1;
  }
}

.typing span {
  animation: typing 1.4s infinite;
}

.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing span:nth-child(3) {
  animation-delay: 0.4s;
}`,
};

// Create directories
const dirs = [
  'src/app',
  'src/components/chat',
  'src/components/sidebar',
  'src/components/ui',
  'src/components/input',
  'src/hooks',
  'src/lib',
  'src/types',
  'public',
];

dirs.forEach(dir => {
  const fullPath = path.join(BASE_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(\`✓ Created directory: \${dir}\`);
  }
});

// Create files
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(BASE_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(\`✓ Created file: \${filePath}\`);
  }
});

console.log('\\n✅ Setup complete! Run: npm install');
`,
  'src/types/chat.ts': `export interface Message {
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

export interface AnalysisResponse {
  response: string
  sources?: string[]
}`,

  'src/lib/api.ts': `import axios from 'axios'
import type { AnalysisResponse } from '@/types/chat'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

export async function analyzeSymptoms(symptoms: string): Promise<AnalysisResponse> {
  const response = await api.post('/analyze', {
    symptoms: symptoms.trim(),
  })
  return response.data
}

export async function* analyzeWithStream(symptoms: string) {
  const response = await fetch(\`\${API_URL}/analyze\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symptoms: symptoms.trim() }),
  })

  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}\`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield decoder.decode(value)
    }
  } finally {
    reader.releaseLock()
  }
}`,

  'src/hooks/useChat.ts': `'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, ChatSession } from '@/types/chat'
import { analyzeSymptoms } from '@/lib/api'

const STORAGE_KEY = 'medisense_chats'

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setSessions(JSON.parse(saved))
    } else {
      createNewChat()
    }
  }, [])

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const getCurrentSession = useCallback(
    () => sessions.find(s => s.id === currentSessionId),
    [sessions, currentSessionId]
  )

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
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentSessionId || !content.trim()) return

      setIsLoading(true)
      const session = getCurrentSession()
      if (!session) return

      // Add user message
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

      scrollToBottom()

      try {
        // Stream the response
        const response = await analyzeSymptoms(content.trim())
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          sources: response.sources,
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

        // Update session title if it's the first message
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
        console.error('Failed to get response:', error)
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
    [currentSessionId, getCurrentSession, scrollToBottom]
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

  const clearAllChats = useCallback(() => {
    if (confirm('Are you sure you want to delete all chats?')) {
      setSessions([])
      createNewChat()
    }
  }, [createNewChat])

  return {
    sessions,
    currentSessionId,
    currentSession: getCurrentSession(),
    isLoading,
    messagesEndRef,
    createNewChat,
    sendMessage,
    deleteChat,
    clearAllChats,
    setCurrentSessionId,
  }
}`,

  'src/components/chat/ChatInterface.tsx': `'use client'

import { useState, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'

export function ChatInterface() {
  const { currentSession, isLoading, messagesEndRef, sendMessage } = useChat()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !currentSession) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages Area */}
      <ChatMessages messages={currentSession.messages} />

      {/* Typing Indicator */}
      {isLoading && <TypingIndicator />}

      {/* Input Area */}
      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}`,

  'src/components/chat/ChatMessages.tsx': `'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/types/chat'
import { ChatBubble } from './ChatBubble'

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages])

  return (
    <div
      ref={scrollAreaRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-8"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message, index) => (
          <ChatBubble key={message.id || index} message={message} />
        ))}
      </div>
    </div>
  )
}`,

  'src/components/chat/ChatBubble.tsx': `'use client'

import { motion } from 'framer-motion'
import type { Message } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  message: Message
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-md rounded-lg px-4 py-3 chat-bubble',
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            : 'glass bg-dark-secondary/50'
        )}
      >
        <p className="text-sm leading-relaxed md:text-base">{message.content}</p>
        <p className="mt-2 text-xs opacity-70">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}`,

  'src/components/chat/TypingIndicator.tsx': `'use client'

import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex justify-start px-4 py-2 md:px-8"
    >
      <div className="glass max-w-md rounded-lg px-4 py-3">
        <div className="typing flex gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
        </div>
      </div>
    </motion.div>
  )
}`,

  'src/components/chat/ChatInput.tsx': `'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, X } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isListening, setIsListening] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    // Auto expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newRows = Math.min(
        Math.ceil(textareaRef.current.scrollHeight / 24),
        5
      )
      setRows(newRows)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput('')
      setRows(1)
    }
  }

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
      setInput(transcript)
    }

    recognition.onerror = () => {
      console.error('Speech recognition error')
      setIsListening(false)
    }

    recognition.start()
  }

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t border-dark-tertiary/50 px-4 py-4 md:px-8"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-3">
          {/* Voice Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleVoiceInput}
            disabled={isLoading}
            className="mt-2 flex items-center justify-center rounded-lg bg-dark-secondary p-2 hover:bg-dark-tertiary disabled:opacity-50"
            title="Voice input"
          >
            {isListening ? (
              <X className="h-5 w-5 text-red-500" />
            ) : (
              <Mic className="h-5 w-5 text-gray-400" />
            )}
          </motion.button>

          {/* Text Input */}
          <div className="flex-1 rounded-lg glass p-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as any)
                }
              }}
              placeholder="Ask about your symptoms..."
              rows={rows}
              disabled={isLoading}
              className="w-full resize-none bg-transparent outline-none placeholder:text-gray-500 disabled:opacity-50"
            />
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!input.trim() || isLoading}
            className="mt-2 flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-2 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </motion.button>
        </form>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-500">
          MediSense AI provides general guidance. It is NOT a diagnostic tool. In emergencies, call 911.
        </p>
      </div>
    </motion.div>
  )
}`,

  'src/components/sidebar/Sidebar.tsx': `'use client'

import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatHistory } from './ChatHistory'
import { Plus, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function Sidebar() {
  const { createNewChat, sessions, currentSessionId, setCurrentSessionId } = useChat()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 md:hidden"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: -250 }}
        animate={{ x: isOpen ? 0 : -250 }}
        exit={{ x: -250 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-dark-tertiary/50 bg-dark-secondary md:relative md:translate-x-0"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-dark-tertiary/50 p-4">
            <button
              onClick={() => {
                createNewChat()
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 font-medium hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="h-5 w-5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat History */}
          <ChatHistory
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={sessionId => {
              setCurrentSessionId(sessionId)
              setIsOpen(false)
            }}
          />
        </div>
      </motion.div>
    </>
  )
}`,

  'src/components/sidebar/ChatHistory.tsx': `'use client'

import { motion } from 'framer-motion'
import type { ChatSession } from '@/types/chat'
import { Trash2 } from 'lucide-react'
import { useChat } from '@/hooks/useChat'

interface ChatHistoryProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export function ChatHistory({
  sessions,
  currentSessionId,
  onSelectSession,
}: ChatHistoryProps) {
  const { deleteChat } = useChat()

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2 p-4">
        {sessions.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No chats yet</p>
        ) : (
          sessions.map(session => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group flex items-center gap-2"
            >
              <button
                onClick={() => onSelectSession(session.id)}
                className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors \${
                  currentSessionId === session.id
                    ? 'bg-dark-tertiary text-white'
                    : 'text-gray-400 hover:bg-dark-tertiary/50'
                }`}
              >
                {session.title}
              </button>
              <button
                onClick={() => deleteChat(session.id)}
                className="rounded p-1 opacity-0 hover:bg-red-500/20 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}`,

  'src/lib/utils.ts': `export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}`,

  '.env.local': `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`,
};

// Create all files
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(BASE_DIR, filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(\`✓ Created: \${filePath}\`);
});

console.log('\\n✅ All files created successfully!');
`,
};

// Call this with node setup-project.js
console.log('Save this as setup-project.js and run with: node setup-project.js');
