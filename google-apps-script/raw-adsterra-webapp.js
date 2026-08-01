const RAW_ADSTERRA_SHEET_NAME = "Raw_Adsterra";
const RAW_ADSTERRA_START_ROW = 2;
const RAW_ADSTERRA_START_COLUMN = 3;
const RAW_ADSTERRA_COLUMNS = [
  "Placement",
  "Impressions",
  "Clicks",
  "CTR",
  "CPM",
  "Revenue",
];

function parseNumberCell(value) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .trim();
  const decimalNormalized = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(/,/g, ".")
    : normalized;
  const parsed = Number(decimalNormalized);
  return Number.isFinite(parsed) ? parsed : value;
}

function parsePercentCell(value) {
  if (typeof value === "number") {
    return value;
  }

  const text = String(value || "").trim();
  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .trim();
  const decimalNormalized = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(/,/g, ".")
    : normalized;
  const parsed = Number(decimalNormalized);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return text.includes("%") ? parsed / 100 : parsed;
}

function normalizeRow(row) {
  return [
    row[0],
    parseNumberCell(row[1]),
    parseNumberCell(row[2]),
    parsePercentCell(row[3]),
    parseNumberCell(row[4]),
    parseNumberCell(row[5]),
  ];
}

function jsonResponse(payload, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const expectedSecret = String(
      PropertiesService.getScriptProperties().getProperty(
        "RAW_ADSTERRA_SECRET",
      ) || "",
    ).trim();
    const receivedSecret = String(payload.secret || "").trim();

    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
    }

    const rows = payload.rows;
    const columns = payload.columns;

    if (
      !Array.isArray(columns) ||
      columns.join("|") !== RAW_ADSTERRA_COLUMNS.join("|") ||
      !Array.isArray(rows) ||
      rows.some(
        (row) =>
          !Array.isArray(row) || row.length !== RAW_ADSTERRA_COLUMNS.length,
      )
    ) {
      return jsonResponse(
        { ok: false, error: "Format data Raw_Adsterra tidak sesuai." },
        400,
      );
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(RAW_ADSTERRA_SHEET_NAME);

    if (!sheet) {
      return jsonResponse(
        { ok: false, error: "Sheet Raw_Adsterra tidak ditemukan." },
        404,
      );
    }

    const normalizedRows = rows.map(normalizeRow);
    const maxRows = Math.max(sheet.getLastRow() - 1, normalizedRows.length, 1);
    const clearRange = sheet.getRange(
      RAW_ADSTERRA_START_ROW,
      RAW_ADSTERRA_START_COLUMN,
      maxRows,
      RAW_ADSTERRA_COLUMNS.length,
    );
    clearRange.clearContent();

    if (normalizedRows.length) {
      const updateRange = sheet.getRange(
        RAW_ADSTERRA_START_ROW,
        RAW_ADSTERRA_START_COLUMN,
        normalizedRows.length,
        RAW_ADSTERRA_COLUMNS.length,
      );
      updateRange.setValues(normalizedRows);
      sheet
        .getRange(
          RAW_ADSTERRA_START_ROW,
          RAW_ADSTERRA_START_COLUMN + 1,
          normalizedRows.length,
          1,
        )
        .setNumberFormat("#,##0");
      sheet
        .getRange(
          RAW_ADSTERRA_START_ROW,
          RAW_ADSTERRA_START_COLUMN + 3,
          normalizedRows.length,
          1,
        )
        .setNumberFormat("0%");
      sheet
        .getRange(
          RAW_ADSTERRA_START_ROW,
          RAW_ADSTERRA_START_COLUMN + 4,
          normalizedRows.length,
          2,
        )
        .setNumberFormat('"$"#,##0.00');
    }

    return jsonResponse({ ok: true, updatedRows: normalizedRows.length }, 200);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}
