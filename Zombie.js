/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import { Vehicle, Think, FollowPathBehavior, OnPathBehavior } from 'yuka';
import { AttackEvaluator, OutEvaluator } from './Evaluators.js';
import { Matrix4, Ray, Quaternion, Vector3, Raycaster, LineBasicMaterial, BufferGeometry, Line, CapsuleGeometry, MeshBasicMaterial, Mesh, Euler } from 'three';



class ZombieRobot extends Vehicle {

	constructor({ health, speed, navmesh, name, maxSpeed, scene, mass, zombiecapsuleList, mixer, player, octree, worldUI, navmeshgroup, associatedmesh, zombieID, world }) {

		super();

		// constructor : check if better to just pass the world to the class
		this.health = health;
		this.speed = speed;
		this.zombiesCapsules = zombiecapsuleList;
		this.txtName = name;
		this.name = name;
		this.maxSpeed = maxSpeed;
		this.mass = mass;
		this.navMesh = navmesh;
		this.scene = scene;
		this.maxTurnRate = Math.PI * 0.5;
		this.mixer = mixer;
		this.playerPosition = player.playerCollider.end;
		this.playerVelocity = player.playerVelocity;
		this.octree = octree;
		this.worldUI = worldUI;
		this.navMeshGroup = navmeshgroup;
		this.associateMesh = associatedmesh;
		this.zombieID = zombieID;
		this.world = world;
		this.player = player;

		//out indicator
		this.out = false;
		this.timeOfOut = 0;

		// thinking and goal
		this.brain = new Think(this);
		this.brain.addEvaluator(new AttackEvaluator());
		this.brain.addEvaluator(new OutEvaluator());

		// path and navigation
		this.pathHelper = null;
		this.currentTarget = null;
		this.currentRegion = null;
		this.fromRegion = null;
		this.toRegion = null;
		this.isPlayerMoving = false;
		this.distanceToPlayerSquared = 0;
		this.path = [];

		// UI
		this.ui = {};

		// animation system
		this.animations = new Map();

		// intersection with the ray gun
		this.capsule = null;
	}

	init() {
		this._initpathHelper();
		this._initPosition();
		this._initSteering();
		this._initCapsule();
		this._initAnimation();

	}

	_initpathHelper() {

		// to visualized the path use by the zombie
		const pathMaterial = new LineBasicMaterial({ color: 0xff0000 });
		pathMaterial.linewidth = 1;
		this.pathHelper = new Line(new BufferGeometry(), pathMaterial);
		this.pathHelper.visible = true;
		this.pathHelper.matrixAutoUpdate = true;
		this.world.pathFinderGroupMesh.add(this.pathHelper);
	};

	_initPosition() {
		// to land the zombie
		const toRegion = this.navMesh.getRandomRegion().centroid;
		const startRobotPosition = new Vector3((Math.random() * 1) - 12, 5, 35);
		this.position.copy(startRobotPosition);
		this.toRegion = toRegion;
	};

	_initSteering() {
		//initialize the behavior of robots : Optimization possible to predidiction factor etc
		const followPathBehavior = new FollowPathBehavior();
		followPathBehavior._arrive.deceleration = .0000001;
		followPathBehavior._arrive.tolerance = 1;
		followPathBehavior.nextWaypointDistance = 1;
		followPathBehavior.active = false;
		this.steering.add(followPathBehavior);

		const onpathPathBehavior = new OnPathBehavior();
		onpathPathBehavior.radius = 0.000001;
		onpathPathBehavior.predictionFactor = .001;
		this.steering.add(onpathPathBehavior);

	};

	_initCapsule() {

		// use to find if zombie got hit : Optimisation possible in putting two capsule/sphere:
		// one for the head the other for the body and influence how much they loose health / animation etc
		let geometry = new CapsuleGeometry(.2, .8, 4, 8);
		let material = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
		let capsule = new Mesh(geometry, material);

		capsule.zombieID = this.zombieID;
		capsule.translateY(10);
		this.capsule = capsule;
		this.capsule.owner = this;
		this.capsule.matrixAutoUpdate = false;
		this.world.capsuleGroupMesh.add(this.capsule);
	};

	_initAnimation() {

		// load the aniamtion use by the Goal class to play them
		this.animations.set('WALK', this.createAnimationAction(this.mixer, 'walk'));
		this.animations.set('ATTACK', this.createAnimationAction(this.mixer, 'attack'));
		this.animations.set('IDLE', this.createAnimationAction(this.mixer, 'idle'));
		this.animations.set('OUT', this.createAnimationAction(this.mixer, 'out'));
		const idle = this.animations.get('IDLE');
		idle.enabled = true;
	};

	setPositionOfMesh() {

		// align position with the Vehicule Entity (Yuka) position
		// so Yuka is use to calculte the force and we just alignn the mesh position
		let positionOfEntity = new Vector3();
		let rotationQuaternionEntity = new Quaternion();

		// UGLY HACK that almost work to only rotate on the Y axis
		// used because the Vehicule Entity goes up and down etc but the Robot is always straight
		// refactor it ASAP
		positionOfEntity.setFromMatrixPosition(this.worldMatrix);
		rotationQuaternionEntity.setFromRotationMatrix(this.worldMatrix);
		let component = rotationQuaternionEntity.toArray();
		// componanent [x, y, z, w]
		component[0] = 0;
		//component[1] = 0;  
		component[2] = 0;
		//component[3] = 1;
		rotationQuaternionEntity.fromArray(component);
		let finalMatrixForMesh = new Matrix4();
		finalMatrixForMesh.makeRotationFromQuaternion(rotationQuaternionEntity);
		finalMatrixForMesh.setPosition(positionOfEntity);
		this.associateMesh.matrix.copy(finalMatrixForMesh);
	}

	setPositionOfCapsule() {

		// since capsule doesnt have orientation, it is just the position
		let positionOfEntity = new Vector3();
		positionOfEntity.setFromMatrixPosition(this.worldMatrix);
		let finalMatrixForMesh = new Matrix4();
		const translationMatix = new Matrix4();

		// translate up the capsule : optimisation with a THREE.Group to avoid this matrix multiplication possible
		translationMatix.set(
			1, 0, 0, 0,
			0, 1, 0, .8,
			0, 0, 1, 0,
			0, 0, 0, 1
		);

		finalMatrixForMesh.setPosition(positionOfEntity);
		finalMatrixForMesh.multiply(translationMatix);
		this.capsule.matrix.copy(finalMatrixForMesh);




	};

	createAnimationAction(mixer, clip) {

		//helper function to create the action
		let action = mixer.clipAction(clip);
		action.play();
		action.enabled = false;
		return action;

	}

	update(delta) {

		// update the animation
		this.mixer.update(delta);

		// used by the Goal Class to know when to switch Goal
		if (this.playerVelocity.length() > 1) {
			this.isPlayerMoving = true;
		} else {
			this.isPlayerMoving = false;
		}

		// update the parent class (Vehicule and Moving entity)
		super.update(delta);

		this.deltaTime = delta;

		//executing the current goal
		this.brain.execute();

		// choosing the goal if death or not basically. See if state machine better
		this.brain.arbitrate();
		//console.log(this.uuid, this.position);

		// update position of mesh and capsule
		this.setPositionOfMesh();
		this.setPositionOfCapsule();

		// check Ray height from the floor to adjuste Y position of zombie
		const rayDirectionDown = new Vector3(0, -1, 0);
		const translationMatrix = new Matrix4();
		translationMatrix.set
			(
				1, 0, 0, 0,
				0, 1, 0, 2,
				0, 0, 1, 0,
				0, 0, 0, 1
			);
		let zombiePositionTranslate = this.position.clone();
		zombiePositionTranslate.applyMatrix4(translationMatrix);
		let rayFromEntityDownToGround = new Ray(zombiePositionTranslate, rayDirectionDown);
		let resultIntersectionDown = this.octree.rayIntersect(rayFromEntityDownToGround);
		if (resultIntersectionDown) {
			this.position.y -= (resultIntersectionDown.distance - 2) * 1;
		}
		return this;
	};

}

export { ZombieRobot };
