/* HUD: writes flight state into the DOM each frame. */

class PlanesHUD {
    constructor() {
        this.el = {
            plane:    document.getElementById('hud-plane'),
            speed:    document.getElementById('hud-speed'),
            alt:      document.getElementById('hud-alt'),
            throttle: document.getElementById('hud-throttle'),
            ab:       document.getElementById('hud-ab'),
            abState:  document.getElementById('hud-ab-state'),
            roll:     document.getElementById('hud-roll'),
            pitch:    document.getElementById('hud-pitch'),
            heading:  document.getElementById('hud-heading'),
            g:        document.getElementById('hud-g'),
            banner:   document.getElementById('maneuver-banner'),
            bannerName: document.getElementById('banner-name'),
            chips:    document.querySelectorAll('.plane-chip'),
            stall:    document.getElementById('stall-warning'),
        };
        this._bannerTimer = 0;
    }

    setPlaneName(name) {
        if (this.el.plane) this.el.plane.textContent = name;
    }

    setActiveChip(idx) {
        this.el.chips.forEach((c, i) => c.classList.toggle('active', i === idx));
    }

    showManeuver(label) {
        if (!label) {
            this.el.banner.classList.add('hidden');
            return;
        }
        this.el.bannerName.textContent = label;
        this.el.banner.classList.remove('hidden');
        this._bannerTimer = 0;
    }

    update(dt, flight) {
        const s = flight.state;
        this.el.speed.textContent    = Math.round(s.speedKmh);
        this.el.alt.textContent      = Math.round(Math.max(0, s.altitude));
        this.el.throttle.textContent = Math.round(flight.throttle * 100);
        this.el.abState.textContent  = (flight.afterburner || (flight.maneuverOverride && flight.maneuverOverride.afterburner)) ? 'ВКЛ' : 'ВЫКЛ';
        this.el.ab.classList.toggle('active', flight.afterburner || (flight.maneuverOverride && flight.maneuverOverride.afterburner));

        this.el.roll.textContent     = `${Math.round(s.rollDeg)}\u00B0`;
        this.el.pitch.textContent    = `${Math.round(s.pitchDeg)}\u00B0`;
        const heading = ((Math.round(s.yawDeg) % 360) + 360) % 360;
        this.el.heading.textContent  = `${heading}\u00B0`;
        this.el.g.textContent        = s.gLoad.toFixed(1);

        this.el.stall.classList.toggle('hidden', !s.stalling);

        // Auto-hide banner after a while
        if (!this.el.banner.classList.contains('hidden')) {
            this._bannerTimer += dt;
            if (this._bannerTimer > 1.6) this.el.banner.classList.add('hidden');
        }
    }
}
