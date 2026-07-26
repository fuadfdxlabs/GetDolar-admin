import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GetDolar Admin Dashboard",
  description:
    "Kelola invoice, cek status pembayaran, dan kirim tagihan ke WhatsApp.",
};

const invoices = [
  {
    id: "INV-2026-0726-001",
    customer: "Raka Pratama",
    phone: "6281288809911",
    package: "Top Up USD Wallet",
    amount: 2450000,
    status: "Menunggu",
    due: "26 Jul 2026",
  },
  {
    id: "INV-2026-0725-014",
    customer: "Nadia Store",
    phone: "6285770014432",
    package: "Pembelian Saldo Dolar",
    amount: 8750000,
    status: "Dibayar",
    due: "25 Jul 2026",
  },
  {
    id: "INV-2026-0724-009",
    customer: "Kirana Media",
    phone: "6282114402231",
    package: "Invoice Campaign",
    amount: 3250000,
    status: "Jatuh Tempo",
    due: "24 Jul 2026",
  },
];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const selectedInvoice = invoices[0];
const whatsappMessage = `Halo ${selectedInvoice.customer}, berikut invoice ${selectedInvoice.id} untuk ${selectedInvoice.package} sebesar ${formatRupiah(selectedInvoice.amount)}. Mohon lakukan pembayaran sebelum ${selectedInvoice.due}. Terima kasih.`;
const whatsappUrl = `https://wa.me/${selectedInvoice.phone}?text=${encodeURIComponent(
  whatsappMessage,
)}`;

export default function Home() {
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
          {["Dashboard", "Invoice", "Customer", "Pembayaran", "Laporan"].map(
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
                {item}
                {index === 1 ? <span className="text-xs">12</span> : null}
              </a>
            ),
          )}
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">WhatsApp aktif</p>
          <p className="mt-1 text-xs leading-5 text-[#b8c9ba]">
            Mode awal memakai link WA dengan pesan invoice otomatis.
          </p>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="border-b border-[#d8ded2] bg-white/80 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#607065]">
                Minggu, 26 Juli 2026
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
                Invoice WhatsApp
              </h2>
            </div>
            <div className="flex gap-2">
              <button className="h-10 rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold">
                Export
              </button>
              <a
                className="inline-flex h-10 items-center rounded-md bg-[#172019] px-4 text-sm font-semibold text-white"
                href="#buat-invoice"
              >
                Buat Invoice
              </a>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-5 py-6 md:px-8 xl:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total invoice", "124", "+18 bulan ini"],
                ["Menunggu bayar", "Rp 42,6 jt", "21 invoice"],
                ["Terkirim WA", "97%", "hari ini"],
                ["Jatuh tempo", "8", "butuh follow up"],
              ].map(([label, value, meta]) => (
                <div
                  className="rounded-lg border border-[#d8ded2] bg-white p-4"
                  key={label}
                >
                  <p className="text-sm text-[#607065]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs font-medium text-[#647663]">
                    {meta}
                  </p>
                </div>
              ))}
            </section>

            <section
              className="rounded-lg border border-[#d8ded2] bg-white p-5"
              id="buat-invoice"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Buat invoice baru</h3>
                  <p className="text-sm text-[#607065]">
                    Isi data customer, lalu kirim lewat WhatsApp.
                  </p>
                </div>
                <span className="rounded-md bg-[#e6ff7a] px-3 py-1 text-xs font-bold text-[#172019]">
                  Draft cepat
                </span>
              </div>

              <form className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  Nama customer
                  <input
                    className="h-11 w-full rounded-md border border-[#cbd4c6] px-3 font-normal outline-none focus:border-[#172019]"
                    defaultValue="Raka Pratama"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Nomor WhatsApp
                  <input
                    className="h-11 w-full rounded-md border border-[#cbd4c6] px-3 font-normal outline-none focus:border-[#172019]"
                    defaultValue="+62 812-8880-9911"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Item invoice
                  <input
                    className="h-11 w-full rounded-md border border-[#cbd4c6] px-3 font-normal outline-none focus:border-[#172019]"
                    defaultValue="Top Up USD Wallet"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Nominal
                  <input
                    className="h-11 w-full rounded-md border border-[#cbd4c6] px-3 font-normal outline-none focus:border-[#172019]"
                    defaultValue="Rp 2.450.000"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold md:col-span-2">
                  Catatan invoice
                  <textarea
                    className="min-h-24 w-full rounded-md border border-[#cbd4c6] px-3 py-3 font-normal outline-none focus:border-[#172019]"
                    defaultValue="Pembayaran dapat dilakukan via transfer bank. Setelah transfer, mohon kirim bukti pembayaran."
                  />
                </label>
              </form>
            </section>

            <section className="rounded-lg border border-[#d8ded2] bg-white">
              <div className="flex items-center justify-between border-b border-[#e5eadf] px-5 py-4">
                <h3 className="text-lg font-semibold">Invoice terbaru</h3>
                <button className="rounded-md border border-[#cbd4c6] px-3 py-2 text-sm font-semibold">
                  Filter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#f7f9f5] text-xs uppercase text-[#607065]">
                    <tr>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Nominal</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0e9]">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-5 py-4 font-mono text-xs">
                          {invoice.id}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold">{invoice.customer}</p>
                          <p className="text-xs text-[#607065]">
                            {invoice.phone}
                          </p>
                        </td>
                        <td className="px-5 py-4">{invoice.package}</td>
                        <td className="px-5 py-4 font-semibold">
                          {formatRupiah(invoice.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-[#eef3ea] px-2.5 py-1 text-xs font-bold">
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <a
                            className="rounded-md bg-[#25d366] px-3 py-2 text-xs font-bold text-[#062511]"
                            href={`https://wa.me/${invoice.phone}?text=${encodeURIComponent(
                              `Halo ${invoice.customer}, berikut invoice ${invoice.id} sebesar ${formatRupiah(invoice.amount)} untuk ${invoice.package}.`,
                            )}`}
                            target="_blank"
                          >
                            Kirim WA
                          </a>
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
                <p className="text-sm leading-6">{whatsappMessage}</p>
              </div>
              <a
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#25d366] px-4 text-sm font-bold text-[#062511]"
                href={whatsappUrl}
                target="_blank"
              >
                Kirim invoice ke WhatsApp
              </a>
            </section>

            <section className="rounded-lg border border-[#d8ded2] bg-white p-5">
              <h3 className="text-lg font-semibold">Alur kerja</h3>
              <ol className="mt-4 space-y-4 text-sm">
                {[
                  "Admin membuat invoice dan pilih customer.",
                  "Sistem membentuk pesan tagihan otomatis.",
                  "Admin klik kirim, WhatsApp terbuka ke nomor customer.",
                  "Status invoice dapat diubah setelah pembayaran masuk.",
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
              <h3 className="text-lg font-semibold">Upgrade berikutnya</h3>
              <div className="mt-4 space-y-3 text-sm text-[#3e4d43]">
                <p>
                  Integrasi WhatsApp Cloud API untuk kirim otomatis tanpa buka
                  tab.
                </p>
                <p>Database customer, riwayat pembayaran, dan template pesan.</p>
                <p>PDF invoice dengan nomor rekening dan QR pembayaran.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
