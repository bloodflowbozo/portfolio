import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * createViewer(container, { url, autoRotate, bloom })
 * Returns { load(url), dispose() }.
 */
export function createViewer(
  container,
  { url = null, autoRotate = true, bloom = true } = {},
) {
  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // ---------- scene: dark blue gradient background + studio reflections ----------
  const scene = new THREE.Scene();
  scene.background = null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // key + rim lights on top of the environment
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5f9bff, 2.0);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // ---------- camera + controls ----------
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  camera.position.set(0, 0.4, 3);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 1.2;
  controls.addEventListener('start', () => {
    controls.autoRotate = true;
    syncButtons();
  });

  // ---------- post-processing (bloom makes emissive parts glow) ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(256, 256),
    0.25,
    0.25,
    0.85,
  );
  bloomPass.enabled = bloom;
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // ---------- UI ----------
  const status = el('div', 'nv-status', 'Loading…');
  const bar = el('div', 'nv-bar');
  const btnRotate = button('Rotate', () => {
    controls.autoRotate = !controls.autoRotate;
    syncButtons();
  });
  const btnGlow = button('Glow', () => {
    bloomPass.enabled = !bloomPass.enabled;
    syncButtons();
  });
  const btnWire = button('Wireframe', () => {
    wire = !wire;
    if (model)
      model.traverse((o) => {
        if (o.isMesh)
          [].concat(o.material).forEach((m) => (m.wireframe = wire));
      });
    syncButtons();
  });
  bar.append(btnRotate, btnGlow, btnWire);
  container.append(
    status,
    bar,
    el('div', 'nv-hint', 'Drag to orbit · scroll to zoom · drop a .glb'),
  );
  let wire = false;
  function syncButtons() {
    btnRotate.classList.toggle('on', controls.autoRotate);
    btnGlow.classList.toggle('on', bloomPass.enabled);
    btnWire.classList.toggle('on', wire);
  }
  syncButtons();

  // ---------- model loading ----------
  const loader = new GLTFLoader();
  let model = null;

  function setModel(obj) {
    if (model) scene.remove(model);
    model = obj;
    scene.add(model);
    frameModel(model);
    status.classList.add('hide');
  }

  function load(src) {
    status.classList.remove('hide');
    status.textContent = 'Loading…';
    loader.load(
      src,
      (gltf) => {
        gltf.scene.traverse((o) => {
          if (o.isMesh && o.material) {
            [].concat(o.material).forEach((m) => {
              gltf.scene.traverse((o) => {
                if (o.isMesh && o.material) {
                  [].concat(o.material).forEach((m) => {


                    m.envMapIntensity = 1.2;
                  });
                }
              });
              m.envMapIntensity = 1.2;
              if (m.emissive) {
                m.emissiveIntensity = 1.2;
              }
            });
          }
        });
        setModel(gltf.scene);
      },
      (xhr) => {
        if (xhr.total)
          status.textContent = `Loading ${Math.round((100 * xhr.loaded) / xhr.total)}%`;
      },
      (err) => {
        console.warn('Could not load', src, err);
        setModel(demoModel()); // fall back to a demo object
        status.classList.remove('hide');
        status.textContent =
          'model.glb not found — showing demo (drop a .glb here)';
        setTimeout(() => status.classList.add('hide'), 3500);
      },
    );
  }

  // centre the model at the origin and fit the camera to it
  function frameModel(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 2; //---------------- the last number = the distance
    const dist =
      (maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.7;
    camera.position.set(dist * 0.55, dist * 0.35, dist);
    camera.near = dist / 100;
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = dist * 0.25;
    controls.maxDistance = dist * 4;
    controls.update();
  }

  // drag & drop a .glb onto the viewer
  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && /\.(glb|gltf)$/i.test(f.name)) load(URL.createObjectURL(f));
  });

  // ---------- sizing + loop ----------
  function resize() {
    const w = container.clientWidth,
      h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  });
  io.observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return; // pause when scrolled off-screen
    controls.update();
    composer.render();
  });

  if (url) load(url);
  else setModel(demoModel());

  return {
    load,
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}

// ---------- helpers ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function button(label, onClick) {
  const b = el('button', '', label);
  b.addEventListener('click', onClick);
  return b;
}
function makeGradientTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(180, 120, 20, 256, 256, 380);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// simple demo object: metal ring with a glowing blue core
function demoModel() {
  const g = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.22, 48, 128),
    new THREE.MeshStandardMaterial({
      color: 0x3a3c44,
      metalness: 1,
      roughness: 0.3,
    }),
  );
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.035, 16, 128),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x1e80ff,
      emissiveIntensity: 1.2,
    }),
  );
  g.add(band, glow);
  return g;
}

// ---------- boot ----------
const container = document.getElementById('viewer');
const params = new URLSearchParams(location.search);
createViewer(container, { url: params.get('model') || container.dataset.src });
