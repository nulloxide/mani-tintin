/** Limit total pixels as well as density on large and high-resolution screens. */
export function renderScale(
  width: number,
  height: number,
  density: number,
  low: boolean,
) {
  const budget = low ? 850_000 : 2_100_000;
  const ratio = Math.min(
    Math.max(1, density),
    low ? 1 : 1.5,
    Math.sqrt(budget / Math.max(1, width * height)),
  );
  return 1 / ratio;
}

export function nearSegment(
  x: number,
  z: number,
  a: { x: number; z: number },
  b: { x: number; z: number },
) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)),
  );
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
