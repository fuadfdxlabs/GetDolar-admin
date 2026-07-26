"use client";

import { useMemo, useState } from "react";

type PaymentProofRow = {
  id: string;
  customer: string;
  phone: string;
  memberId: string;
  method: string;
  destination: string;
  revenue: number;
  referral: number;
  totalDollar: number;
  kurs: number;
  totalRupiah: number;
  adminFee: number;
  amount: number;
  status: string;
  period: string;
  paidAt: string;
  cells: Array<{
    label: string;
    value: string;
  }>;
  searchText: string;
};

type PaymentProofTableProps = {
  payments: PaymentProofRow[];
};

const PAGE_SIZE = 15;

const displayText = (value: string) => value.replace(/_/g, " ");

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDollar = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const createWhatsappMessage = (payment: PaymentProofRow) =>
  [
    "GET DOLAR TA-01",
    "BUKTI PEMBAYARAN",
    "",
    `Halo ${payment.customer}, pembayaran periode ${payment.period} sudah kami proses.`,
    "",
    `ID Member: ${displayText(payment.memberId)}`,
    `No. Invoice: ${payment.id}`,
    `Revenue ($): ${formatDollar(payment.revenue)}`,
    `Referral ($): ${formatDollar(payment.referral)}`,
    `Total Dollar ($): ${formatDollar(payment.totalDollar)}`,
    `Kurs: ${formatRupiah(payment.kurs).replace("Rp", "Rp ")}`,
    `Total Rupiah: ${formatRupiah(payment.totalRupiah)}`,
    `Biaya Admin: ${formatRupiah(payment.adminFee)}`,
    `DITERIMA BERSIH: ${formatRupiah(payment.amount)}`,
    "",
    `Metode Pembayaran: ${payment.method}`,
    `Tujuan Pembayaran: ${payment.destination}`,
    `Tanggal Pembayaran: ${payment.paidAt}`,
    "",
    "Diproses oleh GET DOLAR TA-01",
    "Terima kasih atas partisipasi Anda.",
    "Semoga sukses dan penghasilan terus meningkat.",
  ].join("\n");

const createWhatsappUrl = (payment: PaymentProofRow) =>
  payment.phone
    ? `https://wa.me/${payment.phone}?text=${encodeURIComponent(
        createWhatsappMessage(payment),
      )}`
    : "#";

export function PaymentProofTable({
  payments,
}: PaymentProofTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return payments;
    }

    return payments.filter((payment) =>
      [
        payment.id,
        payment.customer,
        payment.phone,
        payment.memberId,
        payment.period,
        payment.status,
        payment.searchText,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [payments, query]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visiblePayments = filteredPayments.slice(pageStart, pageStart + PAGE_SIZE);

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <section
      className="rounded-lg border border-[#d8ded2] bg-white"
      id="data-sheet"
    >
      <div className="flex flex-col gap-4 border-b border-[#e5eadf] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pendapatan per Member</h3>
          <p className="text-sm text-[#607065]">
            Menampilkan 15 baris per halaman dari data pembayaran.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="payment-search">
            Cari data pembayaran
          </label>
          <input
            className="h-10 w-full rounded-md border border-[#cbd4c6] bg-white px-3 text-sm outline-none focus:border-[#172019] sm:w-72"
            id="payment-search"
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Cari nama, ID member, WA..."
            value={query}
          />
          <span className="rounded-md border border-[#cbd4c6] px-3 py-2 text-sm font-semibold">
            {filteredPayments.length} data
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-[#f7f9f5] text-xs uppercase text-[#607065]">
            <tr>
              <th className="px-5 py-3">No.</th>
              {payments[0]?.cells.map((cell, index) => (
                <th className="px-5 py-3" key={`${index}-${cell.label}`}>
                  {cell.label}
                </th>
              ))}
              <th className="px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0e9]">
            {visiblePayments.map((payment, index) => (
              <tr key={`${payment.id}-${pageStart + index}`}>
                <td className="px-5 py-4 font-semibold text-[#607065]">
                  {pageStart + index + 1}
                </td>
                {payment.cells.map((cell, cellIndex) => (
                  <td
                    className="max-w-52 px-5 py-4"
                    key={`${cellIndex}-${cell.label}`}
                  >
                    <span className="line-clamp-2">{cell.value}</span>
                  </td>
                ))}
                <td className="px-5 py-4">
                  {payment.phone ? (
                    <a
                      className="rounded-md bg-[#25d366] px-3 py-2 text-xs font-bold text-[#062511]"
                      href={createWhatsappUrl(payment)}
                      target="_blank"
                    >
                      Kirim WA
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-[#9b392f]">
                      No WA kosong
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-[#e5eadf] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[#607065]">
          Halaman {currentPage} dari {totalPages} · baris {pageStart + 1}-
          {Math.min(pageStart + PAGE_SIZE, filteredPayments.length)} dari{" "}
          {filteredPayments.length}
        </p>
        <div className="flex gap-2">
          <button
            className="h-10 rounded-md border border-[#cbd4c6] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Sebelumnya
          </button>
          <button
            className="h-10 rounded-md bg-[#172019] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#607065]"
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </section>
  );
}
