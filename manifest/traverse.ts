import fs from 'node:fs';
import path from 'node:path';
import {SOURCE_EXTENSIONS} from './config.ts';
import parseImports from './parseImports.ts';
import resolve from './resolve.ts';
import type {ModuleNode} from './types.ts';

const EXTENSIONS = new Set(SOURCE_EXTENSIONS);

function isJsOrTsFile(filePath: string): boolean {
  return EXTENSIONS.has(path.extname(filePath));
}

function isProjectFile(absolutePath: string): boolean {
  const normalized = path.normalize(absolutePath);
  return (
    normalized.includes(`${path.sep}src${path.sep}`) ||
    normalized.endsWith(`${path.sep}src`)
  );
}

export default async function traverse(entryPath: string): Promise<ModuleNode> {
  const visited = new Set<string>();

  async function visit(filePath: string, request: string): Promise<ModuleNode> {
    const normalized = path.normalize(filePath);
    if (visited.has(normalized)) {
      return {path: normalized, request, lines: 0, imports: []};
    }
    visited.add(normalized);

    if (!isProjectFile(normalized)) {
      return {path: normalized, request, lines: 0, imports: []};
    }

    let source: string;
    try {
      source = fs.readFileSync(normalized, 'utf-8');
    } catch {
      return {path: normalized, request, lines: 0, imports: []};
    }

    const lines = source.split('\n').length;

    let imports: Array<string>;
    try {
      imports = parseImports(source);
    } catch {
      imports = [];
    }
    const context = path.dirname(normalized);

    const resolved = await Promise.all(
      imports.map((req) => resolve(context, req))
    );

    const children = await Promise.all(
      imports.map((req, i) => {
        const resolvedPath = resolved[i];
        if (!resolvedPath || !isJsOrTsFile(resolvedPath))
          return Promise.resolve(null);
        return visit(resolvedPath, req);
      })
    );

    return {
      path: normalized,
      request,
      lines,
      imports: children.filter((c): c is ModuleNode => c !== null)
    };
  }

  return visit(entryPath, path.normalize(entryPath));
}
