'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, '..', 'test_data_150_solves.csv');
const fixtureBytes = fs.readFileSync(fixturePath);

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
