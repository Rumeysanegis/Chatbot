// Lightweight content filter that runs BEFORE Gemini is called.
// Goal: catch obvious spam / mash / empty-but-passed-zod cases so we don't
// burn quota on them. Returns a polite canned reply when blocked.
//
// Design notes:
// - Conservative thresholds — short legitimate Turkish replies ("evet", "yok",
//   "ok") must pass.
// - Triggers only on clearly invalid input. Edge-case ambiguity → let through.
// - Stateless: same input → same decision, can move client-side later.

export interface PreFilterResult {
  ok: boolean;
  reason?: "too_short" | "repetitive" | "no_letters" | "keyboard_mash";
}

// 5+ of the same character in a row anywhere ("heyyyyyy", "aaaaa", "....").
const REPETITIVE_RUN = /(.)\1{4,}/u;

// Whole message has no letter at all — only digits, punctuation, emoji.
// (Single emoji like "👍" still passes if length >= 2; we mainly want to
//  block "!!!!!", "12345", "...."  4+ char nonsense.)
const NO_LETTER = /^[^\p{L}]+$/u;

// Pure keyboard mash on the QWERTY home/top rows. Conservative: requires
// at least 4 chars AND no Turkish-only letters AND only these latin keys.
const KEYBOARD_MASH = /^[asdfghjklqwertyuiopzxcvbnm]{4,}$/i;

// Whitelist: very short replies that are legitimate Turkish answers. Even
// if KEYBOARD_MASH would flag them, never block these.
const SHORT_WHITELIST = new Set([
  "ok", "evet", "yok", "yo", "yes", "no", "hayır", "hayir",
  "tamam", "olur", "peki", "olabilir", "anladım", "anladim",
]);

export function preFilter(raw: string): PreFilterResult {
  const msg = raw.trim();

  if (SHORT_WHITELIST.has(msg.toLowerCase())) {
    return { ok: true };
  }

  if (msg.length < 2) {
    return { ok: false, reason: "too_short" };
  }

  if (REPETITIVE_RUN.test(msg)) {
    return { ok: false, reason: "repetitive" };
  }

  if (msg.length >= 4 && NO_LETTER.test(msg)) {
    return { ok: false, reason: "no_letters" };
  }

  if (msg.length >= 4 && KEYBOARD_MASH.test(msg)) {
    return { ok: false, reason: "keyboard_mash" };
  }

  return { ok: true };
}

// Canned, polite reply the bot gives without ever hitting Gemini.
// Keeps the UX warm — user doesn't see a hard error.
export function preFilterReply(_reason: PreFilterResult["reason"]): string {
  return "Sizi anlayamadım, biraz daha açıklayıcı yazar mısınız? 🙏";
}
