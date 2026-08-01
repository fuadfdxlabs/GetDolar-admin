const ADMIN_SESSION_COOKIE = "getdolar_admin_session";
const ADMIN_SESSION_VALUE = "getdolar-admin-authenticated";
const RAW_ADSTERRA_COLUMNS = [
  "Placement",
  "Impressions",
  "Clicks",
  "CTR",
  "CPM",
  "Revenue",
];

const isAuthenticated = (request: Request) => {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .includes(`${ADMIN_SESSION_COOKIE}=${ADMIN_SESSION_VALUE}`);
};

const isRowsPayload = (value: unknown): value is string[][] =>
  Array.isArray(value) &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === RAW_ADSTERRA_COLUMNS.length &&
      row.every((cell) => typeof cell === "string"),
  );

export async function POST(request: Request) {
  if (!isAuthenticated(request)) {
    return Response.json({ error: "Login admin dulu." }, { status: 401 });
  }

  const scriptUrl = process.env.RAW_ADSTERRA_SCRIPT_URL;
  const secret = process.env.RAW_ADSTERRA_SECRET;

  if (!scriptUrl || !secret) {
    return Response.json(
      {
        error:
          "RAW_ADSTERRA_SCRIPT_URL atau RAW_ADSTERRA_SECRET belum diset di Vercel.",
      },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const rows = body && typeof body === "object" ? body.rows : null;

  if (!isRowsPayload(rows) || !rows.length) {
    return Response.json(
      { error: "Data Raw Adsterra kosong atau format kolom belum sesuai." },
      { status: 400 },
    );
  }

  const response = await fetch(scriptUrl, {
    body: JSON.stringify({
      columns: RAW_ADSTERRA_COLUMNS,
      rows,
      secret,
    }),
    headers: {
      "content-type": "text/plain;charset=utf-8",
    },
    method: "POST",
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    return Response.json(
      {
        error:
          result?.error ||
          `Apps Script gagal update Raw_Adsterra (${response.status}).`,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    updatedRows: result.updatedRows || rows.length,
  });
}
