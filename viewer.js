// 3D viewer for project pages: every <div class="v3d" data-src="…glb"> becomes an orbitable model.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const loader = new GLTFLoader();
document.querySelectorAll('.v3d').forEach(box => {
  const canvas = box.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false});
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040f);
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
    renderer.setPixelRatio(pixel ? 0.4 : devicePixelRatio);
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
      o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), new THREE.LineBasicMaterial({color: 0x7ee8ff})));
    });
    const b = new THREE.Box3().setFromObject(model), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2;
    model.position.sub(c);
    scene.add(model);
    camera.position.set(r * 1.15, r * 0.85, r * 1.3);
    camera.near = r / 100; camera.far = r * 100; camera.updateProjectionMatrix();
    box.classList.add('ready');
  }, undefined, () => box.querySelector('.vload').textContent = 'MODEL FAILED TO LOAD');

  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
});
