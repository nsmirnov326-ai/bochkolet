export type SkinId = "barrel" | "gachi" | "baron" | "mig";

export type SkinDef = {
  id: SkinId;
  name: string;
  file: string;
  line: string;
  tune: string;
  track: string;
  pace: number;
  drawH: number;
  prop: boolean;
};

export const SKINS: SkinDef[] = [
  { id: "barrel", name: "Бочка", file: "hero", line: "двор", tune: "фонк", track: "/game/track.mp3", pace: 1, drawH: 140, prop: true },
  { id: "gachi", name: "Гачимучилёт", file: "hero-gachi", line: "Билли и цепи", tune: "gachi remix", track: "/game/track-gachi.mp3", pace: 1, drawH: 132, prop: true },
  { id: "baron", name: "Красный Патрон", file: "hero-baron", line: "пуля и балки", tune: "Red Baron", track: "/game/track-baron.mp3", pace: 1, drawH: 118, prop: true },
  { id: "mig", name: "МиГ-31", file: "hero-mig", line: "быстрее", tune: "три полоски", track: "/game/track-mig.mp3", pace: 1.62, drawH: 100, prop: false },
];

export function skinById(id: string | undefined): SkinDef {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}

export type KindId =
  | "chicken"
  | "pigeon"
  | "sofa"
  | "drone"
  | "laundry"
  | "tree"
  | "fence"
  | "pole"
  | "mic"
  | "can"
  | "case"
  | "bottle"
  | "board";

export type Kind = {
  id: KindId;
  file: string;
  h: number;
  hurt: boolean;
  ground: boolean;
  slim: boolean;
  pickup?: "mic" | "patch";
  quip: string;
};

export const KINDS: Record<KindId, Kind> = {
  chicken: { id: "chicken", file: "chicken", h: 62, hurt: true, ground: false, slim: false, quip: "Курица не диспетчер" },
  pigeon: { id: "pigeon", file: "pigeon", h: 58, hurt: true, ground: false, slim: false, quip: "Голубь занял эшелон" },
  sofa: { id: "sofa", file: "sofa", h: 92, hurt: true, ground: false, slim: false, quip: "Диван на встречном" },
  drone: { id: "drone", file: "drone", h: 52, hurt: true, ground: false, slim: false, quip: "Вас сняли крупно" },
  laundry: { id: "laundry", file: "laundry", h: 118, hurt: true, ground: false, slim: false, quip: "Бельё — не огни ВПП" },
  tree: { id: "tree", file: "tree", h: 196, hurt: true, ground: true, slim: true, quip: "Яблоня не расступается" },
  fence: { id: "fence", file: "fence", h: 78, hurt: true, ground: true, slim: false, quip: "Забор был против" },
  pole: { id: "pole", file: "pole", h: 228, hurt: true, ground: true, slim: true, quip: "Провода помнят всех" },
  mic: { id: "mic", file: "mic", h: 70, hurt: false, ground: false, slim: true, pickup: "mic", quip: "Эфир" },
  can: { id: "can", file: "can", h: 62, hurt: false, ground: false, slim: false, pickup: "patch", quip: "Заплатка" },
  case: { id: "case", file: "case", h: 64, hurt: true, ground: false, slim: false, quip: "Портфель тяжёлый" },
  bottle: { id: "bottle", file: "bottle", h: 78, hurt: true, ground: false, slim: true, quip: "Шампанское в штопор" },
  board: { id: "board", file: "board", h: 150, hurt: true, ground: true, slim: false, quip: "Билборд аплодирует" },
};

export type Beat = { kind: KindId; alt: number; gap: number };

export type Scenery = {
  sky: string;
  far: string;
  ground: string;
  when: string;
  vignette: string;
  streak: string;
};

export type StageDef = {
  id: string;
  name: string;
  flight: string;
  brief: string;
  clear: string;
  gust: number;
  /** Длина рейса в километрах. Одна и та же для всех бортов. */
  km: number;
  scenery: Scenery;
  beats: Beat[];
};

const yard: Beat[] = [
  { kind: "chicken", alt: 0.26, gap: 15 },
  { kind: "laundry", alt: 0.5, gap: 15 },
  { kind: "fence", alt: 0, gap: 16 },
  { kind: "mic", alt: 0.62, gap: 14 },
  { kind: "chicken", alt: 0.22, gap: 14 },
  { kind: "pigeon", alt: 0.68, gap: 14 },
  { kind: "tree", alt: 0, gap: 17 },
  { kind: "sofa", alt: 0.42, gap: 15 },
  { kind: "can", alt: 0.66, gap: 14 },
  { kind: "laundry", alt: 0.34, gap: 15 },
  { kind: "fence", alt: 0, gap: 15 },
  { kind: "pigeon", alt: 0.58, gap: 14 },
];

const district: Beat[] = [
  { kind: "pigeon", alt: 0.3, gap: 13 },
  { kind: "drone", alt: 0.62, gap: 13 },
  { kind: "sofa", alt: 0.4, gap: 14 },
  { kind: "pole", alt: 0, gap: 15 },
  { kind: "mic", alt: 0.7, gap: 13 },
  { kind: "laundry", alt: 0.48, gap: 13 },
  { kind: "pigeon", alt: 0.24, gap: 12 },
  { kind: "drone", alt: 0.66, gap: 13 },
  { kind: "case", alt: 0.36, gap: 13 },
  { kind: "sofa", alt: 0.52, gap: 14 },
  { kind: "can", alt: 0.28, gap: 13 },
  { kind: "pigeon", alt: 0.6, gap: 12 },
  { kind: "pole", alt: 0, gap: 15 },
];

const highway: Beat[] = [
  { kind: "board", alt: 0, gap: 14 },
  { kind: "drone", alt: 0.64, gap: 12 },
  { kind: "case", alt: 0.32, gap: 12 },
  { kind: "bottle", alt: 0.5, gap: 13 },
  { kind: "mic", alt: 0.72, gap: 12 },
  { kind: "board", alt: 0, gap: 14 },
  { kind: "sofa", alt: 0.44, gap: 13 },
  { kind: "pigeon", alt: 0.26, gap: 12 },
  { kind: "drone", alt: 0.58, gap: 12 },
  { kind: "case", alt: 0.38, gap: 12 },
  { kind: "can", alt: 0.66, gap: 13 },
  { kind: "bottle", alt: 0.3, gap: 12 },
  { kind: "sofa", alt: 0.48, gap: 13 },
];

const field: Beat[] = [
  { kind: "fence", alt: 0, gap: 13 },
  { kind: "pigeon", alt: 0.62, gap: 12 },
  { kind: "tree", alt: 0, gap: 15 },
  { kind: "chicken", alt: 0.28, gap: 12 },
  { kind: "pole", alt: 0, gap: 15 },
  { kind: "mic", alt: 0.7, gap: 12 },
  { kind: "tree", alt: 0, gap: 15 },
  { kind: "pigeon", alt: 0.34, gap: 12 },
  { kind: "fence", alt: 0, gap: 13 },
  { kind: "can", alt: 0.58, gap: 12 },
  { kind: "pole", alt: 0, gap: 14 },
  { kind: "chicken", alt: 0.24, gap: 12 },
  { kind: "pigeon", alt: 0.66, gap: 12 },
];

const summit: Beat[] = [
  { kind: "bottle", alt: 0.34, gap: 12 },
  { kind: "case", alt: 0.55, gap: 11 },
  { kind: "drone", alt: 0.7, gap: 12 },
  { kind: "sofa", alt: 0.4, gap: 12 },
  { kind: "board", alt: 0, gap: 13 },
  { kind: "mic", alt: 0.72, gap: 11 },
  { kind: "bottle", alt: 0.28, gap: 11 },
  { kind: "case", alt: 0.5, gap: 11 },
  { kind: "drone", alt: 0.64, gap: 11 },
  { kind: "can", alt: 0.36, gap: 12 },
  { kind: "sofa", alt: 0.46, gap: 12 },
  { kind: "bottle", alt: 0.62, gap: 11 },
  { kind: "board", alt: 0, gap: 13 },
  { kind: "pigeon", alt: 0.3, gap: 11 },
];

function extend(beats: Beat[]): Beat[] {
  const shift = (list: Beat[], delta: number, extra: number): Beat[] =>
    list.map((beat) => ({
      kind: beat.kind,
      alt: beat.alt === 0 ? 0 : Math.min(0.86, Math.max(0.14, beat.alt + delta)),
      gap: beat.gap + extra,
    }));
  const once = [...beats, ...shift(beats, 0.12, 3), ...shift(beats, -0.1, 2)];
  return [...once, ...shift(once, 0.06, 1)];
}

export const STAGES: StageDef[] = [
  {
    id: "yard",
    name: "Двор",
    flight: "БЧ-01",
    brief: "Утро. Взлёт с грядки. Курица маршрут не согласовывала, бельё — тем более.",
    clear: "Забор позади. Бочка всё ещё верит в аэродинамику.",
    gust: 0,
    km: 3,
    scenery: {
      sky: "sky-yard",
      far: "far-yard",
      ground: "ground-yard",
      when: "утро",
      vignette: "rgba(80, 48, 18, 0.2)",
      streak: "#f6e2b8",
    },
    beats: yard,
  },
  {
    id: "district",
    name: "Район",
    flight: "БЧ-02",
    brief: "Полдень между панелями. Диван вышел на встречный эшелон без заявки.",
    clear: "Двор позади, район пережит. Пропеллер ещё круглый.",
    gust: 0.05,
    km: 3,
    scenery: {
      sky: "sky-district",
      far: "far-district",
      ground: "ground-district",
      when: "полдень",
      vignette: "rgba(30, 48, 70, 0.16)",
      streak: "#f4f0e4",
    },
    beats: district,
  },
  {
    id: "highway",
    name: "Трасса",
    flight: "БЧ-03",
    brief: "К вечеру над пробкой. Билборды аплодируют сами себе.",
    clear: "Пробка осталась внизу. Бочка считает это победой.",
    gust: 0.13,
    km: 3,
    scenery: {
      sky: "sky-highway",
      far: "far-highway",
      ground: "ground-highway",
      when: "к вечеру",
      vignette: "rgba(90, 40, 10, 0.22)",
      streak: "#ffd7a1",
    },
    beats: highway,
  },
  {
    id: "field",
    name: "Поле",
    flight: "БЧ-04",
    brief: "Закат. Открытый воздух, только ниже. Провода помнят каждого.",
    clear: "Поле пройдено. Яблоки не засчитали как зенит.",
    gust: 0.08,
    km: 3,
    scenery: {
      sky: "sky-field",
      far: "far-field",
      ground: "ground-field",
      when: "закат",
      vignette: "rgba(70, 20, 30, 0.28)",
      streak: "#ffc2a0",
    },
    beats: field,
  },
  {
    id: "summit",
    name: "Саммит",
    flight: "БЧ-05",
    brief: "Ночь. Шампанское, портфели и красная дорожка где-то справа.",
    clear: "Борт сел. Бочка цела, рейс закрыт.",
    gust: 0.17,
    km: 3,
    scenery: {
      sky: "sky-summit",
      far: "far-summit",
      ground: "ground-summit",
      when: "ночь",
      vignette: "rgba(4, 8, 24, 0.45)",
      streak: "#d7e4ff",
    },
    beats: summit,
  },
  {
    id: "boss",
    name: "Финал",
    flight: "БЧ-06",
    brief: "Сначала обычный подлёт. Потом слева на всю сторону высовывается голова.",
    clear: "Мирный договор. Палец вверх.",
    gust: 0,
    km: 3,
    scenery: {
      sky: "sky-summit",
      far: "far-summit",
      ground: "ground-summit",
      when: "ночь",
      vignette: "rgba(4, 8, 24, 0.5)",
      streak: "#d7e4ff",
    },
    beats: [
      { kind: "pigeon", alt: 0.35, gap: 14 },
      { kind: "drone", alt: 0.62, gap: 13 },
      { kind: "pigeon", alt: 0.24, gap: 16 },
    ],
  },
];

export const RADIOS = [
  "Борт Бочка, шасси из табуреток на месте.",
  "Высота приемлемая. Для бочки.",
  "Вас снимают. Улыбнитесь пропеллеру.",
  "Это не штопор. Это пресс-подход.",
  "Ветер попутный. Оптимизм тоже.",
  "Диван в эшелон не входит. Уступите.",
  "Речь — штатное противообледенительное.",
];

/** Пикселей на километр маршрута. Крейсер бочки ~230 км/ч, МиГ ~370 км/ч. */
export const PX_PER_KM = 4200;
/** Внутренний шаг разметки. 100 таких метров = 1 км на табло. */
export const PX_PER_M = PX_PER_KM / 100;

export function courseOf(stage: StageDef) {
  const sum = stage.beats.reduce((total, beat) => total + beat.gap, 0);
  const leadKm = 0.12;
  const usable = Math.max(0.4, stage.km - leadKm);
  const gapKm = usable / sum;
  let cursor = leadKm;
  const marks = stage.beats.map((beat) => {
    const at = cursor;
    cursor += beat.gap * gapKm;
    return { at: at * 100, beat };
  });
  return { marks, goal: stage.km };
}
