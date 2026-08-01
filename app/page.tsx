import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "./DashboardShell";
import { PaymentProofTable } from "./PaymentProofTable";
import { RawAdsterraUploader } from "./RawAdsterraUploader";

export const metadata: Metadata = {
  title: "GetDolar Admin Dashboard",
  description:
    "Kirim bukti pembayaran member GetDolar ke WhatsApp.",
};

export const dynamic = "force-dynamic";

const SHEET_ID = "1igG8M1bQEo6QaE9_y-OyPMLoNs4y6skeO6oKkuorPMo";
const SHEET_GID = "1523444064";
const SHEET_NAME = "Pend_Per_Member_Final";
const RAW_ADSTERRA_SHEET = "Raw_Adsterra";
const PROOF_TEMPLATE_SHEET = "Bukti_Pembayaran";
const SHEET_DISPLAY_NAME = "Pendapatan per Member";
const RAW_ADSTERRA_DISPLAY_NAME = "Update Raw Adsterra";
const PROOF_TEMPLATE_DISPLAY_NAME = "Bukti Pembayaran";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const ADMIN_SESSION_COOKIE = "getdolar_admin_session";
const ADMIN_SESSION_VALUE = "getdolar-admin-authenticated";

type SheetRow = Record<string, string>;

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
  sendStatus: string;
  sentAt: string;
  period: string;
  paidAt: string;
  raw: SheetRow;
};

type SheetResult = {
  payments: PaymentProofRow[];
  headers: string[];
  source: "google-sheet" | "fallback";
  error?: string;
};

const fallbackRows: SheetRow[] = [
  {
    Periode: "13/07/2026-19/07/2026",
    Member_ID: "smart-link-3219950 - Asep_sya_mjk - 30276867",
    Hasil_Bersih_Rp: "227523",
    No_Invoice: "INV-2026-0726-001",
    nama: "Asep Syaefullah",
    no_hp: "081324616717",
    Tujuan_Pembayaran: "DANA",
    Status: "Menunggu",
    Tanggal_Bayar: "26 Jul 2026",
  },
  {
    Periode: "13/07/2026-19/07/2026",
    Member_ID: "smart-link-3219950 - Nurf uadi - 30286356",
    Hasil_Bersih_Rp: "237927",
    No_Invoice: "INV-2026-0725-014",
    nama: "Nurf uadi",
    no_hp: "082120044715",
    Tujuan_Pembayaran: "DANA",
    Status: "Dibayar",
    Tanggal_Bayar: "25 Jul 2026",
  },
  {
    Periode: "13/07/2026-19/07/2026",
    Member_ID: "smart-link-3219950 - Juju.Mjk - 30276878",
    Hasil_Bersih_Rp: "127293",
    No_Invoice: "INV-2026-0724-009",
    nama: "Juju Juariah",
    no_hp: "085224221377",
    Tujuan_Pembayaran: "DANA",
    Status: "Jatuh Tempo",
    Tanggal_Bayar: "24 Jul 2026",
  },
];

const aliases = {
  id: [
    "no invoice",
    "no_invoice",
    "invoice",
    "invoice id",
    "id",
    "kode",
    "order",
    "trx",
    "transaksi",
  ],
  customer: [
    "nama",
    "nama member",
    "nama_member",
    "member",
    "customer",
    "client",
    "pelanggan",
    "name",
  ],
  phone: [
    "wa",
    "whatsapp",
    "no wa",
    "nomor wa",
    "nomor whatsapp",
    "phone",
    "telepon",
    "hp",
    "no hp",
    "no_hp",
    "nomor",
  ],
  memberId: ["member id", "member_id", "domain id", "domain_id"],
  method: [
    "bank",
    "metode pembayaran",
    "metode_pembayaran",
    "metode",
    "payment method",
  ],
  destination: [
    "no rekening",
    "no_rekening",
    "rekening",
    "tujuan pembayaran",
    "tujuan_pembayaran",
    "produk",
    "paket",
    "item",
    "layanan",
    "service",
    "tipe",
    "jenis",
  ],
  amount: [
    "hasil bersih rp",
    "hasil_bersih_rp",
    "total rp",
    "total_rp",
    "pendapatan",
    "income",
    "nominal",
    "amount",
    "total",
    "harga",
    "jumlah",
    "saldo",
    "komisi",
    "fee",
  ],
  revenue: ["revenue $", "revenue_$", "revenue", "pendapatan dollar"],
  referral: ["referral $", "referral_$", "referral"],
  totalDollar: ["jumlah $", "jumlah_$", "total dollar $", "total dollar"],
  kurs: ["kurs"],
  totalRupiah: ["total rp", "total_rp", "total rupiah"],
  adminFee: ["biaya rp", "biaya_rp", "biaya admin", "biaya_admin"],
  status: ["status", "keterangan", "payment status"],
  sendStatus: ["status kirim", "status_kirim", "send status", "sent status"],
  sentAt: ["tanggal kirim", "tanggal_kirim", "sent at", "sent_at"],
  period: ["periode", "period"],
  paidAt: [
    "tanggal bayar",
    "tanggal_bayar",
    "tanggal pembayaran",
    "tanggal_pembayaran",
    "tanggal",
    "date",
    "tgl",
  ],
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

const headerLabels: Record<string, string> = {
  Periode: "Periode",
  Member_ID: "ID Member",
  "Revenue_$": "Revenue ($)",
  "Referral_$": "Referral ($)",
  "Jumlah_$": "Total Dollar ($)",
  Kurs: "Kurs",
  Total_Rp: "Total Rupiah",
  Biaya_Rp: "Biaya Admin",
  Hasil_Bersih_Rp: "Diterima Bersih",
  Metode_Pembayaran: "Metode Pembayaran",
  Tujuan_Pembayaran: "Tujuan Pembayaran",
  Tanggal_Bayar: "Tanggal Bayar",
  No_Invoice: "No. Invoice",
  Status: "Status",
  Status_Kirim: "Status Kirim",
  Tanggal_Kirim: "Tanggal Kirim",
  nama: "Nama",
  no_hp: "No. HP",
  no_rekening: "No. Rekening",
  bank: "Bank",
};

const displayHeader = (header: string) =>
  headerLabels[header] ||
  header
    .replace(/[_-]/g, " ")
    .replace(/\brp\b/gi, "Rp")
    .replace(/\bno\b/gi, "No.")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

const displayCellValue = (header: string, value: string) =>
  header === "Member_ID" || header === "Domain_ID"
    ? displayMemberName(value)
    : value;

const pickValue = (
  row: SheetRow,
  headers: string[],
  aliasList: string[],
  fallback = "-",
) => {
  const candidates = aliasList
    .map((alias) => headers.find((item) => normalize(item) === alias))
    .filter((header): header is string => Boolean(header));
  const header = candidates.find((item) => row[item]?.trim());
  return header ? row[header] : fallback;
};

const parseCsv = (csv: string) => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  return rows;
};

const rowsToObjects = (csv: string) => {
  const [headers = [], ...rows] = parseCsv(csv);
  const cleanHeaders = headers.map((header, index) =>
    header.trim() || `Kolom ${index + 1}`,
  );

  return {
    headers: cleanHeaders,
    rows: rows.map((row) =>
      Object.fromEntries(
        cleanHeaders.map((header, index) => [header, row[index]?.trim() ?? ""]),
      ),
    ),
  };
};

const sanitizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
};

const parseAmount = (value: string) => {
  const normalized = value.replace(/[^\d,-]/g, "").replace(/\./g, "");
  const number = Number(normalized.replace(",", "."));

  return Number.isFinite(number) ? number : 0;
};

const mapRowsToPayments = (rows: SheetRow[], headers: string[]) =>
  rows.map((row, index) => {
    const amount = parseAmount(pickValue(row, headers, aliases.amount, "0"));
    const memberId = pickValue(row, headers, aliases.memberId, "-");

    return {
      id:
        pickValue(row, headers, aliases.id, "") ||
        `ROW-${String(index + 1).padStart(4, "0")}`,
      customer:
        pickValue(row, headers, aliases.customer, "") ||
        memberId,
      phone: sanitizePhone(pickValue(row, headers, aliases.phone, "")),
      memberId,
      method: pickValue(row, headers, aliases.method, "-"),
      destination: pickValue(row, headers, aliases.destination, "-"),
      revenue: parseAmount(pickValue(row, headers, aliases.revenue, "0")),
      referral: parseAmount(pickValue(row, headers, aliases.referral, "0")),
      totalDollar: parseAmount(
        pickValue(row, headers, aliases.totalDollar, "0"),
      ),
      kurs: parseAmount(pickValue(row, headers, aliases.kurs, "0")),
      totalRupiah: parseAmount(pickValue(row, headers, aliases.totalRupiah, "0")),
      adminFee: parseAmount(pickValue(row, headers, aliases.adminFee, "0")),
      amount,
      status: pickValue(row, headers, aliases.status, "Siap Kirim"),
      sendStatus: pickValue(row, headers, aliases.sendStatus, "-"),
      sentAt: pickValue(row, headers, aliases.sentAt, "-"),
      period: pickValue(row, headers, aliases.period, "-"),
      paidAt: pickValue(row, headers, aliases.paidAt, "-"),
      raw: row,
    };
  });

async function getSheetData(): Promise<SheetResult> {
  try {
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Google Sheet response ${response.status}`);
    }

    const csv = await response.text();

    if (/doctype html|google sign in|request access/i.test(csv)) {
      throw new Error("Sheet belum public atau export CSV belum bisa dibaca.");
    }

    const { headers, rows } = rowsToObjects(csv);

    if (!headers.length || !rows.length) {
      throw new Error("Sheet kosong atau header belum terbaca.");
    }

    return {
      payments: mapRowsToPayments(rows, headers),
      headers,
      source: "google-sheet",
    };
  } catch (error) {
    const headers = Object.keys(fallbackRows[0]);

    return {
      payments: mapRowsToPayments(fallbackRows, headers),
      headers,
      source: "fallback",
      error:
        error instanceof Error
          ? error.message
          : "Sheet belum bisa dibaca dari server.",
    };
  }
}

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

const createSearchText = (payment: PaymentProofRow) =>
  [
    payment.id,
    payment.customer,
    payment.phone,
    payment.memberId,
    payment.method,
    payment.destination,
    payment.status,
    payment.sendStatus,
    payment.sentAt,
    payment.period,
    payment.paidAt,
    ...Object.values(payment.raw),
  ]
    .join(" ")
    .replace(/_/g, " ");

const createTablePayments = (
  payments: PaymentProofRow[],
  tableHeaders: string[],
) =>
  payments.map((payment) => ({
    id: payment.id,
    customer: payment.customer,
    phone: payment.phone,
    memberId: payment.memberId,
    method: payment.method,
    destination: payment.destination,
    revenue: payment.revenue,
    referral: payment.referral,
    totalDollar: payment.totalDollar,
    kurs: payment.kurs,
    totalRupiah: payment.totalRupiah,
    adminFee: payment.adminFee,
    amount: payment.amount,
    status: payment.status,
    sendStatus: payment.sendStatus,
    sentAt: payment.sentAt,
    period: payment.period,
    paidAt: payment.paidAt,
    cells: tableHeaders.map((header) => ({
      label: displayHeader(header),
      value: displayCellValue(header, payment.raw[header] || "-"),
    })),
    searchText: createSearchText(payment),
  }));

const isAuthenticated = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === ADMIN_SESSION_VALUE;
};

function LoginScreen({ hasError }: { hasError: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-5 text-[#172019]">
      <section className="w-full max-w-sm rounded-lg border border-[#d8ded2] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607065]">
          GET DOLAR
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Login Admin</h1>
        <form action="/api/login" className="mt-6 grid gap-4" method="post" noValidate>
          <label className="grid gap-2 text-sm font-semibold">
            Username
            <input
              autoComplete="username"
              className="h-11 rounded-md border border-[#cbd4c6] px-3 text-sm outline-none focus:border-[#172019]"
              name="username"
              required
              type="text"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Password
            <input
              autoComplete="current-password"
              className="h-11 rounded-md border border-[#cbd4c6] px-3 text-sm outline-none focus:border-[#172019]"
              name="password"
              required
              type="password"
            />
          </label>
          {hasError ? (
            <p className="rounded-md bg-[#ffe7df] px-3 py-2 text-sm font-semibold text-[#9b392f]">
              Username atau password salah.
            </p>
          ) : null}
          <button
            className="h-11 rounded-md bg-[#172019] px-4 text-sm font-bold text-white"
            type="submit"
          >
            Masuk
          </button>
        </form>
      </section>
    </main>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAuthenticated())) {
    const params = searchParams ? await searchParams : {};
    return <LoginScreen hasError={params.login === "error"} />;
  }

  const sheet = await getSheetData();
  const payments = sheet.payments;
  const totalAmount = payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const whatsappReady = payments.filter((payment) => payment.phone).length;
  const tableHeaders = sheet.headers.slice(0, 7);
  const tablePayments = createTablePayments(payments, tableHeaders);

  return (
    <DashboardShell
      paymentsLength={payments.length}
      proofTemplateDisplayName={PROOF_TEMPLATE_DISPLAY_NAME}
      sheetDisplayName={SHEET_DISPLAY_NAME}
    >
        <header className="border-b border-[#d8ded2] bg-white/80 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#607065]">
                Source: {SHEET_DISPLAY_NAME}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
                Bukti Pembayaran WhatsApp
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action="/api/logout" method="post">
                <button
                  className="inline-flex h-10 items-center rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold"
                  type="submit"
                >
                  Logout
                </button>
              </form>
              <a
                className="inline-flex h-10 items-center rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold"
                href={SHEET_EDIT_URL}
                target="_blank"
              >
                Buka Sheet
              </a>
              <a
                className="inline-flex h-10 items-center rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold"
                href="#raw-adsterra"
              >
                Upload Adsterra
              </a>
              <a
                className="inline-flex h-10 items-center rounded-md bg-[#172019] px-4 text-sm font-semibold text-white"
                href="#data-sheet"
              >
                Lihat Data
              </a>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-5 py-6 md:px-8">
          <div className="space-y-6">
            {sheet.source === "fallback" ? (
              <section className="rounded-lg border border-[#e5c66a] bg-[#fff8df] p-4 text-sm text-[#5c4711]">
                <p className="font-semibold">Google Sheet belum kebaca publik.</p>
                <p className="mt-1 leading-6">
                  Dashboard sudah diarahkan ke {SHEET_DISPLAY_NAME}, tapi sementara
                  menampilkan contoh bukti pembayaran. Detail: {sheet.error}
                </p>
              </section>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Data member", String(payments.length), SHEET_DISPLAY_NAME],
                ["Total dibayar", formatRupiah(totalAmount), "dari diterima bersih"],
                ["Nomor WA siap", `${whatsappReady}`, "bisa dikirim"],
                [RAW_ADSTERRA_DISPLAY_NAME, RAW_ADSTERRA_SHEET, "upload CSV"],
              ].map(([label, value, meta]) => (
                <div
                  className="rounded-lg border border-[#d8ded2] bg-white p-4"
                  key={label}
                >
                  <p className="text-sm text-[#607065]">{label}</p>
                  <p className="mt-2 break-words text-2xl font-semibold">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#647663]">
                    {meta}
                  </p>
                </div>
              ))}
            </section>

            <RawAdsterraUploader
              sheetName={RAW_ADSTERRA_SHEET}
              sheetUrl={SHEET_EDIT_URL}
            />

            <PaymentProofTable payments={tablePayments} />
          </div>
        </div>
    </DashboardShell>
  );
}
