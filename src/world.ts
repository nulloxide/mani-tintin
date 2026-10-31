import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateLines } from "@babylonjs/core/Meshes/Builders/linesBuilder";
import "@babylonjs/core/Meshes/instancedMesh";
import { createWorkshop } from "./models";
import { CAVE, SAMPLE_SITES } from "./mission";

export async function createWorld(canvas: HTMLCanvasElement) {
  if (!Engine.isSupported()) throw new Error("WebGL is unavailable.");
  const engine = new Engine(canvas, true, {
    stencil: true,
    preserveDrawingBuffer: false,
    powerPreference: "default",
  });
  const mobile = matchMedia("(pointer: coarse)").matches;
  engine.setHardwareScalingLevel(
    1 / Math.min(devicePixelRatio || 1, mobile ? 1.4 : 1.7),
  );
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#101d30ff");
  scene.skipPointerMovePicking = true;
  scene.ambientColor = Color3.FromHexString("#8c8b8c");
  const camera = new ArcRotateCamera(
    "expedition camera",
    -1.03,
    1.33,
    33,
    new Vector3(-6, 5.5, 0),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = 1.48;
  camera.lowerRadiusLimit = 7;
  camera.upperRadiusLimit = 36;
  camera.panningSensibility = 0;
  camera.wheelDeltaPercentage = 0.015;
  camera.pinchDeltaPercentage = 0.008;
  camera.angularSensibilityX = 650;
  camera.angularSensibilityY = 800;
  camera.minZ = 0.1;
  camera.maxZ = 600;
  const fill = new HemisphericLight(
    "soft comic light",
    new Vector3(0, 1, 0),
    scene,
  );
  fill.intensity = 0.85;
  fill.groundColor = Color3.FromHexString("#62647c");
  const sun = new DirectionalLight("sun", new Vector3(-0.65, -1.2, 0.5), scene);
  sun.position.set(38, 65, -28);
  sun.intensity = 1.05;
  sun.diffuse = Color3.FromHexString("#fff1d7");
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 180;
  sun.shadowFrustumSize = 100;
  const shadows = new ShadowGenerator(mobile ? 1024 : 2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.bias = 0.002;
  shadows.normalBias = 0.035;
  shadows.setDarkness(0.3);
  const shop = createWorkshop(scene);
  const { palette, material, sphere, cylinder, box, label, finish } = shop;
  let seed = 261031;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const craters = [
    { x: 18, z: 13, r: 7 },
    { x: -13, z: -10, r: 9 },
    { x: 5, z: 28, r: 6 },
    { x: -24, z: 24, r: 8 },
    { x: 32, z: -17, r: 10 },
    ...Array.from({ length: 24 }, () => ({
      x: (random() - 0.5) * 150,
      z: (random() - 0.5) * 150,
      r: 3 + random() * 9,
    })),
  ];
  function height(x: number, z: number) {
    let h = Math.sin(x * 0.16) * Math.cos(z * 0.13) * 0.55;
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1.55)
        h +=
          -1.25 * Math.exp(-d * d * 3.5) +
          0.62 * Math.exp(-(((d - 1) * 5) ** 2));
    }
    return h * Math.min(1, Math.max(0, (Math.hypot(x, z) - 5) / 7));
  }
  const ground = CreateGround(
    "cratered lunar plain",
    { width: 200, height: 200, subdivisions: 160, updatable: true },
    scene,
  );
  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const h = height(positions[i], positions[i + 2]);
    positions[i + 1] = h;
    const shade = 0.86 + Math.max(-0.16, h * 0.09) + random() * 0.035;
    colors.push(shade, shade * 0.98, shade * 0.92, 1);
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, ground.getIndices()!, normals);
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.updateVerticesData(VertexBuffer.NormalKind, normals);
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  const dustMat = material("warm lunar dust", "#c2bba7");
  const dust = new DynamicTexture(
    "lunar stippling",
    { width: 1024, height: 1024 },
    scene,
    true,
  );
  const dc = dust.getContext();
  dc.fillStyle = "#ece7db";
  dc.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 18000; i++) {
    dc.fillStyle = i % 3 === 0 ? "#b8b3a9" : "#d6d0c3";
    dc.fillRect(
      random() * 1024,
      random() * 1024,
      1 + random() * 3,
      1 + random() * 2,
    );
  }
  dust.update();
  dust.uScale = dust.vScale = 12;
  dustMat.diffuseTexture = dust;
  ground.material = dustMat;
  ground.receiveShadows = true;
  ground.freezeWorldMatrix();
  ground.isPickable = false;
  const rockMat = material("chalk rock", "#9b9b98");
  const mountainMat = material("mountain faces", "#8a8a88");
  const obstacles: { x: number; z: number; radius: number }[] = [
    { x: 0, z: 0, radius: 1.7 },
  ];
  const source = CreateSphere(
    "stone template",
    { diameter: 1, segments: 2 },
    scene,
  );
  source.convertToFlatShadedMesh();
  source.material = rockMat;
  source.isVisible = false;
  for (let i = 0; i < 130; i++) {
    const x = (random() - 0.5) * 130,
      z = (random() - 0.5) * 130;
    if (
      Math.hypot(x, z) < 10 ||
      SAMPLE_SITES.some((p) => Math.hypot(x - p.x, z - p.z) < 5) ||
      Math.hypot(x - CAVE.x, z - CAVE.z) < 9
    )
      continue;
    const size = 0.4 + random() * 2.3;
    const rock = source.createInstance(`moon rock ${i}`);
    rock.position.set(x, height(x, z) + size * 0.12, z);
    rock.scaling.set(size * 1.4, size * 0.75, size);
    rock.rotation.set(random(), random() * 6, random());
    rock.isPickable = false;
    rock.freezeWorldMatrix();
    if (size > 1.2) obstacles.push({ x, z, radius: size * 0.55 });
  }
  for (let i = 0; i < 38; i++) {
    const angle = (i / 38) * Math.PI * 2,
      distance = 82 + random() * 14;
    const mountain = sphere(
      "rim mountains",
      null,
      mountainMat,
      [Math.sin(angle) * distance, 2, Math.cos(angle) * distance],
      [18 + random() * 15, 7 + random() * 13, 18 + random() * 13],
      false,
      2,
    );
    mountain.convertToFlatShadedMesh();
    mountain.rotation.y = random() * 6;
    mountain.freezeWorldMatrix();
  }
  const stars = new Mesh("star field", scene),
    starData = new VertexData();
  const starPositions: number[] = [],
    indices: number[] = [];
  for (let i = 0; i < 1100; i++) {
    const angle = random() * Math.PI * 2,
      y = random() * 2 - 1,
      r = Math.sqrt(1 - y * y);
    starPositions.push(
      Math.cos(angle) * r * 260,
      y * 260 + 70,
      Math.sin(angle) * r * 260,
    );
    indices.push(i);
  }
  starData.positions = starPositions;
  starData.indices = indices;
  starData.applyToMesh(stars);
  const starMat = material("starlight", "#e6edf4", true);
  starMat.pointsCloud = true;
  starMat.pointSize = 2;
  stars.material = starMat;
  stars.isPickable = false;
  const earth = sphere(
    "Earth",
    null,
    material("blue planet", "#ffffff", true),
    [36, 22, 80],
    [15, 15, 15],
    true,
    32,
  );
  const earthTexture = new DynamicTexture(
    "Earth illustration",
    { width: 1024, height: 512 },
    scene,
    true,
  );
  const ec = earthTexture.getContext() as CanvasRenderingContext2D;
  ec.fillStyle = "#4795b6";
  ec.fillRect(0, 0, 1024, 512);
  const continents = [
    [
      [120, 100],
      [210, 60],
      [300, 80],
      [320, 150],
      [260, 200],
      [240, 240],
      [200, 210],
      [160, 160],
    ],
    [
      [260, 240],
      [340, 255],
      [355, 300],
      [310, 380],
      [290, 420],
      [265, 350],
    ],
    [
      [500, 150],
      [530, 110],
      [580, 130],
      [600, 220],
      [560, 320],
      [520, 270],
      [490, 205],
    ],
    [
      [555, 120],
      [620, 75],
      [760, 70],
      [870, 130],
      [820, 200],
      [740, 190],
      [710, 260],
      [660, 200],
    ],
    [
      [790, 320],
      [865, 300],
      [910, 350],
      [870, 380],
      [800, 370],
    ],
  ];
  for (const points of continents) {
    ec.beginPath();
    points.forEach(([x, y], i) => (i ? ec.lineTo(x, y) : ec.moveTo(x, y)));
    ec.closePath();
    ec.fillStyle = "#b9c58e";
    ec.fill();
    ec.lineWidth = 3;
    ec.strokeStyle = "#37788f";
    ec.stroke();
  }
  ec.fillStyle = "#eef2de";
  ec.fillRect(0, 0, 1024, 22);
  ec.fillRect(0, 480, 1024, 32);
  ec.strokeStyle = "#e7f3e8";
  ec.lineWidth = 12;
  for (let i = 0; i < 14; i++) {
    const x = random() * 1024,
      y = 55 + random() * 380;
    ec.beginPath();
    ec.moveTo(x, y);
    ec.bezierCurveTo(x + 35, y - 20, x + 55, y + 15, x + 100, y - 5);
    ec.stroke();
  }
  earthTexture.update();
  (earth.material as ReturnType<typeof material>).diffuseTexture = earthTexture;
  earth.rotation.y = 1.7;

  const rocket = shop.rocket();
  const player = shop.astronaut("Tintin");
  player.root.position.set(3, 0, -3);
  player.root.rotation.y = -0.4;
  const captain = shop.astronaut("Captain Haddock", true);
  const snowy = shop.dog();
  snowy.root.position.set(CAVE.x, height(CAVE.x, CAVE.z), CAVE.z);
  const rover = shop.rover();
  rover.root.position.set(7, height(7, -4), -4);
  rover.root.rotation.y = -0.7;
  for (const root of [
    rocket.root,
    player.root,
    captain.root,
    snowy.root,
    rover.root,
  ]) {
    for (const mesh of root.getChildMeshes())
      if (!mesh.name.includes("glass") && !mesh.name.includes("bubble"))
        shadows.addShadowCaster(mesh, false);
  }
  captain.root.setEnabled(false);
  const markerMat = material("sample markers", "#e8b847", true);
  const samples = SAMPLE_SITES.map((site, i) => {
    const root = new TransformNode(`sample ${i}`, scene);
    root.position.set(site.x, height(site.x, site.z), site.z);
    const crystal = sphere(
      "sample crystal",
      root,
      i === 4 ? palette.teal : palette.yellow,
      [0, 0.9, 0],
      [0.7, 1.3, 0.7],
      true,
      2,
    );
    crystal.convertToFlatShadedMesh();
    const ring = finish(
      CreateTorus(
        "sample circle",
        { diameter: 2.3, thickness: 0.06, tessellation: 32 },
        scene,
      ),
      root,
      markerMat,
      false,
    );
    ring.position.y = 0.12;
    const flag = label(
      `sample ${i + 1} tag`,
      `${String(i + 1).padStart(2, "0")} · ${i === 4 ? "ICE" : "SAMPLE"}`,
      2.5,
      root,
      "#ffd56b",
    );
    flag.position.y = 2.4;
    flag.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return { root, crystal, ring };
  });
  const caveRoot = new TransformNode("ice cave", scene);
  caveRoot.position.set(CAVE.x, height(CAVE.x, CAVE.z), CAVE.z + 3);
  const caveStone = material("cave stone", "#797c7b");
  for (const side of [-1, 1]) {
    const wall = sphere(
      "cave pillar",
      caveRoot,
      caveStone,
      [side * 3.5, 2, 0.8],
      [3.5, 5.5, 7],
      true,
      2,
    );
    wall.convertToFlatShadedMesh();
    obstacles.push({ x: CAVE.x + side * 3.5, z: CAVE.z + 3.8, radius: 1.8 });
  }
  const roof = sphere(
    "cave arch",
    caveRoot,
    caveStone,
    [0, 4.9, 1.2],
    [9, 3.4, 7],
    true,
    2,
  );
  roof.convertToFlatShadedMesh();
  sphere(
    "cave shadow",
    caveRoot,
    material("cave darkness", "#192b39", true),
    [0, 1.8, 4],
    [5.5, 5, 0.3],
    false,
    12,
  );
  for (let i = 0; i < 9; i++) {
    const ice = cylinder(
      "ice spire",
      caveRoot,
      palette.teal,
      [(random() - 0.5) * 5, 0.6, 2 + random() * 2],
      1.2 + random(),
      0.4,
      0,
    );
    ice.rotation.z = (random() - 0.5) * 0.5;
  }
  const caveLabel = label(
    "cave sign",
    "THE ICE CAVE",
    4.1,
    caveRoot,
    "#b5e5df",
  );
  caveLabel.position.set(0, 5.7, -2.4);
  caveLabel.billboardMode = Mesh.BILLBOARDMODE_ALL;

  const flagRoot = new TransformNode("Mani flag", scene);
  flagRoot.position.set(-4, 0, -2);
  cylinder(
    "flagpole",
    flagRoot,
    palette.black,
    [0, 2, 0],
    4,
    0.065,
    0.065,
    false,
  );
  const flag = label(
    "Commander Mani flag",
    "MANI WAS HERE!",
    3.6,
    flagRoot,
    "#ffd66e",
  );
  flag.position.set(1.8, 3.4, 0);
  const refillRoot = new TransformNode("base supplies", scene);
  refillRoot.position.set(-4, 0, 3);
  for (const x of [-0.4, 0.4])
    cylinder(
      "oxygen reserve",
      refillRoot,
      palette.blue,
      [x, 0.6, 0],
      1.2,
      0.55,
    );
  const refillLabel = label(
    "oxygen sign",
    "O₂ · BASE CAMP",
    3.2,
    refillRoot,
    "#b5e5df",
  );
  refillLabel.position.y = 2;
  refillLabel.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const baseRing = finish(
    CreateTorus(
      "base camp perimeter",
      { diameter: 11, thickness: 0.07, tessellation: 64 },
      scene,
    ),
    null,
    palette.cream,
    false,
  );
  baseRing.position.y = 0.05;

  const adonis = new TransformNode("Adonis encounter", scene);
  adonis.position.set(0, 155, 0);
  const asteroid = sphere(
    "Adonis",
    adonis,
    rockMat,
    [0, 0, 0],
    [5.4, 4.5, 4.6],
    true,
    3,
  );
  asteroid.convertToFlatShadedMesh();
  for (let i = 0; i < 7; i++)
    sphere(
      "asteroid rock",
      adonis,
      mountainMat,
      [(random() - 0.5) * 4, (random() - 0.5) * 3, -1.5 - random()],
      [1.1, 1.2, 0.7],
      true,
      2,
    );
  const orbit = finish(
    CreateTorus(
      "Adonis orbital path",
      { diameter: 13, thickness: 0.025, tessellation: 80 },
      scene,
    ),
    adonis,
    palette.blue,
    false,
  );
  orbit.rotation.x = Math.PI / 2;
  adonis.setEnabled(false);
  const tether = CreateLines(
    "rescue tether",
    {
      points: [new Vector3(-8, 157, 0), new Vector3(-6, 155, 0)],
      updatable: true,
    },
    scene,
  );
  tether.color = Color3.FromHexString("#fff2c9");
  tether.setEnabled(false);
  function updateTether(start: Vector3, end: Vector3) {
    CreateLines("rescue tether", { points: [start, end], instance: tether });
  }

  const meteor = sphere(
    "falling meteor",
    null,
    palette.orange,
    [0, 0, 0],
    [0.65, 0.8, 0.65],
    false,
    3,
  );
  meteor.setEnabled(false);
  const warning = finish(
    CreateTorus(
      "impact warning",
      { diameter: 5, thickness: 0.12, tessellation: 40 },
      scene,
    ),
    null,
    material("warning red", "#eb6047", true),
    false,
  );
  warning.setEnabled(false);
  const particles = Array.from({ length: 28 }, (_, i) => {
    const mesh = sphere(
      `dust mote ${i}`,
      null,
      i % 3 ? palette.cream : palette.yellow,
      [0, -20, 0],
      [0.12, 0.12, 0.12],
      false,
      3,
    );
    mesh.setEnabled(false);
    return { mesh, velocity: Vector3.Zero(), life: 0 };
  });
  const prints = Array.from({ length: 48 }, (_, i) => {
    const mesh = finish(
      CreateDisc(`footprint ${i}`, { radius: 0.12, tessellation: 8 }, scene),
      null,
      material(`footprint ink ${i}`, "#827e75"),
      false,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.scaling.y = 1.6;
    mesh.setEnabled(false);
    return mesh;
  });
  let printIndex = 0;
  function footprint(position: Vector3, rotation: number, side: number) {
    const mesh = prints[printIndex++ % prints.length];
    mesh.setEnabled(true);
    mesh.position.set(
      position.x + Math.cos(rotation) * side * 0.2,
      0,
      position.z - Math.sin(rotation) * side * 0.2,
    );
    mesh.position.y = height(mesh.position.x, mesh.position.z) + 0.025;
    mesh.rotation.z = -rotation;
  }
  function burst(position: Vector3, count = 18) {
    let used = 0;
    for (const p of particles)
      if (p.life <= 0 && used++ < count) {
        p.mesh.setEnabled(true);
        p.mesh.position.copyFrom(position);
        p.life = 0.6 + random() * 0.6;
        p.velocity.set(
          (random() - 0.5) * 4,
          1 + random() * 3,
          (random() - 0.5) * 4,
        );
      }
  }
  function animate(delta: number, time: number) {
    samples.forEach(({ crystal, root }, i) => {
      if (root.isEnabled()) {
        crystal.rotation.y += delta;
        crystal.position.y = 0.95 + Math.sin(time * 2 + i) * 0.14;
      }
    });
    for (const p of particles)
      if (p.life > 0) {
        p.life -= delta;
        p.velocity.y -= delta * 3;
        p.mesh.position.addInPlace(p.velocity.scale(delta));
        p.mesh.scaling.setAll(Math.max(0.02, p.life * 0.17));
        if (p.life <= 0) p.mesh.setEnabled(false);
      }
  }
  function lowQuality(low: boolean) {
    engine.setHardwareScalingLevel(
      low ? 1.2 : 1 / Math.min(devicePixelRatio || 1, mobile ? 1.4 : 1.7),
    );
    shadows.getShadowMap()!.resize(low ? 512 : mobile ? 1024 : 2048);
  }
  await scene.whenReadyAsync();
  return {
    engine,
    scene,
    camera,
    height,
    obstacles,
    rocket,
    player,
    captain,
    snowy,
    rover,
    samples,
    earth,
    adonis,
    tether,
    updateTether,
    meteor,
    warning,
    animate,
    burst,
    footprint,
    lowQuality,
  };
}
export type World = Awaited<ReturnType<typeof createWorld>>;
