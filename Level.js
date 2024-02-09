/**
 * @author Alex 
 */

class Level {

    constructor(ui) {
        this.level = 1;
        this.nbOfEnemy = 20;
        this.speedOfEnemy = 1;
        this.healthOfEnemy = 1;
        this.ui = ui;
        this.powerOfenemy = 0.1;
    }

    increaseLevel() {
        this.level += 1;
        this.nbOfEnemy = this.nbOfEnemy * 1.05;
        this.speedOfEnemy = this.speedOfEnemy * 1;
        this.healthOfEnemy = this.healthOfEnemy * 2;
        this.ui.level.textContent = this.level;
        this.ui.levelTransition.style.display = 'block';
        this.ui.levelTransition.textContent = this.level;
        // callback inclding this : https://javascript.plainenglish.io/handling-this-with-call-apply-and-bind-55fb059d20bb
        setTimeout(() => {
            this.ui.levelTransition.style.display = 'none';
        }, 1500)
    }
}

export { Level };
