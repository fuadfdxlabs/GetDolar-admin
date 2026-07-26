import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("keeps admin login gate wired", async () => {
  const [page, loginRoute, logoutRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/logout/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Login Admin/);
  assert.match(page, /action="\/api\/login"/);
  assert.match(page, /ADMIN_SESSION_COOKIE/);
  assert.match(page, /Logout/);
  assert.match(page, /action="\/api\/logout"/);
  assert.match(loginRoute, /ADMIN_USERNAME = "admin"/);
  assert.match(loginRoute, /ADMIN_PASSWORD = "admin4321"/);
  assert.match(loginRoute, /set-cookie/);
  assert.match(logoutRoute, /Max-Age=0/);
});

test("keeps payment proof PDF route public and linked", async () => {
  const [table, route] = await Promise.all([
    readFile(new URL("../app/PaymentProofTable.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/payment-proof/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /export async function GET/);
  assert.match(route, /content-type": "application\/pdf"/);
  assert.match(route, /content-disposition/);
  assert.match(route, /"%PDF-1\.4\\n"/);
  assert.match(route, /getdolar-logo-pdf\.jpg/);
  assert.match(route, /\/Logo Do/);
  assert.doesNotMatch(route, /ADMIN_SESSION_COOKIE|Login Admin/);
  assert.match(table, /createPaymentProofPath/);
  assert.match(table, /\/api\/payment-proof\?invoice=/);
  assert.match(table, /Buka PDF/);
});

test("keeps WhatsApp message concise with invoice link", async () => {
  const table = await readFile(
    new URL("../app/PaymentProofTable.tsx", import.meta.url),
    "utf8",
  );

  assert.match(table, /Untuk detail lengkap, klik link invoice berikut/);
  assert.match(table, /Diterima bersih: \$\{formatRupiah\(payment\.amount\)\}/);
  assert.match(table, /No\. Invoice: \$\{payment\.id\}/);
  assert.match(table, /createWhatsappUrl\(payment, getPaymentProofUrl\(payment\)\)/);
  assert.doesNotMatch(table, /Kirim link PDF|Link PDF|sendPaymentProofLink/);
  assert.doesNotMatch(table, /Download PDF|downloadPdf|URL\.createObjectURL|createPaymentProofPdf/);
});

test("keeps member list tools intact", async () => {
  const table = await readFile(
    new URL("../app/PaymentProofTable.tsx", import.meta.url),
    "utf8",
  );

  assert.match(table, /const PAGE_SIZE = 15/);
  assert.match(table, /placeholder="Cari nama, ID member, WA\.\.\."/);
  assert.match(table, /Ada WA/);
  assert.match(table, /No WA kosong/);
  assert.match(table, /Belum dikirim/);
  assert.match(table, /Pilih tampil/);
  assert.match(table, /Pilih hasil filter/);
  assert.match(table, /Kirim dipilih/);
  assert.match(table, /Antrean kirim/);
  assert.match(table, /Tandai terkirim/);
  assert.match(table, /Batalkan terkirim/);
  assert.match(table, /Reset status terkirim/);
  assert.match(table, /localStorage/);
});

test("uses Vercel-compatible Next build scripts", async () => {
  const [packageJson, layout] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"build": "next build"/);
  assert.match(packageJson, /"start": "next start"/);
  assert.doesNotMatch(packageJson, /"build": "vinext build"/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.match(layout, /\/getdolar-logo\.png/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /openGraph/);
  await access(new URL("../public/getdolar-logo.png", import.meta.url));
  await access(new URL("../public/getdolar-logo-pdf.jpg", import.meta.url));
  await access(new URL("../public/og.png", import.meta.url));
});
