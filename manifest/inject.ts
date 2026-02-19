import type { Manifest } from './types.ts';

const MARKER = '/* inject */';
const PATTERN = /\/\*\s*inject\s*\*\/\s*\{\s*\}/;

export default function inject(source: string, manifest: Manifest): string {
  const json = JSON.stringify(manifest);
  return source.replace(PATTERN, `${MARKER} ${json}`);
}
