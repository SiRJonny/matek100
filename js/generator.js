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
      plus:  { opMin: 2, opMax: 100, resMin: 1, resMax: 100 },
      minus: { opMin: 2, opMax: 100, resMin: 1, resMax: 100 },
    },
    tables: {
      mult: { 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true },
      div:  { 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true },
    },
    allowNegative: false,
    answerKey: true,
    nameLine: true,
    title: 'Matek 100',
    date: todayISO(),
    fontSize: 18,
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

function tryOne(op, B, T) {
  if (op === 'plus' || op === 'minus') {
    const { omin, omax, rmin, rmax } = B;
    const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const r = op === 'plus' ? a + b : a - b;
    return r >= rmin && r <= rmax ? { op, a, b, r } : null;
  }
  // mult/div: classic table practice — one operand is a selected table number, the other 2..10.
  // mult: a is the table number. div: b is the table number (divisor), a = b * q <= 10.
  if (op === 'mult') {
    const a = T[Math.floor(Math.random() * T.length)];
    const b = randInt(2, 10);
    return { op, a, b, r: a * b };
  }
  // div: dividend = k * m from selected tables (<= 100), divisor = one factor, both <= 10
  if (op === 'div') {
    const k = T[Math.floor(Math.random() * T.length)];
    const m = randInt(2, 10);
    const b = Math.random() < 0.5 ? k : m;
    return { op, a: k * m, b, r: k * m / b };
  }
}

// Full set of possible table exercises (mult: a=k, b=2..10; div: b=k, a<=10), non-trivial first
function tablePool(op, T) {
  const order = [];
  if (op === 'mult') {
    for (const k of T) for (let b = 2; b <= 10; b++) order.push({ op, a: k, b, r: k * b });
  } else {
    for (const k of T) for (let m = 2; m <= 10; m++) {
      const a = k * m;
      if (k !== m) {
        order.push({ op, a, b: k, r: m });
        order.push({ op, a, b: m, r: k });
      } else {
        order.push({ op, a, b: k, r: m });
      }
    }
  }
  return order;
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const tableSel = s => op => Object.keys(s.tables[op]).filter(k => s.tables[op][k]).map(Number);

// Per-op exercise queues: unused table exercises first (diversity), then repeats.
function buildQueues(s) {
  const queues = {};
  for (const op of ['mult', 'div']) {
    if (!s.tables[op]) continue;
    const T = tableSel(s)(op);
    if (!T.length) { queues[op] = []; continue; }
    const uniq = [];
    const seen = new Set();
    for (const ex of tablePool(op, T)) {
      const k = exKey(ex);
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push({ ...ex, key: k });
    }
    shuffleArr(uniq);
    // repeats when the page needs more exercises than the pool holds
    queues[op] = [...uniq, ...shuffleArr([...uniq])];
  }
  return queues;
}

// Division: a = dividend, b = divisor, r = integer quotient, a = b * r
// used: Set of exKey values already taken; generator avoids duplicates until impossible.
export function genOne(op, s, used) {
  const isTable = op === 'mult' || op === 'div';
  const T = isTable ? tableSel(s)(op) : null;
  const B = isTable ? null : bounds(s.ranges[op], s.allowNegative);
  if (isTable && !T.length) return null;

  let t = 0;
  for (; t < 1000; t++) {
    const cand = tryOne(op, B, T);
    if (!cand) continue;
    const k = exKey(cand);
    if (used && used.has(k)) continue;
    used?.add(k);
    return { ...cand, key: k };
  }
  // Rare: contradictory ranges or no unique exercise possible. Build anything valid.
  const fb = fallback(op, B, T);
  fb.key = exKey(fb);
  used?.add(fb.key);
  return fb;
}

function fallback(op, B, T) {
  if (op === 'mult' || op === 'div') {
    if (!T.length) return null;
    const k = T[Math.floor(Math.random() * T.length)];
    if (op === 'div') {
      const m = randInt(2, 10);
      const b = Math.random() < 0.5 ? k : m;
      return { op, a: k * m, b, r: k * m / b };
    }
    const b = randInt(2, 10);
    return { op, a: k, b, r: k * b };
  }
  const { omin, omax, rmin, rmax } = B;
  const r = randInt(rmin, rmax);
  const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
  const b = op === 'plus' ? r - a : a - r;
  return { op, a, b, r };
}

// Returns { list, rows, columns } — list is row-major filled lazily; caller maps positions.
export function generate(s) {
  const hasTables = op => Object.values(s.tables[op]).some(Boolean);
  const enabled = OP_DEFS.filter(o => s.ops[o.id] && (s.tables[o.id] ? hasTables(o.id) : true)).map(o => o.id);
  const columns = Math.max(1, Math.round(s.columns));
  const rows = Math.max(1, Math.ceil(s.count / columns));

  if (!enabled.length) return { list: [], rows, columns };

  const queues = buildQueues(s);
  const used = new Set();
  const take = op => {
    const q = queues[op];
    if (q && q.length) {
      const ex = q.shift();
      used.add(ex.key);
      return ex;
    }
    return genOne(op, s, used); // safety net (plus/minus or exhausted pool)
  };

  const list = [];
  if (s.sort === 'column') {
    // One operation type per column, cycling through enabled ops
    for (let c = 0; c < columns; c++) {
      const op = enabled[c % enabled.length];
      for (let r = 0; r < rows; r++) list.push(take(op));
    }
  } else {
    // Balanced random: even distribution, then shuffled
    const ids = [];
    for (let i = 0; i < rows * columns; i++) ids.push(enabled[i % enabled.length]);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    for (const op of ids) list.push(take(op));
  }
  return { list, rows, columns };
}
