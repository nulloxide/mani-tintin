import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createWorld } from "./world";
import { Input } from "./input";
import { RadioAudio } from "./audio";
import { Mission, SAMPLE_SITES, CAVE, formatTime } from "./mission";
import type { Mode } from "./mission";
import { portrait } from "./portraits";
import type { Speaker } from "./portraits";
import {
  Challenges,
  CHALLENGE_NAMES,
  MOON_HOOPS,
  RALLY_GATES,
} from "./challenges";
import type { ChallengeKind } from "./challenges";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const bestKey = "mani-moon-best-v1";

export async function startGame() {
  const canvas = $<HTMLCanvasElement>("moon-scene");
  const world = await createWorld(canvas);
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("profile")
  ) {
    const { diagnostics } = await import("./diagnostics");
    diagnostics(world.scene);
  }
  const { engine, scene, camera, player, rocket, captain, snowy, rover } =
    world;
  const audio = new RadioAudio();
  let mission = new Mission("explorer");
  let challenges = new Challenges();
  let walked = 0;
  let trainingState = -1;
  let fetchPhase: "ready" | "out" | "back" = "ready";
  let fetchTime = 0;
  const fetchTarget = Vector3.Zero(),
    fetchStart = Vector3.Zero(),
    cameraTarget = Vector3.Zero();
  let lastFrame = performance.now();
  let playing = false,
    paused = false,
    inRover = false,
    lowGraphics = false;
  let time = 0,
    chapterTime = 0,
    orbitAngle = 0,
    rescueWait = 0,
    actionCooldown = 0;
  let jumpHeight = 0,
    verticalSpeed = 0,
    stride = 0,
    lastPrint = 0,
    printSide = 1;
  let toastTime = 0,
    radioTime = 0,
    hudTime = 0,
    meteorTime = -1,
    nextMeteor = 20,
    lowWarned = false;
  let caveVisited = false,
    roverUsed = false,
    idleTime = 0,
    idleJoke = 0;
  let best = { explorer: 0, expedition: 0 };
  let activeModal: HTMLElement | null = null;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const input = new Input(() => {
    if (activeModal === $("launch-panel")) closeLaunch();
    else if (activeModal === $("games-panel")) modal(null);
    else if (playing && mission.chapter !== "complete") setPaused(!paused);
  });
  try {
    const saved = JSON.parse(localStorage.getItem(bestKey) || "{}");
    for (const mode of ["explorer", "expedition"] as const)
      if (Number.isFinite(saved[mode])) best[mode] = saved[mode];
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  function showBest() {
    const mode = (document.querySelector<HTMLInputElement>(
      "input[name=mode]:checked",
    )?.value || "explorer") as Mode;
    $("personal-best").textContent = best[mode]
      ? `Mani’s best ${mode} mission: ${best[mode].toLocaleString()} points`
      : "";
  }
  showBest();
  document
    .querySelectorAll("input[name=mode]")
    .forEach((input) => input.addEventListener("change", showBest));
  function say(who: Speaker, text: string, duration = 10) {
    $("speaker").textContent = `${who.toUpperCase()} · RADIO TO MANI`;
    $("radio-line").textContent = text;
    $("portrait").innerHTML = portrait(who);
    $("radio").hidden = false;
    radioTime = duration;
    audio.play("radio");
  }
  function toast(text: string, duration = 2.5) {
    $("toast").textContent = text;
    $("toast").hidden = false;
    toastTime = duration;
  }
  function focusGame() {
    canvas.focus({ preventScroll: true });
    input.clear();
  }
  function modal(panel: HTMLElement | null) {
    for (const id of [
      "pause-panel",
      "launch-panel",
      "win-panel",
      "games-panel",
    ])
      $(id).hidden = $(id) !== panel;
    activeModal = panel;
    canvas.inert = !!panel;
    $("hud").inert = !!panel;
    document.querySelector<HTMLElement>(".topbar")!.inert = !!panel;
    input.clear();
    if (panel)
      panel
        .querySelector<HTMLElement>("[role=dialog]")!
        .focus({ preventScroll: true });
    else focusGame();
    requestFrame();
  }
  document.addEventListener("keydown", (e) => {
    if (!activeModal || e.key !== "Tab") return;
    const targets = [
      ...activeModal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [tabindex="0"]',
      ),
    ];
    const first = targets[0],
      last = targets.at(-1)!;
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement?.getAttribute("role") === "dialog")
    ) {
      e.preventDefault();
      last.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last ||
        document.activeElement?.getAttribute("role") === "dialog")
    ) {
      e.preventDefault();
      first.focus();
    }
  });
  function setPaused(value: boolean) {
    if (
      !playing ||
      mission.chapter === "complete" ||
      mission.chapter === "launch"
    )
      return;
    paused = value;
    modal(value ? $("pause-panel") : null);
    if (value) audio.suspend();
    else audio.unlock();
  }
  $("pause").onclick = () => setPaused(true);
  $("resume").onclick = () => setPaused(false);
  $("sound").onclick = () => {
    const enabled = audio.toggle();
    $("sound").setAttribute("aria-pressed", String(enabled));
    $("sound").innerHTML = `♪ <span>Sound ${enabled ? "on" : "off"}</span>`;
  };
  function graphics(low: boolean) {
    lowGraphics = low;
    world.lowQuality(low);
    $("quality").setAttribute("aria-pressed", String(low));
    $("quality").innerHTML =
      `◈ <span>Graphics: ${low ? "light" : "high"}</span>`;
    requestFrame();
  }
  $("quality").onclick = () => graphics(!lowGraphics);
  function updateTouch() {
    const touch = matchMedia("(pointer: coarse)").matches || innerWidth < 900;
    document.body.classList.toggle("touch", touch);
    $("touch-controls").hidden =
      !touch || !playing || mission.chapter !== "explore";
  }
  addEventListener("resize", () => {
    world.resize();
    updateTouch();
    requestFrame();
  });
  updateTouch();
  function start() {
    mission = new Mission(
      document.querySelector<HTMLInputElement>("input[name=mode]:checked")!
        .value as Mode,
    );
    playing = true;
    paused = false;
    inRover = false;
    challenges = new Challenges();
    walked = 0;
    trainingState = -1;
    fetchPhase = "ready";
    world.resetEffects();
    updateChallengeScene();
    chapterTime = 0;
    orbitAngle = 0;
    rescueWait = 0;
    jumpHeight = 0;
    verticalSpeed = 0;
    actionCooldown = 0;
    meteorTime = -1;
    nextMeteor = 20;
    caveVisited = false;
    roverUsed = false;
    lowWarned = false;
    idleTime = 0;
    idleJoke = 0;
    world.samples.forEach((s) => s.root.setEnabled(true));
    snowy.root.position.set(CAVE.x, world.height(CAVE.x, CAVE.z), CAVE.z);
    snowy.root.setEnabled(true);
    rover.root.position.set(7, world.height(7, -4), -4);
    rover.root.rotation.y = -0.7;
    rover.root.setEnabled(true);
    world.warning.setEnabled(false);
    world.meteor.setEnabled(false);
    $("jump").innerHTML = "↑<small>JUMP</small>";
    $("cover").hidden = true;
    $("shade").hidden = true;
    $("cover-stamp").hidden = true;
    $("hud").hidden = false;
    $("pause").hidden = false;
    $("toast").hidden = true;
    document.body.classList.add("flying");
    $("orbit-meter").hidden = false;
    $("games").hidden = true;
    $("training").hidden = true;
    $("challenge-status").hidden = true;
    $("skip-intro").hidden = false;
    world.adonis.setEnabled(true);
    captain.root.setEnabled(true);
    player.root.setEnabled(false);
    rocket.root.position.set(-9, 151, 0);
    rocket.flame.setEnabled(false);
    camera.alpha = -Math.PI / 2;
    camera.beta = 1.4;
    camera.radius = innerWidth < 600 ? 31 : 24;
    camera.target.set(-2, 155, 0);
    world.tether.setEnabled(true);
    $("chapter-label").textContent = "01 / AN UNLIKELY SATELLITE";
    $("objective-title").textContent = "Haddock has gone into orbit!";
    $("objective-hint").textContent =
      "Near asteroid Adonis, the Captain took a space walk. Pull 3 times when the meter is green.";
    modal(null);
    audio.unlock();
    say(
      "Haddock",
      "Mani! I asked for a little space, not my very own orbit! Get me back to the rocket!",
    );
    updateTouch();
    updateHud();
  }
  $("start").onclick = start;
  $("restart").onclick = start;
  $("replay").onclick = () => {
    challenges.cancel();
    updateChallengeScene();
    world.resetEffects();
    playing = false;
    paused = false;
    modal(null);
    $("hud").hidden = true;
    $("pause").hidden = true;
    $("cover").hidden = false;
    $("shade").hidden = false;
    $("cover-stamp").hidden = false;
    document.body.classList.remove("flying");
    world.adonis.setEnabled(false);
    world.tether.setEnabled(false);
    captain.root.setEnabled(false);
    rocket.root.position.set(0, 0, 0);
    rocket.flame.setEnabled(false);
    player.root.setEnabled(true);
    player.root.position.set(3, 0, -3);
    player.root.rotation.y = -0.4;
    camera.alpha = -1.03;
    camera.beta = 1.33;
    camera.radius = innerWidth < 600 ? 30 : 33;
    camera.target.set(innerWidth < 600 ? -1.7 : -6, 5.5, 0);
    showBest();
    $("start").focus();
    updateTouch();
  };
  function land() {
    input.clear();
    mission.chapter = "landing";
    chapterTime = 0;
    world.adonis.setEnabled(false);
    world.tether.setEnabled(false);
    captain.root.setEnabled(false);
    rocket.root.position.set(0, 18, 0);
    rocket.flame.setEnabled(true);
    camera.alpha = -1.05;
    camera.beta = 1.08;
    camera.radius = innerWidth < 600 ? 32 : 29;
    camera.target.set(0, 8, 0);
    $("orbit-meter").hidden = true;
    $("skip-intro").hidden = true;
    $("chapter-label").textContent = "02 / EXPLORERS ON THE MOON";
    $("objective-title").textContent = "Destination: the Moon";
    $("objective-hint").textContent =
      "Landing in the lunar plain. Next: take your first steps.";
    say(
      "Calculus",
      "Splendid rescue, Mani! Now for a soft landing. Did somebody say “sandwich”? Oh. “Landing”.",
    );
    audio.play("engine");
  }
  $("skip-intro").onclick = () => {
    if (mission.chapter !== "orbit" || paused) return;
    mission.tether = 3;
    land();
    focusGame();
  };
  function explore() {
    input.clear();
    mission.chapter = "explore";
    chapterTime = 0;
    rocket.root.position.y = 0;
    rocket.flame.setEnabled(false);
    player.root.setEnabled(true);
    player.root.position.set(3, 0, -3);
    player.root.rotation.y = Math.PI;
    captain.root.setEnabled(true);
    captain.root.position.set(-3, 0, 1);
    captain.root.rotation.set(0, 0.5, 0);
    captain.arms.forEach((a) => a.rotation.set(0, 0, 0));
    captain.legs.forEach((a) => a.rotation.set(0, 0, 0));
    camera.alpha = -Math.PI / 2;
    camera.beta = 1.3;
    camera.radius = innerWidth < 600 ? 14 : 12;
    camera.target
      .copyFrom(player.root.position)
      .addInPlace(new Vector3(0, 1.2, 0));
    document.body.classList.remove("flying");
    updateTouch();
    say(
      "Tintin",
      "Your Moon, your adventure, Mani! First, walk a few steps and try a big Moon jump. I’ll show you the way. There are games to discover, too!",
      13,
    );
    toast("MANI, WELCOME TO THE MOON!");
    updateObjective();
  }
  function updateObjective() {
    if (mission.chapter !== "explore") return;
    $("games").hidden = false;
    const trained =
      Number(walked > 3) +
      Number(mission.jumps > 0) * 2 +
      Number(mission.samples.size > 0) * 4;
    $("training").hidden = trained === 7 || !!challenges.active || inRover;
    if (trainingState !== trained) {
      trainingState = trained;
      $("training").innerHTML =
        `<span class="${walked > 3 ? "done" : ""}">1 · Move</span><span class="${mission.jumps ? "done" : ""}">2 · Moon jump</span><span class="${mission.samples.size ? "done" : ""}">3 · First sample</span>`;
    }
    if (challenges.active) {
      $("chapter-label").textContent = "MANI’S MOON GAMES";
      $("objective-title").textContent = CHALLENGE_NAMES[challenges.active];
      $("objective-hint").textContent =
        challenges.active === "rally"
          ? "Follow the compass through each gate in the rover. The timer starts at START."
          : challenges.active === "hoops"
            ? "Follow the compass. Jump through three hoops on foot. Take your time!"
            : "Press E or the gold button to throw. Wait for Snowy to bring back each biscuit.";
      return;
    }
    const completeSamples = mission.samples.size === SAMPLE_SITES.length;
    $("chapter-label").textContent = mission.readyToLaunch
      ? "04 / THE FLIGHT HOME"
      : completeSamples || caveVisited
        ? "03 / THE LUNAR DISCOVERY"
        : "02 / EXPLORERS ON THE MOON";
    $("objective-title").textContent = mission.readyToLaunch
      ? "Bring the crew home"
      : completeSamples
        ? "Find Snowy at the ice cave"
        : "Explore the Moon, Mani";
    $("objective-hint").textContent = mission.readyToLaunch
      ? "Return to the red rocket marker and prepare for launch."
      : inRover
        ? "You’re driving the Mani Express! Try ★ Moon games for a rally, or press E / the gold button to hop out."
        : walked < 3
          ? "Your first steps! Use WASD / arrows or the thumb stick to move Tintin."
          : mission.jumps === 0
            ? "Try a Moon jump: press Space or the ↑ button. You can jump over small rocks!"
            : mission.samples.size === 0
              ? "Follow the compass to the first gold marker. Press E or the gold button when you reach it."
              : "Collect 5 samples and find Snowy. Try ★ Moon games whenever you fancy a challenge!";
  }
  type Interaction =
    | { type: "sample"; index: number; text: string }
    | {
        type: "snowy" | "board" | "exit" | "launch" | "fetch" | "none";
        text: string;
      };
  function updateChallengeScene() {
    world.rally.forEach((gate, i) => {
      gate.root.setEnabled(
        challenges.active === "rally" && i >= challenges.progress,
      );
      gate.hoop.scaling.setAll(i === challenges.progress ? 1.08 : 1);
    });
    world.hoops.forEach((gate, i) =>
      gate.root.setEnabled(
        challenges.active === "hoops" && i >= challenges.progress,
      ),
    );
    if (challenges.active !== "fetch") world.biscuit.setEnabled(false);
  }
  $("games").onclick = () => {
    if (mission.chapter !== "explore" || paused) return;
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      "[data-game]",
    )) {
      const kind = button.dataset.game as ChallengeKind;
      button.disabled = kind === "fetch" && !mission.snowy;
      button.querySelector(".medal")!.textContent = challenges.medals.has(kind)
        ? "★ Badge earned · play again"
        : kind === "fetch" && !mission.snowy
          ? "Rescue Snowy to unlock"
          : "Play this game →";
    }
    $("cancel-game").hidden = !challenges.active;
    modal($("games-panel"));
  };
  $("close-games").onclick = () => modal(null);
  $("cancel-game").onclick = () => {
    challenges.cancel();
    fetchPhase = "ready";
    updateChallengeScene();
    modal(null);
    updateHud();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(
    (button) =>
      (button.onclick = () => {
        const kind = button.dataset.game as ChallengeKind;
        if (!challenges.start(kind, mission.snowy)) return;
        fetchPhase = "ready";
        world.biscuit.setEnabled(false);
        updateChallengeScene();
        modal(null);
        say(
          kind === "fetch" ? "Snowy" : "Haddock",
          kind === "rally"
            ? "Mani, I challenge you to a rally! Board the rover, drive through START, then follow five gates in 60 seconds. My record? Classified."
            : kind === "hoops"
              ? "Three hoops. One giant leap at a time. Jump through them, Mani! I shall supervise from a very sensible distance."
              : "Woof! (Finally! A proper mission: biscuits. Throw one, Mani — I’ll bring it back. Probably.)",
          12,
        );
        updateHud();
      }),
  );
  function challengeProgress(kind: ChallengeKind) {
    audio.play("collect");
    world.burst(player.root.position);
    updateChallengeScene();
    if (!challenges.active) {
      mission.bonusPoints = challenges.medals.size * 250;
      toast(`★ ${CHALLENGE_NAMES[kind].toUpperCase()}!`, 5);
      say(
        kind === "fetch" ? "Snowy" : "Haddock",
        kind === "rally"
          ? `${challenges.elapsed.toFixed(1)} seconds! Mani, you drive like a comet! A polite comet. With excellent parking.`
          : kind === "hoops"
            ? "Three perfect Moon hops! Mani, the Olympics called. They would like their gravity back."
            : "Woof woof! (Mani, you are officially my favourite human on this entire Moon.)",
        10,
      );
    } else
      toast(
        kind === "rally" && challenges.progress === 1
          ? "GO, MANI! 60 SECONDS!"
          : "BRILLIANT, MANI! KEEP GOING!",
        1.7,
      );
  }
  function playChallenge(delta: number) {
    const kind = challenges.active;
    if (!kind) return;
    if (challenges.tick(delta)) {
      updateChallengeScene();
      toast("TIME’S UP! TRY THE RALLY AGAIN IN ★ MOON GAMES", 5);
      say(
        "Haddock",
        "A splendid practice lap, Mani! All discoveries are safe. Shall we try another?",
        7,
      );
      return;
    }
    if (kind === "rally" || kind === "hoops") {
      const target = (kind === "rally" ? RALLY_GATES : MOON_HOOPS)[
        challenges.progress
      ];
      if (
        distance(player.root.position, target) <
          (kind === "rally" ? 2.8 : 1.5) &&
        challenges.advance(challenges.progress, inRover, jumpHeight)
      )
        challengeProgress(kind);
    } else if (fetchPhase !== "ready") {
      fetchTime += delta;
      if (fetchPhase === "out") {
        const t = Math.min(1, fetchTime / 1.1);
        Vector3.LerpToRef(fetchStart, fetchTarget, t, world.biscuit.position);
        world.biscuit.position.y += Math.sin(t * Math.PI) * 2.6;
        world.biscuit.rotation.z += delta * 5;
        if (t === 1 && distance(snowy.root.position, fetchTarget) < 0.9) {
          fetchPhase = "back";
          audio.play("bark");
        }
      } else {
        world.biscuit.position.copyFrom(snowy.root.position);
        world.biscuit.position.y += 0.85;
        world.biscuit.position.x -= Math.sin(snowy.root.rotation.y) * 0.85;
        world.biscuit.position.z -= Math.cos(snowy.root.rotation.y) * 0.85;
        if (distance(player.root.position, snowy.root.position) < 2.7) {
          fetchPhase = "ready";
          world.biscuit.setEnabled(false);
          if (challenges.advance(challenges.progress, false, 0))
            challengeProgress(kind);
        }
      }
    }
  }
  function nearby(): Interaction {
    const p = player.root.position;
    if (mission.readyToLaunch && distance(p, { x: 0, z: 0 }) < 5.5)
      return { type: "launch", text: "Prepare for launch" };
    for (const [index, site] of SAMPLE_SITES.entries())
      if (
        !mission.samples.has(index) &&
        distance(p, site) < 2.7 &&
        jumpHeight < 2
      )
        return {
          type: "sample",
          index,
          text: `Collect ${site.kind.toLowerCase()}`,
        };
    if (!mission.snowy && distance(p, CAVE) < 3.7)
      return { type: "snowy", text: "Rescue Snowy" };
    if (challenges.active === "fetch" && !inRover && fetchPhase === "ready")
      return { type: "fetch", text: "Throw Snowy a Moon biscuit" };
    if (inRover) return { type: "exit", text: "Leave the rover" };
    if (distance(p, rover.root.position) < 3.2 && jumpHeight < 0.3)
      return { type: "board", text: "Drive Mani Express" };
    return {
      type: "none",
      text:
        challenges.active === "hoops"
          ? "Follow the hoop compass"
          : challenges.active === "rally"
            ? "Find the rover to race"
            : challenges.active === "fetch"
              ? "Here comes Snowy!"
              : mission.readyToLaunch
                ? "Follow the compass to base"
                : "Follow the gold markers",
    };
  }
  function doAction() {
    if (!playing || paused || activeModal || actionCooldown > 0) return;
    audio.unlock();
    if (mission.chapter === "orbit" && mission.tether < 3) {
      actionCooldown = 0.45;
      const meter = 0.5 - 0.5 * Math.cos(orbitAngle);
      if (meter >= 0.6 && meter <= 0.95) {
        mission.tether++;
        audio.play("collect");
        toast(
          mission.tether === 3 ? "CAPTAIN SAFELY ABOARD!" : "GOOD PULL, MANI!",
          1.4,
        );
        if (mission.tether === 3) {
          rescueWait = 1.8;
          say(
            "Haddock",
            "Thank you, Mani! I have decided to retire from being a satellite. Terrible working conditions.",
          );
        }
      } else {
        audio.play("wrong");
        say(
          "Tintin",
          "Almost! Wait for the moving marker to enter the green zone, then pull. We’ve got this, Mani.",
          5,
        );
      }
      updateHud();
      return;
    }
    if (mission.chapter !== "explore") return;
    const interaction = nearby();
    actionCooldown = 0.35;
    if (interaction.type === "sample" && mission.collect(interaction.index)) {
      world.samples[interaction.index].root.setEnabled(false);
      world.burst(player.root.position.add(new Vector3(0, 1, 0)));
      toast(`${SAMPLE_SITES[interaction.index].kind.toUpperCase()} FOUND!`);
      audio.play("collect");
      say("Calculus", SAMPLE_SITES[interaction.index].note, 8);
    } else if (interaction.type === "snowy" && mission.rescueSnowy()) {
      toast("SNOWY JOINS TEAM MANI!");
      audio.play("bark");
      say(
        "Snowy",
        "Woof! (Translation: Mani, I found ice. Still no bones. This Moon has a very disappointing menu.)",
        10,
      );
    } else if (interaction.type === "fetch") {
      fetchStart.copyFrom(player.root.position);
      fetchStart.y += 1.2;
      for (const offset of [0, 0.8, -0.8, Math.PI]) {
        const angle = player.root.rotation.y + offset;
        const x = player.root.position.x - Math.sin(angle) * 7,
          z = player.root.position.z - Math.cos(angle) * 7;
        if (
          Math.hypot(x, z) < 62 &&
          !world.obstacles.some(
            (o) => Math.hypot(x - o.x, z - o.z) < o.radius + 1,
          )
        ) {
          fetchTarget.set(x, world.height(x, z) + 0.2, z);
          break;
        }
        fetchTarget.set(
          player.root.position.x,
          player.root.position.y + 0.2,
          player.root.position.z,
        );
      }
      fetchTime = 0;
      fetchPhase = "out";
      world.biscuit.setEnabled(true);
      world.biscuit.position.copyFrom(fetchStart);
      audio.play("jump");
      toast("FETCH, SNOWY!", 1.5);
    } else if (interaction.type === "board") {
      inRover = true;
      jumpHeight = 0;
      verticalSpeed = 0;
      camera.radius = 15;
      $("jump").innerHTML = "♪<small>HORN</small>";
      if (!roverUsed)
        say(
          "Haddock",
          "All aboard the Mani Express! No tickets, no traffic — and absolutely no back-seat captains. Except me.",
        );
      roverUsed = true;
      toast("MANI EXPRESS · READY TO ROLL", 2);
    } else if (interaction.type === "exit") {
      inRover = false;
      for (const angle of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
        const x =
          rover.root.position.x + Math.cos(rover.root.rotation.y + angle) * 2.4;
        const z =
          rover.root.position.z - Math.sin(rover.root.rotation.y + angle) * 2.4;
        if (
          Math.hypot(x, z) < 64 &&
          !world.obstacles.some(
            (o) => Math.hypot(x - o.x, z - o.z) < o.radius + 0.5,
          )
        ) {
          player.root.position.x = x;
          player.root.position.z = z;
          break;
        }
      }
      player.root.position.y = world.height(
        player.root.position.x,
        player.root.position.z,
      );
      camera.radius = 12;
      $("jump").innerHTML = "↑<small>JUMP</small>";
    } else if (interaction.type === "launch" && mission.beginLaunch()) {
      $("launch-feedback").textContent =
        "“Mani, press carefully. That other button makes tea.” — Calculus";
      document
        .querySelectorAll(".launch-sequence span")
        .forEach((s) => s.classList.remove("done"));
      modal($("launch-panel"));
    }
    if (
      mission.readyToLaunch &&
      ["sample", "snowy"].includes(interaction.type)
    ) {
      toast("ALL ABOARD! RETURN TO THE ROCKET", 4);
    }
    updateObjective();
    updateHud();
  }
  $("action").onclick = () => {
    doAction();
    if (!activeModal) canvas.focus({ preventScroll: true });
  };
  function closeLaunch() {
    if (mission.chapter !== "launch") return;
    mission.chapter = "explore";
    mission.launchStep = 0;
    modal(null);
  }
  $("leave-launch").onclick = closeLaunch;
  document.querySelectorAll<HTMLButtonElement>("[data-symbol]").forEach(
    (button) =>
      (button.onclick = () => {
        const result = mission.pressLaunch(button.dataset.symbol!);
        document
          .querySelectorAll(".launch-sequence span")
          .forEach((s, i) =>
            s.classList.toggle("done", i < mission.launchStep),
          );
        if (result === "retry") {
          audio.play("wrong");
          $("launch-feedback").textContent =
            "“That was the kettle, Mani. Lovely tea! Let’s try STAR, MOON, EARTH.” — Calculus";
        }
        if (result === "correct") {
          audio.play("collect");
          $("launch-feedback").textContent =
            `${mission.launchStep} / 3 circuits restored. Keep going, Commander!`;
        }
        if (result === "complete") {
          modal(null);
          chapterTime = 0;
          player.root.setEnabled(false);
          snowy.root.setEnabled(false);
          captain.root.setEnabled(false);
          rocket.flame.setEnabled(true);
          document.body.classList.add("flying");
          updateTouch();
          camera.alpha = -1.05;
          camera.beta = 1.13;
          camera.radius = 32;
          camera.target.set(0, 7, 0);
          $("chapter-label").textContent = "04 / THE FLIGHT HOME";
          $("objective-title").textContent = "Next stop: Earth!";
          $("objective-hint").textContent =
            "The entire crew is aboard. Excellent work, Commander Mani.";
          audio.play("engine");
          say(
            "Thomson & Thompson",
            "We knew Mani could do it! To be precise: we knew Mani could do it. Now… which way is down?",
          );
        }
      }),
  );
  function finish() {
    mission.chapter = "complete";
    const score = mission.score;
    const record = score > best[mission.mode];
    best[mission.mode] = Math.max(best[mission.mode], score);
    try {
      localStorage.setItem(bestKey, JSON.stringify(best));
    } catch {
      /* Completion does not depend on storage. */
    }
    $("stars").textContent =
      "★".repeat(mission.stars) + "☆".repeat(3 - mission.stars);
    $("stars").setAttribute("aria-label", `${mission.stars} out of 3 stars`);
    $("final-score").textContent = score.toLocaleString();
    $("final-time").textContent = formatTime(mission.elapsed);
    $("final-medals").textContent = challenges.medals.size
      ? `MANI’S BADGES · ${[...challenges.medals].map((k) => CHALLENGE_NAMES[k]).join(" · ")}`
      : "Next adventure: try the rover rally, Moon hoops, and Snowy’s biscuit game!";
    $("award").textContent =
      mission.stars === 3
        ? "MASTER EXPLORER · Great discoveries, and everyone home safe."
        : "LUNAR EXPLORER · All five samples. One very happy dog.";
    $("win-best").textContent = record
      ? `A new personal best for Mani in ${mission.mode} mode!`
      : `Mani’s best ${mission.mode} score: ${best[mission.mode].toLocaleString()}`;
    audio.play("win");
    modal($("win-panel"));
  }
  function move(delta: number) {
    const axes = input.axes,
      magnitude = Math.hypot(axes.x, axes.y);
    const speed = inRover
      ? 10
      : input.keys.has("ShiftLeft") || input.keys.has("ShiftRight")
        ? 7.2
        : 4.8;
    const dx =
      (-Math.cos(camera.alpha) * axes.y - Math.sin(camera.alpha) * axes.x) *
      speed *
      delta;
    const dz =
      (-Math.sin(camera.alpha) * axes.y + Math.cos(camera.alpha) * axes.x) *
      speed *
      delta;
    const root = inRover ? rover.root : player.root;
    const radius = inRover ? 1.4 : 0.4;
    const valid = (x: number, z: number) =>
      Math.hypot(x, z) < 65 &&
      (jumpHeight > 1.5 ||
        !world.obstacles.some(
          (o) => Math.hypot(x - o.x, z - o.z) < o.radius + radius,
        ));
    if (valid(root.position.x + dx, root.position.z)) root.position.x += dx;
    if (valid(root.position.x, root.position.z + dz)) root.position.z += dz;
    if (magnitude > 0.1) {
      walked += Math.hypot(dx, dz);
      const target = Math.atan2(-dx, -dz);
      const difference = Math.atan2(
        Math.sin(target - root.rotation.y),
        Math.cos(target - root.rotation.y),
      );
      root.rotation.y += difference * Math.min(1, delta * 12);
      stride += delta * (inRover ? 12 : 9);
      idleTime = 0;
    } else idleTime += delta;
    if (input.jump) {
      if (inRover) {
        audio.play("bark");
        if (actionCooldown <= 0) {
          toast("BEEP! MANI EXPRESS!", 1.5);
          actionCooldown = 1;
        }
      } else if (jumpHeight < 0.05) {
        verticalSpeed = 5.6;
        mission.jumps++;
        audio.play("jump");
        world.burst(player.root.position, 6);
      }
      input.jump = false;
    }
    verticalSpeed -= 4.4 * delta;
    jumpHeight = Math.max(0, jumpHeight + verticalSpeed * delta);
    if (jumpHeight === 0) {
      verticalSpeed = 0;
      if (!inRover)
        for (const obstacle of world.obstacles) {
          const separation = distance(player.root.position, obstacle);
          const clearance = obstacle.radius + 0.45;
          if (separation < clearance) {
            const angle = Math.atan2(
              player.root.position.z - obstacle.z,
              player.root.position.x - obstacle.x,
            );
            player.root.position.x = obstacle.x + Math.cos(angle) * clearance;
            player.root.position.z = obstacle.z + Math.sin(angle) * clearance;
          }
        }
    }
    if (inRover) {
      rover.root.position.y =
        world.height(rover.root.position.x, rover.root.position.z) + 0.1;
      player.root.position
        .copyFrom(rover.root.position)
        .addInPlace(new Vector3(0, 0.63, 0));
      player.root.rotation.y = rover.root.rotation.y;
      player.legs.forEach((a) => (a.rotation.x = -1.3));
      player.arms.forEach((a) => (a.rotation.x = -1));
      rover.wheels.forEach((w) => (w.rotation.y += magnitude * delta * 8));
    } else {
      player.root.position.y =
        world.height(player.root.position.x, player.root.position.z) +
        jumpHeight +
        (reducedMotion ? 0 : Math.abs(Math.sin(stride)) * 0.045 * magnitude);
      player.legs.forEach(
        (a, i) =>
          (a.rotation.x =
            jumpHeight > 0.2
              ? -0.45
              : Math.sin(stride + i * Math.PI) * 0.65 * magnitude),
      );
      player.arms.forEach(
        (a, i) =>
          (a.rotation.x =
            jumpHeight > 0.2
              ? -1.1
              : -Math.sin(stride + i * Math.PI) * 0.55 * magnitude),
      );
      if (magnitude > 0.2 && jumpHeight < 0.1 && time - lastPrint > 0.26) {
        world.footprint(
          player.root.position,
          player.root.rotation.y,
          printSide,
        );
        printSide *= -1;
        lastPrint = time;
      }
    }
    if (mission.snowy) {
      const p =
          challenges.active === "fetch" && fetchPhase === "out"
            ? fetchTarget
            : player.root.position,
        s = snowy.root.position;
      const d = distance(p, s);
      const stop =
        challenges.active === "fetch" && fetchPhase === "out" ? 0.4 : 2.3;
      if (d > stop) {
        const amount = Math.min(d - stop, delta * (inRover ? 12 : 7));
        const vx = (p.x - s.x) / d,
          vz = (p.z - s.z) / d;
        s.x += vx * amount;
        s.z += vz * amount;
        snowy.root.rotation.y = Math.atan2(-vx, -vz);
      }
      s.y =
        world.height(s.x, s.z) +
        (d > 2.5 ? Math.abs(Math.sin(time * 10)) * 0.16 : 0);
      snowy.tail.rotation.z = Math.sin(time * 12) * 0.5;
    }
    cameraTarget.copyFrom(player.root.position);
    cameraTarget.y += 1.2;
    Vector3.LerpToRef(
      camera.target,
      cameraTarget,
      1 - Math.exp(-delta * 7),
      camera.target,
    );
    if (!caveVisited && distance(player.root.position, CAVE) < 12) {
      caveVisited = true;
      toast("THE ICE CAVE");
      say(
        "Tintin",
        "I can hear Snowy! The cave is just ahead. Carefully, Mani — our little explorer has found something extraordinary.",
      );
      updateObjective();
    }
    if (idleTime > 24 && radioTime <= 0) {
      const jokes: [Speaker, string][] = [
        [
          "Haddock",
          "Mani, I have checked everywhere. No cafés, no bakeries, not even a vending machine. We must file a complaint.",
        ],
        [
          "Calculus",
          "Did you say “Moon rocks”, Mani? I thought you said “new socks”. I brought three pairs.",
        ],
        [
          "Thomson & Thompson",
          "We are investigating these footprints. To be precise… they appear to be our own.",
        ],
      ];
      say(...jokes[idleJoke++ % jokes.length]);
      idleTime = 0;
    }
  }
  function meteor(delta: number) {
    if (mission.mode !== "expedition") return;
    if (
      meteorTime < 0 &&
      mission.elapsed > nextMeteor &&
      Math.hypot(player.root.position.x, player.root.position.z) > 9
    ) {
      meteorTime = 0;
      world.warning.position.set(
        player.root.position.x,
        world.height(player.root.position.x, player.root.position.z) + 0.12,
        player.root.position.z,
      );
      world.warning.setEnabled(true);
      world.meteor.setEnabled(true);
      toast("LOOK OUT! IMPACT ZONE!", 1.8);
    }
    if (meteorTime < 0) return;
    meteorTime += delta;
    world.warning.scaling.setAll(1 + Math.sin(time * 12) * 0.08);
    world.meteor.position.copyFrom(world.warning.position);
    world.meteor.position.y += Math.max(0, 28 * (1 - (meteorTime / 3) ** 2));
    if (meteorTime >= 3) {
      world.burst(world.warning.position);
      world.warning.setEnabled(false);
      world.meteor.setEnabled(false);
      if (
        distance(player.root.position, world.warning.position) < 2.6 &&
        jumpHeight < 2.5
      ) {
        mission.oxygen = Math.max(0, mission.oxygen - 18);
        mission.impacts++;
        audio.play("wrong");
        say(
          "Haddock",
          "A flying pebble! Mani, step out of those red circles. The Moon clearly has no manners.",
          7,
        );
      } else toast("NICE DODGE, MANI!", 1.5);
      meteorTime = -1;
      nextMeteor = mission.elapsed + 18;
    }
  }
  function nearestTarget() {
    if (challenges.active === "rally") {
      if (!inRover)
        return {
          x: rover.root.position.x,
          z: rover.root.position.z,
          label: "Board the Mani Express",
        };
      return {
        ...RALLY_GATES[challenges.progress],
        label: challenges.progress
          ? `Rally gate ${challenges.progress} / 5`
          : "Rally start · drive through",
      };
    }
    if (challenges.active === "hoops")
      return {
        ...MOON_HOOPS[challenges.progress],
        label: `Moon hoop ${challenges.progress + 1} · jump through`,
      };
    const targets: { x: number; z: number; label: string }[] =
      SAMPLE_SITES.flatMap((site, i) =>
        mission.samples.has(i)
          ? []
          : [{ x: site.x, z: site.z, label: `${i + 1}. ${site.name}` }],
      );
    if (!mission.snowy)
      targets.push({ x: CAVE.x, z: CAVE.z, label: "Snowy · ice cave" });
    if (!targets.length)
      return { x: 0, z: 0, label: "Rocket · homeward bound" };
    return targets.sort(
      (a, b) =>
        distance(player.root.position, a) - distance(player.root.position, b),
    )[0];
  }
  const map = $<HTMLCanvasElement>("minimap").getContext("2d")!;
  function drawMap() {
    map.clearRect(0, 0, 240, 240);
    map.save();
    map.translate(120, 139);
    const scale = 2.25;
    map.strokeStyle = "#9a927f55";
    map.lineWidth = 1;
    for (const radius of [30, 60, 90]) {
      map.beginPath();
      map.arc(0, 0, radius, 0, Math.PI * 2);
      map.stroke();
    }
    const point = (x: number, z: number, color: string, radius: number) => {
      map.fillStyle = color;
      map.beginPath();
      map.arc(x * scale, -z * scale, radius, 0, Math.PI * 2);
      map.fill();
      map.strokeStyle = "#263140";
      map.stroke();
    };
    point(0, 0, "#d94234", 6);
    point(CAVE.x, CAVE.z, mission.snowy ? "#589480" : "#76babc", 6);
    SAMPLE_SITES.forEach((s, i) => {
      if (!mission.samples.has(i)) point(s.x, s.z, "#f6bc45", 5);
    });
    if (!inRover)
      point(rover.root.position.x, rover.root.position.z, "#fff1d6", 4);
    const p = player.root.position;
    map.translate(p.x * scale, -p.z * scale);
    map.rotate(-camera.alpha - Math.PI / 2);
    map.fillStyle = "#1b2735";
    map.strokeStyle = "#fff2d5";
    map.lineWidth = 2;
    map.beginPath();
    map.moveTo(0, -9);
    map.lineTo(6, 6);
    map.lineTo(0, 3);
    map.lineTo(-6, 6);
    map.closePath();
    map.fill();
    map.stroke();
    map.restore();
  }
  function updateHud() {
    if (mission.chapter === "explore") {
      updateObjective();
      $("challenge-status").hidden = !challenges.active;
      if (challenges.active)
        $("challenge-status").textContent =
          challenges.active === "rally"
            ? challenges.running
              ? `MANI EXPRESS RALLY · ${challenges.progress - 1}/5 · ${Math.max(0, 60 - challenges.elapsed).toFixed(0)}s left`
              : "MANI EXPRESS RALLY · Board the rover and find START"
            : challenges.active === "hoops"
              ? `MOON HOOPS · ${challenges.progress}/3 · Jump through the gold hoops!`
              : `SNOWY’S BISCUITS · ${challenges.progress}/3 · ${inRover ? "Leave the rover to play" : fetchPhase === "ready" ? "Press E / gold button to throw" : fetchPhase === "out" ? "Go get it, Snowy!" : "Here he comes!"}`;
      $("games").textContent = `★ Moon games ${challenges.medals.size}/3`;
    }
    $("sample-count").textContent =
      `SAMPLES ${mission.samples.size} / ${SAMPLE_SITES.length}`;
    $("snowy-status").textContent =
      `SNOWY: ${mission.snowy ? "SAFE ✓" : "EXPLORING"}`;
    $("clock").textContent = formatTime(mission.elapsed);
    $("oxygen-text").textContent =
      mission.mode === "explorer" ? "∞" : `${Math.ceil(mission.oxygen)}%`;
    $("oxygen-fill").style.width = `${mission.oxygen}%`;
    document
      .querySelector(".oxygen")!
      .classList.toggle("low", mission.oxygen < 25);
    let text = "Enjoy the view",
      disabled = true;
    if (mission.chapter === "orbit") {
      text = mission.tether >= 3 ? "Captain aboard ✓" : "Pull the tether";
      disabled = mission.tether >= 3;
      $("tether-count").textContent = `TETHER ${mission.tether} / 3`;
    } else if (mission.chapter === "explore") {
      const current = nearby();
      text = current.text;
      disabled = current.type === "none";
      const target = nearestTarget();
      const dx = target.x - player.root.position.x,
        dz = target.z - player.root.position.z;
      const forward =
        -Math.cos(camera.alpha) * dx - Math.sin(camera.alpha) * dz;
      const right = -Math.sin(camera.alpha) * dx + Math.cos(camera.alpha) * dz;
      const angle = Math.atan2(right, forward);
      const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
      const arrow = arrows[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
      $("waypoint").textContent =
        `${arrow} ${target.label} · ${Math.round(distance(player.root.position, target))} m`;
      drawMap();
    }
    $("action-label").textContent = text;
    $<HTMLButtonElement>("action").disabled = disabled;
  }
  let measured = 0,
    slowFrames = 0;
  function requestFrame() {
    if (document.hidden) return;
    engine.maxFPS = !playing || lowGraphics ? 30 : 60;
    lastFrame = performance.now();
    engine.runRenderLoop(render);
  }
  function render() {
    const now = performance.now();
    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!paused && !activeModal) {
      time += delta;
      world.animate(delta, time);
      actionCooldown = Math.max(0, actionCooldown - delta);
      if (toastTime > 0) {
        toastTime -= delta;
        if (toastTime <= 0) $("toast").hidden = true;
      }
      if (radioTime > 0) {
        radioTime -= delta;
        if (radioTime <= 0 && mission.chapter === "explore")
          $("radio").hidden = true;
      }
      if (playing) {
        chapterTime += delta;
        if (input.action) {
          doAction();
          input.action = false;
        }
        if (mission.chapter === "orbit") {
          orbitAngle += delta * 0.85;
          const radius = 6.5 - mission.tether * 0.5;
          captain.root.position.set(
            Math.cos(orbitAngle) * radius,
            155 + Math.sin(orbitAngle) * radius * 0.8,
            0,
          );
          captain.root.rotation.set(0, -0.15, Math.sin(orbitAngle) * 0.4);
          captain.arms.forEach((a, i) => (a.rotation.z = (i ? -1 : 1) * 0.7));
          world.updateTether(
            new Vector3(-8, 157, -0.2),
            captain.root.position.add(new Vector3(0, 1, -0.1)),
          );
          const meter = 0.5 - 0.5 * Math.cos(orbitAngle);
          $("orbit-cursor").style.left = `${meter * 98}%`;
          $("orbit-meter").classList.toggle(
            "ready",
            meter >= 0.6 && meter <= 0.95,
          );
          if (rescueWait > 0) {
            rescueWait -= delta;
            if (rescueWait <= 0) land();
          }
        } else if (mission.chapter === "landing") {
          rocket.root.position.y =
            18 * Math.pow(1 - Math.min(1, chapterTime / 5), 1.7);
          if (chapterTime > 3.8 && Math.floor(time * 12) % 2 === 0)
            world.burst(new Vector3(0, 0.2, 0), 2);
          if (chapterTime >= 5) explore();
        } else if (mission.chapter === "explore") {
          move(delta);
          playChallenge(delta);
          mission.tick(
            delta,
            Math.hypot(player.root.position.x, player.root.position.z) < 5.5,
          );
          meteor(delta);
          if (mission.oxygen < 25 && !lowWarned) {
            lowWarned = true;
            say(
              "Calculus",
              "Oxygen is getting low, Mani. Return to the circle around the rocket for a refill. No need to lose your discoveries!",
            );
          }
          if (mission.oxygen > 70) lowWarned = false;
          if (mission.oxygen <= 0) {
            mission.recover();
            inRover = false;
            jumpHeight = 0;
            verticalSpeed = 0;
            player.root.position.set(3, 0, -3);
            $("jump").innerHTML = "↑<small>JUMP</small>";
            say(
              "Tintin",
              "Back at base, safe and sound. All your samples are safe, Mani. Let’s try that again with a little more oxygen!",
            );
            toast("SAFE AT BASE · OXYGEN REFILLED", 4);
          }
        } else if (mission.chapter === "depart") {
          rocket.root.position.y = Math.max(0, chapterTime - 1) ** 2 * 2.4;
          camera.target.y = 7 + rocket.root.position.y * 0.35;
          if (chapterTime >= 6) finish();
        }
        hudTime += delta;
        if (hudTime > 0.12) {
          updateHud();
          hudTime = 0;
        }
      } else if (!reducedMotion) earthTurn(delta);
      if (rocket.flame.isEnabled())
        rocket.flame.scaling.y = 0.9 + Math.sin(time * 22) * 0.12;
    }
    scene.render();
    if (playing && !paused && !activeModal && !lowGraphics && measured < 300) {
      measured++;
      if (engine.getDeltaTime() > 36) slowFrames++;
      if (measured === 300 && slowFrames > 140 && !lowGraphics) graphics(true);
    }
    if (paused || activeModal || !document.hasFocus())
      engine.stopRenderLoop(render);
  }
  function earthTurn(delta: number) {
    world.earth.rotation.y += delta * 0.015;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (
        playing &&
        mission.chapter !== "launch" &&
        mission.chapter !== "complete"
      )
        setPaused(true);
      input.clear();
      audio.suspend();
      engine.stopRenderLoop(render);
    } else requestFrame();
  });
  addEventListener("blur", () => {
    if (playing && !activeModal && mission.chapter !== "complete")
      setPaused(true);
    engine.stopRenderLoop(render);
  });
  addEventListener("focus", requestFrame);
  engine.onContextLostObservable.add(() => {
    if (
      playing &&
      mission.chapter !== "launch" &&
      mission.chapter !== "complete"
    )
      setPaused(true);
    $("load-status").textContent =
      "Graphics paused. Waiting for the browser to restore the scene…";
  });
  engine.onContextRestoredObservable.add(() => {
    $("load-status").textContent = "Ready for another adventure.";
    requestFrame();
  });
  $("load-status").textContent =
    "Keyboard, mouse, or touch. Your crew is ready.";
  $<HTMLButtonElement>("start").disabled = false;
  $("start").textContent = "Let’s go, Commander Mani! →";
  if (innerWidth < 600) {
    camera.radius = 30;
    camera.target.set(-1.7, 5.5, 0);
  }
  requestFrame();
}
