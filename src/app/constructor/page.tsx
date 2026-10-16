'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  Ruler, 
  Box, 
  Layers, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  RotateCw, 
  Check, 
  ChevronRight, 
  Plus, 
  Minus, 
  Sliders, 
  DollarSign, 
  Info, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Share2,
  Copy,
  Sparkles,
  Scissors
} from 'lucide-react';
import Link from 'next/link';

// Preset Templates
const PRESETS = [
  {
    id: 'wardrobe_2door',
    name: '2-Eshikli Garderob',
    category: 'Shkaf',
    icon: '🚪',
    height: 2100,
    width: 1200,
    depth: 550,
    sections: 2,
    shelves: [4, 1], // Section 0 has 4 shelves, Section 1 has 1 shelf (and hanger)
    hasHanger: true,
    drawers: 2,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2
  },
  {
    id: 'wardrobe_3door',
    name: '3-Eshikli Katta Shkaf',
    category: 'Shkaf',
    icon: '🚪',
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
    doorsCount: 3
  },
  {
    id: 'wardrobe_sliding',
    name: 'Shkaf-Kupé (Suriladigan)',
    category: 'Shkaf',
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
    doorsCount: 2
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
    doorsCount: 2
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
    doorsCount: 2
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
    doorsCount: 0
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

  // Pricing Parameters (UZS)
  const [dspSheetPrice, setDspSheetPrice] = useState<number>(460000); // 1 list 2750x1830
  const [dvpSheetPrice, setDvpSheetPrice] = useState<number>(90000); // 1 list DVP
  const [edgePricePerMeter, setEdgePricePerMeter] = useState<number>(3500); // 1 metr kromka
  const [hingePrice, setHingePrice] = useState<number>(15000); // 1 ta petlya
  const [drawerSlidePrice, setDrawerSlidePrice] = useState<number>(45000); // 1 kompl. napravlyayushie
  const [handlePrice, setHandlePrice] = useState<number>(20000); // 1 ta ruchka
  const [laborPercent, setLaborPercent] = useState<number>(30); // 30% ish haqi va ustama

  // View States
  const [activeTab, setActiveTab] = useState<'blueprint' | 'cutlist' | 'pricing'>('blueprint');
  const [doorsOpen, setDoorsOpen] = useState<boolean>(true);
  const [isIsometric, setIsIsometric] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Apply a Preset
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
  };

  // Section shelf adjust
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
      edge: string; // e.g., '1U' (1 uzun), '2U+2K' (aylanasi)
      area: number; // m2
    }

    const parts: Part[] = [];

    // 1. Yon devorlar (Bogovinalar)
    parts.push({
      id: 'bogovina',
      name: 'Yon devor (Боковина)',
      detailNameRu: 'Боковина',
      length: bodyHeight,
      width: depth,
      qty: 2,
      material: `DSP ${T}mm`,
      edge: '1U (Oldi tomoni)',
      area: (bodyHeight * depth * 2) / 1000000
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
      edge: '1U (Oldi tomoni)',
      area: ((width - 2 * T) * depth * 2) / 1000000
    });

    // 3. Tsokol (Ostki planka)
    if (socleHeight > 0) {
      parts.push({
        id: 'tsokol',
        name: 'Tsokol plankasi (Цоколь)',
        detailNameRu: 'Цоколь',
        length: width - 2 * T,
        width: socleHeight,
        qty: 2,
        material: `DSP ${T}mm`,
        edge: '1U',
        area: ((width - 2 * T) * socleHeight * 2) / 1000000
      });
    }

    // 4. Vertikal to'siqlar (Peregorodkalar)
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
        edge: '1U (Oldi tomoni)',
        area: (innerHeight * (depth - 10) * dividerCount) / 1000000
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
        edge: '1U (Oldi tomoni)',
        area: (sectionWidth * (depth - 20) * totalShelves) / 1000000
      });
    }

    // 6. Tortmalar (Drawers)
    if (drawers > 0) {
      const runnerLen = depth >= 550 ? 500 : depth >= 500 ? 450 : depth >= 450 ? 400 : 350;
      const boxHeight = 140;
      const innerDrawerWidth = sectionWidth - 26; // 13mm each side for slides

      // Yonlari
      parts.push({
        id: 'drawer_sides',
        name: 'Tortma yonlari',
        detailNameRu: 'Боковины ящика',
        length: runnerLen,
        width: boxHeight,
        qty: drawers * 2,
        material: `DSP ${T}mm`,
        edge: '1U (Ustki tomoni)',
        area: (runnerLen * boxHeight * drawers * 2) / 1000000
      });

      // Oldi va orqasi
      parts.push({
        id: 'drawer_front_back',
        name: 'Tortma oldi/orqasi',
        detailNameRu: 'Перед/зад ящика',
        length: innerDrawerWidth - 2 * T,
        width: boxHeight,
        qty: drawers * 2,
        material: `DSP ${T}mm`,
        edge: '1U (Ustki tomoni)',
        area: ((innerDrawerWidth - 2 * T) * boxHeight * drawers * 2) / 1000000
      });

      // Tortma tagligi (DVP)
      parts.push({
        id: 'drawer_bottom',
        name: 'Tortma tagligi (DVP)',
        detailNameRu: 'Дно ящика (ДВП)',
        length: innerDrawerWidth,
        width: runnerLen,
        qty: drawers,
        material: 'DVP 3mm',
        edge: 'Yo‘q',
        area: (innerDrawerWidth * runnerLen * drawers) / 1000000
      });

      // Tortma fasadi
      parts.push({
        id: 'drawer_facade',
        name: 'Tortma fasadi',
        detailNameRu: 'Фасад ящика',
        length: sectionWidth - 4,
        width: 180,
        qty: drawers,
        material: `DSP ${T}mm`,
        edge: 'Aylanasi (2U+2K)',
        area: ((sectionWidth - 4) * 180 * drawers) / 1000000
      });
    }

    // 7. Fasadlar / Eshiklar (Doors)
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
          edge: 'Aylanasi (2U+2K)',
          area: (doorH * doorW * doorsCount) / 1000000
        });
      } else if (doorType === 'sliding') {
        const doorH = bodyHeight - 45; // Track gap
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
          edge: 'Profil / 2U+2K',
          area: (doorH * doorW * doorsCount) / 1000000
        });
      }
    }

    // 8. Orqa fon (DVP / XDF)
    parts.push({
      id: 'back_panel',
      name: 'Orqa fon (ДВП/ХДФ)',
      detailNameRu: 'Задняя стенка (ДВП)',
      length: bodyHeight,
      width: width,
      qty: 1,
      material: 'DVP 3mm',
      edge: 'Yo‘q',
      area: (bodyHeight * width) / 1000000
    });

    // Totals calculations
    const dspParts = parts.filter(p => p.material.startsWith('DSP'));
    const dvpParts = parts.filter(p => p.material.startsWith('DVP'));

    const totalDspArea = dspParts.reduce((sum, p) => sum + p.area, 0);
    const totalDvpArea = dvpParts.reduce((sum, p) => sum + p.area, 0);

    // Standard DSP Sheet: 2.75m x 1.83m = 5.0325 m2
    // Cutting waste factor: 1.15 (+15%)
    const sheetArea = 2.75 * 1.83;
    const dspSheetsNeeded = Math.ceil((totalDspArea * 1.15) / sheetArea);
    const dvpSheetsNeeded = Math.ceil((totalDvpArea * 1.1) / sheetArea);

    // Edgebanding length estimation (in linear meters)
    let totalEdgeMeters = 0;
    parts.forEach(p => {
      if (p.edge.includes('1U')) {
        totalEdgeMeters += (p.length / 1000) * p.qty;
      } else if (p.edge.includes('2U+2K') || p.edge.includes('Aylanasi')) {
        totalEdgeMeters += (2 * (p.length + p.width) / 1000) * p.qty;
      }
    });
    totalEdgeMeters = Math.ceil(totalEdgeMeters * 1.1); // +10% reserve

    // Hardware calculation
    let hingesCount = 0;
    if (doorType === 'hinged' && doorsCount > 0) {
      const doorH = bodyHeight;
      const hingesPerDoor = doorH < 1000 ? 2 : doorH < 1600 ? 3 : doorH < 2050 ? 4 : 5;
      hingesCount = doorsCount * hingesPerDoor;
    }

    const drawerSlidesCount = drawers; // pairs
    const handlesCount = (doorType === 'hinged' ? doorsCount : 0) + drawers;
    const legsCount = width < 1200 ? 4 : width < 2000 ? 6 : 8;
    const confirmatsCount = (sections * 8) + (totalShelves * 4) + (drawers * 8) + 16;

    // Costs
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

  // Export PDF or Image
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
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Moderno_Mebel_${width}x${height}x${depth}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert("PDF yuklab olishda xatolik yuz berdi. Iltimos 'Chop etish' tugmasidan foydalaning.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    const text = `📐 MODERNO MEBEL - CHIZMA VA DETALIZATSIYA
O'lchamlari: ${width} x ${height} x ${depth} mm
Material: DSP ${thickness} mm | Tsokol: ${socleHeight} mm
Bo'limlar: ${sections} ta | Tortmalar: ${drawers} ta | Fasad: ${doorType}

📊 SARF-XARAJATLAR:
• DSP List: ${calculations.dspSheetsNeeded} dona (${calculations.totalDspArea.toFixed(2)} m²)
• DVP List: ${calculations.dvpSheetsNeeded} dona (${calculations.totalDvpArea.toFixed(2)} m²)
• Kromka: ${calculations.totalEdgeMeters} metr
• Petlyalar: ${calculations.hingesCount} dona
• Napravlyayushie: ${calculations.drawerSlidesCount} juft
• Tutqichlar (Ruchka): ${calculations.handlesCount} dona

💰 TAXMINIY SOTUV NARXI: ${calculations.totalSellingPrice.toLocaleString()} so'm
(Materiallar: ${calculations.materialsCost.toLocaleString()} so'm | Ish haqi & Daromad: ${calculations.laborAndMargin.toLocaleString()} so'm)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ilovaga qaytish</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Moderno Konstruktor
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30">
                  Pro CAD
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Mebel hisoblash, dizayn va detalizatsiya</p>
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
      <div className="bg-slate-950/70 border-b border-slate-800 px-4 py-2.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Shablonlar:
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

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & Input Parameters */}
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

            {/* Range Sliders for Quick Dragging */}
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

          {/* 2. Ichki Konfiguratsiya */}
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

          {/* 3. Fasad va Material parametrlari */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
              <Layers className="w-4 h-4" />
              Fasad va Material Sozlamalari
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

          {/* 4. Narx Sozlamalari (Akkordeon) */}
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
                <label className="text-[10px] text-slate-400">DSP 1 List narxi (so'm)</label>
                <input 
                  type="number" 
                  value={dspSheetPrice} 
                  onChange={(e) => setDspSheetPrice(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Kromka 1 metr (so'm)</label>
                <input 
                  type="number" 
                  value={edgePricePerMeter} 
                  onChange={(e) => setEdgePricePerMeter(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">1 ta Petlya narxi (so'm)</label>
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
                <label className="text-[10px] text-slate-400">Ish haqi va ustama (%)</label>
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

        {/* RIGHT COLUMN: Interactive Drawing & Detalizatsiya */}
        <div className="lg:col-span-7 space-y-4">

          {/* Navigation Sub-Tabs */}
          <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('blueprint')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'blueprint' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>2D/3D Chizma</span>
              </button>

              <button
                onClick={() => setActiveTab('cutlist')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'cutlist' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Detalizatsiya (Kroy)</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-900/60 rounded-full font-mono">
                  {calculations.parts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'pricing' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Xarajatlar & Narx</span>
              </button>
            </div>

            {/* Quick View Toggles */}
            {activeTab === 'blueprint' && (
              <div className="flex items-center gap-1.5 pr-1">
                {doorType !== 'none' && (
                  <button
                    onClick={() => setDoorsOpen(!doorsOpen)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700"
                    title={doorsOpen ? "Eshiklarni yopish" : "Eshiklarni ochish"}
                  >
                    {doorsOpen ? <EyeOff className="w-3.5 h-3.5 text-blue-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="hidden sm:inline">{doorsOpen ? 'Eshik ochiq' : 'Eshik yopiq'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsIsometric(!isIsometric)}
                  className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 ${
                    isIsometric 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="3D Izometrik ko'rinish"
                >
                  <Box className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">3D</span>
                </button>
              </div>
            )}
          </div>

          {/* Printable Area Container */}
          <div ref={printRef} className="space-y-4 bg-slate-900 p-2 rounded-2xl">

            {/* TAB 1: BLUEPRINT DRAWING */}
            {activeTab === 'blueprint' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
                {/* Blueprint grid background */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* Header inside Blueprint */}
                <div className="w-full flex items-center justify-between mb-4 z-10 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-blue-400 tracking-wider">
                      MODERNO CAD • TEXNIK CHIZMA
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Mebel: {width} x {height} x {depth} mm
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-400 block">
                      Masshtab: Avto | DSP {thickness}mm
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Tannarx: {calculations.totalSellingPrice.toLocaleString()} UZS
                    </span>
                  </div>
                </div>

                {/* SVG CAD RENDERER */}
                <div className="w-full flex justify-center py-4 z-10">
                  <svg 
                    viewBox={`-80 -60 ${width + 160} ${height + 120}`}
                    className="max-h-[520px] w-auto drop-shadow-2xl transition-all duration-300"
                    style={{
                      transform: isIsometric ? 'rotateX(15deg) rotateY(-20deg) scale(0.95)' : 'none',
                      transformOrigin: 'center'
                    }}
                  >
                    <defs>
                      {/* Wood grain pattern or panel fill */}
                      <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <linearGradient id="woodTexture" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="50%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                      <linearGradient id="doorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>

                    {/* Outer cabinet frame */}
                    {/* 1. Left side panel (Bogovina chap) */}
                    <rect
                      x="0"
                      y="0"
                      width={thickness}
                      height={height - socleHeight}
                      fill="url(#woodTexture)"
                      stroke="#60a5fa"
                      strokeWidth="2"
                    />

                    {/* 2. Right side panel (Bogovina o'ng) */}
                    <rect
                      x={width - thickness}
                      y="0"
                      width={thickness}
                      height={height - socleHeight}
                      fill="url(#woodTexture)"
                      stroke="#60a5fa"
                      strokeWidth="2"
                    />

                    {/* 3. Top panel (Krisha) */}
                    <rect
                      x={thickness}
                      y="0"
                      width={width - 2 * thickness}
                      height={thickness}
                      fill="url(#woodTexture)"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                    />

                    {/* 4. Bottom panel (Dno) */}
                    <rect
                      x={thickness}
                      y={height - socleHeight - thickness}
                      width={width - 2 * thickness}
                      height={thickness}
                      fill="url(#woodTexture)"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                    />

                    {/* 5. Socle (Plinth / Tsokol) */}
                    {socleHeight > 0 && (
                      <g>
                        <rect
                          x={thickness + 20}
                          y={height - socleHeight}
                          width={width - 2 * thickness - 40}
                          height={socleHeight}
                          fill="#0f172a"
                          stroke="#475569"
                          strokeWidth="2"
                        />
                        {/* Legs / Podpyatnik */}
                        <rect x={thickness + 30} y={height - 8} width="20" height="8" fill="#94a3b8" />
                        <rect x={width - thickness - 50} y={height - 8} width="20" height="8" fill="#94a3b8" />
                        {width >= 1600 && (
                          <rect x={width / 2 - 10} y={height - 8} width="20" height="8" fill="#94a3b8" />
                        )}
                        <text
                          x={width / 2}
                          y={height - socleHeight / 2 + 4}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="18"
                          fontFamily="monospace"
                        >
                          Tsokol: {socleHeight} mm
                        </text>
                      </g>
                    )}

                    {/* 6. Vertical Dividers (Peregorodkalar) */}
                    {Array.from({ length: sections - 1 }).map((_, i) => {
                      const divX = thickness + (i + 1) * calculations.sectionWidth + i * thickness;
                      return (
                        <g key={`div-${i}`}>
                          <rect
                            x={divX}
                            y={thickness}
                            width={thickness}
                            height={height - socleHeight - 2 * thickness}
                            fill="url(#woodTexture)"
                            stroke="#60a5fa"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}

                    {/* 7. Shelves, Drawers, Hangers inside each section */}
                    {Array.from({ length: sections }).map((_, secIdx) => {
                      const secX = thickness + secIdx * (calculations.sectionWidth + thickness);
                      const secW = calculations.sectionWidth;
                      const secInnerH = height - socleHeight - 2 * thickness;
                      const shelvesCount = shelvesPerSection[secIdx] || 0;

                      // Calculate shelves Y positions
                      const shelfGap = secInnerH / (shelvesCount + 1);

                      return (
                        <g key={`sec-${secIdx}`}>
                          {/* Shelves */}
                          {Array.from({ length: shelvesCount }).map((_, sIdx) => {
                            const shelfY = thickness + (sIdx + 1) * shelfGap;
                            return (
                              <g key={`sh-${sIdx}`}>
                                <rect
                                  x={secX + 2}
                                  y={shelfY}
                                  width={secW - 4}
                                  height={thickness}
                                  fill="#334155"
                                  stroke="#93c5fd"
                                  strokeWidth="1.2"
                                />
                                {/* Shelf internal measurement text */}
                                <text
                                  x={secX + secW / 2}
                                  y={shelfY - 6}
                                  textAnchor="middle"
                                  fill="#94a3b8"
                                  fontSize="14"
                                  fontFamily="monospace"
                                >
                                  {Math.round(shelfGap)} mm
                                </text>
                              </g>
                            );
                          })}

                          {/* Clothes Hanger Rail (if enabled and in this section) */}
                          {hasHanger && secIdx === 1 && (
                            <g>
                              {/* Metal rail */}
                              <line
                                x1={secX + 10}
                                y1={thickness + 90}
                                x2={secX + secW - 10}
                                y2={thickness + 90}
                                stroke="#cbd5e1"
                                strokeWidth="6"
                                strokeLinecap="round"
                              />
                              {/* Flange circles */}
                              <circle cx={secX + 12} cy={thickness + 90} r="6" fill="#64748b" />
                              <circle cx={secX + secW - 12} cy={thickness + 90} r="6" fill="#64748b" />
                              {/* Hanger icon stylized */}
                              <path
                                d={`M ${secX + secW / 2 - 25} ${thickness + 120} L ${secX + secW / 2} ${thickness + 95} L ${secX + secW / 2 + 25} ${thickness + 120} Z`}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="2.5"
                              />
                              <text
                                x={secX + secW / 2}
                                y={thickness + 145}
                                textAnchor="middle"
                                fill="#38bdf8"
                                fontSize="14"
                                fontWeight="bold"
                              >
                                Kiyim Ilgich
                              </text>
                            </g>
                          )}

                          {/* Drawers (if in first section) */}
                          {drawers > 0 && secIdx === 0 && (
                            <g>
                              {Array.from({ length: drawers }).map((_, dIdx) => {
                                const dHeight = 160;
                                const dY = height - socleHeight - thickness - (drawers - dIdx) * (dHeight + 6);
                                return (
                                  <g key={`drw-${dIdx}`}>
                                    <rect
                                      x={secX + 4}
                                      y={dY}
                                      width={secW - 8}
                                      height={dHeight}
                                      fill="#1e293b"
                                      stroke="#38bdf8"
                                      strokeWidth="2"
                                      rx="4"
                                    />
                                    {/* Handle */}
                                    <rect
                                      x={secX + secW / 2 - 30}
                                      y={dY + dHeight / 2 - 4}
                                      width="60"
                                      height="8"
                                      fill="#94a3b8"
                                      rx="3"
                                    />
                                    <text
                                      x={secX + secW / 2}
                                      y={dY + 25}
                                      textAnchor="middle"
                                      fill="#64748b"
                                      fontSize="12"
                                      fontFamily="monospace"
                                    >
                                      Tortma #{dIdx + 1}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* 8. Doors Overlay (if doors closed) */}
                    {doorType !== 'none' && !doorsOpen && (
                      <g opacity="0.95">
                        {Array.from({ length: doorsCount }).map((_, dIdx) => {
                          const dWidth = (width - 4) / doorsCount;
                          const dX = 2 + dIdx * dWidth;
                          const dY = 2;
                          const dHeight = height - socleHeight - 4;
                          return (
                            <g key={`door-${dIdx}`}>
                              <rect
                                x={dX + 2}
                                y={dY}
                                width={dWidth - 4}
                                height={dHeight}
                                fill="url(#doorGradient)"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                rx="4"
                              />
                              {/* Handle */}
                              <rect
                                x={dIdx % 2 === 0 ? dX + dWidth - 25 : dX + 15}
                                y={dHeight / 2 - 50}
                                width="8"
                                height="100"
                                fill="#f8fafc"
                                rx="3"
                                stroke="#1e293b"
                                strokeWidth="2"
                              />
                              {/* Direction arrow line (DIN opening standard) */}
                              {doorType === 'hinged' && (
                                <path
                                  d={
                                    dIdx % 2 === 0
                                      ? `M ${dX + 6} ${dY + 10} L ${dX + dWidth - 10} ${dY + dHeight / 2} L ${dX + 6} ${dY + dHeight - 10}`
                                      : `M ${dX + dWidth - 6} ${dY + 10} L ${dX + 10} ${dY + dHeight / 2} L ${dX + dWidth - 6} ${dY + dHeight - 10}`
                                  }
                                  fill="none"
                                  stroke="#60a5fa"
                                  strokeWidth="1.5"
                                  strokeDasharray="6 6"
                                />
                              )}
                              <text
                                x={dX + dWidth / 2}
                                y={dY + dHeight / 2}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="16"
                                fontWeight="bold"
                              >
                                Fasad #{dIdx + 1}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* DIMENSION LINES & ARROWS */}
                    {/* Bottom Width Dimension */}
                    <g>
                      <line x1="0" y1={height + 25} x2={width} y2={height + 25} stroke="#38bdf8" strokeWidth="2" />
                      <line x1="0" y1={height + 15} x2="0" y2={height + 35} stroke="#38bdf8" strokeWidth="2" />
                      <line x1={width} y1={height + 15} x2={width} y2={height + 35} stroke="#38bdf8" strokeWidth="2" />
                      {/* Left Arrow */}
                      <polygon points={`0,${height + 25} 12,${height + 21} 12,${height + 29}`} fill="#38bdf8" />
                      {/* Right Arrow */}
                      <polygon points={`${width},${height + 25} ${width - 12},${height + 21} ${width - 12},${height + 29}`} fill="#38bdf8" />
                      <rect x={width / 2 - 55} y={height + 12} width="110" height="26" fill="#0f172a" rx="4" />
                      <text
                        x={width / 2}
                        y={height + 30}
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="18"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        W: {width} mm
                      </text>
                    </g>

                    {/* Left Height Dimension */}
                    <g>
                      <line x1="-35" y1="0" x2="-35" y2={height} stroke="#38bdf8" strokeWidth="2" />
                      <line x1="-25" y1="0" x2="-45" y2="0" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="-25" y1={height} x2="-45" y2={height} stroke="#38bdf8" strokeWidth="2" />
                      {/* Top Arrow */}
                      <polygon points={`-35,0 -39,12 -31,12`} fill="#38bdf8" />
                      {/* Bottom Arrow */}
                      <polygon points={`-35,${height} -39,${height - 12} -31,${height - 12}`} fill="#38bdf8" />
                      <rect x="-70" y={height / 2 - 15} width="80" height="26" fill="#0f172a" rx="4" />
                      <text
                        x="-35"
                        y={height / 2 + 4}
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="18"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        H: {height}
                      </text>
                    </g>

                    {/* Section Top Width Dimension Markers */}
                    {Array.from({ length: sections }).map((_, idx) => {
                      const secStartX = thickness + idx * (calculations.sectionWidth + thickness);
                      const secCenterX = secStartX + calculations.sectionWidth / 2;
                      return (
                        <g key={`sec-top-${idx}`}>
                          <line x1={secStartX} y1="-15" x2={secStartX + calculations.sectionWidth} y2="-15" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                          <text
                            x={secCenterX}
                            y="-20"
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="13"
                            fontFamily="monospace"
                          >
                            {calculations.sectionWidth} mm
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend bar */}
                <div className="w-full mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-slate-400">
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500">Chuqurlik (D)</span>
                    <strong className="text-white text-xs font-mono">{depth} mm</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500">Bo'limlar kengligi</span>
                    <strong className="text-white text-xs font-mono">~{calculations.sectionWidth} mm</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500">DSP Listlar soni</span>
                    <strong className="text-blue-400 text-xs font-mono">{calculations.dspSheetsNeeded} dona</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-500">Kromka uzunligi</span>
                    <strong className="text-emerald-400 text-xs font-mono">{calculations.totalEdgeMeters} metr</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DETALIZATSIYA (CUT LIST TABLE) */}
            {activeTab === 'cutlist' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-blue-400" />
                      Sex uchun Detalizatsiya (Raskroy xaritasi)
                    </h3>
                    <p className="text-[11px] text-slate-400">Arra va kromka ustasi uchun tayyor o'lchamlar jadvali</p>
                  </div>
                  <div className="text-right">
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
                        <th className="py-2.5 px-3 text-right">Uzunlik (mm)</th>
                        <th className="py-2.5 px-3 text-right">Kenglik (mm)</th>
                        <th className="py-2.5 px-3 text-center">Soni</th>
                        <th className="py-2.5 px-3">Material</th>
                        <th className="py-2.5 px-3">Kromka</th>
                        <th className="py-2.5 px-3 text-right">Maydoni (m²)</th>
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
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              {part.edge}
                            </span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
                    <span className="text-[11px] text-slate-400 block">Kromka uzunligi</span>
                    <strong className="text-sm font-mono text-emerald-400">
                      {calculations.totalEdgeMeters} metr
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      (+10% zaxira bilan)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRICING & HARDWARE ESTIMATE */}
            {activeTab === 'pricing' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Hisob-Kitob va Smeta
                    </h3>
                    <p className="text-[11px] text-slate-400">Materiallar, furnituralar va sotuv narxi</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Yakuniy Narx</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {calculations.totalSellingPrice.toLocaleString()} UZS
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Materials & Cost List */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                      1. Materiallar va Furnituralar
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
                      <span className="text-slate-300">Konfirmat, shurup, podpyatnik:</span>
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
                        2. Ish Haqi va Mijozga Taklif
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tannarxga sex mehnati, yetkazish, o'rnatish va korxona foyda ustamasi ({laborPercent}%) qo'shilgan.
                      </p>

                      <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Ustaxona mehnati va foyda:</span>
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

                    {/* Action in summary */}
                    <button
                      onClick={handleCopySummary}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
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
