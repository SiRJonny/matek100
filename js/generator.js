// Exercise generator for Matek 100
export const OP_DEFS = [
  { id: 'plus',  symbol: '+', label: 'Összeadás' },
  { id: 'minus', symbol: '−', label: 'Kivonás' },
  { id: 'mult',  symbol: '×', label: 'Szorzás' },
  { id: 'div',   symbol: ':', label: 'Osztás' },
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
      mult:  { opMin: 2, opMax: 10,   resMin: 1, resMax: 100 },
      div:   { opMin: 2, opMax: 10,   resMin: 1, resMax: 10 },
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

// Division: a = dividend, b = divisor, r = integer quotient, a = b * r
export function genOne(op, s) {
  const B = bounds(s.ranges[op], s.allowNegative);
  const { omin, omax, rmin, rmax } = B;

  for (let t = 0; t < 200; t++) {
    if (op === 'plus' || op === 'minus') {
      const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
      const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
      const r = op === 'plus' ? a + b : a - b;
      if (r >= rmin && r <= rmax) return { op, a, b, r };
    } else if (op === 'mult') {
      const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
      const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
      const r = a * b;
      if (r >= rmin && r <= rmax) return { op, a, b, r };
    } else {
      // div: pick divisor b, then integer quotient q, dividend a = b*q
      const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
      const qMax = Math.min(rmax, Math.floor(Math.max(omax, 1) / b));
      const qMin = Math.max(rmin, 1, Math.ceil(Math.max(omin, 1) / b));
      if (qMax >= qMin) {
        const r = randInt(qMin, qMax);
        const a = b * r;
        if (a >= omin && a <= omax) return { op, a, b, r };
      }
    }
  }
  // Rare: contradictory ranges. Build something valid, constraints approximated.
  return fallback(op, B);
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
  if (s.sort === 'column') {
    // One operation type per column, cycling through enabled ops
    for (let c = 0; c < columns; c++) {
      const op = enabled[c % enabled.length];
      for (let r = 0; r < rows; r++) list.push(genOne(op, s));
    }
  } else {
    // Balanced random: even distribution, then shuffled
    const ids = [];
    for (let i = 0; i < rows * columns; i++) ids.push(enabled[i % enabled.length]);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    for (const op of ids) list.push(genOne(op, s));
  }
  return { list, rows, columns };
}
