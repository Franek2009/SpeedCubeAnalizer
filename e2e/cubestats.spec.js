'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, '..', 'test_data_150_solves.csv');
const fixtureBytes = fs.readFileSync(fixturePath);
const header = 'Category;Time (MM:SS.SSS);Scrambler;Date;Penalty +2 (yes or no);DNF (yes or no);Section';
const csvFile = (name, body) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(`${header}\n${body}`) });

test('import is persisted and only promises a backup when one exists', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('#onboarding')).toBeVisible();
  await expect(page.locator('#onboarding')).toContainText('W aplikacji Cube Timer');
  await expect(page.locator('#onboardingImport')).toHaveText('Wybierz plik CSV');

  await page.locator('#fileInput').setInputFiles(fixturePath);
  await expect(page.locator('#onboarding')).toBeHidden();
  await expect(page.locator('#datasetName')).toContainText('test_data_150_solves.csv · 150 ułożeń');
  await expect(page.locator('#kpis .value').first()).toHaveText('70');
  await expect(page.locator('#success')).toContainText('Dane zapisano lokalnie.');
  await expect(page.locator('#success')).not.toContainText('poprzedni zbiór');
  await expect(page.locator('#restoreButton')).toBeDisabled();
  const storedCount = await page.evaluate(() => JSON.parse(localStorage.getItem('cubestats.active.v1')).count);
  expect(storedCount).toBe(150);

  await page.locator('#fileInput').setInputFiles(fixturePath);
  await expect(page.locator('#success')).toContainText('poprzedni zbiór można przywrócić');
  await expect(page.locator('#restoreButton')).toBeEnabled();
});

test('storage failure keeps imported data in the tab without a false success', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(fixturePath);

  await expect(page.locator('#datasetName')).toContainText('test_data_150_solves.csv · 150 ułożeń');
  await expect(page.locator('#warning')).toContainText('tylko w bieżącej karcie');
  await expect(page.locator('#success')).toBeHidden();
  await expect(page.locator('#restoreButton')).toBeDisabled();
});

test('data-relative presets and full CSV download match the imported file', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#fileInput').setInputFiles(fixturePath);

  await expect(page.locator('#datePreset option[value="30"]')).toHaveText('Ostatnie 30 dni danych');
  await expect(page.locator('#datePreset option[value="month"]')).toHaveText('Miesiąc ostatniego ułożenia');
  await page.locator('#datePreset').selectOption('30');
  await expect(page.locator('#dateFrom')).toHaveValue('2026-01-04');
  await expect(page.locator('#dateTo')).toHaveValue('2026-02-02');
  await page.locator('#datePreset').selectOption('month');
  await expect(page.locator('#dateFrom')).toHaveValue('2026-02-01');
  await expect(page.locator('#dateTo')).toHaveValue('2026-02-02');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportDataButton').click()
  ]);
  expect(download.suggestedFilename()).toBe('test_data_150_solves.csv');
  expect(fs.readFileSync(await download.path()).equals(fixtureBytes)).toBe(true);
});

test('restoring swaps the active dataset and its backup', async ({ page }) => {
  const first = csvFile('pierwszy.csv', '3x3x3;00:10.000;;2026-01-01 12:00;no;no;A');
  const second = csvFile('drugi.csv', '2x2x2;00:05.000;;2026-02-01 12:00;no;no;B');
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('#fileInput').setInputFiles(first);
  await page.locator('#fileInput').setInputFiles(second);
  await expect(page.locator('#datasetName')).toContainText('drugi.csv');
  await expect(page.locator('#restoreButton')).toBeEnabled();

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restoreButton').click();
  await expect(page.locator('#datasetName')).toContainText('pierwszy.csv');
  await expect(page.locator('#success')).toContainText('Przywrócono i zapisano „pierwszy.csv”');
  const stored = await page.evaluate(() => ({
    active: JSON.parse(localStorage.getItem('cubestats.active.v1')).name,
    backup: JSON.parse(localStorage.getItem('cubestats.backup.v1')).name
  }));
  expect(stored).toEqual({ active: 'pierwszy.csv', backup: 'drugi.csv' });
});

test('invalid CSV preserves current data while a partial CSV imports valid rows', async ({ page }) => {
  const valid = csvFile('poprawny.csv', '3x3x3;00:10.000;;2026-01-01 12:00;no;no;A');
  const partial = csvFile('czesciowy.csv', [
    '3x3x3;00:11.000;;2026-01-02 12:00;no;no;B',
    '3x3x3;zly-czas;;2026-01-02 12:01;no;no;B'
  ].join('\n'));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#fileInput').setInputFiles(valid);

  await page.locator('#fileInput').setInputFiles({ name: 'bledny.csv', mimeType: 'text/csv', buffer: Buffer.from('Category;Date\n3x3x3;2026-01-01') });
  await expect(page.locator('#error')).toContainText('Brak wymaganych kolumn');
  await expect(page.locator('#datasetName')).toContainText('poprawny.csv');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cubestats.active.v1')).name)).toBe('poprawny.csv');
  expect(await page.evaluate(() => localStorage.getItem('cubestats.backup.v1'))).toBeNull();

  await page.locator('#fileInput').setInputFiles(partial);
  await expect(page.locator('#warning')).toContainText('Zaimportowano 1 prób, odrzucono 1');
  await expect(page.locator('#datasetName')).toContainText('czesciowy.csv · 1 ułożeń');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cubestats.active.v1')));
  expect(stored.name).toBe('czesciowy.csv');
  expect(stored.count).toBe(1);
});
