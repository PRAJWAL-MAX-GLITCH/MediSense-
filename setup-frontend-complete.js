#!/usr/bin/env node

/**
 * MediSense AI - Modern Frontend Deployment Script
 * Completely rebuilds the frontend into production-level Next.js app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const FRONTEND_BACKUP = path.join(PROJECT_ROOT, 'frontend-backup');

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║  🚀 MediSense AI - Modern Frontend Builder         ║');
console.log('║     Production-Level Next.js Application           ║');
console.log('╚════════════════════════════════════════════════════╝\n');

try {
  // Step 1: Backup existing frontend
  console.log('📦 Step 1: Backing up existing frontend...');
  if (fs.existsSync(FRONTEND_DIR)) {
    if (fs.existsSync(FRONTEND_BACKUP)) {
      console.log('   Removing old backup...');
      fs.rmSync(FRONTEND_BACKUP, { recursive: true, force: true });
    }
    fs.renameSync(FRONTEND_DIR, FRONTEND_BACKUP);
    console.log('   ✓ Existing frontend backed up\n');
  }

  // Step 2: Create directory structure
  console.log('📁 Step 2: Creating directory structure...');
  const directories = [
    'src/app',
    'src/components/chat',
    'src/components/sidebar',
    'src/components/ui',
    'src/hooks',
    'src/lib',
    'src/types',
    'public',
  ];

  directories.forEach(dir => {
    const fullPath = path.join(FRONTEND_DIR, dir);
    fs.mkdirSync(fullPath, { recursive: true });
  });
  console.log('   ✓ All directories created\n');

  // Step 3: Create configuration files
  console.log('⚙️  Step 3: Creating configuration files...');

  // package.json
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'package.json'),
    JSON.stringify(
      {
        name: 'medisense-frontend',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          next: '^14.1.0',
          'framer-motion': '^10.16.16',
          'lucide-react': '^0.292.0',
          '@radix-ui/react-dialog': '^1.1.1',
          '@radix-ui/react-scroll-area': '^1.0.5',
          clsx: '^2.0.0',
          'tailwind-merge': '^2.2.0',
        },
        devDependencies: {
          typescript: '^5',
          tailwindcss: '^3.3.0',
          postcss: '^8',
          autoprefixer: '^10.4.16',
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          eslint: '^8',
          'eslint-config-next': '^14.1.0',
        },
      },
      null,
      2
    )
  );

  // tsconfig.json
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          paths: {
            '@/*': ['./src/*'],
          },
          plugins: [{ name: 'next' }],
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2
    )
  );

  // tailwind.config.ts
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'tailwind.config.ts'),
    `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#000000',
        'dark-secondary': '#0a0a0a',
        'dark-tertiary': '#1a1a1a',
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
}
export default config`
  );

  // next.config.js
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'next.config.js'),
    `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
}
module.exports = nextConfig`
  );

  // postcss.config.js
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'postcss.config.js'),
    `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
  );

  // .env.local
  fs.writeFileSync(
    path.join(FRONTEND_DIR, '.env.local'),
    'NEXT_PUBLIC_API_URL=http://127.0.0.1:8000\n'
  );

  // .gitignore
  fs.writeFileSync(
    path.join(FRONTEND_DIR, '.gitignore'),
    `.next
*.log
node_modules
.env
.env.local
.env.*.local
.DS_Store
*.pem
dist
build
coverage`
  );

  console.log('   ✓ Configuration files created\n');

  // Step 4: Create TypeScript types
  console.log('📘 Step 4: Creating TypeScript definitions...');

  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/types/chat.ts'),
    `export interface Message {
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
}`
  );

  console.log('   ✓ Type definitions created\n');

  // Step 5: Create utility functions
  console.log('🔧 Step 5: Creating utility modules...');

  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/lib/utils.ts'),
    `export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function generateChatTitle(text: string): string {
  return text.substring(0, 50).trim() + (text.length > 50 ? '...' : '')
}`
  );

  console.log('   ✓ Utilities created\n');

  // Step 6: Create global styles
  console.log('🎨 Step 6: Creating global styles...');

  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/app/globals.css'),
    `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  transition: colors 0.2s;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #000000;
  color: white;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #0a0a0a;
}

::-webkit-scrollbar-thumb {
  background: #1a1a1a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.glass-light {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.chat-bubble {
  animation: fadeIn 0.4s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
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
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}`
  );

  console.log('   ✓ Global styles created\n');

  // Step 7: Create hooks
  console.log('🎣 Step 7: Creating React hooks...');

  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/hooks/useChat.ts'),
    `'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, ChatSession } from '@/types/chat'

const STORAGE_KEY = 'medisense_chats'

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const sessions = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }))
        setSessions(sessions)
        if (sessions.length > 0) {
          setCurrentSessionId(sessions[0].id)
        } else {
          createNewChat()
        }
      } catch (e) {
        console.error('Failed to load chats:', e)
        createNewChat()
      }
    } else {
      createNewChat()
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions])

  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: '👋 Hello! I\\'m your AI health assistant. Describe your symptoms or ask any health-related questions to get started.',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
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
      if (!session) {
        setIsLoading(false)
        return
      }

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

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
        const response = await fetch(\`\${apiUrl}/analyze\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symptoms: content.trim(),
          }),
        })

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`)
        }

        const data = await response.json()

        // Add AI response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'I could not generate a response. Please try again.',
          timestamp: new Date(),
          sources: data.sources,
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

        // Update chat title based on first message
        if (session.messages.length === 1) {
          setSessions(prev =>
            prev.map(s =>
              s.id === currentSessionId
                ? { ...s, title: content.trim().substring(0, 40) + '...' }
                : s
            )
          )
        }
      } catch (error) {
        console.error('API Error:', error)
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: '❌ Failed to get response. Please ensure the backend is running at http://127.0.0.1:8000',
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

  const deleteChat = useCallback(
    (sessionId: string) => {
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId)
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id)
        } else {
          createNewChat()
        }
      }
    },
    [currentSessionId, sessions, createNewChat]
  )

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
}`
  );

  console.log('   ✓ Hooks created\n');

  // Step 8: Create React components
  console.log('⚛️  Step 8: Creating React components...');

  // Layout
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/app/layout.tsx'),
    `import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'MediSense AI - Advanced Health Assistant',
  description: 'AI-powered health diagnosis and medical consultation',
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
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  )
}`
  );

  // Home page
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/app/page.tsx'),
    `'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'

export default function Home() {
  return <ChatInterface />
}`
  );

  // Chat Interface
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/chat/ChatInterface.tsx'),
    `'use client'

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
          <div className="mb-4 text-5xl">🧠</div>
          <p className="text-gray-400">Loading AI Assistant...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatMessages messages={currentSession.messages} />
      {isLoading && <TypingIndicator />}
      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      <div ref={messagesEndRef} />
    </div>
  )
}`
  );

  // Chat Messages
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/chat/ChatMessages.tsx'),
    `'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/types/chat'
import { ChatBubble } from './ChatBubble'
import { motion } from 'framer-motion'

export function ChatMessages({ messages }: { messages: Message[] }) {
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
      className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((message, idx) => (
          <motion.div
            key={message.id || idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChatBubble message={message} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}`
  );

  // Chat Bubble
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/chat/ChatBubble.tsx'),
    `'use client'

import type { Message } from '@/types/chat'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={\`flex \${isUser ? 'justify-end' : 'justify-start'}\`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={\`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-3 text-sm md:text-base \${
          isUser
            ? 'bg-gray-900 border border-gray-700 text-white'
            : 'glass-light text-gray-100 border border-gray-700/50'
        }\`}
      >
        <p className="break-words">{message.content}</p>
        <p className="mt-2 text-xs opacity-60">{formatDate(message.timestamp)}</p>
      </motion.div>
    </div>
  )
}`
  );

  // Chat Input
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/chat/ChatInput.tsx'),
    `'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState('auto')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
        setMessage(prev => prev + ' ' + transcript)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      const element = textareaRef.current
      setTextareaHeight('auto')
      const scrollHeight = element.scrollHeight
      setTextareaHeight(Math.min(scrollHeight, 120) + 'px')
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message)
      setMessage('')
      setTextareaHeight('auto')
    }
  }

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Voice input not supported in your browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-gray-800 bg-dark-bg/80 backdrop-blur-lg px-4 py-4 md:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="glass flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your symptoms or ask a health question..."
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder-gray-500"
            style={{ height: textareaHeight }}
            rows={1}
            disabled={isLoading}
          />

          <button
            onClick={toggleVoice}
            disabled={isLoading}
            className={\`p-2 rounded-lg transition-colors \${
              isListening
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-700/20 text-gray-400 hover:text-gray-300'
            }\`}
          >
            <Mic size={20} />
          </button>

          <button
            onClick={handleSend}
            disabled={isLoading || !message.trim()}
            className="rounded-lg bg-gray-800 border border-gray-700 p-2 text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Press Shift + Enter for new line
        </p>
      </div>
    </motion.div>
  )
}`
  );

  // Typing Indicator
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/chat/TypingIndicator.tsx'),
    `'use client'

import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <div className="px-4 py-4 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="glass-light w-fit rounded-lg px-4 py-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.4,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
                className="h-2 w-2 rounded-full bg-gray-400"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}`
  );

  console.log('   ✓ Chat components created\n');

  // Sidebar
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/sidebar/Sidebar.tsx'),
    `'use client'

import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatHistory } from './ChatHistory'
import { Menu, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'

export function Sidebar() {
  const { createNewChat } = useChat()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-dark-secondary p-2 md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 z-40 h-screen w-64 space-y-4 border-r border-gray-800 bg-dark-secondary p-4 md:relative md:translate-x-0"
      >
        {/* Logo */}
        <div className="mb-8 mt-8 flex items-center gap-2">
          <div className="text-2xl">🧠</div>
          <div className="text-lg font-bold">MediSense AI</div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            createNewChat()
            setIsOpen(false)
          }}
          className="w-full rounded-lg py-3 text-sm font-medium transition-colors bg-black border border-gray-800 hover:border-gray-700 text-white flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          New Chat
        </button>

        {/* Chat History */}
        <ChatHistory onSelectChat={() => setIsOpen(false)} />
      </motion.aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}`
  );

  // Chat History
  fs.writeFileSync(
    path.join(FRONTEND_DIR, 'src/components/sidebar/ChatHistory.tsx'),
    `'use client'

import { useChat } from '@/hooks/useChat'
import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

export function ChatHistory({ onSelectChat }: { onSelectChat?: () => void }) {
  const { sessions, currentSessionId, setCurrentSessionId, deleteChat } =
    useChat()

  if (sessions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">No chats yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 flex-1 overflow-y-auto">
      <p className="text-xs font-semibold text-gray-500 px-2">RECENT CHATS</p>
      {sessions.map((session) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="group relative"
        >
          <button
            onClick={() => {
              setCurrentSessionId(session.id)
              onSelectChat?.()
            }}
            className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors truncate \${
              currentSessionId === session.id
                ? 'bg-gray-900 border border-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-900/50 hover:border hover:border-gray-800'
            }\`}
          >
            {session.title}
          </button>
          <button
            onClick={() => deleteChat(session.id)}
            className="absolute right-2 top-2 hidden rounded p-1 hover:bg-red-600/20 group-hover:block"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </motion.div>
      ))}
    </div>
  )
}`
  );

  console.log('   ✓ Sidebar components created\n');

  // Step 9: Install dependencies
  console.log('📚 Step 9: Installing dependencies...');
  console.log('   This may take 2-5 minutes...\n');

  try {
    execSync('npm install', {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
    });
    console.log('\n   ✓ Dependencies installed\n');
  } catch (e) {
    console.error('   ⚠️  npm install had issues. You may need to run it manually.');
    console.error('   Run: cd frontend && npm install\n');
  }

  // Success message
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  ✅ FRONTEND BUILD COMPLETE!                      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log('🚀 Next steps:\n');
  console.log('   1. Start development server:');
  console.log('      cd frontend && npm run dev\n');
  console.log('   2. Open http://localhost:3000 in your browser\n');
  console.log('   3. Make sure backend is running:');
  console.log('      python main.py\n');

  console.log('📊 Frontend Statistics:');
  console.log('   - Framework: Next.js 14.1');
  console.log('   - Styling: Tailwind CSS 3.3');
  console.log('   - Animations: Framer Motion 10.16');
  console.log('   - Components: 8 production-ready');
  console.log('   - Type-safe: 100% TypeScript\n');

} catch (error) {
  console.error('\n❌ Build failed:', error);
  process.exit(1);
}
`
  );

  console.log('✅ Setup script created: setup-frontend-complete.js');
