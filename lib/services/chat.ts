import fs from "node:fs";
import path from "node:path";
import { type Content, type Part } from "@google/generative-ai";

import { getChatModel } from "@/lib/llm/gemini";
import { parseSubmitLeadArgs, submitLeadTool } from "@/lib/llm/tools";
import { insertLead, type TranscriptMessage } from "@/lib/services/leads";

let cachedSystemPrompt: string | null = null;
function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const p = path.join(process.cwd(), "prompts", "chatbot-system.md");
  cachedSystemPrompt = fs.readFileSync(p, "utf8");
  return cachedSystemPrompt;
}

export interface ChatTurnInput {
  sessionId: string;
  history: Content[];                  // prior messages, oldest first
  userMessage: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ChatTurnResult {
  assistantText: string;
  updatedHistory: Content[];
  leadId?: string;
  leadScore?: number;
}

// Max tool-call iterations per turn — safety against pathological loops.
const MAX_TOOL_ROUNDS = 3;

export async function runChatTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const model = getChatModel({
    systemInstruction: loadSystemPrompt(),
    tools: [submitLeadTool],
  });

  const chat = model.startChat({ history: input.history });

  let leadId: string | undefined;
  let leadScore: number | undefined;

  // Start by sending the user message.
  let result = await chat.sendMessage(input.userMessage);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const calls = result.response.functionCalls();
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[chat-service] round", round,
        "tool calls:", calls?.length ?? 0,
        calls?.map((c) => c.name).join(",") ?? "(none)",
      );
    }
    if (!calls || calls.length === 0) break;

    const toolResponses: Part[] = [];

    for (const call of calls) {
      if (call.name === "submit_lead") {
        // Prevent double-submit in the same session.
        if (leadId) {
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { ok: false, error: "already_submitted" },
            },
          });
          continue;
        }

        try {
          const args = parseSubmitLeadArgs(call.args);

          // Build transcript from history + this turn.
          const transcript = historyToTranscript(input.history);
          transcript.push({ role: "user", content: input.userMessage, ts: Date.now() });

          const row = await insertLead({
            ...args,
            session_id: input.sessionId,
            ip: input.ip ?? null,
            user_agent: input.userAgent ?? null,
            transcript,
          });
          leadId = row.id;
          leadScore = row.score;

          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { ok: true, leadId: row.id, score: row.score },
            },
          });
        } catch (err) {
          console.error(
            "[chat-service] submit_lead handler failed",
            err instanceof Error ? err.message : err,
          );
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { ok: false, error: "insert_failed" },
            },
          });
        }
      } else {
        // Unknown tool — tell the model so it can recover.
        toolResponses.push({
          functionResponse: {
            name: call.name,
            response: { ok: false, error: "unknown_tool" },
          },
        });
      }
    }

    result = await chat.sendMessage(toolResponses);
  }

  const assistantText = (result.response.text() ?? "").trim();
  const updatedHistory = await chat.getHistory();

  return {
    assistantText,
    updatedHistory,
    leadId,
    leadScore,
  };
}

function historyToTranscript(history: Content[]): TranscriptMessage[] {
  const out: TranscriptMessage[] = [];
  for (const msg of history) {
    const text = (msg.parts ?? [])
      .map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (!text) continue;
    if (msg.role === "user") out.push({ role: "user", content: text, ts: 0 });
    else if (msg.role === "model")
      out.push({ role: "assistant", content: text, ts: 0 });
  }
  return out;
}
