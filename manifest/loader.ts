import type {LoaderContext} from 'webpack';
import traverse from './traverse.ts';
import inject from './inject.ts';
import type {ModuleNode} from './types.ts';

function collectPaths(node: ModuleNode): Array<string> {
  const paths = [node.path];
  for (const child of node.imports) {
    paths.push(...collectPaths(child));
  }
  return paths;
}

export default async function manifestLoader(
  this: LoaderContext<object>,
  source: string
): Promise<string | void> {
  const callback = this.async();

  // Early exit if marker not found
  if (!source.includes('/* inject */')) {
    callback(null, source);
    return;
  }

  const inputFile = this.resourcePath;

  try {
    const modules = await traverse(inputFile);
    const manifest = {modules: [modules]};

    for (const p of collectPaths(modules)) {
      this.addDependency(p);
    }

    const result = inject(source, manifest);
    callback(null, result);
  } catch (error) {
    callback(error as Error);
  }
}
