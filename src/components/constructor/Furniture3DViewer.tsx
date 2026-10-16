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
  Sliders, 
  MousePointerClick,
  Wrench,
  Plus,
  Minus,
  Move,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

export interface SectionData {
  id: string;
  width: number;
  shelvesCount: number;
  drawersCount: number;
  hasHanger: boolean;
  hangerType?: 'single' | 'double';
}

export interface Furniture3DProps {
  height: number;
  width: number;
  depth: number;
  thickness: number;
  socleHeight: number;
  sectionsData: SectionData[];
  hasLedLighting: boolean;
  doorType: 'hinged' | 'sliding' | 'none';
  doorsCount: number;
  bodyColor: string;
  facadeColor: string;
  facadeType: 'standard' | 'mirror' | 'glass' | 'mdf_frame';
  handleColor: string;
  doorsOpenPercent: number; // 0 to 100
  onDoorsOpenPercentChange?: (percent: number) => void;
  // Category-specific enhancements
  hasCountertop?: boolean;
  countertopThickness?: number;
  countertopColor?: string;
  hasSink?: boolean;
  hasAntresol?: boolean;
  isFloating?: boolean;
  // 3D Edit Mode direct manipulation callbacks
  onUpdateSectionProp?: (sectionIndex: number, field: 'shelvesCount' | 'drawersCount', delta: number) => void;
  onSectionWidthChange?: (index: number, newW: number) => void;
  onMoveSection?: (fromIdx: number, direction: 'left' | 'right') => void;
}

// 24+ Expanded Rich Materials & Colors Palette
export const WOOD_COLORS = [
  // 1. Eman va Yog'och (Oak & Natural Wood)
  { id: 'sonoma', name: 'Dub Sonoma', hex: '#d4b38a', roughness: 0.6, group: 'Yog‘och' },
  { id: 'kraft_gold', name: 'Dub Kraft Oltin', hex: '#c29b68', roughness: 0.58, group: 'Yog‘och' },
  { id: 'shamonix', name: 'Dub Shamoniks', hex: '#8f7762', roughness: 0.62, group: 'Yog‘och' },
  { id: 'bleached_oak', name: 'Oqartirilgan Dub', hex: '#e5ded3', roughness: 0.55, group: 'Yog‘och' },
  { id: 'wenge', name: 'Venge Magiya (To‘q)', hex: '#3e2723', roughness: 0.65, group: 'Yog‘och' },
  { id: 'walnut_classic', name: 'Klassik Yong‘oq (Orex)', hex: '#7d4f27', roughness: 0.55, group: 'Yog‘och' },
  { id: 'walnut_gold', name: 'Oltin Yong‘oq', hex: '#85512b', roughness: 0.55, group: 'Yog‘och' },
  { id: 'oak_smoke', name: 'Tutunli Eman (Loft)', hex: '#78716c', roughness: 0.5, group: 'Yog‘och' },
  { id: 'pine_nordic', name: 'Nordik Sosna', hex: '#eedaa2', roughness: 0.6, group: 'Yog‘och' },
  { id: 'beech', name: 'Bavariya Buki', hex: '#d9a566', roughness: 0.58, group: 'Yog‘och' },

  // 2. Monoxrom va Zamonaviy Mat (Matte & Solid)
  { id: 'white_matte', name: 'Oq Matoviy (Soft)', hex: '#f8fafc', roughness: 0.35, group: 'Monoxrom' },
  { id: 'white_gloss', name: 'Oq Yaltiroq (Gloss)', hex: '#ffffff', roughness: 0.15, group: 'Monoxrom' },
  { id: 'light_grey', name: 'Ochiq Kulrang (Silver)', hex: '#cbd5e1', roughness: 0.4, group: 'Monoxrom' },
  { id: 'anthracite', name: 'Antratsit To‘q Mat', hex: '#27272a', roughness: 0.45, group: 'Monoxrom' },
  { id: 'graphite', name: 'Qora Grafit', hex: '#18181b', roughness: 0.4, group: 'Monoxrom' },
  { id: 'sand', name: 'Krem / Qum (Bej)', hex: '#e2d5c3', roughness: 0.4, group: 'Monoxrom' },
  { id: 'cashmere', name: 'Kashmir (Ivory)', hex: '#d8cfc4', roughness: 0.38, group: 'Monoxrom' },
  { id: 'olive_sage', name: 'Zaytun Yashil (Sage)', hex: '#556b2f', roughness: 0.45, group: 'Monoxrom' },
  { id: 'navy_blue', name: 'Chuqur Moviy (Navy)', hex: '#1e3a5f', roughness: 0.45, group: 'Monoxrom' },
  { id: 'terracotta', name: 'Terrakota Qizil', hex: '#a45a52', roughness: 0.45, group: 'Monoxrom' },

  // 3. Tosh, Marmar va Beton (Stone, Marble & Loft)
  { id: 'marble_carrara', name: 'Oq Karrara Marmar', hex: '#eceef1', roughness: 0.25, group: 'Tosh/Marmar' },
  { id: 'marble_marquina', name: 'Qora Marquina Marmar', hex: '#1e2124', roughness: 0.25, group: 'Tosh/Marmar' },
  { id: 'concrete_loft', name: 'Loft Beton Kulrang', hex: '#94a3b8', roughness: 0.7, group: 'Tosh/Marmar' },
  { id: 'granite_dark', name: 'To‘q Qora Granit', hex: '#334155', roughness: 0.3, group: 'Tosh/Marmar' },
];

export const FACADE_TYPES = [
  { id: 'standard', name: 'Standart DSP', icon: '🚪' },
  { id: 'mirror', name: 'Oyna (Zerkalo)', icon: '🪞' },
  { id: 'glass', name: 'Qoraytirilgan Shisha', icon: '💎' },
  { id: 'mdf_frame', name: 'MDF Frezerovka', icon: '🖼️' },
];

export const HANDLE_COLORS = [
  { id: 'black', name: 'Qora Mat (Loft)', hex: '#18181b' },
  { id: 'silver', name: 'Xrom / Kumush', hex: '#cbd5e1' },
  { id: 'gold', name: 'Oltin / Brass', hex: '#eab308' },
  { id: 'titanium', name: 'Titan / Grafit', hex: '#475569' },
  { id: 'rose_gold', name: 'Rose Gold / Bronza', hex: '#b76e79' },
  { id: 'gola', name: 'Yashirin Gola Profil', hex: '#0f172a' },
];

export default function Furniture3DViewer({
  height,
  width,
  depth,
  thickness,
  socleHeight,
  sectionsData,
  hasLedLighting,
  doorType,
  doorsCount,
  bodyColor,
  facadeColor,
  facadeType,
  handleColor,
  doorsOpenPercent,
  onDoorsOpenPercentChange,
  hasCountertop = false,
  countertopThickness = 38,
  countertopColor = '#eceef1',
  hasSink = false,
  hasAntresol = false,
  isFloating = false,
  onUpdateSectionProp,
  onSectionWidthChange,
  onMoveSection
}: Furniture3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cabinetGroupRef = useRef<THREE.Group | null>(null);

  // Sync doorsOpenPercent via ref for animation frame loop
  const doorsOpenPercentRef = useRef<number>(doorsOpenPercent);
  doorsOpenPercentRef.current = doorsOpenPercent;

  // 3D Edit Mode State & Ref
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const isEditModeRef = useRef<boolean>(false);
  isEditModeRef.current = isEditMode;

  const [selectedPart, setSelectedPart] = useState<{
    type: 'shelf' | 'drawer' | 'section';
    id: string;
    sectionIndex: number;
    shelfIndex?: number;
    drawerIndex?: number;
    sectionWidth?: number;
    mesh?: THREE.Object3D;
  } | null>(null);

  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);

  // Interactive Click Raycasting & Animation items
  const interactableMeshesRef = useRef<THREE.Object3D[]>([]);
  const animatedPartsRef = useRef<{
    doors: { 
      id: string;
      mesh: THREE.Group; 
      openAngle: number; 
      isSliding?: boolean; 
      targetX?: number; 
      origX?: number;
      targetFraction: number;
    }[];
    drawers: { 
      id: string;
      mesh: THREE.Group; 
      openZ: number;
      targetFraction: number;
    }[];
  }>({ doors: [], drawers: [] });

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [interactHint, setInteractHint] = useState<boolean>(true);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Sync open state when doorsOpenPercent prop changes
  useEffect(() => {
    const fraction = doorsOpenPercent / 100;
    if (animatedPartsRef.current) {
      animatedPartsRef.current.doors.forEach(d => { d.targetFraction = fraction; });
      animatedPartsRef.current.drawers.forEach(dr => { dr.targetFraction = fraction; });
    }
  }, [doorsOpenPercent]);

  // Manage 3D Selection Bounding Box Highlight
  useEffect(() => {
    if (boxHelperRef.current && sceneRef.current) {
      sceneRef.current.remove(boxHelperRef.current);
      boxHelperRef.current.geometry.dispose();
      boxHelperRef.current = null;
    }

    if (selectedPart?.mesh && sceneRef.current) {
      const helper = new THREE.BoxHelper(selectedPart.mesh, 0xf59e0b); // amber highlight box
      sceneRef.current.add(helper);
      boxHelperRef.current = helper;
    }
  }, [selectedPart]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 540;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 50, 30000);
    cameraRef.current = camera;
    const maxDim = Math.max(width, height, depth);
    camera.position.set(maxDim * 1.35, maxDim * 1.05, maxDim * 2.2);
    camera.lookAt(0, height / 2, 0);

    // 3. Renderer
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
    controls.maxDistance = 10000;
    controls.target.set(0, height / 2, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
    hemiLight.position.set(0, 4500, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(2000, 4200, 3000);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 100;
    keyLight.shadow.camera.far = 14000;
    const d = 3200;
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

    // 8. Raycasting for Click-To-Open Doors and Drawers & 3D Direct Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dist = Math.hypot(event.clientX - downX, event.clientY - downY);
      if (dist > 8) return; // User dragged camera

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableMeshesRef.current, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.interactiveType && hitObj.parent) {
          hitObj = hitObj.parent;
        }

        if (hitObj && hitObj.userData && hitObj.userData.interactiveType) {
          const type = hitObj.userData.interactiveType;
          const id = hitObj.userData.id;

          if (isEditModeRef.current) {
            // EDIT MODE: select part for moving, resizing, or adding/removing
            setSelectedPart({
              type: type as any,
              id,
              sectionIndex: hitObj.userData.sectionIndex ?? 0,
              shelfIndex: hitObj.userData.shelfIndex,
              drawerIndex: hitObj.userData.drawerIndex,
              sectionWidth: hitObj.userData.sectionWidth,
              mesh: hitObj
            });
            return;
          }

          // VIEW MODE: Toggle door or drawer open state
          if (type === 'door') {
            const doorObj = animatedPartsRef.current.doors.find(d => d.id === id);
            if (doorObj) {
              doorObj.targetFraction = doorObj.targetFraction > 0.3 ? 0 : 1;
            }
          } else if (type === 'drawer') {
            const drawerObj = animatedPartsRef.current.drawers.find(dr => dr.id === id);
            if (drawerObj) {
              drawerObj.targetFraction = drawerObj.targetFraction > 0.3 ? 0 : 1;
            }
          }
        }
      } else {
        if (isEditModeRef.current) {
          setSelectedPart(null);
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableMeshesRef.current, true);
      if (intersects.length > 0) {
        renderer.domElement.style.cursor = isEditModeRef.current ? 'crosshair' : 'pointer';
      } else {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    // 9. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Smoothly interpolate doors and drawers to targetFraction
      if (animatedPartsRef.current) {
        const { doors, drawers } = animatedPartsRef.current;

        // Doors
        doors.forEach((d) => {
          if (d.isSliding) {
            const currentX = d.mesh.position.x;
            const targetX = (d.origX ?? 0) + ((d.targetX ?? 0) - (d.origX ?? 0)) * d.targetFraction;
            d.mesh.position.x += (targetX - currentX) * 0.15;
          } else {
            const currentRot = d.mesh.rotation.y;
            const targetRot = d.openAngle * d.targetFraction;
            d.mesh.rotation.y += (targetRot - currentRot) * 0.15;
          }
        });

        // Drawers
        drawers.forEach((drw) => {
          const targetZ = drw.openZ * drw.targetFraction;
          const currentZ = drw.mesh.position.z;
          drw.mesh.position.z += (targetZ - currentZ) * 0.15;
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
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild 3D Meshes when dimensions or structure change
  useEffect(() => {
    const cabinetGroup = cabinetGroupRef.current;
    if (!cabinetGroup) return;

    while (cabinetGroup.children.length > 0) {
      const obj = cabinetGroup.children[0];
      cabinetGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
    }
    interactableMeshesRef.current = [];
    animatedPartsRef.current = { doors: [], drawers: [] };

    // Dispose old selection box if any
    if (boxHelperRef.current && sceneRef.current) {
      sceneRef.current.remove(boxHelperRef.current);
      boxHelperRef.current.geometry.dispose();
      boxHelperRef.current = null;
    }

    const T = thickness;
    const bodyHeight = height - socleHeight;
    const innerHeight = bodyHeight - 2 * T;
    const sectionsCount = sectionsData.length;

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

    const createPanel = (w: number, h: number, d: number, mat: THREE.Material = bodyMat) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const halfW = width / 2;
    const halfD = depth / 2;

    // 1. Left and Right Sides
    const leftSide = createPanel(T, bodyHeight, depth);
    leftSide.position.set(-halfW + T / 2, socleHeight + bodyHeight / 2, 0);
    cabinetGroup.add(leftSide);

    const rightSide = createPanel(T, bodyHeight, depth);
    rightSide.position.set(halfW - T / 2, socleHeight + bodyHeight / 2, 0);
    cabinetGroup.add(rightSide);

    // 2. Top & Bottom Panels
    const topPanel = createPanel(width - 2 * T, T, depth);
    topPanel.position.set(0, height - T / 2, 0);
    cabinetGroup.add(topPanel);

    const bottomPanel = createPanel(width - 2 * T, T, depth);
    bottomPanel.position.set(0, socleHeight + T / 2, 0);
    cabinetGroup.add(bottomPanel);

    // 3. Socle (Plinth) or Floating Wall Mounts
    if (socleHeight > 0) {
      const frontSocle = createPanel(width - 2 * T, socleHeight, T, edgeMat);
      frontSocle.position.set(0, socleHeight / 2, halfD - 30);
      cabinetGroup.add(frontSocle);

      const backSocle = createPanel(width - 2 * T, socleHeight, T, edgeMat);
      backSocle.position.set(0, socleHeight / 2, -halfD + 30);
      cabinetGroup.add(backSocle);

      // Feet (omit if floating)
      if (!isFloating) {
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
    }

    // Floating wall mount brackets
    if (isFloating) {
      const bracketGeo = new THREE.BoxGeometry(40, 60, 100);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const b1 = new THREE.Mesh(bracketGeo, bracketMat);
      b1.position.set(-halfW + 150, Math.max(10, socleHeight) - 10, -halfD + 50);
      cabinetGroup.add(b1);
      const b2 = new THREE.Mesh(bracketGeo, bracketMat);
      b2.position.set(halfW - 150, Math.max(10, socleHeight) - 10, -halfD + 50);
      cabinetGroup.add(b2);
    }

    // 4. Back Panel
    const backPanel = createPanel(width, bodyHeight, 3.5, backPanelMat);
    backPanel.position.set(0, socleHeight + bodyHeight / 2, -halfD + 1.75);
    cabinetGroup.add(backPanel);

    // 5. Sections Content and Dividers
    let currentX = -halfW + T;

    sectionsData.forEach((sec, idx) => {
      const secW = sec.width;
      const secCenterX = currentX + secW / 2;

      // Divider on the right of this section (if not last)
      if (idx < sectionsCount - 1) {
        const divX = currentX + secW + T / 2;
        const divider = createPanel(T, innerHeight, depth - 10);
        divider.position.set(divX, socleHeight + T + innerHeight / 2, 5);
        divider.userData = { 
          interactiveType: 'section', 
          sectionIndex: idx, 
          id: `section_${idx}`,
          sectionWidth: secW
        };
        cabinetGroup.add(divider);
        interactableMeshesRef.current.push(divider);
      }

      // Drawers in this section
      const drawersCount = sec.drawersCount || 0;
      const drawerHeight = 160;
      const drawersTotalH = drawersCount * (drawerHeight + 4);

      if (drawersCount > 0) {
        for (let dIdx = 0; dIdx < drawersCount; dIdx++) {
          const drawerY = socleHeight + T + (dIdx * (drawerHeight + 4)) + drawerHeight / 2 + 4;
          const drawerGroup = new THREE.Group();
          drawerGroup.position.set(secCenterX, drawerY, 0);

          const drawerId = `drawer_${sec.id}_${dIdx}`;
          drawerGroup.userData = { 
            interactiveType: 'drawer', 
            id: drawerId, 
            sectionIndex: idx, 
            drawerIndex: dIdx,
            sectionWidth: secW
          };

          // Facade
          const facade = createPanel(secW - 6, drawerHeight - 4, T, facadeMat);
          facade.position.set(0, 0, halfD - T / 2);
          drawerGroup.add(facade);

          // Handle
          const handleGeo = new THREE.BoxGeometry(100, 10, 16);
          const handle = new THREE.Mesh(handleGeo, metalHandleMat);
          handle.position.set(0, 0, halfD + 8);
          handle.castShadow = true;
          drawerGroup.add(handle);

          // Internal Drawer Box
          const runnerL = depth - 80;
          const boxSidesGeo = new THREE.BoxGeometry(secW - 30, 120, runnerL);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
          const box = new THREE.Mesh(boxSidesGeo, boxMat);
          box.position.set(0, 0, halfD - T - runnerL / 2);
          drawerGroup.add(box);

          cabinetGroup.add(drawerGroup);
          interactableMeshesRef.current.push(drawerGroup);

          animatedPartsRef.current.drawers.push({
            id: drawerId,
            mesh: drawerGroup,
            openZ: Math.min(250, depth * 0.45),
            targetFraction: doorsOpenPercentRef.current / 100
          });
        }
      }

      // Shelves in this section (above drawers if any)
      const shelvesCount = sec.shelvesCount || 0;
      const availableH = innerHeight - drawersTotalH;
      const shelfGap = availableH / (shelvesCount + 1);

      for (let sIdx = 0; sIdx < shelvesCount; sIdx++) {
        const shelfY = socleHeight + T + drawersTotalH + (sIdx + 1) * shelfGap;
        const shelf = createPanel(secW - 2, T, depth - 15);
        shelf.position.set(secCenterX, shelfY, 5);
        shelf.userData = { 
          interactiveType: 'shelf', 
          sectionIndex: idx, 
          shelfIndex: sIdx, 
          id: `shelf_${sec.id}_${sIdx}`,
          sectionWidth: secW
        };
        cabinetGroup.add(shelf);
        interactableMeshesRef.current.push(shelf);

        // LED Lighting under shelves
        if (hasLedLighting) {
          const ledGeo = new THREE.BoxGeometry(secW - 10, 3, 8);
          const ledMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
          const ledMesh = new THREE.Mesh(ledGeo, ledMat);
          ledMesh.position.set(secCenterX, shelfY - T / 2 - 1.5, 30);
          cabinetGroup.add(ledMesh);

          const pointLight = new THREE.PointLight(0xffedd5, 0.4, 450);
          pointLight.position.set(secCenterX, shelfY - T / 2 - 15, 30);
          cabinetGroup.add(pointLight);
        }
      }

      // Hanger Rod (Truba)
      if (sec.hasHanger) {
        const rodY = height - T - 120;
        const rodGeo = new THREE.CylinderGeometry(12, 12, secW - 8, 24);
        const rod = new THREE.Mesh(rodGeo, chromeMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(secCenterX, rodY, 0);
        rod.castShadow = true;
        cabinetGroup.add(rod);

        // Flanges
        const flangeGeo = new THREE.CylinderGeometry(20, 20, 6, 24);
        const fl1 = new THREE.Mesh(flangeGeo, chromeMat);
        fl1.rotation.z = Math.PI / 2;
        fl1.position.set(secCenterX - secW / 2 + 5, rodY, 0);
        cabinetGroup.add(fl1);

        const fl2 = new THREE.Mesh(flangeGeo, chromeMat);
        fl2.rotation.z = Math.PI / 2;
        fl2.position.set(secCenterX + secW / 2 - 5, rodY, 0);
        cabinetGroup.add(fl2);

        // Double hanger (if selected)
        if (sec.hangerType === 'double') {
          const lowerRodY = height - T - 1050;
          const rod2 = new THREE.Mesh(rodGeo, chromeMat);
          rod2.rotation.z = Math.PI / 2;
          rod2.position.set(secCenterX, lowerRodY, 0);
          cabinetGroup.add(rod2);
        }
      }

      currentX += secW + T;
    });

    // 6. Doors (Fasad) with Click-to-Open & Pivot Rigging
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
          const doorId = `door_hinged_${dIdx}`;
          doorPivot.userData = { interactiveType: 'door', id: doorId };

          // Door Panel
          const doorMesh = createPanel(doorW - 2, doorH, T, facadeMat);
          const meshOffsetX = isLeftHinged ? (doorW - 2) / 2 : -(doorW - 2) / 2;
          doorMesh.position.set(meshOffsetX, 0, 0);
          doorPivot.add(doorMesh);

          // MDF frame
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

          // Glass frame
          if (facadeType === 'glass') {
            const frameGeo = new THREE.BoxGeometry(doorW - 2, doorH, 4);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
            const glassBorder = new THREE.Mesh(frameGeo, frameMat);
            glassBorder.position.set(meshOffsetX, 0, 0);
            doorPivot.add(glassBorder);
          }

          // Handle
          const handleGeo = new THREE.CylinderGeometry(6, 6, 120, 16);
          const handleMesh = new THREE.Mesh(handleGeo, metalHandleMat);
          const handleX = isLeftHinged ? (doorW - 2) - 25 : -(doorW - 2) + 25;
          handleMesh.position.set(handleX, 0, T / 2 + 10);
          handleMesh.castShadow = true;
          doorPivot.add(handleMesh);

          cabinetGroup.add(doorPivot);
          interactableMeshesRef.current.push(doorPivot);

          const openAngle = isLeftHinged ? -Math.PI * 0.6 : Math.PI * 0.6;
          animatedPartsRef.current.doors.push({
            id: doorId,
            mesh: doorPivot,
            openAngle,
            targetFraction: doorsOpenPercentRef.current / 100
          });
        }
      } else if (doorType === 'sliding') {
        const overlap = (doorsCount - 1) * 25;
        const doorW = (width + overlap) / doorsCount;
        const doorH = bodyHeight - 35;

        for (let dIdx = 0; dIdx < doorsCount; dIdx++) {
          const doorGroup = new THREE.Group();
          const trackZ = halfD - (dIdx * (T + 8));
          const origX = -halfW + doorW / 2 + dIdx * (doorW - 25);
          doorGroup.position.set(origX, socleHeight + bodyHeight / 2 - 5, trackZ);

          const doorId = `door_sliding_${dIdx}`;
          doorGroup.userData = { interactiveType: 'door', id: doorId };

          const doorMesh = createPanel(doorW, doorH, T, facadeMat);
          doorGroup.add(doorMesh);

          const frameGeo = new THREE.BoxGeometry(10, doorH, T + 2);
          const fLeft = new THREE.Mesh(frameGeo, metalHandleMat);
          fLeft.position.set(-doorW / 2 + 5, 0, 0);
          doorGroup.add(fLeft);

          const fRight = new THREE.Mesh(frameGeo, metalHandleMat);
          fRight.position.set(doorW / 2 - 5, 0, 0);
          doorGroup.add(fRight);

          cabinetGroup.add(doorGroup);
          interactableMeshesRef.current.push(doorGroup);

          const slideShift = dIdx === 0 ? (doorW * 0.75) : -(doorW * 0.75);
          animatedPartsRef.current.doors.push({
            id: doorId,
            mesh: doorGroup,
            openAngle: 0,
            isSliding: true,
            origX,
            targetX: origX + slideShift,
            targetFraction: doorsOpenPercentRef.current / 100
          });
        }
      }
    }

    // 7. Countertop (Stoleshnitsa) & Sink for Kitchen / Desks
    if (hasCountertop) {
      const ctThick = countertopThickness || 38;
      const ctW = width + 30; // 15mm overhang each side
      const ctD = depth + 35; // 30mm overhang front, 5mm back
      const ctMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(countertopColor || '#eceef1'),
        roughness: 0.3,
        metalness: 0.1,
        wireframe: wireframe
      });
      const countertop = createPanel(ctW, ctThick, ctD, ctMat);
      countertop.position.set(0, height + ctThick / 2, 12.5);
      cabinetGroup.add(countertop);

      // Sink and Faucet Tap Cutout
      if (hasSink) {
        const sinkW = Math.min(480, width * 0.55);
        const sinkD = Math.min(400, depth * 0.65);
        const sinkMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.85,
          roughness: 0.2
        });
        const sinkX = width > 1000 ? -width / 4 : 0;

        // Sink outer lip rim
        const sinkRimGeo = new THREE.BoxGeometry(sinkW, 6, sinkD);
        const sinkRim = new THREE.Mesh(sinkRimGeo, sinkMat);
        sinkRim.position.set(sinkX, height + ctThick + 3, 10);
        cabinetGroup.add(sinkRim);

        // Sink recessed basin
        const basinGeo = new THREE.BoxGeometry(sinkW - 50, 4, sinkD - 50);
        const basinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.set(sinkX, height + ctThick + 5, 10);
        cabinetGroup.add(basin);

        // Chrome Faucet / Mixer Tap
        const faucetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });
        const stemGeo = new THREE.CylinderGeometry(10, 12, 150, 20);
        const stem = new THREE.Mesh(stemGeo, faucetMat);
        stem.position.set(sinkX, height + ctThick + 75, -sinkD / 2 + 35);
        cabinetGroup.add(stem);

        const spoutGeo = new THREE.BoxGeometry(14, 14, 85);
        const spout = new THREE.Mesh(spoutGeo, faucetMat);
        spout.position.set(sinkX, height + ctThick + 150, -sinkD / 2 + 75);
        cabinetGroup.add(spout);

        const nozzleGeo = new THREE.CylinderGeometry(8, 8, 25, 16);
        const nozzle = new THREE.Mesh(nozzleGeo, faucetMat);
        nozzle.position.set(sinkX, height + ctThick + 138, -sinkD / 2 + 115);
        cabinetGroup.add(nozzle);
      }
    }

    // 8. Antresol (Mezzanine Top Tier for Wardrobes)
    if (hasAntresol) {
      const antresolH = 400;
      const antY = height + (hasCountertop ? (countertopThickness || 38) : 0) + antresolH / 2;
      const antresolGroup = new THREE.Group();
      antresolGroup.position.set(0, antY, 0);

      // Sides & Top
      const aLeft = createPanel(T, antresolH, depth, bodyMat);
      aLeft.position.set(-halfW + T / 2, 0, 0);
      antresolGroup.add(aLeft);

      const aRight = createPanel(T, antresolH, depth, bodyMat);
      aRight.position.set(halfW - T / 2, 0, 0);
      antresolGroup.add(aRight);

      const aTop = createPanel(width - 2 * T, T, depth, bodyMat);
      aTop.position.set(0, antresolH / 2 - T / 2, 0);
      antresolGroup.add(aTop);

      const aBack = createPanel(width, antresolH, 3.5, backPanelMat);
      aBack.position.set(0, 0, -halfD + 1.75);
      antresolGroup.add(aBack);

      // Antresol Doors
      const aDoorsCount = Math.max(1, doorsCount || 2);
      const aDoorW = (width - 4) / aDoorsCount;
      for (let ad = 0; ad < aDoorsCount; ad++) {
        const isLeft = ad % 2 === 0;
        const aDoor = createPanel(aDoorW - 2, antresolH - 4, T, facadeMat);
        const adX = -halfW + 2 + ad * aDoorW + (aDoorW - 2) / 2;
        aDoor.position.set(adX, 0, halfD + T / 2);
        antresolGroup.add(aDoor);

        // Handle
        const aHandleGeo = new THREE.CylinderGeometry(5, 5, 80, 16);
        const aHandle = new THREE.Mesh(aHandleGeo, metalHandleMat);
        const ahX = isLeft ? adX + (aDoorW / 2) - 20 : adX - (aDoorW / 2) + 20;
        aHandle.position.set(ahX, -antresolH / 2 + 50, halfD + T / 2 + 8);
        antresolGroup.add(aHandle);
      }

      cabinetGroup.add(antresolGroup);
    }

    // Refresh BoxHelper if a part is selected
    if (selectedPart && sceneRef.current) {
      const match = interactableMeshesRef.current.find(m => 
        m.userData?.interactiveType === selectedPart.type && 
        m.userData?.sectionIndex === selectedPart.sectionIndex &&
        (selectedPart.type !== 'shelf' || m.userData?.shelfIndex === selectedPart.shelfIndex) &&
        (selectedPart.type !== 'drawer' || m.userData?.drawerIndex === selectedPart.drawerIndex)
      );
      if (match) {
        const helper = new THREE.BoxHelper(match, 0xf59e0b);
        sceneRef.current.add(helper);
        boxHelperRef.current = helper;
      }
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, height / 2, 0);
    }
  }, [
    height, width, depth, thickness, socleHeight, sectionsData,
    hasLedLighting, doorType, doorsCount, bodyColor, facadeColor, 
    facadeType, handleColor, wireframe,
    hasCountertop, countertopThickness, countertopColor, hasSink, hasAntresol, isFloating
  ]);

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
    <div className="relative w-full h-[550px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Left: Views & Door Controls */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 max-w-[70%]">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 shadow-lg">
          <button
            onClick={() => setCameraView('iso')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            3D
          </button>
          <button
            onClick={() => setCameraView('front')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          >
            Oldi
          </button>
          <button
            onClick={() => setCameraView('side')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          >
            Yoni
          </button>
          <button
            onClick={() => setCameraView('top')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          >
            Tepasi
          </button>
        </div>

        {/* Master Door Opening Slider */}
        {doorType !== 'none' && onDoorsOpenPercentChange && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1 flex items-center gap-2 shadow-lg">
            <span className="text-[10px] text-slate-300 font-semibold flex items-center gap-1">
              {doorsOpenPercent > 0 ? <Eye className="w-3 h-3 text-blue-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
              {doorsOpenPercent}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={doorsOpenPercent}
              onChange={(e) => onDoorsOpenPercentChange(Number(e.target.value))}
              className="w-16 sm:w-20 accent-blue-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => onDoorsOpenPercentChange(doorsOpenPercent > 0 ? 0 : 100)}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition-colors"
            >
              {doorsOpenPercent > 0 ? 'Yopish' : 'Ochish'}
            </button>
          </div>
        )}
      </div>

      {/* Top Right Quick Tools */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {/* 3D Direct Edit Mode Toggle */}
        <button
          onClick={() => {
            const next = !isEditMode;
            setIsEditMode(next);
            isEditModeRef.current = next;
            setSelectedPart(null);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg ${
            isEditMode 
              ? 'bg-amber-500 border-amber-300 text-slate-950 ring-2 ring-amber-400/50 shadow-amber-500/30' 
              : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
          title="3D Tahrirlash rejimi: detallarni tanlab joyini o'zgartirish"
        >
          <Wrench className={`w-3.5 h-3.5 ${isEditMode ? 'text-slate-950' : 'text-amber-400'}`} />
          <span>{isEditMode ? 'Tahrirlash: FAOL' : 'Tahrirlash'}</span>
        </button>

        <button
          onClick={() => setWireframe(!wireframe)}
          className={`p-2 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
            wireframe 
              ? 'bg-blue-600 border-blue-400 text-white' 
              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Karkas (Wireframe)"
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
          title="Pol to'ri"
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

      {/* Top Banner when Edit Mode is Active */}
      {isEditMode && !selectedPart && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-amber-500/95 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-xl border border-amber-300 backdrop-blur-md flex items-center gap-2 z-10 animate-in fade-in">
          <Wrench className="w-3.5 h-3.5" />
          <span>Polka, tortma yoki bo‘lim to‘sig‘ini bosib tanlang</span>
        </div>
      )}

      {/* FLOATING 3D ACTION BAR WHEN A PART IS SELECTED IN EDIT MODE */}
      {isEditMode && selectedPart && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/80 text-white rounded-2xl p-3 shadow-2xl z-20 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in zoom-in-95 max-w-[95%]">
          <div className="flex items-center gap-2 pr-2 sm:border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div>
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                {selectedPart.type === 'shelf' ? 'Polka Tanlandi' : selectedPart.type === 'drawer' ? 'Tortma Tanlandi' : 'Bo‘lim Tanlandi'}
              </div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>{selectedPart.sectionIndex + 1}-Bo‘lma</span>
                {selectedPart.type === 'shelf' && <span className="text-slate-400">| #{ (selectedPart.shelfIndex ?? 0) + 1}-polka</span>}
                {selectedPart.type === 'drawer' && <span className="text-slate-400">| #{ (selectedPart.drawerIndex ?? 0) + 1}-tortma</span>}
                {selectedPart.type === 'section' && <span className="text-blue-400">({sectionsData[selectedPart.sectionIndex]?.width} mm)</span>}
              </div>
            </div>
          </div>

          {/* Buttons for Shelf */}
          {selectedPart.type === 'shelf' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateSectionProp?.(selectedPart.sectionIndex, 'shelvesCount', 1)}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors"
                title="Yangi polka qo'shish"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Polka qo‘shish</span>
              </button>

              <button
                onClick={() => onUpdateSectionProp?.(selectedPart.sectionIndex, 'shelvesCount', -1)}
                className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors"
                title="Polkani o'chirish"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>O‘chirish</span>
              </button>
            </div>
          )}

          {/* Buttons for Drawer */}
          {selectedPart.type === 'drawer' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateSectionProp?.(selectedPart.sectionIndex, 'drawersCount', 1)}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors"
                title="Yangi tortma qo'shish"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tortma qo‘shish</span>
              </button>

              <button
                onClick={() => onUpdateSectionProp?.(selectedPart.sectionIndex, 'drawersCount', -1)}
                className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors"
                title="Tortmani o'chirish"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>O‘chirish</span>
              </button>
            </div>
          )}

          {/* Buttons for Section / Divider */}
          {selectedPart.type === 'section' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const currentW = sectionsData[selectedPart.sectionIndex]?.width || 400;
                  onSectionWidthChange?.(selectedPart.sectionIndex, currentW + 50);
                }}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors"
                title="Kenglikni oshirish"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+50 mm</span>
              </button>

              <button
                onClick={() => {
                  const currentW = sectionsData[selectedPart.sectionIndex]?.width || 400;
                  onSectionWidthChange?.(selectedPart.sectionIndex, currentW - 50);
                }}
                className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors"
                title="Kenglikni kamaytirish"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>-50 mm</span>
              </button>

              {selectedPart.sectionIndex > 0 && (
                <button
                  onClick={() => onMoveSection?.(selectedPart.sectionIndex, 'left')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 shadow border border-slate-700 transition-colors"
                  title="Chapga surish"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Chapga</span>
                </button>
              )}

              {selectedPart.sectionIndex < sectionsData.length - 1 && (
                <button
                  onClick={() => onMoveSection?.(selectedPart.sectionIndex, 'right')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 shadow border border-slate-700 transition-colors"
                  title="O'ngga surish"
                >
                  <span>O‘ngga</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setSelectedPart(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            title="Yopish"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Click Tip Overlay */}
      {!isEditMode && interactHint && (
        <div 
          onClick={() => setInteractHint(false)}
          className="absolute bottom-10 left-3 right-3 sm:left-auto sm:right-3 bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition-all border border-blue-400/50 backdrop-blur-md animate-bounce"
        >
          <MousePointerClick className="w-3.5 h-3.5" />
          <span>Eshik yoki tortmalarni bosib, ularni alohida ochishingiz mumkin!</span>
          <span className="text-blue-200 text-[10px] ml-1">✕</span>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-mono">
          <RotateCw className="w-3.5 h-3.5 text-blue-400" />
          {isEditMode 
            ? '3D Tahrirlash: Detallarni bosib tanlang va boshqaring' 
            : '360° erkin aylantirish • Bosish orqali eshik/tortmani ochish'}
        </span>
        <span className="font-mono text-slate-500 hidden sm:inline">
          Three.js CAD Studio Engine • WebGL
        </span>
      </div>
    </div>
  );
}
