import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  detectSoftwareGl,
  createBrushedMetalMap,
  createContactShadowTexture,
  createJewelMaterials,
  buildJewelGroup,
  GOLD_COLORS,
  GEM_COLORS,
} from '../three/jewelBuilder';
import {
  GOLD,
  GEM,
  toFa,
  type JewelType,
  type GoldCode,
  type GemCode,
} from '../utils/storeLogic';

// Pre-allocated module-scope vectors to avoid GC in animation loop
const _targetPos = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export type CameraPreset = 'front' | 'macro' | 'side';

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; look: [number, number, number] }> = {
  front: { pos: [0, 0.2, 4.9], look: [0, -0.32, 0] },
  macro: { pos: [0.4, -0.7, 2.55], look: [0, -0.7, 0] },
  side: { pos: [3.9, 0.35, 2.45], look: [0, -0.32, 0] },
};

interface Jewel3DStudioProps {
  jewelType: JewelType;
  gold: GoldCode;
  gem: GemCode;
  night: boolean;
  onGoldChange?: (gold: GoldCode) => void;
  onTypeChange?: (type: JewelType) => void;
  showTypeSelector?: boolean;
  compact?: boolean;
}

export const Jewel3DStudio: React.FC<Jewel3DStudioProps> = ({
  jewelType,
  gold,
  gem,
  night,
  onGoldChange,
  onTypeChange,
  showTypeSelector = false,
  compact = false,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [exploded, setExploded] = useState(0);
  const [camPreset, setCamPreset] = useState<CameraPreset>('front');
  const [autoSpin, setAutoSpin] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Store mutable state in ref so WebGL canvas never tears down on UI updates
  const stateRef = useRef({
    jewelType,
    gold,
    gem,
    night,
    exploded: 0,
    camPreset: 'front' as CameraPreset,
    autoSpin: true,
    camAnimating: false,
  });

  const sceneRef = useRef<{
    requestRender: () => void;
    rebuildModel: (t: JewelType) => void;
    updateColors: (g: GoldCode, m: GemCode, n: boolean) => void;
  } | null>(null);

  useEffect(() => {
    stateRef.current.exploded = exploded;
    sceneRef.current?.requestRender();
  }, [exploded]);

  useEffect(() => {
    stateRef.current.autoSpin = autoSpin;
    sceneRef.current?.requestRender();
  }, [autoSpin]);

  useEffect(() => {
    stateRef.current.camPreset = camPreset;
    stateRef.current.camAnimating = true;
    sceneRef.current?.requestRender();
  }, [camPreset]);

  useEffect(() => {
    const prevType = stateRef.current.jewelType;
    stateRef.current.jewelType = jewelType;
    stateRef.current.gold = gold;
    stateRef.current.gem = gem;
    stateRef.current.night = night;
    if (sceneRef.current) {
      if (prevType !== jewelType) {
        sceneRef.current.rebuildModel(jewelType);
      }
      sceneRef.current.updateColors(gold, gem, night);
      sceneRef.current.requestRender();
    }
  }, [jewelType, gold, gem, night]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareGl();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w0 = Math.max(280, mount.clientWidth || 480);
    const h0 = Math.max(280, mount.clientHeight || 480);
    renderer.setSize(w0, h0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = stateRef.current.night ? 0x12243b : 0xf4e6d2;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.065);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, w0 / h0, 0.1, 50);
    camera.position.set(0, 0.2, 4.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.target.set(0, -0.32, 0);

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      stateRef.current.night ? 0x6ea8e5 : 0xfff8ee,
      stateRef.current.night ? 0x0a1626 : 0x6b5443,
      0.85
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(3.2, 4.8, 3.5);
    keyLight.castShadow = !isSoftwareGl;
    const d = 2.4;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf6c9a0, 1.35);
    rimLight.position.set(-3.5, 2.4, -2.8);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox1 = new THREE.RectAreaLight(0xfff7eb, 3.5, 2.5, 2.5);
      softbox1.position.set(-2.5, 2.2, 2.5);
      softbox1.lookAt(0, 0, 0);
      scene.add(softbox1);
    }

    // Subtle Studio Pedestal Ring at bottom
    const pedGeo = new THREE.CylinderGeometry(1.55, 1.68, 0.08, 48);
    const pedMat = new THREE.MeshStandardMaterial({
      color: stateRef.current.night ? 0x19314d : 0xead8be,
      roughness: 0.78,
      metalness: 0.08,
    });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.set(0, -1.61, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const bumpMap = createBrushedMetalMap(renderer);
    const shadowTex = createContactShadowTexture();
    const mats = createJewelMaterials(
      stateRef.current.gold,
      stateRef.current.gem,
      isSoftwareGl,
      bumpMap,
      shadowTex
    );

    let jewelGroup = buildJewelGroup(stateRef.current.jewelType, mats);
    jewelGroup.rotation.set(0.14, 0.42, 0);
    scene.add(jewelGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepScene(dt: number): boolean {
      let active = false;
      const st = stateRef.current;

      // Smoothly damp exploded view positions on every part
      for (const child of jewelGroup.children) {
        const basePos = child.userData.basePos as THREE.Vector3 | undefined;
        const expPos = child.userData.explodedPos as THREE.Vector3 | undefined;
        if (basePos && expPos) {
          _targetPos.lerpVectors(basePos, expPos, st.exploded);
          const dist = child.position.distanceToSquared(_targetPos);
          if (dist > 0.00001) {
            const k = 1 - Math.exp(-10 * dt);
            child.position.lerp(_targetPos, k);
            active = true;
          } else {
            child.position.copy(_targetPos);
          }
        }
      }

      // Smoothly damp camera preset transition if active
      if (st.camAnimating) {
        const preset = CAMERA_PRESETS[st.camPreset];
        _camTargetPos.set(...preset.pos);
        _lookTarget.set(...preset.look);
        const k = 1 - Math.exp(-8 * dt);
        camera.position.lerp(_camTargetPos, k);
        controls.target.lerp(_lookTarget, k);
        if (
          camera.position.distanceToSquared(_camTargetPos) < 0.0005 &&
          controls.target.distanceToSquared(_lookTarget) < 0.0005
        ) {
          camera.position.copy(_camTargetPos);
          controls.target.copy(_lookTarget);
          st.camAnimating = false;
        } else {
          active = true;
        }
      }

      // Gentle auto-rotation on GPU (skip continuous spin on software GL so screenshots settle immediately)
      if (st.autoSpin && !isSoftwareGl) {
        jewelGroup.rotation.y += dt * 0.55;
        jewelGroup.position.y = Math.sin(performance.now() * 0.0018) * 0.04;
        active = true;
      }

      if (controls.update()) {
        active = true;
      }

      return active;
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        const stillMoving = stepScene(dt);
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty || stillMoving) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    const onControlStart = () => {
      stateRef.current.camAnimating = false;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = Math.max(200, mount.clientWidth);
      const h = Math.max(200, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    ro.observe(mount);

    sceneRef.current = {
      requestRender,
      rebuildModel: (newType: JewelType) => {
        scene.remove(jewelGroup);
        jewelGroup.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).geometry?.dispose();
          }
        });
        jewelGroup = buildJewelGroup(newType, mats);
        jewelGroup.rotation.set(0.14, 0.42, 0);
        scene.add(jewelGroup);
      },
      updateColors: (g: GoldCode, m: GemCode, n: boolean) => {
        const gCol = GOLD_COLORS[g];
        const mCol = GEM_COLORS[m];
        mats.polishedGold.color.setHex(gCol.main);
        mats.satinGold.color.setHex(gCol.satin);
        mats.gemMat.color.setHex(mCol.color);
        mats.gemMat.emissive.setHex(mCol.emissive);
        mats.gemMat.attenuationColor.setHex(mCol.atten);
        const bg = n ? 0x12243b : 0xf4e6d2;
        (scene.background as THREE.Color).setHex(bg);
        if (scene.fog) scene.fog.color.setHex(bg);
        pedMat.color.setHex(n ? 0x19314d : 0xead8be);
        hemiLight.color.setHex(n ? 0x6ea8e5 : 0xfff8ee);
        hemiLight.groundColor.setHex(n ? 0x0a1626 : 0x6b5443);
      },
    };

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const JEWEL_NAMES: Record<JewelType, string> = {
    ring: 'حلقه سولیتر',
    neck: 'گردنبند برگ نی',
    ear: 'گوشواره قطره',
    brace: 'النگو سه‌نگین',
  };

  return (
    <div className="j3d-root" data-testid="threejs-studio">
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={canvasMountRef} className="j3d-canvas" />

      {/* Minimal top-right spec badge */}
      <div className="j3d-badge">
        <span>آتلیه سه‌بعدی NEY</span>
        <span aria-hidden="true">·</span>
        <span>طلای {GOLD[gold]} {toFa(18)} عیار</span>
        <span aria-hidden="true">·</span>
        <span>نگین {GEM[gem]}</span>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Solid surface, zero backdrop-filter over WebGL) */}
      <div className={`j3d-dock-wrap ${dockCollapsed ? 'collapsed' : ''} ${compact ? 'compact' : ''}`}>
        <button
          type="button"
          className="j3d-dock-toggle"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
        >
          {dockCollapsed ? '▴ نمایش پنل کنترل سه‌بعدی' : '▾ پنهان کردن پنل'}
        </button>

        <div className="j3d-dock" role="toolbar" aria-label="کنترل‌های نمای سه‌بعدی">
          {showTypeSelector && onTypeChange && (
            <div className="j3d-ctrl-group">
              <span className="j3d-lbl">مدل</span>
              <div className="j3d-pills">
                {(['ring', 'neck', 'ear', 'brace'] as JewelType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`j3d-pill ${jewelType === t ? 'on' : ''}`}
                    onClick={() => onTypeChange(t)}
                  >
                    {JEWEL_NAMES[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {onGoldChange && (
            <div className="j3d-ctrl-group">
              <span className="j3d-lbl">طلا</span>
              <div className="j3d-swatches">
                {(['y', 'r', 'w'] as GoldCode[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`s-sw ${gold === g ? 'on' : ''}`}
                    data-v={g}
                    onClick={() => onGoldChange(g)}
                    aria-label={`طلای ${GOLD[g]}`}
                    title={`طلای ${GOLD[g]}`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="j3d-ctrl-group">
            <span className="j3d-lbl">زاویه</span>
            <div className="j3d-pills">
              {(
                [
                  ['front', 'رو‌به‌رو'],
                  ['macro', 'ماکرو نگین'],
                  ['side', 'نیم‌رخ'],
                ] as [CameraPreset, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`j3d-pill ${camPreset === k ? 'on' : ''}`}
                  onClick={() => setCamPreset(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="j3d-ctrl-group j3d-slider-group">
            <label htmlFor="j3d-exp" className="j3d-lbl">
              آناتومی ساخت ({toFa(Math.round(exploded * 100))}٪)
            </label>
            <input
              id="j3d-exp"
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={exploded}
              onChange={(e) => setExploded(parseFloat(e.target.value))}
              aria-label="نمای انفجاری اجزای جواهر"
            />
          </div>

          <button
            type="button"
            className={`j3d-pill ${autoSpin ? 'on' : ''}`}
            onClick={() => setAutoSpin((s) => !s)}
            aria-pressed={autoSpin}
          >
            {autoSpin ? 'چرخش خودکار: روشن' : 'چرخش خودکار: خاموش'}
          </button>
        </div>
      </div>
    </div>
  );
};
