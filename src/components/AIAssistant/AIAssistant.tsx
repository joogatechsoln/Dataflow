import { useState, useRef, useEffect } from "react";
import { sendMessage, Message } from "../../lib/api";
import { useProjectStore } from "../../store/projectStore";
import { useAuthStore } from "../../store/authStore";

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  define: [
    "Help me write a clear problem statement",
    "What success metrics should I track?",
    "Who should be my stakeholders?",
  ],
  collect: [
    "What data do I actually need for my analysis?",
    "How do I connect a PostgreSQL database?",
    "What's the difference between CSV and Excel?",
  ],
  clean: [
    "Why are there so many null values?",
    "When should I remove vs. fill nulls?",
    "How do I handle outliers in my data?",
  ],
  analyze: [
    "Write a SQL query to group by category",
    "How do I calculate a moving average in pandas?",
    "Explain what a JOIN does in simple terms",
  ],
  visualize: [
    "What chart type should I use for this data?",
    "How do I show trends over time clearly?",
    "Make my chart easier for non-experts to read",
  ],
  report: [
    "Summarize my key findings in plain English",
    "How do I explain this to a non-technical audience?",
    "What should go in an executive summary?",
  ],
  general: [
    "Help me get started with data analysis",
    "What's the best approach for my project?",
    "Explain what DataFlow Suite can do",
  ],
};

function renderContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = text.split("\n");
  let key = 0;
  let inCode = false;
  const codeLines: string[] = [];

  const flushCode = () => {
    if (codeLines.length > 0) {
      parts.push(
        <pre key={key++} style={{
          background: "rgba(0,0,0,0.06)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          overflowX: "auto",
          margin: "4px 0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>
          {codeLines.join("\n")}
        </pre>
      );
      codeLines.length = 0;
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) { flushCode(); inCode = false; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("### ")) {
      parts.push(<div key={key++} style={{ fontWeight: 600, fontSize: 12, marginTop: 8, marginBottom: 2 }}>{line.slice(4)}</div>);
    } else if (line.startsWith("## ")) {
      parts.push(<div key={key++} style={{ fontWeight: 600, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{line.slice(3)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      parts.push(
        <div key={key++} style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <span style={{ color: "#534AB7", flexShrink: 0, marginTop: 1 }}>·</span>
          <span>{processInline(line.slice(2), key++)}</span>
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      parts.push(
        <div key={key++} style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <span style={{ color: "#534AB7", flexShrink: 0, fontWeight: 600, minWidth: 16 }}>{num}.</span>
          <span>{processInline(line.replace(/^\d+\. /, ""), key++)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      parts.push(<div key={key++} style={{ height: 5 }} />);
    } else {
      parts.push(<div key={key++}>{processInline(line, key++)}</div>);
    }
  }
  if (inCode) flushCode();
  return parts;
}

function processInline(text: string, baseKey: number): React.ReactNode {
  const segments: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let match;
  let k = baseKey * 100;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) segments.push(text.slice(last, match.index));
    if (match[0].startsWith("**")) {
      segments.push(<strong key={k++}>{match[2]}</strong>);
    } else {
      segments.push(
        <code key={k++} style={{
          background: "rgba(83,74,183,0.12)", padding: "1px 5px",
          borderRadius: 4, fontFamily: "monospace", fontSize: 11,
        }}>{match[3]}</code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments.length === 1 ? segments[0] : <>{segments}</>;
}

export default function AIAssistant({ open, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your DataFlow AI assistant — powered by GPT-4o.\n\nI'm context-aware and tailor my help to whichever pipeline step you're on. What are you working on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { activePipelineTab } = useProjectStore();
  const { openaiApiKey } = useAuthStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg: Message = { role: "user", content };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    let assistantText = "";
    setMessages((m) => [...m, { role: "assistant", content: "…" }]);

    try {
      await sendMessage([...messages, userMsg], activePipelineTab, (chunk) => {
        assistantText += chunk;
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: assistantText },
        ]);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared. I'm still here — what would you like to know?" }]);
    setError("");
  };

  const suggestions = SUGGESTED_PROMPTS[activePipelineTab] ?? SUGGESTED_PROMPTS.general;
  const showSuggestions = messages.length <= 1;

  if (!open) return null;

  return (
    <div style={{
      width: 340, borderLeft: "0.5px solid #e8e6e0",
      display: "flex", flexDirection: "column",
      background: "white", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: "0.5px solid #e8e6e0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #534AB7 0%, #7C6FE0 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>✨</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>AI Assistant</div>
            <div style={{ fontSize: 10, color: "#73726c", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: openaiApiKey ? "#1D9E75" : "#d0cec6",
                display: "inline-block", flexShrink: 0,
              }} />
              {openaiApiKey ? "GPT-4o · Ready" : "No API key · Add in Settings"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <button onClick={clearChat} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: "#b0aea6", padding: "4px 8px", borderRadius: 6,
            fontWeight: 500,
          }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#f0ede8"; (e.target as HTMLElement).style.color = "#73726c"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "none"; (e.target as HTMLElement).style.color = "#b0aea6"; }}
          >Clear</button>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: "#b0aea6", padding: "2px 4px", lineHeight: 1, borderRadius: 4,
          }}>×</button>
        </div>
      </div>

      {/* Context chip */}
      <div style={{
        padding: "5px 14px", background: "#f8f7f5",
        borderBottom: "0.5px solid #f0ede8",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 11, color: "#b0aea6", flexShrink: 0,
      }}>
        Tuned for:
        <span style={{
          background: "var(--brand-light)", color: "var(--brand)",
          padding: "1px 8px", borderRadius: 20, fontWeight: 600,
          textTransform: "capitalize", fontSize: 10,
        }}>{activePipelineTab}</span>
        step
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "14px 12px 0",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "93%", position: "relative" }}
            onMouseEnter={() => setHoveredMsg(i)}
            onMouseLeave={() => setHoveredMsg(null)}
          >
            {msg.role === "assistant" && (
              <div style={{ fontSize: 10, color: "#b0aea6", marginBottom: 3, marginLeft: 1 }}>DataFlow AI</div>
            )}
            <div style={{
              padding: "9px 12px",
              borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #534AB7, #6A5FD0)"
                : "#f0ede8",
              color: msg.role === "user" ? "white" : "#1a1a18",
              fontSize: 12.5, lineHeight: 1.65,
            }}>
              {msg.content === "…" ? <LoadingDots /> : <div>{renderContent(msg.content)}</div>}
            </div>
            {msg.role === "assistant" && msg.content !== "…" && hoveredMsg === i && (
              <button
                onClick={() => copyMessage(msg.content, i)}
                style={{
                  position: "absolute", bottom: -6, right: 0,
                  background: "white", border: "0.5px solid #e8e6e0",
                  borderRadius: 6, padding: "2px 8px",
                  fontSize: 10, color: "#73726c", cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 3,
                  transition: "all 0.1s",
                }}
              >
                {copied === i ? "✓ Copied" : "Copy"}
              </button>
            )}
          </div>
        ))}

        {error && (
          <div style={{
            fontSize: 12, color: "#E24B4A",
            padding: "10px 12px", background: "#FCEBEB",
            borderRadius: 10, lineHeight: 1.5,
          }}>
            <strong>Error:</strong> {error}
            {error.includes("API key") && (
              <div style={{ marginTop: 4, fontSize: 11 }}>
                → Go to <span style={{ color: "#E24B4A", fontWeight: 600 }}>Settings</span> to add your OpenAI key
              </div>
            )}
          </div>
        )}

        {showSuggestions && (
          <div style={{ marginTop: 4, marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: "#b0aea6", marginBottom: 7, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Try asking about {activePipelineTab}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  style={{
                    textAlign: "left", background: "white",
                    border: "0.5px solid #e8e6e0", borderRadius: 8,
                    padding: "8px 11px", fontSize: 12, color: "#3d3d3a",
                    cursor: "pointer", transition: "all 0.15s", lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#AFA9EC";
                    (e.currentTarget as HTMLButtonElement).style.background = "#EEEDFE";
                    (e.currentTarget as HTMLButtonElement).style.color = "#534AB7";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8e6e0";
                    (e.currentTarget as HTMLButtonElement).style.background = "white";
                    (e.currentTarget as HTMLButtonElement).style.color = "#3d3d3a";
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 14 }} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "0.5px solid #e8e6e0", flexShrink: 0 }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          background: "#f8f7f5", border: "0.5px solid #e0deda",
          borderRadius: 10, padding: "7px 8px",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask anything… (Enter sends)"
            rows={1}
            disabled={loading}
            style={{
              flex: 1, background: "transparent", border: "none",
              outline: "none", fontSize: 12.5, resize: "none",
              maxHeight: 96, lineHeight: 1.5, padding: "2px 0",
              boxShadow: "none", borderRadius: 0, fontFamily: "inherit",
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 96) + "px";
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              width: 30, height: 30, borderRadius: 7, border: "none",
              background: loading || !input.trim()
                ? "#e8e6e0"
                : "linear-gradient(135deg, #534AB7, #6A5FD0)",
              color: loading || !input.trim() ? "#b0aea6" : "white",
              cursor: loading || !input.trim() ? "default" : "pointer",
              fontSize: 16, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {loading ? <Spinner /> : "↑"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#c0bdb6", marginTop: 5, textAlign: "center" }}>
          Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "#534AB7",
          display: "inline-block",
          animation: `aiBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
      <style>{`@keyframes aiBounce { 0%,80%,100%{transform:scale(0.55);opacity:0.35} 40%{transform:scale(1);opacity:1} }`}</style>
    </span>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)",
      borderTopColor: "white", borderRadius: "50%",
      display: "inline-block", animation: "aiSpin 0.65s linear infinite",
    }}>
      <style>{`@keyframes aiSpin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}
