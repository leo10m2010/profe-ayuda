/**
 * renderer.js — Construcción del HTML de fichas y hoja de respuestas.
 *
 * FILOSOFÍA DE DISEÑO:
 *   Todo el HTML generado (problemas, fichas, hoja de respuestas) usa
 *   estilos INLINE. Esto garantiza que la vista previa y el PDF exportado
 *   sean pixel-perfect idénticos, independientemente de si html2canvas
 *   lee o no el archivo CSS externo.
 *
 *   El archivo style.css sólo estiliza la interfaz de la aplicación
 *   (sidebar, controles, botones). Nunca el contenido de las fichas.
 *
 * Depende de: state.js, formatter.js
 */

// ─────────────────────────────────────────────
// CONSTANTES DE ESTILO (single source of truth)
// ─────────────────────────────────────────────
const PAGE_W   = 794;   // px — ancho A4 a 96 dpi
const PAGE_H   = 1123;  // px — alto  A4 a 96 dpi
const PAD_H    = 52;    // padding top
const PAD_B    = 44;    // padding bottom
const PAD_SIDE = 62;    // padding izquierda y derecha

function getTitleRenderMeta(rawTitle, isPlace) {
  const clean = String(rawTitle || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const base = clean || 'OPERACIONES';

  // Estilo "separado por letras" solo para titulos cortos.
  if (base.length <= 14 && !base.includes(' ')) {
    return {
      text: base.split('').join(' '),
      size: 34,
      spacing: isPlace ? 4 : 10,
      lineHeight: 1.05,
      breakRule: 'normal'
    };
  }

  if (base.length <= 24) {
    return {
      text: base,
      size: 30,
      spacing: 2,
      lineHeight: 1.08,
      breakRule: 'normal'
    };
  }

  return {
    text: base,
    size: 24,
    spacing: 1,
    lineHeight: 1.15,
    breakRule: 'break-word'
  };
}

function renderPlaceBlocks(prob) {
  if (!S.placeBlocks) return '';

  const compact = (prob.level === 'hundreds');
  const hundredPx = compact ? 2 : 3;
  const rodW = compact ? 9 : 12;
  const rodH = compact ? 4 : 6;
  const rodGap = compact ? 1 : 2;
  const unitSize = compact ? 11 : 14;

  const hundredCell = `<span style="display:block;width:${hundredPx}px;height:${hundredPx}px;background:#34d399;"></span>`;
  const hundred = `<div style="display:grid;grid-template-columns:repeat(10,${hundredPx}px);grid-template-rows:repeat(10,${hundredPx}px);gap:1px;padding:3px;border:1px solid #2f855a;border-radius:4px;background:#ddfbe8;">${hundredCell.repeat(100)}</div>`;

  const rodCell = `<span style="display:block;width:${rodW}px;height:${rodH}px;background:#ef4444;border-radius:1px;"></span>`;
  const rod = `<div style="display:grid;grid-template-rows:repeat(10,${rodH}px);gap:${rodGap}px;padding:3px;border:1px solid #a61f2f;border-radius:4px;background:#ffd9de;">${rodCell.repeat(10)}</div>`;

  const one = '<span style="display:inline-block;width:' + unitSize + 'px;height:' + unitSize + 'px;background:#22c1e7;border:1px solid #0d6a84;border-radius:3px;"></span>';

  let h = '<div style="display:flex;flex-direction:column;gap:8px;">';

  if (prob.level === 'hundreds') {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;min-height:34px;">';
    for (let i = 0; i < prob.parts.h; i++) h += hundred;
    h += '</div>';
  }

  h += '<div style="display:flex;gap:5px;flex-wrap:wrap;min-height:' + (compact ? '50px' : '72px') + ';">';
  for (let i = 0; i < prob.parts.d; i++) h += rod;
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(8,' + unitSize + 'px);gap:4px;min-height:' + unitSize + 'px;">';
  for (let i = 0; i < prob.parts.u; i++) h += one;
  h += '</div>';

  h += '</div>';
  return h;
}

function renderPlaceProblem(prob, num, showAns) {
  const isHundreds = (prob.level === 'hundreds');
  const valueLine = showAns ? String(prob.value) : '_____';
  const cBox = isHundreds ? (showAns ? String(prob.parts.h) : '__') : '';
  const dBox = showAns ? String(prob.parts.d) : '__';
  const uBox = showAns ? String(prob.parts.u) : '__';

  function posCell(label, value) {
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
      `<span style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;">${label}</span>` +
      `<span style="display:inline-block;min-width:28px;text-align:center;border:1px dashed #64748b;padding:3px 6px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;">${value}</span>` +
      '</div>';
  }

  const cardMinH = isHundreds ? 230 : 190;
  let h = '<div style="border:1.8px solid #1f2937;border-radius:14px;padding:12px 12px 10px;background:#f8fafc;min-height:' + cardMinH + 'px;display:flex;flex-direction:column;gap:10px;">';
  h += `<div style="font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${num}.</div>`;
  h += `<div style="flex:1;">${renderPlaceBlocks(prob)}</div>`;

  h += '<div style="display:flex;gap:10px;align-items:flex-end;font-family:Arial,sans-serif;font-size:14px;">';
  if (isHundreds) {
    h += posCell('C', cBox);
    h += '<span style="font-weight:700;">+</span>';
  }
  h += posCell('D', dBox);
  h += '<span style="font-weight:700;">+</span>';
  h += posCell('U', uBox);
  h += '<span>=</span>';
  h += `<span style="display:inline-block;min-width:64px;border-bottom:1.5px solid #334155;text-align:center;padding:2px 4px;">${valueLine}</span>`;
  h += '</div>';

  h += '</div>';
  return h;
}

function renderDivisionStepsProblem(prob, num, showAns) {
  const dividend = fmtSum(prob.operands[0], prob.decimals, S.sep);
  const divisor = fmtSum(prob.operands[1], prob.decimals, S.sep);
  const quotient = fmtSum(prob.result, prob.decimals, S.sep);
  const partial = fmtSum(prob.operands[1] * prob.result, prob.decimals, S.sep);
  const remainder = fmtSum(prob.operands[0] - (prob.operands[1] * prob.result), prob.decimals, S.sep);

  const qBox = showAns ? esc(quotient) : '&nbsp;';
  const pBox = showAns ? esc(partial) : '&nbsp;';
  const rBox = showAns ? esc(remainder) : '&nbsp;';

  const box = 'display:inline-block;min-width:52px;height:26px;line-height:26px;text-align:center;border:1px solid #bfc8d6;border-radius:4px;background:#fff;';

  let h = '<div style="padding-top:2px;">';
  h += `<div style="font-size:13px;font-weight:700;margin-bottom:8px;font-family:Arial,sans-serif;">${num}.</div>`;
  h += '<div style="font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:1;">';
  h += '<div style="display:grid;grid-template-columns:auto auto;column-gap:14px;align-items:start;max-width:220px;">';
  h += `<div style="font-weight:700;text-align:right;min-width:60px;">${esc(dividend)}</div>`;
  h += `<div style="font-weight:700;border-left:2px solid #222;border-bottom:2px solid #222;padding:0 0 6px 12px;min-width:58px;">${esc(divisor)}</div>`;
  h += '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">';
  h += `<div style="display:flex;align-items:center;gap:7px;"><span style="font-weight:700;">-</span><span style="${box}">${pBox}</span></div>`;
  h += '<div style="border-top:1.5px solid #222;width:96px;"></div>';
  h += `<div><span style="${box}">${rBox}</span></div>`;
  h += '</div>';
  h += `<div style="padding-left:12px;"><span style="${box}">${qBox}</span></div>`;
  h += '</div>';
  h += '</div>';
  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────
// PROBLEMA INDIVIDUAL
// ─────────────────────────────────────────────

/**
 * Renderiza un problema de suma en formato de columna vertical.
 * Usa fuente monoespaciada + white-space:pre para alinear dígitos.
 *
 * @param {Problem} prob
 * @param {number}  num
 * @param {boolean} showAns
 * @returns {string} HTML con inline styles
 */
function renderProblem(prob, num, showAns) {
  if (prob.op === 'place') {
    return renderPlaceProblem(prob, num, showAns);
  }

  const { op, decimals } = prob;
  const sep = S.sep;
  const MONO = "font-family:'Courier New',Courier,monospace;font-size:19px;line-height:1.6;white-space:pre;display:block;";

  if (op === 'div' && S.divMode === 'steps') {
    return renderDivisionStepsProblem(prob, num, showAns);
  }

  if (op !== 'add') {
    const symbols = { sub: '-', mul: 'x', div: '/' };
    const symbol = symbols[op] || '+';
    const left = fmtSum(prob.operands[0], decimals, sep);
    const right = fmtSum(prob.operands[1], decimals, sep);
    const ans = fmtSum(prob.result, decimals, sep);
    const maxLen = Math.max(left.length, right.length, ans.length);

    const lines = [
      ' ' + left.padStart(maxLen, ' '),
      symbol + right.padStart(maxLen, ' ')
    ];
    const ansLine = ' ' + ans.padStart(maxLen, ' ');

    let h = `<div>`;
    h += `<div style="font-size:13px;font-weight:700;margin-bottom:3px;font-family:Arial,sans-serif;">${num}.</div>`;
    h += `<div style="${MONO}">`;
    h += lines.map(esc).join('\n');
    h += `</div>`;
    h += `<div style="border-top:1.5px solid #222;margin:3px 0 0;"></div>`;
    if (showAns) {
      h += `<div style="${MONO}">${esc(ansLine)}</div>`;
    } else {
      h += `<div style="${MONO}color:transparent;user-select:none;">${esc(ansLine)}</div>`;
    }
    h += `</div>`;
    return h;
  }

  const { addends, result, digitCounts } = prob;

  // Formateamos cada sumando con sus propios dígitos enteros
  const fmted  = addends.map((d, i) => fmtAddend(d, digitCounts[i], decimals, sep));
  const sumStr = fmtSum(result, decimals, sep);

  // Todos los sumandos y la respuesta se alinean a la misma anchura
  const maxLen = Math.max(...fmted.map(f => f.length), sumStr.length);

  const lines = fmted.map((f, i) => {
    const padded = f.padStart(maxLen, ' ');
    return (i === fmted.length - 1 ? '+' : ' ') + padded;
  });
  const ansLine = ' ' + sumStr.padStart(maxLen, ' ');

  let h = `<div>`;
  h += `<div style="font-size:13px;font-weight:700;margin-bottom:3px;font-family:Arial,sans-serif;">${num}.</div>`;

  // Sumandos
  h += `<div style="${MONO}">`;
  h += lines.map(esc).join('\n');
  h += `</div>`;

  // Línea separadora
  h += `<div style="border-top:1.5px solid #222;margin:3px 0 0;"></div>`;

  // Respuesta (visible o invisible)
  if (showAns) {
    h += `<div style="${MONO}">${esc(ansLine)}</div>`;
  } else {
    h += `<div style="${MONO}color:transparent;user-select:none;">${esc(ansLine)}</div>`;
  }

  h += `</div>`;
  return h;
}

function getProblemAnswer(prob) {
  if (prob.op === 'place') {
    if (prob.level === 'hundreds') {
      return `${prob.value} = ${prob.parts.h * 100} + ${prob.parts.d * 10} + ${prob.parts.u}`;
    }
    return `${prob.value} = ${prob.parts.d * 10} + ${prob.parts.u}`;
  }

  return fmtSum(prob.result, prob.decimals, S.sep);
}

function getGlobalProblemNumber(sheetIdx, problemIdx) {
  return (sheetIdx * S.probsPerSheet) + problemIdx + 1;
}

// ─────────────────────────────────────────────
// PÁGINA DE FICHA
// ─────────────────────────────────────────────

/**
 * Renderiza una página completa de ficha de ejercicios.
 *
 * @param {number}  sheetIdx
 * @param {number}  totalSheets
 * @param {boolean} forPDF      - Si true, omite la sombra
 * @returns {string} HTML
 */
function renderWsPage(sheetIdx, totalSheets, forPDF) {
  const { title, cols, showAns, showSelfEval } = S;
  const probs       = S.sheets[sheetIdx];
  const tmeta       = getTitleRenderMeta(title, S.kind === 'place');
  const shadow      = forPDF ? '' : 'box-shadow:0 4px 22px rgba(0,0,0,0.13);';
  const isPlace = (S.kind === 'place');
  const isDivSteps = (S.kind === 'ops' && S.operation === 'div' && S.divMode === 'steps');

  // ── Contenedor de página A4 ──────────────────────────────────────────
  let h = `<div class="ws-page-el" style="
    width:${PAGE_W}px;
    height:${PAGE_H}px;
    background:white;
    padding:${PAD_H}px ${PAD_SIDE}px ${PAD_B}px;
    display:flex;
    flex-direction:column;
    font-family:Arial,Helvetica,sans-serif;
    box-sizing:border-box;
    ${shadow}
  ">`;

  // ── Título ───────────────────────────────────────────────────────────
  h += `<div style="
    text-align:center;
    font-size:${tmeta.size}px;
    font-weight:900;
    letter-spacing:${tmeta.spacing}px;
    line-height:${tmeta.lineHeight};
    word-break:${tmeta.breakRule};
    max-width:100%;
    text-wrap:balance;
    margin-bottom:26px;
    flex-shrink:0;
  ">${esc(tmeta.text)}</div>`;

  // ── Nombre / Fecha ───────────────────────────────────────────────────
  h += `<div style="
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    margin-bottom:34px;
    font-size:13.5px;
    flex-shrink:0;
  ">`;
  h += `<div style="display:flex;align-items:flex-end;gap:8px;">
    <span>Nombre:</span>
    <div style="width:180px;border-bottom:1.5px solid #333;"></div>
  </div>`;
  h += `<div style="display:flex;align-items:flex-end;gap:8px;">
    <span>Fecha:</span>
    <div style="width:130px;border-bottom:1.5px solid #333;"></div>
  </div>`;
  h += `</div>`;

  // ── Cuadrícula de problemas ──────────────────────────────────────────
  // flex:1 hace que la cuadrícula llene el espacio vertical restante
  h += `<div style="
    display:grid;
    grid-template-columns:repeat(${cols},1fr);
    gap:${isPlace ? '18px 14px' : (isDivSteps ? '42px 18px' : '36px 10px')};
    flex:1;
    align-content:start;
  ">`;
  for (let i = 0; i < probs.length; i++) {
    h += renderProblem(probs[i], getGlobalProblemNumber(sheetIdx, i), showAns);
  }
  h += `</div>`;

  // ── Autoevaluación ──────────────────────────────────────────────────
  if (showSelfEval) {
    h += `<div style="
      margin-top:26px;
      display:flex;
      align-items:center;
      gap:18px;
      font-size:12.5px;
      flex-wrap:wrap;
      flex-shrink:0;
    ">`;
    h += `<strong>¿Cómo ha ido?</strong>`;
    for (const opt of ['Excelente', 'Bien', 'Necesito practicar más']) {
      h += `<div style="display:flex;align-items:center;gap:5px;">
        <span style="display:inline-block;width:13px;height:13px;border:1.5px solid #333;flex-shrink:0;"></span>
        <span>${opt}</span>
      </div>`;
    }
    h += `</div>`;
  }

  // ── Pie de página ────────────────────────────────────────────────────
  h += `<div style="
    margin-top:14px;
    display:flex;
    justify-content:space-between;
    font-size:10px;
    color:#9ca3af;
    flex-shrink:0;
  ">`;
  h += `<span>Generador de Fichas</span>`;
  h += `<span>Página ${sheetIdx + 1} de ${totalSheets}</span>`;
  h += `</div>`;

  h += `</div>`;
  return h;
}

// ─────────────────────────────────────────────
// HOJA DE RESPUESTAS
// ─────────────────────────────────────────────

/**
 * Bloque de respuestas para una sola ficha (título + tabla).
 */
function renderAnsBlock(sheetIdx) {
  const probs = S.sheets[sheetIdx];
  const half  = Math.ceil(probs.length / 2);

  let h = `<div style="margin-bottom:28px;">`;
  h += `<div style="font-size:13.5px;font-weight:700;margin-bottom:9px;">Ficha ${sheetIdx + 1}</div>`;

  h += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
  h += `<thead><tr>`;
  for (const col of ['Nº', 'Resultado', 'Nº', 'Resultado']) {
    h += `<th style="background:#f1f5f9;font-weight:700;padding:7px 14px;border:1px solid #cbd5e1;text-align:center;">${col}</th>`;
  }
  h += `</tr></thead><tbody>`;

  const TD = 'padding:6px 14px;border:1px solid #e2e8f0;text-align:center;';
  for (let i = 0; i < half; i++) {
    const p1 = probs[i];
    const p2 = probs[i + half];
    h += `<tr>`;
    h += `<td style="${TD}">${getGlobalProblemNumber(sheetIdx, i)}</td>`;
      h += `<td style="${TD}">${getProblemAnswer(p1)}</td>`;
      if (p2) {
        h += `<td style="${TD}">${getGlobalProblemNumber(sheetIdx, i + half)}</td>`;
        h += `<td style="${TD}">${getProblemAnswer(p2)}</td>`;
      } else {
      h += `<td style="${TD}"></td><td style="${TD}"></td>`;
    }
    h += `</tr>`;
  }

  h += `</tbody></table></div>`;
  return h;
}

/**
 * Pagina de respuestas con una o varias fichas para exportar PDF.
 */
function renderAnsSheetPage(sheetIndices, pageNum, totalPages, forPDF) {
  const shadow = forPDF ? '' : 'box-shadow:0 4px 22px rgba(0,0,0,0.13);';

  let h = `<div class="ws-page-el" style="
    width:${PAGE_W}px;
    height:${PAGE_H}px;
    background:white;
    padding:${PAD_H}px ${PAD_SIDE}px ${PAD_B}px;
    font-family:Arial,Helvetica,sans-serif;
    box-sizing:border-box;
    display:flex;
    flex-direction:column;
    ${shadow}
  ">`;

  h += `<div style="font-size:26px;font-weight:900;letter-spacing:5px;margin-bottom:30px;flex-shrink:0;">
    H O J A &nbsp; D E &nbsp; R E S P U E S T A S
  </div>`;

  h += `<div style="flex:1;overflow:hidden;">`;
  for (const idx of sheetIndices) {
    h += renderAnsBlock(idx);
  }
  h += `</div>`;

  h += `<div style="
    margin-top:14px;
    display:flex;
    justify-content:space-between;
    font-size:10px;
    color:#9ca3af;
    flex-shrink:0;
  ">`;
  h += `<span>Respuestas</span>`;
  h += `<span>Pagina ${pageNum} de ${totalPages}</span>`;
  h += `</div>`;

  h += `</div>`;
  return h;
}

// ─────────────────────────────────────────────
// PREVIEW EN PANTALLA
// ─────────────────────────────────────────────

/**
 * Actualiza la vista previa en #preview.
 * Aplica zoom para escalar el A4 al ancho disponible.
 * Al usar inline styles en el HTML, el zoom escala de forma idéntica
 * a como se verá en el PDF → WYSIWYG garantizado.
 */
function renderPreview() {
  const container = document.getElementById('preview');
  if (!container || S.sheets.length === 0) return;

  let h = renderWsPage(0, S.numSheets, false);
  if (S.showAnsSheet) {
    const blocksPerPage =
      (S.probsPerSheet <= 8) ? 3 :
      (S.probsPerSheet <= 20 ? 2 : 1);
    const firstPageSheets = [];
    for (let s = 0; s < Math.min(S.numSheets, blocksPerPage); s++) firstPageSheets.push(s);
    h += renderAnsSheetPage(firstPageSheets, 1, Math.ceil(S.numSheets / blocksPerPage), false);
  }
  container.innerHTML = h;

  // Escalado proporcional: zoom CSS afecta el tamaño de layout,
  // por lo que el contenedor se ajusta automáticamente.
  const available = container.clientWidth || 700;
  const scale     = Math.min(1, (available - 8) / PAGE_W);

  container.querySelectorAll('.ws-page-el').forEach(el => {
    el.style.zoom         = String(scale);
    el.style.marginBottom = '24px';
  });
}
