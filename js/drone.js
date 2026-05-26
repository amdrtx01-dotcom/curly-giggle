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
        this.maxSpeed = 80;
        this.thrustPower = 35;
        this.liftPower = 25;
        this.turnSpeed = 2.0;
        this.drag = 0.96;
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

        // Thrust
        const thrust = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);

        // Use analog values if available, fall back to boolean
        const pitchAmount = input.pitch !== undefined ? Math.abs(input.pitch) : (input.forward || input.backward ? 1 : 0);
        const rollAmount = input.roll !== undefined ? Math.abs(input.roll) : (input.left || input.right ? 1 : 0);

        if (input.forward) thrust.add(forward.clone().multiplyScalar(this.thrustPower * pitchAmount * dt));
        if (input.backward) thrust.add(forward.clone().multiplyScalar(-this.thrustPower * 0.6 * pitchAmount * dt));
        if (input.left) thrust.add(right.clone().multiplyScalar(-this.thrustPower * 0.7 * rollAmount * dt));
        if (input.right) thrust.add(right.clone().multiplyScalar(this.thrustPower * 0.7 * rollAmount * dt));

        // Vertical
        const throttleAmount = input.throttle !== undefined ? Math.abs(input.throttle) : 1;
        if (input.up) thrust.y += this.liftPower * throttleAmount * dt;
        if (input.down) thrust.y -= this.liftPower * 0.8 * throttleAmount * dt;

        // Gravity
        thrust.y -= 9.8 * dt;

        // Hover compensation when no vertical input
        if (!input.up && !input.down && this.group.position.y > 2) {
            thrust.y += 9.0 * dt;
        }

        this.velocity.add(thrust);
        this.velocity.multiplyScalar(this.drag);

        // Clamp speed
        const horizSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        if (horizSpeed > this.maxSpeed * dt) {
            const factor = (this.maxSpeed * dt) / horizSpeed;
            this.velocity.x *= factor;
            this.velocity.z *= factor;
        }

        this.group.position.add(this.velocity.clone().multiplyScalar(dt * 60));

        // Ground collision
        if (this.group.position.y < 1.5) {
            this.group.position.y = 1.5;
            this.velocity.y = Math.max(0, this.velocity.y);
        }

        // Ceiling
        if (this.group.position.y > 200) {
            this.group.position.y = 200;
            this.velocity.y = Math.min(0, this.velocity.y);
        }

        // Rotation / Yaw
        const yawAmount = input.yaw !== undefined ? input.yaw : 0;
        if (input.rotateLeft) this.group.rotation.y += this.turnSpeed * dt;
        if (input.rotateRight) this.group.rotation.y -= this.turnSpeed * dt;

        // Mouse-based yaw
        if (input.mouseX) {
            this.group.rotation.y -= input.mouseX * 0.002;
            input.mouseX = 0;
        }

        // Tilt based on movement — more realistic FPV feel
        const targetPitch = input.pitch !== undefined ?
            -input.pitch * 0.2 :
            (input.forward ? -0.15 : 0) + (input.backward ? 0.1 : 0);

        const targetRoll = input.roll !== undefined ?
            -input.roll * 0.2 :
            (input.left ? 0.15 : 0) + (input.right ? -0.15 : 0);

        this.pitchAngle = Utils.lerp(this.pitchAngle, targetPitch, 5 * dt);
        this.rollAngle = Utils.lerp(this.rollAngle, targetRoll, 5 * dt);

        this.group.rotation.x = this.pitchAngle;
        this.group.rotation.z = this.rollAngle;

        // Speed calculation
        this.speed = this.velocity.length() * 60 * 3.6;

        // Propeller animation
        const isMoving = input.forward || input.backward || input.left || input.right || input.up || input.down;
        this.targetRotorSpeed = isMoving ? 60 : 30;
        this.rotorSpeed = Utils.lerp(this.rotorSpeed, this.targetRotorSpeed, 3 * dt);

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
