import path from 'node:path';
import EnhancedResolve from 'enhanced-resolve';
import {SOURCE_EXTENSIONS} from './config.ts';

const resolver = EnhancedResolve.create({
  extensions: SOURCE_EXTENSIONS
});

export default function resolve(
  context: string,
  request: string
): Promise<string | null> {
  return new Promise((done) => {
    resolver({}, context, request, {}, (err, res) => {
      if (err || typeof res !== 'string') {
        done(null);
        return;
      }
      done(path.normalize(res));
    });
  });
}
