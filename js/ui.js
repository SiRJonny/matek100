// UI wiring: panel <-> state, regenerate, render, print scaling
import { OP_DEFS, defaultState, generate } from './generator.js';
import { renderSheet } from './render.js';

const s = defaultState();

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
  const rg = s.ranges[o.id];
  const fs = document.createElement('fieldset');
  fs.className = 'opFs';
  fs.innerHTML =
    `<legend><span>${o.label}</span></legend>
     <div class="rgGrid">
       <label>Operand. min</label><input type="number" data-rg="${o.id}" data-k="opMin" value="${rg.opMin}">
       <label>Operand. max</label><input type="number" data-rg="${o.id}" data-k="opMax" value="${rg.opMax}">
       <label>Eredmény min</label><input type="number" data-rg="${o.id}" data-k="resMin" value="${rg.resMin}">
       <label>Eredmény max</label><input type="number" data-rg="${o.id}" data-k="resMax" value="${rg.resMax}">
     </div>`;
  rangesBox.appendChild(fs);
  fieldsets[o.id] = fs;
}
opsBox.innerHTML = OP_DEFS.map(o =>
  `<label class="opChip"><input type="checkbox" data-opchk="${o.id}" checked> ${o.symbol} ${o.label}</label>`
).join('');

// ---- regenerate + render ----
function run() {
  s.rows = Math.max(1, Math.ceil(s.count / s.columns));
  $('rows').value = s.rows;
  const gen = generate(s);
  renderSheet(sheet, s, gen);
  fit();
}

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

$('allowNeg').addEventListener('change', e => { s.allowNegative = e.target.checked; run(); });
$('answerKey').addEventListener('change', e => { s.answerKey = e.target.checked; run(); });
$('nameLine').addEventListener('change', e => { s.nameLine = e.target.checked; run(); });

// display-only inputs
$('title').addEventListener('input', e => { s.title = e.target.value; run(); });
$('date').addEventListener('change', e => { s.date = e.target.value; run(); });

// ---- buttons ----
$('regen').addEventListener('click', run);
$('printBtn').addEventListener('click', () => window.print());

// ---- init ----
$('date').value = s.date;
run();
