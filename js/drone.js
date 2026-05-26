/* Drone 3D Model & Physics */

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

        this.propellers = [];
        this.lights = [];

        this.buildModel();
        scene.add(this.group);

        this.group.position.set(0, 15, 0);
    }

    buildModel() {
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            specular: 0x444444,
            shininess: 80
        });
        const accentMat = new THREE.MeshPhongMaterial({
            color: 0x00b4ff,
            emissive: 0x003366,
            specular: 0x88ccff,
            shininess: 100
        });
        const darkMat = new THREE.MeshPhongMaterial({
            color: 0x0a0a15,
            specular: 0x222222,
            shininess: 60
        });
        const redMat = new THREE.MeshPhongMaterial({
            color: 0xff2200,
            emissive: 0x440000
        });

        // Main body - sleek central hull
        const bodyGeom = new THREE.BoxGeometry(1.2, 0.4, 1.8);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        this.group.add(body);

        // Top canopy
        const canopyGeom = new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopy = new THREE.Mesh(canopyGeom, accentMat);
        canopy.position.set(0, 0.2, -0.1);
        canopy.scale.set(1, 0.5, 1.2);
        this.group.add(canopy);

        // Bottom plate
        const platGeom = new THREE.BoxGeometry(1.0, 0.1, 1.4);
        const plate = new THREE.Mesh(platGeom, darkMat);
        plate.position.y = -0.25;
        this.group.add(plate);

        // Arms
        const armPositions = [
            { x: 1.2, z: 1.0 },
            { x: -1.2, z: 1.0 },
            { x: 1.2, z: -1.0 },
            { x: -1.2, z: -1.0 }
        ];

        armPositions.forEach((pos, i) => {
            // Arm
            const armGeom = new THREE.BoxGeometry(1.8, 0.15, 0.15);
            const arm = new THREE.Mesh(armGeom, bodyMat);
            arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
            arm.rotation.y = Math.atan2(pos.x, pos.z);
            this.group.add(arm);

            // Motor housing
            const motorGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8);
            const motor = new THREE.Mesh(motorGeom, darkMat);
            motor.position.set(pos.x, 0.15, pos.z);
            this.group.add(motor);

            // Propeller
            const propGroup = new THREE.Group();
            propGroup.position.set(pos.x, 0.35, pos.z);

            const bladeGeom = new THREE.BoxGeometry(1.4, 0.02, 0.12);
            const blade1 = new THREE.Mesh(bladeGeom, accentMat);
            propGroup.add(blade1);

            const blade2 = new THREE.Mesh(bladeGeom, accentMat);
            blade2.rotation.y = Math.PI / 2;
            propGroup.add(blade2);

            // Prop disc (visible when spinning fast)
            const discGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.01, 16);
            const discMat = new THREE.MeshPhongMaterial({
                color: 0x00b4ff,
                transparent: true,
                opacity: 0.0
            });
            const disc = new THREE.Mesh(discGeom, discMat);
            propGroup.add(disc);

            this.group.add(propGroup);
            this.propellers.push({ group: propGroup, disc: disc, direction: i % 2 === 0 ? 1 : -1 });

            // LED lights on arms
            const ledGeom = new THREE.SphereGeometry(0.06, 6, 6);
            const ledMat = i < 2
                ? new THREE.MeshBasicMaterial({ color: 0x00ff44 })
                : new THREE.MeshBasicMaterial({ color: 0xff2200 });
            const led = new THREE.Mesh(ledGeom, ledMat);
            led.position.set(pos.x * 0.7, -0.1, pos.z * 0.7);
            this.group.add(led);
            this.lights.push(led);
        });

        // Camera/sensor pod
        const camGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const camMat = new THREE.MeshPhongMaterial({ color: 0x111111, specular: 0x888888, shininess: 120 });
        const cam = new THREE.Mesh(camGeom, camMat);
        cam.position.set(0, -0.3, -0.7);
        this.group.add(cam);

        // Camera lens
        const lensGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.05, 8);
        const lensMat = new THREE.MeshPhongMaterial({ color: 0x001133, specular: 0x00b4ff, shininess: 200 });
        const lens = new THREE.Mesh(lensGeom, lensMat);
        lens.position.set(0, -0.3, -0.85);
        lens.rotation.x = Math.PI / 2;
        this.group.add(lens);

        // Landing skids
        const skidGeom = new THREE.BoxGeometry(0.05, 0.05, 1.2);
        const skid1 = new THREE.Mesh(skidGeom, darkMat);
        skid1.position.set(0.4, -0.35, 0);
        this.group.add(skid1);

        const skid2 = new THREE.Mesh(skidGeom, darkMat);
        skid2.position.set(-0.4, -0.35, 0);
        this.group.add(skid2);

        // Skid legs
        [0.4, -0.4].forEach(x => {
            [0.3, -0.3].forEach(z => {
                const legGeom = new THREE.BoxGeometry(0.04, 0.15, 0.04);
                const leg = new THREE.Mesh(legGeom, darkMat);
                leg.position.set(x, -0.28, z);
                this.group.add(leg);
            });
        });

        // Weapon mounts
        const weapGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
        const weap1 = new THREE.Mesh(weapGeom, redMat);
        weap1.position.set(0.6, -0.2, -0.5);
        weap1.rotation.x = Math.PI / 2;
        this.group.add(weap1);

        const weap2 = new THREE.Mesh(weapGeom, redMat);
        weap2.position.set(-0.6, -0.2, -0.5);
        weap2.rotation.x = Math.PI / 2;
        this.group.add(weap2);

        // Scale up the whole drone
        this.group.scale.set(1.5, 1.5, 1.5);
    }

    update(dt, input) {
        if (this.health <= 0) return;

        // Thrust
        const thrust = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);

        if (input.forward) thrust.add(forward.clone().multiplyScalar(this.thrustPower * dt));
        if (input.backward) thrust.add(forward.clone().multiplyScalar(-this.thrustPower * 0.6 * dt));
        if (input.left) thrust.add(right.clone().multiplyScalar(-this.thrustPower * 0.7 * dt));
        if (input.right) thrust.add(right.clone().multiplyScalar(this.thrustPower * 0.7 * dt));

        // Vertical
        if (input.up) thrust.y += this.liftPower * dt;
        if (input.down) thrust.y -= this.liftPower * 0.8 * dt;

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

        // Rotation
        if (input.rotateLeft) this.group.rotation.y += this.turnSpeed * dt;
        if (input.rotateRight) this.group.rotation.y -= this.turnSpeed * dt;

        // Mouse-based yaw
        if (input.mouseX) {
            this.group.rotation.y -= input.mouseX * 0.002;
            input.mouseX = 0;
        }

        // Tilt based on movement
        const targetTiltX = (input.forward ? -0.15 : 0) + (input.backward ? 0.1 : 0);
        const targetTiltZ = (input.left ? 0.15 : 0) + (input.right ? -0.15 : 0);

        this.group.rotation.x = Utils.lerp(this.group.rotation.x, targetTiltX, 5 * dt);
        this.group.rotation.z = Utils.lerp(this.group.rotation.z, targetTiltZ, 5 * dt);

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

        // Fuel consumption
        if (isMoving) {
            this.fuel = Math.max(0, this.fuel - 0.5 * dt);
        }
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
