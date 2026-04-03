# Generador de Fichas

Aplicacion web para crear fichas imprimibles de matematicas en primaria.

## Que incluye

- Fichas de **operaciones**: suma, resta, multiplicacion y division.
- Modo de **valor posicional**: decenas/unidades y centenas/decenas/unidades.
- Vista previa en pantalla y exportacion a **PDF**.
- Hoja de respuestas opcional.
- Configuracion rapida desde panel lateral.
- Ilustraciones opcionales con control de tamano, posicion y transparencia.
- Carga manual de ilustraciones por boton o arrastrando archivos (drag and drop).

## Tecnologias

- HTML + CSS + JavaScript (sin framework)
- `html2canvas` + `jsPDF` para exportar PDF en cliente
- Bootstrap Icons para iconografia

## Estructura

- `index.html`: interfaz principal y controles
- `css/style.css`: estilos de la UI
- `js/state.js`: estado global
- `js/generator.js`: generacion de ejercicios
- `js/formatter.js`: formato de numeros y texto
- `js/renderer.js`: render de fichas y respuestas
- `js/app.js`: eventos, sincronizacion UI y exportacion PDF
- `assets/illustrations/`: ilustraciones opcionales para decorar fichas

## Uso local

> Recomendado: ejecutar con servidor local (no abrir con `file://`).

### Opcion 1 (Python)

```bash
python3 -m http.server 8000
```

Luego abre:

`http://localhost:8000`

### Opcion 2 (VS Code)

Usa extension **Live Server** y abre la pagina desde el servidor local.

## Flujo rapido

1. Elige **Tipo de ficha** (Operaciones o Valor posicional).
2. Ajusta numero de hojas, problemas y columnas.
3. Configura parametros del tipo seleccionado.
4. Pulsa **Nueva generacion**.
5. Pulsa **Exportar PDF**.

## Notas

- En division por pasos se limita el layout para evitar desbordes.
- En valor posicional hay limites de ejercicios por hoja para mantener legibilidad.

## Autor

Proyecto preparado para uso educativo.
