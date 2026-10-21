// Renders worksheet and answer key pages into #sheet
import { OP_DEFS } from './generator.js';

const PAGE_W = 794;   // A4 @96dpi
const PAGE_H = 1123;
const PAGE_PAD = 57;  // ~15mm
const HEAD_H = 64;

const sym = id => OP_DEFS.find(o => o.id === id).symbol;

const escapeHTML = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Column-major display when sort=column (each column = one op), else row-major
function posOf(i, gen, sort) {
  if (sort === 'column') return { col: Math.floor(i / gen.rows), row: i % gen.rows };
  return { row: Math.floor(i / gen.columns), col: i % gen.columns };
}

function gridHTML(gen, sort, state, key) {
  let html = '';
  gen.list.forEach((ex, i) => {
    const { col, row } = posOf(i, gen, sort);
    const text = key
      ? `${ex.a} ${sym(ex.op)} ${ex.b} = ${ex.r}`
      : `${ex.a} ${sym(ex.op)} ${ex.b} =`;
    const editable = (!key && state.editable !== false) ? ' contenteditable spellcheck="false"' : '';
    html += `<div class="cell" style="grid-column:${col + 1};grid-row:${row + 1}">` +
      `<span class="expr"${editable}>${escapeHTML(text)}</span></div>`;
  });
  return html;
}

function pageHTML(gen, state, key) {
  const avail = PAGE_H - 2 * PAGE_PAD - HEAD_H;
  const rowH = Math.max(20, Math.min(40, Math.floor(avail / gen.rows)));
  const head =
    `<header class="pgHead">
      <h2 class="pgTitle">${escapeHTML(state.title)}</h2>
      <div class="pgMeta">
        ${state.nameLine && !key ? '<span class="nameSlot">Név: <span class="nameGap"></span></span>' : ''}
        <span class="pgDate">Dátum: ${escapeHTML(fmtDate(state.date))}</span>
        ${key ? '<span class="keyTag">Megoldások</span>' : ''}
      </div>
    </header>`;
  const extra = key ? ' data-key="1"' : '';
  return `${head}<div class="wsGrid" style="grid-template-columns:repeat(${gen.columns},1fr);grid-auto-rows:${rowH}px">` +
    gridHTML(gen, state.sort, state, key) + '</div>';
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}. ${m}. ${d}.`;
}

export function renderSheet(root, state, gen) {
  root.innerHTML = '';
  let html = `<div class="page">${pageHTML(gen, state, false)}</div>`;
  if (state.answerKey) html += `<div class="page">${pageHTML(gen, state, true)}</div>`;
  root.innerHTML = html;
}
