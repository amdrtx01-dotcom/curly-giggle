/* Arcade-style flight model for fighter jets.
 * Body axes: forward = -Z, up = +Y, right = +X. */

class FlightModel {
    constructor(plane) {
        this.plane = plane;
        this.speed = 110;          // m/s
        this.minSpeed = 35;
        this.maxSpeed = 260;       // ~936 km/h
        this.abBonus  = 90;        // afterburner adds up to this much
        this.throttle = 0.75;
        this.afterburner = false;
        this.stallFactor = 0;
        this.gLoad = 1.0;
        this.input = { pitch: 0, roll: 0, yaw: 0 };
        this.maneuverOverride = null;
        this._prevForward = new THREE.Vector3(0, 0, -1);
    }

    setManeuverOverride(o) {
        this.maneuverOverride = o;
    }
    clearManeuverOverride() {
        this.maneuverOverride = null;
    }

    update(dt) {
        const ud = this.plane.userData || {};
        const stats = ud.stats || { thrust: 1, maneuverability: 1, mass: 1 };

        // Determine effective inputs
        let pIn, rIn, yIn, thr, ab;
        if (this.maneuverOverride) {
            const m = this.maneuverOverride;
            pIn = m.pitch || 0;
            rIn = m.roll  || 0;
            yIn = m.yaw   || 0;
            thr = (m.throttle !== undefined) ? m.throttle : this.throttle;
            ab  = m.afterburner || false;
        } else {
            pIn = this.input.pitch;
            rIn = this.input.roll;
            yIn = this.input.yaw;
            thr = this.throttle;
            ab  = this.afterburner;
        }

        // Compute body axes
        const q = this.plane.quaternion;
        const right   = new THREE.Vector3(1, 0,  0).applyQuaternion(q);
        const up      = new THREE.Vector3(0, 1,  0).applyQuaternion(q);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);

        // Effective rotation rates, scale with speed (low-speed planes feel sluggish)
        const speedFactor = THREE.MathUtils.clamp(this.speed / 110, 0.55, 1.45);
        const stallSafe = 1 - this.stallFactor * 0.7;
        const baseRoll  = 3.0 * stats.maneuverability * speedFactor * stallSafe;
        const basePitch = 1.5 * stats.maneuverability * speedFactor * stallSafe;
        const baseYaw   = 0.8 * stats.maneuverability * speedFactor * stallSafe;

        const rollAng  = -rIn * baseRoll  * dt; // negative so D rolls right wing down
        const pitchAng =  pIn * basePitch * dt; // positive so W pitches nose up
        const yawAng   = -yIn * baseYaw   * dt; // negative so E yaws right

        const qRoll  = new THREE.Quaternion().setFromAxisAngle(forward, rollAng);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(right,   pitchAng);
        const qYaw   = new THREE.Quaternion().setFromAxisAngle(up,      yawAng);

        // Apply rotations in world space via premultiply order
        this.plane.quaternion.premultiply(qRoll).premultiply(qPitch).premultiply(qYaw).normalize();

        // Update forward after rotation for movement
        const newForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.plane.quaternion);

        // G-load estimation: angle between previous and new forward
        const dotForward = THREE.MathUtils.clamp(this._prevForward.dot(newForward), -1, 1);
        const turnAngle = Math.acos(dotForward);
        this.gLoad = 1.0 + (turnAngle / Math.max(dt, 0.0001)) * (this.speed / 9.81) * 0.18;
        this.gLoad = THREE.MathUtils.clamp(this.gLoad, 0.1, 11);
        this._prevForward.copy(newForward);

        // Thrust → target speed
        const baseSpeedFromThr = this.minSpeed + thr * (this.maxSpeed - this.minSpeed - this.abBonus);
        let targetSpeed = baseSpeedFromThr;
        if (ab) targetSpeed += this.abBonus;
        targetSpeed *= stats.thrust;

        // Gravity & climb cost: pitch (newForward.y) influences speed
        const climb = newForward.y; // +1 straight up, -1 straight down
        const gravityEffect = climb * 18; // m/s pull per second when going vertical
        const accel = (targetSpeed - this.speed) * (1.8 * dt) - gravityEffect * dt;
        this.speed += accel;

        // Drag at very high AoA (rough proxy: how much velocity differs from forward)
        this.speed = Math.max(0, this.speed);

        // Stall detection
        this.stallFactor = this.speed < this.minSpeed * 1.4
            ? THREE.MathUtils.clamp(1 - (this.speed - this.minSpeed * 0.6) / (this.minSpeed * 0.8), 0, 1)
            : 0;

        // Move plane along forward * speed
        this.plane.position.addScaledVector(newForward, this.speed * dt);

        // Crude ground avoidance: if too low, push up
        if (this.plane.position.y < 12) {
            this.plane.position.y = 12;
            // Simulate bounce by leveling pitch a bit
        }
    }

    get state() {
        const q = this.plane.quaternion;
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        return {
            speedKmh: this.speed * 3.6,
            altitude: this.plane.position.y,
            throttle: this.throttle,
            afterburner: this.afterburner,
            pitchDeg:  THREE.MathUtils.radToDeg(e.x),
            yawDeg:    THREE.MathUtils.radToDeg(e.y),
            rollDeg:   THREE.MathUtils.radToDeg(e.z),
            gLoad: this.gLoad,
            stalling: this.stallFactor > 0.5,
        };
    }
}
