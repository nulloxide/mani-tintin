import test from "node:test";
import assert from "node:assert/strict";
import { Challenges, RALLY_GATES } from "../src/challenges.ts";
import { renderScale, nearSegment } from "../src/rendering.ts";
import { Mission } from "../src/mission.ts";

test("rally requires the rover and ordered gates; the clock starts at START", () => {
  const games = new Challenges();
  games.start("rally", false);
  games.tick(20);
  assert.equal(games.elapsed, 0);
  assert.equal(games.advance(1, true, 0), false);
  assert.equal(games.advance(0, false, 0), false);
  assert.equal(games.advance(0, true, 0), true);
  games.tick(12);
  for (let i = 1; i < RALLY_GATES.length; i++) games.advance(i, true, 0);
  assert.equal(games.active, null);
  assert.equal(games.bestLap, 12);
  assert.deepEqual([...games.medals], ["rally"]);
});
test("failed or cancelled attempts preserve medals and can be restarted", () => {
  const games = new Challenges();
  games.start("rally", false);
  games.advance(0, true, 0);
  assert.equal(games.tick(60), true);
  assert.equal(games.medals.size, 0);
  assert.equal(games.advance(1, true, 0), false);
  games.start("hoops", false);
  for (let i = 0; i < 3; i++) games.advance(i, false, 2);
  games.start("rally", false);
  games.advance(0, true, 0);
  games.cancel();
  games.start("rally", false);
  assert.equal(games.progress, 0);
  assert.equal(games.running, false);
  assert.equal(games.elapsed, 0);
  assert.equal(games.medals.has("hoops"), true);
});
test("Moon hoops require airborne Tintin on foot and each badge is awarded once", () => {
  const games = new Challenges();
  games.start("hoops", false);
  assert.equal(games.advance(0, true, 3), false);
  assert.equal(games.advance(0, false, 0.2), false);
  for (let attempt = 0; attempt < 2; attempt++) {
    games.start("hoops", false);
    for (let i = 0; i < 3; i++) assert.equal(games.advance(i, false, 2), true);
  }
  assert.equal(games.medals.size, 1);
});
test("Snowy's game unlocks after rescue and needs three returns", () => {
  const games = new Challenges();
  assert.equal(games.start("fetch", false), false);
  assert.equal(games.start("fetch", true), true);
  games.advance(0, false, 0);
  games.advance(1, false, 0);
  assert.equal(games.medals.size, 0);
  games.advance(2, false, 0);
  assert.equal(games.medals.has("fetch"), true);
});
test("non-finite clock values cannot poison mission or challenge progress", () => {
  const games = new Challenges();
  games.start("rally", false);
  games.advance(0, true, 0);
  const mission = new Mission("expedition");
  mission.chapter = "explore";
  for (const delta of [NaN, Infinity, -1, 0]) {
    games.tick(delta);
    mission.tick(delta);
  }
  assert.equal(games.elapsed, 0);
  assert.equal(mission.elapsed, 0);
  assert.equal(mission.oxygen, 100);
});
test("Explorer rewards discoveries and badges without penalizing time spent playing", () => {
  const mission = new Mission("explorer");
  mission.chapter = "explore";
  for (let i = 0; i < 5; i++) mission.collect(i);
  mission.rescueSnowy();
  const score = mission.score;
  mission.tick(1200);
  assert.equal(mission.score, score);
  assert.equal(mission.stars, 3);
  mission.bonusPoints = 750;
  assert.equal(mission.score, score + 750);
  assert.equal(new Mission("explorer").bonusPoints, 0);
});
test("pixel limits cover phones, tablets, ultrawide displays and resize", () => {
  for (const [w, h, dpr] of [
    [390, 844, 3],
    [820, 1180, 2],
    [1920, 1080, 2],
    [3840, 2160, 2],
  ])
    for (const low of [true, false]) {
      const scale = renderScale(w, h, dpr, low);
      assert.ok((w * h) / scale ** 2 <= (low ? 850_000 : 2_100_000) + 1);
      assert.ok(1 / scale <= (low ? 1 : 1.5));
    }
  assert.equal(renderScale(0, 0, 1, false), 1);
});
test("course corridors include the path and endpoints without clearing unrelated scenery", () => {
  const a = { x: 0, z: 0 },
    b = { x: 10, z: 0 };
  assert.equal(nearSegment(5, 2, a, b), 2);
  assert.equal(nearSegment(13, 0, a, b), 3);
  assert.equal(nearSegment(-3, 0, a, b), 3);
  assert.equal(nearSegment(3, 4, a, a), 5);
});
