/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import { Capsule } from 'three/addons/math/Capsule.js';
import * as THREE from 'three';
import { Weapon } from './Weapons.js';
import { Vector3 } from 'yuka';


class Player {


    constructor(camera, capsules, gravity, worldOctree, zombielistentity, world, navMeshGroup, navmesh) {


        // init value, check if it is maybe better to just give the reference to the world
        this.playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1.2, 0), 0.35);
        this.playerVelocity = new THREE.Vector3();
        this.playerDirection = new THREE.Vector3();
        this.playerOnFloor = false;
        this.camera = camera;
        this.raycasterZombie = new THREE.Raycaster();
        this.pointerZombie = new THREE.Vector2();
        this.zombiesCapsules = capsules;
        this.gravity = gravity;
        this.worldOctree = worldOctree;
        this.zombieListEntity = zombielistentity;
        this.world = world;
        this.health = 100;
        this.navMeshGroup = navMeshGroup;




        // Weapon
        this.weapon = null;
        this.translationMatix = new THREE.Matrix4();
        this.cameraMatrix = new THREE.Matrix4();
        this.animations = new Map();

        //Animation Weapon
        this.mixerWeapon;
        this.shotaction;
        this.shotactionPosition;
        this.mixerWeaponColor;
        this.shotactionColor;
        this.mixerWeaponExplod;
        this.shotactionmixerExplod;

        //for path finding
        this.playerPositionOnNavMesh;
        this.playerRaycaster = new THREE.Raycaster();
        this.playerPosition = this.playerCollider.end;
        this.navMesh = navmesh;
        this.outOfBounce = null;





    }

    init() {

        // to diminish health if out of bounce: usefull otherview, you just kill robot from a non reacheable zone for them
        this.outOfBounce = {
            value: false,
            sinceOneSecondOut: false,
            timeoutID: undefined,
            setValueFalse(world) {
                this.value = false;
                world.ui.outOfBounce.style.display = "none";
                clearTimeout(this.timeoutID);
                this.sinceOneSecondOut = false;


            },
            setValueTrue(world) {
                this.value = true;
                this.timeoutID = setTimeout(() => {
                    world.ui.outOfBounce.style.display = "block";
                    this.sinceOneSecondOut = true;
                    world.player.health -= 10;
                }, 2000);
            },

        };

        //just to put the collider at a good spot.
        this.playerCollider.translate(new THREE.Vector3(0, 40, -45));

        //set the position of the player that the robot are going to use to get to the player
        this.findPositionOnNavMesh();

        // create the weapon : possiblity to extend the weapons system
        this.weapon = new Weapon(this, 'RayGun', this.world);
        this.weapon.init();

        //lié la camera au Weapon
        this.camera.add(this.weapon.RendererOJB);


        //ANIMATION OF THE WEAPON INITIALIZATION
        // rotation and position change when shooting
        this.mixerWeapon = new THREE.AnimationMixer(this.weapon.RendererOJB.children[0]);
        this.shotaction = this.mixerWeapon.clipAction(this.world.assetManager.animations.get("shot"));
        this.shotaction.loop = THREE.LoopOnce;
        this.shotactionPosition = this.mixerWeapon.clipAction(this.world.assetManager.animations.get("shotposition"));
        this.shotactionPosition.loop = THREE.LoopOnce;

        // tips color change when shooting
        this.mixerWeaponColor = new THREE.AnimationMixer(this.weapon.RendererOJB.children[0].children[0].children[2]);
        this.shotactionColor = this.mixerWeaponColor.clipAction(this.world.assetManager.animations.get("color"));
        this.shotactionColor.loop = THREE.LoopOnce;

        //explosion animation at the start of the weapon when shooting
        this.mixerWeaponExplod = new THREE.AnimationMixer(this.weapon.RendererOJB.children[0].children[0].children[3]);
        this.shotactionmixerExplod = this.mixerWeaponExplod.clipAction(this.world.assetManager.animations.get("opacity"));
        this.shotactionmixerExplod.loop = THREE.LoopOnce;
    }

    shoot() {

        // animation : since light is faster than sound, start with visual effect
        this.shotaction.stop();
        this.shotaction.play();

        this.shotactionPosition.stop();
        this.shotactionPosition.play();

        this.shotactionColor.stop();
        this.shotactionColor.play();

        this.shotactionmixerExplod.stop();
        this.shotactionmixerExplod.play();


        //Kabanggg
        const audio = this.world.assetManager.audios.get('shot');
        if (audio.isPlaying === true) audio.stop();
        audio.play();

        //Zombie intersection logic
        this.raycasterZombie.setFromCamera(this.pointerZombie, this.camera);
        let gunPower = 1000000;

        let intersectsZombies = this.raycasterZombie.intersectObjects(this.zombiesCapsules, false);

        //UGLY CODE since lenght two is ignored
        //refactor it to be more flexible and to allow the weapon to possess a penetration distanc
        if (intersectsZombies.length > 3) {
            let robotHitted = intersectsZombies[0].object.owner;
            let robotHitted2 = intersectsZombies[1].object.owner;
            let robotHitted3 = intersectsZombies[2].object.owner;
            robotHitted.health -= this.weapon.power;
            robotHitted2.health -= this.weapon.power * 0.5;
            robotHitted3.health -= this.weapon.power * 0.1;
        } else if (intersectsZombies.length > 0) {
            let robotHitted = intersectsZombies[0].object.owner;
            robotHitted.health -= this.weapon.power;
        } else { };

        // GTA3 Reference 🤪
        let intersectsMoon = this.raycasterZombie.intersectObjects(this.world.moon, false);
        if (intersectsMoon.length > 0) {
            intersectsMoon[0].object.isbig = !intersectsMoon[0].object.isbig;
            if (intersectsMoon[0].object.isbig) {
                intersectsMoon[0].object.scale.set(3.2, 3.2, 3.2);
            } else
                intersectsMoon[0].object.scale.set(1, 1, 1);
        }
    };

    updatePlayer(deltaTime) {

        // update the animation
        this.mixerWeapon.update(deltaTime);
        this.mixerWeaponColor.update(deltaTime);
        this.mixerWeaponExplod.update(deltaTime);

        //diminush health if out of bounce cince one seonc
        if (this.outOfBounce.sinceOneSecondOut) {
            this.health -= deltaTime * 10;
        }

        // Game over if health bad
        if (this.health < 0) { this.world.gameOver = true; }

        // Game over if fall
        if (this.camera.position.y < -20) { this.world.gameOver = true; }

        // regenation
        if (this.health < 100) { this.health += deltaTime; }

        // UI health
        this.world.ui.playerHealth.textContent = Math.floor(this.health);

        // GRAVITY 
        let damping = Math.exp(- 4 * deltaTime) - 1;
        if (!this.playerOnFloor) {
            this.playerVelocity.y -= this.gravity * deltaTime;
            // small air resistance
            damping *= 0.1;
        }
        this.playerVelocity.addScaledVector(this.playerVelocity, damping);

        // set the collider position (use to test intersection with environment)
        const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
        this.playerCollider.translate(deltaPosition);

        // check the collision with environemnt : add the correct velocity
        this.playerCollisions();

        //align camera to the collider
        this.camera.position.copy(this.playerCollider.end);

        // recalculate the position used by the zombie to find the player
        this.findPositionOnNavMesh();

    };

    findPositionOnNavMesh() {
        this.playerRaycaster.set(this.playerPosition, new THREE.Vector3(0, -1, 0));

        // if out of bounce diminish health AND give the closest positionn on the navmesh so that zombie can still move
        if (this.playerRaycaster.intersectObject(this.navMeshGroup).length > 0) {
            this.playerPositionOnNavMesh = this.playerRaycaster.intersectObject(this.navMeshGroup)[0].point;
            if (this.outOfBounce.value) {
                this.outOfBounce.setValueFalse(this.world);
            }
        } else {
            // VERYY IMPORTANT TO USE YUKA VECTOR THREE SINCE IT CONTAINS THE SQUAREDISTANCE FUNCTION USED BY GETCLOSESTREGION
            let playerPosition = new Vector3(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
            this.playerPositionOnNavMesh = this.navMesh.getClosestRegion(playerPosition).centroid;
            if (this.outOfBounce.value !== true) {
                this.outOfBounce.setValueTrue(this.world);
            }
        };

    };

    playerCollisions() {
        // magic append here. 
        // reading code to learn
        // Basically move the player in the correct position given the intersection with the World Octree
        const result = this.worldOctree.capsuleIntersect(this.playerCollider)
        this.playerOnFloor = false;
        if (result) {
            this.playerOnFloor = result.normal.y > 0;
            if (!this.playerOnFloor) {
                this.playerVelocity.addScaledVector(result.normal, - result.normal.dot(this.playerVelocity));
            }
            this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
        }
    };
}


export { Player };
