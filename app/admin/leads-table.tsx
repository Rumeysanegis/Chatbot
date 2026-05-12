"use client";

import { Inbox } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadRow } from "@/lib/services/leads";

function scoreClass(score: number): string {
  if (score >= 70) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 40) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " saat önce";
  if (diff < 7 * 86400) return Math.floor(diff / 86400) + " gün önce";
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function Missing() {
  return <span className="text-zinc-400 italic">—</span>;
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [selected, setSelected] = useState<LeadRow | null>(null);

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border bg-white px-6 py-16 text-center">
        <div className="mx-auto size-12 rounded-full bg-zinc-100 grid place-items-center mb-4">
          <Inbox className="size-6 text-zinc-400" aria-hidden />
        </div>
        <h3 className="font-medium text-zinc-800">Henüz talep yok</h3>
        <p className="text-sm text-zinc-500 mt-1.5 max-w-sm mx-auto">
          Landing page'deki chatbot üzerinden bir talep oluştur, burada
          skoruyla birlikte listelensin.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Skor</TableHead>
              <TableHead>Oluşturuldu</TableHead>
              <TableHead>Şirket</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Ekip</TableHead>
              <TableHead>Aciliyet</TableHead>
              <TableHead>Intent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow
                key={l.id}
                className="cursor-pointer"
                onClick={() => setSelected(l)}
              >
                <TableCell>
                  <Badge variant="outline" className={scoreClass(l.score)}>
                    {l.score}
                  </Badge>
                </TableCell>
                <TableCell
                  className="text-sm text-zinc-600 whitespace-nowrap"
                  title={fmtTime(l.created_at)}
                >
                  {relativeTime(l.created_at)}
                </TableCell>
                <TableCell className="font-medium">{l.company ?? <Missing />}</TableCell>
                <TableCell className="text-sm">{l.email ?? <Missing />}</TableCell>
                <TableCell className="text-sm">{l.role ?? <Missing />}</TableCell>
                <TableCell className="text-sm">{l.team_size ?? <Missing />}</TableCell>
                <TableCell className="text-sm">{l.urgency ?? <Missing />}</TableCell>
                <TableCell className="text-sm max-w-[260px] truncate">
                  {l.intent ?? <Missing />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline" className={scoreClass(selected.score)}>
                    Skor {selected.score}
                  </Badge>
                  <span>{selected.company ?? "Bilinmeyen şirket"}</span>
                </DialogTitle>
                <DialogDescription>
                  {fmtTime(selected.created_at)} · session {selected.session_id?.slice(0, 8) ?? "—"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Email" value={selected.email} />
                <Field label="Rol" value={selected.role} />
                <Field label="Ekip" value={selected.team_size} />
                <Field label="Aciliyet" value={selected.urgency} />
                <Field label="Intent" value={selected.intent} className="col-span-2" />
                <Field
                  label="Problem"
                  value={selected.problem_description}
                  className="col-span-2"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Konuşma</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto rounded-md border bg-zinc-50 p-3">
                  {(selected.transcript ?? []).map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === "user"
                          ? "text-sm"
                          : "text-sm text-zinc-600"
                      }
                    >
                      <span className="font-medium mr-1.5">
                        {m.role === "user" ? "Ziyaretçi:" : "Bot:"}
                      </span>
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                  ))}
                  {(selected.transcript?.length ?? 0) === 0 && (
                    <p className="text-sm text-zinc-500">Transkript kaydedilmemiş.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-0.5">{value && value.trim().length > 0 ? value : "—"}</div>
    </div>
  );
}
