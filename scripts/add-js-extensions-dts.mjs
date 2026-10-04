// tsc keeps import paths as written, so declarations import './follow'. Node-style resolution needs './follow.js'.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });

for (const file of walk(root).filter((f) => f.endsWith('.d.ts'))) {
  const dir = path.dirname(file);
  const original = fs.readFileSync(file, 'utf8');
  const fixed = original.replace(/(from\s+['"]|import\(['"])(\.\.?(?:\/[^'"]*)?)(['"])/g, (match, pre, spec, post) => {
    if (fs.existsSync(path.join(dir, `${spec}.d.ts`))) return `${pre}${spec}.js${post}`;
    if (fs.existsSync(path.join(dir, spec, 'index.d.ts'))) return `${pre}${spec}/index.js${post}`;
    return match;
  });
  if (fixed !== original) fs.writeFileSync(file, fixed);
}
