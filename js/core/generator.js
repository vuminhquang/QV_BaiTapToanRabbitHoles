import { analyzeBorrowing, matchesBorrowType } from './borrowing.js';

const randint = (min, max, random = Math.random) => Math.floor(random() * (max - min + 1)) + min;
const digitMin = digits => 10 ** (digits - 1);
const digitMax = digits => 10 ** digits - 1;

export function supportedTypes(digits, operation = '-') {
  if (operation !== '-') return ['normal'];
  return digits === 2 ? ['one'] : ['one', 'consecutive', 'zero'];
}

/** Random task generation; every subtraction returns nonnegative and honors requested borrow shape. */
export function makeSubtraction({ digits = 3, type = 'one', requiredColumns = [], random = Math.random } = {}) {
  if (![2, 3, 4].includes(digits)) throw new RangeError('Subtraction supports 2–4 digits');
  if ((type === 'zero' || type === 'consecutive') && digits < 3) {
    throw new RangeError('This borrowing type requires at least 3 digits');
  }
  if (requiredColumns.some(column => !Number.isInteger(column) || column < 0 || column >= digits - 1)) {
    throw new RangeError('Required borrowing column does not have a higher source column');
  }
  const min = digitMin(digits), max = digitMax(digits);
  // Most ranges are dense enough that sampling succeeds quickly. The bounded fallback
  // is deterministic and checked: it never silently returns the wrong type.
  for (let attempt = 0; attempt < 18000; attempt++) {
    let a = randint(min, max, random);
    let b = randint(min, max, random);
    if (type === 'zero' && attempt < 12000) {
      // Choose zero at tens. Borrow on units traverses that zero when units=0.
      const hundredsBase = digits === 3 ? randint(1, 9, random) : randint(10, 99, random);
      a = hundredsBase * 100;
      b = randint(min, Math.min(a - 1, max), random);
    }
    if (a < b) [a, b] = [b, a];
    if (a === b) continue;
    const borrow = analyzeBorrowing(a, b);
    if (!matchesBorrowType(borrow, type)) continue;
    if (!requiredColumns.every(c => borrow.borrowedColumns.includes(c))) continue;
    return { a, b, op: '-', result: a - b, borrow, type };
  }
  throw new Error(`Cannot generate type ${type} for ${digits} digits with these constraints`);
}

export function makeOtherOperation(op, digits = 3, random = Math.random) {
  const min = digitMin(digits), max = digitMax(digits);
  let a = randint(min, max, random), b = randint(min, max, random);
  if (op === '+') return { a, b, op, result: a + b, type: 'normal' };
  if (op === '-') {
    if (a < b) [a, b] = [b, a];
    return { a, b, op, result: a - b, type: 'normal' };
  }
  if (op === '×') {
    b = randint(2, 9, random);
    return { a, b, op, result: a * b, type: 'normal' };
  }
  if (op === '÷') {
    b = randint(2, 9, random);
    const q = randint(Math.max(1, Math.ceil(min / b)), Math.floor(max / b), random);
    a = q * b;
    return { a, b, op, result: q, type: 'normal' };
  }
  throw new RangeError('Unsupported operation');
}

function mixOneBatch({ count, digits, operation, type, requiredColumns, random }) {
  const results = [];
  const seen = new Set();
  for (let i = 0; i < count; i++) {
    let candidate;
    for (let retry = 0; retry < 200; retry++) {
      const d = digits === 'mixed' ? randint(2, 4, random) : Number(digits);
      const minimumForColumns = requiredColumns.length ? Math.max(...requiredColumns) + 2 : 2;
      const adjusted = Math.max((type === 'zero' || type === 'consecutive') ? 3 : 2, d, minimumForColumns);
      candidate = operation === '-'
        ? makeSubtraction({ digits: adjusted, type, requiredColumns, random })
        : makeOtherOperation(operation, d, random);
      const key = `${candidate.op}:${candidate.a}:${candidate.b}`;
      if (!seen.has(key)) { seen.add(key); break; }
    }
    results.push(candidate);
  }
  return results;
}

/** Returns groups instead of flattening; print layout can preserve coherent sections. */
export function generateWorksheet(options = {}) {
  const { operation = '-', digits = 3, count = 16, mode = 'mixed', requiredColumns = [], random = Math.random } = options;
  if (!['-', '+', '×', '÷'].includes(operation)) throw new RangeError('Unsupported operation');
  if (!(digits === 'mixed' || [2, 3, 4].includes(Number(digits)))) throw new RangeError('Unsupported digits');
  if (!Number.isInteger(count) || count < 1 || count > 80) throw new RangeError('Count must be 1–80');
  const d = digits === 'mixed' ? 3 : Number(digits);
  const available = mode === 'normal' ? ['normal'] : supportedTypes(d, operation);
  let types = operation !== '-' ? ['normal']
    : mode === 'mixed' ? available
    : [mode];
  if (operation === '-' && mode === 'mixed' && requiredColumns.length > 1) {
    types = types.filter(t => t !== 'one');
  }
  if (types.some(t => !available.includes(t))) throw new RangeError('Type not supported by selected digits');
  // Default worksheet uses half basic tasks, one-quarter continuous borrowing,
  // one-quarter borrowing across zero, matching the visual reference.
  const counts = types.length === 3
    ? [Math.ceil(count / 2), Math.ceil((count - Math.ceil(count / 2)) / 2), Math.floor((count - Math.ceil(count / 2)) / 2)]
    : types.map((t, i) => Math.floor(count / types.length) + Number(i < count % types.length));
  let idx = 0;
  return types.map((type, i) => ({
    type,
    items: mixOneBatch({ count: counts[i], digits, operation, type, requiredColumns, random })
      .map(p => ({ ...p, number: ++idx }))
  })).filter(g => g.items.length);
}
