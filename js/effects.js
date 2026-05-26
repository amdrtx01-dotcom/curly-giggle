/* Visual Effects - Particles, Explosions, Trails */

class EffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.explosions = [];
        this.trails = [];
    }

    createExplosion(position, size, color) {
        size = size || 5;
        color = color || 0xff6600;

        // Flash sphere
        const flashGeom = new THREE.SphereGeometry(size * 0.5, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0
        });
        const flash = new THREE.Mesh(flashGeom, flashMat);
        flash.position.copy(position);
        this.scene.add(flash);

        // Fire sphere
        const fireGeom = new THREE.SphereGeometry(size, 12, 12);
        const fireMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const fire = new THREE.Mesh(fireGeom, fireMat);
        fire.position.copy(position);
        this.scene.add(fire);

        // Particles
        const particleCount = 30;
        const particleGroup = new THREE.Group();
        const particleMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0
        });

        const particleData = [];
        for (let i = 0; i < particleCount; i++) {
            const pGeom = new THREE.SphereGeometry(Utils.randomRange(0.1, 0.5), 4, 4);
            const p = new THREE.Mesh(pGeom, particleMat.clone());
            p.position.copy(position);
            particleGroup.add(p);

            particleData.push({
                mesh: p,
                velocity: new THREE.Vector3(
                    Utils.randomRange(-1, 1),
                    Utils.randomRange(0, 1.5),
                    Utils.randomRange(-1, 1)
                ).normalize().multiplyScalar(Utils.randomRange(size * 2, size * 5)),
                life: Utils.randomRange(0.5, 1.5)
            });
        }
        this.scene.add(particleGroup);

        this.explosions.push({
            flash,
            fire,
            particleGroup,
            particleData,
            age: 0,
            duration: 2.0,
            size
        });

        // Smoke ring
        const ringGeom = new THREE.TorusGeometry(size * 0.8, size * 0.3, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: 0.4
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.copy(position);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);

        this.particles.push({
            mesh: ring,
            life: 2.0,
            maxLife: 2.0,
            update: function(dt) {
                this.life -= dt;
                const s = 1 + (this.maxLife - this.life) * 3;
                this.mesh.scale.set(s, s, s);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.4;
                this.mesh.position.y += dt * 3;
            }
        });
    }

    createBulletTrail(from, to) {
        const dir = to.clone().sub(from);
        const length = dir.length();
        const geom = new THREE.CylinderGeometry(0.03, 0.03, length, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.8
        });
        const trail = new THREE.Mesh(geom, mat);

        const mid = from.clone().add(to).multiplyScalar(0.5);
        trail.position.copy(mid);
        trail.lookAt(to);
        trail.rotateX(Math.PI / 2);

        this.scene.add(trail);

        this.trails.push({
            mesh: trail,
            life: 0.15
        });
    }

    createRocketTrail(position) {
        const trailGeom = new THREE.SphereGeometry(0.3, 4, 4);
        const trailMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.6
        });
        const trailMesh = new THREE.Mesh(trailGeom, trailMat);
        trailMesh.position.copy(position);
        this.scene.add(trailMesh);

        this.particles.push({
            mesh: trailMesh,
            life: 0.5,
            maxLife: 0.5,
            update: function(dt) {
                this.life -= dt;
                const scale = 1 + (this.maxLife - this.life) * 4;
                this.mesh.scale.set(scale, scale, scale);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.6;
            }
        });

        // Smoke
        const smokeGeom = new THREE.SphereGeometry(0.2, 4, 4);
        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.3
        });
        const smoke = new THREE.Mesh(smokeGeom, smokeMat);
        smoke.position.copy(position);
        this.scene.add(smoke);

        this.particles.push({
            mesh: smoke,
            life: 1.0,
            maxLife: 1.0,
            update: function(dt) {
                this.life -= dt;
                const scale = 1 + (this.maxLife - this.life) * 6;
                this.mesh.scale.set(scale, scale, scale);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.3;
                this.mesh.position.y += dt * 2;
            }
        });
    }

    createHitSparks(position) {
        for (let i = 0; i < 8; i++) {
            const sparkGeom = new THREE.SphereGeometry(0.1, 4, 4);
            const sparkMat = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                opacity: 1.0
            });
            const spark = new THREE.Mesh(sparkGeom, sparkMat);
            spark.position.copy(position);
            this.scene.add(spark);

            const vel = new THREE.Vector3(
                Utils.randomRange(-1, 1),
                Utils.randomRange(0, 1),
                Utils.randomRange(-1, 1)
            ).normalize().multiplyScalar(Utils.randomRange(5, 15));

            this.particles.push({
                mesh: spark,
                life: Utils.randomRange(0.2, 0.5),
                maxLife: 0.5,
                velocity: vel,
                update: function(dt) {
                    this.life -= dt;
                    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                    this.velocity.y -= 20 * dt;
                    this.mesh.material.opacity = this.life / this.maxLife;
                }
            });
        }
    }

    createEngineParticles(position, intensity) {
        if (Math.random() > intensity * 0.3) return;

        const pGeom = new THREE.SphereGeometry(0.08, 4, 4);
        const pMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.4
        });
        const p = new THREE.Mesh(pGeom, pMat);
        p.position.copy(position);
        p.position.y -= 0.5;
        p.position.x += Utils.randomRange(-0.3, 0.3);
        p.position.z += Utils.randomRange(-0.3, 0.3);
        this.scene.add(p);

        this.particles.push({
            mesh: p,
            life: 0.3,
            maxLife: 0.3,
            update: function(dt) {
                this.life -= dt;
                this.mesh.position.y -= dt * 5;
                const scale = 1 + (this.maxLife - this.life) * 3;
                this.mesh.scale.set(scale, scale, scale);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.4;
            }
        });
    }

    update(dt) {
        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.age += dt;
            const progress = exp.age / exp.duration;

            if (progress < 0.1) {
                exp.flash.scale.setScalar(1 + progress * 20);
                exp.flash.material.opacity = 1 - progress * 10;
            } else {
                exp.flash.material.opacity = 0;
            }

            exp.fire.scale.setScalar(1 + progress * 3);
            exp.fire.material.opacity = Math.max(0, 0.8 - progress);

            exp.particleData.forEach(pd => {
                pd.mesh.position.add(pd.velocity.clone().multiplyScalar(dt));
                pd.velocity.y -= 10 * dt;
                pd.velocity.multiplyScalar(0.98);
                pd.life -= dt;
                pd.mesh.material.opacity = Math.max(0, pd.life / 1.5);
            });

            if (exp.age >= exp.duration) {
                this.scene.remove(exp.flash);
                this.scene.remove(exp.fire);
                exp.particleData.forEach(pd => {
                    exp.particleGroup.remove(pd.mesh);
                    pd.mesh.geometry.dispose();
                    pd.mesh.material.dispose();
                });
                this.scene.remove(exp.particleGroup);
                exp.flash.geometry.dispose();
                exp.flash.material.dispose();
                exp.fire.geometry.dispose();
                exp.fire.material.dispose();
                this.explosions.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }

        // Update trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= dt;
            t.mesh.material.opacity = Math.max(0, t.life / 0.15) * 0.8;
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
                this.trails.splice(i, 1);
            }
        }
    }

    dispose() {
        this.explosions.forEach(exp => {
            this.scene.remove(exp.flash);
            this.scene.remove(exp.fire);
            this.scene.remove(exp.particleGroup);
        });
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.trails.forEach(t => this.scene.remove(t.mesh));
        this.explosions = [];
        this.particles = [];
        this.trails = [];
    }
}
