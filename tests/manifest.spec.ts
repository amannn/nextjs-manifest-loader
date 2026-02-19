import fs from 'node:fs';
import path from 'node:path';
import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';

async function getManifest(page: Page) {
  const pre = page.locator('pre');
  await expect(pre).toBeVisible();
  const text = await pre.textContent();
  return JSON.parse(text ?? '{}');
}

test('manifest contains Test module on initial compilation', async ({page}) => {
  await page.goto('/');
  const manifest = await getManifest(page);
  expect(manifest.modules).toBeDefined();
  expect(Array.isArray(manifest.modules)).toBe(true);
  const hasTest = manifest.modules.some((m: {path: string}) =>
    m.path.endsWith('Test.tsx')
  );
  expect(hasTest).toBe(true);
});

test('manifest updates when new import is added', async ({page}) => {
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
    const manifest = await getManifest(page);
    const hasNewComponent = manifest.modules?.some((m: {path: string}) =>
      m.path.endsWith('NewComponent.tsx')
    );
    expect(hasNewComponent).toBe(true);
  } finally {
    fs.unlinkSync(newComponentPath);
    fs.writeFileSync(pagePath, originalPage);
  }
});

test('manifest includes transitive imports (page -> Test -> Another)', async ({
  page
}) => {
  await page.goto('/');
  const manifest = await getManifest(page);
  const paths = manifest.modules.map((m: {path: string}) => m.path);
  expect(paths.some((p: string) => p.endsWith('page.tsx'))).toBe(true);
  expect(paths.some((p: string) => p.endsWith('Test.tsx'))).toBe(true);
  expect(paths.some((p: string) => p.endsWith('Another.tsx'))).toBe(true);
});

test('manifest excludes type-only imports', async ({page}) => {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const typesPath = path.join(appDir, 'types.ts');
  const pagePath = path.join(appDir, 'page.tsx');

  const typesContent = `export type Foo = string;\n`;
  const originalPage = fs.readFileSync(pagePath, 'utf-8');

  try {
    fs.writeFileSync(typesPath, typesContent);
    fs.writeFileSync(
      pagePath,
      originalPage.replace(
        "import Test from './Test';",
        "import Test from './Test';\nimport type { Foo } from './types';"
      )
    );

    await page.goto('/');
    await page.reload();
    const manifest = await getManifest(page);
    expect(
      manifest.modules.some((m: {path: string}) => m.path.endsWith('types.ts'))
    ).toBe(false);
  } finally {
    fs.unlinkSync(typesPath);
    fs.writeFileSync(pagePath, originalPage);
  }
});

test('manifest handles circular imports without hanging', async ({page}) => {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const cycleAPath = path.join(appDir, 'CycleA.tsx');
  const cycleBPath = path.join(appDir, 'CycleB.tsx');
  const pagePath = path.join(appDir, 'page.tsx');

  const cycleAContent = `import CycleB from './CycleB';\nexport default function CycleA() { return <CycleB />; }\n`;
  const cycleBContent = `import CycleA from './CycleA';\nexport default function CycleB() { return <CycleA />; }\n`;
  const originalPage = fs.readFileSync(pagePath, 'utf-8');

  try {
    fs.writeFileSync(cycleAPath, cycleAContent);
    fs.writeFileSync(cycleBPath, cycleBContent);
    fs.writeFileSync(
      pagePath,
      originalPage.replace(
        "import Test from './Test';",
        "import Test from './Test';\nimport CycleA from './CycleA';"
      )
    );

    await page.goto('/');
    await page.reload();
    const manifest = await getManifest(page);
    expect(
      manifest.modules.some((m: {path: string}) =>
        m.path.endsWith('CycleA.tsx')
      )
    ).toBe(true);
    expect(
      manifest.modules.some((m: {path: string}) =>
        m.path.endsWith('CycleB.tsx')
      )
    ).toBe(true);
  } finally {
    fs.unlinkSync(cycleAPath);
    fs.unlinkSync(cycleBPath);
    fs.writeFileSync(pagePath, originalPage);
  }
});

test('manifest handles unresolvable import gracefully', async ({page}) => {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const pagePath = path.join(appDir, 'page.tsx');

  const originalPage = fs.readFileSync(pagePath, 'utf-8');

  try {
    fs.writeFileSync(
      pagePath,
      originalPage.replace(
        "import Test from './Test';",
        "import Test from './Test';\nimport X from './DoesNotExist';"
      )
    );

    await page.goto('/');
    await page.reload();
    const manifest = await getManifest(page);
    expect(manifest.modules).toBeDefined();
    expect(
      manifest.modules.some((m: {path: string}) => m.path.endsWith('Test.tsx'))
    ).toBe(true);
  } finally {
    fs.writeFileSync(pagePath, originalPage);
  }
});

test('manifest updates when import is removed', async ({page}) => {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const orphanPath = path.join(appDir, 'Orphan.tsx');
  const pagePath = path.join(appDir, 'page.tsx');

  const orphanContent = `export default function Orphan() { return <span>Orphan</span>; }\n`;
  const originalPage = fs.readFileSync(pagePath, 'utf-8');

  try {
    fs.writeFileSync(orphanPath, orphanContent);
    fs.writeFileSync(
      pagePath,
      originalPage.replace(
        "import Test from './Test';",
        "import Test from './Test';\nimport Orphan from './Orphan';"
      )
    );

    await page.goto('/');
    await page.reload();
    let manifest = await getManifest(page);
    expect(
      manifest.modules.some((m: {path: string}) =>
        m.path.endsWith('Orphan.tsx')
      )
    ).toBe(true);

    fs.writeFileSync(pagePath, originalPage);
    fs.unlinkSync(orphanPath);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await expect
      .poll(
        async () => {
          await page.goto(`/?nocache=${Date.now()}`);
          const m = await getManifest(page);
          return m.modules.some((x: {path: string}) =>
            x.path.endsWith('Orphan.tsx')
          );
        },
        {intervals: [1000, 2000, 2000], timeout: 20000}
      )
      .toBe(false);
  } finally {
    try {
      fs.unlinkSync(orphanPath);
    } catch {
      /* already deleted */
    }
    fs.writeFileSync(pagePath, originalPage);
  }
});
