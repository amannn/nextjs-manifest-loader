import MagicString from 'magic-string';
import type {Manifest} from './types.ts';

const PATTERN = /\/\*\s*inject\s*\*\/\s*\{\s*\}/;

export type InjectResult = {
  code: string;
  map: string | undefined;
};

export default function inject(
  source: string,
  manifest: Manifest,
  filename?: string
): InjectResult {
  const match = source.match(PATTERN);
  if (!match) return {code: source, map: undefined};

  const magic = new MagicString(source);
  const json = JSON.stringify(manifest);
  magic.overwrite(
    match.index!,
    match.index! + match[0].length,
    `/* inject */ ${json}`
  );

  return {
    code: magic.toString(),
    map: magic.generateMap({source: filename, hires: 'boundary'}).toString()
  };
}
