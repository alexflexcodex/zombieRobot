/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import { Goal, CompositeGoal, Vector3 } from 'yuka';
import { BufferGeometry, LoopOnce } from 'three';

const ATTACK = 'ATTACK';
const OUT = 'OUT';
const WALK = 'WALK';
const IDLE = 'IDLE';




class SeekAndDestroy extends CompositeGoal {

	constructor(owner) {
		super(owner);
	}

	activate() {

		this.clearSubgoals();
		const owner = this.owner;

		this.addSubgoal(new SeekAndGoEnemyGoal(owner));
		this.addSubgoal(new AttackGoal(owner));

		const idle = owner.animations.get(IDLE);
		idle.fadeOut(owner.crossFadeDuration);

	}

	execute() {

		this.status = this.executeSubgoals();
		this.replanIfFailed();

	}

}

class SeekAndGoEnemyGoal extends Goal {

	constructor(owner) {

		super(owner);

	}

	activate() {

		const owner = this.owner;
		const turn = owner.animations.get(WALK);
		turn.reset().fadeIn(owner.crossFadeDuration);

		// calculate Path using Navmesh
		const from = owner.position;
		let toProjection = new Vector3(owner.player.playerPositionOnNavMesh.x, owner.player.playerPositionOnNavMesh.y, owner.player.playerPositionOnNavMesh.z);
		const path = owner.navMesh.findPath(from, toProjection);
		owner.path = path;


		// to visualised the Path
		owner.pathHelper.geometry.dispose();
		owner.pathHelper.geometry = new BufferGeometry().setFromPoints(path);


		// adding the path to the behavior of the zombie
		const followPathBehavior = owner.steering.behaviors[0];
		followPathBehavior.active = true;
		followPathBehavior.path.clear();
		for (const point of owner.path) {
			followPathBehavior.path.add(point);
		}
	}

	execute() {

		if (this.active()) {

			const owner = this.owner;
			owner.distanceToPlayerSquared = owner.playerPosition.distanceToSquared(owner.position);


			// set animation to walk
			const animation = owner.animations.get(WALK);
			animation.timeScale = owner.getSpeed() * 2;

			// if the zombie is close to player:  diminish player health
			if (owner.distanceToPlayerSquared < 3) {
				owner.player.health -= this.owner.world.level.powerOfenemy / 2;
			}

			// if the zombie is close to player AND the player is not moving : terminate this goal (will start the attack goal)
			if (owner.distanceToPlayerSquared < 3 & this.owner.isPlayerMoving === false) {
				this.status = Goal.STATUS.COMPLETED;
			}

			// if the zombie is NOT close to player AND the player is not moving : do nothing
			else if (owner.distanceToPlayerSquared > 3 & this.owner.isPlayerMoving === false) {
				return;
			}

			else if (owner.isPlayerMoving) {

				// calculate Path using Navmesh
				const from = owner.position;
				let toProjection = new Vector3(owner.player.playerPositionOnNavMesh.x, owner.player.playerPositionOnNavMesh.y, owner.player.playerPositionOnNavMesh.z);
				const path = owner.navMesh.findPath(from, toProjection);
				owner.path = path;

				// to visualised the Path
				owner.pathHelper.geometry.dispose();
				owner.pathHelper.geometry = new BufferGeometry().setFromPoints(path);


				// adding the path to the behavior of the zombie
				const followPathBehavior = owner.steering.behaviors[0];
				followPathBehavior.active = true;
				followPathBehavior.path.clear();
				for (const point of owner.path) {
					followPathBehavior.path.add(point);
				}
			};

		}

	}

	terminate() {

		const owner = this.owner;
		const walk = owner.animations.get(WALK);
		walk.fadeOut(owner.crossFadeDuration);

	}

}

class AttackGoal extends Goal {

	constructor(owner) {
		super(owner);
	}

	activate() {
		const owner = this.owner;
		const turn = owner.animations.get(ATTACK);
		turn.reset().fadeIn(owner.crossFadeDuration);
	}

	execute() {

		const owner = this.owner;
		owner.distanceToPlayerSquared = owner.playerPosition.distanceToSquared(owner.position);

		/* 
		If the player is moving or the distance is greater than 3 terminate : 
		this will automatically clear the subgoals and recreate seekandgo and attack goal
		- check if it is efficient for memeory, maybe go to a state machine ? 
		*/

		if (this.owner.isPlayerMoving || owner.distanceToPlayerSquared > 3) {
			this.status = Goal.STATUS.COMPLETED;
		}

		//diminish player health
		owner.player.health -= this.owner.world.level.powerOfenemy;

	}

	terminate() {

		const owner = this.owner;
		const gather = owner.animations.get(ATTACK);
		gather.fadeOut(owner.crossFadeDuration);
		const walk = owner.animations.get(WALK);
		walk.fadeOut(owner.crossFadeDuration);

	}

}

class OutGoal extends Goal {

	constructor(owner) {
		super(owner);
	}

	activate() {
		const owner = this.owner;

		// stop zombie instantly
		owner.velocity = new Vector3(0, 0, 0);

		// deactive steering behavior
		const followPathBehavior = owner.steering.behaviors[0];
		followPathBehavior.active = false;

		const followPathBehavior2 = owner.steering.behaviors[1];
		followPathBehavior2.active = false;

		// start funky Out aniamtion
		const out = owner.animations.get(OUT);
		out.timeScale = 2;
		out.setLoop(LoopOnce);
		out.reset().fadeIn(0.1);

		// play spacial out sound linked with the zombie
		const audio = owner.associateMesh.children[1];
		audio.play();

		// set the timeOfOut : usefull to clean the zombie after x second
		owner.timeOfOut = performance.now();

		//UI stuff
		owner.world.hits = owner.world.hits + 1;
		owner.world.ui.hits.textContent = owner.world.hits;

		// remove the capsule that is use to calculate the intersect. (the mesh is still renderered)
		owner.world.remove(owner, 'DEAD');



	}

	execute() {
		const owner = this.owner;
		owner.out = true;

		// after one second, remove the mesh
		if (performance.now() - owner.timeOfOut > 1000) {
			owner.world.remove(owner, 'OUT');
		}

	}

	terminate() {
	}

}


export {
	SeekAndDestroy,
	OutGoal
};
