import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runChatTurn } from "@/lib/services/chat";
import { preFilter, preFilterReply } from "@/lib/services/pre-filter";
import { checkRateLimit } from "@/lib/services/rate-limit";

export const runtime = "nodejs";

const ChatRequestSchema = z.object({
  sessionId: z.string().min(8).max(128),
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        parts: z.array(z.object({ text: z.string() })).min(1),
      }),
    )
    .max(60),
  openedAt: z.number().int().nonnegative(),
  // Honeypot — clients shouldn't send this. Bots that auto-fill all fields will.
  website: z.string().optional(),
});

const MIN_FILL_MS = 2000;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[api/chat] bad json", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { sessionId, message, history, openedAt, website } = parsed.data;

  // Spam: honeypot. Bots that scrape all inputs will fill `website`.
  if (website && website.trim().length > 0) {
    console.error("[api/chat] honeypot triggered", { sessionId });
    // Return a generic 200 so the bot doesn't learn we caught it.
    return NextResponse.json({
      assistantText: "Talebinizi aldık, en kısa sürede dönüş yapacağız.",
      history,
    });
  }

  // Spam: first message submitted too fast = bot.
  // Only enforced on the FIRST turn (history empty) — later messages can be fast.
  if (history.length === 0) {
    const delta = Date.now() - openedAt;
    if (delta < MIN_FILL_MS) {
      console.error("[api/chat] timing check failed", { sessionId, delta });
      return NextResponse.json({ error: "too_fast" }, { status: 429 });
    }
  }

  const ip = clientIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", resetInSeconds: rl.resetInSeconds },
      { status: 429 },
    );
  }

  // Pre-filter BEFORE Gemini: cheap regex check for gibberish / mash / pure
  // punctuation. Returns a polite canned reply without burning quota.
  const pf = preFilter(message);
  if (!pf.ok) {
    console.log("[pre-filter] rejected:", pf.reason, "msg:", JSON.stringify(message.slice(0, 40)));
    return NextResponse.json({
      assistantText: preFilterReply(pf.reason),
      history, // unchanged — Gemini never sees this turn
    });
  }

  try {
    const result = await runChatTurn({
      sessionId,
      history,
      userMessage: message,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
    });

    return NextResponse.json({
      assistantText: result.assistantText,
      history: result.updatedHistory,
      leadId: result.leadId,
      leadScore: result.leadScore,
    });
  } catch (err) {
    console.error("[api/chat] turn failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
