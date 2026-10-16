'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCw, 
  Eye, 
  EyeOff, 
  Camera, 
  Grid, 
  Layers,
  Sparkles,
  SunMedium
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
  hasLedLighting: boolean;
  doorType: 'hinged' | 'sliding' | 'none';
  doorsCount: number;
  bodyColor: string;
  facadeColor: string;
  facadeType: 'standard' | 'mirror' | 'glass' | 'mdf_frame';
  handleColor: string;
  doorsOpen: boolean;
  onToggleDoors?: () => void;
}

export const WOOD_COLORS = [
  { id: 'white', name: 'Oq Matoviy', hex: '#f8fafc', roughness: 0.35 },
  { id: 'sonoma', name: 'Dub Sonoma', hex: '#d4b38a', roughness: 0.6 },
  { id: 'anthracite', name: 'Antratsit (To‘q)', hex: '#27272a', roughness: 0.45 },
  { id: 'wenge', name: 'Venge (Klassik)', hex: '#3e2723', roughness: 0.65 },
  { id: 'walnut', name: 'Oltin Yong‘oq', hex: '#85512b', roughness: 0.55 },
  { id: 'sand', name: 'Krem / Qum', hex: '#e2d5c3', roughness: 0.4 },
  { id: 'oak_smoke', name: 'Tutunli Eman', hex: '#78716c', roughness: 0.5 },
];

export const FACADE_TYPES = [
  { id: 'standard', name: 'Standart Yog‘och (DSP)', icon: '🚪' },
  { id: 'mirror', name: 'Oyna (Zerkalo)', icon: '🪞' },
  { id: 'glass', name: 'Qoraytirilgan Shisha (Loft)', icon: '💎' },
  { id: 'mdf_frame', name: 'MDF Frezerovka (Klassika)', icon: '🖼️' },
];

export const HANDLE_COLORS = [
  { id: 'silver', name: 'Xrom / Kumush', hex: '#cbd5e1' },
  { id: 'black', name: 'Qora Mat', hex: '#18181b' },
  { id: 'gold', name: 'Oltin / Brass', hex: '#eab308' },
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
  hasLedLighting,
  doorType,
  doorsCount,
  bodyColor,
  facadeColor,
  facadeType,
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
    const h = container.clientHeight || 520;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16); // Deep space slate CAD studio

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 50, 25000);
    cameraRef.current = camera;
    const maxDim = Math.max(width, height, depth);
    camera.position.set(maxDim * 1.35, maxDim * 1.05, maxDim * 2.2);
    camera.lookAt(0, height / 2, 0);

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 300;
    controls.maxDistance = 9000;
    controls.target.set(0, height / 2, 0);

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
    hemiLight.position.set(0, 4000, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(1800, 4000, 2800);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 100;
    keyLight.shadow.camera.far = 12000;
    const d = 3000;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    fillLight.position.set(-2500, 2500, -1800);
    scene.add(fillLight);

    const backRimLight = new THREE.DirectionalLight(0xffedd5, 0.4);
    backRimLight.position.set(0, 1500, -2500);
    scene.add(backRimLight);

    // 6. Floor Grid & Shadow receiver
    const grid = new THREE.GridHelper(6000, 60, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);
    gridHelperRef.current = grid;

    const floorGeo = new THREE.PlaneGeometry(10000, 10000);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.4 });
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

      if (animatedPartsRef.current) {
        const { doors, drawers: animatedDrawers } = animatedPartsRef.current;
        
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

        animatedDrawers.forEach((drw) => {
          const targetZ = doorsOpen ? Math.min(230, depth * 0.45) : 0;
          const currentZ = drw.mesh.position.z;
          drw.mesh.position.z += (targetZ - currentZ) * 0.1;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

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

    // Clear previous objects
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
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyColor),
      roughness: 0.55,
      metalness: 0.05,
      wireframe: wireframe
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyColor).offsetHSL(0, 0, -0.06),
      roughness: 0.45,
      wireframe: wireframe
    });

    const backPanelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyColor).offsetHSL(0, -0.1, -0.18),
      roughness: 0.8,
      wireframe: wireframe
    });

    // Facade Material according to facadeType
    let facadeMat: THREE.Material;
    if (facadeType === 'mirror') {
      facadeMat = new THREE.MeshStandardMaterial({
        color: 0xecf0f1,
        metalness: 0.95,
        roughness: 0.05,
        wireframe: wireframe
      });
    } else if (facadeType === 'glass') {
      facadeMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.4,
        roughness: 0.1,
        transparent: true,
        opacity: 0.65,
        wireframe: wireframe
      });
    } else {
      facadeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(facadeColor),
        roughness: 0.5,
        metalness: 0.05,
        wireframe: wireframe
      });
    }

    const metalHandleMat = new THREE.MeshStandardMaterial({
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

    // Helper: Create Panel with shadow
    const createPanel = (w: number, h: number, d: number, mat: THREE.Material = bodyMat) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

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

    // 5. Socle (Tsokol)
    if (socleHeight > 0) {
      const frontSocle = createPanel(width - 2 * T, socleHeight, T, edgeMat);
      frontSocle.position.set(0, socleHeight / 2, halfD - 30);
      cabinetGroup.add(frontSocle);

      const backSocle = createPanel(width - 2 * T, socleHeight, T, edgeMat);
      backSocle.position.set(0, socleHeight / 2, -halfD + 30);
      cabinetGroup.add(backSocle);

      // Feet (Podpyatnik)
      const footGeo = new THREE.CylinderGeometry(16, 18, 12, 16);
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

    // 8. Sections Content: Shelves, Drawers, Hangers, LED strips
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

        // LED Strip under shelf (if enabled)
        if (hasLedLighting) {
          const ledGeo = new THREE.BoxGeometry(sectionWidth - 10, 3, 8);
          const ledMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
          const ledMesh = new THREE.Mesh(ledGeo, ledMat);
          ledMesh.position.set(secCenterX, shelfY - T / 2 - 1.5, 30);
          cabinetGroup.add(ledMesh);

          // Soft light emission
          const pointLight = new THREE.PointLight(0xffedd5, 0.4, 450);
          pointLight.position.set(secCenterX, shelfY - T / 2 - 15, 30);
          cabinetGroup.add(pointLight);
        }
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
          
          const drawerGroup = new THREE.Group();
          drawerGroup.position.set(secCenterX, drawerY, 0);

          // Drawer Facade (using facadeMat)
          const facade = createPanel(sectionWidth - 6, drawerHeight - 4, T, facadeMat);
          facade.position.set(0, 0, halfD - T / 2);
          drawerGroup.add(facade);

          // Handle
          const handleGeo = new THREE.BoxGeometry(100, 10, 16);
          const handle = new THREE.Mesh(handleGeo, metalHandleMat);
          handle.position.set(0, 0, halfD + 8);
          handle.castShadow = true;
          drawerGroup.add(handle);

          // Drawer Box (internal white box)
          const runnerL = depth - 80;
          const boxSidesGeo = new THREE.BoxGeometry(sectionWidth - 30, 120, runnerL);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
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

    // 9. Doors (Fasad) with Open/Close Pivot Rigging & Styles
    if (doorType !== 'none' && doorsCount > 0) {
      if (doorType === 'hinged') {
        const doorW = (width - 4) / doorsCount;
        const doorH = bodyHeight - 4;

        for (let dIdx = 0; dIdx < doorsCount; dIdx++) {
          const isLeftHinged = dIdx % 2 === 0;
          const doorPivot = new THREE.Group();
          const hingeX = isLeftHinged 
            ? -halfW + 2 + dIdx * doorW 
            : -halfW + 2 + (dIdx + 1) * doorW;
          const doorCenterY = socleHeight + bodyHeight / 2;

          doorPivot.position.set(hingeX, doorCenterY, halfD + T / 2);

          // Door Panel
          const doorMesh = createPanel(doorW - 2, doorH, T, facadeMat);
          const meshOffsetX = isLeftHinged ? (doorW - 2) / 2 : -(doorW - 2) / 2;
          doorMesh.position.set(meshOffsetX, 0, 0);
          doorPivot.add(doorMesh);

          // Classical MDF Frame styling (if mdf_frame)
          if (facadeType === 'mdf_frame') {
            const frameThickness = 50;
            const grooveGeo = new THREE.BoxGeometry(doorW - 2 - frameThickness * 2, doorH - frameThickness * 2, 4);
            const grooveMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(facadeColor).offsetHSL(0, 0, -0.07),
              roughness: 0.6
            });
            const grooveMesh = new THREE.Mesh(grooveGeo, grooveMat);
            grooveMesh.position.set(meshOffsetX, 0, T / 2 + 1);
            doorPivot.add(grooveMesh);
          }

          // Glass frame border (if glass)
          if (facadeType === 'glass') {
            const frameGeo = new THREE.BoxGeometry(doorW - 2, doorH, 4);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
            const glassBorder = new THREE.Mesh(frameGeo, frameMat);
            glassBorder.position.set(meshOffsetX, 0, 0);
            doorPivot.add(glassBorder);
          }

          // Door Handle
          const handleGeo = new THREE.CylinderGeometry(6, 6, 120, 16);
          const handleMesh = new THREE.Mesh(handleGeo, metalHandleMat);
          const handleX = isLeftHinged ? (doorW - 2) - 25 : -(doorW - 2) + 25;
          handleMesh.position.set(handleX, 0, T / 2 + 10);
          handleMesh.castShadow = true;
          doorPivot.add(handleMesh);

          cabinetGroup.add(doorPivot);

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

          const doorMesh = createPanel(doorW, doorH, T, facadeMat);
          doorGroup.add(doorMesh);

          // Aluminum Frame Profile
          const frameGeo = new THREE.BoxGeometry(10, doorH, T + 2);
          const fLeft = new THREE.Mesh(frameGeo, metalHandleMat);
          fLeft.position.set(-doorW / 2 + 5, 0, 0);
          doorGroup.add(fLeft);

          const fRight = new THREE.Mesh(frameGeo, metalHandleMat);
          fRight.position.set(doorW / 2 - 5, 0, 0);
          doorGroup.add(fRight);

          cabinetGroup.add(doorGroup);

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

    if (controlsRef.current) {
      controlsRef.current.target.set(0, height / 2, 0);
    }
  }, [
    height, width, depth, thickness, socleHeight, sections,
    shelvesPerSection, drawers, hasHanger, hasLedLighting, doorType, doorsCount,
    bodyColor, facadeColor, facadeType, handleColor, wireframe
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
        camera.position.set(maxDim * 1.35, maxDim * 1.05, maxDim * 2.2);
        break;
      case 'front':
        camera.position.set(0, height / 2, maxDim * 2.6);
        break;
      case 'side':
        camera.position.set(maxDim * 2.6, height / 2, 0);
        break;
      case 'top':
        camera.position.set(0, maxDim * 3.2, 50);
        break;
    }
    camera.lookAt(target);
    controls.update();
  };

  const toggleGrid = () => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = !showGrid;
      setShowGrid(!showGrid);
    }
  };

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
      <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Camera Views & Door Action Bar */}
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

      {/* Quick Tools on Right */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
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

        <button
          onClick={captureScreenshot}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md"
          title="3D Rasmni yuklab olish"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-mono">
          <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
          Sichqoncha yoki barmog'ingiz bilan 360° erkin aylantiring va masshtablang
        </span>
        <span className="font-mono text-slate-500 hidden sm:inline">
          Three.js Studio Engine • WebGL
        </span>
      </div>
    </div>
  );
}
