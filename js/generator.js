/**
 * generator.js — Generacion de problemas aritmeticos.
 * Operaciones soportadas: suma, resta, multiplicacion y division.
 */

function randInt(lo, hi) {
  if (lo >= hi) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function pow10(n) {
  return Math.pow(10, n);
}

function randScaled(intDigits, decimals) {
  const min = pow10(intDigits + decimals - 1);
  const max = pow10(intDigits + decimals) - 1;
  return randInt(min, max);
}

function randWithDigits(intDigits) {
  return randInt(pow10(intDigits - 1), pow10(intDigits) - 1);
}

function generateAddProblem() {
  const { numAddends, digitCounts, decimals, allowCarry } = S;
  const maxInt = Math.max(...digitCounts);
  const ncols  = maxInt + decimals;
  const colRem = new Array(ncols).fill(9);
  const addends = [];

  if (!allowCarry) {
    for (let col = 0; col < ncols; col++) {
      let minRequired = 0;
      for (let a = 0; a < numAddends; a++) {
        const myCols = digitCounts[a] + decimals;
        if (col < myCols && col === myCols - 1) minRequired += 1;
      }
      if (minRequired > 9) {
        throw new Error('Configuracion imposible sin llevadas para una o mas columnas');
      }
    }
  }

  for (let a = 0; a < numAddends; a++) {
    const myCols = digitCounts[a] + decimals;
    const digits = new Array(ncols).fill(0);

    for (let col = 0; col < myCols; col++) {
      const isLeading = (col === myCols - 1);
      const lo = isLeading ? 1 : 0;
      let hi;

      if (allowCarry) {
        hi = 9;
      } else {
        let minFuture = 0;
        for (let b = a + 1; b < numAddends; b++) {
          const futureCols = digitCounts[b] + decimals;
          if (col < futureCols && col === futureCols - 1) minFuture += 1;
        }
        hi = Math.min(9, colRem[col] - minFuture);
        if (hi < lo) {
          throw new Error('No se pudo generar sin llevadas con la configuracion actual');
        }
      }

      digits[col] = randInt(lo, hi);
      if (!allowCarry) colRem[col] -= digits[col];
    }

    addends.push(digits);
  }

  let result = 0;
  for (const d of addends) {
    for (let c = 0; c < d.length; c++) {
      result += d[c] * pow10(c);
    }
  }

  return {
    op: 'add',
    addends,
    result,
    decimals,
    digitCounts: [...digitCounts]
  };
}

function generateSubProblem() {
  const decimals = S.decimals;
  const d1 = S.digitCounts[0] || 2;
  const d2 = S.digitCounts[1] || 2;

  let a = randScaled(d1, decimals);
  let b = randScaled(d2, decimals);
  if (a < b) {
    const t = a;
    a = b;
    b = t;
  }

  return {
    op: 'sub',
    operands: [a, b],
    result: a - b,
    decimals,
    digitCounts: [d1, d2]
  };
}

function generateMulProblem() {
  const d1 = S.digitCounts[0] || 2;
  const d2 = S.digitCounts[1] || 2;
  const a = randWithDigits(d1);
  const b = randWithDigits(d2);

  return {
    op: 'mul',
    operands: [a, b],
    result: a * b,
    decimals: 0,
    digitCounts: [d1, d2]
  };
}

function generateDivProblem() {
  const dividendDigits = S.digitCounts[0] || 2;
  const divisorDigits = S.digitCounts[1] || 1;

  // Evitar cocientes triviales (1) en la mayoría de casos.
  const minDividend = pow10(dividendDigits - 1);
  const maxDividend = pow10(dividendDigits) - 1;
  const minDivisor = pow10(divisorDigits - 1);
  const maxDivisor = pow10(divisorDigits) - 1;

  const preferredQuotDigits = Math.max(1, dividendDigits - divisorDigits + 1);
  const prefQMin = (preferredQuotDigits === 1) ? 3 : pow10(preferredQuotDigits - 1);
  const prefQMax = pow10(preferredQuotDigits) - 1;

  const hardQMin = 2;
  const hardQMax = Math.floor(maxDividend / minDivisor);

  let divisor = minDivisor;
  let quotient = hardQMin;
  let dividend = divisor * quotient;
  let found = false;

  const ranges = [];
  const loPref = Math.max(hardQMin, prefQMin);
  const hiPref = Math.min(hardQMax, prefQMax);
  if (loPref <= hiPref) ranges.push([loPref, hiPref]);
  if (hardQMin <= hardQMax) ranges.push([hardQMin, hardQMax]);

  for (const [qLo, qHi] of ranges) {
    for (let attempt = 0; attempt < 120; attempt++) {
      quotient = randInt(qLo, qHi);

      const divLo = Math.max(minDivisor, Math.ceil(minDividend / quotient));
      const divHi = Math.min(maxDivisor, Math.floor(maxDividend / quotient));
      if (divLo > divHi) continue;

      divisor = randInt(divLo, divHi);
      dividend = divisor * quotient;
      if (dividend >= minDividend && dividend <= maxDividend && quotient >= 2) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    divisor = minDivisor;
    quotient = Math.max(2, Math.floor(maxDividend / divisor));
    dividend = divisor * quotient;
  }

  return {
    op: 'div',
    operands: [dividend, divisor],
    result: quotient,
    decimals: 0,
    digitCounts: [dividendDigits, divisorDigits]
  };
}

function generatePlaceProblem() {
  const level = S.placeLevel;
  if (level === 'hundreds') {
    const h = randInt(1, 9);
    const d = randInt(0, 9);
    const u = randInt(0, 9);
    return {
      op: 'place',
      level: 'hundreds',
      value: h * 100 + d * 10 + u,
      parts: { h, d, u },
      result: h * 100 + d * 10 + u,
      decimals: 0
    };
  }

  const d = randInt(1, 9);
  const u = randInt(0, 9);
  return {
    op: 'place',
    level: 'tens',
    value: d * 10 + u,
    parts: { d, u },
    result: d * 10 + u,
    decimals: 0
  };
}

function generateProblem() {
  if (S.kind === 'place') return generatePlaceProblem();

  switch (S.operation) {
    case 'sub': return generateSubProblem();
    case 'mul': return generateMulProblem();
    case 'div': return generateDivProblem();
    case 'add':
    default: return generateAddProblem();
  }
}

function genAll() {
  S.sheets = [];
  for (let s = 0; s < S.numSheets; s++) {
    const sheet = [];
    for (let p = 0; p < S.probsPerSheet; p++) {
      sheet.push(generateProblem());
    }
    S.sheets.push(sheet);
  }
}
