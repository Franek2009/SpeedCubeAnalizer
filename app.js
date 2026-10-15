(function () {
  'use strict';
  const C = window.CubeStatsCore;
  const $ = id => document.getElementById(id);
  const STORE_ACTIVE = 'cubestats.active.v1';
  const STORE_BACKUP = 'cubestats.backup.v1';
  const DEMO_CSV = `Category;Time (MM:SS.SSS);Scrambler;Date;Penalty +2 (yes or no);DNF (yes or no);Section
3x3x3;00:56.120;;2026-09-01 18:00;no;no;demo-1
3x3x3;00:52.340;;2026-09-01 18:02;no;no;demo-1
3x3x3;00:49.870;;2026-09-01 18:04;no;no;demo-1
3x3x3;00:51.220;;2026-09-01 18:06;yes;no;demo-1
3x3x3;00:47.640;;2026-09-01 18:08;no;no;demo-1
3x3x3;00:46.100;;2026-09-08 18:00;no;no;demo-2
3x3x3;00:45.330;;2026-09-08 18:02;no;no;demo-2
3x3x3;00:44.810;;2026-09-08 18:04;no;no;demo-2
3x3x3;00:40.000;;2026-09-08 18:06;no;yes;demo-2
3x3x3;00:43.290;;2026-09-08 18:08;no;no;demo-2
3x3x3;00:42.880;;2026-10-01 18:00;no;no;demo-3
3x3x3;00:41.200;;2026-10-01 18:02;no;no;demo-3
3x3x3;00:43.510;;2026-10-01 18:04;no;no;demo-3
3x3x3;00:39.990;;2026-10-01 18:06;no;no;demo-3
3x3x3;00:40.810;;2026-10-01 18:08;no;no;demo-3
2x2x2;00:18.420;;2026-10-01 18:10;no;no;demo-3
2x2x2;00:15.880;;2026-10-01 18:12;no;no;demo-3
2x2x2;00:17.100;;2026-10-01 18:14;no;no;demo-3`;

  let allSolves = [], diagnostics = null, activeMeta = null, currentCategory = '3x3x3', historyLimit = 50, chartPoints = [];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const formatTime = value => value == null || !Number.isFinite(value) ? '—' : value >= 60 ? `${Math.floor(value / 60)}:${(value % 60).toFixed(3).padStart(6, '0')}` : `${value.toFixed(3)} s`;
  const formatAverage = result => result.status === 'dnf' ? 'DNF' : formatTime(result.value);
  const formatPercent = value => value == null ? '—' : `${(value * 100).toFixed(1).replace('.', ',')}%`;
  const shortDate = value => value ? value.slice(0, 16).replace('T', ' ') : '—';
  const metric = (label, value, description = '') => `<div class="metric"><div class="label">${escapeHtml(label)}</div><b>${escapeHtml(value)}</b>${description ? `<div class="small">${escapeHtml(description)}</div>` : ''}</div>`;
  const emptyRow = (columns, text = 'Brak danych w wybranym zakresie') => `<tr><td colspan="${columns}" class="empty">${escapeHtml(text)}</td></tr>`;

  function showNotice(id, message) {
    const element = $(id); element.textContent = message || ''; element.style.display = message ? 'block' : 'none';
  }
  function clearNotices() { ['error', 'warning', 'success'].forEach(id => showNotice(id, '')); }

  function getStored(key) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; }
    catch (_) { return null; }
  }
  function setStored(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  function loadDataset(payload, options = {}) {
    clearNotices();
    try {
      const parsed = C.parseCsv(payload.csv);
      allSolves = parsed.solves;
      diagnostics = parsed.diagnostics;
      activeMeta = { csv: payload.csv, name: payload.name || 'Import CSV', importedAt: payload.importedAt || new Date().toISOString(), count: parsed.solves.length, demo: Boolean(payload.demo) };
      const categories = [...new Set(allSolves.map(solve => solve.category))];
      if (!categories.includes(currentCategory)) currentCategory = categories.includes('3x3x3') ? '3x3x3' : categories[0];
      historyLimit = 50;
      if (options.persist) {
        const old = getStored(STORE_ACTIVE);
        if (old) setStored(STORE_BACKUP, old);
        if (!setStored(STORE_ACTIVE, activeMeta)) showNotice('warning', 'Dane są dostępne w tej karcie, ale przeglądarka nie pozwoliła ich zapisać.');
      }
      if (parsed.diagnostics.rejected) {
        const examples = parsed.diagnostics.errors.slice(0, 3).map(error => `wiersz ${error.line}: ${error.reasons.join(', ')}`).join('; ');
        showNotice('warning', `Zaimportowano ${parsed.diagnostics.accepted} prób, odrzucono ${parsed.diagnostics.rejected}. ${examples}`);
      } else if (options.persist) showNotice('success', `Zaimportowano ${parsed.diagnostics.accepted} prób. Poprzedni zbiór można przywrócić.`);
      render();
    } catch (error) { showNotice('error', error.message || 'Nie udało się odczytać pliku.'); }
  }

  function selectedCategorySolves(filtered = true) {
    const source = allSolves.filter(solve => solve.category === currentCategory);
    return filtered ? C.filterByDate(source, $('dateFrom').value, $('dateTo').value) : source;
  }

  function allFilteredSolves() { return C.filterByDate(allSolves, $('dateFrom').value, $('dateTo').value); }

  function updatePreset(value) {
    if (!allSolves.length || value === 'custom') return;
    if (value === 'all') { $('dateFrom').value = ''; $('dateTo').value = ''; return; }
    const latest = allSolves.at(-1).date.slice(0, 10);
    const end = new Date(`${latest}T12:00:00`), start = new Date(end);
    if (value === '30') start.setDate(start.getDate() - 29);
    else if (value === 'month') start.setDate(1);
    $('dateFrom').value = localIsoDate(start); $('dateTo').value = latest;
  }
  function localIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

  function render() {
    const categories = [...new Set(allSolves.map(solve => solve.category))];
    $('category').innerHTML = categories.map(category => `<option ${category === currentCategory ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
    $('datasetName').textContent = `${activeMeta.name} · ${allSolves.length} ułożeń · ${categories.length} kategorie`;
    $('importMeta').textContent = activeMeta.demo ? 'Dane demonstracyjne — zaimportuj własny CSV' : `Ostatni import: ${new Date(activeMeta.importedAt).toLocaleString('pl-PL')} · ${diagnostics.accepted} przyjętych${diagnostics.rejected ? ` · ${diagnostics.rejected} odrzuconych` : ''}`;
    $('restoreButton').disabled = !getStored(STORE_BACKUP);
    const values = selectedCategorySolves();
    renderKpis(values); renderMetrics(values); renderProgress(values); renderSessions(values); renderCategories(); renderRecords(values); renderHistory(values); renderCharts(values);
  }

  function renderKpis(solves) {
    const stats = C.summarize(solves);
    $('kpis').innerHTML = [
      ['Ułożenia', stats.attempts, `${stats.completed} ukończonych · w zakresie`],
      ['Średnia', formatTime(stats.mean), 'Bez DNF, z karami +2 · w zakresie'],
      ['Rekord', formatTime(stats.best), 'Najszybsze poprawne · w zakresie'],
      ['DNF / +2', `${formatPercent(stats.dnfRate)} / ${formatPercent(stats.plusRate)}`, `${stats.dnf} DNF · ${stats.plus} kar +2`]
    ].map(([label, value, description]) => `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="desc">${description}</div></div>`).join('');
  }

  function renderMetrics(solves) {
    const stats = C.summarize(solves), completed = C.completedTimes(solves);
    $('metrics').innerHTML = metric('Mediana', formatTime(stats.median)) +
      metric('Ostatnie 20', formatTime(C.average(completed.slice(-20))), `${Math.min(20, completed.length)} ukończonych`) +
      metric('Ostatnie 50', formatTime(C.average(completed.slice(-50))), `${Math.min(50, completed.length)} ukończonych`) +
      metric('Ostatnie 100', formatTime(C.average(completed.slice(-100))), `${Math.min(100, completed.length)} ukończonych`) +
      metric('Aktualne Ao5', formatAverage(C.currentAverage(solves, 5))) + metric('Najlepsze Ao5', formatAverage(C.bestAverage(solves, 5))) +
      metric('Aktualne Ao12', formatAverage(C.currentAverage(solves, 12))) + metric('Najlepsze Ao12', formatAverage(C.bestAverage(solves, 12))) +
      metric('Najlepsze Ao50', formatAverage(C.bestAverage(solves, 50))) + metric('Najlepsze Ao100', formatAverage(C.bestAverage(solves, 100))) +
      metric('Regularność 50', formatTime(C.consistency(solves, 50)), 'Odchylenie standardowe') + metric('Ukończone', `${stats.completed}/${stats.attempts}`);
  }

  function renderProgress(solves) {
    const comparison = C.compareHalves(solves);
    if (!comparison) { $('progress').innerHTML = '<span class="small">Potrzeba co najmniej 20 ukończonych prób, aby porównać dwie części zakresu.</span>'; return; }
    const faster = comparison.difference <= 0;
    $('progress').innerHTML = `<div class="label">Pierwsze i ostatnie ${comparison.size} ukończonych prób</div><div class="actions" style="justify-content:flex-start;margin-top:8px"><div><span class="small">Pierwsza część</span><div class="value" style="font-size:20px">${formatTime(comparison.previous)}</div></div><div><span class="small">Druga część</span><div class="value" style="font-size:20px">${formatTime(comparison.recent)}</div></div></div><p class="${faster ? 'trendgood' : 'trendbad'}" style="font-weight:700;margin-bottom:0">${faster ? '↘' : '↗'} ${formatTime(Math.abs(comparison.difference))} · ${Math.abs(comparison.percent).toFixed(1).replace('.', ',')}% ${faster ? 'szybciej' : 'wolniej'}</p>`;
  }

  function groupSessions(solves) {
    const groups = new Map();
    solves.forEach(solve => { const key = solve.section || 'Brak identyfikatora'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(solve); });
    return [...groups.entries()].sort((a, b) => b[1].at(-1).date.localeCompare(a[1].at(-1).date));
  }
  function renderSessions(solves) {
    const sessions = groupSessions(solves);
    $('sessions').innerHTML = sessions.length ? sessions.map(([id, entries]) => { const stats = C.summarize(entries); return `<tr class="clickable" data-session="${escapeHtml(id)}" tabindex="0"><td>${entries.at(-1).date.slice(0, 10)}</td><td>${entries.length}</td><td>${formatTime(stats.mean)}</td><td>${formatTime(stats.best)}</td></tr>`; }).join('') : emptyRow(4);
  }

  function renderCategories() {
    const filtered = allFilteredSolves(), categories = [...new Set(allSolves.map(solve => solve.category))];
    $('categories').innerHTML = categories.map(category => { const stats = C.summarize(filtered.filter(solve => solve.category === category)); return `<tr class="clickable ${category === currentCategory ? 'active-row' : ''}" data-category="${escapeHtml(category)}"><td><b>${escapeHtml(category)}</b></td><td>${stats.attempts}</td><td>${formatTime(stats.mean)}</td><td>${formatTime(stats.best)}</td><td>${stats.dnf}</td></tr>`; }).join('');
  }

  function renderRecords(solves) {
    const size = Number($('recordType').value), records = C.recordHistory(solves, size).reverse();
    $('recordHistory').innerHTML = records.length ? records.map((record, index) => `<div class="record-row"><span>${record.date.slice(0, 10)}</span><b>${formatTime(record.value)}</b><span class="small">${index === 0 ? 'aktualny' : 'rekord'}</span></div>`).join('') : '<div class="empty">Brak rekordu dla tego zakresu.</div>';
  }

  function statusPill(solve) { return solve.dnf ? '<span class="pill dnf">DNF</span>' : solve.plus ? '<span class="pill penalty">+2</span>' : '<span class="pill">OK</span>'; }
  function renderHistory(solves) {
    const shown = [...solves].reverse().slice(0, historyLimit);
    $('history').innerHTML = shown.length ? shown.map(solve => `<tr><td>${escapeHtml(shortDate(solve.date))}</td><td><b>${solve.dnf ? 'DNF' : formatTime(solve.finalSeconds)}</b></td><td>${statusPill(solve)}</td><td>${escapeHtml(solve.section || '—')}</td><td title="${escapeHtml(solve.scramble)}">${escapeHtml(solve.scramble ? `${solve.scramble.slice(0, 32)}${solve.scramble.length > 32 ? '…' : ''}` : '—')}</td></tr>`).join('') : emptyRow(5);
    $('historyCount').textContent = `Wyświetlono ${shown.length} z ${solves.length}`;
    $('showMore').hidden = shown.length >= solves.length;
  }

  function showSession(id) {
    const entries = selectedCategorySolves().filter(solve => (solve.section || 'Brak identyfikatora') === id), stats = C.summarize(entries);
    $('sessionTitle').textContent = `Sesja ${id} · ${entries.at(-1)?.date.slice(0, 10) || ''}`;
    $('sessionBody').innerHTML = `<div class="metriclist">${metric('Próby', entries.length)}${metric('Średnia', formatTime(stats.mean))}${metric('Rekord', formatTime(stats.best))}${metric('DNF / +2', `${stats.dnf} / ${stats.plus}`)}</div><div class="tablewrap" style="margin-top:16px"><table><thead><tr><th>Data</th><th>Bazowy</th><th>Końcowy</th><th>Status</th><th>Scramble</th></tr></thead><tbody>${[...entries].reverse().map(solve => `<tr><td>${shortDate(solve.date)}</td><td>${formatTime(solve.rawSeconds)}</td><td>${solve.dnf ? 'DNF' : formatTime(solve.finalSeconds)}</td><td>${statusPill(solve)}</td><td>${escapeHtml(solve.scramble || '—')}</td></tr>`).join('')}</tbody></table></div>`;
    $('sessionDialog').showModal();
  }

  function canvas(id) {
    const element = $(id), rect = element.getBoundingClientRect(), dpr = Math.max(1, window.devicePixelRatio || 1), width = Math.max(200, Math.round(rect.width)), height = Math.max(160, Math.round(rect.height));
    element.width = Math.round(width * dpr); element.height = Math.round(height * dpr); const context = element.getContext('2d'); context.setTransform(dpr, 0, 0, dpr, 0, 0); return { element, context, width, height };
  }
  function colors() { const style = getComputedStyle(document.body); return { grid: style.getPropertyValue('--line').trim(), muted: style.getPropertyValue('--muted').trim(), blue: style.getPropertyValue('--blue').trim(), accent: style.getPropertyValue('--accent').trim(), purple: style.getPropertyValue('--purple').trim() }; }
  function axisLabel(value) { return value >= 60 ? `${Math.floor(value / 60)}:${Math.round(value % 60).toString().padStart(2, '0')}` : `${Math.round(value)}s`; }
  function frame(context, width, height, minimum, maximum) {
    const padding = { left: 43, right: 12, top: 18, bottom: 28 }, plotWidth = width - padding.left - padding.right, plotHeight = height - padding.top - padding.bottom, palette = colors();
    context.strokeStyle = palette.grid; context.fillStyle = palette.muted; context.font = '11px system-ui'; context.textAlign = 'right';
    for (let index = 0; index <= 4; index += 1) { const y = padding.top + plotHeight * index / 4; context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke(); context.fillText(axisLabel(maximum - (maximum - minimum) * index / 4), padding.left - 7, y + 4); }
    return { ...padding, plotWidth, plotHeight };
  }
  function renderCharts(solves) { renderTrend(solves); renderHistogram(solves); }
  function renderTrend(solves) {
    const { context, width, height } = canvas('trendChart'), palette = colors(), aggregation = $('aggregation').value; context.clearRect(0, 0, width, height); chartPoints = [];
    let points = C.aggregateByPeriod(solves, aggregation); const count = $('plotRange').value === 'all' ? points.length : Number($('plotRange').value); points = points.slice(-count);
    const values = points.map(point => point.mean).filter(Number.isFinite); if (!values.length) { context.fillStyle = palette.muted; context.textAlign = 'center'; context.fillText('Brak ukończonych ułożeń', width / 2, height / 2); return; }
    const sorted = [...values].sort((a, b) => a - b), low = sorted[Math.floor(sorted.length * .02)], high = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .98))], minimum = Math.max(0, low - (high - low) * .12 - 2), maximum = Math.max(minimum + 4, high + (high - low) * .12 + 2), layout = frame(context, width, height, minimum, maximum), x = index => layout.left + (points.length === 1 ? .5 : index / (points.length - 1)) * layout.plotWidth, y = value => layout.top + (maximum - value) / (maximum - minimum) * layout.plotHeight;
    context.save(); context.beginPath(); context.rect(layout.left, layout.top, layout.plotWidth, layout.plotHeight); context.clip(); context.fillStyle = palette.blue;
    points.forEach((point, index) => { if (!Number.isFinite(point.mean)) return; const px = x(index), py = y(point.mean); context.globalAlpha = .65; context.beginPath(); context.arc(px, py, points.length > 300 ? 1.8 : 3.1, 0, Math.PI * 2); context.fill(); chartPoints.push({ x: px, y: py, point }); }); context.globalAlpha = 1;
    if (aggregation === 'solves') { const rolling = C.rollingCompletedAverage(solves, 20).slice(-count); context.strokeStyle = palette.accent; context.lineWidth = 2.5; context.beginPath(); let started = false; rolling.forEach((value, index) => { if (!Number.isFinite(value)) return; if (started) context.lineTo(x(index), y(value)); else { context.moveTo(x(index), y(value)); started = true; } }); context.stroke(); }
    context.restore(); context.fillStyle = palette.muted; context.font = '11px system-ui'; context.textAlign = 'left'; context.fillText(points[0].key.slice(0, 10), layout.left, height - 6); context.textAlign = 'right'; context.fillText(points.at(-1).key.slice(0, 10), width - layout.right, height - 6);
    $('trendDescription').textContent = aggregation === 'solves' ? 'Punkty: próby. Linia: średnia z dokładnie 20 ukończonych ułożeń.' : `Każdy punkt to średnia ukończonych prób w okresie (${aggregation === 'week' ? 'tydzień' : 'miesiąc'}).`;
  }
  function renderHistogram(solves) {
    const { context, width, height } = canvas('histChart'), palette = colors(), times = C.completedTimes(solves); context.clearRect(0, 0, width, height); if (!times.length) return;
    const sorted = [...times].sort((a, b) => a - b); let minimum = sorted[0], maximum = sorted.at(-1); if (maximum - minimum < 1) { minimum -= 1; maximum += 1; }
    const bins = Array(12).fill(0); times.forEach(value => bins[Math.min(11, Math.floor((value - minimum) / (maximum - minimum) * 12))] += 1); const peak = Math.max(...bins), padding = { left: 22, right: 7, top: 19, bottom: 30 }, plotWidth = width - padding.left - padding.right, plotHeight = height - padding.top - padding.bottom;
    context.strokeStyle = palette.grid; for (let index = 0; index <= 4; index += 1) { const y = padding.top + plotHeight * index / 4; context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke(); }
    bins.forEach((count, index) => { const gap = 3, x = padding.left + index * plotWidth / 12 + gap / 2, barHeight = plotHeight * count / peak; context.fillStyle = palette.purple; context.fillRect(x, padding.top + plotHeight - barHeight, plotWidth / 12 - gap, barHeight); }); context.fillStyle = palette.muted; context.font = '11px system-ui'; context.textAlign = 'left'; context.fillText(axisLabel(minimum), padding.left, height - 6); context.textAlign = 'right'; context.fillText(axisLabel(maximum), width - padding.right, height - 6);
  }

  function exportSummary() {
    const rows = [['Kategoria', 'Ułożenia', 'Ukończone', 'Średnia [s]', 'Mediana [s]', 'Rekord [s]', 'Kary +2', 'DNF']];
    [...new Set(allSolves.map(solve => solve.category))].forEach(category => { const stats = C.summarize(allFilteredSolves().filter(solve => solve.category === category)); rows.push([category, stats.attempts, stats.completed, stats.mean?.toFixed(3) || '', stats.median?.toFixed(3) || '', stats.best?.toFixed(3) || '', stats.plus, stats.dnf]); });
    const text = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n'), url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a'); link.href = url; link.download = 'cube_stats_podsumowanie.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  $('importButton').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', async event => { const file = event.target.files[0]; if (file) loadDataset({ csv: await file.text(), name: file.name }, { persist: true }); event.target.value = ''; });
  $('restoreButton').addEventListener('click', () => { const backup = getStored(STORE_BACKUP); if (!backup || !confirm(`Przywrócić „${backup.name}” i zachować obecny zbiór jako kopię?`)) return; const current = getStored(STORE_ACTIVE); if (current) setStored(STORE_BACKUP, current); setStored(STORE_ACTIVE, backup); loadDataset(backup); showNotice('success', `Przywrócono „${backup.name}”.`); });
  $('exportButton').addEventListener('click', exportSummary);
  $('category').addEventListener('change', event => { currentCategory = event.target.value; historyLimit = 50; render(); });
  $('datePreset').addEventListener('change', event => { updatePreset(event.target.value); historyLimit = 50; render(); });
  ['dateFrom', 'dateTo'].forEach(id => $(id).addEventListener('change', () => { $('datePreset').value = 'custom'; historyLimit = 50; render(); }));
  $('resetDates').addEventListener('click', () => { $('datePreset').value = 'all'; updatePreset('all'); historyLimit = 50; render(); });
  $('aggregation').addEventListener('change', () => { $('plotRange').disabled = $('aggregation').value !== 'solves'; renderTrend(selectedCategorySolves()); });
  $('plotRange').addEventListener('change', () => renderTrend(selectedCategorySolves()));
  $('recordType').addEventListener('change', () => renderRecords(selectedCategorySolves()));
  $('showMore').addEventListener('click', () => { historyLimit += 100; renderHistory(selectedCategorySolves()); });
  $('categories').addEventListener('click', event => { const row = event.target.closest('[data-category]'); if (row) { currentCategory = row.dataset.category; historyLimit = 50; render(); } });
  $('sessions').addEventListener('click', event => { const row = event.target.closest('[data-session]'); if (row) showSession(row.dataset.session); });
  $('sessions').addEventListener('keydown', event => { if (event.key === 'Enter') { const row = event.target.closest('[data-session]'); if (row) showSession(row.dataset.session); } });
  $('closeSession').addEventListener('click', () => $('sessionDialog').close());
  $('sessionDialog').addEventListener('click', event => { if (event.target === $('sessionDialog')) $('sessionDialog').close(); });
  let resizeFrame; window.addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => allSolves.length && renderCharts(selectedCategorySolves())); });
  $('trendChart').addEventListener('mousemove', event => { const rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top; let nearest = null, distance = Infinity; chartPoints.forEach(point => { const d = (point.x - x) ** 2 + (point.y - y) ** 2; if (d < distance) { distance = d; nearest = point; } }); const tooltip = $('tooltip'); if (nearest && distance < 400) { const point = nearest.point; tooltip.textContent = `${formatTime(point.mean)} · ${point.key.slice(0, 16)}${point.attempts > 1 ? ` · ${point.completed}/${point.attempts} ukończonych` : point.solve?.plus ? ' · +2' : ''}`; tooltip.style.left = `${Math.min(innerWidth - 230, event.clientX + 12)}px`; tooltip.style.top = `${event.clientY + 14}px`; tooltip.style.display = 'block'; } else tooltip.style.display = 'none'; });
  $('trendChart').addEventListener('mouseleave', () => $('tooltip').style.display = 'none');
  const dropArea = $('dropArea'); dropArea.addEventListener('dragover', event => { event.preventDefault(); dropArea.classList.add('dragover'); }); dropArea.addEventListener('dragleave', event => { if (!dropArea.contains(event.relatedTarget)) dropArea.classList.remove('dragover'); }); dropArea.addEventListener('drop', async event => { event.preventDefault(); dropArea.classList.remove('dragover'); const file = event.dataTransfer.files[0]; if (file) loadDataset({ csv: await file.text(), name: file.name }, { persist: true }); });

  const stored = getStored(STORE_ACTIVE);
  loadDataset(stored || { csv: DEMO_CSV, name: 'Dane demonstracyjne', demo: true, importedAt: new Date().toISOString() });
})();
