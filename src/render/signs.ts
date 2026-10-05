import * as THREE from 'three';
import type { AdId, SignSpec } from '../eras/types.ts';
import { box, cylinder } from './primitives.ts';

/*
 * Neo-Tokyo's advertising: video screens, vertical neon signs and rooftop billboards, all for invented
 * products (real brands are trademarks). The Japanese is meant to read naturally; the English is what
 * a bilingual ad in Tokyo would carry underneath.
 */

interface Ad {
  /** The big line, in Japanese. */
  jp: string;
  /** The brand or product in English. */
  en: string;
  /** A slogan: in English on screens, with the Japanese one above it. */
  tag: string;
  jpTag: string;
  bg: string;
  fg: string;
  accent: string;
  badge?: string;
}

const ADS: Record<AdId, Ad> = {
  neurocola: { jp: 'ニューロコーラ', en: 'NEURO COLA', jpTag: '速く考えろ。冷たく飲め。', tag: 'THINK FASTER. DRINK COLDER.', bg: '#06142e', fg: '#3fe0ff', accent: '#ff3fd0', badge: '新発売' },
  unagi: { jp: '培養うなぎ', en: 'CULTURED UNAGI', jpTag: '本日半額！', tag: 'HALF PRICE TODAY', bg: '#3a1606', fg: '#ffb03a', accent: '#fff0d0', badge: '50% OFF' },
  memory: { jp: '記憶増設', en: 'MEMORY+ 64TB', jpTag: '忘れる時代は、終わりました。', tag: 'FORGETTING IS OVER', bg: '#1a0a2e', fg: '#c08aff', accent: '#3fe0ff' },
  robodog: { jp: '新型ロボ犬', en: 'ROBO-INU 9', jpTag: '忠犬モード搭載', tag: 'NOW WITH LOYAL MODE', bg: '#2a2400', fg: '#ffd23f', accent: '#ffffff', badge: 'NEW!' },
  catrental: { jp: '猫レンタル', en: 'RENT-A-CAT', jpTag: '癒やし、1時間から。', tag: 'CUDDLES BY THE HOUR', bg: '#ffe0ec', fg: '#d0306a', accent: '#5a2a3a' },
  cricket: { jp: 'コオロギバーガー', en: 'CRICKET BURGER', jpTag: 'タンパク質たっぷり！', tag: '100% PROTEIN. 0% COW.', bg: '#0e2a0a', fg: '#9aff4a', accent: '#ffd23f' },
  chronos: { jp: 'クロノス社', en: 'CHRONOS CORP', jpTag: '未来は、もう来ている。', tag: 'THE FUTURE IS ALREADY HERE', bg: '#05101c', fg: '#e8f4ff', accent: '#3fe0ff' },
  genetics: { jp: '夢のペット、プリントします。', en: 'CHRONOS GENETICS', jpTag: 'クロノス・ジェネティクス', tag: 'YOUR DREAM PET, PRINTED', bg: '#06221e', fg: '#5affc8', accent: '#e8f4ff' },
  orbit: { jp: '軌道エレベーター', en: 'ORBIT TOURS', jpTag: '宇宙まで、エレベーターで。', tag: 'SPACE IS ONE RIDE UP', bg: '#000814', fg: '#ffffff', accent: '#7a5aff' },
  kirara: { jp: '星きらら', en: 'HOSHI KIRARA', jpTag: 'ドームツアー2087', tag: 'DOME TOUR 2087', bg: '#2a0624', fg: '#ff7ad0', accent: '#3fe0ff', badge: 'LIVE' },
  umbrella: { jp: '傘サブスク', en: 'UMBRELLA PASS', jpTag: '雨の日も、月額で。', tag: 'RAIN, SUBSCRIBED', bg: '#06202e', fg: '#6ad8ff', accent: '#ffffff' },
  pachinko: { jp: 'パチンコ ネオ', en: 'PACHINKO NEO', jpTag: '大当たり連発！', tag: 'JACKPOT AFTER JACKPOT', bg: '#2a0000', fg: '#ffd23f', accent: '#ff3a3a', badge: '777' },
  karaoke: { jp: 'カラオケ', en: 'KARAOKE', jpTag: '', tag: '', bg: '#14061e', fg: '#ff5ae0', accent: '#3fe0ff' },
  izakaya: { jp: '居酒屋', en: 'IZAKAYA', jpTag: '', tag: '', bg: '#1e0606', fg: '#ff6a3a', accent: '#ffd23f' },
  uranai: { jp: '占い', en: 'FORTUNES', jpTag: '', tag: '', bg: '#06061e', fg: '#9a8aff', accent: '#ffd23f' },
};

/** Japanese-capable fonts first; canvas falls back down the list. */
const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Fills one line of text, shrinking it until it fits `maxWidth`. */
function fit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number, weight = 'bold'): void {
  let px = size;
  do {
    ctx.font = `${weight} ${px}px ${FONT}`;
    px -= 1;
  } while (px > 6 && ctx.measureText(text).width > maxWidth);
  ctx.fillText(text, x, y);
}

/** A glowing line of text: a blurred copy underneath, then the crisp one. */
function neonText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number, color: string): void {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.35;
  fit(ctx, text, x, y, size, maxWidth);
  ctx.shadowBlur = 0;
  fit(ctx, text, x, y, size, maxWidth);
}

/** LED scanlines over the whole image. */
function scanlines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
}

/** One slide of a video screen or billboard: the product in Japanese, the brand, the slogan. */
function adSlide(ad: Ad, width: number, height: number, bulbsLit: boolean | null): THREE.CanvasTexture {
  return canvasTexture(width, height, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, ad.bg);
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    // Bold diagonal stripes in the accent color, a staple of loud Tokyo ads.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = ad.accent;
    for (let x = -height; x < width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + 12, height);
      ctx.lineTo(x + 12 + height, 0);
      ctx.lineTo(x + height, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = ad.accent;
    ctx.fillRect(0, 0, width, 6);
    ctx.fillRect(0, height - 6, width, 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = width / 2;
    neonText(ctx, ad.jp, cx, height * 0.36, height * 0.34, width * 0.9, ad.fg);
    ctx.fillStyle = ad.accent;
    fit(ctx, ad.en, cx, height * 0.64, height * 0.15, width * 0.86);
    ctx.fillStyle = '#ffffff';
    fit(ctx, ad.tag ? `${ad.jpTag}  ${ad.tag}` : ad.jpTag, cx, height * 0.83, height * 0.09, width * 0.92, 'normal');
    if (ad.badge) {
      // A starburst sticker in the corner.
      const r = height * 0.15;
      const bx = width - r * 1.3;
      const by = r * 1.3;
      ctx.fillStyle = '#ff2a4a';
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const rr = i % 2 ? r * 0.78 : r;
        ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      fit(ctx, ad.badge, bx, by, r * 0.62, r * 1.5);
    }
    if (bulbsLit !== null) {
      // Marquee bulbs around the edge, every other one lit (two frames make them chase).
      const step = 14;
      let i = 0;
      const bulb = (x: number, y: number): void => {
        ctx.fillStyle = (i++ % 2 === 0) === bulbsLit ? '#fff6c0' : '#5a4a20';
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      };
      for (let x = 7; x < width - 4; x += step) bulb(x, 7);
      for (let y = 7 + step; y < height - 4; y += step) bulb(width - 7, y);
      for (let x = width - 7 - step; x > 4; x -= step) bulb(x, height - 7);
      for (let y = height - 7 - step; y > 4; y -= step) bulb(7, y);
    }
    scanlines(ctx, width, height);
  });
}

/** A vertical neon sign (tategaki): one character under the other, the long-vowel mark turned upright. */
function kanbanTexture(ad: Ad, lit: boolean): THREE.CanvasTexture {
  const chars = [...ad.jp];
  const cell = 56;
  const width = 72;
  const height = Math.max(4, chars.length) * cell + 16;
  return canvasTexture(width, height, (ctx) => {
    ctx.fillStyle = ad.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const top = (height - chars.length * cell) / 2;
    chars.forEach((ch, i) => {
      const y = top + cell * (i + 0.5);
      ctx.save();
      ctx.translate(width / 2, y);
      if (ch === 'ー') ctx.rotate(Math.PI / 2);
      ctx.fillStyle = lit ? ad.fg : '#3a2a3a';
      ctx.shadowColor = ad.fg;
      ctx.shadowBlur = lit ? 14 : 0;
      ctx.font = `bold ${cell * 0.78}px ${FONT}`;
      ctx.fillText(ch, 0, 2);
      ctx.restore();
    });
  });
}

export interface SignRig {
  root: THREE.Group;
  update(time: number): void;
}

/** Seconds each ad stays on a screen, and how long the glitch between two ads lasts. */
const SLIDE_TIME = 5;
const GLITCH = 0.25;

/**
 * Builds a sign in tile units, with its origin at the bottom-left corner of the tile's south face.
 * Screens and vertical signs hang on the facade, their bottom edge pushed out so they lean back
 * toward the high camera; billboards stand on posts above the rooftops, leaning back further.
 */
export function buildSign(spec: SignSpec, seed: number): SignRig {
  const root = new THREE.Group();
  const ads = spec.ads.map((id) => ADS[id]);
  const { width, height } = spec;
  const cx = width < 1 ? 0.5 : width / 2;
  const lean = spec.style === 'rooftop' ? 0.65 : 0.4;
  // The panel hangs from its top edge, which touches the wall (or the billboard frame).
  const panel = new THREE.Group();
  const top = spec.y + height * Math.cos(lean);
  panel.position.set(cx, top, (spec.style === 'rooftop' ? 0 : 0.02) - (spec.inset ?? 0));
  panel.rotation.x = -lean;
  root.add(panel);

  const pxPerTile = spec.style === 'kanban' ? 0 : 128;
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  // Hanging down from the top edge and facing south (+Z); the frame sits just behind it.
  face.position.set(0, -height / 2, 0.035);
  panel.add(face);
  panel.add(box(width + 0.1, height + 0.1, 0.06, '#14141c', 0, -height / 2, 0));

  let frames: THREE.Texture[][];
  if (spec.style === 'kanban') {
    frames = ads.map((ad) => [kanbanTexture(ad, true), kanbanTexture(ad, false)]);
  } else {
    const w = Math.round(width * pxPerTile);
    const h = Math.round(height * pxPerTile);
    frames = ads.map((ad) => (spec.style === 'rooftop' ? [adSlide(ad, w, h, true), adSlide(ad, w, h, false)] : [adSlide(ad, w, h, null)]));
  }
  material.map = frames[0][0];

  if (spec.style === 'rooftop') {
    // Steel posts from the street up through the roof, and a catwalk under the board.
    for (const x of [cx - width * 0.35, cx + width * 0.35]) root.add(cylinder(0.05, 0.05, spec.y + 0.4, '#3a3c46', x, (spec.y + 0.4) / 2, -0.3, {}, 6));
    root.add(box(width, 0.04, 0.3, '#3a3c46', cx, spec.y + 0.02, 0.05));
  } else if (spec.style === 'kanban') {
    // Brackets holding the sign off the wall.
    for (const y of [spec.y + 0.2, top - 0.2]) root.add(box(0.06, 0.04, 0.2, '#2a2a34', cx, y, 0.08));
  }

  return {
    root,
    update(time) {
      // Every sign runs on its own clock, so the street doesn't switch ads in sync.
      const t = time + seed;
      const slide = Math.floor(t / SLIDE_TIME) % frames.length;
      const intoSlide = t % SLIDE_TIME;
      let frame = frames[slide][0];
      let brightness = 1;
      if (spec.style === 'rooftop') frame = frames[slide][Math.floor(t * 3) % 2];
      if (spec.style === 'kanban') {
        // Neon tubes: steady most of the time, with a stutter now and then.
        const stutter = Math.sin(t * 0.7) > 0.97 && Math.sin(t * 40) > 0;
        frame = frames[slide][stutter ? 1 : 0];
      }
      if (frames.length > 1 && intoSlide < GLITCH) {
        // Switching ads: a burst of static that jolts the picture sideways.
        brightness = 0.55 + Math.random() * 0.6;
        frame.offset.x = (Math.random() - 0.5) * 0.08;
      } else {
        frame.offset.x = 0;
      }
      if (material.map !== frame) {
        material.map = frame;
        material.needsUpdate = true;
      }
      material.color.setScalar(brightness);
    },
  };
}
