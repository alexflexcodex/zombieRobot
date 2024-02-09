/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import { EventDispatcher, Logger } from 'yuka';



class Controls extends EventDispatcher {

    constructor(owner = null) {

        super();

        this.owner = owner;

        this._mouseDownHandler = onMouseDown.bind(this);
        this._mouseMoveHandler = onMouseMove.bind(this);
        this._pointerlockChangeHandler = onPointerlockChange.bind(this);
        this._pointerlockErrorHandler = onPointerlockError.bind(this);
        this._keyDownHandler = onKeyDown.bind(this);
        this._keyUpHandler = onKeyUp.bind(this);
        this.keyStates = {};

    }

    connect() {

        document.addEventListener('mousedown', this._mouseDownHandler, false);
        document.addEventListener('mousemove', this._mouseMoveHandler, false);
        document.addEventListener('pointerlockchange', this._pointerlockChangeHandler, false);
        document.addEventListener('pointerlockerror', this._pointerlockErrorHandler, false);
        document.addEventListener('keydown', this._keyDownHandler, false);
        document.addEventListener('keyup', this._keyUpHandler, false);
        document.body.requestPointerLock();

    }

    disconnect() {

        document.removeEventListener('mousedown', this._mouseDownHandler, false);
        document.removeEventListener('mousemove', this._mouseMoveHandler, false);
        document.removeEventListener('pointerlockchange', this._pointerlockChangeHandler, false);
        document.removeEventListener('pointerlockerror', this._pointerlockErrorHandler, false);
        document.removeEventListener('keydown', this._keyDownHandler, false);
        document.removeEventListener('keyup', this._keyUpHandler, false);

    }

    exit() {
        document.exitPointerLock();
    }

    controls(deltaTime) {

        // gives a bit of air control
        const speedDelta = deltaTime * (this.owner.playerOnFloor ? 25 : 8);

        if (this.keyStates['KeyW']) {
            this.owner.camera.getWorldDirection(this.owner.playerDirection);
            this.owner.playerDirection.y = 0;
            this.owner.playerDirection.normalize();
            this.owner.playerVelocity.add(this.owner.playerDirection.multiplyScalar(speedDelta));
        }

        if (this.keyStates['KeyS']) {
            this.owner.camera.getWorldDirection(this.owner.playerDirection);
            this.owner.playerDirection.y = 0;
            this.owner.playerDirection.normalize();
            this.owner.playerVelocity.add(this.owner.playerDirection.multiplyScalar(- speedDelta));
        }

        if (this.keyStates['KeyA']) {
            this.owner.camera.getWorldDirection(this.owner.playerDirection);
            this.owner.playerDirection.y = 0;
            this.owner.playerDirection.normalize();
            this.owner.playerDirection.cross(this.owner.camera.up);
            this.owner.playerVelocity.add(this.owner.playerDirection.multiplyScalar(- speedDelta));
        }

        if (this.keyStates['KeyD']) {
            this.owner.camera.getWorldDirection(this.owner.playerDirection);
            this.owner.playerDirection.y = 0;
            this.owner.playerDirection.normalize();
            this.owner.playerDirection.cross(this.owner.camera.up);
            this.owner.playerVelocity.add(this.owner.playerDirection.multiplyScalar(speedDelta));
        }

        if (this.owner.playerOnFloor) {
            if (this.keyStates['Space']) {
                this.owner.playerVelocity.y = 15;
            }
        }
    }
}

// handler

function onMouseDown() {
    this.owner.shoot();
}

function onMouseMove(event) {
    if (document.pointerLockElement === document.body) {

        this.owner.camera.rotation.y -= event.movementX / 500;
        this.owner.camera.rotation.x -= event.movementY / 500;
    }
}

function onPointerlockChange() {

    if (document.pointerLockElement === document.body) {

        this.dispatchEvent({ type: 'lock' });

    } else {

        this.disconnect();

        this.dispatchEvent({ type: 'unlock' });

    }

}

function onPointerlockError() {

    Logger.warn('YUKA.Player: Unable to use Pointer Lock API.');

}

function onKeyDown(event) {
    this.keyStates[event.code] = true;


}

function onKeyUp(event) {
    this.keyStates[event.code] = false;


}

export { Controls };
