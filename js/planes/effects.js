/* Particle effects: afterburner flames, exhaust smoke trails, wingtip contrails. */

class PlaneEffects {
    constructor(scene, plane) {
        this.scene = scene;
        this.plane = plane;
        this.flameSprites = [];     // attached to plane, pulse with throttle/AB
        this.exhaustParticles = []; // free in world, fade out
        this.contrailParticles = [];
        this.smokeMaterial = new THREE.SpriteMaterial({
            map: PlaneTextures.smokeSprite(),
            transparent: true,
            depthWrite: false,
            opacity: 0.55,
        });
        this.flameMaterial = new THREE.SpriteMaterial({
            map: PlaneTextures.flameSprite(),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        this.contrailMaterial = new THREE.SpriteMaterial({
            map: PlaneTextures.smokeSprite(),
            transparent: true,
            depthWrite: false,
            opacity: 0.35,
            blending: THREE.NormalBlending,
        });
        this.sparkMaterial = new THREE.SpriteMaterial({
            map: PlaneTextures.sparkSprite(),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this._spawnFlames();
        this._exhaustTimer = 0;
        this._contrailTimer = 0;
    }

    _spawnFlames() {
        // Local-space flame sprites attached to plane's nozzles
        const nozzles = (this.plane.userData && this.plane.userData.nozzles) || [];
        for (const n of nozzles) {
            const s = new THREE.Sprite(this.flameMaterial.clone());
            s.position.copy(n);
            s.position.z += 0.4; // slightly behind nozzle
            s.scale.set(0.9, 2.4, 1);
            s.userData.basePos = s.position.clone();
            s.userData.baseScaleX = 0.9;
            s.userData.baseScaleY = 2.4;
            this.plane.add(s);
            this.flameSprites.push(s);
        }
    }

    update(dt, flight) {
        const throttle = flight.throttle;
        const ab = flight.afterburner || (flight.maneuverOverride && flight.maneuverOverride.afterburner);

        // Pulse flames with throttle
        const target = (throttle * 0.6 + (ab ? 1.6 : 0.0));
        const flicker = 0.85 + Math.random() * 0.3;
        for (const s of this.flameSprites) {
            const baseX = s.userData.baseScaleX;
            const baseY = s.userData.baseScaleY;
            s.scale.x = baseX * target * 0.9 * flicker;
            s.scale.y = baseY * target * (ab ? 1.6 : 1.0) * flicker;
            s.material.opacity = THREE.MathUtils.clamp(target * (ab ? 1.0 : 0.7), 0, 1);
            // Slight color shift in AB mode
            if (ab) s.material.color.setHex(0xfff0b0);
            else    s.material.color.setHex(0xffd070);
            s.visible = target > 0.05;
            // Reposition slightly behind nozzle
            s.position.copy(s.userData.basePos);
            s.position.z += s.scale.y * 0.5;
        }

        // Spawn exhaust smoke when throttle high (rate-limited)
        this._exhaustTimer += dt;
        const spawnInterval = ab ? 0.025 : 0.06;
        if (throttle > 0.4 && this._exhaustTimer >= spawnInterval) {
            this._exhaustTimer = 0;
            this._spawnExhaust(ab);
        }

        // Spawn contrails when fast (looks like vapor at high speed)
        this._contrailTimer += dt;
        if (flight.speed > 150 && this._contrailTimer >= 0.04) {
            this._contrailTimer = 0;
            this._spawnContrails();
        }

        // Age all particles
        this._updateParticleList(this.exhaustParticles, dt);
        this._updateParticleList(this.contrailParticles, dt);
    }

    _spawnExhaust(ab) {
        const nozzles = (this.plane.userData && this.plane.userData.nozzles) || [];
        for (const n of nozzles) {
            const worldPos = n.clone();
            this.plane.localToWorld(worldPos);

            const mat = this.smokeMaterial.clone();
            if (ab) mat.color.setHex(0xffd97a);
            else    mat.color.setHex(0xcfcfcf);
            const s = new THREE.Sprite(mat);
            s.position.copy(worldPos);
            const startScale = ab ? 1.2 : 0.8;
            s.scale.set(startScale, startScale, 1);
            s.userData.life = 0;
            s.userData.maxLife = ab ? 0.6 : 1.4;
            s.userData.growth = ab ? 5.0 : 2.5;
            s.userData.fadeStartOpacity = ab ? 0.7 : 0.55;
            // Drift slightly backward (relative to plane) and add gravity
            const drift = new THREE.Vector3(0, 0, 1).applyQuaternion(this.plane.quaternion).multiplyScalar(6);
            drift.y -= 1.5;
            s.userData.vel = drift.add(new THREE.Vector3(
                (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5
            ));
            this.scene.add(s);
            this.exhaustParticles.push(s);
        }
    }

    _spawnContrails() {
        const tips = (this.plane.userData && this.plane.userData.wingtips) || [];
        for (const t of tips) {
            const worldPos = t.clone();
            this.plane.localToWorld(worldPos);
            const mat = this.contrailMaterial.clone();
            const s = new THREE.Sprite(mat);
            s.position.copy(worldPos);
            s.scale.set(1.2, 1.2, 1);
            s.userData.life = 0;
            s.userData.maxLife = 3.5;
            s.userData.growth = 3.2;
            s.userData.fadeStartOpacity = 0.4;
            s.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 1, -0.4 + (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1
            );
            this.scene.add(s);
            this.contrailParticles.push(s);
        }
    }

    _updateParticleList(list, dt) {
        for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            p.userData.life += dt;
            const t = p.userData.life / p.userData.maxLife;
            if (t >= 1) {
                this.scene.remove(p);
                if (p.material) p.material.dispose();
                list.splice(i, 1);
                continue;
            }
            p.position.addScaledVector(p.userData.vel, dt);
            const gr = 1 + p.userData.growth * t * 0.08;
            p.scale.x *= 1 + p.userData.growth * dt * 0.5;
            p.scale.y *= 1 + p.userData.growth * dt * 0.5;
            p.material.opacity = p.userData.fadeStartOpacity * (1 - t);
            void gr;
        }
    }

    /** Visual burst, e.g. when a maneuver starts */
    burst(position, color) {
        color = color || 0xffeebb;
        const count = 18;
        for (let i = 0; i < count; i++) {
            const mat = this.sparkMaterial.clone();
            mat.color.setHex(color);
            const s = new THREE.Sprite(mat);
            s.position.copy(position);
            const scl = 1.5 + Math.random() * 1.2;
            s.scale.set(scl, scl, 1);
            s.userData.life = 0;
            s.userData.maxLife = 0.6 + Math.random() * 0.4;
            s.userData.growth = 2.5;
            s.userData.fadeStartOpacity = 1;
            s.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 18,
                (Math.random() - 0.2) * 14,
                (Math.random() - 0.5) * 18,
            );
            this.scene.add(s);
            this.exhaustParticles.push(s);
        }
    }
}
