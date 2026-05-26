/* Procedural 512x512 Textures for Sky Aces.
 * Every texture is generated on a 512x512 <canvas> so no external assets needed. */

const TEX_SIZE = 512;

const PlaneTextures = (() => {
    const cache = {};

    function newCanvas() {
        const c = document.createElement('canvas');
        c.width = TEX_SIZE;
        c.height = TEX_SIZE;
        return c;
    }

    // Cheap deterministic hash-based noise so textures stay stable
    function hash(x, y, s) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
        return n - Math.floor(n);
    }

    function smoothNoise(x, y, s) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi,        yf = y - yi;
        const a = hash(xi,     yi,     s);
        const b = hash(xi + 1, yi,     s);
        const c = hash(xi,     yi + 1, s);
        const d = hash(xi + 1, yi + 1, s);
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    }

    function fbm(x, y, s, octaves) {
        let value = 0, amp = 0.5, freq = 1;
        for (let i = 0; i < octaves; i++) {
            value += amp * smoothNoise(x * freq, y * freq, s + i * 17);
            amp *= 0.5;
            freq *= 2;
        }
        return value;
    }

    function toTexture(canvas, repeatX = 1, repeatY = 1) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        return tex;
    }

    // ---------- Camouflage paint (gray Russian fighter) ----------
    function camo(baseHex, accentHex, dark) {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

        const img = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
        const base = hexToRgb(baseHex);
        const accent = hexToRgb(accentHex);
        const seed = (baseHex.charCodeAt(1) ^ accentHex.charCodeAt(1)) % 90 + 1;
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const i = (y * TEX_SIZE + x) * 4;
                const n = fbm(x / 64, y / 64, seed, 4);
                const m = fbm(x / 12, y / 12, seed + 9, 2) * 0.18;
                let t = n;
                t = t < 0.42 ? 0 : t > 0.55 ? 1 : (t - 0.42) / 0.13;
                const r = base.r * (1 - t) + accent.r * t;
                const g = base.g * (1 - t) + accent.g * t;
                const b = base.b * (1 - t) + accent.b * t;
                const shade = 1 + m - 0.09;
                img.data[i  ] = clamp255(r * shade);
                img.data[i+1] = clamp255(g * shade);
                img.data[i+2] = clamp255(b * shade);
                img.data[i+3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);

        // Add panel lines
        ctx.strokeStyle = dark || 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 18; i++) {
            const y = (i + 1) * (TEX_SIZE / 19);
            ctx.beginPath();
            ctx.moveTo(0, y + (Math.sin(i * 1.7) * 4));
            ctx.lineTo(TEX_SIZE, y + (Math.cos(i * 1.3) * 4));
            ctx.stroke();
        }
        for (let i = 0; i < 10; i++) {
            const x = (i + 1) * (TEX_SIZE / 11);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, TEX_SIZE);
            ctx.stroke();
        }

        // Add rivets
        ctx.fillStyle = 'rgba(20,20,20,0.5)';
        for (let i = 0; i < 220; i++) {
            const x = hash(i, 1, 11) * TEX_SIZE;
            const y = hash(i, 2, 13) * TEX_SIZE;
            ctx.beginPath();
            ctx.arc(x, y, 0.9, 0, Math.PI * 2);
            ctx.fill();
        }

        return toTexture(c);
    }

    // ---------- Sky gradient (used as scene background and skydome) ----------
    function sky() {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, TEX_SIZE);
        grad.addColorStop(0.00, '#0d2a52');
        grad.addColorStop(0.35, '#3072b8');
        grad.addColorStop(0.65, '#82c4ee');
        grad.addColorStop(1.00, '#e2eef7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

        // Wispy high-altitude clouds
        const img = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const i = (y * TEX_SIZE + x) * 4;
                const n = fbm(x / 90, y / 40, 5, 5);
                const band = Math.max(0, 1 - Math.abs(y - TEX_SIZE * 0.55) / 80);
                const a = Math.max(0, (n - 0.55)) * band * 0.9;
                img.data[i  ] = img.data[i  ] * (1 - a) + 255 * a;
                img.data[i+1] = img.data[i+1] * (1 - a) + 255 * a;
                img.data[i+2] = img.data[i+2] * (1 - a) + 255 * a;
            }
        }
        ctx.putImageData(img, 0, 0);
        return toTexture(c, 1, 1);
    }

    // ---------- Ground terrain ----------
    function terrain() {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const i = (y * TEX_SIZE + x) * 4;
                const h = fbm(x / 80, y / 80, 3, 5);
                const d = fbm(x / 18, y / 18, 7, 3) * 0.15;
                let r, g, b;
                if (h < 0.30) {
                    // Water
                    r = 28 + d * 30; g = 60 + d * 60; b = 110 + d * 40;
                } else if (h < 0.36) {
                    // Sandy beach
                    r = 198 + d * 20; g = 184 + d * 18; b = 130 + d * 10;
                } else if (h < 0.62) {
                    // Grass plains
                    r = 60  + d * 50; g = 110 + d * 70; b = 50  + d * 30;
                } else if (h < 0.78) {
                    // Forest / hill
                    r = 40 + d * 30; g = 80 + d * 60; b = 36 + d * 18;
                } else if (h < 0.88) {
                    // Rocky
                    r = 110 + d * 40; g = 105 + d * 35; b = 95 + d * 25;
                } else {
                    // Snowy peaks
                    r = 220 + d * 30; g = 225 + d * 25; b = 235 + d * 20;
                }
                img.data[i  ] = clamp255(r);
                img.data[i+1] = clamp255(g);
                img.data[i+2] = clamp255(b);
                img.data[i+3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);

        // Road grid
        ctx.strokeStyle = 'rgba(200,180,140,0.18)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const y = 24 + i * 60 + Math.sin(i) * 8;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(TEX_SIZE, y + Math.cos(i) * 12);
            ctx.stroke();
        }
        return toTexture(c, 16, 16);
    }

    // ---------- Cloud sprite (round, soft alpha) ----------
    function cloudSprite() {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        const cx = TEX_SIZE / 2, cy = TEX_SIZE / 2;
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const i = (y * TEX_SIZE + x) * 4;
                const dx = (x - cx) / cx;
                const dy = (y - cy) / cy;
                const r = Math.sqrt(dx * dx + dy * dy);
                const n = fbm(x / 70, y / 70, 21, 5);
                const radial = Math.max(0, 1 - r * 1.05);
                const a = Math.pow(radial, 1.4) * (0.55 + n * 0.45);
                img.data[i  ] = 255;
                img.data[i+1] = 255;
                img.data[i+2] = 255;
                img.data[i+3] = clamp255(a * 255);
            }
        }
        ctx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // ---------- Soft round particle (white, premultiplied feel) ----------
    function softParticle(coreHex, edgeHex) {
        coreHex = coreHex || '#ffffff';
        edgeHex = edgeHex || '#ffffff';
        const c = newCanvas();
        const ctx = c.getContext('2d');
        const core = hexToRgb(coreHex);
        const edge = hexToRgb(edgeHex);
        const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        const cx = TEX_SIZE / 2;
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const i = (y * TEX_SIZE + x) * 4;
                const dx = (x - cx) / cx;
                const dy = (y - cx) / cx;
                const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
                const a = Math.pow(1 - r, 2.2);
                const t = r;
                img.data[i  ] = clamp255(core.r * (1 - t) + edge.r * t);
                img.data[i+1] = clamp255(core.g * (1 - t) + edge.g * t);
                img.data[i+2] = clamp255(core.b * (1 - t) + edge.b * t);
                img.data[i+3] = clamp255(a * 255);
            }
        }
        ctx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // ---------- Afterburner flame sprite (vertical gradient) ----------
    function flameSprite() {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
        const cx = TEX_SIZE / 2;
        for (let y = 0; y < TEX_SIZE; y++) {
            for (let x = 0; x < TEX_SIZE; x++) {
                const i = (y * TEX_SIZE + x) * 4;
                const dx = Math.abs(x - cx) / cx;
                // narrow at top (y=0), wide at bottom
                const widthAt = 0.2 + (y / TEX_SIZE) * 0.7;
                const inside = Math.max(0, 1 - dx / widthAt);
                const vert = Math.pow(inside, 1.7);
                // Color: white -> yellow -> orange -> red
                const t = y / TEX_SIZE;
                let r, g, b;
                if (t < 0.25) { r = 255; g = 255; b = 240; }
                else if (t < 0.55) { r = 255; g = 230 - (t - 0.25) * 300; b = 80 - (t - 0.25) * 200; }
                else { r = 255 - (t - 0.55) * 80; g = Math.max(40, 140 - (t - 0.55) * 250); b = 30; }
                const n = fbm(x / 22, y / 22, 33, 3);
                const a = vert * (0.6 + n * 0.5);
                img.data[i  ] = clamp255(r);
                img.data[i+1] = clamp255(g);
                img.data[i+2] = clamp255(b);
                img.data[i+3] = clamp255(a * 255);
            }
        }
        ctx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // ---------- Sun glow ----------
    function sunSprite() {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(TEX_SIZE/2, TEX_SIZE/2, 0, TEX_SIZE/2, TEX_SIZE/2, TEX_SIZE/2);
        grad.addColorStop(0.0, 'rgba(255, 255, 230, 1.0)');
        grad.addColorStop(0.15, 'rgba(255, 230, 160, 0.9)');
        grad.addColorStop(0.45, 'rgba(255, 170, 90, 0.25)');
        grad.addColorStop(1.0,  'rgba(255, 120, 50, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // ---------- Red star insignia ----------
    function redStar() {
        const c = newCanvas();
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
        const cx = TEX_SIZE / 2, cy = TEX_SIZE / 2;
        const outer = TEX_SIZE * 0.42, inner = outer * 0.42;
        ctx.fillStyle = 'rgba(255,255,255,0.0)';
        ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5;
            const r = i % 2 === 0 ? outer : inner;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#cc1818';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffd86b';
        ctx.stroke();
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    // ---------- Helpers ----------
    function hexToRgb(h) {
        if (h.startsWith('#')) h = h.slice(1);
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const v = parseInt(h, 16);
        return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    }
    function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

    // ---------- Lazy-cached accessors ----------
    function lazy(name, factory) {
        return () => (cache[name] || (cache[name] = factory()));
    }

    return {
        // Per-plane camo
        camoSu27:   lazy('camoSu27',   () => camo('#7e8c95', '#3e4b54', 'rgba(10,15,20,0.4)')),
        camoSu24:   lazy('camoSu24',   () => camo('#4d6044', '#2a3a28', 'rgba(0,10,0,0.45)')),
        camoSu35:   lazy('camoSu35',   () => camo('#8a98a3', '#525f6a', 'rgba(10,15,25,0.4)')),
        camoSu57:   lazy('camoSu57',   () => camo('#2c2f33', '#1a1d20', 'rgba(0,0,0,0.55)')),
        camoMig29:  lazy('camoMig29',  () => camo('#7e8c95', '#445c44', 'rgba(10,20,10,0.4)')),

        sky:         lazy('sky',         sky),
        terrain:     lazy('terrain',     terrain),
        cloudSprite: lazy('cloudSprite', cloudSprite),
        flameSprite: lazy('flameSprite', flameSprite),
        smokeSprite: lazy('smokeSprite', () => softParticle('#dddddd', '#888888')),
        sparkSprite: lazy('sparkSprite', () => softParticle('#ffeeaa', '#ff7720')),
        sunSprite:   lazy('sunSprite',   sunSprite),
        redStar:     lazy('redStar',     redStar),
    };
})();
