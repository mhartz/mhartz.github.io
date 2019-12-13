import * as THREE from './vendor/three.module.js';
import { DeviceOrientationControls } from './vendor/DeviceOrientationControls.js';

if (window.DeviceOrientationEvent || window.DeviceMotionEvent) {
  alert("Device orit");
}
else {
  alert("not");
}

var camera, scene, renderer, controls;
var isUserInteracting = false,
				onMouseDownMouseX = 0, onMouseDownMouseY = 0,
				lon = 0, onMouseDownLon = 0,
				lat = 0, onMouseDownLat = 0,
        phi = 0, theta = 0;
        
  var container = document.getElementById('container');
  var elementWidth = container.offsetWidth;
  var elementHeight = container.offsetHeight;

init();
animate();

function init() {
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(75, elementWidth / elementHeight, 1, 1100);
  camera.target = new THREE.Vector3(0, 0, 0);
  controls = new DeviceOrientationControls(camera);
  scene = new THREE.Scene();

  var geometry = new THREE.SphereBufferGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1); // invert geometry

  var material = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('assets/images/360Portal_new_5.jpg')
  });

  var mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  /*
      Re-add this when adding interaction points for debugging
  */
  // var helperGeometry = new THREE.BoxBufferGeometry(100, 100, 100, 4, 4, 4);
  // var helperMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
  // var helper = new THREE.Mesh(helperGeometry, helperMaterial);
  // scene.add(helper);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  document.addEventListener('mousedown', onPointerStart, false);
  document.addEventListener('mousemove', onPointerMove, false);
  document.addEventListener('mouseup', onPointerUp, false);

  document.addEventListener('wheel', onDocumentMouseWheel, false);

  document.addEventListener('touchstart', onPointerStart, false);
  document.addEventListener('touchmove', onPointerMove, false);
  document.addEventListener('touchend', onPointerUp, false);

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = elementWidth / elementHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(elementWidth, elementHeight);
}

function onPointerStart(event) {
  isUserInteracting = true;

  var clientX = event.clientX || event.touches[0].clientX;
  var clientY = event.clientY || event.touches[0].clientY;

  onMouseDownMouseX = clientX;
  onMouseDownMouseY = clientY;

  onMouseDownLon = lon;
  onMouseDownLat = lat;
}

function onPointerMove(event) {
  if (isUserInteracting === true) {
    var clientX = event.clientX || event.touches[0].clientX;
    var clientY = event.clientY || event.touches[0].clientY;

    lon = (onMouseDownMouseX - clientX) * 0.1 + onMouseDownLon;
    lat = (clientY - onMouseDownMouseY) * 0.1 + onMouseDownLat;
  }
}

function onPointerUp() {
  isUserInteracting = false;
}

function onDocumentMouseWheel(event) {
  var fov = camera.fov + event.deltaY * 0.05;
  camera.fov = THREE.Math.clamp(fov, 10, 75);
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  update();
}

function update() {
  lat = Math.max(- 85, Math.min(85, lat));
  phi = THREE.Math.degToRad(90 - lat);
  theta = THREE.Math.degToRad(lon);

  camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
  camera.target.y = 500 * Math.cos(phi);
  camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

  camera.lookAt(camera.target);
  renderer.render(scene, camera);
}
