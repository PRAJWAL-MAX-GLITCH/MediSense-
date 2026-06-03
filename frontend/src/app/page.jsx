"use client";
import dynamic from "next/dynamic";

// Disable SSR for ChatInterface — it uses localStorage, window.speechSynthesis
// and other browser-only APIs that don't exist on the server.
const ChatInterface = dynamic(() => import("@/components/ChatInterface"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#000000",
        color: "#22d3ee",
        fontFamily: "Inter, sans-serif",
        fontSize: 16,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 24 }}>⚕️</span> Loading MediSense AI…
    </div>
  ),
});

export default function Home() {
  return <ChatInterface />;
}
