import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SHEET_ID = "1igG8M1bQEo6QaE9_y-OyPMLoNs4y6skeO6oKkuorPMo";
const SHEET_GID = "1523444064";
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
};

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

const fallbackRows: SheetRow[] = [
  {
    Periode: "13/07/2026-19/07/2026",
    Member_ID: "smart-link-3219950 - Asep_sya_mjk - 30276867",
    Hasil_Bersih_Rp: "227523",
    No_Invoice: "INV-2026-0726-001",
    nama: "Asep Syaefullah",
    no_hp: "081324616717",
    no_rekening: "081324616717",
    bank: "DANA",
    Status: "Menunggu",
    Tanggal_Bayar: "26 Jul 2026",
  },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

const displayText = (value: string) => value.replace(/_/g, " ");

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
      customer: pickValue(row, headers, aliases.customer, "") || memberId,
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
    };
  });

const getPayments = async () => {
  try {
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Sheet belum kebaca.");
    }

    const csv = await response.text();

    if (/doctype html|google sign in|request access/i.test(csv)) {
      throw new Error("Sheet belum public.");
    }

    const { headers, rows } = rowsToObjects(csv);

    return mapRowsToPayments(rows, headers);
  } catch {
    return mapRowsToPayments(fallbackRows, Object.keys(fallbackRows[0]));
  }
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

const escapePdfText = (value: string) =>
  value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapPdfLine = (value: string, limit = 78) => {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= limit) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
};

const encodeAscii = (value: string) => new TextEncoder().encode(value);

const concatBytes = (chunks: Uint8Array[]) => {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
};

const createPaymentProofPdf = async (payment: PaymentProofRow) => {
  const paymentDate = formatPaymentDate();
  const logo = await readFile(join(process.cwd(), "public", "getdolar-logo-pdf.jpg"));
  const details = [
    ["ID Member", displayText(payment.memberId)],
    ["No. Invoice", payment.id],
    ["Periode", payment.period],
    ["Revenue ($)", formatDollar(payment.revenue)],
    ["Referral ($)", formatDollar(payment.referral)],
    ["Total Dollar ($)", formatDollar(payment.totalDollar)],
    ["Kurs", formatRupiah(payment.kurs).replace("Rp", "Rp ")],
    ["Total Rupiah", formatRupiah(payment.totalRupiah)],
    ["Biaya Admin", formatRupiah(payment.adminFee)],
    ["Metode Pembayaran", hasValue(payment.method) ? payment.method : "-"],
    [
      "Tujuan Pembayaran",
      hasValue(payment.destination) ? payment.destination : "-",
    ],
    ["Tanggal Pembayaran", paymentDate],
  ];

  const content: string[] = [];
  const fill = (r: number, g: number, b: number) =>
    content.push(`${r} ${g} ${b} rg`);
  const stroke = (r: number, g: number, b: number) =>
    content.push(`${r} ${g} ${b} RG`);
  const rect = (x: number, y: number, width: number, height: number) =>
    content.push(`${x} ${y} ${width} ${height} re f`);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    content.push(`${x1} ${y1} m`);
    content.push(`${x2} ${y2} l`);
    content.push("S");
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size = 11,
    font = "F1",
  ) => {
    content.push("BT");
    content.push(`/${font} ${size} Tf`);
    content.push(`1 0 0 1 ${x} ${y} Tm`);
    content.push(`(${escapePdfText(value)}) Tj`);
    content.push("ET");
  };
  const rightText = (
    value: string,
    right: number,
    y: number,
    size = 11,
    font = "F1",
  ) => {
    const width = value.length * size * 0.52;
    text(value, right - width, y, size, font);
  };

  fill(0.96, 0.98, 0.95);
  rect(0, 0, 595, 842);
  fill(0.09, 0.13, 0.1);
  rect(0, 732, 595, 110);
  fill(0.9, 1, 0.48);
  rect(0, 732, 595, 7);
  content.push("q");
  content.push("72 0 0 72 46 752 cm");
  content.push("/Logo Do");
  content.push("Q");
  fill(1, 1, 1);
  text("GET DOLAR", 132, 792, 26, "F2");
  text("BUKTI PEMBAYARAN", 132, 768, 13, "F2");
  fill(0.15, 0.83, 0.4);
  rect(432, 784, 108, 26);
  fill(0.04, 0.15, 0.07);
  text("SUDAH DIBAYAR", 446, 793, 10, "F2");

  fill(1, 1, 1);
  rect(36, 622, 523, 82);
  fill(0.09, 0.13, 0.1);
  text("Diterima Bersih", 58, 670, 11, "F2");
  text(formatRupiah(payment.amount), 58, 642, 26, "F2");
  fill(0.38, 0.44, 0.4);
  rightText(`No. Invoice: ${payment.id}`, 535, 674, 10);
  rightText(`Tanggal: ${paymentDate}`, 535, 652, 10);

  fill(1, 1, 1);
  rect(36, 116, 523, 478);
  fill(0.97, 0.98, 0.96);
  rect(36, 552, 523, 42);
  fill(0.09, 0.13, 0.1);
  text(payment.customer, 58, 570, 15, "F2");
  fill(0.38, 0.44, 0.4);
  text(`Pembayaran periode ${payment.period} sudah kami proses.`, 58, 538, 10);

  stroke(0.86, 0.89, 0.83);
  content.push("0.8 w");
  line(58, 520, 537, 520);

  let y = 497;
  details.forEach(([label, value], index) => {
    if (index % 2 === 1) {
      fill(0.98, 0.99, 0.97);
      rect(52, y - 8, 491, 26);
    }
    fill(0.38, 0.44, 0.4);
    text(label, 62, y, 9, "F2");
    fill(0.09, 0.13, 0.1);
    wrapPdfLine(value, 48).forEach((item, lineIndex) => {
      text(item, 220, y - lineIndex * 12, 10);
    });
    y -= 30;
  });

  fill(0.9, 1, 0.48);
  rect(52, 158, 491, 38);
  fill(0.04, 0.15, 0.07);
  text(`DITERIMA BERSIH: ${formatRupiah(payment.amount)}`, 66, 172, 13, "F2");

  fill(0.09, 0.13, 0.1);
  text("Diproses oleh GET DOLAR", 52, 88, 10, "F2");
  fill(0.38, 0.44, 0.4);
  text("Terima kasih atas partisipasi Anda.", 52, 68, 10);
  text("Semoga sukses dan penghasilan terus meningkat.", 52, 52, 10);

  const stream = content.join("\n");
  const objects: Uint8Array[] = [
    encodeAscii("<< /Type /Catalog /Pages 2 0 R >>"),
    encodeAscii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    encodeAscii(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Logo 6 0 R >> >> /Contents 7 0 R >>",
    ),
    encodeAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    encodeAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
    concatBytes([
      encodeAscii(
        `<< /Type /XObject /Subtype /Image /Width 220 /Height 220 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`,
      ),
      logo,
      encodeAscii("\nendstream"),
    ]),
    encodeAscii(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
  ];
  const parts: Uint8Array[] = [encodeAscii("%PDF-1.4\n")];
  const offsets = [0];
  let byteLength = parts[0].length;

  objects.forEach((object, index) => {
    offsets.push(byteLength);
    const chunk = concatBytes([
      encodeAscii(`${index + 1} 0 obj\n`),
      object,
      encodeAscii("\nendobj\n"),
    ]);
    parts.push(chunk);
    byteLength += chunk.length;
  });

  const xrefOffset = byteLength;
  parts.push(encodeAscii(`xref\n0 ${objects.length + 1}\n`));
  parts.push(encodeAscii("0000000000 65535 f \n"));
  offsets.slice(1).forEach((offset) => {
    parts.push(encodeAscii(`${String(offset).padStart(10, "0")} 00000 n \n`));
  });
  parts.push(
    encodeAscii(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    ),
  );

  return concatBytes(parts);
};

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "bukti";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const invoice = url.searchParams.get("invoice")?.trim();

  if (!invoice) {
    return new Response("Invoice wajib diisi.", { status: 400 });
  }

  const payments = await getPayments();
  const payment = payments.find((item) => item.id === invoice);

  if (!payment) {
    return new Response("Bukti pembayaran tidak ditemukan.", { status: 404 });
  }

  return new Response(await createPaymentProofPdf(payment), {
    headers: {
      "content-disposition": `inline; filename="bukti-pembayaran-${safeFilename(payment.id)}.pdf"`,
      "content-type": "application/pdf",
    },
  });
}
