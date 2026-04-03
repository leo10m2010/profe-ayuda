/**
 * state.js — Estado global compartido por todos los módulos.
 * Se inicializa con los valores por defecto que coinciden con los
 * controles del HTML.
 */
const S = {
  title:        'OPERACIONES',
  numSheets:    3,
  probsPerSheet: 16,
  probsOps:     16,
  probsPlaceTens: 6,
  probsPlaceHundreds: 6,
  colsOps:      4,
  decimalsOps:  0,
  showAnsOps:   false,
  illustrationEnabled: false,
  illustrationMode: 'auto',
  illustrationFile: '',
  illustrationUploadedUrl: '',
  illustrationScale: 100,
  illustrationOpacity: 14,
  illustrationOffsetX: 0,
  illustrationOffsetY: 0,
  cols:         4,
  kind:         'ops',
  operation:    'add',
  divMode:      'steps',
  placeLevel:   'tens',
  placeBlocks:  true,
  numAddends:   2,
  digitCounts:  [2, 2],   // dígitos enteros por sumando
  decimals:     0,
  sep:          '.',
  allowCarry:   true,
  showAns:      false,     // mostrar respuesta debajo de la línea en la ficha
  showAnsSheet: true,      // incluir hoja de respuestas al final
  showSelfEval: true,      // mostrar "¿Cómo ha ido?"
  sheets:       []         // Array<Array<Problem>>  (generado en generator.js)
};
