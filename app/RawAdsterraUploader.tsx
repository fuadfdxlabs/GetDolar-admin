"use client";

import { useMemo, useState } from "react";

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

const rawAdsterraColumns = [
  "Placement",
  "Impressions",
  "Clicks",
  "CTR",
  "CPM",
  "Revenue",
];

const parseCsv = (csv: string): ParsedCsv => {
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
        rows.push(row.map((cell) => cell.trim()));
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) {
    rows.push(row.map((cell) => cell.trim()));
  }

  const [headers = [], ...dataRows] = rows;

  return {
    headers: headers.map((header, index) => header || `Kolom ${index + 1}`),
    rows: dataRows,
  };
};

const normalizeNumber = (value: string) => {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findColumnIndex = (headers: string[], candidates: string[]) =>
  headers.findIndex((header) => {
    const normalized = header.toLowerCase().replace(/[_-]/g, " ");
    return candidates.some((candidate) => normalized.includes(candidate));
  });

const findExactColumnIndex = (headers: string[], column: string) =>
  headers.findIndex(
    (header) => header.trim().toLowerCase() === column.toLowerCase(),
  );

const escapeTsvCell = (value: string) =>
  value.replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();

const createRawAdsterraRows = ({ headers, rows }: ParsedCsv) => {
  const columnIndexes = rawAdsterraColumns.map((column) =>
    findExactColumnIndex(headers, column),
  );

  if (columnIndexes.some((index) => index < 0)) {
    return [];
  }

  return rows.map((row) =>
    columnIndexes.map((columnIndex) => row[columnIndex] || ""),
  );
};

const createRawAdsterraTsv = (rows: string[][]) =>
  rows
    .map((row) => row.map((cell) => escapeTsvCell(cell)).join("\t"))
    .join("\n");

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

const formatDollar = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function RawAdsterraUploader({
  sheetName,
  sheetUrl,
}: {
  sheetName: string;
  sheetUrl: string;
}) {
  const [fileName, setFileName] = useState("");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv>({
    headers: [],
    rows: [],
  });
  const [copyStatus, setCopyStatus] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const stats = useMemo(() => {
    const revenueIndex = findColumnIndex(parsedCsv.headers, [
      "revenue",
      "earning",
      "income",
    ]);
    const impressionsIndex = findColumnIndex(parsedCsv.headers, [
      "impression",
      "impressions",
      "view",
    ]);
    const clicksIndex = findColumnIndex(parsedCsv.headers, ["click"]);
    const totalRevenue =
      revenueIndex >= 0
        ? parsedCsv.rows.reduce(
            (total, row) => total + normalizeNumber(row[revenueIndex] || "0"),
            0,
          )
        : 0;
    const totalImpressions =
      impressionsIndex >= 0
        ? parsedCsv.rows.reduce(
            (total, row) =>
              total + normalizeNumber(row[impressionsIndex] || "0"),
            0,
          )
        : 0;
    const totalClicks =
      clicksIndex >= 0
        ? parsedCsv.rows.reduce(
            (total, row) => total + normalizeNumber(row[clicksIndex] || "0"),
            0,
          )
        : 0;

    return {
      totalRows: parsedCsv.rows.length,
      totalRevenue,
      totalImpressions,
      totalClicks,
    };
  }, [parsedCsv]);

  const rawAdsterraRows = useMemo(
    () => createRawAdsterraRows(parsedCsv),
    [parsedCsv],
  );
  const tsv = useMemo(
    () => createRawAdsterraTsv(rawAdsterraRows),
    [rawAdsterraRows],
  );
  const hasRows = parsedCsv.rows.length > 0;

  const handleFile = async (file?: File) => {
    setError("");
    setCopyStatus("");
    setUpdateStatus("");

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("File harus format CSV dari Adsterra.");
      return;
    }

    const text = await file.text();
    const nextParsedCsv = parseCsv(text);

    if (!nextParsedCsv.headers.length || !nextParsedCsv.rows.length) {
      setError("CSV belum terbaca. Pastikan file statistik Adsterra tidak kosong.");
      return;
    }

    const missingColumns = rawAdsterraColumns.filter(
      (column) => findExactColumnIndex(nextParsedCsv.headers, column) < 0,
    );

    if (missingColumns.length) {
      setError(`Kolom wajib belum ada: ${missingColumns.join(", ")}.`);
      return;
    }

    setFileName(file.name);
    setParsedCsv(nextParsedCsv);
  };

  const copyTsv = async () => {
    if (!hasRows) {
      return;
    }

    await copyToClipboard(tsv);
    setCopyStatus("Data 6 kolom siap ditempel mulai dari kolom C.");
  };

  const updateSheet = async () => {
    if (!rawAdsterraRows.length) {
      return;
    }

    setError("");
    setUpdateStatus("");
    setIsUpdating(true);

    try {
      const response = await fetch("/api/raw-adsterra", {
        body: JSON.stringify({ rows: rawAdsterraRows }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Gagal update Raw_Adsterra.");
      }

      setUpdateStatus(
        `${result.updatedRows || rawAdsterraRows.length} baris berhasil diupdate ke Raw_Adsterra.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal update Raw_Adsterra.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const resetUpload = () => {
    setFileName("");
    setParsedCsv({ headers: [], rows: [] });
    setCopyStatus("");
    setUpdateStatus("");
    setError("");
  };

  return (
    <section
      className="rounded-lg border border-[#d8ded2] bg-white"
      id="raw-adsterra"
    >
      <div className="grid gap-4 border-b border-[#e5eadf] px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-[#607065]">
            Raw Adsterra
          </p>
          <h3 className="mt-1 text-lg font-semibold">Update Raw Adsterra</h3>
          <p className="mt-1 text-sm leading-6 text-[#607065]">
            Upload CSV statistik Adsterra, cek preview, lalu salin data untuk
            ditempel mulai kolom C di sheet {sheetName}. Kolom Periode dan
            API_Date tidak ikut diganti.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-10 items-center rounded-md border border-[#cbd4c6] px-4 text-sm font-bold"
            href={sheetUrl}
            rel="noreferrer"
            target="_blank"
          >
            Buka Google Sheet
          </a>
          <button
            className="h-10 rounded-md border border-[#cbd4c6] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!hasRows}
            onClick={resetUpload}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <label className="block rounded-lg border border-dashed border-[#9bae9a] bg-[#f7f9f5] p-4">
            <span className="text-sm font-bold">Upload file CSV</span>
            <span className="mt-1 block text-xs leading-5 text-[#607065]">
              Pilih export statistik dari Adsterra.
            </span>
            <input
              accept=".csv,text/csv"
              className="mt-4 block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-[#172019] file:px-4 file:text-sm file:font-bold file:text-white"
              onChange={(event) => handleFile(event.target.files?.[0])}
              type="file"
            />
          </label>

          {fileName ? (
            <div className="rounded-lg border border-[#d8ded2] p-4">
              <p className="text-xs font-bold uppercase text-[#607065]">
                File aktif
              </p>
              <p className="mt-1 break-words text-sm font-semibold">{fileName}</p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-md bg-[#ffe7df] px-3 py-2 text-sm font-semibold text-[#9b392f]">
              {error}
            </p>
          ) : null}

          <button
            className="h-11 w-full rounded-md bg-[#172019] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#607065]"
            disabled={!rawAdsterraRows.length || isUpdating}
            onClick={updateSheet}
            type="button"
          >
            {isUpdating ? "Mengupdate..." : "Update Raw_Adsterra otomatis"}
          </button>

          <button
            className="h-11 w-full rounded-md border border-[#cbd4c6] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!hasRows}
            onClick={copyTsv}
            type="button"
          >
            Salin 6 kolom Adsterra
          </button>

          {updateStatus ? (
            <p className="rounded-md bg-[#e9ffd6] px-3 py-2 text-sm font-semibold text-[#315b18]">
              {updateStatus}
            </p>
          ) : null}

          {copyStatus ? (
            <p className="rounded-md bg-[#e9ffd6] px-3 py-2 text-sm font-semibold text-[#315b18]">
              {copyStatus}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Baris", String(stats.totalRows)],
              ["Kolom update", String(rawAdsterraColumns.length)],
              ["Revenue", formatDollar(stats.totalRevenue)],
              ["Clicks", String(stats.totalClicks)],
            ].map(([label, value]) => (
              <div
                className="rounded-lg border border-[#d8ded2] bg-[#f7f9f5] p-4"
                key={label}
              >
                <p className="text-xs font-bold uppercase text-[#607065]">
                  {label}
                </p>
                <p className="mt-2 break-words text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#d8ded2]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f9f5] text-xs uppercase text-[#607065]">
                <tr>
                  {(rawAdsterraRows.length
                    ? rawAdsterraColumns
                    : ["Upload CSV untuk melihat preview"]
                  )
                    .map((header) => (
                      <th className="px-3 py-3" key={header}>
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0e9]">
                {rawAdsterraRows.slice(0, 8).map((row, rowIndex) => (
                  <tr key={`${rowIndex}-${row.join("-")}`}>
                    {rawAdsterraColumns.map((header, cellIndex) => (
                      <td className="px-3 py-3" key={`${header}-${cellIndex}`}>
                        <span className="line-clamp-2">
                          {row[cellIndex] || "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
                {!hasRows ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-sm font-semibold text-[#607065]">
                      Belum ada CSV yang diupload.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {hasRows ? (
            <p className="text-xs leading-5 text-[#607065]">
              Preview menampilkan 6 kolom update dan 8 baris pertama. Data yang
              disalin tidak menyertakan Periode dan API_Date.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
