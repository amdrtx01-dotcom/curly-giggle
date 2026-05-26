/* Input Controls Manager — Desktop + FPV Mobile Touch */

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
            mouseY: 0,
            throttle: 0,
            yaw: 0,
            pitch: 0,
            roll: 0
        };

        this.isLocked = false;
        this.enabled = false;
        this.isMobile = this.detectMobile();
        this.cameraMode = 'third'; // 'third' or 'fpv'

        // Touch joystick state
        this.leftStick = { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 };
        this.rightStick = { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 };

        // Gyroscope
        this.gyroEnabled = false;
        this.gyroAlpha = 0;
        this.gyroBeta = 0;
        this.gyroGamma = 0;

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

        if (this.isMobile) {
            this.setupTouchControls();
            this.setupGyroscope();
        }
    }

    detectMobile() {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    toggleCameraMode() {
        this.cameraMode = this.cameraMode === 'third' ? 'fpv' : 'third';
        return this.cameraMode;
    }

    setupTouchControls() {
        this.createTouchUI();

        const gameScreen = document.getElementById('game-screen');
        gameScreen.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        gameScreen.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        gameScreen.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        gameScreen.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
    }

    createTouchUI() {
        // Left joystick area (throttle + yaw)
        const leftZone = document.createElement('div');
        leftZone.id = 'touch-left-zone';
        leftZone.className = 'touch-zone';
        leftZone.innerHTML = `
            <div class="joystick-base" id="left-joystick-base">
                <div class="joystick-thumb" id="left-joystick-thumb"></div>
            </div>
            <span class="joystick-label">THROTTLE / YAW</span>
        `;
        document.getElementById('game-screen').appendChild(leftZone);

        // Right joystick area (pitch + roll)
        const rightZone = document.createElement('div');
        rightZone.id = 'touch-right-zone';
        rightZone.className = 'touch-zone';
        rightZone.innerHTML = `
            <div class="joystick-base" id="right-joystick-base">
                <div class="joystick-thumb" id="right-joystick-thumb"></div>
            </div>
            <span class="joystick-label">PITCH / ROLL</span>
        `;
        document.getElementById('game-screen').appendChild(rightZone);

        // Action buttons
        const actionBtns = document.createElement('div');
        actionBtns.id = 'touch-actions';
        actionBtns.innerHTML = `
            <button class="touch-btn" id="touch-fire" ontouchstart="event.preventDefault()">🔫</button>
            <button class="touch-btn" id="touch-rocket" ontouchstart="event.preventDefault()">🚀</button>
            <button class="touch-btn touch-btn-small" id="touch-camera" ontouchstart="event.preventDefault()">📷</button>
            <button class="touch-btn touch-btn-small" id="touch-pause" ontouchstart="event.preventDefault()">⏸</button>
        `;
        document.getElementById('game-screen').appendChild(actionBtns);

        // Fire button
        document.getElementById('touch-fire').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.fire = true;
        });
        document.getElementById('touch-fire').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.input.fire = false;
        });

        // Rocket button
        document.getElementById('touch-rocket').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.rocket = true;
        });
        document.getElementById('touch-rocket').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.input.rocket = false;
        });

        // Camera toggle
        document.getElementById('touch-camera').addEventListener('touchstart', (e) => {
            e.preventDefault();
            const mode = this.toggleCameraMode();
            if (window.gameInstance) {
                window.gameInstance.setCameraMode(mode);
            }
        });

        // Pause button
        document.getElementById('touch-pause').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (window.gameInstance) {
                window.gameInstance.togglePause();
            }
        });
    }

    setupGyroscope() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            this.gyroPermissionNeeded = true;
        } else if ('DeviceOrientationEvent' in window) {
            this.enableGyroscope();
        }
    }

    requestGyroPermission() {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.enableGyroscope();
                    }
                });
        }
    }

    enableGyroscope() {
        this.gyroEnabled = true;
        window.addEventListener('deviceorientation', (e) => {
            this.gyroAlpha = e.alpha || 0;
            this.gyroBeta = e.beta || 0;
            this.gyroGamma = e.gamma || 0;
        });
    }

    onTouchStart(e) {
        if (!this.enabled) return;
        const screenW = window.innerWidth;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const x = touch.clientX;
            const y = touch.clientY;

            // Left half → left stick (throttle/yaw)
            if (x < screenW / 2 && !this.leftStick.active) {
                this.leftStick.active = true;
                this.leftStick.id = touch.identifier;
                this.leftStick.startX = x;
                this.leftStick.startY = y;
                this.leftStick.x = 0;
                this.leftStick.y = 0;
                this.updateJoystickVisual('left', x, y, 0, 0);
                e.preventDefault();
            }
            // Right half → right stick (pitch/roll)
            else if (x >= screenW / 2 && !this.rightStick.active) {
                this.rightStick.active = true;
                this.rightStick.id = touch.identifier;
                this.rightStick.startX = x;
                this.rightStick.startY = y;
                this.rightStick.x = 0;
                this.rightStick.y = 0;
                this.updateJoystickVisual('right', x, y, 0, 0);
                e.preventDefault();
            }
        }
    }

    onTouchMove(e) {
        if (!this.enabled) return;
        const maxDist = 60;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.leftStick.id) {
                let dx = touch.clientX - this.leftStick.startX;
                let dy = touch.clientY - this.leftStick.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }
                this.leftStick.x = dx / maxDist;
                this.leftStick.y = -dy / maxDist; // Invert Y for throttle (up = positive)
                this.updateJoystickVisual('left', this.leftStick.startX, this.leftStick.startY, dx, dy);
                e.preventDefault();
            }

            if (touch.identifier === this.rightStick.id) {
                let dx = touch.clientX - this.rightStick.startX;
                let dy = touch.clientY - this.rightStick.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }
                this.rightStick.x = dx / maxDist;
                this.rightStick.y = -dy / maxDist;
                this.updateJoystickVisual('right', this.rightStick.startX, this.rightStick.startY, dx, dy);
                e.preventDefault();
            }
        }
    }

    onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.leftStick.id) {
                this.leftStick.active = false;
                this.leftStick.id = null;
                this.leftStick.x = 0;
                this.leftStick.y = 0;
                this.resetJoystickVisual('left');
            }

            if (touch.identifier === this.rightStick.id) {
                this.rightStick.active = false;
                this.rightStick.id = null;
                this.rightStick.x = 0;
                this.rightStick.y = 0;
                this.resetJoystickVisual('right');
            }
        }
    }

    updateJoystickVisual(side, baseX, baseY, dx, dy) {
        const base = document.getElementById(side + '-joystick-base');
        const thumb = document.getElementById(side + '-joystick-thumb');
        if (!base || !thumb) return;

        base.style.display = 'block';
        base.style.left = (baseX - 50) + 'px';
        base.style.top = (baseY - 50) + 'px';
        thumb.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    }

    resetJoystickVisual(side) {
        const base = document.getElementById(side + '-joystick-base');
        const thumb = document.getElementById(side + '-joystick-thumb');
        if (!base || !thumb) return;

        base.style.display = 'none';
        thumb.style.transform = 'translate(0, 0)';
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.resetInput();
    }

    requestPointerLock() {
        if (this.isMobile) return;
        const canvas = document.getElementById('game-canvas');
        if (canvas && canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }

    exitPointerLock() {
        if (this.isMobile) return;
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

        // Toggle camera mode with V key
        if (e.code === 'KeyV') {
            const mode = this.toggleCameraMode();
            if (window.gameInstance) {
                window.gameInstance.setCameraMode(mode);
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

        if (this.enabled && !this.isLocked && !this.isMobile) {
            this.requestPointerLock();
        }
    }

    onMouseUp(e) {
        if (e.button === 0) this.mouse.leftDown = false;
        if (e.button === 2) this.mouse.rightDown = false;
    }

    update() {
        if (!this.enabled) return this.input;

        if (this.isMobile) {
            return this.updateMobile();
        }

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

        // FPV analog values from keyboard (for consistent physics)
        this.input.throttle = this.input.up ? 1.0 : (this.input.down ? -0.8 : 0);
        this.input.yaw = (this.input.rotateLeft ? 1 : 0) + (this.input.rotateRight ? -1 : 0);
        this.input.pitch = (this.input.forward ? 1 : 0) + (this.input.backward ? -0.6 : 0);
        this.input.roll = (this.input.right ? 1 : 0) + (this.input.left ? -1 : 0);

        return this.input;
    }

    updateMobile() {
        // Left stick: Y = throttle (up/down), X = yaw (rotation)
        const deadzone = 0.15;
        const lx = Math.abs(this.leftStick.x) > deadzone ? this.leftStick.x : 0;
        const ly = Math.abs(this.leftStick.y) > deadzone ? this.leftStick.y : 0;

        // Right stick: Y = pitch (forward/back), X = roll (left/right)
        const rx = Math.abs(this.rightStick.x) > deadzone ? this.rightStick.x : 0;
        const ry = Math.abs(this.rightStick.y) > deadzone ? this.rightStick.y : 0;

        // Map to FPV controls
        this.input.throttle = ly;
        this.input.yaw = lx;
        this.input.pitch = ry;
        this.input.roll = rx;

        // Map to boolean for compatibility
        this.input.up = ly > deadzone;
        this.input.down = ly < -deadzone;
        this.input.forward = ry > deadzone;
        this.input.backward = ry < -deadzone;
        this.input.left = rx < -deadzone;
        this.input.right = rx > deadzone;
        this.input.rotateLeft = lx < -deadzone;
        this.input.rotateRight = lx > deadzone;

        // Gyroscope camera look
        if (this.gyroEnabled) {
            this.input.mouseX = this.gyroGamma * 0.1;
            this.input.mouseY = (this.gyroBeta - 45) * 0.1;
        }

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
            mouseY: 0,
            throttle: 0,
            yaw: 0,
            pitch: 0,
            roll: 0
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
