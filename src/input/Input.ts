export type KeyMap = Record<string, boolean>;

export class Input {
  keys: KeyMap = {};
  private justPressed: KeyMap = {};
  private justReleased: KeyMap = {};
  pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false };
  private el: HTMLElement | null = null;
  private bound = false;

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!this.keys[k]) this.justPressed[k] = true;
    this.keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'escape'].includes(k)) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys[k] = false;
    this.justReleased[k] = true;
  };
  private onPointerDown = (e: PointerEvent) => {
    this.syncPointer(e);
    this.pointer.down = true;
    this.pointer.justDown = true;
  };
  private onPointerMove = (e: PointerEvent) => this.syncPointer(e);
  private onPointerUp = (e: PointerEvent) => {
    this.syncPointer(e);
    this.pointer.down = false;
    this.pointer.justUp = true;
  };

  private syncPointer(e: PointerEvent): void {
    if (!this.el) return;
    const r = this.el.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * (this.el as HTMLCanvasElement).width / (window.devicePixelRatio || 1);
    // Use CSS size mapping via dataset if set
    const cssW = Number(this.el.dataset.cssW || r.width);
    const cssH = Number(this.el.dataset.cssH || r.height);
    this.pointer.x = ((e.clientX - r.left) / r.width) * cssW;
    this.pointer.y = ((e.clientY - r.top) / r.height) * cssH;
  }

  attach(el: HTMLElement): void {
    this.el = el;
    if (this.bound) return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    this.bound = true;
  }

  detach(): void {
    if (!this.bound) return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.el) {
      this.el.removeEventListener('pointerdown', this.onPointerDown);
      this.el.removeEventListener('pointermove', this.onPointerMove);
      this.el.removeEventListener('pointerup', this.onPointerUp);
      this.el.removeEventListener('pointercancel', this.onPointerUp);
    }
    this.bound = false;
  }

  endFrame(): void {
    this.justPressed = {};
    this.justReleased = {};
    this.pointer.justDown = false;
    this.pointer.justUp = false;
  }

  pressed(k: string): boolean {
    return !!this.keys[k.toLowerCase()];
  }
  just(k: string): boolean {
    return !!this.justPressed[k.toLowerCase()];
  }

  /** Virtual button helpers for on-screen pads. */
  setVirtual(key: string, down: boolean): void {
    const k = key.toLowerCase();
    if (down && !this.keys[k]) this.justPressed[k] = true;
    if (!down && this.keys[k]) this.justReleased[k] = true;
    this.keys[k] = down;
  }

  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.pressed('arrowleft') || this.pressed('a')) x -= 1;
    if (this.pressed('arrowright') || this.pressed('d')) x += 1;
    if (this.pressed('arrowup') || this.pressed('w')) y -= 1;
    if (this.pressed('arrowdown') || this.pressed('s')) y += 1;
    return { x, y };
  }

  action(): boolean {
    return this.pressed(' ') || this.pressed('z') || this.pressed('j') || this.pressed('enter');
  }
  actionJust(): boolean {
    return this.just(' ') || this.just('z') || this.just('j') || this.just('enter');
  }
}

export const input = new Input();
