// MAIN STEAK
import * as THREE from 'three';
import * as YUKA from 'yuka';

// SIDE MEAL
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// THE CHEF TOUCH
import { AssetManager } from './AssetManager.js';
import { Player } from './Player.js';
import { Level } from './Level.js';
import { ZombieRobot } from './Zombie.js';
import { Controls } from './Controls.js';
import { Stats } from './StatsGraph.js';
import { MiniMap } from './MiniMap.js';

// YUKA EXTENSION
import { createGraphHelper } from './GraphHelper.js';
import { createConvexRegionHelper } from './NavMeshHelper.js';


class World {

    constructor() {

        this.worldOctree = new Octree();



        this.entityManager = new YUKA.EntityManager();
        this.time = new YUKA.Time();
        this.gui = null;
        this.camera = null;
        this.scene = null;
        this.navMeshGroup = null;
        this.navMesh = null;
        this.graphHelper = null
        this.renderer = null;
        this.mixer = null;
        this.audios = new Map();
        this.animations = new Map();
        this.STEPS_PER_FRAME = 5;
        this.clock = new THREE.Clock();
        this.GRAVITY = 5;

        this.player = null;
        this.controls = null;

        this.level = null;
        this.hits = 0;

        this.zombies = new Array();
        this.zombiesCapsules = new Array();
        this.moon = new Array();

        this.assetManager = new AssetManager(this);
        this.uniforms = null;

        // UI stuff
        this.stats = null;
        this.minimap = null;
        this.ui = {
            level: document.getElementById('Level'),
            intro: document.getElementById('intro'),
            loadingScreen: document.getElementById('loading-screen'),
            hits: document.getElementById('hits'),
            menu_start: document.getElementById('start'),
            menu_gameover: document.getElementById('gameover'),
            menu_hits: document.getElementById('gameover_hits'),
            menu_level: document.getElementById('gameover_level'),
            containerRobotUI: document.getElementById('containerRobotUI'),
            playerHealth: document.getElementById('playerHealth'),
            drawcall: document.getElementById('drawcall'),
            triangle: document.getElementById('triangle'),
            stats: document.getElementById('stats'),
            minimap: document.getElementById('map'),
            levelTransition: document.getElementById('level-transition'),
            scoreform: document.getElementById('highscore'),
            feedbackscore: document.getElementById('feedbackscoreposition'),
            leaderboard: document.getElementById('leaderboard'),
            leaderboardintro: document.getElementById('leaderboardintro'),
            lilgui: document.getElementById('lilgui'),
            outOfBounce: document.getElementById('outOfBounce')
        };



        this.started = false;
        this.gameOver = false;
        this.leaderBoardSend = false;
        this.debug = false;
        this.gamePaused = true;

        this._onWindowResize = onWindowResize.bind(this);
        this._onIntroClick = onIntroClick.bind(this);
        this._animate = animate.bind(this);

        this.container = document.getElementById('container');
        this.ui.intro.addEventListener('click', this._onIntroClick, false);

        // group meshes for scene (faster than to each time get object by name)
        this.capsuleGroupMesh = null;
        this.pathFinderGroupMesh = null;
        this.zombiesGroupMesh = null;

        //animation test 
        this.mixerAnimationCube = null;
        this.mixerAnimationCube2 = null;

    }

    init() {

        this.assetManager.init().then(() => {

            // ajoute les camera, audio, scene, light, renderer, resize listener
            this._initScene();
            this._initGround();
            this._initOctree();
            this._initPlayer();
            this._initControls();
            this._initLevel();
            this._initZombie();
            this._initUI();
            this._initStatSytem();
            this._initMinimap();
            this._initTestAnimationKey();

            this._animate();
        });

    }

    update() {

        // Main loop
        if (this.gamePaused) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        //gameOverLogic
        if (this.gameOver) {
            this.controls.exit();
            this.ui.menu_start.style.display = 'none';
            this.ui.menu_gameover.style.display = 'block';
            this.ui.menu_hits.textContent = this.hits;
            this.ui.menu_level.textContent = this.level.level;
        }

        if (this.gameOver !== true) {

            this.stats.begin();

            // go to next level if all zombie are dead
            if (this.zombies.length === 0) {
                this.nextlevel();
            }

            // two time : one for fine intersect etc the other to general stuff
            const deltaTimeNostep = Math.min(0.05, this.clock.getDelta());
            const deltaTime = deltaTimeNostep / this.STEPS_PER_FRAME;

            //update AI entity (zombies)
            this.entityManager.update(deltaTimeNostep);

            // fine tuning of update X time per frame for the player and the controls
            for (let i = 0; i < this.STEPS_PER_FRAME; i++) {
                // get the pressed button and add the correct velocity
                this.controls.controls(deltaTime);

                // use the velocity to update the player
                // invoque playerCollision() to find out if collide happend
                this.player.updatePlayer(deltaTime);
            }

            // actully drawing the scene THREEJS Power !!!!!
            this.renderer.render(this.scene, this.camera);

            // update the minimap to see zombie position
            this.minimap.update();

            // rennder Stats about draw call
            //It should be renderer.info.render.calls. 
            //It reports the amount of draw calls for a single render call. 
            this.ui.drawcall.textContent = this.renderer.info.render.calls;
            this.ui.triangle.textContent = this.renderer.info.render.triangles;

            //animation test
            this.mixerAnimationCube.update(deltaTimeNostep);
            this.mixerAnimationCube2.update(deltaTimeNostep);

            //update shaders for material orbitting the moon (testing shader for myself)
            this.uniforms.u_time.value = this.clock.elapsedTime;

            this.stats.update();
        };

    }


    add(entity) {

        // add entity to entity manager : so cool since you just have to call EntityManager.update()
        this.entityManager.add(entity);

        // if it is a robot : push the zombies (to check next level) and zombieCapsule : used to ray intersect when shooting
        if (entity instanceof ZombieRobot) {
            this.zombies.push(entity);
            this.zombiesCapsules.push(entity.capsule);
        }

    }

    remove(entity, TXT) {

        //if the remover entity if a robot do some cleaning stuff depennding on the type of removal
        if (entity instanceof ZombieRobot) {
            if (TXT === 'DEAD') {
                // remove la capsule et le pathHelper
                const index2 = this.zombiesCapsules.indexOf(entity.capsule);
                if (index2 !== - 1) this.zombiesCapsules.splice(index2, 1);
                this.capsuleGroupMesh.remove(entity.capsule);
                this.pathFinderGroupMesh.remove(entity.pathHelper);

            } else if (TXT === 'OUT') {
                //remove la mesh et et l'entity
                const index = this.zombies.indexOf(entity);
                if (index !== - 1) this.zombies.splice(index, 1);
                this.zombiesGroupMesh.remove(entity.associateMesh);
                this.entityManager.remove(entity);
            }
            else { console.log('WHAT') }

        }

    }

    nextlevel() {
        // call when all enemey of the world are dead
        // increase level
        const level = this.level;
        level.increaseLevel();
        //pump enemy into the world
        this.addZombies(level);
    }

    addZombies(level) {

        // the big loop to add robot, check if it is better to just pass the world to the Zombie class
        for (let i = 0; i < level.nbOfEnemy; i++) {

            // get the mesh with skelette
            let zombieMesh = SkeletonUtils.clone(this.assetManager.models.get('zombie'));
            zombieMesh.animations = this.assetManager.animations.get('zombieAnimation');
            let mixer = new THREE.AnimationMixer(zombieMesh);
            zombieMesh.matrixAutoUpdate = false;
            zombieMesh.castShadow = true;
            zombieMesh.receiveShadow = true;
            zombieMesh.position.set(Math.random(), 3, -5);

            zombieMesh.name = 'Zombie';
            this.zombiesGroupMesh.add(zombieMesh);

            // add a positional sound to each robot
            const sound = new THREE.PositionalAudio(this.assetManager.listener);
            sound.setBuffer(this.assetManager.audios.get('bufferAudioShot'));
            sound.setLoop(false);
            sound.setVolume(.5);
            zombieMesh.add(sound);

            // the Game ENTITY creation. Probably better to give just the world reference
            let zombieRobot = new ZombieRobot({
                health: level.healthOfEnemy * 100,
                speed: level.speedOfEnemy,
                navmesh: this.navMesh,
                name: `zombie${i}`,
                maxSpeed: (1 + (5 * Math.random())) * level.speedOfEnemy,
                scene: this.scene,
                mass: 0.08,
                zombiecapsuleList: this.zombiesCapsules,
                mixer: mixer,
                player: this.player,
                octree: this.worldOctree,
                worldUI: this.ui,
                navmeshgroup: this.navMeshGroup,
                associatedmesh: zombieMesh,
                zombieID: i,
                world: this
            }
            );

            //light up the zombie
            zombieRobot.init();

            // add entity and make other addings
            this.add(zombieRobot);
        };

    }

    _initZombie() {
        //first level starter
        this.addZombies(this.level);
    }

    _initOctree() {

        // use to accelerate collision between player and terrain
        // also used to adjuste zombie Y regarding the floor
        const octreeMesh = this.assetManager.models.get('mainGround').clone();
        const selectedObject = octreeMesh.getObjectByName("iiielement");
        const selectedObjectNav = octreeMesh.getObjectByName("navMesh");
        const enemyMesh = octreeMesh.getObjectByName("enemy");
        octreeMesh.remove(selectedObject);
        octreeMesh.remove(selectedObjectNav);
        octreeMesh.remove(enemyMesh);

        this.worldOctree.fromGraphNode(octreeMesh);
        const helperOctree = new OctreeHelper(this.worldOctree);
        helperOctree.name = 'OctreeHelper'
        helperOctree.visible = false;
        this.scene.add(helperOctree);
    }

    _initStatSytem() {
        this.stats = new Stats();
        let stats = this.stats;
        stats.showPanel(0);
        this.ui.stats.appendChild(stats.dom);
    }

    _initTestAnimationKey() {

        // Personal playground. try funky things
        //test shader material 
        const vShader = `
varying vec2 v_uv;  void main() {
v_uv = uv;
gl_Position = projectionMatrix * modelViewMatrix *    vec4(position, 1.0);
}`
        const fShader = `
uniform float u_time;
void main() {
gl_FragColor = vec4(1.0, 0.0, sin(u_time * 5.0) + 0.5, 1.0).rgba;
}`
        this.uniforms = {
            u_time: { value: 0.0 }
        }
        //OBJECTIV : understand shaderMaterial
        const shadermaterial = new THREE.ShaderMaterial({
            vertexShader: vShader,
            fragmentShader: fShader,
            uniforms: this.uniforms
        });


        //OBJECTIV : understannd animation system and THREE.Group
        let heightOfPlanets = 20;
        //INITIALIZE MESH and make a groud (apply rotation on that) which contain a child mesh
        const geometry = new THREE.SphereGeometry(1, 32, 16);
        const material = new THREE.MeshLambertMaterial({ color: 0x40e0d0 });
        const cube = new THREE.Mesh(geometry, material);
        cube.name = "moon";
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.position.set(0, heightOfPlanets, -40);
        cube.isbig = false;
        this.moon.push(cube);

        const geometry2 = new THREE.SphereGeometry(.1, 32, 16);
        const cube2 = new THREE.Mesh(geometry2, shadermaterial);
        cube2.castShadow = true;
        cube2.receiveShadow = true;
        cube2.position.set(0, 0, 0);
        cube2.translateX(-2);

        const group = new THREE.Group();
        group.add(cube2);
        cube.add(group);

        //ANIMATION MAIN CUBE
        //KEYFRAMES MAIN CUBE
        const times = [0, 5, 10];
        const values = [0, heightOfPlanets, -40, 0, heightOfPlanets + 1, -40, 0, heightOfPlanets, -40];
        const positionKF = new THREE.VectorKeyframeTrack(".position", times, values);

        // just one track for now
        const tracks = [positionKF];

        // use -1 to automatically calculate
        // the length from the array of tracks
        const length = -1;

        //These fifty-three tracks come together to create the animation, which we call an animation clip
        const upAndDownclip = new THREE.AnimationClip("upAndDown", length, tracks);

        //First, the AnimationMixer allows us to turn a static object into an animated object
        // We also need to update the mixer each frame, but we’ll come back to that in a moment.
        this.mixerAnimationCube = new THREE.AnimationMixer(cube);

        //AnimationAction connects a clip to the object and allows us to control it using actions such as play, pause, loop, reset, and so on.
        //it helps if you shout out “action” like a director whenever you create one
        //Unlike the other animation system classes, we never create an action directly. Instead, we’ll use AnimationMixer.clipAction, which ensures the action is cached by the mixer.
        const upAndDownaction = this.mixerAnimationCube.clipAction(upAndDownclip);

        //Note that, although we called .play, the animation will not start yet. We still need to update the mixer in the animation loop, which we’ll do in a moment.
        upAndDownaction.play();

        //Suppose this character can run and jump as well. 
        //Each animation will come in a separate clip, and each clip must be connected to one action.
        // So, just as there is a one to one relationship between a mixer and a model, there is a one to one relationship between an action and an animation clip.
        // example : const leftRightnaction = mixer.clipAction(leftRightnactionclip);
        // Fortunately, the AnimationAction contains controls that allow you to blend two clips, gradually slow a clip to a stop, loop a clip, play in reverse, or at a different speed, and lots more
        // At the start of the chapter, we claimed that the three.js animation system is a complete animation mixing desk. More accurately, we should have said that AnimationAction is a complete animation mixing desk since this is where most of the controls are.
        //There is just one thing left to do before any animations can play. We need to update the animated object in the animation loop. The mixer has an update method, which takes a time delta parameter. Whatever amount of time we pass in to mixer.update, all actions connected to the mixer will move forward by that amount.
        //mixer.update(updateAmount); -> IN THE UPDATE FONCTION


        //ANIMATION SECONDE CUBE
        //.setFromAxisAngle ( axis : Vector3, angle : Float ) 
        // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
        const q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
        const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 2);
        const values2 = [
            q0.x, q0.y, q0.z, q0.w,
            q1.x, q1.y, q1.z, q1.w,
            q2.x, q2.y, q2.z, q2.w
        ];
        const rotationKF = new THREE.QuaternionKeyframeTrack(".quaternion", times, values2);
        const tracks2 = [rotationKF];
        const rotationclip = new THREE.AnimationClip("rotation", length, tracks2);
        this.mixerAnimationCube2 = new THREE.AnimationMixer(group);
        const rotATIONaction = this.mixerAnimationCube2.clipAction(rotationclip);
        rotATIONaction.play();


        //ADD OBJECT TO SCENE
        this.scene.add(cube);
    }

    _initMinimap() {
        //funky mini map Base on the Stats plugins by @author mrdoob / http://mrdoob.com/
        this.minimap = new MiniMap(this.zombies, this.camera);
        let minimap = this.minimap;
        minimap.showPanel(0);
        this.ui.minimap.appendChild(minimap.dom);
    }

    _initScene() {

        // camera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 1000);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = Math.PI;
        this.camera.add(this.assetManager.listener);
        this.camera.add(this.assetManager.audios.get('shot'));
        this.camera.position.x = 0;
        this.camera.position.y = 40;
        this.camera.position.z = -45;
        this.camera.rotation.x -= Math.PI / 2;

        // audios
        this.audios = this.assetManager.audios;

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x88ccee);
        this.scene.fog = new THREE.Fog(0x88ccee, 0, 50);
        // Not mandatory to add the camera normally the renderer take it in account. BUT to link object to camera like sound and GUN it is easier to read
        this.scene.add(this.camera);

        // init the parent groups for pathfinder and capsule meshes 
        this.scene.add(this.assetManager.models.get('capsuleParent'));
        this.scene.add(this.assetManager.models.get('pathHelperParent'));
        this.scene.add(this.assetManager.models.get('zombiesParent'));
        this.capsuleGroupMesh = this.scene.getObjectByName('capsuleParent');
        this.pathFinderGroupMesh = this.scene.getObjectByName('pathHelperParent');
        this.zombiesGroupMesh = this.scene.getObjectByName('zombiesParent');

        // lights
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(- 5, 25, - 1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.left = - 50;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = - 30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = - 0.00006;
        const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
        helper.visible = false;
        helper.name = "DirectionalLightHelper";
        this.scene.add(directionalLight);
        this.scene.add(helper);


        // renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.gammaOutput = true;
        this.renderer.setPixelRatio(window.devicePixelRatio / 4);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // listeners
        window.addEventListener('resize', this._onWindowResize, false);
        this.ui.intro.addEventListener('click', this._onIntroClick, false);

    }

    _initPlayer() {
        const player = new Player(
            this.camera,
            this.zombiesCapsules,
            this.GRAVITY,
            this.worldOctree,
            this.zombies,
            this,
            this.navMeshGroup,
            this.navMesh);
        player.init();
        this.player = player;
    }

    _initControls() {

        const player = this.player;
        this.controls = new Controls(player);

        const intro = this.ui.intro;

        // the pointer is locked at the start. But have and event dispatcher -> for the  extends EventDispatcher from YUKA
        // and we have the eventlistener here who take actions regarding the event
        this.controls.addEventListener('lock', () => {
            intro.classList.add('hidden');
            this.ui.lilgui.style.display = 'none';
            this.gamePaused = false;
        });

        this.controls.addEventListener('unlock', () => {
            intro.classList.remove('hidden');
            this.gamePaused = true;
            this.ui.lilgui.style.display = 'block';
        });

    }

    _initLevel() {
        const level = new Level(this.ui);
        this.ui.level.textContent = 1;
        this.level = level;
    }

    _initGround() {

        // add the main ground Mesh
        const groundMesh = this.assetManager.models.get('mainGround');
        groundMesh.name = 'terrrain';
        this.scene.add(groundMesh);

        // add random stuff for fun
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 5, -5)
        this.scene.add(cube);

        // add navMesh and node used to find the Path
        this.navMesh = this.assetManager.navMesh.get('navmesh');
        this.navMeshGroup = createConvexRegionHelper(this.navMesh);
        this.navMeshGroup.name = 'navMeshGroup'
        this.navMeshGroup.material.vertexColors = true;
        this.navMeshGroup.visible = false;
        this.scene.add(this.navMeshGroup);

        const graph = this.navMesh.graph;
        this.graphHelper = createGraphHelper(graph, 0.05);
        this.graphHelper.name = 'GraphHelper';
        this.graphHelper.visible = false;
        this.scene.add(this.graphHelper);



    }

    _initUI() {


        //enlever le loading screen
        const loadingScreen = this.ui.loadingScreen;
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', onTransitionEnd);
        this.ui.hits.textContent = 0;


        //apparement la fonction onChannge ne peux pas acceder a THIS.SCENE
        let scene = this.scene;
        let camera = this.camera;
        //init lilGUI
        this.gui = new GUI({ width: 200, container: lilgui });

        this.gui.add({ Octree: false }, 'Octree')
            .onChange(function (value) {
                scene.getObjectByName('OctreeHelper').visible = value;

            });
        this.gui.add({ NavMesh: false }, 'NavMesh')
            .onChange(function (value) {
                scene.getObjectByName('navMeshGroup').visible = value;

            });
        this.gui.add({ Pathfinder: false }, 'Pathfinder')
            .onChange(function (value) {
                scene.getObjectByName('pathHelperParent').visible = value;

            });
        this.gui.add({ directionLight: false }, 'directionLight')
            .onChange(function (value) {
                scene.getObjectByName('DirectionalLightHelper').visible = value;

            });

        this.gui.add({ Volume: 1 }, 'Volume', 0, 1)
            .onChange(function (value) {

                camera.children[0].setMasterVolume(value);


            });

        this.gui.add({ WorldElement: true }, 'WorldElement')
            .onChange(function (value) {
                scene.getObjectByName('iiielement').visible = value;

            });

        this.gui.add({ Capsule: false }, 'Capsule')
            .onChange(function (value) {
                scene.getObjectByName('capsuleParent').visible = value;

            });








    }
}

function onTransitionEnd(event) {
    event.target.remove();
}

function onWindowResize() {

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

}

function onIntroClick() {

    if (this.gameOver === false) {
        this.controls.connect();
        const context = THREE.AudioContext.getContext().resume();
    }

}

function animate() {
    // adjuste FPS regarding the device refresh rate etc
    requestAnimationFrame(this._animate);
    this.update();
}

export default new World();
