import { Scene } from "@babylonjs/core/scene";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateLathe } from "@babylonjs/core/Meshes/Builders/latheBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import "@babylonjs/core/Rendering/outlineRenderer";

export function createWorkshop(scene: Scene) {
  function material(name: string, hex: string, glow = false) {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor.setAll(0.04);
    if (glow) {
      m.disableLighting = true;
      m.emissiveColor = m.diffuseColor;
    }
    return m;
  }
  const ink = Color3.FromHexString("#18202b");
  const palette = {
    orange: material("saffron-orange suit", "#ed792c"),
    cream: material("ivory enamel", "#fff1cd"),
    red: material("vermilion", "#db3d31"),
    blue: material("oxygen blue", "#518aa5"),
    black: material("ink", "#192533"),
    skin: material("skin", "#f8c598"),
    hair: material("golden quiff", "#eaa335"),
    white: material("Snowy white", "#fff8e3"),
    teal: material("lunar samples", "#74d8c9"),
    yellow: material("warm signal", "#ffd666", true),
  };
  const bubble = material("helmet glass", "#b3e3f0");
  bubble.alpha = 0.13;
  bubble.specularColor.setAll(0.8);
  bubble.specularPower = 80;
  bubble.backFaceCulling = true;
  function finish(
    mesh: Mesh,
    parent: TransformNode | null,
    mat: StandardMaterial,
    outlined = true,
  ) {
    mesh.parent = parent;
    mesh.material = mat;
    mesh.isPickable = false;
    if (outlined) {
      mesh.renderOutline = true;
      mesh.outlineColor = ink;
      mesh.outlineWidth = 0.016;
    }
    return mesh;
  }
  function sphere(
    name: string,
    parent: TransformNode | null,
    mat: StandardMaterial,
    pos: number[],
    size: number[],
    outlined = true,
    segments = 12,
  ) {
    const mesh = finish(
      CreateSphere(name, { diameter: 1, segments }, scene),
      parent,
      mat,
      outlined,
    );
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scaling.set(size[0], size[1], size[2]);
    return mesh;
  }
  function box(
    name: string,
    parent: TransformNode | null,
    mat: StandardMaterial,
    pos: number[],
    size: number[],
    outlined = true,
  ) {
    const mesh = finish(
      CreateBox(
        name,
        { width: size[0], height: size[1], depth: size[2] },
        scene,
      ),
      parent,
      mat,
      outlined,
    );
    mesh.position.set(pos[0], pos[1], pos[2]);
    return mesh;
  }
  function cylinder(
    name: string,
    parent: TransformNode | null,
    mat: StandardMaterial,
    pos: number[],
    height: number,
    diameter: number,
    top = diameter,
    outlined = true,
  ) {
    const mesh = finish(
      CreateCylinder(
        name,
        {
          height,
          diameterBottom: diameter,
          diameterTop: top,
          tessellation: 20,
        },
        scene,
      ),
      parent,
      mat,
      outlined,
    );
    mesh.position.set(pos[0], pos[1], pos[2]);
    return mesh;
  }
  function label(
    name: string,
    text: string,
    width: number,
    parent: TransformNode,
    color = "#fff1cd",
  ) {
    const texture = new DynamicTexture(
      `${name} lettering`,
      { width: 512, height: 128 },
      scene,
      false,
    );
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#18202b";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 118);
    ctx.fillStyle = "#18202b";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 66);
    texture.update();
    const mat = material(`${name} print`, "#ffffff", true);
    mat.diffuseTexture = texture;
    mat.emissiveTexture = texture;
    const mesh = finish(
      CreatePlane(
        name,
        { width, height: width / 4, sideOrientation: Mesh.DOUBLESIDE },
        scene,
      ),
      parent,
      mat,
      false,
    );
    return mesh;
  }
  function bevelBox(
    name: string,
    parent: TransformNode | null,
    mat: StandardMaterial,
    pos: number[],
    size: number[],
    bevel = 0.08,
  ) {
    const [w, h, d] = size.map((v) => v / 2);
    const b = Math.min(bevel, w * 0.4, h * 0.6, d * 0.4);
    const vertices: number[] = [],
      indices: number[] = [];
    for (const [y, inset] of [
      [-h, b],
      [-h + b, 0],
      [h - b, 0],
      [h, b],
    ]) {
      const x = w - inset,
        z = d - inset,
        r = b;
      for (const [px, pz] of [
        [-x + r, -z],
        [x - r, -z],
        [x, -z + r],
        [x, z - r],
        [x - r, z],
        [-x + r, z],
        [-x, z - r],
        [-x, -z + r],
      ])
        vertices.push(px, y, pz);
    }
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 8; i++) {
        const a = row * 8 + i,
          b = row * 8 + ((i + 1) % 8);
        indices.push(a, a + 8, b, b, a + 8, b + 8);
      }
    for (let i = 1; i < 7; i++)
      indices.push(0, i, i + 1, 24, 24 + i + 1, 24 + i);
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    const data = new VertexData();
    data.positions = vertices;
    data.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(vertices, indices, normals);
    data.normals = normals;
    const mesh = finish(new Mesh(name, scene), parent, mat);
    data.applyToMesh(mesh);
    mesh.position.set(pos[0], pos[1], pos[2]);
    return mesh;
  }
  function swept(
    name: string,
    parent: TransformNode,
    mat: StandardMaterial,
    rings: { x: number; y: number; z: number; radius: number; depth: number }[],
  ) {
    const positions: number[] = [],
      indices: number[] = [],
      steps = 16;
    for (const ring of rings)
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        positions.push(
          ring.x + Math.cos(a) * ring.radius,
          ring.y,
          ring.z + Math.sin(a) * ring.depth,
        );
      }
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < steps; i++) {
        const a = j * (steps + 1) + i,
          b = a + steps + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    const data = new VertexData(),
      normals: number[] = [];
    data.positions = positions;
    data.indices = indices;
    VertexData.ComputeNormals(positions, indices, normals);
    data.normals = normals;
    const mesh = finish(new Mesh(name, scene), parent, mat);
    data.applyToMesh(mesh);
    return mesh;
  }
  function astronaut(name: string, captain = false) {
    const root = new TransformNode(name, scene);
    swept("tailored pressure suit", root, palette.orange, [
      { x: 0, y: 0.77, z: 0, radius: 0.25, depth: 0.23 },
      { x: 0, y: 0.87, z: 0, radius: 0.34, depth: 0.28 },
      { x: 0, y: 1.12, z: 0, radius: 0.37, depth: 0.3 },
      { x: 0, y: 1.4, z: 0, radius: 0.43, depth: 0.3 },
      { x: 0, y: 1.55, z: 0, radius: 0.32, depth: 0.24 },
      { x: 0, y: 1.63, z: 0, radius: 0.24, depth: 0.21 },
    ]);
    cylinder("belt", root, palette.cream, [0, 0.86, 0], 0.12, 0.73);
    cylinder("helmet collar", root, palette.cream, [0, 1.64, 0], 0.15, 0.8);
    const head = new TransformNode("head", scene);
    head.parent = root;
    sphere(
      "face",
      head,
      palette.skin,
      [0, 2.02, -0.02],
      [0.57, 0.72, 0.53],
      true,
      16,
    );
    sphere("nose", head, palette.skin, [0, 2, -0.31], [0.13, 0.15, 0.18]);
    for (const side of [-1, 1]) {
      sphere(
        "eye",
        head,
        palette.black,
        [side * 0.125, 2.08, -0.267],
        [0.045, 0.07, 0.035],
        false,
      );
      sphere(
        "ear",
        head,
        palette.skin,
        [side * 0.29, 2.01, -0.015],
        [0.12, 0.2, 0.15],
      );
      const brow = box(
        "eyebrow",
        head,
        palette.black,
        [side * 0.13, 2.19, -0.25],
        [0.1, 0.024, 0.035],
        false,
      );
      brow.rotation.z = side * -0.1;
    }
    const mouth = box(
      "smile",
      head,
      palette.black,
      [0, 1.87, -0.26],
      [0.14, 0.025, 0.025],
      false,
    );
    mouth.rotation.z = -0.08;
    if (captain) {
      sphere("beard", head, palette.black, [0, 1.85, -0.1], [0.62, 0.42, 0.51]);
      sphere("nose", head, palette.skin, [0, 2.01, -0.36], [0.2, 0.19, 0.2]);
      sphere(
        "navy cap",
        head,
        palette.black,
        [0, 2.27, 0.01],
        [0.65, 0.21, 0.56],
      );
      box(
        "cap peak",
        head,
        palette.black,
        [0, 2.24, -0.28],
        [0.46, 0.045, 0.24],
      );
    } else {
      sphere("hair", head, palette.hair, [0, 2.25, 0.06], [0.58, 0.26, 0.48]);
      swept("swept golden quiff", head, palette.hair, [
        { x: 0, y: 2.28, z: -0.12, radius: 0.22, depth: 0.16 },
        { x: 0.01, y: 2.4, z: -0.17, radius: 0.17, depth: 0.12 },
        { x: 0.04, y: 2.5, z: -0.2, radius: 0.1, depth: 0.07 },
        { x: 0.07, y: 2.58, z: -0.16, radius: 0.01, depth: 0.008 },
      ]);
    }
    sphere(
      "glass helmet",
      root,
      bubble,
      [0, 2.08, 0],
      [1.05, 1.12, 1.02],
      false,
      20,
    );
    const helmetRim = finish(
      CreateTorus(
        "helmet rim",
        { diameter: 0.99, thickness: 0.035, tessellation: 28 },
        scene,
      ),
      root,
      palette.cream,
      false,
    );
    helmetRim.position.y = 2.07;
    helmetRim.rotation.x = Math.PI / 2;
    const reflection = sphere(
      "helmet glint",
      root,
      palette.white,
      [-0.32, 2.34, -0.34],
      [0.06, 0.25, 0.025],
      false,
    );
    reflection.rotation.z = -0.45;
    const arms: TransformNode[] = [],
      legs: TransformNode[] = [];
    for (const side of [-1, 1]) {
      const arm = new TransformNode("arm pivot", scene);
      arm.parent = root;
      arm.position.set(side * 0.49, 1.48, 0);
      sphere("sleeve", arm, palette.orange, [0, -0.28, 0], [0.3, 0.65, 0.32]);
      cylinder("cuff", arm, palette.cream, [0, -0.53, 0], 0.1, 0.31);
      sphere("glove", arm, palette.orange, [0, -0.67, 0], [0.31, 0.29, 0.31]);
      sphere(
        "glove thumb",
        arm,
        palette.orange,
        [side * -0.14, -0.62, -0.06],
        [0.12, 0.18, 0.15],
        false,
        6,
      );
      arms.push(arm);
      const leg = new TransformNode("leg pivot", scene);
      leg.parent = root;
      leg.position.set(side * 0.23, 0.87, 0);
      sphere("trouser", leg, palette.orange, [0, -0.34, 0], [0.35, 0.68, 0.38]);
      cylinder("ankle ring", leg, palette.cream, [0, -0.54, 0], 0.1, 0.35);
      bevelBox(
        "moon boot",
        leg,
        palette.orange,
        [0, -0.69, -0.1],
        [0.39, 0.26, 0.58],
      );
      bevelBox(
        "boot sole",
        leg,
        palette.black,
        [0, -0.82, -0.1],
        [0.4, 0.045, 0.6],
        0.02,
      );
      legs.push(leg);
      cylinder(
        "oxygen tank",
        root,
        palette.blue,
        [side * 0.21, 1.23, 0.45],
        0.85,
        0.31,
      );
      sphere(
        "rounded tank top",
        root,
        palette.blue,
        [side * 0.21, 1.65, 0.45],
        [0.31, 0.25, 0.31],
        false,
        8,
      );
      cylinder(
        "tank cap",
        root,
        palette.black,
        [side * 0.21, 1.68, 0.45],
        0.1,
        0.18,
      );
    }
    box(
      "chest control",
      root,
      palette.cream,
      [0, 1.29, -0.32],
      [0.31, 0.24, 0.065],
    );
    sphere(
      "chest dial",
      root,
      palette.blue,
      [0, 1.31, -0.37],
      [0.12, 0.12, 0.04],
      false,
    );
    return { root, head, arms, legs };
  }
  function dog() {
    const root = new TransformNode("Snowy", scene);
    sphere("dog suit", root, palette.orange, [0, 0.57, 0], [0.58, 0.58, 0.97]);
    sphere(
      "Snowy head",
      root,
      palette.white,
      [0, 0.97, -0.5],
      [0.5, 0.53, 0.58],
    );
    sphere(
      "long muzzle",
      root,
      palette.white,
      [0, 0.86, -0.78],
      [0.34, 0.28, 0.46],
    );
    sphere("nose", root, palette.black, [0, 0.91, -1], [0.16, 0.13, 0.1]);
    for (const side of [-1, 1]) {
      sphere(
        "dog eye",
        root,
        palette.black,
        [side * 0.18, 1.03, -0.7],
        [0.055, 0.065, 0.045],
        false,
      );
      const ear = cylinder(
        "pointy ear",
        root,
        palette.white,
        [side * 0.2, 1.27, -0.43],
        0.35,
        0.2,
        0,
      );
      ear.rotation.z = side * -0.22;
      for (const z of [-0.3, 0.3])
        sphere(
          "dog boot",
          root,
          palette.orange,
          [side * 0.21, 0.24, z],
          [0.21, 0.45, 0.24],
        );
    }
    const tail = cylinder(
      "tail",
      root,
      palette.white,
      [0, 0.95, 0.46],
      0.55,
      0.12,
      0.05,
    );
    tail.rotation.x = 0.5;
    cylinder(
      "dog tank",
      root,
      palette.blue,
      [0, 0.83, 0.12],
      0.55,
      0.23,
    ).rotation.x = Math.PI / 2;
    sphere(
      "dog bubble",
      root,
      bubble,
      [0, 1.03, -0.55],
      [0.94, 0.98, 1.2],
      false,
      16,
    );
    return { root, tail };
  }
  function rocket() {
    const root = new TransformNode("Moon rocket", scene);
    const hull = finish(
      CreateLathe(
        "checked rocket",
        {
          shape: Array.from({ length: 41 }, (_, i) => {
            const t = i / 40,
              y = 1 + t * 10.4;
            const radius =
              (0.88 + 0.65 * Math.sin(t * Math.PI * 0.9)) *
              Math.pow(1 - t, 0.5);
            return new Vector3(Math.max(0.012, radius), y, 0);
          }),
          tessellation: 48,
          cap: Mesh.CAP_ALL,
        },
        scene,
      ),
      root,
      palette.cream,
    );
    const tex = new DynamicTexture(
      "red and white checkerboard",
      { width: 512, height: 1024 },
      scene,
      true,
    );
    const ctx = tex.getContext();
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? "#db3e31" : "#fff1d6";
        ctx.fillRect(col * 64, row * 128, 64, 128);
      }
    tex.update();
    const mat = material("rocket checks", "#ffffff");
    mat.diffuseTexture = tex;
    hull.material = mat;
    cylinder("engine nozzle", root, palette.black, [0, 0.85, 0], 0.7, 1.4, 1);
    for (let i = 0; i < 3; i++) {
      const fin = new Mesh("swept red fin", scene);
      const data = new VertexData();
      data.positions = [
        1, 4, -0.1, 2.8, 0.25, -0.1, 0.9, 1.2, -0.1, 1, 4, 0.1, 2.8, 0.25, 0.1,
        0.9, 1.2, 0.1,
      ];
      data.indices = [
        0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5,
      ];
      const normals: number[] = [];
      VertexData.ComputeNormals(data.positions, data.indices, normals);
      data.normals = normals;
      data.applyToMesh(fin);
      finish(fin, root, palette.red);
      fin.rotation.y = (i * Math.PI * 2) / 3;
      sphere(
        "landing foot",
        root,
        palette.black,
        [
          Math.cos((i * Math.PI * 2) / 3) * 2.7,
          0.2,
          -Math.sin((i * Math.PI * 2) / 3) * 2.7,
        ],
        [0.6, 0.25, 0.6],
      );
    }
    sphere(
      "porthole rim",
      root,
      palette.black,
      [0, 7.3, -1.12],
      [0.8, 0.8, 0.16],
    );
    sphere(
      "porthole glass",
      root,
      palette.blue,
      [0, 7.3, -1.22],
      [0.6, 0.6, 0.1],
    );
    sphere(
      "window reflection",
      root,
      palette.white,
      [-0.14, 7.45, -1.28],
      [0.1, 0.23, 0.02],
      false,
    );
    for (const x of [-0.32, 0.32])
      cylinder(
        "ladder rail",
        root,
        palette.black,
        [x, 3.3, -1.45],
        5.5,
        0.045,
        0.045,
        false,
      );
    for (let i = 0; i < 16; i++)
      box(
        "ladder rung",
        root,
        palette.cream,
        [0, 0.6 + i * 0.34, -1.46],
        [0.65, 0.045, 0.05],
        false,
      );
    const badge = label("mission badge", "MANI · 01", 1.6, root);
    badge.position.set(0, 4.9, -1.32);
    const flame = cylinder(
      "rocket flame",
      root,
      palette.yellow,
      [0, -1.5, 0],
      4,
      0.04,
      1,
      false,
    );
    flame.setEnabled(false);
    return { root, flame };
  }
  function rover() {
    const root = new TransformNode("lunar tank", scene);
    bevelBox(
      "tracks left",
      root,
      palette.black,
      [-1.07, 0.55, 0],
      [0.45, 0.75, 2.7],
      0.22,
    );
    bevelBox(
      "tracks right",
      root,
      palette.black,
      [1.07, 0.55, 0],
      [0.45, 0.75, 2.7],
      0.22,
    );
    const wheels: Mesh[] = [];
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const wheel = cylinder(
          "track wheel",
          root,
          palette.cream,
          [side * 1.32, 0.56, -0.95 + i * 0.63],
          0.08,
          0.48,
        );
        wheel.rotation.z = Math.PI / 2;
        wheels.push(wheel);
      }
    bevelBox(
      "rover chassis",
      root,
      palette.orange,
      [0, 0.9, 0],
      [1.8, 0.55, 2.45],
      0.16,
    );
    box("open cockpit", root, palette.blue, [0, 1.22, -0.28], [1.5, 0.2, 1.3]);
    box("seat back", root, palette.cream, [0, 1.65, 0.48], [1.4, 0.8, 0.2]);
    bevelBox(
      "front bumper",
      root,
      palette.cream,
      [0, 0.65, -1.3],
      [1.7, 0.14, 0.18],
      0.05,
    );
    for (const side of [-1, 1]) {
      box(
        "rover fender",
        root,
        palette.orange,
        [side * 1.07, 0.96, 0],
        [0.5, 0.12, 2.2],
      );
      for (let i = 0; i < 7; i++)
        box(
          "track tread",
          root,
          palette.black,
          [side * 1.07, 0.93, -1.05 + i * 0.35],
          [0.48, 0.05, 0.08],
          false,
        );
    }
    const windshield = box(
      "windshield",
      root,
      palette.blue,
      [0, 1.6, -0.95],
      [1.65, 0.7, 0.08],
    );
    windshield.rotation.x = -0.22;
    for (const side of [-1, 1])
      sphere(
        "headlight",
        root,
        palette.yellow,
        [side * 0.62, 1.1, -1.3],
        [0.3, 0.3, 0.14],
      );
    cylinder(
      "rover antenna",
      root,
      palette.black,
      [0.8, 2.2, 0.9],
      2.5,
      0.045,
      0.045,
      false,
    );
    sphere(
      "antenna light",
      root,
      palette.red,
      [0.8, 3.46, 0.9],
      [0.15, 0.15, 0.15],
      false,
    );
    const plate = label("rover plate", "MANI EXPRESS", 1.5, root);
    plate.position.set(0, 1.15, 1.24);
    plate.rotation.y = Math.PI;
    return { root, wheels };
  }
  return {
    material,
    palette,
    sphere,
    box,
    bevelBox,
    cylinder,
    label,
    finish,
    astronaut,
    dog,
    rocket,
    rover,
  };
}

/** Join rigid parts by parent, material and outline; preserve animated pivots. */
export function batchRigidMeshes(scene: Scene, moving: Set<Mesh>) {
  const groups = new Map<string, Mesh[]>();
  for (const mesh of [...scene.meshes]) {
    if (
      !(mesh instanceof Mesh) ||
      moving.has(mesh) ||
      mesh.instances.length ||
      !mesh.isEnabled() ||
      !mesh.isVisible ||
      mesh.billboardMode ||
      !mesh.material ||
      mesh.material.alpha < 1 ||
      mesh.getTotalVertices() === 0
    )
      continue;
    if (!mesh.isVerticesDataPresent("uv"))
      mesh.setVerticesData("uv", new Float32Array(mesh.getTotalVertices() * 2));
    const key = `${mesh.parent?.uniqueId ?? "world"}/${mesh.material.uniqueId}/${mesh.renderOutline}/${mesh.getVerticesDataKinds().sort().join(",")}`;
    const group = groups.get(key) || [];
    group.push(mesh);
    groups.set(key, group);
  }
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0],
      parent = first.parent as TransformNode | null;
    const outlined = first.renderOutline,
      ink = first.outlineColor.clone(),
      width = first.outlineWidth;
    const frozen = meshes.every((mesh) => mesh.isWorldMatrixFrozen);
    const inverse = parent
      ? Matrix.Invert(parent.computeWorldMatrix(true))
      : null;
    for (const mesh of meshes) mesh.computeWorldMatrix(true);
    const merged = Mesh.MergeMeshes(meshes, true, true);
    if (!merged) continue;
    if (inverse) merged.bakeTransformIntoVertices(inverse);
    merged.parent = parent;
    merged.name = `${parent?.name || "scenery"} · ${first.material?.name || "parts"}`;
    merged.isPickable = false;
    merged.renderOutline = outlined;
    merged.outlineColor = ink;
    merged.outlineWidth = width;
    if (frozen) merged.freezeWorldMatrix();
  }
}
