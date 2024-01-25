import { test, expect } from '@playwright/test';
test.describe('Extract Metadata', () => {
    test('postgres', async ({ page }) => {
        await page.goto('http://localhost:1234/');
        // set the auth variables in localStorage so that we don't get redirected to /login
        await page.evaluate(() => {
            localStorage.setItem('defogUser', 'admin');
            localStorage.setItem('defogToken', 'bdbe4d376e6c8a53a791a86470b924c0715854bd353483523e3ab016eb55bcd0');
            localStorage.setItem('defogUserType', 'admin');
        });
        await page.goto('http://localhost:1234/extract-metadata');
        await page.waitForURL('http://localhost:1234/extract-metadata');
        // select postgres and fill in our application's DB credentials
        await page.getByLabel('Database Type').click();
        await page.getByTitle('postgres').locator('div').click();
        await page.getByLabel('host').click();
        await page.getByLabel('host').fill('agents-postgres');
        await page.getByLabel('port').click();
        await page.getByLabel('port').fill('5432');
        await page.getByLabel('user').click();
        await page.getByLabel('user').fill('postgres');
        await page.getByLabel('password').click();
        await page.getByLabel('password').fill('postgres');
        await page.getByLabel('database', { exact: true }).click();
        await page.getByLabel('database', { exact: true }).fill('postgres');
        // get tables
        await page.getByRole('button', { name: 'Get Tables' }).click();
        // table selector should populate
        await expect(page.locator('#db_tables')).toContainText('Tables to index');
        await page.locator('#db_tables > div > .ant-row > div:nth-child(2) > .ant-form-item-control-input > .ant-form-item-control-input-content > .ant-select > .ant-select-selector').click();
        // not sure why but we need to click twice to get the table to be selected
        await page.getByTitle('defog_docs').locator('div').dblclick();
        await page.getByLabel('Tables to index').click();
        // extract metadata from just 1 table (defog_docs)
        await page.getByRole('button', { name: 'Extract Metadata' }).click();
        // wait for right half of UI with metadata for each column to be visible
        await page.waitForSelector('text="Update metadata on server"');
        await expect(page.getByRole('button', { name: 'loading Update metadata on' })).toContainText('Update metadata on server');
        await expect(page.getByRole('main')).toContainText('Column Name');
        await expect(page.getByRole('main')).toContainText('Update metadata on server');
        await expect(page.getByText('Table Name', { exact: true })).toBeVisible();
        await expect(page.getByText('Column Name', { exact: true })).toBeVisible();
        await expect(page.getByText('Data Type', { exact: true })).toBeVisible();
        await expect(page.getByText('Description')).toBeVisible();
        await expect(page.getByRole('main')).toContainText('defog_docs');
        await expect(page.getByRole('main')).toContainText('username');
        await expect(page.getByRole('main')).toContainText('text');
        await page.getByRole('button', { name: 'Update metadata on server' }).click();
        // wait for success message
        await page.waitForSelector('text="Metadata updated successfully!"');
        await expect(page.locator('body')).toContainText('Metadata updated successfully!');
      
    });
});