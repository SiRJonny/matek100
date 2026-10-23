// Renders worksheet and answer key pages into #sheet
import { OP_DEFS } from './generator.js';

const PAGE_W = 794;   // A4 @96dpi
const PAGE_H = 1123;
const PAGE_PAD = 57;  // ~15mm
const HEAD_H = 64;
const HEAD_GAP = 14; // empty line after the title row

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

// Slot widths from setting worst cases + measured font metrics (em units -> font scales them)
function slotDims(state) {
  const M = state.metrics || { dig: 0.556, sign: 0.5, eq: 0.35 };
  const digitsOf = n => String(Math.abs(Math.round(n))).length;
  const enabled = OP_DEFS.filter(o => state.ops[o.id]).map(o => o.id);
  let dA = 0, dR = 0, signedResult = false;
  for (const op of enabled) {
    if (op === 'mult' || op === 'div') {
      const T = Object.keys(state.tables[op]).filter(k => state.tables[op][k]).map(Number);
      if (!T.length) continue;
      const maxT = Math.max(...T);
      dA = Math.max(dA, op === 'mult' ? digitsOf(maxT) : digitsOf(10 * maxT));
      dR = Math.max(dR, op === 'mult' ? digitsOf(maxT * 10) : 2);
    } else {
      const rg = state.ranges[op];
      if (!rg) continue;
      const omax = Math.max(Math.abs(rg.opMin), Math.abs(rg.opMax));
      dA = Math.max(dA, digitsOf(omax));
      dR = Math.max(dR, digitsOf(rg.resMax));
      if (op === 'minus') {
        const omin = Math.min(Math.abs(rg.opMin), Math.abs(rg.opMax));
        const omx = Math.max(Math.abs(rg.opMin), Math.abs(rg.opMax));
        if (state.allowNegative && omin < omx) signedResult = true;
      }
    }
  }
  return { M, dA, dR, signedResult };
}

export { slotDims };
function slotVars(state) {
  const { M, dA, dR, signedResult } = slotDims(state);
  return `--slotA:${(dA * M.dig).toFixed(3)}em;` +
    `--slotS:${(M.sign).toFixed(3)}em;` +       // +4px gaps set in CSS calc
    `--slotE:${(M.eq).toFixed(3)}em;` +         // +4px padding in CSS calc
    `--slotR:${((dR + (signedResult ? 1 : 0) + 2) * M.dig).toFixed(3)}em`; // +2 handwritten slack units
}

function pageHTML(gen, state, key) {
  const avail = PAGE_H - 2 * PAGE_PAD - HEAD_H - HEAD_GAP;
  // font-size independent: CSS takes max(--rowBase, font height) at runtime,
  // capped by --rowFit so rows*height never exceeds the A4 body height
  const rowBase = Math.min(56, Math.floor(avail / gen.rows));
  const rowFit = Math.floor(avail / gen.rows);
  const head =
    `<header class="pgHead pgHeadRow">
      <h2 class="pgTitle"${key ? '' : ' contenteditable spellcheck="false" title="Kattintás: cím szerkesztése"'}>${escapeHTML(state.title)}</h2>
      <div class="pgMeta pgMetaTop">
        ${!key && state.nameLine ? '<span class="nameSlot">Név: <span class="nameGap"></span></span>' : ''}
        <span class="pgDate">Dátum: ${escapeHTML(fmtDate(state.date))}</span>
        ${key ? '<span class="keyTag">Megoldások</span>' : ''}
      </div>
    </header>`;
  const slots = slotVars(state);
  return `${head}<div class="wsGrid" style="grid-template-columns:repeat(${gen.columns},1fr);--rowBase:${rowBase};--rowFit:${rowFit}px;${slots}">` +
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
  if (state.answerKey) html += `<div class="page" data-key="1">${pageHTML(gen, state, true)}</div>`;
  root.innerHTML = html;
}
