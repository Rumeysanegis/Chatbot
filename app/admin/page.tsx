import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listLeads, type LeadRow } from "@/lib/services/leads";

import { isAuthed, loginAction, logoutAction } from "./actions";
import { LeadsTable } from "./leads-table";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const authed = await isAuthed();

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-50 px-4">
        <form
          action={loginAction}
          className="w-full max-w-sm bg-white border rounded-xl p-6 space-y-4 shadow-sm"
        >
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Admin Girişi</h1>
            <p className="text-sm text-zinc-500 mt-1">
              NextReach iletişim talepleri için iç görünüm.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parola</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error === "invalid" && (
            <p className="text-sm text-destructive">Hatalı parola.</p>
          )}
          {error === "server" && (
            <p className="text-sm text-destructive">
              Sunucu yapılandırması eksik (ADMIN_PASSWORD).
            </p>
          )}
          <Button type="submit" className="w-full">
            Giriş yap
          </Button>
        </form>
      </div>
    );
  }

  let leads: LeadRow[] = [];
  let loadError: string | null = null;
  try {
    leads = await listLeads(200);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "bilinmeyen hata";
    leads = [];
  }

  const totalLeads = leads.length;
  const avgScore =
    totalLeads > 0
      ? Math.round(leads.reduce((s, l) => s + l.score, 0) / totalLeads)
      : 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysLeads = leads.filter(
    (l) => new Date(l.created_at).getTime() >= todayStart.getTime(),
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold tracking-tight">İletişim Talepleri</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Skora göre sıralı · toplam {totalLeads} talep
            </p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Çıkış
            </Button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {!loadError && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Stat label="Toplam Lead" value={totalLeads.toString()} />
            <Stat label="Ortalama Skor" value={avgScore.toString()} suffix="/100" />
            <Stat label="Bugünkü Lead" value={todaysLeads.toString()} />
          </div>
        )}

        {loadError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-destructive p-4 text-sm">
            Talepler yüklenemedi: {loadError}
          </div>
        ) : (
          <LeadsTable leads={leads} />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
        {value}
        {suffix && (
          <span className="text-sm sm:text-base text-zinc-400 ml-1 font-normal">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
