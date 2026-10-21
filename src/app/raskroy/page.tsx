'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Scissors,
  Grid,
  Layers,
  Settings2,
  Printer,
  Copy,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  FileText,
  Sparkles,
  ArrowLeft,
  Box,
  SlidersHorizontal,
  Bookmark,
  Share2,
  CheckCircle2,
  Info,
  Download,
  Upload,
  Tag,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Edit3,
  BarChart3
} from 'lucide-react';
import {
  PartItem,
  MebelKroyInput,
  RaskroySettings,
  calculateMebelKroy,
  calculateRaskroy,
  parsePartsFromText,
  generateDxfForSheet,
  RaskroyResult,
  SheetLayout,
  PlacedItem
} from '@/lib/raskroyEngine';

const PRESET_SHEET_SIZES = [
  { name: 'Standart (2750 × 1830 mm)', w: 2750, h: 1830 },
  { name: 'Egger / Kronospan (2800 × 2070 mm)', w: 2800, h: 2070 },
  { name: 'Kichik format (2440 × 1830 mm)', w: 2440, h: 1830 },
  { name: 'Fanera / MDF (1525 × 1525 mm)', w: 1525, h: 1525 },
  { name: 'Ixtiyoriy (Custom)', w: 0, h: 0 }
];

function RaskroyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Navigation: 'map' (Raskroy xaritasi), 'parts' (Detallar jadvali), 'mebel' (Mebel konstruktori), 'labels' (Etiketkalar), 'stats' (Hisobot)
  const [activeView, setActiveView] = useState<'map' | 'parts' | 'mebel' | 'labels' | 'stats'>('map');

  // WebApp instance
  const [webApp, setWebApp] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');
  const [selectedSheetIdx, setSelectedSheetIdx] = useState<number>(0); // 0 = all sheets, 1,2.. for specific sheet
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedPlacedItem, setSelectedPlacedItem] = useState<PlacedItem | null>(null);

  // Project Info
  const [projectName, setProjectName] = useState('Oshxona Mebeli #101');
  const [isEditingName, setIsEditingName] = useState(false);
  const [materialName, setMaterialName] = useState('ЛДСП 16 mm (Oq matoviy)');

  // 1. Mebel Parametrlari (Konstruktor)
  const [mebelType, setMebelType] = useState<'shkaf' | 'tumba' | 'oshxona_pastki' | 'oshxona_ustki' | 'kupe'>('shkaf');
  const [height, setHeight] = useState<number>(2100);
  const [width, setWidth] = useState<number>(800);
  const [depth, setDepth] = useState<number>(500);
  const [thickness, setThickness] = useState<number>(16);
  const [socleHeight, setSocleHeight] = useState<number>(80);
  const [sectionsCount, setSectionsCount] = useState<number>(1);
  const [shelvesCount, setShelvesCount] = useState<number>(3);
  const [drawersCount, setDrawersCount] = useState<number>(0);
  const [doorType, setDoorType] = useState<'hinged' | 'sliding' | 'none'>('hinged');
  const [doorsCount, setDoorsCount] = useState<number>(2);

  // 2. Detallar Jadvali (Excel-like Grid)
  const [manualParts, setManualParts] = useState<PartItem[]>([
    {
      id: 'm_1',
      name: 'Yon devor (Боковина)',
      length: 2000,
      width: 500,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '0.4 mm',
      edgeK2: '0.4 mm',
      allowRotation: true,
      drillingNote: 'Minifiks / Petlya',
      area: 2.0
    },
    {
      id: 'm_2',
      name: 'Qopqoq va Dno',
      length: 768,
      width: 500,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      allowRotation: true,
      drillingNote: 'Konfirmat',
      area: 0.768
    },
    {
      id: 'm_3',
      name: 'Ichki Polka',
      length: 768,
      width: 480,
      qty: 3,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      allowRotation: true,
      drillingNote: 'Polkodershatel',
      area: 1.106
    },
    {
      id: 'm_4',
      name: 'Fasad Eshik',
      length: 980,
      width: 396,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '2.0 mm',
      edgeK1: '2.0 mm',
      edgeK2: '2.0 mm',
      allowRotation: false, // Tekstura bo'yicha qat'iy
      drillingNote: 'Petlya kosasi 35mm',
      area: 0.776
    }
  ]);

  // 3. Raskroy & List Parametrlari (Mosla sozlamalari)
  const [sheetPresetIdx, setSheetPresetIdx] = useState(0);
  const [sheetW, setSheetW] = useState(2750);
  const [sheetH, setSheetH] = useState(1830);
  const [kerf, setKerf] = useState(4);
  const [trim, setTrim] = useState(10);
  const [allowRotation, setAllowRotation] = useState(true);

  // Saved projects
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Telegram WebApp and LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk')
        .then((mod) => {
          const wa = mod.default;
          setWebApp(wa);
          wa.ready();
          wa.expand();

          if (wa.BackButton) {
            wa.BackButton.show();
            wa.BackButton.onClick(() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            });
          }
        })
        .catch(() => {});

      try {
        const stored = localStorage.getItem('moderno_raskroy_projects');
        if (stored) {
          setSavedProjects(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [router]);

  // Handle URL Query Params
  useEffect(() => {
    const qH = searchParams.get('h');
    const qW = searchParams.get('w');
    const qD = searchParams.get('d');
    const qTab = searchParams.get('tab');
    const qData = searchParams.get('data');
    const qPrint = searchParams.get('print');

    if (qH) setHeight(Number(qH));
    if (qW) setWidth(Number(qW));
    if (qD) setDepth(Number(qD));

    if (qTab === 'parts' || qTab === 'manual') setActiveView('parts');
    if (qTab === 'mebel') setActiveView('mebel');
    if (qTab === 'map') setActiveView('map');
    if (qTab === 'labels') setActiveView('labels');

    if (qData) {
      try {
        const decoded = decodeURIComponent(qData);
        const parsed = parsePartsFromText(decoded);
        if (parsed.length > 0) {
          setManualParts(parsed);
          setActiveView('map');
        }
      } catch (e) {}
    }

    if (qPrint === '1') {
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [searchParams]);

  // Mebel turiga qarab o'lchamlar o'zgarishi
  const handleMebelTypeChange = (type: any) => {
    setMebelType(type);
    if (type === 'shkaf') {
      setHeight(2100);
      setWidth(800);
      setDepth(500);
      setSocleHeight(80);
      setDoorType('hinged');
      setDoorsCount(2);
      setShelvesCount(3);
      setDrawersCount(0);
      setProjectName('Standart Shkaf');
    } else if (type === 'kupe') {
      setHeight(2300);
      setWidth(1600);
      setDepth(600);
      setSocleHeight(80);
      setDoorType('sliding');
      setDoorsCount(2);
      setShelvesCount(6);
      setDrawersCount(2);
      setProjectName('Shkaf-Kupe 2 eshikli');
    } else if (type === 'tumba') {
      setHeight(850);
      setWidth(600);
      setDepth(450);
      setSocleHeight(0);
      setDoorType('none');
      setDoorsCount(0);
      setShelvesCount(0);
      setDrawersCount(3);
      setProjectName('Komod / Tumba');
    } else if (type === 'oshxona_pastki') {
      setHeight(850);
      setWidth(800);
      setDepth(600);
      setSocleHeight(100);
      setDoorType('hinged');
      setDoorsCount(2);
      setShelvesCount(1);
      setDrawersCount(0);
      setProjectName('Oshxona pastki modul');
    } else if (type === 'oshxona_ustki') {
      setHeight(720);
      setWidth(800);
      setDepth(320);
      setSocleHeight(0);
      setDoorType('hinged');
      setDoorsCount(2);
      setShelvesCount(2);
      setDrawersCount(0);
      setProjectName('Oshxona ustki shkaf');
    }
  };

  // Mebel kroyi hisoblash
  const mebelKroyResult = useMemo(() => {
    return calculateMebelKroy({
      type: mebelType,
      height,
      width,
      depth,
      thickness,
      socleHeight,
      sectionsCount,
      shelvesCount,
      drawersCount,
      doorType,
      doorsCount
    });
  }, [mebelType, height, width, depth, thickness, socleHeight, sectionsCount, shelvesCount, drawersCount, doorType, doorsCount]);

  // Konstruktordan detallar jadvaliga ko'chirish
  const handleTransferMebelToParts = () => {
    setManualParts(mebelKroyResult.parts);
    setActiveView('parts');
    alert(`Mebel spetsifikatsiyasidan ${mebelKroyResult.parts.length} ta detal jadvalga o'tkazildi! Endi ularni tahrirlashingiz mumkin.`);
  };

  // 2D Guillotine Raskroy hisoblash
  const raskroyResult: RaskroyResult = useMemo(() => {
    const settings: RaskroySettings = {
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      kerf,
      trim,
      allowRotation
    };
    return calculateRaskroy(manualParts, settings);
  }, [manualParts, sheetW, sheetH, kerf, trim, allowRotation]);

  // Detal qo'shish
  const handleAddPart = () => {
    const newPart: PartItem = {
      id: `p_${Date.now()}`,
      name: `Yangi Detal #${manualParts.length + 1}`,
      length: 800,
      width: 400,
      qty: 1,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      allowRotation: true,
      drillingNote: '—',
      area: (800 * 400) / 1000000
    };
    setManualParts([...manualParts, newPart]);
  };

  // Detaldan nusxa olish (Duplicate)
  const handleDuplicatePart = (id: string) => {
    const orig = manualParts.find(p => p.id === id);
    if (!orig) return;
    const duplicated: PartItem = {
      ...orig,
      id: `p_${Date.now()}`,
      name: `${orig.name} (nusxa)`
    };
    setManualParts([...manualParts, duplicated]);
  };

  // Detalni yangilash
  const handleUpdatePart = (id: string, field: keyof PartItem, value: any) => {
    setManualParts(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'length' || field === 'width' || field === 'qty') {
          updated.area = (Number(updated.length) * Number(updated.width) * Number(updated.qty)) / 1000000;
        }
        return updated;
      })
    );
  };

  // Detalni o'chirish
  const handleDeletePart = (id: string) => {
    setManualParts(prev => prev.filter(p => p.id !== id));
  };

  // Matndan / Exceldan nusxa qo'yish
  const handleApplyPastedText = () => {
    const parsed = parsePartsFromText(pasteInputText);
    if (parsed.length > 0) {
      setManualParts(parsed);
      setShowPasteModal(false);
      setPasteInputText('');
      setActiveView('map');
    } else {
      alert("Format aniqlanmadi. Exceldan qatorlarni nusxalab qo'ying yoki '2000x500 2 Detal nomi' shaklida kiriting.");
    }
  };

  // Trigger Optimization with feedback
  const handleOptimizeNow = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setActiveView('map');
    }, 400);
  };

  // DXF fayl yuklab olish
  const handleDownloadDxf = (sheet: SheetLayout) => {
    const dxfString = generateDxfForSheet(sheet);
    const blob = new Blob([dxfString], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_Plita_${sheet.sheetIndex}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV yuklab olish
  const handleDownloadCsv = () => {
    let csv = `Nomi,Uzunligi (mm),Eni (mm),Soni,Material,Kromka_U1,Kromka_U2,Kromka_K1,Kromka_K2,Povorot,Teshiklar\n`;
    manualParts.forEach(p => {
      csv += `"${p.name}",${p.length},${p.width},${p.qty},${p.material},"${p.edgeU1 || ''}","${p.edgeU2 || ''}","${p.edgeK1 || ''}","${p.edgeK2 || ''}",${p.allowRotation ? 'Ha' : 'Yoq'},"${p.drillingNote || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_detallar.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON Loyihani saqlash va yuklab olish
  const handleExportProjectJson = () => {
    const data = {
      version: '1.0',
      projectName,
      materialName,
      date: new Date().toISOString(),
      sheetSettings: { sheetW, sheetH, kerf, trim, allowRotation },
      parts: manualParts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.moderno.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON faylni ochish
  const handleImportProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.parts && Array.isArray(json.parts)) {
          setManualParts(json.parts);
          if (json.projectName) setProjectName(json.projectName);
          if (json.materialName) setMaterialName(json.materialName);
          if (json.sheetSettings) {
            if (json.sheetSettings.sheetW) setSheetW(json.sheetSettings.sheetW);
            if (json.sheetSettings.sheetH) setSheetH(json.sheetSettings.sheetH);
            if (json.sheetSettings.kerf) setKerf(json.sheetSettings.kerf);
            if (json.sheetSettings.trim) setTrim(json.sheetSettings.trim);
          }
          alert("Loyiha muvaffaqiyatli yuklandi!");
          setActiveView('map');
        }
      } catch (err) {
        alert("Fayl formati yaroqsiz!");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Brauzer xotirasiga saqlash
  const handleSaveToBrowserStorage = () => {
    const newProj = {
      id: `proj_${Date.now()}`,
      name: projectName || 'Loyiha',
      date: new Date().toLocaleDateString('uz-UZ'),
      materialName,
      sheetSettings: { sheetW, sheetH, kerf, trim },
      parts: manualParts,
      totalSheets: raskroyResult.totalSheets,
      totalParts: raskroyResult.totalPartsCount
    };
    const updated = [newProj, ...savedProjects.slice(0, 9)];
    setSavedProjects(updated);
    try {
      localStorage.setItem('moderno_raskroy_projects', JSON.stringify(updated));
      alert("Loyiha saqlandi!");
    } catch (e) {}
  };

  // Saqlangan loyihani yuklash
  const handleLoadSavedProject = (proj: any) => {
    setProjectName(proj.name);
    if (proj.materialName) setMaterialName(proj.materialName);
    if (proj.parts) setManualParts(proj.parts);
    if (proj.sheetSettings) {
      if (proj.sheetSettings.sheetW) setSheetW(proj.sheetSettings.sheetW);
      if (proj.sheetSettings.sheetH) setSheetH(proj.sheetSettings.sheetH);
      if (proj.sheetSettings.kerf) setKerf(proj.sheetSettings.kerf);
      if (proj.sheetSettings.trim) setTrim(proj.sheetSettings.trim);
    }
    setActiveView('map');
  };

  // Matnli hisobotni Telegram uchun nusxalash
  const handleCopyTextReport = () => {
    let text = `📐 *MODERNO MEBEL — RASKROY HISOBOTI (Mosla standard)*\n`;
    text += `🏷 Loyiha: ${projectName}\n`;
    text += `🪵 Material: ${materialName}\n`;
    text += `📋 Plita o'lchami: ${sheetW} × ${sheetH} mm (Arra kerfi: ${kerf} mm)\n\n`;

    text += `📊 *ASOSIY KO'RSATKICHLAR:*\n`;
    text += `• Kerakli plitalar: *${raskroyResult.totalSheets} dona*\n`;
    text += `• Foydali maydon: *${(100 - raskroyResult.averageWastePercent)}%* (Qiyqim: ~${raskroyResult.averageWastePercent}%)\n`;
    text += `• Umumiy arralash uzunligi: *${raskroyResult.totalCutLengthMeters} metr*\n`;
    text += `• Jami detallar maydoni: *${raskroyResult.totalDspArea} m²*\n`;
    text += `• Kromka 2.0 mm: *${raskroyResult.totalEdge2mmMeters} m*\n`;
    text += `• Kromka 0.4 mm: *${raskroyResult.totalEdge04mmMeters} m*\n`;
    text += `• Foydali qoldiqlar (Delovoy otxod): *${raskroyResult.totalUsefulOffcutsCount} ta (${raskroyResult.totalUsefulOffcutArea} m²)*\n\n`;

    text += `✂️ *DETALLAR SPETSIFIKATSIYASI (${manualParts.length} xil, ${raskroyResult.totalPartsCount} dona):*\n`;
    manualParts.forEach((p, idx) => {
      text += `${idx + 1}. ${p.name}: ${p.length} × ${p.width} mm — ${p.qty} dona\n`;
      const edges = [p.edgeU1, p.edgeU2, p.edgeK1, p.edgeK2].filter(e => e && e !== '—');
      if (edges.length > 0) {
        text += `   ↳ Kromka: U[${p.edgeU1 || '—'} / ${p.edgeU2 || '—'}], K[${p.edgeK1 || '—'} / ${p.edgeK2 || '—'}]\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filtered sheets for visual canvas
  const displayedSheets = useMemo(() => {
    if (selectedSheetIdx === 0) return raskroyResult.sheets;
    return raskroyResult.sheets.filter(s => s.sheetIndex === selectedSheetIdx);
  }, [raskroyResult.sheets, selectedSheetIdx]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Hidden File Input for JSON project import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportProjectJson}
        accept=".json"
        className="hidden"
      />

      {/* 1. MOSLA-STYLE COMMAND HEADER */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-300 transition-colors shadow-sm"
              title="Ortga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                {isEditingName ? (
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                    autoFocus
                    className="bg-slate-950 border border-indigo-500 rounded-lg px-2 py-0.5 text-sm font-bold text-white focus:outline-none"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingName(true)}
                    className="group flex items-center gap-1.5 cursor-pointer"
                    title="Nomni tahrirlash uchun bosing"
                  >
                    <h1 className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                      {projectName}
                    </h1>
                    <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                  </div>
                )}
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  MOSLA 2D
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2 mt-0.5">
                <span>{materialName}</span>
                <span>•</span>
                <span className="font-mono text-slate-500">{sheetW}×{sheetH} mm (kerf: {kerf}mm)</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Optimize Button */}
            <button
              onClick={handleOptimizeNow}
              disabled={isOptimizing}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Hisoblanmoqda...' : 'Optimizatsiya'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="A4 formatda chop etish"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Chop etish</span>
            </button>

            {/* Export Dropdown / Actions */}
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Detallarni Excel/CSV faylga yuklab olish"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={handleExportProjectJson}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Loyihani JSON fayl qilib saqlash"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Saqlash</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="JSON fayldan loyihani ochish"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Yuklash</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="List va Arra sozlamalari"
            >
              <Settings2 className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. SUB-NAVIGATION TABS (MOSLA SECTIONS) */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveView('map')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeView === 'map'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>2D Xarita ({raskroyResult.sheets.length} plita)</span>
            </button>

            <button
              onClick={() => setActiveView('parts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeView === 'parts'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Detallar Jadvali ({manualParts.length} xil)</span>
            </button>

            <button
              onClick={() => setActiveView('mebel')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeView === 'mebel'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>Mebel Konstruktori</span>
            </button>

            <button
              onClick={() => setActiveView('labels')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeView === 'labels'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Etiketkalar ({raskroyResult.totalPartsCount} ta)</span>
            </button>

            <button
              onClick={() => setActiveView('stats')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                activeView === 'stats'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Hisobot & Tahlil</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTextReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700/80 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Nusxalandi!" : "Xulosa matni"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 flex-1 flex flex-col gap-6">

        {/* TOP MOSLA KPI STATS BAR (Always visible) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">
              Kerakli Plitalar
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {raskroyResult.totalSheets}
              </span>
              <span className="text-xs text-slate-400">list</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono">
              {sheetW}×{sheetH} mm
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg group hover:border-slate-700 transition-all">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">
              Foydali Maydon
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">
                {Math.max(0, 100 - raskroyResult.averageWastePercent)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Detallar: {raskroyResult.totalDspArea} m²
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg group hover:border-slate-700 transition-all">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">
              Chiqindi (Otxod)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                ~{raskroyResult.averageWastePercent}%
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-medium">
              Guillotine kesim
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg group hover:border-slate-700 transition-all">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">
              Arralash Uzunligi
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
                {raskroyResult.totalCutLengthMeters}
              </span>
              <span className="text-xs text-slate-400 font-mono">m</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Pogon metr kesim</span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg group hover:border-slate-700 transition-all">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">
              Kromka (2.0 / 0.4)
            </span>
            <div className="flex items-baseline gap-1 mt-1 font-mono font-bold">
              <span className="text-xl sm:text-2xl text-teal-400">
                {raskroyResult.totalEdge2mmMeters}m
              </span>
              <span className="text-xs text-slate-500">/</span>
              <span className="text-lg text-blue-400">
                {raskroyResult.totalEdge04mmMeters}m
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">2mm (old) + 0.4mm (ich)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg group hover:border-slate-700 transition-all">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">
              Delovoy Otxod
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-purple-400">
                {raskroyResult.totalUsefulOffcutsCount}
              </span>
              <span className="text-xs text-slate-400">ta</span>
            </div>
            <span className="text-[10px] text-purple-300/80 block mt-1 font-mono">
              Maydon: {raskroyResult.totalUsefulOffcutArea} m²
            </span>
          </div>
        </div>

        {/* VIEW 1: 2D RASKROY XARITASI (MOSLA CUTTING MAP) */}
        {activeView === 'map' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
            {/* Sheet Tabs & Canvas Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              {/* Plita selector chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setSelectedSheetIdx(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedSheetIdx === 0
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Barcha plitalar ({raskroyResult.sheets.length})
                </button>

                {raskroyResult.sheets.map(s => (
                  <button
                    key={s.sheetIndex}
                    onClick={() => setSelectedSheetIdx(s.sheetIndex)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedSheetIdx === s.sheetIndex
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>Plita #{s.sheetIndex}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono">
                      {Math.max(0, 100 - s.wastePercent)}%
                    </span>
                  </button>
                ))}
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.15))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                  title="Kichiklashtirish"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono px-2 text-slate-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.15))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                  title="Kattalashtirish"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-1 rounded-lg hover:bg-slate-800 text-[11px] text-slate-400 font-bold"
                  title="Asl o'lchamga qaytarish"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Sheets List */}
            <div className="space-y-6">
              {displayedSheets.map(sheet => (
                <div
                  key={sheet.sheetIndex}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl"
                >
                  {/* Sheet Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono font-black flex items-center justify-center text-sm shadow">
                        {sheet.sheetIndex}
                      </span>
                      <div>
                        <span className="font-bold text-white text-sm block">
                          Plita #{sheet.sheetIndex} — {sheet.sheetWidth} × {sheet.sheetHeight} mm
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {materialName} • {sheet.items.length} ta detal joylashdi
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 font-mono text-xs hidden sm:flex">
                        <span className="text-emerald-400 font-bold">Foydali: {sheet.usedArea} m² ({100 - sheet.wastePercent}%)</span>
                        <span className="text-amber-400">Qiyqim: ~{sheet.wastePercent}%</span>
                        <span className="text-cyan-400">Kesim: {sheet.cutLengthMeters}m</span>
                      </div>

                      {/* Download DXF for this sheet */}
                      <button
                        onClick={() => handleDownloadDxf(sheet)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Ushbu listni CNC va AutoCAD uchun DXF formatida yuklab olish"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>DXF (CNC)</span>
                      </button>
                    </div>
                  </div>

                  {/* SVG 2D Interactive Canvas */}
                  <div
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl p-3 overflow-x-auto shadow-inner transition-all flex justify-center"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                  >
                    <svg
                      viewBox={`-30 -30 ${sheet.sheetWidth + 60} ${sheet.sheetHeight + 60}`}
                      className="w-full h-auto max-h-[550px] drop-shadow-2xl select-none"
                    >
                      <defs>
                        {/* Pattern for usable offcuts (Delovoy otxod) */}
                        <pattern id="offcut-pattern" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="30" stroke="#10b981" strokeWidth="2" strokeOpacity="0.3" />
                        </pattern>
                      </defs>

                      {/* Asosiy list foni */}
                      <rect
                        x="0"
                        y="0"
                        width={sheet.sheetWidth}
                        height={sheet.sheetHeight}
                        fill="#0c1322"
                        stroke="#334155"
                        strokeWidth="4"
                        rx="6"
                      />

                      {/* Chetdan tozalash (Trim margins) */}
                      <rect
                        x={trim}
                        y={trim}
                        width={sheet.sheetWidth - 2 * trim}
                        height={sheet.sheetHeight - 2 * trim}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="2"
                        strokeDasharray="6,6"
                      />

                      {/* Foydali qoldiqlar (Delovoy otxod) */}
                      {sheet.usefulOffcuts && sheet.usefulOffcuts.map((off, oIdx) => (
                        <g key={`off-${oIdx}`}>
                          <rect
                            x={off.x}
                            y={off.y}
                            width={off.w}
                            height={off.h}
                            fill="url(#offcut-pattern)"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            rx="3"
                          />
                          <text
                            x={off.x + off.w / 2}
                            y={off.y + off.h / 2}
                            textAnchor="middle"
                            fill="#34d399"
                            fontSize={Math.min(32, Math.max(16, off.w / 14))}
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            Qoldiq: {off.w}×{off.h}
                          </text>
                        </g>
                      ))}

                      {/* Joylashtirilgan detallar */}
                      {sheet.items.map((item, itIdx) => {
                        const isSelected = selectedPlacedItem?.id === item.id;
                        return (
                          <g
                            key={`item-${itIdx}`}
                            onClick={() => setSelectedPlacedItem(item)}
                            className="cursor-pointer transition-all hover:opacity-90"
                          >
                            {/* Detal Asosiy Bloki */}
                            <rect
                              x={item.x}
                              y={item.y}
                              width={item.w}
                              height={item.h}
                              fill={item.color}
                              fillOpacity={isSelected ? "0.6" : "0.35"}
                              stroke={isSelected ? "#ffffff" : item.color}
                              strokeWidth={isSelected ? "5" : "3"}
                              rx="3"
                            />

                            {/* Kromka Chiziqlari (Visual Edge Banding on sides) */}
                            {/* Yuqori (Top) */}
                            {item.edgeInfo?.top && item.edgeInfo.top !== '—' && (
                              <line
                                x1={item.x}
                                y1={item.y + 2}
                                x2={item.x + item.w}
                                y2={item.y + 2}
                                stroke={item.edgeInfo.top.includes('2.0') ? '#ef4444' : '#3b82f6'}
                                strokeWidth={item.edgeInfo.top.includes('2.0') ? '6' : '3.5'}
                              />
                            )}
                            {/* Quyi (Bottom) */}
                            {item.edgeInfo?.bottom && item.edgeInfo.bottom !== '—' && (
                              <line
                                x1={item.x}
                                y1={item.y + item.h - 2}
                                x2={item.x + item.w}
                                y2={item.y + item.h - 2}
                                stroke={item.edgeInfo.bottom.includes('2.0') ? '#ef4444' : '#3b82f6'}
                                strokeWidth={item.edgeInfo.bottom.includes('2.0') ? '6' : '3.5'}
                              />
                            )}
                            {/* Chap (Left) */}
                            {item.edgeInfo?.left && item.edgeInfo.left !== '—' && (
                              <line
                                x1={item.x + 2}
                                y1={item.y}
                                x2={item.x + 2}
                                y2={item.y + item.h}
                                stroke={item.edgeInfo.left.includes('2.0') ? '#ef4444' : '#3b82f6'}
                                strokeWidth={item.edgeInfo.left.includes('2.0') ? '6' : '3.5'}
                              />
                            )}
                            {/* O'ng (Right) */}
                            {item.edgeInfo?.right && item.edgeInfo.right !== '—' && (
                              <line
                                x1={item.x + item.w - 2}
                                y1={item.y}
                                x2={item.x + item.w - 2}
                                y2={item.y + item.h}
                                stroke={item.edgeInfo.right.includes('2.0') ? '#ef4444' : '#3b82f6'}
                                strokeWidth={item.edgeInfo.right.includes('2.0') ? '6' : '3.5'}
                              />
                            )}

                            {/* Detal Nomi */}
                            <text
                              x={item.x + item.w / 2}
                              y={item.y + item.h / 2 - 8}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={Math.min(42, Math.max(16, item.w / 11))}
                              fontWeight="bold"
                              pointerEvents="none"
                            >
                              {item.name}
                            </text>

                            {/* Detal O'lchamlari */}
                            <text
                              x={item.x + item.w / 2}
                              y={item.y + item.h / 2 + 24}
                              textAnchor="middle"
                              fill="#e2e8f0"
                              fontSize={Math.min(32, Math.max(14, item.w / 14))}
                              fontFamily="monospace"
                              fontWeight="600"
                              pointerEvents="none"
                            >
                              {item.w} × {item.h} mm {item.rotated ? '↻' : ''}
                            </text>
                          </g>
                        );
                      })}

                      {/* List O'lchami Koordinata Belgilari */}
                      <text x={sheet.sheetWidth / 2} y="-10" textAnchor="middle" fill="#64748b" fontSize="22" fontFamily="monospace">
                        {sheet.sheetWidth} mm
                      </text>
                      <text x="-12" y={sheet.sheetHeight / 2} textAnchor="middle" fill="#64748b" fontSize="22" fontFamily="monospace" transform={`rotate(-90, -12, ${sheet.sheetHeight / 2})`}>
                        {sheet.sheetHeight} mm
                      </text>
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Placed Item Inspector Card */}
            {selectedPlacedItem && (
              <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {selectedPlacedItem.name}
                      {selectedPlacedItem.rotated && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          90° Aylantirilgan
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Haqiqiy o'lcham: <span className="text-white font-bold">{selectedPlacedItem.originalW} × {selectedPlacedItem.originalH} mm</span> (Listda: {selectedPlacedItem.w} × {selectedPlacedItem.h} mm)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">KROMKA SXEMASI:</span>
                    <span className="font-mono text-slate-300">
                      U1: <b className="text-white">{selectedPlacedItem.edgeInfo?.top || '—'}</b> | K1: <b className="text-white">{selectedPlacedItem.edgeInfo?.left || '—'}</b>
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedPlacedItem(null)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DETALLAR JADVALI (EXCEL-LIKE MOSLA SPREADSHEET) */}
        {activeView === 'parts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-indigo-400" />
                  Detallar Jadvali (Kroy Spetsifikatsiyasi)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Mosla uslubidagi tezkor jadval: o'lchamlarni kiriting, 4 tomon kromkasini va tekstura bo'yicha aylanishini sozlang
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAddPart}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi detal</span>
                </button>

                <button
                  onClick={() => setShowPasteModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Exceldan nusxa ko'chirish"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Excel / Paste</span>
                </button>

                <button
                  onClick={handleTransferMebelToParts}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Mebel Konstruktoridan yuklash"
                >
                  <Box className="w-3.5 h-3.5 text-amber-400" />
                  <span>Konstruktordan olish</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 w-8">#</th>
                    <th className="py-3 px-3 min-w-[160px]">Detal Nomi</th>
                    <th className="py-3 px-3 text-right w-24">Uzunlik (L)</th>
                    <th className="py-3 px-3 text-right w-24">Eni (W)</th>
                    <th className="py-3 px-3 text-center w-20">Soni</th>
                    <th className="py-3 px-3 w-24">Material</th>
                    <th className="py-3 px-3 min-w-[150px]">Kromka (U1 / U2 / K1 / K2)</th>
                    <th className="py-3 px-3 text-center w-24">Povorot (90°)</th>
                    <th className="py-3 px-3 min-w-[120px]">Teshiklar (Priadka)</th>
                    <th className="py-3 px-3 text-right w-20">Maydon</th>
                    <th className="py-3 px-3 text-center w-20">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {manualParts.map((part, index) => (
                    <tr key={part.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 font-bold">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={part.name}
                          onChange={e => handleUpdatePart(part.id, 'name', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-sans focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          value={part.length}
                          onChange={e => handleUpdatePart(part.id, 'length', Number(e.target.value))}
                          className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          value={part.width}
                          onChange={e => handleUpdatePart(part.id, 'width', Number(e.target.value))}
                          className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={part.qty}
                          onChange={e => handleUpdatePart(part.id, 'qty', Math.max(1, Number(e.target.value)))}
                          min={1}
                          className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <select
                          value={part.material}
                          onChange={e => handleUpdatePart(part.id, 'material', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 font-medium"
                        >
                          <option value="DSP">DSP (ЛДСП)</option>
                          <option value="MDF">MDF</option>
                          <option value="DVP">DVP</option>
                        </select>
                      </td>
                      {/* Kromka 4 tomon (U1, U2, K1, K2) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <select
                            value={part.edgeU1 || '—'}
                            onChange={e => handleUpdatePart(part.id, 'edgeU1', e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[10px]"
                            title="Uzun tomon 1 (Tepa)"
                          >
                            <option value="—">—</option>
                            <option value="2.0 mm">2.0mm</option>
                            <option value="0.4 mm">0.4mm</option>
                          </select>
                          <select
                            value={part.edgeU2 || '—'}
                            onChange={e => handleUpdatePart(part.id, 'edgeU2', e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[10px]"
                            title="Uzun tomon 2 (Past)"
                          >
                            <option value="—">—</option>
                            <option value="2.0 mm">2.0mm</option>
                            <option value="0.4 mm">0.4mm</option>
                          </select>
                          <span className="text-slate-600">/</span>
                          <select
                            value={part.edgeK1 || '—'}
                            onChange={e => handleUpdatePart(part.id, 'edgeK1', e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[10px]"
                            title="Kalta tomon 1 (Chap)"
                          >
                            <option value="—">—</option>
                            <option value="2.0 mm">2.0mm</option>
                            <option value="0.4 mm">0.4mm</option>
                          </select>
                          <select
                            value={part.edgeK2 || '—'}
                            onChange={e => handleUpdatePart(part.id, 'edgeK2', e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[10px]"
                            title="Kalta tomon 2 (O'ng)"
                          >
                            <option value="—">—</option>
                            <option value="2.0 mm">2.0mm</option>
                            <option value="0.4 mm">0.4mm</option>
                          </select>
                        </div>
                      </td>
                      {/* Povorot / Tekstura toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleUpdatePart(part.id, 'allowRotation', !part.allowRotation)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            part.allowRotation !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                          title={part.allowRotation !== false ? "90° aylanishga ruxsat" : "Tekstura bo'yicha qat'iy (aylanmaydi)"}
                        >
                          {part.allowRotation !== false ? "↻ Ruxsat" : "🔒 Qat'iy"}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={part.drillingNote || ''}
                          onChange={e => handleUpdatePart(part.id, 'drillingNote', e.target.value)}
                          placeholder="Priadka..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-sans focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                        {part.area.toFixed(2)} m²
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDuplicatePart(part.id)}
                            className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Nusxalash"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePart(part.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                Jami: <b className="text-white">{manualParts.length} xil detal</b> ({manualParts.reduce((s, p) => s + p.qty, 0)} dona umumiy)
              </span>

              <button
                onClick={handleOptimizeNow}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Optimizatsiya qilish va Xaritani ko'rish</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: MEBEL KONSTRUKTORI (PARAMETRIK KROY) */}
        {activeView === 'mebel' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-indigo-400" />
                  Mebel Parametrik Konstruktori
                </h2>
                <p className="text-[11px] text-slate-400">
                  Mebel turini tanlang va o'lchamlarni kiriting — tizim barcha oraliq detallarni, fasadlarni va orqa DVP'ni avtomatik hisoblab beradi
                </p>
              </div>

              {/* Mebel Turini tanlash */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'shkaf', label: 'Standart Shkaf' },
                  { id: 'kupe', label: 'Shkaf-Kupe' },
                  { id: 'tumba', label: 'Tumba/Komod' },
                  { id: 'oshxona_pastki', label: 'Oshxona pastki' },
                  { id: 'oshxona_ustki', label: 'Oshxona ustki' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleMebelTypeChange(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      mebelType === item.id
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Balandlik (H, mm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  step={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Kenglik (W, mm)</label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value))}
                  step={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Chuqurlik (D, mm)</label>
                <input
                  type="number"
                  value={depth}
                  onChange={e => setDepth(Number(e.target.value))}
                  step={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">DSP Qalinligi</label>
                <select
                  value={thickness}
                  onChange={e => setThickness(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={16}>16 mm (Standart)</option>
                  <option value={18}>18 mm (Qalin)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Polkalar soni</label>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setShelvesCount(cnt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        shelvesCount === cnt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tortmalar soni</label>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setDrawersCount(cnt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        drawersCount === cnt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Parts Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Hisoblangan detallar: {mebelKroyResult.parts.length} xil
                </span>
                <button
                  onClick={handleTransferMebelToParts}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Detallar jadvaliga o'tkazish (Tahrirlash)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mebelKroyResult.parts.map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{p.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {p.length} × {p.width} mm • {p.qty} dona
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {p.material}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: MOSLA-STYLE ETIKETKALAR (PART LABELS) */}
        {activeView === 'labels' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  Qismlar Yorliqlari (Etiketkalar / Stickers)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Stanokda qirqilgan detallarni ajratish, markirovka qilish va yig'uvchiga topshirish uchun tayyor etiketkalar
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Etiketkalarni chop etish</span>
              </button>
            </div>

            {/* Labels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2">
              {raskroyResult.sheets.flatMap(sheet =>
                sheet.items.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-md flex flex-col justify-between h-44 print:border-black print:shadow-none"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">MODERNO MEBEL</span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          Plita #{sheet.sheetIndex}
                        </span>
                      </div>

                      <div className="mt-2">
                        <h4 className="font-black text-sm text-slate-900 truncate">{item.name}</h4>
                        <div className="text-base font-mono font-black text-indigo-600 mt-0.5">
                          {item.originalW} × {item.originalH} mm
                        </div>
                      </div>
                    </div>

                    <div>
                      {/* Edge diagram mini */}
                      <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded-lg border border-slate-200 mb-2">
                        <span>U1: <b>{item.edgeInfo?.top || '—'}</b></span>
                        <span>U2: <b>{item.edgeInfo?.bottom || '—'}</b></span>
                        <span>K1: <b>{item.edgeInfo?.left || '—'}</b></span>
                        <span>K2: <b>{item.edgeInfo?.right || '—'}</b></span>
                      </div>

                      {/* Barcode simulation */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-end gap-0.5 h-5">
                          {[4, 2, 5, 1, 3, 5, 2, 4, 1, 3, 5, 2, 4, 3, 1, 5, 2].map((h, i) => (
                            <div key={i} className="w-1 bg-black rounded-sm" style={{ height: `${h * 4}px` }} />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 font-bold">
                          {item.id}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: HISOBOT VA TAHLIL (MOSLA ANALYTICS & SPECIFICATION) */}
        {activeView === 'stats' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Loyiha To'liq Hisoboti va Spetsifikatsiyasi
              </h2>
              <p className="text-[11px] text-slate-400">
                Mebel tannarxini hisoblash, materiallar sarfini rejalashtirish va omborga buyurtma berish uchun hisobot
              </p>
            </div>

            {/* Material Usage Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  1. List Materiallari Sarfi
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Plita formati:</span>
                    <span className="font-mono font-bold text-white">{sheetW} × {sheetH} mm</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Kerakli plitalar soni:</span>
                    <span className="font-mono font-bold text-emerald-400">{raskroyResult.totalSheets} dona</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Detallar sof maydoni:</span>
                    <span className="font-mono font-bold text-indigo-400">{raskroyResult.totalDspArea} m²</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Foydali chiqindilar (Delovoy):</span>
                    <span className="font-mono font-bold text-purple-400">{raskroyResult.totalUsefulOffcutsCount} ta ({raskroyResult.totalUsefulOffcutArea} m²)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Chiqindi (Otxod) ulushi:</span>
                    <span className="font-mono font-bold text-amber-400">~{raskroyResult.averageWastePercent}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  2. Furnitura va Ishlov Berish
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Arra pilyasi propili (Kerf):</span>
                    <span className="font-mono font-bold text-white">{kerf} mm</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Umumiy kesish uzunligi (Pogon metr):</span>
                    <span className="font-mono font-bold text-cyan-400">{raskroyResult.totalCutLengthMeters} metr</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Kromka 2.0 mm (Old qirralar):</span>
                    <span className="font-mono font-bold text-teal-400">{raskroyResult.totalEdge2mmMeters} metr</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Kromka 0.4 mm (Ichki qirralar):</span>
                    <span className="font-mono font-bold text-blue-400">{raskroyResult.totalEdge04mmMeters} metr</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-slate-900">
                    <span className="text-slate-400">Orqa fon DVP 3mm:</span>
                    <span className="font-mono font-bold text-purple-400">{raskroyResult.totalDvpArea} m²</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Projects in Browser */}
            {savedProjects.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 font-mono uppercase">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  Saqlangan Sex Loyihalari ({savedProjects.length} ta)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {savedProjects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleLoadSavedProject(p)}
                      className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <span className="text-sm font-bold text-white block">{p.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {p.date} • {p.totalSheets} ta list kerak
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">Ochish →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL 1: MOSLA SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                List va Arra Sozlamalari (Mosla)
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">List formati (Standartlar):</label>
                <select
                  value={sheetPresetIdx}
                  onChange={e => {
                    const idx = Number(e.target.value);
                    setSheetPresetIdx(idx);
                    if (PRESET_SHEET_SIZES[idx].w > 0) {
                      setSheetW(PRESET_SHEET_SIZES[idx].w);
                      setSheetH(PRESET_SHEET_SIZES[idx].h);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                >
                  {PRESET_SHEET_SIZES.map((sz, idx) => (
                    <option key={idx} value={idx}>
                      {sz.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">List Uzunligi (mm)</label>
                  <input
                    type="number"
                    value={sheetW}
                    onChange={e => setSheetW(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">List Eni (mm)</label>
                  <input
                    type="number"
                    value={sheetH}
                    onChange={e => setSheetH(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Pilyan kesimi (Kerf, mm)</label>
                  <input
                    type="number"
                    value={kerf}
                    onChange={e => setKerf(Number(e.target.value))}
                    min={0}
                    max={10}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Chetidan tozalash (Trim, mm)</label>
                  <input
                    type="number"
                    value={trim}
                    onChange={e => setTrim(Number(e.target.value))}
                    min={0}
                    max={50}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Detallarni 90° aylantirish</span>
                  <span className="text-[11px] text-slate-400">Tekstura yo'q bo'lsa yoqilgan ma'qul</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowRotation}
                  onChange={e => setAllowRotation(e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Material nomi:</label>
                <input
                  type="text"
                  value={materialName}
                  onChange={e => setMaterialName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowSettingsModal(false);
                handleOptimizeNow();
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
            >
              Saqlash va Qayta Hisoblash
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK PASTE (EXCEL & TEXT IMPORT) */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Excel / Matndan Tezkor Kiritish (Quick Paste)
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Exceldan ustunlarni nusxalab to'g'ridan-to'g'ri tashlang (Ctrl+V) yoki har bir qatorga detal o'lchamlarini yozing:
                <br />
                <code className="text-indigo-400 font-mono">2000x500 2 Yon devor</code>
                <br />
                <code className="text-indigo-400 font-mono">768x500 2 Qopqoq</code>
                <br />
                <code className="text-indigo-400 font-mono">768x480 3 Polka</code>
              </p>

              <textarea
                rows={9}
                value={pasteInputText}
                onChange={e => setPasteInputText(e.target.value)}
                placeholder="2000x500 2 Yon devor&#10;768x500 2 Qopqoq&#10;768x480 3 Polka"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleApplyPastedText}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Jadvalga Kiritish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RaskroyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold font-mono">Mosla Raskroy yuklanmoqda...</div>}>
      <RaskroyContent />
    </Suspense>
  );
}
