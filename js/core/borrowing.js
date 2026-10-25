/** Column indices are counted from right to left: units=0, tens=1, hundreds=2. */
export function analyzeBorrowing(minuend, subtrahend) {
  if (!Number.isSafeInteger(minuend) || !Number.isSafeInteger(subtrahend)
      || minuend < 0 || subtrahend < 0 || subtrahend > minuend) {
    throw new RangeError('Expected safe, non-negative integers with minuend >= subtrahend');
  }
  const n = Math.max(String(minuend).length, String(subtrahend).length);
  const original = String(minuend).padStart(n, '0').split('').reverse().map(Number);
  const lower = String(subtrahend).padStart(n, '0').split('').reverse().map(Number);
  const working = [...original];
  const borrowerColumns = new Set();
  const sourceColumns = new Set();
  const transitions = [];
  for (let column = 0; column < n; column++) {
    if (working[column] >= lower[column]) continue;
    let source = column + 1;
    while (source < n && working[source] === 0) source++;
    if (source >= n) throw new RangeError('The subtraction would be negative');
    working[source] -= 1;
    sourceColumns.add(source);
    for (let transit = source - 1; transit > column; transit--) {
      working[transit] = 9;
      borrowerColumns.add(transit);
    }
    working[column] += 10;
    borrowerColumns.add(column);
    transitions.push({ column, source, throughZero: source > column + 1 });
  }
  const borrowedColumns = [...borrowerColumns].sort((a, b) => a - b);
  const touchedColumns = new Set([...borrowerColumns, ...sourceColumns]);
  return {
    hasBorrowing: borrowedColumns.length > 0,
    borrowedColumns,
    sourceColumns: [...sourceColumns].sort((a,b) => a - b),
    transitions,
    throughZero: transitions.some(t => t.throughZero),
    consecutive: borrowedColumns.some((pos, i) => i && pos === borrowedColumns[i - 1] + 1),
    workingDigits: working,
    originalDigits: original,
    touchedColumns: [...touchedColumns].sort((a,b) => a - b)
  };
}

export function matchesBorrowType(info, type) {
  if (!info.hasBorrowing) return false;
  if (type === 'one') return info.borrowedColumns.length === 1 && !info.throughZero;
  if (type === 'consecutive') return info.consecutive && !info.throughZero;
  if (type === 'zero') return info.throughZero;
  if (type === 'multi') return info.borrowedColumns.length >= 2;
  return true;
}
