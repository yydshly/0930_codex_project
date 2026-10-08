import test from 'node:test';
import assert from 'node:assert/strict';
import { tableToMatrix, toCSV, textStats, transformText, convertUnits } from '../web/toolbox/data.js';

// Minimal DOM-shaped fixture for span arithmetic; actual table DOM is checked
// in the browser suite, including nested tables and <br> extraction.
function tableFixture(groups) {
  const table = { tagName: 'TABLE', rows: [] };
  groups.forEach(specRows => {
    const parentElement = {};
    specRows.forEach(specCells => {
      const row = { parentElement, closest: () => table, cells: [] };
      row.cells = specCells.map(spec => {
        const value = typeof spec === 'string' ? { text: spec } : spec;
        return { colSpan: value.cols ?? 1, rowSpan: value.rows ?? 1,
          cloneNode: () => ({ textContent: value.text, querySelectorAll: () => [] }) };
      });
      table.rows.push(row);
    });
  });
  return table;
}

test('Table merged header and row groups expand into a rectangular matrix', () => {
  const table = tableFixture([
    [[{ text: '型号', rows: 2 }, { text: '尺寸', cols: 2 }], ['宽度', '高度']],
    [['A', '10', '20'], [{ text: 'B', rows: 2 }, '11', '21'], ['12', '22']],
  ]);
  assert.deepEqual(tableToMatrix(table), [
    ['型号', '尺寸', '尺寸'], ['型号', '宽度', '高度'],
    ['A', '10', '20'], ['B', '11', '21'], ['B', '12', '22'],
  ]);
});

test('rowspan zero fills its group, and short rows are padded', () => {
  const table = tableFixture([
    [[{ text: 'same', rows: 0 }, 'first'], ['second'], ['third']],
    [['last']],
  ]);
  assert.deepEqual(tableToMatrix(table), [['same', 'first'], ['same', 'second'], ['same', 'third'], ['last', '']]);
});

test('Table size limits and input errors are explicit', () => {
  assert.throws(() => tableToMatrix({ tagName: 'DIV' }), /HTML 表格/);
  assert.deepEqual(tableToMatrix(tableFixture([])), []);
  assert.throws(() => tableToMatrix(tableFixture([Array.from({ length: 501 }, () => ['x'])])), /500 行/);
  assert.throws(() => tableToMatrix(tableFixture([[[{ text: 'x', cols: 61 }]]])), /60 列/);
  assert.throws(() => tableToMatrix(tableFixture([[Array.from({ length: 61 }, () => 'x')]])), /60 列/);
  assert.equal(tableToMatrix(tableFixture([Array.from({ length: 500 }, () => ['x'])])).length, 500);
});

test('CSV quotes commas, quotes and newlines, including empty/sparse cells', () => {
  assert.equal(toCSV([['a,b', 'say "hi"', 'x\ny', null, undefined, true], ['你好', 12]]),
    '"a,b","say ""hi""","x\ny",,,true\r\n你好,12');
  assert.equal(toCSV([new Array(2)]), ',');
  assert.equal(toCSV([]), '');
  assert.throws(() => toCSV(['bad']), /二维数组/);
  assert.throws(() => toCSV([[{}]]), /单元格/);
});

test('CSV guards formulas and whitespace tricks while preserving finite signed decimals', () => {
  assert.equal(toCSV([['=SUM(1)', '+cmd', '-2+3', '@cmd', '  =1', '\ttext', -12.5, '-1.2e3', '+2']]),
    "'=SUM(1),'+cmd,'-2+3,'@cmd,'  =1,'\ttext,-12.5,-1.2e3,+2");
  assert.equal(toCSV([['=1', '-2+3']], { safe: false }), '=1,-2+3');
  assert.equal(toCSV([['\n=1']]), '"\'\n=1"');
});

test('Text counts mix Han characters and word tokens with documented reading estimates', () => {
  const result = textStats("你好 world!\r\nDon't stop 😀");
  assert.deepEqual({ ...result, readingMinutes: 0 }, { chars: 23, words: 5, lines: 2, han: 2, readingMinutes: 0 });
  assert.equal(result.readingMinutes, 2 / 300 + 3 / 200);
  assert.deepEqual(textStats(''), { chars: 0, words: 0, lines: 0, han: 0, readingMinutes: 0 });
  assert.equal(textStats('𠀀').han, 1);
  assert.equal(textStats('one\rTwo\n').lines, 3);
  assert.throws(() => textStats(null), /文本字符串/);
});

test('Text transformations preserve line order and strictly parse JSON', () => {
  assert.equal(transformText('a\r\nb\na\n\nb', 'dedupe'), 'a\nb\n');
  assert.equal(transformText('  a \n b  ', 'trim'), 'a\nb');
  assert.equal(transformText('Hello 世界', 'upper'), 'HELLO 世界');
  assert.equal(transformText('HELLO 世界', 'lower'), 'hello 世界');
  assert.equal(transformText('{"a":[1,true]}', 'json'), '{\n  "a": [\n    1,\n    true\n  ]\n}');
  assert.equal(transformText('null', 'json'), 'null');
  assert.throws(() => transformText('{"a":1,}', 'json'), /JSON 格式无效/);
  assert.throws(() => transformText('ok', 'unsupported'), /不支持/);
});

test('Units use standard physical constants and validate types and dimensions', () => {
  assert.equal(convertUnits(1, 'm', 'cm'), 100);
  assert.equal(convertUnits('25.4', 'mm', 'in'), 1);
  assert.equal(convertUnits(1, 'ft', 'm'), 0.3048);
  assert.equal(convertUnits(1, 'lb', 'kg'), 0.45359237);
  assert.equal(convertUnits(1, 'kg', 'g'), 1000);
  assert.equal(convertUnits(0, 'C', 'F'), 32);
  assert.equal(convertUnits(212, '°F', 'c'), 100);
  assert.equal(convertUnits(-40, 'C', 'F'), -40);
  assert.equal(convertUnits(-0, 'm', 'm'), 0);
  for (const value of [NaN, Infinity, '', '  ', null, '2kg', '0x10']) {
    assert.throws(() => convertUnits(value, 'm', 'cm'), /数值|数字/);
  }
  assert.throws(() => convertUnits(1, 'm', 'kg'), /同一类型/);
  assert.throws(() => convertUnits(1, 'mile', 'm'), /不支持/);
  assert.throws(() => convertUnits(Number.MAX_VALUE, 'km', 'mm'), /超出/);
});
