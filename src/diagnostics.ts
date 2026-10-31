import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import type { Scene } from "@babylonjs/core/scene";

/** Local profiling only; omitted from production builds. */
export function diagnostics(scene: Scene) {
  const meter = new SceneInstrumentation(scene);
  meter.captureFrameTime = true;
  const panel = document.createElement("output");
  panel.id = "performance-report";
  panel.style.cssText =
    "position:fixed;right:16px;top:100px;z-index:100;background:#101d30;color:white;padding:14px;font:14px/1.6 monospace;white-space:pre;pointer-events:none";
  document.body.append(panel);
  let frames = 0,
    work = 0,
    draws = 0,
    since = performance.now();
  const costs: number[] = [];
  scene.onAfterRenderObservable.add(() => {
    frames++;
    const cost = meter.frameTimeCounter.current;
    work += cost;
    costs.push(cost);
    draws += meter.drawCallsCounter.current;
  });
  const timer = setInterval(() => {
    const now = performance.now(),
      elapsed = now - since;
    costs.sort((a, b) => a - b);
    const engine = scene.getEngine();
    panel.textContent = `LOCAL PERFORMANCE · ${Math.round(elapsed / 1000)}s window\nRendered FPS: ${((frames * 1000) / elapsed).toFixed(1)}\nCPU frame work: ${(work / Math.max(1, frames)).toFixed(2)} ms\nFrame work p95: ${(costs[Math.floor(costs.length * 0.95)] || 0).toFixed(2)} ms\nRender thread duty: ${((work / elapsed) * 100).toFixed(1)}%\nDraw calls/frame: ${Math.round(draws / Math.max(1, frames))}\nMeshes: ${scene.meshes.length} · active: ${scene.getActiveMeshes().length}\nBuffer: ${engine.getRenderWidth()} × ${engine.getRenderHeight()}`;
    frames = 0;
    work = 0;
    draws = 0;
    costs.length = 0;
    since = now;
  }, 5000);
  scene.onDisposeObservable.add(() => {
    clearInterval(timer);
    meter.dispose();
    panel.remove();
  });
}
