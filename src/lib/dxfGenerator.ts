// src/lib/dxfGenerator.ts
// CNC va Formatli-kesish stanoklari uchun AutoCAD DXF (R12 / R2000) generator

import { SheetLayout, PlacedItem, UsefulOffcut, RaskroyResult } from './raskroyEngine';

/**
 * Creates an AutoCAD DXF R12 text file for a given SheetLayout.
 * Layers:
 * - SHEET_OUTLINE (List chegarasi - Qizil/Oq)
 * - TRIM_MARGIN (Kesish tozalash maydoni - Ko'k)
 * - CUT_PARTS (Kesilgan detallar - Yashil)
 * - PART_LABELS (Yozuvlar va o'lchamlar - Oq)
 * - OFFCUTS (Foydali qiyqimlar - Sariq)
 */
export function generateSheetDxf(sheet: SheetLayout, sheetTitle?: string): string {
  const title = sheetTitle || `Sheet_${sheet.sheetIndex}`;
  const lines: string[] = [];

  function add(code: number | string, val: number | string) {
    lines.push(String(code));
    lines.push(String(val));
  }

  // --- HEADER SECTION ---
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009'); // AutoCAD R12 standard
  add(9, '$INSUNITS');
  add(70, 4); // Millimeters
  add(0, 'ENDSEC');

  // --- TABLES SECTION ---
  add(0, 'SECTION');
  add(2, 'TABLES');
  
  // Layer Table
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 5);

  function defineLayer(name: string, color: number) {
    add(0, 'LAYER');
    add(2, name);
    add(70, 0);
    add(62, color); // 1: red, 2: yellow, 3: green, 4: cyan, 5: blue, 7: white
    add(6, 'CONTINUOUS');
  }

  defineLayer('SHEET_OUTLINE', 1); // Red
  defineLayer('TRIM_MARGIN', 4);   // Cyan
  defineLayer('CUT_PARTS', 3);     // Green
  defineLayer('PART_LABELS', 7);   // White
  defineLayer('OFFCUTS', 2);       // Yellow

  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // --- BLOCKS SECTION ---
  add(0, 'SECTION');
  add(2, 'BLOCKS');
  add(0, 'ENDSEC');

  // --- ENTITIES SECTION ---
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  function addPolylineRect(x: number, y: number, w: number, h: number, layer: string) {
    add(0, 'POLYLINE');
    add(8, layer);
    add(66, 1);
    add(70, 1); // Closed polyline

    const points = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h]
    ];

    points.forEach(([px, py]) => {
      add(0, 'VERTEX');
      add(8, layer);
      add(10, px);
      add(20, py);
      add(30, 0);
    });

    add(0, 'SEQEND');
  }

  function addText(x: number, y: number, text: string, height: number = 25, layer: string = 'PART_LABELS') {
    add(0, 'TEXT');
    add(8, layer);
    add(10, x);
    add(20, y);
    add(30, 0);
    add(40, height);
    add(1, text);
    add(72, 1); // Center alignment
    add(11, x);
    add(21, y);
    add(31, 0);
  }

  // 1. Sheet outer border
  addPolylineRect(0, 0, sheet.sheetWidth, sheet.sheetHeight, 'SHEET_OUTLINE');

  // 2. Add sheet title at the top
  addText(sheet.sheetWidth / 2, sheet.sheetHeight + 50, `${title} - ${sheet.sheetWidth}x${sheet.sheetHeight}mm (Chiqindi: ${sheet.wastePercent}%)`, 35);

  // 3. Placed parts
  sheet.items.forEach((item) => {
    // Part rectangle
    addPolylineRect(item.x, item.y, item.w, item.h, 'CUT_PARTS');

    // Text in center
    const centerX = item.x + item.w / 2;
    const centerY = item.y + item.h / 2;

    const textSize = Math.min(30, Math.max(14, Math.min(item.w, item.h) / 8));
    addText(centerX, centerY + textSize, item.name, textSize, 'PART_LABELS');
    addText(centerX, centerY - textSize * 0.5, `${Math.round(item.w)}x${Math.round(item.h)}mm`, textSize * 0.8, 'PART_LABELS');

    // Kromka note if present
    const edges = item.edgeInfo;
    if (edges && (edges.top || edges.bottom || edges.left || edges.right)) {
      const edgeStr = `Kr: T:${edges.top || '-'} P:${edges.bottom || '-'} Ch:${edges.left || '-'} O:${edges.right || '-'}`;
      addText(centerX, centerY - textSize * 1.8, edgeStr, textSize * 0.6, 'PART_LABELS');
    }
  });

  // 4. Useful offcuts
  if (sheet.usefulOffcuts && sheet.usefulOffcuts.length > 0) {
    sheet.usefulOffcuts.forEach((offcut) => {
      addPolylineRect(offcut.x, offcut.y, offcut.w, offcut.h, 'OFFCUTS');
      const cx = offcut.x + offcut.w / 2;
      const cy = offcut.y + offcut.h / 2;
      addText(cx, cy, `QIYQIM ${Math.round(offcut.w)}x${Math.round(offcut.h)}mm`, 22, 'OFFCUTS');
    });
  }

  // --- ENDSEC & EOF ---
  add(0, 'ENDSEC');
  add(0, 'EOF');

  return lines.join('\r\n');
}

/**
 * Download a generated DXF file directly in browser.
 */
export function downloadDxfFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dxf') ? filename : `${filename}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
