import path from 'node:path';
import type { LoaderContext } from 'webpack';
import traverse from './traverse.ts';
import inject from './inject.ts';

type LoaderOptions = { base?: string };

export default async function manifestLoader(
  this: LoaderContext<LoaderOptions>,
  source: string
): Promise<string | void> {
  const callback = this.async();
  if (!callback) return source;

  if (!source.includes('/* inject */')) {
    callback(null, source);
    return;
  }

  const inputFile = this.resourcePath;
  const base = this.getOptions?.()?.base ?? process.cwd();

  try {
    const modules = await traverse(inputFile, base);
    const manifest = { modules: [...modules] };

    for (const m of modules) {
      this.addDependency(m.path);
    }

    const result = inject(source, manifest);
    callback(null, result);
  } catch (error) {
    callback(error as Error);
  }
}
