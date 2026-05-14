#!/usr/bin/env node
/**
 * lp-inline-edit.js
 *
 * Serves a vFairs landing-page HTML mockup with inline editing.
 * Edits every heading, sub-head, bullet, card, and chip on click.
 * Hits Save (or Cmd/Ctrl+S) to write changes back to the HTML file.
 *
 * Usage:
 *   node lp-inline-edit.js <slug-or-path>
 *
 * Examples:
 *   node lp-inline-edit.js event-ticketing-software-new
 *   node lp-inline-edit.js outputs/landing-page-rewrites/event-registration-software-new.html
 *
 * Env:
 *   LP_EDIT_PORT — override default 3030
 *
 * Works on any HTML file built with the vFairs website-style-guide.md tokens
 * (TT Norms Pro + coral→orange gradient). No template re-render: the HTML
 * file is the source of truth, edits write directly back to it. A .bak is
 * created on first save so original copy is never lost.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const PORT = parseInt(process.env.LP_EDIT_PORT, 10) || 3030;
const REWRITES_DIR = path.resolve(__dirname, '..', '..', '..', 'outputs', 'landing-page-rewrites');

function resolveHtmlPath(arg) {
  if (!arg) {
    console.error('Usage: node lp-inline-edit.js <slug-or-path>');
    process.exit(1);
  }
  if (arg.endsWith('.html') && fs.existsSync(arg)) return path.resolve(arg);
  const slugPath = path.join(REWRITES_DIR, arg.replace(/\.html$/, '') + '.html');
  if (fs.existsSync(slugPath)) return slugPath;
  console.error(`HTML not found: tried "${arg}" and "${slugPath}"`);
  process.exit(1);
}

const htmlPath = resolveHtmlPath(process.argv[2]);
const slug = path.basename(htmlPath, '.html');
const htmlDir = path.dirname(htmlPath);

// CSS selectors that should become contenteditable.
// Order matters only for documentation; the edit-mode JS scans all of them.
const EDITABLE_SELECTORS = [
  'h1', 'h2', 'h3', 'h4',
  '.eyebrow',
  '.lede',
  '.hero p.subhead',
  '.section-head > p',
  '.section-title > p',
  '.diff-card > p',
  '.card > p',
  '.faq-q',
  '.faq-a',
  'ul.bullets > li',
  '.chip',
  '.final-cta p',
  '.chip-label'
].join(', ');

const EDIT_SCRIPT = `
<style id="lp-edit-css">
  #lp-edit-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    display: flex; align-items: center; gap: 14px;
    padding: 10px 24px; background: #1f2230; color: white;
    font-family: "TT Norms Pro", -apple-system, sans-serif; font-size: 14px;
    box-shadow: 0 2px 18px rgba(0,0,0,.18);
  }
  #lp-edit-bar .brand { font-weight: 700; letter-spacing: -0.01em; }
  #lp-edit-bar .brand .gradient {
    background: linear-gradient(135deg, #ED4F75 0%, #F4793A 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  #lp-edit-bar .meta { color: rgba(255,255,255,.6); font-size: 13px; }
  #lp-edit-bar .spacer { flex: 1; }
  #lp-edit-bar button {
    font-family: inherit; font-size: 13px; font-weight: 600;
    padding: 8px 14px; border-radius: 8px; border: 1px solid transparent;
    cursor: pointer;
  }
  #lp-edit-bar .btn-save {
    background: linear-gradient(135deg, #ED4F75 0%, #F4793A 100%);
    color: white;
  }
  #lp-edit-bar .btn-save:hover { filter: brightness(1.08); }
  #lp-edit-bar .btn-save[disabled] { opacity: 0.4; cursor: not-allowed; filter: none; }
  #lp-edit-bar .btn-ghost {
    background: transparent; color: rgba(255,255,255,.85);
    border-color: rgba(255,255,255,.2);
  }
  #lp-edit-bar .btn-ghost:hover { background: rgba(255,255,255,.08); }
  #lp-edit-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
    background: #1f2230; color: white; padding: 10px 18px; border-radius: 10px;
    font-family: "TT Norms Pro", sans-serif; font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 28px rgba(0,0,0,.22); opacity: 0; pointer-events: none;
    transition: opacity .18s ease, transform .18s ease; z-index: 10000;
  }
  #lp-edit-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  #lp-edit-toast.error { background: #b91c1c; }

  body.lp-edit-on { padding-top: 52px !important; }
  body.lp-edit-on header.nav { top: 52px !important; }

  body.lp-edit-on [data-lp-edit] {
    outline: 1px dashed transparent;
    outline-offset: 4px;
    transition: outline-color .12s ease, background-color .12s ease;
    border-radius: 4px;
  }
  body.lp-edit-on [data-lp-edit]:hover {
    outline-color: rgba(244,121,58,.45);
    background-color: rgba(255,241,236,.55);
  }
  body.lp-edit-on [data-lp-edit]:focus {
    outline: 2px solid #F4793A;
    outline-offset: 4px;
    background-color: rgba(255,241,236,.85);
  }
  body.lp-edit-on [data-lp-edit].lp-dirty {
    box-shadow: inset 3px 0 0 #F4793A;
    background-color: rgba(255,241,236,.65);
  }
</style>

<div id="lp-edit-bar" hidden>
  <span class="brand">v<span class="gradient">Fairs</span> &nbsp;·&nbsp; inline editor</span>
  <span class="meta" id="lp-edit-meta">__SLUG__</span>
  <span class="spacer"></span>
  <span class="meta"><span id="lp-edit-count">0</span> edits</span>
  <button class="btn-ghost" id="lp-edit-reset" type="button">Reset</button>
  <button class="btn-save" id="lp-edit-save" type="button" disabled>Save</button>
</div>
<div id="lp-edit-toast"></div>

<script>
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('edit') !== '1') return;

  const EDIT_SELECTOR = ${JSON.stringify(EDITABLE_SELECTORS)};
  const bar = document.getElementById('lp-edit-bar');
  const countEl = document.getElementById('lp-edit-count');
  const saveBtn = document.getElementById('lp-edit-save');
  const resetBtn = document.getElementById('lp-edit-reset');
  const toast = document.getElementById('lp-edit-toast');
  bar.hidden = false;
  document.body.classList.add('lp-edit-on');

  const originals = new WeakMap();

  function showToast(msg, isError) {
    toast.textContent = msg;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function markDirty(el) {
    if (!originals.has(el)) return;
    const isDirty = el.innerHTML.trim() !== originals.get(el);
    el.classList.toggle('lp-dirty', isDirty);
    refreshCount();
  }

  function refreshCount() {
    const dirty = document.querySelectorAll('[data-lp-edit].lp-dirty').length;
    countEl.textContent = dirty;
    saveBtn.disabled = dirty === 0;
  }

  function activate() {
    document.querySelectorAll(EDIT_SELECTOR).forEach((el) => {
      // Skip elements that are inside the edit bar itself.
      if (el.closest('#lp-edit-bar')) return;
      if (el.dataset.lpEdit === '1') return;
      el.dataset.lpEdit = '1';
      el.setAttribute('contenteditable', 'plaintext-only');
      el.spellcheck = false;
      originals.set(el, el.innerHTML.trim());
      el.addEventListener('input', () => markDirty(el));
      // Prevent line breaks in chips/eyebrows.
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (el.classList.contains('chip') || el.classList.contains('eyebrow') || el.classList.contains('chip-label'))) {
          e.preventDefault();
        }
      });
    });
  }

  function resetAll() {
    document.querySelectorAll('[data-lp-edit].lp-dirty').forEach((el) => {
      el.innerHTML = originals.get(el);
      el.classList.remove('lp-dirty');
    });
    refreshCount();
    showToast('Reverted unsaved edits');
  }

  async function save() {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      // Strip edit infrastructure before serializing so it doesn't get baked into the file.
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('[data-lp-edit]').forEach((el) => {
        el.removeAttribute('data-lp-edit');
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
        el.classList.remove('lp-dirty');
      });
      clone.querySelectorAll('#lp-edit-bar, #lp-edit-toast, #lp-edit-css, #lp-edit-runtime').forEach((n) => n.remove());
      clone.querySelector('body')?.classList.remove('lp-edit-on');
      const html = '<!doctype html>\\n' + clone.outerHTML;
      const res = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'text/html' },
        body: html
      });
      if (!res.ok) throw new Error('Save failed: ' + res.status);
      // Update originals so the dirty markers go away.
      document.querySelectorAll('[data-lp-edit]').forEach((el) => {
        originals.set(el, el.innerHTML.trim());
        el.classList.remove('lp-dirty');
      });
      refreshCount();
      showToast('Saved to disk');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Save failed', true);
    } finally {
      saveBtn.textContent = 'Save';
      refreshCount();
    }
  }

  saveBtn.addEventListener('click', save);
  resetBtn.addEventListener('click', resetAll);
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (document.querySelectorAll('[data-lp-edit].lp-dirty').length > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  activate();
})();
</script>
`.trim();

function injectEditMode(html) {
  const tag = '<script id="lp-edit-runtime">';
  const rendered = EDIT_SCRIPT.replace('__SLUG__', slug).replace('<script>', tag);
  if (html.includes('</body>')) {
    return html.replace('</body>', rendered + '\n</body>');
  }
  return html + rendered;
}

function readHtml() {
  return fs.readFileSync(htmlPath, 'utf8');
}

function writeHtml(content) {
  const backupPath = htmlPath + '.bak';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(htmlPath, backupPath);
  }
  // Strip the edit-mode infrastructure if the saved payload still contains it.
  let clean = content;
  clean = clean.replace(/<style id="lp-edit-css"[\s\S]*?<\/style>\s*/i, '');
  clean = clean.replace(/<div id="lp-edit-bar"[\s\S]*?<\/div>\s*/i, '');
  clean = clean.replace(/<div id="lp-edit-toast"[\s\S]*?<\/div>\s*/i, '');
  clean = clean.replace(/<script id="lp-edit-runtime"[\s\S]*?<\/script>\s*/i, '');
  fs.writeFileSync(htmlPath, clean);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
      const html = injectEditMode(readHtml());
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (req.method === 'POST' && req.url === '/save') {
      const body = await readBody(req);
      writeHtml(body);
      console.log(`[${new Date().toISOString()}] Saved ${path.basename(htmlPath)} (${body.length} bytes)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    // Serve asset files (logo, fonts, etc.) relative to the HTML's folder.
    if (req.method === 'GET') {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const safe = path.normalize(urlPath).replace(/^[/\\]+/, '');
      const filePath = path.join(htmlDir, safe);
      if (filePath.startsWith(htmlDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.woff2': 'font/woff2',
          '.woff': 'font/woff',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error: ' + err.message);
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/?edit=1`;
  console.log(`\nvFairs inline editor — ${slug}`);
  console.log(`  File:  ${htmlPath}`);
  console.log(`  URL:   ${url}`);
  console.log(`  Stop:  Ctrl+C\n`);
  // Auto-open in default browser (mac).
  exec(`open "${url}"`, (err) => {
    if (err) console.log('(Open manually — auto-open failed)');
  });
});
