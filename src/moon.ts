import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateLathe } from '@babylonjs/core/Meshes/Builders/latheBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import '@babylonjs/core/Meshes/instancedMesh';

export async function createMoonScene() {
  const canvas = document.querySelector<HTMLCanvasElement>('#moon-scene')!;
  const land = document.querySelector<HTMLButtonElement>('#land')!;
  const reset = document.querySelector<HTMLButtonElement>('#reset')!;
  const resetView = document.querySelector<HTMLButtonElement>('#view-reset')!;
  const status = document.querySelector<HTMLParagraphElement>('#mission-status')!;
  const altitude = document.querySelector<HTMLOutputElement>('#altitude')!;
  const flight = document.querySelector<HTMLElement>('#flight-state')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = () => window.innerWidth <= 760;

  if (!Engine.isSupported()) throw new Error('WebGL is unavailable.');
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: 'default' });
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString('#080c13ff');
  scene.skipPointerMovePicking = true;
  const camera = new ArcRotateCamera('orbit', -1.15, 1.17, 36, new Vector3(-6, 8, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerBetaLimit = .45;
  camera.upperBetaLimit = 1.48;
  camera.lowerRadiusLimit = 18;
  camera.upperRadiusLimit = 58;
  camera.wheelDeltaPercentage = .015;
  camera.pinchDeltaPercentage = .007;
  camera.panningSensibility = 0;
  camera.minZ = .1;
  camera.maxZ = 600;

  const fill = new HemisphericLight('sky-light', new Vector3(0, 1, 0), scene);
  fill.intensity = .4;
  fill.groundColor = Color3.FromHexString('#252738');
  const sun = new DirectionalLight('sun', new Vector3(-.7, -1, .5), scene);
  sun.intensity = 1.15;
  sun.diffuse = Color3.FromHexString('#ffedd3');

  function material(name: string, color: string, emissive = false) {
    const mat = new StandardMaterial(name, scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.specularColor = new Color3(.08, .08, .08);
    if (emissive) {
      mat.emissiveColor = mat.diffuseColor;
      mat.disableLighting = true;
    }
    return mat;
  }
  const moonMaterial = material('moon-dust', '#5e687a');
  const stoneMaterial = material('moon-rock', '#626c7e');
  const red = material('rocket-red', '#bd3029');
  const white = material('spacesuit', '#dfdfd7');
  const dark = material('nozzle', '#29313d');
  const glass = material('visor', '#234e68');
  glass.specularColor = new Color3(.8, .9, 1);
  const orange = material('trim', '#e0a36b');
  const flameMaterial = material('engine-flame', '#ffd395', true);

  let seed = 7331;
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const craters = Array.from({ length: 26 }, () => ({ x: (random() - .5) * 110, z: (random() - .5) * 110, r: 2 + random() * 7 }));
  function groundHeight(x: number, z: number) {
    let height = Math.sin(x * .12) * Math.cos(z * .16) * 1.1 + Math.sin(z * .3 + x * .2) * .35;
    for (const crater of craters) {
      const d = Math.hypot(x - crater.x, z - crater.z) / crater.r;
      if (d < 1.6) height += -1.7 * Math.exp(-d * d * 3) + .65 * Math.exp(-Math.pow((d - 1) * 6, 2));
    }
    return height * Math.min(1, Math.max(0, (Math.hypot(x, z) - 6) / 8));
  }
  const ground = CreateGround('surface', { width: 180, height: 180, subdivisions: 100, updatable: true }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  for (let i = 0; i < positions.length; i += 3) positions[i + 1] = groundHeight(positions[i], positions[i + 2]);
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, ground.getIndices()!, normals);
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.updateVerticesData(VertexBuffer.NormalKind, normals);
  ground.material = moonMaterial;
  ground.freezeWorldMatrix();

  const rock = CreateSphere('rock', { diameter: 1, segments: 3 }, scene);
  rock.material = stoneMaterial;
  rock.isVisible = false;
  for (let i = 0; i < 65; i++) {
    const x = (random() - .5) * 95;
    const z = (random() - .5) * 95;
    if (Math.hypot(x, z) < 6) continue;
    const stone = rock.createInstance(`stone-${i}`);
    const size = .25 + random() * 1.4;
    stone.scaling.set(size * 1.4, size * .65, size);
    stone.position.set(x, groundHeight(x, z) + size * .15, z);
    stone.rotation.set(random(), random() * 6, random());
    stone.freezeWorldMatrix();
  }

  const stars = new Mesh('stars', scene);
  const starPositions: number[] = [];
  const starIndices: number[] = [];
  for (let i = 0; i < 650; i++) {
    const azimuth = random() * Math.PI * 2;
    const y = .08 + random() * .92;
    const radius = Math.sqrt(1 - y * y);
    starPositions.push(Math.cos(azimuth) * radius * 230, y * 230, Math.sin(azimuth) * radius * 230);
    starIndices.push(i);
  }
  const starData = new VertexData();
  starData.positions = starPositions;
  starData.indices = starIndices;
  starData.applyToMesh(stars);
  const starMaterial = material('starlight', '#aab6ce', true);
  starMaterial.pointsCloud = true;
  starMaterial.pointSize = 1.5;
  stars.material = starMaterial;
  stars.isPickable = false;

  const earth = CreateSphere('earth', { diameter: 12, segments: 32 }, scene);
  earth.position.set(31, 44, 65);
  const earthMaterial = material('earth-oceans', '#8ab5da');
  const earthTexture = new DynamicTexture('earth-map', { width: 512, height: 256 }, scene, false);
  const earthContext = earthTexture.getContext();
  earthContext.fillStyle = '#2d6990';
  earthContext.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 38; i++) {
    earthContext.fillStyle = i % 3 === 0 ? '#d5e6df' : '#7cafa2';
    earthContext.beginPath();
    const x = random() * 512;
    const y = 35 + random() * 185;
    for (let j = 0; j < 9; j++) {
      const angle = j / 9 * Math.PI * 2;
      const px = x + Math.cos(angle) * (6 + random() * 30);
      const py = y + Math.sin(angle) * (4 + random() * 12);
      if (j === 0) earthContext.moveTo(px, py); else earthContext.lineTo(px, py);
    }
    earthContext.closePath();
    earthContext.fill();
  }
  earthTexture.update();
  earthMaterial.diffuseTexture = earthTexture;
  earthMaterial.emissiveColor = new Color3(.12, .18, .22);
  earth.material = earthMaterial;

  const pad = CreateCylinder('landing-site', { height: .14, diameter: 7, tessellation: 64 }, scene);
  pad.position.y = .07;
  pad.material = material('landing-stone', '#555f70');
  const ring = CreateTorus('landing-ring', { diameter: 6.4, thickness: .055, tessellation: 64 }, scene);
  ring.position.y = .15;
  ring.material = material('landing-marker', '#dfb47e', true);
  const shadow = CreateDisc('rocket-shadow', { radius: 2.4, tessellation: 40 }, scene);
  shadow.rotation.x = Math.PI / 2;
  shadow.position.y = .155;
  shadow.material = material('shadow', '#222735');
  shadow.material.alpha = .3;

  const rocket = new TransformNode('rocket', scene);
  rocket.position.y = 12;
  const hull = CreateLathe('hull', {
    shape: [new Vector3(.68, .9, 0), new Vector3(.85, 1.5, 0), new Vector3(.93, 3.5, 0), new Vector3(.82, 4.8, 0), new Vector3(.58, 5.8, 0), new Vector3(.02, 7, 0)],
    tessellation: 40, cap: Mesh.CAP_ALL,
  }, scene);
  hull.parent = rocket;
  const checker = new DynamicTexture('rocket-checkers', { width: 256, height: 512 }, scene, true);
  const context = checker.getContext();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    context.fillStyle = (row + col) % 2 === 0 ? '#d83f32' : '#f3ead9';
    context.fillRect(col * 32, row * 64, 32, 64);
  }
  checker.update();
  const hullMaterial = material('checked-hull', '#ffffff');
  hullMaterial.diffuseTexture = checker;
  hull.material = hullMaterial;
  const nose = CreateCylinder('nose', { height: 1.4, diameterTop: 0, diameterBottom: 1.12, tessellation: 32 }, scene);
  nose.position.y = 6.36;
  nose.material = red;
  nose.parent = rocket;
  const nozzle = CreateCylinder('engine', { height: .6, diameterTop: .7, diameterBottom: 1, tessellation: 24 }, scene);
  nozzle.position.y = .8;
  nozzle.material = dark;
  nozzle.parent = rocket;

  for (let i = 0; i < 3; i++) {
    const fin = new Mesh(`fin-${i}`, scene);
    const data = new VertexData();
    data.positions = [.6, 2.8, 0, 1.9, .15, 0, .65, .8, 0];
    data.indices = [0, 1, 2, 2, 1, 0];
    const finNormals: number[] = [];
    VertexData.ComputeNormals(data.positions, data.indices, finNormals);
    data.normals = finNormals;
    data.applyToMesh(fin);
    fin.rotation.y = i * Math.PI * 2 / 3;
    fin.material = red;
    fin.parent = rocket;
    const foot = CreateSphere(`foot-${i}`, { diameter: .4, segments: 8 }, scene);
    foot.scaling.set(1.4, .5, 1);
    foot.position.set(Math.cos(i * Math.PI * 2 / 3) * 1.8, .16, -Math.sin(i * Math.PI * 2 / 3) * 1.8);
    foot.material = dark;
    foot.parent = rocket;
  }
  const windowFrame = CreateSphere('porthole-rim', { diameter: .57, segments: 16 }, scene);
  windowFrame.scaling.z = .3;
  windowFrame.position.set(0, 4.6, -.86);
  windowFrame.material = dark;
  windowFrame.parent = rocket;
  const windowGlass = CreateSphere('porthole', { diameter: .43, segments: 16 }, scene);
  windowGlass.scaling.z = .3;
  windowGlass.position.set(0, 4.6, -.95);
  windowGlass.material = glass;
  windowGlass.parent = rocket;
  const flame = CreateCylinder('exhaust', { height: 2.3, diameterTop: .7, diameterBottom: .03, tessellation: 16 }, scene);
  flame.position.y = -.55;
  flame.parent = rocket;
  flame.material = flameMaterial;

  const astronaut = new TransformNode('tintin', scene);
  astronaut.position.set(3.4, .18, -.8);
  astronaut.setEnabled(false);
  function suitPart(name: string, position: Vector3, scale: Vector3, mat: StandardMaterial) {
    const part = CreateSphere(name, { diameter: 1, segments: 12 }, scene);
    part.position = position;
    part.scaling = scale;
    part.material = mat;
    part.parent = astronaut;
    return part;
  }
  suitPart('suit', new Vector3(0, .82, 0), new Vector3(.57, .7, .4), white);
  suitPart('helmet', new Vector3(0, 1.43, 0), new Vector3(.69, .69, .66), white);
  suitPart('helmet-visor', new Vector3(0, 1.43, -.24), new Vector3(.54, .43, .3), glass);
  suitPart('collar', new Vector3(0, 1.13, 0), new Vector3(.5, .1, .43), orange);
  for (const side of [-1, 1]) {
    suitPart(`boot-${side}`, new Vector3(side * .17, .2, -.05), new Vector3(.24, .5, .3), white);
    suitPart(`arm-${side}`, new Vector3(side * .37, .85, 0), new Vector3(.2, .58, .22), white);
  }
  const backpack = CreateBox('backpack', { width: .4, height: .58, depth: .22 }, scene);
  backpack.position.set(0, .86, .29);
  backpack.material = orange;
  backpack.parent = astronaut;

  let state: 'standby' | 'landing' | 'landed' = 'standby';
  let elapsed = 0;
  let time = 0;
  let followCamera = true;
  let measuredFrames = 0;
  let measuredTime = 0;
  let resolutionReduced = false;
  function frameScene() {
    camera.alpha = -1.15;
    camera.beta = compact() ? 1.2 : 1.17;
    camera.radius = compact() ? 37 : 34;
    camera.target.set(compact() ? 0 : -7, compact() ? rocket.position.y + 11 : rocket.position.y * .45 + 5, 0);
    followCamera = true;
  }
  frameScene();
  resetView.addEventListener('click', frameScene);
  canvas.addEventListener('pointerdown', () => { followCamera = false; });
  land.addEventListener('click', () => {
    if (state !== 'standby') return;
    state = 'landing';
    elapsed = 0;
    land.disabled = true;
    land.textContent = 'Landing…';
    reset.hidden = false;
    status.textContent = 'Easy does it. Bringing Tintin down for a soft landing.';
    flight.textContent = 'DESCENDING';
  });
  reset.addEventListener('click', () => {
    state = 'standby';
    rocket.position.y = 12;
    astronaut.setEnabled(false);
    flame.setEnabled(true);
    land.disabled = false;
    land.textContent = 'Land on the Moon ↘';
    reset.hidden = true;
    flight.textContent = 'STANDBY';
    status.textContent = 'Your rocket is ready. Try a landing, or drag to explore.';
    frameScene();
  });

  const resize = () => { engine.resize(); frameScene(); };
  window.addEventListener('resize', resize);
  const render = () => {
    const delta = Math.min(engine.getDeltaTime() / 1000, .05);
    time += delta;
    if (state === 'standby') rocket.position.y = 12 + (reducedMotion ? 0 : Math.sin(time * 1.2) * .12);
    if (state === 'landing') {
      elapsed += delta;
      const progress = Math.min(elapsed / 7, 1);
      rocket.position.y = .14 + 11.86 * Math.pow(1 - progress, 1.7);
      if (progress === 1) {
        state = 'landed';
        flame.setEnabled(false);
        astronaut.setEnabled(true);
        land.textContent = 'Touchdown ✓';
        status.textContent = 'Welcome to the Moon, Tintin! This is our first 3D preview. The adventure is still to come.';
        flight.textContent = 'TOUCHDOWN';
      }
    }
    if (followCamera) camera.target.y = compact() ? rocket.position.y + 11 : rocket.position.y * .45 + 5;
    if (!reducedMotion) flame.scaling.y = .85 + Math.sin(time * 24) * .12;
    shadow.scaling.setAll(1 + rocket.position.y * .035);
    altitude.value = String(Math.max(0, Math.round((rocket.position.y - .14) * 10)));
    scene.render();
    if (!resolutionReduced && measuredFrames < 240) {
      measuredFrames++;
      measuredTime += engine.getDeltaTime();
      if (measuredFrames === 240 && measuredTime / measuredFrames > 30) {
        engine.setHardwareScalingLevel(1.25);
        resolutionReduced = true;
      }
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) engine.stopRenderLoop(render); else engine.runRenderLoop(render);
  });
  engine.onContextLostObservable.add(() => {
    land.disabled = true;
    status.textContent = 'The graphics paused. Waiting for your browser to restore the scene…';
  });
  engine.onContextRestoredObservable.add(() => {
    land.disabled = state !== 'standby';
    status.textContent = 'The scene is back. You can continue your Moon expedition.';
  });
  await scene.whenReadyAsync();
  land.disabled = false;
  land.textContent = 'Land on the Moon ↘';
  status.textContent = 'Your rocket is ready. Try a landing, or drag to explore.';
  engine.runRenderLoop(render);
}
