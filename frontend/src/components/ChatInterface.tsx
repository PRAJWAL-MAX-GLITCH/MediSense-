'use client'

import { useState, useRef, useCallback } from 'react'
import { useChat } from '@/hooks/useChat'

// ─────────────────────────────────────────────
//  RISK BADGE
// ─────────────────────────────────────────────
function RiskBadge({ risk, emergency }: { risk: string; emergency: boolean }) {
  if (emergency || risk === 'HIGH')
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
        color: '#fca5a5', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600,
      }}>🚨 Emergency — Seek immediate care</span>
    )
  if (risk === 'MEDIUM')
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
        color: '#fcd34d', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600,
      }}>⚠️ Moderate Risk</span>
    )
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
      color: '#6ee7b7', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600,
    }}>🛡️ Low Risk</span>
  )
}

// ─────────────────────────────────────────────
//  MESSAGE BUBBLE
// ─────────────────────────────────────────────
function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="msg-enter" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.2))',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px 20px 4px 20px',
          padding: '14px 20px',
          maxWidth: '68%',
          fontSize: 17,
          lineHeight: 1.7,
          color: '#f1f5f9',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  let parsed: any = msg.parsed
  if (!parsed) { try { parsed = JSON.parse(msg.content) } catch { parsed = null } }

  // Plain text / welcome
  if (!parsed) {
    return (
      <div className="msg-enter" style={{ marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 0 12px rgba(124,58,237,0.4)',
        }}>🩺</div>
        <div style={{ fontSize: 18, lineHeight: 1.75, color: '#e2e8f0', paddingTop: 6 }}>
          {msg.content}
        </div>
      </div>
    )
  }

  // Follow-up questions
  if (parsed.type === 'question') {
    return (
      <div className="msg-enter" style={{ marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 0 12px rgba(124,58,237,0.4)',
        }}>🩺</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 14, fontWeight: 500 }}>
            I need a bit more information to help you better:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(parsed.questions || []).map((q: string, i: number) => (
              <div key={i} style={{
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 12, padding: '12px 16px',
                fontSize: 17, lineHeight: 1.6, color: '#e2e8f0',
              }}>
                <span style={{ color: '#a78bfa', marginRight: 8, fontWeight: 600 }}>{i + 1}.</span>{q}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // General answer
  if (parsed.type === 'general') {
    return (
      <div className="msg-enter" style={{ marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 0 12px rgba(124,58,237,0.4)',
        }}>🩺</div>
        <div style={{ fontSize: 18, lineHeight: 1.8, color: '#e2e8f0', paddingTop: 4 }}>
          {parsed.answer}
        </div>
      </div>
    )
  }

  // Health analysis card
  if (parsed.type === 'analysis') {
    return (
      <div className="msg-enter" style={{ marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 0 12px rgba(124,58,237,0.4)',
        }}>🩺</div>
        <div style={{ flex: 1 }}>
          {/* Risk badge row */}
          <div style={{ marginBottom: 16 }}>
            <RiskBadge risk={parsed.risk} emergency={parsed.emergency} />
          </div>
          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 18,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}>
            {[
              { label: 'Symptoms Detected', value: Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0 ? parsed.symptoms.join(', ') : 'None detected', accent: '#7c3aed' },
              { label: 'Possible Condition', value: parsed.condition, accent: '#4f46e5' },
              { label: 'Advice', value: parsed.advice, accent: '#6d28d9' },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                  {label}
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.7, color: '#e2e8f0' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="msg-enter" style={{ marginBottom: 20, fontSize: 18, color: '#e2e8f0', lineHeight: 1.75 }}>
      {msg.content}
    </div>
  )
}

// ─────────────────────────────────────────────
//  TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, boxShadow: '0 0 12px rgba(124,58,237,0.4)',
      }}>🩺</div>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '4px 20px 20px 20px',
        padding: '14px 20px',
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#a78bfa', display: 'inline-block',
            animation: 'bounce 1.4s infinite ease-in-out both',
            animationDelay: `${i * 0.16}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  MAIN CHAT INTERFACE
// ─────────────────────────────────────────────
export default function ChatInterface() {
  const { sessions, currentSessionId, currentSession, isLoading, messagesEndRef, createNewChat, sendMessage, deleteChat, setCurrentSessionId } = useChat()
  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [listening, setListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const handleSend = useCallback(() => {
    const msg = input.trim()
    if (!msg || isLoading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    sendMessage(msg)
  }, [input, isLoading, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported.'); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = false
    rec.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false) }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start(); setListening(true)
  }

  const canSend = input.trim().length > 0 && !isLoading

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#000000', color: '#f1f5f9', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* ── Ambient purple glow ── */}
      <div style={{
        position: 'fixed', top: -200, left: sidebarOpen ? 100 : -100,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <div style={{
        width: sidebarOpen ? 268 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{
          width: 268, height: '100%',
          background: 'rgba(10,10,15,0.97)',
          borderRight: '1px solid rgba(139,92,246,0.12)',
          display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Logo */}
          <div style={{ padding: '22px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: '0 0 16px rgba(124,58,237,0.4)',
              }}>🩺</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  MediSense{' '}
                  <span style={{ background: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>Health Assistant</div>
              </div>
            </div>
          </div>

          {/* AI Status */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.18)',
              borderRadius: 10, padding: '8px 12px',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10b981', display: 'inline-block',
                animation: 'statusPulse 2s infinite',
                boxShadow: '0 0 6px #10b981',
              }} />
              <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500 }}>AI Online — Ready</span>
            </div>
          </div>

          {/* New Chat */}
          <div style={{ padding: '12px 14px' }}>
            <button onClick={createNewChat} className="sidebar-item" style={{
              width: '100%',
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 10, color: '#c4b5fd',
              padding: '11px 14px', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 12px rgba(124,58,237,0.1)',
            }}>
              <span style={{ fontSize: 16 }}>✏️</span> New Chat
            </button>
          </div>

          {/* History */}
          <div style={{ padding: '0 14px 8px' }}>
            <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, padding: '4px 4px 8px' }}>
              Recent Chats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
              {sessions.map(s => (
                <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className="sidebar-item" style={{
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13,
                  background: s.id === currentSessionId ? 'rgba(124,58,237,0.15)' : 'transparent',
                  border: s.id === currentSessionId ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                  color: s.id === currentSessionId ? '#c4b5fd' : '#64748b',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>💬</span>
                    {s.title}
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteChat(s.id) }} style={{
                    background: 'none', border: 'none', color: '#334155',
                    cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0,
                    lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Profile section */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>U</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>User</div>
                <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Free Plan</div>
              </div>
              <span style={{ color: '#334155', fontSize: 12 }}>⚙️</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* ── Top bar ── */}
        <header style={{
          padding: '0 24px',
          height: 58,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b', cursor: 'pointer', fontSize: 15,
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>☰</button>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>
              {currentSession?.title || 'New Chat'}
            </span>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={createNewChat} title="New Chat" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b', cursor: 'pointer', fontSize: 14,
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>✏️</button>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
              boxShadow: '0 0 10px rgba(124,58,237,0.3)',
            }}>U</div>
          </div>
        </header>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 180 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px 0' }}>
            {currentSession?.messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Floating Input Bar ── */}
        <div style={{
          position: 'fixed', bottom: 0,
          left: sidebarOpen ? 268 : 0,
          right: 0,
          padding: '16px 24px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,1) 60%, transparent)',
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 20,
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="input-bar" style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              padding: '10px 12px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}>
              {/* Voice */}
              <button onClick={toggleVoice} title="Voice input" style={{
                background: listening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                border: listening ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: listening ? '#fca5a5' : '#64748b',
                cursor: 'pointer', fontSize: 16,
                width: 42, height: 42, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s',
                animation: listening ? 'pulseGlow 1.5s infinite' : 'none',
              }}>🎤</button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Describe your symptoms or ask a health question..."
                rows={1}
                maxLength={500}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: '#f1f5f9', fontFamily: 'inherit', fontSize: 16,
                  resize: 'none', padding: '10px 6px',
                  maxHeight: 160, overflowY: 'auto', outline: 'none',
                  lineHeight: 1.6,
                }}
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={canSend ? 'send-btn-active' : ''}
                style={{
                  background: canSend ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: 12,
                  width: 42, height: 42,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: canSend ? '#fff' : '#334155',
                  flexShrink: 0, transition: 'all 0.2s',
                }}>➤</button>
            </div>

            {/* Disclaimer */}
            <p style={{ textAlign: 'center', fontSize: 11, color: '#1e293b', marginTop: 10, letterSpacing: '0.01em' }}>
              MediSense AI provides general educational guidance only · Not a diagnostic tool · Emergency? Call 911
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
