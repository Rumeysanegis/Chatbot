"use client";

import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ChatWidget } from "@/components/chat-widget";

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600" />
          <span className="font-semibold tracking-tight">NextReach</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-600">
          <a href="#features" className="hover:text-zinc-900">Özellikler</a>
          <a href="#pricing" className="hover:text-zinc-900">Fiyatlandırma</a>
          <a href="#about" className="hover:text-zinc-900">Hakkımızda</a>
        </nav>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Bize Ulaşın
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <section className="grid sm:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="size-1.5 rounded-full bg-indigo-500" /> E-ticaret analitiği için tek panel
            </span>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
              Mağazanızda neyin işe yaradığını <span className="text-indigo-600">bugün</span> görün.
            </h1>
            <p className="text-lg text-zinc-600 leading-relaxed max-w-lg">
              NextReach, orta ölçekli e-ticaret ekipleri için kanal, ürün ve kohort analizlerini tek bir
              dashboard'da toplar. Kurulum 10 dakika, ilk içgörü ilk gün.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" onClick={() => setOpen(true)}>
                Bize Ulaşın
              </Button>
              <a href="#features" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Nasıl çalışıyor
              </a>
            </div>
            <p className="text-xs text-zinc-500">
              Ortalama yanıt süresi 1 iş günü. Demo, fiyat, entegrasyon — hepsi tek konuşmada.
            </p>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl border bg-white shadow-xl shadow-indigo-100/40 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Mağaza Özeti · Son 30 gün</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">+18.4%</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Gelir", v: "₺412K" },
                  { l: "Sipariş", v: "1.284" },
                  { l: "CVR", v: "%2.9" },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg border bg-zinc-50/60 p-3">
                    <div className="text-xs text-zinc-500">{k.l}</div>
                    <div className="text-lg font-semibold tracking-tight">{k.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex-1 rounded-lg border bg-gradient-to-br from-indigo-50/60 to-violet-50/60 grid grid-cols-12 items-end gap-1 p-3">
                {[3, 5, 4, 7, 6, 9, 8, 11, 10, 12, 9, 13].map((h, i) => (
                  <div key={i} className="bg-indigo-500/80 rounded-sm" style={{ height: `${h * 6}px` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-24 grid sm:grid-cols-3 gap-6">
          {[
            { t: "Kanal Karması", d: "Reklam, organik ve e-mail kanallarını gerçek bir attribution penceresinden değerlendirin." },
            { t: "Ürün Sinyalleri", d: "Stok dönüşü, marj ve geri iade verisini SKU bazlı tek görünümde toplayın." },
            { t: "Kohort Görünümü", d: "İlk siparişten bugüne kadar müşteri davranışını kohortla izleyin." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-white p-5">
              <div className="size-8 rounded-md bg-indigo-50 text-indigo-600 grid place-items-center mb-3 font-semibold">
                {f.t[0]}
              </div>
              <h3 className="font-semibold tracking-tight">{f.t}</h3>
              <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 rounded-2xl border bg-white p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Bir konuşma kadar uzakta.</h2>
            <p className="text-zinc-600 mt-1.5 max-w-xl">
              Formla başlayıp form-doldurmadan bitiyor. Asistanımız ihtiyacınızı anlıyor, doğru ekip arkadaşına
              yönlendiriyor.
            </p>
          </div>
          <Button size="lg" onClick={() => setOpen(true)}>
            Bize Ulaşın
          </Button>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-zinc-500 flex justify-between">
          <span>© {new Date().getFullYear()} NextReach</span>
          <span>Türkiye'de kuruldu</span>
        </div>
      </footer>

      <ChatWidget open={open} onOpenChange={setOpen} />
    </div>
  );
}
