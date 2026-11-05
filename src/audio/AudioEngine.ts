import { loadSettings, saveSettings, type Settings } from '../core/storage';

type OscType = OscillatorType;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private settings: Settings;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicNotes: number[] = [];
  private musicEnabled = false;

  constructor() {
    this.settings = loadSettings();
  }

  ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<Settings>): void {
    this.settings = { ...this.settings, ...partial };
    saveSettings(this.settings);
    this.applySettings();
  }

  private applySettings(): void {
    if (!this.master || !this.sfx || !this.music) return;
    const mute = this.settings.muted ? 0 : 1;
    this.master.gain.value = mute;
    this.sfx.gain.value = this.settings.sfxVolume;
    this.music.gain.value = this.settings.musicVolume;
  }

  private tone(freq: number, dur: number, type: OscType = 'square', vol = 0.15, dest?: GainNode): void {
    if (this.settings.muted) return;
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(dest ?? this.sfx!);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  blip(f = 660): void {
    this.tone(f, 0.08, 'square', 0.12);
  }
  coin(): void {
    this.tone(880, 0.06, 'square', 0.1);
    setTimeout(() => this.tone(1320, 0.1, 'square', 0.1), 50);
  }
  hit(): void {
    this.tone(120, 0.15, 'sawtooth', 0.18);
  }
  boom(): void {
    this.tone(60, 0.35, 'sawtooth', 0.22);
    this.tone(90, 0.25, 'triangle', 0.12);
  }
  jump(): void {
    const ctx = this.ensure();
    if (this.settings.muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    g.gain.value = 0.12;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g);
    g.connect(this.sfx!);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  }
  powerup(): void {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.08, 'triangle', 0.1), i * 60));
  }
  lose(): void {
    [440, 330, 220, 110].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sawtooth', 0.14), i * 120));
  }
  win(): void {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'triangle', 0.12), i * 90));
  }
  click(): void {
    this.tone(1400, 0.03, 'square', 0.06);
  }

  startMusic(seed = 1): void {
    this.stopMusic();
    this.ensure();
    const scales = [
      [262, 294, 330, 349, 392, 440, 523, 392],
      [220, 247, 262, 330, 392, 330, 294, 262],
      [196, 233, 294, 349, 392, 349, 294, 233],
    ];
    this.musicNotes = scales[seed % scales.length];
    this.musicStep = 0;
    this.musicEnabled = true;
    const tick = () => {
      if (!this.musicEnabled) return;
      const n = this.musicNotes[this.musicStep % this.musicNotes.length];
      this.tone(n, 0.18, 'triangle', 0.05, this.music!);
      if (this.musicStep % 4 === 0) this.tone(n / 2, 0.25, 'sine', 0.04, this.music!);
      this.musicStep++;
      this.musicTimer = window.setTimeout(tick, 280);
    };
    tick();
  }

  stopMusic(): void {
    this.musicEnabled = false;
    if (this.musicTimer != null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();
