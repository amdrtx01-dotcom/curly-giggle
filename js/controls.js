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
        this.computeStickGeometry();

        const gameScreen = document.getElementById('game-screen');
        gameScreen.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        gameScreen.addEventListener('touchmove',  (e) => this.onTouchMove(e),  { passive: false });
        gameScreen.addEventListener('touchend',   (e) => this.onTouchEnd(e),   { passive: false });
        gameScreen.addEventListener('touchcancel',(e) => this.onTouchEnd(e),   { passive: false });

        window.addEventListener('resize',           () => this.computeStickGeometry());
        window.addEventListener('orientationchange',() => this.computeStickGeometry());
    }

    /**
     * Pick a joystick size + anchor that adapts to any screen.
     * - Base radius scales with the shorter screen dimension.
     * - Bases are anchored inside safe areas (notch / nav bars).
     * - Recomputed on resize / orientation change.
     */
    computeStickGeometry() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const shorter = Math.min(vw, vh);

        // Clamp size for tiny phones and big tablets.
        this.stickRadius = Utils.clamp(shorter * 0.13, 55, 110);
        this.stickMaxOffset = this.stickRadius * 0.85;

        // Distance from screen edge — fraction of screen, never smaller than 16px.
        const margin = Math.max(16, Math.round(shorter * 0.06));

        // Bottom anchor: a bit higher in landscape so thumbs reach naturally.
        const bottomFrac = vw > vh ? 0.20 : 0.16;
        const stickBottom = Math.max(margin, Math.round(vh * bottomFrac));

        const leftBase = document.getElementById('left-joystick-base');
        const rightBase = document.getElementById('right-joystick-base');
        if (leftBase) {
            leftBase.style.width  = this.stickRadius * 2 + 'px';
            leftBase.style.height = this.stickRadius * 2 + 'px';
            leftBase.style.left   = margin + 'px';
            leftBase.style.bottom = stickBottom + 'px';
        }
        if (rightBase) {
            rightBase.style.width  = this.stickRadius * 2 + 'px';
            rightBase.style.height = this.stickRadius * 2 + 'px';
            rightBase.style.right  = margin + 'px';
            rightBase.style.bottom = stickBottom + 'px';
        }
        // Cache base centers for hit-tests
        if (leftBase)  this._leftBaseRect  = leftBase.getBoundingClientRect();
        if (rightBase) this._rightBaseRect = rightBase.getBoundingClientRect();

        // Resize touch buttons proportional to the sticks too.
        const btnSize = Math.round(this.stickRadius * 1.05);
        document.querySelectorAll('.touch-btn').forEach(b => {
            b.style.width  = btnSize + 'px';
            b.style.height = btnSize + 'px';
            b.style.fontSize = Math.round(btnSize * 0.4) + 'px';
        });
        document.querySelectorAll('.touch-btn-small').forEach(b => {
            const s = Math.round(btnSize * 0.72);
            b.style.width  = s + 'px';
            b.style.height = s + 'px';
            b.style.fontSize = Math.round(s * 0.4) + 'px';
        });
    }

    createTouchUI() {
        // Left joystick — visible permanently, anchored bottom-left
        const leftBase = document.createElement('div');
        leftBase.className = 'joystick-base joystick-anchored';
        leftBase.id = 'left-joystick-base';
        leftBase.innerHTML = `
            <div class="joystick-thumb" id="left-joystick-thumb"></div>
            <span class="joystick-label">ТЯГА</span>
        `;
        document.getElementById('game-screen').appendChild(leftBase);

        // Right joystick — anchored bottom-right
        const rightBase = document.createElement('div');
        rightBase.className = 'joystick-base joystick-anchored';
        rightBase.id = 'right-joystick-base';
        rightBase.innerHTML = `
            <div class="joystick-thumb" id="right-joystick-thumb"></div>
            <span class="joystick-label">КУРС</span>
        `;
        document.getElementById('game-screen').appendChild(rightBase);

        // Action buttons (right side, above right stick)
        const actionBtns = document.createElement('div');
        actionBtns.id = 'touch-actions';
        actionBtns.innerHTML = `
            <button class="touch-btn" id="touch-rocket" ontouchstart="event.preventDefault()">🚀</button>
            <button class="touch-btn" id="touch-fire" ontouchstart="event.preventDefault()">🔫</button>
        `;
        document.getElementById('game-screen').appendChild(actionBtns);

        // Top-right helper buttons
        const topBtns = document.createElement('div');
        topBtns.id = 'touch-top-buttons';
        topBtns.innerHTML = `
            <button class="touch-btn touch-btn-small" id="touch-camera" ontouchstart="event.preventDefault()">📷</button>
            <button class="touch-btn touch-btn-small" id="touch-pause" ontouchstart="event.preventDefault()">⏸</button>
        `;
        document.getElementById('game-screen').appendChild(topBtns);

        const bindHold = (id, on, off) => {
            const el = document.getElementById(id);
            if (!el) return;
            const start = (e) => { e.preventDefault(); e.stopPropagation(); on(); };
            const end   = (e) => { e.preventDefault(); e.stopPropagation(); off(); };
            el.addEventListener('touchstart',  start, { passive: false });
            el.addEventListener('touchend',    end,   { passive: false });
            el.addEventListener('touchcancel', end,   { passive: false });
        };
        bindHold('touch-fire',
            () => { this.input.fire = true; },
            () => { this.input.fire = false; });
        bindHold('touch-rocket',
            () => { this.input.rocket = true; },
            () => { this.input.rocket = false; });

        document.getElementById('touch-camera').addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            const mode = this.toggleCameraMode();
            if (window.gameInstance) window.gameInstance.setCameraMode(mode);
        }, { passive: false });

        document.getElementById('touch-pause').addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (window.gameInstance) window.gameInstance.togglePause();
        }, { passive: false });
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

    _isOnButton(target) {
        // Ignore touches that land on action buttons or HUD widgets.
        if (!target || !target.closest) return false;
        return !!target.closest('.touch-btn, button, #hud, #pause-menu, #level-complete, #game-over');
    }

    onTouchStart(e) {
        if (!this.enabled) return;

        const vw = window.innerWidth;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (this._isOnButton(touch.target)) continue;

            const x = touch.clientX, y = touch.clientY;
            const side = x < vw / 2 ? 'left' : 'right';
            const stick = side === 'left' ? this.leftStick : this.rightStick;
            if (stick.active) continue;

            // Anchor at the base center (so thumb tracks finger offset from base),
            // unless the user touched far away — then move the base under the finger.
            const baseRect = side === 'left' ? this._leftBaseRect : this._rightBaseRect;
            let cx = baseRect.left + baseRect.width / 2;
            let cy = baseRect.top  + baseRect.height / 2;
            const farFromBase = Math.hypot(x - cx, y - cy) > this.stickRadius * 1.6;
            if (farFromBase) {
                this._moveStickBase(side, x, y);
                cx = x; cy = y;
            }

            stick.active = true;
            stick.id = touch.identifier;
            stick.startX = cx;
            stick.startY = cy;
            stick.x = 0;
            stick.y = 0;
            this._applyStickDelta(side, x, y);
            e.preventDefault();
        }
    }

    onTouchMove(e) {
        if (!this.enabled) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.leftStick.id)  this._applyStickDelta('left',  touch.clientX, touch.clientY);
            if (touch.identifier === this.rightStick.id) this._applyStickDelta('right', touch.clientX, touch.clientY);
        }
        // Prevent the page from scrolling/zooming while the user flies.
        if (e.cancelable) e.preventDefault();
    }

    onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.leftStick.id)  this._releaseStick('left');
            if (touch.identifier === this.rightStick.id) this._releaseStick('right');
        }
    }

    _applyStickDelta(side, touchX, touchY) {
        const stick = side === 'left' ? this.leftStick : this.rightStick;
        let dx = touchX - stick.startX;
        let dy = touchY - stick.startY;
        const dist = Math.hypot(dx, dy);
        const max = this.stickMaxOffset;
        if (dist > max) {
            dx = (dx / dist) * max;
            dy = (dy / dist) * max;
        }
        stick.x =  dx / max;            // right = +1
        stick.y = -dy / max;            // up    = +1 (screen y is flipped)
        const thumb = document.getElementById(side + '-joystick-thumb');
        if (thumb) thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    _releaseStick(side) {
        const stick = side === 'left' ? this.leftStick : this.rightStick;
        stick.active = false;
        stick.id = null;
        stick.x = 0;
        stick.y = 0;
        const thumb = document.getElementById(side + '-joystick-thumb');
        if (thumb) thumb.style.transform = 'translate(0, 0)';
        // Snap base back to its anchored position
        this._restoreStickBase(side);
    }

    _moveStickBase(side, cx, cy) {
        const base = document.getElementById(side + '-joystick-base');
        if (!base) return;
        const r = this.stickRadius;
        base.style.left   = (cx - r) + 'px';
        base.style.top    = (cy - r) + 'px';
        base.style.right  = 'auto';
        base.style.bottom = 'auto';
        const rect = base.getBoundingClientRect();
        if (side === 'left') this._leftBaseRect = rect;
        else                 this._rightBaseRect = rect;
    }

    _restoreStickBase(side) {
        // Trigger geometry recompute so the base returns to its anchored slot.
        this.computeStickGeometry();
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
