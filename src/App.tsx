import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PRODUCTS,
  CAT,
  CATD,
  GOLD,
  GEM,
  DESC,
  OPTS,
  OPTN,
  FREE_SHIPPING_THRESHOLD,
  byId,
  defOpt,
  toFa,
  fmt,
  lerp,
  clamp,
  f1,
  mulberry,
  D,
  rough,
  circ,
  ellipse,
  filterAndSortProducts,
  searchProducts,
  addOrIncrementCartItem,
  updateCartItemQty,
  calcSubtotal,
  calcShippingCost,
  validateCheckoutForm,
  type Product,
  type CartItem,
  type CategoryId,
  type JewelType,
  type GoldCode,
  type GemCode,
  type SortMode,
} from './utils/storeLogic';
import {
  paper,
  ridgeFn,
  sampleRidge,
  crest,
  pine,
  cloud,
  fern,
  mushroom,
  foxglove,
  cottage,
  blade,
  leafSVG,
  makeGrain,
  clipTag,
  jewelSVG,
  bflySVG,
  ic,
  SJ,
  jsvg,
} from './utils/forestSceneGen';
import { Jewel3DStudio } from './components/Jewel3DStudio';
import { detectSoftwareGl } from './three/jewelBuilder';

const LDEF = [
  { id: 'sky', f: 0 },
  { id: 'cel', f: 0.03 },
  { id: 'far', f: 0.06, sh: [1, 2, 9] as [number, number, number] },
  { id: 'hills', f: 0.11, sh: [2, 2, 10] as [number, number, number] },
  { id: 'fpines', f: 0.17, sh: [2, 2, 11] as [number, number, number] },
  { id: 'meadow', f: 0.25, sh: [2, 3, 12] as [number, number, number] },
  { id: 'npines', f: 0.35, sh: [3, 3, 14] as [number, number, number] },
  { id: 'ground', f: 0.47, sh: [3, 4, 15] as [number, number, number] },
  { id: 'ff', f: 0.56 },
  { id: 'grass', f: 0.72, sh: [3, 4, 16] as [number, number, number] },
  { id: 'leaves', f: 0.95 },
];

interface StageJewelDef {
  id: JewelType;
  seed: number;
  name: string;
  sub: string;
  href: string;
  xs: [number, number];
  Ls: [number, number];
  w: number;
  h: number;
  perch: number;
  gem: [number, number];
}

const JW_DEFS: StageJewelDef[] = [
  {
    id: 'neck',
    seed: 301,
    name: 'گردنبند برگ نی',
    sub: 'طلای ۱۸ عیار · یاقوت',
    href: '#p/4',
    xs: [0.3, 0.1],
    Ls: [0.24, 0.29],
    w: 90,
    h: 120,
    perch: 79,
    gem: [0, 90],
  },
  {
    id: 'ring',
    seed: 302,
    name: 'حلقه سولیتر',
    sub: 'طلای ۱۸ عیار · الماس',
    href: '#p/1',
    xs: [0.41, 0.235],
    Ls: [0.14, 0.19],
    w: 56,
    h: 72,
    perch: 9,
    gem: [0, 60],
  },
  {
    id: 'ear',
    seed: 303,
    name: 'گوشواره قطره',
    sub: 'طلای ۱۸ عیار · زمرد',
    href: '#p/7',
    xs: [0.52, 0.36],
    Ls: [0.2, 0.24],
    w: 40,
    h: 78,
    perch: 35,
    gem: [0.5, 47],
  },
];

export default function App() {
  // Theme state (synced to document.documentElement.classList 'night')
  const [night, setNightState] = useState<boolean>(false);
  const nightRef = useRef<boolean>(false);
  const ffUntilRef = useRef<number>(0);

  // Route state
  const [hash, setHash] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('autostart') === '1' &&
      (!window.location.hash || window.location.hash === '#home')
    ) {
      return 'shop';
    }
    return decodeURIComponent(window.location.hash.slice(1));
  });

  // Store state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ney-cart') || '[]') ?? [];
    } catch {
      return [];
    }
  });
  const [wish, setWish] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ney-wish') || '[]') ?? [];
    } catch {
      return [];
    }
  });
  const [cartBump, setCartBump] = useState<boolean>(false);

  // Filter state on listing page
  const [fGold, setFGold] = useState<GoldCode | null>(null);
  const [fGem, setFGem] = useState<GemCode | null>(null);
  const [fSort, setFSort] = useState<SortMode>('rec');

  // PDP state
  const [pdGold, setPdGold] = useState<GoldCode>('y');
  const [pdOpt, setPdOpt] = useState<string>('۵۲');
  const [pdQty, setPdQty] = useState<number>(1);
  const [pdpSpin, setPdpSpin] = useState<boolean>(false);
  const [pdpMode, setPdpMode] = useState<'paper' | '3d'>('paper');

  // Hero 3D toggle state
  const [heroMode, setHeroMode] = useState<'paper' | '3d'>('paper');
  const [hero3DType, setHero3DType] = useState<JewelType>('neck');
  const [hero3DGold, setHero3DGold] = useState<GoldCode>('y');

  // Fullscreen 3D Atelier Modal state
  const [atelierOpen, setAtelierOpen] = useState<boolean>(false);
  const [atelierType, setAtelierType] = useState<JewelType>('ring');
  const [atelierGold, setAtelierGold] = useState<GoldCode>('y');
  const [atelierGem, setAtelierGem] = useState<GemCode>('dia');

  // Drawers & Toast
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastText, setToastText] = useState<string>('');
  const [newsError, setNewsError] = useState<boolean>(false);
  const [newsEmail, setNewsEmail] = useState<string>('');

  // Checkout state
  const [coName, setCoName] = useState<string>('');
  const [coPhone, setCoPhone] = useState<string>('');
  const [coCity, setCoCity] = useState<string>('');
  const [coZip, setCoZip] = useState<string>('');
  const [coAddr, setCoAddr] = useState<string>('');
  const [coShip, setCoShip] = useState<'post' | 'courier'>('post');
  const [coGift, setCoGift] = useState<boolean>(false);
  const [coPay, setCoPay] = useState<'online' | 'card'>('online');
  const [coErrors, setCoErrors] = useState<{
    name: boolean;
    phone: boolean;
    city: boolean;
    addr: boolean;
  }>({ name: false, phone: false, city: false, addr: false });
  const [lastOrder, setLastOrder] = useState<{
    name: string;
    code: string;
    total: number;
    ship: 'post' | 'courier';
  } | null>(null);

  // Refs for DOM & animation loop
  const stageRef = useRef<HTMLDivElement>(null);
  const grainImgRef = useRef<SVGImageElement>(null);
  const titleHangRef = useRef<HTMLDivElement>(null);
  const titleTagRef = useRef<HTMLDivElement>(null);
  const shopTagRef = useRef<HTMLElement>(null);
  const toggleHangRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const jewelsRef = useRef<HTMLDivElement>(null);
  const bflyRef = useRef<HTMLButtonElement>(null);
  const spkWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sparkFnRef = useRef<
    (
      x: number,
      y: number,
      n: number,
      o?: {
        a?: number;
        spread?: number;
        v?: number;
        vx?: number;
        vy?: number;
        life?: number;
        sz?: number;
        g?: number;
      }
    ) => void
  >(() => {});
  const appOpenRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number>(0);

  // Sync cart & wish to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ney-cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('ney-wish', JSON.stringify(wish));
    } catch {
      // ignore
    }
  }, [wish]);

  const setNight = useCallback((on: boolean) => {
    nightRef.current = on;
    setNightState(on);
    document.documentElement.classList.toggle('night', on);
    if (!on) {
      ffUntilRef.current = performance.now() + 3200;
    }
  }, []);

  const toast = useCallback((msg: string) => {
    setToastText(msg);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastText('');
    }, 2400);
  }, []);

  const burstElement = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    sparkFnRef.current(r.left + r.width / 2, r.top + r.height / 2, 14, {
      v: 130,
      life: 1000,
      sz: 8,
      g: 40,
    });
  }, []);

  // Parse current route
  const [routeA, routeB] = hash.split('/');
  const isValidStoreRoute =
    Boolean(hash) &&
    hash !== 'home' &&
    ['shop', 'p', 'wish', 'checkout', 'done', ...Object.keys(CAT)].includes(routeA);

  useEffect(() => {
    appOpenRef.current = isValidStoreRoute || atelierOpen;
  }, [isValidStoreRoute, atelierOpen]);

  // Listen to hashchange
  useEffect(() => {
    const onHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      setHash(h);
      setCartOpen(false);
      setSearchOpen(false);
      setAtelierOpen(false);
      const [a, b] = h.split('/');
      if (!h || h === 'home') {
        document.title = 'NEY | طلا و جواهر دست‌ساز';
      } else if (a === 'shop' && !b) {
        document.title = 'فروشگاه NEY | طلا و جواهر';
      } else if (a === 'shop' || CAT[a as CategoryId]) {
        const c = (b || a) as CategoryId;
        document.title = (CAT[c] || 'همه محصولات') + ' | NEY';
      } else if (a === 'p') {
        const p = byId(Number(b));
        if (p) {
          setPdGold(p.gold);
          setPdOpt(defOpt(p));
          setPdQty(1);
        }
        document.title = (p ? p.name : 'محصول') + ' | NEY';
      } else if (a === 'wish') {
        document.title = 'علاقه‌مندی‌ها | NEY';
      } else if (a === 'checkout') {
        document.title = 'تکمیل خرید | NEY';
      } else if (a === 'done') {
        document.title = 'سفارش ثبت شد | NEY';
      }
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.style.scrollBehavior = 'auto';
        appEl.scrollTop = 0;
        appEl.style.scrollBehavior = '';
      }
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Escape key closes drawers & 3D modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false);
        setSearchOpen(false);
        setAtelierOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 250);
      return () => window.clearTimeout(t);
    }
  }, [searchOpen]);

  // Initialize Forest Stage, Hanging Jewels, Butterfly, and Animation Loop
  useEffect(() => {
    const root = document.documentElement;
    const stage = stageRef.current;
    const jwWrap = jewelsRef.current;
    const bfEl = bflyRef.current;
    const spkWrap = spkWrapRef.current;
    const titleHang = titleHangRef.current;
    const toggleHang = toggleHangRef.current;
    if (!stage || !jwWrap || !bfEl || !spkWrap || !titleHang || !toggleHang) return;

    const isSoftwareGl = detectSoftwareGl();
    root.classList.toggle('sw-gl', isSoftwareGl);
    const reduce =
      isSoftwareGl || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    // 1. Paper grain
    const grainURL = makeGrain();
    if (grainImgRef.current) {
      grainImgRef.current.setAttribute('href', grainURL);
    }
    root.style.setProperty('--grain-url', `url(${grainURL})`);

    // 2. Build layer containers
    stage.innerHTML = '';
    const layers: Record<
      string,
      {
        id: string;
        f: number;
        sh?: [number, number, number];
        el: HTMLDivElement;
        lx: number;
        ly: number;
      }
    > = {};
    LDEF.forEach((d, i) => {
      const el = document.createElement('div');
      el.className = 'layer l-' + d.id;
      el.style.setProperty('--i', String(i));
      el.style.setProperty('--d', i * 110 + 'ms');
      stage.appendChild(el);
      layers[d.id] = { ...d, el, lx: 1e9, ly: 1e9 };
    });

    const shStyle = (a?: [number, number, number]) =>
      a
        ? `filter:drop-shadow(0 -1px 0 var(--edge)) drop-shadow(${a[0]}px ${a[1]}px ${a[2]}px var(--shadow))`
        : '';

    const V: {
      vw: number;
      vh: number;
      pad: number;
      padY: number;
      W: number;
      H: number;
      P: number;
      s: number;
      k: number;
      fG?: (x: number) => number;
      gxl?: number;
      gxr?: number;
      perches: [number, number][];
    } = {
      vw: window.innerWidth,
      vh: window.innerHeight,
      pad: 0,
      padY: 0,
      W: 0,
      H: 0,
      P: 0,
      s: 0,
      k: 0,
      perches: [],
    };

    // 3. Sparkles pool
    interface SparkItem {
      el: HTMLElement;
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
      sz: number;
      rot: number;
      g: number;
    }
    const sparks: SparkItem[] = [];
    const spkPool: HTMLElement[] = [];

    function spark(
      x: number,
      y: number,
      n: number,
      o: {
        a?: number;
        spread?: number;
        v?: number;
        vx?: number;
        vy?: number;
        life?: number;
        sz?: number;
        g?: number;
      } = {}
    ) {
      for (let i = 0; i < n && sparks.length < 80; i++) {
        let el = spkPool.pop();
        if (!el) {
          el = document.createElement('i');
          spkWrap!.appendChild(el);
        }
        el.className = 'spk' + (Math.random() < 0.5 ? ' au' : '');
        el.style.display = '';
        const a =
          o.a != null
            ? o.a + (Math.random() - 0.5) * (o.spread ?? 6.283)
            : Math.random() * 6.283;
        const sp = (o.v ?? 60) * (0.35 + Math.random() * 0.9);
        sparks.push({
          el,
          x,
          y,
          vx: Math.cos(a) * sp + (o.vx || 0),
          vy: Math.sin(a) * sp + (o.vy || 0),
          life: 0,
          max: ((o.life ?? 900) * (0.6 + Math.random() * 0.7)) / 1000,
          sz: (o.sz ?? 7) * (0.6 + Math.random() * 0.8),
          rot: Math.random() * 90,
          g: o.g ?? 30,
        });
      }
    }
    sparkFnRef.current = spark;

    function sparkTick(dt: number) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          p.el.style.display = 'none';
          spkPool.push(p.el);
          sparks.splice(i, 1);
          continue;
        }
        const dmp = Math.exp(-dt * 2.4);
        p.vx *= dmp;
        p.vy = p.vy * dmp + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += 120 * dt;
        const q = p.life / p.max;
        const a = q < 0.18 ? q / 0.18 : 1 - (q - 0.18) / 0.82;
        p.el.style.transform = `translate3d(${(p.x - 5).toFixed(1)}px,${(p.y - 5).toFixed(
          1
        )}px,0) rotate(${p.rot.toFixed(0)}deg) scale(${(
          (p.sz / 10) *
          (0.4 + 0.6 * a)
        ).toFixed(2)})`;
        p.el.style.opacity = a.toFixed(2);
      }
    }

    // 4. Hanging Jewels setup
    interface RuntimeJewel extends StageJewelDef {
      el: HTMLDivElement;
      btn: HTMLButtonElement;
      svg: SVGSVGElement;
      thr: HTMLSpanElement;
      jlab: HTMLDivElement;
      lab: HTMLDivElement;
      link: HTMLAnchorElement;
      btn3d: HTMLButtonElement;
      th: number;
      om: number;
      drag: { x0: number; y0: number; moved: number; target: number | null } | null;
      spin: { t0: number } | null;
      ph: number;
      open: boolean;
      js: number;
      px: number;
      L: number;
    }

    jwWrap.innerHTML = '';
    const JW: RuntimeJewel[] = JW_DEFS.map((def, i) => {
      const el = document.createElement('div');
      el.className = 'jw';
      el.style.setProperty('--di', String(i));
      el.style.setProperty('--d', '0ms');
      el.innerHTML = `<div class="jw-drop"><span class="jthread"></span><button class="jgem" type="button" aria-expanded="false" aria-label="${def.name} — بکشید تا تاب بخورد، بزنید تا جزئیات را ببینید">${jewelSVG(
        def
      )}</button><div class="jlab"><span class="thread"></span><div class="tag jlabel"><b>${
        def.name
      }</b><small>${def.sub}</small><div class="jlabel-actions"><a href="${
        def.href
      }" tabindex="-1">مشاهده جزئیات</a><button type="button" class="j3d-open-btn" tabindex="-1">نمای سه‌بعدی</button></div></div></div></div>`;
      jwWrap.appendChild(el);
      const J: RuntimeJewel = {
        ...def,
        el,
        btn: el.querySelector('.jgem') as HTMLButtonElement,
        svg: el.querySelector('.jgem svg') as SVGSVGElement,
        thr: el.querySelector('.jthread') as HTMLSpanElement,
        jlab: el.querySelector('.jlab') as HTMLDivElement,
        lab: el.querySelector('.jlabel') as HTMLDivElement,
        link: el.querySelector('.jlabel a') as HTMLAnchorElement,
        btn3d: el.querySelector('.j3d-open-btn') as HTMLButtonElement,
        th: 0,
        om: 0,
        drag: null,
        spin: null,
        ph: Math.random() * 6.283,
        open: false,
        js: 1,
        px: 0,
        L: 100,
      };

      J.btn3d.addEventListener('click', (e) => {
        e.stopPropagation();
        setAtelierType(J.id);
        setAtelierGold('y');
        setAtelierGem(J.id === 'neck' ? 'ruby' : J.id === 'ear' ? 'em' : 'dia');
        setAtelierOpen(true);
      });

      J.btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        J.btn.setPointerCapture(e.pointerId);
        J.drag = { x0: e.clientX, y0: e.clientY, moved: 0, target: null };
      });
      J.btn.addEventListener('pointermove', (e) => {
        const d = J.drag;
        if (!d) return;
        d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x0, e.clientY - d.y0));
        if (d.moved > 5) {
          d.target = clamp(
            Math.atan2(-(e.clientX - J.px), Math.max(30, e.clientY)),
            -1.15,
            1.15
          );
        }
      });
      const end = () => {
        const d = J.drag;
        J.drag = null;
        if (d && d.moved < 6) jewelClick(J);
      };
      J.btn.addEventListener('pointerup', end);
      J.btn.addEventListener('pointercancel', () => {
        J.drag = null;
      });
      J.btn.addEventListener('click', (e) => {
        if (e.detail === 0) jewelClick(J);
      });

      return J;
    });

    function jewelAt(J: RuntimeJewel, v: number): [number, number] {
      const s = Math.sin(J.th);
      const c = Math.cos(J.th);
      return [J.px - v * s, v * c];
    }
    function gemPos(J: RuntimeJewel): [number, number] {
      const g = J.gem;
      const s = Math.sin(J.th);
      const c = Math.cos(J.th);
      const u = g[0] * J.js;
      const v = J.L + g[1] * J.js;
      return [J.px + u * c - v * s, u * s + v * c];
    }
    function setOpen(J: RuntimeJewel, on: boolean) {
      J.open = on;
      J.el.classList.toggle('open', on);
      J.btn.setAttribute('aria-expanded', String(on));
      J.link.tabIndex = on ? 0 : -1;
      J.btn3d.tabIndex = on ? 0 : -1;
      if (on) {
        const lw = J.lab.offsetWidth;
        const l = J.px - lw / 2;
        const r = J.px + lw / 2;
        J.jlab.style.setProperty(
          '--sx',
          (l < 10 ? 10 - l : r > V.vw - 10 ? V.vw - 10 - r : 0).toFixed(0) + 'px'
        );
      }
    }
    function jewelClick(J: RuntimeJewel) {
      const now = performance.now();
      J.spin = { t0: now };
      J.om += (Math.random() < 0.5 ? -1 : 1) * 1.4;
      const g = gemPos(J);
      spark(g[0], g[1], 16, { v: 120, life: 1100, sz: 9, g: 40 });
      JW.forEach((o) => {
        if (o !== J && o.open) setOpen(o, false);
      });
      setOpen(J, !J.open);
      if (
        bf.mode === 'perched' &&
        bf.perch &&
        bf.perch.t === 'jw' &&
        JW[bf.perch.j!] === J
      ) {
        fleeFrom(g[0], g[1] + 40, now);
      }
    }

    const onDocPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest('.jw')) {
        JW.forEach((J) => J.open && setOpen(J, false));
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);

    function layoutJewels() {
      const narrow = V.vw / V.vh < 0.8;
      const js = clamp(V.s / 700, 0.82, 1.2);
      JW.forEach((J) => {
        J.js = js;
        J.px = V.vw * J.xs[narrow ? 1 : 0];
        J.L = Math.round(V.vh * J.Ls[narrow ? 1 : 0]);
        const W = J.w * js;
        const H = J.h * js;
        J.el.style.left = f1(J.px - W / 2) + 'px';
        J.el.style.width = f1(W) + 'px';
        J.thr.style.height = J.L + 'px';
        J.btn.style.width = f1(W) + 'px';
        J.btn.style.height = f1(H) + 'px';
        if (J.open) setOpen(J, true);
      });
    }

    function brush(x: number, y: number, dx: number, dy: number) {
      for (const J of JW) {
        if (J.drag) continue;
        const s = Math.sin(J.th);
        const c = Math.cos(J.th);
        const rx = x - J.px;
        const u = rx * c + y * s;
        const v = -rx * s + y * c;
        const bot = J.L + J.h * J.js;
        const hw = J.w * J.js * 0.5;
        let hit = 0;
        if (v > J.L && v < bot && Math.abs(u) < hw) hit = 1;
        else if (v > 0 && v <= J.L && Math.abs(u) < 6) hit = 0.45;
        if (!hit) continue;
        const du = dx * c + dy * s;
        J.om -= clamp((du / Math.max(40, v)) * 4.2 * hit, -1.4, 1.4);
        if (hit === 1 && Math.abs(du) > 5 && Math.random() < 0.4) {
          const g = gemPos(J);
          spark(g[0], g[1], 1, { v: 50, sz: 6 });
        }
      }
    }

    // 5. Butterfly setup
    bfEl.innerHTML = bflySVG();
    const bwl = bfEl.querySelector('.wl') as SVGGElement;
    const bwr = bfEl.querySelector('.wr') as SVGGElement;
    const bf = {
      x: -200,
      y: -200,
      vx: 0,
      vy: 0,
      ang: 90,
      mode: 'wander' as 'wander' | 'visit' | 'toPerch' | 'perched' | 'flee' | 'dance',
      tx: 0,
      ty: 0,
      until: 0,
      perch: null as { t: 'scene' | 'jw' | 'air'; i?: number; j?: number; x?: number; y?: number } | null,
      pAng: 0,
      ph: 0,
      dust: 0,
      init: false,
      S: 60,
      seed: Math.random() * 9,
      dance: null as { t0: number; cx: number; cy: number; a0: number; dir: number } | null,
      start: 0,
    };

    function layoutBfly() {
      bf.S = clamp(V.s * 0.085, 46, 80);
      bfEl!.style.width = f1(bf.S) + 'px';
      bfEl!.style.height = f1(bf.S * 0.92) + 'px';
    }

    const angLerp = (a: number, b: number, k: number) => {
      const d = (((b - a) % 360) + 540) % 360 - 180;
      return a + d * clamp(k, 0, 1);
    };

    function perchPos(p: NonNullable<typeof bf.perch>): [number, number, number] {
      if (p.t === 'jw' && p.j != null) {
        const J = JW[p.j];
        const [x, y] = jewelAt(J, J.L + J.perch * J.js);
        const o = bf.S * 0.16;
        return [x + Math.sin(J.th) * o, y - Math.cos(J.th) * o, J.th * 57.3];
      }
      if (p.t === 'air') {
        return [p.x ?? bf.x, p.y ?? bf.y, 0];
      }
      const q = V.perches[p.i || 0] || V.perches[0] || [V.vw * 0.5, V.vh * 0.75];
      const g = layers.ground;
      const gx = g.lx < 1e8 ? g.lx : 0;
      const gy = g.ly < 1e8 ? g.ly : 0;
      return [q[0] + gx, q[1] + gy - bf.S * 0.14, 0];
    }

    function bfWander() {
      bf.mode = 'wander';
      bf.tx = V.vw * (0.06 + Math.random() * 0.88);
      bf.ty = V.vh * (0.16 + Math.random() * 0.62);
    }

    let pX = -1e4;
    let pY = -1e4;
    let pT = 0;
    let pVX = 0;
    let pVY = 0;

    function bfNext(now: number) {
      const r = Math.random();
      const idle = now - pT > 1400 && pX > 0 && pX < V.vw && pY > 0 && pY < V.vh;
      if (idle && r < 0.3) {
        bf.mode = 'visit';
        bf.tx = pX + (Math.random() < 0.5 ? -1 : 1) * bf.S * (0.7 + Math.random() * 0.5);
        bf.ty = pY - bf.S * (0.4 + Math.random() * 0.5);
        return;
      }
      if (r < 0.62) {
        const opts: NonNullable<typeof bf.perch>[] = [];
        V.perches.forEach((_, i) => opts.push({ t: 'scene', i }));
        JW.forEach((_, j) => opts.push({ t: 'jw', j }, { t: 'jw', j }));
        let p: NonNullable<typeof bf.perch>;
        do {
          p = opts[Math.floor(Math.random() * opts.length)];
        } while (
          bf.perch &&
          opts.length > 1 &&
          p.t === bf.perch.t &&
          (p.i ?? p.j) === (bf.perch.i ?? bf.perch.j)
        );
        bf.perch = p;
        bf.mode = 'toPerch';
        return;
      }
      bfWander();
    }

    function fleeFrom(x: number, y: number, now: number) {
      const dx = bf.x - x;
      const dy = bf.y - y;
      const d = Math.hypot(dx, dy) || 1;
      bf.mode = 'flee';
      bf.until = now + 900;
      bf.tx = clamp(bf.x + (dx / d) * bf.S * 5, bf.S, V.vw - bf.S);
      bf.ty = clamp(bf.y + (dy / d) * bf.S * 4 - bf.S * 2, bf.S, V.vh * 0.8);
      bf.vx += (dx / d) * bf.S * 3;
      bf.vy += (dy / d) * bf.S * 3 - bf.S * 2;
    }

    const onBflyClick = () => {
      const now = performance.now();
      if (reduce) {
        spark(bf.x, bf.y, 12, { v: 100, life: 1000, sz: 8 });
        return;
      }
      bf.mode = 'dance';
      bf.dance = {
        t0: now,
        cx: bf.x,
        cy: bf.y,
        a0: Math.random() * 6.283,
        dir: Math.random() < 0.5 ? -1 : 1,
      };
      spark(bf.x, bf.y, 14, { v: 120, life: 1100, sz: 8, g: 30 });
    };
    bfEl.addEventListener('click', onBflyClick);

    function bflyDraw(s: number, bob: number) {
      const W = bf.S;
      const H = bf.S * 0.92;
      bfEl!.style.transform = `translate3d(${(bf.x - W / 2).toFixed(1)}px,${(
        bf.y -
        H / 2 +
        bob
      ).toFixed(1)}px,0) rotate(${bf.ang.toFixed(1)}deg)`;
      bwr.setAttribute('transform', `scale(${s.toFixed(3)},1)`);
      bwl.setAttribute('transform', `scale(${(-s).toFixed(3)},1)`);
    }

    // 6. Build all 11 procedural forest layers
    let ffs: {
      el: HTMLElement;
      bx: number;
      by: number;
      ax: number;
      ay: number;
      fx: number;
      fy: number;
      ph: number;
      fl: number;
    }[] = [];
    let leaves: {
      el: HTMLElement;
      x0: number;
      y: number;
      vy: number;
      A: number;
      fw: number;
      ph: number;
      rot: number;
      vr: number;
      ff: number;
      sc: number;
    }[] = [];

    function build() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = Math.round(vw * 0.06 + 24);
      const padY = Math.round(vh * 0.05 + 20);
      const W = vw + pad * 2;
      const H = vh + padY * 2;
      const asp = vw / vh;
      const P = clamp((1.2 - asp) / 0.65, 0, 1);
      const s = Math.min(vw, vh);
      const L = (a: number, b: number) => a + (b - a) * P;
      const X0 = -pad - 24;
      const X1 = vw + pad + 24;
      const YB = vh + padY + 24;
      const seg = Math.max(7, s * 0.011);
      const jit = 0.9;
      const cyc = L(1, 0.72);
      const k = s * L(0.00095, 0.0013);
      Object.assign(V, { vw, vh, pad, padY, W, H, P, s, k });

      for (const id in layers) {
        const el = layers[id].el;
        el.style.left = -pad + 'px';
        el.style.top = -padY + 'px';
        el.style.width = W + 'px';
        el.style.height = H + 'px';
      }
      const svg = (inner: string, sh?: [number, number, number]) =>
        `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="${shStyle(
          sh
        )}" aria-hidden="true" focusable="false"><g transform="translate(${pad} ${padY})">${inner}</g></svg>`;
      const land = (fn: (x: number) => number, R: () => number, step?: number) =>
        D([...sampleRidge(fn, R, X0, X1, step || seg * 1.3, jit), [X1, YB], [X0, YB]]);

      // sky + stars
      let R = mulberry(11);
      let stars = '';
      const ns = Math.round(clamp((vw * vh) / 18000, 30, 90));
      for (let i = 0; i < ns; i++) {
        const x = R() * vw;
        const y = R() * vh * L(0.44, 0.42);
        const r = 0.7 + R() * R() * 2.6;
        const q = r * 0.42;
        stars += `<path class="star" style="animation-delay:${(-R() * 6).toFixed(
          2
        )}s;animation-duration:${(2.5 + R() * 4).toFixed(2)}s" d="${D([
          [x, y - r * 2.4],
          [x + q, y - q],
          [x + r * 2.4, y],
          [x + q, y + q],
          [x, y + r * 2.4],
          [x - q, y + q],
          [x - r * 2.4, y],
          [x - q, y - q],
        ])}"/>`;
      }
      layers.sky.el.innerHTML = svg(
        `<rect class="sky" x="${-pad}" y="${-padY}" width="${W}" height="${H}"/><rect class="g" x="${-pad}" y="${-padY}" width="${W}" height="${H}"/><g class="stars">${stars}</g>`
      );

      // hanging sun + paper moon
      R = mulberry(13);
      const scx = vw * L(0.69, 0.64);
      const scy = vh * L(0.2, 0.25);
      const sr = s * L(0.068, 0.1);
      const bw = sr * 3.4;
      const bh = padY + scy + sr * 1.75;
      const vbY = -(padY + scy);
      const rays: number[][] = [];
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        const r = i % 2 ? sr * 1.14 : sr * 1.5;
        rays.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      const cel = (cls: string, inner: string, strEnd: number, extra = '') =>
        `<div class="hang-c ${cls}" style="left:${f1(pad + scx - bw / 2)}px;width:${f1(
          bw
        )}px;height:${f1(bh)}px;--up:${f1(-(bh + 16))}px">${extra}<svg width="${f1(
          bw
        )}" height="${f1(bh)}" viewBox="${f1(-bw / 2)} ${f1(vbY)} ${f1(bw)} ${f1(
          bh
        )}" style="${shStyle([2, 3, 8])};animation-delay:${(-R() * 7).toFixed(
          2
        )}s" aria-hidden="true" focusable="false"><line class="string" x1="0" y1="${f1(
          vbY
        )}" x2="0" y2="${f1(-strEnd)}"/>${inner}</svg></div>`;
      const sunIn = `<g class="hit" data-toggle>${paper(
        'sunray',
        D(rough(rays, R, sr * 0.12, sr * 0.01))
      )}${paper('sun', D(rough(circ(0, 0, sr, 40), R, sr * 0.1, sr * 0.012)))}${paper(
        'sunin',
        D(rough(circ(0, 0, sr * 0.68, 34), R, sr * 0.1, sr * 0.01))
      )}</g>`;
      let craters = '';
      (
        [
          [-0.3, -0.25, 0.18],
          [0.28, 0.1, 0.13],
          [-0.05, 0.4, 0.1],
          [0.2, -0.44, 0.07],
        ] as [number, number, number][]
      ).forEach(([a, b, c]) => {
        craters += D(rough(circ(a * sr, b * sr, c * sr, 16), R, sr * 0.06, sr * 0.008));
      });
      const moonIn = `<g class="hit" data-toggle>${paper(
        'moon',
        D(rough(circ(0, 0, sr * 0.95, 40), R, sr * 0.1, sr * 0.012))
      )}<path class="crater" d="${craters}"/></g>`;
      const glow = `<div class="mglow" style="left:${f1(bw / 2 - sr * 2.6)}px;top:${f1(
        padY + scy - sr * 2.6
      )}px;width:${f1(sr * 5.2)}px;height:${f1(sr * 5.2)}px"></div>`;
      layers.cel.el.innerHTML =
        cel('sunH', sunIn, sr * 1.5) + cel('moonH', moonIn, sr * 0.95, glow);

      // far hills + hanging clouds
      R = mulberry(23);
      const fFar = ridgeFn(R, vh * L(0.5, 0.45), vh * L(0.055, 0.045), cyc, vw);
      let cl = '';
      let strs = '';
      (
        [
          [L(0.42, 0.24), L(0.13, 0.36), s * L(0.25, 0.34)],
          [L(0.9, 0.84), L(0.3, 0.43), s * L(0.19, 0.26)],
        ] as [number, number, number][]
      ).forEach(([cx, cy, w]) => {
        const c = cloud(R, cx * vw, cy * vh, w);
        cl += D(rough(c.pts, R, seg, 0.7));
        strs += `<line class="string" x1="${f1(c.sx)}" y1="${-padY - 4}" x2="${f1(
          c.sx
        )}" y2="${f1(c.top + 3)}"/>`;
      });
      layers.far.el.innerHTML = svg(
        strs + paper('cloud', cl) + paper('far', land(fFar, R, seg * 1.5)),
        layers.far.sh
      );

      // hills + cottages
      R = mulberry(37);
      const fHill = ridgeFn(R, vh * L(0.585, 0.53), vh * L(0.045, 0.04), cyc * 1.25, vw);
      const c = s * L(0.032, 0.05);
      const cots = [L(0.2, 0.2), L(0.8, 0.78)].map((f) => crest(fHill, vw * f, vw * 0.06));
      const co = { walls: '', roofs: '', doors: '', glows: '', wins: '' };
      cots.forEach((x, ci) => cottage(R, x, fHill(x) + c * 0.14, c, co, ci));
      layers.hills.el.innerHTML = svg(
        paper('hill', land(fHill, R)) +
          paper('wall', co.walls) +
          paper('roof', co.roofs) +
          `<path class="door" d="${co.doors}"/>` +
          co.glows +
          co.wins,
        layers.hills.sh
      );

      // far pines
      R = mulberry(51);
      const fFp = ridgeFn(R, vh * L(0.645, 0.59), vh * L(0.022, 0.02), cyc * 1.6, vw);
      let trees = '';
      for (let x = X0; x < X1; ) {
        const h = vh * L(0.075, 0.062) * (0.6 + R() * 0.75);
        const w = h * (0.4 + R() * 0.14);
        let skip = R() < 0.1;
        for (const cx of cots) if (Math.abs(x - cx) < c * 1.5 + w * 0.4) skip = true;
        if (!skip) trees += D(rough(pine(R, x, fFp(x) + h * 0.05, h, w), R, w * 0.16, w * 0.018));
        x += w * (0.5 + R() * 0.55);
      }
      layers.fpines.el.innerHTML = svg(
        paper('fpine', land(fFp, R) + trees),
        layers.fpines.sh
      );

      // meadow + winding river
      R = mulberry(67);
      const rPh = -0.5 + R() * 0.3;
      const rFreq = L(1.25, 2.05);
      const rAmp = L(0.16, 0.22);
      const rBase = L(0.56, 0.52);
      const cxAt = (t: number) =>
        vw * (rBase + rAmp * Math.sin(t * Math.PI * rFreq + rPh) * (0.3 + 0.7 * t));
      const hwAt = (t: number) => vw * (0.005 + L(0.13, 0.2) * Math.pow(t, 1.55));
      const rc0 = cxAt(0);
      const fMd0 = ridgeFn(R, vh * L(0.7, 0.645), vh * L(0.018, 0.016), cyc * 1.1, vw);
      const fMd = (x: number) =>
        fMd0(x) + vh * 0.008 * Math.exp(-(((x - rc0) / (vw * 0.04)) ** 2));
      const yTop = fMd(rc0) - 1;
      const yBot = YB;
      const tOf = (y: number) => clamp((y - yTop) / (yBot - yTop), 0, 1);
      const rl: number[][] = [];
      const rr: number[][] = [];
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        const y = yTop + t * (yBot - yTop);
        const cx = cxAt(t);
        const hw = hwAt(t);
        rl.push([cx - hw + (R() - 0.5) * 1.2, y]);
        rr.push([cx + hw + (R() - 0.5) * 1.2, y]);
      }
      let rip = '';
      for (let i = 0; i < 11; i++) {
        const t = 0.12 + 0.85 * (i / 11) + (R() - 0.5) * 0.04;
        const y = yTop + t * (yBot - yTop);
        const cx = cxAt(t) + (R() - 0.5) * hwAt(t) * 0.9;
        const l = hwAt(t) * (0.35 + R() * 0.5);
        const th = 0.8 + t * 2.6;
        rip += D([
          [cx - l / 2, y],
          [cx - l * 0.1, y - th],
          [cx + l / 2, y + th * 0.2],
          [cx, y + th * 0.5],
        ]);
      }
      layers.meadow.el.innerHTML = svg(
        paper('meadow', land(fMd, R)) +
          paper('river', D([[rc0, yTop - 1], ...rl, ...rr.reverse()])) +
          `<path class="ripple" d="${rip}"/>`,
        layers.meadow.sh
      );

      const banks = (fn: (x: number) => number, Rng: () => number, inset: number) => {
        const pts = sampleRidge(fn, Rng, X0, X1, seg * 1.2, jit);
        const Lx = (y: number) => {
          const t = tOf(y);
          return cxAt(t) - hwAt(t) * (1 - inset);
        };
        const Rx = (y: number) => {
          const t = tOf(y);
          return cxAt(t) + hwAt(t) * (1 - inset);
        };
        let i = 0;
        while (i < pts.length && pts[i][0] < Lx(pts[i][1])) i++;
        const lft = pts.slice(0, Math.max(1, i));
        const yl = lft[lft.length - 1][1];
        const xl = Lx(yl);
        lft.push([xl, yl]);
        for (let y = yl + 5; y < YB; y += 5 + Rng() * 5)
          lft.push([Lx(y) + (Rng() - 0.5) * 1.2, y]);
        lft.push([Lx(YB), YB], [X0, YB]);
        let j = pts.length - 1;
        while (j >= 0 && pts[j][0] > Rx(pts[j][1])) j--;
        const rg = pts.slice(Math.min(j + 1, pts.length - 1));
        const yr = rg[0][1];
        const xr = Rx(yr);
        const edge: number[][] = [];
        for (let y = yr + 5; y < YB; y += 5 + Rng() * 5)
          edge.push([Rx(y) + (Rng() - 0.5) * 1.2, y]);
        return {
          d: D(lft) + D([[X1, YB], [Rx(YB), YB], ...edge.reverse(), [xr, yr], ...rg]),
          xl,
          xr,
        };
      };

      // near pines on the banks
      R = mulberry(83);
      const yN = vh * L(0.77, 0.715);
      const tN = tOf(yN);
      const rcN = cxAt(tN);
      const hwN = hwAt(tN);
      const fN0 = ridgeFn(R, yN, vh * L(0.02, 0.018), cyc * 1.3, vw);
      const fN = (x: number) =>
        fN0(x) + vh * 0.016 * Math.exp(-(((x - rcN) / (hwN * 2.4 + vw * 0.02)) ** 2));
      const bN = banks(fN, R, 0.1);
      let nt = '';
      for (let x = X0; x < X1; ) {
        const e = clamp(Math.abs(x / vw - 0.5) * 2.2, 0, 1);
        const h = vh * L(0.22, 0.17) * (0.7 + R() * 0.55) * (0.65 + 0.55 * e);
        const w = h * (0.36 + R() * 0.1);
        if ((x < bN.xl - w * 0.55 || x > bN.xr + w * 0.55) && R() < 0.3 + 0.7 * e) {
          nt += D(rough(pine(R, x, fN(x) + h * 0.03, h, w), R, w * 0.14, w * 0.014));
        }
        x += w * (0.45 + R() * 0.5);
      }
      layers.npines.el.innerHTML = svg(paper('npine', bN.d + nt), layers.npines.sh);

      // ground: ferns, foxgloves, mushrooms
      R = mulberry(97);
      const yG = vh * L(0.845, 0.8);
      const tG = tOf(yG);
      const rcG = cxAt(tG);
      const hwG = hwAt(tG);
      const fG0 = ridgeFn(R, yG, vh * L(0.016, 0.014), cyc * 1.2, vw);
      const fG = (x: number) =>
        fG0(x) + vh * 0.014 * Math.exp(-(((x - rcG) / (hwG * 2.2 + vw * 0.02)) ** 2));
      const bG = banks(fG, R, 0.22);
      V.fG = fG;
      V.gxl = bG.xl;
      V.gxr = bG.xr;
      const lp = (f: number) => lerp(0, bG.xl, f);
      const rp = (f: number) => lerp(bG.xr, vw, f);
      V.perches = [];
      let ferns = '';
      let stems = '';
      let bA = '';
      let bB = '';
      let ms = '';
      let caps = '';
      let spots = '';
      (
        [
          [lp(0.04), 0.085],
          [lp(0.52), 0.07],
          [rp(0.3), 0.08],
          [rp(0.98), 0.095],
        ] as [number, number][]
      ).forEach(([x, z]) => {
        ferns += fern(R, x, fG(x) + 2, s * L(z, z * 1.3));
      });
      const fh = s * L(0.25, 0.27);
      (
        [
          [lp(0.16), fh, s * 0.02],
          [lp(0.27), fh * 0.7, -s * 0.012],
          [rp(0.84), fh * 0.86, -s * 0.02],
        ] as [number, number, number][]
      ).forEach(([x, h, ln]) => {
        V.perches.push([x + ln * 0.86, fG(x) + 2 - h * 0.93]);
        const g = foxglove(R, x, fG(x) + 2, h, ln);
        stems += g.stem;
        bA += g.A;
        bB += g.B;
      });
      const m = s * L(0.04, 0.055);
      const ml = lp(0.4);
      const mr = rp(0.62);
      (
        [
          [ml, m, -0.3],
          [ml + m * 0.55, m * 0.7, 0.4],
          [ml - m * 0.5, m * 0.55, -0.6],
          [mr, m * 0.85, 0.3],
          [mr + m * 0.5, m * 0.55, -0.2],
        ] as [number, number, number][]
      ).forEach(([x, z, t], mi) => {
        if (mi === 0 || mi === 3) V.perches.push([x + t * z * 0.12, fG(x) + z * 0.04 - z * 0.88]);
        const q = mushroom(R, x, fG(x) + z * 0.04, z, t);
        ms += q.stem;
        caps += q.cap;
        spots += q.spots;
      });
      layers.ground.el.innerHTML = svg(
        paper('ground', bG.d) +
          paper('fern', ferns) +
          paper('stem', stems) +
          paper('bellB', bB) +
          paper('bellA', bA) +
          paper('mstem', ms) +
          paper('cap', caps) +
          `<path class="spot" d="${spots}"/>`,
        layers.ground.sh
      );

      layoutJewels();
      layoutBfly();

      // fireflies
      R = mulberry(131);
      const nf = coarse ? 10 : 18;
      layers.ff.el.innerHTML = '<div class="ffl">' + '<i class="ff"></i>'.repeat(nf) + '</div>';
      ffs = Array.from(layers.ff.el.querySelectorAll<HTMLElement>('.ff')).map((el) => ({
        el,
        bx: pad + R() * vw,
        by: padY + lerp(vh * L(0.56, 0.5), vh * 0.94, R()),
        ax: 20 + R() * 70,
        ay: 8 + R() * 30,
        fx: 0.08 + R() * 0.22,
        fy: 0.1 + R() * 0.3,
        ph: R() * 6.283,
        fl: 0.5 + R() * 1.4,
      }));
      ffs.forEach((f) => {
        f.el.style.transform = `translate3d(${f1(f.bx)}px,${f1(f.by)}px,0)`;
      });

      // foreground grasses
      R = mulberry(151);
      let gA = '';
      let gB = '';
      let sst = '';
      let seeds = '';
      const gh = vh * L(0.13, 0.1);
      for (let x = X0; x < X1; ) {
        const e = clamp(Math.abs(x / vw - 0.5) * 2, 0, 1.15);
        const vis = gh * (0.35 + R() * 0.65) * (0.45 + 0.9 * Math.pow(e, 1.5));
        const h = vis + (YB - vh);
        const w = 3 + R() * 5 * (0.6 + e * 0.6);
        const lean = (R() - 0.5) * vis * 0.55 + (x < vw / 2 ? -1 : 1) * vis * 0.18 * e;
        const bd = blade(x, YB, h, lean, w);
        if (R() < 0.5) gA += bd;
        else gB += bd;
        if (e > 0.35 && R() < 0.12) {
          const hs = h + vis * 0.4;
          const ln = lean * 0.6;
          sst += blade(x, YB, hs, ln, 1.8);
          for (let q = 0; q < 7; q++) {
            const t = 0.72 + q * 0.04;
            const px = x + ln * t * t;
            const py = YB - hs * t;
            const sd = q % 2 ? 1 : -1;
            seeds += D(ellipse(px + sd * 2, py, 2.1, 4.6, sd * 0.5));
          }
        }
        x += 2.5 + R() * 6;
      }
      layers.grass.el.innerHTML = svg(
        paper('grassA', gA) +
          paper('grassB', gB) +
          paper('sstem', sst, false) +
          `<path class="seed" d="${seeds}"/>`,
        layers.grass.sh
      );

      // drifting leaves
      R = mulberry(171);
      const nl = coarse ? 6 : 10;
      layers.leaves.el.innerHTML = Array.from(
        { length: nl },
        (_, i) => `<div class="leaf">${leafSVG(R, ['la', 'lb', 'lc'][i % 3])}</div>`
      ).join('');
      leaves = Array.from(layers.leaves.el.querySelectorAll<HTMLElement>('.leaf')).map((el) => ({
        el,
        x0: R() * W,
        y: R() * H,
        vy: 16 + R() * 22,
        A: 18 + R() * 46,
        fw: 0.4 + R() * 0.6,
        ph: R() * 6.283,
        rot: R() * 360,
        vr: (R() - 0.5) * 40,
        ff: 0.6 + R() * 1.2,
        sc: (0.8 + R() * 0.9) * L(1, 0.85),
      }));
      if (reduce) {
        leaves.forEach((l) => {
          l.el.style.transform = `translate3d(${f1(l.x0)}px,${f1(l.y)}px,0) rotate(${f1(
            l.rot
          )}deg) scale(${l.sc.toFixed(2)})`;
        });
      }

      for (const id in layers) {
        layers[id].lx = 1e9;
      }
    }

    // 7. Stage click for hanging sun/moon toggle
    const onStageClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('[data-toggle]')) {
        setNight(!nightRef.current);
      }
    };
    stage.addEventListener('click', onStageClick);

    // 8. Pointer parallax
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let drag: { x: number; y: number; bx: number; by: number } | null = null;

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
      } else if (drag) {
        tx = clamp(drag.bx - (e.clientX - drag.x) / (window.innerWidth * 0.35), -1, 1);
        ty = clamp(drag.by - (e.clientY - drag.y) / (window.innerHeight * 0.35), -1, 1);
      }
      const now = performance.now();
      if (pT) {
        const d = Math.max(8, now - pT) / 1000;
        pVX = lerp(pVX, (e.clientX - pX) / d, 0.5);
        pVY = lerp(pVY, (e.clientY - pY) / d, 0.5);
        brush(e.clientX, e.clientY, e.clientX - pX, e.clientY - pY);
      }
      pX = e.clientX;
      pY = e.clientY;
      pT = now;
    };
    const onStagePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        drag = { x: e.clientX, y: e.clientY, bx: tx, by: ty };
      }
    };
    const onPointerUp = () => {
      drag = null;
    };
    const onMouseLeave = () => {
      tx = 0;
      ty = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerdown', onStagePointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);

    // 9. Hand-cut clipPath on tags
    const tags: (HTMLElement | null)[] = [
      titleTagRef.current,
      shopTagRef.current,
      toggleBtnRef.current,
      ...JW.map((J) => J.lab),
    ];
    const ro = new ResizeObserver(() => tags.forEach(clipTag));
    tags.forEach((t) => t && ro.observe(t));
    if (document.fonts) {
      document.fonts.ready.then(() => tags.forEach(clipTag));
    }

    // 10. Jewels & Butterfly tick functions
    let nextShine = performance.now() + 3200;
    function jewelTick(now: number, dt: number, t: number) {
      const msw = clamp((tx - cx) * -1, -1, 1);
      for (const J of JW) {
        if (J.drag && J.drag.target != null) {
          const nt = lerp(J.th, J.drag.target, 1 - Math.exp(-dt * 16));
          J.om = (nt - J.th) / Math.max(dt, 1e-3);
          J.th = nt;
        } else {
          const Lc = J.L + J.h * J.js * 0.5;
          const wind = reduce
            ? 0
            : 0.34 * Math.sin(t * 0.62 + J.ph) + 0.17 * Math.sin(t * 1.7 + J.ph * 2.3);
          J.om += (-(2300 / Lc) * Math.sin(J.th) - 1.05 * J.om + wind + msw * 1.8) * dt;
          J.om = clamp(J.om, -7, 7);
          J.th += J.om * dt;
        }
        J.el.style.transform = `rotate(${(J.th * 57.2958).toFixed(2)}deg)`;
        if (J.spin) {
          const q = (now - J.spin.t0) / 1500;
          if (q >= 1 || reduce) {
            J.spin = null;
            J.svg.style.transform = '';
          } else {
            const e = 1 - Math.pow(1 - q, 3);
            J.svg.style.transform = `scaleX(${Math.cos(e * Math.PI * 4).toFixed(3)})`;
          }
        }
      }
      if (!reduce && now > nextShine) {
        const J = JW[Math.floor(Math.random() * JW.length)];
        J.el.classList.add('shine');
        window.setTimeout(() => J.el.classList.remove('shine'), 1300);
        const g = gemPos(J);
        spark(g[0], g[1], 2, { v: 30, sz: 7, g: 10 });
        nextShine = now + 3400 + Math.random() * 3200;
      }
    }

    function bflyTick(now: number, dt: number, t: number) {
      const S = bf.S;
      if (!bf.init) {
        bf.init = true;
        bf.start = now + 1500;
        bf.x = -S;
        bf.y = V.vh * 0.5;
        bf.tx = V.vw * 0.32;
        bf.ty = V.vh * 0.5;
        bf.mode = 'wander';
      }
      if (reduce) {
        const p = perchPos({ t: 'scene', i: 0 });
        bf.x = p[0];
        bf.y = p[1];
        bf.ang = -10;
        bflyDraw(0.95, 0);
        return;
      }
      if (now < bf.start) {
        bflyDraw(1, 0);
        return;
      }
      let open: number | null = null;
      let hz = 6.4;
      const pd = Math.hypot(pX - bf.x, pY - bf.y);
      const fast = now - pT < 90 && Math.hypot(pVX, pVY) > 950;
      if (bf.mode === 'dance' && bf.dance) {
        const d = bf.dance;
        const q = (now - d.t0) / 1800;
        if (q >= 1) {
          bfWander();
          bf.ty = Math.min(bf.ty, V.vh * 0.4);
        } else {
          const a = d.a0 + q * Math.PI * 4 * d.dir;
          const r = S * 1.15 * Math.sin(Math.PI * q) + 3;
          const nx = d.cx + Math.cos(a) * r;
          const ny = d.cy + Math.sin(a) * r * 0.72 - q * S * 0.7;
          bf.vx = (nx - bf.x) / Math.max(dt, 1e-3);
          bf.vy = (ny - bf.y) / Math.max(dt, 1e-3);
          bf.x = nx;
          bf.y = ny;
          hz = 9;
          if (Math.random() < dt * 30) {
            spark(bf.x, bf.y + S * 0.1, 1, { v: 35, life: 1000, sz: 6, g: 18 });
          }
          bf.ang = angLerp(bf.ang, Math.atan2(bf.vy, bf.vx) * 57.3 + 90, dt * 8);
        }
      } else if (bf.mode === 'perched' && bf.perch) {
        const p = perchPos(bf.perch);
        bf.x = p[0];
        bf.y = p[1];
        bf.vx = bf.vy = 0;
        bf.ang = angLerp(bf.ang, p[2] + bf.pAng, dt * 5);
        const w = 0.5 + 0.5 * Math.cos(t * 1.6 + bf.seed);
        open = 0.3 + 0.68 * Math.pow(w, 0.5);
        const tw = (t * 0.9 + bf.seed) % 5;
        if (tw < 0.35) open = 0.2 + 0.8 * Math.abs(Math.cos(tw * 18));
        const jd = bf.perch.t === 'jw' && bf.perch.j != null && JW[bf.perch.j].drag;
        if ((pd < S * 1.4 && fast) || jd) fleeFrom(pX, pY, now);
        else if (now > bf.until) {
          bfNext(now);
          bf.vy = -S * 2.4;
          bf.vx = (Math.random() - 0.5) * S * 2.4;
        }
      } else {
        let tx2 = bf.tx;
        let ty2 = bf.ty;
        let spd = S * 2.1;
        if (bf.mode === 'toPerch' && bf.perch) {
          const p = perchPos(bf.perch);
          tx2 = p[0];
          ty2 = p[1];
        }
        if (bf.mode === 'flee') {
          spd = S * 4.4;
          hz = 9.5;
          if (now > bf.until) bfWander();
        }
        if (bf.mode === 'visit') {
          spd = S * 1.6;
        }
        const dx = tx2 - bf.x;
        const dy = ty2 - bf.y;
        const dist = Math.hypot(dx, dy) || 1;
        const near =
          bf.mode === 'toPerch' || bf.mode === 'visit' ? clamp(dist / (S * 1.8), 0.16, 1) : 1;
        const fl = (Math.sin(t * 3.1 + bf.seed) * 0.9 + Math.sin(t * 7.3 + bf.seed * 2) * 0.45) * near;
        const dvx = ((dx / dist) * spd - (dy / dist) * fl * S * 1.1) * near;
        const dvy = ((dy / dist) * spd + (dx / dist) * fl * S * 1.1) * near;
        const kk = 1 - Math.exp(-dt * (bf.mode === 'toPerch' && dist < S * 2.2 ? 7 : 2.6));
        bf.vx += (dvx - bf.vx) * kk;
        bf.vy += (dvy - bf.vy) * kk;
        if (bf.x < S * 0.4) bf.vx += S * 9 * dt;
        if (bf.x > V.vw - S * 0.4) bf.vx -= S * 9 * dt;
        if (bf.y < S * 0.6) bf.vy += S * 9 * dt;
        if (bf.y > V.vh - S * 0.6) bf.vy -= S * 9 * dt;
        bf.x += bf.vx * dt;
        bf.y += bf.vy * dt;
        const sp = Math.hypot(bf.vx, bf.vy);
        if (sp > S * 0.35) bf.ang = angLerp(bf.ang, Math.atan2(bf.vy, bf.vx) * 57.3 + 90, dt * 3);
        if (bf.mode === 'toPerch' && dist < S * 0.1) {
          bf.mode = 'perched';
          bf.until = now + 2600 + Math.random() * 3800;
          bf.pAng = (Math.random() - 0.5) * 34;
          if (bf.perch && bf.perch.t === 'jw' && bf.perch.j != null) {
            const J = JW[bf.perch.j];
            J.om -= clamp((bf.vx / (J.L + 40)) * 0.9, -0.6, 0.6) + 0.25;
          }
          spark(bf.x, bf.y + S * 0.15, 4, { v: 40, sz: 5, g: 20 });
        } else if (bf.mode === 'visit' && dist < S * 0.25) {
          bf.mode = 'perched';
          bf.perch = { t: 'air', x: bf.x, y: bf.y };
          bf.until = now + 900 + Math.random() * 900;
        } else if (bf.mode === 'wander' && dist < S * 0.5) {
          bfNext(now);
        }
        if (bf.mode !== 'flee' && pd < S * 1.6 && fast) fleeFrom(pX, pY, now);
        if (bf.vy > S * 0.5 && bf.mode === 'wander') open = 0.9 + 0.06 * Math.sin(t * 14);
        bf.dust += dt;
        if (bf.dust > (nightRef.current ? 0.07 : 0.15)) {
          bf.dust = 0;
          spark(bf.x - bf.vx * 0.06, bf.y - bf.vy * 0.06 + S * 0.12, 1, {
            v: 12,
            life: nightRef.current ? 1400 : 900,
            sz: nightRef.current ? 5 : 4,
            g: 14,
          });
        }
      }
      bf.ph += dt * 6.283 * hz;
      const s = open != null ? open : 0.14 + 0.86 * Math.pow(0.5 + 0.5 * Math.cos(bf.ph), 0.7);
      bflyDraw(s, open != null ? 0 : Math.sin(bf.ph) * S * 0.035);
    }

    // 11. Main RAF loop
    let last = performance.now();
    let rafId = 0;
    let swTimerId = 0;
    const scheduleNext = () => {
      if (isSoftwareGl) {
        swTimerId = window.setTimeout(() => {
          rafId = requestAnimationFrame(frame);
        }, 160);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };
    function frame(now: number) {
      if (appOpenRef.current) {
        sparkTick(Math.min(0.05, (now - last) / 1000));
        last = now;
        scheduleNext();
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const kk = 1 - Math.exp(-dt * (reduce ? 12 : 4.5));
      cx += (tx - cx) * kk;
      cy += (ty - cy) * kk;
      const MX = V.vw * 0.035;
      const MY = V.vh * 0.022;
      for (const id in layers) {
        const Ly = layers[id];
        const x = -cx * Ly.f * MX;
        const y = -cy * Ly.f * MY;
        if (Math.abs(x - Ly.lx) > 0.05 || Math.abs(y - Ly.ly) > 0.05) {
          Ly.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
          Ly.lx = x;
          Ly.ly = y;
        }
      }
      const swing = clamp((tx - cx) * -9, -7, 7);
      titleHang!.style.transform = `rotate(${swing.toFixed(2)}deg)`;
      toggleHang!.style.transform = `rotate(${(swing * 0.7).toFixed(2)}deg)`;
      jewelTick(now, dt, t);
      bflyTick(now, dt, t);
      sparkTick(dt);
      if (!reduce) {
        for (const l of leaves) {
          l.y += l.vy * dt;
          l.x0 += 7 * dt;
          if (l.y > V.H + 40) {
            l.y = -40;
            l.x0 = Math.random() * V.W;
          }
          if (l.x0 > V.W + 40) l.x0 = -40;
          const sw = Math.sin(t * l.fw + l.ph);
          l.rot += l.vr * dt;
          let fl = Math.cos(t * l.ff + l.ph * 1.7);
          if (Math.abs(fl) < 0.18) fl = fl < 0 ? -0.18 : 0.18;
          l.el.style.transform = `translate3d(${(l.x0 + sw * l.A).toFixed(1)}px,${l.y.toFixed(
            1
          )}px,0) rotate(${(l.rot + sw * 25).toFixed(1)}deg) scale(${(fl * l.sc).toFixed(
            3
          )},${l.sc.toFixed(3)})`;
        }
        if (nightRef.current || now < ffUntilRef.current) {
          for (const f of ffs) {
            const x =
              f.bx +
              Math.sin(t * f.fx * 2 + f.ph) * f.ax +
              Math.sin(t * f.fx * 5.3 + f.ph * 2) * f.ax * 0.25;
            const y = f.by + Math.cos(t * f.fy * 2 + f.ph) * f.ay;
            f.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
            f.el.style.opacity = (
              0.12 +
              0.88 * Math.pow(Math.max(0, Math.sin(t * f.fl + f.ph)), 2)
            ).toFixed(2);
          }
        }
      }
      scheduleNext();
    }

    build();
    rafId = requestAnimationFrame(frame);
    const settledTimer = window.setTimeout(() => root.classList.add('settled'), 2600);

    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(build, 140);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(swTimerId);
      window.clearTimeout(settledTimer);
      window.clearTimeout(rt);
      ro.disconnect();
      stage.removeEventListener('click', onStageClick);
      stage.removeEventListener('pointerdown', onStagePointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      bfEl.removeEventListener('click', onBflyClick);
    };
  }, [setNight]);

  // Store helpers
  const addCart = useCallback(
    (id: number, gold: GoldCode, opt: string, qty = 1, sourceEl?: HTMLElement | null) => {
      const p = byId(id);
      if (!p) return;
      setCart((prev) => addOrIncrementCartItem(prev, id, gold, opt, qty));
      setCartBump(false);
      window.setTimeout(() => setCartBump(true), 10);
      toast(`«${p.name}» به سبد خرید اضافه شد`);
      if (sourceEl) burstElement(sourceEl);
    },
    [toast, burstElement]
  );

  const toggleWish = useCallback(
    (id: number, sourceEl?: HTMLElement | null) => {
      setWish((prev) => {
        const has = prev.includes(id);
        if (!has) {
          if (sourceEl) burstElement(sourceEl);
          toast('به علاقه‌مندی‌ها اضافه شد');
          return [...prev, id];
        } else {
          return prev.filter((x) => x !== id);
        }
      });
    },
    [toast, burstElement]
  );

  const renderProductImg = (p: Product, goldOverride?: GoldCode | null, cls = '', dl?: number) => {
    const g = goldOverride || p.gold;
    const delay = dl ?? -(p.id * 0.7) % 6;
    return (
      <div className={`s-img gd-${g} gm-${p.gem} ${cls}`} data-t={p.t}>
        <div className="s-hang" style={{ '--dl': `${delay}s` } as React.CSSProperties}>
          <span className="s-thr" />
          <div className="s-jw" dangerouslySetInnerHTML={{ __html: jsvg(p.t) }} />
        </div>
      </div>
    );
  };

  const renderProductCard = (p: Product) => {
    const w = wish.includes(p.id);
    return (
      <article key={p.id} className="s-card">
        <a href={`#p/${p.id}`} aria-label={p.name}>
          {renderProductImg(p)}
        </a>
        {p.tag && <span className="s-badge">{p.tag}</span>}
        <button
          type="button"
          className={`s-wish ${w ? 'on' : ''}`}
          aria-pressed={w}
          aria-label="علاقه‌مندی"
          onClick={(e) => toggleWish(p.id, e.currentTarget)}
          dangerouslySetInnerHTML={{ __html: ic('heart') }}
        />
        <button
          type="button"
          className="s-quick"
          onClick={(e) => addCart(p.id, p.gold, defOpt(p), 1, e.currentTarget)}
        >
          افزودن سریع به سبد
        </button>
        <div className="s-card-b">
          <a href={`#p/${p.id}`}>
            <h3>{p.name}</h3>
          </a>
          <p>
            {GEM[p.gem]} · طلای {GOLD[p.gold]} ۱۸ عیار
          </p>
          <div className="s-price">{fmt(p.price)}</div>
        </div>
      </article>
    );
  };

  const renderFeats = () => (
    <div className="s-feats">
      <div className="s-feat">
        <span dangerouslySetInnerHTML={{ __html: ic('shield') }} />
        <b>ضمانت اصالت</b>
        <span>شناسنامه و فاکتور رسمی برای هر قطعه</span>
      </div>
      <div className="s-feat">
        <span dangerouslySetInnerHTML={{ __html: ic('truck') }} />
        <b>ارسال بیمه‌شده</b>
        <span>رایگان برای سفارش‌های بالای ۵۰ میلیون تومان</span>
      </div>
      <div className="s-feat">
        <span dangerouslySetInnerHTML={{ __html: ic('refresh') }} />
        <b>۷ روز بازگشت</b>
        <span>تعویض سایز و بازگشت بدون پرسش</span>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="s-ft">
      <div className="s-wrap">
        <div className="s-ft-g">
          <div>
            <a className="s-logo" href="#shop">
              <b>NEY</b>
            </a>
            <p style={{ marginTop: 12, maxWidth: '22rem' }}>
              طلا و جواهر دست‌ساز؛ الهام‌گرفته از جنگل، ساخته‌شده برای ماندن. همه قطعات از طلای ۱۸ عیار با شناسنامه و ضمانت اصالت.
            </p>
          </div>
          <div>
            <h5>فروشگاه</h5>
            <ul>
              {(Object.keys(CAT) as CategoryId[]).map((c) => (
                <li key={c}>
                  <a href={`#shop/${c}`}>{CAT[c]}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5>راهنما</h5>
            <ul>
              <li>
                <a href="#shop/rings">راهنمای سایز</a>
              </li>
              <li>
                <a href="#shop">ارسال و بازگشت</a>
              </li>
              <li>
                <a href="#shop">مراقبت از جواهر</a>
              </li>
            </ul>
          </div>
          <div>
            <h5>NEY</h5>
            <ul>
              <li>
                <a href="#home">جنگل NEY</a>
              </li>
              <li>
                <a href="#wish">علاقه‌مندی‌ها</a>
              </li>
              <li>
                <a href="#shop">درباره ما</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="s-ft-b">
          <span>© {toFa(1405)} NEY · تمامی حقوق محفوظ است.</span>
          <span>
            پاسخگویی: شنبه تا پنجشنبه، {toFa(10)} تا {toFa(19)}
          </span>
        </div>
      </div>
    </footer>
  );

  // Compute active nav highlight
  let activeNav = '';
  if (routeA === 'shop' && !routeB) activeNav = 'shop';
  else if (routeA === 'shop' || CAT[routeA as CategoryId]) {
    const c = (routeB || routeA) as CategoryId;
    activeNav = CAT[c] ? c : 'all';
  } else if (routeA === 'p') {
    const p = byId(Number(routeB));
    activeNav = p ? p.cat : '';
  } else if (routeA === 'wish') {
    activeNav = 'wish';
  }

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const wishCount = wish.length;
  const subtotal = calcSubtotal(cart);
  const shippingCost = calcShippingCost(subtotal, coShip);
  const searchList = searchProducts(searchQuery);

  return (
    <>
      {/* Hidden SVG defs for paper grain & window glow */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute' }}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id="grain" patternUnits="userSpaceOnUse" width="192" height="192">
            <image ref={grainImgRef} id="grainImg" width="192" height="192" />
          </pattern>
          <radialGradient id="winglow">
            <stop offset="0" stopColor="#F6C9A0" stopOpacity=".85" />
            <stop offset=".4" stopColor="#EE8A35" stopOpacity=".32" />
            <stop offset="1" stopColor="#E67724" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* FOREST STAGE MAIN */}
      <main>
        <div
          id="stage"
          ref={stageRef}
          aria-label="جنگلی کاغذی با تپه‌ها، کاج‌ها، رودخانه، قارچ‌ها و پروانه طلایی NEY و جواهرات آویزان"
        />

        <div
          className="hang title-hang"
          id="titleHang"
          ref={titleHangRef}
          style={{ '--d': '900ms' } as React.CSSProperties}
          dir="rtl"
        >
          <div className="sway">
            <div className="drop">
              <span className="thread" />
              <div className="tag title" id="titleTag" ref={titleTagRef}>
                <h1>
                  NEY <span>طلا و جواهر دست‌ساز</span>
                </h1>
                <p id="hint">جواهرات را تاب دهید · روی پروانه بزنید</p>
              </div>
              <span className="thread sub" />
              <nav className="tag shop" id="shopTag" ref={shopTagRef} aria-label="کالکشن‌ها">
                <small>کالکشن پاییز ۱۴۰۵</small>
                <h2>زیورهای جنگل طلایی</h2>
                <ul>
                  <li>
                    <a href="#shop/rings">انگشتر</a>
                  </li>
                  <li>
                    <a href="#shop/necklaces">گردنبند</a>
                  </li>
                  <li>
                    <a href="#shop/bracelets">دستبند</a>
                  </li>
                  <li>
                    <a href="#shop/earrings">گوشواره</a>
                  </li>
                </ul>
                <a className="cta" href="#shop">
                  مشاهده و خرید
                </a>
                <button
                  type="button"
                  className="cta-3d-sub"
                  onClick={() => {
                    setAtelierType('ring');
                    setAtelierGold('y');
                    setAtelierGem('dia');
                    setAtelierOpen(true);
                  }}
                >
                  ✦ آتلیه سه‌بعدی جواهرات
                </button>
              </nav>
            </div>
          </div>
        </div>

        <div
          className="hang toggle-hang"
          id="toggleHang"
          ref={toggleHangRef}
          style={{ '--d': '900ms' } as React.CSSProperties}
        >
          <div className="sway">
            <div className="drop">
              <span className="thread" />
              <button
                className="tag toggle"
                id="toggle"
                ref={toggleBtnRef}
                type="button"
                aria-pressed={night}
                aria-label="حالت شب"
                onClick={() => setNight(!night)}
              >
                <span className="opt o-day" aria-hidden="true">
                  روز
                </span>
                <span className="track" aria-hidden="true">
                  <span className="knob" />
                </span>
                <span className="opt o-night" aria-hidden="true">
                  شب
                </span>
              </button>
            </div>
          </div>
        </div>

        <div id="jewels" ref={jewelsRef} dir="rtl" />
        <button
          className="bfly"
          id="bfly"
          ref={bflyRef}
          type="button"
          aria-label="پروانه طلایی NEY — بزنید تا برقصد"
        />
        <div id="spk" ref={spkWrapRef} aria-hidden="true" />
      </main>

      {/* NEY STORE OVERLAY (#app) */}
      <div
        id="app"
        dir="rtl"
        lang="fa"
        aria-label="فروشگاه NEY"
        className={isValidStoreRoute ? 'open' : ''}
      >
        <header className="s-hd">
          <div className="s-wrap s-hd-in">
            <a className="s-logo" href="#shop">
              <b>NEY</b>
              <small>طلا و جواهر دست‌ساز</small>
            </a>
            <nav className="s-nav" aria-label="دسته‌بندی‌ها">
              <a
                href="#shop"
                data-nav="shop"
                className={activeNav === 'shop' ? 'on' : ''}
              >
                خانه
              </a>
              <a
                href="#shop/all"
                data-nav="all"
                className={activeNav === 'all' ? 'on' : ''}
              >
                همه
              </a>
              {(Object.keys(CAT) as CategoryId[]).map((c) => (
                <a
                  key={c}
                  href={`#shop/${c}`}
                  data-nav={c}
                  className={activeNav === c ? 'on' : ''}
                >
                  {CAT[c]}
                </a>
              ))}
            </nav>
            <div className="s-acts">
              <a className="s-back" href="#home" title="بازگشت به جنگل NEY">
                <span dangerouslySetInnerHTML={{ __html: ic('tree') }} />
                <span>جنگل NEY</span>
              </a>
              <button
                type="button"
                className="s-ic"
                aria-label="آتلیه سه‌بعدی"
                title="آتلیه سه‌بعدی"
                onClick={() => setAtelierOpen(true)}
                dangerouslySetInnerHTML={{ __html: ic('cube') }}
              />
              <button
                type="button"
                className="s-ic"
                data-act="search"
                aria-label="جستجو"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(true);
                }}
                dangerouslySetInnerHTML={{ __html: ic('search') }}
              />
              <button
                type="button"
                className="s-ic"
                data-act="theme"
                aria-label="تغییر حالت روز و شب"
                onClick={() => setNight(!night)}
                dangerouslySetInnerHTML={{ __html: ic(night ? 'sun' : 'moon') }}
              />
              <a
                className="s-ic s-hide-m"
                href="#wish"
                aria-label="علاقه‌مندی‌ها"
              >
                <span dangerouslySetInnerHTML={{ __html: ic('heart') }} />
                <span
                  className={`s-cc ${wishCount > 0 ? 'on' : ''}`}
                  data-cc="wish"
                >
                  {toFa(wishCount)}
                </span>
              </a>
              <button
                type="button"
                className="s-ic"
                data-act="cart"
                aria-label="سبد خرید"
                onClick={() => setCartOpen(true)}
              >
                <span dangerouslySetInnerHTML={{ __html: ic('bag') }} />
                <span
                  className={`s-cc ${cartCount > 0 ? 'on' : ''} ${cartBump ? 'bump' : ''}`}
                  data-cc="cart"
                >
                  {toFa(cartCount)}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main id="sv">
          {/* 1. STORE HOME (#shop) */}
          {routeA === 'shop' && !routeB && (() => {
            const best = PRODUCTS.filter((p) => p.tag === 'پرفروش' || p.id === 4).slice(0, 4);
            const neu = [...PRODUCTS].sort((a, b) => b.d - a.d).slice(0, 4);
            const hItems: [number, string, string, number, number][] = [
              [1, '38%', '17%', 0.95, -1],
              [4, '14%', '40%', 1.25, -3],
              [7, '60%', '28%', 0.9, -2],
            ];
            return (
              <div className="s-view">
                <section className="s-wrap s-hero">
                  <div>
                    <span className="s-eye">کالکشن پاییز {toFa(1405)}</span>
                    <h1>
                      زیورهای <i>جنگل طلایی</i>
                    </h1>
                    <p>
                      قطعه‌هایی سبک و دست‌ساز از طلای ۱۸ عیار؛ هر کدام آویخته از نخی نازک، مثل برگی که در نسیم می‌رقصد.
                    </p>
                    <div className="s-row">
                      <a className="s-btn" href="#shop/all">
                        خرید کالکشن
                      </a>
                      <a className="s-btn ghost" href="#shop/necklaces">
                        برگ نی، نشان NEY
                      </a>
                    </div>
                    <div className="s-stats">
                      <div>
                        <b>{toFa(18)} عیار</b>طلای استاندارد
                      </div>
                      <div>
                        <b>{toFa(100)}٪</b>دست‌ساز
                      </div>
                      <div>
                        <b>{toFa(7)} روز</b>ضمانت بازگشت
                      </div>
                    </div>
                  </div>

                  <div
                    className="s-art"
                    onClick={(e) => {
                      if (heroMode !== 'paper') return;
                      if ((e.target as HTMLElement).closest('.s-art-mode-btn')) return;
                      const hs = e.currentTarget.querySelectorAll<SVGSVGElement>('.s-hh svg');
                      const targetSvg = hs[Math.floor(Math.random() * hs.length)];
                      if (targetSvg) {
                        targetSvg.style.animation = 'none';
                        void targetSvg.getBoundingClientRect();
                        targetSvg.style.animation = 'spinY 1.4s var(--out)';
                        burstElement(targetSvg as unknown as HTMLElement);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="s-art-mode-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeroMode((m) => (m === 'paper' ? '3d' : 'paper'));
                      }}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ic(heroMode === 'paper' ? 'cube' : 'tree'),
                        }}
                        style={{ width: 16, height: 16, display: 'inline-block' }}
                      />
                      <span>
                        {heroMode === 'paper' ? 'نمای سه‌بعدی تعاملی' : 'نمای کاغذی آویخته'}
                      </span>
                    </button>

                    {heroMode === 'paper' ? (
                      <>
                        {hItems.map(([id, x, len, sc, dl]) => {
                          const p = byId(id)!;
                          const J = SJ[p.t];
                          const innerSvg = jsvg(p.t)
                            .replace(/^<svg[^>]*>/, '')
                            .replace(/<\/svg>$/, '');
                          return (
                            <div
                              key={id}
                              className={`s-hh gd-${p.gold} gm-${p.gem}`}
                              style={{ left: x, animationDelay: `${dl}s` }}
                            >
                              <span style={{ height: len.replace('%', 'cqh') }} />
                              <svg
                                style={{
                                  width: `${(J.w * 0.3 * sc).toFixed(1)}cqw`,
                                  height: `${(J.h * 0.3 * sc).toFixed(1)}cqw`,
                                }}
                                viewBox={`${-J.w / 2} 0 ${J.w} ${J.h}`}
                                dangerouslySetInnerHTML={{ __html: innerSvg }}
                              />
                            </div>
                          );
                        })}
                        <div className="s-art-tag">
                          <b>گردنبند برگ نی</b>
                          {fmt(52900000)}
                        </div>
                      </>
                    ) : (
                      <Jewel3DStudio
                        jewelType={hero3DType}
                        gold={hero3DGold}
                        gem={
                          hero3DType === 'neck'
                            ? 'ruby'
                            : hero3DType === 'ear'
                              ? 'em'
                              : 'dia'
                        }
                        night={night}
                        onGoldChange={setHero3DGold}
                        onTypeChange={setHero3DType}
                        showTypeSelector
                        compact
                      />
                    )}
                  </div>
                </section>

                <section className="s-wrap s-sec" style={{ paddingTop: 24 }}>
                  <div className="s-head">
                    <div>
                      <span className="s-eye">دسته‌بندی‌ها</span>
                      <h2 className="s-h2">برای هر لحظه، یک درخشش</h2>
                    </div>
                    <a className="s-link" href="#shop/all">
                      همه محصولات
                    </a>
                  </div>
                  <div className="s-cats">
                    {(Object.keys(CAT) as CategoryId[]).map((c, i) => {
                      const p = PRODUCTS.find((q) => q.cat === c)!;
                      const cnt = PRODUCTS.filter((q) => q.cat === c).length;
                      return (
                        <a key={c} className="s-cat" href={`#shop/${c}`}>
                          {renderProductImg(p, null, '', -i * 1.3)}
                          <div>
                            <b>{CAT[c]}</b>
                            <small>{toFa(cnt)} مدل</small>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </section>

                <section className="s-wrap s-sec" style={{ paddingTop: 0 }}>
                  <div className="s-head">
                    <div>
                      <span className="s-eye">محبوب‌ترین‌ها</span>
                      <h2 className="s-h2">پرفروش‌های NEY</h2>
                    </div>
                    <a className="s-link" href="#shop/all">
                      مشاهده همه
                    </a>
                  </div>
                  <div className="s-grid">{best.map(renderProductCard)}</div>
                </section>

                <section className="s-wrap">
                  <div className="s-story">
                    <div>
                      <span className="s-eye">داستان NEY</span>
                      <h2 className="s-h2">از نی، تا نگین</h2>
                      <p>
                        «نی» در زبان ما نماد نغمه و ریشه است. NEY از همین ایده زاده شد: جواهری سبک که مثل برگی از نی، با هر حرکت تاب بخورد. هر قطعه در کارگاه ما طراحی، ریخته‌گری و با دست پرداخت می‌شود.
                      </p>
                      <a
                        className="s-btn ghost"
                        style={{ marginTop: 24 }}
                        href="#home"
                      >
                        <span dangerouslySetInnerHTML={{ __html: ic('tree') }} />
                        سفر به جنگل NEY
                      </a>
                    </div>
                    {renderFeats()}
                  </div>
                </section>

                <section className="s-wrap s-sec">
                  <div className="s-head">
                    <div>
                      <span className="s-eye">تازه‌ها</span>
                      <h2 className="s-h2">تازه‌های کالکشن پاییز</h2>
                    </div>
                    <a className="s-link" href="#shop/all">
                      مشاهده همه
                    </a>
                  </div>
                  <div className="s-grid">{neu.map(renderProductCard)}</div>
                </section>

                <section className="s-wrap s-sec" style={{ paddingTop: 0 }}>
                  <div className="s-news">
                    <span className="s-eye">خبرنامه</span>
                    <h2 className="s-h2">اولین نفری باشید که می‌بیند</h2>
                    <p>
                      کالکشن‌های تازه و رونمایی‌های محدود را زودتر از همه دریافت کنید.
                    </p>
                    <form
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!/^\S+@\S+\.\S+$/.test(newsEmail)) {
                          setNewsError(true);
                          return;
                        }
                        setNewsError(false);
                        setNewsEmail('');
                        toast('عضویت شما در خبرنامه NEY ثبت شد');
                        burstElement(e.currentTarget.querySelector('button'));
                      }}
                    >
                      <label className={`s-field ${newsError ? 'bad' : ''}`}>
                        <input
                          type="email"
                          required
                          placeholder="ایمیل شما"
                          aria-label="ایمیل"
                          dir="ltr"
                          style={{ textAlign: 'right' }}
                          value={newsEmail}
                          onChange={(e) => {
                            setNewsEmail(e.target.value);
                            setNewsError(false);
                          }}
                        />
                        <em>ایمیل معتبر وارد کنید</em>
                      </label>
                      <button className="s-btn" type="submit">
                        عضویت
                      </button>
                    </form>
                  </div>
                </section>

                {renderFooter()}
              </div>
            );
          })()}

          {/* 2. PRODUCT LISTING (#shop/:cat or #rings etc.) */}
          {(routeA === 'shop' && Boolean(routeB)) || CAT[routeA as CategoryId] ? (() => {
            const rawCat = (routeB || routeA) as string;
            const activeCat: 'all' | CategoryId = CAT[rawCat as CategoryId]
              ? (rawCat as CategoryId)
              : 'all';
            const title = activeCat === 'all' ? 'همه محصولات' : CAT[activeCat];
            const desc =
              activeCat === 'all'
                ? 'کالکشن کامل NEY؛ طلای ۱۸ عیار، دست‌ساز و دارای ضمانت اصالت.'
                : CATD[activeCat];
            const items = filterAndSortProducts(PRODUCTS, {
              cat: activeCat,
              gold: fGold,
              gem: fGem,
              sort: fSort,
            });

            return (
              <div className="s-view">
                <div className="s-wrap">
                  <div className="s-lhead">
                    <span className="s-eye">فروشگاه</span>
                    <h1>{title}</h1>
                    <p>{desc}</p>
                  </div>

                  <div className="s-chips" role="tablist">
                    <a
                      className={`s-chip ${activeCat === 'all' ? 'on' : ''}`}
                      href="#shop/all"
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      همه
                    </a>
                    {(Object.keys(CAT) as CategoryId[]).map((c) => (
                      <a
                        key={c}
                        className={`s-chip ${activeCat === c ? 'on' : ''}`}
                        href={`#shop/${c}`}
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                      >
                        {CAT[c]}
                      </a>
                    ))}
                  </div>

                  <div className="s-bar">
                    <div className="s-fl">
                      <div className="s-g">
                        <span>رنگ طلا</span>
                        {(Object.keys(GOLD) as GoldCode[]).map((g) => (
                          <button
                            key={g}
                            type="button"
                            className={`s-sw ${fGold === g ? 'on' : ''}`}
                            data-v={g}
                            aria-label={`طلای ${GOLD[g]}`}
                            title={GOLD[g]}
                            onClick={() => setFGold((prev) => (prev === g ? null : g))}
                          />
                        ))}
                      </div>
                      <div className="s-g">
                        <span>نگین</span>
                        {(Object.keys(GEM) as GemCode[]).map((g) => (
                          <button
                            key={g}
                            type="button"
                            className={`s-chip ${fGem === g ? 'on' : ''}`}
                            style={{ height: 32, padding: '0 12px' }}
                            onClick={() => setFGem((prev) => (prev === g ? null : g))}
                          >
                            {GEM[g]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className="s-g"
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span className="s-cnt" id="sCnt">
                        {toFa(items.length)} محصول
                      </span>
                      <select
                        className="s-sel"
                        aria-label="مرتب‌سازی"
                        value={fSort}
                        onChange={(e) => setFSort(e.target.value as SortMode)}
                      >
                        <option value="rec">پیشنهاد NEY</option>
                        <option value="new">جدیدترین</option>
                        <option value="low">ارزان‌ترین</option>
                        <option value="high">گران‌ترین</option>
                      </select>
                    </div>
                  </div>

                  <div id="sGrid">
                    {items.length ? (
                      <div className="s-grid">{items.map(renderProductCard)}</div>
                    ) : (
                      <div className="s-empty">
                        <span dangerouslySetInnerHTML={{ __html: ic('search') }} />
                        <p>محصولی با این فیلترها پیدا نشد.</p>
                        <button
                          type="button"
                          className="s-btn ghost"
                          onClick={() => {
                            setFGold(null);
                            setFGem(null);
                          }}
                        >
                          حذف فیلترها
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ height: 72 }} />
                {renderFooter()}
              </div>
            );
          })() : null}

          {/* 3. PRODUCT DETAIL PAGE (#p/:id) */}
          {routeA === 'p' && (() => {
            const id = Number(routeB);
            const p = byId(id) || PRODUCTS[0];
            const w = wish.includes(p.id);
            const rel = PRODUCTS.filter((q) => q.cat === p.cat && q.id !== p.id)
              .concat(PRODUCTS.filter((q) => q.cat !== p.cat && q.gem === p.gem))
              .slice(0, 4);
            const opts = OPTS[p.t];

            return (
              <div className="s-view">
                <div className="s-wrap">
                  <nav className="s-crumb">
                    <a href="#shop">فروشگاه</a>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ic('chev').replace(
                          '<svg',
                          '<svg width="14" height="14" style="fill:none;stroke:currentColor;stroke-width:1.6"'
                        ),
                      }}
                    />
                    <a href={`#shop/${p.cat}`}>{CAT[p.cat]}</a>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ic('chev').replace(
                          '<svg',
                          '<svg width="14" height="14" style="fill:none;stroke:currentColor;stroke-width:1.6"'
                        ),
                      }}
                    />
                    <span>{p.name}</span>
                  </nav>

                  <div className="s-pdp">
                    <div className="s-pdp-img">
                      <div className="s-pdp-mode-bar">
                        <button
                          type="button"
                          className={`s-chip ${pdpMode === 'paper' ? 'on' : ''}`}
                          onClick={() => setPdpMode('paper')}
                        >
                          نمای کاغذی آویخته
                        </button>
                        <button
                          type="button"
                          className={`s-chip ${pdpMode === '3d' ? 'on' : ''}`}
                          onClick={() => setPdpMode('3d')}
                        >
                          ✦ آتلیه سه‌بعدی تعاملی (3D)
                        </button>
                      </div>

                      {pdpMode === 'paper' ? (
                        <>
                          <div
                            id="pImg"
                            role="button"
                            tabIndex={0}
                            aria-label="چرخاندن جواهر"
                            onClick={(e) => {
                              setPdpSpin(false);
                              window.setTimeout(() => setPdpSpin(true), 10);
                              burstElement(e.currentTarget.querySelector('.s-jw'));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setPdpSpin(false);
                                window.setTimeout(() => setPdpSpin(true), 10);
                              }
                            }}
                          >
                            <div
                              className={`s-img gd-${pdGold} gm-${p.gem}`}
                              data-t={p.t}
                            >
                              <div
                                className="s-hang"
                                style={{ '--dl': '0s' } as React.CSSProperties}
                              >
                                <span className="s-thr" />
                                <div
                                  className={`s-jw ${pdpSpin ? 'spin' : ''}`}
                                  dangerouslySetInnerHTML={{ __html: jsvg(p.t) }}
                                />
                              </div>
                            </div>
                          </div>
                          <p className="s-pdp-note">
                            برای چرخاندن جواهر، رویش بزنید یا وارد آتلیه سه‌بعدی شوید
                          </p>
                        </>
                      ) : (
                        <div className="s-img" style={{ aspectRatio: '1', borderRadius: 24 }}>
                          <Jewel3DStudio
                            jewelType={p.t}
                            gold={pdGold}
                            gem={p.gem}
                            night={night}
                            onGoldChange={(g) => setPdGold(g)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="s-info">
                      <span className="s-eye">{p.tag || CAT[p.cat]}</span>
                      <h1>{p.name}</h1>
                      <p className="s-sub">
                        {GEM[p.gem]} · طلای ۱۸ عیار · وزن تقریبی {toFa(p.wt)} گرم
                      </p>
                      <div className="s-price">{fmt(p.price)}</div>
                      <p className="s-desc">{DESC[p.t]}</p>

                      <div className="s-opt">
                        <h4>
                          رنگ طلا <span id="pGoldN">{GOLD[pdGold]}</span>
                        </h4>
                        <div className="s-chips">
                          {(Object.keys(GOLD) as GoldCode[]).map((g) => (
                            <button
                              key={g}
                              type="button"
                              className={`s-sw ${pdGold === g ? 'on' : ''}`}
                              data-v={g}
                              aria-label={`طلای ${GOLD[g]}`}
                              onClick={() => setPdGold(g)}
                            />
                          ))}
                        </div>
                      </div>

                      {opts && (
                        <div className="s-opt">
                          <h4>
                            {OPTN[p.t]}
                            {p.t === 'ring' && <span>راهنمای سایز در پایین صفحه</span>}
                          </h4>
                          <div className="s-chips">
                            {opts.map((o) => (
                              <button
                                key={o}
                                type="button"
                                className={`s-chip ${pdOpt === o ? 'on' : ''}`}
                                onClick={() => setPdOpt(o)}
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="s-buy">
                        <div className="s-qty">
                          <button
                            type="button"
                            aria-label="افزایش"
                            onClick={() => setPdQty((q) => clamp(q + 1, 1, 9))}
                            dangerouslySetInnerHTML={{ __html: ic('plus') }}
                          />
                          <b id="pQ">{toFa(pdQty)}</b>
                          <button
                            type="button"
                            aria-label="کاهش"
                            onClick={() => setPdQty((q) => clamp(q - 1, 1, 9))}
                            dangerouslySetInnerHTML={{ __html: ic('minus') }}
                          />
                        </div>
                        <button
                          type="button"
                          className="s-btn"
                          onClick={(e) =>
                            addCart(p.id, pdGold, pdOpt, pdQty, e.currentTarget)
                          }
                        >
                          <span dangerouslySetInnerHTML={{ __html: ic('bag') }} />
                          افزودن به سبد
                        </button>
                        <button
                          type="button"
                          className={`s-wbig ${w ? 'on' : ''}`}
                          aria-pressed={w}
                          aria-label="علاقه‌مندی"
                          onClick={(e) => toggleWish(p.id, e.currentTarget)}
                          dangerouslySetInnerHTML={{ __html: ic('heart') }}
                        />
                      </div>

                      <div className="s-trust">
                        <div>
                          <span dangerouslySetInnerHTML={{ __html: ic('shield') }} />
                          ضمانت اصالت
                        </div>
                        <div>
                          <span dangerouslySetInnerHTML={{ __html: ic('truck') }} />
                          ارسال بیمه‌شده
                        </div>
                        <div>
                          <span dangerouslySetInnerHTML={{ __html: ic('gift') }} />
                          بسته‌بندی هدیه
                        </div>
                      </div>

                      <div className="s-acc">
                        <details open>
                          <summary>مشخصات</summary>
                          <div className="s-accb">
                            <dl className="s-spec">
                              <dt>جنس</dt>
                              <dd>طلای ۱۸ عیار (۷۵۰)</dd>
                              <dt>نگین</dt>
                              <dd>
                                {GEM[p.gem]}
                                {p.t === 'ear' ? ' و مروارید پرورشی' : ''}
                              </dd>
                              <dt>وزن تقریبی</dt>
                              <dd>{toFa(p.wt)} گرم</dd>
                              <dt>کد محصول</dt>
                              <dd>NEY-{toFa(String(p.id).padStart(3, '0'))}</dd>
                            </dl>
                          </div>
                        </details>
                        {p.t === 'ring' && (
                          <details>
                            <summary>راهنمای سایز</summary>
                            <div className="s-accb">
                              نخی را دور انگشت بپیچید و طول آن را بر حسب میلی‌متر اندازه بگیرید؛ این عدد سایز شماست (مثلاً ۵۲ میلی‌متر = سایز ۵۲). اگر بین دو سایز بودید، سایز بزرگ‌تر را انتخاب کنید. تعویض سایز تا ۷ روز رایگان است.
                            </div>
                          </details>
                        )}
                        <details>
                          <summary>ارسال و بازگشت</summary>
                          <div className="s-accb">
                            ارسال بیمه‌شده به سراسر کشور در ۲ تا ۴ روز کاری؛ برای سفارش‌های بالای ۵۰ میلیون تومان رایگان است. تا ۷ روز امکان بازگشت یا تعویض وجود دارد.
                          </div>
                        </details>
                        <details>
                          <summary>نگهداری</summary>
                          <div className="s-accb">
                            پیش از استفاده از عطر و کرم، جواهر را درآورید. با پارچه نرم تمیز کنید و هر قطعه را جداگانه در جعبه NEY نگه دارید.
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>

                  <section className="s-sec">
                    <div className="s-head">
                      <div>
                        <span className="s-eye">پیشنهاد ما</span>
                        <h2 className="s-h2">شاید این‌ها را هم دوست داشته باشید</h2>
                      </div>
                    </div>
                    <div className="s-grid">{rel.map(renderProductCard)}</div>
                  </section>
                </div>
                {renderFooter()}
              </div>
            );
          })()}

          {/* 4. WISHLIST (#wish) */}
          {routeA === 'wish' && (() => {
            const list = PRODUCTS.filter((p) => wish.includes(p.id));
            return (
              <div className="s-view">
                <div className="s-wrap">
                  <div className="s-lhead">
                    <span className="s-eye">فهرست شما</span>
                    <h1>علاقه‌مندی‌ها</h1>
                  </div>
                  {list.length ? (
                    <div className="s-grid">{list.map(renderProductCard)}</div>
                  ) : (
                    <div className="s-empty">
                      <span dangerouslySetInnerHTML={{ __html: ic('heart') }} />
                      <p>هنوز چیزی به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>
                      <a className="s-btn" href="#shop/all">
                        گشتی در فروشگاه
                      </a>
                    </div>
                  )}
                </div>
                <div style={{ height: 72 }} />
                {renderFooter()}
              </div>
            );
          })()}

          {/* 5. CHECKOUT (#checkout) */}
          {routeA === 'checkout' && (
            <div className="s-view">
              <div className="s-wrap">
                {!cart.length ? (
                  <div className="s-empty">
                    <span dangerouslySetInnerHTML={{ __html: ic('bag') }} />
                    <p>سبد خرید شما خالی است.</p>
                    <a className="s-btn" href="#shop/all">
                      مشاهده محصولات
                    </a>
                  </div>
                ) : (
                  <>
                    <h1
                      className="s-co-h"
                      style={{
                        fontSize: 'clamp(1.5rem,1.1rem + 1.6vw,2.2rem)',
                        fontWeight: 500,
                        padding: '28px 0 0',
                      }}
                    >
                      تکمیل خرید
                    </h1>
                    <form
                      className="s-co"
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        const res = validateCheckoutForm({
                          name: coName,
                          phone: coPhone,
                          city: coCity,
                          zip: coZip,
                          addr: coAddr,
                        });
                        setCoErrors(res.errors);
                        if (!res.valid) {
                          toast('لطفاً موارد مشخص‌شده را کامل کنید');
                          return;
                        }
                        const orderObj = {
                          name: coName.trim(),
                          code: 'NEY-' + toFa(Math.floor(10000 + Math.random() * 89999)),
                          total: subtotal + shippingCost,
                          ship: coShip,
                        };
                        setLastOrder(orderObj);
                        setCart([]);
                        window.location.hash = '#done';
                      }}
                    >
                      <div>
                        <div className="s-box">
                          <h3>
                            <i>{toFa(1)}</i>اطلاعات گیرنده
                          </h3>
                          <div className="s-fg">
                            <label className={`s-field ${coErrors.name ? 'bad' : ''}`}>
                              <span>نام و نام خانوادگی</span>
                              <input
                                name="name"
                                type="text"
                                value={coName}
                                onChange={(e) => {
                                  setCoName(e.target.value);
                                  setCoErrors((p) => ({ ...p, name: false }));
                                }}
                              />
                              <em>نام را کامل وارد کنید</em>
                            </label>
                            <label className={`s-field ${coErrors.phone ? 'bad' : ''}`}>
                              <span>شماره موبایل</span>
                              <input
                                name="phone"
                                type="tel"
                                inputMode="numeric"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                value={coPhone}
                                onChange={(e) => {
                                  setCoPhone(e.target.value);
                                  setCoErrors((p) => ({ ...p, phone: false }));
                                }}
                              />
                              <em>شماره موبایل معتبر نیست</em>
                            </label>
                            <label className={`s-field ${coErrors.city ? 'bad' : ''}`}>
                              <span>استان و شهر</span>
                              <input
                                name="city"
                                type="text"
                                placeholder="تهران، تهران"
                                value={coCity}
                                onChange={(e) => {
                                  setCoCity(e.target.value);
                                  setCoErrors((p) => ({ ...p, city: false }));
                                }}
                              />
                              <em>شهر را وارد کنید</em>
                            </label>
                            <label className="s-field">
                              <span>کد پستی (اختیاری)</span>
                              <input
                                name="zip"
                                type="tel"
                                inputMode="numeric"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                                value={coZip}
                                onChange={(e) => setCoZip(e.target.value)}
                              />
                              <em />
                            </label>
                            <label className={`s-field w ${coErrors.addr ? 'bad' : ''}`}>
                              <span>نشانی کامل</span>
                              <textarea
                                name="addr"
                                value={coAddr}
                                onChange={(e) => {
                                  setCoAddr(e.target.value);
                                  setCoErrors((p) => ({ ...p, addr: false }));
                                }}
                              />
                              <em>نشانی را کامل‌تر بنویسید</em>
                            </label>
                          </div>
                        </div>

                        <div className="s-box">
                          <h3>
                            <i>{toFa(2)}</i>روش ارسال
                          </h3>
                          <label className="s-radio">
                            <input
                              type="radio"
                              name="ship"
                              value="post"
                              checked={coShip === 'post'}
                              onChange={() => setCoShip('post')}
                            />
                            <span>
                              پست پیشتاز بیمه‌شده
                              <small>۲ تا ۴ روز کاری · سراسر کشور</small>
                            </span>
                            <b style={{ fontWeight: 500, fontSize: '.85rem' }}>
                              {subtotal >= FREE_SHIPPING_THRESHOLD ? 'رایگان' : fmt(350000)}
                            </b>
                          </label>
                          <label className="s-radio">
                            <input
                              type="radio"
                              name="ship"
                              value="courier"
                              checked={coShip === 'courier'}
                              onChange={() => setCoShip('courier')}
                            />
                            <span>
                              پیک ویژه NEY
                              <small>تحویل همان روز · فقط تهران</small>
                            </span>
                            <b style={{ fontWeight: 500, fontSize: '.85rem' }}>
                              {fmt(450000)}
                            </b>
                          </label>
                          <label className="s-radio">
                            <input
                              type="checkbox"
                              name="gift"
                              checked={coGift}
                              onChange={(e) => setCoGift(e.target.checked)}
                            />
                            <span>
                              بسته‌بندی هدیه
                              <small>جعبه چوبی NEY با کارت دست‌نویس · رایگان</small>
                            </span>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: ic('gift').replace(
                                  '<svg',
                                  '<svg width="22" height="22" style="fill:none;stroke:var(--s-gold);stroke-width:1.5"'
                                ),
                              }}
                            />
                          </label>
                        </div>

                        <div className="s-box">
                          <h3>
                            <i>{toFa(3)}</i>روش پرداخت
                          </h3>
                          <label className="s-radio">
                            <input
                              type="radio"
                              name="pay"
                              value="online"
                              checked={coPay === 'online'}
                              onChange={() => setCoPay('online')}
                            />
                            <span>
                              پرداخت اینترنتی
                              <small>از طریق درگاه امن بانکی</small>
                            </span>
                          </label>
                          <label className="s-radio">
                            <input
                              type="radio"
                              name="pay"
                              value="card"
                              checked={coPay === 'card'}
                              onChange={() => setCoPay('card')}
                            />
                            <span>
                              کارت به کارت
                              <small>شماره کارت پس از ثبت سفارش نمایش داده می‌شود</small>
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="s-sum">
                        <div id="sSum">
                          <div className="s-box">
                            <h3>خلاصه سفارش</h3>
                            {cart.map((c) => {
                              const p = byId(c.id);
                              if (!p) return null;
                              return (
                                <div key={c.key} className="s-line">
                                  {renderProductImg(p, c.gold, 'mini', 0)}
                                  <div className="s-li">
                                    <b>{p.name}</b>
                                    <small>
                                      طلای {GOLD[c.gold]}
                                      {c.opt !== '—' ? ' · ' + c.opt : ''} · {toFa(c.qty)} عدد
                                    </small>
                                  </div>
                                  <span style={{ fontSize: '.85rem' }}>
                                    {fmt(p.price * c.qty)}
                                  </span>
                                </div>
                              );
                            })}
                            <div style={{ marginTop: 14 }}>
                              <div className="s-tot">
                                <span>جمع کالاها</span>
                                <span>{fmt(subtotal)}</span>
                              </div>
                              <div className="s-tot">
                                <span>هزینه ارسال</span>
                                <span>{shippingCost ? fmt(shippingCost) : 'رایگان'}</span>
                              </div>
                              <div className="s-tot big">
                                <span>مبلغ قابل پرداخت</span>
                                <span>{fmt(subtotal + shippingCost)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          className="s-btn full"
                          type="submit"
                          style={{ marginTop: 16 }}
                        >
                          ثبت سفارش و پرداخت
                        </button>
                        <p className="s-demo">
                          نسخه نمایشی — پرداخت واقعی انجام نمی‌شود.
                        </p>
                      </div>
                    </form>
                  </>
                )}
              </div>
              {renderFooter()}
            </div>
          )}

          {/* 6. ORDER DONE (#done) */}
          {routeA === 'done' && (
            <div className="s-view">
              <div className="s-wrap">
                <div className="s-done">
                  <div
                    className="s-ok"
                    dangerouslySetInnerHTML={{ __html: ic('check') }}
                  />
                  <h1>سفارش شما ثبت شد</h1>
                  <p>
                    {lastOrder?.name || 'همراه'} عزیز، از خرید شما سپاسگزاریم. کد پیگیری سفارش:{' '}
                    <b style={{ color: 'var(--s-ink)' }}>
                      {lastOrder?.code || 'NEY-۵۴۳۲۱'}
                    </b>
                  </p>
                  <p>
                    مبلغ {fmt(lastOrder?.total || 0)} · ارسال با{' '}
                    {lastOrder?.ship === 'courier'
                      ? 'پیک ویژه NEY'
                      : 'پست پیشتاز بیمه‌شده'}
                  </p>
                  <div className="s-row">
                    <a className="s-btn" href="#shop">
                      بازگشت به فروشگاه
                    </a>
                    <a className="s-btn ghost" href="#home">
                      <span dangerouslySetInnerHTML={{ __html: ic('tree') }} />
                      جنگل NEY
                    </a>
                  </div>
                </div>
              </div>
              {renderFooter()}
            </div>
          )}
        </main>

        {/* MOBILE BOTTOM TABS */}
        <nav className="s-tabs" aria-label="منوی پایین">
          <a
            href="#shop"
            data-nav="shop"
            className={activeNav === 'shop' ? 'on' : ''}
          >
            <span dangerouslySetInnerHTML={{ __html: ic('home') }} />
            خانه
          </a>
          <a
            href="#shop/all"
            data-nav="all"
            className={
              activeNav === 'all' || Boolean(CAT[activeNav as CategoryId]) ? 'on' : ''
            }
          >
            <span dangerouslySetInnerHTML={{ __html: ic('grid') }} />
            فروشگاه
          </a>
          <a
            href="#wish"
            data-nav="wish"
            className={activeNav === 'wish' ? 'on' : ''}
          >
            <span dangerouslySetInnerHTML={{ __html: ic('heart') }} />
            علاقه‌مندی
            <span
              className={`s-cc ${wishCount > 0 ? 'on' : ''}`}
              data-cc="wish"
            >
              {toFa(wishCount)}
            </span>
          </a>
          <button type="button" onClick={() => setCartOpen(true)}>
            <span dangerouslySetInnerHTML={{ __html: ic('bag') }} />
            سبد خرید
            <span
              className={`s-cc ${cartCount > 0 ? 'on' : ''}`}
              data-cc="cart"
            >
              {toFa(cartCount)}
            </span>
          </button>
        </nav>

        {/* CART DRAWER */}
        <div
          className={`s-ov ${cartOpen ? 'open' : ''}`}
          id="sOv"
          onClick={() => setCartOpen(false)}
        />
        <aside
          className={`s-drawer ${cartOpen ? 'open' : ''}`}
          id="sDr"
          aria-label="سبد خرید"
        >
          <div className="s-dh">
            <b id="sDn">سبد خرید ({toFa(cartCount)})</b>
            <button
              type="button"
              className="s-ic"
              aria-label="بستن"
              onClick={() => setCartOpen(false)}
              dangerouslySetInnerHTML={{ __html: ic('x') }}
            />
          </div>
          <div className="s-db" id="sDb">
            {!cart.length ? (
              <div className="s-empty">
                <span dangerouslySetInnerHTML={{ __html: ic('bag') }} />
                <p>سبد خرید شما خالی است.</p>
                <a
                  className="s-btn"
                  href="#shop/all"
                  onClick={() => setCartOpen(false)}
                >
                  شروع خرید
                </a>
              </div>
            ) : (
              cart.map((c) => {
                const p = byId(c.id);
                if (!p) return null;
                return (
                  <div key={c.key} className="s-line">
                    <a href={`#p/${p.id}`} onClick={() => setCartOpen(false)}>
                      {renderProductImg(p, c.gold, 'mini', 0)}
                    </a>
                    <div className="s-li">
                      <b>{p.name}</b>
                      <small>
                        طلای {GOLD[c.gold]}
                        {c.opt !== '—' ? ' · ' + c.opt : ''}
                      </small>
                      <div className="s-lr">
                        <div className="s-qty sm">
                          <button
                            type="button"
                            aria-label="افزایش"
                            onClick={() =>
                              setCart((prev) => updateCartItemQty(prev, c.key, 1))
                            }
                            dangerouslySetInnerHTML={{ __html: ic('plus') }}
                          />
                          <b>{toFa(c.qty)}</b>
                          <button
                            type="button"
                            aria-label="کاهش"
                            onClick={() =>
                              setCart((prev) => updateCartItemQty(prev, c.key, -1))
                            }
                            dangerouslySetInnerHTML={{ __html: ic('minus') }}
                          />
                        </div>
                        <span>{fmt(p.price * c.qty)}</span>
                        <button
                          type="button"
                          className="s-rm"
                          aria-label="حذف"
                          onClick={() => {
                            setCart((prev) => prev.filter((x) => x.key !== c.key));
                            toast('از سبد خرید حذف شد');
                          }}
                          dangerouslySetInnerHTML={{ __html: ic('trash') }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="s-df" id="sDf">
            {cart.length > 0 && (() => {
              const left = FREE_SHIPPING_THRESHOLD - subtotal;
              const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
              return (
                <>
                  <div className="s-prog">
                    {left > 0
                      ? `فقط ${fmt(left)} تا ارسال رایگان`
                      : 'ارسال بیمه‌شده برای شما رایگان است ✓'}
                    <i style={{ '--p': `${pct}%` } as React.CSSProperties} />
                  </div>
                  <div className="s-tot big">
                    <span>جمع کل</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <a
                    className="s-btn full"
                    href="#checkout"
                    onClick={() => setCartOpen(false)}
                  >
                    ادامه و تکمیل خرید
                  </a>
                </>
              );
            })()}
          </div>
        </aside>

        {/* SEARCH DRAWER */}
        <div className={`s-search ${searchOpen ? 'open' : ''}`} id="sSr">
          <div className="s-wrap">
            <div className="s-sbox">
              <span dangerouslySetInnerHTML={{ __html: ic('search') }} />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="جستجو در NEY؛ مثلاً «زمرد» یا «انگشتر»"
                aria-label="جستجو"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="s-ic"
                aria-label="بستن"
                onClick={() => setSearchOpen(false)}
                dangerouslySetInnerHTML={{ __html: ic('x') }}
              />
            </div>
            <div className="s-sres" id="sSres">
              {searchList.length ? (
                searchList.slice(0, 8).map((p) => (
                  <a
                    key={p.id}
                    href={`#p/${p.id}`}
                    onClick={() => setSearchOpen(false)}
                  >
                    {renderProductImg(p, null, 'mini', 0)}
                    <span>
                      {p.name}
                      <small>{fmt(p.price)}</small>
                    </span>
                  </a>
                ))
              ) : (
                <p style={{ color: 'var(--s-ink2)', fontSize: '.88rem', padding: 8 }}>
                  نتیجه‌ای پیدا نشد.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* TOAST */}
        <div
          className={`s-toast ${toastText ? 'on' : ''}`}
          id="sToast"
          role="status"
          aria-live="polite"
        >
          {toastText}
        </div>
      </div>

      {/* FULLSCREEN 3D ATELIER MODAL */}
      {atelierOpen && (
        <div className="j3d-modal" dir="rtl" role="dialog" aria-label="آتلیه سه‌بعدی جواهرات NEY">
          <div className="j3d-modal-hd">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <b style={{ fontFamily: '"Young Serif", Georgia, serif', letterSpacing: '0.12em' }}>
                NEY 3D
              </b>
              <span>آتلیه سه‌بعدی جواهرات دست‌ساز</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['dia', 'ruby', 'em'] as GemCode[]).map((gm) => (
                <button
                  key={gm}
                  type="button"
                  className={`j3d-pill ${atelierGem === gm ? 'on' : ''}`}
                  onClick={() => setAtelierGem(gm)}
                >
                  نگین {GEM[gm]}
                </button>
              ))}
              <button
                type="button"
                className="s-ic"
                aria-label="بستن آتلیه سه‌بعدی"
                onClick={() => setAtelierOpen(false)}
                dangerouslySetInnerHTML={{ __html: ic('x') }}
              />
            </div>
          </div>
          <div className="j3d-modal-body">
            <Jewel3DStudio
              jewelType={atelierType}
              gold={atelierGold}
              gem={atelierGem}
              night={night}
              onGoldChange={setAtelierGold}
              onTypeChange={setAtelierType}
              showTypeSelector
            />
          </div>
        </div>
      )}
    </>
  );
}
