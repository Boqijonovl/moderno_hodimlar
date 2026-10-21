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
  Info
} from 'lucide-react';
import {
  PartItem,
  MebelKroyInput,
  RaskroySettings,
  calculateMebelKroy,
  calculateRaskroy,
  parsePartsFromText,
  RaskroyResult
} from '@/lib/raskroyEngine';

const PRESET_SHEET_SIZES = [
  { name: 'Standart (2750 × 1830 mm)', w: 2750, h: 1830 },
  { name: 'Egger / Kronospan (2800 × 2070 mm)', w: 2800, h: 2070 },
  { name: 'Kichik format (2440 × 1830 mm)', w: 2440, h: 1830 },
  { name: 'Ixtiyoriy (Custom)', w: 0, h: 0 }
];

function RaskroyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode: 'mebel' (parametric cabinet kroy) or 'manual' (freely entered parts)
  const [activeTab, setActiveTab] = useState<'mebel' | 'manual'>('mebel');
  const [activeSubView, setActiveSubView] = useState<'map' | 'table' | 'summary'>('map');

  // WebApp instance
  const [webApp, setWebApp] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');

  // 1. Mebel Parametrlari
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

  // 2. Erkin Detallar (Manual Parts)
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
      drillingNote: 'Minifiks',
      area: 2.0
    },
    {
      id: 'm_2',
      name: 'Qopqoq / Dno',
      length: 768,
      width: 500,
      qty: 2,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Konfirmat',
      area: 0.768
    },
    {
      id: 'm_3',
      name: 'Polka',
      length: 768,
      width: 480,
      qty: 3,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: 'Polkodershatel',
      area: 1.106
    }
  ]);

  // 3. Raskroy & List Parametrlari
  const [sheetPresetIdx, setSheetPresetIdx] = useState(0);
  const [sheetW, setSheetW] = useState(2750);
  const [sheetH, setSheetH] = useState(1830);
  const [kerf, setKerf] = useState(4);
  const [trim, setTrim] = useState(10);
  const [allowRotation, setAllowRotation] = useState(true);

  // Saved projects
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('Yangi Shkaf');

  // Initialize Telegram WebApp and Query Parameters
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

      // Load saved projects from LocalStorage
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
    const qS = searchParams.get('s');
    const qDr = searchParams.get('dr');
    const qDc = searchParams.get('dc');
    const qTab = searchParams.get('tab');
    const qData = searchParams.get('data');
    const qPrint = searchParams.get('print');

    if (qH) setHeight(Number(qH));
    if (qW) setWidth(Number(qW));
    if (qD) setDepth(Number(qD));
    if (qS !== null) setShelvesCount(Number(qS));
    if (qDr !== null) setDrawersCount(Number(qDr));
    if (qDc !== null) setDoorsCount(Number(qDc));

    if (qTab === 'manual') {
      setActiveTab('manual');
    }

    if (qData) {
      try {
        const decoded = decodeURIComponent(qData);
        const parsed = parsePartsFromText(decoded);
        if (parsed.length > 0) {
          setManualParts(parsed);
          setActiveTab('manual');
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

  // Kroy hisoblash
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

  // Faol detallar ro'yxati (Mebel yoki Qo'lda kiritilgan)
  const currentParts = useMemo(() => {
    return activeTab === 'mebel' ? mebelKroyResult.parts : manualParts;
  }, [activeTab, mebelKroyResult.parts, manualParts]);

  // 2D Guillotine Raskroy hisoblash
  const raskroyResult: RaskroyResult = useMemo(() => {
    const settings: RaskroySettings = {
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      kerf,
      trim,
      allowRotation
    };
    return calculateRaskroy(currentParts, settings);
  }, [currentParts, sheetW, sheetH, kerf, trim, allowRotation]);

  // Detal qo'shish (Manual mode)
  const handleAddManualPart = () => {
    const newPart: PartItem = {
      id: `manual_${Date.now()}`,
      name: `Yangi Detal #${manualParts.length + 1}`,
      length: 800,
      width: 400,
      qty: 1,
      material: 'DSP',
      edgeU1: '2.0 mm',
      edgeU2: '—',
      edgeK1: '—',
      edgeK2: '—',
      drillingNote: '—',
      area: (800 * 400) / 1000000
    };
    setManualParts([...manualParts, newPart]);
  };

  const handleUpdateManualPart = (id: string, field: keyof PartItem, value: any) => {
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

  const handleDeleteManualPart = (id: string) => {
    setManualParts(prev => prev.filter(p => p.id !== id));
  };

  // Matndan tezkor import qilish
  const handleApplyPastedText = () => {
    const parsed = parsePartsFromText(pasteInputText);
    if (parsed.length > 0) {
      setManualParts(parsed);
      setShowPasteModal(false);
      setPasteInputText('');
    } else {
      alert("Format noto'g'ri. Har bir qatorda: 2000x500 2 [Nomi] shaklida yozing.");
    }
  };

  // Loyihani saqlash
  const handleSaveProject = () => {
    const newProj = {
      id: `proj_${Date.now()}`,
      name: projectName || 'Loyiha',
      date: new Date().toLocaleDateString('uz-UZ'),
      tab: activeTab,
      mebelParams: { mebelType, height, width, depth, thickness, socleHeight, sectionsCount, shelvesCount, drawersCount, doorType, doorsCount },
      manualParts,
      totalSheets: raskroyResult.totalSheets
    };
    const updated = [newProj, ...savedProjects.slice(0, 9)];
    setSavedProjects(updated);
    try {
      localStorage.setItem('moderno_raskroy_projects', JSON.stringify(updated));
      alert("Loyiha muvaffaqiyatli saqlandi!");
    } catch (e) {}
  };

  const handleLoadProject = (proj: any) => {
    setProjectName(proj.name);
    if (proj.tab === 'mebel' && proj.mebelParams) {
      setActiveTab('mebel');
      const mp = proj.mebelParams;
      setMebelType(mp.mebelType);
      setHeight(mp.height);
      setWidth(mp.width);
      setDepth(mp.depth);
      setThickness(mp.thickness || 16);
      setSocleHeight(mp.socleHeight || 80);
      setSectionsCount(mp.sectionsCount || 1);
      setShelvesCount(mp.shelvesCount || 3);
      setDrawersCount(mp.drawersCount || 0);
      setDoorType(mp.doorType || 'hinged');
      setDoorsCount(mp.doorsCount || 2);
    } else if (proj.manualParts) {
      setActiveTab('manual');
      setManualParts(proj.manualParts);
    }
  };

  const handleDeleteSavedProject = (id: string, e: any) => {
    e.stopPropagation();
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    try {
      localStorage.setItem('moderno_raskroy_projects', JSON.stringify(updated));
    } catch (e) {}
  };

  // Matn sifatida nusxalash (Telegramga jo'natish uchun)
  const handleCopyTextReport = () => {
    let text = `📐 *MODERNO MEBEL — KROY & RASKROY HISOBOTI*\n`;
    text += `🏷 Loyiha: ${projectName}\n`;
    if (activeTab === 'mebel') {
      text += `📏 Mebel o'lchami: ${height} × ${width} × ${depth} mm\n`;
    }
    text += `\n📋 *DETALLAR RO'YXATI (KROY):*\n`;

    currentParts.forEach((p, idx) => {
      text += `${idx + 1}. ${p.name}: ${p.length} × ${p.width} mm — ${p.qty} dona [${p.material}]\n`;
      if (p.edgeU1 && p.edgeU1 !== '—') text += `   Kromka: ${p.edgeU1}\n`;
    });

    text += `\n📊 *RASKROY NATIJASI:*\n`;
    text += `• Optimal DSP listlari: ${raskroyResult.totalSheets} dona (${sheetW}×${sheetH} mm)\n`;
    text += `• Jami detallar maydoni: ${raskroyResult.totalDspArea} m²\n`;
    text += `• Chiqindi (qiyqim): ~${raskroyResult.averageWastePercent}%\n`;
    text += `• Kromka 2.0 mm: ${raskroyResult.totalEdge2mmMeters} metr\n`;
    text += `• Kromka 0.4 mm: ${raskroyResult.totalEdge04mmMeters} metr\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. TOP HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
              title="Asosiy ilovaga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  Kroy & 2D Raskroy
                </h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Sex Vositalari
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Moderno Mebel detallar kroyi va 2D Guillotine arra kesish xaritasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Arra va List sozlamalari"
            >
              <Settings2 className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">List & Arra</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
              title="Arra ustalari uchun A4 formatda chop etish"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Chop etish (Print)</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-5 flex-1 flex flex-col gap-5">
        {/* Navigation Tabs (Mebel Kroy vs Erkin Detallar) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
          <div className="grid grid-cols-2 gap-1.5 sm:w-auto w-full">
            <button
              onClick={() => setActiveTab('mebel')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'mebel'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>1. Mebel Kroy Kalkulyatori</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. Erkin Detallar (Qo'lda kiritish)</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 px-1">
            <button
              onClick={handleCopyTextReport}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Nusxalandi!" : "Nusxalash"}</span>
            </button>

            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              title="Brauzerga saqlash"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Saqlash</span>
            </button>
          </div>
        </div>

        {/* INPUT SECTION */}
        {activeTab === 'mebel' ? (
          /* TAB 1: MEBEL KROY KALKULYATORI */
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  Mebel Parametrlari va Detalizatsiya
                </h2>
                <p className="text-[11px] text-slate-400">
                  O'lchamlarni kiriting, tizim avtomatik ravishda barcha detallar va oraliqlarni hisoblaydi
                </p>
              </div>

              {/* Mebel Turini tanlash */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'shkaf', label: 'Shkaf' },
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
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asosiy o'lchamlar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Balandlik (H, mm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  step={10}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Eni (W, mm)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value))}
                  step={10}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Chuqurlik (D, mm)
                </label>
                <input
                  type="number"
                  value={depth}
                  onChange={e => setDepth(Number(e.target.value))}
                  step={10}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  DSP Qalinligi
                </label>
                <select
                  value={thickness}
                  onChange={e => setThickness(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={16}>16 mm (Standart)</option>
                  <option value={18}>18 mm (Qalin)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Polkalar soni
                </label>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setShelvesCount(cnt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        shelvesCount === cnt
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Tortmalar soni
                </label>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setDrawersCount(cnt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        drawersCount === cnt
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Eshiklar va Tsokol */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 rounded-xl px-3 py-2">
                <span className="text-xs text-slate-300 font-semibold">Eshik turi:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'hinged', name: 'Ochiladigan' },
                    { id: 'sliding', name: 'Kupe' },
                    { id: 'none', name: 'Yo\'q' }
                  ].map(dt => (
                    <button
                      key={dt.id}
                      onClick={() => setDoorType(dt.id as any)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        doorType === dt.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {dt.name}
                    </button>
                  ))}
                </div>
              </div>

              {doorType !== 'none' && (
                <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-300 font-semibold">Eshiklar soni:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map(cnt => (
                      <button
                        key={cnt}
                        onClick={() => setDoorsCount(cnt)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          doorsCount === cnt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 rounded-xl px-3 py-2">
                <span className="text-xs text-slate-300 font-semibold">Tsokol (Oyoq) balandligi:</span>
                <div className="flex items-center gap-1">
                  {[0, 60, 80, 100].map(s => (
                    <button
                      key={s}
                      onClick={() => setSocleHeight(s)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ${
                        socleHeight === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: ERKIN DETALLAR (MANUAL) */
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Sex Detallari Jadvali (Qo'lda kiritish)
                </h2>
                <p className="text-[11px] text-slate-400">
                  O'zingizning ixtiyoriy o'lchamdagi detallaringizni kiriting yoki matndan nusxalab qo'ying
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold flex items-center gap-1.5 border border-blue-500/30 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Matndan nusxalash (Quick Paste)</span>
                </button>

                <button
                  onClick={handleAddManualPart}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Detal qo'shish</span>
                </button>
              </div>
            </div>

            {/* Detallar Jadvali */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Detal nomi</th>
                    <th className="py-2.5 px-3 text-right">Bo'yi (mm)</th>
                    <th className="py-2.5 px-3 text-right">Eni (mm)</th>
                    <th className="py-2.5 px-3 text-center">Soni</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Kromka</th>
                    <th className="py-2.5 px-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {manualParts.map((part, idx) => (
                    <tr key={part.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2 px-3 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={part.name}
                          onChange={e => handleUpdateManualPart(part.id, 'name', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-sans w-36 sm:w-48"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={part.length}
                          onChange={e => handleUpdateManualPart(part.id, 'length', Number(e.target.value))}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-blue-400 text-right w-20"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={part.width}
                          onChange={e => handleUpdateManualPart(part.id, 'width', Number(e.target.value))}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-blue-400 text-right w-20"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={part.qty}
                          onChange={e => handleUpdateManualPart(part.id, 'qty', Number(e.target.value))}
                          min={1}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 text-center w-14"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={part.material}
                          onChange={e => handleUpdateManualPart(part.id, 'material', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                        >
                          <option value="DSP">DSP</option>
                          <option value="MDF">MDF</option>
                          <option value="DVP">DVP</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={part.edgeU1 || '—'}
                          onChange={e => handleUpdateManualPart(part.id, 'edgeU1', e.target.value)}
                          placeholder="2.0 mm / 0.4 mm"
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300 w-24"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteManualPart(part.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. STATISTIKA KARTALARI (KPI CARDS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
              Kerakli Listlar
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {raskroyResult.totalSheets}
              </span>
              <span className="text-xs text-slate-400 font-sans">dona</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono">
              {sheetW}×{sheetH} mm
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
              Jami Detallar
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-blue-400">
                {raskroyResult.totalPartsCount}
              </span>
              <span className="text-xs text-slate-400 font-sans">ta</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Maydon: {raskroyResult.totalDspArea} m²
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
              Chiqindi (Scrap)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                ~{raskroyResult.averageWastePercent}%
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-medium">
              Optimal 2D kesim
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
              Kromka 2.0 mm
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-teal-400">
                {raskroyResult.totalEdge2mmMeters}
              </span>
              <span className="text-xs text-slate-400 font-sans">metr</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Oldi qirralar uchun</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
              Kromka 0.4 mm
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">
                {raskroyResult.totalEdge04mmMeters}
              </span>
              <span className="text-xs text-slate-400 font-sans">metr</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Ichki polkalar</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
              Orqa Fon DVP
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-purple-400">
                {raskroyResult.totalDvpArea}
              </span>
              <span className="text-xs text-slate-400 font-sans">m²</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">DVP / XDF 3mm</span>
          </div>
        </div>

        {/* 4. VISUAL SUBVIEWS: 2D RASKROY XARITASI & DETALLAR JADVALI */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubView('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubView === 'map'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>2D Raskroy Xaritalari ({raskroyResult.sheets.length} list)</span>
              </button>

              <button
                onClick={() => setActiveSubView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubView === 'table'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>Kroy Jadvali (Spetsifikatsiya)</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              List formati: {sheetW} × {sheetH} mm | Pilyan kerfi: {kerf} mm
            </span>
          </div>

          {/* SUBVIEW 1: 2D RASKROY XARITALARI */}
          {activeSubView === 'map' && (
            <div className="space-y-6">
              {raskroyResult.sheets.map(sheet => (
                <div
                  key={sheet.sheetIndex}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap justify-between items-center text-xs gap-2">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-mono">
                        {sheet.sheetIndex}
                      </span>
                      DSP List #{sheet.sheetIndex} ({sheet.sheetWidth} × {sheet.sheetHeight} mm)
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-blue-400 font-bold">Detallar: {sheet.items.length} ta</span>
                      <span className="text-emerald-400">Maydon: {sheet.usedArea} m²</span>
                      <span className="text-slate-400">Qiyqim: ~{sheet.wastePercent}% ({sheet.wasteArea} m²)</span>
                    </div>
                  </div>

                  {/* SVG 2D Canvas */}
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 overflow-x-auto shadow-inner">
                    <svg
                      viewBox={`0 0 ${sheet.sheetWidth + 20} ${sheet.sheetHeight + 20}`}
                      className="w-full h-auto max-h-[460px] drop-shadow"
                    >
                      {/* Asosiy list konturi */}
                      <rect
                        x="0"
                        y="0"
                        width={sheet.sheetWidth}
                        height={sheet.sheetHeight}
                        fill="#0b1120"
                        stroke="#334155"
                        strokeWidth="5"
                        rx="4"
                      />

                      {/* Joylashtirilgan detallar */}
                      {sheet.items.map((item, itIdx) => (
                        <g key={`item-${itIdx}`}>
                          <rect
                            x={item.x}
                            y={item.y}
                            width={item.w}
                            height={item.h}
                            fill={item.color}
                            fillOpacity="0.28"
                            stroke={item.color}
                            strokeWidth="3.5"
                            rx="3"
                          />
                          {/* Detal Nomi */}
                          <text
                            x={item.x + item.w / 2}
                            y={item.y + item.h / 2 - 10}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={Math.min(48, Math.max(20, item.w / 10))}
                            fontWeight="bold"
                          >
                            {item.name}
                          </text>
                          {/* O'lchamlari */}
                          <text
                            x={item.x + item.w / 2}
                            y={item.y + item.h / 2 + 30}
                            textAnchor="middle"
                            fill="#cbd5e1"
                            fontSize={Math.min(36, Math.max(16, item.w / 14))}
                            fontFamily="monospace"
                            fontWeight="600"
                          >
                            {item.w} × {item.h} mm {item.rotated ? '🔄' : ''}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUBVIEW 2: KROY JADVALI (SPETSIFIKATSIYA) */}
          {activeSubView === 'table' && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Detal nomi</th>
                    <th className="py-2.5 px-3 text-right">Bo'yi (mm)</th>
                    <th className="py-2.5 px-3 text-right">Eni (mm)</th>
                    <th className="py-2.5 px-3 text-center">Soni</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Kromka (U1 / K1)</th>
                    <th className="py-2.5 px-3">Priadka (Teshiklar)</th>
                    <th className="py-2.5 px-3 text-right">Maydon (m²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {currentParts.map((part, index) => (
                    <tr key={part.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 font-bold">{index + 1}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">{part.name}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-400">{part.length}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-400">{part.width}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-bold">
                          {part.qty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">{part.material}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] block truncate">
                          {part.edgeU1} {part.edgeK1 && part.edgeK1 !== '—' ? `| ${part.edgeK1}` : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{part.drillingNote || '—'}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{part.area.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. SAQLANGAN LOYIHALAR */}
        {savedProjects.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              Saqlangan Sex Loyihalari ({savedProjects.length} ta)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {savedProjects.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleLoadProject(p)}
                  className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div>
                    <span className="text-sm font-bold text-white block">{p.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {p.date} • {p.totalSheets} ta list kerak
                    </span>
                  </div>
                  <button
                    onClick={e => handleDeleteSavedProject(p.id, e)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: SETTINGS (ARRA VA LIST SOZLAMALARI) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                Arra va List Sozlamalari
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">List formati:</label>
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
                  <label className="text-slate-400 font-semibold block mb-1">List Bo'yi (mm)</label>
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
                  <span className="font-bold text-white block">Detallarni aylantirish (90°)</span>
                  <span className="text-[11px] text-slate-400">Tekstura yo'q bo'lsa yoqilgan ma'qul</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowRotation}
                  onChange={e => setAllowRotation(e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-600"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
            >
              Saqlash va Hisoblash
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK PASTE (MATNDAN IMPORT) */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Matndan Tezkor Kiritish (Quick Paste)
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-400">
                Har bir qatorga detal o'lchamlarini yozing yoki nusxalab qo'ying:
                <br />
                <code className="text-blue-400 font-mono">2000x500 2 Yon devor</code>
                <br />
                <code className="text-blue-400 font-mono">768x500 2 Qopqoq</code>
                <br />
                <code className="text-blue-400 font-mono">768x480 3 Polka</code>
              </p>

              <textarea
                rows={8}
                value={pasteInputText}
                onChange={e => setPasteInputText(e.target.value)}
                placeholder="2000x500 2 Yon devor&#10;768x500 2 Qopqoq&#10;768x480 3 Polka"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
              >
                Qabul qilish
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
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Yuklanmoqda...</div>}>
      <RaskroyContent />
    </Suspense>
  );
}
