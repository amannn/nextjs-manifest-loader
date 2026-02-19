import fs from 'node:fs';
import path from 'node:path';
import extractImports from './parse-imports.ts';
import resolve from './resolve.ts';
import type { ModuleEntry } from './types.ts';

function isProjectFile(absolutePath: string): boolean {
  const normalized = path.normalize(absolutePath);
  return normalized.includes(`${path.sep}src${path.sep}`) || normalized.endsWith(`${path.sep}src`);
}

export default async function traverse(
  entryPath: string,
  baseDir: string
): Promise<Set<ModuleEntry>> {
  const visited = new Set<string>();
  const modules = new Map<string, ModuleEntry>();

  async function visit(filePath: string, request: string): Promise<void> {
    const normalized = path.normalize(filePath);
    if (visited.has(normalized)) return;
    visited.add(normalized);

    if (!isProjectFile(normalized)) return;

    modules.set(normalized, { path: normalized, request });

    let source: string;
    try {
      source = fs.readFileSync(normalized, 'utf-8');
    } catch {
      return;
    }

    const imports = extractImports(source);
    const context = path.dirname(normalized);

    const resolved = await Promise.all(
      imports.map((req) => resolve(context, req))
    );

    await Promise.all(
      imports.map((req, i) => {
        const resolvedPath = resolved[i];
        if (!resolvedPath) return Promise.resolve();
        return visit(resolvedPath, req);
      })
    );
  }

  await visit(entryPath, path.relative(baseDir, entryPath) || path.basename(entryPath));

  return new Set(modules.values());
}
