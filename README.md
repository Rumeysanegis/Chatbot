# NextReach Chatbot

NextReach landing page'i için, "Contact Sales" formunun yerine konulmak üzere yapılmış bir chatbot iletişim agent'ı. Ziyaretçi konuşarak ihtiyacını anlatır,
bot deterministik bir kalite skoruyla iletişim talebi oluşturur, satış ekibi
basit bir admin view üzerinden gelen talepleri görür.

**Yayında:** https://nextreach-chatbot-nine.vercel.app
**Admin:** https://nextreach-chatbot-nine.vercel.app/admin (parola Vercel env'inde `ADMIN_PASSWORD`)

---

## Çalıştırma (lokal)

```bash
npm install
cp .env.example .env.local
# .env.local'ı doldurun (aşağıdaki env vars bölümüne bakın)



npm run dev
# http://localhost:3000 → landing
# http://localhost:3000/admin → admin (ADMIN_PASSWORD ile giriş)
```

### Env vars

| Anahtar | Nereden |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio → Get API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase project settings → API (service_role) |
| `ADMIN_PASSWORD` | Kendin belirle |
| `UPSTASH_REDIS_REST_URL` | Upstash console → DB → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → DB → REST API |

> Upstash boş bırakılırsa rate-limit servisi "allow all + warn-once" moduna düşer
> (lokal dev için bilerek). Production'da set edin.

---

## Teknoloji ve neden

| Katman | Seçim | Gerekçe |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Tek codebase'te frontend + API routes; server component'ler admin view için doğal; Vercel deploy'u sıfır config. |
| Dil | **TypeScript** | Tool argümanlarının/DB satırlarının şekli karmaşık; tip güvenliği refactor süresini düşürür. |
| UI | **Tailwind + shadcn/ui** | Hızlı, prod-kalite component (Dialog, Table, Badge). Tasarım sistemi yazmaya 6 saatte vakit yok. |
| DB | **Supabase (Postgres)** | Hosted Postgres + ücretsiz tier + SQL standardı; lead kayıtları için ilişkisel model abartısız. |
| LLM | **Gemini 2.5 Flash** | Native function calling + chat history API + düşük gecikme. Sales conversation için Opus/Sonnet 4.6 over-engineering. |
| Rate limit | **Upstash Redis** | Vercel serverless'ta stateless; in-memory rate limit cold start sonrası sıfırlanır. (Vercel KV deprecated edildi, Upstash önerilen modern path.) |
| Validation | **Zod** | API gövdesi için tek satır şema, runtime + tip. |

---

## Mimari

```
app/
  api/chat/route.ts          → POST /api/chat: parse + spam check + rate limit + chat service çağrısı
  admin/page.tsx             → Admin sayfası (server component, password gate)
  admin/leads-table.tsx      → Tablo ve detay modal (client component)
  admin/actions.ts           → Server actions (login/logout)
  page.tsx                   → Landing page + ChatWidget mount

components/
  chat-widget.tsx            → Chatbot modal (client). Honeypot + opened-at timing burada.
  ui/...                     → shadcn primitives

lib/
  db/supabase.ts             → Tek Supabase client. Başka yerde createClient yasak.
  db/redis.ts                → Tek Upstash client.
  llm/gemini.ts              → Tek Gemini wrapper. systemInstruction + safetySettings + tools burada.
  llm/tools.ts               → submit_lead function declaration + runtime arg parser.
  services/chat.ts           → Gemini chat loop + tool call → submit_lead handler bağlama.
  services/leads.ts          → insertLead / listLeads (Supabase erişimi sadece burada).
  services/lead-score.ts     → Deterministik 0-100 skor.
  services/rate-limit.ts     → IP-keyed sayaç (Upstash). Redis yoksa pass-through.

prompts/chatbot-system.md    → Türkçe system prompt (kişilik, ton, kurallar, açılış).

supabase/schema.sql          → `leads` tablosu, indeksler, RLS.
```

**Bağlayıcı kurallar (CLAUDE.md):**
- Route → Service → DB katmanı. Route'da `supabase.from()` veya `model.generateContent()` yasak.
- Single source of truth: Supabase/Gemini/Redis client'ları sadece `lib/db/` ve `lib/llm/` altında oluşturulur.
- System prompt user mesajıyla string concat **edilmez** — `systemInstruction` ayrı geçilir (prompt injection).
- Tool handler düz obje döner (`{ ok, leadId, score }`). Wrapper yok.
- Boş `catch {}` yasak; her catch `[module-name]` prefix'iyle loglar.

### Gemini 3 tuzak

1. **`responseMimeType: "application/json"` _function calling ile birlikte set edilmedi_.** İkisi birlikte Gemini 2.5 Flash'ta çakışıyor — tool args zaten structured, ekstra JSON mode parse hatasına yol açabiliyor. Sadece tool'suz JSON çıktıda set edilir.
2. **`required: []` boş** function declaration'da — Gemini required'ı sıkı uyguluyor; opsiyonel alanı zorunlu yazınca "missing field" hatası dökülüyor. Doğrulama runtime'da (`parseSubmitLeadArgs`).
3. **`safetySettings: BLOCK_NONE`** tüm 4 kategoride — sales chatbot'ta "frustrated user / pricing complaint" gibi normal şeylerde filtre tetikleniyordu.

---

## Lead score (0-100, deterministik)

Skor LLM'e güvenilmeden kodda hesaplanır (`lib/services/lead-score.ts`):

| Sinyal | Puan |
|---|---|
| Email format geçerli | +20 |
| Email iş emaili (gmail/yahoo/outlook/icloud vb. **değil**) | +15 |
| Şirket adı dolu | +20 |
| Spesifik problem/intent tanımı > 20 karakter | +25 |
| Aciliyet/zaman çerçevesi belirtilmiş | +20 |

**Maksimum 100.** Admin default sort `score DESC, created_at DESC`. Sales ekibi
listeyi açıp en üstteki 5'i alıp aramaya başlayabilir — sıralama yapmaya
gerek yok.

---

## PRD'de muğlak bıraktıkları → yorumlarım

### Chatbot ne soracak, hangi sırayla, ne zaman "yeter" diyecek?

Sıra: **intent → şirket → rol → ekip büyüklüğü → aciliyet → email.** Ama sıra
LLM'e bağlı, hard-code state machine yok. Bot, kullanıcı kendi başına şirket+rol
söylediyse o blokları atlar.

"Yeter" kararı LLM'in. System prompt'taki kural: **(a)** email veya benzeri
iletişim kanalı, **(b)** açık bir intent ifadesi, **(c)** ya şirket adı ya da rol
toplandıysa `submit_lead` tool'unu çağırır. 8-10 mesajdan sonra kullanıcı
sürüklüyorsa bot kapatır.

Modele rigid bir state machine vermedim çünkü kullanıcı sırayı bozar
("ben Acme'den Mehmet, dashboard fiyatı ne") ve LLM uyumlanabilir.

### Ton ve kişilik

`prompts/chatbot-system.md`'de Türkçe, samimi ama profesyonel. "Hocam/kanka" yok,
"selam/merhaba" var. Çoğu mesaj 1-2 cümle. Emoji minimal (açılışta tek 👋).
Fiyat sorusunda kesin rakam vermez ("plan ve büyüklüğe göre değişir; satış ekibi
size özel teklif hazırlar"). Tone'u koda gömmedim — prompt'ta.

### "İyi lead"i kötüsünden ayırt etme

Yukarıdaki deterministik 0-100 skor + admin sıralaması. Subjektif "model bana iyi
göründü" sinyaline güvenmedim çünkü LLM her zaman pozitif eğilimli.


### Admin view'de ne göstermeli

- **Skor** (renkli rozet: yeşil 70+, sarı 40-70, gri <40) — ilk göze çarpan.
- Şirket, email, rol, ekip, aciliyet, intent özeti, oluşturulma zamanı kolonları.
- Tablo `score DESC` sıralı; filtre veya arama yok (MVP).
- Satıra tıklayınca **tam transkript** modal'da açılır — "neden ulaşmış"a doğrudan cevap.

Filtre/arama eklemedim çünkü ilk gün hacim düşük olacak; sıralama yeter.

### Spam / kötü niyetli kullanım

Üç katman:

1. **Upstash Redis rate limit**: IP başına 5 dakikada 20 mesaj. Aşılırsa 429.
2. **Honeypot field**: gizli `<input name="website">`. Doluysa bot — kullanıcıya
   sahte 200 dön, talep DB'ye yazılmaz (bot anlamasın).
3. **Form-fill timing**: ilk mesaj widget açılışından `< 2sn` sonra geldiyse bot.
   Sadece ilk turn'a uygulanır (sonra hızlı yazmak meşru).

Bunlara ek olarak Gemini `safetySettings` BLOCK_NONE çekildi — false positive'i
azaltıyor ama her şeyin tek katman çöktüğünde rate limit + honeypot zaten ana
hat. Spam_flag kolonu DB'de var ama şu an sadece honeypot setlemiyor — geriye
dönük analiz için hazır.

### Ziyaretçi cevap vermek istemezse

System prompt'ta açık kural: "Vermek istemediği bilgiyi zorlama. 'Sorun değil'
de, o alanı boş bırak, bir sonraki soruya geç." Bot prompt'tan bu davranışı
benimser — koda yazmadım.

DB tarafında tüm alanlar nullable; eksik alanla insert yapılabiliyor.
Skor formülü "alan boşsa o sinyal sıfır" prensibiyle çalışıyor — kayıp veri
otomatik düşük skor demek.

---

## 6 saatte yapamadıklarım / daha fazla zamanda eklerdim

- **Bot uçtan uca live testi** Gemini API free tier'da (Tier 0) günlük 20 istek
  limitine takıldığı için tam yapılamadı (Tier 1 normalde 500/gün — billing
  aktivasyonu gerekiyor). DB layer'ı bağımsız smoke test endpoint'iyle
  (`/api/dev/test-lead`) doğrulandı: service_role JWT + grant + insertLead +
  lead-score + admin list zincirinin tamamı yeşil; deterministik 100 skorla
  satır insert oldu. Üretimde billing açıp Tier 1'e geçmek en pragmatik yol.
  Alternatif olarak Groq (llama-3.3-70b, 1000 RPD free) veya Cerebras (14.4K
  RPD free) düşünüldü — ikisi de OpenAI-uyumlu tool calling destekliyor ama
  Türkçe konuşma kalitesinde Gemini'den geri kalıyorlar. 6 saat içinde stabil
  bir Türkçe konuşma deneyimi öncelik olduğu için Gemini ile kalındı.
- **Test framework yok.** Bilerek (out of scope). 
- **Streaming yok.** Gemini SSE streaming chatbot UX'ini iyileştirir ama 6 saatte
  bug magneti. Loading spinner yeterli. (CLAUDE.md'de scope dışı.)
- **Session persistance yok.** Konuşma client-side state; sayfa yenilenirse
  kaybolur. İdeal: server-side session (Redis), 24h TTL.
- **Admin filtre/arama yok.** Hacim arttığında lazım. shadcn `Command` + Supabase
  `ilike` ile 30 dk.
- **Spam_flag pipeline.** Honeypot kolonu setleyebilir; "konuşmada N kez konu
  dışı işaretle" pipeline'ı yok. LLM'e ek bir tool (`flag_offtopic`) vermek
  burayı doldurur ama 1 tool yeterli kuralına bağlı kaldım.
- **i18n, mobil app, auth, email/SMS** — PRD'nin out-of-scope'u.

---

## Toplam süre

**~5 saat**
