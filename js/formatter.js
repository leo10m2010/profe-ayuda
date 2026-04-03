/**
 * formatter.js — Funciones de formato de números para visualización.
 *
 * Regla de posiciones (col = índice desde la derecha):
 *   col 0 … decimals-1  → dígitos decimales
 *   col decimals         → unidades
 *   col decimals+1       → decenas
 *   …
 *
 * El separador decimal se inserta justo DESPUÉS de imprimir col `decimals` (unidades),
 * recorriendo los dígitos de izquierda a derecha.
 */

/**
 * Formatea el array de dígitos de un sumando como cadena de texto.
 * No incluye ceros a la izquierda de otros sumandos más largos.
 *
 * @param {number[]} digits     - Array de dígitos (índice 0 = posición más a la derecha)
 * @param {number}   intDigits  - Número de dígitos enteros de ESTE sumando
 * @param {number}   decimals   - Número de posiciones decimales (global)
 * @param {string}   sep        - Separador decimal ('.' o ',')
 * @returns {string}
 */
function fmtAddend(digits, intDigits, decimals, sep) {
  // Este sumando ocupa intDigits + decimals columnas propias
  const myCols = intDigits + decimals;
  let s = '';

  // Recorremos de la posición más significativa (myCols-1) a la menos (0)
  for (let i = myCols - 1; i >= 0; i--) {
    s += (digits[i] !== undefined ? digits[i] : 0);

    // El punto/coma va entre las unidades (col = decimals) y los décimos (col = decimals-1)
    if (decimals > 0 && i === decimals) {
      s += sep;
    }
  }

  return s;
}

/**
 * Formatea la suma (entero escalado × 10^decimals) como cadena de texto.
 *
 * @param {number} sum       - Entero escalado
 * @param {number} decimals  - Posiciones decimales
 * @param {string} sep       - Separador decimal
 * @returns {string}
 */
function fmtSum(sum, decimals, sep) {
  if (decimals === 0) return String(sum);

  const factor  = Math.pow(10, decimals);
  const intPart = Math.floor(sum / factor);
  const decPart = String(sum % factor).padStart(decimals, '0');
  return intPart + sep + decPart;
}

/**
 * Escapa caracteres HTML especiales (no escapa espacios: usamos white-space:pre).
 */
function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
