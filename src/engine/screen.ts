import * as THREE from 'three';

/** Logical UI resolution. HUD and menus are authored in these units. */
export const VIEW_W = 320;
export const VIEW_H = 180;

/**
 * Two stacked layers inside a 16:9 frame:
 * - `gl`: the Three.js renderer for the 3D world.
 * - `ui`: a transparent 2D canvas on top for crisp text, HUD and fades,
 *   using logical 320x180 coordinates at full device resolution.
 */
export class Screen {
  readonly gl: THREE.WebGLRenderer;
  readonly ui: CanvasRenderingContext2D;
  private readonly uiCanvas: HTMLCanvasElement;
  private uiScale = 1;

  constructor(parent: HTMLElement) {
    this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.domElement.className = 'gl';
    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.className = 'ui';
    parent.append(this.gl.domElement, this.uiCanvas);

    const ctx = this.uiCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser.');
    this.ui = ctx;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize(): void {
    const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    const cssW = Math.floor(VIEW_W * fit);
    const cssH = Math.floor(VIEW_H * fit);
    // Phones have very dense screens but modest GPUs: cap the 3D resolution lower there.
    const maxDpr = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    this.gl.setPixelRatio(dpr);
    this.gl.setSize(cssW, cssH);
    this.uiCanvas.style.width = `${cssW}px`;
    this.uiCanvas.style.height = `${cssH}px`;
    this.uiCanvas.width = Math.round(cssW * dpr);
    this.uiCanvas.height = Math.round(cssH * dpr);
    this.uiScale = this.uiCanvas.width / VIEW_W;
  }

  get aspect(): number {
    return VIEW_W / VIEW_H;
  }

  beginFrame(): void {
    this.ui.setTransform(1, 0, 0, 1, 0, 0);
    this.ui.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    this.ui.setTransform(this.uiScale, 0, 0, this.uiScale, 0, 0);
    this.ui.imageSmoothingEnabled = false;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.gl.render(scene, camera);
  }

  /** For scenes without 3D content. */
  clear(color = '#07070d'): void {
    this.gl.setClearColor(color);
    this.gl.clear();
  }
}
