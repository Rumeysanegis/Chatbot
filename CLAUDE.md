# NextReach Chatbot — Geliştirme Kuralları

6 saatlik staj değerlendirme projesi. Bu dosyadaki kurallar **bağlayıcı**. Yeni feature veya tool ihtiyacı doğarsa **önce sor**.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres) — `@supabase/supabase-js`
- Gemini 2.5 Flash — `@google/generative-ai`
- Vercel (deploy) + Upstash Redis (rate limit, `@upstash/redis` — Vercel KV deprecated)

## Mimari — katman disiplini

**Route → Service → DB.** Route handler'ın içinde **asla** şunları çağırma:

- `supabase.from(...)` → `lib/services/leads.ts` üzerinden.
- `GenerativeModel.generateContent(...)` → `lib/services/chat.ts` üzerinden.
- `redis.get/set` → `lib/services/rate-limit.ts` üzerinden.

Route'un işi: parse + auth check + service çağrısı + response. İş mantığı service'de.

## Tek kaynak (single source of truth)

| Sorumluluk | Dosya |
|---|---|
| Supabase client (server) | `lib/db/supabase.ts` |
| Gemini wrapper | `lib/llm/gemini.ts` |
| Redis client | `lib/db/redis.ts` |
| System prompt | `prompts/chatbot-system.md` |
| Tool tanımları | `lib/llm/tools.ts` |

Başka yerde `createClient(...)` veya `new GoogleGenerativeAI(...)` **yasak**.

## Gemini kurulum — 3 kritik tuzak

Tecrübe, **es geçme**:

1. **`responseMimeType: "application/json"`** — `generationConfig`'te. Yoksa Gemini bazen `​```json` markdown bloğu döner, `JSON.parse` patlar.
2. **`required: []` boş bırak** — `functionDeclarations`'ta. Gemini required'ı sıkı uyguluyor; opsiyonel field koyarsan "missing" hatası verir. Eksik alanı **runtime'da** kontrol et.
3. **`safetySettings: BLOCK_NONE`** — tüm kategoriler. Sales chatbot context'inde "frustrated customer" gibi normal şeylerde safety filter tetikleniyor.

## System prompt kuralları

- `prompts/chatbot-system.md` Türkçe, statik dosya.
- `systemInstruction` olarak yüklenir; **kullanıcı mesajıyla concat YASAK** (prompt injection).
- Bot kişiliği, ton, sıra (intent → şirket → rol → ekip → aciliyet → email), "vermek istemiyorsa atla" kuralı **prompt'ta** — kod içinde state machine yok.

## Tool handler — düz obje

```ts
// DOĞRU
return { ok: true, leadId: "...", score: 78 };

// YANLIŞ — Gemini tool sonucunu yorumlayamaz
return { success: true, data: { ... }, timestamp: ... };
```

Wrapper yok. Sade obje. Hata durumunda `{ ok: false, error: "..." }`.

## Bot akışı

- Tek agent, native function calling, **1 tool: `submit_lead`**.
- Bot, yeterli bilgi topladığında `submit_lead` çağırır → lead DB'ye yazılır → bot kullanıcıya kapanış mesajı verir.
- Sorulacaklar (sırayla, ama LLM esnek olabilir): **intent → şirket → rol → ekip büyüklüğü → aciliyet → email**.
- Kullanıcı bir alanı vermek istemezse: prompt'a "es geç, başka soruya geç" yazılı; LLM yönetir.
- **Hard-code state machine yok.** "Step 1 ise X sor" tarzı kod yazma.

## Lead score (0-100, deterministik — kod hesaplar, LLM değil)

`lib/services/lead-score.ts`:

- Email formatı geçerli: **+20**
- Email iş emaili (gmail/hotmail/yahoo/outlook **değil**): **+15**
- Şirket adı dolu: **+20**
- Spesifik problem tanımı `> 20` karakter: **+25**
- Zaman çerçevesi/aciliyet belirtilmiş: **+20**

Toplam max 100. Admin default sort: `score DESC`.

## Spam koruması

1. **Upstash Redis rate limit**: IP başına 5 dakikada 20 mesaj. Aşılırsa 429.
2. **Honeypot field**: gizli `<input name="website">` — doluysa bot, sessizce reddet.
3. **Form-fill timing**: ilk mesaj `< 2sn`de gönderildiyse bot, reddet.

## Hata görünürlüğü

- **Boş `catch {}` yasak.** Her catch:
  ```ts
  catch (err) {
    console.error("[module-name]", err instanceof Error ? err.message : err);
    throw err; // veya graceful fallback, ama sessizce yutma
  }
  ```
- Module prefix `[chat-service]`, `[lead-service]`, `[gemini]` gibi.

## Out of scope — sormadan kurma

- Auth / kullanıcı hesap sistemi (admin view tek paroal)
- E-posta / SMS entegrasyonu
- i18n / çok dilli destek
- Mobil app (web mobilde çalışır, ayrı app yok)
- Realtime / websocket / SSE streaming
- Vector DB / RAG
- Test framework (Jest/Vitest/Playwright kurma)
- Feature flags
- LangChain / LlamaIndex / multi-agent orchestration

Akla bu sınıfta bir şey gelirse **önce sor**.

## Admin view

- Path: `/admin` — basit password gate (env `ADMIN_PASSWORD`, server-side check).
- Tablo: lead listesi, default sort `score DESC, created_at DESC`.
- Kolonlar: skor (renkli rozet), oluşturulma, intent özeti, şirket, email, rol, ekip, aciliyet, full transcript (modal/expand).
- Filtre yok (MVP); skor sıralaması yeter.

## Env vars (prod & local)

```
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ADMIN_PASSWORD=
UPSTASH_REDIS_REST_URL=     # Vercel Marketplace -> Upstash entegrasyonu otomatik enjekte eder
UPSTASH_REDIS_REST_TOKEN=
```

## Commit / deploy disiplini

- **2. saatte deploy linki al** — boş placeholder ile Vercel'e ilk push, env vars set. Son saatte ENV/build patlayıp teslim edememe riski yok.
- Her büyük değişiklikten sonra commit; sonunda README yaz.
