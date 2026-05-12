// Deterministic lead score (0-100). Computed in code, never trusted to the LLM.
// Scoring rubric is documented in CLAUDE.md and surfaced via README.

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LeadFields {
  intent?: string | null;
  company?: string | null;
  role?: string | null;
  team_size?: string | null;
  urgency?: string | null;
  email?: string | null;
  problem_description?: string | null;
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_RE.test(email.trim());
}

export function isBusinessEmail(email: string | null | undefined): boolean {
  if (!isValidEmail(email)) return false;
  const domain = email!.trim().toLowerCase().split("@")[1];
  return !!domain && !FREE_EMAIL_DOMAINS.has(domain);
}

export function scoreLead(fields: LeadFields): number {
  let score = 0;

  // 1. Email format valid: +20
  if (isValidEmail(fields.email)) score += 20;

  // 2. Business email (not gmail/yahoo/etc.): +15
  if (isBusinessEmail(fields.email)) score += 15;

  // 3. Company name present: +20
  if ((fields.company ?? "").trim().length > 0) score += 20;

  // 4. Specific problem description > 20 chars: +25
  // We accept either `problem_description` or `intent` as the descriptive field
  // — the LLM may store the detail in either depending on phrasing.
  const problem = (fields.problem_description ?? "").trim();
  const intent = (fields.intent ?? "").trim();
  const longest = problem.length >= intent.length ? problem : intent;
  if (longest.length > 20) score += 25;

  // 5. Urgency / timeframe given: +20
  if ((fields.urgency ?? "").trim().length > 0) score += 20;

  return Math.min(100, Math.max(0, score));
}
