// src/lib/raskroyEngine.ts
// Algoritmik Mebel Kroyi va 2D Guillotine Raskroy Dvigateli

export interface PartItem {
  id: string;
  name: string;
  length: number; // mm (bo'yi)
  width: number;  // mm (eni)
  qty: number;    // soni
  material: 'DSP' | 'DVP' | 'MDF';
  edgeU1?: string; // Uzun tomon 1 kromka ('2.0 mm', '0.4 mm', '—')
  edgeU2?: string; // Uzun tomon 2 kromka
  edgeK1?: string; // Kalta tomon 1 kromka
  edgeK2?: string; // Kalta tomon 2 kromka
  drillingNote?: string; // Priadka / teshiklar
  area: number;    // m²
}

export interface MebelKroyInput {
  type: 'shkaf' | 'tumba' | 'oshxona_pastki' | 'oshxona_ustki' | 'kupe';
  height: number;
  width: number;
  depth: number;
  thickness?: number; // 16 yoki 18 mm (default: 16)
  socleHeight?: number; // Tsokol (default: 80)
  sectionsCount?: number; // Sektsiyalar soni (default: 1)
  shelvesCount?: number; // Jami polkalar soni (default: 3)
  drawersCount?: number; // Tortmalar soni (default: 0)
  doorType?: 'hinged' | 'sliding' | 'none'; // Eshik turi
  doorsCount?: number; // Eshiklar soni (default: 2)
}

export interface RaskroySettings {
  sheetWidth: number;   // Standart: 2750 mm
  sheetHeight: number;  // Standart: 1830 mm
  kerf: number;         // Pilyan arralash qalinligi (standart: 4 mm)
  trim: number;         // List chetidan tozalash (standart: 10 mm)
  allowRotation: boolean; // Detallarni 90 gradusga aylantirishga ruxsat
}

export interface PlacedItem {
  id: string;
  partId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  originalW: number;
  originalH: number;
  rotated: boolean;
  color: string;
  edgeInfo?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface SheetLayout {
  sheetIndex: number;
  sheetWidth: number;
  sheetHeight: number;
  items: PlacedItem[];
  usedArea: number; // m²
  wastePercent: number; // %
  wasteArea: number; // m²
}

export interface RaskroyResult {
  sheets: SheetLayout[];
  totalSheets: number;
  totalDspArea: number;
  totalDvpArea: number;
  totalEdge2mmMeters: number;
  totalEdge04mmMeters: number;
  totalPartsCount: number;
  averageWastePercent: number;
  unplacedParts: PartItem[];
}

const COLOR_PALETTE = [
  '#2563eb', // blue
  '#0d9488', // teal
  '#d97706', // amber
  '#7c3aed', // violet
  '#059669', // emerald
  '#db2777', // pink
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#65a30d', // lime
  '#9333ea', // purple
  '#dc2626', // red
];

/**
 * Mebel turiga qarab to'liq kroy (detallar spetsifikatsiyasi) ni hisoblash
 */
export function calculateMebelKroy(input: MebelKroyInput): {
  parts: PartItem[];
  totalDspArea: number;
  totalDvpArea: number;
  edge2mmMeters: number;
  edge04mmMeters: number;
  summary: string;
} {
  const {
    type = 'shkaf',
    height: H,
    width: W,
    depth: D,
    thickness: T = 16,
    socleHeight: socle = type === 'tumba' ? 0 : type === 'oshxona_ustki' ? 0 : 80,
    sectionsCount: sections = W > 1600 ? 3 : W > 900 ? 2 : 1,
    shelvesCount = 3,
    drawersCount = 0,
    doorType = type === 'tumba' ? 'none' : 'hinged',
    doorsCount = doorType === 'none' ? 0 : W > 900 ? 2 : 1
  } = input;

  const parts: PartItem[] = [];

  const bodyH = H - socle;
  const innerH = bodyH - 2 * T;
  const innerW = W - 2 * T;

  // Har bir sektsiya kengligi
  const sectionDividerCount = Math.max(0, sections - 1);
  const sectionInnerW = Math.round((innerW - sectionDividerCount * T) / sections);

  if (type === 'shkaf' || type === 'kupe') {
    // 1. Yon devorlar (2 dona)
    parts.push({
      id: 'yon_devor',
      name: 'Yon devor (Боковина)',
      length: bodyH,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '0.4 mm (Tepa)',
      edgeK2: '0.4 mm (Past)',
      drillingNote: 'Minifiks / Konfirmat, petlya o‘rni',
      area: (bodyH * D * 2) / 1000000
    });

    // 2. Qopqoq va Tub (Крыша / Дно)
    parts.push({
      id: 'dno_krisha',
      name: 'Qopqoq va Tub (Крыша / Дно)',
      length: innerW,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Uchlariga konfirmat teshiklari',
      area: (innerW * D * 2) / 1000000
    });

    // 3. Tsokol plankasi
    if (socle > 0) {
      parts.push({
        id: 'tsokol',
        name: 'Tsokol plankasi (Цоколь)',
        length: innerW,
        width: socle,
        qty: 2,
        material: 'DSP',
        edgeU1: '0.4 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Podpyatniklar va burchak mahkamlash',
        area: (innerW * socle * 2) / 1000000
      });
    }

    // 4. O'rta to'siqlar (Перегородка)
    if (sectionDividerCount > 0) {
      parts.push({
        id: 'peregorodka',
        name: "O'rta to'siq (Перегородка)",
        length: innerH,
        width: D - 15,
        qty: sectionDividerCount,
        material: 'DSP',
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Polkalar va relslar uchun priadka',
        area: (innerH * (D - 15) * sectionDividerCount) / 1000000
      });
    }

    // 5. Polkalar
    if (shelvesCount > 0) {
      parts.push({
        id: 'polka',
        name: `Polka (${sectionInnerW} mm bo'lim)`,
        length: sectionInnerW,
        width: D - 20,
        qty: shelvesCount,
        material: 'DSP',
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Polkodershatel o‘rni (5mm)',
        area: (sectionInnerW * (D - 20) * shelvesCount) / 1000000
      });
    }

    // 6. Tortmalar (Drawers)
    if (drawersCount > 0) {
      const runnerLen = D >= 550 ? 500 : D >= 500 ? 450 : D >= 450 ? 400 : 350;
      const boxH = 140;
      const drawerBoxW = sectionInnerW - 26;

      parts.push({
        id: 'drawer_sides',
        name: 'Tortma yon devorlari',
        length: runnerLen,
        width: boxH,
        qty: drawersCount * 2,
        material: 'DSP',
        edgeU1: '0.4 mm (Tepa)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Teleskopik rels o‘rni',
        area: (runnerLen * boxH * drawersCount * 2) / 1000000
      });

      parts.push({
        id: 'drawer_front_back',
        name: 'Tortma old/orqa devori',
        length: Math.max(100, drawerBoxW - 2 * T),
        width: boxH,
        qty: drawersCount * 2,
        material: 'DSP',
        edgeU1: '0.4 mm (Tepa)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Konfirmat teshiklari',
        area: (Math.max(100, drawerBoxW - 2 * T) * boxH * drawersCount * 2) / 1000000
      });

      parts.push({
        id: 'drawer_bottom_dvp',
        name: 'Tortma tubi (ДВП)',
        length: drawerBoxW,
        width: runnerLen,
        qty: drawersCount,
        material: 'DVP',
        edgeU1: '—',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Pazga kiradi yoki shurup',
        area: (drawerBoxW * runnerLen * drawersCount) / 1000000
      });

      parts.push({
        id: 'drawer_facade',
        name: 'Tortma fasadi',
        length: sectionInnerW - 4,
        width: Math.min(220, Math.round(innerH / (drawersCount + 1)) - 4),
        qty: drawersCount,
        material: 'DSP',
        edgeU1: '2.0 mm (4 tomoni)',
        edgeU2: '2.0 mm',
        edgeK1: '2.0 mm',
        edgeK2: '2.0 mm',
        drillingNote: 'Tutqich (ruchka) teshiklari',
        area: ((sectionInnerW - 4) * Math.min(220, Math.round(innerH / (drawersCount + 1)) - 4) * drawersCount) / 1000000
      });
    }

    // 7. Eshiklar (Fasad)
    if (doorType === 'hinged' && doorsCount > 0) {
      const doorH = bodyH - (drawersCount > 0 ? (drawersCount * 180) : 0) - 4;
      const doorW = Math.round((W - (doorsCount + 1) * 2) / doorsCount);
      parts.push({
        id: 'shkaf_eshik',
        name: `Eshik fasadi (${doorsCount} dona)`,
        length: Math.max(200, doorH),
        width: doorW,
        qty: doorsCount,
        material: 'DSP',
        edgeU1: '2.0 mm (4 tomoni)',
        edgeU2: '2.0 mm',
        edgeK1: '2.0 mm',
        edgeK2: '2.0 mm',
        drillingNote: 'Petlya kosasi (35mm fréza)',
        area: (Math.max(200, doorH) * doorW * doorsCount) / 1000000
      });
    } else if (doorType === 'sliding' && doorsCount > 0) {
      const doorH = bodyH - 45; // Kupe roliklari hisobiga
      const overlap = (doorsCount - 1) * 25;
      const doorW = Math.round((W + overlap) / doorsCount);
      parts.push({
        id: 'kupe_eshik',
        name: `Kupe eshigi to'ldirgich (${doorsCount} dona)`,
        length: doorH,
        width: doorW,
        qty: doorsCount,
        material: 'DSP',
        edgeU1: 'Profilga kiradi',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Rolik va vertikal alyuminiy tutqich',
        area: (doorH * doorW * doorsCount) / 1000000
      });
    }

    // 8. Orqa devor DVP
    parts.push({
      id: 'orqa_dvp',
      name: 'Orqa devor (ДВП/ХДФ 3mm)',
      length: bodyH,
      width: W,
      qty: 1,
      material: 'DVP',
      edgeU1: '—',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Shurup yoki mebel skobasi',
      area: (bodyH * W) / 1000000
    });

  } else if (type === 'tumba') {
    // Tumba / Komod kroyi
    parts.push({
      id: 'tumba_yon',
      name: 'Yon devor (Боковина)',
      length: H,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '0.4 mm (Tepa)',
      edgeK2: '0.4 mm (Past)',
      drillingNote: 'Minifiks / Konfirmat',
      area: (H * D * 2) / 1000000
    });

    parts.push({
      id: 'tumba_krisha_dno',
      name: 'Qopqoq va Tag (Крыша / Дно)',
      length: W,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi/Yonlar)',
      edgeU2: '—',
      edgeK1: '2.0 mm',
      edgeK2: '2.0 mm',
      drillingNote: 'Konfirmat teshiklari',
      area: (W * D * 2) / 1000000
    });

    if (shelvesCount > 0) {
      parts.push({
        id: 'tumba_polka',
        name: 'Ichki polka',
        length: innerW,
        width: D - 20,
        qty: shelvesCount,
        material: 'DSP',
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Polkodershatel',
        area: (innerW * (D - 20) * shelvesCount) / 1000000
      });
    }

    if (drawersCount > 0) {
      const runnerLen = D >= 450 ? 400 : 350;
      const boxH = 120;
      parts.push({
        id: 'tumba_drawer_sides',
        name: 'Tortma yonlari',
        length: runnerLen,
        width: boxH,
        qty: drawersCount * 2,
        material: 'DSP',
        edgeU1: '0.4 mm',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Rels teshigi',
        area: (runnerLen * boxH * drawersCount * 2) / 1000000
      });
      parts.push({
        id: 'tumba_drawer_fb',
        name: 'Tortma old/orqa',
        length: innerW - 26 - 2 * T,
        width: boxH,
        qty: drawersCount * 2,
        material: 'DSP',
        edgeU1: '0.4 mm',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Konfirmat',
        area: ((innerW - 26 - 2 * T) * boxH * drawersCount * 2) / 1000000
      });
      parts.push({
        id: 'tumba_drawer_dvp',
        name: 'Tortma tubi DVP',
        length: innerW - 26,
        width: runnerLen,
        qty: drawersCount,
        material: 'DVP',
        edgeU1: '—',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Shurup',
        area: ((innerW - 26) * runnerLen * drawersCount) / 1000000
      });
      parts.push({
        id: 'tumba_drawer_facade',
        name: 'Tortma fasadi',
        length: W - 4,
        width: Math.round((H - 2 * T - 8) / drawersCount),
        qty: drawersCount,
        material: 'DSP',
        edgeU1: '2.0 mm (4 tomoni)',
        edgeU2: '2.0 mm',
        edgeK1: '2.0 mm',
        edgeK2: '2.0 mm',
        drillingNote: 'Ruchka o‘rni',
        area: ((W - 4) * Math.round((H - 2 * T - 8) / drawersCount) * drawersCount) / 1000000
      });
    }

    parts.push({
      id: 'tumba_orqa_dvp',
      name: 'Orqa devor DVP',
      length: H,
      width: W,
      qty: 1,
      material: 'DVP',
      edgeU1: '—',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Shurup',
      area: (H * W) / 1000000
    });

  } else if (type === 'oshxona_pastki') {
    // Oshxona pastki shkafi (Nizhniy bazoviy modul)
    const legH = socle > 0 ? socle : 100;
    const bodyBoxH = H - legH;

    parts.push({
      id: 'kitch_bot_sides',
      name: 'Yon devor (Боковина)',
      length: bodyBoxH,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '0.4 mm',
      edgeK2: '0.4 mm',
      drillingNote: 'Konfirmat, petlya',
      area: (bodyBoxH * D * 2) / 1000000
    });

    parts.push({
      id: 'kitch_bot_dno',
      name: 'Tub (Дно шкафа)',
      length: innerW,
      width: D,
      qty: 1,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Konfirmat',
      area: (innerW * D) / 1000000
    });

    // Oshxona pastki korpusida tepaga qopqoq o'rniga stoleshnitsa plankalari qo'yiladi
    parts.push({
      id: 'kitch_bot_plank',
      name: 'Tepa tortish plankalari (Стяжные планки)',
      length: innerW,
      width: 100,
      qty: 2,
      material: 'DSP',
      edgeU1: '0.4 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Stoleshnitsani qotirish uchun',
      area: (innerW * 100 * 2) / 1000000
    });

    if (shelvesCount > 0) {
      parts.push({
        id: 'kitch_bot_shelf',
        name: 'Ichki polka',
        length: innerW,
        width: D - 30,
        qty: shelvesCount,
        material: 'DSP',
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Polkodershatel',
        area: (innerW * (D - 30) * shelvesCount) / 1000000
      });
    }

    if (doorsCount > 0) {
      const doorW = Math.round((W - (doorsCount + 1) * 2) / doorsCount);
      parts.push({
        id: 'kitch_bot_door',
        name: 'Fasad eshik',
        length: bodyBoxH - 4,
        width: doorW,
        qty: doorsCount,
        material: 'DSP',
        edgeU1: '2.0 mm (4 tomoni)',
        edgeU2: '2.0 mm',
        edgeK1: '2.0 mm',
        edgeK2: '2.0 mm',
        drillingNote: 'Petlya kosasi 35mm',
        area: ((bodyBoxH - 4) * doorW * doorsCount) / 1000000
      });
    }

    parts.push({
      id: 'kitch_bot_dvp',
      name: 'Orqa devor DVP',
      length: bodyBoxH,
      width: W,
      qty: 1,
      material: 'DVP',
      edgeU1: '—',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Shurup',
      area: (bodyBoxH * W) / 1000000
    });

  } else if (type === 'oshxona_ustki') {
    // Oshxona ustki shkafi (Navesnoy modul)
    parts.push({
      id: 'kitch_top_sides',
      name: 'Yon devor (Боковина)',
      length: H,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '0.4 mm',
      edgeK2: '0.4 mm',
      drillingNote: 'Naves/reka va konfirmat',
      area: (H * D * 2) / 1000000
    });

    parts.push({
      id: 'kitch_top_dno_krisha',
      name: 'Tepa va Tag (Крыша / Дно)',
      length: innerW,
      width: D,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Konfirmat teshiklari',
      area: (innerW * D * 2) / 1000000
    });

    if (shelvesCount > 0) {
      parts.push({
        id: 'kitch_top_shelf',
        name: 'Ichki polka',
        length: innerW,
        width: D - 20,
        qty: shelvesCount,
        material: 'DSP',
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        drillingNote: 'Polkodershatel',
        area: (innerW * (D - 20) * shelvesCount) / 1000000
      });
    }

    if (doorsCount > 0) {
      const doorW = Math.round((W - (doorsCount + 1) * 2) / doorsCount);
      parts.push({
        id: 'kitch_top_door',
        name: 'Fasad eshik',
        length: H - 4,
        width: doorW,
        qty: doorsCount,
        material: 'DSP',
        edgeU1: '2.0 mm (4 tomoni)',
        edgeU2: '2.0 mm',
        edgeK1: '2.0 mm',
        edgeK2: '2.0 mm',
        drillingNote: 'Petlya kosasi 35mm',
        area: ((H - 4) * doorW * doorsCount) / 1000000
      });
    }

    parts.push({
      id: 'kitch_top_dvp',
      name: 'Orqa devor DVP',
      length: H,
      width: W,
      qty: 1,
      material: 'DVP',
      edgeU1: '—',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Pazga kiradi yoki shurup',
      area: (H * W) / 1000000
    });
  }

  // Umumiy hisob-kitoblar
  const dspParts = parts.filter(p => p.material === 'DSP');
  const dvpParts = parts.filter(p => p.material === 'DVP');

  const totalDspArea = dspParts.reduce((sum, p) => sum + p.area, 0);
  const totalDvpArea = dvpParts.reduce((sum, p) => sum + p.area, 0);

  let edge2mmMeters = 0;
  let edge04mmMeters = 0;

  parts.forEach(p => {
    [p.edgeU1, p.edgeU2].forEach(e => {
      if (e?.includes('2.0')) edge2mmMeters += (p.length / 1000) * p.qty;
      if (e?.includes('0.4')) edge04mmMeters += (p.length / 1000) * p.qty;
    });
    [p.edgeK1, p.edgeK2].forEach(e => {
      if (e?.includes('2.0')) edge2mmMeters += (p.width / 1000) * p.qty;
      if (e?.includes('0.4')) edge04mmMeters += (p.width / 1000) * p.qty;
    });
  });

  edge2mmMeters = Math.ceil(edge2mmMeters * 1.08); // 8% zaxira
  edge04mmMeters = Math.ceil(edge04mmMeters * 1.08);

  const mebelNames = {
    shkaf: 'Shkaf / Garderob',
    tumba: 'Tumba / Komod',
    oshxona_pastki: 'Oshxona pastki shkafi',
    oshxona_ustki: 'Oshxona ustki shkafi',
    kupe: 'Shkaf-Kupe'
  };

  const summary = `${mebelNames[type] || 'Mebel'} (${H}×${W}×${D} mm): Jami ${parts.reduce((s, p) => s + p.qty, 0)} ta detal, DSP: ${totalDspArea.toFixed(2)} m², DVP: ${totalDvpArea.toFixed(2)} m²`;

  return {
    parts,
    totalDspArea,
    totalDvpArea,
    edge2mmMeters,
    edge04mmMeters,
    summary
  };
}

/**
 * 2D Guillotine Bin Packing Algoritmi
 * (Formatno-raskroyechniy stanok arra xaritasi)
 */
export function calculateRaskroy(
  parts: PartItem[],
  settings: RaskroySettings = {
    sheetWidth: 2750,
    sheetHeight: 1830,
    kerf: 4,
    trim: 10,
    allowRotation: true
  }
): RaskroyResult {
  const { sheetWidth, sheetHeight, kerf, trim, allowRotation } = settings;

  // Faqat DSP / MDF list materiallarini qirqamiz (DVP alohida yoki birgalikda)
  const dspParts = parts.filter(p => p.material !== 'DVP');

  // Detallarni alohida donalarga ajratamiz
  interface PieceInstance {
    uid: string;
    partId: string;
    name: string;
    w: number; // Uzun tomoni
    h: number; // Qisqa tomoni
    originalW: number;
    originalH: number;
    color: string;
    edgeInfo: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  }

  const pieces: PieceInstance[] = [];
  let colorIdx = 0;

  dspParts.forEach((part) => {
    const color = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
    colorIdx++;

    for (let i = 0; i < part.qty; i++) {
      pieces.push({
        uid: `${part.id}_${i}`,
        partId: part.id,
        name: `${part.name} #${i + 1}`,
        w: Math.max(part.length, part.width),
        h: Math.min(part.length, part.width),
        originalW: part.length,
        originalH: part.width,
        color,
        edgeInfo: {
          top: part.edgeU1,
          bottom: part.edgeU2,
          left: part.edgeK1,
          right: part.edgeK2
        }
      });
    }
  });

  // Sort: Avval maydoni eng katta, keyin bo'yi eng uzun detallar
  pieces.sort((a, b) => (b.w * b.h) - (a.w * a.h) || b.w - a.w);

  interface FreeRect {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  const sheets: SheetLayout[] = [];
  const unplacedParts: PartItem[] = [];

  const usableW = sheetWidth - 2 * trim;
  const usableH = sheetHeight - 2 * trim;

  let currentFreeRects: FreeRect[] = [];
  let currentSheetItems: PlacedItem[] = [];
  let currentSheetIndex = 1;

  function startNewSheet() {
    if (currentSheetItems.length > 0) {
      const usedArea = currentSheetItems.reduce((sum, it) => sum + (it.w * it.h), 0) / 1000000;
      const totalArea = (sheetWidth * sheetHeight) / 1000000;
      const wasteArea = Math.max(0, totalArea - usedArea);
      const wastePercent = Math.round((wasteArea / totalArea) * 100);

      sheets.push({
        sheetIndex: currentSheetIndex,
        sheetWidth,
        sheetHeight,
        items: [...currentSheetItems],
        usedArea: Number(usedArea.toFixed(2)),
        wasteArea: Number(wasteArea.toFixed(2)),
        wastePercent
      });
      currentSheetIndex++;
    }

    currentSheetItems = [];
    currentFreeRects = [
      {
        x: trim,
        y: trim,
        w: usableW,
        h: usableH
      }
    ];
  }

  startNewSheet();

  pieces.forEach((piece) => {
    let placed = false;

    // Eng yaxshi joyni qidirish (Best-Area-Fit / Best-Short-Side-Fit)
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestScore = Infinity;

    for (let rIdx = 0; rIdx < currentFreeRects.length; rIdx++) {
      const rect = currentFreeRects[rIdx];

      // 1. Aylantirmasdan tekshirish
      if (rect.w >= piece.w && rect.h >= piece.h) {
        const leftoverArea = (rect.w * rect.h) - (piece.w * piece.h);
        if (leftoverArea < bestScore) {
          bestScore = leftoverArea;
          bestRectIdx = rIdx;
          bestRotated = false;
        }
      }

      // 2. Agar aylantirishga ruxsat berilgan bo'lsa
      if (allowRotation && rect.w >= piece.h && rect.h >= piece.w) {
        const leftoverArea = (rect.w * rect.h) - (piece.w * piece.h);
        if (leftoverArea < bestScore) {
          bestScore = leftoverArea;
          bestRectIdx = rIdx;
          bestRotated = true;
        }
      }
    }

    // Agar hozirgi listga sig'masa, yangi list ochamiz
    if (bestRectIdx === -1) {
      startNewSheet();

      // Yangi listning erkin maydonida tekshiramiz
      for (let rIdx = 0; rIdx < currentFreeRects.length; rIdx++) {
        const rect = currentFreeRects[rIdx];
        if (rect.w >= piece.w && rect.h >= piece.h) {
          bestScore = (rect.w * rect.h) - (piece.w * piece.h);
          bestRectIdx = rIdx;
          bestRotated = false;
          break;
        }
        if (allowRotation && rect.w >= piece.h && rect.h >= piece.w) {
          bestScore = (rect.w * rect.h) - (piece.w * piece.h);
          bestRectIdx = rIdx;
          bestRotated = true;
          break;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const rect = currentFreeRects[bestRectIdx];
      const pw = bestRotated ? piece.h : piece.w;
      const ph = bestRotated ? piece.w : piece.h;

      currentSheetItems.push({
        id: piece.uid,
        partId: piece.partId,
        name: piece.name,
        x: rect.x,
        y: rect.y,
        w: pw,
        h: ph,
        originalW: piece.originalW,
        originalH: piece.originalH,
        rotated: bestRotated,
        color: piece.color,
        edgeInfo: piece.edgeInfo
      });

      // Guillotine Split: Arra kesimi (kerf) ni hisobga olib qolgan joyni 2 ga ajratamiz
      // Shorter Axis Split qoidasi
      const remW = rect.w - pw - kerf;
      const remH = rect.h - ph - kerf;

      const newRects: FreeRect[] = [];

      if (remW > remH) {
        // Horizontal cut first
        if (remH > 0) {
          newRects.push({
            x: rect.x,
            y: rect.y + ph + kerf,
            w: pw,
            h: remH
          });
        }
        if (remW > 0) {
          newRects.push({
            x: rect.x + pw + kerf,
            y: rect.y,
            w: remW,
            h: rect.h
          });
        }
      } else {
        // Vertical cut first
        if (remW > 0) {
          newRects.push({
            x: rect.x + pw + kerf,
            y: rect.y,
            w: remW,
            h: ph
          });
        }
        if (remH > 0) {
          newRects.push({
            x: rect.x,
            y: rect.y + ph + kerf,
            w: rect.w,
            h: remH
          });
        }
      }

      // Ishlatilgan to'rtburchakni o'chirib, yangilarini qo'shamiz
      currentFreeRects.splice(bestRectIdx, 1);
      newRects.forEach(nr => {
        // 50 mm dan kichik qoldiqlarni erkin bloklar ro'yxatiga kiritmaymiz (keraksiz mayda qoldiq)
        if (nr.w >= 50 && nr.h >= 50) {
          currentFreeRects.push(nr);
        }
      });

      placed = true;
    }

    if (!placed) {
      const existing = unplacedParts.find(p => p.id === piece.partId);
      if (existing) {
        existing.qty += 1;
      } else {
        unplacedParts.push({
          id: piece.partId,
          name: piece.name,
          length: piece.originalW,
          width: piece.originalH,
          qty: 1,
          material: 'DSP',
          area: (piece.originalW * piece.originalH) / 1000000
        });
      }
    }
  });

  // Oxirgi listni yakunlash
  if (currentSheetItems.length > 0) {
    const usedArea = currentSheetItems.reduce((sum, it) => sum + (it.w * it.h), 0) / 1000000;
    const totalArea = (sheetWidth * sheetHeight) / 1000000;
    const wasteArea = Math.max(0, totalArea - usedArea);
    const wastePercent = Math.round((wasteArea / totalArea) * 100);

    sheets.push({
      sheetIndex: currentSheetIndex,
      sheetWidth,
      sheetHeight,
      items: [...currentSheetItems],
      usedArea: Number(usedArea.toFixed(2)),
      wasteArea: Number(wasteArea.toFixed(2)),
      wastePercent
    });
  }

  const totalDspArea = dspParts.reduce((s, p) => s + p.area, 0);
  const totalDvpArea = parts.filter(p => p.material === 'DVP').reduce((s, p) => s + p.area, 0);

  let edge2mm = 0;
  let edge04mm = 0;
  parts.forEach(p => {
    [p.edgeU1, p.edgeU2].forEach(e => {
      if (e?.includes('2.0')) edge2mm += (p.length / 1000) * p.qty;
      if (e?.includes('0.4')) edge04mm += (p.length / 1000) * p.qty;
    });
    [p.edgeK1, p.edgeK2].forEach(e => {
      if (e?.includes('2.0')) edge2mm += (p.width / 1000) * p.qty;
      if (e?.includes('0.4')) edge04mm += (p.width / 1000) * p.qty;
    });
  });

  const averageWastePercent = sheets.length > 0
    ? Math.round(sheets.reduce((sum, s) => sum + s.wastePercent, 0) / sheets.length)
    : 0;

  return {
    sheets,
    totalSheets: sheets.length,
    totalDspArea: Number(totalDspArea.toFixed(2)),
    totalDvpArea: Number(totalDvpArea.toFixed(2)),
    totalEdge2mmMeters: Math.ceil(edge2mm * 1.08),
    totalEdge04mmMeters: Math.ceil(edge04mm * 1.08),
    totalPartsCount: pieces.length,
    averageWastePercent,
    unplacedParts
  };
}

/**
 * Matnli kiritishdan (Quick Paste) detallar ro'yxatini ajratib olish
 * Masalan:
 * 2000x500 2 Yon devor
 * 768 500 2 Qopqoq
 * 768*480 3 Polka
 */
export function parsePartsFromText(text: string): PartItem[] {
  const lines = text.split('\n');
  const result: PartItem[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

    // Pattern: 2000x500 2 [Nomi] yoki 2000 500 2 [Nomi] yoki 2000*500 2
    const match = trimmed.match(/^(\d+)[xX*,\s]+(\d+)(?:[xX*,\s]+(\d+))?\s*(.*)$/);
    if (match) {
      const len = parseInt(match[1], 10);
      const wid = parseInt(match[2], 10);
      const qty = match[3] ? parseInt(match[3], 10) : 1;
      const name = match[4]?.trim() || `Detal #${idx + 1}`;

      if (len > 0 && wid > 0 && qty > 0) {
        result.push({
          id: `manual_${Date.now()}_${idx}`,
          name,
          length: len,
          width: wid,
          qty,
          material: 'DSP',
          edgeU1: '—',
          edgeU2: '—',
          edgeK1: '—',
          edgeK2: '—',
          area: (len * wid * qty) / 1000000
        });
      }
    }
  });

  return result;
}
