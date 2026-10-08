/**
 * Local, dependency-free webpage data utilities.
 * Table extraction expands merged cells and repeats their text in the covered
 * positions. It reads DOM text (including hidden cells), not screenshot/OCR.
 */
const MAX_ROWS = 500;
const MAX_COLUMNS = 60;
const HAN = /\p{Script=Han}/gu;
const WORDS = /[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu;
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function requireText(text) {
  if (typeof text !== 'string') throw new TypeError('请输入文本字符串。');
  return text;
}

function lineEndings(text) {
  return text.replace(/\r\n?/g, '\n');
}

function ownRows(table) {
  return Array.from(table.rows).filter(row => row.closest('table') === table);
}

function cellText(cell) {
  const copy = cell.cloneNode(true);
  for (const nested of copy.querySelectorAll('table')) nested.remove();
  for (const br of copy.querySelectorAll('br')) {
    br.replaceWith(cell.ownerDocument.createTextNode('\n'));
  }
  // Preserve explicit line breaks, collapse HTML indentation within each line.
  return lineEndings(copy.textContent || '').split('\n')
    .map(line => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .join('\n').trim();
}

/** Expand a real HTML table to a rectangular string matrix, up to 500 × 60. */
export function tableToMatrix(table) {
  if (!table || String(table.tagName).toUpperCase() !== 'TABLE' || !table.rows) {
    throw new TypeError('请选择一个 HTML 表格。');
  }
  const rows = ownRows(table);
  if (rows.length > MAX_ROWS) throw new RangeError(`表格超过 ${MAX_ROWS} 行，请缩小提取范围。`);
  const matrix = rows.map(() => []);
  let width = 0;
  rows.forEach((row, rowIndex) => {
    // A rowspan cannot cross thead/tbody/tfoot (or another tbody).
    let groupEnd = rowIndex + 1;
    while (groupEnd < rows.length && rows[groupEnd].parentElement === row.parentElement) groupEnd++;
    let column = 0;
    for (const cell of Array.from(row.cells)) {
      const rawColspan = Number(cell.colSpan);
      const colspan = Number.isFinite(rawColspan) ? Math.max(1, Math.floor(rawColspan)) : 1;
      if (colspan > MAX_COLUMNS) throw new RangeError(`表格超过 ${MAX_COLUMNS} 列，请缩小提取范围。`);
      // Find a contiguous free range; occupied positions come from prior rows.
      while (Array.from({ length: colspan }, (_, offset) => matrix[rowIndex][column + offset])
        .some(value => value !== undefined)) column++;
      if (column + colspan > MAX_COLUMNS) throw new RangeError(`表格超过 ${MAX_COLUMNS} 列，请缩小提取范围。`);
      const rawRowspan = Number(cell.rowSpan);
      const rowspan = rawRowspan === 0 ? groupEnd - rowIndex
        : Math.min(groupEnd - rowIndex, Number.isFinite(rawRowspan) ? Math.max(1, Math.floor(rawRowspan)) : 1);
      const value = cellText(cell);
      for (let y = rowIndex; y < rowIndex + rowspan; y++) {
        for (let x = column; x < column + colspan; x++) matrix[y][x] = value;
      }
      column += colspan;
      width = Math.max(width, column);
    }
    width = Math.max(width, matrix[rowIndex].length);
  });
  return matrix.map(row => Array.from({ length: width }, (_, column) => row[column] ?? ''));
}

/** RFC-style CSV; safe=true prefixes potentially executable spreadsheet cells. */
export function toCSV(matrix, { safe = true } = {}) {
  if (!Array.isArray(matrix) || matrix.some(row => !Array.isArray(row))) {
    throw new TypeError('CSV 输入必须是二维数组。');
  }
  return matrix.map(row => Array.from(row, cell => {
    if (cell !== null && typeof cell === 'object') throw new TypeError('CSV 单元格仅支持文本、数值或布尔值。');
    let value = cell == null ? '' : String(cell);
    // Ignore leading whitespace when detecting formulas. Signed decimal values
    // such as -12.5 and +2 remain numeric. A tab/CR/LF first byte is also unsafe.
    const trimmed = value.trim();
    const numeric = DECIMAL.test(trimmed) && Number.isFinite(Number(trimmed));
    if (safe && !numeric && (/^[\t\r\n]/.test(value) || /^[=+\-@]/.test(value.trimStart()))) {
      value = `'${value}`;
    }
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(',')).join('\r\n');
}

/**
 * chars includes whitespace and counts Unicode code points (not graphemes).
 * words counts each Han character plus non-Han letter/number word tokens.
 * Reading time is an estimate: 300 Han characters/minute + 200 other words/minute.
 */
export function textStats(text) {
  text = requireText(text);
  const han = (text.match(HAN) || []).length;
  const otherWords = (text.replace(HAN, ' ').match(WORDS) || []).length;
  return {
    chars: Array.from(text).length,
    words: han + otherWords,
    lines: text.length ? lineEndings(text).split('\n').length : 0,
    han,
    readingMinutes: han / 300 + otherWords / 200,
  };
}

/** dedupe compares exact lines; trim removes the surrounding space on each line. */
export function transformText(text, mode) {
  text = requireText(text);
  switch (mode) {
    case 'dedupe': return Array.from(new Set(lineEndings(text).split('\n'))).join('\n');
    case 'trim': return lineEndings(text).split('\n').map(line => line.trim()).join('\n').trim();
    case 'upper': return text.toUpperCase();
    case 'lower': return text.toLowerCase();
    case 'json': {
      try { return JSON.stringify(JSON.parse(text), null, 2); }
      catch (error) { throw new SyntaxError(`JSON 格式无效：${error.message}`); }
    }
    default: throw new RangeError(`不支持的文本处理模式：${String(mode)}。`);
  }
}

const UNITS = {
  m: { dimension: 'length', factor: 1 }, cm: { dimension: 'length', factor: 0.01 },
  mm: { dimension: 'length', factor: 0.001 }, km: { dimension: 'length', factor: 1000 },
  in: { dimension: 'length', factor: 0.0254 }, ft: { dimension: 'length', factor: 0.3048 },
  kg: { dimension: 'mass', factor: 1 }, g: { dimension: 'mass', factor: 0.001 },
  lb: { dimension: 'mass', factor: 0.45359237 },
  C: { dimension: 'temperature' }, F: { dimension: 'temperature' },
};

function unitKey(unit) {
  if (typeof unit !== 'string') throw new TypeError('请输入有效单位。');
  const normalized = unit.trim().replace(/^°/, '');
  return /^[cf]$/i.test(normalized) ? normalized.toUpperCase() : normalized.toLowerCase();
}

/** Convert signed quantities within a dimension. No currency/exchange-rate API. */
export function convertUnits(value, from, to) {
  if (typeof value === 'string') {
    if (!DECIMAL.test(value.trim())) throw new TypeError('请输入有效数值，不能留空或包含其他文字。');
    value = Number(value.trim());
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('数值必须是有限数字。');
  from = unitKey(from); to = unitKey(to);
  const source = Object.hasOwn(UNITS, from) ? UNITS[from] : null;
  const target = Object.hasOwn(UNITS, to) ? UNITS[to] : null;
  if (!source || !target) throw new RangeError(`不支持的单位：${!source ? from : to}。`);
  if (source.dimension !== target.dimension) throw new RangeError('只能转换同一类型的单位，例如长度与长度。');
  let result;
  if (source.dimension === 'temperature') {
    result = from === to ? value : from === 'C' ? value * 9 / 5 + 32 : (value - 32) * 5 / 9;
  } else result = value * source.factor / target.factor;
  if (!Number.isFinite(result)) throw new RangeError('转换结果超出有效数值范围。');
  return Object.is(result, -0) ? 0 : result;
}
