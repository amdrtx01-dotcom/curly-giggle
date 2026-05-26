/* Input Controls Manager */

class Controls {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, dx: 0, dy: 0, leftDown: false, rightDown: false };
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            rotateLeft: false,
            rotateRight: false,
            fire: false,
            rocket: false,
            mouseX: 0,
            mouseY: 0
        };

        this.isLocked = false;
        this.enabled = false;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);

        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.resetInput();
    }

    requestPointerLock() {
        const canvas = document.getElementById('game-canvas');
        if (canvas && canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }

    exitPointerLock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    onPointerLockChange() {
        this.isLocked = document.pointerLockElement === document.getElementById('game-canvas');
    }

    onKeyDown(e) {
        this.keys[e.code] = true;

        if (e.code === 'Escape') {
            if (window.gameInstance) {
                window.gameInstance.togglePause();
            }
        }
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseMove(e) {
        if (this.isLocked) {
            this.mouse.dx = e.movementX || 0;
            this.mouse.dy = e.movementY || 0;
        }
    }

    onMouseDown(e) {
        if (e.button === 0) this.mouse.leftDown = true;
        if (e.button === 2) this.mouse.rightDown = true;

        if (this.enabled && !this.isLocked) {
            this.requestPointerLock();
        }
    }

    onMouseUp(e) {
        if (e.button === 0) this.mouse.leftDown = false;
        if (e.button === 2) this.mouse.rightDown = false;
    }

    update() {
        if (!this.enabled) return this.input;

        this.input.forward = this.keys['KeyW'] || false;
        this.input.backward = this.keys['KeyS'] || false;
        this.input.left = this.keys['KeyA'] || false;
        this.input.right = this.keys['KeyD'] || false;
        this.input.up = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['Space'] || false;
        this.input.down = this.keys['ControlLeft'] || this.keys['ControlRight'] || false;
        this.input.rotateLeft = this.keys['KeyQ'] || false;
        this.input.rotateRight = this.keys['KeyE'] || false;
        this.input.fire = this.mouse.leftDown;
        this.input.rocket = this.keys['KeyR'] || false;

        this.input.mouseX = this.mouse.dx;
        this.input.mouseY = this.mouse.dy;
        this.mouse.dx = 0;
        this.mouse.dy = 0;

        return this.input;
    }

    resetInput() {
        this.keys = {};
        this.mouse.leftDown = false;
        this.mouse.rightDown = false;
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            rotateLeft: false,
            rotateRight: false,
            fire: false,
            rocket: false,
            mouseX: 0,
            mouseY: 0
        };
    }

    dispose() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    }
}
