/* Weapons System */

class WeaponsManager {
    constructor(scene, effects) {
        this.scene = scene;
        this.effects = effects;
        this.bullets = [];
        this.rockets = [];
        this.bulletSpeed = 200;
        this.rocketSpeed = 80;
        this.fireRate = 0.1;
        this.lastFireTime = 0;
        this.bulletDamage = 10;
        this.rocketDamage = 50;
    }

    fireBullet(position, direction, time) {
        if (time - this.lastFireTime < this.fireRate) return null;
        this.lastFireTime = time;

        const bulletGeom = new THREE.SphereGeometry(0.12, 4, 4);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const bullet = new THREE.Mesh(bulletGeom, bulletMat);

        bullet.position.copy(position);
        const vel = direction.clone().normalize().multiplyScalar(this.bulletSpeed);

        this.scene.add(bullet);
        this.bullets.push({
            mesh: bullet,
            velocity: vel,
            life: 3.0,
            startPos: position.clone(),
            damage: this.bulletDamage
        });

        return bullet;
    }

    fireRocket(position, direction) {
        const rocketGroup = new THREE.Group();

        const bodyGeom = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x556655 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.x = Math.PI / 2;
        rocketGroup.add(body);

        const noseGeom = new THREE.ConeGeometry(0.1, 0.3, 6);
        const noseMat = new THREE.MeshPhongMaterial({ color: 0xff4400 });
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = -0.55;
        rocketGroup.add(nose);

        // Fins
        for (let i = 0; i < 4; i++) {
            const finGeom = new THREE.BoxGeometry(0.02, 0.2, 0.15);
            const finMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
            const fin = new THREE.Mesh(finGeom, finMat);
            fin.position.z = 0.35;
            fin.rotation.z = (i / 4) * Math.PI * 2;
            fin.position.x = Math.cos((i / 4) * Math.PI * 2) * 0.15;
            fin.position.y = Math.sin((i / 4) * Math.PI * 2) * 0.15;
            rocketGroup.add(fin);
        }

        rocketGroup.position.copy(position);
        rocketGroup.lookAt(position.clone().add(direction));

        const vel = direction.clone().normalize().multiplyScalar(this.rocketSpeed);

        this.scene.add(rocketGroup);
        this.rockets.push({
            group: rocketGroup,
            velocity: vel,
            life: 5.0,
            damage: this.rocketDamage,
            trailTimer: 0
        });

        return rocketGroup;
    }

    update(dt, targets) {
        const hits = [];

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.life -= dt;
            b.mesh.position.add(b.velocity.clone().multiplyScalar(dt));

            // Trail
            if (b.life > 0.1) {
                this.effects.createBulletTrail(
                    b.mesh.position.clone().sub(b.velocity.clone().multiplyScalar(dt)),
                    b.mesh.position.clone()
                );
            }

            // Check target hits
            if (targets) {
                for (let t = 0; t < targets.length; t++) {
                    const target = targets[t];
                    if (!target.alive) continue;
                    const dist = Utils.distance3D(b.mesh.position, target.getPosition());
                    if (dist < target.hitRadius) {
                        hits.push({ target: target, damage: b.damage, position: b.mesh.position.clone() });
                        this.effects.createHitSparks(b.mesh.position.clone());
                        b.life = 0;
                        break;
                    }
                }
            }

            // Ground hit
            if (b.mesh.position.y <= 0) {
                this.effects.createHitSparks(b.mesh.position.clone());
                b.life = 0;
            }

            if (b.life <= 0) {
                this.scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
                this.bullets.splice(i, 1);
            }
        }

        // Update rockets
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.life -= dt;
            r.group.position.add(r.velocity.clone().multiplyScalar(dt));

            // Rocket trail
            r.trailTimer += dt;
            if (r.trailTimer > 0.02) {
                this.effects.createRocketTrail(r.group.position.clone());
                r.trailTimer = 0;
            }

            // Check target hits
            if (targets) {
                for (let t = 0; t < targets.length; t++) {
                    const target = targets[t];
                    if (!target.alive) continue;
                    const dist = Utils.distance3D(r.group.position, target.getPosition());
                    if (dist < target.hitRadius + 2) {
                        hits.push({ target: target, damage: r.damage, position: r.group.position.clone() });
                        this.effects.createExplosion(r.group.position.clone(), 8, 0xff4400);
                        r.life = 0;
                        break;
                    }
                }
            }

            // Ground hit
            if (r.group.position.y <= 0) {
                this.effects.createExplosion(r.group.position.clone(), 5, 0xff4400);
                r.life = 0;
            }

            if (r.life <= 0) {
                this.scene.remove(r.group);
                this.rockets.splice(i, 1);
            }
        }

        return hits;
    }

    dispose() {
        this.bullets.forEach(b => {
            this.scene.remove(b.mesh);
            b.mesh.geometry.dispose();
            b.mesh.material.dispose();
        });
        this.rockets.forEach(r => this.scene.remove(r.group));
        this.bullets = [];
        this.rockets = [];
    }
}
