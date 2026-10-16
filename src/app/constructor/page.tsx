'use client';

import React, { useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Ruler, 
  Box, 
  Layers, 
  Scissors, 
  Printer, 
  Download, 
  Check, 
  Plus, 
  Minus, 
  DollarSign, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Copy, 
  Sparkles,
  Maximize2,
  Palette,
  FileText,
  RotateCw,
  Sliders,
  LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import { WOOD_COLORS, HANDLE_COLORS } from '@/components/constructor/Furniture3DViewer';

// Dynamically import 3D Viewer with SSR disabled to prevent WebGL/Window SSR errors
const Furniture3DViewer = dynamic(
  () => import('@/components/constructor/Furniture3DViewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[540px] bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800 text-slate-400">
        <RotateCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <span className="text-xs font-mono">3D Studio yuklanmoqda (Three.js WebGL)...</span>
      </div>
    )
  }
);

// Presets
const PRESETS = [
  {
    id: 'wardrobe_2door',
    name: '2-Eshikli Garderob',
    category: 'Garderob',
    icon: '🚪',
    height: 2100,
    width: 1200,
    depth: 550,
    sections: 2,
    shelves: [4, 1],
    hasHanger: true,
    drawers: 2,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    color: '#d4b38a' // Dub Sonoma
  },
  {
    id: 'wardrobe_3door',
    name: '3-Eshikli Katta Shkaf',
    category: 'Shkaf',
    icon: '👔',
    height: 2200,
    width: 1800,
    depth: 600,
    sections: 3,
    shelves: [4, 1, 4],
    hasHanger: true,
    drawers: 3,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 3,
    color: '#f8fafc' // White
  },
  {
    id: 'wardrobe_sliding',
    name: 'Shkaf-Kupé (Suriladigan)',
    category: 'Kupé',
    icon: '✨',
    height: 2400,
    width: 1600,
    depth: 650,
    sections: 2,
    shelves: [4, 2],
    hasHanger: true,
    drawers: 2,
    socleHeight: 100,
    thickness: 16,
    doorType: 'sliding',
    doorsCount: 2,
    color: '#27272a' // Anthracite
  },
  {
    id: 'kitchen_bottom',
    name: 'Oshxona Pastki Tumba',
    category: 'Oshxona',
    icon: '🍳',
    height: 850,
    width: 800,
    depth: 600,
    sections: 1,
    shelves: [1],
    hasHanger: false,
    drawers: 1,
    socleHeight: 100,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    color: '#85512b' // Walnut
  },
  {
    id: 'kitchen_top',
    name: 'Oshxona Osma Shkaf',
    category: 'Oshxona',
    icon: '🍽',
    height: 720,
    width: 800,
    depth: 320,
    sections: 1,
    shelves: [2],
    hasHanger: false,
    drawers: 0,
    socleHeight: 0,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    color: '#f8fafc' // White
  },
  {
    id: 'dresser',
    name: 'Tortmali Komod',
    category: 'Komod',
    icon: '🗄',
    height: 900,
    width: 900,
    depth: 450,
    sections: 1,
    shelves: [0],
    hasHanger: false,
    drawers: 4,
    socleHeight: 60,
    thickness: 16,
    doorType: 'none',
    doorsCount: 0,
    color: '#3e2723' // Wenge
  }
];

export default function FurnitureConstructorPage() {
  // Dimensions
  const [height, setHeight] = useState<number>(2100);
  const [width, setWidth] = useState<number>(1200);
  const [depth, setDepth] = useState<number>(550);
  const [thickness, setThickness] = useState<number>(16);
  const [socleHeight, setSocleHeight] = useState<number>(80);
  const [sections, setSections] = useState<number>(2);
  const [shelvesPerSection, setShelvesPerSection] = useState<number[]>([4, 1]);
  const [hasHanger, setHasHanger] = useState<boolean>(true);
  const [drawers, setDrawers] = useState<number>(2);
  const [doorType, setDoorType] = useState<'hinged' | 'sliding' | 'none'>('hinged');
  const [doorsCount, setDoorsCount] = useState<number>(2);

  // Materials & Colors
  const [materialColor, setMaterialColor] = useState<string>('#d4b38a'); // Dub Sonoma default
  const [handleColor, setHandleColor] = useState<string>('#cbd5e1'); // Silver default

  // Pricing Parameters (UZS)
  const [dspSheetPrice, setDspSheetPrice] = useState<number>(460000); // 1 list 2750x1830
  const [dvpSheetPrice, setDvpSheetPrice] = useState<number>(90000); // 1 list DVP
  const [edgePricePerMeter, setEdgePricePerMeter] = useState<number>(3500); // 1 metr kromka
  const [hingePrice, setHingePrice] = useState<number>(15000); // 1 ta petlya
  const [drawerSlidePrice, setDrawerSlidePrice] = useState<number>(45000); // 1 kompl. napravlyayushie
  const [handlePrice, setHandlePrice] = useState<number>(20000); // 1 ta ruchka
  const [laborPercent, setLaborPercent] = useState<number>(30); // 30% ish haqi va ustama

  // Main View States
  const [activeTab, setActiveTab] = useState<'3d' | 'blueprint' | 'cutlist' | 'sheet_layout' | 'pricing'>('3d');
  const [doorsOpen, setDoorsOpen] = useState<boolean>(true);
  const [blueprintStyle, setBlueprintStyle] = useState<'dark_cad' | 'white_paper'>('dark_cad');
  const [blueprintSideView, setBlueprintSideView] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Apply Preset
  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setHeight(preset.height);
    setWidth(preset.width);
    setDepth(preset.depth);
    setThickness(preset.thickness);
    setSocleHeight(preset.socleHeight);
    setSections(preset.sections);
    setShelvesPerSection([...preset.shelves]);
    setHasHanger(preset.hasHanger);
    setDrawers(preset.drawers);
    setDoorType(preset.doorType as any);
    setDoorsCount(preset.doorsCount);
    if (preset.color) setMaterialColor(preset.color);
  };

  const updateSectionShelves = (index: number, count: number) => {
    const updated = [...shelvesPerSection];
    updated[index] = Math.max(0, Math.min(10, count));
    setShelvesPerSection(updated);
  };

  const handleSectionsChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(4, newCount));
    setSections(validCount);
    let newShelves = [...shelvesPerSection];
    if (validCount > newShelves.length) {
      while (newShelves.length < validCount) newShelves.push(2);
    } else {
      newShelves = newShelves.slice(0, validCount);
    }
    setShelvesPerSection(newShelves);
    if (doorType !== 'none') {
      setDoorsCount(validCount);
    }
  };

  // ==========================================
  // MATHEMATICAL CUTLIST & COST ENGINE
  // ==========================================
  const calculations = useMemo(() => {
    const T = thickness;
    const bodyHeight = height - socleHeight;
    const innerHeight = bodyHeight - 2 * T;
    const innerTotalWidth = width - 2 * T - (sections - 1) * T;
    const sectionWidth = Math.floor(innerTotalWidth / sections);

    interface Part {
      id: string;
      name: string;
      detailNameRu: string;
      length: number;
      width: number;
      qty: number;
      material: string;
      edgeU1: string; // Old uzun tomoni
      edgeU2: string; // Orqa uzun tomoni
      edgeK1: string; // Qisqa tomoni 1
      edgeK2: string; // Qisqa tomoni 2
      area: number;   // m2
      drillingNote: string;
    }

    const parts: Part[] = [];

    // 1. Yon devorlar (Bogovina)
    parts.push({
      id: 'bogovina',
      name: 'Yon devor (Боковина)',
      detailNameRu: 'Боковина',
      length: bodyHeight,
      width: depth,
      qty: 2,
      material: `DSP ${T}mm`,
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '0.4 mm (Tepasi)',
      edgeK2: '0.4 mm (Tagi)',
      area: (bodyHeight * depth * 2) / 1000000,
      drillingNote: 'Minifiks / Konfirmat, petlya o‘rni'
    });

    // 2. Tepa va Tag (Krisha va Dno)
    parts.push({
      id: 'dno_krisha',
      name: 'Tepa va Tag (Крыша / Дно)',
      detailNameRu: 'Крыша / Дно',
      length: width - 2 * T,
      width: depth,
      qty: 2,
      material: `DSP ${T}mm`,
      edgeU1: '2.0 mm (Oldi)',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      area: ((width - 2 * T) * depth * 2) / 1000000,
      drillingNote: 'Uchlariga konfirmat teshiklari'
    });

    // 3. Tsokol plankasi
    if (socleHeight > 0) {
      parts.push({
        id: 'tsokol',
        name: 'Tsokol plankasi (Цоколь)',
        detailNameRu: 'Цоколь',
        length: width - 2 * T,
        width: socleHeight,
        qty: 2,
        material: `DSP ${T}mm`,
        edgeU1: '0.4 mm (Oldi/Tagi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        area: ((width - 2 * T) * socleHeight * 2) / 1000000,
        drillingNote: 'Podpyatniklar biriktiriladi'
      });
    }

    // 4. O'rta to'siqlar (Peregorodka)
    if (sections > 1) {
      const dividerCount = sections - 1;
      parts.push({
        id: 'peregorodka',
        name: "O'rta to'siq (Перегородка)",
        detailNameRu: 'Перегородка',
        length: innerHeight,
        width: depth - 10,
        qty: dividerCount,
        material: `DSP ${T}mm`,
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        area: (innerHeight * (depth - 10) * dividerCount) / 1000000,
        drillingNote: 'Polkalar va napravlyayushie uchun'
      });
    }

    // 5. Polkalar (Shelves)
    const totalShelves = shelvesPerSection.reduce((acc, curr) => acc + curr, 0);
    if (totalShelves > 0) {
      parts.push({
        id: 'polka',
        name: 'Polkalar (Полка)',
        detailNameRu: 'Полка',
        length: sectionWidth,
        width: depth - 20,
        qty: totalShelves,
        material: `DSP ${T}mm`,
        edgeU1: '2.0 mm (Oldi)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        area: (sectionWidth * (depth - 20) * totalShelves) / 1000000,
        drillingNote: 'Polkodershatel o‘rni'
      });
    }

    // 6. Tortmalar (Drawers)
    if (drawers > 0) {
      const runnerLen = depth >= 550 ? 500 : depth >= 500 ? 450 : depth >= 450 ? 400 : 350;
      const boxHeight = 140;
      const innerDrawerWidth = sectionWidth - 26; // 13mm each side for slides

      // Tortma yonlari
      parts.push({
        id: 'drawer_sides',
        name: 'Tortma yonlari (Бок ящика)',
        detailNameRu: 'Боковина ящика',
        length: runnerLen,
        width: boxHeight,
        qty: drawers * 2,
        material: `DSP ${T}mm`,
        edgeU1: '0.4 mm (Ustki)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        area: (runnerLen * boxHeight * drawers * 2) / 1000000,
        drillingNote: 'Teleskopik rels o‘rni'
      });

      // Tortma old/orqa
      parts.push({
        id: 'drawer_front_back',
        name: 'Tortma old/orqa devori',
        detailNameRu: 'Перед/зад ящика',
        length: innerDrawerWidth - 2 * T,
        width: boxHeight,
        qty: drawers * 2,
        material: `DSP ${T}mm`,
        edgeU1: '0.4 mm (Ustki)',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        area: ((innerDrawerWidth - 2 * T) * boxHeight * drawers * 2) / 1000000,
        drillingNote: 'Konfirmat teshiklari'
      });

      // Tortma tagligi (DVP)
      parts.push({
        id: 'drawer_bottom',
        name: 'Tortma tagligi (Дно ДВП)',
        detailNameRu: 'Дно ящика (ДВП)',
        length: innerDrawerWidth,
        width: runnerLen,
        qty: drawers,
        material: 'DVP 3mm',
        edgeU1: '—',
        edgeU2: '—',
        edgeK1: '—',
        edgeK2: '—',
        area: (innerDrawerWidth * runnerLen * drawers) / 1000000,
        drillingNote: 'Pazga kiradi yoki shurup'
      });

      // Tortma fasadi
      parts.push({
        id: 'drawer_facade',
        name: 'Tortma fasadi (Фасад ящика)',
        detailNameRu: 'Фасад ящика',
        length: sectionWidth - 4,
        width: 180,
        qty: drawers,
        material: `DSP ${T}mm`,
        edgeU1: '2.0 mm',
        edgeU2: '2.0 mm',
        edgeK1: '2.0 mm',
        edgeK2: '2.0 mm',
        area: ((sectionWidth - 4) * 180 * drawers) / 1000000,
        drillingNote: 'Tutqich (Ruchka) teshigi'
      });
    }

    // 7. Fasadlar / Eshiklar
    if (doorType !== 'none' && doorsCount > 0) {
      if (doorType === 'hinged') {
        const doorH = bodyHeight - 4;
        const doorW = Math.floor(width / doorsCount) - 4;
        parts.push({
          id: 'door_hinged',
          name: 'Eshiklar / Fasad (Дверь)',
          detailNameRu: 'Дверь распашная',
          length: doorH,
          width: doorW,
          qty: doorsCount,
          material: `DSP ${T}mm`,
          edgeU1: '2.0 mm',
          edgeU2: '2.0 mm',
          edgeK1: '2.0 mm',
          edgeK2: '2.0 mm',
          area: (doorH * doorW * doorsCount) / 1000000,
          drillingNote: 'Чашка петли (Ø35mm) + Ruchka'
        });
      } else if (doorType === 'sliding') {
        const doorH = bodyHeight - 40;
        const overlap = (doorsCount - 1) * 30;
        const doorW = Math.floor((width + overlap) / doorsCount);
        parts.push({
          id: 'door_sliding',
          name: 'Kupé Eshiklari (Дверь купе)',
          detailNameRu: 'Дверь купе',
          length: doorH,
          width: doorW,
          qty: doorsCount,
          material: `DSP ${T}mm / Profil`,
          edgeU1: 'Profil / 2.0mm',
          edgeU2: 'Profil / 2.0mm',
          edgeK1: 'Profil / 2.0mm',
          edgeK2: 'Profil / 2.0mm',
          area: (doorH * doorW * doorsCount) / 1000000,
          drillingNote: 'Rolik va yo‘naltiruvchi profil'
        });
      }
    }

    // 8. Orqa fon (DVP / XDF 3mm)
    parts.push({
      id: 'back_panel',
      name: 'Orqa fon (ДВП/ХДФ 3mm)',
      detailNameRu: 'Задняя стенка (ДВП)',
      length: bodyHeight,
      width: width,
      qty: 1,
      material: 'DVP 3mm',
      edgeU1: '—',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      area: (bodyHeight * width) / 1000000,
      drillingNote: 'Mebel shurupi yoki skoba'
    });

    // Material Totals
    const dspParts = parts.filter(p => p.material.startsWith('DSP'));
    const dvpParts = parts.filter(p => p.material.startsWith('DVP'));

    const totalDspArea = dspParts.reduce((sum, p) => sum + p.area, 0);
    const totalDvpArea = dvpParts.reduce((sum, p) => sum + p.area, 0);

    // Standard DSP Sheet: 2.75m x 1.83m = 5.0325 m2 (with 15% cutting loss)
    const sheetArea = 2.75 * 1.83;
    const dspSheetsNeeded = Math.ceil((totalDspArea * 1.15) / sheetArea);
    const dvpSheetsNeeded = Math.ceil((totalDvpArea * 1.1) / sheetArea);

    // Edgebanding linear meters
    let edge2mmMeters = 0;
    let edge04mmMeters = 0;

    parts.forEach(p => {
      // Check edges
      [p.edgeU1, p.edgeU2].forEach(e => {
        if (e.includes('2.0')) edge2mmMeters += (p.length / 1000) * p.qty;
        if (e.includes('0.4')) edge04mmMeters += (p.length / 1000) * p.qty;
      });
      [p.edgeK1, p.edgeK2].forEach(e => {
        if (e.includes('2.0')) edge2mmMeters += (p.width / 1000) * p.qty;
        if (e.includes('0.4')) edge04mmMeters += (p.width / 1000) * p.qty;
      });
    });

    edge2mmMeters = Math.ceil(edge2mmMeters * 1.1); // +10% reserve
    edge04mmMeters = Math.ceil(edge04mmMeters * 1.1);
    const totalEdgeMeters = edge2mmMeters + edge04mmMeters;

    // Hardware Calculations
    let hingesCount = 0;
    if (doorType === 'hinged' && doorsCount > 0) {
      const doorH = bodyHeight;
      const hingesPerDoor = doorH < 1000 ? 2 : doorH < 1600 ? 3 : doorH < 2050 ? 4 : 5;
      hingesCount = doorsCount * hingesPerDoor;
    }

    const drawerSlidesCount = drawers;
    const handlesCount = (doorType === 'hinged' ? doorsCount : 0) + drawers;
    const legsCount = width < 1200 ? 4 : width < 2000 ? 6 : 8;
    const confirmatsCount = (sections * 8) + (totalShelves * 4) + (drawers * 8) + 20;

    // Financial breakdown
    const costDsp = dspSheetsNeeded * dspSheetPrice;
    const costDvp = dvpSheetsNeeded * dvpSheetPrice;
    const costEdge = totalEdgeMeters * edgePricePerMeter;
    const costHinges = hingesCount * hingePrice;
    const costSlides = drawerSlidesCount * drawerSlidePrice;
    const costHandles = handlesCount * handlePrice;
    const costFasteners = confirmatsCount * 500 + legsCount * 4000;

    const materialsCost = costDsp + costDvp + costEdge + costHinges + costSlides + costHandles + costFasteners;
    const laborAndMargin = Math.round((materialsCost * laborPercent) / 100);
    const totalSellingPrice = materialsCost + laborAndMargin;

    return {
      innerTotalWidth,
      sectionWidth,
      bodyHeight,
      innerHeight,
      parts,
      totalDspArea,
      totalDvpArea,
      dspSheetsNeeded,
      dvpSheetsNeeded,
      edge2mmMeters,
      edge04mmMeters,
      totalEdgeMeters,
      hingesCount,
      drawerSlidesCount,
      handlesCount,
      legsCount,
      confirmatsCount,
      materialsCost,
      laborAndMargin,
      totalSellingPrice,
      costDsp,
      costDvp,
      costEdge,
      costHinges,
      costSlides,
      costHandles,
      costFasteners
    };
  }, [
    height, width, depth, thickness, socleHeight, sections, 
    shelvesPerSection, hasHanger, drawers, doorType, doorsCount,
    dspSheetPrice, dvpSheetPrice, edgePricePerMeter, hingePrice, 
    drawerSlidePrice, handlePrice, laborPercent
  ]);

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!printRef.current) return;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Moderno_Chizma_${width}x${height}x${depth}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert("PDF yuklab olishda xatolik yuz berdi. Iltimos 'Chop etish' tugmasidan foydalaning.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    const text = `📐 MODERNO MEBEL - 3D VA TEXNIK HISOBOT
O'lchamlari: ${width} x ${height} x ${depth} mm
Material: DSP ${thickness} mm (${WOOD_COLORS.find(w => w.hex === materialColor)?.name || 'Maxsus'})
Bo'limlar: ${sections} ta | Polkalar: ${shelvesPerSection.reduce((a, b) => a + b, 0)} ta | Tortmalar: ${drawers} ta | Fasad: ${doorType}

📋 DETALIZATSIYA:
• Detallar soni: ${calculations.parts.reduce((a, b) => a + b.qty, 0)} dona
• DSP sarfi: ${calculations.dspSheetsNeeded} list (${calculations.totalDspArea.toFixed(2)} m²)
• DVP sarfi: ${calculations.dvpSheetsNeeded} list (${calculations.totalDvpArea.toFixed(2)} m²)
• Kromka (2mm): ${calculations.edge2mmMeters} m | Kromka (0.4mm): ${calculations.edge04mmMeters} m

⚙️ FURNITURALAR:
• Petlyalar: ${calculations.hingesCount} dona
• Napravlyayushie (tortma relsi): ${calculations.drawerSlidesCount} juft
• Tutqichlar (Ruchka): ${calculations.handlesCount} dona
• Oyoqlar (Podpyatnik): ${calculations.legsCount} dona

💰 SOTUV NARXI: ${calculations.totalSellingPrice.toLocaleString()} so'm
(Materiallar: ${calculations.materialsCost.toLocaleString()} so'm | Ish haqi & Daromad: ${calculations.laborAndMargin.toLocaleString()} so'm)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-16">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Ilovaga qaytish</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Moderno Konstruktor
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  3D + 2D CAD Pro
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">3D dizayn, texnik chizma va batafsil kroy hisoblagichi</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Hisobotni nusxalash"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Nusxalandi!' : 'Nusxalash'}</span>
          </button>
          
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/25"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Yuklanmoqda...' : 'PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
            title="Chop etish"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Preset Templates Carousel */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Mebel Shablonlari:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 text-xs font-medium text-slate-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {preset.width}x{preset.height}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* LEFT COLUMN: Controls & Input Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* 1. Gabarit O'lchamlar */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Ruler className="w-4 h-4" />
                Gabarit O'lchamlar (mm)
              </h2>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                W:{width} H:{height} D:{depth}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Width */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Kenglik (W)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    step={10}
                    min={400}
                    max={4000}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-500">mm</span>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Balandlik (H)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    step={10}
                    min={400}
                    max={3000}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-500">mm</span>
                </div>
              </div>

              {/* Depth */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Chuqurlik (D)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    step={10}
                    min={200}
                    max={1000}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-500">mm</span>
                </div>
              </div>
            </div>

            {/* Range Sliders */}
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-400 text-[11px]">Kenglik:</span>
                <input 
                  type="range" 
                  min={400} 
                  max={3000} 
                  step={50} 
                  value={width} 
                  onChange={(e) => setWidth(Number(e.target.value))} 
                  className="flex-1 accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="w-12 text-right font-mono text-[11px]">{width}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-400 text-[11px]">Balandlik:</span>
                <input 
                  type="range" 
                  min={600} 
                  max={2800} 
                  step={50} 
                  value={height} 
                  onChange={(e) => setHeight(Number(e.target.value))} 
                  className="flex-1 accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="w-12 text-right font-mono text-[11px]">{height}</span>
              </div>
            </div>
          </div>

          {/* 2. Rang va Materiallar (3D Ko'rinish uchun) */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
              <Palette className="w-4 h-4" />
              Material Rangi va Dizayn
            </h2>

            {/* Wood Colors */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[11px] font-semibold text-slate-300">DSP / Yog'och Rangi:</label>
              <div className="grid grid-cols-3 gap-2">
                {WOOD_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setMaterialColor(c.hex)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs text-left transition-all ${
                      materialColor === c.hex 
                        ? 'border-blue-500 bg-blue-500/10 font-bold text-white shadow' 
                        : 'border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span 
                      className="w-4 h-4 rounded-full border border-slate-600 shadow-sm shrink-0" 
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="truncate text-[11px]">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Handle Colors */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Tutqichlar (Ruchka) Rangi:</label>
              <div className="grid grid-cols-3 gap-2">
                {HANDLE_COLORS.map((hc) => (
                  <button
                    key={hc.id}
                    onClick={() => setHandleColor(hc.hex)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs text-left transition-all ${
                      handleColor === hc.hex 
                        ? 'border-blue-500 bg-blue-500/10 font-bold text-white shadow' 
                        : 'border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span 
                      className="w-4 h-4 rounded-full border border-slate-600 shadow-sm shrink-0" 
                      style={{ backgroundColor: hc.hex }}
                    />
                    <span className="truncate text-[11px]">{hc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Ichki Bo'limlar va Polkalar */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
              <Box className="w-4 h-4" />
              Ichki Bo'limlar va Polkalar
            </h2>

            <div className="space-y-3">
              {/* Sections count */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200">Vertikal Bo'limlar (Sektsiyalar)</span>
                  <p className="text-[10px] text-slate-400">Har bir bo'lim kengligi: ~{calculations.sectionWidth} mm</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1">
                  <button 
                    onClick={() => handleSectionsChange(sections - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-blue-400 font-mono">{sections}</span>
                  <button 
                    onClick={() => handleSectionsChange(sections + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Shelves per section */}
              <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-2.5 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 block">Bo'limlar bo'yicha polkalar soni:</span>
                <div className="grid grid-cols-2 gap-2">
                  {shelvesPerSection.map((count, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-300">{idx + 1}-bo'lim:</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => updateSectionShelves(idx, count - 1)}
                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-blue-300 w-4 text-center">{count}</span>
                        <button 
                          onClick={() => updateSectionShelves(idx, count + 1)}
                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawers and Hanger */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Drawers */}
                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-300 block">Tortmalar (G'aladon)</span>
                    <span className="text-[10px] text-slate-400">{drawers} dona</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setDrawers(Math.max(0, drawers - 1))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-bold text-blue-300 w-4 text-center">{drawers}</span>
                    <button 
                      onClick={() => setDrawers(Math.min(8, drawers + 1))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Hanger rail */}
                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-300 block">Kiyim ilgich</span>
                    <span className="text-[10px] text-slate-400">Truba + flanets</span>
                  </div>
                  <button 
                    onClick={() => setHasHanger(!hasHanger)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${hasHanger ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {hasHanger ? 'Bor' : 'Yo‘q'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Fasad va Material Parametrlari */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
              <Layers className="w-4 h-4" />
              Fasad va Tsokol
            </h2>

            <div className="space-y-3">
              {/* Door Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Eshiklar (Fasad) turi</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'hinged', name: 'Ochiladigan (Petlya)' },
                    { id: 'sliding', name: 'Suriladigan (Kupé)' },
                    { id: 'none', name: 'Ochiq (Eshiksiz)' }
                  ].map((dt) => (
                    <button
                      key={dt.id}
                      onClick={() => {
                        setDoorType(dt.id as any);
                        if (dt.id === 'none') setDoorsCount(0);
                        else if (doorsCount === 0) setDoorsCount(sections);
                      }}
                      className={`p-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        doorType === dt.id 
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold' 
                          : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {dt.name}
                    </button>
                  ))}
                </div>
              </div>

              {doorType !== 'none' && (
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-300">Eshiklar soni:</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setDoorsCount(cnt)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          doorsCount === cnt 
                            ? 'bg-blue-600 text-white shadow' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Thickness & Socle */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">DSP Qalinligi</label>
                  <select 
                    value={thickness}
                    onChange={(e) => setThickness(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={16}>16 mm (Standart)</option>
                    <option value={18}>18 mm (Premium)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tsokol (Oyoq) balandligi</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={socleHeight}
                      onChange={(e) => setSocleHeight(Number(e.target.value))}
                      step={10}
                      min={0}
                      max={150}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white font-mono"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-500">mm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Narx Sozlamalari (Akkordeon) */}
          <details className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3 shadow-lg">
            <summary className="text-xs font-bold text-slate-300 cursor-pointer flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Material va Xizmat Narxlari (Sozlash)
              </span>
              <span className="text-[10px] text-blue-400">O'zgartirish</span>
            </summary>
            
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700 text-xs">
              <div>
                <label className="text-[10px] text-slate-400">DSP 1 List (so'm)</label>
                <input 
                  type="number" 
                  value={dspSheetPrice} 
                  onChange={(e) => setDspSheetPrice(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Kromka 1 m (so'm)</label>
                <input 
                  type="number" 
                  value={edgePricePerMeter} 
                  onChange={(e) => setEdgePricePerMeter(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">1 ta Petlya (so'm)</label>
                <input 
                  type="number" 
                  value={hingePrice} 
                  onChange={(e) => setHingePrice(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Napravlyayushaya (juft)</label>
                <input 
                  type="number" 
                  value={drawerSlidePrice} 
                  onChange={(e) => setDrawerSlidePrice(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">1 ta Tutqich (so'm)</label>
                <input 
                  type="number" 
                  value={handlePrice} 
                  onChange={(e) => setHandlePrice(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Ish haqi & foyda (%)</label>
                <input 
                  type="number" 
                  value={laborPercent} 
                  onChange={(e) => setLaborPercent(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </details>

        </div>

        {/* RIGHT COLUMN: 3D Studio, 2D Blueprint & Detalizatsiya (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">

          {/* Navigation Sub-Tabs */}
          <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === '3d' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Dizayn</span>
              </button>

              <button
                onClick={() => setActiveTab('blueprint')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'blueprint' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>2D Texnik Chizma</span>
              </button>

              <button
                onClick={() => setActiveTab('cutlist')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'cutlist' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Detalizatsiya</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-900/60 rounded-full font-mono">
                  {calculations.parts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sheet_layout')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'sheet_layout' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Raskroy (List)</span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'pricing' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Smeta</span>
              </button>
            </div>
          </div>

          {/* Printable Area Container */}
          <div ref={printRef} className="space-y-4">

            {/* TAB 1: 3D INTERACTIVE VIEWER */}
            {activeTab === '3d' && (
              <div className="space-y-3">
                <Furniture3DViewer
                  height={height}
                  width={width}
                  depth={depth}
                  thickness={thickness}
                  socleHeight={socleHeight}
                  sections={sections}
                  shelvesPerSection={shelvesPerSection}
                  drawers={drawers}
                  hasHanger={hasHanger}
                  doorType={doorType}
                  doorsCount={doorsCount}
                  materialColor={materialColor}
                  handleColor={handleColor}
                  doorsOpen={doorsOpen}
                  onToggleDoors={() => setDoorsOpen(!doorsOpen)}
                />

                {/* Quick Info bar under 3D */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-800/70 p-2.5 rounded-xl border border-slate-700/80">
                    <span className="text-slate-400 text-[10px] block">Mebel Rangi</span>
                    <strong className="text-white font-medium flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: materialColor }} />
                      {WOOD_COLORS.find(w => w.hex === materialColor)?.name}
                    </strong>
                  </div>

                  <div className="bg-slate-800/70 p-2.5 rounded-xl border border-slate-700/80">
                    <span className="text-slate-400 text-[10px] block">DSP Listlar soni</span>
                    <strong className="text-blue-400 font-mono mt-0.5 block">{calculations.dspSheetsNeeded} dona</strong>
                  </div>

                  <div className="bg-slate-800/70 p-2.5 rounded-xl border border-slate-700/80">
                    <span className="text-slate-400 text-[10px] block">Jami Detallar</span>
                    <strong className="text-amber-400 font-mono mt-0.5 block">{calculations.parts.reduce((a, b) => a + b.qty, 0)} dona</strong>
                  </div>

                  <div className="bg-slate-800/70 p-2.5 rounded-xl border border-slate-700/80">
                    <span className="text-slate-400 text-[10px] block">Sotuv Narxi</span>
                    <strong className="text-emerald-400 font-mono mt-0.5 block">{calculations.totalSellingPrice.toLocaleString()} UZS</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 2D TECHNICAL BLUEPRINT (CAD) */}
            {activeTab === 'blueprint' && (
              <div className={`border rounded-2xl p-5 shadow-2xl relative transition-all ${
                blueprintStyle === 'dark_cad' 
                  ? 'bg-slate-950 border-slate-800 text-slate-100' 
                  : 'bg-white border-slate-300 text-slate-900'
              }`}>
                {/* Blueprint Toolbar */}
                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-700/60">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-500 block">
                      MODERNO ENGINEERING CAD
                    </span>
                    <h3 className="text-sm font-bold">
                      {blueprintSideView ? 'Yon Ko‘rinish (Kesim / Профиль)' : 'Old Ko‘rinish (Фасад / Чертеж)'}: {width} × {height} × {depth} mm
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Switcher: Front / Side */}
                    <button
                      onClick={() => setBlueprintSideView(!blueprintSideView)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      {blueprintSideView ? "Old Ko‘rinishga o'tish" : "Yon Kesim (Side View)"}
                    </button>

                    {/* Blueprint Color Switcher */}
                    <button
                      onClick={() => setBlueprintStyle(blueprintStyle === 'dark_cad' ? 'white_paper' : 'dark_cad')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      title="Qog'oz / Bosma oq foniga o'tish"
                    >
                      {blueprintStyle === 'dark_cad' ? "Oq Qog'oz (A4)" : "Dark CAD"}
                    </button>
                  </div>
                </div>

                {/* SVG 2D CAD RENDERER */}
                <div className="w-full flex justify-center py-2 overflow-x-auto">
                  {!blueprintSideView ? (
                    /* FRONT VIEW SVG */
                    <svg 
                      viewBox={`-90 -60 ${width + 180} ${height + 130}`}
                      className="max-h-[500px] w-auto drop-shadow-xl"
                    >
                      <defs>
                        <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="10" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.2" />
                        </pattern>
                      </defs>

                      {/* Side Panels */}
                      <rect x="0" y="0" width={thickness} height={height - socleHeight} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />
                      <rect x={width - thickness} y="0" width={thickness} height={height - socleHeight} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />

                      {/* Top & Bottom Panels */}
                      <rect x={thickness} y="0" width={width - 2 * thickness} height={thickness} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />
                      <rect x={thickness} y={height - socleHeight - thickness} width={width - 2 * thickness} height={thickness} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />

                      {/* Socle (Tsokol) */}
                      {socleHeight > 0 && (
                        <g>
                          <rect x={thickness + 20} y={height - socleHeight} width={width - 2 * thickness - 40} height={socleHeight} fill={blueprintStyle === 'dark_cad' ? "#0f172a" : "#cbd5e1"} stroke="#64748b" strokeWidth="2" />
                          <text x={width / 2} y={height - socleHeight / 2 + 5} textAnchor="middle" fill="#64748b" fontSize="16" fontFamily="monospace">Tsokol: {socleHeight} mm</text>
                        </g>
                      )}

                      {/* Dividers */}
                      {Array.from({ length: sections - 1 }).map((_, i) => {
                        const divX = thickness + (i + 1) * calculations.sectionWidth + i * thickness;
                        return (
                          <rect key={`div-${i}`} x={divX} y={thickness} width={thickness} height={height - socleHeight - 2 * thickness} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="1.8" />
                        );
                      })}

                      {/* Shelves & Content */}
                      {Array.from({ length: sections }).map((_, secIdx) => {
                        const secX = thickness + secIdx * (calculations.sectionWidth + thickness);
                        const secW = calculations.sectionWidth;
                        const secInnerH = height - socleHeight - 2 * thickness;
                        const shelvesCount = shelvesPerSection[secIdx] || 0;
                        const shelfGap = secInnerH / (shelvesCount + 1);

                        return (
                          <g key={`sec-${secIdx}`}>
                            {Array.from({ length: shelvesCount }).map((_, sIdx) => {
                              const shelfY = thickness + (sIdx + 1) * shelfGap;
                              return (
                                <g key={`sh-${sIdx}`}>
                                  <rect x={secX + 1} y={shelfY} width={secW - 2} height={thickness} fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="1.5" />
                                  <text x={secX + secW / 2} y={shelfY - 6} textAnchor="middle" fill={blueprintStyle === 'dark_cad' ? "#94a3b8" : "#64748b"} fontSize="14" fontFamily="monospace">
                                    ↕ {Math.round(shelfGap)} mm
                                  </text>
                                </g>
                              );
                            })}

                            {/* Hanger rail in section 1 */}
                            {hasHanger && secIdx === 1 && (
                              <g>
                                <line x1={secX + 10} y1={thickness + 90} x2={secX + secW - 10} y2={thickness + 90} stroke="#38bdf8" strokeWidth="5" />
                                <text x={secX + secW / 2} y={thickness + 130} textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="bold">Truba / Ilgich</text>
                              </g>
                            )}

                            {/* Drawers in section 0 */}
                            {drawers > 0 && secIdx === 0 && (
                              <g>
                                {Array.from({ length: drawers }).map((_, dIdx) => {
                                  const dHeight = 160;
                                  const dY = height - socleHeight - thickness - (drawers - dIdx) * (dHeight + 6);
                                  return (
                                    <g key={`drw-${dIdx}`}>
                                      <rect x={secX + 4} y={dY} width={secW - 8} height={dHeight} fill={blueprintStyle === 'dark_cad' ? "#0f172a" : "#f1f5f9"} stroke="#38bdf8" strokeWidth="2" rx="3" />
                                      <rect x={secX + secW / 2 - 25} y={dY + dHeight / 2 - 4} width="50" height="8" fill="#64748b" rx="2" />
                                      <text x={secX + secW / 2} y={dY + 24} textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="monospace">Tortma #{dIdx + 1} (H:{dHeight})</text>
                                    </g>
                                  );
                                })}
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* DIMENSIONS */}
                      {/* Width dimension */}
                      <g>
                        <line x1="0" y1={height + 25} x2={width} y2={height + 25} stroke="#38bdf8" strokeWidth="2" />
                        <line x1="0" y1={height + 15} x2="0" y2={height + 35} stroke="#38bdf8" strokeWidth="2" />
                        <line x1={width} y1={height + 15} x2={width} y2={height + 35} stroke="#38bdf8" strokeWidth="2" />
                        <polygon points={`0,${height + 25} 12,${height + 21} 12,${height + 29}`} fill="#38bdf8" />
                        <polygon points={`${width},${height + 25} ${width - 12},${height + 21} ${width - 12},${height + 29}`} fill="#38bdf8" />
                        <text x={width / 2} y={height + 30} textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="bold" fontFamily="monospace">
                          W: {width} mm
                        </text>
                      </g>

                      {/* Height dimension */}
                      <g>
                        <line x1="-35" y1="0" x2="-35" y2={height} stroke="#38bdf8" strokeWidth="2" />
                        <line x1="-25" y1="0" x2="-45" y2="0" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="-25" y1={height} x2="-45" y2={height} stroke="#38bdf8" strokeWidth="2" />
                        <polygon points={`-35,0 -39,12 -31,12`} fill="#38bdf8" />
                        <polygon points={`-35,${height} -39,${height - 12} -31,${height - 12}`} fill="#38bdf8" />
                        <text x="-35" y={height / 2 + 5} textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="bold" fontFamily="monospace">
                          H: {height} mm
                        </text>
                      </g>

                      {/* Section Width Dimensions on top */}
                      {Array.from({ length: sections }).map((_, idx) => {
                        const secStartX = thickness + idx * (calculations.sectionWidth + thickness);
                        return (
                          <g key={`sec-dim-${idx}`}>
                            <line x1={secStartX} y1="-15" x2={secStartX + calculations.sectionWidth} y2="-15" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" />
                            <text x={secStartX + calculations.sectionWidth / 2} y="-20" textAnchor="middle" fill={blueprintStyle === 'dark_cad' ? "#94a3b8" : "#475569"} fontSize="13" fontFamily="monospace">
                              {calculations.sectionWidth} mm
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    /* SIDE VIEW (PROFILE) SVG */
                    <svg 
                      viewBox={`-80 -60 ${depth + 160} ${height + 130}`}
                      className="max-h-[500px] w-auto drop-shadow-xl"
                    >
                      {/* Side Panel profile */}
                      <rect x="0" y="0" width={depth} height={height - socleHeight} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />
                      
                      {/* Socle */}
                      {socleHeight > 0 && (
                        <rect x="25" y={height - socleHeight} width={depth - 50} height={socleHeight} fill="#0f172a" stroke="#64748b" strokeWidth="2" />
                      )}

                      {/* Back panel groove */}
                      <rect x="3" y="0" width="4" height={height - socleHeight} fill="#38bdf8" />
                      
                      {/* Depth dimension */}
                      <line x1="0" y1={height + 25} x2={depth} y2={height + 25} stroke="#38bdf8" strokeWidth="2" />
                      <line x1="0" y1={height + 15} x2="0" y2={height + 35} stroke="#38bdf8" strokeWidth="2" />
                      <line x1={depth} y1={height + 15} x2={depth} y2={height + 35} stroke="#38bdf8" strokeWidth="2" />
                      <polygon points={`0,${height + 25} 10,${height + 21} 10,${height + 29}`} fill="#38bdf8" />
                      <polygon points={`${depth},${height + 25} ${depth - 10},${height + 21} ${depth - 10},${height + 29}`} fill="#38bdf8" />
                      <text x={depth / 2} y={height + 30} textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="bold" fontFamily="monospace">
                        D: {depth} mm
                      </text>

                      {/* Height dimension on left */}
                      <line x1="-35" y1="0" x2="-35" y2={height} stroke="#38bdf8" strokeWidth="2" />
                      <text x="-35" y={height / 2 + 5} textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="bold" fontFamily="monospace">
                        H: {height} mm
                      </text>

                      <text x={depth / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="20" fontWeight="bold">
                        Yon Ko‘rinish (Chuqurlik: {depth}mm)
                      </text>
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DETALIZATSIYA (CUT LIST TABLE) */}
            {activeTab === 'cutlist' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-blue-400" />
                      Sex uchun To'liq Detalizatsiya (Raskroy xaritasi)
                    </h3>
                    <p className="text-[11px] text-slate-400">Arra va kromka ustalari uchun 4 tomonlama aniq o'lchamlar jadvali</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/30">
                      Jami detallar: {calculations.parts.reduce((sum, p) => sum + p.qty, 0)} dona
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Detal nomi</th>
                        <th className="py-2.5 px-3 text-right">Bo'yi (mm)</th>
                        <th className="py-2.5 px-3 text-right">Eni (mm)</th>
                        <th className="py-2.5 px-3 text-center">Soni</th>
                        <th className="py-2.5 px-3">Material</th>
                        <th className="py-2.5 px-3">Kromka (U1 / K1)</th>
                        <th className="py-2.5 px-3">Burg'ulash (Priadka)</th>
                        <th className="py-2.5 px-3 text-right">Maydon (m²)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                      {calculations.parts.map((part, index) => (
                        <tr key={part.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-bold">{index + 1}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">
                            {part.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                            {part.length}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                            {part.width}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-bold">
                              {part.qty}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">
                            {part.material}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] block truncate">
                              {part.edgeU1} {part.edgeK1 !== '—' ? `| ${part.edgeK1}` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                            {part.drillingNote}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {part.area.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Material Requirement */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Jami DSP maydoni</span>
                    <strong className="text-sm font-mono text-white">
                      {calculations.totalDspArea.toFixed(2)} m²
                    </strong>
                    <span className="text-[10px] text-blue-400 block mt-0.5">
                      Kerak: {calculations.dspSheetsNeeded} list (2750x1830)
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Jami DVP maydoni</span>
                    <strong className="text-sm font-mono text-white">
                      {calculations.totalDvpArea.toFixed(2)} m²
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Kerak: {calculations.dvpSheetsNeeded} list
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Kromka 2.0 mm (Oldi)</span>
                    <strong className="text-sm font-mono text-emerald-400">
                      {calculations.edge2mmMeters} metr
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Fasad va old tomonlar
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Kromka 0.4 mm (Ichki)</span>
                    <strong className="text-sm font-mono text-teal-400">
                      {calculations.edge04mmMeters} metr
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Ichki qirralar uchun
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SHEET LAYOUT (RASKROY SXEMASI) */}
            {activeTab === 'sheet_layout' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-blue-400" />
                      DSP Listlar Joylashuvi (Raskroy Xaritasi)
                    </h3>
                    <p className="text-[11px] text-slate-400">Standart 2750 × 1830 mm listda detallarning optimal tartibi</p>
                  </div>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/30">
                    Jami listlar: {calculations.dspSheetsNeeded} dona
                  </span>
                </div>

                {/* Visual Sheet Layout */}
                <div className="space-y-4">
                  {Array.from({ length: calculations.dspSheetsNeeded }).map((_, sheetIdx) => (
                    <div key={`sheet-${sheetIdx}`} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            {sheetIdx + 1}
                          </span>
                          DSP List #{sheetIdx + 1} (2750 × 1830 mm)
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">Maydon: 5.03 m²</span>
                      </div>

                      {/* Proportional Sheet Representation */}
                      <div className="w-full h-36 bg-slate-950 border-2 border-dashed border-slate-700 rounded-lg p-2 relative flex flex-wrap gap-1.5 overflow-hidden">
                        {sheetIdx === 0 ? (
                          <>
                            <div className="h-full w-28 bg-blue-600/30 border border-blue-500 rounded p-1 text-[10px] text-blue-200 flex flex-col justify-center text-center">
                              <span className="font-bold">Bogovina #1</span>
                              <span className="font-mono text-[9px]">{height - socleHeight}x{depth}</span>
                            </div>
                            <div className="h-full w-28 bg-blue-600/30 border border-blue-500 rounded p-1 text-[10px] text-blue-200 flex flex-col justify-center text-center">
                              <span className="font-bold">Bogovina #2</span>
                              <span className="font-mono text-[9px]">{height - socleHeight}x{depth}</span>
                            </div>
                            <div className="h-full flex-1 flex flex-col gap-1">
                              <div className="h-1/2 bg-indigo-600/30 border border-indigo-500 rounded p-1 text-[10px] text-indigo-200 flex items-center justify-center font-bold">
                                Krisha ({width - 2 * thickness}x{depth})
                              </div>
                              <div className="h-1/2 bg-indigo-600/30 border border-indigo-500 rounded p-1 text-[10px] text-indigo-200 flex items-center justify-center font-bold">
                                Dno ({width - 2 * thickness}x{depth})
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-full w-40 bg-emerald-600/30 border border-emerald-500 rounded p-1 text-[10px] text-emerald-200 flex flex-col justify-center text-center">
                              <span className="font-bold">Fasad / Eshiklar</span>
                              <span className="font-mono text-[9px]">Aniq kroy</span>
                            </div>
                            <div className="h-full flex-1 flex flex-wrap gap-1">
                              {Array.from({ length: 4 }).map((_, pIdx) => (
                                <div key={pIdx} className="h-14 w-28 bg-amber-600/30 border border-amber-500 rounded p-1 text-[10px] text-amber-200 flex items-center justify-center font-bold">
                                  Polka #{pIdx + 1}
                                </div>
                              ))}
                              {drawers > 0 && (
                                <div className="h-14 flex-1 bg-teal-600/30 border border-teal-500 rounded p-1 text-[10px] text-teal-200 flex items-center justify-center font-bold">
                                  Tortma detallari
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: PRICING & HARDWARE ESTIMATE */}
            {activeTab === 'pricing' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Smeta va Yakuniy Narx Hisob-Kitobi
                    </h3>
                    <p className="text-[11px] text-slate-400">Materiallar tannarxi, furnituralar va ustaxonaning sotuv taklifi</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Sotuv Narxi</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {calculations.totalSellingPrice.toLocaleString()} UZS
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Materials & Cost List */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                      1. Materiallar va Furnituralar Tannarxi
                    </h4>
                    
                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">DSP ({calculations.dspSheetsNeeded} list):</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costDsp.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">DVP orqa fon ({calculations.dvpSheetsNeeded} list):</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costDvp.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Kromka ({calculations.totalEdgeMeters} m):</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costEdge.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Petlyalar ({calculations.hingesCount} dona):</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costHinges.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Napravlyayushie ({calculations.drawerSlidesCount} juft):</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costSlides.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Tutqichlar / Ruchka ({calculations.handlesCount} dona):</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costHandles.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Konfirmat, podpyatnik, shurup:</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costFasteners.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs pt-1 font-bold text-white">
                      <span>Jami Materiallar Tannarxi:</span>
                      <span className="font-mono text-blue-400">{calculations.materialsCost.toLocaleString()} UZS</span>
                    </div>
                  </div>

                  {/* Right: Profit & Final Proposal */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                        2. Ustaxona Mehnati va Foydasi
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tannarxga sex mehnati, kesish, kromka urish, yetkazish va korxona foydasi ({laborPercent}%) qo'shilgan.
                      </p>

                      <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Ish haqi va ustama ({laborPercent}%):</span>
                          <span className="font-mono font-bold text-emerald-400">
                            +{calculations.laborAndMargin.toLocaleString()} UZS
                          </span>
                        </div>
                        <div className="h-px bg-slate-800" />
                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-xs font-bold text-white">Mijozga Sotuv Narxi:</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">
                            {calculations.totalSellingPrice.toLocaleString()} UZS
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCopySummary}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Smetani Telegram uchun nusxalash</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
