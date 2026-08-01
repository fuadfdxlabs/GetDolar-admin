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

    const maxRows = Math.max(sheet.getLastRow() - 1, rows.length, 1);
    sheet
      .getRange(
        RAW_ADSTERRA_START_ROW,
        RAW_ADSTERRA_START_COLUMN,
        maxRows,
        RAW_ADSTERRA_COLUMNS.length,
      )
      .clearContent();

    if (rows.length) {
      sheet
        .getRange(
          RAW_ADSTERRA_START_ROW,
          RAW_ADSTERRA_START_COLUMN,
          rows.length,
          RAW_ADSTERRA_COLUMNS.length,
        )
        .setValues(rows);
    }

    return jsonResponse({ ok: true, updatedRows: rows.length }, 200);
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
