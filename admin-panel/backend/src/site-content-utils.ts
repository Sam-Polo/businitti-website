import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'
import { logger } from './logger.js'

const SHEET_NAME = 'site_content'
const HEADERS = ['key', 'value', 'updated_at']

export type SiteContentOverride = {
  key: string
  value: string
  updated_at: string
}

export type SiteContentMap = Record<string, string>

async function ensureSheet(sheetId: string): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = spreadsheet.data.sheets?.some((s) => s.properties?.title === SHEET_NAME)
  if (exists) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
    },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:C1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [HEADERS] },
  })
  logger.info({ sheet: SHEET_NAME }, 'создан лист site_content')
}

export async function fetchAllOverrides(sheetId: string): Promise<SiteContentOverride[]> {
  await ensureSheet(sheetId)
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:C`,
  })
  const rows = res.data.values ?? []
  return rows
    .filter((r) => r && r[0])
    .map((r) => ({
      key: String(r[0]),
      value: String(r[1] ?? ''),
      updated_at: String(r[2] ?? ''),
    }))
}

export async function fetchOverridesMap(sheetId: string): Promise<SiteContentMap> {
  const list = await fetchAllOverrides(sheetId)
  const out: SiteContentMap = {}
  for (const it of list) {
    if (it.value) out[it.key] = it.value
  }
  return out
}

async function findRowIndexByKey(sheetId: string, key: string): Promise<number> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:A`,
  })
  const rows = res.data.values ?? []
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]?.[0] ?? '') === key) return i + 2 // +2: 1-based + skip header
  }
  return -1
}

export async function upsertOverride(sheetId: string, key: string, value: string): Promise<void> {
  await ensureSheet(sheetId)
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const updatedAt = new Date().toISOString()
  const rowIndex = await findRowIndexByKey(sheetId, key)

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${rowIndex}:C${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[key, value, updatedAt]] },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:C`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[key, value, updatedAt]] },
    })
  }
}

export async function deleteOverride(sheetId: string, key: string): Promise<void> {
  await ensureSheet(sheetId)
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const rowIndex = await findRowIndexByKey(sheetId, key)
  if (rowIndex < 0) return

  // получаем sheetId числовой
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === SHEET_NAME)
  const numericSheetId = sheet?.properties?.sheetId
  if (numericSheetId === null || numericSheetId === undefined) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: numericSheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}
