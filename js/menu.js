/* Menu System */

class Menu {
    constructor(game) {
        this.game = game;
        this.menuScene = null;
        this.menuCamera = null;
        this.menuRenderer = null;
        this.menuDrone = null;
        this.animationId = null;

        window.menuInstance = this;
        this.initMenuBackground();
        this.initButtons();
        this.buildLevelGrid();
    }

    initMenuBackground() {
        const canvas = document.getElementById('menu-bg-canvas');

        this.menuRenderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.menuRenderer.setSize(window.innerWidth, window.innerHeight);
        this.menuRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.menuScene = new THREE.Scene();
        this.menuScene.fog = new THREE.FogExp2(0x0a1020, 0.008);

        this.menuCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
        this.menuCamera.position.set(0, 8, 20);
        this.menuCamera.lookAt(0, 3, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x1a2a4a, 0.5);
        this.menuScene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x4488ff, 0.8);
        dirLight.position.set(10, 20, -10);
        this.menuScene.add(dirLight);

        const pointLight = new THREE.PointLight(0x00b4ff, 1.5, 30);
        pointLight.position.set(0, 5, 5);
        this.menuScene.add(pointLight);

        // Ground grid
        const gridGeom = new THREE.PlaneGeometry(100, 100, 40, 40);
        const gridMat = new THREE.MeshBasicMaterial({
            color: 0x0a2040,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const grid = new THREE.Mesh(gridGeom, gridMat);
        grid.rotation.x = -Math.PI / 2;
        this.menuScene.add(grid);

        // Decorative drone model
        this.menuDrone = this.createMenuDrone();
        this.menuScene.add(this.menuDrone);

        // Particles / floating lights
        this.menuParticles = [];
        for (let i = 0; i < 50; i++) {
            const pGeom = new THREE.SphereGeometry(0.05, 4, 4);
            const pMat = new THREE.MeshBasicMaterial({
                color: 0x00b4ff,
                transparent: true,
                opacity: Utils.randomRange(0.2, 0.6)
            });
            const p = new THREE.Mesh(pGeom, pMat);
            p.position.set(
                Utils.randomRange(-20, 20),
                Utils.randomRange(0, 15),
                Utils.randomRange(-20, 20)
            );
            p.userData = {
                speed: Utils.randomRange(0.2, 0.8),
                offset: Utils.randomRange(0, Math.PI * 2)
            };
            this.menuScene.add(p);
            this.menuParticles.push(p);
        }

        // Start animation
        this.animateMenu();

        // Handle resize
        window.addEventListener('resize', () => {
            if (this.menuRenderer && this.menuCamera) {
                this.menuCamera.aspect = window.innerWidth / window.innerHeight;
                this.menuCamera.updateProjectionMatrix();
                this.menuRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }

    createMenuDrone() {
        const group = new THREE.Group();

        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            specular: 0x444444,
            shininess: 80
        });
        const accentMat = new THREE.MeshPhongMaterial({
            color: 0x00b4ff,
            emissive: 0x003366,
            specular: 0x88ccff,
            shininess: 100
        });

        // Body
        const bodyGeom = new THREE.BoxGeometry(1.2, 0.4, 1.8);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        group.add(body);

        // Canopy
        const canopyGeom = new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopy = new THREE.Mesh(canopyGeom, accentMat);
        canopy.position.set(0, 0.2, -0.1);
        canopy.scale.set(1, 0.5, 1.2);
        group.add(canopy);

        // Arms & rotors
        this.menuPropellers = [];
        [{ x: 1.2, z: 1.0 }, { x: -1.2, z: 1.0 }, { x: 1.2, z: -1.0 }, { x: -1.2, z: -1.0 }].forEach((pos, i) => {
            const armGeom = new THREE.BoxGeometry(1.8, 0.15, 0.15);
            const arm = new THREE.Mesh(armGeom, bodyMat);
            arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
            arm.rotation.y = Math.atan2(pos.x, pos.z);
            group.add(arm);

            const motorGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8);
            const motor = new THREE.Mesh(motorGeom, bodyMat);
            motor.position.set(pos.x, 0.15, pos.z);
            group.add(motor);

            const propGroup = new THREE.Group();
            propGroup.position.set(pos.x, 0.35, pos.z);

            const bladeGeom = new THREE.BoxGeometry(1.4, 0.02, 0.12);
            const blade1 = new THREE.Mesh(bladeGeom, accentMat);
            propGroup.add(blade1);
            const blade2 = new THREE.Mesh(bladeGeom, accentMat);
            blade2.rotation.y = Math.PI / 2;
            propGroup.add(blade2);

            group.add(propGroup);
            this.menuPropellers.push({ group: propGroup, dir: i % 2 === 0 ? 1 : -1 });

            // LEDs
            const ledGeom = new THREE.SphereGeometry(0.06, 6, 6);
            const ledMat = new THREE.MeshBasicMaterial({ color: i < 2 ? 0x00ff44 : 0xff2200 });
            const led = new THREE.Mesh(ledGeom, ledMat);
            led.position.set(pos.x * 0.7, -0.1, pos.z * 0.7);
            group.add(led);
        });

        group.scale.set(2, 2, 2);
        group.position.set(0, 4, 0);

        return group;
    }

    animateMenu() {
        if (!document.getElementById('menu-screen').classList.contains('active') &&
            !document.getElementById('level-select-screen').classList.contains('active') &&
            !document.getElementById('controls-screen').classList.contains('active')) {
            this.animationId = requestAnimationFrame(() => this.animateMenu());
            return;
        }

        this.animationId = requestAnimationFrame(() => this.animateMenu());

        const time = Date.now() * 0.001;

        // Drone hover animation
        if (this.menuDrone) {
            this.menuDrone.position.y = 4 + Math.sin(time * 0.8) * 0.5;
            this.menuDrone.rotation.y += 0.005;
            this.menuDrone.rotation.z = Math.sin(time * 0.5) * 0.05;

            // Spin propellers
            this.menuPropellers.forEach(p => {
                p.group.rotation.y += 0.5 * p.dir;
            });
        }

        // Particle animation
        this.menuParticles.forEach(p => {
            p.position.y += Math.sin(time * p.userData.speed + p.userData.offset) * 0.01;
            p.material.opacity = 0.2 + Math.sin(time * 2 + p.userData.offset) * 0.2;
        });

        this.menuRenderer.render(this.menuScene, this.menuCamera);
    }

    initButtons() {
        // Main menu
        document.getElementById('btn-levels').addEventListener('click', () => {
            this.showScreen('level-select-screen');
        });

        document.getElementById('btn-freefly').addEventListener('click', () => {
            this.showLoading(() => this.game.startFreeMode());
        });

        document.getElementById('btn-controls').addEventListener('click', () => {
            this.showScreen('controls-screen');
        });

        // Back buttons
        document.getElementById('btn-back-levels').addEventListener('click', () => {
            this.showScreen('menu-screen');
        });

        document.getElementById('btn-back-controls').addEventListener('click', () => {
            this.showScreen('menu-screen');
        });
    }

    buildLevelGrid() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';

        const levels = this.game.levelManager.getAllLevels();
        levels.forEach(level => {
            const card = document.createElement('div');
            card.className = 'level-card';

            const isUnlocked = this.game.levelManager.isUnlocked(level.id);
            if (!isUnlocked) card.classList.add('locked');

            const stars = this.game.levelManager.getStars(level.id);
            const starsHtml = '&#11088;'.repeat(stars) + '&#9734;'.repeat(3 - stars);

            card.innerHTML = `
                <div class="level-number">${level.id}</div>
                <div class="level-name">${level.name}</div>
                <div class="level-stars">${isUnlocked ? starsHtml : '&#128274;'}</div>
            `;

            if (isUnlocked) {
                card.addEventListener('click', () => {
                    this.showLoading(() => this.game.startLevel(level.id));
                });
            }

            grid.appendChild(card);
        });
    }

    refreshLevelGrid() {
        this.buildLevelGrid();
    }

    showLoading(callback) {
        this.showScreen('loading-screen');
        const fill = document.getElementById('loading-fill');
        const text = document.getElementById('loading-text');

        const messages = [
            'Инициализация систем...',
            'Загрузка мира...',
            'Подготовка дрона...',
            'Калибровка оружия...',
            'Запуск двигателей...'
        ];

        let progress = 0;
        const interval = setInterval(() => {
            progress += Utils.randomRange(5, 15);
            if (progress > 100) progress = 100;
            fill.style.width = progress + '%';
            text.textContent = messages[Math.min(Math.floor(progress / 25), messages.length - 1)];

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    callback();
                    this.showScreen('game-screen');
                }, 300);
            }
        }, 100);
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
