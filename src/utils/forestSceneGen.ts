import {
  mulberry,
  D,
  rough,
  circ,
  ellipse,
  lerp,
  f1,
  type JewelType,
} from './storeLogic';

export const paper = (cls: string, d: string, g = true): string =>
  d ? `<path class="${cls}" d="${d}"/>` + (g ? `<path class="g" d="${d}"/>` : '') : '';

export function ridgeFn(
  R: () => number,
  base: number,
  amp: number,
  cycles: number,
  vw: number
): (x: number) => number {
  const terms = (
    [
      [0.6, 1],
      [1.3, 0.45],
      [3.1, 0.16],
      [7.3, 0.05],
    ] as [number, number][]
  ).map(([c, a]) => [(c * cycles * 2 * Math.PI) / vw, a * amp, R() * 6.283]);
  return (x: number) => {
    let y = base;
    for (const [f, a, p] of terms) y += Math.sin(x * f + p) * a;
    return y;
  };
}

export function sampleRidge(
  fn: (x: number) => number,
  R: () => number,
  x0: number,
  x1: number,
  step: number,
  j: number
): number[][] {
  const p: number[][] = [];
  let x = x0;
  while (x < x1) {
    p.push([x, fn(x) + (R() - 0.5) * 2 * j]);
    x += step * (0.55 + R() * 0.9);
  }
  p.push([x1, fn(x1)]);
  return p;
}

export function crest(fn: (x: number) => number, x: number, range: number): number {
  let best = x;
  let by = fn(x);
  for (let d = -range; d <= range; d += range / 14) {
    const y = fn(x + d);
    if (y < by) {
      by = y;
      best = x + d;
    }
  }
  return best;
}

export function pine(
  R: () => number,
  cx: number,
  by: number,
  h: number,
  w: number
): number[][] {
  const n = 3 + Math.floor(R() * 3);
  const th = h * 0.07;
  const tw = Math.max(1.2, w * 0.06);
  const step = (h - th) / (n + 0.6);
  const Lp: number[][] = [];
  const Rp: number[][] = [];
  for (let k = 0; k < n; k++) {
    const y = by - th - k * step;
    const f = 1 - k / (n + 0.3);
    const wl = w * 0.5 * f * (0.88 + R() * 0.24);
    const wr = w * 0.5 * f * (0.88 + R() * 0.24);
    const nw = w * 0.5 * f * 0.42;
    Lp.push([cx - wl, y + (R() - 0.5) * step * 0.2], [cx - nw, y - step * 1.22]);
    Rp.push(
      [cx + wr, y + (R() - 0.5) * step * 0.2],
      [cx + nw * (0.85 + R() * 0.3), y - step * 1.22]
    );
  }
  Rp.reverse();
  return [
    [cx - tw, by + 8],
    [cx - tw, by - th],
    ...Lp,
    [cx + (R() - 0.5) * w * 0.05, by - h],
    ...Rp,
    [cx + tw, by - th],
    [cx + tw, by + 8],
  ];
}

export function cloud(
  R: () => number,
  cx: number,
  cy: number,
  w: number
): { pts: number[][]; top: number; sx: number } {
  const n = 4 + Math.floor(R() * 2);
  const pts: number[][] = [
    [cx + w / 2, cy],
    [cx - w / 2, cy],
  ];
  let top = cy;
  let sx = cx;
  for (let i = 0; i < n; i++) {
    const xi = cx - w / 2 + (w * (i + 0.5)) / n;
    const ri =
      (w / n) *
      0.62 *
      (1 + 0.75 * Math.sin((Math.PI * (i + 0.5)) / n)) *
      (0.9 + R() * 0.2);
    const a0 = i === 0 ? Math.PI : Math.PI * 0.86;
    const a1 = i === n - 1 ? 0 : Math.PI * 0.14;
    for (let j = 0; j <= 8; j++) {
      const a = a0 + ((a1 - a0) * j) / 8;
      pts.push([xi + Math.cos(a) * ri, Math.min(cy, cy - Math.sin(a) * ri * 0.9)]);
    }
    if (cy - ri * 0.9 < top) {
      top = cy - ri * 0.9;
      sx = xi;
    }
  }
  return { pts, top, sx };
}

export function fern(R: () => number, bx: number, by: number, size: number): string {
  let d = '';
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const a0 = -Math.PI / 2 + u * 1.05 + (R() - 0.5) * 0.2;
    const len = size * (1 - Math.abs(u) * 0.35) * (0.85 + R() * 0.3);
    const bend = (u >= 0 ? 1 : -1) * (0.5 + Math.abs(u) * 0.9) * (0.8 + R() * 0.4);
    const N = 10;
    let x = bx;
    let y = by;
    let a = a0;
    const sp: [number, number, number][] = [[x, y, a]];
    for (let j = 1; j <= N; j++) {
      a += bend / N;
      x += (Math.cos(a) * len) / N;
      y += (Math.sin(a) * len) / N;
      sp.push([x, y, a]);
    }
    const th = Math.max(0.8, size * 0.013);
    const Lp: number[][] = [];
    const Rp: number[][] = [];
    sp.forEach(([px, py, pa], j) => {
      const w = th * (1 - (j / N) * 0.7);
      Lp.push([px + Math.cos(pa - Math.PI / 2) * w, py + Math.sin(pa - Math.PI / 2) * w]);
      Rp.push([px + Math.cos(pa + Math.PI / 2) * w, py + Math.sin(pa + Math.PI / 2) * w]);
    });
    d += D([...Lp, ...Rp.reverse()]);
    for (let j = 1; j < N; j++) {
      const [x1, y1, a1] = sp[j];
      const [x2, y2] = sp[j + 1];
      const ll =
        len * 0.24 * Math.pow(1 - j / N, 0.7) * Math.min(1, j / 2.2) * (0.85 + R() * 0.3);
      for (const sd of [-1, 1]) {
        const pa = a1 + sd * 1.05;
        d += D([
          [x1, y1],
          [x1 + Math.cos(pa) * ll, y1 + Math.sin(pa) * ll],
          [x2, y2],
        ]);
      }
    }
  }
  return d;
}

export function mushroom(
  R: () => number,
  x: number,
  y: number,
  m: number,
  tilt: number
): { stem: string; cap: string; spots: string } {
  const ox = tilt * m * 0.12;
  const stem = [
    [x - m * 0.13, y + 3],
    [x - m * 0.1, y - m * 0.3],
    [x - m * 0.08 + ox, y - m * 0.58],
    [x + m * 0.08 + ox, y - m * 0.58],
    [x + m * 0.1, y - m * 0.3],
    [x + m * 0.14, y + 3],
  ];
  const cx = x + ox;
  const cy = y - m * 0.55;
  const rw = m * 0.42;
  const rh = m * 0.34;
  const cap: number[][] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    cap.push([cx + Math.cos(a) * rw, cy + Math.sin(a) * rh]);
  }
  cap.push([cx + rw * 0.7, cy + rh * 0.12], [cx, cy + rh * 0.2], [cx - rw * 0.7, cy + rh * 0.12]);
  let spots = '';
  (
    [
      [-0.42, -0.42, 0.06],
      [0.12, -0.72, 0.05],
      [0.5, -0.3, 0.045],
      [-0.08, -0.3, 0.035],
    ] as [number, number, number][]
  ).forEach(([a, b, r]) => {
    spots += D(rough(circ(cx + a * rw, cy + b * rh, m * r, 9), R, m * 0.03, m * 0.006));
  });
  return {
    stem: D(rough(stem, R, m * 0.14, m * 0.01)),
    cap: D(rough(cap, R, m * 0.1, m * 0.012)),
    spots,
  };
}

export function foxglove(
  R: () => number,
  bx: number,
  by: number,
  h: number,
  lean: number
): { stem: string; A: string; B: string } {
  const N = 16;
  const Ls: number[][] = [];
  const Rs: number[][] = [];
  const P = (t: number): [number, number] => [bx + lean * t * t, by - h * t];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = P(t);
    const w = Math.max(0.7, h * (0.02 - 0.013 * t));
    Ls.push([x - w, y]);
    Rs.push([x + w, y]);
  }
  const stem = D([[bx - h * 0.02, by + 6], ...Ls, ...Rs.reverse(), [bx + h * 0.02, by + 6]]);
  let A = '';
  let B = '';
  const nb = 8 + Math.floor(R() * 4);
  for (let i = 0; i < nb; i++) {
    const q = i / (nb - 1);
    const t = 0.3 + 0.62 * q;
    const [x, y] = P(t);
    const b = h * 0.088 * (1 - 0.55 * q);
    const side = R() < 0.72 ? 1 : -1;
    const th = -side * (0.5 + R() * 0.3);
    const c = Math.cos(th);
    const s = Math.sin(th);
    const loc: [number, number][] = [
      [-0.16, 0],
      [0.16, 0],
      [0.3, 0.55],
      [0.45, 0.98],
      [0.17, 0.86],
      [0, 1.02],
      [-0.17, 0.86],
      [-0.45, 0.98],
      [-0.3, 0.55],
    ];
    const pts = loc.map(([u, v]) => {
      const lx = u * b;
      const ly = v * b;
      return [x + side * h * 0.012 + lx * c - ly * s, y + lx * s + ly * c];
    });
    const d = D(rough(pts, R, b * 0.3, b * 0.02));
    if ((q < 0.5) !== (R() < 0.18)) B += d;
    else A += d;
  }
  [0.94, 0.97, 0.995].forEach((t, i) => {
    const [x, y] = P(t);
    A += D(circ(x, y, h * (0.016 - i * 0.003), 8));
  });
  return { stem, A, B };
}

export function cottage(
  R: () => number,
  x: number,
  by: number,
  c: number,
  out: { walls: string; roofs: string; doors: string; glows: string; wins: string },
  ci: number
): void {
  out.walls += D(
    rough(
      [
        [x - c * 0.5, by],
        [x - c * 0.5, by - c * 0.6],
        [x + c * 0.5, by - c * 0.6],
        [x + c * 0.5, by],
      ],
      R,
      c * 0.2,
      c * 0.01
    )
  );
  out.roofs += D(
    rough(
      [
        [x - c * 0.66, by - c * 0.56],
        [x - c * 0.05, by - c * 1.12],
        [x + c * 0.08, by - c * 1.12],
        [x + c * 0.66, by - c * 0.56],
      ],
      R,
      c * 0.2,
      c * 0.012
    )
  );
  out.roofs += D(
    rough(
      [
        [x + c * 0.24, by - c * 0.8],
        [x + c * 0.24, by - c * 1.16],
        [x + c * 0.38, by - c * 1.16],
        [x + c * 0.38, by - c * 0.66],
      ],
      R,
      c * 0.2,
      c * 0.008
    )
  );
  out.doors += D([
    [x - c * 0.07, by + 1],
    [x - c * 0.07, by - c * 0.33],
    [x + c * 0.08, by - c * 0.33],
    [x + c * 0.08, by + 1],
  ]);
  (
    [
      [x - c * 0.36, by - c * 0.45],
      [x + c * 0.2, by - c * 0.45],
    ] as [number, number][]
  ).forEach(([wx, wy], wi) => {
    const w = c * 0.16;
    const d = ci * 520 + wi * 260 + Math.round(R() * 200);
    out.glows += `<circle class="glow" style="--w:${d}ms" cx="${f1(wx + w / 2)}" cy="${f1(
      wy + w / 2
    )}" r="${f1(c * 0.6)}" fill="url(#winglow)"/>`;
    out.wins += `<path class="win" style="--w:${d}ms" d="${D([
      [wx, wy],
      [wx + w, wy],
      [wx + w, wy + w * 0.95],
      [wx, wy + w * 0.95],
    ])}"/>`;
  });
}

export function blade(
  x: number,
  by: number,
  h: number,
  lean: number,
  w: number
): string {
  const Lp: number[][] = [];
  const Rp: number[][] = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = x + lean * t * t;
    const py = by - h * t;
    const ww = (w / 2) * Math.pow(1 - t, 0.9);
    Lp.push([px - ww, py]);
    Rp.push([px + ww, py]);
  }
  return D([...Lp, ...Rp.reverse()]);
}

export function leafSVG(R: () => number, cls: string): string {
  const d = D(
    rough(
      [
        [0, -15],
        [4.6, -10],
        [7, -3],
        [6, 4],
        [2.6, 10],
        [0.8, 12.5],
        [0.9, 16],
        [-0.9, 16],
        [-0.8, 12.5],
        [-2.6, 10],
        [-6, 4],
        [-7, -3],
        [-4.6, -10],
      ],
      R,
      3,
      0.35
    )
  );
  return `<svg width="22" height="34" viewBox="-11 -17 22 34" aria-hidden="true" focusable="false"><path class="${cls}" d="${d}"/><path class="g" d="${d}"/><path class="vein" d="${D(
    [
      [0, -12],
      [0.7, -2],
      [0.3, 11],
      [-0.3, 11],
      [-0.7, -2],
    ]
  )}"/></svg>`;
}

export function makeGrain(): string {
  const S = 192;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  const d = img.data;
  const R = mulberry(7);
  const vgrid = (n: number) => {
    const a: number[] = [];
    for (let i = 0; i < n * n; i++) a.push(R());
    const v = (i: number, j: number) => a[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
    return (x: number, y: number) => {
      const gx = (x / S) * n;
      const gy = (y / S) * n;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      return lerp(
        lerp(v(x0, y0), v(x0 + 1, y0), sx),
        lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), sx),
        sy
      );
    };
  };
  const n1 = vgrid(6);
  const n2 = vgrid(16);
  const n3 = vgrid(48);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = n1(x, y) * 0.4 + n2(x, y) * 0.3 + n3(x, y) * 0.15 + R() * 0.15 - 0.5;
      const i = (y * S + x) * 4;
      if (v < 0) {
        d[i] = 58;
        d[i + 1] = 44;
        d[i + 2] = 30;
        d[i + 3] = Math.min(255, -v * 200);
      } else {
        d[i] = 255;
        d[i + 1] = 250;
        d[i + 2] = 238;
        d[i + 3] = Math.min(255, v * 160);
      }
    }
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let k = 0; k < 70; k++) {
    const x = R() * S;
    const y = R() * S;
    const a = R() * Math.PI * 2;
    const l = 4 + R() * 14;
    const dark = R() < 0.4;
    g.strokeStyle = dark ? 'rgba(28,19,13,.16)' : 'rgba(255,250,238,.36)';
    g.lineWidth = 0.5 + R() * 0.6;
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(
          x + ox + Math.cos(a + 0.6) * l * 0.5,
          y + oy + Math.sin(a + 0.6) * l * 0.5,
          x + ox + Math.cos(a) * l,
          y + oy + Math.sin(a) * l
        );
        g.stroke();
      }
    }
  }
  return c.toDataURL('image/png');
}

export function clipTag(el: HTMLElement | null): void {
  if (!el) return;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!w) return;
  const R = mulberry(Math.round(w * 7 + h));
  const c = Math.min(h * 0.3, 20);
  const pts = rough(
    [
      [c, 0],
      [w - c, 0],
      [w, c],
      [w, h],
      [0, h],
      [0, c],
    ],
    R,
    9,
    0.6
  );
  const hx = w / 2;
  const hy = 14;
  const hr = 4.5;
  el.style.clipPath = `path(evenodd, "M${pts
    .map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' L')} Z M${hx - hr} ${hy} a${hr} ${hr} 0 1 0 ${hr * 2} 0 a${hr} ${hr} 0 1 0 ${
    -hr * 2
  } 0 Z")`;
}

const star = (cx: number, cy: number, r: number): string =>
  D([
    [cx, cy - r],
    [cx + r * 0.2, cy - r * 0.2],
    [cx + r, cy],
    [cx + r * 0.2, cy + r * 0.2],
    [cx, cy + r],
    [cx - r * 0.2, cy + r * 0.2],
    [cx - r, cy],
    [cx - r * 0.2, cy - r * 0.2],
  ]);

const ring2 = (cx: number, cy: number, ro: number, ri: number, n = 40): string =>
  D(circ(cx, cy, ro, n)) + D(circ(cx, cy, ri, n));

function arcBand(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  n = 16
): string {
  const o: number[][] = [];
  const i: number[][] = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    o.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]);
    i.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]);
  }
  return D([...o, ...i.reverse()]);
}

function drop(cx: number, cy: number, r: number, n = 36): number[][] {
  const p: number[][] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    p.push([cx + r * Math.sin(t) * Math.sin(t / 2), cy - r * Math.cos(t)]);
  }
  return p;
}

export interface JewelShapeDef {
  id: JewelType;
  seed: number;
  w: number;
  h: number;
}

export function jewelSVG(J: JewelShapeDef): string {
  const R = mulberry(J.seed);
  const rr = (p: number[][], a = 0.18) => D(rough(p, R, 3, a));
  const vb = `${-J.w / 2} 0 ${J.w} ${J.h}`;
  let s = '';
  if (J.id === 'ring') {
    s += paper('jg3', ring2(0.9, 31, 22, 15.4));
    s += paper('jg1', ring2(0, 30, 21.2, 16.1));
    s += `<path class="jg2" d="${
      arcBand(0, 30, 17.4, 19.8, Math.PI * 1.08, Math.PI * 1.62) +
      arcBand(0, 30, 17.6, 19.2, Math.PI * 0.15, Math.PI * 0.3)
    }"/>`;
    s += paper(
      'jg3',
      rr([
        [-6.5, 48],
        [6.5, 48],
        [5, 54.5],
        [-5, 54.5],
      ])
    );
    s += paper(
      'jdi',
      rr(
        [
          [-5.5, 53],
          [5.5, 53],
          [9.5, 57],
          [0, 69],
          [-9.5, 57],
        ],
        0.12
      )
    );
    s += `<path class="jdi2" d="${
      D([
        [-9.5, 57],
        [0, 57],
        [0, 69],
      ]) +
      D([
        [3, 53],
        [5.5, 53],
        [9.5, 57],
        [4, 57],
      ])
    }"/><path class="jdi3" d="${
      D([
        [-5.5, 53],
        [-1, 53],
        [-3, 57],
      ]) +
      D([
        [0, 57],
        [4, 57],
        [0, 69],
      ])
    }"/>`;
    s += `<path class="jg1" d="${
      D([
        [-9.6, 55.2],
        [-6.6, 54],
        [-7.6, 58],
      ]) +
      D([
        [9.6, 55.2],
        [6.6, 54],
        [7.6, 58],
      ])
    }"/>`;
    s += `<ellipse class="jkn" cx="0" cy="5.5" rx="2.4" ry="4.2"/>`;
    s += `<path class="glint" d="${star(7, 60, 6)}"/><path class="glint g2" d="${star(
      -15,
      19,
      4
    )}"/>`;
  } else if (J.id === 'ear') {
    s += `<path class="jwire3" d="M0,1 C7,0.5 9.5,7 5.5,12 C2.8,15.2 0.8,17 0.6,21"/><path class="jwire1" d="M-.3,.6 C6.5,0 8.8,6.6 5,11.4 C2.4,14.6 .4,16.6 .2,20.6"/>`;
    s += paper('jg1', D(circ(0.5, 24, 3.7, 16)));
    s += `<path class="jg2" d="${D(circ(-0.6, 22.8, 1.2, 8))}"/>`;
    s += `<path class="jg3" d="${
      D(ellipse(0.5, 30, 1.5, 2.6, 0, 12)) + D(ellipse(0.5, 30, 0.6, 1.5, 0, 10))
    }"/>`;
    s += paper('jg3', D(drop(1.1, 47, 12.6)));
    s += paper('jg1', D(drop(0.5, 46.2, 12)));
    s += paper('jem', D(drop(0.5, 47.4, 9)), false);
    s += `<path class="jem2" d="${D([
      [0.5, 40],
      [-3.6, 46],
      [-1.6, 51],
      [0.5, 47],
    ])}"/><path class="jhi" d="${D(ellipse(-2.2, 45, 0.9, 2, 0.4, 8))}"/>`;
    s += `<path class="jg3" d="${D([
      [-0.3, 57.5],
      [1.3, 57.5],
      [1.3, 63],
      [-0.3, 63],
    ])}"/>`;
    s += paper('jpe', D(circ(0.5, 68.5, 5.6, 24)));
    s += `<path class="jpe2" d="${arcBand(
      0.5,
      68.5,
      3.2,
      5.4,
      Math.PI * -0.15,
      Math.PI * 0.8
    )}"/><path class="jhi" d="${D(circ(-1.3, 66.6, 1.2, 10))}"/>`;
    s += `<path class="jg1" d="${D(ellipse(0.5, 62.8, 2.6, 1.1, 0, 10))}"/>`;
    s += `<path class="glint" d="${star(9, 41, 5.5)}"/><path class="glint g2" d="${star(
      -6,
      72,
      3.6
    )}"/>`;
  } else if (J.id === 'brace') {
    s += `<line class="jkn" x1="0" y1="0" x2="0" y2="11"/>`;
    s += paper('jg3', D(ellipse(1, 39.5, 45, 27, 0, 56)) + D(ellipse(1, 39.5, 38.5, 20.5, 0, 52)));
    s += paper('jg1', D(ellipse(0, 38, 44, 26, 0, 56)) + D(ellipse(0, 38, 39, 21, 0, 52)));
    const arc = (
      a0: number,
      a1: number,
      r0x: number,
      r0y: number,
      r1x: number,
      r1y: number
    ) => {
      const o: number[][] = [];
      const q: number[][] = [];
      for (let k = 0; k <= 18; k++) {
        const a = a0 + ((a1 - a0) * k) / 18;
        o.push([Math.cos(a) * r1x, 38 + Math.sin(a) * r1y]);
        q.push([Math.cos(a) * r0x, 38 + Math.sin(a) * r0y]);
      }
      return D([...o, ...q.reverse()]);
    };
    s += `<path class="jg2" d="${
      arc(Math.PI * 1.12, Math.PI * 1.55, 40.2, 22.2, 42.6, 24.6) +
      arc(Math.PI * 0.12, Math.PI * 0.3, 40.4, 22.4, 42.4, 24.4)
    }"/>`;
    s += `<ellipse class="jkn" cx="0" cy="12.6" rx="2.2" ry="3"/>`;
    (
      [
        [-0.36, 3.6],
        [0, 4.7],
        [0.36, 3.6],
      ] as [number, number][]
    ).forEach(([da, r]) => {
      const a = Math.PI / 2 + da;
      const x = Math.cos(a) * 41.5;
      const y = 38 + Math.sin(a) * 23.5;
      s += paper('jg3', D(circ(x, y, r + 1.4, 18)), false);
      s += `<path class="jdi" d="${D(circ(x, y, r, 18))}"/><path class="jdi2" d="${arcBand(
        x,
        y,
        r * 0.4,
        r * 0.95,
        Math.PI * 0.1,
        Math.PI * 0.9
      )}"/><path class="jdi3" d="${D(circ(x - r * 0.35, y - r * 0.35, r * 0.28, 8))}"/>`;
    });
    s += `<path class="glint" d="${star(11, 64, 6)}"/><path class="glint g2" d="${star(
      -30,
      22,
      4
    )}"/>`;
  } else {
    const bez = (
      a: [number, number],
      b: [number, number],
      c: [number, number],
      d: [number, number],
      t: number
    ): [number, number] => {
      const u = 1 - t;
      return [
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ];
    };
    let l1 = '';
    let l3 = '';
    for (const sd of [-1, 1]) {
      const A: [number, number] = [0, 6];
      const B: [number, number] = [sd * 30, 13];
      const C: [number, number] = [sd * 42, 58];
      const E: [number, number] = [sd * 2, 78];
      const N = 24;
      for (let i = 1; i < N; i++) {
        const t = i / N;
        const [x, y] = bez(A, B, C, E, t);
        const [x2, y2] = bez(A, B, C, E, t + 0.01);
        const ang = Math.atan2(y2 - y, x2 - x);
        if (i % 2)
          l1 += D(ellipse(x, y, 2.5, 1.5, ang, 10)) + D(ellipse(x, y, 1.3, 0.55, ang, 8));
        else l3 += D(ellipse(x, y, 2.2, 0.6, ang, 8));
      }
    }
    s += `<path class="jg3" d="${l3}"/><path class="jg1" d="${l1}"/>`;
    s += paper('jg1', ring2(0, 4, 3.2, 1.7, 20), false);
    s += `<ellipse class="jkn" cx="0" cy="2.6" rx="1.8" ry="2.8"/>`;
    s += paper('jg1', ring2(0, 80, 3, 1.5, 20), false);
    const leaf = (ox: number, oy: number, sc: number) => {
      const L: number[][] = [];
      const Rr: number[][] = [];
      const N = 14;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const w = 7.6 * Math.pow(Math.sin(Math.PI * Math.min(t * 1.08, 1)), 0.85) * sc;
        const bx = ox + 3 * t * t;
        const by = oy + 34 * t;
        L.push([bx - w, by]);
        Rr.push([bx + w, by]);
      }
      return [...L, ...Rr.reverse()];
    };
    s += paper('jg3', rr(leaf(0.9, 84, 1.06)));
    s += paper('jg1', rr(leaf(0, 83, 1)));
    s += `<path class="jg2" d="${D(
      leaf(0, 83, 1)
        .slice(0, 15)
        .map(([x, y], i) => [x + (i ? 1.2 : 0), y])
        .concat([
          [3, 117],
          [1.2, 100],
          [0.4, 86],
        ])
    )}"/>`;
    s += `<path class="jg3" d="${D([
      [0.2, 92],
      [1.3, 92],
      [2.7, 114],
      [2.1, 114],
    ])}"/>`;
    s += paper('jru', D(circ(0.4, 89, 4.4, 20)), false);
    s += `<path class="jru2" d="${D(circ(-0.6, 88, 2.4, 14))}"/><path class="jhi" d="${D(
      ellipse(-1.4, 87.2, 0.8, 1.3, 0.5, 8)
    )}"/>`;
    s += `<path class="glint" d="${star(6, 92, 5.5)}"/><path class="glint g2" d="${star(
      -31,
      38,
      3.6
    )}"/>`;
  }
  return `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${s}</svg>`;
}

export function bflySVG(): string {
  const R = mulberry(23);
  const rr = (p: number[][], a = 0.35) => D(rough(p, R, 5, a));
  const ins = (p: number[][], o: [number, number], f: number) =>
    p.map((q) => [o[0] + (q[0] - o[0]) * f, o[1] + (q[1] - o[1]) * f]);
  const cen = (p: number[][]): [number, number] => {
    let x = 0;
    let y = 0;
    p.forEach((q) => {
      x += q[0];
      y += q[1];
    });
    return [x / p.length, y / p.length];
  };
  const fw = [
    [1, -5],
    [7, -19],
    [16, -31],
    [28, -38],
    [40, -38],
    [47, -31],
    [46, -21],
    [40, -11],
    [30, -4],
    [16, 0],
    [3, -1],
  ];
  const hw = [
    [2, 1],
    [14, 2],
    [27, 6],
    [35, 14],
    [36, 24],
    [30, 32],
    [22, 36],
    [19, 41],
    [17, 49],
    [13, 48],
    [12, 39],
    [7, 27],
    [2, 11],
  ];
  const rim = rr(fw) + rr(hw);
  const gold = rr(ins(fw, cen(fw), 0.84)) + rr(ins(hw, cen(hw), 0.8));
  const band = rr(ins(fw, [2, -3], 0.56)) + rr(ins(hw, [2, 3], 0.48));
  const spots = (
    [
      [39, -31, 3],
      [44, -24, 2.2],
      [33, -35, 1.8],
      [46.5, -16, 1.4],
      [31, -29, 1.3],
    ] as [number, number, number][]
  )
    .map(([x, y, r]) => D(rough(circ(x, y, r, 9), R, 1.5, 0.15)))
    .join('');
  const eye = D(rough(circ(27, 21, 4.6, 12), R, 2, 0.2));
  const eyeC = D(circ(27.6, 20.3, 1.7, 9));
  const veins =
    D([
      [3, -3],
      [30, -30],
      [31, -29],
    ]) +
    D([
      [3, -2],
      [38, -18],
      [38, -17],
    ]) +
    D([
      [3, 3],
      [24, 30],
      [23, 31],
    ]);
  const wing =
    paper('brim', rim) +
    paper('bwa', gold) +
    paper('bwb', band + eye, false) +
    `<path class="bsp" d="${spots + eyeC}"/><path class="brim" opacity=".5" d="${veins}"/>`;
  const body = paper(
    'bbody',
    D(ellipse(0, 9, 2.6, 13, 0, 12)) +
      D(ellipse(0, -5, 3.6, 4.8, 0, 10)) +
      D(circ(0, -11.5, 2.8, 10))
  );
  const ant = `<path class="bant" d="M-1,-13 C-4,-22 -8,-28 -12,-31 M1,-13 C4,-22 8,-28 12,-31"/><path class="bbody" d="${
    D(circ(-12.4, -31.4, 1.6, 8)) + D(circ(12.4, -31.4, 1.6, 8))
  }"/>`;
  return `<svg viewBox="-50 -42 100 92" aria-hidden="true" focusable="false"><g class="wl">${wing}</g><g class="wr">${wing}</g>${ant}${body}</svg>`;
}

export const ICP: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  heart:
    '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  home: '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  tree: '<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>',
  truck:
    '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  refresh:
    '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  chev: '<path d="M14 6l-6 6 6 6"/>',
  check: '<path d="M5 12l4.5 4.5L19 7"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16M12 9v11M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0"/>',
  hand: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v5M13 10V6a1.5 1.5 0 0 1 3 0v6M16 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3L5 13.5a1.5 1.5 0 0 1 2.4-1.8L9 13"/>',
  cube: '<path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z"/><path d="M12 11l8-4.5M12 11v9M12 11L4 6.5"/>',
};

export const ic = (n: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICP[n] || ''}</svg>`;

export const SJ: Record<JewelType, JewelShapeDef> = {
  neck: { id: 'neck', seed: 301, w: 90, h: 120 },
  ring: { id: 'ring', seed: 302, w: 56, h: 72 },
  ear: { id: 'ear', seed: 303, w: 40, h: 78 },
  brace: { id: 'brace', seed: 304, w: 100, h: 76 },
};

const svgCache: Partial<Record<JewelType, string>> = {};
export const jsvg = (t: JewelType): string =>
  svgCache[t] ||
  (svgCache[t] = jewelSVG(SJ[t]).replace('<svg ', '<svg preserveAspectRatio="xMidYMin meet" '));
