"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useChat() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load consultation history from backend on mount / token change
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchConsultations = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiUrl}/consultations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length === 0) {
            // No history – open a fresh chat
            createNewChat();
            return;
          }
          const mapped = data.map((c) => {
            let parsedReport = null;
            try {
              parsedReport = c.full_report ? JSON.parse(c.full_report) : null;
            } catch (_) {}

            return {
              id: c.id.toString(),
              dbConsultationId: c.id,   // real integer DB id for PDF endpoint
              title: `Consultation – ${new Date(c.date).toLocaleDateString()}`,
              createdAt: new Date(c.date),
              updatedAt: new Date(c.date),
              messages: [
                {
                  id: "user-" + c.id,
                  role: "user",
                  content: c.symptoms,
                  timestamp: new Date(c.date),
                },
                {
                  id: "report-" + c.id,
                  role: "assistant",
                  content: c.full_report || "Report generated.",
                  parsed: parsedReport,
                  consultationId: c.id,  // real integer DB id for PDF endpoint
                  timestamp: new Date(c.date),
                },
              ],
            };
          });
          setSessions(mapped);
          setCurrentSessionId(mapped[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch consultations:", err);
        createNewChat();
      }
    };

    fetchConsultations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNewChat = useCallback(() => {
    const newSession = {
      id: Date.now().toString(),
      title: "New Consultation",
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "👋 Hello! I'm MediSense AI, your multilingual medical assistant. Describe your symptoms to get a clinical assessment.",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  }, []);

  const getCurrentSession = useCallback(
    () => sessions.find((s) => s.id === currentSessionId),
    [sessions, currentSessionId]
  );

  const sendMessage = useCallback(
    async (content) => {
      if (!currentSessionId || !content.trim()) return;

      setIsLoading(true);
      const session = getCurrentSession();
      if (!session) return;

      const userMessage = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, userMessage], updatedAt: new Date() }
            : s
        )
      );

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiUrl}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symptoms: content.trim(),
            session_id: currentSessionId,
            messages: [...session.messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const rawResponse = data.response || data.message || "";

        // Try parsing the JSON response
        let parsedResponse = null;
        try {
          parsedResponse = rawResponse ? JSON.parse(rawResponse) : null;
        } catch (_) {}

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: rawResponse || "No response received.",
          parsed: parsedResponse,
          timestamp: new Date(),
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, assistantMessage], updatedAt: new Date() }
              : s
          )
        );

        // Update session title after first real user message
        if (session.messages.filter((m) => m.role === "user").length === 0) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, title: content.trim().substring(0, 35) + (content.length > 35 ? "…" : "") }
                : s
            )
          );
        }

        // Save consultation to backend and capture returned DB id
        try {
          const token = localStorage.getItem("token");
          if (token && parsedResponse && parsedResponse.type === "analysis") {
            const conditions = parsedResponse.possible_conditions || [];
            const riskLevel = parsedResponse.risk_level || "LOW";
            const saveRes = await fetch(`${apiUrl}/consultations`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                symptoms: content.trim(),
                risk_level: riskLevel,
                possible_conditions: JSON.stringify(conditions),
                full_report: rawResponse,
              }),
            });
            if (saveRes.ok) {
              const saved = await saveRes.json();
              const dbId = saved.id;
              // Attach the real DB consultation id to the assistant message and session
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSessionId) return s;
                  return {
                    ...s,
                    dbConsultationId: dbId,
                    messages: s.messages.map((m) =>
                      m.role === "assistant" && !m.consultationId
                        ? { ...m, consultationId: dbId }
                        : m
                    ),
                  };
                })
              );
            }
          }
        } catch (saveErr) {
          console.error("Failed to save consultation:", saveErr);
        }
      } catch (error) {
        console.error("Request failed:", error);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ Failed to connect to the medical AI. Please check your connection and try again.",
          timestamp: new Date(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, errorMessage], updatedAt: new Date() }
              : s
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, getCurrentSession]
  );

  const deleteChat = useCallback(
    (sessionId) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
        } else {
          createNewChat();
        }
      }
    },
    [currentSessionId, sessions, createNewChat]
  );

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
  };
}
