// Exercise generator for Matek 100
export const OP_DEFS = [
  { id: 'plus',  symbol: '+', label: 'Összeadás', rangeLabel: 'Tagok' },
  { id: 'minus', symbol: '−', label: 'Kivonás',   rangeLabel: 'Tagok' },
  { id: 'mult',  symbol: '·', label: 'Szorzás',   rangeLabel: 'Operandus' },
  { id: 'div',   symbol: ':', label: 'Osztás',    rangeLabel: 'Operandus' },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function defaultState() {
  return {
    count: 100,
    ops: { plus: true, minus: true, mult: true, div: true },
    columns: 4,
    rows: 25,
    sort: 'random', // 'random' | 'column'
    ranges: {
      plus:  { opMin: 1, opMax: 1000, resMin: 1, resMax: 1000 },
      minus: { opMin: 1, opMax: 1000, resMin: 1, resMax: 1000 },
      mult:  { opMin: 2, opMax: 100,  resMin: 1, resMax: 100 },
      div:   { opMin: 2, opMax: 100,  resMin: 1, resMax: 10 },
    },
    allowNegative: false,
    answerKey: true,
    nameLine: true,
    title: 'Matek 100',
    date: todayISO(),
  };
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function bounds(rg, allowNegative) {
  const omin = Math.min(rg.opMin, rg.opMax);
  const omax = Math.max(rg.opMin, rg.opMax);
  let rmin = Math.min(rg.resMin, rg.resMax);
  const rmax = Math.max(rg.resMin, rg.resMax);
  if (!allowNegative && rmin < 0) rmin = 0;
  return { omin, omax, rmin, rmax };
}

// Unique key: commutative ops sort the pair
export function exKey(ex) {
  const pair = (ex.op === 'plus' || ex.op === 'mult')
    ? [Math.min(ex.a, ex.b), Math.max(ex.a, ex.b)].join(',')
    : `${ex.a},${ex.b}`;
  return `${ex.op}:${pair}`;
}

function tryOne(op, { omin, omax, rmin, rmax }) {
  if (op === 'plus' || op === 'minus') {
    const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const r = op === 'plus' ? a + b : a - b;
    return r >= rmin && r <= rmax ? { op, a, b, r } : null;
  }
  if (op === 'mult') {
    const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const r = a * b;
    return r >= rmin && r <= rmax ? { op, a, b, r } : null;
  }
  // div: pick divisor b, then integer quotient q, dividend a = b * q
  const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
  const qMax = Math.min(rmax, Math.floor(Math.max(omax, 1) / b));
  const qMin = Math.max(rmin, 1, Math.ceil(Math.max(omin, 1) / b));
  if (qMax < qMin) return null;
  const r = randInt(qMin, qMax);
  const a = b * r;
  return (a >= omin && a <= omax) ? { op, a, b, r } : null;
}

// Division: a = dividend, b = divisor, r = integer quotient, a = b * r
// used: Set of exKey values already taken; generator avoids duplicates until impossible.
export function genOne(op, s, used) {
  const B = bounds(s.ranges[op], s.allowNegative);

  for (let t = 0; t < 1000; t++) {
    const cand = tryOne(op, B);
    if (!cand) continue;
    const k = exKey(cand);
    if (used && used.has(k)) continue;
    used?.add(k);
    return { ...cand, key: k };
  }
  // Rare: contradictory ranges or no unique exercise possible. Build anything valid.
  const fb = fallback(op, B);
  fb.key = exKey(fb);
  used?.add(fb.key);
  return fb;
}

function fallback(op, { omin, omax, rmin, rmax }) {
  const r = randInt(rmin, rmax);
  if (op === 'mult') {
    const a = Math.max(1, randInt(Math.max(omin, 1), Math.max(omax, 1)));
    const b = Math.max(1, Math.round(r / a));
    return { op, a, b, r: a * b };
  }
  if (op === 'div') {
    const b = Math.max(1, randInt(Math.max(omin, 1), Math.max(omax, 1)));
    const q = Math.max(1, r);
    return { op, a: b * q, b, r: q };
  }
  const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
  const b = op === 'plus' ? r - a : a - r;
  return { op, a, b, r };
}

// Returns { list, rows, columns } — list is row-major filled lazily; caller maps positions.
export function generate(s) {
  const enabled = OP_DEFS.filter(o => s.ops[o.id]).map(o => o.id);
  const columns = Math.max(1, Math.round(s.columns));
  const rows = Math.max(1, Math.ceil(s.count / columns));

  if (!enabled.length) return { list: [], rows, columns };

  const list = [];
  const used = new Set();
  if (s.sort === 'column') {
    // One operation type per column, cycling through enabled ops
    for (let c = 0; c < columns; c++) {
      const op = enabled[c % enabled.length];
      for (let r = 0; r < rows; r++) list.push(genOne(op, s, used));
    }
  } else {
    // Balanced random: even distribution, then shuffled
    const ids = [];
    for (let i = 0; i < rows * columns; i++) ids.push(enabled[i % enabled.length]);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    for (const op of ids) list.push(genOne(op, s, used));
  }
  return { list, rows, columns };
}
