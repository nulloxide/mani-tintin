export type Mode = "explorer" | "expedition";
export type Chapter =
  | "orbit"
  | "landing"
  | "explore"
  | "launch"
  | "depart"
  | "complete";

export const SAMPLE_SITES = [
  {
    x: 7,
    z: 9,
    name: "First footsteps",
    kind: "Basalt",
    note: "A volcanic rock! Calculus will be delighted. Haddock was hoping for cheese.",
  },
  {
    x: 24,
    z: 17,
    name: "Crater ridge",
    kind: "Moon glass",
    note: "A tiny glassy treasure, made by an ancient impact. No, Captain, it is not a marble.",
  },
  {
    x: 6,
    z: 34,
    name: "Sea of Tranquillity",
    kind: "Anorthosite",
    note: "A piece of the Moon’s ancient crust. Mani, your collection is out of this world.",
  },
  {
    x: -19,
    z: 17,
    name: "Cave approach",
    kind: "Lunar breccia",
    note: "Several rocks fused into one. Thomson calls it a rock sandwich. Thompson agrees.",
  },
  {
    x: -28,
    z: 30,
    name: "The ice cave",
    kind: "Ice crystal",
    note: "Ice beneath the surface! A discovery worthy of Commander Mani’s expedition.",
  },
] as const;
export const CAVE = { x: -28, z: 31 };
export const LAUNCH_SEQUENCE = ["star", "moon", "earth"] as const;

export class Mission {
  chapter: Chapter = "orbit";
  samples = new Set<number>();
  snowy = false;
  tether = 0;
  oxygen = 100;
  elapsed = 0;
  rescues = 0;
  impacts = 0;
  jumps = 0;
  launchStep = 0;
  bonusPoints = 0;
  mode: Mode;
  constructor(mode: Mode) {
    this.mode = mode;
  }
  get readyToLaunch() {
    return this.samples.size === SAMPLE_SITES.length && this.snowy;
  }
  collect(index: number) {
    if (
      this.chapter !== "explore" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= SAMPLE_SITES.length ||
      this.samples.has(index)
    )
      return false;
    this.samples.add(index);
    return true;
  }
  rescueSnowy() {
    if (this.chapter !== "explore" || this.snowy) return false;
    this.snowy = true;
    return true;
  }
  tick(delta: number, atBase = false) {
    if (this.chapter !== "explore" || !Number.isFinite(delta) || delta <= 0)
      return;
    this.elapsed += delta;
    if (atBase) this.oxygen = Math.min(100, this.oxygen + delta * 16);
    else if (this.mode === "expedition")
      this.oxygen = Math.max(0, this.oxygen - delta * 0.32);
  }
  recover() {
    this.oxygen = 100;
    this.rescues++;
  }
  beginLaunch() {
    if (!this.readyToLaunch || this.chapter !== "explore") return false;
    this.chapter = "launch";
    this.launchStep = 0;
    return true;
  }
  pressLaunch(symbol: string) {
    if (this.chapter !== "launch") return "inactive";
    if (symbol !== LAUNCH_SEQUENCE[this.launchStep]) {
      this.launchStep = 0;
      return "retry";
    }
    this.launchStep++;
    if (this.launchStep === LAUNCH_SEQUENCE.length) {
      this.chapter = "depart";
      return "complete";
    }
    return "correct";
  }
  get stars() {
    if (!this.readyToLaunch) return 0;
    return (
      1 +
      Number(this.rescues === 0) +
      Number(
        this.impacts === 0 && (this.mode === "explorer" || this.elapsed < 360),
      )
    );
  }
  get score() {
    return Math.max(
      0,
      this.samples.size * 200 +
        this.bonusPoints +
        Number(this.snowy) * 500 +
        this.stars * 200 +
        (this.mode === "explorer"
          ? 600
          : Math.max(0, 600 - Math.floor(this.elapsed))) -
        this.rescues * 100 -
        this.impacts * 25,
    );
  }
}

export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
