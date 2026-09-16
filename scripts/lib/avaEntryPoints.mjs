/**
 * scripts/lib/avaEntryPoints.mjs
 *
 * WHERE ASK AVA IS REACHABLE FROM — BY IMPORT GRAPH, NEVER BY TEXT PATTERN.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *
 * Twice in one run an enumeration written as a regex was narrower than the
 * thing it claimed to enumerate, and both times the guard built on it was
 * green over a surface it had never seen:
 *
 *   S8a  `.coupleNames` was matched by name, and the match was not followed to
 *        its source, so a second producer of the same field went unlisted.
 *   T3   six bare "Ask Ava" labels were reported as one. The pattern fitted
 *        `<AvaButton\n  label=…`; five of the six were written on a single
 *        line, and a single-line call is not a different feature.
 *
 * Owner ruling: **an enumeration is by import graph or by AST, never by a text
 * pattern of the call form.** A regex enumerates the call forms its author had
 * in mind. The import graph enumerates what the program actually contains, and
 * it cannot be evaded by writing the same call differently.
 *
 * ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
 *
 * It does not supply the guard's EXPECTATIONS. The list of pages is a fact
 * about the program and is read from the program; the title each page's modal
 * must carry, and the shape its label must take, are written in the guard by
 * hand. A guard that reads both from the file under test agrees with any
 * mistake in it. What the enumeration buys is that a page cannot be ADDED
 * without the guard noticing: an entry point with no expectation declared is a
 * failure that names the page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');

const PARSE_OPTS = { sourceType: 'module', plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'], errorRecovery: true };

function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** `@/x`, `./x`, `../x` -> an absolute file path, or null for a package. */
function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const tries = [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx'), path.join(base, 'index.js')];
  for (const t of tries) if (fs.existsSync(t) && fs.statSync(t).isFile()) return t;
  return null;
}

/** Every import in a file, as { source, resolved, names: Map(local -> imported) }. */
function importsOf(file, ast) {
  const list = [];
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const names = new Map();
    for (const s of node.specifiers) {
      if (s.type === 'ImportDefaultSpecifier') names.set(s.local.name, 'default');
      else if (s.type === 'ImportSpecifier') names.set(s.local.name, s.imported.name || s.imported.value);
      else if (s.type === 'ImportNamespaceSpecifier') names.set(s.local.name, '*');
    }
    list.push({ source: node.source.value, resolved: resolveImport(file, node.source.value), names });
  }
  return list;
}

/** Depth-first over every node of an AST. */
function eachNode(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) eachNode(n, fn); return; }
  if (typeof node.type === 'string') fn(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    eachNode(node[k], fn);
  }
}

const parsed = new Map();
function astOf(file) {
  if (!parsed.has(file)) parsed.set(file, parse(fs.readFileSync(file, 'utf8'), PARSE_OPTS));
  return parsed.get(file);
}

/** The literal value of a JSX attribute, or null when it is an expression. */
function attrLiteral(el, name) {
  for (const a of el.attributes || []) {
    if (a.type !== 'JSXAttribute' || a.name.name !== name) continue;
    if (a.value?.type === 'StringLiteral') return a.value.value;
    if (a.value?.type === 'JSXExpressionContainer' && a.value.expression.type === 'StringLiteral') return a.value.expression.value;
    return null;
  }
  return undefined;
}

const hasAttr = (el, name) => (el.attributes || []).some(a => a.type === 'JSXAttribute' && a.name.name === name);

const AVA_BUTTON = path.join(SRC, 'components/shared/AvaButton.jsx');
const AVA_MODAL = path.join(SRC, 'components/layout/AvaModal.jsx');
const AVA_OPEN = path.join(SRC, 'lib/avaOpen.js');

/**
 * Every module that reaches an Ava entry point, and how.
 *
 * `direct` — it imports AvaButton / AvaModal / openAva itself.
 * `via`    — it imports something that does (transitively).
 */
export function avaImporters() {
  const files = walkFiles(SRC);
  const edges = new Map();           // file -> Set(resolved import)
  for (const f of files) {
    const set = new Set();
    for (const imp of importsOf(f, astOf(f))) if (imp.resolved) set.add(imp.resolved);
    edges.set(f, set);
  }
  const roots = new Set([AVA_BUTTON, AVA_MODAL, AVA_OPEN]);
  const reaches = new Map();
  const seen = new Set();
  const visit = (f) => {
    if (reaches.has(f)) return reaches.get(f);
    if (seen.has(f)) return false;            // a cycle contributes nothing new
    seen.add(f);
    let hit = roots.has(f);
    for (const dep of edges.get(f) || []) if (visit(dep)) hit = true;
    reaches.set(f, hit);
    return hit;
  };
  for (const f of files) visit(f);
  return { files, edges, reaches };
}

/**
 * The page modules with an Ava entry point, each with what the AST says it
 * renders: the labels its AvaButton calls carry, the pageTitles its AvaModal
 * calls carry, and whether the button was given an onClick (which decides
 * whether it opens the page's modal or the Layout's pod).
 */
export function avaEntryPoints() {
  const { files, edges, reaches } = avaImporters();
  const routes = routeTable();
  const pages = [];

  // A PAGE CAN BE RENDERED BY ANOTHER PAGE, and then its Ask Ava button is
  // reached at the HOST's URL, not its own. /Calendar renders ScheduleHub,
  // which renders Calendar.jsx as a tab; /Checklist renders TasksHub, which
  // renders Checklist.jsx. Read from its own route alone, each of those two
  // looks unreachable — and a guard that skipped them would have skipped two
  // live Ask Ava buttons.
  const urlsFor = (file) => {
    const own = routes.get(path.basename(file).replace(/\.jsx?$/, '')) || [];
    const hosted = [];
    for (const [f, deps] of edges) {
      if (!f.startsWith(path.join(SRC, 'pages') + path.sep) || f === file) continue;
      if (!deps.has(file)) continue;
      hosted.push(...(routes.get(path.basename(f).replace(/\.jsx?$/, '')) || []));
    }
    return [...new Set([...own, ...hosted])];
  };

  for (const file of files) {
    if (!file.startsWith(path.join(SRC, 'pages') + path.sep)) continue;
    if (!reaches.get(file)) continue;

    const ast = astOf(file);
    const imports = importsOf(file, ast);
    // Local name -> which Ava thing it is, read from the import that bound it.
    const local = new Map();
    for (const imp of imports) {
      if (imp.resolved === AVA_BUTTON) for (const [l] of imp.names) local.set(l, 'button');
      if (imp.resolved === AVA_MODAL) for (const [l] of imp.names) local.set(l, 'modal');
      if (imp.resolved === AVA_OPEN) for (const [l] of imp.names) local.set(l, 'open');
    }

    const buttons = [];
    const modals = [];
    eachNode(ast, (n) => {
      if (n.type !== 'JSXOpeningElement' || n.name.type !== 'JSXIdentifier') return;
      const kind = local.get(n.name.name);
      if (kind === 'button') buttons.push({ label: attrLiteral(n, 'label'), hasOnClick: hasAttr(n, 'onClick'), line: n.loc?.start.line });
      if (kind === 'modal') modals.push({ pageTitle: attrLiteral(n, 'pageTitle'), hasBody: hasAttr(n, 'body'), line: n.loc?.start.line });
    });

    const name = path.basename(file).replace(/\.jsx?$/, '');
    pages.push({
      page: name,
      file: path.relative(ROOT, file),
      routes: urlsFor(file),
      buttons,
      modals,
      importsModal: [...local.values()].includes('modal'),
      importsButton: [...local.values()].includes('button'),
      callsOpenAva: [...local.values()].includes('open'),
    });
  }
  return pages.sort((a, b) => a.page.localeCompare(b.page));
}

const add = (map, key, value) => {
  if (!map.has(key)) map.set(key, []);
  if (!map.get(key).includes(value)) map.get(key).push(value);
};

/**
 * Page module name -> the URL a couple reaches it at.
 *
 * THREE SOURCES, AND ALL THREE ARE NEEDED. pages.config.js's PAGES map is
 * auto-registered by the platform at each key's literal PascalCase URL; App.jsx
 * excludes seven of those (AUTO_ROUTE_EXCLUDE) and declares its own kebab-case
 * route for them; and a handful of pages exist only as an explicit <Route>.
 * A table built from any one of the three is wrong about a third of the pages,
 * which is the same mistake in a different costume: reading one place and
 * calling it the enumeration.
 */
export function routeTable() {
  const app = path.join(SRC, 'App.jsx');
  const cfg = path.join(SRC, 'pages.config.js');
  const routes = new Map();

  // 1. Every key of pages.config's PAGES map gets an auto-route at /<Key>.
  const excluded = new Set();
  eachNode(astOf(app), (n) => {
    if (n.type !== 'VariableDeclarator' || n.id.name !== 'AUTO_ROUTE_EXCLUDE') return;
    eachNode(n.init, (m) => { if (m.type === 'StringLiteral') excluded.add(m.value); });
  });
  const cfgLocal = lazyLocals(cfg);
  eachNode(astOf(cfg), (n) => {
    if (n.type !== 'ObjectProperty') return;
    const key = n.key.type === 'StringLiteral' ? n.key.value : n.key.type === 'Identifier' ? n.key.name : null;
    if (!key || n.value.type !== 'Identifier') return;
    const mod = cfgLocal.get(n.value.name);
    if (!mod || excluded.has(key)) return;
    add(routes, mod, `/${key}`);
  });

  // 2. An explicit <Route path> in App.jsx wins over the auto-route.
  const appLocal = lazyLocals(app);
  eachNode(astOf(app), (n) => {
    if (n.type !== 'JSXElement' || n.openingElement.name.name !== 'Route') return;
    const p = attrLiteral(n.openingElement, 'path');
    if (!p || p.includes(':') || p === '*') return;
    let isRedirect = false;
    eachNode(n.openingElement.attributes, (m) => {
      if (m.type === 'JSXIdentifier' && m.name === 'Navigate') isRedirect = true;
    });
    if (isRedirect) return;
    eachNode(n.openingElement.attributes, (m) => {
      if (m.type !== 'JSXIdentifier') return;
      const mod = appLocal.get(m.name);
      if (mod) add(routes, mod, p);
    });
  });

  return routes;
}

/** local const name -> page module basename, for `const X = lazyWithReload(() => import('./pages/X'))`. */
function lazyLocals(file) {
  const out = new Map();
  eachNode(astOf(file), (n) => {
    if (n.type !== 'VariableDeclarator' || n.id.type !== 'Identifier') return;
    let mod = null;
    eachNode(n.init, (m) => {
      if (m.type === 'CallExpression' && m.callee.type === 'Import') {
        const arg = m.arguments?.[0];
        if (arg?.type === 'StringLiteral') mod = arg.value;
      }
    });
    if (mod) out.set(n.id.name, path.basename(mod));
  });
  return out;
}

/**
 * EVERY AvaButton AND AvaModal CALL SITE IN THE REPO — pages and components
 * alike. The per-page enumeration above answers "where can a couple reach
 * Ava"; this answers "what does every call of it say", which is the question a
 * label rule is about. One of the six bare labels this run lived in a
 * component, not a page, and a page-only sweep would have missed it again.
 */
export function avaCallSites() {
  const { files } = avaImporters();
  const buttons = [];
  const modals = [];
  for (const file of files) {
    const ast = astOf(file);
    const local = new Map();
    for (const imp of importsOf(file, ast)) {
      if (imp.resolved === AVA_BUTTON) for (const [l] of imp.names) local.set(l, 'button');
      if (imp.resolved === AVA_MODAL) for (const [l] of imp.names) local.set(l, 'modal');
    }
    if (!local.size) continue;
    const rel = path.relative(ROOT, file);
    eachNode(ast, (n) => {
      if (n.type !== 'JSXOpeningElement' || n.name.type !== 'JSXIdentifier') return;
      const kind = local.get(n.name.name);
      const at = { file: rel, line: n.loc?.start.line };
      if (kind === 'button') buttons.push({ ...at, label: attrLiteral(n, 'label') });
      if (kind === 'modal') modals.push({ ...at, pageTitle: attrLiteral(n, 'pageTitle'), hasBody: hasAttr(n, 'body') });
    });
  }
  return { buttons, modals };
}

/**
 * EVERY DIALOG IN THE REPO THAT CALLS ITSELF ASK AVA, other than the shell.
 *
 * Three existed when this was written: the five navy page dialogs, the vows
 * writer and the seating allocator. Each was a window of its own with its own
 * header, its own colour and its own close button, and each was reached from a
 * button saying Ask Ava. A structural check on the shell cannot see them —
 * they are not the shell — so the only way to keep one shell is to ask the
 * whole repo who else is holding one.
 */
export function rivalAvaDialogs() {
  const { files } = avaImporters();
  const found = [];
  for (const file of files) {
    if (file === AVA_MODAL) continue;                      // the shell itself
    const ast = astOf(file);
    const local = new Set();
    for (const imp of importsOf(file, ast)) {
      if (imp.resolved !== path.join(SRC, 'components/ui/dialog.jsx')) continue;
      for (const [l, imported] of imp.names) if (imported === 'DialogContent') local.add(l);
    }
    if (!local.size) continue;
    eachNode(ast, (n) => {
      if (n.type !== 'JSXOpeningElement' || !local.has(n.name.name)) return;
      const title = attrLiteral(n, 'title');
      if (typeof title === 'string' && /ask ava/i.test(title)) {
        found.push({ file: path.relative(ROOT, file), line: n.loc?.start.line, title });
      }
    });
  }
  return found;
}
