const MUSIC = 0.2;
const BOSS = "/game/track-boss.mp3";
const EAGLE = "/game/eagle.mp3";
const MAGA = "/game/maga.mp3";

export class Sfx {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private bufs = new Map<string, AudioBuffer>();
  private pending = new Set<string>();
  private musicSrc: AudioBufferSourceNode | null = null;
  private track = "/game/track.mp3";
  private _muted = false;
  private wantMusic = false;
  private musicMul = 1;
  private wantBoss = false;
  private bossGain: GainNode | null = null;
  private bossSrc: AudioBufferSourceNode | null = null;

  get muted() {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    this.bed(0.06);
    if (!value && this.wantMusic) this.kickMusic();
  }

  /** Warm the audio graph. Does not start the track. */
  unlock() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(ctx.destination);
      this.musicGain = musicGain;

      const osc = ctx.createOscillator();
      const high = ctx.createBiquadFilter();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 78;
      high.type = "highpass";
      high.frequency.value = 280;
      filter.type = "lowpass";
      filter.frequency.value = 900;
      gain.gain.value = 0;
      osc.connect(high);
      high.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.osc = osc;
      this.filter = filter;
      this.gain = gain;
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    void this.ctx.resume();
  }

  /** From launch until the player returns to the main menu. */
  playLevel(url: string) {
    this.boss(false);
    this.wantMusic = true;
    this.track = url;
    this.unlock();
    this.restartMusic();
  }

  stopLevel() {
    this.wantMusic = false;
    this.bed(0.28);
    const src = this.musicSrc;
    const ctx = this.ctx;
    this.musicSrc = null;
    if (src && ctx) {
      const when = ctx.currentTime + 0.32;
      try {
        src.stop(when);
      } catch {
        /* already stopped */
      }
    }
    this.boss(false);
  }

  /** Duck the level track and play the anthem. */
  boss(on: boolean) {
    this.wantBoss = on;
    this.musicMul = on ? 0.2 : 1;
    this.bed(0.4);
    if (!this.ctx || this._muted) {
      if (!on) this.stopBoss();
      return;
    }
    if (on) {
      this.ensure(BOSS);
      this.ensure(EAGLE);
      this.ensure(MAGA);
      this.startBoss();
    } else this.stopBoss();
  }

  eagle() {
    this.sting(EAGLE, 0.85, 2.2);
  }

  /** Same scream as the attack, half as loud. */
  eagleSoft() {
    this.sting(EAGLE, 0.42, 2.2);
  }

  maga() {
    this.sting(MAGA, 0.9, 3.1);
  }

  private sting(url: string, volume: number, duckFor: number) {
    if (this._muted || !this.ctx) return;
    const buf = this.bufs.get(url);
    if (!buf) {
      this.ensure(url);
      return;
    }
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
    this.duckBoss(0.28, duckFor);
  }

  private startBoss() {
    const ctx = this.ctx;
    if (!ctx || !this.wantBoss || this.bossSrc) return;
    const buf = this.bufs.get(BOSS);
    if (!buf) {
      this.ensure(BOSS);
      return;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    gain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 0.4);
    this.bossGain = gain;
    this.bossSrc = src;
  }

  private duckBoss(floor: number, hold: number) {
    if (!this.bossGain || !this.ctx || this._muted) return;
    const gain = this.bossGain.gain;
    const t = this.ctx.currentTime;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(0.38 * floor, t + 0.04);
    gain.linearRampToValueAtTime(0.38, t + hold);
  }

  private stopBoss() {
    this.wantBoss = false;
    const ctx = this.ctx;
    const gain = this.bossGain;
    const src = this.bossSrc;
    this.bossSrc = null;
    if (gain && ctx) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
    }
    if (src && ctx) {
      try {
        src.stop(ctx.currentTime + 0.35);
      } catch {
        /* already stopped */
      }
    }
  }

  private ensure(url: string) {
    const ctx = this.ctx;
    if (!ctx || this.bufs.has(url) || this.pending.has(url)) return;
    this.pending.add(url);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.arrayBuffer();
      })
      .then((raw) => ctx.decodeAudioData(raw.slice(0)))
      .then((buf) => {
        this.bufs.set(url, buf);
        this.pending.delete(url);
        if (this.wantBoss && url === BOSS) this.startBoss();
        if (this.wantMusic && this.track === url) this.kickMusic();
      })
      .catch(() => {
        this.pending.delete(url);
      });
  }

  private restartMusic() {
    const src = this.musicSrc;
    this.musicSrc = null;
    if (src) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    this.kickMusic();
  }

  private kickMusic() {
    const ctx = this.ctx;
    const musicGain = this.musicGain;
    const buf = this.bufs.get(this.track);
    if (!this.wantMusic || !ctx || !musicGain || this.musicSrc || this._muted) return;
    if (!buf) {
      this.ensure(this.track);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(musicGain);
    try {
      src.start();
    } catch {
      return;
    }
    this.musicSrc = src;
    this.bed(0.2);
  }

  private bed(seconds: number) {
    if (!this.musicGain || !this.ctx) return;
    const gain = this.musicGain.gain;
    const t = this.ctx.currentTime;
    const target = this._muted || !this.wantMusic || !this.musicSrc ? 0 : MUSIC * this.musicMul;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(target, t + seconds);
  }

  private duck(floor: number, hold: number) {
    if (!this.musicGain || !this.ctx || this._muted || !this.musicSrc) return;
    const gain = this.musicGain.gain;
    const t = this.ctx.currentTime;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(gain.value, t);
    gain.linearRampToValueAtTime(MUSIC * floor, t + 0.03);
    gain.linearRampToValueAtTime(MUSIC * this.musicMul, t + hold);
  }

  engine(speed: number, playing: boolean) {
    if (!this.gain || !this.osc || !this.filter || !this.ctx) return;
    const t = this.ctx.currentTime;
    const vol = !playing || this._muted ? 0 : 0.012 + Math.min(0.02, speed / 22000);
    this.gain.gain.setTargetAtTime(vol, t, 0.08);
    this.osc.frequency.setTargetAtTime(72 + speed * 0.05, t, 0.12);
    this.filter.frequency.setTargetAtTime(640 + speed * 0.45, t, 0.12);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number) {
    if (!this.ctx || this._muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(36, freq * 0.55), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseHit(vol: number) {
    if (!this.ctx || !this.noise || this._muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + 0.24);
  }

  crash() {
    this.duck(0.28, 0.42);
    this.noiseHit(0.42);
    this.tone(140, 0.22, "square", 0.07);
  }

  pickup() {
    this.duck(0.62, 0.22);
    this.tone(740, 0.09, "square", 0.06);
    this.tone(1040, 0.12, "triangle", 0.05);
  }

  cannon() {
    if (this._muted || !this.ctx || !this.noise) return;
    this.duck(0.5, 0.16);
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.16);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + 0.2);
    this.tone(70, 0.07, "sine", 0.09);
  }

  near() {
    this.tone(620, 0.06, "triangle", 0.04);
  }
}
