/* World: skydome, terrain, clouds, distant mountains, sun */

class PlanesWorld {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.mountains = [];
        this.build();
    }

    build() {
        // Fog so the horizon looks deep but the world stays bounded
        this.scene.fog = new THREE.Fog(0x9dbfd8, 600, 6500);
        this.scene.background = new THREE.Color(0x8cb6d8);

        // Sun (directional)
        const sun = new THREE.DirectionalLight(0xfff4d6, 1.05);
        sun.position.set(800, 1200, 600);
        this.scene.add(sun);

        const ambient = new THREE.AmbientLight(0x9ab8d4, 0.55);
        this.scene.add(ambient);

        // Hemisphere light for nicer skylighting on plane underside
        const hemi = new THREE.HemisphereLight(0xb8d4ff, 0x4a5232, 0.35);
        this.scene.add(hemi);

        // Skydome
        const skyTex = PlaneTextures.sky();
        const skyGeo = new THREE.SphereGeometry(8000, 32, 24);
        const skyMat = new THREE.MeshBasicMaterial({
            map: skyTex,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        this.skyMesh = sky;

        // Sun billboard
        const sunMat = new THREE.SpriteMaterial({
            map: PlaneTextures.sunSprite(),
            transparent: true,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending,
        });
        const sunSprite = new THREE.Sprite(sunMat);
        sunSprite.scale.set(700, 700, 1);
        sunSprite.position.set(2200, 1400, 1800);
        this.scene.add(sunSprite);

        // Terrain with displacement
        const terrainTex = PlaneTextures.terrain();
        const terrainGeo = new THREE.PlaneGeometry(12000, 12000, 160, 160);
        terrainGeo.rotateX(-Math.PI / 2);
        // Deform vertices using noise-like hash
        const pos = terrainGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const r = Math.sqrt(x * x + z * z);
            // Flatten near origin for runway, mountains farther out
            const ridge =
                Math.sin(x * 0.0009) * Math.cos(z * 0.0011) * 70 +
                Math.sin(x * 0.0025 + 1.3) * Math.cos(z * 0.0019 - 0.8) * 35;
            const falloff = Math.min(1, Math.max(0, (r - 600) / 2400));
            const y = ridge * falloff;
            pos.setY(i, y);
        }
        terrainGeo.computeVertexNormals();
        const terrainMat = new THREE.MeshLambertMaterial({
            map: terrainTex,
            color: 0xffffff,
        });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.position.y = -10;
        this.scene.add(terrain);
        this.terrain = terrain;

        // Distant mountain ring (low-poly cones)
        const ringRadius = 4800;
        const mountainMat = new THREE.MeshLambertMaterial({
            color: 0x6a7585,
            flatShading: true,
        });
        for (let i = 0; i < 32; i++) {
            const a = (i / 32) * Math.PI * 2;
            const r = ringRadius + (Math.sin(i * 7.3) * 320);
            const h = 380 + Math.abs(Math.sin(i * 2.1)) * 420;
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(220 + Math.sin(i) * 60, h, 6),
                mountainMat
            );
            cone.position.set(Math.cos(a) * r, h / 2 - 30, Math.sin(a) * r);
            cone.rotation.y = Math.random() * Math.PI;
            this.scene.add(cone);
            this.mountains.push(cone);
        }

        // Cloud field
        const cloudMat = new THREE.SpriteMaterial({
            map: PlaneTextures.cloudSprite(),
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            fog: true,
        });
        for (let i = 0; i < 80; i++) {
            const sprite = new THREE.Sprite(cloudMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 3500;
            const h = 350 + Math.random() * 700;
            const scale = 160 + Math.random() * 320;
            sprite.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
            sprite.scale.set(scale, scale * 0.55, 1);
            sprite.userData.driftX = (Math.random() - 0.5) * 4;
            sprite.userData.driftZ = (Math.random() - 0.5) * 4;
            this.scene.add(sprite);
            this.clouds.push(sprite);
        }

        // Runway at origin so you can see where you start
        const runwayMat = new THREE.MeshLambertMaterial({ color: 0x303030 });
        const runway = new THREE.Mesh(new THREE.PlaneGeometry(60, 1100), runwayMat);
        runway.rotation.x = -Math.PI / 2;
        runway.position.y = -8;
        this.scene.add(runway);

        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfff5b0 });
        for (let i = -10; i <= 10; i++) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(4, 28), stripeMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(0, -7.9, i * 50);
            this.scene.add(stripe);
        }
    }

    update(dt, planePos) {
        // Move clouds gently, wrap around the plane so the field stays around it
        const wrap = 4000;
        for (const c of this.clouds) {
            c.position.x += c.userData.driftX * dt;
            c.position.z += c.userData.driftZ * dt;
            const dx = c.position.x - planePos.x;
            const dz = c.position.z - planePos.z;
            if (dx >  wrap) c.position.x -= wrap * 2;
            if (dx < -wrap) c.position.x += wrap * 2;
            if (dz >  wrap) c.position.z -= wrap * 2;
            if (dz < -wrap) c.position.z += wrap * 2;
        }
        // Keep skydome centered on plane so we never reach the edge
        if (this.skyMesh) this.skyMesh.position.set(planePos.x, 0, planePos.z);
    }
}
