import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('manifest contains Test module', async ({ page }) => {
  await page.goto('/');
  const pre = page.locator('pre');
  await expect(pre).toBeVisible();
  const text = await pre.textContent();
  const manifest = JSON.parse(text ?? '{}');
  expect(manifest.modules).toBeDefined();
  expect(Array.isArray(manifest.modules)).toBe(true);
  const hasTest = manifest.modules.some(
    (m: { path: string }) => m.path.endsWith('Test.tsx')
  );
  expect(hasTest).toBe(true);
});

test('manifest updates when new import is added', async ({ page }) => {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const newComponentPath = path.join(appDir, 'NewComponent.tsx');
  const pagePath = path.join(appDir, 'page.tsx');

  const newComponentContent = `export default function NewComponent() {
  return <span data-testid="new-component">New</span>;
}
`;

  const originalPage = fs.readFileSync(pagePath, 'utf-8');

  try {
    fs.writeFileSync(newComponentPath, newComponentContent);
    fs.writeFileSync(
      pagePath,
      originalPage.replace(
        "import Test from './Test';",
        "import Test from './Test';\nimport NewComponent from './NewComponent';"
      )
    );

    await page.goto('/');
    await page.reload();
    const pre = page.locator('pre');
    await expect(pre).toBeVisible();
    const text = await pre.textContent();
    const manifest = JSON.parse(text ?? '{}');
    const hasNewComponent = manifest.modules?.some(
      (m: { path: string }) => m.path.endsWith('NewComponent.tsx')
    );
    expect(hasNewComponent).toBe(true);
  } finally {
    fs.unlinkSync(newComponentPath);
    fs.writeFileSync(pagePath, originalPage);
  }
});
