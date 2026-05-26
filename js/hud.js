/* HUD Manager */

class HUD {
    constructor() {
        this.scoreEl = document.getElementById('score-value');
        this.targetsEl = document.getElementById('targets-value');
        this.timeEl = document.getElementById('time-value');
        this.healthBar = document.getElementById('health-bar');
        this.healthValue = document.getElementById('health-value');
        this.fuelBar = document.getElementById('fuel-bar');
        this.fuelValue = document.getElementById('fuel-value');
        this.altitudeEl = document.getElementById('altitude-value');
        this.speedEl = document.getElementById('speed-value');
        this.rocketsEl = document.getElementById('rockets-value');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.score = 0;
        this.gameTime = 0;
        this.killFeed = [];

        this.createKillFeed();
    }

    createKillFeed() {
        let feedEl = document.getElementById('kill-feed');
        if (!feedEl) {
            feedEl = document.createElement('div');
            feedEl.id = 'kill-feed';
            document.getElementById('game-screen').appendChild(feedEl);
        }
        this.killFeedEl = feedEl;
    }

    update(drone, targetManager, timeLeft, isFreeMode) {
        // Score
        this.scoreEl.textContent = this.score;

        // Targets
        if (targetManager && !isFreeMode) {
            const destroyed = targetManager.getDestroyedCount();
            const total = targetManager.getTotalCount();
            this.targetsEl.textContent = destroyed + '/' + total;
        } else {
            this.targetsEl.textContent = '--';
        }

        // Time
        if (!isFreeMode && timeLeft !== undefined) {
            this.timeEl.textContent = Utils.formatTime(Math.max(0, timeLeft));
            if (timeLeft < 30) {
                this.timeEl.style.color = '#ff4444';
            } else {
                this.timeEl.style.color = '#fff';
            }
        } else {
            this.timeEl.textContent = Utils.formatTime(this.gameTime);
            this.timeEl.style.color = '#fff';
        }

        // Health
        const healthPct = (drone.health / drone.maxHealth) * 100;
        this.healthBar.style.width = healthPct + '%';
        this.healthValue.textContent = Math.round(drone.health);
        if (healthPct < 30) {
            this.healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
        } else {
            this.healthBar.style.background = 'linear-gradient(90deg, #ff4444, #00ff88)';
        }

        // Fuel
        const fuelPct = (drone.fuel / drone.maxFuel) * 100;
        this.fuelBar.style.width = fuelPct + '%';
        this.fuelValue.textContent = Math.round(drone.fuel);

        // Altitude & Speed
        this.altitudeEl.textContent = Math.round(drone.getPosition().y) + 'm';
        this.speedEl.textContent = Math.round(drone.speed) + ' km/h';

        // Rockets
        this.rocketsEl.textContent = drone.rockets;

        // Update minimap
        this.updateMinimap(drone, targetManager);

        // Clean kill feed
        const now = Date.now();
        this.killFeed = this.killFeed.filter(k => now - k.time < 4000);
    }

    updateMinimap(drone, targetManager) {
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;
        const scale = 0.15;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
        ctx.beginPath();
        ctx.arc(cx, cy, cx, 0, Math.PI * 2);
        ctx.fill();

        // Grid
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.1)';
        ctx.lineWidth = 0.5;
        for (let i = -300; i <= 300; i += 100) {
            const screenX = cx + i * scale;
            const screenY = cy + i * scale;
            if (screenX > 0 && screenX < w) {
                ctx.beginPath();
                ctx.moveTo(screenX, 0);
                ctx.lineTo(screenX, h);
                ctx.stroke();
            }
            if (screenY > 0 && screenY < h) {
                ctx.beginPath();
                ctx.moveTo(0, screenY);
                ctx.lineTo(w, screenY);
                ctx.stroke();
            }
        }

        const dronePos = drone.getPosition();

        // Targets
        if (targetManager) {
            targetManager.targets.forEach(target => {
                const relX = (target.getPosition().x - dronePos.x) * scale + cx;
                const relZ = (target.getPosition().z - dronePos.z) * scale + cy;

                if (relX > 5 && relX < w - 5 && relZ > 5 && relZ < h - 5) {
                    ctx.fillStyle = target.alive ? '#ff4444' : '#444444';
                    ctx.beginPath();
                    ctx.arc(relX, relZ, target.alive ? 3 : 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Drone (center, with direction)
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        const forward = drone.getForward();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + forward.x * 12, cy + forward.z * 12);
        ctx.stroke();

        // Border
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    addScore(points) {
        this.score += points;
    }

    addKill(message) {
        const entry = { text: message, time: Date.now() };
        this.killFeed.push(entry);

        const msgEl = document.createElement('div');
        msgEl.className = 'kill-msg';
        msgEl.textContent = message;
        this.killFeedEl.appendChild(msgEl);

        setTimeout(() => {
            if (msgEl.parentNode) {
                msgEl.remove();
            }
        }, 4000);
    }

    showDamageFlash() {
        const flash = document.createElement('div');
        flash.className = 'damage-flash';
        document.getElementById('game-screen').appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    showNotification(text, duration) {
        duration = duration || 2000;
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = text;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'notifPop 0.3s ease-in reverse';
            setTimeout(() => notif.remove(), 300);
        }, duration);
    }

    reset() {
        this.score = 0;
        this.gameTime = 0;
        this.killFeed = [];
        if (this.killFeedEl) {
            this.killFeedEl.innerHTML = '';
        }
    }

    setVisible(visible) {
        document.getElementById('hud').style.display = visible ? 'block' : 'none';
    }
}
