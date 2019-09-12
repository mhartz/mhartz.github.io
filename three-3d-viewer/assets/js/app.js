var container;
var camera, controls, scene, renderer;
var lighting, ambient, keyLight, fillLight, backLight;
init();
animate();
function init() {
	container = document.getElementById('container');
	var elementWidth = container.offsetWidth;
	var elementHeight = elementWidth * 1.5;
	document.body.appendChild(container);
	/* Camera */
	camera = new THREE.PerspectiveCamera(45, elementWidth / elementHeight, 1, 1000);
	camera.position.z = 3;
	/* Scene */
	scene = new THREE.Scene();
	// lighting = false;
	// ambient = new THREE.AmbientLight(0xffffff, 1.0);
	// scene.add(ambient);
	// keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
	// keyLight.position.set(-100, 0, 100);
	// fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
	// fillLight.position.set(100, 0, 100);
	// backLight = new THREE.DirectionalLight(0xffffff, 1.0);
	// backLight.position.set(100, 0, -100).normalize();
	// ambient.intensity = 0.05;
	// scene.add(keyLight);
	// scene.add(fillLight);
	// scene.add(backLight);
	/* Model */
	// var loader = new THREE.GLTFLoader();

	// loader.load(
  //   'assets/models/fridge/fridge.gltf',
  //   function (gltf) {
  //     // object.scale.y = 140;
  //     // object.scale.x = 140;
	// 		// object.scale.z = 140;
	// 		scene.add(gltf);
	// 		// gltf.animations; // Array<THREE.AnimationClip>
	// 		// gltf.scene; // THREE.Scene
	// 		// gltf.scenes; // Array<THREE.Scene>
	// 		// gltf.cameras; // Array<THREE.Camera>
	// 		// gltf.asset; // Object
	// 		gltf.position.set(50, 0, 50);
	// 		camera.position.set(500, 500, 100).add(object.position.clone());
	// 		controls.target = object.position.clone();
  //   },
  //   function (xhr) {
  //     console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  //   },
  //   function (error) {
  //     console.log('An error happened: ' + error );
  //   }
	// );
	const planeSize = 40;
	const loader = new THREE.TextureLoader();
	const texture = loader.load('assets/models/fridge/DefaultMaterial_baseColor.png');
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.magFilter = THREE.NearestFilter;
	const repeats = planeSize / 2;
	texture.repeat.set(repeats, repeats);

	const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
	const planeMat = new THREE.MeshPhongMaterial({
		map: texture,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(planeGeo, planeMat);
	mesh.rotation.x = Math.PI * -.5;
	scene.add(mesh);
	
	const gltfLoader = new THREE.GLTFLoader();
  const url = 'assets/models/fridge/fridge.gltf';
  gltfLoader.load(url, (gltf) => {
    const root = gltf.scene;
		scene.add(root);
		camera.position.set(500, 500, 100).add(gltf.position.clone());
		console.log(dumpObject(root).join('\n'));
  });
	/* Renderer */
	renderer = new THREE.WebGLRenderer({ alpha: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(elementWidth, elementHeight);
	renderer.setClearColor(0x000000, 0);
	container.appendChild(renderer.domElement);
	setupLights();
	/* Controls */
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.enableZoom = false;
	controls.enablePan = false;
	/* Events */
	// window.addEventListener('resize', onWindowResize, false);
}
function setupLights() {
	light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
	shadowLight = new THREE.DirectionalLight(0xffffff, 0.3);
	shadowLight.position.set(100, 100, 800/2);
	shadowLight.castShadow = true;
	shadowLight.shadowDarkness = 0.2;
	backLight = new THREE.DirectionalLight(0xffffff, 5.1);
	backLight.position.set(100, 200, 50);
	backLight.shadowDarkness = 0.1;
	scene.add(backLight, shadowLight, light);
}
// function onWindowResize() {
// 	camera.aspect = elementWidth / elementHeight;
// 	camera.updateProjectionMatrix();
// 	renderer.setSize(elementWidth, elementHeight);
// }
function animate() {
	requestAnimationFrame(animate);
	controls.update();
	render();
}
function render() {
	renderer.render(scene, camera);
}
function dumpObject(obj, lines = [], isLast = true, prefix = '') {
  const localPrefix = isLast ? '└─' : '├─';
  lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
  const newPrefix = prefix + (isLast ? '  ' : '│ ');
  const lastNdx = obj.children.length - 1;
  obj.children.forEach((child, ndx) => {
    const isLast = ndx === lastNdx;
    dumpObject(child, lines, isLast, newPrefix);
  });
  return lines;
}