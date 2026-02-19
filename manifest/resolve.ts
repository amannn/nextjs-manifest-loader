import path from 'node:path';
import enhancedResolve from 'enhanced-resolve';

const resolver = enhancedResolve.create({
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  mainFields: ['module', 'main'],
});

export default function resolve(context: string, request: string): Promise<string | null> {
  return new Promise((done) => {
    resolver({}, context, request, {}, (err: Error | null, result?: string) => {
      if (err || !result) {
        done(null);
        return;
      }
      done(path.normalize(result));
    });
  });
}
