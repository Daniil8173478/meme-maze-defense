/* ===== Геометрия лабиринта: сетка и генерация пути ===== */
const GRID_COLS = 12;
const GRID_ROWS = 8;

/* Горизонтальный "змейка"-путь на сетке COLS x ROWS.
   Возвращает упорядоченный список соседних ячеек [c,r]. */
function genPathH(COLS, ROWS, o) {
  const rows = [];
  for (let r = o.top; r < ROWS; r += o.step) rows.push(r);
  const wp = [];
  let right = o.startRight;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (right) { for (let c = 0; c < COLS; c++) wp.push([c, r]); }
    else { for (let c = COLS - 1; c >= 0; c--) wp.push([c, r]); }
    if (i < rows.length - 1) {
      const nr = rows[i + 1];
      const c = right ? COLS - 1 : 0;
      for (let rr = r + 1; rr < nr; rr++) wp.push([c, rr]);
    }
    right = !right;
  }
  return wp;
}

/* Строит коридор-путь по углам (corners): соседние углы делят строку или столбец. */
function pathFromCorners(corners) {
  const cells = [];
  for (let i = 0; i < corners.length; i++) {
    const c0 = corners[i][0], r0 = corners[i][1];
    if (i === 0) { cells.push([c0, r0]); continue; }
    const pc = corners[i - 1][0], pr = corners[i - 1][1];
    if (pc === c0) { const st = r0 > pr ? 1 : -1; for (let r = pr + st; r !== r0 + st; r += st) cells.push([c0, r]); }
    else { const st = c0 > pc ? 1 : -1; for (let c = pc + st; c !== c0 + st; c += st) cells.push([c, r0]); }
  }
  return cells;
}

/* Путь с учётом конфигурации (углы или змейка). */
function buildPathCells(cfg) {
  if (cfg.corners) return pathFromCorners(cfg.corners);
  if (cfg.orient === "v") {
    const raw = genPathH(GRID_ROWS, GRID_COLS, cfg);
    return raw.map(([a, b]) => [b, a]);
  }
  return genPathH(GRID_COLS, GRID_ROWS, cfg);
}

/* Уникальная карта-лабиринт для каждого из 10 уровней (12x8). */
const LEVEL_MAPS = [
  { corners: [[0, 1], [10, 1], [10, 3], [1, 3], [1, 5], [11, 5]] },                                             // 1 — тройная змейка
  { corners: [[1, 0], [1, 6], [3, 6], [3, 1], [5, 1], [5, 6], [7, 6], [7, 1], [9, 1], [9, 6], [11, 6]] },       // 2 — гребёнка сверху
  { corners: [[0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [6, 4], [6, 6], [8, 6], [8, 3], [11, 3]] },               // 3 — лесенка вниз
  { corners: [[0, 4], [3, 4], [3, 1], [7, 1], [7, 6], [10, 6], [10, 2], [11, 2]] },                             // 4 — петля
  { corners: [[2, 7], [2, 1], [5, 1], [5, 6], [8, 6], [8, 1], [10, 1], [10, 7], [11, 7]] },                     // 5 — зигзаг снизу
  { corners: [[11, 1], [1, 1], [1, 3], [10, 3], [10, 5], [1, 5], [1, 7], [11, 7]] },                            // 6 — меандр справа
  { corners: [[0, 0], [10, 0], [10, 2], [1, 2], [1, 4], [10, 4], [10, 6], [1, 6], [1, 7]] },                    // 7 — меандр слева
  { corners: [[0, 7], [0, 1], [3, 1], [3, 6], [6, 6], [6, 1], [9, 1], [9, 6], [11, 6]] },                       // 8 — гребёнка снизу
  { corners: [[0, 7], [3, 7], [3, 5], [6, 5], [6, 3], [9, 3], [9, 1], [11, 1]] },                               // 9 — лесенка вверх
  { corners: [[0, 0], [4, 0], [4, 3], [1, 3], [1, 5], [7, 5], [7, 2], [10, 2], [10, 6], [3, 6], [3, 7]] }       // 10 — большой лабиринт
];
const ENDLESS_MAP = { orient: "h", step: 2, top: 1, startRight: true };

/* Строит полную геометрию пути: ячейки, множество занятых, ключевые точки
   с виртуальным входом/выходом за краем поля и метрикой длины (в ячейках). */
function makePath(cfg) {
  const cells = buildPathCells(cfg);
  const pathSet = new Set(cells.map(([c, r]) => c + "," + r));
  // точки-центры ячеек
  const pts = cells.map(([c, r]) => ({ c: c + 0.5, r: r + 0.5 }));
  // виртуальный вход (за краем) и выход
  const first = pts[0], second = pts[1];
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const entry = { c: first.c + (first.c - second.c), r: first.r + (first.r - second.r) };
  const exit = { c: last.c + (last.c - prev.c), r: last.r + (last.r - prev.r) };
  const way = [entry, ...pts, exit];
  // длины сегментов
  const seg = [];
  let total = 0;
  for (let i = 0; i < way.length - 1; i++) {
    const dc = way[i + 1].c - way[i].c, dr = way[i + 1].r - way[i].r;
    const L = Math.hypot(dc, dr);
    seg.push(L); total += L;
  }
  return { cells, pathSet, way, seg, total, entryCell: cells[0], exitCell: cells[cells.length - 1] };
}
