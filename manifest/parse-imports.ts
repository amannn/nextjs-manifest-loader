import { parseSync } from '@swc/core';

export default function extractImports(source: string): Array<string> {
  const ast = parseSync(source, {
    syntax: 'typescript',
    tsx: true,
  });
  const specifiers: Array<string> = [];
  for (const stmt of ast.body) {
    if (stmt.type === 'ImportDeclaration') {
      if ('typeOnly' in stmt && stmt.typeOnly) continue;
      const src = stmt.source?.value;
      if (typeof src === 'string') specifiers.push(src);
    }
  }
  return specifiers;
}
