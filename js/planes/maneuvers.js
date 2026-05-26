/* Scripted aerobatic maneuvers — Pugachev's Cobra, Nesterov's Loop,
 * Barrel Roll, Immelmann, Frolov's Chakra, and a Bell (tail-slide).
 * A maneuver is a list of timed phases; each phase pushes synthetic
 * inputs into FlightModel.maneuverOverride so the model handles the rest. */

class ManeuverEngine {
    constructor(flight, onChange) {
        this.flight = flight;
        this.onChange = onChange || (() => {});
        this.queue = null;
        this.phaseIdx = 0;
        this.phaseElapsed = 0;
        this.elapsed = 0;
        this.activeName = null;
    }

    isBusy() { return !!this.queue; }

    start(name) {
        if (this.queue) return false;
        const recipe = ManeuverEngine.RECIPES[name];
        if (!recipe) return false;
        this.queue = recipe.phases;
        this.activeName = recipe.label;
        this.phaseIdx = 0;
        this.phaseElapsed = 0;
        this.elapsed = 0;
        this.onChange(this.activeName, 'start');
        return true;
    }

    stop() {
        this.queue = null;
        this.phaseIdx = 0;
        this.phaseElapsed = 0;
        this.activeName = null;
        this.flight.clearManeuverOverride();
        this.onChange(null, 'end');
    }

    update(dt) {
        if (!this.queue) return;
        const phase = this.queue[this.phaseIdx];
        this.phaseElapsed += dt;
        this.elapsed += dt;
        // Allow phase to define its own input via t in [0..1]
        const t = Math.min(1, this.phaseElapsed / phase.dur);
        const overlay = phase.input(t);
        this.flight.setManeuverOverride(overlay);

        if (this.phaseElapsed >= phase.dur) {
            this.phaseIdx++;
            this.phaseElapsed = 0;
            if (this.phaseIdx >= this.queue.length) {
                this.stop();
            }
        }
    }
}

ManeuverEngine.RECIPES = {
    cobra: {
        label: 'КОБРА ПУГАЧЁВА',
        phases: [
            // Pull nose way up, kill thrust briefly
            { dur: 0.55, input: t => ({ pitch:  1.0, roll: 0, yaw: 0, throttle: 0.2, afterburner: false }) },
            // Hold the high alpha
            { dur: 0.45, input: t => ({ pitch:  0.2, roll: 0, yaw: 0, throttle: 0.1, afterburner: false }) },
            // Push nose back down, full afterburner
            { dur: 0.65, input: t => ({ pitch: -0.95, roll: 0, yaw: 0, throttle: 1.0, afterburner: true  }) },
            // Settle level
            { dur: 0.35, input: t => ({ pitch: -0.3, roll: 0, yaw: 0, throttle: 0.9, afterburner: false }) },
        ],
    },
    loop: {
        label: 'ПЕТЛЯ НЕСТЕРОВА',
        phases: [
            { dur: 0.4, input: t => ({ pitch: 0.4, roll: 0, yaw: 0, throttle: 1.0, afterburner: true }) },
            // Smooth full loop ~3s at constant pitch
            { dur: 3.2, input: t => ({ pitch: 0.85, roll: 0, yaw: 0, throttle: 1.0, afterburner: true }) },
            { dur: 0.4, input: t => ({ pitch: 0.3, roll: 0, yaw: 0, throttle: 0.9, afterburner: false }) },
        ],
    },
    barrelRoll: {
        label: 'БОЧКА',
        phases: [
            { dur: 0.2, input: t => ({ pitch: 0.1, roll: 1.0, yaw: 0, throttle: 0.95 }) },
            { dur: 1.3, input: t => ({ pitch: 0.15, roll: 1.0, yaw: 0, throttle: 1.0, afterburner: true }) },
            { dur: 0.3, input: t => ({ pitch: 0.05, roll: 0.4, yaw: 0, throttle: 0.85 }) },
        ],
    },
    immelmann: {
        label: 'ИММЕЛЬМАН',
        phases: [
            // Pull half-loop up
            { dur: 1.7, input: t => ({ pitch: 0.85, roll: 0, yaw: 0, throttle: 1.0, afterburner: true }) },
            // Brief level out (inverted)
            { dur: 0.25, input: t => ({ pitch: 0.0, roll: 0, yaw: 0, throttle: 0.9 }) },
            // Half roll to upright
            { dur: 0.9, input: t => ({ pitch: 0.05, roll: 1.0, yaw: 0, throttle: 0.9 }) },
            { dur: 0.25, input: t => ({ pitch: 0.0, roll: 0, yaw: 0, throttle: 0.85 }) },
        ],
    },
    chakra: {
        label: 'ЧАКРА ФРОЛОВА',
        phases: [
            // A near-stationary 360° flip — pitch hard while throttle low to tighten radius
            { dur: 0.4, input: t => ({ pitch:  1.0, roll: 0, yaw: 0, throttle: 0.1, afterburner: false }) },
            { dur: 0.9, input: t => ({ pitch:  1.0, roll: 0, yaw: 0, throttle: 0.2, afterburner: false }) },
            { dur: 0.8, input: t => ({ pitch:  1.0, roll: 0, yaw: 0, throttle: 0.4, afterburner: false }) },
            { dur: 0.5, input: t => ({ pitch:  0.7, roll: 0, yaw: 0, throttle: 0.9, afterburner: true }) },
            { dur: 0.3, input: t => ({ pitch:  0.0, roll: 0, yaw: 0, throttle: 0.9 }) },
        ],
    },
    bell: {
        label: 'КОЛОКОЛ',
        phases: [
            // Vertical climb
            { dur: 0.8, input: t => ({ pitch: 1.0, roll: 0, yaw: 0, throttle: 1.0, afterburner: true }) },
            // Hold pointing up while speed bleeds
            { dur: 1.0, input: t => ({ pitch: 0.0, roll: 0, yaw: 0, throttle: 0.0, afterburner: false }) },
            // Slowly pitch over backward (the "ringing" of the bell)
            { dur: 1.2, input: t => ({ pitch: -0.45, roll: 0, yaw: 0, throttle: 0.1, afterburner: false }) },
            // Recover with afterburner
            { dur: 0.8, input: t => ({ pitch: -0.2, roll: 0, yaw: 0, throttle: 1.0, afterburner: true }) },
        ],
    },
};
