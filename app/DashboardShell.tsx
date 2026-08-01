"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type DashboardShellProps = {
  children: ReactNode;
  paymentsLength: number;
  sheetDisplayName: string;
  proofTemplateDisplayName: string;
};

export function DashboardShell({
  children,
  paymentsLength,
  sheetDisplayName,
  proofTemplateDisplayName,
}: DashboardShellProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navItems = [
    { label: "Dashboard", href: "#" },
    { label: sheetDisplayName, href: "#data-sheet", meta: paymentsLength },
    { label: "Update Raw Adsterra", href: "#raw-adsterra" },
    { label: proofTemplateDisplayName, href: "#data-sheet" },
    { label: "Pembayaran", href: "#data-sheet" },
    { label: "Laporan", href: "#data-sheet" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#172019]">
      <button
        aria-label={sidebarVisible ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
        className="fixed bottom-4 left-4 z-50 hidden h-10 items-center rounded-md border border-[#cbd4c6] bg-white px-3 text-sm font-bold shadow-sm lg:inline-flex"
        onClick={() => setSidebarVisible((value) => !value)}
        type="button"
      >
        {sidebarVisible ? "Tutup sidebar" : "Buka sidebar"}
      </button>

      {sidebarVisible ? (
        <button
          aria-label="Tutup sidebar"
          className="fixed inset-0 z-30 hidden bg-black/20 lg:block"
          onClick={() => setSidebarVisible(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-[#d8ded2] bg-[#172019] text-white shadow-2xl transition-transform duration-200 lg:block ${
          sidebarVisible
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="relative h-full w-64 px-5 py-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9fb6a4]">
              GetDolar
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">
              Admin Panel
            </h1>
          </div>
          <nav className="space-y-1 text-sm">
            {navItems.map((item, index) => (
              <a
                className={`flex items-center justify-between rounded-md px-3 py-2.5 ${
                  index === 0
                    ? "bg-[#e6ff7a] font-semibold text-[#172019]"
                    : "text-[#dce8dc] hover:bg-white/10"
                }`}
                href={item.href}
                key={item.label}
                onClick={() => setSidebarVisible(false)}
              >
                <span className="truncate">{item.label}</span>
                {item.meta ? (
                  <span className="text-xs">{item.meta}</span>
                ) : null}
              </a>
            ))}
          </nav>
          <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">WhatsApp aktif</p>
            <p className="mt-1 text-xs leading-5 text-[#b8c9ba]">
              Bukti pembayaran dibuat dari data member yang sudah dibayar.
            </p>
          </div>
        </div>
      </aside>

      <section className="min-w-0">{children}</section>
    </main>
  );
}
