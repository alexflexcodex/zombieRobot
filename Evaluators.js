/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import { GoalEvaluator } from 'yuka';

import { SeekAndDestroy, OutGoal } from './Goals.js';


class AttackEvaluator extends GoalEvaluator {

	calculateDesirability() {
		return 0.6;
	}

	setGoal(girl) {

		const currentSubgoal = girl.brain.currentSubgoal();

		if ((currentSubgoal instanceof SeekAndDestroy) === false) {
			girl.brain.clearSubgoals();
			girl.brain.addSubgoal(new SeekAndDestroy(girl));
		}

	}

}

class OutEvaluator extends GoalEvaluator {

	calculateDesirability(girl) {
		if (girl.health < 0) {
			return 1;

		} else {
			return 0;
		};


	}

	setGoal(girl) {
		const currentSubgoal = girl.brain.currentSubgoal();

		if ((currentSubgoal instanceof OutGoal) === false) {
			girl.brain.clearSubgoals();
			girl.brain.addSubgoal(new OutGoal(girl));
		};

	}

}

export {
	AttackEvaluator,
	OutEvaluator
};
