(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CubeStatsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REQUIRED = {
    category: 'Category',
    time: 'Time (MM:SS.SSS)',
    date: 'Date',
    plus: 'Penalty +2 (yes or no)',
    dnf: 'DNF (yes or no)',
    section: 'Section'
  };

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function standardDeviation(values) {
    if (!values.length) return null;
    const mean = average(values);
    return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
  }

  function durationToSeconds(value) {
    const text = String(value || '').trim().replace(',', '.');
    if (!/^\d{1,3}:\d{2}(?:\.\d{1,3})?$/.test(text)) return NaN;
    const [minutes, seconds] = text.split(':').map(Number);
    if (seconds >= 60) return NaN;
    return minutes * 60 + seconds;
  }

  function parseRows(source) {
    const rows = [];
    let row = [], field = '', quoted = false, rowNumber = 1, rowStart = 1;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else { field += char; if (char === '\n') rowNumber += 1; }
      } else if (char === '"') quoted = true;
      else if (char === ';') { row.push(field); field = ''; }
      else if (char === '\r' || char === '\n') {
        if (char === '\r' && source[i + 1] === '\n') i += 1;
        row.push(field);
        if (row.some(cell => cell.trim())) rows.push({ cells: row, line: rowStart });
        row = []; field = ''; rowNumber += 1; rowStart = rowNumber;
      } else field += char;
    }
    if (quoted) throw new Error('Nie zamknięto pola w cudzysłowie.');
    if (field || row.length) {
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push({ cells: row, line: rowStart });
    }
    return rows;
  }

  function parseFlag(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'yes') return true;
    if (normalized === 'no') return false;
    return null;
  }

  function validDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (!match) return false;
    const [, y, m, d, h, min, capturedSeconds] = match;
    const sec = capturedSeconds || '0';
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(sec));
    return date.getFullYear() === Number(y) && date.getMonth() === Number(m) - 1 &&
      date.getDate() === Number(d) && date.getHours() === Number(h) && date.getMinutes() === Number(min) &&
      date.getSeconds() === Number(sec);
  }

  function sortSolves(solves) {
    return [...solves].sort((a, b) => a.date.localeCompare(b.date) || b.sourceOrder - a.sourceOrder);
  }

  function parseCsv(source) {
    const rows = parseRows(String(source || '').replace(/^\uFEFF/, ''));
    if (!rows.length) throw new Error('Plik nie zawiera danych.');
    const header = rows.shift().cells.map(name => name.trim().toLowerCase());
    const columns = {};
    for (const [key, label] of Object.entries(REQUIRED)) columns[key] = header.indexOf(label.toLowerCase());
    columns.scramble = header.indexOf('scrambler');
    const missing = Object.entries(columns).filter(([key, index]) => key !== 'scramble' && index < 0).map(([key]) => REQUIRED[key]);
    if (missing.length) throw new Error(`Brak wymaganych kolumn: ${missing.join(', ')}.`);

    const solves = [], errors = [];
    rows.forEach(({ cells, line }, sourceOrder) => {
      const reasons = [];
      const category = String(cells[columns.category] || '').trim();
      const rawSeconds = durationToSeconds(cells[columns.time]);
      const date = String(cells[columns.date] || '').trim();
      const plus = parseFlag(cells[columns.plus]);
      const dnf = parseFlag(cells[columns.dnf]);
      if (cells.length < header.length) reasons.push(`za mało kolumn (${cells.length}/${header.length})`);
      if (!category) reasons.push('brak kategorii');
      if (!Number.isFinite(rawSeconds)) reasons.push('nieprawidłowy czas');
      if (!validDate(date)) reasons.push('nieprawidłowa data');
      if (plus === null) reasons.push('nieprawidłowa flaga +2');
      if (dnf === null) reasons.push('nieprawidłowa flaga DNF');
      if (plus === true && dnf === true) reasons.push('jednoczesne +2 i DNF');
      if (reasons.length) { errors.push({ line, reasons }); return; }
      solves.push({
        category,
        rawSeconds,
        finalSeconds: dnf ? null : rawSeconds + (plus ? 2 : 0),
        date,
        plus,
        dnf,
        section: String(cells[columns.section] || '').trim(),
        scramble: columns.scramble >= 0 ? String(cells[columns.scramble] || '').trim() : '',
        sourceOrder
      });
    });
    if (!solves.length) throw new Error('Nie znaleziono żadnych poprawnych ułożeń.');
    return { solves: sortSolves(solves), diagnostics: { accepted: solves.length, rejected: errors.length, errors } };
  }

  const completedTimes = solves => solves.map(solve => solve.finalSeconds).filter(Number.isFinite);

  function summarize(solves) {
    const values = completedTimes(solves);
    return {
      attempts: solves.length,
      completed: values.length,
      mean: average(values),
      median: median(values),
      best: values.length ? Math.min(...values) : null,
      worst: values.length ? Math.max(...values) : null,
      plus: solves.filter(solve => solve.plus).length,
      dnf: solves.filter(solve => solve.dnf).length,
      plusRate: solves.length ? solves.filter(solve => solve.plus).length / solves.length : null,
      dnfRate: solves.length ? solves.filter(solve => solve.dnf).length / solves.length : null
    };
  }

  function averageWindow(window) {
    const dnfs = window.filter(solve => solve.dnf || solve.finalSeconds === null).length;
    if (dnfs > 1) return { status: 'dnf', value: null };
    const values = completedTimes(window).sort((a, b) => a - b);
    const kept = dnfs === 1 ? values.slice(1) : values.slice(1, -1);
    return { status: 'ok', value: average(kept) };
  }

  function currentAverage(solves, size) {
    if (solves.length < size) return { status: 'insufficient', value: null };
    return averageWindow(solves.slice(-size));
  }

  function bestAverage(solves, size) {
    if (solves.length < size) return { status: 'insufficient', value: null, endIndex: null };
    let best = null, endIndex = null;
    for (let end = size; end <= solves.length; end += 1) {
      const result = averageWindow(solves.slice(end - size, end));
      if (result.status === 'ok' && (best === null || result.value < best)) { best = result.value; endIndex = end - 1; }
    }
    return best === null ? { status: 'dnf', value: null, endIndex: null } : { status: 'ok', value: best, endIndex };
  }

  function rollingCompletedAverage(solves, size) {
    const completed = [];
    return solves.map(solve => {
      if (Number.isFinite(solve.finalSeconds)) completed.push(solve.finalSeconds);
      return completed.length >= size ? average(completed.slice(-size)) : null;
    });
  }

  function consistency(solves, size = 50) {
    return standardDeviation(completedTimes(solves).slice(-size));
  }

  function filterByDate(solves, from, to) {
    return solves.filter(solve => (!from || solve.date.slice(0, 10) >= from) && (!to || solve.date.slice(0, 10) <= to));
  }

  function periodKey(date, period) {
    const day = new Date(`${date.slice(0, 10)}T12:00:00`);
    if (period === 'month') return date.slice(0, 7);
    if (period === 'week') {
      const weekday = (day.getDay() + 6) % 7;
      day.setDate(day.getDate() - weekday);
      return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    }
    return date;
  }

  function aggregateByPeriod(solves, period) {
    if (period === 'solves') return solves.map(solve => ({ key: solve.date, date: solve.date, mean: solve.finalSeconds, attempts: 1, completed: solve.dnf ? 0 : 1, solve }));
    const groups = new Map();
    solves.forEach(solve => {
      const key = periodKey(solve.date, period);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(solve);
    });
    return [...groups].map(([key, entries]) => ({ key, date: entries.at(-1).date, mean: average(completedTimes(entries)), attempts: entries.length, completed: completedTimes(entries).length }));
  }

  function recordHistory(solves, size = 1) {
    const history = [];
    let record = null;
    if (size === 1) {
      solves.forEach((solve, index) => {
        if (Number.isFinite(solve.finalSeconds) && (record === null || solve.finalSeconds < record)) {
          record = solve.finalSeconds;
          history.push({ date: solve.date, value: record, endIndex: index });
        }
      });
    } else {
      for (let end = size; end <= solves.length; end += 1) {
        const result = averageWindow(solves.slice(end - size, end));
        if (result.status === 'ok' && (record === null || result.value < record)) {
          record = result.value;
          history.push({ date: solves[end - 1].date, value: record, endIndex: end - 1 });
        }
      }
    }
    return history;
  }

  function compareHalves(solves, minimumPerHalf = 10) {
    const values = completedTimes(solves);
    const size = Math.floor(values.length / 2);
    if (size < minimumPerHalf) return null;
    const previous = average(values.slice(0, size));
    const recent = average(values.slice(-size));
    return { size, previous, recent, difference: recent - previous, percent: previous ? ((recent - previous) / previous) * 100 : null };
  }

  return {
    aggregateByPeriod, average, averageWindow, bestAverage, compareHalves, completedTimes,
    consistency, currentAverage, durationToSeconds, filterByDate, median, parseCsv,
    recordHistory, rollingCompletedAverage, sortSolves, standardDeviation, summarize
  };
});
