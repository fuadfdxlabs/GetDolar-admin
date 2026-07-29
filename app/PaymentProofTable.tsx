"use client";

import { useEffect, useMemo, useState } from "react";

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

type FilterKey =
  | "all"
  | "has-phone"
  | "no-phone"
  | "has-amount"
  | "not-sent";

const PAGE_SIZE = 15;
const MOBILE_PAGE_SIZE = 15;
const SENT_STORAGE_KEY = "getdolar.sentPaymentProofIds";
const COPY_RESET_MS = 1400;

const filters: Array<{
  key: FilterKey;
  label: string;
}> = [
  { key: "all", label: "Semua" },
  { key: "has-phone", label: "Ada WA" },
  { key: "no-phone", label: "No WA kosong" },
  { key: "has-amount", label: "Ada nominal" },
  { key: "not-sent", label: "Belum dikirim" },
];

const displayText = (value: string) => value.replace(/_/g, " ");

const displayMemberName = (value: string) => {
  const cleanValue = displayText(value);
  const parts = cleanValue
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts[0]?.startsWith("smart-link-") && parts[1]) {
    return parts[1];
  }

  return cleanValue;
};

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

const hasValue = (value: string) => value.trim() !== "" && value.trim() !== "-";

const formatPaymentDate = (date = new Date()) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const createPaymentProofLines = (payment: PaymentProofRow) => [
  "GET DOLAR",
  "BUKTI PEMBAYARAN",
  "",
  `Halo ${payment.customer}, pembayaran periode ${payment.period} sudah kami proses.`,
  "",
  `ID Member: ${displayMemberName(payment.memberId)}`,
  `No. Invoice: ${payment.id}`,
  `Revenue ($): ${formatDollar(payment.revenue)}`,
  `Referral ($): ${formatDollar(payment.referral)}`,
  `Total Dollar ($): ${formatDollar(payment.totalDollar)}`,
  `Kurs: ${formatRupiah(payment.kurs).replace("Rp", "Rp ")}`,
  `Total Rupiah: ${formatRupiah(payment.totalRupiah)}`,
  `Biaya Admin: ${formatRupiah(payment.adminFee)}`,
  `DITERIMA BERSIH: ${formatRupiah(payment.amount)}`,
  "",
  ...(hasValue(payment.method)
    ? [`Metode Pembayaran: ${payment.method}`]
    : []),
  ...(hasValue(payment.destination)
    ? [`Tujuan Pembayaran: ${payment.destination}`]
    : []),
  `Tanggal Pembayaran: ${formatPaymentDate()}`,
  "",
  "Diproses oleh GET DOLAR",
  "Terima kasih atas partisipasi Anda.",
  "Semoga sukses dan penghasilan terus meningkat.",
];

const createWhatsappMessage = (payment: PaymentProofRow, proofUrl: string) =>
  [
    "GET DOLAR",
    "BUKTI PEMBAYARAN",
    "",
    `Halo ${payment.customer}, pembayaran periode ${payment.period} sudah kami proses.`,
    `Diterima bersih: ${formatRupiah(payment.amount)}`,
    `No. Invoice: ${payment.id}`,
    "",
    "Untuk detail lengkap, klik link invoice berikut:",
    proofUrl,
    "",
    "Diproses oleh GET DOLAR",
  ].join("\n");

const createWhatsappUrl = (payment: PaymentProofRow, proofUrl: string) =>
  payment.phone
    ? `https://wa.me/${payment.phone}?text=${encodeURIComponent(
        createWhatsappMessage(payment, proofUrl),
      )}`
    : "#";

const createPaymentProofPath = (payment: PaymentProofRow) =>
  `/api/payment-proof?invoice=${encodeURIComponent(payment.id)}`;

export function PaymentProofTable({ payments }: PaymentProofTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_PAGE_SIZE);
  const [selectedPayment, setSelectedPayment] = useState<PaymentProofRow | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<PaymentProofRow[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [showDefaultPreview, setShowDefaultPreview] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SENT_STORAGE_KEY);
      setSentIds(stored ? JSON.parse(stored) : []);
    } catch {
      setSentIds([]);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const filteredPayments = useMemo(() => {
    const filteredByType = payments.filter((payment) => {
      if (filter === "not-sent") {
        return !sentIds.includes(payment.id);
      }

      if (filter === "has-phone") {
        return Boolean(payment.phone);
      }

      if (filter === "no-phone") {
        return !payment.phone;
      }

      if (filter === "has-amount") {
        return payment.amount > 0;
      }

      return true;
    });
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return filteredByType;
    }

    return filteredByType.filter((payment) =>
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
  }, [filter, payments, query, sentIds]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visiblePayments = filteredPayments.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleMobilePayments = filteredPayments.slice(0, mobileVisibleCount);
  const defaultPreviewPayment =
    filteredPayments.find((payment) => payment.phone && payment.amount > 0) ||
    filteredPayments[0] ||
    payments[0];
  const selectedPayments = payments.filter((payment) =>
    selectedIds.includes(payment.id),
  );
  const queuePayment = queue[queueIndex];

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    setMobileVisibleCount(MOBILE_PAGE_SIZE);
  };

  const togglePayment = (payment: PaymentProofRow) => {
    setSelectedIds((current) =>
      current.includes(payment.id)
        ? current.filter((id) => id !== payment.id)
        : [...current, payment.id],
    );
  };

  const selectPayments = (items: PaymentProofRow[]) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      items.filter((payment) => payment.phone).forEach((payment) => {
        next.add(payment.id);
      });
      return Array.from(next);
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setQueue([]);
    setQueueIndex(0);
  };

  const startQueue = (items = selectedPayments) => {
    const sendable = items.filter((payment) => payment.phone);

    if (!sendable.length) {
      return;
    }

    setQueue(sendable);
    setQueueIndex(0);
  };

  const updateFilter = (value: FilterKey) => {
    setFilter(value);
    setPage(1);
    setMobileVisibleCount(MOBILE_PAGE_SIZE);
  };

  const toggleSent = (payment: PaymentProofRow) => {
    setSentIds((current) => {
      const next = current.includes(payment.id)
        ? current.filter((id) => id !== payment.id)
        : [...current, payment.id];
      window.localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getPaymentProofUrl = (payment: PaymentProofRow) => {
    const currentOrigin =
      origin || (typeof window === "undefined" ? "" : window.location.origin);

    return `${currentOrigin}${createPaymentProofPath(payment)}`;
  };

  const openWhatsapp = (payment: PaymentProofRow) => {
    if (!payment.phone) {
      return;
    }

    window.open(
      createWhatsappUrl(payment, getPaymentProofUrl(payment)),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openPaymentProof = (payment: PaymentProofRow) => {
    window.open(getPaymentProofUrl(payment), "_blank", "noopener,noreferrer");
  };

  const copyToClipboard = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  };

  const copyAccountNumber = async (payment: PaymentProofRow) => {
    if (!hasValue(payment.destination)) {
      return;
    }

    await copyToClipboard(payment.destination);
    setCopiedId(payment.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === payment.id ? null : current));
    }, COPY_RESET_MS);
  };

  const resetSentStatuses = () => {
    setSentIds([]);
    window.localStorage.removeItem(SENT_STORAGE_KEY);
  };

  const sentCount = payments.filter((payment) => sentIds.includes(payment.id)).length;

  return (
    <section
      className="rounded-lg border border-[#d8ded2] bg-white"
      id="data-sheet"
    >
      <div className="sticky top-0 z-20 flex flex-col gap-4 border-b border-[#e5eadf] bg-white px-5 py-4 xl:static xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pendapatan per Member</h3>
          <p className="hidden text-sm text-[#607065] sm:block">
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
            {filteredPayments.length} data · {sentCount} terkirim
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((item) => (
            <button
              className={`h-9 shrink-0 rounded-md px-3 text-xs font-bold ${
                filter === item.key
                  ? "bg-[#172019] text-white"
                  : "border border-[#cbd4c6] bg-white text-[#172019]"
              }`}
              key={item.key}
              onClick={() => updateFilter(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {defaultPreviewPayment ? (
            <button
              className="h-10 rounded-md border border-[#cbd4c6] px-3 text-xs font-bold"
              onClick={() => setShowDefaultPreview((value) => !value)}
              type="button"
            >
              {showDefaultPreview ? "Tutup preview WA" : "Preview pesan WA"}
            </button>
          ) : null}
          <button
            className="h-10 rounded-md border border-[#cbd4c6] px-3 text-xs font-bold"
            onClick={() =>
              selectPayments(
                window.innerWidth < 768 ? visibleMobilePayments : visiblePayments,
              )
            }
            type="button"
          >
            Pilih tampil
          </button>
          <button
            className="h-10 rounded-md border border-[#cbd4c6] px-3 text-xs font-bold"
            onClick={() => selectPayments(filteredPayments)}
            type="button"
          >
            Pilih hasil filter
          </button>
          {selectedIds.length ? (
            <button
              className="h-10 rounded-md bg-[#172019] px-3 text-xs font-bold text-white"
              onClick={() => startQueue()}
              type="button"
            >
              Kirim dipilih ({selectedPayments.filter((item) => item.phone).length})
            </button>
          ) : null}
          {selectedIds.length ? (
            <button
              className="h-10 rounded-md border border-[#cbd4c6] px-3 text-xs font-bold"
              onClick={clearSelection}
              type="button"
            >
              Bersihkan
            </button>
          ) : null}
          {sentIds.length ? (
            <button
              className="h-10 rounded-md border border-[#cbd4c6] px-3 text-xs font-bold text-[#9b392f]"
              onClick={resetSentStatuses}
              type="button"
            >
              Reset status terkirim
            </button>
          ) : null}
        </div>
      </div>

      {showDefaultPreview && defaultPreviewPayment ? (
        <div className="border-b border-[#e5eadf] bg-[#172019] p-4 text-white">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="rounded-lg bg-white p-4 text-[#172019]">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6">
                {createWhatsappMessage(
                  defaultPreviewPayment,
                  createPaymentProofPath(defaultPreviewPayment),
                )}
              </pre>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-[#e6ff7a]">
                  Preview pesan WA
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  {defaultPreviewPayment.customer}
                </h3>
              </div>
              {defaultPreviewPayment.phone ? (
                <button
                  className="inline-flex h-11 items-center justify-center rounded-md bg-[#25d366] px-4 text-sm font-bold text-[#062511]"
                  onClick={() => openWhatsapp(defaultPreviewPayment)}
                  type="button"
                >
                  Kirim bukti ke WhatsApp
                </button>
              ) : (
                <button
                  className="h-11 rounded-md bg-[#607065] px-4 text-sm font-bold text-white"
                  type="button"
                >
                  Nomor WA belum ada
                </button>
              )}
              <button
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-4 text-sm font-bold text-white"
                onClick={() => openPaymentProof(defaultPreviewPayment)}
                type="button"
              >
                Buka PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="block md:hidden">
        <div className="divide-y divide-[#edf0e9]">
          {visibleMobilePayments.map((payment, index) => (
            <article className="p-4" key={`${payment.id}-${index}`}>
              <div className="flex items-start justify-between gap-3">
                <label className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#cbd4c6]">
                  <input
                    aria-label={`Pilih ${payment.customer}`}
                    checked={selectedIds.includes(payment.id)}
                    className="h-4 w-4 accent-[#172019]"
                    onChange={() => togglePayment(payment)}
                    type="checkbox"
                  />
                </label>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#607065]">
                    No. {index + 1}
                  </p>
                  <h4 className="mt-1 break-words text-base font-semibold">
                    {payment.customer}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#607065]">
                    {displayMemberName(payment.memberId)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                    sentIds.includes(payment.id)
                      ? "bg-[#172019] text-white"
                      : payment.phone
                      ? "bg-[#d9fbe6] text-[#0d5f2b]"
                      : "bg-[#ffe7df] text-[#9b392f]"
                  }`}
                >
                  {sentIds.includes(payment.id)
                    ? "Terkirim"
                    : payment.phone
                      ? "Ada WA"
                      : "No WA kosong"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-[#f7f9f5] p-3">
                  <p className="text-xs font-semibold text-[#607065]">
                    Diterima Bersih
                  </p>
                  <p className="mt-1 font-semibold">{formatRupiah(payment.amount)}</p>
                </div>
                <div className="rounded-md bg-[#f7f9f5] p-3">
                  <p className="text-xs font-semibold text-[#607065]">
                    Periode
                  </p>
                  <p className="mt-1 text-sm font-semibold">{payment.period}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
                  onClick={() => setSelectedPayment(payment)}
                  type="button"
                >
                  Lihat bukti
                </button>
                {payment.phone ? (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-md bg-[#25d366] px-4 text-sm font-bold text-[#062511]"
                    onClick={() => openWhatsapp(payment)}
                    type="button"
                  >
                    Kirim WA
                  </button>
                ) : (
                  <button
                    className="h-11 rounded-md bg-[#607065] px-4 text-sm font-bold text-white"
                    type="button"
                  >
                    Nomor WA belum ada
                  </button>
                )}
                <button
                  className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
                  onClick={() => openPaymentProof(payment)}
                  type="button"
                >
                  Buka PDF
                </button>
                <button
                  className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!hasValue(payment.destination)}
                  onClick={() => copyAccountNumber(payment)}
                  type="button"
                >
                  {copiedId === payment.id ? "Tersalin" : "Salin Norek"}
                </button>
                {payment.phone ? (
                  <button
                    className="h-11 rounded-md bg-[#172019] px-4 text-sm font-bold text-white"
                    onClick={() => toggleSent(payment)}
                    type="button"
                  >
                    {sentIds.includes(payment.id)
                      ? "Batalkan terkirim"
                      : "Tandai terkirim"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {visibleMobilePayments.length < filteredPayments.length ? (
          <div className="border-t border-[#e5eadf] p-4">
            <button
              className="h-11 w-full rounded-md bg-[#172019] px-4 text-sm font-bold text-white"
              onClick={() =>
                setMobileVisibleCount((value) => value + MOBILE_PAGE_SIZE)
              }
              type="button"
            >
              Muat 15 lagi
            </button>
          </div>
        ) : null}

        {!filteredPayments.length ? (
          <div className="p-6 text-center text-sm font-semibold text-[#607065]">
            Data tidak ditemukan.
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1360px] table-fixed text-left text-sm">
          <thead className="bg-[#f7f9f5] text-xs uppercase text-[#607065]">
            <tr>
              <th className="w-14 px-5 py-3">No.</th>
              <th className="w-20 px-5 py-3">Pilih</th>
              {payments[0]?.cells.map((cell, index) => (
                <th
                  className="px-5 py-3"
                  key={`${index}-${cell.label}`}
                >
                  {cell.label}
                </th>
              ))}
              <th className="w-80 px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0e9]">
            {visiblePayments.map((payment, index) => (
              <tr key={`${payment.id}-${pageStart + index}`}>
                <td className="px-5 py-4 font-semibold text-[#607065]">
                  {pageStart + index + 1}
                </td>
                <td className="px-5 py-4">
                  <input
                    aria-label={`Pilih ${payment.customer}`}
                    checked={selectedIds.includes(payment.id)}
                    className="h-4 w-4 accent-[#172019]"
                    onChange={() => togglePayment(payment)}
                    type="checkbox"
                  />
                </td>
                {payment.cells.map((cell, cellIndex) => (
                  <td
                    className="px-5 py-4"
                    key={`${cellIndex}-${cell.label}`}
                  >
                    <span className="line-clamp-2">{cell.value}</span>
                  </td>
                ))}
                <td className="px-5 py-4">
                  {payment.phone ? (
                    <div className="flex flex-wrap gap-2">
                      <a
                        className="inline-flex h-9 min-w-20 items-center justify-center whitespace-nowrap rounded-md bg-[#25d366] px-3 text-xs font-bold text-[#062511]"
                        href={createWhatsappUrl(payment, getPaymentProofUrl(payment))}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Kirim WA
                      </a>
                      <button
                        className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-bold ${
                          sentIds.includes(payment.id)
                            ? "bg-[#172019] text-white"
                            : "border border-[#cbd4c6]"
                        }`}
                        onClick={() => toggleSent(payment)}
                        type="button"
                      >
                        {sentIds.includes(payment.id) ? "Batalkan" : "Tandai"}
                      </button>
                      <button
                        className="inline-flex h-9 min-w-24 items-center justify-center whitespace-nowrap rounded-md border border-[#cbd4c6] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!hasValue(payment.destination)}
                        onClick={() => copyAccountNumber(payment)}
                        type="button"
                      >
                        {copiedId === payment.id ? "Tersalin" : "Salin Norek"}
                      </button>
                      <a
                        className="inline-flex h-9 min-w-20 items-center justify-center whitespace-nowrap rounded-md border border-[#cbd4c6] px-3 text-xs font-bold"
                        href={createPaymentProofPath(payment)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Buka PDF
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex min-w-20 text-xs font-semibold leading-5 text-[#9b392f]">
                        No WA kosong
                      </span>
                      <a
                        className="inline-flex h-9 min-w-20 items-center justify-center whitespace-nowrap rounded-md border border-[#cbd4c6] px-3 text-xs font-bold"
                        href={createPaymentProofPath(payment)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Buka PDF
                      </a>
                      <button
                        className="inline-flex h-9 min-w-24 items-center justify-center whitespace-nowrap rounded-md border border-[#cbd4c6] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!hasValue(payment.destination)}
                        onClick={() => copyAccountNumber(payment)}
                        type="button"
                      >
                        {copiedId === payment.id ? "Tersalin" : "Salin Norek"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hidden flex-col gap-3 border-t border-[#e5eadf] px-5 py-4 text-sm md:flex sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[#607065]">
          Halaman {currentPage} dari {totalPages} - baris {pageStart + 1}-
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

      {selectedPayment ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 md:hidden">
          <section className="max-h-[84vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-[#607065]">
                  Preview bukti
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {selectedPayment.customer}
                </h3>
              </div>
              <button
                className="h-9 rounded-md border border-[#cbd4c6] px-3 text-sm font-bold"
                onClick={() => setSelectedPayment(null)}
                type="button"
              >
                Tutup
              </button>
            </div>
            <div className="rounded-lg bg-[#f7f9f5] p-4 text-[#172019]">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6">
                {createWhatsappMessage(
                  selectedPayment,
                  createPaymentProofPath(selectedPayment),
                )}
              </pre>
            </div>
            {selectedPayment.phone ? (
              <button
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#25d366] px-4 text-sm font-bold text-[#062511]"
                onClick={() => openWhatsapp(selectedPayment)}
                type="button"
              >
                Kirim bukti ke WhatsApp
              </button>
            ) : (
              <button
                className="mt-4 h-12 w-full rounded-md bg-[#607065] px-4 text-sm font-bold text-white"
                type="button"
              >
                Nomor WA belum ada
              </button>
            )}
            <button
              className="mt-3 h-12 w-full rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
              onClick={() => openPaymentProof(selectedPayment)}
              type="button"
            >
              Buka PDF
            </button>
            {selectedPayment.phone ? (
              <button
                className="mt-3 h-12 w-full rounded-md bg-[#172019] px-4 text-sm font-bold text-white"
                onClick={() => toggleSent(selectedPayment)}
                type="button"
              >
                {sentIds.includes(selectedPayment.id)
                  ? "Batalkan terkirim"
                  : "Tandai terkirim"}
              </button>
            ) : null}
          </section>
        </div>
      ) : null}

      {queuePayment ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d8ded2] bg-white p-4 shadow-2xl md:left-64">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-[#607065]">
                Antrean kirim {queueIndex + 1} dari {queue.length}
              </p>
              <h3 className="mt-1 text-base font-semibold">
                {queuePayment.customer}
              </h3>
              <p className="text-sm text-[#607065]">
                {formatRupiah(queuePayment.amount)} · {queuePayment.phone}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <button
                className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
                onClick={() => setSelectedPayment(queuePayment)}
                type="button"
              >
                Preview
              </button>
              <button
                className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
                onClick={() => openPaymentProof(queuePayment)}
                type="button"
              >
                Buka PDF
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#25d366] px-4 text-sm font-bold text-[#062511]"
                onClick={() => openWhatsapp(queuePayment)}
                type="button"
              >
                Kirim WhatsApp
              </button>
              <button
                className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
                onClick={() => toggleSent(queuePayment)}
                type="button"
              >
                {sentIds.includes(queuePayment.id)
                  ? "Batalkan terkirim"
                  : "Tandai terkirim"}
              </button>
              <button
                className="h-11 rounded-md bg-[#172019] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#607065]"
                disabled={queueIndex >= queue.length - 1}
                onClick={() =>
                  setQueueIndex((value) => Math.min(queue.length - 1, value + 1))
                }
                type="button"
              >
                Berikutnya
              </button>
              <button
                className="h-11 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
                onClick={() => {
                  setQueue([]);
                  setQueueIndex(0);
                }}
                type="button"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
