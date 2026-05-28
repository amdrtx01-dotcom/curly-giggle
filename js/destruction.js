/* Building Destruction System
 *
 * Tracks destructible objects (buildings, trees, fuel barrels, etc.)
 * Receives explosion events, damages structures, replaces them with chunk
 * meshes that fall + roll on the ground. Damaged buildings catch fire.
 *
 * Public API:
 *   const dm = new DestructionManager(scene, effects);
 *   dm.registerBuilding(mesh, { w, h, d, color });
 *   dm.applyExplosion(position, radius, damage);
 *   dm.update(dt);
 *   dm.clear();
 */

class DestructionManager {
    constructor(scene, effects) {
        this.scene = scene;
        this.effects = effects;
        this.buildings = [];
        this.chunks = [];
        this.gravity = 35;
    }

    /**
     * Register a static building/structure as destructible.
     */
    registerBuilding(mesh, opts) {
        opts = opts || {};
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const hp = opts.health != null ? opts.health : Math.max(60, size.x * size.z * 1.2);
        const b = {
            mesh,
            children: opts.children || [], // attached window meshes etc.
            center,
            width: size.x,
            height: size.y,
            depth: size.z,
            color: opts.color || 0x556677,
            health: hp,
            maxHealth: hp,
            destroyed: false,
            burning: false,
            fireHandle: null,
            damageMarkers: []
        };
        this.buildings.push(b);
        return b;
    }

    /**
     * Damage all registered buildings inside the explosion radius.
     */
    applyExplosion(position, radius, damage) {
        radius = radius || 8;
        damage = damage || 35;
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            if (b.destroyed) continue;
            const closest = this._closestPointOnBox(position, b);
            const dist = closest.distanceTo(position);
            if (dist <= radius) {
                const falloff = 1 - dist / radius;
                const dmg = damage * falloff;
                this._damageBuilding(b, dmg, position);
            }
        }
    }

    _closestPointOnBox(p, b) {
        const half = new THREE.Vector3(b.width / 2, b.height / 2, b.depth / 2);
        const min = b.center.clone().sub(half);
        const max = b.center.clone().add(half);
        return new THREE.Vector3(
            Math.max(min.x, Math.min(p.x, max.x)),
            Math.max(min.y, Math.min(p.y, max.y)),
            Math.max(min.z, Math.min(p.z, max.z))
        );
    }

    _damageBuilding(b, dmg, hitPos) {
        b.health -= dmg;

        // Start burning at < 60% HP if not already
        if (!b.burning && b.health < b.maxHealth * 0.6) {
            this._igniteBuilding(b);
        }

        // Add scorch marker
        if (b.damageMarkers.length < 6 && Math.random() < 0.7) {
            this._addScorchMarker(b, hitPos);
        }

        if (b.health <= 0) {
            this._destroyBuilding(b);
        }
    }

    _addScorchMarker(b, hitPos) {
        const size = Utils.randomRange(1.5, 3.5);
        const geom = new THREE.CircleGeometry(size, 12);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        const scorch = new THREE.Mesh(geom, mat);

        // Project onto nearest wall
        const dir = hitPos.clone().sub(b.center);
        const ax = Math.abs(dir.x), ay = Math.abs(dir.y), az = Math.abs(dir.z);
        const halfW = b.width / 2, halfH = b.height / 2, halfD = b.depth / 2;

        if (ax / halfW > az / halfD && ax / halfW > ay / halfH) {
            // X face
            const s = Math.sign(dir.x);
            scorch.position.set(b.center.x + s * (halfW + 0.05),
                Utils.clamp(hitPos.y, 1, b.height - 1),
                Utils.clamp(hitPos.z, b.center.z - halfD + 1, b.center.z + halfD - 1));
            scorch.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else if (az / halfD > ay / halfH) {
            // Z face
            const s = Math.sign(dir.z);
            scorch.position.set(
                Utils.clamp(hitPos.x, b.center.x - halfW + 1, b.center.x + halfW - 1),
                Utils.clamp(hitPos.y, 1, b.height - 1),
                b.center.z + s * (halfD + 0.05));
            scorch.rotation.y = s > 0 ? 0 : Math.PI;
        } else {
            // Top
            scorch.position.set(hitPos.x, b.height + 0.05, hitPos.z);
            scorch.rotation.x = -Math.PI / 2;
        }

        this.scene.add(scorch);
        b.damageMarkers.push(scorch);
    }

    _igniteBuilding(b) {
        if (b.burning) return;
        b.burning = true;
        const top = new THREE.Vector3(b.center.x, b.height * 0.9, b.center.z);

        b.fireHandle = this.effects.startFire(() => top.clone(), {
            size: Math.min(8, Math.max(2, (b.width + b.depth) * 0.15)),
            emitRate: 25,
            duration: Infinity
        });

        // Additional smaller fire spots
        for (let i = 0; i < 2; i++) {
            const off = new THREE.Vector3(
                Utils.randomRange(-b.width / 3, b.width / 3),
                Utils.randomRange(b.height * 0.5, b.height * 0.85),
                Utils.randomRange(-b.depth / 3, b.depth / 3)
            );
            const p = b.center.clone().add(off);
            this.effects.startFire(() => p.clone(), {
                size: Utils.randomRange(1.5, 3.0),
                emitRate: 18,
                duration: Infinity
            });
        }
    }

    _destroyBuilding(b) {
        if (b.destroyed) return;
        b.destroyed = true;

        // Big explosion
        const top = b.center.clone();
        top.y += b.height * 0.3;
        this.effects.createExplosion(top, Math.min(14, 4 + b.height * 0.15), 0xff6420);

        // Stop fires
        if (b.fireHandle) this.effects.stopFire(b.fireHandle);

        // Remove original mesh & windows
        if (b.mesh && b.mesh.parent) this.scene.remove(b.mesh);
        b.children.forEach(c => { if (c.parent) this.scene.remove(c); });

        // Remove scorch markers
        b.damageMarkers.forEach(m => this.scene.remove(m));

        // Spawn chunk debris
        const chunkCountX = 2, chunkCountY = Math.max(2, Math.floor(b.height / 6)), chunkCountZ = 2;
        const cw = b.width / chunkCountX;
        const ch = b.height / chunkCountY;
        const cd = b.depth / chunkCountZ;

        const tex = Textures.get('concrete');
        const buildingTex = Textures.get('building', { base: '#3a4a5a', accent: '#1a2a3a' });

        for (let xi = 0; xi < chunkCountX; xi++) {
            for (let yi = 0; yi < chunkCountY; yi++) {
                for (let zi = 0; zi < chunkCountZ; zi++) {
                    const geom = new THREE.BoxGeometry(cw * 0.9, ch * 0.9, cd * 0.9);
                    const mat = new THREE.MeshPhongMaterial({
                        map: Math.random() < 0.5 ? buildingTex : tex,
                        color: 0xffffff,
                        shininess: 10
                    });
                    const chunk = new THREE.Mesh(geom, mat);
                    chunk.castShadow = true;

                    chunk.position.set(
                        b.center.x - b.width / 2 + cw * (xi + 0.5),
                        ch * (yi + 0.5),
                        b.center.z - b.depth / 2 + cd * (zi + 0.5)
                    );

                    // Outward + upward velocity
                    const outward = chunk.position.clone().sub(b.center);
                    outward.y = 0;
                    if (outward.lengthSq() < 0.01) outward.set(Utils.randomRange(-1, 1), 0, Utils.randomRange(-1, 1));
                    outward.normalize();
                    const v = outward.multiplyScalar(Utils.randomRange(5, 12));
                    v.y = Utils.randomRange(8, 16) - yi * 0.5;

                    const angV = new THREE.Vector3(
                        Utils.randomRange(-4, 4),
                        Utils.randomRange(-4, 4),
                        Utils.randomRange(-4, 4)
                    );

                    this.scene.add(chunk);
                    this.chunks.push({
                        mesh: chunk,
                        velocity: v,
                        angularVelocity: angV,
                        life: Utils.randomRange(8, 15),
                        resting: false,
                        burning: Math.random() < 0.4
                    });
                }
            }
        }

        // Sustained ground fire on rubble pile
        const rubblePos = new THREE.Vector3(b.center.x, 1, b.center.z);
        this.effects.startFire(() => rubblePos.clone(), {
            size: Math.min(8, Math.max(3, (b.width + b.depth) * 0.2)),
            emitRate: 30,
            duration: 25
        });

        // Smoke column for a long time
        for (let i = 0; i < 6; i++) {
            const off = new THREE.Vector3(Utils.randomRange(-b.width / 3, b.width / 3), 1.5, Utils.randomRange(-b.depth / 3, b.depth / 3));
            const p = b.center.clone().add(off);
            this.effects.startFire(() => p.clone(), {
                size: Utils.randomRange(1.5, 3.5),
                emitRate: 8,
                duration: 30,
                color: 0xff5020
            });
        }
    }

    update(dt) {
        // Update chunks physics
        for (let i = this.chunks.length - 1; i >= 0; i--) {
            const c = this.chunks[i];
            c.life -= dt;

            if (!c.resting) {
                c.mesh.position.add(c.velocity.clone().multiplyScalar(dt));
                c.velocity.y -= this.gravity * dt;
                c.mesh.rotation.x += c.angularVelocity.x * dt;
                c.mesh.rotation.y += c.angularVelocity.y * dt;
                c.mesh.rotation.z += c.angularVelocity.z * dt;

                const minY = c.mesh.geometry.parameters.height / 2;
                if (c.mesh.position.y <= minY) {
                    c.mesh.position.y = minY;
                    c.velocity.y *= -0.35;
                    c.velocity.x *= 0.55;
                    c.velocity.z *= 0.55;
                    c.angularVelocity.multiplyScalar(0.5);
                    if (c.velocity.length() < 0.5 && Math.abs(c.velocity.y) < 0.5) {
                        c.resting = true;
                    }
                }
            }

            // Burning chunk emits sparks
            if (c.burning && Math.random() < 0.05) {
                this.effects._emitFireParticle(c.mesh.position, 0.6, 0xff7a20);
            }

            if (c.life <= 0) {
                this.scene.remove(c.mesh);
                c.mesh.geometry.dispose();
                c.mesh.material.dispose();
                this.chunks.splice(i, 1);
            } else if (c.life < 2.0) {
                if (!c.mesh.material.transparent) c.mesh.material.transparent = true;
                c.mesh.material.opacity = c.life / 2.0;
            }
        }
    }

    clear() {
        this.buildings.forEach(b => {
            if (b.fireHandle) this.effects.stopFire(b.fireHandle);
            b.damageMarkers.forEach(m => this.scene.remove(m));
        });
        this.chunks.forEach(c => this.scene.remove(c.mesh));
        this.buildings = [];
        this.chunks = [];
    }
}
