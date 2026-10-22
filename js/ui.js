// UI wiring: panel <-> state, regenerate, render, print scaling
import { OP_DEFS, defaultState, generate, genOne } from './generator.js';
import { renderSheet } from './render.js';

const LS_KEY = 'matek100-settings';

function loadState() {
  const d = defaultState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const out = { ...d, ...p };
      out.ops = { ...d.ops, ...(p.ops || {}) };
      out.ranges = {};
      for (const k of Object.keys(d.ranges)) out.ranges[k] = { ...d.ranges[k], ...((p.ranges && p.ranges[k]) || {}) };
      out.tables = {};
      for (const k of Object.keys(d.tables)) out.tables[k] = { ...d.tables[k], ...((p.tables && p.tables[k]) || {}) };
      out.nameLine = true; // deprecated setting, always on now
      return out;
    }
  } catch { /* corrupt or unavailable storage -> defaults */ }
  return d;
}

const s = loadState();

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* private mode etc. */ }
}

const $ = id => document.getElementById(id);
const panel = $('panel');
const sheet = $('sheet');
const sheetWrap = $('sheetWrap');
const area = $('sheetArea');

// ---- build operation checkboxes + range fields dynamically ----
const opsBox = $('ops');
const rangesBox = $('ranges');
const fieldsets = {};

for (const o of OP_DEFS) {
  const fs = document.createElement('fieldset');
  fs.className = 'opFs';
  if (s.tables[o.id]) {
    // mult/div: row of table checkboxes 2..10
    const t = s.tables[o.id];
    fs.innerHTML =
      `<legend><span>${o.label} sz.">*</span></legend>
       <div class="tblRow">` +
      Object.keys(t).map(n =>
        `<label class="tbl"><input type="checkbox" data-tbl="${o.id}" data-n="${n}"${t[n] ? ' checked' : ''}>${n}</label>`
      ).join('') + '</div>';
    fs.title = 'Sz. = szorzótábla — x: egyik tényező a kijelölt szorzótábla számain közül (max. 10); : : az osztandó a kijelölt szorzótáblák szorzataiból (max. 100)';
  } else {
    const rg = s.ranges[o.id];
    fs.innerHTML =
      `<legend><span>${o.label}</span></legend>
       <div class="rgGrid">
         <label>Tagok</label><input type="number" data-rg="${o.id}" data-k="opMin" value="${rg.opMin}">
         <input type="number" data-rg="${o.id}" data-k="opMax" value="${rg.opMax}">
         <label>Eredmény</label><input type="number" data-rg="${o.id}" data-k="resMin" value="${rg.resMin}">
         <input type="number" data-rg="${o.id}" data-k="resMax" value="${rg.resMax}">
       </div>`;
  }
  rangesBox.appendChild(fs);
  fieldsets[o.id] = fs;
}
opsBox.innerHTML = OP_DEFS.map(o =>
  `<label class="opChip"><input type="checkbox" data-opchk="${o.id}"${s.ops[o.id] ? ' checked' : ''}> ${o.symbol} ${o.label}</label>`
).join('');

// ---- regenerate + render ----
let lastGen = null;

function run() {
  s.rows = Math.max(1, Math.ceil(s.count / s.columns));
  $('rows').value = s.rows;
  lastGen = generate(s);
  renderSheet(sheet, s, lastGen);
  fit();
  save();
}

// Click a worksheet exercise -> replace with a new one of the same type (unique)
sheet.addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (!cell || lastGen === null) return;
  const page = cell.closest('.page');
  if (!page || page.dataset.key) return;

  const idx = +cell.dataset.idx;
  const op = lastGen.list[idx]?.op;
  if (!op) return;

  const used = new Set(lastGen.list.map(ex => ex.key).filter((_, i) => i !== idx));
  const next = genOne(op, s, used);
  if (!next) return;
  lastGen.list[idx] = next;
  renderSheet(sheet, s, lastGen);
  fit();
});

function fit() {
  const avail = area.clientWidth - 32;
  const sc = Math.min(1, avail / 794);
  sheet.style.transform = `scale(${sc})`;
  sheetWrap.style.width = 794 * sc + 'px';
  sheetWrap.style.height = sheet.scrollHeight * sc + 'px';
}
window.addEventListener('resize', fit);

// ---- generation-affecting inputs ----
$('count').addEventListener('input', e => {
  s.count = Math.max(1, Math.round(+e.target.value || 1));
  run();
});
$('columns').addEventListener('input', e => {
  s.columns = Math.max(1, Math.min(10, Math.round(+e.target.value || 1)));
  run();
});
$('rows').addEventListener('input', e => {
  const rows = Math.max(1, Math.round(+e.target.value || 1));
  s.count = s.columns * rows;
  $('count').value = s.count;
  run();
});
$('sort').addEventListener('change', e => { s.sort = e.target.value; run(); });

for (const el of opsBox.querySelectorAll('[data-opchk]')) {
  el.addEventListener('change', () => {
    s.ops[el.dataset.opchk] = el.checked;
    fieldsets[el.dataset.opchk].classList.toggle('off', !el.checked);
    run();
  });
}
for (const el of rangesBox.querySelectorAll('input[data-rg]')) {
  el.addEventListener('input', () => {
    s.ranges[el.dataset.rg][el.dataset.k] = Math.round(+el.value || 0);
    run();
  });
}
for (const el of rangesBox.querySelectorAll('input[data-tbl]')) {
  el.addEventListener('change', () => {
    s.tables[el.dataset.tbl][+el.dataset.n] = el.checked;
    run();
  });
}

$('allowNeg').addEventListener('change', e => { s.allowNegative = e.target.checked; run(); });
$('answerKey').addEventListener('change', e => { s.answerKey = e.target.checked; run(); });

// display-only inputs
$('title').addEventListener('input', e => { s.title = e.target.value; run(); });
$('date').addEventListener('change', e => { s.date = e.target.value; run(); });

// title editable directly on the worksheet page
sheet.addEventListener('focusout', e => {
  const t = e.target.closest?.('.pgTitle');
  if (!t || t.closest('.page')?.dataset.key) return;
  const val = t.textContent.trim();
  if (val === s.title) return;
  s.title = val;
  $('title').value = val;
  run();
});

// font size (no rerender needed; CSS variable)
function applyFont() {
  $('fsVal').textContent = s.fontSize;
  sheet.style.setProperty('--fs', s.fontSize + 'px');
}
function stepFont(d) {
  s.fontSize = Math.max(8, Math.min(26, s.fontSize + d));
  applyFont();
  run(); // row heights depend on font size
}
$('fsMinus').addEventListener('click', () => stepFont(-1));
$('fsPlus').addEventListener('click', () => stepFont(1));

// reset: clear saved settings, reload with defaults
$('resetBtn').addEventListener('click', () => {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  location.reload();
});

// ---- buttons ----
$('regen').addEventListener('click', run);
$('printBtn').addEventListener('click', () => window.print());

// ---- init ----
// restore panel from loaded state
$('count').value = s.count;
$('columns').value = s.columns;
$('sort').value = s.sort;
$('allowNeg').checked = s.allowNegative;
$('answerKey').checked = s.answerKey;
$('title').value = s.title;
$('date').value = s.date;
for (const el of opsBox.querySelectorAll('[data-opchk]')) {
  fieldsets[el.dataset.opchk].classList.toggle('off', !el.checked);
}
applyFont();
run();
