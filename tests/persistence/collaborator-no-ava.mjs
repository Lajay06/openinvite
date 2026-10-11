/**
 * tests/persistence/collaborator-no-ava.mjs
 *
 * NO AVA IN A COLLABORATOR SESSION.
 *
 * Item 3 of goals/2026-10-10-collaborators-safe-and-truthful.md. Ava reads and
 * proposes changes to the signed-in person's OWN wedding. In someone else's
 * session she would answer about the wrong wedding, so in a collaborator
 * session there is no Ava button, the floating pod button is not rendered,
 * and Layout ignores the openAva event.
 *
 * ── AVABUTTON IS RENDERED, NOT GREPPED ─────────────────────────────────────
 *
 * The real AvaButton and the real CollaboratorProvider are bundled with
 * esbuild (it ships with Vite) and rendered with react-dom/server inside a
 * MemoryRouter: once at a URL carrying ?collabOwner=, once without. The
 * provider's context fetch is stubbed and never resolves, which does not
 * matter: the session is decided by the URL parameter, before any fetch.
 *
 * Layout is checked statically: it is the whole shell, and rendering it would
 * mean standing up the auth provider, React Query and every page import.
 *
 * The plant: AvaButton without its collaborator check turns the render red.
 * Proven by hand and recorded in the PR body.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

async function bundleAvaButton() {
  const esbuild = await import('esbuild');
  const entry = `
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import { MemoryRouter } from 'react-router-dom';
    import { CollaboratorProvider } from '@/lib/collaboratorContext';
    import AvaButton from '@/components/shared/AvaButton';
    export function render(url) {
      return renderToString(
        React.createElement(MemoryRouter, { initialEntries: [url] },
          React.createElement(CollaboratorProvider, null,
            React.createElement(AvaButton, { label: 'Ask Ava' }))));
    }
  `;
  const out = await esbuild.build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'jsx' },
    bundle: true, write: false, platform: 'node', format: 'esm',
    jsx: 'automatic', loader: { '.js': 'jsx' },
    alias: { '@': path.join(ROOT, 'src') },
    // Production React: the same render, without development warnings about
    // server rendering that say nothing about this guard.
    define: { 'process.env.NODE_ENV': '"production"' },
    // react-dom/server's Node build requires Node built-ins (stream, util),
    // which an ESM bundle can only reach through a real require.
    banner: { js: "import { createRequire as __oiCreateRequire } from 'module'; const require = __oiCreateRequire(import.meta.url);" },
    logLevel: 'silent',
  });
  // Written to a temp file rather than imported as a data: URL, so any stack
  // trace names a short path instead of printing the whole bundle.
  const file = path.join(os.tmpdir(), `oi-ava-button-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(file, out.outputFiles[0].text);
  try {
    const mod = await import(pathToFileURL(file).href);
    return mod.render;
  } finally {
    fs.rmSync(file, { force: true });
  }
}

export async function runCollaboratorNoAva() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── AvaButton, rendered ───────────────────────────────────────────────────
  console.log('\n  AvaButton renders nothing in a collaborator session:\n');
  const realFetch = globalThis.fetch;
  const priorStorage = globalThis.localStorage;
  globalThis.fetch = () => new Promise(() => {});
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  try {
    const render = await bundleAvaButton();
    const owner = render('/Guests');
    const collaborator = render('/Guests?collabOwner=owner-1');
    ok('outside a session the button renders', /<button[\s>]/.test(owner) && owner.includes('Ask Ava'), `${owner.length} chars`);
    ok('in a collaborator session it renders nothing', collaborator === '', JSON.stringify(collaborator.slice(0, 60)));
  } catch (err) {
    ok('AvaButton could be bundled and rendered', false, err.message.split('\n')[0]);
  } finally {
    globalThis.fetch = realFetch;
    if (priorStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = priorStorage;
  }

  // ── AvaButton reads the context ───────────────────────────────────────────
  const btn = stripComments(read('src/components/shared/AvaButton.jsx'), { trailing: true });
  ok('AvaButton reads the collaborator context and returns null with an owner',
     /useCollaboratorContext\(\)/.test(btn) && /if \(ownerUserId\) return null;/.test(btn), 'static');

  // ── Layout ignores openAva and drops the pod button ───────────────────────
  console.log('\n  Layout never opens Ava in a collaborator session:\n');
  const layout = stripComments(read('src/Layout.jsx'), { trailing: true });
  ok('the AVA_OPEN_EVENT listener returns early in a session',
     /const onOpen = \(e\) => \{\s*if \(collaboratingRef\.current\) return;/.test(layout), 'onOpen');
  ok('  and so does the second openAva listener',
     /const handler = \(\) => \{ if \(!collaboratingRef\.current\) setChatOpen\(true\); \};/.test(layout), 'handler');
  ok('  the ref tracks the session on every render',
     /collaboratingRef\.current = isCollaborating;/.test(layout), 'ref kept current');
  ok('the floating pod button and AvaChatPod are not rendered in a session',
     /\{!isCollaborating && \(\s*<div style=\{\{ position: 'fixed', bottom: 32, right: 32/.test(layout), 'gated');
  ok('nothing else in Layout opens the pod', (layout.match(/setChatOpen\(true\)/g) || []).length === 2, 'two setChatOpen(true), both gated');

  return results;
}
