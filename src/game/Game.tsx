import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { SKINS, STAGES, type SkinId } from "./content";
import { ASSET_NAMES, VIEW, assetUrl, draw } from "./draw";
import { Sfx } from "./audio";
import { Sim, type Phase } from "./sim";

const CODES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyE"];

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  if (!simRef.current) simRef.current = new Sim();
  const simLive = simRef.current;
  const sfxRef = useRef<Sfx | null>(null);
  if (!sfxRef.current) sfxRef.current = new Sfx();
  const [hud, setHud] = useState(() => snapshot(simLive));
  const [picked, setPicked] = useState(() => simLive.save.unlocked);
  const [skin, setSkin] = useState<SkinId>(() => simLive.save.skin);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const sim = simRef.current!;
    const sfx = sfxRef.current!;
    sim.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sim.hydrate();
    setPicked(sim.save.unlocked);
    setSkin(sim.save.skin);
    setHud(snapshot(sim));
    const images: Record<string, HTMLImageElement | undefined> = {};
    for (const name of ASSET_NAMES) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = assetUrl(name);
      img.onload = () => {
        images[name] = img;
      };
      images[name] = img;
    }

    window.__controlsTest = {
      getYaw: () => sim.yaw,
      getSpeed: () => sim.speed,
      setSteer: (v) => {
        sim.steerOverride = v;
      },
      setKeys: (codes) => {
        sim.held.clear();
        for (const code of codes) sim.held.add(code);
      },
    };

    const down = (e: KeyboardEvent) => {
      if (CODES.includes(e.code)) e.preventDefault();
      sim.held.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      sim.held.delete(e.code);
    };
    const blur = () => sim.held.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      let steps = 0;
      const before = { lives: sim.lives, bonus: sim.bonus, speech: sim.speech };
      while (acc >= 1 / 60 && steps < 5) {
        sim.viewW = VIEW.w;
        sim.viewH = VIEW.h;
        sim.step(1 / 60);
        acc -= 1 / 60;
        steps += 1;
      }
      if (sim.lives < before.lives) sfx.crash();
      else if (sim.speech < before.speech - 0.2) sfx.speech();
      else if (sim.bonus > before.bonus) sfx.pickup();
      while (sim.cue.length) {
        const cue = sim.cue.shift();
        if (cue === "boss") sfx.boss(true);
        else if (cue === "eagle") sfx.eagle();
        else if (cue === "maga") sfx.maga();
        else if (cue === "fist") sfx.crash();
      }
      sfx.engine(sim.speed, sim.phase === "play");

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const bw = Math.round(VIEW.w * dpr);
        const bh = Math.round(VIEW.h * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          draw(ctx, sim, images);
        }
      }
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        setHud(snapshot(sim));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const sim = simLive;
  const phase = hud.phase;
  const stage = STAGES[picked] ?? STAGES[0];

  function launch(index: number) {
    sfxRef.current?.playLevel(sim.skinDef.track);
    sim.start(index);
    setPicked(index);
    setHud(snapshot(sim));
  }

  function pickSkin(id: SkinId) {
    sim.save.skin = id;
    sim.persist();
    setSkin(id);
  }

  function toMenu() {
    sfxRef.current?.stopLevel();
    sim.phase = "title";
    setHud(snapshot(sim));
  }

  return (
    <div className={phase === "play" ? "app is-play" : "app"}>
      <div className="stage">
        <canvas ref={canvasRef} aria-label="Бочколёт" />
        <button
          type="button"
          className="icon-btn mute"
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (sfxRef.current) sfxRef.current.muted = next;
            sfxRef.current?.unlock();
          }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {phase === "play" && (
          <div className="hud">
            <div className="hud-top">
              <div className="ticket">
                <div className="k">{hud.flight}</div>
                <div className="v">{hud.name}</div>
                <div className="s">
                  {hud.boss ? hud.bossLabel : `${hud.skin} · ${km(hud.meters)} / ${km(hud.goal)} км`}
                </div>
              </div>
              <div className="ticket">
                <div className="k">скорость</div>
                <div className="v">{Math.round(hud.speed * 0.42)} км/ч</div>
                <div className="s">{hud.points} очков{hud.combo > 1 ? ` · ×${hud.combo}` : ""}</div>
              </div>
            </div>
            {hud.hint > 0 && <div className="radio">Газ вверх. Вплотную копится серия. Речь сдувает и подбрасывает</div>}
            {hud.hint <= 0 && <div className="radio">{hud.radio}</div>}
            <div className="hud-bottom">
              <div className="ticket">
                <div className="k">бочка</div>
                <div className="pips">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={i < hud.lives ? "pip on" : "pip"} />
                  ))}
                </div>
              </div>
              <div className="ticket">
                <div className="k">речь</div>
                <div className={hud.speech >= 1 ? "meter ready" : "meter"}>
                  <span style={{ width: `${Math.round(hud.speech * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {phase !== "play" && (
          <div className="veil">
            <article className={phase === "title" ? "card card-wide" : "card"}>
              {phase === "title" && (
                <>
                  <div className="stamp">не сертифицирован</div>
                  <div className="kicker">борт номер бочка</div>
                  <h1>БОЧКОЛЁТ</h1>
                  <p className="sub">Дворовый лётный симулятор</p>
                  <p className="lede">
                    Борт собран во дворе: бочка, фанера и пропеллер от забора. Пять рейсов над бельём, голубями и
                    диванами. Речь сдувает всё, что не пристёгнуто, и чуть подбрасывает борт.
                  </p>
                  <div className="routes">
                    {STAGES.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={index === picked ? "chip on" : "chip"}
                        onClick={() => {
                          setPicked(index);
                          sim.stageIndex = index;
                          sim.ents = [];
                        }}
                      >
                        {item.name}
                        <small>{hud.bests[index] ? `${hud.bests[index]}` : item.flight}</small>
                      </button>
                    ))}
                  </div>
                  <p className="hangar-kicker">ангар</p>
                  <div className="hangar">
                    {SKINS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-skin={item.id}
                        className={item.id === skin ? "craft on" : "craft"}
                        onClick={() => pickSkin(item.id)}
                      >
                        <span className="craft-sky">
                          <img src={`/game/${item.file}.png`} alt="" />
                        </span>
                        <span className="craft-name">{item.name}</span>
                        <span className="craft-line">{item.line}</span>
                        <span className="craft-tune">{item.tune}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="go" onClick={() => launch(picked)}>
                    Start
                  </button>
                  <p className="help">
                    {stage.flight} · {stage.name} · {stage.scenery.when}. W / ↑ газ и набор · S / ↓ вниз · A / ← влево · D / → вправо · пробел — речь
                  </p>
                </>
              )}

              {phase === "fail" && (
                <>
                  <div className="kicker">{hud.flight} · {hud.name}</div>
                  <h1>Закрутило</h1>
                  <p className="lede">{hud.reason}. Бочка цела условно, рейс — нет.</p>
                  <p className="help">Счёт {hud.points}. Лучший на рейсе {hud.best}.</p>
                  <div className="row">
                    <button type="button" className="go" onClick={() => launch(hud.stage)}>
                      <span>ещё заход</span>
                      Start
                    </button>
                    <button type="button" className="ghost" onClick={toMenu}>
                      К борту
                    </button>
                  </div>
                </>
              )}

              {phase === "clear" && (
                <>
                  <div className="kicker">{hud.flight} сдан</div>
                  <h1>{hud.name}</h1>
                  <p className="lede">{hud.clearText}</p>
                  <p className="help">Счёт {hud.points}. Лучший {hud.best}.</p>
                  <div className="row">
                    <button
                      type="button"
                      className="go"
                      onClick={() => launch(Math.min(STAGES.length - 1, hud.stage + 1))}
                    >
                      <span>следующий рейс</span>
                      Дальше
                    </button>
                    <button type="button" className="ghost" onClick={toMenu}>
                      Маршрут
                    </button>
                  </div>
                </>
              )}

              {phase === "treaty" && (
                <>
                  <div className="stamp">подписано</div>
                  <div className="kicker">финал</div>
                  <h1>Мирный договор</h1>
                  <p className="lede">
                    Кулак пришёл сверху. Бочка ушла вниз, за край карты. На бумажке мирный договор, и палец вверх.
                  </p>
                  <div className="row">
                    <button type="button" className="ghost" onClick={toMenu}>
                      К борту
                    </button>
                  </div>
                </>
              )}

              {phase === "done" && (
                <>
                  <div className="stamp">долетел</div>
                  <div className="kicker">все пять рейсов</div>
                  <h1>Бочка цела</h1>
                  <p className="lede">
                    Пропеллер на месте, бочка тоже. Можно пройти маршрут снова и побить свои метры.
                  </p>
                  <p className="help">Финал {hud.points}. Лучший на саммите {hud.best}.</p>
                  <div className="row">
                    <button type="button" className="go" onClick={() => launch(0)}>
                      <span>с грядки</span>
                      Start
                    </button>
                    <button type="button" className="ghost" onClick={toMenu}>
                      Маршрут
                    </button>
                  </div>
                </>
              )}
            </article>
          </div>
        )}
      </div>

      <div className="pad">
        <div className="pad-move">
          <Hold code="ArrowUp" label="↑" className="up" sim={sim} />
          <Hold code="ArrowLeft" label="←" sim={sim} />
          <Hold code="ArrowRight" label="→" sim={sim} />
          <Hold code="ArrowDown" label="↓" className="down" sim={sim} />
        </div>
        <Hold code="Space" label="РЕЧЬ" className="speech-btn" sim={sim} />
      </div>
    </div>
  );
}

function Hold({
  code,
  label,
  className,
  sim,
}: {
  code: string;
  label: string;
  className?: string;
  sim: Sim;
}) {
  const press = (down: boolean) => {
    if (down) sim.held.add(code);
    else sim.held.delete(code);
  };
  return (
    <button
      type="button"
      className={className}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(true);
      }}
      onPointerUp={() => press(false)}
      onPointerCancel={() => press(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function km(meters: number) {
  return (meters / 100).toFixed(meters >= 10000 ? 0 : 1);
}

function snapshot(sim: Sim) {
  const stage = sim.stage;
  return {
    phase: sim.phase as Phase,
    stage: sim.stageIndex,
    meters: sim.meters,
    goal: sim.goal,
    points: sim.points,
    lives: sim.lives,
    speech: sim.speech,
    speed: sim.speed,
    radio: sim.radioLine,
    hint: sim.hint,
    reason: sim.reason,
    name: stage.name,
    flight: stage.flight,
    clearText: stage.clear,
    best: sim.save.best[sim.stageIndex] ?? 0,
    bests: sim.save.best.slice(),
    unlocked: sim.save.unlocked,
    skin: sim.skinDef.name,
    combo: sim.combo,
    boss: sim.bossPhase !== "off" && sim.bossPhase !== "fly",
    bossLabel: sim.bossLabel || sim.stage.name,
  };
}
