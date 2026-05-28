/* World / Environment Generator */

class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.collidables = [];
        this.worldSize = 500;
        this.destruction = null; // Set by Game; if present, buildings are destructible
    }

    buildCity() {
        this.clear();
        this.addGround(0x2a4a2a, 0x1a3a1a);
        this.addSky();
        this.addCityBuildings();
        this.addTrees(100);
        this.addRoads();
        this.addLights();
    }

    buildDesert() {
        this.clear();
        this.addGround(0xc4a35a, 0x9a8040);
        this.addDesertSky();
        this.addDesertTerrain();
        this.addCacti(60);
        this.addLights();
    }

    buildMilitary() {
        this.clear();
        this.addGround(0x3a5a3a, 0x2a4a2a);
        this.addSky();
        this.addMilitaryBase();
        this.addTrees(80);
        this.addLights();
    }

    buildOcean() {
        this.clear();
        this.addWater();
        this.addSky();
        this.addIslands();
        this.addLights();
    }

    buildMountain() {
        this.clear();
        this.addGround(0x4a6a4a, 0x3a5a3a);
        this.addMountainSky();
        this.addMountains();
        this.addTrees(120);
        this.addLights();
    }

    buildFreeWorld() {
        this.clear();
        this.addGround(0x3a6a3a, 0x2a5a2a);
        this.addSky();
        this.addCityBuildings();
        this.addMountainsBackground();
        this.addTrees(150);
        this.addRoads();
        this.addWaterFeatures();
        this.addLights();
    }

    clear() {
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
        this.collidables = [];
    }

    addGround(color1, color2) {
        const size = this.worldSize * 2;
        const groundGeom = new THREE.PlaneGeometry(size, size, 64, 64);

        // Add some terrain variation
        const vertices = groundGeom.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            vertices[i + 2] = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 2 +
                              Math.sin(x * 0.05) * Math.cos(y * 0.03) * 1;
        }
        groundGeom.computeVertexNormals();

        // Pick a procedural texture based on the colour
        let texName = 'grass';
        if (color1 === 0xc4a35a || color1 === 0x9a8040) texName = 'sand';
        const groundTex = (typeof Textures !== 'undefined') ? Textures.get(texName) : null;
        if (groundTex) {
            groundTex.repeat.set(40, 40);
            groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        }

        const groundMat = new THREE.MeshPhongMaterial({
            color: color1,
            map: groundTex || null,
            specular: 0x111111,
            shininess: 5
        });

        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.objects.push(ground);

        // Grid overlay
        const gridHelper = new THREE.GridHelper(size, 100, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.05;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
        this.objects.push(gridHelper);
    }

    addSky() {
        // Gradient sky dome
        const skyGeom = new THREE.SphereGeometry(800, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0044aa) },
                bottomColor: { value: new THREE.Color(0x88bbff) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeom, skyMat);
        this.scene.add(sky);
        this.objects.push(sky);

        // Sun
        const sunGeom = new THREE.SphereGeometry(20, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        const sun = new THREE.Mesh(sunGeom, sunMat);
        sun.position.set(300, 400, -500);
        this.scene.add(sun);
        this.objects.push(sun);

        // Clouds
        for (let i = 0; i < 30; i++) {
            this.addCloud(
                Utils.randomRange(-400, 400),
                Utils.randomRange(80, 180),
                Utils.randomRange(-400, 400)
            );
        }
    }

    addDesertSky() {
        const skyGeom = new THREE.SphereGeometry(800, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x1144aa) },
                bottomColor: { value: new THREE.Color(0xddc488) },
                offset: { value: 20 },
                exponent: { value: 0.4 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeom, skyMat);
        this.scene.add(sky);
        this.objects.push(sky);

        const sunGeom = new THREE.SphereGeometry(25, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xff8844 });
        const sun = new THREE.Mesh(sunGeom, sunMat);
        sun.position.set(200, 300, -400);
        this.scene.add(sun);
        this.objects.push(sun);
    }

    addMountainSky() {
        this.addSky();
        // Fog for mountains
        this.scene.fog = new THREE.FogExp2(0x88aacc, 0.002);
    }

    addCloud(x, y, z) {
        const cloudGroup = new THREE.Group();
        const cloudMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });

        const count = Utils.randomInt(3, 7);
        for (let i = 0; i < count; i++) {
            const size = Utils.randomRange(8, 20);
            const geom = new THREE.SphereGeometry(size, 8, 8);
            const cloud = new THREE.Mesh(geom, cloudMat);
            cloud.position.set(
                Utils.randomRange(-15, 15),
                Utils.randomRange(-3, 3),
                Utils.randomRange(-10, 10)
            );
            cloud.scale.y = 0.4;
            cloudGroup.add(cloud);
        }

        cloudGroup.position.set(x, y, z);
        this.scene.add(cloudGroup);
        this.objects.push(cloudGroup);
    }

    addCityBuildings() {
        const palettes = [
            { base: '#3a4a5a', accent: '#1a2a3a' },
            { base: '#4a5566', accent: '#2a3344' },
            { base: '#2a3a4a', accent: '#0a1a2a' },
            { base: '#5a4a3a', accent: '#3a2a1a' },
            { base: '#556677', accent: '#334455' }
        ];

        for (let i = 0; i < 80; i++) {
            const w = Utils.randomRange(6, 20);
            const h = Utils.randomRange(10, 60);
            const d = Utils.randomRange(6, 20);

            const x = Utils.randomRange(-300, 300);
            const z = Utils.randomRange(-300, 300);

            // Keep away from spawn
            if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;

            const palette = palettes[Utils.randomInt(0, palettes.length - 1)];
            const baseColorHex = parseInt(palette.base.replace('#', '0x'));
            const geom = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshPhongMaterial({
                color: baseColorHex,
                specular: 0x222233,
                shininess: 30
            });
            const building = new THREE.Mesh(geom, mat);
            building.position.set(x, h / 2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.objects.push(building);
            this.collidables.push(building);

            // Roof detail
            const roofGeom = new THREE.BoxGeometry(w * 0.7, 1, d * 0.7);
            const roofMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
            const roof = new THREE.Mesh(roofGeom, roofMat);
            roof.position.set(x, h + 0.5, z);
            this.scene.add(roof);
            this.objects.push(roof);

            // 3D plane windows
            const windows = this.addWindows(building, w, h, d, x, z);

            // Register as destructible
            if (this.destruction) {
                this.destruction.registerBuilding(building, {
                    children: [roof].concat(windows || []),
                    color: baseColorHex,
                    health: 40 + w * d * 0.3
                });
            }
        }
    }

    addWindows(building, w, h, d, bx, bz) {
        const windowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd88,
            transparent: true,
            opacity: 0.6
        });

        const floors = Math.floor(h / 4);
        const sides = [
            { axis: 'x', dir: 1, size: d },
            { axis: 'x', dir: -1, size: d },
            { axis: 'z', dir: 1, size: w },
            { axis: 'z', dir: -1, size: w }
        ];

        const windows = [];
        sides.forEach(side => {
            const windowsPerFloor = Math.floor(side.size / 4);
            for (let floor = 0; floor < floors; floor++) {
                for (let wi = 0; wi < windowsPerFloor; wi++) {
                    if (Math.random() < 0.3) continue;

                    const winGeom = new THREE.PlaneGeometry(1.5, 2);
                    const win = new THREE.Mesh(winGeom, windowMat);

                    const y = floor * 4 + 3;
                    const offset = (wi - windowsPerFloor / 2) * 4 + 2;

                    if (side.axis === 'x') {
                        win.position.set(bx + (w / 2 + 0.1) * side.dir, y, bz + offset);
                        if (side.dir < 0) win.rotation.y = Math.PI;
                    } else {
                        win.position.set(bx + offset, y, bz + (d / 2 + 0.1) * side.dir);
                        win.rotation.y = Math.PI / 2;
                        if (side.dir < 0) win.rotation.y = -Math.PI / 2;
                    }

                    this.scene.add(win);
                    this.objects.push(win);
                    windows.push(win);
                }
            }
        });
        return windows;
    }

    addTrees(count) {
        for (let i = 0; i < count; i++) {
            const x = Utils.randomRange(-400, 400);
            const z = Utils.randomRange(-400, 400);
            if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;

            const tree = new THREE.Group();
            const trunkH = Utils.randomRange(3, 8);

            const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, trunkH, 6);
            const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
            const trunk = new THREE.Mesh(trunkGeom, trunkMat);
            trunk.position.y = trunkH / 2;
            tree.add(trunk);

            const leavesH = Utils.randomRange(4, 8);
            const leavesGeom = new THREE.ConeGeometry(Utils.randomRange(2, 4), leavesH, 8);
            const leavesMat = new THREE.MeshPhongMaterial({
                color: Utils.randomInt(0, 1) ? 0x2a6a2a : 0x3a8a3a
            });
            const leaves = new THREE.Mesh(leavesGeom, leavesMat);
            leaves.position.y = trunkH + leavesH / 2 - 1;
            tree.add(leaves);

            tree.position.set(x, 0, z);
            this.scene.add(tree);
            this.objects.push(tree);
        }
    }

    addRoads() {
        const roadTex = (typeof Textures !== 'undefined') ? Textures.get('asphalt') : null;
        if (roadTex) roadTex.repeat.set(1, 40);
        const roadMat = new THREE.MeshPhongMaterial({ color: 0x333333, map: roadTex || null });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        // Main roads
        [-200, -100, 0, 100, 200].forEach(pos => {
            const roadGeom = new THREE.PlaneGeometry(12, this.worldSize * 2);
            const road = new THREE.Mesh(roadGeom, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(pos, 0.05, 0);
            this.scene.add(road);
            this.objects.push(road);

            const road2Geom = new THREE.PlaneGeometry(this.worldSize * 2, 12);
            const road2 = new THREE.Mesh(road2Geom, roadMat);
            road2.rotation.x = -Math.PI / 2;
            road2.position.set(0, 0.05, pos);
            this.scene.add(road2);
            this.objects.push(road2);
        });

        // Center line markings
        for (let i = -this.worldSize; i < this.worldSize; i += 10) {
            const markGeom = new THREE.PlaneGeometry(0.3, 4);
            const mark = new THREE.Mesh(markGeom, lineMat);
            mark.rotation.x = -Math.PI / 2;
            mark.position.set(0, 0.06, i);
            this.scene.add(mark);
            this.objects.push(mark);
        }
    }

    addDesertTerrain() {
        // Dunes
        for (let i = 0; i < 40; i++) {
            const geom = new THREE.SphereGeometry(
                Utils.randomRange(10, 40), 8, 8,
                0, Math.PI * 2, 0, Math.PI / 2
            );
            const mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(0.1, 0.4, Utils.randomRange(0.4, 0.6))
            });
            const dune = new THREE.Mesh(geom, mat);
            dune.position.set(
                Utils.randomRange(-400, 400),
                -2,
                Utils.randomRange(-400, 400)
            );
            dune.scale.y = 0.3;
            this.scene.add(dune);
            this.objects.push(dune);
        }

        // Ruins / structures
        for (let i = 0; i < 15; i++) {
            const x = Utils.randomRange(-300, 300);
            const z = Utils.randomRange(-300, 300);
            this.addRuin(x, z);
        }
    }

    addRuin(x, z) {
        const mat = new THREE.MeshPhongMaterial({ color: 0x8a7a5a });

        for (let w = 0; w < Utils.randomInt(2, 5); w++) {
            const h = Utils.randomRange(3, 12);
            const geom = new THREE.BoxGeometry(
                Utils.randomRange(1, 4), h, Utils.randomRange(1, 4)
            );
            const wall = new THREE.Mesh(geom, mat);
            wall.position.set(
                x + Utils.randomRange(-5, 5),
                h / 2,
                z + Utils.randomRange(-5, 5)
            );
            wall.rotation.y = Utils.randomRange(0, Math.PI);
            this.scene.add(wall);
            this.objects.push(wall);
            this.collidables.push(wall);
        }
    }

    addCacti(count) {
        for (let i = 0; i < count; i++) {
            const cactus = new THREE.Group();
            const h = Utils.randomRange(2, 6);
            const geom = new THREE.CylinderGeometry(0.3, 0.4, h, 6);
            const mat = new THREE.MeshPhongMaterial({ color: 0x2a6a2a });
            const body = new THREE.Mesh(geom, mat);
            body.position.y = h / 2;
            cactus.add(body);

            if (Math.random() > 0.4) {
                const armH = Utils.randomRange(1, 3);
                const armGeom = new THREE.CylinderGeometry(0.2, 0.25, armH, 6);
                const arm = new THREE.Mesh(armGeom, mat);
                arm.position.set(0.5, h * 0.6, 0);
                arm.rotation.z = -Math.PI / 4;
                cactus.add(arm);
            }

            cactus.position.set(
                Utils.randomRange(-400, 400),
                0,
                Utils.randomRange(-400, 400)
            );
            this.scene.add(cactus);
            this.objects.push(cactus);
        }
    }

    addMilitaryBase() {
        const concreteMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x555555, specular: 0x888888, shininess: 50 });

        // Main buildings
        const positions = [
            { x: 50, z: 50, w: 30, h: 8, d: 20 },
            { x: -60, z: 40, w: 20, h: 6, d: 40 },
            { x: 0, z: -80, w: 40, h: 10, d: 25 },
            { x: 80, z: -50, w: 15, h: 12, d: 15 },
            { x: -80, z: -60, w: 25, h: 7, d: 30 }
        ];

        positions.forEach(p => {
            const geom = new THREE.BoxGeometry(p.w, p.h, p.d);
            const building = new THREE.Mesh(geom, concreteMat);
            building.position.set(p.x, p.h / 2, p.z);
            this.scene.add(building);
            this.objects.push(building);
            this.collidables.push(building);
        });

        // Radar dish
        const radarGroup = new THREE.Group();
        const radarBaseGeom = new THREE.CylinderGeometry(1, 2, 15, 8);
        const radarBase = new THREE.Mesh(radarBaseGeom, metalMat);
        radarBase.position.y = 7.5;
        radarGroup.add(radarBase);

        const dishGeom = new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dish = new THREE.Mesh(dishGeom, metalMat);
        dish.position.y = 16;
        dish.rotation.x = Math.PI / 6;
        radarGroup.add(dish);

        radarGroup.position.set(100, 0, 100);
        this.scene.add(radarGroup);
        this.objects.push(radarGroup);

        // Watch towers
        [{ x: -120, z: -120 }, { x: 120, z: 120 }, { x: -120, z: 120 }, { x: 120, z: -120 }].forEach(pos => {
            const tower = new THREE.Group();
            const poleGeom = new THREE.CylinderGeometry(0.5, 0.5, 20, 6);
            const pole = new THREE.Mesh(poleGeom, metalMat);
            pole.position.y = 10;
            tower.add(pole);

            const platGeom = new THREE.BoxGeometry(6, 0.5, 6);
            const plat = new THREE.Mesh(platGeom, concreteMat);
            plat.position.y = 20;
            tower.add(plat);

            tower.position.set(pos.x, 0, pos.z);
            this.scene.add(tower);
            this.objects.push(tower);
            this.collidables.push(tower);
        });

        // Runway
        const runwayGeom = new THREE.PlaneGeometry(15, 200);
        const runwayMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const runway = new THREE.Mesh(runwayGeom, runwayMat);
        runway.rotation.x = -Math.PI / 2;
        runway.position.set(-30, 0.05, 0);
        this.scene.add(runway);
        this.objects.push(runway);

        // Barricades
        for (let i = 0; i < 30; i++) {
            const barrGeom = new THREE.BoxGeometry(3, 1.5, 1);
            const barr = new THREE.Mesh(barrGeom, new THREE.MeshPhongMaterial({ color: 0x554433 }));
            barr.position.set(
                Utils.randomRange(-150, 150),
                0.75,
                Utils.randomRange(-150, 150)
            );
            barr.rotation.y = Utils.randomRange(0, Math.PI);
            this.scene.add(barr);
            this.objects.push(barr);
        }
    }

    addIslands() {
        for (let i = 0; i < 8; i++) {
            const island = new THREE.Group();
            const baseGeom = new THREE.SphereGeometry(
                Utils.randomRange(15, 50), 8, 8,
                0, Math.PI * 2, 0, Math.PI / 2
            );
            const baseMat = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(0.1, 0.6, 0.4)
            });
            const base = new THREE.Mesh(baseGeom, baseMat);
            base.scale.y = 0.3;
            island.add(base);

            // Trees on island
            const treeCount = Utils.randomInt(3, 10);
            for (let t = 0; t < treeCount; t++) {
                const palmGroup = new THREE.Group();
                const trunkGeom = new THREE.CylinderGeometry(0.2, 0.4, 6, 6);
                const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8a6a3a });
                const trunk = new THREE.Mesh(trunkGeom, trunkMat);
                trunk.position.y = 3;
                trunk.rotation.z = Utils.randomRange(-0.2, 0.2);
                palmGroup.add(trunk);

                const leafGeom = new THREE.SphereGeometry(3, 6, 6);
                const leafMat = new THREE.MeshPhongMaterial({ color: 0x2a8a2a });
                const leaf = new THREE.Mesh(leafGeom, leafMat);
                leaf.position.y = 7;
                leaf.scale.y = 0.4;
                palmGroup.add(leaf);

                palmGroup.position.set(
                    Utils.randomRange(-10, 10),
                    Utils.randomRange(0, 3),
                    Utils.randomRange(-10, 10)
                );
                island.add(palmGroup);
            }

            island.position.set(
                Utils.randomRange(-300, 300),
                -2,
                Utils.randomRange(-300, 300)
            );
            this.scene.add(island);
            this.objects.push(island);
        }
    }

    addWater() {
        const waterGeom = new THREE.PlaneGeometry(this.worldSize * 2, this.worldSize * 2, 64, 64);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x006688,
            specular: 0x446688,
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -1;
        this.scene.add(water);
        this.objects.push(water);
        this.water = water;
    }

    addMountains() {
        for (let i = 0; i < 20; i++) {
            const h = Utils.randomRange(30, 100);
            const r = Utils.randomRange(20, 50);
            const geom = new THREE.ConeGeometry(r, h, Utils.randomInt(5, 8));
            const mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(0.3, 0.2, Utils.randomRange(0.25, 0.4))
            });
            const mountain = new THREE.Mesh(geom, mat);
            mountain.position.set(
                Utils.randomRange(-400, 400),
                h / 2 - 5,
                Utils.randomRange(-400, 400)
            );
            this.scene.add(mountain);
            this.objects.push(mountain);
            this.collidables.push(mountain);

            // Snow cap
            if (h > 50) {
                const capGeom = new THREE.ConeGeometry(r * 0.3, h * 0.2, Utils.randomInt(5, 8));
                const capMat = new THREE.MeshPhongMaterial({ color: 0xeeeeff });
                const cap = new THREE.Mesh(capGeom, capMat);
                cap.position.copy(mountain.position);
                cap.position.y = h - 5;
                this.scene.add(cap);
                this.objects.push(cap);
            }
        }
    }

    addMountainsBackground() {
        for (let i = 0; i < 15; i++) {
            const h = Utils.randomRange(40, 120);
            const r = Utils.randomRange(30, 60);
            const angle = (i / 15) * Math.PI * 2;
            const dist = Utils.randomRange(350, 500);
            const geom = new THREE.ConeGeometry(r, h, 6);
            const mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(0.3, 0.15, 0.3)
            });
            const mountain = new THREE.Mesh(geom, mat);
            mountain.position.set(
                Math.cos(angle) * dist,
                h / 2 - 10,
                Math.sin(angle) * dist
            );
            this.scene.add(mountain);
            this.objects.push(mountain);
        }
    }

    addWaterFeatures() {
        // Pond/lake
        const lakeGeom = new THREE.CircleGeometry(40, 32);
        const lakeMat = new THREE.MeshPhongMaterial({
            color: 0x1166aa,
            specular: 0x4488cc,
            shininess: 80,
            transparent: true,
            opacity: 0.7
        });
        const lake = new THREE.Mesh(lakeGeom, lakeMat);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(200, 0.1, 200);
        this.scene.add(lake);
        this.objects.push(lake);
    }

    addLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambient);
        this.objects.push(ambient);

        // Directional (sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(200, 300, -200);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 800;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);
        this.objects.push(dirLight);

        // Hemisphere light for softer ambient
        const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.4);
        this.scene.add(hemiLight);
        this.objects.push(hemiLight);
    }

    update(dt) {
        // Animate water if present
        if (this.water) {
            const verts = this.water.geometry.attributes.position.array;
            const time = Date.now() * 0.001;
            for (let i = 2; i < verts.length; i += 3) {
                const x = verts[i - 2];
                const y = verts[i - 1];
                verts[i] = Math.sin(x * 0.05 + time) * Math.cos(y * 0.05 + time) * 1.5;
            }
            this.water.geometry.attributes.position.needsUpdate = true;
        }
    }

    dispose() {
        this.clear();
    }
}
