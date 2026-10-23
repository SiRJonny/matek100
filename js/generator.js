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
    allowCarry: true, // tízesátlépés: crossing multiples of ten disabled when false
  };
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function bounds(op, rg, allowNegative) {
  const omin = Math.min(rg.opMin, rg.opMax);
  const omax = Math.max(rg.opMin, rg.opMax);
  let rmin = Math.min(rg.resMin, rg.resMax);
  const rmax = Math.max(rg.resMin, rg.resMax);
  if (!allowNegative && rmin < 0) rmin = 0;
  // negative allowed: subtraction may reach the lowest achievable result (omin - omax)
  if (op === 'minus' && allowNegative && rmin >= 0) rmin = omin - omax;
  return { omin, omax, rmin, rmax };
}

// Unique key: commutative ops sort the pair
export function exKey(ex) {
  const pair = (ex.op === 'plus' || ex.op === 'mult')
    ? [Math.min(ex.a, ex.b), Math.max(ex.a, ex.b)].join(',')
    : `${ex.a},${ex.b}`;
  return `${ex.op}:${pair}`;
}

const crossed = (x, y) => Math.floor(x / 10) !== Math.floor(y / 10); // any +-10 boundary crossed

function tryOne(op, B, T, allowCarry) {
  if (op === 'plus' || op === 'minus') {
    const { omin, omax, rmin, rmax } = B;
    const a = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const b = randInt(Math.max(omin, 1), Math.max(omax, 1));
    const r = op === 'plus' ? a + b : a - b;
    if (r < rmin || r > rmax) return null;
    // crossing a multiple of ten (carry/borrow)
    if (!allowCarry && crossed(r, a)) return null;
    return { op, a, b, r };
  }
  // mult/div: classic table practice — one operand is a selected table number, the other 2..10.
  // mult: a is the table number. div: b is the table number (divisor), a = b * q <= 10.
  if (op === 'mult') {
    const a = T[Math.floor(Math.random() * T.length)];
    const b = randInt(2, 10);
    return { op, a, b, r: a * b };
  }
  // div: divisor k is a selected table number; dividend = k * (2..10), quotient = that factor
  if (op === 'div') {
    const k = T[Math.floor(Math.random() * T.length)];
    const r = randInt(2, 10);
    return { op, a: k * r, b: k, r };
  }
}

// Full set of possible table exercises (mult: a=k, b=2..10; div: b=k, a<=10), non-trivial first
function tablePool(op, T) {
  const order = [];
  if (op === 'mult') {
    for (const k of T) for (let b = 2; b <= 10; b++) order.push({ op, a: k, b, r: k * b });
  } else {
    for (const k of T) for (let m = 2; m <= 10; m++) {
      order.push({ op, a: k * m, b: k, r: m });  // divisor = table number, dividend <= divisor*10
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
  const B = isTable ? null : bounds(op, s.ranges[op], s.allowNegative);
  if (isTable && !T.length) return null;

  let t = 0;
  for (; t < 1000; t++) {
    const cand = tryOne(op, B, T, s.allowCarry);
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
      return { op, a: k * m, b: k, r: m };
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
