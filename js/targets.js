/* Target Objects */

class Target {
    constructor(scene, position, type, health) {
        this.scene = scene;
        this.type = type || 'static';
        this.health = health || 30;
        this.maxHealth = this.health;
        this.alive = true;
        this.hitRadius = 3;
        this.points = 100;
        this.group = new THREE.Group();

        this.moveSpeed = 0;
        this.moveDir = new THREE.Vector3();
        this.moveTimer = 0;
        this.hoverOffset = 0;
        this.shootTimer = 0;
        this.canShoot = false;

        this.buildModel(type);
        this.group.position.copy(position);
        scene.add(this.group);
    }

    buildModel(type) {
        switch (type) {
            case 'static':
                this.buildStaticTarget();
                this.points = 100;
                break;
            case 'vehicle':
                this.buildVehicle();
                this.points = 200;
                this.hitRadius = 4;
                this.moveSpeed = 8;
                break;
            case 'turret':
                this.buildTurret();
                this.points = 300;
                this.hitRadius = 3;
                this.canShoot = true;
                break;
            case 'drone':
                this.buildEnemyDrone();
                this.points = 500;
                this.hitRadius = 2;
                this.moveSpeed = 15;
                break;
            case 'radar':
                this.buildRadar();
                this.points = 400;
                this.hitRadius = 5;
                break;
            case 'fuel':
                this.buildFuelDepot();
                this.points = 250;
                this.hitRadius = 6;
                break;
            default:
                this.buildStaticTarget();
        }

        // Health bar
        const barBg = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.7 })
        );
        const barFill = new THREE.Mesh(
            new THREE.PlaneGeometry(2.8, 0.2),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        barBg.position.y = this.hitRadius + 3;
        barFill.position.y = this.hitRadius + 3;
        barFill.position.z = 0.01;
        this.group.add(barBg);
        this.group.add(barFill);
        this.healthBar = barFill;
        this.healthBarBg = barBg;

        // Target indicator
        const indicatorGeom = new THREE.RingGeometry(this.hitRadius + 1, this.hitRadius + 1.3, 16);
        const indicatorMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = 0.2;
        this.group.add(indicator);
        this.indicator = indicator;
    }

    buildStaticTarget() {
        // Radar-like target practice
        const baseGeom = new THREE.CylinderGeometry(1.5, 2, 0.5, 8);
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.25;
        this.group.add(base);

        const poleGeom = new THREE.CylinderGeometry(0.2, 0.2, 4, 6);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 2.5;
        this.group.add(pole);

        // Target circles
        const colors = [0xff0000, 0xffffff, 0xff0000, 0xffffff, 0xff0000];
        colors.forEach((color, i) => {
            const ringGeom = new THREE.RingGeometry(i * 0.4, (i + 1) * 0.4, 16);
            const ringMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.y = 4.5;
            this.group.add(ring);
        });
    }

    buildVehicle() {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x556644 });

        // Body
        const bodyGeom = new THREE.BoxGeometry(3, 1.5, 6);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 1.5;
        this.group.add(body);

        // Cab
        const cabGeom = new THREE.BoxGeometry(2.5, 1.2, 2);
        const cab = new THREE.Mesh(cabGeom, bodyMat);
        cab.position.set(0, 2.7, -1.5);
        this.group.add(cab);

        // Wheels
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        [{ x: 1.5, z: -2 }, { x: -1.5, z: -2 }, { x: 1.5, z: 2 }, { x: -1.5, z: 2 }].forEach(pos => {
            const wheelGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8);
            const wheel = new THREE.Mesh(wheelGeom, wheelMat);
            wheel.position.set(pos.x, 0.6, pos.z);
            wheel.rotation.z = Math.PI / 2;
            this.group.add(wheel);
        });

        this.moveDir.set(Utils.randomRange(-1, 1), 0, Utils.randomRange(-1, 1)).normalize();
    }

    buildTurret() {
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x556655 });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x666666, specular: 0x999999, shininess: 60 });

        // Bunker base
        const baseGeom = new THREE.CylinderGeometry(2.5, 3, 2, 8);
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 1;
        this.group.add(base);

        // Turret head
        const headGeom = new THREE.SphereGeometry(1.5, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const head = new THREE.Mesh(headGeom, metalMat);
        head.position.y = 2;
        this.group.add(head);
        this.turretHead = head;

        // Barrel
        const barrelGeom = new THREE.CylinderGeometry(0.15, 0.15, 3, 6);
        const barrel = new THREE.Mesh(barrelGeom, metalMat);
        barrel.position.set(0, 2.5, -1.5);
        barrel.rotation.x = Math.PI / 2;
        this.group.add(barrel);
        this.barrel = barrel;
    }

    buildEnemyDrone() {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x660000, emissive: 0x220000 });
        const accentMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x440000 });

        // Body
        const bodyGeom = new THREE.BoxGeometry(0.8, 0.3, 1.2);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        this.group.add(body);

        // Arms and rotors
        [{ x: 0.8, z: 0.6 }, { x: -0.8, z: 0.6 }, { x: 0.8, z: -0.6 }, { x: -0.8, z: -0.6 }].forEach(pos => {
            const armGeom = new THREE.BoxGeometry(1.2, 0.08, 0.08);
            const arm = new THREE.Mesh(armGeom, bodyMat);
            arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
            arm.rotation.y = Math.atan2(pos.x, pos.z);
            this.group.add(arm);

            const discGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.02, 8);
            const disc = new THREE.Mesh(discGeom, accentMat);
            disc.position.set(pos.x, 0.1, pos.z);
            this.group.add(disc);
        });

        // Red eye
        const eyeGeom = new THREE.SphereGeometry(0.1, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(0, 0, -0.6);
        this.group.add(eye);

        this.hoverOffset = Utils.randomRange(10, 30);
        this.group.position.y += this.hoverOffset;
        this.moveDir.set(Utils.randomRange(-1, 1), 0, Utils.randomRange(-1, 1)).normalize();
    }

    buildRadar() {
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x888888, specular: 0xaaaaaa, shininess: 80 });
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x555555 });

        const baseGeom = new THREE.BoxGeometry(4, 3, 4);
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 1.5;
        this.group.add(base);

        const poleGeom = new THREE.CylinderGeometry(0.4, 0.6, 6, 6);
        const pole = new THREE.Mesh(poleGeom, metalMat);
        pole.position.y = 6;
        this.group.add(pole);

        const dishGeom = new THREE.SphereGeometry(3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dish = new THREE.Mesh(dishGeom, metalMat);
        dish.position.y = 10;
        dish.rotation.x = Math.PI / 5;
        this.group.add(dish);
        this.radarDish = dish;
    }

    buildFuelDepot() {
        const tankMat = new THREE.MeshPhongMaterial({ color: 0x886644 });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x777777 });

        // Tanks
        for (let i = 0; i < 3; i++) {
            const tankGeom = new THREE.CylinderGeometry(2, 2, 5, 8);
            const tank = new THREE.Mesh(tankGeom, tankMat);
            tank.position.set(i * 5 - 5, 2.5, 0);
            this.group.add(tank);
        }

        // Support structure
        const frameGeom = new THREE.BoxGeometry(18, 0.3, 6);
        const frame = new THREE.Mesh(frameGeom, metalMat);
        frame.position.y = 5.2;
        this.group.add(frame);
    }

    update(dt, dronePosition) {
        if (!this.alive) return;

        // Health bar always faces camera
        this.healthBar.scale.x = this.health / this.maxHealth;
        this.healthBar.position.x = -1.4 * (1 - this.health / this.maxHealth);

        // Target indicator pulse
        const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
        this.indicator.material.opacity = pulse;
        this.indicator.rotation.z += dt * 0.5;

        // Movement for mobile targets
        if (this.moveSpeed > 0) {
            this.moveTimer += dt;
            if (this.moveTimer > 3) {
                this.moveDir.set(Utils.randomRange(-1, 1), 0, Utils.randomRange(-1, 1)).normalize();
                this.moveTimer = 0;
            }

            this.group.position.add(this.moveDir.clone().multiplyScalar(this.moveSpeed * dt));

            // Boundary check
            const bounds = 250;
            if (Math.abs(this.group.position.x) > bounds) this.moveDir.x *= -1;
            if (Math.abs(this.group.position.z) > bounds) this.moveDir.z *= -1;

            // Look direction for vehicles
            if (this.type === 'vehicle') {
                const angle = Math.atan2(this.moveDir.x, this.moveDir.z);
                this.group.rotation.y = Utils.lerp(this.group.rotation.y, angle, 3 * dt);
            }
        }

        // Hover for enemy drones
        if (this.type === 'drone') {
            this.group.position.y = this.hoverOffset + Math.sin(Date.now() * 0.002) * 2;
        }

        // Turret tracking
        if (this.turretHead && dronePosition) {
            const dir = dronePosition.clone().sub(this.group.position);
            const angle = Math.atan2(dir.x, dir.z);
            this.group.rotation.y = Utils.lerp(this.group.rotation.y, angle, 2 * dt);
        }

        // Radar rotation
        if (this.radarDish) {
            this.radarDish.rotation.y += dt * 2;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            return true;
        }
        return false;
    }

    getPosition() {
        return this.group.position.clone();
    }

    dispose() {
        this.scene.remove(this.group);
    }
}

class TargetManager {
    constructor(scene) {
        this.scene = scene;
        this.targets = [];
    }

    spawnTargets(targetConfigs) {
        this.clear();
        targetConfigs.forEach(config => {
            const target = new Target(
                this.scene,
                new THREE.Vector3(config.x, config.y || 0, config.z),
                config.type || 'static',
                config.health || 30
            );
            this.targets.push(target);
        });
    }

    update(dt, dronePosition) {
        this.targets.forEach(t => t.update(dt, dronePosition));
    }

    getAliveTargets() {
        return this.targets.filter(t => t.alive);
    }

    getDestroyedCount() {
        return this.targets.filter(t => !t.alive).length;
    }

    getTotalCount() {
        return this.targets.length;
    }

    clear() {
        this.targets.forEach(t => t.dispose());
        this.targets = [];
    }

    dispose() {
        this.clear();
    }
}
