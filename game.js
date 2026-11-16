import * as THREE from "./vendor/three.module.js";

const CODE = "4816";

const view = document.getElementById("view");
const crosshair = document.getElementById("crosshair");
const promptEl = document.getElementById("prompt");
const toastEl = document.getElementById("toast");
const introEl = document.getElementById("intro");
const noteEl = document.getElementById("note-card");
const keypadEl = document.getElementById("keypad");
const endingEl = document.getElementById("ending");
const entryEl = document.getElementById("entry");
const keypadCard = keypadEl.querySelector(".keypad-card");

const state = {
  started: false,
  escaped: false,
  hasKey: false,
  hasNote: false,
  seenPainting: false,
  clockValue: null,
  starCount: null,
  bookCount: null,
  digits: [null, null, null, null],
  clues: [],
  entry: "",
};

const keys = { f: false, b: false, l: false, r: false };
const pad = { f: false, b: false, l: false, r: false };
const player = { x: 0, z: 1.35 };
let yaw = 0;
let pitch = -0.06;
let targetId = null;
let toastTimer = 0;
let startedAt = 0;

const anim = {
  painting: 0,
  drawer: 0,
  door: 0,
};

const obstacles = [
  { minX: -3.85, maxX: -2.45, minZ: -0.45, maxZ: 1.45 },
  { minX: 3.05, maxX: 4.2, minZ: -1.7, maxZ: 1.15 },
  { minX: 2.15, maxX: 3.35, minZ: 1.55, maxZ: 2.7 },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1612);

const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 40);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
view.appendChild(renderer.domElement);

const parts = {};
const clock3 = new THREE.Clock();

function canvasTexture(draw, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addBox(parent, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.02 })
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function tag(object, id, label) {
  object.userData.id = id;
  object.userData.label = label;
  object.traverse((child) => {
    if (child.isMesh && child.material) {
      const source = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = source.map((material) => material.clone());
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
    }
  });
}

function buildRoom() {
  addBox(scene, 8.4, 0.12, 6.4, 0x6b4a32, 0, -0.06, 0);
  addBox(scene, 8.4, 0.12, 6.4, 0xe7e0d4, 0, 3.12, 0);
  addBox(scene, 0.2, 3.2, 6.4, 0xd2c4b0, -4.1, 1.54, 0);
  addBox(scene, 0.2, 3.2, 6.4, 0xd2c4b0, 4.1, 1.54, 0);
  addBox(scene, 8.4, 3.2, 0.2, 0xd2c4b0, 0, 1.54, 3.1);
  addBox(scene, 3.4, 3.2, 0.2, 0xd2c4b0, -2.5, 1.54, -3.1);
  addBox(scene, 3.4, 3.2, 0.2, 0xd2c4b0, 2.5, 1.54, -3.1);
  addBox(scene, 1.5, 0.9, 0.2, 0xd2c4b0, 0, 2.7, -3.1);

  const rug = addBox(scene, 2.4, 0.02, 1.5, 0x8d3832, 0.1, 0.02, 0.15);
  rug.material.roughness = 1;

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe1b0 })
  );
  lamp.position.set(0, 2.9, 0);
  scene.add(lamp);
  addBox(scene, 0.04, 0.22, 0.04, 0x2a241c, 0, 3.02, 0);

  scene.add(new THREE.AmbientLight(0xfff4e8, 0.72));
  const hemi = new THREE.HemisphereLight(0xfff1dd, 0x4a3428, 0.45);
  scene.add(hemi);
  const bulb = new THREE.PointLight(0xffd7a8, 22, 0, 2);
  bulb.position.set(0, 2.75, 0);
  scene.add(bulb);
  const windowLight = new THREE.PointLight(0xb7d4ef, 8, 0, 2);
  windowLight.position.set(-3.2, 1.8, -1.2);
  scene.add(windowLight);

  buildDoor();
  buildPainting();
  buildClock();
  buildWindow();
  buildDesk();
  buildShelf();
  buildPlant();
}

function buildDoor() {
  const pivot = new THREE.Group();
  pivot.position.set(-0.55, 0, -2.9);
  const door = addBox(pivot, 1.08, 2.16, 0.08, 0x4a3126, 0.54, 1.08, 0);
  addBox(pivot, 0.16, 0.36, 0.02, 0xc9843a, 0.92, 1.15, 0.05);
  tag(pivot, "door", "扉");
  scene.add(pivot);
  parts.door = pivot;
  parts.doorMesh = door;
}

function buildPainting() {
  const pivot = new THREE.Group();
  pivot.position.set(-2.05, 1.72, 2.9);
  const board = new THREE.Group();
  board.position.set(0.52, 0, 0);

  const frontMap = canvasTexture((g, w, h) => {
    g.fillStyle = "#8ebbd4";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f2d48a";
    g.beginPath();
    g.arc(w * 0.74, h * 0.22, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#6d9458";
    g.beginPath();
    g.moveTo(0, h * 0.68);
    g.lineTo(w * 0.34, h * 0.46);
    g.lineTo(w * 0.62, h * 0.74);
    g.lineTo(w, h * 0.52);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    g.fillStyle = "#3d6240";
    g.fillRect(w * 0.16, h * 0.58, 26, h * 0.42);
    g.beginPath();
    g.arc(w * 0.19, h * 0.54, 48, 0, Math.PI * 2);
    g.fill();
  }, 512, 640);

  const backMap = canvasTexture((g, w, h) => {
    g.fillStyle = "#efe6d4";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6e2c22";
    g.font = "bold 280px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("4", w / 2, h / 2 + 10);
  }, 512, 640);

  const edge = new THREE.MeshStandardMaterial({ color: 0xefe6d4, roughness: 0.9 });
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.96, 0.03), [
    edge,
    edge,
    edge,
    edge,
    new THREE.MeshStandardMaterial({ map: backMap, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: frontMap, roughness: 0.9 }),
  ]);
  canvas.position.z = -0.02;
  const frame = addBox(board, 0.96, 1.18, 0.05, 0x2c241c, 0, 0, 0.02);
  frame.material.roughness = 0.7;
  board.add(canvas);
  pivot.add(board);
  tag(pivot, "painting", "額縁");
  scene.add(pivot);
  parts.painting = pivot;
}

function buildClock() {
  const group = new THREE.Group();
  group.position.set(1.85, 2.2, -2.92);
  const faceMap = canvasTexture((g, w, h) => {
    g.fillStyle = "#f7f3ea";
    g.fillRect(0, 0, w, h);
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
    g.strokeStyle = "#2a241c";
    g.lineWidth = 18;
    g.stroke();
    g.fillStyle = "#2a241c";
    g.font = "bold 64px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("12", w / 2, 78);
    g.fillText("3", w - 78, h / 2);
    g.fillText("6", w / 2, h - 72);
    g.fillText("9", 78, h / 2);
    const hand = (turns, length, width) => {
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(turns * Math.PI * 2);
      g.fillRect(-width / 2, -length, width, length);
      g.restore();
    };
    hand(8 / 12, 112, 18);
    hand(0, 168, 8);
    g.beginPath();
    g.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
    g.fill();
  }, 512, 512);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.78),
    new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.85 })
  );
  face.position.z = 0.03;
  addBox(group, 0.9, 0.9, 0.06, 0x241c16, 0, 0, 0);
  group.add(face);
  tag(group, "clock", "時計");
  scene.add(group);
}

function buildWindow() {
  const group = new THREE.Group();
  group.position.set(-3.96, 1.7, -1.2);
  addBox(group, 0.08, 1.15, 0.9, 0x2a241c, 0, 0, 0);
  const glass = addBox(group, 0.02, 0.86, 0.62, 0x16304a, 0.04, 0, 0);
  glass.material.emissive = new THREE.Color(0x1c3e5c);
  glass.material.emissiveIntensity = 0.6;
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf5d76e })
  );
  star.position.set(0.08, 0.16, 0.02);
  group.add(star);
  tag(group, "window", "窓");
  scene.add(group);
}

function buildDesk() {
  const group = new THREE.Group();
  group.position.set(-3.15, 0, 0.45);
  addBox(group, 0.7, 0.08, 1.45, 0x8a5a34, 0, 0.78, 0);
  addBox(group, 0.62, 0.7, 1.28, 0x6b4428, 0, 0.38, 0);
  const drawer = new THREE.Group();
  addBox(drawer, 0.28, 0.22, 0.86, 0x5a3a22, 0, 0, 0);
  addBox(drawer, 0.02, 0.06, 0.12, 0xd8c7a4, 0.14, 0, 0);
  drawer.position.set(0.2, 0.42, 0);
  group.add(drawer);
  tag(group, "drawer", "引き出し");
  scene.add(group);
  parts.drawer = drawer;
}

function buildShelf() {
  const group = new THREE.Group();
  group.position.set(3.72, 0, -0.25);
  addBox(group, 0.38, 2.05, 2.15, 0x5c4030, 0, 1.02, 0);
  const colors = [0xa32020, 0xa32020, 0xa32020, 0xa32020, 0xa32020, 0xa32020, 0x355f86, 0x3f6b45, 0x8a7044, 0xc8bea8];
  colors.forEach((color, index) => {
    const row = index < 6 ? 1.55 : 0.85;
    const column = index < 6 ? index : index - 6;
    const span = index < 6 ? 6 : 4;
    addBox(group, 0.2, 0.42, 0.16, color, -0.16, row, -0.78 + column * (1.55 / span));
  });
  tag(group, "books", "本棚");
  scene.add(group);
}

function buildPlant() {
  const group = new THREE.Group();
  group.position.set(2.75, 0, 2.15);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.16, 0.32, 18),
    new THREE.MeshStandardMaterial({ color: 0x8d4b32, roughness: 0.8 })
  );
  pot.position.y = 0.16;
  group.add(pot);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 })
  );
  leaves.position.y = 0.48;
  group.add(leaves);
  tag(group, "plant", "植木鉢");
  scene.add(group);
}

function blocked(x, z) {
  if (x < -3.55 || x > 3.15 || z < -2.5 || z > 2.5) return true;
  return obstacles.some((box) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ);
}

function tryMove(dx, dz) {
  if (!blocked(player.x + dx, player.z)) player.x += dx;
  if (!blocked(player.x, player.z + dz)) player.z += dz;
}

function uiOpen() {
  return !introEl.hidden || !noteEl.hidden || !keypadEl.hidden || !endingEl.hidden;
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = 3.2;
}

function addClue(id, text) {
  if (state.clues.some((clue) => clue.id === id)) return;
  state.clues.push({ id, text });
  const list = document.getElementById("clues");
  const item = document.createElement("li");
  item.textContent = text;
  list.appendChild(item);
}

function renderDigits() {
  const root = document.getElementById("digits");
  root.replaceChildren();
  state.digits.forEach((digit) => {
    const span = document.createElement("span");
    span.textContent = digit ?? "–";
    if (digit) span.classList.add("known");
    root.appendChild(span);
  });
}

function renderItems() {
  const root = document.getElementById("items");
  root.replaceChildren();
  if (state.hasKey) {
    const span = document.createElement("span");
    span.textContent = "鍵";
    root.appendChild(span);
  }
  if (state.hasNote) {
    const button = document.createElement("button");
    button.id = "memo";
    button.type = "button";
    button.textContent = "メモ";
    button.addEventListener("click", () => {
      noteEl.hidden = false;
    });
    root.appendChild(button);
  }
}

function resolveDigits() {
  const next = [null, null, null, null];
  if (state.seenPainting) next[0] = "4";
  if (state.hasNote && state.clockValue != null) next[1] = String(state.clockValue);
  if (state.hasNote && state.starCount != null) next[2] = String(state.starCount);
  if (state.hasNote && state.bookCount != null) next[3] = String(state.bookCount);
  const completed = next.every(Boolean) && state.digits.some((digit, index) => digit !== next[index]);
  state.digits = next;
  renderDigits();
  if (completed) toast("4桁が揃った。扉のテンキーに入力しよう。");
}

function examine(id) {
  if (id === "painting") {
    state.seenPainting = true;
    anim.painting = 1;
    addClue("painting", "額縁の裏は 4。最初の数字");
    toast("額縁の裏に 4 とある。これが最初の数字だ。");
  } else if (id === "plant") {
    if (!state.hasKey) {
      state.hasKey = true;
      toast("土の中から小さな鍵が出てきた。");
    } else {
      toast("植木鉢には、もう何もない。");
    }
  } else if (id === "drawer") {
    if (!state.hasKey) {
      toast("引き出しには鍵がかかっている。");
      return;
    }
    anim.drawer = 1;
    if (!state.hasNote) {
      state.hasNote = true;
      addClue("note", "メモ: 2番目は短針、3番目は星、最後は赤い本");
      noteEl.hidden = false;
      toast("引き出しからメモが出てきた。");
    } else {
      toast("メモはもう読んだ。");
    }
  } else if (id === "clock") {
    state.clockValue = 8;
    addClue("clock", "時計の短針は 8");
    toast(state.hasNote ? "短針は 8。メモによれば、2番目の数字だ。" : "短針は 8 を指している。どの桁かは、まだ分からない。");
  } else if (id === "window") {
    state.starCount = 1;
    addClue("window", "窓の外の星は 1 つ");
    toast(state.hasNote ? "星は 1 つ。メモによれば、3番目の数字だ。" : "夜空に星が 1 つ見える。どの桁かは、まだ分からない。");
  } else if (id === "books") {
    state.bookCount = 6;
    addClue("books", "赤い本は 6 冊");
    toast(state.hasNote ? "赤い本は 6 冊。メモによれば、最後の数字だ。" : "赤い本は 6 冊ある。どの桁かは、まだ分からない。");
  } else if (id === "door") {
    if (state.escaped) return;
    state.entry = "";
    renderEntry();
    keypadEl.hidden = false;
    return;
  }
  renderItems();
  resolveDigits();
}

function renderEntry() {
  const shown = (state.entry + "----").slice(0, 4).split("");
  entryEl.textContent = shown.map((char) => (char === "-" ? "–" : char)).join(" ");
}

function submitCode() {
  if (state.entry.length < 4) {
    toast("4桁そろえてから決定しよう。");
    return;
  }
  if (state.entry === CODE) {
    keypadEl.hidden = true;
    state.escaped = true;
    anim.door = 1;
    const elapsed = Math.max(0, Math.round((performance.now() - startedAt) / 1000));
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(elapsed % 60).padStart(2, "0");
    document.getElementById("ending-time").textContent = `${minutes}分${seconds}秒で部屋を出た。`;
    window.setTimeout(() => {
      endingEl.hidden = false;
    }, 650);
    return;
  }
  toast("そのコードではない。");
  state.entry = "";
  renderEntry();
  keypadCard.classList.remove("shake");
  void keypadCard.offsetWidth;
  keypadCard.classList.add("shake");
}

function hint() {
  if (!state.started) return "「部屋に入る」を押そう。";
  if (state.escaped) return "もう脱出できている。";
  if (!state.seenPainting) return "南の壁にある額縁を調べよう。";
  if (!state.hasKey) return "部屋の隅の植木鉢が怪しい。";
  if (!state.hasNote) return "鍵で机の引き出しを開けよう。";
  if (state.clockValue == null) return "扉の右にある時計の短い針を見よう。";
  if (state.starCount == null) return "西の窓に見える星を数えよう。";
  if (state.bookCount == null) return "東の本棚で、赤い本だけ数えよう。";
  return "扉を調べて、揃った4桁を入力しよう。";
}

function pickTarget() {
  if (!state.started || uiOpen()) return null;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    if (hit.distance > 3.4) break;
    let node = hit.object;
    while (node) {
      if (node.userData && node.userData.id) return node;
      node = node.parent;
    }
  }
  return null;
}

function highlight(object, on) {
  object.traverse((child) => {
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material || !material.emissive) return;
      if (material.userData.baseEmissive === undefined) {
        material.userData.baseEmissive = material.emissive.getHex();
      }
      material.emissive.set(on ? 0x5a3a1c : material.userData.baseEmissive);
    });
  });
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
}

function updateMove(dt) {
  if (!state.started || uiOpen() || state.escaped) return;
  let forward = 0;
  let strafe = 0;
  if (keys.f || pad.f) forward += 1;
  if (keys.b || pad.b) forward -= 1;
  if (keys.r || pad.r) strafe += 1;
  if (keys.l || pad.l) strafe -= 1;
  if (!forward && !strafe) return;
  const length = Math.hypot(forward, strafe);
  forward /= length;
  strafe /= length;
  const speed = 2.35 * dt;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  tryMove((-sin * forward + cos * strafe) * speed, (-cos * forward - sin * strafe) * speed);
}

function animate() {
  const dt = Math.min(clock3.getDelta(), 0.05);
  updateMove(dt);
  if (parts.painting) {
    parts.painting.rotation.y += ((anim.painting ? 1.2 : 0) - parts.painting.rotation.y) * Math.min(1, dt * 4);
  }
  if (parts.drawer) {
    const openX = anim.drawer ? 0.48 : 0.2;
    parts.drawer.position.x += (openX - parts.drawer.position.x) * Math.min(1, dt * 5);
  }
  if (parts.door) {
    const openYaw = anim.door ? -1.35 : 0;
    parts.door.rotation.y += (openYaw - parts.door.rotation.y) * Math.min(1, dt * 3);
  }

  camera.position.set(player.x, 1.6, player.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const next = pickTarget();
  if (next !== targetId) {
    if (targetId) highlight(targetId, false);
    targetId = next;
    if (targetId) highlight(targetId, true);
  }
  const interactive = Boolean(targetId) && state.started && !uiOpen();
  crosshair.classList.toggle("hot", interactive);
  crosshair.hidden = uiOpen();
  promptEl.textContent = interactive ? `${targetId.userData.label} を調べる  [クリック / E]` : "";

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove("show");
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function bind() {
  const canvas = renderer.domElement;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let originX = 0;
  let originY = 0;

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.started || uiOpen()) return;
    dragging = true;
    moved = false;
    originX = lastX = event.clientX;
    originY = lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (Math.hypot(event.clientX - originX, event.clientY - originY) > 6) moved = true;
    yaw -= dx * 0.0045;
    pitch = Math.max(-1.15, Math.min(1.15, pitch - dy * 0.0045));
  });
  canvas.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    if (!moved && targetId) examine(targetId.userData.id);
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    const move = { KeyW: "f", KeyS: "b", KeyA: "l", KeyD: "r", ArrowUp: "f", ArrowDown: "b", ArrowLeft: "l", ArrowRight: "r" }[event.code];
    if (move) {
      event.preventDefault();
      keys[move] = true;
    }
    if (event.code === "Space") event.preventDefault();
    if (!keypadEl.hidden && event.key >= "0" && event.key <= "9") {
      if (state.entry.length < 4) state.entry += event.key;
      renderEntry();
    } else if (!keypadEl.hidden && event.key === "Backspace") {
      state.entry = state.entry.slice(0, -1);
      renderEntry();
    } else if (!keypadEl.hidden && event.key === "Enter") {
      submitCode();
    } else if (!keypadEl.hidden && event.key === "Escape") {
      keypadEl.hidden = true;
    } else if (event.key === "e" || event.key === "E") {
      if (targetId && state.started && !uiOpen()) examine(targetId.userData.id);
    }
  });
  window.addEventListener("keyup", (event) => {
    const move = { KeyW: "f", KeyS: "b", KeyA: "l", KeyD: "r", ArrowUp: "f", ArrowDown: "b", ArrowLeft: "l", ArrowRight: "r" }[event.code];
    if (move) keys[move] = false;
  });
  window.addEventListener("blur", () => {
    keys.f = keys.b = keys.l = keys.r = false;
  });

  document.querySelectorAll("#pad button").forEach((button) => {
    const dir = button.dataset.move;
    const set = (down) => {
      pad[dir] = down;
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      set(true);
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener("pointerup", () => set(false));
    button.addEventListener("pointercancel", () => set(false));
  });

  document.getElementById("start").addEventListener("click", () => {
    state.started = true;
    startedAt = performance.now();
    introEl.hidden = true;
  });
  document.getElementById("hint").addEventListener("click", () => toast(hint()));
  document.getElementById("note-close").addEventListener("click", () => {
    noteEl.hidden = true;
  });
  document.getElementById("key-close").addEventListener("click", () => {
    keypadEl.hidden = true;
  });
  keypadEl.addEventListener("pointerdown", (event) => {
    if (event.target === keypadEl) keypadEl.hidden = true;
  });
  keypadEl.querySelectorAll("[data-digit]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.entry.length < 4) state.entry += button.dataset.digit;
      renderEntry();
    });
  });
  document.getElementById("key-clear").addEventListener("click", () => {
    state.entry = "";
    renderEntry();
  });
  document.getElementById("key-ok").addEventListener("click", submitCode);
  document.getElementById("replay").addEventListener("click", () => window.location.reload());
  window.addEventListener("resize", resize);
}

buildRoom();
renderDigits();
resize();
bind();
requestAnimationFrame(animate);
