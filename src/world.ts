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
import { batchRigidMeshes, createWorkshop } from "./models";
import { CAVE, SAMPLE_SITES } from "./mission";
import { RALLY_GATES, MOON_HOOPS } from "./challenges";
import { renderScale, nearSegment } from "./rendering";

export async function createWorld(canvas: HTMLCanvasElement) {
  if (!Engine.isSupported()) throw new Error("WebGL is unavailable.");
  const engine = new Engine(canvas, true, {
    stencil: true,
    preserveDrawingBuffer: false,
    powerPreference: "default",
  });
  const mobile = matchMedia("(pointer: coarse)").matches;
  let low = false;
  const resize = () => {
    engine.setHardwareScalingLevel(
      renderScale(
        canvas.clientWidth,
        canvas.clientHeight,
        devicePixelRatio || 1,
        low,
      ),
    );
    engine.resize();
  };
  resize();
  engine.maxFPS = 30;
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
  const shadows = new ShadowGenerator(1024, sun);
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
    { width: 200, height: 200, subdivisions: 128, updatable: true },
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
      Math.hypot(x - CAVE.x, z - CAVE.z) < 9 ||
      RALLY_GATES.some(
        (gate, i) =>
          nearSegment(x, z, gate, RALLY_GATES[(i + 1) % RALLY_GATES.length]) <
          4.5,
      ) ||
      MOON_HOOPS.some((gate) => Math.hypot(x - gate.x, z - gate.z) < 3.5)
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
  const ridge = new Mesh("sculpted lunar mountain range", scene);
  const ridgeData = new VertexData(),
    ridgePositions: number[] = [],
    ridgeIndices: number[] = [];
  const ridgeSteps = 160;
  const peaks = Array.from({ length: ridgeSteps }, (_, i) => {
    const a = (i / ridgeSteps) * Math.PI * 2;
    return (
      7 +
      Math.pow((Math.sin(a * 9) + 1) * 0.5, 2) * 12 +
      Math.pow((Math.sin(a * 17 + 0.7) + 1) * 0.5, 3) * 7 +
      random() * 2
    );
  });
  for (let ring = 0; ring < 4; ring++)
    for (let i = 0; i <= ridgeSteps; i++) {
      const a = (i / ridgeSteps) * Math.PI * 2,
        peak = peaks[i % ridgeSteps];
      const radius = [70, 81, 94, 114][ring] + Math.sin(a * 13 + ring) * 2.4;
      const h =
        ring === 0 ? -0.8 : ring === 1 ? peak * 0.32 : ring === 2 ? peak : 3;
      ridgePositions.push(Math.sin(a) * radius, h, Math.cos(a) * radius);
    }
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0; i < ridgeSteps; i++) {
      const a = ring * (ridgeSteps + 1) + i,
        b = a + ridgeSteps + 1;
      ridgeIndices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const ridgeNormals: number[] = [];
  VertexData.ComputeNormals(ridgePositions, ridgeIndices, ridgeNormals);
  ridgeData.positions = ridgePositions;
  ridgeData.indices = ridgeIndices;
  ridgeData.normals = ridgeNormals;
  ridgeData.applyToMesh(ridge);
  ridge.material = mountainMat;
  ridge.isPickable = false;
  ridge.convertToFlatShadedMesh();
  ridge.freezeWorldMatrix();
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
  const arch = new Mesh("sculpted cave arch", scene),
    archData = new VertexData();
  const archPositions: number[] = [],
    archIndices: number[] = [],
    archSteps = 18;
  for (const z of [-2.8, 3.5])
    for (const outer of [true, false])
      for (let i = 0; i <= archSteps; i++) {
        const angle = (i / archSteps) * Math.PI;
        const ripple = outer ? 1 + Math.sin(i * 2.7) * 0.035 : 1;
        archPositions.push(
          Math.cos(angle) * (outer ? 4.9 : 2.65) * ripple,
          outer ? 0.1 + Math.sin(angle) * 6 : 0.1 + Math.sin(angle) * 3.9,
          z,
        );
      }
  const strip = (a: number, b: number, reverse: boolean) => {
    for (let i = 0; i < archSteps; i++) {
      const triangles = [a + i, b + i, a + i + 1, a + i + 1, b + i, b + i + 1];
      if (reverse) triangles.reverse();
      archIndices.push(...triangles);
    }
  };
  const n = archSteps + 1;
  strip(0, n, false);
  strip(n * 2, n * 3, true);
  strip(0, n * 2, true);
  strip(n, n * 3, false);
  for (let i = 0; i < archIndices.length; i += 3)
    [archIndices[i + 1], archIndices[i + 2]] = [
      archIndices[i + 2],
      archIndices[i + 1],
    ];
  archData.positions = archPositions;
  archData.indices = archIndices;
  const archNormals: number[] = [];
  VertexData.ComputeNormals(archPositions, archIndices, archNormals);
  archData.normals = archNormals;
  archData.applyToMesh(arch);
  finish(arch, caveRoot, caveStone);
  arch.convertToFlatShadedMesh();
  for (const side of [-1, 1])
    for (const z of [CAVE.z + 1, CAVE.z + 4, CAVE.z + 6])
      obstacles.push({ x: CAVE.x + side * 3.8, z, radius: 1.1 });
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
  const dustTemplates = [palette.cream, palette.yellow].map((mat, i) => {
    const source = sphere(
      `dust template ${i}`,
      null,
      mat,
      [0, 0, 0],
      [1, 1, 1],
      false,
      3,
    );
    source.isVisible = false;
    return source;
  });
  const particles = Array.from({ length: 28 }, (_, i) => {
    const mesh = dustTemplates[i % 3 ? 0 : 1].createInstance(`dust mote ${i}`);
    mesh.isPickable = false;
    mesh.setEnabled(false);
    mesh.scaling.setAll(0.12);
    return { mesh, velocity: Vector3.Zero(), life: 0 };
  });
  const printMaterial = material("footprint ink", "#827e75");
  const printTemplate = finish(
    CreateDisc("footprint template", { radius: 0.12, tessellation: 8 }, scene),
    null,
    printMaterial,
    false,
  );
  printTemplate.isVisible = false;
  const prints = Array.from({ length: 32 }, (_, i) => {
    const mesh = printTemplate.createInstance(`footprint ${i}`);
    mesh.isPickable = false;
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
        p.mesh.position.x += p.velocity.x * delta;
        p.mesh.position.y += p.velocity.y * delta;
        p.mesh.position.z += p.velocity.z * delta;
        p.mesh.scaling.setAll(Math.max(0.02, p.life * 0.17));
        if (p.life <= 0) p.mesh.setEnabled(false);
      }
  }
  function lowQuality(value: boolean) {
    low = value;
    resize();
    shadows.getShadowMap()!.resize(low ? 512 : 1024);
  }
  const rally = RALLY_GATES.map((site, i) => {
    const root = new TransformNode(`rally checkpoint ${i + 1}`, scene);
    root.position.set(site.x, height(site.x, site.z), site.z);
    const next = RALLY_GATES[(i + 1) % RALLY_GATES.length];
    root.rotation.y = Math.atan2(next.x - site.x, next.z - site.z);
    for (const side of [-1, 1]) {
      cylinder(
        "rally post",
        root,
        palette.cream,
        [side * 2.8, 1.5, 0],
        3,
        0.12,
        0.12,
        false,
      );
      sphere(
        "checkpoint lamp",
        root,
        palette.yellow,
        [side * 2.8, 3.05, 0],
        [0.35, 0.35, 0.35],
        false,
        6,
      );
    }
    const hoop = finish(
      CreateTorus(
        "rally arch",
        { diameter: 5.5, thickness: 0.12, tessellation: 32 },
        scene,
      ),
      root,
      palette.teal,
      false,
    );
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = 2.6;
    const number = label(
      "checkpoint number",
      i === 0 ? "START" : String(i),
      1.5,
      root,
      "#ffd66e",
    );
    number.position.y = 5.5;
    number.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return { root, hoop };
  });
  const hoops = MOON_HOOPS.map((site, i) => {
    const root = new TransformNode(`Moon jump hoop ${i + 1}`, scene);
    root.position.set(site.x, height(site.x, site.z), site.z);
    const hoop = finish(
      CreateTorus(
        "jump hoop",
        { diameter: 2.5, thickness: 0.12, tessellation: 32 },
        scene,
      ),
      root,
      palette.yellow,
      false,
    );
    hoop.position.y = 2.9;
    hoop.rotation.x = Math.PI / 2;
    hoop.rotation.y = -1;
    const sign = label(
      "jump hoop number",
      `JUMP ${i + 1}`,
      1.6,
      root,
      "#b5e5df",
    );
    sign.position.y = 4.5;
    sign.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return { root, hoop };
  });
  const biscuitRoot = new TransformNode("Snowy's Moon biscuit", scene);
  const biscuit = shop.bevelBox(
    "space biscuit",
    biscuitRoot,
    palette.cream,
    [0, 0, 0],
    [0.55, 0.18, 0.25],
    0.06,
  );
  for (const side of [-1, 1])
    for (const z of [-0.12, 0.12])
      sphere(
        "biscuit end",
        biscuitRoot,
        palette.cream,
        [side * 0.26, 0, z],
        [0.24, 0.19, 0.25],
        false,
        6,
      );
  const moving = new Set<Mesh>([
    earth,
    rocket.flame,
    snowy.tail,
    ...rover.wheels,
    ...samples.map((s) => s.crystal),
    meteor,
    warning,
    tether,
    biscuit,
    ...rally.map((g) => g.hoop),
    ...hoops.map((g) => g.hoop),
  ]);
  batchRigidMeshes(scene, moving);
  for (const root of [
    rocket.root,
    player.root,
    captain.root,
    snowy.root,
    rover.root,
    caveRoot,
  ])
    for (const mesh of root.getChildMeshes())
      if (
        mesh.material &&
        mesh.material.alpha === 1 &&
        !mesh.billboardMode &&
        !mesh.name.includes("flame") &&
        mesh.getBoundingInfo().boundingBox.extendSize.length() > 0.18
      )
        shadows.addShadowCaster(mesh, false);
  captain.root.setEnabled(false);
  rally.forEach((g) => g.root.setEnabled(false));
  hoops.forEach((g) => g.root.setEnabled(false));
  biscuitRoot.setEnabled(false);
  function resetEffects() {
    for (const print of prints) print.setEnabled(false);
    for (const p of particles) {
      p.life = 0;
      p.mesh.setEnabled(false);
    }
    printIndex = 0;
  }
  await scene.whenReadyAsync();
  for (const mat of scene.materials) mat.freeze();
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
    resize,
    rally,
    hoops,
    biscuit: biscuitRoot,
    resetEffects,
  };
}
export type World = Awaited<ReturnType<typeof createWorld>>;
