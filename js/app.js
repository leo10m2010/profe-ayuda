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
  const illEnabledInput = document.getElementById('c-ill-enabled');
  const illModeInput = document.getElementById('c-ill-mode');
  const illFileInput = document.getElementById('c-ill-file');

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
  S.illustrationEnabled = illEnabledInput.checked;
  S.illustrationMode = illModeInput.value;
  S.illustrationFile = illFileInput.value.trim();

  if (S.illustrationMode === 'manual' && S.illustrationFile && S.illustrationUploadedUrl) {
    URL.revokeObjectURL(S.illustrationUploadedUrl);
    S.illustrationUploadedUrl = '';
  }

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

function applyUploadedIllustration(file) {
  if (!file) return;

  const looksImage = (file.type && file.type.startsWith('image/')) || /\.(svg|png|jpe?g|webp)$/i.test(file.name || '');
  if (!looksImage) {
    showNotice('Archivo no valido. Usa SVG, PNG, JPG o WEBP.', 'error', 4500);
    return;
  }

  if (S.illustrationUploadedUrl) {
    URL.revokeObjectURL(S.illustrationUploadedUrl);
  }

  S.illustrationUploadedUrl = URL.createObjectURL(file);
  document.getElementById('c-ill-enabled').checked = true;
  document.getElementById('c-ill-mode').value = 'manual';
  document.getElementById('c-ill-file').value = '';

  readControls();
  updateProblemControlsUI();
  renderPreview();
  showNotice('Ilustracion cargada correctamente.', 'success', 2600);
}

function installIllustrationEditor(container, scale) {
  const img = container.querySelector('.ws-ill-img');
  const toolbar = container.querySelector('.ws-ill-toolbar');
  if (!img || !toolbar || !S.illustrationEnabled) return;

  const page = img.closest('.ws-page-el') || container;

  const sizeR = toolbar.querySelector('.ill-size');
  const opaR = toolbar.querySelector('.ill-opacity');
  const resetBtn = toolbar.querySelector('.ill-reset');

  const applyTransform = (x, y, scalePct) => `translate(${x}px, ${-y}px) scale(${Math.max(0.4, Math.min(3, scalePct / 100))})`;
  const getLimit = (scalePct) => {
    const factor = Math.max(0.4, Math.min(3, scalePct / 100));
    return Math.round(220 / Math.max(factor, 0.4));
  };

  const applyStyle = () => {
    img.style.width = `${img.dataset.baseW ? Number(img.dataset.baseW) : 240}px`;
    img.style.opacity = String(Math.max(0, Math.min(1, S.illustrationOpacity / 100)));
    const lim = getLimit(S.illustrationScale);
    S.illustrationOffsetX = clamp(S.illustrationOffsetX, -lim, lim);
    S.illustrationOffsetY = clamp(S.illustrationOffsetY, -lim, lim);
    img.style.transform = applyTransform(S.illustrationOffsetX, S.illustrationOffsetY, S.illustrationScale);
    if (sizeR) sizeR.value = String(S.illustrationScale);
    if (opaR) opaR.value = String(S.illustrationOpacity);
  };

  applyStyle();
  img.draggable = false;
  img.style.pointerEvents = 'none';
  img.classList.add('ws-ill-editable');

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = S.illustrationOffsetX;
  let baseY = S.illustrationOffsetY;

  const hitImageArea = (e) => {
    const r = img.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };

  const startDrag = e => {
    if (!hitImageArea(e)) return;
    if (toolbar.contains(e.target)) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    baseX = S.illustrationOffsetX;
    baseY = S.illustrationOffsetY;
    page.setPointerCapture(e.pointerId);
    img.classList.add('ws-ill-selected');
  };

  const onDragMove = e => {
    if (!dragging) return;
    const dx = Math.round((e.clientX - startX) / Math.max(scale, 0.01));
    const dy = Math.round((e.clientY - startY) / Math.max(scale, 0.01));
    const lim = getLimit(S.illustrationScale);
    const nx = clamp(baseX + dx, -lim, lim);
    const ny = clamp(baseY - dy, -lim, lim);
    S.illustrationOffsetX = nx;
    S.illustrationOffsetY = ny;
    img.style.transform = applyTransform(nx, ny, S.illustrationScale);
    img.classList.add('ws-ill-selected');
  };

  const endDrag = e => {
    if (!dragging) return;
    dragging = false;
    const dx = Math.round((e.clientX - startX) / Math.max(scale, 0.01));
    const dy = Math.round((e.clientY - startY) / Math.max(scale, 0.01));
    const lim = getLimit(S.illustrationScale);
    S.illustrationOffsetX = clamp(baseX + dx, -lim, lim);
    S.illustrationOffsetY = clamp(baseY - dy, -lim, lim);
    applyStyle();
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
  };

  const cancelDrag = () => {
    dragging = false;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
  };

  const startDragWithListeners = (e) => {
    startDrag(e);
    if (!dragging) return;
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);
  };

  page.addEventListener('pointerdown', startDragWithListeners);

  if (sizeR) {
    sizeR.value = String(S.illustrationScale);
    sizeR.addEventListener('input', () => {
      S.illustrationScale = clamp(parseInt(sizeR.value) || 100, 40, 220);
      applyStyle();
    });
  }

  if (opaR) {
    opaR.value = String(S.illustrationOpacity);
    opaR.addEventListener('input', () => {
      S.illustrationOpacity = clamp(parseInt(opaR.value) || 14, 0, 100);
      applyStyle();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      S.illustrationScale = 100;
      S.illustrationOpacity = 14;
      S.illustrationOffsetX = 0;
      S.illustrationOffsetY = 0;
      applyStyle();
    });
  }
}

async function waitForImagesReady(root, timeoutMs) {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (!imgs.length) return;

  const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs || 2500));
  const done = Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => resolve();
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
    });
  }));

  await Promise.race([done, timeout]);
}

async function inlineIllustrationsForExport(root) {
  const isFileProtocol = (window.location.protocol === 'file:');
  let skippedByFileProtocol = false;

  const imgs = Array.from(root.querySelectorAll('.ws-ill-img'));
  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;

    // En file:// el navegador bloquea fetch de rutas locales por CORS.
    if (isFileProtocol && !/^(https?:)?\/\//.test(src)) {
      skippedByFileProtocol = true;
      continue;
    }

    try {
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise(resolve => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => resolve('');
        fr.readAsDataURL(blob);
      });
      if (dataUrl) img.setAttribute('src', dataUrl);
    } catch {
      // Si no se puede inyectar (ej: file:// o CORS externo), seguimos.
    }
  }

  return { skippedByFileProtocol };
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
    const inlineRes = await inlineIllustrationsForExport(wrap);
    await waitForImagesReady(wrap, 3000);

    if (inlineRes && inlineRes.skippedByFileProtocol) {
      showNotice('En modo file:// el navegador limita imagenes locales en PDF. Para incluirlas, usa servidor local o sube la imagen en modo manual.', 'info', 7000);
    }

    const pages = Array.from(wrap.children);
    if (!pages.length) throw new Error('No hay contenido para exportar');

    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    for (let i = 0; i < pages.length; i++) {
      let canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0
      });

      let img;
      try {
        img = canvas.toDataURL('image/jpeg', 0.98);
      } catch (e) {
        // Fallback para canvas contaminado por recursos externos sin CORS.
        const ill = pages[i].querySelector('.ws-ill-img');
        if (!ill) throw e;

        const prevDisplay = ill.style.display;
        ill.style.display = 'none';
        canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0
        });
        ill.style.display = prevDisplay;
        img = canvas.toDataURL('image/jpeg', 0.98);

        showNotice('Se omitio la ilustracion en una pagina del PDF por restriccion CORS.', 'info', 5000);
      }

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
  const illEnabledField = document.getElementById('ill-enabled-field');
  const illModeField = document.getElementById('ill-mode-field');
  const illFileField = document.getElementById('ill-file-field');
  const illUploadField = document.getElementById('ill-upload-field');
  const illDropzone = document.getElementById('ill-dropzone');
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

    illEnabledField.style.display = '';
    illModeField.style.display = S.illustrationEnabled ? '' : 'none';
    illFileField.style.display = (S.illustrationEnabled && S.illustrationMode === 'manual') ? '' : 'none';
    illUploadField.style.display = (S.illustrationEnabled && S.illustrationMode === 'manual') ? '' : 'none';
    illDropzone.style.display = (S.illustrationEnabled && S.illustrationMode === 'manual') ? '' : 'none';
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

  illEnabledField.style.display = '';
  illModeField.style.display = S.illustrationEnabled ? '' : 'none';
  illFileField.style.display = (S.illustrationEnabled && S.illustrationMode === 'manual') ? '' : 'none';
  illUploadField.style.display = (S.illustrationEnabled && S.illustrationMode === 'manual') ? '' : 'none';
  illDropzone.style.display = (S.illustrationEnabled && S.illustrationMode === 'manual') ? '' : 'none';

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
  const displayIds = ['c-title', 'c-cols', 'c-sep', 'c-show-ans', 'c-ans-sheet', 'c-selfeval', 'c-ill-enabled', 'c-ill-mode', 'c-ill-file'];
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

  const illUpload = document.getElementById('c-ill-upload');
  illUpload.addEventListener('change', () => {
    const file = illUpload.files && illUpload.files[0];
    applyUploadedIllustration(file);
    illUpload.value = '';
  });

  const dropzone = document.getElementById('ill-dropzone');
  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', e => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    applyUploadedIllustration(file);
  });

  window.addEventListener('resize', renderPreview);
}

document.addEventListener('DOMContentLoaded', init);
