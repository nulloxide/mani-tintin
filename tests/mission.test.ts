import test from "node:test";
import assert from "node:assert/strict";
import { Mission, SAMPLE_SITES, formatTime } from "../src/mission.ts";

function explored(mode: "explorer" | "expedition" = "explorer") {
  const mission = new Mission(mode);
  mission.chapter = "explore";
  return mission;
}

test("samples require exploration and can only be collected once", () => {
  const mission = new Mission("explorer");
  assert.equal(mission.collect(0), false);
  mission.chapter = "explore";
  assert.equal(mission.collect(0), true);
  assert.equal(mission.collect(0), false);
  for (const index of [-1, 0.5, 5, NaN])
    assert.equal(mission.collect(index), false);
  assert.equal(mission.samples.size, 1);
});

test("the rocket waits for every sample and Snowy, in either collection order", () => {
  for (const snowyFirst of [false, true]) {
    const mission = explored();
    if (snowyFirst) mission.rescueSnowy();
    assert.equal(mission.beginLaunch(), false);
    SAMPLE_SITES.forEach((_, i) => mission.collect(i));
    if (!snowyFirst) {
      assert.equal(mission.readyToLaunch, false);
      mission.rescueSnowy();
    }
    assert.equal(mission.readyToLaunch, true);
    assert.equal(mission.beginLaunch(), true);
    assert.equal(mission.chapter, "launch");
  }
});

test("the launch puzzle recovers from wrong symbols and departs only after the full sequence", () => {
  const mission = explored();
  SAMPLE_SITES.forEach((_, i) => mission.collect(i));
  mission.rescueSnowy();
  mission.beginLaunch();
  assert.equal(mission.pressLaunch("star"), "correct");
  assert.equal(mission.pressLaunch("earth"), "retry");
  assert.equal(mission.launchStep, 0);
  assert.equal(mission.pressLaunch("star"), "correct");
  assert.equal(mission.pressLaunch("moon"), "correct");
  assert.equal(mission.chapter, "launch");
  assert.equal(mission.pressLaunch("earth"), "complete");
  assert.equal(mission.chapter, "depart");
  assert.equal(mission.pressLaunch("star"), "inactive");
});

test("Explorer oxygen is unlimited; Expedition oxygen drains and base camp refills it", () => {
  const explorer = explored();
  explorer.tick(500);
  assert.equal(explorer.oxygen, 100);
  const expedition = explored("expedition");
  expedition.tick(100);
  assert.equal(expedition.oxygen, 68);
  expedition.tick(1, true);
  assert.equal(expedition.oxygen, 84);
  expedition.tick(100, true);
  assert.equal(expedition.oxygen, 100);
  expedition.tick(500);
  assert.equal(expedition.oxygen, 0);
});

test("mission time and oxygen do not advance in story scenes or launch controls", () => {
  const mission = new Mission("expedition");
  mission.tick(20);
  assert.equal(mission.elapsed, 0);
  mission.chapter = "explore";
  mission.tick(10);
  assert.equal(mission.elapsed, 10);
  const oxygen = mission.oxygen;
  mission.chapter = "launch";
  mission.tick(50);
  assert.equal(mission.elapsed, 10);
  assert.equal(mission.oxygen, oxygen);
});

test("oxygen rescue keeps discoveries but affects the rating", () => {
  const mission = explored("expedition");
  SAMPLE_SITES.forEach((_, i) => mission.collect(i));
  mission.rescueSnowy();
  assert.equal(mission.stars, 3);
  const previousScore = mission.score;
  mission.oxygen = 0;
  mission.recover();
  assert.equal(mission.oxygen, 100);
  assert.equal(mission.samples.size, 5);
  assert.equal(mission.snowy, true);
  assert.equal(mission.stars, 2);
  assert.ok(mission.score < previousScore);
});

test("a new adventure resets all progression independently of the previous run", () => {
  const previous = explored();
  previous.collect(0);
  previous.rescueSnowy();
  previous.recover();
  const next = new Mission("expedition");
  assert.equal(next.samples.size, 0);
  assert.equal(next.snowy, false);
  assert.equal(next.rescues, 0);
  assert.equal(next.chapter, "orbit");
  assert.equal(next.launchStep, 0);
  assert.equal(next.oxygen, 100);
});

test("mission timer stays readable beyond a minute", () => {
  assert.equal(formatTime(9.8), "0:09");
  assert.equal(formatTime(125), "2:05");
});
