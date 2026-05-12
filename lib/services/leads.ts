import { getSupabase } from "@/lib/db/supabase";
import { scoreLead, type LeadFields } from "@/lib/services/lead-score";

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface InsertLeadInput extends LeadFields {
  session_id: string;
  ip?: string | null;
  user_agent?: string | null;
  transcript: TranscriptMessage[];
  spam_flag?: boolean;
}

export interface LeadRow extends LeadFields {
  id: string;
  created_at: string;
  score: number;
  session_id: string | null;
  ip: string | null;
  user_agent: string | null;
  spam_flag: boolean;
  transcript: TranscriptMessage[];
}

export async function insertLead(input: InsertLeadInput): Promise<LeadRow> {
  const score = scoreLead(input);
  const sb = getSupabase();

  const { data, error } = await sb
    .from("leads")
    .insert({
      intent: input.intent ?? null,
      company: input.company ?? null,
      role: input.role ?? null,
      team_size: input.team_size ?? null,
      urgency: input.urgency ?? null,
      email: input.email ?? null,
      problem_description: input.problem_description ?? null,
      score,
      transcript: input.transcript,
      session_id: input.session_id,
      ip: input.ip ?? null,
      user_agent: input.user_agent ?? null,
      spam_flag: input.spam_flag ?? false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[lead-service] insert failed", error.message);
    throw new Error("Lead insert failed: " + error.message);
  }

  return data as LeadRow;
}

export async function listLeads(limit = 100): Promise<LeadRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[lead-service] list failed", error.message);
    throw new Error("Lead list failed: " + error.message);
  }
  return (data ?? []) as LeadRow[];
}
