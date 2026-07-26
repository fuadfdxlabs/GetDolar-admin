import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the payment proof WhatsApp dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="id">/i);
  assert.match(html, /<title>GetDolar Admin Dashboard<\/title>/i);
  assert.match(html, /Bukti Pembayaran WhatsApp/);
  assert.match(html, /Pend_Per_Member_Final/);
  assert.match(html, /Bukti_Pembayaran/);
  assert.match(html, /Mapping Google Sheet/);
  assert.match(html, /Preview pesan WhatsApp/);
  assert.match(html, /Kirim bukti pembayaran ke WhatsApp/);
  assert.match(html, /1523444064/);
  assert.match(html, /INV-2026-0726-001/);
  assert.match(html, /https:\/\/wa\.me\/6281324616717\?text=/);
  assert.match(html, /Halo%20Asep%20Syaefullah/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps starter preview removed from product source", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SHEET_NAME = "Pend_Per_Member_Final"/);
  assert.match(page, /PROOF_TEMPLATE_SHEET = "Bukti_Pembayaran"/);
  assert.match(page, /SHEET_GID = "1523444064"/);
  assert.match(page, /SHEET_CSV_URL/);
  assert.match(page, /rowsToObjects/);
  assert.match(page, /mapRowsToPayments/);
  assert.match(page, /BUKTI PEMBAYARAN/);
  assert.match(page, /encodeURIComponent/);
  assert.match(page, /wa\.me/);
  assert.match(layout, /title:\s*"GetDolar Admin"/);
  assert.doesNotMatch(page, /SkeletonPreview|_sites-preview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
