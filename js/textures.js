/* Procedural Canvas Textures
 *
 * Generates high-quality runtime textures using <canvas> so the game ships
 * with no external image files but still looks rich.
 *
 * All textures are cached on first request.
 */

const Textures = (function () {
    const cache = {};

    function _canvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    function _toTexture(canvas, repeat) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        if (repeat) tex.repeat.set(repeat.x || 1, repeat.y || 1);
        tex.needsUpdate = true;
        return tex;
    }

    function _noise(ctx, w, h, intensity) {
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * intensity;
            d[i] = Math.max(0, Math.min(255, d[i] + n));
            d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
            d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
        }
        ctx.putImageData(img, 0, 0);
    }

    /* ---------- Building (windows) ---------- */
    function buildingFacade(baseColor, accentColor, floors, windowsPerFloor) {
        baseColor = baseColor || '#3a4a5a';
        accentColor = accentColor || '#1a2a3a';
        floors = floors || 12;
        windowsPerFloor = windowsPerFloor || 8;

        const W = 512, H = 512;
        const c = _canvas(W, H);
        const ctx = c.getContext('2d');

        // Concrete base
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, accentColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        _noise(ctx, W, H, 40);

        // Floor separators
        const floorH = H / floors;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1;
        for (let i = 1; i < floors; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * floorH);
            ctx.lineTo(W, i * floorH);
            ctx.stroke();
        }

        // Windows
        const winW = W / windowsPerFloor;
        const winH = floorH * 0.6;
        for (let f = 0; f < floors; f++) {
            for (let w = 0; w < windowsPerFloor; w++) {
                const x = w * winW + winW * 0.15;
                const y = f * floorH + (floorH - winH) * 0.5;
                const ww = winW * 0.7;

                // Lit window?
                const lit = Math.random() < 0.55;
                const litColor = lit ? [
                    'rgba(255,220,140,0.95)',
                    'rgba(255,240,170,0.95)',
                    'rgba(180,220,255,0.9)',
                    'rgba(255,200,120,0.95)'
                ][Math.floor(Math.random() * 4)] : 'rgba(20,30,40,0.95)';

                ctx.fillStyle = litColor;
                ctx.fillRect(x, y, ww, winH);

                // Highlight reflection
                if (lit) {
                    const lg = ctx.createLinearGradient(x, y, x, y + winH);
                    lg.addColorStop(0, 'rgba(255,255,255,0.35)');
                    lg.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = lg;
                    ctx.fillRect(x, y, ww, winH);
                }

                // Window frame
                ctx.strokeStyle = 'rgba(20,20,20,0.7)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, ww, winH);
                ctx.beginPath();
                ctx.moveTo(x + ww/2, y);
                ctx.lineTo(x + ww/2, y + winH);
                ctx.stroke();
            }
        }

        // Dirt streaks
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#000';
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * W;
            ctx.fillRect(x, 0, 1 + Math.random() * 2, H);
        }
        ctx.globalAlpha = 1;

        return c;
    }

    /* ---------- Grass / dirt ground ---------- */
    function grassGround() {
        const W = 512, H = 512;
        const c = _canvas(W, H);
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(0, 0, W, H);

        // Scatter darker / lighter blades
        for (let i = 0; i < 6000; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const shade = Math.floor(Math.random() * 80);
            ctx.fillStyle = `rgb(${30 + shade}, ${70 + shade}, ${30 + Math.floor(shade*0.5)})`;
            ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }

        // Patches of dirt
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const r = 10 + Math.random() * 40;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(90, 70, 40, 0.6)');
            g.addColorStop(1, 'rgba(90, 70, 40, 0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }

        return c;
    }

    /* ---------- Sand ---------- */
    function sandGround() {
        const W = 512, H = 512;
        const c = _canvas(W, H);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#c4a35a';
        ctx.fillRect(0, 0, W, H);
        _noise(ctx, W, H, 60);

        // Dune ripples
        ctx.strokeStyle = 'rgba(80,60,30,0.15)';
        ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < W; x += 4) {
                ctx.lineTo(x, y + Math.sin(x * 0.05 + y * 0.01) * 3);
            }
            ctx.stroke();
        }
        return c;
    }

    /* ---------- Asphalt road ---------- */
    function asphalt() {
        const W = 256, H = 256;
        const c = _canvas(W, H);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(0, 0, W, H);
        _noise(ctx, W, H, 35);
        // White lane in the middle
        ctx.fillStyle = '#e8e8c8';
        for (let y = 8; y < H; y += 64) {
            ctx.fillRect(W/2 - 3, y, 6, 40);
        }
        return c;
    }

    /* ---------- Concrete (debris / chunks) ---------- */
    function concrete() {
        const W = 256, H = 256;
        const c = _canvas(W, H);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#6a6a66';
        ctx.fillRect(0, 0, W, H);
        _noise(ctx, W, H, 50);
        // Cracks
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random()*W, Math.random()*H);
            for (let s = 0; s < 4; s++) {
                ctx.lineTo(Math.random()*W, Math.random()*H);
            }
            ctx.stroke();
        }
        // Rust streaks
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const r = 5 + Math.random() * 20;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(120,50,20,0.6)');
            g.addColorStop(1, 'rgba(120,50,20,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        return c;
    }

    /* ---------- Soft circular sprite (fire/smoke) ---------- */
    function softSprite(rgb, opaqueCore) {
        const W = 128, H = 128;
        const c = _canvas(W, H);
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2);
        const r = rgb[0], gr = rgb[1], b = rgb[2];
        g.addColorStop(0, `rgba(${r},${gr},${b},${opaqueCore ? 1 : 0.95})`);
        g.addColorStop(0.5, `rgba(${r},${gr},${b},0.45)`);
        g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        return c;
    }

    /* ---------- Public ---------- */
    return {
        get(name, opts) {
            const key = name + ':' + JSON.stringify(opts || {});
            if (cache[key]) return cache[key];

            let canvas;
            switch (name) {
                case 'building':
                    canvas = buildingFacade(opts.base, opts.accent, opts.floors, opts.windows);
                    break;
                case 'grass':   canvas = grassGround(); break;
                case 'sand':    canvas = sandGround();  break;
                case 'asphalt': canvas = asphalt();     break;
                case 'concrete':canvas = concrete();    break;
                case 'fire':    canvas = softSprite([255, 160, 40], true); break;
                case 'smoke':   canvas = softSprite([80, 80, 80], false);  break;
                case 'spark':   canvas = softSprite([255, 230, 120], true); break;
                case 'glow':    canvas = softSprite([255, 200, 80], true); break;
                default: canvas = grassGround();
            }
            const tex = _toTexture(canvas, opts && opts.repeat);
            cache[key] = tex;
            return tex;
        },

        /**
         * Returns a THREE.SpriteMaterial preconfigured for additive billboard
         * rendering of a soft particle (fire, smoke, glow, spark).
         */
        spriteMaterial(name, color, opts) {
            opts = opts || {};
            const tex = this.get(name);
            return new THREE.SpriteMaterial({
                map: tex,
                color: color != null ? color : 0xffffff,
                transparent: true,
                opacity: opts.opacity != null ? opts.opacity : 1,
                blending: opts.blending != null ? opts.blending : THREE.AdditiveBlending,
                depthWrite: false
            });
        }
    };
})();
