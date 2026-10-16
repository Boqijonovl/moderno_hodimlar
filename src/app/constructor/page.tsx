'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Palette,
  RotateCw,
  LayoutGrid,
  Tag,
  Bookmark,
  Trash2,
  SunMedium,
  MousePointerClick,
  Sliders,
  Scale
} from 'lucide-react';
import Link from 'next/link';
import { WOOD_COLORS, FACADE_TYPES, HANDLE_COLORS, SectionData } from '@/components/constructor/Furniture3DViewer';

// Dynamic 3D Viewer with SSR disabled
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

// Presets by Category
const PRESET_CATEGORIES = ['Barchasi', 'Shkaflar', 'Oshxona', 'Komodlar', 'TV & Dalanma', 'Ofis'];

export interface PresetItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  height: number;
  width: number;
  depth: number;
  socleHeight: number;
  thickness: number;
  doorType: 'hinged' | 'sliding' | 'none';
  doorsCount: number;
  hasLed: boolean;
  bodyColor: string;
  facadeColor: string;
  facadeType: 'standard' | 'mirror' | 'glass' | 'mdf_frame';
  sections: SectionData[];
}

const PRESETS: PresetItem[] = [
  {
    id: 'wardrobe_2door',
    name: '2-Eshikli Garderob',
    category: 'Shkaflar',
    icon: '🚪',
    height: 2100,
    width: 1200,
    depth: 550,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    hasLed: true,
    bodyColor: '#d4b38a',
    facadeColor: '#f8fafc',
    facadeType: 'standard',
    sections: [
      { id: 'sec_1', width: 450, shelvesCount: 4, drawersCount: 0, hasHanger: false },
      { id: 'sec_2', width: 718, shelvesCount: 1, drawersCount: 2, hasHanger: true, hangerType: 'single' }
    ]
  },
  {
    id: 'wardrobe_3door',
    name: '3-Eshikli Katta Shkaf',
    category: 'Shkaflar',
    icon: '👔',
    height: 2200,
    width: 1800,
    depth: 600,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 3,
    hasLed: true,
    bodyColor: '#27272a',
    facadeColor: '#27272a',
    facadeType: 'mirror',
    sections: [
      { id: 'sec_1', width: 550, shelvesCount: 4, drawersCount: 0, hasHanger: false },
      { id: 'sec_2', width: 636, shelvesCount: 1, drawersCount: 0, hasHanger: true, hangerType: 'single' },
      { id: 'sec_3', width: 550, shelvesCount: 3, drawersCount: 3, hasHanger: false }
    ]
  },
  {
    id: 'wardrobe_4door',
    name: '4-Eshikli Oilaviy Shkaf',
    category: 'Shkaflar',
    icon: '🏰',
    height: 2300,
    width: 2400,
    depth: 600,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 4,
    hasLed: true,
    bodyColor: '#3e2723',
    facadeColor: '#f8fafc',
    facadeType: 'mdf_frame',
    sections: [
      { id: 'sec_1', width: 550, shelvesCount: 5, drawersCount: 0, hasHanger: false },
      { id: 'sec_2', width: 618, shelvesCount: 1, drawersCount: 2, hasHanger: true, hangerType: 'single' },
      { id: 'sec_3', width: 618, shelvesCount: 1, drawersCount: 2, hasHanger: true, hangerType: 'single' },
      { id: 'sec_4', width: 550, shelvesCount: 5, drawersCount: 0, hasHanger: false }
    ]
  },
  {
    id: 'wardrobe_sliding',
    name: 'Shkaf-Kupé (Suriladigan)',
    category: 'Shkaflar',
    icon: '✨',
    height: 2400,
    width: 1600,
    depth: 650,
    socleHeight: 100,
    thickness: 16,
    doorType: 'sliding',
    doorsCount: 2,
    hasLed: true,
    bodyColor: '#3e2723',
    facadeColor: '#3e2723',
    facadeType: 'glass',
    sections: [
      { id: 'sec_1', width: 784, shelvesCount: 4, drawersCount: 0, hasHanger: false },
      { id: 'sec_2', width: 784, shelvesCount: 2, drawersCount: 2, hasHanger: true, hangerType: 'single' }
    ]
  },
  {
    id: 'kitchen_bottom_sink',
    name: 'Oshxona Pastki Tumba (Moyka)',
    category: 'Oshxona',
    icon: '🚰',
    height: 850,
    width: 800,
    depth: 600,
    socleHeight: 100,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    hasLed: false,
    bodyColor: '#85512b',
    facadeColor: '#f8fafc',
    facadeType: 'mdf_frame',
    sections: [
      { id: 'sec_1', width: 768, shelvesCount: 0, drawersCount: 0, hasHanger: false }
    ]
  },
  {
    id: 'kitchen_bottom_drawers',
    name: 'Oshxona 3-Tortmali Tumba',
    category: 'Oshxona',
    icon: '🍳',
    height: 850,
    width: 800,
    depth: 600,
    socleHeight: 100,
    thickness: 16,
    doorType: 'none',
    doorsCount: 0,
    hasLed: false,
    bodyColor: '#85512b',
    facadeColor: '#f8fafc',
    facadeType: 'standard',
    sections: [
      { id: 'sec_1', width: 768, shelvesCount: 0, drawersCount: 3, hasHanger: false }
    ]
  },
  {
    id: 'kitchen_top',
    name: 'Oshxona Osma 2-Eshikli Shkaf',
    category: 'Oshxona',
    icon: '🍽',
    height: 720,
    width: 800,
    depth: 320,
    socleHeight: 0,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    hasLed: true,
    bodyColor: '#f8fafc',
    facadeColor: '#f8fafc',
    facadeType: 'glass',
    sections: [
      { id: 'sec_1', width: 768, shelvesCount: 2, drawersCount: 0, hasHanger: false }
    ]
  },
  {
    id: 'dresser_4',
    name: 'Tortmali Komod (4 qavat)',
    category: 'Komodlar',
    icon: '🗄',
    height: 900,
    width: 900,
    depth: 450,
    socleHeight: 60,
    thickness: 16,
    doorType: 'none',
    doorsCount: 0,
    hasLed: false,
    bodyColor: '#d4b38a',
    facadeColor: '#d4b38a',
    facadeType: 'standard',
    sections: [
      { id: 'sec_1', width: 868, shelvesCount: 0, drawersCount: 4, hasHanger: false }
    ]
  },
  {
    id: 'office_desk',
    name: 'Ofis / Yozuv Stoli Tumbasi bilan',
    category: 'Ofis',
    icon: '💻',
    height: 750,
    width: 1300,
    depth: 600,
    socleHeight: 0,
    thickness: 18,
    doorType: 'none',
    doorsCount: 0,
    hasLed: false,
    bodyColor: '#27272a',
    facadeColor: '#d4b38a',
    facadeType: 'standard',
    sections: [
      { id: 'sec_1', width: 820, shelvesCount: 0, drawersCount: 0, hasHanger: false },
      { id: 'sec_2', width: 408, shelvesCount: 0, drawersCount: 3, hasHanger: false }
    ]
  },
  {
    id: 'tv_modern',
    name: 'Zamonaviy TV Tumba (1.8m)',
    category: 'TV & Dalanma',
    icon: '📺',
    height: 500,
    width: 1800,
    depth: 420,
    socleHeight: 50,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    hasLed: true,
    bodyColor: '#27272a',
    facadeColor: '#f8fafc',
    facadeType: 'standard',
    sections: [
      { id: 'sec_1', width: 578, shelvesCount: 1, drawersCount: 0, hasHanger: false },
      { id: 'sec_2', width: 578, shelvesCount: 0, drawersCount: 2, hasHanger: false },
      { id: 'sec_3', width: 578, shelvesCount: 1, drawersCount: 0, hasHanger: false }
    ]
  },
  {
    id: 'hallway_wardrobe',
    name: 'Dalanma / Prihojaya Shkafi',
    category: 'TV & Dalanma',
    icon: '🧥',
    height: 2100,
    width: 1400,
    depth: 450,
    socleHeight: 80,
    thickness: 16,
    doorType: 'hinged',
    doorsCount: 2,
    hasLed: true,
    bodyColor: '#d4b38a',
    facadeColor: '#f8fafc',
    facadeType: 'mirror',
    sections: [
      { id: 'sec_1', width: 660, shelvesCount: 3, drawersCount: 2, hasHanger: false },
      { id: 'sec_2', width: 676, shelvesCount: 1, drawersCount: 0, hasHanger: true, hangerType: 'double' }
    ]
  },
  {
    id: 'dresser_5',
    name: '5-Qavatli Baland Komod',
    category: 'Komodlar',
    icon: '🗄',
    height: 1150,
    width: 850,
    depth: 450,
    socleHeight: 60,
    thickness: 16,
    doorType: 'none',
    doorsCount: 0,
    hasLed: false,
    bodyColor: '#85512b',
    facadeColor: '#85512b',
    facadeType: 'standard',
    sections: [
      { id: 'sec_1', width: 818, shelvesCount: 0, drawersCount: 5, hasHanger: false }
    ]
  }
];

export default function FurnitureConstructorPage() {
  // Dimensions
  const [height, setHeight] = useState<number>(2100);
  const [width, setWidth] = useState<number>(1200);
  const [depth, setDepth] = useState<number>(550);
  const [thickness, setThickness] = useState<number>(16);
  const [socleHeight, setSocleHeight] = useState<number>(80);

  // Sections Data (Fully customizable layout)
  const [sectionsData, setSectionsData] = useState<SectionData[]>([
    { id: 'sec_1', width: 450, shelvesCount: 4, drawersCount: 0, hasHanger: false },
    { id: 'sec_2', width: 718, shelvesCount: 1, drawersCount: 2, hasHanger: true, hangerType: 'single' }
  ]);

  const [hasLedLighting, setHasLedLighting] = useState<boolean>(true);
  const [doorType, setDoorType] = useState<'hinged' | 'sliding' | 'none'>('hinged');
  const [doorsCount, setDoorsCount] = useState<number>(2);

  // Materials & Finishes
  const [bodyColor, setBodyColor] = useState<string>('#d4b38a');
  const [facadeColor, setFacadeColor] = useState<string>('#f8fafc');
  const [syncColors, setSyncColors] = useState<boolean>(false);
  const [facadeType, setFacadeType] = useState<'standard' | 'mirror' | 'glass' | 'mdf_frame'>('standard');
  const [handleColor, setHandleColor] = useState<string>('#cbd5e1');

  // Interactive Door Opening: 0% to 100%
  const [doorsOpenPercent, setDoorsOpenPercent] = useState<number>(100);

  // Pricing Parameters (UZS)
  const [dspSheetPrice, setDspSheetPrice] = useState<number>(460000);
  const [dvpSheetPrice, setDvpSheetPrice] = useState<number>(90000);
  const [edgePricePerMeter, setEdgePricePerMeter] = useState<number>(3500);
  const [hingePrice, setHingePrice] = useState<number>(15000);
  const [drawerSlidePrice, setDrawerSlidePrice] = useState<number>(45000);
  const [handlePrice, setHandlePrice] = useState<number>(20000);
  const [ledPricePerMeter, setLedPricePerMeter] = useState<number>(35000);
  const [transformerPrice, setTransformerPrice] = useState<number>(75000);
  const [laborPercent, setLaborPercent] = useState<number>(30);

  // Client / Order Info for saving
  const [projectName, setProjectName] = useState<string>('Garderob Shkaf Loyihasi');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [savedProjects, setSavedProjects] = useState<any[]>([]);

  // Presets Category Filter
  const [activePresetCategory, setActivePresetCategory] = useState<string>('Barchasi');

  // Main View States
  const [activeTab, setActiveTab] = useState<'3d' | 'blueprint' | 'cutlist' | 'raskroy' | 'labels' | 'pricing'>('3d');
  const [blueprintStyle, setBlueprintStyle] = useState<'dark_cad' | 'white_paper'>('dark_cad');
  const [blueprintSideView, setBlueprintSideView] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Calculate inner available width helper
  const getInnerWidth = (targetW: number = width, targetThick: number = thickness, count: number = sectionsData.length) => {
    const totalDivs = Math.max(0, count - 1) * targetThick;
    return Math.max(100, targetW - 2 * targetThick - totalDivs);
  };

  const innerTotalWidth = getInnerWidth(width, thickness, sectionsData.length);

  // Balance sections equally
  const balanceSectionWidths = (sectionsList: SectionData[] = sectionsData, targetTotalW?: number) => {
    const count = sectionsList.length;
    const currentInnerW = getInnerWidth(targetTotalW ?? width, thickness, count);
    const equalW = Math.floor(currentInnerW / count);
    const updated = sectionsList.map((sec, i) => ({
      ...sec,
      width: i === count - 1 ? (currentInnerW - equalW * (count - 1)) : equalW
    }));
    setSectionsData(updated);
  };

  // Adjust section width directly while keeping overall cabinet width 100% constant
  const handleSectionWidthChange = (index: number, newW: number) => {
    if (sectionsData.length <= 1) return;
    const neighborIdx = index === sectionsData.length - 1 ? index - 1 : index + 1;
    const combinedW = sectionsData[index].width + sectionsData[neighborIdx].width;
    const minW = 150;
    const maxW = combinedW - minW;
    const clampedW = Math.max(minW, Math.min(maxW, newW));

    const updated = [...sectionsData];
    updated[index] = { ...updated[index], width: clampedW };
    updated[neighborIdx] = { ...updated[neighborIdx], width: combinedW - clampedW };
    setSectionsData(updated);
  };

  // Move a section left or right to re-order layout
  const handleMoveSection = (fromIdx: number, direction: 'left' | 'right') => {
    const toIdx = direction === 'left' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= sectionsData.length) return;
    const updated = [...sectionsData];
    const temp = updated[fromIdx];
    updated[fromIdx] = updated[toIdx];
    updated[toIdx] = temp;
    setSectionsData(updated);
  };

  // Scale section widths proportionally when total cabinet width changes
  const handleWidthChange = (newW: number) => {
    setWidth(newW);
    const count = sectionsData.length;
    const newInnerW = getInnerWidth(newW, thickness, count);
    const currentSum = sectionsData.reduce((acc, s) => acc + s.width, 0);
    if (currentSum > 0) {
      let allocated = 0;
      const updated = sectionsData.map((sec, idx) => {
        if (idx === count - 1) {
          return { ...sec, width: Math.max(100, newInnerW - allocated) };
        }
        const scaled = Math.round((sec.width / currentSum) * newInnerW);
        allocated += scaled;
        return { ...sec, width: Math.max(100, scaled) };
      });
      setSectionsData(updated);
    } else {
      balanceSectionWidths(sectionsData, newW);
    }
  };

  // Add a new section (up to 6)
  const handleAddSection = () => {
    if (sectionsData.length >= 6) return;
    const newCount = sectionsData.length + 1;
    const newInnerW = getInnerWidth(width, thickness, newCount);
    const equalW = Math.floor(newInnerW / newCount);
    const newSection: SectionData = {
      id: `sec_${Date.now()}`,
      width: equalW,
      shelvesCount: 3,
      drawersCount: 0,
      hasHanger: false
    };
    balanceSectionWidths([...sectionsData, newSection]);
    if (doorType !== 'none') setDoorsCount(newCount);
  };

  // Remove a section
  const handleRemoveSection = (index: number) => {
    if (sectionsData.length <= 1) return;
    const filtered = sectionsData.filter((_, i) => i !== index);
    balanceSectionWidths(filtered);
    if (doorType !== 'none') setDoorsCount(filtered.length);
  };

  // Update Section attributes
  const updateSectionProp = (index: number, key: keyof SectionData, val: any) => {
    const updated = [...sectionsData];
    updated[index] = { ...updated[index], [key]: val };
    setSectionsData(updated);
  };

  // Load saved projects on mount
  useEffect(() => {
    try {
      const data = localStorage.getItem('moderno_saved_furniture_projects');
      if (data) setSavedProjects(JSON.parse(data));
    } catch (e) {}
  }, []);

  // Save Project
  const handleSaveProject = () => {
    const newProject = {
      id: Date.now().toString(),
      name: projectName || 'Nomsiz Mebel',
      clientName: clientName || 'Mijoz',
      clientPhone,
      date: new Date().toLocaleDateString('uz-UZ'),
      height, width, depth, thickness, socleHeight,
      sectionsData,
      hasLedLighting,
      doorType, doorsCount, bodyColor, facadeColor, facadeType,
      totalPrice: calculations.totalSellingPrice
    };

    const updated = [newProject, ...savedProjects];
    setSavedProjects(updated);
    try {
      localStorage.setItem('moderno_saved_furniture_projects', JSON.stringify(updated));
    } catch (e) {}
    setShowSaveModal(false);
    alert('Loyiha muvaffaqiyatli saqlandi!');
  };

  const handleLoadProject = (p: any) => {
    setProjectName(p.name);
    setClientName(p.clientName);
    setClientPhone(p.clientPhone || '');
    setHeight(p.height);
    setWidth(p.width);
    setDepth(p.depth);
    setThickness(p.thickness);
    setSocleHeight(p.socleHeight);
    if (p.sectionsData) setSectionsData(p.sectionsData);
    setHasLedLighting(p.hasLedLighting ?? true);
    setDoorType(p.doorType);
    setDoorsCount(p.doorsCount);
    setBodyColor(p.bodyColor);
    setFacadeColor(p.facadeColor);
    setFacadeType(p.facadeType);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    try {
      localStorage.setItem('moderno_saved_furniture_projects', JSON.stringify(updated));
    } catch (e) {}
  };

  // Apply Preset
  const handleApplyPreset = (preset: PresetItem) => {
    setHeight(preset.height);
    setWidth(preset.width);
    setDepth(preset.depth);
    setThickness(preset.thickness);
    setSocleHeight(preset.socleHeight);
    setDoorType(preset.doorType);
    setDoorsCount(preset.doorsCount);
    setBodyColor(preset.bodyColor);
    setFacadeColor(preset.facadeColor);
    setFacadeType(preset.facadeType);
    setHasLedLighting(preset.hasLed);
    setProjectName(preset.name);
    setSectionsData(preset.sections.map((s, idx) => ({ ...s, id: `sec_${idx + 1}` })));
  };

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    if (activePresetCategory === 'Barchasi') return PRESETS;
    return PRESETS.filter(p => p.category === activePresetCategory);
  }, [activePresetCategory]);

  // ==========================================
  // MATHEMATICAL CUTLIST & COST ENGINE
  // ==========================================
  const calculations = useMemo(() => {
    const T = thickness;
    const bodyHeight = height - socleHeight;
    const innerHeight = bodyHeight - 2 * T;

    interface Part {
      id: string;
      name: string;
      detailNameRu: string;
      length: number;
      width: number;
      qty: number;
      material: string;
      edgeU1: string;
      edgeU2: string;
      edgeK1: string;
      edgeK2: string;
      area: number;
      drillingNote: string;
    }

    const parts: Part[] = [];

    // 1. Bogovinalar (Yon devorlar)
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

    // 2. Krisha va Dno
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

    // 3. Tsokol
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

    // 4. Peregorodkalar (To'siqlar)
    if (sectionsData.length > 1) {
      const dividerCount = sectionsData.length - 1;
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

    // 5. Polkalar (har bir sektsiya bo'yicha)
    let totalShelves = 0;
    sectionsData.forEach((sec, idx) => {
      const sCount = sec.shelvesCount || 0;
      totalShelves += sCount;
      if (sCount > 0) {
        parts.push({
          id: `polka_sec_${idx}`,
          name: `Polka (${idx + 1}-bo'lim: ${sec.width}mm)`,
          detailNameRu: 'Полка',
          length: sec.width,
          width: depth - 20,
          qty: sCount,
          material: `DSP ${T}mm`,
          edgeU1: '2.0 mm (Oldi)',
          edgeU2: '—',
          edgeK1: '—',
          edgeK2: '—',
          area: (sec.width * (depth - 20) * sCount) / 1000000,
          drillingNote: 'Polkodershatel o‘rni'
        });
      }
    });

    // 6. Tortmalar (Drawers)
    let totalDrawers = 0;
    sectionsData.forEach((sec, idx) => {
      const dCount = sec.drawersCount || 0;
      totalDrawers += dCount;
      if (dCount > 0) {
        const runnerLen = depth >= 550 ? 500 : depth >= 500 ? 450 : depth >= 450 ? 400 : 350;
        const boxHeight = 140;
        const innerDrawerWidth = sec.width - 26;

        parts.push({
          id: `drawer_sides_${idx}`,
          name: `Tortma yonlari (${idx + 1}-bo'lim)`,
          detailNameRu: 'Боковина ящика',
          length: runnerLen,
          width: boxHeight,
          qty: dCount * 2,
          material: `DSP ${T}mm`,
          edgeU1: '0.4 mm (Ustki)',
          edgeU2: '—',
          edgeK1: '—',
          edgeK2: '—',
          area: (runnerLen * boxHeight * dCount * 2) / 1000000,
          drillingNote: 'Teleskopik rels o‘rni'
        });

        parts.push({
          id: `drawer_front_back_${idx}`,
          name: `Tortma old/orqa (${idx + 1}-bo'lim)`,
          detailNameRu: 'Перед/зад ящика',
          length: innerDrawerWidth - 2 * T,
          width: boxHeight,
          qty: dCount * 2,
          material: `DSP ${T}mm`,
          edgeU1: '0.4 mm (Ustki)',
          edgeU2: '—',
          edgeK1: '—',
          edgeK2: '—',
          area: ((innerDrawerWidth - 2 * T) * boxHeight * dCount * 2) / 1000000,
          drillingNote: 'Konfirmat teshiklari'
        });

        parts.push({
          id: `drawer_bottom_${idx}`,
          name: `Tortma tagligi (${idx + 1}-bo'lim DVP)`,
          detailNameRu: 'Дно ящика (ДВП)',
          length: innerDrawerWidth,
          width: runnerLen,
          qty: dCount,
          material: 'DVP 3mm',
          edgeU1: '—',
          edgeU2: '—',
          edgeK1: '—',
          edgeK2: '—',
          area: (innerDrawerWidth * runnerLen * dCount) / 1000000,
          drillingNote: 'Pazga kiradi yoki shurup'
        });

        parts.push({
          id: `drawer_facade_${idx}`,
          name: `Tortma fasadi (${idx + 1}-bo'lim)`,
          detailNameRu: 'Фасад ящика',
          length: sec.width - 4,
          width: 180,
          qty: dCount,
          material: `DSP ${T}mm`,
          edgeU1: '2.0 mm',
          edgeU2: '2.0 mm',
          edgeK1: '2.0 mm',
          edgeK2: '2.0 mm',
          area: ((sec.width - 4) * 180 * dCount) / 1000000,
          drillingNote: 'Tutqich (Ruchka) teshigi'
        });
      }
    });

    // 7. Fasadlar / Eshiklar
    if (doorType !== 'none' && doorsCount > 0) {
      if (doorType === 'hinged') {
        const doorH = bodyHeight - 4;
        const doorW = Math.floor(width / doorsCount) - 4;
        parts.push({
          id: 'door_hinged',
          name: `Eshiklar / Fasad (${facadeType === 'mirror' ? 'Oyna' : facadeType === 'glass' ? 'Shisha' : 'DSP'})`,
          detailNameRu: 'Дверь распашная',
          length: doorH,
          width: doorW,
          qty: doorsCount,
          material: facadeType === 'mirror' ? 'Oyna 4mm + DSP' : facadeType === 'glass' ? 'Shisha + Profil' : `DSP ${T}mm`,
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
          material: 'Kupe Profil + To‘ldiruvchi',
          edgeU1: 'Alyuminiy profil',
          edgeU2: 'Alyuminiy profil',
          edgeK1: 'Profil',
          edgeK2: 'Profil',
          area: (doorH * doorW * doorsCount) / 1000000,
          drillingNote: 'Rolik va yo‘naltiruvchi profil'
        });
      }
    }

    // 8. Orqa fon DVP
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
    const dspParts = parts.filter(p => p.material.includes('DSP'));
    const dvpParts = parts.filter(p => p.material.includes('DVP'));

    const totalDspArea = dspParts.reduce((sum, p) => sum + p.area, 0);
    const totalDvpArea = dvpParts.reduce((sum, p) => sum + p.area, 0);

    const sheetArea = 2.75 * 1.83;
    const dspSheetsNeeded = Math.max(1, Math.ceil((totalDspArea * 1.15) / sheetArea));
    const dvpSheetsNeeded = Math.max(1, Math.ceil((totalDvpArea * 1.1) / sheetArea));

    // Edgebanding linear meters
    let edge2mmMeters = 0;
    let edge04mmMeters = 0;
    parts.forEach(p => {
      [p.edgeU1, p.edgeU2].forEach(e => {
        if (e.includes('2.0')) edge2mmMeters += (p.length / 1000) * p.qty;
        if (e.includes('0.4')) edge04mmMeters += (p.length / 1000) * p.qty;
      });
      [p.edgeK1, p.edgeK2].forEach(e => {
        if (e.includes('2.0')) edge2mmMeters += (p.width / 1000) * p.qty;
        if (e.includes('0.4')) edge04mmMeters += (p.width / 1000) * p.qty;
      });
    });

    edge2mmMeters = Math.ceil(edge2mmMeters * 1.1);
    edge04mmMeters = Math.ceil(edge04mmMeters * 1.1);
    const totalEdgeMeters = edge2mmMeters + edge04mmMeters;

    // Hardware Calculations
    let hingesCount = 0;
    if (doorType === 'hinged' && doorsCount > 0) {
      const doorH = bodyHeight;
      const hingesPerDoor = doorH < 1000 ? 2 : doorH < 1600 ? 3 : doorH < 2050 ? 4 : 5;
      hingesCount = doorsCount * hingesPerDoor;
    }

    const drawerSlidesCount = totalDrawers;
    const handlesCount = (doorType === 'hinged' ? doorsCount : 0) + totalDrawers;
    const legsCount = width < 1200 ? 4 : width < 2000 ? 6 : 8;
    const confirmatsCount = (sectionsData.length * 8) + (totalShelves * 4) + (totalDrawers * 8) + 20;

    // LED Lighting
    const totalLedMeters = hasLedLighting ? Math.ceil(((totalShelves * (width / sectionsData.length)) + width) / 1000) : 0;
    const costLed = hasLedLighting ? (totalLedMeters * ledPricePerMeter) + transformerPrice : 0;

    // Cost Breakdown
    const costDsp = dspSheetsNeeded * dspSheetPrice;
    const costDvp = dvpSheetsNeeded * dvpSheetPrice;
    const costEdge = totalEdgeMeters * edgePricePerMeter;
    const costHinges = hingesCount * hingePrice;
    const costSlides = drawerSlidesCount * drawerSlidePrice;
    const costHandles = handlesCount * handlePrice;
    const costFasteners = confirmatsCount * 500 + legsCount * 4000;
    const costSpecialFacade = (facadeType === 'mirror' || facadeType === 'glass') ? (doorsCount * 180000) : 0;

    const materialsCost = costDsp + costDvp + costEdge + costHinges + costSlides + costHandles + costFasteners + costLed + costSpecialFacade;
    const laborAndMargin = Math.round((materialsCost * laborPercent) / 100);
    const totalSellingPrice = materialsCost + laborAndMargin;

    // 2D Guillotine Bin-Packing Layout
    const SHEET_W = 2750;
    const SHEET_H = 1830;
    const KERF = 4;

    interface PlacedItem {
      x: number;
      y: number;
      w: number;
      h: number;
      name: string;
      color: string;
    }

    interface SheetLayout {
      sheetIndex: number;
      items: PlacedItem[];
      usedArea: number;
      wastePercent: number;
    }

    const cutPieces: { w: number; h: number; name: string }[] = [];
    dspParts.forEach((p) => {
      for (let i = 0; i < p.qty; i++) {
        cutPieces.push({
          w: Math.max(p.length, p.width),
          h: Math.min(p.length, p.width),
          name: p.name
        });
      }
    });

    cutPieces.sort((a, b) => b.h - a.h || b.w - a.w);

    const sheetLayouts: SheetLayout[] = [];
    let currentSheet: PlacedItem[] = [];
    let curX = 10;
    let curY = 10;
    let shelfHeight = 0;
    let sheetAreaUsed = 0;

    const colorPalette = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];

    cutPieces.forEach((piece, pIdx) => {
      if (curX + piece.w + KERF > SHEET_W - 10) {
        curX = 10;
        curY += shelfHeight + KERF;
        shelfHeight = 0;
      }

      if (curY + piece.h + KERF > SHEET_H - 10) {
        sheetLayouts.push({
          sheetIndex: sheetLayouts.length + 1,
          items: [...currentSheet],
          usedArea: sheetAreaUsed,
          wastePercent: Math.max(5, Math.round(((SHEET_W * SHEET_H - sheetAreaUsed) / (SHEET_W * SHEET_H)) * 100))
        });
        currentSheet = [];
        curX = 10;
        curY = 10;
        shelfHeight = 0;
        sheetAreaUsed = 0;
      }

      currentSheet.push({
        x: curX,
        y: curY,
        w: piece.w,
        h: piece.h,
        name: piece.name,
        color: colorPalette[pIdx % colorPalette.length]
      });

      sheetAreaUsed += piece.w * piece.h;
      shelfHeight = Math.max(shelfHeight, piece.h);
      curX += piece.w + KERF;
    });

    if (currentSheet.length > 0) {
      sheetLayouts.push({
        sheetIndex: sheetLayouts.length + 1,
        items: [...currentSheet],
        usedArea: sheetAreaUsed,
        wastePercent: Math.max(5, Math.round(((SHEET_W * SHEET_H - sheetAreaUsed) / (SHEET_W * SHEET_H)) * 100))
      });
    }

    return {
      bodyHeight,
      innerHeight,
      parts,
      totalDspArea,
      totalDvpArea,
      totalDrawers,
      totalShelves,
      dspSheetsNeeded: Math.max(dspSheetsNeeded, sheetLayouts.length),
      dvpSheetsNeeded,
      edge2mmMeters,
      edge04mmMeters,
      totalEdgeMeters,
      hingesCount,
      drawerSlidesCount,
      handlesCount,
      legsCount,
      confirmatsCount,
      totalLedMeters,
      materialsCost,
      laborAndMargin,
      totalSellingPrice,
      costDsp,
      costDvp,
      costEdge,
      costHinges,
      costSlides,
      costHandles,
      costFasteners,
      costLed,
      costSpecialFacade,
      sheetLayouts
    };
  }, [
    height, width, depth, thickness, socleHeight, sectionsData,
    hasLedLighting, doorType, doorsCount, dspSheetPrice, dvpSheetPrice,
    edgePricePerMeter, hingePrice, drawerSlidePrice, handlePrice,
    ledPricePerMeter, transformerPrice, laborPercent, facadeType
  ]);

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
      pdf.save(`Moderno_${projectName.replace(/\s+/g, '_')}_${width}x${height}x${depth}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert("PDF yuklab olishda xatolik yuz berdi. Iltimos 'Chop etish' tugmasidan foydalaning.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    const text = `📐 MODERNO MEBEL - 3D VA TEXNIK HISOBOT
Loyha: ${projectName}
Mijoz: ${clientName || 'Moderno mijozi'} | Tel: ${clientPhone || '—'}
O'lchamlari: ${width} x ${height} x ${depth} mm
Material: DSP ${thickness} mm (${WOOD_COLORS.find(w => w.hex === bodyColor)?.name || 'Maxsus'})
Fasad: ${FACADE_TYPES.find(f => f.id === facadeType)?.name} (${WOOD_COLORS.find(w => w.hex === facadeColor)?.name})
Bo'limlar: ${sectionsData.length} ta (Kengliklari: ${sectionsData.map(s => s.width + 'mm').join(' + ')})
Polkalar: ${calculations.totalShelves} ta | Tortmalar: ${calculations.totalDrawers} ta | LED: ${hasLedLighting ? 'Bor' : 'Yo‘q'}

📋 DETALIZATSIYA VA MATERIALLAR:
• Jami detallar: ${calculations.parts.reduce((a, b) => a + b.qty, 0)} dona
• DSP listlar: ${calculations.dspSheetsNeeded} dona (${calculations.totalDspArea.toFixed(2)} m²)
• DVP orqa fon: ${calculations.dvpSheetsNeeded} dona (${calculations.totalDvpArea.toFixed(2)} m²)
• Kromka (2.0mm): ${calculations.edge2mmMeters} m | Kromka (0.4mm): ${calculations.edge04mmMeters} m

⚙️ FURNITURALAR VA AKSESSUARLAR:
• Petlyalar: ${calculations.hingesCount} dona
• Napravlyayushie (tortma relsi): ${calculations.drawerSlidesCount} juft
• Tutqichlar (Ruchka): ${calculations.handlesCount} dona
• LED profil va tasma: ${calculations.totalLedMeters} metr

💰 YAKUNIY SOTUV NARXI: ${calculations.totalSellingPrice.toLocaleString()} so'm
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
                Moderno Konstruktor Pro
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Custom Layout CAD
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Erkin joylashuv, 3D interaktiv eshiklar va avto-raskroy</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Loyihani saqlash"
          >
            <Bookmark className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Saqlash</span>
          </button>

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

      {/* Preset Category Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Kategoriya:
          </span>
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActivePresetCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                activePresetCategory === cat 
                  ? 'bg-blue-600 text-white font-bold shadow' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Master Door Toggle */}
        {doorType !== 'none' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDoorsOpenPercent(doorsOpenPercent > 0 ? 0 : 100)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                doorsOpenPercent > 0 
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {doorsOpenPercent > 0 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{doorsOpenPercent > 0 ? "Barchasini Yopish" : "Barchasini Ochish"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Presets Horizontal Slider */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {filteredPresets.map((preset) => (
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

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* LEFT COLUMN: Controls & Parameters (5 Cols) */}
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
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Kenglik (W)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    step={10}
                    min={400}
                    max={4000}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-500">mm</span>
                </div>
              </div>

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

            <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-400 text-[11px]">Kenglik:</span>
                <input 
                  type="range" 
                  min={400} 
                  max={3000} 
                  step={50} 
                  value={width} 
                  onChange={(e) => handleWidthChange(Number(e.target.value))} 
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

          {/* 2. ERKIN BO'LIMLAR VA DETALLARNI SOZLASH (CUSTOM SECTION LAYOUT) */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                Detallarning Joyini Erkin Sozlash
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => balanceSectionWidths()}
                  className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg border border-slate-700 flex items-center gap-1"
                  title="Bo'limlar kengligini teng taqsimlash"
                >
                  <Scale className="w-3 h-3" />
                  <span>Tenglash</span>
                </button>
                <button
                  onClick={handleAddSection}
                  disabled={sectionsData.length >= 6}
                  className="px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg flex items-center gap-0.5 font-bold"
                  title="Yangi sektsiya qo'shish"
                >
                  <Plus className="w-3 h-3" />
                  <span>Bo'lim</span>
                </button>
              </div>
            </div>

            {/* Individual Section Cards */}
            <div className="space-y-2.5">
              {sectionsData.map((sec, idx) => (
                <div key={sec.id} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-600/30 border border-blue-500 text-blue-300 text-[10px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      {idx + 1}-Bo'lim ({sec.width} mm)
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => handleMoveSection(idx, 'left')}
                        disabled={idx === 0}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 text-[10px] font-bold"
                        title="Chapga surish"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => handleMoveSection(idx, 'right')}
                        disabled={idx === sectionsData.length - 1}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 text-[10px] font-bold"
                        title="O'ngga surish"
                      >
                        →
                      </button>

                      {sectionsData.length > 1 && (
                        <button
                          onClick={() => handleRemoveSection(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 ml-1"
                          title="Ushbu bo'limni o'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Width slider for this section */}
                  {sectionsData.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] text-slate-400 w-14">Kenglik:</span>
                      <input
                        type="range"
                        min={150}
                        max={innerTotalWidth - 150}
                        value={sec.width}
                        onChange={(e) => handleSectionWidthChange(idx, Number(e.target.value))}
                        className="flex-1 accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-blue-300 w-12 text-right">{sec.width} mm</span>
                    </div>
                  )}

                  {/* Shelves, Drawers, Hangers inside this section */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                    {/* Shelves */}
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="text-[10px]">
                        <span className="text-slate-400 block">Polkalar</span>
                        <strong className="text-white font-mono">{sec.shelvesCount} ta</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSectionProp(idx, 'shelvesCount', Math.max(0, sec.shelvesCount - 1))}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateSectionProp(idx, 'shelvesCount', Math.min(8, sec.shelvesCount + 1))}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Drawers in this section */}
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="text-[10px]">
                        <span className="text-slate-400 block">Tortmalar</span>
                        <strong className="text-white font-mono">{sec.drawersCount} ta</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSectionProp(idx, 'drawersCount', Math.max(0, sec.drawersCount - 1))}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateSectionProp(idx, 'drawersCount', Math.min(6, sec.drawersCount + 1))}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Hanger with Single/Double Switch */}
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Kiyim Ilgich</span>
                        {sec.hasHanger && (
                          <button
                            onClick={() => updateSectionProp(idx, 'hangerType', sec.hangerType === 'double' ? 'single' : 'double')}
                            className="text-[9px] px-1 rounded bg-blue-900/60 text-blue-300 font-mono hover:bg-blue-800"
                            title="Yakka yoki Qo'shaloq"
                          >
                            {sec.hangerType === 'double' ? '2-qavat' : '1-qavat'}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const nextHanger = !sec.hasHanger;
                          const updated = [...sectionsData];
                          updated[idx] = { 
                            ...updated[idx], 
                            hasHanger: nextHanger,
                            hangerType: nextHanger ? (sec.hangerType || 'single') : undefined
                          };
                          setSectionsData(updated);
                        }}
                        className={`py-0.5 rounded text-[10px] font-bold mt-1 transition-colors ${
                          sec.hasHanger ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sec.hasHanger ? (sec.hangerType === 'double' ? 'Qo‘shaloq' : 'Yakka') : 'Yo‘q'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Fasad Turlari va Ranglar */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              Fasad Uslubi va Ranglar
            </h2>

            {/* Facade Type */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Fasad Turi:</label>
              <div className="grid grid-cols-2 gap-2">
                {FACADE_TYPES.map((ft) => (
                  <button
                    key={ft.id}
                    onClick={() => setFacadeType(ft.id as any)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs text-left transition-all ${
                      facadeType === ft.id 
                        ? 'border-blue-500 bg-blue-500/15 font-bold text-white shadow' 
                        : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span>{ft.icon}</span>
                    <span className="text-[11px] truncate">{ft.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Korpus Rangi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Korpus DSP Rangi:</label>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncColors}
                    onChange={(e) => {
                      setSyncColors(e.target.checked);
                      if (e.target.checked) setFacadeColor(bodyColor);
                    }}
                    className="accent-blue-500 rounded"
                  />
                  <span>Fasad bilan bir xil</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {WOOD_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setBodyColor(c.hex);
                      if (syncColors) setFacadeColor(c.hex);
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs text-left transition-all ${
                      bodyColor === c.hex 
                        ? 'border-blue-500 bg-blue-500/15 font-bold text-white shadow' 
                        : 'border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: c.hex }} />
                    <span className="truncate text-[10px]">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fasad Rangi */}
            {!syncColors && facadeType !== 'mirror' && facadeType !== 'glass' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Fasad (Eshiklar) Rangi:</label>
                <div className="grid grid-cols-3 gap-2">
                  {WOOD_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFacadeColor(c.hex)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs text-left transition-all ${
                        facadeColor === c.hex 
                          ? 'border-blue-500 bg-blue-500/15 font-bold text-white shadow' 
                          : 'border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: c.hex }} />
                      <span className="truncate text-[10px]">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Eshiklar & LED */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 shadow-xl backdrop-blur-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Eshiklar, Tsokol va LED
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'hinged', name: 'Ochiladigan' },
                { id: 'sliding', name: 'Kupé (Suriladigan)' },
                { id: 'none', name: 'Ochiq' }
              ].map((dt) => (
                <button
                  key={dt.id}
                  onClick={() => {
                    setDoorType(dt.id as any);
                    if (dt.id === 'none') setDoorsCount(0);
                    else if (doorsCount === 0) setDoorsCount(sectionsData.length);
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

            <div className="grid grid-cols-2 gap-3 pt-1">
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

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">LED Podsvetka</label>
                <button
                  onClick={() => setHasLedLighting(!hasLedLighting)}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    hasLedLighting ? 'bg-amber-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400'
                  }`}
                >
                  <SunMedium className="w-3.5 h-3.5" />
                  <span>{hasLedLighting ? 'LED Yoqilgan' : 'LED Yo‘q'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. Saqlangan Loyihalar */}
          {savedProjects.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3 shadow-lg">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                Saqlangan Loyihalaringiz ({savedProjects.length} ta)
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleLoadProject(p)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.width}x{p.height} mm • {p.totalPrice?.toLocaleString()} UZS</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(p.id, e)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: 3D Studio, 2D Blueprint, Raskroy & Labels (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">

          {/* Navigation Sub-Tabs */}
          <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
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
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'blueprint' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>2D Chizma</span>
              </button>

              <button
                onClick={() => setActiveTab('cutlist')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
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
                onClick={() => setActiveTab('raskroy')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'raskroy' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Raskroy (Listlar)</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-900/60 rounded-full font-mono">
                  {calculations.sheetLayouts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('labels')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'labels' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Stikerlar</span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
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
                  sectionsData={sectionsData}
                  hasLedLighting={hasLedLighting}
                  doorType={doorType}
                  doorsCount={doorsCount}
                  bodyColor={bodyColor}
                  facadeColor={facadeColor}
                  facadeType={facadeType}
                  handleColor={handleColor}
                  doorsOpenPercent={doorsOpenPercent}
                  onDoorsOpenPercentChange={(val) => setDoorsOpenPercent(val)}
                />

                {/* Quick Info bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-800/70 p-2.5 rounded-xl border border-slate-700/80">
                    <span className="text-slate-400 text-[10px] block">Korpus / Fasad</span>
                    <strong className="text-white font-medium flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bodyColor }} />
                      <span className="truncate">{WOOD_COLORS.find(w => w.hex === bodyColor)?.name}</span>
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

            {/* TAB 2: 2D TECHNICAL CAD BLUEPRINT */}
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
                    <button
                      onClick={() => setBlueprintSideView(!blueprintSideView)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      {blueprintSideView ? "Old Ko‘rinishga o'tish" : "Yon Kesim (Side View)"}
                    </button>

                    <button
                      onClick={() => setBlueprintStyle(blueprintStyle === 'dark_cad' ? 'white_paper' : 'dark_cad')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      {blueprintStyle === 'dark_cad' ? "Oq Qog'oz (A4)" : "Dark CAD"}
                    </button>
                  </div>
                </div>

                {/* SVG CAD RENDERER */}
                <div className="w-full flex justify-center py-2 overflow-x-auto">
                  {!blueprintSideView ? (
                    <svg viewBox={`-90 -60 ${width + 180} ${height + 130}`} className="max-h-[500px] w-auto drop-shadow-xl">
                      {/* Sides */}
                      <rect x="0" y="0" width={thickness} height={height - socleHeight} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />
                      <rect x={width - thickness} y="0" width={thickness} height={height - socleHeight} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />

                      {/* Top & Bottom */}
                      <rect x={thickness} y="0" width={width - 2 * thickness} height={thickness} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />
                      <rect x={thickness} y={height - socleHeight - thickness} width={width - 2 * thickness} height={thickness} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />

                      {/* Socle */}
                      {socleHeight > 0 && (
                        <g>
                          <rect x={thickness + 20} y={height - socleHeight} width={width - 2 * thickness - 40} height={socleHeight} fill={blueprintStyle === 'dark_cad' ? "#0f172a" : "#cbd5e1"} stroke="#64748b" strokeWidth="2" />
                          <text x={width / 2} y={height - socleHeight / 2 + 5} textAnchor="middle" fill="#64748b" fontSize="16" fontFamily="monospace">Tsokol: {socleHeight} mm</text>
                        </g>
                      )}

                      {/* Sections Content & Dividers */}
                      {(() => {
                        let curX = thickness;
                        return sectionsData.map((sec, idx) => {
                          const secX = curX;
                          const secW = sec.width;
                          const secInnerH = height - socleHeight - 2 * thickness;
                          const shelvesCount = sec.shelvesCount || 0;
                          const drawersCount = sec.drawersCount || 0;
                          const drawersTotalH = drawersCount * 164;
                          const availableH = secInnerH - drawersTotalH;
                          const shelfGap = availableH / (shelvesCount + 1);

                          const elements = [];

                          // Divider on right (if not last)
                          if (idx < sectionsData.length - 1) {
                            elements.push(
                              <rect key={`div-${idx}`} x={secX + secW} y={thickness} width={thickness} height={secInnerH} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="1.8" />
                            );
                          }

                          // Drawers
                          if (drawersCount > 0) {
                            for (let d = 0; d < drawersCount; d++) {
                              const dY = height - socleHeight - thickness - (drawersCount - d) * 164;
                              elements.push(
                                <g key={`drw-${idx}-${d}`}>
                                  <rect x={secX + 4} y={dY} width={secW - 8} height={160} fill={blueprintStyle === 'dark_cad' ? "#0f172a" : "#f1f5f9"} stroke="#38bdf8" strokeWidth="2" rx="3" />
                                  <rect x={secX + secW / 2 - 25} y={dY + 76} width="50" height="8" fill="#64748b" rx="2" />
                                  <text x={secX + secW / 2} y={dY + 24} textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="monospace">Tortma #{d + 1}</text>
                                </g>
                              );
                            }
                          }

                          // Shelves
                          for (let s = 0; s < shelvesCount; s++) {
                            const shelfY = thickness + drawersTotalH + (s + 1) * shelfGap;
                            elements.push(
                              <g key={`sh-${idx}-${s}`}>
                                <rect x={secX + 1} y={shelfY} width={secW - 2} height={thickness} fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="1.5" />
                                <text x={secX + secW / 2} y={shelfY - 6} textAnchor="middle" fill={blueprintStyle === 'dark_cad' ? "#94a3b8" : "#64748b"} fontSize="13" fontFamily="monospace">
                                  ↕ {Math.round(shelfGap)} mm
                                </text>
                              </g>
                            );
                          }

                          // Hanger
                          if (sec.hasHanger) {
                            elements.push(
                              <g key={`hng-${idx}`}>
                                <line x1={secX + 10} y1={thickness + 90} x2={secX + secW - 10} y2={thickness + 90} stroke="#38bdf8" strokeWidth="5" />
                                <text x={secX + secW / 2} y={thickness + 125} textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">Truba / Ilgich</text>
                              </g>
                            );
                          }

                          // Section width dimension on top
                          elements.push(
                            <g key={`sec-dim-${idx}`}>
                              <line x1={secX} y1="-15" x2={secX + secW} y2="-15" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" />
                              <text x={secX + secW / 2} y="-20" textAnchor="middle" fill={blueprintStyle === 'dark_cad' ? "#94a3b8" : "#475569"} fontSize="13" fontFamily="monospace">
                                {secW} mm
                              </text>
                            </g>
                          );

                          curX += secW + thickness;
                          return elements;
                        });
                      })()}

                      {/* Dimensions */}
                      <g>
                        {/* Horizontal Width Dimension */}
                        <line x1="0" y1={height + 30} x2={width} y2={height + 30} stroke="#38bdf8" strokeWidth="2" />
                        <polygon points={`0,${height + 30} 12,${height + 26} 12,${height + 34}`} fill="#38bdf8" />
                        <polygon points={`${width},${height + 30} ${width - 12},${height + 26} ${width - 12},${height + 34}`} fill="#38bdf8" />
                        <text x={width / 2} y={height + 52} textAnchor="middle" fill="#38bdf8" fontSize="16" fontWeight="bold" fontFamily="monospace">
                          W: {width} mm
                        </text>

                        {/* Vertical Height Dimension */}
                        <line x1="-40" y1="0" x2="-40" y2={height} stroke="#38bdf8" strokeWidth="2" />
                        <polygon points={`-40,0 -44,12 -36,12`} fill="#38bdf8" />
                        <polygon points={`-40,${height} -44,${height - 12} -36,${height - 12}`} fill="#38bdf8" />
                        <text 
                          x="-50" 
                          y={height / 2} 
                          textAnchor="middle" 
                          transform={`rotate(-90, -50, ${height / 2})`} 
                          fill="#38bdf8" 
                          fontSize="16" 
                          fontWeight="bold" 
                          fontFamily="monospace"
                        >
                          H: {height} mm
                        </text>
                      </g>
                    </svg>
                  ) : (
                    <svg viewBox={`-90 -60 ${depth + 170} ${height + 140}`} className="max-h-[500px] w-auto drop-shadow-xl">
                      <rect x="0" y="0" width={depth} height={height - socleHeight} fill={blueprintStyle === 'dark_cad' ? "#1e293b" : "#e2e8f0"} stroke="#3b82f6" strokeWidth="2" />
                      {socleHeight > 0 && (
                        <rect x="25" y={height - socleHeight} width={depth - 50} height={socleHeight} fill="#0f172a" stroke="#64748b" strokeWidth="2" />
                      )}
                      <rect x="3" y="0" width="4" height={height - socleHeight} fill="#38bdf8" />
                      
                      {/* Side View Dimensions */}
                      <line x1="0" y1={height + 30} x2={depth} y2={height + 30} stroke="#38bdf8" strokeWidth="2" />
                      <polygon points={`0,${height + 30} 12,${height + 26} 12,${height + 34}`} fill="#38bdf8" />
                      <polygon points={`${depth},${height + 30} ${depth - 12},${height + 26} ${depth - 12},${height + 34}`} fill="#38bdf8" />
                      <text x={depth / 2} y={height + 52} textAnchor="middle" fill="#38bdf8" fontSize="16" fontWeight="bold" fontFamily="monospace">
                        D: {depth} mm
                      </text>

                      <line x1="-40" y1="0" x2="-40" y2={height} stroke="#38bdf8" strokeWidth="2" />
                      <polygon points={`-40,0 -44,12 -36,12`} fill="#38bdf8" />
                      <polygon points={`-40,${height} -44,${height - 12} -36,${height - 12}`} fill="#38bdf8" />
                      <text 
                        x="-50" 
                        y={height / 2} 
                        textAnchor="middle" 
                        transform={`rotate(-90, -50, ${height / 2})`} 
                        fill="#38bdf8" 
                        fontSize="16" 
                        fontWeight="bold" 
                        fontFamily="monospace"
                      >
                        H: {height} mm
                      </text>
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DETALIZATSIYA (CUT LIST) */}
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
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/30">
                    Jami detallar: {calculations.parts.reduce((sum, p) => sum + p.qty, 0)} dona
                  </span>
                </div>

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
                              {part.edgeU1} {part.edgeK1 !== '—' ? `| ${part.edgeK1}` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{part.drillingNote}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">{part.area.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Jami DSP maydoni</span>
                    <strong className="text-sm font-mono text-white">{calculations.totalDspArea.toFixed(2)} m²</strong>
                    <span className="text-[10px] text-blue-400 block mt-0.5">Kerak: {calculations.dspSheetsNeeded} list</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Jami DVP maydoni</span>
                    <strong className="text-sm font-mono text-white">{calculations.totalDvpArea.toFixed(2)} m²</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Kerak: {calculations.dvpSheetsNeeded} list</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Kromka 2.0 mm (Oldi)</span>
                    <strong className="text-sm font-mono text-emerald-400">{calculations.edge2mmMeters} metr</strong>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Kromka 0.4 mm (Ichki)</span>
                    <strong className="text-sm font-mono text-teal-400">{calculations.edge04mmMeters} metr</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 2D ALGORITHMIC RASKROY */}
            {activeTab === 'raskroy' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-blue-400" />
                      Algoritmik Raskroy Xaritasi (Guillotine 2D Packing)
                    </h3>
                    <p className="text-[11px] text-slate-400">Standart 2750 × 1830 mm listlarda pilyan oraliq masofasi (4mm) hisobi bilan</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    Optimal listlar: {calculations.sheetLayouts.length} dona
                  </span>
                </div>

                <div className="space-y-6">
                  {calculations.sheetLayouts.map((sheet) => (
                    <div key={sheet.sheetIndex} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            {sheet.sheetIndex}
                          </span>
                          DSP List #{sheet.sheetIndex} (2750 × 1830 mm)
                        </span>
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <span className="text-blue-400">Detallar: {sheet.items.length} ta</span>
                          <span className="text-slate-400">Chiqindi (Scrap): ~{sheet.wastePercent}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2 overflow-x-auto">
                        <svg viewBox="0 0 2770 1850" className="w-full h-auto max-h-[380px] drop-shadow">
                          <rect x="0" y="0" width="2750" height="1830" fill="#0f172a" stroke="#475569" strokeWidth="4" />
                          {sheet.items.map((item, itIdx) => (
                            <g key={`item-${itIdx}`}>
                              <rect
                                x={item.x}
                                y={item.y}
                                width={item.w}
                                height={item.h}
                                fill={item.color}
                                fillOpacity="0.25"
                                stroke={item.color}
                                strokeWidth="3"
                                rx="4"
                              />
                              <text
                                x={item.x + item.w / 2}
                                y={item.y + item.h / 2}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize={Math.min(36, Math.max(18, item.w / 12))}
                                fontWeight="bold"
                              >
                                {item.name}
                              </text>
                              <text
                                x={item.x + item.w / 2}
                                y={item.y + item.h / 2 + 35}
                                textAnchor="middle"
                                fill="#cbd5e1"
                                fontSize={Math.min(28, Math.max(14, item.w / 16))}
                                fontFamily="monospace"
                              >
                                {item.w} × {item.h} mm
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: WORKSHOP PRODUCTION LABELS */}
            {activeTab === 'labels' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      Sex uchun Detal Stikerlari (Etiketkalar)
                    </h3>
                    <p className="text-[11px] text-slate-400">Har bir detalga yopishtiriladigan stikerlar (A4 stiker qog'ozda chop etishga tayyor)</p>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Stikerlarni Chop etish</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {calculations.parts.map((p, idx) => (
                    <div key={p.id} className="bg-white text-slate-900 border-2 border-slate-800 rounded-xl p-3 shadow-md font-sans space-y-1.5">
                      <div className="flex justify-between items-start border-b border-slate-300 pb-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">MODERNO MEBEL</span>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">№{idx + 1}. {p.name}</h4>
                        </div>
                        <span className="text-xs font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                          {p.qty} dona
                        </span>
                      </div>

                      <div className="text-xs font-mono font-black text-blue-900">
                        {p.length} × {p.width} × {thickness} mm
                      </div>

                      <div className="text-[10px] text-slate-700 space-y-0.5 border-t border-slate-200 pt-1">
                        <div><strong>Kromka:</strong> {p.edgeU1} {p.edgeK1 !== '—' ? `| ${p.edgeK1}` : ''}</div>
                        <div><strong>Burg'ulash:</strong> {p.drillingNote}</div>
                        <div><strong>Loyiha:</strong> {projectName} ({clientName || 'Mijoz'})</div>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-slate-200">
                        <div className="flex gap-0.5 h-4 items-center">
                          {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2].map((bw, i) => (
                            <div key={i} className="bg-black h-full" style={{ width: `${bw * 1.5}px` }} />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">MOD-{p.id.slice(0, 5).toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: PRICING & HARDWARE ESTIMATE */}
            {activeTab === 'pricing' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Smeta va Yakuniy Narx Hisob-Kitobi
                    </h3>
                    <p className="text-[11px] text-slate-400">Materiallar tannarxi, furnituralar, aksessuarlar va sotuv taklifi</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Sotuv Narxi</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {calculations.totalSellingPrice.toLocaleString()} UZS
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {hasLedLighting && (
                      <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                        <span className="text-slate-300">LED Podsvetka ({calculations.totalLedMeters}m + Blok):</span>
                        <span className="font-mono font-bold text-amber-300">{calculations.costLed.toLocaleString()} UZS</span>
                      </div>
                    )}

                    {calculations.costSpecialFacade > 0 && (
                      <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                        <span className="text-slate-300">Maxsus Fasad ({FACADE_TYPES.find(f => f.id === facadeType)?.name}):</span>
                        <span className="font-mono font-bold text-slate-200">{calculations.costSpecialFacade.toLocaleString()} UZS</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300">Konfirmat, podpyatnik, shurup:</span>
                      <span className="font-mono font-bold text-slate-200">{calculations.costFasteners.toLocaleString()} UZS</span>
                    </div>

                    <div className="flex justify-between text-xs pt-1 font-bold text-white">
                      <span>Jami Materiallar Tannarxi:</span>
                      <span className="font-mono text-blue-400">{calculations.materialsCost.toLocaleString()} UZS</span>
                    </div>
                  </div>

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

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-400" />
                Loyihani Saqlash
              </h3>
              <button 
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Loyiha Nomi</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="Masalan: Mehmonxona Garderobi"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mijoz Ismi</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="Masalan: Sardor aka"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mijoz Telefoni</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>O'lchamlari: <strong>{width}x{height}x{depth} mm</strong></div>
                <div>Sotuv narxi: <strong className="text-emerald-400">{calculations.totalSellingPrice.toLocaleString()} UZS</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
