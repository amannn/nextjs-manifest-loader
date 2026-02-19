import fs from 'node:fs';
import path from 'node:path';
import extractImports from './parse-imports.ts';
import resolve from './resolve.ts';
import type { ModuleNode } from './types.ts';

function isProjectFile(absolutePath: string): boolean {
  const normalized = path.normalize(absolutePath);
  return normalized.includes(`${path.sep}src${path.sep}`) || normalized.endsWith(`${path.sep}src`);
}

export default async function traverse(
  entryPath: string,
  baseDir: string
): Promise<ModuleNode> {
  const visited = new Set<string>();

  async function visit(filePath: string, request: string): Promise<ModuleNode> {
    const normalized = path.normalize(filePath);
    if (visited.has(normalized)) {
      return { path: normalized, request, imports: [] };
    }
    visited.add(normalized);

    if (!isProjectFile(normalized)) {
      return { path: normalized, request, imports: [] };
    }

    let source: string;
    try {
      source = fs.readFileSync(normalized, 'utf-8');
    } catch {
      return { path: normalized, request, imports: [] };
    }

    const imports = extractImports(source);
    const context = path.dirname(normalized);

    const resolved = await Promise.all(
      imports.map((req) => resolve(context, req))
    );

    const children = await Promise.all(
      imports.map((req, i) => {
        const resolvedPath = resolved[i];
        if (!resolvedPath) return Promise.resolve(null);
        return visit(resolvedPath, req);
      })
    );

    return {
      path: normalized,
      request,
      imports: children.filter((c): c is ModuleNode => c !== null),
    };
  }

  const entryRequest =
    path.relative(baseDir, entryPath) || path.basename(entryPath);
  return visit(entryPath, entryRequest);
}
