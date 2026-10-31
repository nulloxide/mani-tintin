export type ChallengeKind = "rally" | "hoops" | "fetch";
export const RALLY_GATES = [
  { x: 12, z: -4 },
  { x: 23, z: -10 },
  { x: 35, z: 0 },
  { x: 28, z: 14 },
  { x: 16, z: 10 },
  { x: 10, z: 0 },
] as const;
export const MOON_HOOPS = [
  { x: -7, z: 5 },
  { x: -12, z: 9 },
  { x: -17, z: 12 },
] as const;
export const CHALLENGE_NAMES = {
  rally: "Mani Express Rally",
  hoops: "Moon-jump Champion",
  fetch: "Snowy’s Best Friend",
};
export class Challenges {
  active: ChallengeKind | null = null;
  progress = 0;
  elapsed = 0;
  running = false;
  medals = new Set<ChallengeKind>();
  bestLap = Infinity;
  start(kind: ChallengeKind, snowy: boolean) {
    if (kind === "fetch" && !snowy) return false;
    this.active = kind;
    this.progress = 0;
    this.elapsed = 0;
    this.running = false;
    return true;
  }
  cancel() {
    this.active = null;
    this.running = false;
  }
  tick(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0 || !this.active || !this.running)
      return false;
    this.elapsed += delta;
    if (this.active === "rally" && this.elapsed >= 60) {
      this.cancel();
      return true;
    }
    return false;
  }
  advance(index: number, inRover: boolean, jumpHeight: number) {
    if (!this.active || index !== this.progress) return false;
    if (this.active === "rally" && !inRover) return false;
    if (this.active === "hoops" && (inRover || jumpHeight < 1.2)) return false;
    this.running = true;
    this.progress++;
    const total = this.active === "rally" ? RALLY_GATES.length : 3;
    if (this.progress >= total) {
      this.medals.add(this.active);
      if (this.active === "rally")
        this.bestLap = Math.min(this.bestLap, this.elapsed);
      this.cancel();
    }
    return true;
  }
}
