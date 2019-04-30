var scene, camera, renderer, width, height, controls,
	light, shadowLight, backLight, composer, stats,
	earth, bedrock, streets, building, heightmap, 
	carSpawner, trainSpawner, geom, mesh, trunk, composer, 
	bridges, leaves, leaves2, tree, material, curb,
	colors, city, _city, inputs, i, j, watermap, water;

//=========================================
// SETTINGS
//=========================================
var DEBUG = false;

var shader = {
	'outline': {
		vertex_shader: [
            "uniform float offset;",
            "void main() {",
                "vec4 pos = modelViewMatrix * vec4( position + normal * offset, 1.0 );",
                "gl_Position = projectionMatrix * pos;",
            "}"
        ].join("\n"),
		fragment_shader: [
			"uniform vec3 glowColor;",
            "void main(){",
                "gl_FragColor = vec4( glowColor, 1.0 );",
            "}"
        ].join("\n")
	}
};

const buildingColors = [
  0xE8E8E8,
  0xaed581,
  0xffd54f,
  0xa1887f,
  0xbdbdbd,
  0x90a4ae
];

colors = {
	BUILDING: buildingColors,
	GROUND: 0x81A377,
	TREE: 0x216E41,
	WHITE: 0xffffff,
	BLACK: 0x000000,
	DARK_BROWN: 0x545247,
	LIGHT_BROWN: 0x736B5C,
	GREY: 0x999999,
	WATER: 0x4B95DE,
	TRAIN: 0x444444,
	CARS:[
		0xCC4E4E
	]
};
//basic city options
city = {
	//height of bedrock layer
	base: 40,
	//depth of the water and earth layers
	water_height: 20,
	//block size (w&l)
	block: 100, 
	//num blocks x
	blocks_x: 10,
	//num blocks z
	blocks_z: 10,
	//road width
	road_w: 16,
	//curb height
	curb_h: 2,
	//block slices
	subdiv: 2, 
	//sidewalk width
	inner_block_margin: 5,
	//max building height
	build_max_h: 300,
	//min building height
	build_min_h: 20,
	//deviation for height within block
	block_h_dev: 10,
	//exponent of height increase 
	build_exp: 6,
	//chance of blocks being water
	water_threshold: 0.1, 
	//chance of block containg trees
	tree_threshold: 0.2,
	//max trees per block
	tree_max: 20,
	//max bridges
	bridge_max: 1,
	//beight heaight
	bridge_h: 25,
	//max cars at one time
	car_max: 10,
	//train max
	train_max: 1,
	//maximum car speed
	car_speed_min: 2,
	//minimum car speed
	car_speed_max: 3,
	//train speed
	train_speed: 4,
	//noise factor, increase for smoother noise
	noise_frequency: 8,
	//seed for generating noise
	//seed: Math.random()
	seed: Math.random()
};
city.width = city.block * city.blocks_x;
city.length = city.block * city.blocks_z;
//store default options
_city = _.clone(city);
//map html input fields to city object values
inputs = [
	{field: "block_count", setting: "blocks_x"},
	{field: "block_count", setting: "blocks_z"},
	{field: "block_size", setting: "block"},
	{field: "subdiv", setting: "subdiv"},
	{field: "build_max_h", setting: "build_max_h"},
	{field: "build_min_h", setting: "build_min_h", },
	{field: "water_threshold", setting: "water_threshold"},
	{field: "tree_threshold", setting: "tree_threshold"},
	{field: "noise_frequency", setting: "noise_frequency"},
	{field: "max_cars", setting: "car_max"},
	{field: "build_exp", setting: "build_exp"},
];

//=========================================
// SETUP
//=========================================
//create scene, renderer, and camera
function setupScene() {
	width = window.innerWidth;
	height = window.innerHeight;
	var ratio = width / height;
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer({alpha: true,antialias: true, premultipliedAlpha: false });
	renderer.setSize(width, height);
	renderer.shadowMapEnabled = true;
	renderer.shadowMapType = THREE.PCFSoftShadowMap;
	document.body.appendChild(renderer.domElement);
	camera = new THREE.PerspectiveCamera( 60, ratio, 1, 4000);
	camera.position.set(500, 500, 500);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.maxPolarAngle = Math.PI/2;
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	if(DEBUG) document.body.appendChild( stats.domElement );
  window.addEventListener('resize', resize, false);
  var loader = new THREE.OBJLoader();

  loader.load(
    'assets/models/aegon-center.obj',
    function (object) {
      object.scale.y = 100;
      object.scale.x = 100;
      object.scale.z = 100;
      scene.add(object);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.log('An error happened: ' + error );
    }
  );
}
//window resize event
function resize() {
	width = window.innerWidth;
	height = window.innerHeight;
	renderer.setSize(width, height);
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
}
//create lights
function setupLights() {
	light = new THREE.HemisphereLight(colors.WHITE, colors.WHITE, 0.5);
	shadowLight = new THREE.DirectionalLight(colors.WHITE, 0.3);
	shadowLight.position.set(city.width/2, 800, city.length/2);
	//debug mesh at light location
	if(DEBUG)(scene.add(getBoxMesh(colors.WHITE, 20, 20, 20, city.width/2, 800, city.length/2, false)));
	shadowLight.castShadow = true;
	shadowLight.shadowDarkness = 0.2;
	backLight = new THREE.DirectionalLight(colors.WHITE, 0.1);
	backLight.position.set(-100, 200, 50);
	backLight.shadowDarkness = 0.1;
	scene.add(backLight, shadowLight, light);
}
//generate normalized hightmap array from perlin noise
function setupHeightmap(){
	noise.seed(city.seed);
	//the heightmap and watermap are different to 
	//allow for different frequency levels for buildings and water
	heightmap = [];
	watermap = [];
	//build the hightmap array from the perlin noise
	for (i = 0; i < city.blocks_x; i++) {		
		for (j = 0; j < city.blocks_z; j++) {	
			heightmap.push(getNoiseValue(i, j));
			watermap.push(getNoiseValue(i, j, 10));
		}
	}
	// normalize and convert to 2d array
	heightmap = normalizeArray(heightmap);
	heightmap = _.chunk(heightmap, city.blocks_x);
			
	watermap = normalizeArray(watermap);
	watermap = _.map(watermap, function(n){ return n>=city.water_threshold ? 1 : 0; });
	watermap = _.chunk(watermap, city.blocks_x);
}
//create ground meshes
function setupGround() {
	var street_h = city.curb_h*2;
	var earth_meshes = [];
	var street_meshes = [];
	//lowest ground Layer
	bedrock = getBoxMesh(colors.LIGHT_BROWN, city.width, city.base, city.length);
	bedrock.position.y = (-(city.base/2) - city.water_height - street_h); 
	bedrock.receiveShadow = false;	
	//water layer
	water = getWaterMesh(city.width-2, city.water_height, city.length-2);
	water.position.y = -(city.water_height/2) - street_h; 

	for(i=0;i<watermap.length;i++){
		for(j=0;j<watermap[0].length;j++){
			if(watermap[i][j]){
				var x = ((city.block*i) + city.block/2) - city.width/2;
				var z = ((city.block*j) + city.block/2) - city.length/2;
				earth_meshes.push(getBoxMesh(colors.DARK_BROWN, city.block, city.water_height, city.block, x, (-(city.water_height/2) - street_h), z));
				street_meshes.push(getBoxMesh(colors.GREY, city.block, street_h, city.block, x, -(street_h/2), z));
			}
		}	
	}
	
	if(street_meshes.length){ scene.add(mergeMeshes(street_meshes)); }
	if(earth_meshes.length){ scene.add(mergeMeshes(earth_meshes, false)); }
	scene.add(bedrock, water);
}
//setup a single block
function setupBlocks(){
	for (var i = 0; i < city.blocks_x; i++) {		
		for (var j = 0; j < city.blocks_z; j++) {	
			if(watermap[i][j]){
				//var p = getPointVectorFromMap(i, j);
				var x = ((city.block*i) + city.block/2) - city.width/2;
				var z = ((city.block*j) + city.block/2) - city.length/2;
				//get values from heightmap array
				var hm = heightmap[i][j];
				//get building height for block 
				var h = mapToRange(hm, city.build_min_h, city.build_max_h, city.build_exp);
				//max possible distance from center of block
				var w = city.block-city.road_w;
				//with inner block margins
				var inner = w-(city.inner_block_margin*2);
				//create curb mesh
				var curb_color = DEBUG ? getGreyscaleColor(hm) : colors.GROUND;
				curb = getBoxMesh(curb_color, w, city.curb_h, w);
				curb.position.set(x, city.curb_h/2, z);
				scene.add(curb);	
				
				//create buildings in debug mode the building color is mapped to the hightmap
				if(hm > city.tree_threshold) { 
					var building_color = DEBUG ? getGreyscaleColor(hm) : colors.BUILDING;
					setupBuildings(x, z, inner, inner,  h, city.subdiv, building_color); 
				}
				//create tree meshes
				else{ setupPark(x, z, inner, inner); }
			}
		}
	}
}
//create park 
function setupPark(x, z, w, l){
	var trees =  [];
	for(var i=0; i<getRandInt(0, city.tree_max);i++){
		var tree_x = getRandInt(x-w/2, x+w/2);
		var tree_z = getRandInt(z-l/2, z+l/2);
		trees.push(new Tree(tree_x, tree_z).group);
	}
	//merge trees for this block into single mesh
	if(trees.length) scene.add(mergeMeshes(trees));
}
//recursively create buildings return array of meshes
function setupBuildings(x, z, w, l, h, sub, color, buildings, cb){
	var offset, half, between;
	//array of buildings for this block
	buildings = buildings || [];
	var depth = Math.pow(2, city.subdiv);
	var tall = Math.round((h/city.build_max_h)*100) > 90;
	var slice_deviation = 15;
	//really tall buildings take the whole block
	if(sub<1 || tall){
		building = new Building({
			h: getRandInt(h-city.block_h_dev, h+city.block_h_dev),
			w: w, 
			l: l,
			x: x,
			z: z,
			tall:tall,
			color: color
		});
		buildings.push(building.group);
		//add all buildings in this block to scene as a single mesh
		if(buildings.length >= depth || tall){
			scene.add(mergeMeshes(buildings));
		}
	}
	else{
		//recursively slice the block until num of subdivisions met
		//TODO: simplify this
		var dir = (w==l) ? chance(50) : w>l;
		if(dir){
			offset = Math.abs(getRandInt(0, slice_deviation));
			between = (city.inner_block_margin/2);
			half = w/2;
			var x_prime = x + offset; 
			var w1 = Math.abs((x+half)-x_prime) - between;
			var w2 = Math.abs((x-half)-x_prime) - between;
			var x1 = x_prime + (w1/2) + between;
			var x2 = x_prime - (w2/2) - between;
			setupBuildings(x1, z, w1, l, h, sub-1, color, buildings);
			setupBuildings(x2, z, w2, l, h, sub-1, color, buildings);
		}
		else{
			offset = Math.abs(getRandInt(0, slice_deviation));
			between = (city.inner_block_margin/2);
			half = l/2;
			var z_prime = z + offset; 
			var l1 = Math.abs((z+half)-z_prime) - between;
			var l2 = Math.abs((z-half)-z_prime) - between;
			var z1 = z_prime + (l1/2) + between;
			var z2 = z_prime - (l2/2) - between;
			setupBuildings(x, z1, w, l1, h, sub-1, color, buildings);
			setupBuildings(x, z2, w, l2, h, sub-1, color, buildings);
		}
	}
}
//create bridges
function setupBridges(){
	bridges = _.shuffle(getEmptyRows()).splice(0, city.bridge_max);	
	var parts = [];
	for(var i=0;i<bridges.length;i++){
		var lx = getCoordinateFromIndex(bridges[i].index, city.width);
		var lz = getCoordinateFromIndex(bridges[i].index, city.length);
		parts.push(getBoxMeshOpts({
			color: colors.BUILDING,
			w: bridges[i].axis ? city.width : city.road_w,
			l: bridges[i].axis ? city.road_w : city.length,
			h: 4,
			y: city.bridge_h+2,
			x: bridges[i].axis ? 0 : lx,
			z: bridges[i].axis ? lz : 0
		}));
		//columns
		for(var j=0;j<(bridges[i].axis ? city.blocks_x : city.blocks_z);j++){
			var h = city.bridge_h+(city.curb_h*2)+(city.water_height);
			parts.push(getBoxMeshOpts({
				color: colors.BUILDING,
				w: 10,
				l: 10,
				h: h,
				y: -((city.curb_h*2)+(city.water_height))+(h/2),
				x: bridges[i].axis ? getCoordinateFromIndex(j, city.width) : lx,
				z: bridges[i].axis ? lz : getCoordinateFromIndex(j, city.length)
			}));
		}
	}
	if(parts.length) scene.add(mergeMeshes(parts));
}

function setupPost(){
	composer = new THREE.EffectComposer( renderer );
	var outline_pass = new THREE.RenderPass( effect_scene, camera );
	var scene_pass = new THREE.RenderPass( scene, camera );
	scene_pass.clear = false;

	var rgb_pass = new THREE.ShaderPass( THREE.RGBShiftShader );
	rgb_pass.uniforms[ 'amount' ].value = 0.0015;

	var line_pass = new THREE.ShaderPass( THREE.FilmShader );
	line_pass.uniforms[ 'grayscale' ].value = 0;
	line_pass.uniforms[ "sCount" ].value = 800;
	line_pass.uniforms[ "sIntensity" ].value = 0.9;
	line_pass.uniforms[ "nIntensity" ].value = 0.4;

	var fxaa_pass = new THREE.ShaderPass( THREE.FXAAShader );
	fxaa_pass.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	fxaa_pass.renderToScreen = true;

	composer.addPass( outline_pass );
	composer.addPass( scene_pass );
	composer.addPass( rgb_pass );
	composer.addPass( line_pass );
	composer.addPass( fxaa_pass );
}
//=========================================
// OBJECTS
//=========================================
var Building = function(opts) {
	this.parts = [];
	//50% chance of building having a rim.
	var rim = getRandInt(3,5);
	var inset = getRandInt(2,4);
	var rim_opts = {
		color: opts.color,
		h: rim,
		y: opts.h + (rim/2) + city.curb_h,
		shadow: false
	};
	//building core
	this.parts.push(getBoxMeshOpts({
		color: opts.color,
		w: opts.w,
		h: opts.h,
		l: opts.l,
		x: opts.x,
		y: (opts.h/2)+city.curb_h,
		z: opts.z,
		shadow: true
	}));
	//draw rim on top of some buildings
	if(chance(50)){
		this.parts.push(getBoxMeshOpts(_.assign(rim_opts, {
			w: opts.w,
			l: inset,
			x: opts.x,
			z: opts.z - (opts.l/2 - inset/2)
		})));
		this.parts.push(getBoxMeshOpts(_.assign(rim_opts, {
			w: opts.w,
			l: inset,
			x: opts.x,
			z: opts.z + (opts.l/2 - inset/2)
		})));
		this.parts.push(getBoxMeshOpts(_.assign(rim_opts, {
			w: inset,
			l: opts.l-(inset*2),
			x: opts.x - (opts.w/2 - inset/2),
			z: opts.z
		})));
		this.parts.push(getBoxMeshOpts(_.assign(rim_opts, {
			w: inset,
			l: opts.l-(inset*2),
			x: opts.x + (opts.w/2 - inset/2),
			z: opts.z
		})));		
	}
	//additional details
	if(chance(50)){
		this.parts.push(getBoxMeshOpts(_.assign(rim_opts, {
			w: getRandInt(opts.w/4, opts.w/2),
			l: getRandInt(opts.l/4, opts.l/2),
			x: opts.x - (5*randDir()),
			z: opts.z - (5*randDir())
		})));
	}
	//antenna only on tall buildings
	if(chance(25) && opts.tall){
		this.parts.push(getBoxMeshOpts(_.assign(rim_opts, {
			w: 3,
			l: 3,
			x: opts.x - (5*randDir()),
			z: opts.z - (5*randDir()),
			h: getRandInt(city.build_max_h/5, city.build_max_h/3)
		})));
	}
	if(chance(25) && opts.tall){
		var top = getBoxMeshOpts(_.assign(rim_opts, {
			w: opts.w - (opts.w/3),
			l: opts.w - (opts.w/3),
			x: opts.x,
			z: opts.z,
			h: getRandInt(15, 30)
		}));
		top.castShadow = false;
		this.parts.push(top);
	}
	//merged mesh
	var merged = mergeMeshes(this.parts);
	this.group = merged;
};

var Tree = function(x, z){
	this.parts = [];
	var h = getRandInt(2, 4);
	trunk = getBoxMesh(colors.LIGHT_BROWN, 2, h, 2, x, h/2+city.curb_h, z);
	leaves = getCylinderMesh(colors.TREE, 5, 10, 0,  x, h+5+city.curb_h, z);
	leaves2 = getCylinderMesh(colors.TREE, 5, 10, 0,  x, leaves.position.y+5, z);
	leaves.rotation.y = Math.random();
	this.parts.push(leaves, leaves2, trunk);
	this.group = mergeMeshes(this.parts);
};

var Intersection = function(x, z){
	this.axis = Math.round(Math.random());
	this.change = function(){
		this.axis = this.axis ? 0 : 1;
	};
};

var Car = function(x, z, dx, dz){
	this.speed = Math.random() * (city.car_speed_min - city.car_speed_max) + city.car_speed_min;
	this.color = colors.CARS[getRandInt(0, colors.CARS.length)];
	this.mesh = getBoxMesh(this.color, 4, DEBUG ? 30 : 3, 9, x, 3, z, false);
	this.arrived_threshold = 2;
	this.collide_threshold = 2;
	
	this.dir = randDir();
	this.lane_offset = this.dir * city.road_w/4;
	
	this.axis = Math.round(Math.random());
	
	if(this.axis){
		this.mesh.rotation.y = Math.PI/2;
		z = z - this.lane_offset;
		x = -(this.dir * (city.width/2));
	}
	else{
		x = x - this.lane_offset;
		z = -(this.dir * (city.width/2));
	}
	
	this.mesh.position.set(x, DEBUG ? 20 : 3 , z);

	this.drive = function(){
		this.checkCollision();
		if(this.axis){
			this.mesh.position.x += (this.dir * this.speed);
		}
		else{
			this.mesh.position.z += (this.dir * this.speed);
		}
	};
	
	this.arrived = function(){
		var out = outsideCity(this.mesh.position.x, this.mesh.position.z);
		return out ||
			((this.mesh.position.x < (dx + this.arrived_threshold)) &&
			(this.mesh.position.x > (dx - this.arrived_threshold)) &&
			(this.mesh.position.z < (dz + this.arrived_threshold)) &&
			(this.mesh.position.z > (dz - this.arrived_threshold)));
	};
	
	this.checkCollision = function(){
		
	};
};

var Train = function(bridge){
	var parts = [];
	this.dir = randDir();
	this.carriages = 4;
	this.carriage_length = 30;
	this.carriage_offset = 5;
	this.arrived_threshold = 2;
	this.color = colors.TRAIN;
	this.speed = city.train_speed;
	
	var x = bridge.axis ? -(this.dir * (city.width/2)) : getCoordinateFromIndex(bridge.index, city.width);
	var z = bridge.axis ? getCoordinateFromIndex(bridge.index, city.length) : -(this.dir * (city.length/2));	
	
	for(var i=0;i<this.carriages;i++){
		var y = (this.carriage_length*i + this.carriage_offset*i);
		parts.push(getBoxMesh(this.color, 6, 6, this.carriage_length, 0, 0, y, false));	
	}
	
	this.mesh = mergeMeshes(parts);
	this.mesh.rotation.y = (Math.PI/2)*bridge.axis;
	this.mesh.position.set(x, city.bridge_h+8, z);

	this.drive = function(){
		this.mesh.position.x += bridge.axis ? (this.dir * this.speed) : 0;
		this.mesh.position.z += bridge.axis ? 0 : (this.dir * this.speed);
	};
	
	this.arrived = function(){
		return outsideCity(this.mesh.position.x, this.mesh.position.z);
	};
};

var CarSpawner = function(){
	this.cars = [];
	this.locked = false;
	this.max_add_rate = 300;
	
	this.add = function(){
		var self = this;
		self.locked = true;
		//get random x and z on a road
		var rand_x = city.block * getRandInt((-city.blocks_x/2+1), city.blocks_x/2);
		var rand_z = city.block * getRandInt((-city.blocks_z/2+1), city.blocks_z/2);
		var car = new Car(rand_x, rand_z);
		self.cars.push(car);
		scene.add(car.mesh);
		setTimeout(function(){ self.locked = false; }, self.max_add_rate);
	};
	
	this.update = function(){
		var self = this;		
		//add cars
		if((self.cars.length < city.car_max) && !self.locked){
			self.add();
		}
		
		self.cars.forEach(function(car){
			//remove from car array
			if(car.arrived()){
				_.pull(self.cars, car);
				scene.remove(car.mesh);
			}
			//update car positions
			else{
				car.drive();
			}
		});
	};
};

var TrainSpawner = function(){
	this.trains = [];
	this.locked = false;
	
	this.add = function(){
		var self = this;
		var b = bridges[getRandInt(0, bridges.length)];
		var train = new Train(b);
		self.trains.push(train);
		scene.add(train.mesh);
		self.locked = false;
	};
	
	this.update = function(){
		var self = this;		
		//add trains
		if((self.trains.length < city.train_max) && !self.locked){
			self.locked = true;
			setTimeout(function(){ self.add(); }, getRandInt(1000, 3000));
		}
		self.trains.forEach(function(train){
			//remove from train array
			if(train.arrived()){
				_.pull(self.trains, train);
				scene.remove(train.mesh);
			}
			//update train positions
			else{
				train.drive();
			}
		});
	};
};
		
//=========================================
// HELPER FUNCTIONS
//=========================================
//get a numerical value to represent a string
function encode(string) {
    var number = "0x";
    var length = string.length;
    for (var i = 0; i < length; i++)
        number += string.charCodeAt(i).toString(16);
    return number;
}
//get a string value to represent a number
function decode(number) {
    var string = "";
    number = number.slice(2);
    var length = number.length;
    for (var i = 0; i < length;) {
        var code = number.slice(i, i += 2);
        string += String.fromCharCode(parseInt(code, 16));
    }
    return string;
}
//get query string values
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
//map val (0-1) to a range with optional weight
function mapToRange(val, min, max, exp){
	exp = exp || 1;
	var weighted = Math.pow(val, exp);
	//make the highest little higher
	if (val >= 0.9) weighted = val;
	var num = Math.floor(weighted * (max - min)) + min;
	return num;
}
//get a random in in range
function getRandInt(min, max, exp) {
	return mapToRange(Math.random(), min, max, exp);
}
//map value from 0-1 to a luminosity
function getGreyscaleColor(val) {
	return new THREE.Color().setHSL(0, 0, val);
}
//get values from noise map
function getNoiseValue(x, z, freq) {
	freq = freq || city.noise_frequency;
	var value = Math.abs(noise.perlin2(x/freq, z/freq));
	return value;
}
//is a point outside the city bounds
function outsideCity(x, z) {
	return (Math.abs(x) > city.width/2) ||
		(Math.abs(z) > city.length/2);
}
//get x,z from index
function getCoordinateFromIndex(index, offset) {
	return (-(offset/2) + (index * city.block)) + (city.block/2);
}
//get rows or columns with no buildings
function getEmptyRows() {
	var i, low, lri, lci, empty = [];
	//loop through rows
	for(i=0; i<heightmap.length;i++){
		var row = heightmap[i];
		// low = (low < _.sum(row)) ? low : _.sum(row);
		//all values in row are under tree threshold
		row = _.reject(row, function(n) { return n < city.tree_threshold; });
		if(!row.length){
			empty.push({axis: 0, index: i});
		}
	}
	//loop through columns
	for(i=0; i<heightmap[0].length;i++){
		var col = _.map(heightmap, function(row){ return row[i]; });
		col = _.reject(col, function(n) { return n < city.tree_threshold; });
		if(!col.length){
			empty.push({axis: 1, index: i});
		}
	}
	return empty;
}
//normalize array values to 0-1
function normalizeArray(arr) {
	var min = Math.min.apply(null, arr);
   var max = Math.max.apply(null, arr);
	return arr.map(function(num) {
		return ((num-min)/(max-min));
	});
}
//carete a box mesh with a geometry and material
function getBoxMesh(color, w, h, l, x, y, z, shadow) {
	shadow = (typeof shadow === "undefined") ? true : shadow;
	material = new THREE.MeshLambertMaterial({ color: color});	
	geom = new THREE.BoxGeometry(w, h, l);
	mesh = new THREE.Mesh(geom, material);
	mesh.position.set(x || 0, y || 0, z || 0);
	mesh.receiveShadow = true;
	if(shadow){
		mesh.castShadow = true;
	}
	return mesh;
}
//carete a box mesh with a geometry and material
function getBoxMeshOpts(options) {
	var o=options||{};
	return getBoxMesh(o.color, o.w, o.h, o.l, o.x, o.y, o.z, o.shadow);
}
//water mesh
function getWaterMesh(w, h, l, x, y, z) {
	material = new THREE.MeshPhongMaterial({color:colors.WATER, transparent: true, opacity: 0.6 } );
	geom = new THREE.BoxGeometry(w, h, l);
	mesh = new THREE.Mesh(geom, material);
	mesh.position.set(x || 0, y || 0, z || 0);
	mesh.receiveShadow = false;
	mesh.castShadow = false;
	return mesh; 
}
//carete a cylinder mesh with a geometry and material
function getCylinderMesh(color, rb, h, rt, x, y, z) {
	var material = new THREE.MeshLambertMaterial({ color: color});	
	var geom = new THREE.CylinderGeometry( rt, rb, h, 4, 1 );
	var mesh = new THREE.Mesh(geom, material);
	mesh.rotation.y = Math.PI/4;
	mesh.position.set(x || 0, y || 0, z || 0);
	mesh.receiveShadow = true;
	mesh.castShadow = true;
	return mesh;
}
//carete a cylinder mesh with a geometry and material
function getCylinderMeshOpts(options) {
	var o = options || {};
	return getCylinderMesh(o.color, o.rb, o.h, o.rt, o.x, o.y, o.z);
}
//returns true percent of the time
function chance(percent){
	return (Math.random() < percent/100.0);
}
//return 1 or -1
function randDir(){
	return Math.round(Math.random()) * 2 - 1;
}
//pythagorean theorem, return c
function pathag(a, b){
	return Math.sqrt(Math.pow(a, 2)+Math.pow(b, 2));
}
//merge geometries of meshes
function mergeMeshes (meshes, shadows, material) {
	shadow = (typeof shadow === "undefined") ? true : shadow;
	material = material || meshes[0].material;
	var combined = new THREE.Geometry();
	for (var i = 0; i < meshes.length; i++) {
		meshes[i].updateMatrix();
		combined.merge(meshes[i].geometry, meshes[i].matrix);
	}
	var mesh = new THREE.Mesh(combined, material);
	if(shadows){
		mesh.castShadow = true;
		mesh.receiveShadow = true;
	}
	return mesh;
}
//get the initial city settings
function getInitialSettings(){
	var loaded = getParameterByName("city");
	if(loaded){
		city = JSON.parse(decodeURIComponent(loaded));
	}
	//set the initial values for dom input fields
	for(var i=0; i<inputs.length; i++){
		document.getElementById(inputs[i].field).value = city[inputs[i].setting];
	}
}
//update city opject with values from input fields
function updateCityOptions(){
	for(var i=0; i<inputs.length; i++){
		var el = document.getElementById(inputs[i].field);
		var type = el.getAttribute("type"); 
		if(el.value){ 
			city[inputs[i].setting] = (type=="number"||type=="range") ? Number(el.value) : el.value; 
		}
	}
	city.width = city.block * city.blocks_x;
	city.length = city.block * city.blocks_z;
	
	city.seed = document.getElementById("preserve_seed").checked ? city.seed : Math.random();
	DEBUG = document.getElementById("debug").checked;
	//city.seed = seed.value ? encode(seed.value) : Math.random();
	//city.seed = Math.random();
	//document.getElementById("current_seed").value = city.seed;
	return city;
}
//reset the city options to the default values
function resetCityOptions(){
	city = _.clone(_city);
	for(var i=0; i<inputs.length; i++){
		document.getElementById(inputs[i].field).value = city[inputs[i].setting];
	}
	return city;
}
//get a url for the city with encoded settings
function getCityUrl(){
	var base = "https://codepen.io/pieceoftoast/pen/ojVWdR";
	if(base.indexOf("?") > -1){
		return base + "&city=" + encodeURIComponent(JSON.stringify(city));
	}
	else{
		return base + "?city=" + encodeURIComponent(JSON.stringify(city));
	}
}

//=========================================
// EVENT BINDING
//=========================================
//bind generate button click
document.getElementById('reset').addEventListener('click', function() {
	city = updateCityOptions();
	reset();
}, false);
//bind info button click
document.getElementById('info').addEventListener('click', function() {
	document.querySelector('.options').classList.add('hidden');
   document.querySelector('.info').classList.toggle('hidden');
}, false);
//bind options button click
document.getElementById('options').addEventListener('click', function() {
	document.querySelector('.info').classList.add('hidden');
   document.querySelector('.options').classList.toggle('hidden');
}, false);
//reset city options
document.getElementById('default').addEventListener('click', function() {
		resetCityOptions();
}, false);

//=========================================
// MAIN
//=========================================
//main animation loop
var render = function() {
	requestAnimationFrame(render);
	renderer.render(scene, camera);	
  
  if(composer) {
    composer.render();
  }
	carSpawner.update();
	if(bridges.length) trainSpawner.update();
	controls.update();
	stats.update();
};
//initial setup
function init(){
	setupScene();
	//setupPost();
	setupLights();
	setupHeightmap();
	setupGround();
	setupBlocks();
	setupBridges();
	carSpawner = new CarSpawner();
	if(bridges.length) trainSpawner = new TrainSpawner();
	document.getElementById('url').setAttribute('href', getCityUrl());
}
//remove everything and reinitialize
function reset(){
	scene = camera = renderer = width = heightmap = null;
	backLight = composer = stats = floor = building = null;
	height = controls = light = shadowLight = null;
	var canvas = document.getElementsByTagName("CANVAS")[0];
	document.body.removeChild(canvas);
	init();
}

function scaleY (mesh, scale) {
  mesh.scale.y = scale ;
  if(!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  var height = mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y;

  mesh.position.y = height * scale / 2 ;
}
//run it
getInitialSettings();
init();
render();
