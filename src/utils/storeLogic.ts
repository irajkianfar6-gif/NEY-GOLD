export type CategoryId = 'rings' | 'necklaces' | 'earrings' | 'bracelets';
export type JewelType = 'ring' | 'neck' | 'ear' | 'brace';
export type GoldCode = 'y' | 'r' | 'w';
export type GemCode = 'dia' | 'ruby' | 'em';
export type SortMode = 'rec' | 'new' | 'low' | 'high';

export interface Product {
  id: number;
  cat: CategoryId;
  t: JewelType;
  name: string;
  gem: GemCode;
  gold: GoldCode;
  price: number;
  wt: number;
  tag?: string;
  d: number;
}

export interface CartItem {
  key: string;
  id: number;
  gold: GoldCode;
  opt: string;
  qty: number;
}

export interface FilterState {
  cat: 'all' | CategoryId;
  gold: GoldCode | null;
  gem: GemCode | null;
  sort: SortMode;
}

export const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const toFa = (s: string | number): string =>
  String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const toEn = (s: string): string =>
  String(s)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const fmt = (n: number): string =>
  toFa(Math.round(n).toLocaleString('en-US')).replace(/,/g, '٬') + ' تومان';

export const CAT: Record<CategoryId, string> = {
  rings: 'انگشتر',
  necklaces: 'گردنبند',
  earrings: 'گوشواره',
  bracelets: 'دستبند',
};

export const CATD: Record<CategoryId, string> = {
  rings: 'حلقه‌ها و انگشترهایی با نگین آویخته، مثل قطره‌ای که از برگ می‌چکد.',
  necklaces: 'آویزهای برگ نی؛ نشانه NEY، روی زنجیرهای ظریف کابلی.',
  earrings: 'گوشواره‌های قطره‌ای سبک با قاب طلا و مروارید پرورشی.',
  bracelets: 'النگوهای ظریف با نگین‌های ردیفی، برای هر روز و هر مهمانی.',
};

export const GOLD: Record<GoldCode, string> = {
  y: 'زرد',
  r: 'رزگلد',
  w: 'سفید',
};

export const GEM: Record<GemCode, string> = {
  dia: 'الماس',
  ruby: 'یاقوت',
  em: 'زمرد',
};

export const TYPE_MAP: Record<CategoryId, JewelType> = {
  rings: 'ring',
  necklaces: 'neck',
  earrings: 'ear',
  bracelets: 'brace',
};

export const DESC: Record<JewelType, string> = {
  ring: 'حلقه‌ای ظریف از طلای ۱۸ عیار با نگینی که مثل قطره شبنم از آن آویخته است. تمام مراحل ساخت، از ریخته‌گری تا نشاندن نگین، با دست در کارگاه NEY انجام می‌شود.',
  neck: 'آویزی به شکل برگ نی — نشانه برند NEY — با نگین کابوشن، روی زنجیر کابلی ظریف. سبک، روزمره و ماندگار.',
  ear: 'گوشواره قطره‌ای با قاب طلای ۱۸ عیار، نگین تراش‌خورده و یک مروارید پرورشی کوچک که با هر حرکت تاب می‌خورد.',
  brace: 'النگوی سبک با سه نگین در جلو. لبه‌های داخلی صیقلی و گرد شده‌اند تا استفاده روزانه راحت باشد.',
};

export const PRODUCTS: Product[] = ([
  { id: 1, cat: 'rings', name: 'حلقه سولیتر نی', gem: 'dia', gold: 'y', price: 48500000, wt: 3.2, tag: 'پرفروش', d: 1 },
  { id: 2, cat: 'rings', name: 'حلقه یاقوت شب', gem: 'ruby', gold: 'r', price: 36800000, wt: 2.9, tag: 'جدید', d: 9 },
  { id: 3, cat: 'rings', name: 'انگشتر زمرد جنگل', gem: 'em', gold: 'y', price: 41200000, wt: 3.4, d: 5 },
  { id: 4, cat: 'necklaces', name: 'گردنبند برگ نی', gem: 'ruby', gold: 'y', price: 52900000, wt: 4.1, tag: 'نشان برند', d: 2 },
  { id: 5, cat: 'necklaces', name: 'گردنبند برگ نی زمرد', gem: 'em', gold: 'w', price: 54300000, wt: 4.1, d: 7 },
  { id: 6, cat: 'necklaces', name: 'آویز قطره الماس', gem: 'dia', gold: 'r', price: 61500000, wt: 4.6, tag: 'جدید', d: 10 },
  { id: 7, cat: 'earrings', name: 'گوشواره قطره زمرد', gem: 'em', gold: 'y', price: 33900000, wt: 2.6, tag: 'پرفروش', d: 3 },
  { id: 8, cat: 'earrings', name: 'گوشواره قطره یاقوت', gem: 'ruby', gold: 'r', price: 32400000, wt: 2.6, d: 8 },
  { id: 9, cat: 'earrings', name: 'گوشواره شبنم', gem: 'dia', gold: 'w', price: 38700000, wt: 2.8, d: 11 },
  { id: 10, cat: 'bracelets', name: 'النگو سه‌نگین', gem: 'dia', gold: 'y', price: 69800000, wt: 7.4, tag: 'پرفروش', d: 4 },
  { id: 11, cat: 'bracelets', name: 'النگو یاقوت پاییز', gem: 'ruby', gold: 'r', price: 64200000, wt: 7.1, d: 12 },
  { id: 12, cat: 'bracelets', name: 'النگو زمرد', gem: 'em', gold: 'w', price: 66500000, wt: 7.2, tag: 'جدید', d: 6 },
] as const).map((p) => ({ ...p, t: TYPE_MAP[p.cat] }));

export const byId = (id: number): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

export const defOpt = (p: Product): string =>
  p.t === 'ring'
    ? '۵۲'
    : p.t === 'neck'
      ? '۴۵ سانتی‌متر'
      : p.t === 'brace'
        ? 'متوسط'
        : '—';

export const OPTS: Partial<Record<JewelType, string[]>> = {
  ring: ['۴۸', '۵۰', '۵۲', '۵۴', '۵۶', '۵۸'],
  neck: ['۴۲ سانتی‌متر', '۴۵ سانتی‌متر', '۵۰ سانتی‌متر'],
  brace: ['کوچک', 'متوسط', 'بزرگ'],
};

export const OPTN: Partial<Record<JewelType, string>> = {
  ring: 'سایز انگشت',
  neck: 'طول زنجیر',
  brace: 'اندازه',
};

export const FREE_SHIPPING_THRESHOLD = 50000000;

export function filterAndSortProducts(
  products: Product[],
  filter: FilterState
): Product[] {
  const filtered = products.filter(
    (p) =>
      (filter.cat === 'all' || p.cat === filter.cat) &&
      (!filter.gold || p.gold === filter.gold) &&
      (!filter.gem || p.gem === filter.gem)
  );
  if (filter.sort === 'low') {
    filtered.sort((x, y) => x.price - y.price);
  } else if (filter.sort === 'high') {
    filtered.sort((x, y) => y.price - x.price);
  } else if (filter.sort === 'new') {
    filtered.sort((x, y) => y.d - x.d);
  } else {
    filtered.sort((x, y) => x.d - y.d);
  }
  return filtered;
}

export function searchProducts(query: string): Product[] {
  const q = query.trim();
  if (!q) return PRODUCTS.filter((p) => Boolean(p.tag));
  return PRODUCTS.filter((p) =>
    `${p.name} ${CAT[p.cat]} ${GEM[p.gem]} ${GOLD[p.gold]}`.includes(q)
  );
}

export function addOrIncrementCartItem(
  cart: CartItem[],
  id: number,
  gold: GoldCode,
  opt: string,
  qty = 1
): CartItem[] {
  const key = `${id}|${gold}|${opt}`;
  const next = cart.map((c) => ({ ...c }));
  const existing = next.find((c) => c.key === key);
  if (existing) {
    existing.qty = Math.min(9, existing.qty + qty);
  } else {
    next.push({ key, id, gold, opt, qty: Math.min(9, Math.max(1, qty)) });
  }
  return next;
}

export function updateCartItemQty(
  cart: CartItem[],
  key: string,
  delta: number
): CartItem[] {
  const next: CartItem[] = [];
  for (const item of cart) {
    if (item.key !== key) {
      next.push({ ...item });
      continue;
    }
    const newQty = item.qty + delta;
    if (newQty >= 1) {
      next.push({ ...item, qty: Math.min(9, newQty) });
    }
  }
  return next;
}

export function calcSubtotal(cart: CartItem[]): number {
  return cart.reduce((acc, item) => {
    const p = byId(item.id);
    return acc + (p ? p.price * item.qty : 0);
  }, 0);
}

export function calcShippingCost(
  subtotal: number,
  method: 'post' | 'courier'
): number {
  if (method === 'courier') return 450000;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 350000;
}

export interface CheckoutInput {
  name: string;
  phone: string;
  city: string;
  zip?: string;
  addr: string;
}

export interface CheckoutValidationResult {
  valid: boolean;
  errors: {
    name: boolean;
    phone: boolean;
    city: boolean;
    addr: boolean;
  };
}

export function validateCheckoutForm(
  input: CheckoutInput
): CheckoutValidationResult {
  const nameOk = input.name.trim().length >= 3;
  const cleanPhone = toEn(input.phone.trim()).replace(/\D/g, '');
  const phoneOk = /^09\d{9}$/.test(cleanPhone);
  const cityOk = input.city.trim().length >= 2;
  const addrOk = input.addr.trim().length >= 10;

  return {
    valid: nameOk && phoneOk && cityOk && addrOk,
    errors: {
      name: !nameOk,
      phone: !phoneOk,
      city: !cityOk,
      addr: !addrOk,
    },
  };
}

/* ---------- Procedural Geometry Helpers ---------- */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, v));
export const f1 = (n: number): number => Math.round(n * 10) / 10;

export function mulberry(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function area(p: number[][]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i];
    const w = p[(i + 1) % p.length];
    a += q[0] * w[1] - w[0] * q[1];
  }
  return a / 2;
}

export function D(p: number[][]): string {
  if (p.length < 3) return '';
  const pts = area(p) < 0 ? p.slice().reverse() : p;
  return 'M' + pts.map((q) => f1(q[0]) + ',' + f1(q[1])).join('L') + 'Z';
}

export function rough(
  p: number[][],
  R: () => number,
  seg: number,
  amp: number
): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const k = Math.max(1, Math.round(L / seg));
    const nx = -dy / L;
    const ny = dx / L;
    for (let j = 0; j < k; j++) {
      const t = j / k + (j ? ((R() - 0.5) * 0.35) / k : 0);
      const o = (R() - 0.5) * 2 * amp * (j ? 1 : 0.35);
      out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
    }
  }
  return out;
}

export function circ(
  cx: number,
  cy: number,
  r: number,
  n: number
): number[][] {
  const p: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return p;
}

export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  n = 8
): number[][] {
  const p: number[][] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    p.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return p;
}
