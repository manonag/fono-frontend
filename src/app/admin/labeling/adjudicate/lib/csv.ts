// Minimal RFC-4180 CSV parser for the adjudication mode.
//
// The eval DIFFER report's transcript column carries commas AND embedded
// newlines, so a naive split breaks it. This parser handles quoted fields
// with embedded commas / newlines and the "" escaped-quote convention.

function parseCsv(text: string): string[][] {
  // Strip a leading UTF-8 BOM if present.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const c = input[i]
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += c
      i += 1
      continue
    }
    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (c === '\r') {
      i += 1
      continue
    }
    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }
    field += c
    i += 1
  }
  // Trailing field / row when the file does not end with a newline.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// Parse CSV text into objects keyed by the header row. Blank lines are
// dropped. Missing trailing columns become empty strings.
export function parseCsvObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => {
      const obj: Record<string, string> = {}
      header.forEach((h, idx) => {
        obj[h] = r[idx] ?? ''
      })
      return obj
    })
}
