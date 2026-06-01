"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Activity,
  Heart,
  ShieldAlert,
  User,
  Settings,
  Compass,
  BookOpen,
  BarChart2,
  Globe,
  Bell,
  Mic,
  Paperclip,
  Send,
  AlertTriangle,
  Clock,
  Video,
  Sparkles,
  Menu,
  X,
  CheckCircle,
  Info,
  ChevronDown,
  PhoneCall,
  Volume2,
  VolumeX,
  ShieldCheck,
} from "lucide-react";
import { useChat } from "@/hooks/useChat";

// ─────────────────────────────────────────────
//  MOCK DATA DEFINITIONS
// ─────────────────────────────────────────────
const MOCK_SYMPTOMS_DB = [
  {
    name: "Common Cold",
    category: "Respiratory",
    urgency: "Low",
    description:
      "Viral infection of the upper respiratory tract. Usually resolves in 7-10 days.",
  },
  {
    name: "Influenza (Flu)",
    category: "Respiratory",
    urgency: "Medium",
    description:
      "Highly contagious viral infection characterized by sudden fever, muscle aches, and fatigue.",
  },
  {
    name: "Migraine",
    category: "Neurological",
    urgency: "Medium",
    description:
      "Severe headache disorder often accompanied by nausea, vomiting, and light sensitivity.",
  },
  {
    name: "Gastroenteritis",
    category: "Digestive",
    urgency: "Low",
    description:
      "Inflammation of stomach and intestines, resulting in vomiting, diarrhea, and cramps.",
  },
  {
    name: "Hypertension Crisis",
    category: "Cardiovascular",
    urgency: "High",
    description:
      "Severe spike in blood pressure that can lead to stroke. Requires emergency evaluation.",
  },
];

export default function ChatInterface() {
  const {
    sessions,
    currentSessionId,
    currentSession,
    isLoading,
    messagesEndRef,
    createNewChat,
    sendMessage,
    deleteChat,
    setCurrentSessionId,
  } = useChat();

  // Navigation State
  const [activeTab, setActiveTab] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Interactive States
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  // Modals & Popups
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [telecomStatus, setTelecomStatus] = useState("idle");
  // Toasts
  const [toasts, setToasts] = useState([]);

  // DOM Refs
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceSynthesisUtteranceRef = useRef(null);

  // Language display names
  const langNames = {
    en: "English (US)",
    hi: "हिंदी (Hindi)",
    mr: "मराठी (Marathi)",
  };

  // Add Toast Notification Helper
  const triggerToast = useCallback((message, type = "info") => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Auto Scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, isLoading, activeTab]);

  // Text to Speech logic
  const speakResponse = useCallback(
    (text) => {
      if (
        !voiceEnabled ||
        typeof window === "undefined" ||
        !window.speechSynthesis
      )
        return;
      window.speechSynthesis.cancel(); // Stop any current speaking
      // Clean JSON structures from text if needed
      let cleanText = text;
      try {
        const parsed = JSON.parse(text);
        if (parsed.type === "analysis") {
          cleanText = `Analysis complete. Possible condition: ${parsed.condition}. General advice: ${parsed.advice}.`;
        } else if (parsed.type === "question") {
          cleanText = `I have a few follow up questions: ${parsed.questions.join(". ")}`;
        } else if (parsed.type === "general") {
          cleanText = parsed.answer;
        }
      } catch {
        // Treat as plain text
      }
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang =
        selectedLang === "hi"
          ? "hi-IN"
          : selectedLang === "mr"
            ? "mr-IN"
            : "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      voiceSynthesisUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled, selectedLang],
  );

  // Monitor incoming AI messages to speak them
  useEffect(() => {
    if (currentSession?.messages && currentSession.messages.length > 0) {
      const lastMsg =
        currentSession.messages[currentSession.messages.length - 1];
      if (lastMsg.role === "assistant" && voiceEnabled && !isLoading) {
        speakResponse(lastMsg.content);
      }
    }
  }, [currentSession?.messages, voiceEnabled, isLoading, speakResponse]);

  // Stop TTS when voice toggle is disabled
  useEffect(() => {
    if (
      !voiceEnabled &&
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [voiceEnabled]);

  // Speech Recognition
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      triggerToast(
        "Speech recognition not supported on this browser.",
        "warning",
      );
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }

    const rec = new SR();
    rec.lang =
      selectedLang === "hi"
        ? "hi-IN"
        : selectedLang === "mr"
          ? "mr-IN"
          : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      triggerToast("Listening...", "info");
    };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      triggerToast("Speech captured successfully!", "success");
      setListening(false);
    };
    rec.onerror = (err) => {
      console.error(err);
      setListening(false);
      triggerToast("Could not recognize voice. Try again.", "warning");
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  // Handle Send action
  const handleSend = useCallback(
    (overrideText) => {
      const msg = (overrideText || input).trim();
      if (!msg || isLoading) return;
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      // Direct back to chat view if sending a message
      setActiveTab("chat");
      sendMessage(msg);
    },
    [input, isLoading, sendMessage],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  // Stats Counters (Dynamically extracted)
  const getTotalChats = () => sessions.length;
  const getHealthAnalysesCount = () => {
    let count = 0;
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        if (m.parsed?.type === "analysis") count++;
      });
    });
    return count || 3; // Fallback dummy for better initial UI
  };

  const getRisksDetected = () => {
    let risks = 0;
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        if (
          m.parsed?.type === "analysis" &&
          (m.parsed.risk === "HIGH" || m.parsed.risk === "MEDIUM")
        ) {
          risks++;
        }
      });
    });
    return risks || 1; // Fallback dummy
  };

  const getLatestAnalysis = () => {
    if (currentSession?.messages) {
      for (let i = currentSession.messages.length - 1; i >= 0; i--) {
        const msg = currentSession.messages[i];
        if (msg.parsed?.type === "analysis") {
          return msg.parsed;
        }
      }
    }
    return null;
  };

  const activeAnalysis = getLatestAnalysis();

  // Simulated Telehealth Video Call
  const startConsultation = () => {
    setTelecomStatus("dialing");
    setShowConsultModal(true);
    setTimeout(() => {
      setTelecomStatus("connected");
    }, 3000);
  };

  const endConsultation = () => {
    setTelecomStatus("idle");
    setShowConsultModal(false);
    triggerToast("Telemedicine consultation ended.", "info");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#000000",
        color: "#f1f5f9",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Toast Notification Container */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background:
                  t.type === "success"
                    ? "rgba(16, 185, 129, 0.92)"
                    : t.type === "warning"
                      ? "rgba(245, 158, 11, 0.92)"
                      : "rgba(8, 145, 178, 0.92)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "12px 20px",
                borderRadius: 12,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {t.type === "success" && <CheckCircle size={16} />}
              {t.type === "warning" && <AlertTriangle size={16} />}
              {t.type === "info" && <Info size={16} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Ambient Glowing Backdrops (Healthcare Cyan/Teal) ── */}
      <div
        style={{
          position: "fixed",
          top: -300,
          left: sidebarOpen ? 150 : -50,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "all 0.5s",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: -200,
          right: showRightPanel ? 100 : -100,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(8, 145, 178, 0.03) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "all 0.5s",
        }}
      />

      {/* ══════════════════════════════════════
           LEFT SIDEBAR (1st Column)
        ══════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            style={{
              flexShrink: 0,
              background: "rgba(15, 23, 42, 0.95)",
              borderRight: "1px solid rgba(8, 145, 178, 0.12)",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
              overflow: "hidden",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Sidebar Logo */}
            <div
              style={{
                padding: "24px 20px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 16px rgba(8, 145, 178, 0.25)",
                  }}
                >
                  <Activity size={20} color="#fff" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    MediSense{" "}
                    <span
                      style={{
                        background: "linear-gradient(135deg,#06b6d4,#10b981)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 900,
                      }}
                    >
                      AI
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#64748b",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    SaaS Medical Platform
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Navigation */}
            <div
              style={{
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <button
                onClick={() => {
                  createNewChat();
                  setActiveTab("chat");
                }}
                className="sidebar-item"
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, rgba(8, 145, 178, 0.15), rgba(15, 23, 42, 0.6))",
                  border: "1px solid rgba(8, 145, 178, 0.3)",
                  borderRadius: 12,
                  color: "#22d3ee",
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 4px 15px rgba(8, 145, 178, 0.1)",
                }}
              >
                <Plus size={16} /> New Consultation
              </button>

              <div style={{ height: 10 }} />

              {[
                { id: "dashboard", label: "Health Dashboard", icon: Heart },
                { id: "chat", label: "Chat Assistant", icon: MessageSquare },
                {
                  id: "symptoms",
                  label: "Symptom Database",
                  icon: ShieldAlert,
                },
                { id: "knowledge", label: "Medical Knowledge", icon: BookOpen },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="sidebar-item"
                    style={{
                      background: isActive
                        ? "rgba(8, 145, 178, 0.08)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(8, 145, 178, 0.18)"
                        : "1px solid transparent",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? "#06b6d4" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </div>

            {/* Chat Sessions list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 10px" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  padding: "10px 8px 8px",
                }}
              >
                Consultation History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sessions.map((s) => {
                  const isActive =
                    s.id === currentSessionId && activeTab === "chat";
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setCurrentSessionId(s.id);
                        setActiveTab("chat");
                      }}
                      className="sidebar-item"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontSize: 13,
                        background: isActive
                          ? "rgba(8, 145, 178, 0.1)"
                          : "rgba(255,255,255,0.01)",
                        border: isActive
                          ? "1px solid rgba(8, 145, 178, 0.18)"
                          : "1px solid rgba(255,255,255,0.02)",
                        color: isActive ? "#22d3ee" : "#cbd5e1",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Clock size={12} style={{ opacity: 0.5 }} />
                        {s.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(s.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#475569",
                          cursor: "pointer",
                          fontSize: 12,
                          padding: "0 2px",
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                        className="hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Bottom Upgrade & Profile */}
            <div
              style={{
                padding: 14,
                background: "rgba(5, 8, 16, 0.6)",
                borderTop: "1px solid rgba(255,255,255,0.02)",
              }}
            >
              {/* Upgrade Card */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(8, 145, 178, 0.1), rgba(15, 23, 42, 0.6))",
                  border: "1px solid rgba(8, 145, 178, 0.18)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  position: "relative",
                  overflow: "hidden",
                }}
                className="glow-cyan"
              >
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    right: -10,
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: "rgba(6, 182, 212, 0.08)",
                    filter: "blur(10px)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <Sparkles size={14} color="#06b6d4" />
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: "#22d3ee" }}
                  >
                    Upgrade to Pro
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  Unlock advanced diagnostic metrics and doctor consultations.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "6px 10px",
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(8, 145, 178, 0.25)",
                  }}
                >
                  Upgrade Plan
                </button>
              </div>

              {/* User Profile Footer */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#fff",
                    boxShadow: "0 0 8px rgba(8, 145, 178, 0.3)",
                  }}
                >
                  P
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}
                  >
                    Prajwal
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    Enterprise Tier
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  className="hover:text-cyan-400"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
           CENTER AREA (2nd Column)
        ══════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── Top Bar Header ── */}
        <header
          style={{
            padding: "0 24px",
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          {/* Top Bar Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                color: "#94a3b8",
                cursor: "pointer",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              className="hover:border-cyan-500 hover:text-white"
            >
              <Menu size={16} />
            </button>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, color: "#f1f5f9", fontWeight: 700 }}>
                {activeTab === "chat"
                  ? currentSession?.title || "New Chat"
                  : activeTab.toUpperCase()}
              </span>
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>
                Secure Clinical Encryption Active
              </span>
            </div>
          </div>

          {/* Top Bar Right: Toggles & Dropdowns */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              position: "relative",
            }}
          >
            {/* Speak TTS Enable Toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                triggerToast(
                  voiceEnabled
                    ? "Voice output disabled"
                    : "Voice output enabled",
                  "info",
                );
              }}
              title="Toggle Speak Responses"
              style={{
                background: voiceEnabled
                  ? "rgba(8,145,178,0.12)"
                  : "rgba(255,255,255,0.02)",
                border: voiceEnabled
                  ? "1px solid rgba(8,145,178,0.3)"
                  : "1px solid rgba(255,255,255,0.04)",
                color: voiceEnabled ? "#06b6d4" : "#64748b",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Language Selector Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#f1f5f9",
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Globe size={13} color="#06b6d4" />
                {langNames[selectedLang]}
                <ChevronDown size={12} />
              </button>

              {showLanguageDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: "#0F172A",
                    border: "1px solid rgba(8, 145, 178, 0.2)",
                    borderRadius: 12,
                    padding: 6,
                    zIndex: 100,
                    width: 150,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                  }}
                >
                  {Object.entries(langNames).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setSelectedLang(code);
                        setShowLanguageDropdown(false);
                        triggerToast(`Assigned language to ${name}`, "success");
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "none",
                        background:
                          selectedLang === code
                            ? "rgba(8, 145, 178, 0.12)"
                            : "transparent",
                        color: selectedLang === code ? "#06b6d4" : "#cbd5e1",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      className="hover:bg-slate-800 text-left"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Icon */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() =>
                  setShowNotificationDropdown(!showNotificationDropdown)
                }
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell size={16} />
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    right: 3,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid #000",
                  }}
                />
              </button>

              {showNotificationDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: "#0F172A",
                    border: "1px solid rgba(8, 145, 178, 0.2)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    zIndex: 100,
                    width: 240,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    System Alerts
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#cbd5e1",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        paddingBottom: 6,
                      }}
                    >
                      🔒 RAG Medical database updated. (1,240 new symptoms
                      mapped)
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                      🚀 Telehealth modules connected successfully.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle Right Widget Panel */}
            <button
              onClick={() => setShowRightPanel((o) => !o)}
              style={{
                background: showRightPanel
                  ? "rgba(8,145,178,0.1)"
                  : "rgba(255,255,255,0.02)",
                border: showRightPanel
                  ? "1px solid rgba(8,145,178,0.22)"
                  : "1px solid rgba(255,255,255,0.04)",
                color: showRightPanel ? "#06b6d4" : "#94a3b8",
                cursor: "pointer",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Toggle Insights Panel"
            >
              <BarChart2 size={16} />
            </button>
          </div>
        </header>

        {/* ── CENTRAL TABS CONTAINER ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* TAB 1: HEALTH DASHBOARD */}
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ padding: "24px 32px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Welcome back, Prajwal
                  </h1>
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                    Secure clinical diagnostics dashboard overview.
                  </p>
                </div>
                <button
                  onClick={startConsultation}
                  style={{
                    background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                    border: "none",
                    color: "#fff",
                    padding: "10px 18px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 15px rgba(8,145,178,0.25)",
                  }}
                >
                  <Video size={15} /> Consult Specialist
                </button>
              </div>

              {/* Dynamic Analytics Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {[
                  {
                    title: "Total Consultations",
                    count: getTotalChats(),
                    stat: "+15% this week",
                    color: "#06b6d4",
                    icon: MessageSquare,
                  },
                  {
                    title: "Health Analyses",
                    count: getHealthAnalysesCount(),
                    stat: "+3 new reports",
                    color: "#0891b2",
                    icon: Activity,
                  },
                  {
                    title: "Risks Detected",
                    count: getRisksDetected(),
                    stat: "Clinical status stable",
                    color: "#f59e0b",
                    icon: ShieldAlert,
                  },
                  {
                    title: "Voice Inquiries",
                    count: "14",
                    stat: "Enabled 4h ago",
                    color: "#10b981",
                    icon: Mic,
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className="premium-card text-left"
                      style={{ padding: 18, borderRadius: 16 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontWeight: 700,
                          }}
                        >
                          {card.title}
                        </span>
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 10,
                            background: `rgba(255,255,255,0.02)`,
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <Icon size={14} color={card.color} />
                        </div>
                      </div>
                      <div
                        style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}
                      >
                        {card.count}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: card.color,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        {card.stat}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SVG Health Trends Graph */}
              <div
                className="premium-card text-left"
                style={{
                  padding: "20px 24px",
                  borderRadius: 16,
                  marginBottom: 28,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                      Personal Wellness Index
                    </h3>
                    <p style={{ fontSize: 12, color: "#64748b" }}>
                      Simulated trend over active sessions.
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#10b981",
                      fontWeight: 600,
                      background: "rgba(16,185,129,0.06)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      padding: "4px 10px",
                      borderRadius: 8,
                    }}
                  >
                    94% Stable
                  </span>
                </div>

                {/* Custom Sparkline Chart */}
                <div
                  style={{ height: 180, width: "100%", position: "relative" }}
                >
                  <svg
                    viewBox="0 0 500 150"
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "visible",
                    }}
                  >
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#0891b2"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#0891b2"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,120 Q50,70 100,80 T200,40 T300,60 T400,30 T500,20"
                      fill="none"
                      stroke="#0891b2"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    <path
                      d="M0,120 Q50,70 100,80 T200,40 T300,60 T400,30 T500,20 L500,150 L0,150 Z"
                      fill="url(#gradient)"
                    />

                    <circle
                      cx="100"
                      cy="80"
                      r="4.5"
                      fill="#0891b2"
                      stroke="#000"
                      strokeWidth="2"
                    />
                    <circle
                      cx="200"
                      cy="40"
                      r="4.5"
                      fill="#06b6d4"
                      stroke="#000"
                      strokeWidth="2"
                    />
                    <circle
                      cx="300"
                      cy="60"
                      r="4.5"
                      fill="#0891b2"
                      stroke="#000"
                      strokeWidth="2"
                    />
                    <circle
                      cx="400"
                      cy="30"
                      r="4.5"
                      fill="#10b981"
                      stroke="#000"
                      strokeWidth="2"
                    />
                    <circle
                      cx="500"
                      cy="20"
                      r="5"
                      fill="#10b981"
                      stroke="#000"
                      strokeWidth="2"
                      className="animate-ping"
                    />
                  </svg>

                  {/* Axis labels */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "#475569",
                      marginTop: 6,
                    }}
                  >
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Workflow Details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                {/* Workflow Card */}
                <div
                  className="premium-card text-left"
                  style={{ padding: "20px 24px", borderRadius: 16 }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Compass size={16} color="#0891b2" /> MediSense Clinical
                    Workflow
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {[
                      {
                        step: 1,
                        title: "Describe Symptoms",
                        desc: "Type or speak your primary health concerns.",
                      },
                      {
                        step: 2,
                        title: "Intelligent Follow-Up",
                        desc: "AI queries custom clinic logic to focus details.",
                      },
                      {
                        step: 3,
                        title: "RAG Retrieval & Risk Score",
                        desc: "Knowledge database maps symptoms and assesses risks.",
                      },
                      {
                        step: 4,
                        title: "Expert Guidance Delivery",
                        desc: "Generated structured summary report completes.",
                      },
                    ].map((step) => (
                      <div key={step.step} style={{ display: "flex", gap: 12 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "rgba(8, 145, 178, 0.1)",
                            border: "1px solid rgba(8, 145, 178, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#06b6d4",
                            fontSize: 10,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {step.step}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#f1f5f9",
                            }}
                          >
                            {step.title}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              marginTop: 1,
                            }}
                          >
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergency widget */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div
                    className="premium-card glow-red text-left"
                    style={{
                      padding: "20px 24px",
                      borderRadius: 16,
                      background: "rgba(239, 68, 68, 0.04)",
                      border: "1px solid rgba(239, 68, 68, 0.22)",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#fca5a5",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={18} /> 🚨 Emergency Services Warning
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#fca5a5",
                        lineHeight: 1.6,
                        marginBottom: 14,
                      }}
                    >
                      MediSense AI is a medical guidance retriever and
                      assistant, NOT a medical diagnostics physician or
                      provider.
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        lineHeight: 1.6,
                        marginBottom: 14,
                      }}
                    >
                      If you are experiencing severe chest pain, shortness of
                      breath, sudden numbness, or heavy bleeding, seek emergency
                      services instantly.
                    </p>
                    <button
                      onClick={() =>
                        triggerToast(
                          "Emergency call simulated to 911...",
                          "warning",
                        )
                      }
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        padding: "10px 14px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
                      }}
                    >
                      <PhoneCall size={14} /> Call Emergency (911)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CHAT ASSISTANT (Primary Column) */}
          {activeTab === "chat" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                position: "relative",
              }}
            >
              {/* Dynamic Stats Pinned to Top */}
              <div
                style={{
                  background: "rgba(5, 8, 16, 0.8)",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  padding: "12px 24px",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  backdropFilter: "blur(10px)",
                  zIndex: 10,
                }}
              >
                {[
                  {
                    label: "Total Consults",
                    count: getTotalChats(),
                    color: "#06b6d4",
                  },
                  {
                    label: "RAG Analyses",
                    count: getHealthAnalysesCount(),
                    color: "#0891b2",
                  },
                  {
                    label: "Severe Risks",
                    count: getRisksDetected(),
                    color: "#ef4444",
                  },
                  { label: "Voice Queries", count: "14", color: "#10b981" },
                ].map((card, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px solid rgba(255, 255, 255, 0.02)",
                      borderRadius: 10,
                      padding: "8px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      {card.label}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: card.color,
                      }}
                    >
                      {card.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: "auto", paddingBottom: 180 }}>
                <div
                  style={{
                    maxWidth: 900,
                    margin: "0 auto",
                    padding: "24px 24px 0",
                  }}
                >
                  {/* Messages Mapping */}
                  {!currentSession || currentSession.messages.length === 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "55vh",
                        textAlign: "center",
                        padding: "0 24px",
                      }}
                    >
                      <div
                        className="premium-card glow-cyan"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 0 24px rgba(8, 145, 178, 0.25)",
                          marginBottom: 16,
                        }}
                      >
                        <Activity size={26} color="#fff" />
                      </div>
                      <h2
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          marginBottom: 8,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        MediSense Clinical Portal
                      </h2>
                      <p
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                          maxWidth: 440,
                          lineHeight: 1.6,
                          marginBottom: 28,
                        }}
                      >
                        Describe your health concerns to start a secure clinical
                        intake evaluation. Mapped via LangChain FAISS nodes &
                        local medical dictionaries.
                      </p>

                      {/* Interactive Suggestions Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 12,
                          width: "100%",
                          maxWidth: 580,
                        }}
                      >
                        {[
                          { label: "I have high fever and cough", icon: "🤒" },
                          {
                            label: "Severe migraine with light sensitivity",
                            icon: "🧠",
                          },
                          {
                            label: "Severe stomach cramps and nausea",
                            icon: "🤢",
                          },
                          {
                            label: "Sudden lower back muscle strain",
                            icon: "💪",
                          },
                        ].map((sug) => (
                          <button
                            key={sug.label}
                            onClick={() => {
                              setInput(sug.label);
                              triggerToast(
                                "Clinical suggestion selected!",
                                "success",
                              );
                            }}
                            className="premium-card text-left"
                            style={{
                              padding: 14,
                              borderRadius: 12,
                              fontSize: 13,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: "pointer",
                              color: "#cbd5e1",
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{sug.icon}</span>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {sug.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    currentSession.messages.map((msg) => {
                      const isUser = msg.role === "user";

                      if (isUser) {
                        return (
                          <div
                            key={msg.id}
                            className="msg-enter text-right"
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              marginBottom: 24,
                            }}
                          >
                            <div
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(8,145,178,0.15), rgba(15,23,42,0.65))",
                                border: "1px solid rgba(8,145,178,0.22)",
                                borderRadius: "24px 24px 4px 24px",
                                padding: "14px 20px",
                                maxWidth: "70%",
                                fontSize: 18,
                                lineHeight: 1.6,
                                color: "#f8fafc",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                                backdropFilter: "blur(10px)",
                                textAlign: "left",
                              }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      // ASSISTANT BUBBLE
                      let parsed = msg.parsed;
                      if (!parsed) {
                        try {
                          parsed = JSON.parse(msg.content);
                        } catch {
                          parsed = null;
                        }
                      }

                      // Welcome Text / Standard text (AI Message uses Cyan Accents)
                      if (!parsed) {
                        return (
                          <div
                            key={msg.id}
                            className="msg-enter text-left"
                            style={{
                              marginBottom: 28,
                              display: "flex",
                              gap: 16,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background:
                                  "linear-gradient(135deg,#0891b2,#06b6d4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 16px rgba(8,145,178,0.2)",
                              }}
                            >
                              <Activity size={18} color="#fff" />
                            </div>
                            <div
                              style={{
                                fontSize: 18,
                                lineHeight: 1.75,
                                color: "#f1f5f9",
                                paddingTop: 6,
                              }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      // 1. Follow-up Questions Card
                      if (parsed.type === "question") {
                        return (
                          <div
                            key={msg.id}
                            className="msg-enter text-left"
                            style={{
                              marginBottom: 28,
                              display: "flex",
                              gap: 16,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background:
                                  "linear-gradient(135deg,#0891b2,#06b6d4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 16px rgba(8,145,178,0.2)",
                              }}
                            >
                              <Activity size={18} color="#fff" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <p
                                style={{
                                  fontSize: 16,
                                  color: "#06b6d4",
                                  marginBottom: 14,
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                🩺 Clinical Follow-Up Questionnaire:
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 12,
                                }}
                              >
                                {(parsed.questions || []).map((q, i) => (
                                  <div
                                    key={i}
                                    className="premium-card text-left"
                                    style={{
                                      borderRadius: 14,
                                      padding: "16px 20px",
                                      fontSize: 18,
                                      lineHeight: 1.6,
                                      color: "#f1f5f9",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                    }}
                                  >
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <span
                                        style={{
                                          color: "#06b6d4",
                                          fontWeight: 800,
                                        }}
                                      >
                                        {i + 1}.
                                      </span>
                                      <span>{q}</span>
                                    </div>

                                    {/* Interactive fast answers */}
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 8,
                                        marginTop: 4,
                                      }}
                                    >
                                      {["Yes", "No", "Not sure"].map((opt) => (
                                        <button
                                          key={opt}
                                          onClick={() =>
                                            handleSend(
                                              `Regarding question "${q}": ${opt}`,
                                            )
                                          }
                                          style={{
                                            background:
                                              "rgba(255, 255, 255, 0.02)",
                                            border:
                                              "1px solid rgba(8, 145, 178, 0.22)",
                                            borderRadius: 8,
                                            padding: "5px 12px",
                                            color: "#06b6d4",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                          }}
                                          className="hover:bg-cyan-600 hover:text-white"
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. Universal Info / General Card
                      if (parsed.type === "general") {
                        return (
                          <div
                            key={msg.id}
                            className="msg-enter text-left"
                            style={{
                              marginBottom: 28,
                              display: "flex",
                              gap: 16,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background:
                                  "linear-gradient(135deg,#0891b2,#06b6d4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 16px rgba(8,145,178,0.2)",
                              }}
                            >
                              <Activity size={18} color="#fff" />
                            </div>
                            <div
                              style={{
                                fontSize: 18,
                                lineHeight: 1.8,
                                color: "#f1f5f9",
                                paddingTop: 4,
                                background: "rgba(15, 23, 42, 0.6)",
                                border: "1px solid rgba(255, 255, 255, 0.03)",
                                padding: "16px 20px",
                                borderRadius: 16,
                                flex: 1,
                              }}
                            >
                              {parsed.answer}
                            </div>
                          </div>
                        );
                      }

                      // 3. Health Analysis PREMIUM SaaS Card
                      if (parsed.type === "analysis") {
                        const isHigh =
                          parsed.risk === "HIGH" || parsed.emergency;
                        const isMed = parsed.risk === "MEDIUM";
                        const borderColor = isHigh
                          ? "rgba(239, 68, 68, 0.35)"
                          : isMed
                            ? "rgba(245, 158, 11, 0.35)"
                            : "rgba(16, 185, 129, 0.35)";
                        const shadowGlow = isHigh
                          ? "glow-red"
                          : isMed
                            ? ""
                            : "glow-cyan";
                        return (
                          <div
                            key={msg.id}
                            className="msg-enter text-left"
                            style={{
                              marginBottom: 32,
                              display: "flex",
                              gap: 16,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background:
                                  "linear-gradient(135deg,#0891b2,#06b6d4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 16px rgba(8,145,178,0.2)",
                              }}
                            >
                              <Activity size={18} color="#fff" />
                            </div>
                            <div style={{ flex: 1 }}>
                              {/* Interactive Hospital Badge header */}
                              <div style={{ marginBottom: 12 }}>
                                {isHigh ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 8,
                                      background: "rgba(239,68,68,0.1)",
                                      border: "1px solid rgba(239,68,68,0.3)",
                                      color: "#fca5a5",
                                      borderRadius: 10,
                                      padding: "6px 14px",
                                      fontSize: 13,
                                      fontWeight: 700,
                                    }}
                                  >
                                    🚨 Emergency Alert - Seek Medical Evaluation
                                  </span>
                                ) : isMed ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 8,
                                      background: "rgba(245,158,11,0.1)",
                                      border: "1px solid rgba(245,158,11,0.3)",
                                      color: "#fcd34d",
                                      borderRadius: 10,
                                      padding: "6px 14px",
                                      fontSize: 13,
                                      fontWeight: 700,
                                    }}
                                  >
                                    ⚠️ Moderate Diagnostic Risk Profile
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 8,
                                      background: "rgba(16,185,129,0.1)",
                                      border: "1px solid rgba(16,185,129,0.3)",
                                      color: "#6ee7b7",
                                      borderRadius: 10,
                                      padding: "6px 14px",
                                      fontSize: 13,
                                      fontWeight: 700,
                                    }}
                                  >
                                    🛡️ Standard / Low Threat Assessment
                                  </span>
                                )}
                              </div>

                              {/* Card Body */}
                              <div
                                className={`premium-card text-left ${shadowGlow}`}
                                style={{
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: 20,
                                  padding: "24px 28px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 20,
                                  backdropFilter: "blur(20px)",
                                }}
                              >
                                <div
                                  style={{
                                    borderBottom:
                                      "1px solid rgba(255,255,255,0.03)",
                                    paddingBottom: 14,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 14,
                                      color: "#94a3b8",
                                      fontWeight: 700,
                                    }}
                                  >
                                    CLINICAL GUIDANCE RETRIEVAL
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "#475569",
                                      fontWeight: 600,
                                    }}
                                  >
                                    RAG-VERIFIED MATCH
                                  </span>
                                </div>

                                {[
                                  {
                                    label: "🩺 Identified Symptoms",
                                    value:
                                      Array.isArray(parsed.symptoms) &&
                                      parsed.symptoms.length > 0
                                        ? parsed.symptoms.join(", ")
                                        : "No prominent symptoms classified",
                                    accent: "#0891b2",
                                  },
                                  {
                                    label: "📌 Target Possible Condition",
                                    value: parsed.condition,
                                    accent: "#06b6d4",
                                  },
                                  {
                                    label: "💊 Clinical Recommendations",
                                    value: parsed.advice,
                                    accent: "#10b981",
                                  },
                                ].map(({ label, value, accent }) => (
                                  <div
                                    key={label}
                                    style={{
                                      borderLeft: `3px solid ${accent}`,
                                      paddingLeft: 18,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 11,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                        color: "#64748b",
                                        marginBottom: 6,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {label}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 18,
                                        lineHeight: 1.6,
                                        color: "#f1f5f9",
                                      }}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}

                                {/* Action Footer */}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 12,
                                    borderTop:
                                      "1px solid rgba(255,255,255,0.03)",
                                    paddingTop: 18,
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      triggerToast(
                                        "Clinical PDF successfully generated!",
                                        "success",
                                      )
                                    }
                                    style={{
                                      background: "rgba(255,255,255,0.01)",
                                      border:
                                        "1px solid rgba(255,255,255,0.04)",
                                      color: "#fff",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      padding: "8px 14px",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                    }}
                                    className="hover:bg-slate-800"
                                  >
                                    📥 Save Report (PDF)
                                  </button>
                                  <button
                                    onClick={() =>
                                      triggerToast(
                                        "Link copied. Telemetry report shared with Dr. Samantha Miller!",
                                        "success",
                                      )
                                    }
                                    style={{
                                      background: "rgba(8, 145, 178, 0.1)",
                                      border:
                                        "1px solid rgba(8, 145, 178, 0.22)",
                                      color: "#22d3ee",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      padding: "8px 14px",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                    }}
                                    className="hover:bg-cyan-600 hover:text-white"
                                  >
                                    🔗 Share with Physician
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })
                  )}

                  {/* Typing Indicator while backend compiles */}
                  {isLoading && (
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 0 12px rgba(8,145,178,0.2)",
                        }}
                      >
                        <Activity size={18} color="#fff" />
                      </div>
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.7)",
                          border: "1px solid rgba(8,145,178,0.18)",
                          borderRadius: "4px 20px 20px 20px",
                          padding: "14px 20px",
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#06b6d4",
                              display: "inline-block",
                              animation:
                                "bounce 1.4s infinite ease-in-out both",
                              animationDelay: `${i * 0.16}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Glowing Voice Wave visualization for voice mode */}
              {listening && (
                <div
                  style={{
                    position: "fixed",
                    bottom: 100,
                    left: sidebarOpen ? "calc(50% + 140px)" : "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      height: 40,
                      alignItems: "center",
                    }}
                  >
                    <div className="wave-bar" />
                    <div className="wave-bar" />
                    <div className="wave-bar" />
                    <div className="wave-bar" />
                    <div className="wave-bar" />
                    <div className="wave-bar" />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#06b6d4",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    MediSense Voice Active - Listening...
                  </span>
                </div>
              )}

              {/* ── Input bar panel ── */}
              <div
                style={{
                  position: "fixed",
                  bottom: 0,
                  left: sidebarOpen ? 280 : 0,
                  right: showRightPanel ? 340 : 0,
                  padding: "16px 24px 20px",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,1) 70%, transparent)",
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  zIndex: 20,
                }}
              >
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                  <div
                    className="input-bar"
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 10,
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(8, 145, 178, 0.18)",
                      borderRadius: 20,
                      padding: "10px 14px",
                      boxShadow:
                        "0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.02)",
                      backdropFilter: "blur(20px)",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Attachment mock */}
                    <button
                      onClick={() =>
                        triggerToast(
                          "Clinical file attachment (images/records) module unlocked on Pro tiers.",
                          "warning",
                        )
                      }
                      title="Attach records"
                      style={{
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.03)",
                        color: "#64748b",
                        cursor: "pointer",
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                      className="hover:border-cyan-500 hover:text-white"
                    >
                      <Paperclip size={16} />
                    </button>

                    {/* Microphone Activation button */}
                    <button
                      onClick={toggleVoice}
                      title="Symptom Voice Dictation"
                      style={{
                        background: listening
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(255,255,255,0.01)",
                        border: listening
                          ? "1px solid rgba(239,68,68,0.35)"
                          : "1px solid rgba(255,255,255,0.03)",
                        color: listening ? "#fca5a5" : "#64748b",
                        cursor: "pointer",
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                      className={
                        listening
                          ? "glow-red"
                          : "hover:border-cyan-500 hover:text-white"
                      }
                    >
                      <Mic size={16} />
                    </button>

                    {/* Text input Area */}
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe symptoms (e.g. fever, headache) or ask clinical questions..."
                      rows={1}
                      maxLength={500}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        color: "#f1f5f9",
                        fontFamily: "inherit",
                        fontSize: 16,
                        resize: "none",
                        padding: "10px 4px",
                        maxHeight: 160,
                        overflowY: "auto",
                        outline: "none",
                        lineHeight: 1.6,
                      }}
                    />

                    {/* Send Button */}
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className={
                        input.trim() && !isLoading ? "send-btn-active" : ""
                      }
                      style={{
                        background:
                          input.trim() && !isLoading
                            ? "linear-gradient(135deg,#0891b2,#06b6d4)"
                            : "rgba(255,255,255,0.02)",
                        border: "none",
                        borderRadius: 12,
                        width: 40,
                        height: 40,
                        cursor:
                          input.trim() && !isLoading
                            ? "pointer"
                            : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: input.trim() && !isLoading ? "#fff" : "#475569",
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                    >
                      <Send size={15} />
                    </button>
                  </div>

                  {/* Pinned disclaimer */}
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 10,
                      color: "#475569",
                      marginTop: 10,
                      letterSpacing: "0.01em",
                      fontWeight: 500,
                    }}
                  >
                    🔒 HIPAA Encrypted Connection · Retrieving clinical guidance
                    from FAISS and Qwen AI context.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYMPTOM DATABASE */}
          {activeTab === "symptoms" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: "24px 32px",
                maxWidth: 900,
                margin: "0 auto",
                width: "100%",
              }}
            >
              <h2
                style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}
                className="text-left"
              >
                MediSense Symptom Database
              </h2>
              <p
                style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}
                className="text-left"
              >
                Reference directory of verified healthcare anomalies and
                urgencies.
              </p>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {MOCK_SYMPTOMS_DB.map((sym, idx) => (
                  <div
                    key={idx}
                    className="premium-card text-left"
                    style={{ padding: 18, borderRadius: 16 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#f1f5f9",
                        }}
                      >
                        {sym.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background:
                            sym.urgency === "High"
                              ? "rgba(239, 68, 68, 0.08)"
                              : sym.urgency === "Medium"
                                ? "rgba(245, 158, 11, 0.08)"
                                : "rgba(16, 185, 129, 0.08)",
                          border:
                            sym.urgency === "High"
                              ? "1px solid rgba(239, 68, 68, 0.25)"
                              : sym.urgency === "Medium"
                                ? "1px solid rgba(245, 158, 11, 0.25)"
                                : "1px solid rgba(16, 185, 129, 0.25)",
                          color:
                            sym.urgency === "High"
                              ? "#fca5a5"
                              : sym.urgency === "Medium"
                                ? "#fcd34d"
                                : "#6ee7b7",
                        }}
                      >
                        {sym.urgency} Urgency
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#06b6d4",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {sym.category} Category
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#94a3b8",
                        lineHeight: 1.5,
                      }}
                    >
                      {sym.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 4: MEDICAL KNOWLEDGE */}
          {activeTab === "knowledge" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: "24px 32px",
                maxWidth: 900,
                margin: "0 auto",
                width: "100%",
              }}
            >
              <h2
                style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}
                className="text-left"
              >
                Medical Knowledge Reference Search
              </h2>
              <p
                style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}
                className="text-left"
              >
                Lookup clinical terms and symptoms to generate quick mock
                summaries.
              </p>

              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <input
                  type="text"
                  placeholder="Type term (e.g. Hypertension, Migraine)..."
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#fff",
                    outline: "none",
                  }}
                  className="focus:border-cyan-500"
                />

                <button
                  onClick={() =>
                    triggerToast(
                      "Search completed. Knowledge term loaded.",
                      "success",
                    )
                  }
                  style={{
                    background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "0 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Retrieve
                </button>
              </div>

              <div
                className="premium-card glow-cyan text-left"
                style={{ padding: "20px 24px", borderRadius: 16 }}
              >
                <h4
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#22d3ee",
                    marginBottom: 10,
                  }}
                >
                  Primary Clinical Classifications
                </h4>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                  Our RAG models index from highly verified databases (WHO
                  guides, Merck manuals, and localized clinical datasets) mapped
                  via LangChain FAISS nodes. Describe raw symptoms to initiate
                  automated medical matching queries.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
           RIGHT INSIGHTS PANEL (3rd Column)
        ══════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {showRightPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            style={{
              flexShrink: 0,
              background: "rgba(15, 23, 42, 0.96)",
              borderLeft: "1px solid rgba(8, 145, 178, 0.12)",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
              overflowY: "auto",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ padding: "24px 20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Activity size={14} color="#0891b2" /> Diagnostic Insights
                </span>
                <button
                  onClick={() => setShowRightPanel(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Active Symptom Health Score widget */}
              <div
                className="premium-card text-left"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  marginBottom: 18,
                }}
              >
                <h4
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  Active Assessment
                </h4>
                {activeAnalysis ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background:
                            activeAnalysis.risk === "HIGH"
                              ? "#ef4444"
                              : activeAnalysis.risk === "MEDIUM"
                                ? "#f59e0b"
                                : "#10b981",
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#e2e8f0",
                        }}
                      >
                        {activeAnalysis.condition}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        lineHeight: 1.4,
                      }}
                    >
                      Risk priority:{" "}
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            activeAnalysis.risk === "HIGH"
                              ? "#f87171"
                              : activeAnalysis.risk === "MEDIUM"
                                ? "#fbbf24"
                                : "#34d399",
                        }}
                      >
                        {activeAnalysis.risk}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        lineHeight: 1.5,
                      }}
                    >
                      No active medical analysis evaluated yet. Submit symptom
                      query in the chat area to populate insights.
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Consultation Actions widget */}
              <div
                className="premium-card text-left"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  marginBottom: 18,
                }}
              >
                <h4
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Quick Medical Actions
                </h4>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <button
                    onClick={startConsultation}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(8, 145, 178, 0.06)",
                      border: "1px solid rgba(8, 145, 178, 0.22)",
                      color: "#06b6d4",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.2s",
                    }}
                    className="hover:bg-cyan-600 hover:text-white"
                  >
                    <Video size={13} /> Telemedicine Intake
                  </button>

                  <button
                    onClick={() =>
                      triggerToast(
                        "Medicine Reminders successfully enabled in calendar settings.",
                        "success",
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px solid rgba(255, 255, 255, 0.03)",
                      color: "#cbd5e1",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.2s",
                    }}
                    className="hover:bg-slate-800 text-left"
                  >
                    ⏰ Set Medicine Reminder
                  </button>

                  <button
                    onClick={() =>
                      triggerToast(
                        "No saved healthcare history documents found.",
                        "info",
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px solid rgba(255, 255, 255, 0.03)",
                      color: "#cbd5e1",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.2s",
                    }}
                    className="hover:bg-slate-800 text-left"
                  >
                    📂 Access Health Records
                  </button>
                </div>
              </div>

              {/* Identified Common Symptoms checklist */}
              <div
                className="premium-card text-left"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  marginBottom: 18,
                }}
              >
                <h4
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Common Identified Anomalies
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeAnalysis &&
                  Array.isArray(activeAnalysis.symptoms) &&
                  activeAnalysis.symptoms.length > 0
                    ? activeAnalysis.symptoms.map((s) => (
                        <span
                          key={s}
                          style={{
                            fontSize: 11,
                            background: "rgba(8, 145, 178, 0.06)",
                            border: "1px solid rgba(8, 145, 178, 0.22)",
                            color: "#06b6d4",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontWeight: 600,
                          }}
                        >
                          {s}
                        </span>
                      ))
                    : ["Headache", "Fever", "Cough", "Body Ache", "Chills"].map(
                        (s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: 11,
                              background: "rgba(255, 255, 255, 0.01)",
                              border: "1px solid rgba(255, 255, 255, 0.03)",
                              color: "#64748b",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontWeight: 600,
                            }}
                          >
                            {s}
                          </span>
                        ),
                      )}
                </div>
              </div>

              {/* Visual Workflow Steps (Sidebar quick view) */}
              <div
                className="premium-card text-left"
                style={{ padding: "16px 18px", borderRadius: 14 }}
              >
                <h4
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Symptom Mapping Workflow
                </h4>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "#cbd5e1",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "#0891b2",
                        color: "#fff",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                      }}
                    >
                      1
                    </span>
                    Describe Health Anomaly
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "#cbd5e1",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "#06b6d4",
                        color: "#fff",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                      }}
                    >
                      2
                    </span>
                    Dynamic intake questions
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "#cbd5e1",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "#10b981",
                        color: "#fff",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                      }}
                    >
                      3
                    </span>
                    Clinical report verified
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
           MODALS & SYSTEM DRAWER DIALOGS
        ══════════════════════════════════════ */}

      {/* 1. UPGRADE PREMIUM PLAN MODAL */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                width: "100%",
                maxWidth: 440,
                background: "#0F172A",
                border: "1px solid rgba(8, 145, 178, 0.25)",
                borderRadius: 24,
                padding: "28px 32px",
                position: "relative",
                boxShadow: "0 12px 50px rgba(8, 145, 178, 0.12)",
              }}
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>

              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <Sparkles
                  size={36}
                  color="#06b6d4"
                  style={{ margin: "0 auto 12px" }}
                />
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                  Upgrade to MediSense Pro
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Access advanced clinical diagnostics modules.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                {[
                  "Secure unlimited RAG clinical evaluations",
                  "Dedicated specialists Telehealth video matching",
                  "Direct PDF report downloads & history logs",
                  "Custom voice synthesis & offline logic models",
                ].map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      color: "#e2e8f0",
                      textAnchor: "start",
                    }}
                  >
                    <ShieldCheck
                      size={16}
                      color="#10b981"
                      style={{ flexShrink: 0 }}
                    />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>
                  $29
                </span>
                <span style={{ fontSize: 14, color: "#64748b" }}> / month</span>
              </div>

              <button
                onClick={() => {
                  triggerToast(
                    "Pro Tier unlocked! Thank you for upgrading.",
                    "success",
                  );
                  setShowUpgradeModal(false);
                }}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg,#0891b2,#06b6d4)",
                  border: "none",
                  color: "#fff",
                  padding: "12px 18px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(8, 145, 178, 0.25)",
                }}
              >
                Unlock Pro Access
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TELEMEDICINE VIDEO CALL MODAL */}
      <AnimatePresence>
        {showConsultModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0,0,0,0.92)",
              backdropFilter: "blur(15px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                width: "100%",
                maxWidth: 640,
                background: "#0F172A",
                border: "1px solid rgba(8, 145, 178, 0.22)",
                borderRadius: 24,
                padding: "24px 28px",
                position: "relative",
                boxShadow: "0 12px 50px rgba(0, 0, 0, 0.8)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                  MediSense Telehealth Intake Video
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Secure HIPAA WebRTC Dialer Tunnel
                </p>
              </div>

              {/* Call Screens Container */}
              <div
                style={{
                  height: 280,
                  background: "#000",
                  borderRadius: 16,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                {telecomStatus === "dialing" ? (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        border: "3px solid #0891b2",
                        borderTopColor: "transparent",
                        margin: "0 auto 16px",
                        animation: "spin 1s linear infinite",
                      }}
                      className="animate-spin"
                    />
                    <p
                      style={{
                        fontSize: 14,
                        color: "#06b6d4",
                        fontWeight: 600,
                      }}
                    >
                      Securing doctor matching server...
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "relative",
                    }}
                  >
                    {/* Simulated Doctor Video */}
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(to bottom, #111, #000)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background: "rgba(8, 145, 178, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px",
                          }}
                        >
                          <User size={40} color="#06b6d4" />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700 }}>
                          Dr. Samantha Miller, MD
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#10b981",
                            marginTop: 2,
                          }}
                        >
                          Active Telehealth Connection
                        </p>
                      </div>
                    </div>
                    {/* Self Feed (Mock Picture-in-Picture) */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 12,
                        right: 12,
                        width: 100,
                        height: 130,
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: 10,
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#64748b" }}>
                        Camera On
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Call Controls */}
              <div
                style={{ display: "flex", justifyContent: "center", gap: 14 }}
              >
                <button
                  onClick={endConsultation}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <PhoneCall size={14} /> Disconnect Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SETTINGS & UTILITIES MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                width: "100%",
                maxWidth: 440,
                background: "#0F172A",
                border: "1px solid rgba(8, 145, 178, 0.22)",
                borderRadius: 24,
                padding: "24px 28px",
                position: "relative",
                boxShadow: "0 12px 50px rgba(0, 0, 0, 0.8)",
              }}
            >
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>

              <h3
                style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}
                className="text-left"
              >
                System Configuration
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {/* Voice Enable Toggle */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="text-left">
                    <h4 style={{ fontSize: 14, fontWeight: 700 }}>
                      Voice Output Synthesis
                    </h4>
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      Speak assistant diagnostics automatically.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: "#0891b2",
                      cursor: "pointer",
                    }}
                  />
                </div>

                {/* Default Language Selector */}
                <div className="text-left">
                  <h4
                    style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}
                  >
                    Clinical Language Target
                  </h4>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#000",
                      border: "1px solid rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      padding: 10,
                      color: "#fff",
                      fontSize: 13,
                    }}
                  >
                    <option value="en">English (US)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save Configuration
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
