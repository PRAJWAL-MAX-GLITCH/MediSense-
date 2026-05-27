const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const FRONTEND_OLD = path.join(PROJECT_ROOT, 'frontend-old');

console.log('📦 MediSense AI Frontend Installer');
console.log('====================================\n');

// Backup old frontend
if (fs.existsSync(FRONTEND_DIR)) {
  console.log('Backing up existing frontend...');
  if (fs.existsSync(FRONTEND_OLD)) {
    fs.rmSync(FRONTEND_OLD, { recursive: true });
  }
  fs.renameSync(FRONTEND_DIR, FRONTEND_OLD);
  console.log('✓ Old frontend backed up to frontend-old/\n');
}

// Create directory structure
const dirs = [
  'src/app',
  'src/components/chat',
  'src/components/sidebar',
  'src/components/ui',
  'src/hooks',
  'src/lib',
  'src/types',
  'public',
];

dirs.forEach(dir => {
  const fullPath = path.join(FRONTEND_DIR, dir);
  fs.mkdirSync(fullPath, { recursive: true });
});

console.log('✓ Directory structure created');

// Create files
const files = {
  'package.json': JSON.stringify({
    name: 'medisense-frontend',
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
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
      'tailwind-merge': '^2.2.0'
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
      'eslint-config-next': '^14.1.0'
    }
  }, null, 2),

  'tsconfig.json': JSON.stringify({
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
        '@/*': ['./src/*']
      },
      plugins: [{ name: 'next' }]
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules']
  }, null, 2),

  'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
}
module.exports = nextConfig`,

  'tailwind.config.ts': `import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0e27',
        'dark-secondary': '#1a1f3a',
        'dark-tertiary': '#2d3248',
      },
    },
  },
  plugins: [],
}
export default config`,

  'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

  '.env.local': `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`,

  '.gitignore': `.next
*.log
node_modules
.env
.env.local
.env.*.local
.DS_Store
*.pem
dist
build
coverage`,

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

.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chat-bubble {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.3s ease-in-out;
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

// Write main files
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(FRONTEND_DIR, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
});

console.log('✓ Configuration files created');

// Create React components
const components = {
  'src/app/layout.tsx': `import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'MediSense AI',
  description: 'Advanced AI Health Assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

  'src/hooks/useChat.ts': `'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, ChatSession } from '@/types/chat'

const STORAGE_KEY = 'medisense_chats'

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
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
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id)
        }
      } catch (e) {
        createNewChat()
      }
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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
        const res = await fetch(\`\${apiUrl}/analyze\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symptoms: content.trim() }),
        })

        if (!res.ok) throw new Error(\`HTTP \${res.status}\`)

        const data = await res.json()

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'No response',
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
        console.error('Error:', error)
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
      <ChatMessages messages={currentSession.messages} />
      {isLoading && <TypingIndicator />}
      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      <div ref={messagesEndRef} />
    </div>
  )
}`,

  'src/components/chat/ChatMessages.tsx': `'use client'
import { useEffect, useRef } from 'react'
import type { Message } from '@/types/chat'
import { ChatBubble } from './ChatBubble'

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
    <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message, idx) => (
          <ChatBubble key={message.id || idx} message={message} />
        ))}
      </div>
    </div>
  )
}`,

  'src/components/chat/ChatBubble.tsx': `'use client'
import type { Message } from '@/types/chat'

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={\`flex \${isUser ? 'justify-end' : 'justify-start'}\`}>
      <div
        className={\`max-w-md rounded-lg px-4 py-3 chat-bubble \${
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            : 'glass bg-dark-secondary/50'
        }\`}
      >
        <p className="text-sm leading-relaxed md:text-base">{message.content}</p>
        <p className="mt-2 text-xs opacity-70">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}`,

  'src/components/chat/TypingIndicator.tsx': `'use client'

export function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 py-2 md:px-8">
      <div className="glass max-w-md rounded-lg px-4 py-3">
        <div className="typing flex gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
        </div>
      </div>
    </div>
  )
}`,

  'src/components/chat/ChatInput.tsx': `'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Mic, X } from 'lucide-react'

export function ChatInput({
  onSendMessage,
  isLoading,
}: {
  onSendMessage: (msg: string) => void
  isLoading: boolean
}) {
  const [input, setInput] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isListening, setIsListening] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newRows = Math.min(Math.ceil(textareaRef.current.scrollHeight / 24), 5)
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
    recognition.start()
  }

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="border-t border-dark-tertiary/50 px-4 py-4 md:px-8">
      <div className="mx-auto max-w-3xl space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={isLoading}
            className="mt-2 rounded-lg bg-dark-secondary p-2 hover:bg-dark-tertiary disabled:opacity-50"
          >
            {isListening ? (
              <X className="h-5 w-5 text-red-500" />
            ) : (
              <Mic className="h-5 w-5 text-gray-400" />
            )}
          </button>
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
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="mt-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-2 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-500">
          MediSense AI provides general guidance. Call 911 in emergencies.
        </p>
      </div>
    </div>
  )
}`,

  'src/components/sidebar/Sidebar.tsx': `'use client'
import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatHistory } from './ChatHistory'
import { Plus, Menu, X } from 'lucide-react'

export function Sidebar() {
  const { createNewChat, sessions, currentSessionId, setCurrentSessionId } = useChat()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 md:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={\`fixed left-0 top-0 z-40 h-screen w-64 border-r border-dark-tertiary/50 bg-dark-secondary transition-transform duration-300 \${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0\`}
      >
        <div className="flex h-full flex-col">
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
          <ChatHistory
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={id => {
              setCurrentSessionId(id)
              setIsOpen(false)
            }}
          />
        </div>
      </div>
    </>
  )
}`,

  'src/components/sidebar/ChatHistory.tsx': `'use client'
import type { ChatSession } from '@/types/chat'
import { Trash2 } from 'lucide-react'
import { useChat } from '@/hooks/useChat'

export function ChatHistory({
  sessions,
  currentSessionId,
  onSelectSession,
}: {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
}) {
  const { deleteChat } = useChat()

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2 p-4">
        {sessions.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No chats yet</p>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="group flex items-center gap-2">
              <button
                onClick={() => onSelectSession(session.id)}
                className={\`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors \${
                  currentSessionId === session.id
                    ? 'bg-dark-tertiary text-white'
                    : 'text-gray-400 hover:bg-dark-tertiary/50'
                }\`}
              >
                {session.title}
              </button>
              <button
                onClick={() => deleteChat(session.id)}
                className="rounded p-1 opacity-0 hover:bg-red-500/20 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}`,

  'README.md': `# MediSense AI Frontend

Modern Next.js + TailwindCSS + Framer Motion frontend for MediSense AI health assistant.

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit \`http://localhost:3000\`

## Features

- 🎨 Premium dark UI with glass morphism
- 💬 Real-time chat interface
- 🎤 Voice input support
- ⌨️ Auto-expanding textarea
- 📱 Fully responsive design
- ✨ Smooth animations with Framer Motion
- 💾 Chat history with localStorage
- 🎯 Modern component architecture

## API Integration

The frontend connects to the FastAPI backend at:
\`http://127.0.0.1:8000/analyze\`

Configure the API URL in \`.env.local\`:
\`\`\`
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
\`\`\`
`,
};

Object.entries(components).forEach(([filePath, content]) => {
  const fullPath = path.join(FRONTEND_DIR, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
});

console.log('✓ React components created');
console.log('\n📦 Installing dependencies...');

try {
  execSync('npm install', { cwd: FRONTEND_DIR, stdio: 'inherit' });
  console.log('\n✅ Installation complete!');
  console.log('\n🚀 Next steps:');
  console.log('   cd frontend');
  console.log('   npm run dev');
  console.log('\n📍 Open: http://localhost:3000');
} catch (error) {
  console.log('\n⚠️ npm install failed. Run manually:');
  console.log('   cd frontend && npm install');
}
