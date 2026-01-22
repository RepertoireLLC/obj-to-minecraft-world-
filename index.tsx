
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';
import { 
  Box, 
  Settings, 
  Pickaxe,
  Map as MapIcon,
  Sun,
  Moon,
  Sparkles,
  Info,
  Terminal,
  Save,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Anchor,
  Layers,
  Image as ImageIcon,
  Activity,
  Maximize,
  CheckCircle2,
  Tag
} from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FAITHFUL_BASE_URL = "https://raw.githubusercontent.com/Faithful-Pack/Default-Java/master/assets/minecraft/textures/block/";
const LEVEL_DAT_BASE64 = "H4sIAAAAAAAA/wXByw6CMBAA0H9pZ4KPF7PxBfgeFmKqSBOoLRU/3t3OBe5741fGqG+6v9o+7P5yI8p3H91Vj/IAnW/V605Xf9DIsTzP9P0DaxKCSg8AAAA=";

const MASTER_BLOCKS: BlockPalette[] = [
  { name: "Stone", hex: "#7a7a7a", minecraft_id: "minecraft:stone" },
  { name: "Andesite", hex: "#838383", minecraft_id: "minecraft:andesite" },
  { name: "Dripstone", hex: "#846c61", minecraft_id: "minecraft:dripstone_block" },
  { name: "Tuff", hex: "#6d6d66", minecraft_id: "minecraft:tuff" },
  { name: "Deepslate", hex: "#353535", minecraft_id: "minecraft:deepslate" },
  { name: "Smooth Stone", hex: "#a4a4a4", minecraft_id: "minecraft:smooth_stone" },
  { name: "Dark Oak Planks", hex: "#422a12", minecraft_id: "minecraft:dark_oak_planks" },
  { name: "Dark Oak Log", hex: "#352918", minecraft_id: "minecraft:dark_oak_log" },
  { name: "Spruce Planks", hex: "#684e2e", minecraft_id: "minecraft:spruce_planks" },
  { name: "Spruce Log", hex: "#48361e", minecraft_id: "minecraft:spruce_log" },
  { name: "Jungle Planks", hex: "#af7a58", minecraft_id: "minecraft:jungle_planks" },
  { name: "Oak Planks", hex: "#a88a53", minecraft_id: "minecraft:oak_planks" },
  { name: "Mud Bricks", hex: "#896750", minecraft_id: "minecraft:mud_bricks" },
  { name: "White Concrete", hex: "#cfd5d6", minecraft_id: "minecraft:white_concrete" },
  { name: "Light Gray Concrete", hex: "#7d7d73", minecraft_id: "minecraft:light_gray_concrete" },
  { name: "Gray Concrete", hex: "#373a3e", minecraft_id: "minecraft:gray_concrete" },
  { name: "Black Concrete", hex: "#080a0f", minecraft_id: "minecraft:black_concrete" },
  { name: "Brown Concrete", hex: "#603c20", minecraft_id: "minecraft:brown_concrete" },
  { name: "Terracotta", hex: "#945b43", minecraft_id: "minecraft:terracotta" },
  { name: "White Terracotta", hex: "#d1b2a1", minecraft_id: "minecraft:white_terracotta" },
  { name: "Orange Terracotta", hex: "#a15325", minecraft_id: "minecraft:orange_terracotta" },
  { name: "Brown Terracotta", hex: "#4d3324", minecraft_id: "minecraft:brown_terracotta" },
  { name: "Gray Terracotta", hex: "#392d24", minecraft_id: "minecraft:gray_terracotta" },
  { name: "Moss Block", hex: "#597220", minecraft_id: "minecraft:moss_block" },
  { name: "Green Concrete", hex: "#495b24", minecraft_id: "minecraft:green_concrete" },
  { name: "Green Wool", hex: "#4d6a27", minecraft_id: "minecraft:green_wool" },
  { name: "Azalea Leaves", hex: "#546d31", minecraft_id: "minecraft:azalea_leaves" },
  { name: "Glass", hex: "#ffffff", minecraft_id: "minecraft:glass", is_glass: true },
  { name: "Cyan Stained Glass", hex: "#4c7f99", minecraft_id: "minecraft:cyan_stained_glass", is_glass: true },
  { name: "Black Stained Glass", hex: "#191919", minecraft_id: "minecraft:black_stained_glass", is_glass: true },
];

interface BlockPalette {
  name: string;
  hex: string;
  minecraft_id: string;
  is_glass?: boolean;
}

interface VoxelData {
  pos: THREE.Vector3;
  color: THREE.Color;
  blockId: string;
  alpha: number;
}

interface MaterialMap {
  originalName: string;
  assignedBlockId: string;
  color: string;
}

interface TextureCache {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const IMAGE_DATA_CACHE = new Map<string, TextureCache>();

const getTextureUrl = (minecraftId: string) => {
  const name = minecraftId.replace('minecraft:', '');
  return `${FAITHFUL_BASE_URL}${name}.png`;
};

const cacheImageData = (img: any, id: string): TextureCache | null => {
  if (IMAGE_DATA_CACHE.has(id)) return IMAGE_DATA_CACHE.get(id)!;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cacheObj = { data: data.data, width: data.width, height: data.height };
  IMAGE_DATA_CACHE.set(id, cacheObj);
  return cacheObj;
};

const getSampleFromUV = (uv: THREE.Vector2, texture: THREE.Texture): { color: THREE.Color, alpha: number } => {
  if (!texture || !texture.image) return { color: new THREE.Color(1, 1, 1), alpha: 1 };
  let cache = IMAGE_DATA_CACHE.get(texture.uuid);
  if (!cache) cache = cacheImageData(texture.image, texture.uuid);
  if (!cache) return { color: new THREE.Color(1, 1, 1), alpha: 1 };
  
  const x = Math.floor(uv.x * cache.width);
  const y = Math.floor((1 - uv.y) * cache.height);
  const cx = Math.max(0, Math.min(cache.width - 1, x));
  const cy = Math.max(0, Math.min(cache.height - 1, y));
  const i = (cy * cache.width + cx) * 4;
  
  return {
    color: new THREE.Color(cache.data[i] / 255, cache.data[i + 1] / 255, cache.data[i + 2] / 255),
    alpha: cache.data[i + 3] / 255
  };
};

const getBestBlock = (col: THREE.Color, alpha: number, palette: BlockPalette[]) => {
  const availablePalette = alpha < 0.5 
    ? palette.filter(p => p.is_glass) 
    : palette.filter(p => !p.is_glass);

  const finalPalette = availablePalette.length > 0 ? availablePalette : palette;
  let min = Infinity;
  let best = finalPalette[0];
  
  for (const p of finalPalette) {
    const pc = new THREE.Color(p.hex);
    const rMean = (col.r + pc.r) / 2;
    const dr = col.r - pc.r;
    const dg = col.g - pc.g;
    const db = col.b - pc.b;
    const d = Math.sqrt((2 + rMean) * dr * dr + 4 * dg * dg + (3 - rMean) * db * db);
    if (d < min) { min = d; best = p; }
  }
  return best;
};

const voxelizeStream = async (
  root: THREE.Object3D, 
  resolution: number, 
  palette: BlockPalette[], 
  solidFill: boolean,
  materialAssignment: Record<string, string>,
  onProgress: (percent: number, status: string) => void,
  onVoxelsFound: (newVoxels: VoxelData[]) => void
): Promise<VoxelData[]> => {
  const voxelsMap = new Map<string, VoxelData>();
  const finalVoxels: VoxelData[] = [];
  const bbox = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const step = Math.max(size.x, size.y, size.z) / resolution;
  
  const raycaster = new THREE.Raycaster();
  const dirs = [
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1)
  ];
  const axisLabels = ["UP", "FRONT", "RIGHT", "DOWN", "BACK", "LEFT"];

  const meshes: THREE.Mesh[] = [];
  root.traverse(c => { if (c instanceof THREE.Mesh) meshes.push(c); });

  const totalPhases = 6 + (solidFill ? 1 : 0);
  let currentPhase = 0;
  let batch: VoxelData[] = [];

  for (let axis = 0; axis < 6; axis++) {
    const dir = dirs[axis];
    const absAxis = axis % 3;
    const uLabel = ['x', 'y', 'z'][(absAxis + 1) % 3] as 'x' | 'y' | 'z';
    const vLabel = ['x', 'y', 'z'][(absAxis + 2) % 3] as 'x' | 'y' | 'z';
    const rayLabel = ['x', 'y', 'z'][absAxis] as 'x' | 'y' | 'z';
    const isNeg = axis >= 3;

    const uRange = bbox.max[uLabel] - bbox.min[uLabel];
    const vRange = bbox.max[vLabel] - bbox.min[vLabel];
    const totalIterations = (uRange / step) * (vRange / step);
    let currentIteration = 0;

    for (let u = bbox.min[uLabel]; u < bbox.max[uLabel]; u += step) {
      for (let v = bbox.min[vLabel]; v < bbox.max[vLabel]; v += step) {
        currentIteration++;
        
        if (currentIteration % 150 === 0) {
          const progress = ((currentPhase / totalPhases) + (currentIteration / totalIterations) / totalPhases) * 100;
          onProgress(progress, `Live Forging: ${axisLabels[axis]} Face...`);
          if (batch.length > 0) {
            onVoxelsFound([...batch]);
            batch = [];
          }
          await new Promise(res => setTimeout(res, 0));
        }

        const origin = new THREE.Vector3();
        origin[uLabel] = u + step / 2;
        origin[vLabel] = v + step / 2;
        origin[rayLabel] = isNeg ? bbox.max[rayLabel] + 10 : bbox.min[rayLabel] - 10;
        
        raycaster.set(origin, dir);
        const hits = raycaster.intersectObjects(meshes, true);
        
        for (const hit of hits) {
          const vx = Math.floor(hit.point.x / step) * step;
          const vy = Math.floor(hit.point.y / step) * step;
          const vz = Math.floor(hit.point.z / step) * step;
          const key = `${vx},${vy},${vz}`;
          
          if (!voxelsMap.has(key)) {
            const mesh = hit.object as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            let sample = { color: new THREE.Color().copy(mat.color), alpha: 1.0 };
            if (mat.map && hit.uv) sample = getSampleFromUV(hit.uv, mat.map);
            
            // Priority: AI Material Assignment > Color Distance
            const assignedId = materialAssignment[mat.name];
            let blockId = assignedId || getBestBlock(sample.color, sample.alpha, palette).minecraft_id;

            const vData = { pos: new THREE.Vector3(vx, vy, vz), color: sample.color, blockId, alpha: sample.alpha };
            voxelsMap.set(key, vData);
            batch.push(vData);
            finalVoxels.push(vData);
          }
        }
      }
    }
    currentPhase++;
  }

  if (solidFill) {
    const xRange = bbox.max.x - bbox.min.x;
    const totalSteps = (xRange / step);
    let currentStep = 0;

    for (let x = bbox.min.x; x < bbox.max.x; x += step) {
      currentStep++;
      if (currentStep % 10 === 0) {
        const progress = ((currentPhase / totalPhases) + (currentStep / totalSteps) / totalPhases) * 100;
        onProgress(progress, `Scanning Internal Integrity...`);
        if (batch.length > 0) {
          onVoxelsFound([...batch]);
          batch = [];
        }
        await new Promise(res => setTimeout(res, 0));
      }

      for (let z = bbox.min.z; z < bbox.max.z; z += step) {
        const rayStart = new THREE.Vector3(x + step / 2, bbox.min.y - 5, z + step / 2);
        raycaster.set(rayStart, new THREE.Vector3(0, 1, 0));
        const hits = raycaster.intersectObjects(meshes, true);
        if (hits.length >= 2) {
          for (let k = 0; k < hits.length - 1; k += 2) {
            for (let y = hits[k].point.y; y < hits[k+1].point.y; y += step) {
              const vx = Math.floor(x / step) * step;
              const vy = Math.floor(y / step) * step;
              const vz = Math.floor(z / step) * step;
              const key = `${vx},${vy},${vz}`;
              if (!voxelsMap.has(key)) {
                const mesh = hits[k].object as THREE.Mesh;
                const mat = mesh.material as THREE.MeshStandardMaterial;
                let s = { color: new THREE.Color().copy(mat.color), alpha: 1.0 };
                if (mat.map && hits[k].uv) s = getSampleFromUV(hits[k].uv!, mat.map);
                
                const assignedId = materialAssignment[mat.name];
                let blockId = assignedId || getBestBlock(s.color, s.alpha, palette).minecraft_id;

                const vData = { pos: new THREE.Vector3(vx, vy, vz), color: s.color, blockId, alpha: s.alpha };
                voxelsMap.set(key, vData);
                batch.push(vData);
                finalVoxels.push(vData);
              }
            }
          }
        }
      }
    }
  }
  
  if (batch.length > 0) onVoxelsFound(batch);
  return finalVoxels;
};

const App = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [resolution, setResolution] = useState(128);
  const [solidFill, setSolidFill] = useState(true);
  const [viewMode, setViewMode] = useState<'mesh' | 'voxels'>('voxels');
  const [fileName, setFileName] = useState<string | null>(null);
  const [worldName, setWorldName] = useState<string>("EPIC_STRUCTURE");
  const [voxels, setVoxels] = useState<VoxelData[]>([]);
  const [spawnHeight, setSpawnHeight] = useState(64);
  const [isNight, setIsNight] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [aiMaterialMap, setAiMaterialMap] = useState<MaterialMap[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; controls: OrbitControls; originalMesh: THREE.Group | null; voxelGroups: THREE.Group | null; } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isNight ? 0x010103 : 0xDEEEFF);
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
    camera.position.set(400, 400, 400);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, isNight ? 0.3 : 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, isNight ? 0.4 : 1.2);
    sun.position.set(500, 1000, 500);
    scene.add(sun);
    sceneRef.current = { scene, renderer, camera, controls, originalMesh: null, voxelGroups: null };
    const animate = () => { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => { renderer.dispose(); };
  }, [isNight]);

  const analyzeMaterials = async (materials: MTLLoader.MaterialCreator): Promise<Record<string, string>> => {
    const materialNames = Object.keys(materials.materials);
    const prompt = `Analyze these 3D material names: [${materialNames.join(', ')}]. 
    Assign the single best matching Minecraft block ID for each one from the standard game (e.g., minecraft:dark_oak_planks, minecraft:glass, minecraft:stone, minecraft:deepslate, minecraft:moss_block). 
    Return strictly JSON: {"materialName": "minecraft:block_id"}`;

    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      const mapping = JSON.parse(resp.text || '{}');
      
      const visualMap: MaterialMap[] = [];
      for (const [name, id] of Object.entries(mapping)) {
        const mat = materials.materials[name as any] as any;
        const color = mat?.color ? `#${mat.color.getHexString()}` : '#ffffff';
        visualMap.push({ originalName: name, assignedBlockId: id as string, color });
      }
      setAiMaterialMap(visualMap);
      return mapping;
    } catch (e) {
      console.warn("AI Mapping failed, falling back to color distance.", e);
      return {};
    }
  };

  const handleUpload = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStatus("Deconstructing Assets...");
    setVoxels([]);
    setAiMaterialMap([]);
    
    IMAGE_DATA_CACHE.clear();
    const fileMap: any = {};
    let objFile, mtlFile, stlFile;
    files.forEach(f => {
      const url = URL.createObjectURL(f);
      fileMap[f.name] = url;
      if (f.name.endsWith('.obj')) objFile = f;
      if (f.name.endsWith('.mtl')) mtlFile = f;
      if (f.name.endsWith('.stl')) stlFile = f;
    });

    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      const name = decodeURIComponent(url.split('/').pop() || "");
      return fileMap[name] || url;
    });

    try {
      let object = new THREE.Group();
      let materialAssignment: Record<string, string> = {};

      if (objFile) {
        if (mtlFile) {
          setLoadingStatus("AI Architect: Mapping Materials...");
          const mtlLoader = new MTLLoader(manager);
          const materials = await new Promise<MTLLoader.MaterialCreator>(res => mtlLoader.load(fileMap[mtlFile!.name], res));
          materials.preload();
          materialAssignment = await analyzeMaterials(materials);
          const objLoader = new OBJLoader(manager);
          objLoader.setMaterials(materials);
          setLoadingStatus("Streaming High-Poly Geometry...");
          object = await new Promise<any>(res => objLoader.load(fileMap[objFile!.name], res));
        } else {
          object = await new Promise<any>(res => new OBJLoader(manager).load(fileMap[objFile!.name], res));
        }
      } else if (stlFile) {
        setLoadingStatus("Processing STL Binary...");
        const geom = await new Promise<any>(res => new STLLoader(manager).load(fileMap[stlFile!.name], res));
        object.add(new THREE.Mesh(geom, new THREE.MeshStandardMaterial()));
      }
      
      const { scene } = sceneRef.current!;
      if (sceneRef.current?.originalMesh) scene.remove(sceneRef.current.originalMesh);
      sceneRef.current!.originalMesh = object;
      const box = new THREE.Box3().setFromObject(object);
      object.position.sub(box.getCenter(new THREE.Vector3()));

      setLoadingStatus("Warming UV Samplers...");
      const texPromises: any[] = [];
      object.traverse((c: any) => { 
        if (c.material?.map) {
          texPromises.push(new Promise(r => { 
            if (c.material.map.image) { cacheImageData(c.material.map.image, c.material.map.uuid); r(null); } 
            else { const i = new Image(); i.src = c.material.map.source.data.src; i.onload = () => { cacheImageData(i, c.material.map.uuid); r(null); }; } 
          }));
        } 
      });
      await Promise.all(texPromises);

      setViewMode('voxels');
      await voxelizeStream(
        object, 
        resolution, 
        MASTER_BLOCKS, 
        solidFill, 
        materialAssignment,
        (p, s) => { setLoadingProgress(p); setLoadingStatus(s); },
        (newBatch) => { setVoxels(prev => [...prev, ...newBatch]); }
      );
      
      setFileName(objFile?.name || stlFile?.name || "");
      setWorldName(objFile?.name.split('.')[0].toUpperCase().replace(/[^A-Z]/g, '_') || "STRUCTURE");
    } catch (e) { 
      alert("Error: Assets incompatible or missing."); console.error(e); 
    } finally { 
      setLoading(false); setLoadingStatus(""); setLoadingProgress(0);
    }
  };

  useEffect(() => {
    const { scene, originalMesh } = sceneRef.current!;
    if (!originalMesh) return;
    if (sceneRef.current?.voxelGroups) scene.remove(sceneRef.current.voxelGroups);
    if (voxels.length === 0) return;

    const group = new THREE.Group();
    const box = new THREE.Box3().setFromObject(originalMesh);
    const size = box.getSize(new THREE.Vector3());
    const vSize = (Math.max(size.x, size.y, size.z) / resolution) * 0.99;
    const boxGeom = new THREE.BoxGeometry(vSize, vSize, vSize);
    const blockGroups: Record<string, VoxelData[]> = {};
    
    voxels.forEach(v => { 
      if (!blockGroups[v.blockId]) blockGroups[v.blockId] = []; 
      blockGroups[v.blockId].push(v); 
    });

    for (const [id, pts] of Object.entries(blockGroups)) {
      const isGlass = id.includes('glass');
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: isGlass, opacity: isGlass ? 0.6 : 1, roughness: 0.7 });
      new THREE.TextureLoader().load(getTextureUrl(id), t => { t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.needsUpdate = true; });
      const im = new THREE.InstancedMesh(boxGeom, mat, pts.length);
      const m = new THREE.Matrix4();
      pts.forEach((v, i) => { m.setPosition(v.pos); im.setMatrixAt(i, m); });
      group.add(im);
    }
    
    sceneRef.current!.voxelGroups = group;
    if (viewMode === 'voxels') { scene.add(group); scene.remove(originalMesh); } 
    else { scene.add(originalMesh); scene.remove(group); }
  }, [voxels, viewMode, resolution]);

  const exportZip = async () => {
    setLoading(true);
    setLoadingStatus("Compiling Material Pack...");
    const zip = new JSZip();
    const folder = worldName.toLowerCase();
    zip.file(`${folder}/datapacks/forge/pack.mcmeta`, JSON.stringify({ pack: { pack_format: 15, description: "VoxelCraft LIVE EXPORT" } }));
    
    const bbox = new THREE.Box3().setFromPoints(voxels.map(v => v.pos));
    const step = Math.max(bbox.getSize(new THREE.Vector3()).x, bbox.getSize(new THREE.Vector3()).y, bbox.getSize(new THREE.Vector3()).z) / resolution;
    
    const cmds = voxels.map(v => {
      const x = Math.round((v.pos.x - bbox.min.x) / step);
      const y = Math.round((v.pos.y - bbox.min.y) / step);
      const z = Math.round((v.pos.z - bbox.min.z) / step);
      return `setblock ~${x} ~${y} ~${z} ${v.blockId}`;
    });
    
    zip.file(`${folder}/datapacks/forge/data/forge/functions/build.mcfunction`, cmds.join('\n'));
    zip.file(`${folder}/datapacks/forge/data/forge/functions/init.mcfunction`, `tellraw @a ["",{"text":"[VOXELCRAFT] ","color":"green","bold":true},{"text":"Forge complete. ","color":"white"},{"text":"[RUN ASSEMBLY]","color":"gold","bold":true,"underlined":true,"clickEvent":{"action":"run_command","value":"/function forge:build"}}]`);
    zip.file(`${folder}/datapacks/forge/data/minecraft/tags/functions/load.json`, JSON.stringify({ values: ["forge:init"] }));
    
    const bytes = new Uint8Array(atob(LEVEL_DAT_BASE64).length);
    for(let i=0; i<bytes.length; i++) bytes[i] = atob(LEVEL_DAT_BASE64).charCodeAt(i);
    zip.file(`${folder}/level.dat`, bytes);
    
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${folder}.zip`; a.click();
    setLoading(false); setShowGuide(true);
  };

  return (
    <div className="relative w-full h-screen bg-[#050508] text-white selection:bg-green-500/30 font-sans overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="mc-panel p-4 bg-[#1a1a20]/95 border-l-4 border-green-500 pointer-events-auto">
          <h1 className="mc-font text-lg text-green-400 mb-1 flex items-center gap-3"><Pickaxe className="animate-pulse" /> VOXELCRAFT ULTIMATE</h1>
          <p className="text-[8px] text-zinc-500 uppercase tracking-[0.4em] font-black">HIGH-FIDELITY ARCHITECTURAL MAPPING</p>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          <button onClick={() => setIsNight(!isNight)} className="mc-panel p-4 bg-[#1a1a20]/95 border border-zinc-800 rounded-lg shadow-xl hover:bg-zinc-800 transition-colors">
            {isNight ? <Sun className="text-yellow-400" /> : <Moon className="text-blue-400" />}
          </button>
          <label className="mc-button px-8 py-4 bg-green-700 border-b-4 border-r-4 border-green-950 text-xs font-black uppercase flex items-center gap-2 cursor-pointer shadow-2xl hover:brightness-110 active:scale-95 transition-all">
            <Layers /> IMPORT ASSET FOLDER
            <input type="file" className="hidden" multiple {...{webkitdirectory: "true", directory: "true"} as any} onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="absolute left-6 top-32 bottom-6 w-80 z-10 flex flex-col gap-6 pointer-events-none overflow-y-auto custom-scroll pr-2">
        <div className="mc-panel p-6 bg-[#1a1a20]/98 backdrop-blur-xl border border-zinc-800 pointer-events-auto flex flex-col gap-6 shadow-2xl">
          <div className="flex items-center gap-2 text-green-400 text-[10px] mc-font uppercase"><Settings size={14} /> GLOBAL FORGE</div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500 mb-2"><span>MESH DENSITY</span><span className="text-white">{resolution} Blocks</span></div>
              <input type="range" min="32" max="256" step="16" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} className="w-full accent-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-black/40 border border-zinc-800 rounded cursor-pointer" onClick={() => setSolidFill(!solidFill)}>
              <span className="text-[9px] font-black uppercase text-zinc-300">SOLID CORE FILL</span>
              <div className={`w-10 h-5 rounded-full px-1 flex items-center ${solidFill ? 'bg-green-600' : 'bg-zinc-800'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-all ${solidFill ? 'translate-x-5' : ''}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setViewMode('voxels')} className={`p-3 text-[9px] font-black uppercase border-b-2 transition-all ${viewMode === 'voxels' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-zinc-800 text-zinc-500'}`}>Voxels</button>
              <button onClick={() => setViewMode('mesh')} className={`p-3 text-[9px] font-black uppercase border-b-2 transition-all ${viewMode === 'mesh' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-zinc-800 text-zinc-500'}`}>Mesh</button>
            </div>
          </div>
          
          {aiMaterialMap.length > 0 && (
            <>
              <div className="h-px bg-zinc-800" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-500 text-[9px] font-black uppercase"><Tag size={12} /> Material Mapping</div>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                  {aiMaterialMap.map((map, i) => (
                    <div key={i} className="p-2 bg-black/40 border border-zinc-800 rounded flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm border border-zinc-700" style={{ backgroundColor: map.color }} />
                        <span className="text-[8px] text-zinc-400 font-bold truncate max-w-[80px]">{map.originalName}</span>
                      </div>
                      <ChevronRight size={10} className="text-zinc-700" />
                      <div className="flex items-center gap-2">
                        <img src={getTextureUrl(map.assignedBlockId)} className="w-4 h-4 pixelated rounded-sm" />
                        <span className="text-[7px] text-green-500 font-black truncate max-w-[80px]">{map.assignedBlockId.split(':')[1].toUpperCase().replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-zinc-800" />
          <button onClick={exportZip} disabled={voxels.length === 0 || loading} className="w-full mc-button py-6 bg-green-700 border-green-950 border-b-8 border-r-8 flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-xl">
            <Save size={24} /> <span className="mc-font text-xs">FINALIZE MAP</span>
          </button>
        </div>
      </div>

      {/* Deployment UI */}
      {showGuide && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="mc-panel max-w-lg w-full bg-[#1a1a20] p-10 border-2 border-zinc-700 shadow-2xl relative">
            <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><Terminal /></button>
            <h2 className="mc-font text-xl text-yellow-500 mb-8 flex items-center gap-3"><CheckCircle2 /> FORGE COMPLETE</h2>
            <div className="space-y-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <p><span className="text-white mr-4 bg-zinc-800 p-2 rounded">01</span> Copy folder to <code className="text-green-500">.minecraft/saves</code></p>
              <p><span className="text-white mr-4 bg-zinc-800 p-2 rounded">02</span> Load the world <code className="text-yellow-500">"{worldName}"</code></p>
              <p><span className="text-white mr-4 bg-zinc-800 p-2 rounded">03</span> Click <span className="text-gold underline">[RUN ASSEMBLY]</span> in chat console.</p>
            </div>
            <button onClick={() => setShowGuide(false)} className="mt-12 w-full mc-button py-5 bg-zinc-800 border-b-4 border-r-4 border-zinc-950 text-[10px] font-black uppercase">ACKNOWLEDGE</button>
          </div>
        </div>
      )}

      {/* Build Progress Indicator */}
      {loading && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
          <div className="w-96 h-2 bg-zinc-900 overflow-hidden mb-4 border border-zinc-800 rounded-full shadow-2xl">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
          </div>
          <div className="bg-[#1a1a20]/90 px-8 py-3 rounded-full border border-zinc-800 backdrop-blur-xl shadow-2xl flex items-center gap-4">
            <Activity size={14} className="text-green-500 animate-spin" />
            <h2 className="mc-font text-green-400 text-[10px] tracking-widest uppercase">
              {Math.round(loadingProgress)}% - {loadingStatus || "TRANSMUTING..."}
            </h2>
          </div>
        </div>
      )}

      {/* Welcome Screen */}
      {!fileName && !loading && voxels.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="max-w-md w-full mc-panel bg-[#1a1a20]/95 p-12 text-center border-zinc-800 border-2 shadow-2xl">
            <Box size={64} className="text-green-400 mx-auto mb-8 animate-bounce" />
            <h2 className="mc-font text-2xl mb-4 text-white">VOXELCRAFT</h2>
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed">
              Drop your model folder to begin<br/>AI-assisted Minecraft reconstruction.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 text-[7px] text-zinc-600 font-bold uppercase tracking-widest">
              <span className="p-2 border border-zinc-900 rounded bg-black/20">AI Material Analysis</span>
              <span className="p-2 border border-zinc-900 rounded bg-black/20">Smart Transparency</span>
              <span className="p-2 border border-zinc-900 rounded bg-black/20">Datapack Compiler</span>
              <span className="p-2 border border-zinc-900 rounded bg-black/20">Live Build View</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mc-font { font-family: 'Press+Start+2P', cursive; }
        .pixelated { image-rendering: pixelated; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 8px; background: #22c55e; cursor: pointer; border-radius: 0; box-shadow: 2px 2px 0px #166534; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #222; border-radius: 2px; }
      `}</style>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
