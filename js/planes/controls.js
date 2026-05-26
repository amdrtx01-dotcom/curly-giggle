/* Keyboard input → FlightModel inputs, plane swap, maneuver triggers, camera mode toggle. */

class PlanesControls {
    constructor(opts) {
        this.flight = opts.flight;
        this.maneuvers = opts.maneuvers;
        this.onSwitchPlane = opts.onSwitchPlane || (() => {});
        this.onToggleCamera = opts.onToggleCamera || (() => {});
        this.keys = {};

        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup',   (e) => this._onKeyUp(e));
        window.addEventListener('blur', () => { this.keys = {}; });
    }

    setFlight(flight) { this.flight = flight; }
    setManeuvers(m)   { this.maneuvers = m; }

    _onKeyDown(e) {
        const k = e.key.toLowerCase();
        this.keys[k] = true;

        // Single-press actions
        if (k === '1') this.onSwitchPlane(0);
        if (k === '2') this.onSwitchPlane(1);
        if (k === '3') this.onSwitchPlane(2);
        if (k === '4') this.onSwitchPlane(3);
        if (k === '5') this.onSwitchPlane(4);
        if (k === 'v') this.onToggleCamera();

        // Maneuver triggers
        if (!this.maneuvers.isBusy()) {
            if (k === 'c') this.maneuvers.start('cobra');
            if (k === 'l') this.maneuvers.start('loop');
            if (k === 'b') this.maneuvers.start('barrelRoll');
            if (k === 'i') this.maneuvers.start('immelmann');
            if (k === 'h') this.maneuvers.start('chakra');
            if (k === 'k') this.maneuvers.start('bell');
        }

        // Prevent page scroll on space etc.
        if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    }

    _onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    update(dt) {
        const K = this.keys;
        // Pitch: W = up (+), S = down (-)
        const pitch = (K['w'] || K['arrowup'] ? 1 : 0) - (K['s'] || K['arrowdown'] ? 1 : 0);
        // Roll:  D = right (+), A = left (-)
        const roll  = (K['d'] || K['arrowright'] ? 1 : 0) - (K['a'] || K['arrowleft'] ? 1 : 0);
        // Yaw:   E = right (+), Q = left (-)
        const yaw   = (K['e'] ? 1 : 0) - (K['q'] ? 1 : 0);

        this.flight.input.pitch = pitch;
        this.flight.input.roll  = roll;
        this.flight.input.yaw   = yaw;

        // Throttle: Shift up, Ctrl down
        if (K['shift']) this.flight.throttle = Math.min(1, this.flight.throttle + 0.6 * dt);
        if (K['control']) this.flight.throttle = Math.max(0, this.flight.throttle - 0.6 * dt);

        // Afterburner: F held
        this.flight.afterburner = !!K['f'];
    }
}
