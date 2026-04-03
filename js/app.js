/**
 * app.js — Lógica de UI: controles, generación y exportación PDF.
 * Depende de: state.js, generator.js, formatter.js, renderer.js
 */

// ─────────────────────────────────────────────
// LECTURA DE CONTROLES → ESTADO
// ─────────────────────────────────────────────

function readControls() {
  const prevKind = S.kind;
  const prevPlaceLevel = S.placeLevel;
  const prevOp = S.operation;

  const colsInput = document.getElementById('c-cols');
  const decInput = document.getElementById('c-dec');
  const showAnsInput = document.getElementById('c-show-ans');

  S.title         = document.getElementById('c-title').value.trim() || 'OPERACIONES';
  S.numSheets     = clamp(parseInt(document.getElementById('c-sheets').value)  || 1,  1, 20);
  const probsInput = document.getElementById('c-probs');
  const rawProbs = parseInt(probsInput.value) || 16;
  S.probsPerSheet = clamp(rawProbs, 1, 60);
  S.cols          = clamp(parseInt(colsInput.value) || 4, 1, 6);
  S.kind          = document.getElementById('c-kind').value;

  if (prevKind !== S.kind) {
    const titleInput = document.getElementById('c-title');
    const t = titleInput.value.trim().toUpperCase();
    if (S.kind === 'place' && (t === 'OPERACIONES' || t === 'SUMAS')) {
      titleInput.value = 'VALOR POSICIONAL';
      S.title = 'VALOR POSICIONAL';
    }
    if (S.kind === 'ops' && t === 'VALOR POSICIONAL') {
      titleInput.value = 'OPERACIONES';
      S.title = 'OPERACIONES';
    }
  }

  S.operation     = document.getElementById('c-op').value;
  S.divMode       = document.getElementById('c-div-mode').value;
  S.placeLevel    = document.getElementById('c-place-level').value;
  S.placeBlocks   = document.getElementById('c-place-blocks').checked;
  S.decimals      = clamp(parseInt(decInput.value) || 0, 0, 4);
  S.sep           = document.getElementById('c-sep').value;
  S.allowCarry    = document.getElementById('c-carry').checked;
  S.showAns       = showAnsInput.checked;
  S.showAnsSheet  = document.getElementById('c-ans-sheet').checked;
  S.showSelfEval  = document.getElementById('c-selfeval').checked;

  if (S.kind === 'place') {
    if (prevKind === 'ops') {
      S.probsOps = S.probsPerSheet;
      S.colsOps = S.cols;
      S.decimalsOps = S.decimals;
      S.showAnsOps = S.showAns;
    }

    if (prevKind !== 'place') {
      S.probsPerSheet = (S.placeLevel === 'hundreds') ? S.probsPlaceHundreds : S.probsPlaceTens;
    }

    if (prevKind === 'place' && prevPlaceLevel !== S.placeLevel) {
      S.probsPerSheet = (S.placeLevel === 'hundreds') ? S.probsPlaceHundreds : S.probsPlaceTens;
    }

    S.cols = 2;
    colsInput.value = '2';
    const maxPlaceProblems = 6;
    probsInput.max = String(maxPlaceProblems);
    S.probsPerSheet = clamp(S.probsPerSheet, 1, maxPlaceProblems);
    probsInput.value = String(S.probsPerSheet);

    if (S.placeLevel === 'hundreds') {
      S.probsPlaceHundreds = S.probsPerSheet;
    } else {
      S.probsPlaceTens = S.probsPerSheet;
    }

    S.decimals = 0;
    decInput.value = '0';
    S.showAns = false;
    showAnsInput.checked = false;
  } else {
    if (prevKind === 'place') {
      S.probsPerSheet = S.probsOps;
      probsInput.value = String(S.probsPerSheet);
      S.cols = S.colsOps;
      colsInput.value = String(S.colsOps);
      S.decimals = S.decimalsOps;
      decInput.value = String(S.decimalsOps);
      S.showAns = S.showAnsOps;
      showAnsInput.checked = S.showAnsOps;
    } else {
      S.probsPerSheet = clamp(rawProbs, 1, 60);
      S.probsOps = S.probsPerSheet;
      S.colsOps = S.cols;
      S.decimalsOps = S.decimals;
      S.showAnsOps = S.showAns;
    }

    if (S.operation === 'div' && S.divMode === 'steps') {
      S.cols = clamp(S.cols, 1, 3);
      colsInput.value = String(S.cols);
      colsInput.max = '3';
      const maxDivStepsProblems = S.cols * 4;
      probsInput.max = String(maxDivStepsProblems);
      S.probsPerSheet = clamp(S.probsPerSheet, 1, maxDivStepsProblems);
      probsInput.value = String(S.probsPerSheet);
    } else {
      probsInput.max = '60';
      colsInput.max = '6';
    }
  }

  if (S.operation === 'mul' || S.operation === 'div') {
    S.decimals = 0;
    document.getElementById('c-dec').value = '0';
  }

  const requestedN = clamp(parseInt(document.getElementById('c-addends').value) || 2, 2, 6);
  const desiredN = (S.kind === 'ops' && S.operation === 'add') ? requestedN : 2;

  let needRebuild = (desiredN !== S.numAddends) || (prevOp !== S.operation);
  S.numAddends = desiredN;
  while (S.digitCounts.length < S.numAddends) S.digitCounts.push(2);
  S.digitCounts = S.digitCounts.slice(0, S.numAddends);
  if (needRebuild) buildDigitCountsRow();

  // Sincronizar digitCounts con los inputs dinámicos
  document.querySelectorAll('#dc-row .dc-inp').forEach(inp => {
    const idx = parseInt(inp.dataset.idx);
    if (idx < S.numAddends) {
      S.digitCounts[idx] = clamp(parseInt(inp.value) || 1, 1, 6);
    }
  });

  if (S.kind === 'ops' && S.operation === 'div' && S.digitCounts[1] > S.digitCounts[0]) {
    S.digitCounts[1] = S.digitCounts[0];
    const last = document.querySelector('#dc-row .dc-inp[data-idx="1"]');
    if (last) last.value = String(S.digitCounts[1]);
  }
}

// ─────────────────────────────────────────────
// FILA DINÁMICA DE DÍGITOS POR SUMANDO
// ─────────────────────────────────────────────

function buildDigitCountsRow() {
  const row = document.getElementById('dc-row');
  const sepMap = { add: '+', sub: '-', mul: 'x', div: '/' };
  const sep = sepMap[S.operation] || '+';
  let h = '';
  for (let i = 0; i < S.numAddends; i++) {
    if (i > 0) h += `<span class="dc-sep">${sep}</span>`;
    h += `<input
      type="number"
      class="dc-inp"
      value="${S.digitCounts[i] || 2}"
      min="1" max="6"
      data-idx="${i}"
      oninput="onDigitCountChange(this)"
    >`;
  }
  row.innerHTML = h;
}

function onDigitCountChange(el) {
  const idx = parseInt(el.dataset.idx);
  S.digitCounts[idx] = clamp(parseInt(el.value) || 1, 1, 6);
  genAndPreview();
}

// ─────────────────────────────────────────────
// CICLOS DE ACTUALIZACIÓN
//
// onDisplayChange  → solo re-renderiza (el título cambió, las columnas, etc.)
//                    NO regenera los problemas existentes.
//
// genAndPreview    → regenera todos los problemas Y re-renderiza.
//                    Se usa cuando cambia algo estructural (nº sumandos,
//                    dígitos, decimales, llevadas, nº de hojas/problemas).
//
// regen()          → botón "Nueva generación" — siempre regenera.
// ─────────────────────────────────────────────

function onDisplayChange() {
  readControls();
  updateProblemControlsUI();
  renderPreview();
}

function genAndPreview() {
  readControls();
  updateProblemControlsUI();
  genAll();
  renderPreview();
}

function regen() {
  genAndPreview();
}

let noticeTimer = null;

function showNotice(message, type, timeoutMs) {
  const notice = document.getElementById('notice');
  if (!notice) return;

  notice.className = '';
  notice.classList.add('notice-' + (type || 'info'));
  notice.textContent = message;
  notice.style.display = 'block';

  if (noticeTimer) clearTimeout(noticeTimer);
  if (timeoutMs && timeoutMs > 0) {
    noticeTimer = setTimeout(() => {
      notice.style.display = 'none';
      notice.textContent = '';
    }, timeoutMs);
  }
}

// ─────────────────────────────────────────────
// EXPORTACIÓN PDF
//
// Exportamos página por página con html2canvas + jsPDF para evitar
// cortes y desorden de paginado entre navegadores.
// ─────────────────────────────────────────────

async function exportPDF() {
  const hasHtml2Canvas = (typeof html2canvas === 'function');
  const hasJsPDF = Boolean(window.jspdf && typeof window.jspdf.jsPDF === 'function');
  if (!hasHtml2Canvas || !hasJsPDF) {
    showNotice('No se pudo cargar el motor PDF. Revisa tu conexion, bloqueadores o abre con servidor local.', 'error', 7000);
    return;
  }

  const btn = document.getElementById('btn-pdf');
  btn.textContent = 'Generando…';
  btn.disabled    = true;

  // Overlay de carga — cubre toda la pantalla durante el render.
  const cover = document.createElement('div');
  cover.className = 'pdf-cover';
  cover.innerHTML = '<div class="pdf-cover__msg">Generando PDF, por favor espera…</div>';
  document.body.appendChild(cover);

  // Contenedor temporal montado en el DOM para capturas consistentes.
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:0;top:0;width:794px;pointer-events:none;background:white;transform:translateX(-200vw);';
  wrap.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wrap);

  try {
    readControls();
    updateProblemControlsUI();
    genAll();

    // Páginas de fichas
    for (let s = 0; s < S.numSheets; s++) {
      const tmp  = document.createElement('div');
      tmp.innerHTML = renderWsPage(s, S.numSheets, true);
      const page = tmp.firstChild;
      page.style.height         = '1123px';
      page.style.pageBreakAfter = 'always';
      wrap.appendChild(page);
    }

    // Respuestas: agrupamos varias fichas por pagina para no fragmentar en exceso.
    if (S.showAnsSheet) {
      const answerBlocksPerPage =
        (S.probsPerSheet <= 8) ? 3 :
        (S.probsPerSheet <= 20 ? 2 : 1);
      const totalAnsPages = Math.ceil(S.numSheets / answerBlocksPerPage);
      for (let p = 0; p < totalAnsPages; p++) {
        const from = p * answerBlocksPerPage;
        const to = Math.min(S.numSheets, from + answerBlocksPerPage);
        const sheetIndices = [];
        for (let s = from; s < to; s++) sheetIndices.push(s);

        const tmp = document.createElement('div');
        tmp.innerHTML = renderAnsSheetPage(sheetIndices, p + 1, totalAnsPages, true);
        const ans = tmp.firstChild;
        ans.style.height         = '1123px';
        ans.style.pageBreakAfter = 'always';
        wrap.appendChild(ans);
      }
    }

    // Dos frames para que el navegador termine de calcular estilos y layout
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const pages = Array.from(wrap.children);
    if (!pages.length) throw new Error('No hay contenido para exportar');

    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0
      });

      const img = canvas.toDataURL('image/jpeg', 0.98);
      if (i > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    }

    pdf.save('fichas-matematicas.pdf');

  } catch (err) {
    console.error('[exportPDF]', err);
    showNotice('Error al generar el PDF: ' + err.message, 'error', 7000);
  } finally {
    if (document.body.contains(wrap))  document.body.removeChild(wrap);
    if (document.body.contains(cover)) document.body.removeChild(cover);
    btn.textContent = '↓ Exportar PDF';
    btn.disabled    = false;
  }
}

function updateProblemControlsUI() {
  const isOps = (S.kind === 'ops');
  const isAdd = (S.operation === 'add');

  const colsInput = document.getElementById('c-cols');
  const colsField = document.getElementById('cols-field');
  const probsHelp = document.getElementById('probs-help');
  const addendsInput = document.getElementById('c-addends');
  const opField = document.getElementById('op-field');
  const divModeField = document.getElementById('divmode-field');
  const addendsField = document.getElementById('addends-field');
  const addendsLabel = document.querySelector('label[for="c-addends"]');
  const digitsWrap = document.getElementById('dc-wrap');
  const digitsLabel = document.querySelector('#dc-wrap > span');
  const placeConfig = document.getElementById('place-config');
  const carryField = document.getElementById('carry-field');
  const decimalsInput = document.getElementById('c-dec');
  const decimalsField = document.getElementById('dec-field');
  const sepField = document.getElementById('sep-field');
  const showAnsField = document.getElementById('c-show-ans').closest('.field');

  if (!isOps) {
    opField.style.display = 'none';
    divModeField.style.display = 'none';
    addendsField.style.display = 'none';
    digitsWrap.style.display = 'none';
    carryField.style.display = 'none';
    decimalsField.style.display = 'none';
    sepField.style.display = 'none';
    placeConfig.style.display = '';
    colsField.style.display = 'none';
    colsInput.value = '2';
    colsInput.disabled = true;
    probsHelp.innerHTML = '<i class="bi bi-info-circle"></i> En valor posicional usa maximo 6 por hoja para evitar desbordes.';
    showAnsField.style.display = 'none';
    return;
  }

  opField.style.display = '';
  divModeField.style.display = (S.operation === 'div') ? '' : 'none';
  placeConfig.style.display = 'none';
  colsField.style.display = '';
  colsInput.disabled = false;
  probsHelp.innerHTML = '<i class="bi bi-info-circle"></i> En operaciones se permiten hasta 60 por hoja.';
  if (S.operation === 'div' && S.divMode === 'steps') {
    probsHelp.innerHTML = '<i class="bi bi-info-circle"></i> En division por pasos el maximo depende de columnas (4 filas por pagina).';
  }
  showAnsField.style.display = '';

  if (isAdd) {
    addendsLabel.innerHTML = '<i class="bi bi-diagram-3"></i> Sumandos';
    addendsField.style.display = '';
    addendsInput.disabled = false;
    digitsLabel.textContent = 'Digitos por sumando';
    digitsWrap.style.display = '';
    carryField.style.display = '';
    decimalsInput.disabled = false;
    decimalsField.style.display = '';
    sepField.style.display = '';
    return;
  }

  const opNames = {
    sub: 'Operandos',
    mul: 'Factores',
    div: 'Dividendo / divisor'
  };

  addendsLabel.innerHTML = '<i class="bi bi-diagram-3"></i> ' + (opNames[S.operation] || 'Operandos');
  addendsField.style.display = 'none';
  addendsInput.value = '2';
  addendsInput.disabled = true;
  const digitsLegend = {
    sub: 'Digitos por operando',
    mul: 'Digitos por factor',
    div: 'Digitos: dividendo y divisor'
  };
  digitsLabel.textContent = digitsLegend[S.operation] || 'Digitos por operando';
  digitsWrap.style.display = '';
  carryField.style.display = 'none';

  if (S.operation === 'mul' || S.operation === 'div') {
    decimalsInput.value = '0';
    decimalsInput.disabled = true;
    sepField.style.display = 'none';
  } else {
    decimalsInput.disabled = false;
    sepField.style.display = '';
  }
  decimalsField.style.display = '';

  buildDigitCountsRow();
}

// ─────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────

function init() {
  buildDigitCountsRow();
  genAndPreview();

  // ── Controles de VISUALIZACIÓN ──────────────────────────────────────────
  // Cambiar estos no toca los problemas generados, solo re-renderiza.
  const displayIds = ['c-title', 'c-cols', 'c-sep', 'c-show-ans', 'c-ans-sheet', 'c-selfeval'];
  displayIds.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', onDisplayChange);
    if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'number')) {
      el.addEventListener('input', onDisplayChange);
    }
  });

  // ── Controles ESTRUCTURALES ─────────────────────────────────────────────
  // Cambiar estos invalida los problemas actuales → regenerar.
  const structIds = ['c-sheets', 'c-probs', 'c-kind', 'c-op', 'c-div-mode', 'c-place-level', 'c-place-blocks', 'c-addends', 'c-dec', 'c-carry'];
  structIds.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', genAndPreview);
    if (el.tagName === 'INPUT' && el.type === 'number') {
      el.addEventListener('input', genAndPreview);
    }
  });

  window.addEventListener('resize', renderPreview);
}

document.addEventListener('DOMContentLoaded', init);
