// Turns the MDX docs into plain Markdown in dist/docs, so agents read the docs of the installed version offline.
import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('docs');
const target = path.resolve('dist/docs');
const { name, version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });

function readPage(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const data = Object.fromEntries(
    match[1].split('\n').map((line) => {
      const colon = line.indexOf(':');
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
  );
  const slug = path
    .relative(source, file)
    .replace(/\\/g, '/')
    .replace(/\.mdx$/, '');
  return {
    slug,
    title: data.title,
    description: data.description,
    nav: Number(data.nav),
    body: text.slice(match[0].length),
  };
}

const pages = walk(source)
  .filter((file) => file.endsWith('.mdx'))
  .map(readPage)
  .sort((a, b) => a.nav - b.nav);
const slugs = new Set(pages.map((page) => page.slug));

function rewriteLinks(line, page) {
  return line.replace(/\]\(\/([^)#\s]*)(#[^)\s]*)?\)/g, (_, slug, anchor = '') => {
    if (!slugs.has(slug)) throw new Error(`${page.slug}: broken link to /${slug}`);
    const relative = path.posix.relative(path.posix.dirname(page.slug), slug);
    return `](${relative}.md${anchor})`;
  });
}

function convert(page) {
  const out = [];
  let code = false;
  let level = 1;
  let tabsLevel = 0;
  let tabLabels = {};
  let inTabsList = false;
  let stepLevel = 0;
  let step = 0;

  for (const raw of page.body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) code = !code;
    if (code || line.startsWith('```')) {
      out.push(raw);
      continue;
    }

    const heading = /^(#{1,6}) /.exec(line);
    if (heading) level = heading[1].length;

    if (line === '<Tabs>' || line.startsWith('<Tabs ')) {
      tabsLevel = Math.min(level + 1, 6);
      tabLabels = {};
    } else if (line === '<TabsList>') {
      inTabsList = true;
    } else if (line === '</TabsList>') {
      inTabsList = false;
    } else if (inTabsList) {
      const trigger = /<TabsTrigger value="([^"]+)">(.*)<\/TabsTrigger>/.exec(line);
      if (!trigger) throw new Error(`${page.slug}: unexpected line in TabsList: ${line}`);
      tabLabels[trigger[1]] = trigger[2];
    } else if (line.startsWith('<TabsContent')) {
      const value = /value="([^"]+)"/.exec(line)?.[1];
      out.push(`${'#'.repeat(tabsLevel)} ${tabLabels[value] ?? value}`);
      level = tabsLevel;
    } else if (line === '</TabsContent>') {
      level = tabsLevel;
    } else if (line === '</Tabs>') {
      level = tabsLevel - 1;
    } else if (line === '<Steps>') {
      stepLevel = Math.min(level + 1, 6);
      step = 0;
    } else if (line === '</Steps>') {
      // The steps end where the next heading or tab takes over.
    } else if (line.startsWith('<Step>')) {
      const title = /^<Step>(.*)<\/Step>$/.exec(line)?.[1];
      out.push(`${'#'.repeat(stepLevel)} ${++step}. ${title}`);
    } else if (line === '<Intro>' || line === '</Intro>') {
      // The intro is a plain paragraph.
    } else if (/^<\/?[A-Z]/.test(line)) {
      throw new Error(`${page.slug}: no Markdown for ${line}`);
    } else {
      out.push(rewriteLinks(raw.startsWith('  ') && !raw.startsWith('    ') ? raw.trimStart() : raw, page));
    }
  }

  const body = out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `# ${page.title}\n\n${page.description}\n\n${body}\n`;
}

const sectionTitle = (dir) => (dir === 'api' ? 'API' : dir[0].toUpperCase() + dir.slice(1).replace(/-/g, ' '));

fs.rmSync(target, { recursive: true, force: true });
const sections = new Map();
for (const page of pages) {
  const file = path.join(target, `${page.slug}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, convert(page));
  const dir = page.slug.split('/')[0];
  if (!sections.has(dir)) sections.set(dir, []);
  sections.get(dir).push(page);
}

const index = [
  '# Klipp docs',
  '',
  `The docs of ${name} ${version}. Pages show the code for the core, three.js and React Three Fiber in sections of their own.`,
  ...[...sections].flatMap(([dir, sectionPages]) => [
    '',
    `## ${sectionTitle(dir)}`,
    '',
    ...sectionPages.map((page) => `- [${page.title}](${page.slug}.md): ${page.description}`),
  ]),
  '',
].join('\n');
fs.writeFileSync(path.join(target, 'index.md'), index);

// Kept short, since agents load it into context on every turn: the rules, then where each page is.
const agents = [
  '# Klipp',
  '',
  `Klipp's API is newer than your training data and changes before 1.0. Before writing camera code with \`${name}\`, read the pages of version ${version} listed below. Prefer retrieval-led reasoning over pre-training-led reasoning for any Klipp task.`,
  '',
  `- Entry points: \`${name}\` (core), \`${name}/three\`, \`${name}/react\` and \`${name}/dom\` (input).`,
  '- Angles are in degrees, `damping` and other times in seconds, and vectors in the core are `[x, y, z]` arrays.',
  '- One `VirtualCamera` per shot: the active one with the highest `priority` is on screen, and switching blends.',
  '- In React, `<Klipp>` goes inside `<Canvas>`. Elsewhere, call `klipp.setSize(width, height)` in CSS pixels and `klipp.update(dt)` every frame.',
  '- For a camera the user orbits, pans and zooms, use `KlippControls`.',
  '',
  '[Klipp docs index]|root: the folder of this file|index.md lists every page with a summary',
  ...[...sections].map(
    ([dir, sectionPages]) => `|${dir}:{${sectionPages.map((page) => `${page.slug.split('/')[1]}.md`).join(',')}}`,
  ),
  '',
].join('\n');
fs.writeFileSync(path.join(target, 'AGENTS.md'), agents);
