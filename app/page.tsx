import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GetDolar Admin Dashboard",
  description:
    "Kelola invoice dari Pend_Per_Member_Final dan kirim tagihan ke WhatsApp.",
};

export const revalidate = 60;

const SHEET_ID = "1igG8M1bQEo6QaE9_y-OyPMLoNs4y6skeO6oKkuorPMo";
const SHEET_GID = "1523444064";
const SHEET_NAME = "Pend_Per_Member_Final";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

type SheetRow = Record<string, string>;

type InvoiceRow = {
  id: string;
  customer: string;
  phone: string;
  package: string;
  amount: number;
  status: string;
  due: string;
  raw: SheetRow;
};

type SheetResult = {
  invoices: InvoiceRow[];
  headers: string[];
  source: "google-sheet" | "fallback";
  error?: string;
};

const fallbackRows: SheetRow[] = [
  {
    Invoice: "INV-2026-0726-001",
    Nama: "Raka Pratama",
    WhatsApp: "6281288809911",
    Produk: "Top Up USD Wallet",
    Pendapatan: "2450000",
    Status: "Menunggu",
    Tanggal: "26 Jul 2026",
  },
  {
    Invoice: "INV-2026-0725-014",
    Nama: "Nadia Store",
    WhatsApp: "6285770014432",
    Produk: "Pembelian Saldo Dolar",
    Pendapatan: "8750000",
    Status: "Dibayar",
    Tanggal: "25 Jul 2026",
  },
  {
    Invoice: "INV-2026-0724-009",
    Nama: "Kirana Media",
    WhatsApp: "6282114402231",
    Produk: "Invoice Campaign",
    Pendapatan: "3250000",
    Status: "Jatuh Tempo",
    Tanggal: "24 Jul 2026",
  },
];

const aliases = {
  id: ["invoice", "invoice id", "id", "kode", "order", "trx", "transaksi"],
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
    "nomor",
  ],
  package: ["produk", "paket", "item", "layanan", "service", "tipe", "jenis"],
  amount: [
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
  status: ["status", "keterangan", "payment status"],
  due: ["tanggal", "date", "tgl", "jatuh tempo", "deadline"],
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

const pickValue = (
  row: SheetRow,
  headers: string[],
  aliasList: string[],
  fallback = "-",
) => {
  const header = headers.find((item) => aliasList.includes(normalize(item)));
  return header ? row[header] || fallback : fallback;
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

const mapRowsToInvoices = (rows: SheetRow[], headers: string[]) =>
  rows.map((row, index) => {
    const amount = parseAmount(pickValue(row, headers, aliases.amount, "0"));

    return {
      id:
        pickValue(row, headers, aliases.id, "") ||
        `ROW-${String(index + 1).padStart(4, "0")}`,
      customer: pickValue(row, headers, aliases.customer, "Tanpa Nama"),
      phone: sanitizePhone(pickValue(row, headers, aliases.phone, "")),
      package: pickValue(row, headers, aliases.package, SHEET_NAME),
      amount,
      status: pickValue(row, headers, aliases.status, "Siap Kirim"),
      due: pickValue(row, headers, aliases.due, "hari ini"),
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
      invoices: mapRowsToInvoices(rows, headers),
      headers,
      source: "google-sheet",
    };
  } catch (error) {
    const headers = Object.keys(fallbackRows[0]);

    return {
      invoices: mapRowsToInvoices(fallbackRows, headers),
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

const createWhatsappMessage = (invoice: InvoiceRow) =>
  `Halo ${invoice.customer}, berikut invoice ${invoice.id} untuk ${invoice.package} sebesar ${formatRupiah(invoice.amount)}. Mohon lakukan pembayaran ${invoice.due !== "-" ? `sebelum ${invoice.due}` : "sesuai tagihan"}. Terima kasih.`;

const createWhatsappUrl = (invoice: InvoiceRow) =>
  invoice.phone
    ? `https://wa.me/${invoice.phone}?text=${encodeURIComponent(
        createWhatsappMessage(invoice),
      )}`
    : "#";

export default async function Home() {
  const sheet = await getSheetData();
  const invoices = sheet.invoices;
  const selectedInvoice = invoices[0];
  const totalAmount = invoices.reduce((total, invoice) => total + invoice.amount, 0);
  const whatsappReady = invoices.filter((invoice) => invoice.phone).length;
  const tableHeaders = sheet.headers.slice(0, 7);

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
          {["Dashboard", SHEET_NAME, "Customer", "Pembayaran", "Laporan"].map(
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
                  <span className="text-xs">{invoices.length}</span>
                ) : null}
              </a>
            ),
          )}
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">WhatsApp aktif</p>
          <p className="mt-1 text-xs leading-5 text-[#b8c9ba]">
            Data invoice dibaca dari tab Google Sheet yang dipilih.
          </p>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="border-b border-[#d8ded2] bg-white/80 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#607065]">
                Source: {SHEET_NAME}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
                Invoice WhatsApp
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

        <div className="grid gap-6 px-5 py-6 md:px-8 xl:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            {sheet.source === "fallback" ? (
              <section className="rounded-lg border border-[#e5c66a] bg-[#fff8df] p-4 text-sm text-[#5c4711]">
                <p className="font-semibold">Google Sheet belum kebaca publik.</p>
                <p className="mt-1 leading-6">
                  Dashboard sudah diarahkan ke tab {SHEET_NAME}, tapi sementara
                  menampilkan contoh data. Detail: {sheet.error}
                </p>
              </section>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Baris sheet", String(invoices.length), SHEET_NAME],
                ["Total pendapatan", formatRupiah(totalAmount), "dari kolom nominal"],
                ["Nomor WA siap", `${whatsappReady}`, "bisa dikirim"],
                [
                  "Status sync",
                  sheet.source === "google-sheet" ? "Live" : "Fallback",
                  `gid ${SHEET_GID}`,
                ],
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

            <section className="rounded-lg border border-[#d8ded2] bg-white p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Mapping Google Sheet</h3>
                  <p className="text-sm text-[#607065]">
                    Kolom dari {SHEET_NAME} dipakai untuk bikin pesan WhatsApp.
                  </p>
                </div>
                <span className="rounded-md bg-[#e6ff7a] px-3 py-1 text-xs font-bold text-[#172019]">
                  {sheet.headers.length} kolom terbaca
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  ["Nama", selectedInvoice.customer],
                  ["WhatsApp", selectedInvoice.phone || "Belum ada nomor"],
                  ["Nominal", formatRupiah(selectedInvoice.amount)],
                  ["Invoice", selectedInvoice.id],
                  ["Produk", selectedInvoice.package],
                  ["Status", selectedInvoice.status],
                ].map(([label, value]) => (
                  <div
                    className="rounded-lg border border-[#e5eadf] bg-[#f9faf6] p-3"
                    key={label}
                  >
                    <p className="text-xs font-semibold uppercase text-[#607065]">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="rounded-lg border border-[#d8ded2] bg-white"
              id="data-sheet"
            >
              <div className="flex items-center justify-between border-b border-[#e5eadf] px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold">{SHEET_NAME}</h3>
                  <p className="text-sm text-[#607065]">
                    Menampilkan data langsung dari worksheet yang dipilih.
                  </p>
                </div>
                <span className="rounded-md border border-[#cbd4c6] px-3 py-2 text-sm font-semibold">
                  {invoices.length} baris
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-[#f7f9f5] text-xs uppercase text-[#607065]">
                    <tr>
                      {tableHeaders.map((header) => (
                        <th className="px-5 py-3" key={header}>
                          {header}
                        </th>
                      ))}
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0e9]">
                    {invoices.slice(0, 12).map((invoice, index) => (
                      <tr key={`${invoice.id}-${index}`}>
                        {tableHeaders.map((header) => (
                          <td className="max-w-52 px-5 py-4" key={header}>
                            <span className="line-clamp-2">
                              {invoice.raw[header] || "-"}
                            </span>
                          </td>
                        ))}
                        <td className="px-5 py-4">
                          {invoice.phone ? (
                            <a
                              className="rounded-md bg-[#25d366] px-3 py-2 text-xs font-bold text-[#062511]"
                              href={createWhatsappUrl(invoice)}
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
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-[#d8ded2] bg-[#172019] p-5 text-white">
              <p className="text-sm font-semibold text-[#e6ff7a]">
                Preview pesan WhatsApp
              </p>
              <div className="mt-4 rounded-lg bg-white p-4 text-[#172019]">
                <p className="text-sm leading-6">
                  {createWhatsappMessage(selectedInvoice)}
                </p>
              </div>
              {selectedInvoice.phone ? (
                <a
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#25d366] px-4 text-sm font-bold text-[#062511]"
                  href={createWhatsappUrl(selectedInvoice)}
                  target="_blank"
                >
                  Kirim invoice ke WhatsApp
                </a>
              ) : (
                <button className="mt-4 h-11 w-full rounded-md bg-[#607065] px-4 text-sm font-bold text-white">
                  Nomor WA belum ada
                </button>
              )}
            </section>

            <section className="rounded-lg border border-[#d8ded2] bg-white p-5">
              <h3 className="text-lg font-semibold">Cara connect</h3>
              <ol className="mt-4 space-y-4 text-sm">
                {[
                  `Dashboard fetch tab ${SHEET_NAME} via gid ${SHEET_GID}.`,
                  "Header sheet dibaca otomatis dari baris pertama.",
                  "Kolom nama, WhatsApp, nominal, status, dan produk dimapping ke invoice.",
                  "Tombol kirim membuat link WhatsApp berisi pesan tagihan.",
                ].map((step, index) => (
                  <li className="flex gap-3" key={step}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e6ff7a] text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="leading-6 text-[#3e4d43]">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-[#d8ded2] bg-white p-5">
              <h3 className="text-lg font-semibold">Agar live kebaca</h3>
              <div className="mt-4 space-y-3 text-sm text-[#3e4d43]">
                <p>
                  Set sharing Google Sheet ke viewer untuk link, atau publish
                  sheet ke web.
                </p>
                <p>
                  Pastikan baris pertama berisi header, terutama kolom nama,
                  WhatsApp, dan pendapatan/nominal.
                </p>
                <p>
                  Tab yang dipakai hanya {SHEET_NAME}, sesuai request bray.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
