import {expect, test} from '@playwright/test';

test('granted start, receipt, tap and logout use the real Flux lifecycle', async ({page}) => {
  await page.goto('/tests/native-notifications-harness.html');
  await page.getByRole('button', {exact: true, name: 'Start'}).click();
  await page.getByRole('button', {exact: true, name: 'Start'}).click();
  await page.getByRole('button', {exact: true, name: 'Receive'}).click();

  await expect(page.locator('#state')).toHaveText('{"registrations":1,"opened":0,"inbox":1}');

  await page.getByRole('button', {exact: true, name: 'Open'}).click();

  await expect(page.locator('#state')).toHaveText('{"registrations":1,"opened":1,"inbox":1}');

  await page.getByRole('button', {exact: true, name: 'Stop'}).click();

  await expect(page.locator('#state')).toHaveText('{"registrations":1,"opened":1,"inbox":0}');
});
