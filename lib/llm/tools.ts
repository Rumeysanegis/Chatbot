import { SchemaType, type Tool } from "@google/generative-ai";

// Gemini pitfall #2: `required: []` is intentional and MUST stay empty.
// Gemini's schema validator is strict — declaring a field as required and
// then having the model omit it raises "missing field" errors. We validate
// at runtime instead (see `parseSubmitLeadArgs`).

export const submitLeadTool: Tool = {
  functionDeclarations: [
    {
      name: "submit_lead",
      description:
        "Toplanan iletişim talebini sisteme kaydeder. Yeterli bilgi olduğunda çağır: " +
        "en az bir intent/problem ifadesi + email (veya benzeri iletişim kanalı) + " +
        "ya şirket adı ya da rol. Hiçbir alanı uydurma — sadece kullanıcının söylediği " +
        "bilgileri geçir. Bilinmeyen alanları gönderme (atla).",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          intent: {
            type: SchemaType.STRING,
            description:
              "Ziyaretçinin neden ulaştığının kısa özeti. Örnek: 'dashboard demo istiyor', 'fiyat soruyor', 'mevcut araçtan göç planlıyor'.",
          },
          company: {
            type: SchemaType.STRING,
            description: "Şirket adı.",
          },
          role: {
            type: SchemaType.STRING,
            description: "Ziyaretçinin şirketteki rolü/unvanı.",
          },
          team_size: {
            type: SchemaType.STRING,
            description:
              "Ekip büyüklüğü, kullanıcının verdiği şekilde (örn. '5 kişilik', '20-50', '200+').",
          },
          urgency: {
            type: SchemaType.STRING,
            description:
              "Aciliyet/zaman çerçevesi. Örnek: 'bu çeyrekte başlamak istiyoruz', 'sadece araştırıyorum'.",
          },
          email: {
            type: SchemaType.STRING,
            description:
              "İletişim email'i. Email verilmediyse ama telefon/LinkedIn paylaşıldıysa onu buraya yaz.",
          },
          problem_description: {
            type: SchemaType.STRING,
            description:
              "Ziyaretçinin tarif ettiği spesifik problem veya kullanım senaryosu (intent'ten daha detaylı).",
          },
        },
        required: [],
      },
    },
  ],
};

export interface SubmitLeadArgs {
  intent?: string;
  company?: string;
  role?: string;
  team_size?: string;
  urgency?: string;
  email?: string;
  problem_description?: string;
}

// Runtime validation. Gemini may pass numbers / nulls / extras — we coerce
// to strings and drop empty values so the DB layer sees clean input.
export function parseSubmitLeadArgs(raw: unknown): SubmitLeadArgs {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const pick = (k: keyof SubmitLeadArgs): string | undefined => {
    const v = obj[k];
    if (v == null) return undefined;
    const s = String(v).trim();
    return s.length === 0 ? undefined : s;
  };
  return {
    intent: pick("intent"),
    company: pick("company"),
    role: pick("role"),
    team_size: pick("team_size"),
    urgency: pick("urgency"),
    email: pick("email"),
    problem_description: pick("problem_description"),
  };
}
