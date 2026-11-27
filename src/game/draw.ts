import { KINDS, STAGES, type KindId } from "./content";
import type { Sim } from "./sim";

const BASE_W = 960;
const BASE_H = 540;
const seams = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

function ready(img: HTMLImageElement | undefined): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}

function seamless(img: HTMLImageElement) {
  const cached = seams.get(img);
  if (cached) return cached;
  const fade = Math.max(12, Math.round(img.width * 0.1));
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const g = canvas.getContext("2d");
  if (!g) return img;
  g.drawImage(img, 0, 0);
  const strip = document.createElement("canvas");
  strip.width = fade;
  strip.height = img.height;
  const sg = strip.getContext("2d");
  if (!sg) return img;
  sg.drawImage(img, 0, 0, fade, img.height, 0, 0, fade, img.height);
  sg.globalCompositeOperation = "destination-in";
  const grad = sg.createLinearGradient(0, 0, fade, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,1)");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, fade, img.height);
  g.drawImage(strip, img.width - fade, 0);
  seams.set(img, canvas);
  return canvas;
}

function tiled(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  y: number,
  destH: number,
  scroll: number,
) {
  if (destH <= 1 || srcH <= 1) return;
  const destW = (destH * srcW) / srcH;
  let x = -(((scroll % destW) + destW) % destW);
  while (x < BASE_W) {
    ctx.drawImage(img, x, y, destW, destH);
    x += destW - 1;
  }
}

function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  images: Record<string, HTMLImageElement | undefined>,
  scene: (typeof STAGES)[number]["scenery"],
  alpha: number,
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const sky = images[scene.sky] ?? images.sky;
  const far = images[scene.far] ?? images.far;
  const ground = images[scene.ground] ?? images.ground;
  if (sky && ready(sky)) {
    const drift = Math.min(70, sim.worldX * 0.015);
    ctx.drawImage(sky, -drift, -8, BASE_W + 70, BASE_H + 16);
  } else {
    ctx.fillStyle = "#8eb6d4";
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }
  const groundY = BASE_H * 0.8;
  if (far && ready(far)) {
    const plate = seamless(far);
    const destH = BASE_H * 0.62;
    tiled(ctx, plate, plate.width, plate.height, groundY - destH + 28, destH, sim.worldX * 0.38);
  }
  if (ground && ready(ground)) {
    const plate = seamless(ground);
    const destH = BASE_H * 0.34;
    tiled(ctx, plate, plate.width, plate.height, groundY - 18, destH, sim.worldX);
  }
  ctx.restore();
}

export function draw(ctx: CanvasRenderingContext2D, sim: Sim, images: Record<string, HTMLImageElement | undefined>) {
  const scene = sim.stage.scenery;
  ctx.clearRect(0, 0, BASE_W, BASE_H);
  const mag = sim.reduce ? sim.shake * 0.25 : sim.shake;
  const ox = Math.sin(sim.time * 73) * mag;
  const oy = Math.cos(sim.time * 59) * mag;
  ctx.save();
  ctx.translate(ox, oy);

  if (sim.fade > 0) {
    paintBackdrop(ctx, sim, images, STAGES[sim.fromIndex]?.scenery ?? scene, 1);
    paintBackdrop(ctx, sim, images, scene, 1 - sim.fade);
  } else {
    paintBackdrop(ctx, sim, images, scene, 1);
  }

  if (sim.speed > 380 && sim.phase === "play") {
    ctx.save();
    ctx.globalAlpha = Math.min(0.35, (sim.speed - 380) / 500);
    ctx.strokeStyle = scene.streak;
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = 80 + ((i * 97 + sim.worldX * 0.4) % (BASE_H - 120));
      ctx.beginPath();
      ctx.moveTo(BASE_W, y);
      ctx.lineTo(BASE_W - 70 - (i % 3) * 30, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const ent of sim.ents) drawEnt(ctx, sim, images, ent);
  drawBossHazards(ctx, sim);
  drawPlayer(ctx, sim, images);
  drawBoss(ctx, sim, images);

  for (const ring of sim.rings) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ring.life * 2);
    ctx.strokeStyle = "#e6b325";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#1d4e9a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const blast of sim.blasts) {
    const k = 1 - blast.life / 0.26;
    ctx.save();
    ctx.globalAlpha = Math.max(0, blast.life * 3);
    ctx.fillStyle = "rgba(214, 228, 238, 0.55)";
    ctx.beginPath();
    ctx.ellipse(blast.x + 30 + k * 150, blast.y, 22 + k * 78, 12 + k * 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const bit of sim.bits) {
    ctx.globalAlpha = Math.max(0, bit.life / bit.max);
    ctx.fillStyle = bit.color;
    ctx.fillRect(bit.x, bit.y, bit.size, bit.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = "700 20px Unbounded, Manrope, sans-serif";
  ctx.textAlign = "center";
  for (const pop of sim.pops) {
    ctx.globalAlpha = Math.min(1, pop.life * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f3e4c4";
    ctx.fillStyle = "#1c1712";
    const y = pop.y - (0.9 - pop.life) * 36;
    ctx.strokeText(pop.text, pop.x, y);
    ctx.fillText(pop.text, pop.x, y);
  }
  ctx.globalAlpha = 1;

  const vignette = ctx.createRadialGradient(BASE_W / 2, BASE_H / 2, BASE_H * 0.35, BASE_W / 2, BASE_H / 2, BASE_W * 0.62);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, scene.vignette);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.restore();
}

function drawEnt(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  images: Record<string, HTMLImageElement | undefined>,
  ent: Sim["ents"][number],
) {
  const kind = KINDS[ent.kind];
  const img = images[kind.file];
  if (!img || !ready(img)) return;
  const ih = kind.h;
  const iw = ih * (img.width / img.height);
  const cx = sim.viewW * 0.36 + (ent.x - sim.worldX);
  if (cx < -iw || cx > sim.viewW + iw) return;
  const ground = sim.viewH * 0.8;
  let y = kind.ground ? ground : sim.altY(ent.alt) + ent.yeetY;
  if (!kind.ground && (ent.kind === "pigeon" || ent.kind === "drone" || ent.kind === "chicken")) {
    y += Math.sin(sim.time * 5 + ent.x * 0.01) * 7;
  }
  ctx.save();
  ctx.translate(cx, kind.ground ? y : y);
  const spinning = ent.yeet || ent.kind === "sofa" || ent.kind === "bottle" || ent.kind === "pan";
  if (spinning) ctx.rotate(ent.spin + (ent.yeet ? 0 : sim.time * (ent.kind === "sofa" ? 0.6 : 0.4)));
  const top = kind.ground ? -ih : -ih / 2;
  ctx.drawImage(img, -iw / 2, top, iw, ih);
  ctx.restore();
}

function drawBossHazards(ctx: CanvasRenderingContext2D, sim: Sim) {
  if (sim.bossTieY >= 0) {
    ctx.save();
    ctx.globalAlpha = sim.bossTieHot ? 0.85 : 0.35;
    ctx.fillStyle = sim.bossTieHot ? "#c4452d" : "#e6b325";
    ctx.fillRect(250, sim.bossTieY - 16, BASE_W - 230, 32);
    ctx.restore();
  }
  for (const wave of sim.bossWaves) {
    ctx.save();
    ctx.globalAlpha = wave.hot > 0 ? 0.35 : 0.8;
    ctx.strokeStyle = "#f4f0e4";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(wave.x + 70, wave.y, 78, wave.h * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.font = "800 28px Unbounded, Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const letter of sim.bossLetters) {
    ctx.fillStyle = "#e6b325";
    ctx.strokeStyle = "#1c1712";
    ctx.lineWidth = 4;
    ctx.strokeText(letter.ch, letter.x, letter.y);
    ctx.fillText(letter.ch, letter.x, letter.y);
  }
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, sim: Sim, images: Record<string, HTMLImageElement | undefined>) {
  if (sim.bossPhase === "off" || sim.bossPhase === "fly") return;
  const faceName = sim.bossFace === "shout" ? "trump-shout" : sim.bossFace === "smile" ? "trump-smile" : "trump-idle";
  const face = images[faceName] ?? images["trump-idle"];
  if (face && ready(face)) {
    const hh = BASE_H * 1.2;
    const hw = hh * (face.width / face.height);
    const x = -hw * 0.28 + sim.bossEnter * hw * 0.62;
    const y = BASE_H * 0.5 + Math.sin(sim.time * 1.6) * 7;
    ctx.save();
    ctx.translate(x, y);
    if (sim.bossFace === "shout") ctx.rotate(Math.sin(sim.time * 28) * 0.02);
    ctx.drawImage(face, -hw / 2, -hh / 2, hw, hh);
    ctx.restore();
  }
  if (sim.bossPhase === "fist" || sim.bossPhase === "drop") {
    const fist = images["trump-fist"];
    if (fist && ready(fist)) {
      const s = 210;
      const w = s * (fist.width / fist.height);
      const x = sim.playerX() - 10;
      const from = -180;
      const impact = sim.playerY() - sim.bossDrop - 20;
      const k = sim.bossPhase === "fist" ? sim.bossFist : Math.min(1, sim.bossDrop / 260);
      const y = sim.bossPhase === "fist" ? from + (impact - from) * sim.bossFist : impact - k * 460;
      if (y < BASE_H + 40) {
        ctx.save();
        ctx.drawImage(fist, x - w / 2, y - s / 2, w, s);
        ctx.restore();
      }
    }
  }
  if (sim.bossPhase !== "deal") return;
  if (sim.bossFlag > 0) drawFlag(ctx, sim.bossFlag);
  const bird = images.eagle;
  if (bird && ready(bird) && sim.bossBird > 0) {
    const s = 188;
    const w = s * (bird.width / bird.height);
    const x = 560 + (1 - sim.bossBird) * 80;
    const y = 168;
    ctx.save();
    ctx.globalAlpha = sim.bossBird;
    ctx.drawImage(bird, x, y, w, s);
    ctx.restore();
  }
  const thumb = images["trump-thumb"];
  if (thumb && ready(thumb) && sim.bossThumb > 0) {
    const s = 250;
    const w = s * (thumb.width / thumb.height);
    ctx.save();
    ctx.translate(BASE_W + 70 - sim.bossThumb * 20, BASE_H + 60 - sim.bossThumb * 10);
    ctx.rotate(-0.72);
    ctx.globalAlpha = Math.min(1, sim.bossThumb * 1.4);
    ctx.drawImage(thumb, -w * 0.42, -s * 0.96, w, s);
    ctx.restore();
  }
  if (sim.bossPaper > 0) drawTreaty(ctx, sim.bossPaper);
}

function drawFlag(ctx: CanvasRenderingContext2D, t: number) {
  const rise = t * 250;
  const poleX = 800;
  const top = BASE_H + 8 - rise;
  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 1.5);
  ctx.fillStyle = "#5c3b22";
  ctx.fillRect(poleX, top, 7, rise + 16);
  ctx.fillStyle = "#d4a017";
  ctx.beginPath();
  ctx.arc(poleX + 3.5, top, 6, 0, Math.PI * 2);
  ctx.fill();
  const fw = 138;
  const fh = 88;
  ctx.translate(poleX + 7, top + 4);
  const stripe = fh / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#b22234" : "#f7f4ee";
    ctx.fillRect(0, i * stripe, fw, stripe + 0.4);
  }
  ctx.fillStyle = "#3c3b6e";
  ctx.fillRect(0, 0, fw * 0.4, stripe * 7);
  ctx.fillStyle = "#f7f4ee";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      if ((row + col) % 2 === 1) continue;
      star(ctx, 7 + col * 8.2, 6 + row * 8.4, 2.3);
    }
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(b) * r * 0.42, y + Math.sin(b) * r * 0.42);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTreaty(ctx: CanvasRenderingContext2D, t: number) {
  const w = 360;
  const h = 188;
  const x = (BASE_W - w) / 2;
  const y = BASE_H + 16 - t * (h + 28);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.03);
  ctx.fillStyle = "#f4ead2";
  ctx.strokeStyle = "#1c1712";
  ctx.lineWidth = 3;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);
  ctx.fillStyle = "#1c1712";
  ctx.textAlign = "center";
  ctx.font = "800 18px Unbounded, Manrope, sans-serif";
  ctx.fillText("МИРНЫЙ ДОГОВОР", w / 2, 36);
  ctx.font = "700 16px Manrope, sans-serif";
  ctx.fillText("Долг Украины — вечный.", w / 2, 74);
  ctx.fillText("Проценты капают криком орла.", w / 2, 100);
  ctx.fillText("Трампу — соси-соси.", w / 2, 126);
  ctx.font = "700 14px Manrope, sans-serif";
  ctx.fillStyle = "#8a5a12";
  ctx.fillText("подпись: палец вверх", w / 2, 162);
  ctx.restore();
}

function drawExhaust(ctx: CanvasRenderingContext2D, sim: Sim, hw: number, hh: number) {
  const burn = 0.55 + Math.min(1, sim.speed / 480) * 0.7;
  const originX = -hw / 2 + hw * 0.045;
  // Twin nozzles, flight is to the right, so the plume goes out the tail to the left.
  const nozzles = [-hh * 0.02, hh * 0.1];
  for (let i = 0; i < nozzles.length; i++) {
    const y = nozzles[i];
    const flick = 0.72 + Math.sin(sim.time * 31 + i * 2.4) * 0.2 + Math.sin(sim.time * 53 + i) * 0.08;
    const len = hh * 2.15 * burn * flick;
    const thick = hh * 0.16 * (0.85 + Math.sin(sim.time * 22 + i * 1.7) * 0.15);
    ctx.save();
    const outer = ctx.createLinearGradient(originX, y, originX - len, y);
    outer.addColorStop(0, "rgba(255, 236, 196, 0.95)");
    outer.addColorStop(0.18, "rgba(255, 168, 48, 0.9)");
    outer.addColorStop(0.55, "rgba(214, 62, 18, 0.55)");
    outer.addColorStop(1, "rgba(90, 18, 8, 0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(originX, y - thick * 0.28);
    ctx.quadraticCurveTo(originX - len * 0.35, y - thick * (i === 0 ? 0.95 : 1.05), originX - len * 0.72, y - thick * 0.15);
    ctx.quadraticCurveTo(originX - len, y, originX - len * 0.7, y + thick * 0.2);
    ctx.quadraticCurveTo(originX - len * 0.32, y + thick, originX, y + thick * 0.28);
    ctx.closePath();
    ctx.fill();
    const core = ctx.createLinearGradient(originX, y, originX - len * 0.62, y);
    core.addColorStop(0, "rgba(255, 255, 245, 0.9)");
    core.addColorStop(0.4, "rgba(120, 196, 255, 0.45)");
    core.addColorStop(1, "rgba(120, 196, 255, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(originX - len * 0.22, y, len * 0.28, thick * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, sim: Sim, images: Record<string, HTMLImageElement | undefined>) {
  const hero = images[sim.skinDef.file] ?? images.hero;
  const prop = images.prop;
  if (!hero || !ready(hero)) return;
  const hh = sim.skinDef.drawH;
  const hw = hh * (hero.width / hero.height);
  const x = sim.playerX();
  const y = sim.playerY() + sim.bossDrop + Math.sin(sim.time * 8) * 3;
  if (sim.bossPhase === "deal") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-sim.climb * 0.28 + sim.spin);
  if (sim.invuln > 0 && Math.sin(sim.time * 28) > 0) ctx.globalAlpha = 0.45;
  if (sim.skinDef.id === "mig") drawExhaust(ctx, sim, hw, hh);
  ctx.drawImage(hero, -hw / 2, -hh / 2, hw, hh);
  if (sim.skinDef.prop && prop && ready(prop)) {
    const ps = hh * 0.36;
    ctx.save();
    // Flight is toward the right, so the nose is the right end of the barrel.
    ctx.translate(-hw / 2 + hw * 0.97, -hh / 2 + hh * 0.5);
    ctx.rotate(sim.prop);
    ctx.drawImage(prop, -ps / 2, -ps / 2, ps, ps);
    ctx.restore();
  }
  ctx.restore();
}

export const VIEW = { w: BASE_W, h: BASE_H };

export function assetUrl(name: string) {
  const ext = name.startsWith("sky") || name.startsWith("ground") ? "jpg" : "png";
  return `/game/${name}.${ext}?v=6`;
}

export const ASSET_NAMES = [
  "sky",
  "far",
  "ground",
  "sky-yard",
  "far-yard",
  "ground-yard",
  "sky-district",
  "far-district",
  "ground-district",
  "sky-highway",
  "far-highway",
  "ground-highway",
  "sky-field",
  "far-field",
  "ground-field",
  "sky-summit",
  "far-summit",
  "ground-summit",
  "hero",
  "hero-gachi",
  "hero-baron",
  "hero-mig",
  "prop",
  "trump-idle",
  "trump-shout",
  "trump-smile",
  "trump-fist",
  "trump-deal",
  "trump-thumb",
  "eagle",
  ...(Object.keys(KINDS) as KindId[]),
];
