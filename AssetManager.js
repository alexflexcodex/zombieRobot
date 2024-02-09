/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import * as THREE from 'three';
import * as YUKA from 'yuka';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import zombieWorld from './assets/mesh/worldZombie.glb'
import navMeshGeo from './assets/mesh/navMesh.glb'
import animationZombie from './assets/mesh/walkAttackOut.glb'
import rayGun from './assets/mesh/rayGun.glb'

import baseSong from './assets/audio/baseSong.mp3'
import shotSound from './assets/audio/blast.mp3'
import outSound from './assets/audio/out.mp3'

class AssetManager {

    constructor(world) {


        this.loadingManager = new THREE.LoadingManager();

        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = new GLTFLoader(this.loadingManager);

        this.navMeshLoader = new YUKA.NavMeshLoader();

        this.listener = new THREE.AudioListener();

        this.animations = new Map();
        this.audios = new Map();
        this.models = new Map();
        this.navMesh = new Map();
        this.world = world;

    }

    init() {

        this._loadAudios();
        this._loadModels();
        this._loadAnimations();

        const loadingManager = this.loadingManager;

        return new Promise((resolve) => {

            loadingManager.onLoad = () => {

                resolve();

            };

        });

    }

    _loadAudios() {

        const audioLoader = this.audioLoader;
        const audios = this.audios;
        const listener = this.listener;

        const soundRadio = new THREE.Audio(listener);
        const shot = new THREE.PositionalAudio(listener);

        soundRadio.setVolume(.2);
        shot.setVolume(.2);

        audioLoader.load(baseSong, function (buffer) {
            soundRadio.setBuffer(buffer);
            soundRadio.setLoop(true);
            soundRadio.play();
        });

        audioLoader.load(shotSound, buffer => shot.setBuffer(buffer));
        audioLoader.load(outSound, buffer => {
            audios.set('bufferAudioShot', buffer);
        });

        audios.set('baseSong', baseSong);
        audios.set('shot', shot);
    }

    _loadModels() {

        const gltfLoader = this.gltfLoader;
        const loaderNav = this.navMeshLoader;
        const models = this.models;

        //navmesh
        loaderNav.load(navMeshGeo).then((navigationMesh) => {

            // visualize convex regions
            this.navMesh.set('navmesh', navigationMesh);
        });

        // world
        gltfLoader.load(zombieWorld, (gltf) => {

            gltf.scene.traverse(child => {

                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.name.substring(0, 3) === 'xxx') {
                        child.material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
                    };
                }
            });

            models.set('mainGround', gltf.scene);

        });

        // weapon
        gltfLoader.load(rayGun, (gltf) => {


            const weaponMesh = new THREE.Group();
            const explode = gltf.scene.getObjectByName("explode");
            explode.material.opacity = 0;
            explode.material.transparent = true;
            weaponMesh.add(gltf.scene);

            //offset the wapon from the camera with a group
            const group = new THREE.Group();
            //front
            group.translateZ(-.3);
            //right
            group.translateX(.2);
            //up
            group.translateY(-.2);
            group.add(weaponMesh);

            models.set('rayGun', group);

        });


        const material_phong = new THREE.MeshPhongMaterial({
            color: '#FFFFFF',
            //shininess: 100
        });
        // zombie
        gltfLoader.load(animationZombie, (gltf) => {
            gltf.scene.traverse(child => {

                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = material_phong;
                }
            });
            this.models.set('zombie', gltf.scene);

            // animation from zombie
            this.animations.set('zombieAnimation', gltf.animations);

        });

        // Parent object for path helper
        const groupPathHelper = new THREE.Group();
        groupPathHelper.name = 'pathHelperParent';
        groupPathHelper.visible = false;
        this.models.set('pathHelperParent', groupPathHelper);


        // Parent object for capsule Meshes
        const groupCapsule = new THREE.Group();
        groupCapsule.name = 'capsuleParent';
        groupCapsule.visible = false;
        this.models.set('capsuleParent', groupCapsule);


        // Parent object for zombie Meshes
        const zombies = new THREE.Group();
        zombies.name = 'zombiesParent';
        zombies.visible = true;
        this.models.set('zombiesParent', zombies);

    }

    _loadAnimations() {

        const times = [0, .1, .3];
        const length = -1;
        let axisX = 1;
        let axisy = 0;
        let axisZ = 0;
        const q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axisX, axisy, axisZ), 0);
        const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axisX, axisy, axisZ), Math.PI / 4);
        const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axisX, axisy, axisZ), 0);
        const values2 = [
            q0.x, q0.y, q0.z, q0.w,
            q1.x, q1.y, q1.z, q1.w,
            q2.x, q2.y, q2.z, q2.w
        ];
        const rotationKF = new THREE.QuaternionKeyframeTrack(".quaternion", times, values2);
        const tracks2 = [rotationKF];
        const rotationclip = new THREE.AnimationClip("rotation", length, tracks2);
        this.animations.set('shot', rotationclip);

        const values3 = [
            0, 0, .3,
            0, 0, 0,
            0, 0, 0,
        ];
        const positionKF = new THREE.VectorKeyframeTrack(".position", times, values3);
        const tracks7 = [positionKF];
        const positionclip = new THREE.AnimationClip("rotation", length, tracks7);
        this.animations.set('shotposition', positionclip);



        const colorKF = new THREE.ColorKeyframeTrack('.material.emissive', times, [1, 1, .1, 1, 1, 1, 1, 1, 1], THREE.InterpolateDiscrete);
        const tracks4 = [colorKF];
        const colorclip = new THREE.AnimationClip("rotation", length, tracks4);
        this.animations.set('color', colorclip);

        const opacityKF = new THREE.NumberKeyframeTrack('.material.opacity', [0.01, 0.02, 0.02], [1, 0, 0], THREE.InterpolateDiscrete);
        const tracks5 = [opacityKF];
        const opacityclip = new THREE.AnimationClip("rotation", length, tracks5);
        this.animations.set('opacity', opacityclip);


    }


}

export { AssetManager };
