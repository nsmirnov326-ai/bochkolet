import { KINDS, PX_PER_KM, PX_PER_M, RADIOS, STAGES, courseOf, skinById, type KindId, type SkinId, type StageDef } from "./content";

export type Phase = "title" | "play" | "fail" | "clear" | "done" | "treaty";

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

export type Ent = {
  kind: KindId;
  x: number;
  alt: number;
  hit: boolean;
  taken: boolean;
  threatened: boolean;
  near: boolean;
  yeet: boolean;
  yeetVy: number;
  yeetY: number;
  spin: number;
};

export type Popup = { text: string; x: number; y: number; life: number };
export type Ring = { x: number; y: number; r: number; life: number };
export type Blast = { x: number; y: number; life: number };
export type Bit = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

const SAVE_KEY = "bochkolet-v1";

export type SaveData = { best: number[]; unlocked: number; skin: SkinId; endlessBest: number };

const EMPTY_BEST = [0, 0, 0, 0, 0, 0];

function loadSave(): SaveData {
  const empty: SaveData = { best: EMPTY_BEST.slice(), unlocked: 0, skin: "barrel", endlessBest: 0 };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw) as SaveData;
    if (!Array.isArray(data.best) || data.best.length < 5) return empty;
    const best = data.best.map((n) => Number(n) || 0);
    while (best.length < 6) best.push(0);
    best.length = 6;
    return {
      best,
      unlocked: Math.max(0, Math.min(5, (data.unlocked || 0) >= 4 ? 5 : data.unlocked || 0)),
      skin: skinById(data.skin).id,
      endlessBest: Number(data.endlessBest) || 0,
    };
  } catch {
    return empty;
  }
}

export class Sim {
  phase: Phase = "title";
  stageIndex = 0;
  held = new Set<string>();
  steerOverride: number | null = null;
  yaw = 0;
  speed = 0;
  alt = 0.5;
  lane = 0;
  worldX = 0;
  meters = 0;
  goal = 200;
  bonus = 0;
  combo = 0;
  comboT = 0;
  lives = 3;
  speech = 1;
  invuln = 0;
  hitstop = 0;
  failIn = 0;
  shake = 0;
  time = 0;
  prop = 0;
  climb = 0;
  spin = 0;
  radio = 0;
  radioT = 0;
  hint = 4.5;
  announced = false;
  bossPhase: "off" | "fly" | "in" | "fight" | "fist" | "drop" | "deal" = "off";
  bossEnter = 0;
  bossFace: "idle" | "shout" | "smile" = "idle";
  bossLabel = "";
  bossDrop = 0;
  bossFist = 0;
  bossDeal = 0;
  bossThumb = 0;
  bossFlag = 0;
  bossBird = 0;
  bossPaper = 0;
  bossSoft = false;
  bossTieY = -1;
  bossTieHot = false;
  bossScript = 0;
  bossScriptT = 0;
  bossRounds = 0;
  bossWaves: { x: number; y: number; h: number; hot: number }[] = [];
  bossLetters: { ch: string; x: number; y: number }[] = [];
  cue: string[] = [];
  spacePrev = false;
  reason = "Бочку закрутило";
  viewW = 960;
  viewH = 540;
  ents: Ent[] = [];
  pops: Popup[] = [];
  rings: Ring[] = [];
  blasts: Blast[] = [];
  bits: Bit[] = [];
  save: SaveData = { best: EMPTY_BEST.slice(), unlocked: 0, skin: "barrel", endlessBest: 0 };
  reduce = false;
  endless = false;
  fade = 0;
  fromIndex = 0;

  constructor() {
    this.save = { best: EMPTY_BEST.slice(), unlocked: 0, skin: "barrel", endlessBest: 0 };
  }

  hydrate() {
    this.save = loadSave();
  }

  get stage(): StageDef {
    return STAGES[this.stageIndex] ?? STAGES[0];
  }

  get skinDef() {
    return skinById(this.save.skin);
  }

  get points() {
    return Math.floor(this.meters * 100) * 10 + this.bonus;
  }

  get radioLine() {
    return RADIOS[this.radio % RADIOS.length];
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      /* ignore quota */
    }
  }

  rememberScore() {
    const pts = this.points;
    if (this.endless) {
      if (pts > this.save.endlessBest) this.save.endlessBest = pts;
    } else if (pts > this.save.best[this.stageIndex]) {
      this.save.best[this.stageIndex] = pts;
    }
    this.persist();
  }

  start(index: number) {
    this.stageIndex = index;
    const course = courseOf(this.stage);
    this.goal = course.goal;
    this.ents = course.marks.map(({ at, beat }) => ({
      kind: beat.kind,
      x: at * PX_PER_M,
      alt: beat.alt,
      hit: false,
      taken: false,
      threatened: false,
      near: false,
      yeet: false,
      yeetVy: 0,
      yeetY: 0,
      spin: Math.random() * 6,
    }));
    this.worldX = 0;
    this.meters = 0;
    this.speed = 0;
    this.alt = 0.5;
    this.lane = 0;
    this.yaw = 0;
    this.bonus = 0;
    this.combo = 0;
    this.comboT = 0;
    this.lives = 3;
    this.speech = 1;
    this.invuln = 1.1;
    this.hitstop = 0;
    this.failIn = 0;
    this.shake = 0;
    this.spin = 0;
    this.climb = 0;
    this.hint = 4.2;
    this.announced = false;
    this.reason = "Бочку закрутило";
    this.resetBoss();
    this.endless = false;
    this.fade = 0;
    this.fromIndex = index;
    if (this.stage.id === "boss") this.bossPhase = "fly";
    this.pops = [];
    this.rings = [];
    this.blasts = [];
    this.bits = [];
    this.phase = "play";
  }

  startEndless() {
    this.start(0);
    this.endless = true;
    this.bossPhase = "off";
  }

  private extendRoute() {
    const loop = STAGES.filter((stage) => stage.id !== "boss");
    const here = loop.findIndex((stage) => stage.id === this.stage.id);
    const next = loop[(here + 1) % loop.length] ?? loop[0];
    this.fromIndex = this.stageIndex;
    this.stageIndex = STAGES.findIndex((stage) => stage.id === next.id);
    this.fade = 1;
    const course = courseOf(next);
    const base = this.goal * PX_PER_KM;
    for (const { at, beat } of course.marks) {
      this.ents.push({
        kind: beat.kind,
        x: base + at * PX_PER_M,
        alt: beat.alt,
        hit: false,
        taken: false,
        threatened: false,
        near: false,
        yeet: false,
        yeetVy: 0,
        yeetY: 0,
        spin: Math.random() * 6,
      });
    }
    this.goal += course.goal;
    this.announced = false;
    this.popup(next.name, this.playerX(), this.playerY() - 64);
    this.ents = this.ents.filter((ent) => ent.yeet || ent.x > this.worldX - 1200);
  }

  private steer(): number {
    if (this.steerOverride != null) return clamp(this.steerOverride, -1, 1);
    let s = 0;
    if (this.held.has("KeyA") || this.held.has("ArrowLeft")) s += 1;
    if (this.held.has("KeyD") || this.held.has("ArrowRight")) s -= 1;
    return clamp(s, -1, 1);
  }

  private pitch(): number {
    let c = 0;
    if (this.held.has("KeyW") || this.held.has("ArrowUp")) c += 1;
    if (this.held.has("KeyS") || this.held.has("ArrowDown")) c -= 1;
    return clamp(c, -1, 1);
  }

  step(dt: number) {
    this.time += dt;
    this.prop += dt * (9 + this.speed * 0.02);
    if (this.phase !== "play") {
      if (this.phase !== "treaty") this.attract(dt);
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.shake = Math.max(0, this.shake - dt * 28);
      return;
    }

    const locked = this.bossPhase === "fist" || this.bossPhase === "drop" || this.bossPhase === "deal";
    const steer = locked ? 0 : this.steer();
    const climb = locked ? 0 : this.pitch();
    this.climb = climb;
    const pace = this.skinDef.pace;
    const target = (climb > 0 ? 470 : climb < 0 ? 155 : 268) * pace;
    const k = 1 - Math.exp(-(pace > 1 ? 4.4 : 3.1) * dt);
    this.speed += (target - this.speed) * k;
    this.yaw += steer * 2.6 * dt;
    this.lane = clamp(this.lane - steer * 1.15 * dt, -1, 1);
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    const gust = Math.sin(this.time * 1.7 + this.stageIndex * 1.3) * this.stage.gust;
    this.alt = clamp(this.alt + climb * 0.64 * dt + gust * dt, 0.02, 0.94);
    this.worldX += this.speed * dt;
    this.meters = this.worldX / PX_PER_KM;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 1.7);
    this.speech = Math.min(1, this.speech + dt / 2.55);
    this.invuln = Math.max(0, this.invuln - dt);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.hint = Math.max(0, this.hint - dt);
    this.radioT += dt;
    if (this.radioT > 6.5) {
      this.radioT = 0;
      this.radio = (this.radio + 1) % RADIOS.length;
    }

    const space = this.held.has("Space") || this.held.has("KeyE");
    if (space && !this.spacePrev && this.speech >= 1) this.cast();
    this.spacePrev = space;

    for (const ent of this.ents) {
      if (!ent.yeet) continue;
      ent.yeetVy += 920 * dt;
      ent.yeetY += ent.yeetVy * dt;
      ent.spin += dt * 6;
    }

    this.collide();
    this.fxStep(dt);

    if (this.failIn > 0) {
      this.failIn -= dt;
      this.spin += dt * 9;
      if (this.failIn <= 0) {
        this.phase = "fail";
        this.rememberScore();
      }
    } else if (this.endless && this.meters >= this.goal && this.failIn <= 0) {
      this.extendRoute();
    } else if (this.stage.id === "boss") {
      this.bossStep(dt);
    } else if (!this.announced && this.meters >= this.goal - 0.2) {
      this.announced = true;
      this.popup("ПОЛОСА", this.playerX(), this.playerY() - 70);
    } else if (this.meters >= this.goal && this.failIn <= 0) {
      this.finish();
    }
  }

  private attract(dt: number) {
    this.alt = 0.46 + Math.sin(this.time * 1.3) * 0.04;
    this.lane = Math.sin(this.time * 0.6) * 0.2;
    this.worldX += 36 * dt;
    this.climb = Math.sin(this.time * 1.3) * 0.35;
    this.spin *= Math.max(0, 1 - dt * 3);
    this.shake = 0;
    this.fxStep(dt);
  }

  private finish() {
    this.rememberScore();
    if (this.stageIndex >= STAGES.length - 1) {
      this.save.unlocked = Math.max(this.save.unlocked, STAGES.length - 1);
      this.persist();
      this.phase = "done";
      return;
    }
    this.save.unlocked = Math.max(this.save.unlocked, this.stageIndex + 1);
    this.persist();
    this.phase = "clear";
  }

  private cast() {
    this.speech = 0;
    this.speed = Math.max(90, this.speed - 60);
    this.shake = Math.min(8, this.shake + 3);
    const x = this.playerX() + 36;
    const y = this.playerY();
    this.blasts.push({ x, y, life: 0.26 });
    for (let i = 0; i < 8; i++) {
      this.bits.push({
        x,
        y: y + (Math.random() - 0.5) * 16,
        vx: 260 + Math.random() * 280,
        vy: (Math.random() - 0.5) * 70,
        life: 0.22,
        max: 0.22,
        color: "#d7e4ee",
        size: 3 + Math.random() * 3,
      });
    }
    for (const ent of this.ents) {
      if (ent.hit || ent.taken || ent.yeet || !KINDS[ent.kind].hurt) continue;
      const box = this.entBox(ent);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const dx = cx - x;
      const dy = cy - y;
      if (dx > 0 && dx < 320 && Math.abs(dy) < 96) {
        ent.yeet = true;
        ent.yeetVy = -420;
        ent.yeetY = 0;
        this.chain();
        this.bonus += 70 * this.combo;
      }
    }
    this.bossWaves = this.bossWaves.filter((wave) => !(wave.x > x && wave.x < x + 340 && Math.abs(wave.y - y) < 110));
    this.bossLetters = this.bossLetters.filter((letter) => !(letter.x > x && letter.x < x + 320 && Math.abs(letter.y - y) < 100));
  }

  private collide() {
    const player = this.playerBox();
    if (this.invuln <= 0 && this.failIn <= 0 && this.alt < 0.075) {
      this.damage("Грядка сказала «хватит»");
    }
    for (const ent of this.ents) {
      if (ent.hit || ent.taken || ent.yeet) continue;
      const box = this.entBox(ent);
      if (box.x > this.viewW + 80 || box.x + box.w < -80) continue;
      const kind = KINDS[ent.kind];
      const overlap = intersects(player, box);
      if (kind.hurt) {
        const fat = inflate(box, kind.slim ? 18 : 26);
        if (intersects(player, fat) && box.x + box.w > player.x) ent.threatened = true;
        if (overlap && this.invuln <= 0 && this.failIn <= 0) {
          ent.hit = true;
          this.damage(kind.quip);
        } else if (!ent.near && ent.threatened && box.x + box.w < player.x && !overlap) {
          ent.near = true;
          this.chain();
          this.bonus += 40 * this.combo;
          this.popup(this.combo > 1 ? `ВПЛОТНУЮ ×${this.combo}` : "ВПЛОТНУЮ", box.x, box.y);
        }
      } else if (overlap) {
        ent.taken = true;
        if (kind.pickup === "mic") {
          this.speech = Math.min(1, this.speech + 0.55);
          this.bonus += 140;
          this.popup("БАЛЛОН", box.x, box.y);
        } else if (kind.pickup === "patch") {
          if (this.lives < 3) this.lives += 1;
          else this.bonus += 180;
          this.popup("ЗАПЛАТКА", box.x, box.y);
        }
      }
    }
  }

  private resetBoss() {
    this.bossPhase = "off";
    this.bossEnter = 0;
    this.bossFace = "idle";
    this.bossLabel = "";
    this.bossDrop = 0;
    this.bossFist = 0;
    this.bossDeal = 0;
    this.bossThumb = 0;
    this.bossFlag = 0;
    this.bossBird = 0;
    this.bossPaper = 0;
    this.bossSoft = false;
    this.bossTieY = -1;
    this.bossTieHot = false;
    this.bossScript = 0;
    this.bossScriptT = 0;
    this.bossRounds = 0;
    this.bossWaves = [];
    this.bossLetters = [];
    this.cue = [];
  }

  private bossStep(dt: number) {
    if (this.bossPhase === "fly") {
      if (this.meters >= this.goal) {
        this.bossPhase = "in";
        this.bossEnter = 0;
        this.bossLabel = "Слева по борту";
        this.cue.push("boss");
        this.popup("СЛЕВА", this.playerX(), this.playerY() - 64);
      }
      return;
    }
    if (this.bossPhase === "in") {
      this.bossEnter = Math.min(1, this.bossEnter + dt / 1.15);
      this.speed *= 0.96;
      if (this.bossEnter >= 1) {
        this.bossPhase = "fight";
        this.bossScript = 0;
        this.bossScriptT = 0;
        this.bossRounds = 0;
      }
      return;
    }
    if (this.bossPhase === "fight") {
      this.speed += (140 - this.speed) * (1 - Math.exp(-2 * dt));
      this.advanceBoss(dt);
      this.pushBoss(dt);
      return;
    }
    if (this.bossPhase === "fist") {
      this.bossFist = Math.min(1, this.bossFist + dt / 0.55);
      this.bossFace = "shout";
      if (this.bossFist >= 1) {
        this.bossPhase = "drop";
        this.shake = 22;
        this.spin = 0.6;
        this.speed = 0;
        this.cue.push("fist");
      }
      return;
    }
    if (this.bossPhase === "drop") {
      this.bossDrop += dt * 780;
      this.spin += dt * 7;
      this.bossFist = Math.min(1.4, this.bossFist + dt * 1.6);
      if (this.bossDrop > 640) {
        this.bossPhase = "deal";
        this.bossFace = "smile";
        this.bossFlag = 0;
        this.bossBird = 0;
        this.bossThumb = 0;
        this.bossPaper = 0;
        this.bossSoft = false;
        this.bossScriptT = 0;
        this.bossLabel = "Мирный договор";
      }
      return;
    }
    if (this.bossPhase === "deal") {
      this.bossScriptT += dt;
      const t = this.bossScriptT;
      this.bossFlag = clamp((t - 0.15) / 0.75, 0, 1);
      this.bossBird = clamp((t - 1.05) / 0.5, 0, 1);
      this.bossThumb = clamp((t - 1.85) / 0.55, 0, 1);
      this.bossPaper = clamp((t - 2.55) / 0.7, 0, 1);
      if (!this.bossSoft && t >= 1.05) {
        this.bossSoft = true;
        this.cue.push("eagle-soft");
      }
      if (t > 5.4) {
        this.rememberScore();
        this.phase = "treaty";
      }
    }
  }

  private advanceBoss(dt: number) {
    const moves = ["eagle", "gap", "maga", "gap", "tie", "gap"] as const;
    const dur = [2.2, 0.5, 2.8, 0.45, 1.75, 0.6];
    if (this.bossScriptT === 0) this.beginMove(moves[this.bossScript]);
    this.bossScriptT += dt;
    if (this.bossScriptT < dur[this.bossScript]) return;
    this.bossScriptT = 0;
    this.bossScript += 1;
    if (this.bossScript >= moves.length) {
      this.bossScript = 0;
      this.bossRounds += 1;
      if (this.bossRounds >= 2) {
        this.bossPhase = "fist";
        this.bossFist = 0;
        this.bossWaves = [];
        this.bossLetters = [];
        this.bossTieY = -1;
        this.bossLabel = "Кулак";
      }
    }
  }

  private beginMove(move: "eagle" | "gap" | "maga" | "tie") {
    if (move === "gap") {
      this.bossFace = "idle";
      this.bossTieY = -1;
      return;
    }
    if (move === "eagle") {
      this.bossFace = "shout";
      this.bossLabel = "Крик орла";
      this.cue.push("eagle");
      const gap = Math.floor(Math.random() * 3);
      const bands = [0.24, 0.5, 0.76];
      for (let i = 0; i < 3; i++) {
        if (i === gap) continue;
        this.bossWaves.push({ x: 250, y: this.altY(bands[i]), h: 58, hot: 0.18 });
      }
      return;
    }
    if (move === "maga") {
      this.bossFace = "shout";
      this.bossLabel = "MAKE AMERICA GREAT AGAIN";
      this.cue.push("maga");
      const rows = [
        { text: "MAKE AMERICA", alt: 0.3 },
        { text: "GREAT AGAIN", alt: 0.7 },
      ];
      for (const row of rows) {
        let x = 280;
        for (const ch of row.text) {
          if (ch === " ") {
            x += 26;
            continue;
          }
          this.bossLetters.push({ ch, x, y: this.altY(row.alt) });
          x += 34;
        }
      }
      return;
    }
    this.bossFace = "idle";
    this.bossLabel = "Галстук";
    this.bossTieY = this.playerY();
    this.bossTieHot = false;
  }

  private pushBoss(dt: number) {
    const player = this.playerBox();
    for (const wave of this.bossWaves) {
      wave.x += 360 * dt;
      wave.hot = Math.max(0, wave.hot - dt);
      if (wave.hot <= 0 && this.invuln <= 0 && this.failIn <= 0) {
        const box = { x: wave.x, y: wave.y - wave.h / 2, w: 168, h: wave.h };
        if (intersects(player, box)) this.damage("Орёл крикнул");
      }
    }
    this.bossWaves = this.bossWaves.filter((wave) => wave.x < this.viewW + 40);
    for (const letter of this.bossLetters) letter.x += 230 * dt;
    if (this.invuln <= 0 && this.failIn <= 0) {
      for (const letter of this.bossLetters) {
        const box = { x: letter.x - 16, y: letter.y - 22, w: 32, h: 40 };
        if (intersects(player, box)) {
          this.damage("Буква не уступила");
          break;
        }
      }
    }
    this.bossLetters = this.bossLetters.filter((letter) => letter.x < this.viewW + 30);
    if (this.bossTieY >= 0 && this.bossLabel === "Галстук") {
      this.bossScriptT > 0.85 ? (this.bossTieHot = true) : (this.bossTieHot = false);
      if (this.bossTieHot && this.invuln <= 0 && this.failIn <= 0 && Math.abs(this.playerY() - this.bossTieY) < 30 && this.playerX() > 280) {
        this.damage("Галстук хлестнул");
      }
    }
    if (this.bossLabel !== "Галстук") this.bossTieY = -1;
  }

  private chain() {
    this.combo += 1;
    this.comboT = 2.3;
  }

  private damage(why: string) {
    this.lives -= 1;
    this.combo = 0;
    this.comboT = 0;
    this.invuln = 1.65;
    this.alt = Math.min(0.78, this.alt + 0.14);
    this.shake = this.reduce ? 4 : 16;
    this.speed *= 0.62;
    this.hitstop = 0.05;
    this.reason = why;
    this.popup(why.toUpperCase(), this.playerX(), this.playerY() - 48);
    this.burst(this.playerX(), this.playerY(), "#c4452d", 18);
    if (this.lives <= 0) this.failIn = 0.55;
  }

  private fxStep(dt: number) {
    for (const pop of this.pops) pop.life -= dt;
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const ring of this.rings) {
      ring.life -= dt;
      ring.r += dt * 520;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const blast of this.blasts) blast.life -= dt;
    this.blasts = this.blasts.filter((b) => b.life > 0);
    for (const bit of this.bits) {
      bit.life -= dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += 30 * dt;
    }
    this.bits = this.bits.filter((b) => b.life > 0);
  }

  popup(text: string, x: number, y: number) {
    this.pops.push({ text, x, y, life: 0.9 });
    if (this.pops.length > 8) this.pops.shift();
  }

  burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 180;
      this.bits.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.3,
        max: 0.55,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  playerX() {
    const slide = this.bossPhase === "off" || this.bossPhase === "fly" ? 0 : this.bossPhase === "in" ? this.bossEnter : 1;
    const anchor = 0.36 + slide * 0.3;
    const span = 0.18 - slide * 0.08;
    return this.viewW * anchor + this.lane * this.viewW * span;
  }

  playerY() {
    const ground = this.viewH * 0.8;
    const ceil = this.viewH * 0.12;
    return ground - this.alt * (ground - ceil);
  }

  playerBox() {
    const x = this.playerX();
    const y = this.playerY();
    return { x: x - 36, y: y - 16, w: 78, h: 36 };
  }

  entBox(ent: Ent) {
    const kind = KINDS[ent.kind];
    const iw = kind.h * 0.9;
    const ih = kind.h;
    const cx = this.viewW * 0.36 + (ent.x - this.worldX);
    const ground = this.viewH * 0.8;
    const baseY = kind.ground ? ground - ih : this.altY(ent.alt) - ih * 0.5 + ent.yeetY;
    const padX = kind.slim ? iw * 0.32 : iw * 0.2;
    const padY = ih * 0.16;
    return { x: cx - iw / 2 + padX, y: baseY + padY, w: iw - padX * 2, h: ih - padY * 2 };
  }

  altY(alt: number) {
    const ground = this.viewH * 0.8;
    const ceil = this.viewH * 0.12;
    return ground - alt * (ground - ceil);
  }
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inflate(b: { x: number; y: number; w: number; h: number }, m: number) {
  return { x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 };
}

