import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerativeModel,
  type Content,
  type Tool,
} from "@google/generative-ai";

// Single source of truth for the Gemini client.
// All chat/tool calls go through `getChatModel()` — never `new GoogleGenerativeAI(...)` elsewhere.

const MODEL_ID = "gemini-2.5-flash";

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("[gemini] GEMINI_API_KEY is missing");
  cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

// Asisimo pitfall #3: sales chatbot context legitimately discusses frustrated
// users / cost objections; default safety filters trip on this. Disable.
const SAFETY_BLOCK_NONE = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export interface ChatModelOptions {
  systemInstruction: string;
  tools: Tool[];
}

export function getChatModel(opts: ChatModelOptions): GenerativeModel {
  return getClient().getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: opts.systemInstruction,
    tools: opts.tools,
    safetySettings: SAFETY_BLOCK_NONE,
    generationConfig: {
      // Asisimo pitfall #1: do NOT set responseMimeType "application/json" here.
      // It conflicts with function calling on Gemini 2.5 Flash. Tool args are
      // already structured; we only need JSON-mime mode when there are no tools.
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });
}

export type { Content };
