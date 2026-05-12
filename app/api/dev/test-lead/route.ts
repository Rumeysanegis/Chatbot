import { NextResponse } from "next/server";

import { insertLead } from "@/lib/services/leads";

export const runtime = "nodejs";

// Dev-only smoke test for the DB insert path.
// Hits the same insertLead() + lead-score chain that submit_lead uses,
// but bypasses Gemini so we can verify Supabase plumbing independently.
// Returns 404 in production.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const row = await insertLead({
      session_id: "dev-test-" + Date.now(),
      intent: "Smoke test lead from /api/dev/test-lead",
      company: "TestCo Holdings",
      role: "VP of Testing",
      team_size: "12 kişilik",
      urgency: "Bu çeyrek",
      email: "test@testco.com",
      problem_description:
        "Bu bir geliştirme sırasında oluşturulan test kaydıdır — Gemini'den bağımsız insert path doğrulaması.",
      transcript: [
        { role: "user", content: "(dev smoke test)", ts: Date.now() },
      ],
      ip: "127.0.0.1",
      user_agent: "dev-test-script",
    });

    return NextResponse.json({
      ok: true,
      leadId: row.id,
      score: row.score,
      message: "Insert succeeded. Check Supabase Table Editor and /admin.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
