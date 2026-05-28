/* Drone 3D Model & FPV Physics */

class Drone {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.rotationVelocity = new THREE.Vector3();

        this.health = 100;
        this.fuel = 100;
        this.maxHealth = 100;
        this.maxFuel = 100;
        this.rockets = 8;
        this.maxRockets = 8;

        this.speed = 0;

        // === Realistic quadcopter physics (SI units) ===
        // Mass ~1.2kg, gravity 9.81 m/s². At hover thrustPerKg=g, throttle 1 gives 2g.
        this.mass = 1.2;
        this.gravity = 9.81;
        this.maxThrustAccel = 2 * this.gravity; // m/s² at full throttle (TWR 2:1)
        this.maxTiltAngle = Math.PI / 3;        // 60° max tilt for aggressive maneuvers
        this.tiltResponse = 8;                  // how fast body tilts toward target
        this.yawRate = 2.4;                     // rad/s yaw at full stick
        this.maxHorizSpeed = 45;                // m/s (~162 km/h)
        this.maxVertSpeed = 30;                 // m/s
        // Aerodynamic drag (linear coefficient: a_drag = -k * v).
        this.horizDrag = 0.6;  // 1/s
        this.vertDrag = 0.4;   // 1/s
        this.rotorSpeed = 0;
        this.targetRotorSpeed = 0;

        // FPV camera mount point
        this.fpvCameraOffset = new THREE.Vector3(0, 0.1, -0.9);
        this.pitchAngle = 0;
        this.rollAngle = 0;

        this.propellers = [];
        this.lights = [];

        this.buildModel();
        scene.add(this.group);

        this.group.position.set(0, 15, 0);
    }

    buildModel() {
        // Enhanced materials with procedural texture-like effects
        const carbonFiberMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            specular: 0x555555,
            shininess: 120,
            flatShading: false
        });

        const carbonTopMat = new THREE.MeshPhongMaterial({
            color: 0x222238,
            specular: 0x666666,
            shininess: 100
        });

        const accentMat = new THREE.MeshPhongMaterial({
            color: 0x00b4ff,
            emissive: 0x004477,
            specular: 0xaaddff,
            shininess: 140
        });

        const metalMat = new THREE.MeshPhongMaterial({
            color: 0x888899,
            specular: 0xffffff,
            shininess: 200,
            reflectivity: 1.0
        });

        const darkMetalMat = new THREE.MeshPhongMaterial({
            color: 0x0a0a15,
            specular: 0x333344,
            shininess: 80
        });

        const rubberMat = new THREE.MeshPhongMaterial({
            color: 0x111111,
            specular: 0x111111,
            shininess: 10
        });

        const redLedMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
        const greenLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
        const whiteLedMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // === MAIN BODY ===
        // Central body — layered for depth
        const bodyGeom = new THREE.BoxGeometry(1.4, 0.35, 2.0);
        const body = new THREE.Mesh(bodyGeom, carbonFiberMat);
        this.group.add(body);

        // Top plate with raised center
        const topPlateGeom = new THREE.BoxGeometry(1.2, 0.08, 1.6);
        const topPlate = new THREE.Mesh(topPlateGeom, carbonTopMat);
        topPlate.position.set(0, 0.22, 0);
        this.group.add(topPlate);

        // Side accent strips
        [-0.72, 0.72].forEach(x => {
            const stripGeom = new THREE.BoxGeometry(0.03, 0.15, 1.6);
            const strip = new THREE.Mesh(stripGeom, accentMat);
            strip.position.set(x, 0.05, 0);
            this.group.add(strip);
        });

        // Front accent V-shape
        const frontVGeom = new THREE.BoxGeometry(0.6, 0.04, 0.04);
        [-1, 1].forEach(side => {
            const vStrip = new THREE.Mesh(frontVGeom, accentMat);
            vStrip.position.set(side * 0.2, 0.22, -0.85);
            vStrip.rotation.y = side * 0.4;
            this.group.add(vStrip);
        });

        // === CANOPY ===
        const canopyGeom = new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopyMat = new THREE.MeshPhongMaterial({
            color: 0x002244,
            emissive: 0x001122,
            specular: 0x44aaff,
            shininess: 200,
            transparent: true,
            opacity: 0.85
        });
        const canopy = new THREE.Mesh(canopyGeom, canopyMat);
        canopy.position.set(0, 0.26, -0.2);
        canopy.scale.set(0.9, 0.45, 1.1);
        this.group.add(canopy);

        // Canopy frame
        const frameGeom = new THREE.TorusGeometry(0.42, 0.02, 6, 12, Math.PI);
        const frame = new THREE.Mesh(frameGeom, metalMat);
        frame.position.set(0, 0.26, -0.2);
        frame.rotation.x = -Math.PI / 2;
        frame.scale.set(1, 1.1, 0.5);
        this.group.add(frame);

        // === BOTTOM PLATE ===
        const bottomGeom = new THREE.BoxGeometry(1.1, 0.08, 1.5);
        const bottomPlate = new THREE.Mesh(bottomGeom, darkMetalMat);
        bottomPlate.position.y = -0.22;
        this.group.add(bottomPlate);

        // Battery pack
        const batteryGeom = new THREE.BoxGeometry(0.5, 0.12, 0.8);
        const battery = new THREE.Mesh(batteryGeom, new THREE.MeshPhongMaterial({
            color: 0x222222,
            specular: 0x333333,
            shininess: 40
        }));
        battery.position.set(0, -0.32, 0.2);
        this.group.add(battery);

        // Battery label accent
        const battLabelGeom = new THREE.BoxGeometry(0.15, 0.02, 0.3);
        const battLabel = new THREE.Mesh(battLabelGeom, accentMat);
        battLabel.position.set(0, -0.26, 0.2);
        this.group.add(battLabel);

        // === ARMS ===
        const armPositions = [
            { x: 1.3, z: 1.1 },
            { x: -1.3, z: 1.1 },
            { x: 1.3, z: -1.1 },
            { x: -1.3, z: -1.1 }
        ];

        armPositions.forEach((pos, i) => {
            // Main arm tube
            const armLength = Math.sqrt(pos.x * pos.x + pos.z * pos.z) * 0.7;
            const armGeom = new THREE.CylinderGeometry(0.06, 0.07, armLength, 8);
            const arm = new THREE.Mesh(armGeom, carbonFiberMat);
            arm.position.set(pos.x * 0.5, 0.02, pos.z * 0.5);
            const angle = Math.atan2(pos.x, pos.z);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.x = -angle;
            this.group.add(arm);

            // Arm accent ring at base
            const ringGeom = new THREE.TorusGeometry(0.09, 0.015, 6, 12);
            const ring = new THREE.Mesh(ringGeom, accentMat);
            ring.position.set(pos.x * 0.2, 0.02, pos.z * 0.2);
            ring.rotation.x = Math.PI / 2;
            this.group.add(ring);

            // Motor housing — detailed
            const motorBaseGeom = new THREE.CylinderGeometry(0.22, 0.28, 0.18, 12);
            const motorBase = new THREE.Mesh(motorBaseGeom, darkMetalMat);
            motorBase.position.set(pos.x, 0.05, pos.z);
            this.group.add(motorBase);

            const motorTopGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 12);
            const motorTop = new THREE.Mesh(motorTopGeom, metalMat);
            motorTop.position.set(pos.x, 0.18, pos.z);
            this.group.add(motorTop);

            // Motor bell cap
            const capGeom = new THREE.SphereGeometry(0.08, 8, 6);
            const cap = new THREE.Mesh(capGeom, accentMat);
            cap.position.set(pos.x, 0.27, pos.z);
            cap.scale.y = 0.5;
            this.group.add(cap);

            // Motor cooling vents (small cuts)
            for (let v = 0; v < 6; v++) {
                const ventAngle = (v / 6) * Math.PI * 2;
                const ventGeom = new THREE.BoxGeometry(0.01, 0.1, 0.04);
                const vent = new THREE.Mesh(ventGeom, accentMat);
                vent.position.set(
                    pos.x + Math.cos(ventAngle) * 0.24,
                    0.12,
                    pos.z + Math.sin(ventAngle) * 0.24
                );
                vent.rotation.y = ventAngle;
                this.group.add(vent);
            }

            // === PROPELLERS ===
            const propGroup = new THREE.Group();
            propGroup.position.set(pos.x, 0.32, pos.z);

            // Prop hub
            const hubGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
            const hub = new THREE.Mesh(hubGeom, metalMat);
            propGroup.add(hub);

            // Blade 1
            const blade1Group = new THREE.Group();
            const blade1Geom = new THREE.BoxGeometry(1.5, 0.015, 0.1);
            const blade1 = new THREE.Mesh(blade1Geom, new THREE.MeshPhongMaterial({
                color: 0x111122,
                specular: 0x334455,
                shininess: 60,
                transparent: true,
                opacity: 0.9
            }));
            // Blade tip accent
            const tipGeom1 = new THREE.BoxGeometry(0.25, 0.016, 0.1);
            const tip1a = new THREE.Mesh(tipGeom1, accentMat);
            tip1a.position.x = 0.65;
            const tip1b = new THREE.Mesh(tipGeom1, accentMat);
            tip1b.position.x = -0.65;
            blade1Group.add(blade1, tip1a, tip1b);
            propGroup.add(blade1Group);

            // Blade 2
            const blade2Group = new THREE.Group();
            const blade2Geom = new THREE.BoxGeometry(1.5, 0.015, 0.1);
            const blade2 = new THREE.Mesh(blade2Geom, new THREE.MeshPhongMaterial({
                color: 0x111122,
                specular: 0x334455,
                shininess: 60,
                transparent: true,
                opacity: 0.9
            }));
            const tip2a = new THREE.Mesh(tipGeom1.clone(), accentMat);
            tip2a.position.x = 0.65;
            const tip2b = new THREE.Mesh(tipGeom1.clone(), accentMat);
            tip2b.position.x = -0.65;
            blade2Group.add(blade2, tip2a, tip2b);
            blade2Group.rotation.y = Math.PI / 2;
            propGroup.add(blade2Group);

            // Prop disc (spinning blur)
            const discGeom = new THREE.CylinderGeometry(0.75, 0.75, 0.01, 24);
            const discMat = new THREE.MeshPhongMaterial({
                color: 0x00b4ff,
                transparent: true,
                opacity: 0.0
            });
            const disc = new THREE.Mesh(discGeom, discMat);
            propGroup.add(disc);

            // Prop guard ring
            const guardGeom = new THREE.TorusGeometry(0.78, 0.02, 6, 24);
            const guard = new THREE.Mesh(guardGeom, carbonFiberMat);
            guard.rotation.x = Math.PI / 2;
            guard.position.y = 0.02;
            propGroup.add(guard);

            this.group.add(propGroup);
            this.propellers.push({ group: propGroup, disc: disc, direction: i % 2 === 0 ? 1 : -1 });

            // === LEDs ===
            const isFront = i < 2;
            const ledGeom = new THREE.SphereGeometry(0.04, 8, 8);
            const led = new THREE.Mesh(ledGeom, isFront ? greenLedMat : redLedMat);
            led.position.set(pos.x * 0.75, -0.12, pos.z * 0.75);
            this.group.add(led);
            this.lights.push(led);

            // Arm-tip LED glow ring
            const glowRingGeom = new THREE.TorusGeometry(0.12, 0.008, 6, 16);
            const glowRing = new THREE.Mesh(glowRingGeom, new THREE.MeshBasicMaterial({
                color: isFront ? 0x00ff44 : 0xff2200,
                transparent: true,
                opacity: 0.3
            }));
            glowRing.position.set(pos.x * 0.75, -0.12, pos.z * 0.75);
            glowRing.rotation.x = Math.PI / 2;
            this.group.add(glowRing);
        });

        // === CAMERA / FPV POD ===
        // Camera gimbal base
        const gimbalBaseGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.08, 8);
        const gimbalBase = new THREE.Mesh(gimbalBaseGeom, metalMat);
        gimbalBase.position.set(0, -0.26, -0.75);
        this.group.add(gimbalBase);

        // Camera housing
        const camHousingGeom = new THREE.BoxGeometry(0.22, 0.16, 0.22);
        const camHousing = new THREE.Mesh(camHousingGeom, darkMetalMat);
        camHousing.position.set(0, -0.3, -0.82);
        this.group.add(camHousing);

        // Camera lens
        const lensGeom = new THREE.CylinderGeometry(0.07, 0.09, 0.06, 12);
        const lensMat = new THREE.MeshPhongMaterial({
            color: 0x001133,
            specular: 0x00b4ff,
            shininess: 250,
            emissive: 0x000811
        });
        const lens = new THREE.Mesh(lensGeom, lensMat);
        lens.position.set(0, -0.3, -0.96);
        lens.rotation.x = Math.PI / 2;
        this.group.add(lens);

        // Lens ring
        const lensRingGeom = new THREE.TorusGeometry(0.085, 0.01, 8, 16);
        const lensRing = new THREE.Mesh(lensRingGeom, accentMat);
        lensRing.position.set(0, -0.3, -0.97);
        this.group.add(lensRing);

        // IR sensor (front)
        const irGeom = new THREE.SphereGeometry(0.03, 6, 6);
        const irLed = new THREE.Mesh(irGeom, new THREE.MeshBasicMaterial({ color: 0x330000 }));
        irLed.position.set(0.15, -0.28, -0.92);
        this.group.add(irLed);

        // === LANDING GEAR ===
        const skidMat = carbonFiberMat;
        // Main skid bars
        [-0.45, 0.45].forEach(x => {
            const skidGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6);
            const skid = new THREE.Mesh(skidGeom, skidMat);
            skid.position.set(x, -0.42, 0);
            skid.rotation.x = Math.PI / 2;
            this.group.add(skid);

            // Rubber feet
            [-0.5, 0.5].forEach(z => {
                const footGeom = new THREE.SphereGeometry(0.035, 6, 6);
                const foot = new THREE.Mesh(footGeom, rubberMat);
                foot.position.set(x, -0.45, z);
                foot.scale.y = 0.5;
                this.group.add(foot);
            });

            // Support struts
            [-0.35, 0.35].forEach(z => {
                const strutGeom = new THREE.CylinderGeometry(0.015, 0.018, 0.22, 6);
                const strut = new THREE.Mesh(strutGeom, metalMat);
                strut.position.set(x, -0.32, z);
                this.group.add(strut);
            });
        });

        // === WEAPONS ===
        [-0.65, 0.65].forEach(x => {
            // Weapon mount pylon
            const pylonGeom = new THREE.BoxGeometry(0.06, 0.08, 0.3);
            const pylon = new THREE.Mesh(pylonGeom, darkMetalMat);
            pylon.position.set(x, -0.18, -0.4);
            this.group.add(pylon);

            // Gun barrel
            const barrelGeom = new THREE.CylinderGeometry(0.03, 0.04, 0.65, 8);
            const barrel = new THREE.Mesh(barrelGeom, metalMat);
            barrel.position.set(x, -0.2, -0.6);
            barrel.rotation.x = Math.PI / 2;
            this.group.add(barrel);

            // Muzzle
            const muzzleGeom = new THREE.CylinderGeometry(0.05, 0.035, 0.08, 8);
            const muzzle = new THREE.Mesh(muzzleGeom, darkMetalMat);
            muzzle.position.set(x, -0.2, -0.95);
            muzzle.rotation.x = Math.PI / 2;
            this.group.add(muzzle);

            // Rocket rail (inner)
            const railGeom = new THREE.BoxGeometry(0.04, 0.03, 0.4);
            const rail = new THREE.Mesh(railGeom, new THREE.MeshPhongMaterial({
                color: 0x664422,
                specular: 0x443322,
                shininess: 30
            }));
            rail.position.set(x * 0.8, -0.28, -0.3);
            this.group.add(rail);
        });

        // === ANTENNA ===
        const antennaGeom = new THREE.CylinderGeometry(0.008, 0.012, 0.35, 4);
        const antenna = new THREE.Mesh(antennaGeom, metalMat);
        antenna.position.set(0.35, 0.4, 0.3);
        antenna.rotation.z = -0.15;
        this.group.add(antenna);

        // Antenna tip
        const antTipGeom = new THREE.SphereGeometry(0.02, 6, 6);
        const antTip = new THREE.Mesh(antTipGeom, accentMat);
        antTip.position.set(0.35, 0.58, 0.3);
        this.group.add(antTip);

        // === GPS MODULE ===
        const gpsGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8);
        const gpsMat = new THREE.MeshPhongMaterial({ color: 0x333344, specular: 0x444455, shininess: 60 });
        const gps = new THREE.Mesh(gpsGeom, gpsMat);
        gps.position.set(-0.25, 0.28, 0.4);
        this.group.add(gps);

        // === REAR STROBE ===
        const strobeGeom = new THREE.SphereGeometry(0.03, 6, 6);
        const strobe = new THREE.Mesh(strobeGeom, whiteLedMat);
        strobe.position.set(0, 0.15, 0.95);
        this.group.add(strobe);
        this.strobeLight = strobe;

        // Scale up the whole drone
        this.group.scale.set(1.5, 1.5, 1.5);
    }

    update(dt, input) {
        if (this.health <= 0) return;

        // Cap dt so we stay stable when the page lags
        if (dt > 0.05) dt = 0.05;

        // === Resolve sticks → analog values in [-1, 1] ===
        // pitch: forward (+) / back (-),  roll: right (+) / left (-)
        // throttle: up (+) / down (-),    yaw: turn right (+) / left (-)
        const fromKeys = (pos, neg) => (pos ? 1 : 0) - (neg ? 1 : 0);
        let pitchCmd    = input.pitch    !== undefined ? input.pitch    : fromKeys(input.forward,  input.backward);
        let rollCmd     = input.roll     !== undefined ? input.roll     : fromKeys(input.right,    input.left);
        let throttleCmd = input.throttle !== undefined ? input.throttle : fromKeys(input.up,       input.down);
        let yawCmd      = input.yaw      !== undefined ? input.yaw      : fromKeys(input.rotateRight, input.rotateLeft);

        pitchCmd    = Utils.clamp(pitchCmd,    -1, 1);
        rollCmd     = Utils.clamp(rollCmd,     -1, 1);
        throttleCmd = Utils.clamp(throttleCmd, -1, 1);
        yawCmd      = Utils.clamp(yawCmd,      -1, 1);

        // === Yaw (heading) ===
        if (input.mouseX) {
            this.group.rotation.y -= input.mouseX * 0.002;
            input.mouseX = 0;
        }
        this.group.rotation.y -= yawCmd * this.yawRate * dt;

        // === Body attitude (tilt) — quadcopters move by tilting ===
        // pitch forward → nose down → fly forward; roll right → roll right → strafe right
        const targetPitch = -pitchCmd * this.maxTiltAngle * 0.7;
        const targetRoll  = -rollCmd  * this.maxTiltAngle * 0.7;
        const tiltAlpha = 1 - Math.exp(-this.tiltResponse * dt); // dt-stable lerp
        this.pitchAngle = Utils.lerp(this.pitchAngle, targetPitch, tiltAlpha);
        this.rollAngle  = Utils.lerp(this.rollAngle,  targetRoll,  tiltAlpha);
        this.group.rotation.x = this.pitchAngle;
        this.group.rotation.z = this.rollAngle;

        // === Forces ===
        // Throttle in [0, 1] (a "collective" stick from the throttle command, biased so
        // neutral hovers automatically). Negative throttle → descend faster.
        const collective = Utils.clamp(0.5 + 0.5 * throttleCmd, 0, 1);
        const thrustAccelMag = collective * this.maxThrustAccel; // m/s²

        // Thrust direction = local up rotated by the drone's current body attitude
        // (it only depends on pitch/roll, not yaw, so a tilted drone gets horizontal push).
        const bodyUp = new THREE.Vector3(0, 1, 0);
        const tilt = new THREE.Euler(this.pitchAngle, this.group.rotation.y, this.rollAngle, 'YXZ');
        bodyUp.applyEuler(tilt);

        const accel = bodyUp.multiplyScalar(thrustAccelMag);
        // Gravity
        accel.y -= this.gravity;

        // Aerodynamic drag (separately horizontal vs vertical)
        accel.x -= this.velocity.x * this.horizDrag;
        accel.z -= this.velocity.z * this.horizDrag;
        accel.y -= this.velocity.y * this.vertDrag;

        // Integrate velocity (semi-implicit Euler)
        this.velocity.addScaledVector(accel, dt);

        // Clamp speeds
        const horiz = new THREE.Vector2(this.velocity.x, this.velocity.z);
        if (horiz.length() > this.maxHorizSpeed) {
            horiz.setLength(this.maxHorizSpeed);
            this.velocity.x = horiz.x;
            this.velocity.z = horiz.y;
        }
        if (Math.abs(this.velocity.y) > this.maxVertSpeed) {
            this.velocity.y = Math.sign(this.velocity.y) * this.maxVertSpeed;
        }

        // Integrate position (velocity is already in m/s, so no fudge factor)
        this.group.position.addScaledVector(this.velocity, dt);

        // Ground collision (soft floor — keep a slight rebound damping)
        if (this.group.position.y < 1.5) {
            this.group.position.y = 1.5;
            if (this.velocity.y < 0) this.velocity.y = 0;
        }
        // Ceiling
        if (this.group.position.y > 200) {
            this.group.position.y = 200;
            if (this.velocity.y > 0) this.velocity.y = 0;
        }

        // Speed in km/h for HUD
        this.speed = this.velocity.length() * 3.6;

        // Propeller animation — RPM scales with collective + maneuver intensity
        const maneuver = Math.abs(pitchCmd) + Math.abs(rollCmd) + Math.abs(yawCmd);
        const isMoving = collective > 0.05 || maneuver > 0.05;
        this.targetRotorSpeed = 30 + collective * 50 + maneuver * 12;
        const rotorAlpha = 1 - Math.exp(-3 * dt);
        this.rotorSpeed = Utils.lerp(this.rotorSpeed, this.targetRotorSpeed, rotorAlpha);

        this.propellers.forEach(prop => {
            prop.group.rotation.y += this.rotorSpeed * dt * prop.direction;
            prop.disc.material.opacity = Utils.clamp(this.rotorSpeed / 80, 0, 0.15);
        });

        // LED blink
        const blinkRate = Math.sin(Date.now() * 0.005);
        this.lights.forEach((led, i) => {
            led.visible = i < 2 ? blinkRate > 0 : blinkRate < 0;
        });

        // Strobe flash
        if (this.strobeLight) {
            this.strobeLight.visible = Math.sin(Date.now() * 0.01) > 0.9;
        }

        // Fuel consumption
        if (isMoving) {
            this.fuel = Math.max(0, this.fuel - 0.5 * dt);
        }
    }

    getFPVCameraPosition() {
        const offset = this.fpvCameraOffset.clone().applyQuaternion(this.group.quaternion);
        return this.group.position.clone().add(offset);
    }

    getFPVCameraTarget() {
        const lookDir = new THREE.Vector3(0, -0.1, -5).applyQuaternion(this.group.quaternion);
        return this.group.position.clone().add(lookDir);
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0;
    }

    reset() {
        this.health = this.maxHealth;
        this.fuel = this.maxFuel;
        this.rockets = this.maxRockets;
        this.velocity.set(0, 0, 0);
        this.group.position.set(0, 15, 0);
        this.group.rotation.set(0, 0, 0);
        this.speed = 0;
        this.pitchAngle = 0;
        this.rollAngle = 0;
    }

    getPosition() {
        return this.group.position.clone();
    }

    getForward() {
        return new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
    }

    dispose() {
        this.scene.remove(this.group);
    }
}
