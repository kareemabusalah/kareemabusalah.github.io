// 3D viewer for project pages: every <div class="v3d" data-src="…glb"> becomes an orbitable model.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const loader = new GLTFLoader();
document.querySelectorAll('.v3d').forEach(box => {
  const canvas = box.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false});
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefede8);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1e6);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = !(window.KAS_CALM ?? matchMedia('(prefers-reduced-motion: reduce)').matches);
  controls.autoRotateSpeed = 1.2;
  canvas.addEventListener('pointerdown', () => controls.autoRotate = false, {once: true});
  scene.add(new THREE.HemisphereLight(0xeaffea, 0x0a200a, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 1.5);
  scene.add(sun);

  let pixel = true;  // 8-bit look by default; the button switches to full resolution
  const size = () => {
    const w = box.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(pixel ? 0.8 : devicePixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  box.querySelector('.pxbtn').onclick = e => {
    pixel = !pixel;
    canvas.classList.toggle('px', pixel);
    e.target.textContent = pixel ? 'HI-RES' : '8-BIT';
    size();
  };
  new ResizeObserver(size).observe(box);

  loader.load(box.dataset.src, gltf => {
    const model = gltf.scene;
    if ('zup' in box.dataset) model.rotation.x = -Math.PI / 2;  // Onshape/STEP exports are Z-up
    model.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.computeVertexNormals();
      o.material.flatShading = true;
      o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), new THREE.LineBasicMaterial({color: 0x161616})));
    });
    const b = new THREE.Box3().setFromObject(model), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2;
    model.position.sub(c);
    scene.add(model);
    if (box.dataset.mode) wobble(model);
    const k = +box.dataset.zoom || 1;  // data-zoom="1.7" pulls the camera back for wide, flat parts
    camera.position.set(r * 1.15 * k, r * 0.85 * k, r * 1.3 * k);
    camera.near = r / 100; camera.far = r * 100; camera.updateProjectionMatrix();
    box.classList.add('ready');
  }, undefined, () => box.querySelector('.vload').textContent = 'MODEL FAILED TO LOAD');

  // data-mode="x,y,L": animate the first bending mode about the free node at (x, y), edge length L, in model units.
  // The two beams into that node bend as cantilevers (static tip-load shape); everything past one edge length stays put.
  let wob = null, on = false, t0 = 0;
  function wobble(model) {
    const [fx, fy, L] = box.dataset.mode.split(',').map(Number), rigid = L * 0.08;
    wob = [];
    model.traverse(o => {
      if (!o.isMesh && !o.isLineSegments) return;
      const a = o.geometry.attributes.position, idx = [], w = [], z0 = [];
      for (let i = 0; i < a.count; i++) {
        const s = Math.min(1, (L - Math.hypot(a.getX(i) - fx, a.getY(i) - fy)) / (L - rigid));
        if (s > 0) { idx.push(i); w.push(s * s * (3 - s) / 2); z0.push(a.getZ(i)); }
      }
      if (idx.length) wob.push({a, idx, w, z0});
    });
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pxbtn modebtn'; btn.textContent = '▶ MODE 1';
    btn.onclick = () => {
      on = !on; t0 = performance.now();
      btn.textContent = on ? '■ 27.6 Hz' : '▶ MODE 1';
      if (!on) bend(0);
    };
    box.append(btn);
  }
  const bend = k => wob.forEach(({a, idx, w, z0}) => {
    idx.forEach((i, j) => a.setZ(i, z0[j] + k * w[j]));
    a.needsUpdate = true;
  });
  const amp = () => +box.dataset.mode.split(',')[2] * 0.2;  // exaggerated: the real tip motion is far smaller

  renderer.setAnimationLoop(() => {
    if (on) bend(amp() * Math.sin((performance.now() - t0) / 1000 * 2 * Math.PI));  // slowed from 27.6 Hz to 1 Hz
    controls.update(); renderer.render(scene, camera);
  });
});
