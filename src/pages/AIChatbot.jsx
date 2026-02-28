import React, { useState, useRef, useEffect } from "react";
import "./AIChatbot.css";
import { getFallbackResponse } from "../data/swapbotFallback";

const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em">
    <defs>
      <mask id="ai-bubble-mask">
        <rect width="48" height="48" fill="white" />
        <path d="M 18 14 A 14 14 0 0 1 32 28 A 14 14 0 0 1 26 39.5 A 14 14 0 0 1 18 42 A 14 14 0 0 1 10 39.5 L 2 45 L 6.9 36.5 A 14 14 0 0 1 4 28 A 14 14 0 0 1 18 14 Z" fill="black" stroke="black" strokeWidth="4" strokeLinejoin="round" />
      </mask>
    </defs>

    <g mask="url(#ai-bubble-mask)">
      <path d="M 30 4 A 14 14 0 0 1 41.5 26 L 46 31 L 38 29.5 A 14 14 0 0 1 30 32 A 14 14 0 0 1 16 18 A 14 14 0 0 1 30 4 Z" />
      <line x1="22" y1="12" x2="38" y2="12" />
      <line x1="22" y1="18" x2="38" y2="18" />
      <line x1="26" y1="24" x2="38" y2="24" />
    </g>

    <path d="M 18 14 A 14 14 0 0 1 32 28 A 14 14 0 0 1 26 39.5 A 14 14 0 0 1 18 42 A 14 14 0 0 1 10 39.5 L 2 45 L 6.9 36.5 A 14 14 0 0 1 4 28 A 14 14 0 0 1 18 14 Z" />
    <text x="18.5" y="29.5" fontSize="16" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle" fill="currentColor" stroke="none">AI</text>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="1em" height="1em">
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 3c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3zm0 14c-2.589 0-4.892-1.226-6.384-3.136.009-.036.012-.074.024-.109.112-.331.258-.646.438-.945A6.974 6.974 0 0 1 12 11c2.518 0 4.73 1.328 5.922 3.81.18.299.326.614.438.945.012.035.015.073.024.109C16.892 17.774 14.589 19 12 19z"></path>
  </svg>
);

const SUGGESTIONS = [
  "Tell me a fun fact 🎉",
  "Write a short poem 📝",
  "Help me draft a message",
  "What can you do?",
  "Give me a motivational quote 💪",
  "Tell me a joke 😄",
];

const SWAPBOT_SYSTEM = `You are SwapBot, a friendly and helpful AI assistant built into SwapChat — a modern real-time chat application. 
You are cheerful, concise, and helpful. You love to assist users with writing messages, answering questions, helping with ideas, or just having a fun conversation.
Keep responses conversational and not too long unless asked. Add relevant emojis to make your responses feel lively.`;

// ─── API Keys (only active, user-provided keys) ──────────────────────────────
// NVIDIA keys are confirmed working. Groq key only used if set in .env.
const GROQ_KEY = process.env.REACT_APP_GROQ_API_KEY; // only from .env (hardcoded one was invalid)
const NVIDIA_GLM_KEY = process.env.REACT_APP_NVIDIA_GLM_API_KEY || "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";
const NVIDIA_KIMI_KEY = process.env.REACT_APP_NVIDIA_KIMI_API_KEY || "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";
// ─────────────────────────────────────────────────────────────────────────────

const AIChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const typingIntervalRef = useRef(null);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setIsGenerating(false);
    setIsTyping(false);
  };

  const groqKey = GROQ_KEY;
  const nvidiaGlmKey = NVIDIA_GLM_KEY;
  const nvidiaKimiKey = NVIDIA_KIMI_KEY;

  const hasKey =
    (nvidiaGlmKey && nvidiaGlmKey.startsWith("nvapi-")) ||
    (nvidiaKimiKey && nvidiaKimiKey.startsWith("nvapi-")) ||
    (groqKey && groqKey.startsWith("gsk_"));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (isGenerating) {
      stopGeneration();
    }

    const userText = (text || input).trim();
    if (!userText) return;

    setInput("");
    setError(null);

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);

    const userMsg = {
      id: Date.now(),
      role: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    console.log("SwapBot: Attempting AI response...", {
      hasGroq: !!groqKey,
      hasNvidiaGlm: !!nvidiaGlmKey,
      hasNvidiaKimi: !!nvidiaKimiKey,
    });

    if (!hasKey) {
      await new Promise((r) => setTimeout(r, 1200));
      if (!abortControllerRef.current) return;
      const demoReplies = [
        "Hi there! 👋 I'm SwapBot! Add a Gemini, NVIDIA, or OpenAI API key to the `.env` file to get real AI responses! 🚀",
        "I'm running in demo mode right now. Add an API key to enable real AI responses! ✨",
        "Great question! Once you add an API key, I'll be able to help you fully. 🤖",
      ];
      const reply = demoReplies[messages.length % demoReplies.length];
      setIsTyping(false);
      simulateTyping(reply, Date.now() + 1, "Demo Mode");
      return;
    }

    // Helper: call any OpenAI-compatible API endpoint
    const callAPI = async (endpoint, key, model, history, prompt) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          Authorization: `Bearer ${key}`,
        },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SWAPBOT_SYSTEM },
            ...history,
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 512,
          stream: false,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    };

    try {
      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      let replyText = null;
      let provider = "";

      // ── TIER 1: NVIDIA NIM via GLM key — meta/llama-3.1-70b-instruct ──────
      if (!replyText && nvidiaGlmKey?.startsWith("nvapi-")) {
        try {
          replyText = await callAPI(
            "/api/nvidia/chat/completions",
            nvidiaGlmKey, "meta/llama-3.1-70b-instruct", history, userText
          );
          if (replyText) provider = "🟢 NVIDIA NIM";
        } catch (e) {
          console.warn("NVIDIA GLM key failed:", e.message, "— trying Kimi key...");
        }
      }

      // ── TIER 2: NVIDIA NIM via Kimi key — meta/llama-3.1-70b-instruct ─────
      if (!replyText && nvidiaKimiKey?.startsWith("nvapi-")) {
        try {
          replyText = await callAPI(
            "/api/nvidia/chat/completions",
            nvidiaKimiKey, "meta/llama-3.1-70b-instruct", history, userText
          );
          if (replyText) provider = "🟢 NVIDIA NIM";
        } catch (e) {
          console.warn("NVIDIA Kimi key failed:", e.message, "— trying Groq...");
        }
      }

      // ── TIER 3: Groq (only if env key is set) ───────────────────────────
      if (!replyText && groqKey?.startsWith("gsk_")) {
        try {
          replyText = await callAPI(
            "https://api.groq.com/openai/v1/chat/completions",
            groqKey, "llama-3.1-8b-instant", history, userText
          );
          if (replyText) provider = "⚡ Groq";
        } catch (e) {
          console.warn("Groq failed:", e.message, "— using offline fallback...");
        }
      }

      // ── TIER 4: Local offline fallback ────────────────────────────────────
      if (!replyText) {
        console.warn("SwapBot: All API tiers failed. Using offline fallback.");
        replyText = getFallbackResponse(userText);
        provider = "Offline";
      }

      setIsTyping(false);
      simulateTyping(replyText, Date.now() + 1, provider);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("SwapBot error:", err);
      setIsTyping(false);
      setIsGenerating(false);
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: `⚠️ ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    }
  };

  const simulateTyping = (fullText, botMsgId, provider) => {
    const newMsg = {
      id: botMsgId,
      role: "bot",
      text: "",
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      provider,
    };
    setMessages((prev) => [...prev, newMsg]);

    let currentIndex = 0;
    typingIntervalRef.current = setInterval(() => {
      currentIndex += 3;
      let isDone = false;
      if (currentIndex >= fullText.length) {
        currentIndex = fullText.length;
        isDone = true;
      }

      const currentText = fullText.slice(0, currentIndex);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: currentText }
            : msg
        )
      );

      if (isDone) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        setIsGenerating(false);
      }
    }, 20);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating) {
        sendMessage();
      }
    }
  };

  const clearChat = () => {
    stopGeneration();
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="ai-chatbot-container">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-bot-avatar"><BotIcon /></div>
        <div className="ai-header-info">
          <h2>SwapBot</h2>
          <p>✨ AI Assistant · Powered by Groq & NVIDIA</p>
        </div>
        {messages.length > 0 && (
          <button className="ai-clear-btn" onClick={clearChat} title="Clear chat">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_sweep</span>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="ai-error-banner">
          <span className="material-symbols-outlined">warning</span>
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <div className="ai-welcome-icon"><BotIcon /></div>
            <h3>Hey, I'm SwapBot!</h3>
            <p>Your AI companion on SwapChat. Ask me anything — I'm here to help! 🚀</p>
            {!hasKey && (
              <div style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: 12,
                padding: "10px 16px",
                fontSize: 12,
                color: "#f59e0b",
                maxWidth: 340,
                textAlign: "center",
                lineHeight: 1.6
              }}>
                ⚠️ Demo mode active. Add your Groq or NVIDIA API keys to `.env` for real AI responses.
              </div>
            )}
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="ai-suggestion-chip"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-message ${msg.role === "user" ? "user-msg" : "bot-msg"}`}
              >
                <div className={`ai-msg-avatar ${msg.role === "user" ? "user" : ""}`}>
                  {msg.role === "user" ? <UserIcon /> : <BotIcon />}
                </div>
                <div className="ai-msg-content">
                  <div
                    className="ai-msg-bubble"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.text}
                  </div>
                  <div className="ai-msg-time">{msg.time}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-typing-indicator">
                <div className="ai-msg-avatar"><BotIcon /></div>
                <div className="typing-dots">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="ai-input-area">
        <div className="ai-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask SwapBot anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            autoFocus
          />
          {isGenerating ? (
            <button
              className="ai-send-btn stop-btn"
              onClick={stopGeneration}
              title="Stop Generating"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>stop</span>
            </button>
          ) : (
            <button
              className="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              title="Send"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
            </button>
          )}
        </div>
        <div className="ai-footer-note">
          SwapBot can make mistakes. Powered by Groq &amp; NVIDIA.
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
