'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../stats-core.js');

function solve(value, options = {}) {
  return {
    category: '3x3x3', rawSeconds: value, finalSeconds: options.dnf ? null : value + (options.plus ? 2 : 0),
    date: options.date || '2026-01-01 12:00', plus: Boolean(options.plus), dnf: Boolean(options.dnf),
    section: '1', scramble: '', sourceOrder: options.sourceOrder || 0
  };
}

test('CSV import flows through penalties, DNF, chronology and Ao5', () => {
  const csv = `Category;Time (MM:SS.SSS);Scrambler;Date;Penalty +2 (yes or no);DNF (yes or no);Section
3x3x3;00:30.000;;2026-01-01 12:04;no;no;1
3x3x3;00:11.000;;2026-01-01 12:03;yes;no;1
3x3x3;00:08.000;;2026-01-01 12:02;no;yes;1
3x3x3;00:20.000;;2026-01-01 12:01;no;no;1
3x3x3;00:10.000;;2026-01-01 12:00;no;no;1`;
  const { solves, diagnostics } = core.parseCsv(csv);
  const summary = core.summarize(solves);
  assert.equal(solves.length, 5);
  assert.deepEqual(solves.map(item => item.finalSeconds), [10, 20, null, 13, 30]);
  assert.equal(solves[3].rawSeconds, 11);
  assert.equal(solves[3].plus, true);
  assert.equal(solves[2].dnf, true);
  assert.equal(summary.dnf, 1);
  assert.equal(summary.plus, 1);
  assert.equal(core.currentAverage(solves, 5).value, 21);
  assert.equal(diagnostics.rejected, 0);
});

test('+2 changes final time and DNF has no final time', () => {
  assert.equal(solve(10, { plus: true }).finalSeconds, 12);
  assert.equal(solve(10, { dnf: true }).finalSeconds, null);
});

test('Ao5 drops best and worst', () => {
  const result = core.currentAverage([10, 11, 12, 13, 30].map(value => solve(value)), 5);
  assert.deepEqual(result, { status: 'ok', value: 12 });
});

test('Ao5 drops one DNF and becomes DNF with two', () => {
  const one = [solve(10), solve(11), solve(12), solve(13), solve(1, { dnf: true })];
  assert.deepEqual(core.currentAverage(one, 5), { status: 'ok', value: 12 });
  const two = [...one.slice(0, 4), solve(1, { dnf: true }), solve(1, { dnf: true })];
  assert.equal(core.currentAverage(two, 5).status, 'dnf');
});

test('+2 participates in trimming through its final value', () => {
  const values = [solve(8, { plus: true }), solve(9), solve(11), solve(12), solve(13)];
  assert.equal(core.currentAverage(values, 5).value, 11);
});

test('best average scans consecutive attempts', () => {
  const values = [20, 20, 20, 20, 20, 10, 11, 12, 13, 14].map(value => solve(value));
  assert.equal(core.bestAverage(values, 5).value, 12);
});

test('average trimming uses five percent rounded up', () => {
  assert.equal(core.trimCountForSize(5), 1);
  assert.equal(core.trimCountForSize(12), 1);
  assert.equal(core.trimCountForSize(50), 3);
  assert.equal(core.trimCountForSize(100), 5);
  for (const size of [5, 12, 50, 100]) {
    const values = Array.from({ length: size }, (_, index) => solve(index + 1));
    assert.equal(core.currentAverage(values, size).value, (size + 1) / 2);
  }
});

test('large averages tolerate only as many DNFs as the trim count', () => {
  for (const size of [5, 12, 50, 100]) {
    const allowed = core.trimCountForSize(size);
    const valid = Array.from({ length: size }, (_, index) => solve(index + 1, { dnf: index >= size - allowed }));
    const invalid = Array.from({ length: size }, (_, index) => solve(index + 1, { dnf: index >= size - allowed - 1 }));
    assert.equal(core.currentAverage(valid, size).status, 'ok', `Ao${size} should allow ${allowed} DNF`);
    assert.equal(core.currentAverage(invalid, size).status, 'dnf', `Ao${size} should reject ${allowed + 1} DNF`);
  }
});

test('rolling completed average always uses exactly completed solves', () => {
  const values = [solve(10), solve(20), solve(1, { dnf: true }), solve(30), solve(40)];
  assert.deepEqual(core.rollingCompletedAverage(values, 3), [null, null, null, 20, 30]);
});

test('consistency reports the actual sample and caps it at the target', () => {
  const partial = core.consistency([solve(10), solve(20), solve(1, { dnf: true })], 50);
  assert.deepEqual(partial, { value: 5, sampleSize: 2, targetSize: 50, complete: false });
  const exact = core.consistency(Array.from({ length: 50 }, () => solve(20)), 50);
  assert.deepEqual(exact, { value: 0, sampleSize: 50, targetSize: 50, complete: true });
  const capped = core.consistency([...Array.from({ length: 10 }, () => solve(5)), ...Array.from({ length: 50 }, () => solve(20))], 50);
  assert.deepEqual(capped, { value: 0, sampleSize: 50, targetSize: 50, complete: true });
});

test('CSV chronology preserves timer order when timestamps share a minute', () => {
  const csv = `Category;Time (MM:SS.SSS);Date;Penalty +2 (yes or no);DNF (yes or no);Section
3x3x3;00:12.000;2026-01-01 12:00;no;no;1
3x3x3;00:11.000;2026-01-01 12:00;no;no;1`;
  assert.deepEqual(core.parseCsv(csv).solves.map(item => item.finalSeconds), [11, 12]);
});

test('parser reports bad rows and keeps valid rows', () => {
  const csv = 'Category;Time (MM:SS.SSS);Date;Penalty +2 (yes or no);DNF (yes or no);Section\n' +
    '3x3x3;00:10.000;2026-01-01 12:00;no;no;1\n' +
    '3x3x3;bad;2026-01-01 12:01;maybe;no;1\n';
  const result = core.parseCsv(csv);
  assert.equal(result.solves.length, 1);
  assert.equal(result.diagnostics.rejected, 1);
  assert.equal(result.diagnostics.errors[0].line, 3);
});

test('parser rejects missing headers and unterminated quotes', () => {
  assert.throws(() => core.parseCsv('Category;Date\n3x3x3;2026-01-01 12:00'), /Brak wymaganych kolumn/);
  assert.throws(() => core.parseCsv('"Category'), /Nie zamknięto/);
});

test('chronology retains export order for equal minute', () => {
  const values = [
    solve(10, { date: '2026-01-02 12:00', sourceOrder: 0 }),
    solve(11, { date: '2026-01-01 12:00', sourceOrder: 1 }),
    solve(12, { date: '2026-01-01 12:00', sourceOrder: 2 })
  ];
  assert.deepEqual(core.sortSolves(values).map(item => item.rawSeconds), [12, 11, 10]);
});

test('date filter is inclusive', () => {
  const values = ['2026-01-01 12:00', '2026-01-02 12:00', '2026-01-03 12:00'].map((date, i) => solve(10 + i, { date }));
  assert.equal(core.filterByDate(values, '2026-01-02', '2026-01-03').length, 2);
});

test('record history only includes improvements', () => {
  const history = core.recordHistory([15, 16, 14, 14, 13].map(value => solve(value)));
  assert.deepEqual(history.map(item => item.value), [15, 14, 13]);
});
