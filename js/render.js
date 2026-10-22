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
    // column-aligned layout: centered operand slots, fixed-width sign, fixed-width equals+answer
    const lhs = `<span class="oA">${escapeHTML(String(ex.a))}</span>` +
      `<span class="os">${sym(ex.op)}</span>` +
      `<span class="oB">${escapeHTML(String(ex.b))}</span>`;
    // fixed-width equals + answer block -> '=' aligns across a column
    const tail = key
      ? `<span class="eq">=</span><span class="res">${ex.r}</span>`
      : `<span class="eq">=</span><span class="gap"></span>`;
    const live = key ? '' : ' live';
    html += `<div class="cell" data-idx="${i}" style="grid-column:${col + 1};grid-row:${row + 1}">` +
      `<span class="expr${live}" title="${key ? '' : 'Kattintás: új feladat, azonos típus'}">` +
      `<span class="lhs">${lhs}</span>${tail}</span></div>`;
  });
  return html;
}

function pageHTML(gen, state, key) {
  const avail = PAGE_H - 2 * PAGE_PAD - HEAD_H;
  const rowH = Math.max(state.fontSize + 8, Math.min(56, Math.floor(avail / gen.rows)));
  const head =
    `<header class="pgHead">
      <h2 class="pgTitle"${key ? '' : ' contenteditable spellcheck="false" title="Kattintás: cím szerkesztése"'}>${escapeHTML(state.title)}</h2>
      <div class="pgMeta">
        ${state.nameLine && !key ? '<span class="nameSlot">Név: <span class="nameGap"></span></span>' : ''}
        <span class="pgDate">Dátum: ${escapeHTML(fmtDate(state.date))}</span>
        ${key ? '<span class="keyTag">Megoldások</span>' : ''}
      </div>
    </header>`;
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
