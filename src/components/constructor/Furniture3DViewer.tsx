'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCw, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Camera, 
  Sun, 
  Grid, 
  Sparkles,
  Layers
} from 'lucide-react';

export interface Furniture3DProps {
  height: number;
  width: number;
  depth: number;
  thickness: number;
  socleHeight: number;
  sections: number;
  shelvesPerSection: number[];
  drawers: number;
  hasHanger: boolean;
  doorType: 'hinged' | 'sliding' | 'none';
  doorsCount: number;
  materialColor: string; // hex color code
  handleColor: string; // hex color code
  doorsOpen: boolean;
  onToggleDoors?: () => void;
}

export const WOOD_COLORS = [
  { id: 'white', name: 'Oq Matoviy', hex: '#f8fafc', roughness: 0.4 },
  { id: 'sonoma', name: 'Dub Sonoma', hex: '#d4b38a', roughness: 0.6 },
  { id: 'anthracite', name: 'Antratsit (Kulrang)', hex: '#27272a', roughness: 0.5 },
  { id: 'wenge', name: 'Venge (To‘q)', hex: '#3e2723', roughness: 0.7 },
  { id: 'walnut', name: 'Oltin Yong‘oq', hex: '#85512b', roughness: 0.55 },
  { id: 'sand', name: 'Krem / Qum', hex: '#e2d5c3', roughness: 0.45 },
];

export const HANDLE_COLORS = [
  { id: 'silver', name: 'Xrom / Kumush', hex: '#cbd5e1', metalness: 0.9 },
  { id: 'black', name: 'Qora Mat', hex: '#18181b', metalness: 0.2 },
  { id: 'gold', name: 'Oltin / Brass', hex: '#eab308', metalness: 0.8 },
];

export default function Furniture3DViewer({
  height,
  width,
  depth,
  thickness,
  socleHeight,
  sections,
  shelvesPerSection,
  drawers,
  hasHanger,
  doorType,
  doorsCount,
  materialColor,
  handleColor,
  doorsOpen,
  onToggleDoors
}: Furniture3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cabinetGroupRef = useRef<THREE.Group | null>(null);
  const animatedPartsRef = useRef<{
    doors: { mesh: THREE.Group; openAngle: number; isSliding?: boolean; targetX?: number; origX?: number }[];
    drawers: { mesh: THREE.Group; openZ: number }[];
  }>({ doors: [], drawers: [] });

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // Slate-900 studio background

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 50, 20000);
    cameraRef.current = camera;
    // Initial camera position relative to wardrobe size
    const maxDim = Math.max(width, height, depth);
    camera.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 2.1);
    camera.lookAt(0, height / 2, 0);

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Don't go below floor
    controls.minDistance = 200;
    controls.maxDistance = 8000;
    controls.target.set(0, height / 2, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    hemiLight.position.set(0, 3000, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1500, 3500, 2500);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 100;
    keyLight.shadow.camera.far = 10000;
    const d = 2500;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.5);
    fillLight.position.set(-2000, 2000, -1500);
    scene.add(fillLight);

    // 6. Floor grid
    const grid = new THREE.GridHelper(5000, 50, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Floor shadow receiver plane
    const floorGeo = new THREE.PlaneGeometry(8000, 8000);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // 7. Cabinet group
    const cabinetGroup = new THREE.Group();
    scene.add(cabinetGroup);
    cabinetGroupRef.current = cabinetGroup;

    // 8. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Smoothly animate opening / closing of doors and drawers
      if (animatedPartsRef.current) {
        const { doors, drawers } = animatedPartsRef.current;
        
        // Doors animation
        doors.forEach((d) => {
          if (d.isSliding) {
            const currentX = d.mesh.position.x;
            const target = doorsOpen ? (d.targetX ?? d.origX ?? 0) : (d.origX ?? 0);
            d.mesh.position.x += (target - currentX) * 0.1;
          } else {
            const currentRot = d.mesh.rotation.y;
            const targetRot = doorsOpen ? d.openAngle : 0;
            d.mesh.rotation.y += (targetRot - currentRot) * 0.1;
          }
        });

        // Drawers animation (slide forward slightly when doors open)
        drawers.forEach((drw, idx) => {
          const targetZ = doorsOpen ? Math.min(220, depth * 0.4) : 0;
          const currentZ = drw.mesh.position.z;
          drw.mesh.position.z += (targetZ - currentZ) * 0.1;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Re-build 3D Furniture Meshes when parameters change
  useEffect(() => {
    const cabinetGroup = cabinetGroupRef.current;
    if (!cabinetGroup) return;

    // Clear previous meshes
    while (cabinetGroup.children.length > 0) {
      const obj = cabinetGroup.children[0];
      cabinetGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
    }
    animatedPartsRef.current = { doors: [], drawers: [] };

    const T = thickness;
    const bodyHeight = height - socleHeight;
    const innerHeight = bodyHeight - 2 * T;
    const innerTotalWidth = width - 2 * T - (sections - 1) * T;
    const sectionWidth = innerTotalWidth / sections;

    // Materials
    const woodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialColor),
      roughness: 0.5,
      metalness: 0.05,
      wireframe: wireframe
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialColor).offsetHSL(0, 0, -0.05),
      roughness: 0.4,
      wireframe: wireframe
    });

    const backPanelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialColor).offsetHSL(0, -0.1, -0.15),
      roughness: 0.8,
      wireframe: wireframe
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(handleColor),
      metalness: 0.85,
      roughness: 0.2,
      wireframe: wireframe
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15
    });

    // Helper: Create Panel with Shadow
    const createPanel = (w: number, h: number, d: number, mat: THREE.Material = woodMat) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // Center offset coordinates
    // Bottom of cabinet is at Y = socleHeight. Cabinet stands on ground Y = 0.
    const halfW = width / 2;
    const halfD = depth / 2;

    // 1. Left Side Panel (Bogovina chap)
    const leftSide = createPanel(T, bodyHeight, depth);
    leftSide.position.set(-halfW + T / 2, socleHeight + bodyHeight / 2, 0);
    cabinetGroup.add(leftSide);

    // 2. Right Side Panel (Bogovina o'ng)
    const rightSide = createPanel(T, bodyHeight, depth);
    rightSide.position.set(halfW - T / 2, socleHeight + bodyHeight / 2, 0);
    cabinetGroup.add(rightSide);

    // 3. Top Panel (Krisha)
    const topPanel = createPanel(width - 2 * T, T, depth);
    topPanel.position.set(0, height - T / 2, 0);
    cabinetGroup.add(topPanel);

    // 4. Bottom Panel (Dno)
    const bottomPanel = createPanel(width - 2 * T, T, depth);
    bottomPanel.position.set(0, socleHeight + T / 2, 0);
    cabinetGroup.add(bottomPanel);

    // 5. Socle (Tsokol front & back)
    if (socleHeight > 0) {
      const frontSocle = createPanel(width - 2 * T, socleHeight, T, edgeMat);
      frontSocle.position.set(0, socleHeight / 2, halfD - 30);
      cabinetGroup.add(frontSocle);

      const backSocle = createPanel(width - 2 * T, socleHeight, T, edgeMat);
      backSocle.position.set(0, socleHeight / 2, -halfD + 30);
      cabinetGroup.add(backSocle);

      // Feet / Podpyatnik
      const footGeo = new THREE.CylinderGeometry(15, 18, 12, 16);
      const footMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
      const footPositions = [
        [-halfW + 50, halfD - 40],
        [halfW - 50, halfD - 40],
        [-halfW + 50, -halfD + 40],
        [halfW - 50, -halfD + 40],
      ];
      if (width >= 1600) {
        footPositions.push([0, halfD - 40], [0, -halfD + 40]);
      }
      footPositions.forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(footGeo, footMat);
        foot.position.set(fx, 6, fz);
        foot.castShadow = true;
        cabinetGroup.add(foot);
      });
    }

    // 6. Back Panel (DVP / XDF 3mm)
    const backPanel = createPanel(width, bodyHeight, 3.5, backPanelMat);
    backPanel.position.set(0, socleHeight + bodyHeight / 2, -halfD + 1.75);
    cabinetGroup.add(backPanel);

    // 7. Vertical Dividers (Peregorodkalar)
    for (let i = 0; i < sections - 1; i++) {
      const divX = -halfW + T + (i + 1) * sectionWidth + i * T + T / 2;
      const divider = createPanel(T, innerHeight, depth - 10);
      divider.position.set(divX, socleHeight + T + innerHeight / 2, 5);
      cabinetGroup.add(divider);
    }

    // 8. Sections Content: Shelves, Drawers, Hangers
    for (let secIdx = 0; secIdx < sections; secIdx++) {
      const secCenterX = -halfW + T + secIdx * (sectionWidth + T) + sectionWidth / 2;
      const shelvesCount = shelvesPerSection[secIdx] || 0;
      const shelfGap = innerHeight / (shelvesCount + 1);

      // Shelves
      for (let sIdx = 0; sIdx < shelvesCount; sIdx++) {
        const shelfY = socleHeight + T + (sIdx + 1) * shelfGap;
        const shelf = createPanel(sectionWidth - 2, T, depth - 15);
        shelf.position.set(secCenterX, shelfY, 5);
        cabinetGroup.add(shelf);
      }

      // Hanger Rod (in section 1 or custom)
      if (hasHanger && secIdx === 1) {
        const rodY = height - T - 120;
        const rodGeo = new THREE.CylinderGeometry(12, 12, sectionWidth - 8, 24);
        const rod = new THREE.Mesh(rodGeo, chromeMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(secCenterX, rodY, 0);
        rod.castShadow = true;
        cabinetGroup.add(rod);

        // Flanges
        const flangeGeo = new THREE.CylinderGeometry(20, 20, 6, 24);
        const fl1 = new THREE.Mesh(flangeGeo, chromeMat);
        fl1.rotation.z = Math.PI / 2;
        fl1.position.set(secCenterX - sectionWidth / 2 + 5, rodY, 0);
        cabinetGroup.add(fl1);

        const fl2 = new THREE.Mesh(flangeGeo, chromeMat);
        fl2.rotation.z = Math.PI / 2;
        fl2.position.set(secCenterX + sectionWidth / 2 - 5, rodY, 0);
        cabinetGroup.add(fl2);
      }

      // Drawers in Section 0
      if (drawers > 0 && secIdx === 0) {
        const drawerHeight = 160;
        for (let dIdx = 0; dIdx < drawers; dIdx++) {
          const drawerY = socleHeight + T + (dIdx * (drawerHeight + 4)) + drawerHeight / 2 + 6;
          
          // Drawer group for slide animation
          const drawerGroup = new THREE.Group();
          drawerGroup.position.set(secCenterX, drawerY, 0);

          // Drawer Facade
          const facade = createPanel(sectionWidth - 6, drawerHeight - 4, T, woodMat);
          facade.position.set(0, 0, halfD - T / 2);
          drawerGroup.add(facade);

          // Handle
          const handleGeo = new THREE.BoxGeometry(100, 10, 16);
          const handle = new THREE.Mesh(handleGeo, metalMat);
          handle.position.set(0, 0, halfD + 8);
          handle.castShadow = true;
          drawerGroup.add(handle);

          // Drawer Box (internal box visible when pulled out)
          const runnerL = depth - 80;
          const boxSidesGeo = new THREE.BoxGeometry(sectionWidth - 30, 120, runnerL);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
          const box = new THREE.Mesh(boxSidesGeo, boxMat);
          box.position.set(0, 0, halfD - T - runnerL / 2);
          drawerGroup.add(box);

          cabinetGroup.add(drawerGroup);
          animatedPartsRef.current.drawers.push({
            mesh: drawerGroup,
            openZ: Math.min(250, depth * 0.45)
          });
        }
      }
    }

    // 9. Doors (Fasad) with Open/Close Pivot Rigging
    if (doorType !== 'none' && doorsCount > 0) {
      if (doorType === 'hinged') {
        const doorW = (width - 4) / doorsCount;
        const doorH = bodyHeight - 4;

        for (let dIdx = 0; dIdx < doorsCount; dIdx++) {
          const isLeftHinged = dIdx % 2 === 0;
          
          // Pivot group placed at the hinge location
          const doorPivot = new THREE.Group();
          const hingeX = isLeftHinged 
            ? -halfW + 2 + dIdx * doorW 
            : -halfW + 2 + (dIdx + 1) * doorW;
          const doorCenterY = socleHeight + bodyHeight / 2;

          doorPivot.position.set(hingeX, doorCenterY, halfD + T / 2);

          // Door panel
          const doorMesh = createPanel(doorW - 2, doorH, T, woodMat);
          // Offset inside pivot so rotation happens about hinge
          const meshOffsetX = isLeftHinged ? (doorW - 2) / 2 : -(doorW - 2) / 2;
          doorMesh.position.set(meshOffsetX, 0, 0);
          doorPivot.add(doorMesh);

          // Door Handle
          const handleGeo = new THREE.CylinderGeometry(6, 6, 120, 16);
          const handleMesh = new THREE.Mesh(handleGeo, metalMat);
          const handleX = isLeftHinged ? (doorW - 2) - 25 : -(doorW - 2) + 25;
          handleMesh.position.set(handleX, 0, T / 2 + 10);
          handleMesh.castShadow = true;
          doorPivot.add(handleMesh);

          cabinetGroup.add(doorPivot);

          // Max open angle in radians (~105 degrees)
          const openAngle = isLeftHinged ? -Math.PI * 0.6 : Math.PI * 0.6;
          animatedPartsRef.current.doors.push({
            mesh: doorPivot,
            openAngle
          });
        }
      } else if (doorType === 'sliding') {
        // Sliding Doors (Kupé)
        const overlap = (doorsCount - 1) * 25;
        const doorW = (width + overlap) / doorsCount;
        const doorH = bodyHeight - 35;

        for (let dIdx = 0; dIdx < doorsCount; dIdx++) {
          const doorGroup = new THREE.Group();
          const trackZ = halfD - (dIdx * (T + 8));
          const origX = -halfW + doorW / 2 + dIdx * (doorW - 25);
          doorGroup.position.set(origX, socleHeight + bodyHeight / 2 - 5, trackZ);

          const doorMesh = createPanel(doorW, doorH, T, woodMat);
          doorGroup.add(doorMesh);

          // Aluminum frame styling
          const frameGeo = new THREE.BoxGeometry(10, doorH, T + 2);
          const fLeft = new THREE.Mesh(frameGeo, metalMat);
          fLeft.position.set(-doorW / 2 + 5, 0, 0);
          doorGroup.add(fLeft);

          const fRight = new THREE.Mesh(frameGeo, metalMat);
          fRight.position.set(doorW / 2 - 5, 0, 0);
          doorGroup.add(fRight);

          cabinetGroup.add(doorGroup);

          // Sliding target offset
          const slideShift = dIdx === 0 ? (doorW * 0.7) : -(doorW * 0.7);
          animatedPartsRef.current.doors.push({
            mesh: doorGroup,
            openAngle: 0,
            isSliding: true,
            origX,
            targetX: origX + slideShift
          });
        }
      }
    }

    // Update controls target center
    if (controlsRef.current) {
      controlsRef.current.target.set(0, height / 2, 0);
    }
  }, [
    height, width, depth, thickness, socleHeight, sections,
    shelvesPerSection, drawers, hasHanger, doorType, doorsCount,
    materialColor, handleColor, wireframe
  ]);

  // Camera Presets
  const setCameraView = (view: 'iso' | 'front' | 'side' | 'top') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const maxDim = Math.max(width, height, depth);
    const target = new THREE.Vector3(0, height / 2, 0);
    controls.target.copy(target);

    switch (view) {
      case 'iso':
        camera.position.set(maxDim * 1.3, maxDim * 1.0, maxDim * 2.1);
        break;
      case 'front':
        camera.position.set(0, height / 2, maxDim * 2.5);
        break;
      case 'side':
        camera.position.set(maxDim * 2.5, height / 2, 0);
        break;
      case 'top':
        camera.position.set(0, maxDim * 3.0, 50);
        break;
    }
    camera.lookAt(target);
    controls.update();
  };

  // Toggle Grid
  const toggleGrid = () => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = !showGrid;
      setShowGrid(!showGrid);
    }
  };

  // Capture Screenshot of 3D Canvas
  const captureScreenshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Moderno_3D_${width}x${height}x${depth}.png`;
    a.click();
  };

  return (
    <div className="relative w-full h-[540px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Controls Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 shadow-lg">
          <button
            onClick={() => setCameraView('iso')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="3D Izometrik ko'rinish"
          >
            3D
          </button>
          <button
            onClick={() => setCameraView('front')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Old ko'rinish"
          >
            Oldi
          </button>
          <button
            onClick={() => setCameraView('side')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Yon ko'rinish"
          >
            Yoni
          </button>
          <button
            onClick={() => setCameraView('top')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Tepa ko'rinish"
          >
            Tepasi
          </button>
        </div>

        {/* Doors Open / Close Toggle */}
        {doorType !== 'none' && (
          <button
            onClick={onToggleDoors}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg backdrop-blur-md border ${
              doorsOpen 
                ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/20' 
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {doorsOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{doorsOpen ? 'Eshik ochiq' : 'Eshik yopiq'}</span>
          </button>
        )}
      </div>

      {/* Right Top Quick Tools */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {/* Wireframe toggle */}
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`p-2 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
            wireframe 
              ? 'bg-blue-600 border-blue-400 text-white' 
              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Karkas (Wireframe) rejimi"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Grid toggle */}
        <button
          onClick={toggleGrid}
          className={`p-2 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
            showGrid 
              ? 'bg-slate-800 border-slate-600 text-blue-400' 
              : 'bg-slate-900/90 border-slate-700 text-slate-500 hover:bg-slate-800'
          }`}
          title="Pol to'ri (Grid)"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Screenshot 3D button */}
        <button
          onClick={captureScreenshot}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md"
          title="3D Rasmni yuklab olish"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Hint Banner */}
      <div className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-mono">
          <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
          Sichqoncha / barmog'ingiz bilan 360° aylantiring va masshtablang
        </span>
        <span className="font-mono text-slate-500 hidden sm:inline">
          Three.js Studio Engine • WebGL
        </span>
      </div>
    </div>
  );
}
