"use client";

import React, { useState } from "react";
import { Lock, Mail, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function AuthModal({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    try {
      if (isLogin) {
        // Login
        const formBody = new URLSearchParams();
        formBody.append("username", formData.email);
        formBody.append("password", formData.password);

        const res = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString(),
        });

        if (!res.ok) throw new Error("Invalid credentials");
        const data = await res.json();
        onLogin(data.access_token);
      } else {
        // Signup
        const res = await fetch(`${apiUrl}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            email: formData.email,
            password: formData.password,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Signup failed");
        }
        
        // Auto login after signup
        const formBody = new URLSearchParams();
        formBody.append("username", formData.email);
        formBody.append("password", formData.password);
        const loginRes = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString(),
        });
        const loginData = await loginRes.json();
        onLogin(loginData.access_token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #111827 0%, #0B1120 100%)",
          border: "1px solid rgba(8, 145, 178, 0.3)",
          borderRadius: 24,
          padding: "40px 32px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 25px 50px -12px rgba(8, 145, 178, 0.25)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(8, 145, 178, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#06b6d4",
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#f8fafc",
              margin: "0 0 8px 0",
            }}
          >
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
            {isLogin
              ? "Enter your credentials to access your dashboard"
              : "Sign up to start tracking your health journey"}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#f87171",
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isLogin && (
            <div style={{ position: "relative" }}>
              <User
                size={18}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <input
                type="text"
                name="full_name"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "14px 14px 14px 44px",
                  color: "#fff",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </div>
          )}

          <div style={{ position: "relative" }}>
            <Mail
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "14px 14px 14px 44px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "14px 14px 14px 44px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(to right, #0891b2, #2563eb)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {isLogin ? (
              <>
                Don't have an account? <span style={{ color: "#22d3ee" }}>Sign up</span>
              </>
            ) : (
              <>
                Already have an account? <span style={{ color: "#22d3ee" }}>Sign in</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
