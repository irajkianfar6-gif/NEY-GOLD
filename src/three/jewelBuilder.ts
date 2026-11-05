import * as THREE from 'three';
import type { JewelType, GoldCode, GemCode } from '../utils/storeLogic';

export function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createBrushedMetalMap(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y++) {
    const v = 110 + Math.floor(Math.sin(y * 0.7) * 18 + (Math.random() - 0.5) * 26);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, S, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(20, 12, 6, 0.52)');
  grad.addColorStop(0.5, 'rgba(20, 12, 6, 0.22)');
  grad.addColorStop(1, 'rgba(20, 12, 6, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const GOLD_COLORS: Record<GoldCode, { main: number; satin: number }> = {
  y: { main: 0xe5b84b, satin: 0xc89632 },
  r: { main: 0xe09b83, satin: 0xb86f58 },
  w: { main: 0xe6e9ec, satin: 0xb8bec4 },
};

export const GEM_COLORS: Record<GemCode, { color: number; atten: number; emissive: number }> = {
  dia: { color: 0xf4fbff, atten: 0xdbeeff, emissive: 0x1a2836 },
  ruby: { color: 0xc91e3a, atten: 0x7a0c1e, emissive: 0x32060e },
  em: { color: 0x188c68, atten: 0x0b4f3a, emissive: 0x05281c },
};

export interface JewelMaterials {
  polishedGold: THREE.MeshPhysicalMaterial;
  satinGold: THREE.MeshStandardMaterial;
  gemMat: THREE.MeshPhysicalMaterial;
  pearlMat: THREE.MeshPhysicalMaterial;
  cordMat: THREE.MeshStandardMaterial;
  shadowMat: THREE.MeshBasicMaterial;
}

export function createJewelMaterials(
  gold: GoldCode,
  gem: GemCode,
  isSoftwareGl: boolean,
  bumpMap: THREE.CanvasTexture,
  shadowTex: THREE.CanvasTexture
): JewelMaterials {
  const gCol = GOLD_COLORS[gold];
  const mCol = GEM_COLORS[gem];

  const polishedGold = new THREE.MeshPhysicalMaterial({
    color: gCol.main,
    metalness: 0.96,
    roughness: 0.14,
    anisotropy: 0.75,
    clearcoat: 0.4,
    clearcoatRoughness: 0.12,
    bumpMap,
    bumpScale: 0.004,
  });

  // Vary roughness by >= 0.25 on adjacent secondary gold parts
  const satinGold = new THREE.MeshStandardMaterial({
    color: gCol.satin,
    metalness: 0.84,
    roughness: 0.42,
    bumpMap,
    bumpScale: 0.008,
  });

  const gemMat = new THREE.MeshPhysicalMaterial({
    color: mCol.color,
    emissive: mCol.emissive,
    emissiveIntensity: 0.35,
    metalness: 0.0,
    roughness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: isSoftwareGl ? 0.86 : 1.0,
    ior: 2.15,
    thickness: 1.4,
    attenuationColor: new THREE.Color(mCol.atten),
    attenuationDistance: 1.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    flatShading: true,
  });

  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7efe2,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
    sheen: 1.0,
    sheenColor: new THREE.Color(0xffe4d6),
    sheenRoughness: 0.3,
    iridescence: 0.65,
    iridescenceIOR: 1.35,
  });

  const cordMat = new THREE.MeshStandardMaterial({
    color: 0x6b5443,
    roughness: 0.85,
    metalness: 0.05,
  });

  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  return { polishedGold, satinGold, gemMat, pearlMat, cordMat, shadowMat };
}

function registerPart(
  group: THREE.Group,
  mesh: THREE.Object3D,
  basePos: THREE.Vector3,
  explodedOffset: THREE.Vector3
) {
  mesh.position.copy(basePos);
  mesh.userData.basePos = basePos.clone();
  mesh.userData.explodedPos = basePos.clone().add(explodedOffset);
  group.add(mesh);
}

function createBrilliantGemGeometry(radius = 0.42, height = 0.52): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.001, -height * 0.65),
    new THREE.Vector2(radius * 0.68, -height * 0.18),
    new THREE.Vector2(radius, 0),
    new THREE.Vector2(radius * 0.86, height * 0.22),
    new THREE.Vector2(radius * 0.52, height * 0.35),
    new THREE.Vector2(0.001, height * 0.35),
  ];
  const geo = new THREE.LatheGeometry(pts, 12);
  geo.computeVertexNormals();
  return geo;
}

export function buildJewelGroup(
  type: JewelType,
  mats: JewelMaterials
): THREE.Group {
  const root = new THREE.Group();
  root.name = `jewel-${type}`;

  // Contact shadow disc at bottom center (y = -1.55)
  const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32), mats.shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, -1.55, 0);
  root.add(shadowPlane);

  if (type === 'ring') {
    // 1. Primary Silhouette: Outer Sculpted 18K Gold Band (Torus)
    const bandGeo = new THREE.TorusGeometry(0.88, 0.12, 28, 64);
    const band = new THREE.Mesh(bandGeo, mats.polishedGold);
    band.castShadow = true;
    band.receiveShadow = true;
    registerPart(root, band, new THREE.Vector3(0, 0.18, 0), new THREE.Vector3(0, 0, -0.35));

    // 2. Secondary Read: Inner Comfort-Fit Satin Lining Ring
    const innerGeo = new THREE.TorusGeometry(0.81, 0.065, 20, 56);
    const innerRing = new THREE.Mesh(innerGeo, mats.satinGold);
    registerPart(root, innerRing, new THREE.Vector3(0, 0.18, 0), new THREE.Vector3(0, 0, 0.35));

    // 3. Top Suspension Eyelet Bail
    const bailGeo = new THREE.TorusGeometry(0.11, 0.028, 14, 28);
    const bail = new THREE.Mesh(bailGeo, mats.satinGold);
    bail.rotation.y = Math.PI / 2;
    registerPart(root, bail, new THREE.Vector3(0, 1.16, 0), new THREE.Vector3(0, 0.45, 0));

    // 4. Silk Suspension Thread
    const cordGeo = new THREE.CylinderGeometry(0.014, 0.014, 1.4, 8);
    const cord = new THREE.Mesh(cordGeo, mats.cordMat);
    registerPart(root, cord, new THREE.Vector3(0, 1.92, 0), new THREE.Vector3(0, 0.75, 0));

    // 5. Lower Dewdrop Setting Collet (Satin Gold Bezel Basket)
    const colletGeo = new THREE.CylinderGeometry(0.26, 0.18, 0.22, 16);
    const collet = new THREE.Mesh(colletGeo, mats.satinGold);
    collet.castShadow = true;
    registerPart(root, collet, new THREE.Vector3(0, -0.82, 0), new THREE.Vector3(0, -0.25, 0));

    // 6. 4 Sculpted Claw Prongs Group
    const prongsGroup = new THREE.Group();
    const prongGeo = new THREE.CapsuleGeometry(0.032, 0.26, 8, 12);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const p = new THREE.Mesh(prongGeo, mats.polishedGold);
      p.position.set(Math.cos(a) * 0.24, -0.1, Math.sin(a) * 0.24);
      p.rotation.z = Math.cos(a) * 0.22;
      p.rotation.x = -Math.sin(a) * 0.22;
      prongsGroup.add(p);
    }
    registerPart(root, prongsGroup, new THREE.Vector3(0, -0.92, 0), new THREE.Vector3(0, -0.48, 0.25));

    // 7. Faceted Brilliant Solitaire Gemstone
    const gemGeo = createBrilliantGemGeometry(0.36, 0.48);
    const gem = new THREE.Mesh(gemGeo, mats.gemMat);
    gem.castShadow = true;
    registerPart(root, gem, new THREE.Vector3(0, -1.06, 0), new THREE.Vector3(0, -0.78, 0));

    // 8. Accent Upper Shoulder Milgrain Collar
    const collarGeo = new THREE.TorusGeometry(0.16, 0.035, 12, 24);
    const collar = new THREE.Mesh(collarGeo, mats.polishedGold);
    collar.rotation.x = Math.PI / 2;
    registerPart(root, collar, new THREE.Vector3(0, -0.71, 0), new THREE.Vector3(0, -0.12, -0.2));
  } else if (type === 'neck') {
    // 1. Primary Silhouette: Sculpted Reed Leaf (ExtrudeGeometry with bevels)
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0.65);
    leafShape.bezierCurveTo(0.38, 0.35, 0.44, -0.35, 0.04, -1.05);
    leafShape.bezierCurveTo(-0.34, -0.35, -0.36, 0.35, 0, 0.65);
    const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.045,
      bevelThickness: 0.045,
    });
    leafGeo.center();
    const leafMesh = new THREE.Mesh(leafGeo, mats.polishedGold);
    leafMesh.castShadow = true;
    registerPart(root, leafMesh, new THREE.Vector3(0, -0.38, 0), new THREE.Vector3(0, -0.25, -0.3));

    // 2. Secondary Read: Raised Golden Midrib Vein (TubeGeometry)
    const veinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.38, 0.075),
      new THREE.Vector3(0.03, -0.32, 0.09),
      new THREE.Vector3(0.05, -1.08, 0.06),
    ]);
    const veinGeo = new THREE.TubeGeometry(veinCurve, 24, 0.028, 12, false);
    const veinMesh = new THREE.Mesh(veinGeo, mats.satinGold);
    registerPart(root, veinMesh, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0.25));

    // 3. Cabochon Gemstone Bezel Collet
    const bezelGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.11, 28);
    bezelGeo.rotateX(Math.PI / 2);
    const bezel = new THREE.Mesh(bezelGeo, mats.satinGold);
    registerPart(root, bezel, new THREE.Vector3(0.01, -0.15, 0.07), new THREE.Vector3(0, -0.15, 0.42));

    // 4. Faceted / Cabochon Gemstone
    const cabGeo = new THREE.SphereGeometry(0.19, 24, 18);
    cabGeo.scale(1, 1.22, 0.68);
    const cab = new THREE.Mesh(cabGeo, mats.gemMat);
    registerPart(root, cab, new THREE.Vector3(0.01, -0.15, 0.12), new THREE.Vector3(0, -0.15, 0.72));

    // 5. Articulated Bail Ring
    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 14, 28), mats.polishedGold);
    registerPart(root, bail, new THREE.Vector3(0, 0.52, 0), new THREE.Vector3(0, 0.22, 0));

    // 6. Cable Chain Links (InstancedMesh > 24 links)
    const linkGeo = new THREE.TorusGeometry(0.065, 0.018, 10, 20);
    const count = 28;
    const chainInst = new THREE.InstancedMesh(linkGeo, mats.polishedGold, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const side = i < count / 2 ? -1 : 1;
      const idx = i % (count / 2);
      const t = (idx + 1) / (count / 2);
      const x = side * (0.06 + t * 0.68 + Math.sin(t * Math.PI) * 0.14);
      const y = 0.56 + t * 1.15;
      dummy.position.set(x, y, 0);
      dummy.rotation.set(idx % 2 ? 0.9 : -0.2, idx % 2 ? 0.4 : -0.4, side * 0.52);
      dummy.updateMatrix();
      chainInst.setMatrixAt(i, dummy.matrix);
    }
    chainInst.instanceMatrix.needsUpdate = true;
    chainInst.computeBoundingSphere();
    registerPart(root, chainInst, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.55, 0));

    // 7. Dewdrop Pearl / Gold Tip Accent at Bottom of Leaf
    const tipDrop = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), mats.pearlMat);
    registerPart(root, tipDrop, new THREE.Vector3(0.03, -1.26, 0), new THREE.Vector3(0, -0.65, 0));
  } else if (type === 'ear') {
    // 1. Shepherd's Hook Ear Wire (TubeGeometry)
    const hookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 0.95, 0),
      new THREE.Vector3(-0.08, 1.38, 0),
      new THREE.Vector3(0.22, 1.34, 0),
      new THREE.Vector3(0.24, 0.92, 0),
      new THREE.Vector3(0.02, 0.62, 0),
      new THREE.Vector3(0, 0.42, 0),
    ]);
    const hookGeo = new THREE.TubeGeometry(hookCurve, 32, 0.028, 12, false);
    const hook = new THREE.Mesh(hookGeo, mats.polishedGold);
    registerPart(root, hook, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.55, 0));

    // 2. Accent Gold Spacer Bead
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), mats.satinGold);
    registerPart(root, bead, new THREE.Vector3(0, 0.36, 0), new THREE.Vector3(0, 0.3, 0.2));

    // 3. Outer Teardrop Gold Frame (Lathe/Torus scaled)
    const frameGeo = new THREE.TorusGeometry(0.46, 0.055, 20, 48);
    frameGeo.scale(0.76, 1.15, 0.76);
    const frame = new THREE.Mesh(frameGeo, mats.polishedGold);
    frame.castShadow = true;
    registerPart(root, frame, new THREE.Vector3(0, -0.22, 0), new THREE.Vector3(0, 0, -0.35));

    // 4. Inner Satin Bezel Ring
    const innerFrameGeo = new THREE.TorusGeometry(0.32, 0.03, 16, 40);
    innerFrameGeo.scale(0.76, 1.12, 0.76);
    const innerFrame = new THREE.Mesh(innerFrameGeo, mats.satinGold);
    registerPart(root, innerFrame, new THREE.Vector3(0, -0.22, 0), new THREE.Vector3(0, 0, 0.25));

    // 5. Suspended Faceted Teardrop Gemstone
    const gemGeo = createBrilliantGemGeometry(0.24, 0.44);
    gemGeo.rotateX(Math.PI);
    const gem = new THREE.Mesh(gemGeo, mats.gemMat);
    registerPart(root, gem, new THREE.Vector3(0, -0.22, 0), new THREE.Vector3(0, 0, 0.6));

    // 6. Pearl Cup Cap
    const cupGeo = new THREE.CylinderGeometry(0.05, 0.13, 0.09, 16);
    const cup = new THREE.Mesh(cupGeo, mats.satinGold);
    registerPart(root, cup, new THREE.Vector3(0, -0.84, 0), new THREE.Vector3(0, -0.35, 0));

    // 7. Cultured South Sea Pearl Drop
    const pearlGeo = new THREE.SphereGeometry(0.21, 28, 24);
    pearlGeo.scale(0.95, 1.08, 0.95);
    const pearl = new THREE.Mesh(pearlGeo, mats.pearlMat);
    pearl.castShadow = true;
    registerPart(root, pearl, new THREE.Vector3(0, -1.04, 0), new THREE.Vector3(0, -0.68, 0));
  } else {
    // Bracelet ('brace'): Three-Stone Hinged Bangle
    // 1. Primary Elliptical 18K Gold Bangle Band
    const bangleGeo = new THREE.TorusGeometry(0.98, 0.095, 24, 64);
    bangleGeo.scale(1.16, 0.84, 1);
    const bangle = new THREE.Mesh(bangleGeo, mats.polishedGold);
    bangle.castShadow = true;
    registerPart(root, bangle, new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0, -0.35));

    // 2. Inner Comfort-Fit Satin Lining
    const innerBangleGeo = new THREE.TorusGeometry(0.91, 0.055, 18, 56);
    innerBangleGeo.scale(1.16, 0.84, 1);
    const innerBangle = new THREE.Mesh(innerBangleGeo, mats.satinGold);
    registerPart(root, innerBangle, new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0, 0.35));

    // 3. Three Bezel Settings & 3 Brilliant Gemstones along lower arc
    const angles = [-0.38, 0, 0.38];
    const radii = [0.14, 0.19, 0.14];
    angles.forEach((da, i) => {
      const a = -Math.PI / 2 + da;
      const x = Math.cos(a) * 0.98 * 1.16;
      const y = 0.05 + Math.sin(a) * 0.98 * 0.84;
      const r = radii[i];

      const collet = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 1.12, r * 1.05, 0.14, 24).rotateX(Math.PI / 2),
        mats.satinGold
      );
      registerPart(
        root,
        collet,
        new THREE.Vector3(x, y, 0.06),
        new THREE.Vector3(x * 0.25, -0.25, 0.32)
      );

      const gMesh = new THREE.Mesh(
        createBrilliantGemGeometry(r, r * 1.2).rotateX(Math.PI / 2),
        mats.gemMat
      );
      registerPart(
        root,
        gMesh,
        new THREE.Vector3(x, y, 0.14),
        new THREE.Vector3(x * 0.35, -0.45, 0.68)
      );
    });

    // 4. Top Bail & Silk Suspension Cord
    const topBail = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 12, 24), mats.satinGold);
    registerPart(root, topBail, new THREE.Vector3(0, 0.94, 0), new THREE.Vector3(0, 0.35, 0));

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 8), mats.cordMat);
    registerPart(root, cord, new THREE.Vector3(0, 1.56, 0), new THREE.Vector3(0, 0.65, 0));
  }

  return root;
}
