"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Mirror of Gemini's Content type, kept minimal for the wire.
interface WireContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Merhaba 👋 NextReach asistanıyım. Size nasıl yardımcı olabilirim — dashboard'umuz hakkında bilgi mi alıyorsunuz, yoksa belirli bir ihtiyaç için mi ulaştınız?",
};

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ChatWidget({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [history, setHistory] = useState<WireContent[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ leadId: string; score: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Honeypot (hidden input). Bots that auto-fill all inputs will populate this.
  const [honeypot, setHoneypot] = useState("");

  // Per-mount session + opened-at timestamp. Reset when dialog reopens fresh.
  const sessionId = useMemo(makeSessionId, []);
  const openedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now();
    }
  }, [open]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || submitted) return;

    setInput("");
    setErrorMsg(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          history,
          openedAt: openedAtRef.current,
          website: honeypot,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 429 && data.error === "rate_limited") {
          setErrorMsg("Çok hızlı gönderiyorsunuz. Lütfen biraz bekleyip tekrar deneyin.");
        } else if (res.status === 429 && data.error === "too_fast") {
          setErrorMsg("Bir saniye bekleyip tekrar dener misiniz?");
        } else {
          setErrorMsg("Bir hata oluştu, lütfen tekrar deneyin.");
        }
        return;
      }

      const data = (await res.json()) as {
        assistantText: string;
        history: WireContent[];
        leadId?: string;
        leadScore?: number;
      };

      setHistory(data.history);
      setMessages((m) => [...m, { role: "assistant", content: data.assistantText }]);

      if (data.leadId && typeof data.leadScore === "number") {
        setSubmitted({ leadId: data.leadId, score: data.leadScore });
      }
    } catch (err) {
      console.error("[chat-widget] send failed", err);
      setErrorMsg("Bağlantı sorunu, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle>NextReach Asistan</DialogTitle>
          <DialogDescription>
            Birkaç soruyla size en iyi nasıl yardım edebileceğimizi anlayalım.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto px-5 py-4 space-y-3 bg-muted/30"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && <TypingBubble />}
          {errorMsg && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {errorMsg}
            </div>
          )}
          {submitted && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              Talebiniz alındı (#{submitted.leadId.slice(0, 8)}). Satış ekibimiz iş günü içinde dönecek.
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t flex-row gap-2 sm:flex-row sm:justify-between">
          {/* Honeypot: visually hidden but reachable to dumb bots. */}
          <label
            aria-hidden
            style={{
              position: "absolute",
              left: "-9999px",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            }}
            tabIndex={-1}
          >
            Website
            <input
              type="text"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={submitted ? "Talep gönderildi." : "Mesajınızı yazın…"}
            disabled={loading || !!submitted}
            className="flex-1"
            maxLength={1000}
          />
          <Button onClick={send} disabled={loading || !input.trim() || !!submitted}>
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MessageBubble({ role, content }: ChatMessage) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap " +
          (mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-background border rounded-bl-sm")
        }
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-background border rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
        </span>
      </div>
    </div>
  );
}
