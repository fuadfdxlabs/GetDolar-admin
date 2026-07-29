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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const navItems = [
    "Dashboard",
    sheetDisplayName,
    proofTemplateDisplayName,
    "Pembayaran",
    "Laporan",
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#172019]">
      <button
        aria-label={sidebarVisible ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
        className={`fixed bottom-4 z-50 hidden h-10 items-center rounded-md border border-[#cbd4c6] bg-white px-3 text-sm font-bold shadow-sm lg:inline-flex ${
          sidebarVisible ? "left-[17rem]" : "left-4"
        }`}
        onClick={() => setSidebarVisible((value) => !value)}
        type="button"
      >
        {sidebarVisible ? "Tutup sidebar" : "Buka sidebar"}
      </button>

      <aside
        className={`fixed left-0 top-0 hidden h-screen w-64 border-r border-[#d8ded2] bg-[#172019] px-5 py-6 text-white transition-transform duration-200 lg:block ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
              href="#"
              key={item}
            >
              <span className="truncate">{item}</span>
              {index === 1 ? (
                <span className="text-xs">{paymentsLength}</span>
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
      </aside>

      <section
        className={`transition-[padding] duration-200 ${
          sidebarVisible ? "lg:pl-64" : "lg:pl-0"
        }`}
      >
        {children}
      </section>
    </main>
  );
}
