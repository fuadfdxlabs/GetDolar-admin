import type { Metadata } from "next";
import { PaymentProofTable } from "./PaymentProofTable";

export const metadata: Metadata = {
  title: "GetDolar Admin Dashboard",
  description:
    "Kirim bukti pembayaran member GetDolar ke WhatsApp.",
};

export const revalidate = 60;

const SHEET_ID = "1igG8M1bQEo6QaE9_y-OyPMLoNs4y6skeO6oKkuorPMo";
const SHEET_GID = "1523444064";
const SHEET_NAME = "Pend_Per_Member_Final";
const PROOF_TEMPLATE_SHEET = "Bukti_Pembayaran";
const SHEET_DISPLAY_NAME = "Pendapatan per Member";
const PROOF_TEMPLATE_DISPLAY_NAME = "Bukti Pembayaran";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

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

const displayCellValue = (header: string, value: string) =>
  header === "Member_ID" || header === "Domain_ID" ? displayText(value) : value;

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

const createWhatsappMessage = (payment: PaymentProofRow) =>
  [
    "GET DOLAR",
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
    ...(hasValue(payment.method)
      ? [`Metode Pembayaran: ${payment.method}`]
      : []),
    ...(hasValue(payment.destination)
      ? [`Tujuan Pembayaran: ${payment.destination}`]
      : []),
    `Tanggal Pembayaran: ${formatPaymentDate()}`,
    "",
    "Diproses oleh GET DOLAR TA-01",
    "Terima kasih atas partisipasi Anda.",
    "Semoga sukses dan penghasilan terus meningkat.",
  ].join("\n");

const createSearchText = (payment: PaymentProofRow) =>
  [
    payment.id,
    payment.customer,
    payment.phone,
    payment.memberId,
    payment.method,
    payment.destination,
    payment.status,
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
    period: payment.period,
    paidAt: payment.paidAt,
    cells: tableHeaders.map((header) => ({
      label: displayHeader(header),
      value: displayCellValue(header, payment.raw[header] || "-"),
    })),
    searchText: createSearchText(payment),
  }));

export default async function Home() {
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
    <main className="min-h-screen bg-[#f5f7f4] text-[#172019]">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#d8ded2] bg-[#172019] px-5 py-6 text-white lg:block">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9fb6a4]">
            GetDolar
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            Admin Panel
          </h1>
        </div>
        <nav className="space-y-1 text-sm">
          {[
            "Dashboard",
            SHEET_DISPLAY_NAME,
            PROOF_TEMPLATE_DISPLAY_NAME,
            "Pembayaran",
            "Laporan",
          ].map(
            (item, index) => (
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
                  <span className="text-xs">{payments.length}</span>
                ) : null}
              </a>
            ),
          )}
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">WhatsApp aktif</p>
          <p className="mt-1 text-xs leading-5 text-[#b8c9ba]">
            Bukti pembayaran dibuat dari data member yang sudah dibayar.
          </p>
        </div>
      </aside>

      <section className="lg:pl-64">
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
              <a
                className="inline-flex h-10 items-center rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold"
                href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`}
                target="_blank"
              >
                Buka Sheet
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
                ["Template", PROOF_TEMPLATE_DISPLAY_NAME, "siap dikirim"],
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

            <PaymentProofTable payments={tablePayments} />
          </div>
        </div>
      </section>
    </main>
  );
}
