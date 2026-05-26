/* Main Game Engine */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.drone = null;
        this.world = null;
        this.effects = null;
        this.weapons = null;
        this.targetManager = null;
        this.hud = null;
        this.controls = null;
        this.levelManager = new LevelManager();

        this.isRunning = false;
        this.isPaused = false;
        this.isFreeMode = false;
        this.currentLevel = null;
        this.timeLeft = 0;
        this.gameTime = 0;

        this.cameraOffset = new THREE.Vector3(0, 8, 18);
        this.cameraLookOffset = new THREE.Vector3(0, 2, 0);
        this.lastFrameTime = 0;

        this.animationId = null;

        window.gameInstance = this;
    }

    init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);

        // Systems
        this.controls = new Controls();
        this.hud = new HUD();
        this.effects = new EffectsManager(this.scene);
        this.weapons = new WeaponsManager(this.scene, this.effects);
        this.targetManager = new TargetManager(this.scene);
        this.world = new World(this.scene);

        // Resize handler
        window.addEventListener('resize', () => this.onResize());

        // Pause menu buttons
        document.getElementById('btn-resume').addEventListener('click', () => this.resume());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());

        // Level complete buttons
        document.getElementById('btn-next-level').addEventListener('click', () => this.nextLevel());
        document.getElementById('btn-complete-menu').addEventListener('click', () => this.quitToMenu());

        // Game over buttons
        document.getElementById('btn-retry').addEventListener('click', () => this.restart());
        document.getElementById('btn-gameover-menu').addEventListener('click', () => this.quitToMenu());
    }

    startLevel(levelId) {
        this.currentLevel = this.levelManager.getLevel(levelId);
        if (!this.currentLevel) return;

        this.isFreeMode = false;
        this.timeLeft = this.currentLevel.timeLimit;
        this.gameTime = 0;

        this.setupScene();

        // Build world
        switch (this.currentLevel.world) {
            case 'city': this.world.buildCity(); break;
            case 'desert': this.world.buildDesert(); break;
            case 'military': this.world.buildMilitary(); break;
            case 'ocean': this.world.buildOcean(); break;
            case 'mountain': this.world.buildMountain(); break;
            default: this.world.buildCity();
        }

        // Spawn targets
        this.targetManager.spawnTargets(this.currentLevel.targets);

        this.start();
        this.hud.showNotification('УРОВЕНЬ ' + this.currentLevel.id + ': ' + this.currentLevel.name);
    }

    startFreeMode() {
        this.currentLevel = null;
        this.isFreeMode = true;
        this.gameTime = 0;

        this.setupScene();
        this.world.buildFreeWorld();

        // Spawn some random targets for fun
        const randomTargets = [];
        const types = ['static', 'vehicle', 'turret', 'drone', 'radar', 'fuel'];
        for (let i = 0; i < 20; i++) {
            randomTargets.push({
                x: Utils.randomRange(-250, 250),
                y: types[i % types.length] === 'drone' ? Utils.randomRange(15, 30) : 0,
                z: Utils.randomRange(-250, 250),
                type: types[i % types.length],
                health: Utils.randomRange(25, 60)
            });
        }
        this.targetManager.spawnTargets(randomTargets);

        this.start();
        this.hud.showNotification('СВОБОДНЫЙ ПОЛЁТ');
    }

    setupScene() {
        // Clear previous
        if (this.drone) this.drone.dispose();
        this.world.clear();
        this.effects.dispose();
        this.weapons.dispose();
        this.targetManager.clear();
        this.hud.reset();

        // Reset scene fog
        this.scene.fog = null;

        // Create drone
        this.drone = new Drone(this.scene);
    }

    start() {
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();

        this.showScreen('game-screen');
        this.hud.setVisible(true);
        this.hideOverlays();

        this.controls.enable();
        this.controls.requestPointerLock();

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(() => this.gameLoop());

        if (this.isPaused) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
        this.lastFrameTime = now;

        this.update(dt);
        this.render();
    }

    update(dt) {
        // Input
        const input = this.controls.update();

        // Drone
        this.drone.update(dt, input);

        // Camera follow
        this.updateCamera(dt);

        // Weapons
        if (input.fire) {
            const pos = this.drone.getPosition();
            const dir = this.drone.getForward();
            pos.y -= 0.3;
            this.weapons.fireBullet(pos, dir, performance.now() / 1000);
        }

        if (input.rocket && this.drone.rockets > 0) {
            input.rocket = false;
            this.keys_r_released = true;
            const pos = this.drone.getPosition();
            const dir = this.drone.getForward();
            this.weapons.fireRocket(pos, dir);
            this.drone.rockets--;
        }

        // Weapon hits
        const hits = this.weapons.update(dt, this.targetManager.getAliveTargets());
        hits.forEach(hit => {
            const destroyed = hit.target.takeDamage(hit.damage);
            if (destroyed) {
                this.effects.createExplosion(hit.position, 6, 0xff4400);
                this.hud.addScore(hit.target.points);

                const names = {
                    'static': 'Мишень',
                    'vehicle': 'Техника',
                    'turret': 'Турель',
                    'drone': 'Дрон',
                    'radar': 'Радар',
                    'fuel': 'Топливо'
                };
                this.hud.addKill(
                    (names[hit.target.type] || 'Цель') + ' уничтожена! +' + hit.target.points
                );
            }
        });

        // Targets
        this.targetManager.update(dt, this.drone.getPosition());

        // Effects
        this.effects.update(dt);

        // Engine particles
        if (input.forward || input.up) {
            this.effects.createEngineParticles(this.drone.getPosition(), 1);
        }

        // World
        this.world.update(dt);

        // Time
        this.gameTime += dt;
        if (!this.isFreeMode) {
            this.timeLeft -= dt;

            // Check win condition
            if (this.targetManager.getAliveTargets().length === 0) {
                this.levelComplete();
                return;
            }

            // Check time out
            if (this.timeLeft <= 0) {
                this.gameOver();
                return;
            }
        }

        // Check drone health
        if (this.drone.health <= 0) {
            this.gameOver();
            return;
        }

        // HUD
        this.hud.update(this.drone, this.targetManager, this.timeLeft, this.isFreeMode);
        this.hud.gameTime = this.gameTime;
    }

    updateCamera(dt) {
        const dronePos = this.drone.getPosition();
        const droneQuat = this.drone.group.quaternion;

        // Camera behind and above drone
        const offset = this.cameraOffset.clone().applyQuaternion(droneQuat);
        const targetCamPos = dronePos.clone().add(offset);

        // Smooth follow
        this.camera.position.lerp(targetCamPos, 5 * dt);

        // Look at drone
        const lookTarget = dronePos.clone().add(this.cameraLookOffset);
        this.camera.lookAt(lookTarget);

        // Mouse vertical camera adjustment
        const input = this.controls.input;
        if (input.mouseY) {
            this.cameraOffset.y = Utils.clamp(
                this.cameraOffset.y + input.mouseY * 0.01,
                3, 20
            );
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    togglePause() {
        if (!this.isRunning) return;

        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    pause() {
        this.isPaused = true;
        this.controls.disable();
        this.controls.exitPointerLock();
        document.getElementById('pause-menu').classList.remove('hidden');
    }

    resume() {
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.controls.enable();
        this.controls.requestPointerLock();
        document.getElementById('pause-menu').classList.add('hidden');
    }

    restart() {
        this.hideOverlays();
        if (this.isFreeMode) {
            this.startFreeMode();
        } else if (this.currentLevel) {
            this.startLevel(this.currentLevel.id);
        }
    }

    nextLevel() {
        if (!this.currentLevel) return;
        const nextId = this.currentLevel.id + 1;
        const nextLevel = this.levelManager.getLevel(nextId);
        if (nextLevel) {
            this.startLevel(nextId);
        } else {
            this.hud.showNotification('ВСЕ УРОВНИ ПРОЙДЕНЫ!', 3000);
            setTimeout(() => this.quitToMenu(), 3000);
        }
    }

    levelComplete() {
        this.isRunning = false;
        this.controls.disable();
        this.controls.exitPointerLock();

        const stars = this.levelManager.calculateStars(
            this.currentLevel.id,
            this.hud.score,
            this.timeLeft
        );

        this.levelManager.unlockNext(this.currentLevel.id);

        // Show completion screen
        const starsDisplay = document.getElementById('stars-display');
        starsDisplay.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            starsDisplay.innerHTML += i < stars ? '&#11088;' : '&#9734;';
        }

        document.getElementById('complete-score').textContent = 'Счёт: ' + this.hud.score;
        document.getElementById('complete-time').textContent = 'Время: ' + Utils.formatTime(this.gameTime);

        document.getElementById('level-complete').classList.remove('hidden');
    }

    gameOver() {
        this.isRunning = false;
        this.controls.disable();
        this.controls.exitPointerLock();

        // Explosion on drone
        this.effects.createExplosion(this.drone.getPosition(), 10, 0xff2200);

        document.getElementById('gameover-score').textContent = 'Счёт: ' + this.hud.score;
        document.getElementById('game-over').classList.remove('hidden');
    }

    quitToMenu() {
        this.isRunning = false;
        this.controls.disable();
        this.controls.exitPointerLock();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.hideOverlays();
        this.hud.setVisible(false);
        this.showScreen('menu-screen');
        if (window.menuInstance) {
            window.menuInstance.refreshLevelGrid();
        }
    }

    hideOverlays() {
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('level-complete').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
