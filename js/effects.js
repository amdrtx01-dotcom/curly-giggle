/* Visual Effects - Particles, Explosions, Trails, Shockwaves, Fire
 *
 * Performance-aware implementation:
 *  - Uses pooled sprites with additive blending for glow
 *  - Geometry/material disposal on death to keep memory bounded
 *  - Spawns short-lived dynamic PointLight for big explosions to light the scene
 */

class EffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.explosions = [];
        this.trails = [];
        this.fires = [];
        this.shockwaves = [];
        this.lights = [];
        this.debris = [];
    }

    /* ------------------------------------------------------------ */
    /*                      EXPLOSION                                */
    /* ------------------------------------------------------------ */
    createExplosion(position, size, color) {
        size = size || 5;
        color = color != null ? color : 0xff7a20;

        // --- 1. Bright flash (very brief) ---
        const flashMat = new THREE.SpriteMaterial({
            map: Textures.get('glow'),
            color: 0xffffee,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const flash = new THREE.Sprite(flashMat);
        flash.position.copy(position);
        flash.scale.set(size * 4, size * 4, 1);
        this.scene.add(flash);

        // --- 2. Fireball core sprite ---
        const fireMat = new THREE.SpriteMaterial({
            map: Textures.get('fire'),
            color: color,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const fire = new THREE.Sprite(fireMat);
        fire.position.copy(position);
        fire.scale.set(size * 2.5, size * 2.5, 1);
        this.scene.add(fire);

        // --- 3. Dynamic point light ---
        const light = new THREE.PointLight(color, 4, size * 14, 1.8);
        light.position.copy(position);
        this.scene.add(light);
        this.lights.push({ light, life: 0.6, maxLife: 0.6, baseIntensity: 4 });

        // --- 4. Ember/spark particles ---
        const sparkCount = Math.min(60, Math.floor(size * 8));
        for (let i = 0; i < sparkCount; i++) {
            const mat = new THREE.SpriteMaterial({
                map: Textures.get('spark'),
                color: 0xffcc66,
                transparent: true,
                opacity: 1,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const s = new THREE.Sprite(mat);
            s.position.copy(position);
            const sc = Utils.randomRange(0.3, 0.9);
            s.scale.set(sc, sc, 1);
            this.scene.add(s);

            const v = new THREE.Vector3(
                Utils.randomRange(-1, 1),
                Utils.randomRange(0.2, 1.4),
                Utils.randomRange(-1, 1)
            ).normalize().multiplyScalar(Utils.randomRange(size * 3, size * 7));

            this.particles.push({
                mesh: s,
                velocity: v,
                gravity: 18,
                drag: 0.96,
                life: Utils.randomRange(0.6, 1.4),
                maxLife: 1.2,
                update: function(dt) {
                    this.life -= dt;
                    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                    this.velocity.y -= this.gravity * dt;
                    this.velocity.multiplyScalar(this.drag);
                    this.mesh.material.opacity = Math.max(0, this.life / this.maxLife);
                }
            });
        }

        // --- 5. Smoke puffs ---
        const smokeCount = Math.min(20, Math.floor(size * 2.5));
        for (let i = 0; i < smokeCount; i++) {
            const mat = new THREE.SpriteMaterial({
                map: Textures.get('smoke'),
                color: 0x333333,
                transparent: true,
                opacity: 0.7,
                depthWrite: false
            });
            const s = new THREE.Sprite(mat);
            const offset = new THREE.Vector3(
                Utils.randomRange(-size, size) * 0.5,
                Utils.randomRange(0, size) * 0.5,
                Utils.randomRange(-size, size) * 0.5
            );
            s.position.copy(position).add(offset);
            const sc = size * Utils.randomRange(0.8, 1.4);
            s.scale.set(sc, sc, 1);
            this.scene.add(s);

            const v = new THREE.Vector3(
                Utils.randomRange(-0.5, 0.5),
                Utils.randomRange(1.0, 2.5),
                Utils.randomRange(-0.5, 0.5)
            );

            this.particles.push({
                mesh: s,
                velocity: v,
                life: Utils.randomRange(2.0, 3.5),
                maxLife: 3.0,
                update: function(dt) {
                    this.life -= dt;
                    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                    this.velocity.multiplyScalar(0.99);
                    const s = this.mesh.scale.x + dt * 4;
                    this.mesh.scale.set(s, s, 1);
                    this.mesh.material.opacity = Math.max(0, (this.life / this.maxLife) * 0.7);
                }
            });
        }

        // --- 6. Shockwave ring on the ground ---
        this.createShockwave(position, size);

        // --- 7. Debris chunks ---
        this.createDebris(position, size, color);

        this.explosions.push({
            flash, fire,
            age: 0,
            duration: 1.0,
            size
        });
    }

    /* ------------------------------------------------------------ */
    /*                      SHOCKWAVE                                */
    /* ------------------------------------------------------------ */
    createShockwave(position, size) {
        size = size || 5;
        const ringGeom = new THREE.RingGeometry(size * 0.4, size * 0.7, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xfff0c0,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.copy(position);
        ring.position.y = Math.max(0.5, position.y);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        this.shockwaves.push({
            mesh: ring,
            age: 0,
            duration: 0.9,
            startScale: 1,
            endScale: 8 + size * 0.5
        });
    }

    /* ------------------------------------------------------------ */
    /*                      DEBRIS CHUNKS                            */
    /* ------------------------------------------------------------ */
    createDebris(position, size, color) {
        const count = Math.min(20, Math.floor(size * 2));
        for (let i = 0; i < count; i++) {
            const s = Utils.randomRange(0.3, 1.2);
            const geom = new THREE.BoxGeometry(s, s, s);
            const mat = new THREE.MeshPhongMaterial({
                map: Textures.get('concrete'),
                color: 0xaaaaaa
            });
            const chunk = new THREE.Mesh(geom, mat);
            chunk.position.copy(position);
            chunk.castShadow = true;
            this.scene.add(chunk);

            const v = new THREE.Vector3(
                Utils.randomRange(-1, 1),
                Utils.randomRange(0.5, 1.4),
                Utils.randomRange(-1, 1)
            ).normalize().multiplyScalar(Utils.randomRange(size * 1.5, size * 4));

            const angV = new THREE.Vector3(
                Utils.randomRange(-6, 6),
                Utils.randomRange(-6, 6),
                Utils.randomRange(-6, 6)
            );

            this.debris.push({
                mesh: chunk,
                velocity: v,
                angularVelocity: angV,
                life: Utils.randomRange(2.5, 4.5),
                resting: false
            });
        }
    }

    /* ------------------------------------------------------------ */
    /*                      SUSTAINED FIRE                           */
    /* ------------------------------------------------------------ */
    /**
     * Anchor a sustained fire (looped emitter) at a moving or static object.
     * Returns a handle; pass to `stopFire(handle)` to stop & cleanup.
     */
    startFire(getPos, opts) {
        opts = opts || {};
        const fire = {
            getPos: typeof getPos === 'function' ? getPos : () => getPos.clone(),
            size: opts.size || 1.5,
            color: opts.color != null ? opts.color : 0xff7a20,
            emitRate: opts.emitRate != null ? opts.emitRate : 40, // particles per second
            life: opts.life != null ? opts.life : Infinity,
            timer: 0,
            running: true,
            light: null,
            duration: opts.duration || Infinity
        };

        // Persistent flicker light
        const light = new THREE.PointLight(0xff7a20, 1.5, fire.size * 10, 2);
        const p = fire.getPos();
        light.position.copy(p);
        this.scene.add(light);
        fire.light = light;

        this.fires.push(fire);
        return fire;
    }

    stopFire(handle) {
        if (!handle) return;
        handle.running = false;
        if (handle.light) {
            this.scene.remove(handle.light);
            handle.light = null;
        }
    }

    /* ------------------------------------------------------------ */
    /*                      BULLET TRAIL                             */
    /* ------------------------------------------------------------ */
    createBulletTrail(from, to) {
        const dir = to.clone().sub(from);
        const length = dir.length();
        if (length < 0.01) return;
        const geom = new THREE.CylinderGeometry(0.04, 0.04, length, 6);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffd060,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const trail = new THREE.Mesh(geom, mat);

        const mid = from.clone().add(to).multiplyScalar(0.5);
        trail.position.copy(mid);
        trail.lookAt(to);
        trail.rotateX(Math.PI / 2);

        this.scene.add(trail);

        this.trails.push({
            mesh: trail,
            life: 0.18
        });
    }

    /* ------------------------------------------------------------ */
    /*                      ROCKET TRAIL                             */
    /* ------------------------------------------------------------ */
    createRocketTrail(position) {
        // Fire puff
        const fireMat = new THREE.SpriteMaterial({
            map: Textures.get('fire'),
            color: 0xff6a20,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const f = new THREE.Sprite(fireMat);
        f.position.copy(position);
        f.scale.set(0.8, 0.8, 1);
        this.scene.add(f);

        this.particles.push({
            mesh: f,
            life: 0.4,
            maxLife: 0.4,
            update: function(dt) {
                this.life -= dt;
                const scale = 1 + (this.maxLife - this.life) * 4;
                this.mesh.scale.set(scale, scale, 1);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.8;
            }
        });

        // Smoke puff
        const smokeMat = new THREE.SpriteMaterial({
            map: Textures.get('smoke'),
            color: 0x666666,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });
        const sm = new THREE.Sprite(smokeMat);
        sm.position.copy(position);
        sm.scale.set(0.6, 0.6, 1);
        this.scene.add(sm);

        this.particles.push({
            mesh: sm,
            life: 1.2,
            maxLife: 1.2,
            update: function(dt) {
                this.life -= dt;
                const scale = this.mesh.scale.x + dt * 3;
                this.mesh.scale.set(scale, scale, 1);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.5;
                this.mesh.position.y += dt * 1.2;
            }
        });
    }

    /* ------------------------------------------------------------ */
    /*                      HIT SPARKS                               */
    /* ------------------------------------------------------------ */
    createHitSparks(position) {
        for (let i = 0; i < 10; i++) {
            const mat = new THREE.SpriteMaterial({
                map: Textures.get('spark'),
                color: 0xffd060,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const s = new THREE.Sprite(mat);
            s.position.copy(position);
            const sc = Utils.randomRange(0.2, 0.5);
            s.scale.set(sc, sc, 1);
            this.scene.add(s);

            const v = new THREE.Vector3(
                Utils.randomRange(-1, 1),
                Utils.randomRange(0, 1),
                Utils.randomRange(-1, 1)
            ).normalize().multiplyScalar(Utils.randomRange(6, 16));

            this.particles.push({
                mesh: s,
                velocity: v,
                gravity: 25,
                drag: 0.95,
                life: Utils.randomRange(0.2, 0.5),
                maxLife: 0.5,
                update: function(dt) {
                    this.life -= dt;
                    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                    this.velocity.y -= this.gravity * dt;
                    this.mesh.material.opacity = this.life / this.maxLife;
                }
            });
        }
    }

    /* ------------------------------------------------------------ */
    /*                      ENGINE PARTICLES                         */
    /* ------------------------------------------------------------ */
    createEngineParticles(position, intensity) {
        if (Math.random() > intensity * 0.4) return;

        const mat = new THREE.SpriteMaterial({
            map: Textures.get('glow'),
            color: 0x66aaff,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const p = new THREE.Sprite(mat);
        p.position.copy(position);
        p.position.y -= 0.4;
        p.position.x += Utils.randomRange(-0.3, 0.3);
        p.position.z += Utils.randomRange(-0.3, 0.3);
        p.scale.set(0.35, 0.35, 1);
        this.scene.add(p);

        this.particles.push({
            mesh: p,
            life: 0.3,
            maxLife: 0.3,
            update: function(dt) {
                this.life -= dt;
                this.mesh.position.y -= dt * 5;
                const scale = this.mesh.scale.x + dt * 1.4;
                this.mesh.scale.set(scale, scale, 1);
                this.mesh.material.opacity = (this.life / this.maxLife) * 0.5;
            }
        });
    }

    /* ------------------------------------------------------------ */
    /*                      UPDATE                                   */
    /* ------------------------------------------------------------ */
    update(dt) {
        // Explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.age += dt;
            const p = exp.age / exp.duration;

            if (p < 0.15) {
                const f = 1 + p * 28;
                exp.flash.scale.set(exp.size * 4 * f, exp.size * 4 * f, 1);
                exp.flash.material.opacity = 1 - p / 0.15;
            } else {
                exp.flash.material.opacity = 0;
            }

            const fs = exp.size * 2.5 * (1 + p * 1.8);
            exp.fire.scale.set(fs, fs, 1);
            exp.fire.material.opacity = Math.max(0, 1 - p * 1.2);

            if (exp.age >= exp.duration) {
                this.scene.remove(exp.flash);
                this.scene.remove(exp.fire);
                exp.flash.material.dispose();
                exp.fire.material.dispose();
                this.explosions.splice(i, 1);
            }
        }

        // Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.age += dt;
            const p = sw.age / sw.duration;
            const scale = Utils.lerp(sw.startScale, sw.endScale, Utils.easeOutCubic(p));
            sw.mesh.scale.set(scale, scale, scale);
            sw.mesh.material.opacity = Math.max(0, 1 - p) * 0.9;
            if (sw.age >= sw.duration) {
                this.scene.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                sw.mesh.material.dispose();
                this.shockwaves.splice(i, 1);
            }
        }

        // Lights
        for (let i = this.lights.length - 1; i >= 0; i--) {
            const l = this.lights[i];
            l.life -= dt;
            l.light.intensity = Math.max(0, (l.life / l.maxLife)) * l.baseIntensity;
            if (l.life <= 0) {
                this.scene.remove(l.light);
                this.lights.splice(i, 1);
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }

        // Trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= dt;
            t.mesh.material.opacity = Math.max(0, t.life / 0.18) * 0.85;
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
                this.trails.splice(i, 1);
            }
        }

        // Sustained fires (emit particles)
        for (let i = this.fires.length - 1; i >= 0; i--) {
            const f = this.fires[i];
            if (!f.running) {
                this.fires.splice(i, 1);
                continue;
            }
            f.duration -= dt;
            if (f.duration <= 0) {
                this.stopFire(f);
                this.fires.splice(i, 1);
                continue;
            }
            const pos = f.getPos();
            if (f.light) {
                f.light.position.copy(pos);
                f.light.intensity = 1.0 + Math.random() * 1.5;
            }

            f.timer += dt;
            const interval = 1.0 / f.emitRate;
            while (f.timer >= interval) {
                f.timer -= interval;
                this._emitFireParticle(pos, f.size, f.color);
                if (Math.random() < 0.3) this._emitSmokeParticle(pos, f.size);
            }
        }

        // Debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.life -= dt;

            if (!d.resting) {
                d.mesh.position.add(d.velocity.clone().multiplyScalar(dt));
                d.velocity.y -= 25 * dt;
                d.mesh.rotation.x += d.angularVelocity.x * dt;
                d.mesh.rotation.y += d.angularVelocity.y * dt;
                d.mesh.rotation.z += d.angularVelocity.z * dt;
                if (d.mesh.position.y <= 0.3) {
                    d.mesh.position.y = 0.3;
                    d.velocity.y *= -0.3;
                    d.velocity.x *= 0.5;
                    d.velocity.z *= 0.5;
                    d.angularVelocity.multiplyScalar(0.5);
                    if (d.velocity.length() < 0.3) d.resting = true;
                }
            }

            if (d.life <= 0) {
                this.scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
                this.debris.splice(i, 1);
            } else if (d.life < 1.0 && d.mesh.material.transparent !== true) {
                d.mesh.material.transparent = true;
                d.mesh.material.opacity = 1.0;
            } else if (d.life < 1.0) {
                d.mesh.material.opacity = d.life;
            }
        }
    }

    _emitFireParticle(pos, size, color) {
        const mat = new THREE.SpriteMaterial({
            map: Textures.get('fire'),
            color: color != null ? color : 0xff7a20,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const s = new THREE.Sprite(mat);
        s.position.copy(pos);
        s.position.x += Utils.randomRange(-size * 0.4, size * 0.4);
        s.position.z += Utils.randomRange(-size * 0.4, size * 0.4);
        const sc = size * Utils.randomRange(0.5, 1.0);
        s.scale.set(sc, sc, 1);
        this.scene.add(s);

        const v = new THREE.Vector3(
            Utils.randomRange(-0.5, 0.5),
            Utils.randomRange(2, 4),
            Utils.randomRange(-0.5, 0.5)
        );

        this.particles.push({
            mesh: s,
            velocity: v,
            life: Utils.randomRange(0.4, 0.9),
            maxLife: 0.9,
            update: function(dt) {
                this.life -= dt;
                this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                const s = this.mesh.scale.x * (1 - dt * 0.6);
                this.mesh.scale.set(s, s, 1);
                this.mesh.material.opacity = Math.max(0, this.life / this.maxLife);
            }
        });
    }

    _emitSmokeParticle(pos, size) {
        const mat = new THREE.SpriteMaterial({
            map: Textures.get('smoke'),
            color: 0x222222,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        const s = new THREE.Sprite(mat);
        s.position.copy(pos);
        s.position.x += Utils.randomRange(-size * 0.5, size * 0.5);
        s.position.z += Utils.randomRange(-size * 0.5, size * 0.5);
        const sc = size * Utils.randomRange(0.8, 1.4);
        s.scale.set(sc, sc, 1);
        this.scene.add(s);

        this.particles.push({
            mesh: s,
            velocity: new THREE.Vector3(Utils.randomRange(-0.5, 0.5), Utils.randomRange(1.5, 3), Utils.randomRange(-0.5, 0.5)),
            life: Utils.randomRange(1.5, 3.0),
            maxLife: 3.0,
            update: function(dt) {
                this.life -= dt;
                this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
                const s = this.mesh.scale.x + dt * 2.5;
                this.mesh.scale.set(s, s, 1);
                this.mesh.material.opacity = Math.max(0, (this.life / this.maxLife) * 0.7);
            }
        });
    }

    dispose() {
        this.explosions.forEach(e => {
            this.scene.remove(e.flash);
            this.scene.remove(e.fire);
        });
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.trails.forEach(t => this.scene.remove(t.mesh));
        this.shockwaves.forEach(s => this.scene.remove(s.mesh));
        this.lights.forEach(l => this.scene.remove(l.light));
        this.debris.forEach(d => this.scene.remove(d.mesh));
        this.fires.forEach(f => { if (f.light) this.scene.remove(f.light); });

        this.explosions = [];
        this.particles = [];
        this.trails = [];
        this.shockwaves = [];
        this.lights = [];
        this.debris = [];
        this.fires = [];
    }
}
