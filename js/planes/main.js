/* Orchestrates the whole experience: scene, camera, plane swap, loop. */

(function () {
    const canvas = document.getElementById('planes-canvas');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x8cb6d8);

    const scene = new THREE.Scene();
    const world = new PlanesWorld(scene);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 12000);

    // Build all planes once, but only show one at a time
    const planeDefs = PlaneFactory.list();
    const planeMeshes = planeDefs.map(def => def.build());
    planeMeshes.forEach(m => { m.visible = false; scene.add(m); });

    let currentIdx = 0;
    let currentPlane = planeMeshes[currentIdx];
    currentPlane.visible = true;

    // Initial pose: a few hundred meters up, flying forward at altitude
    currentPlane.position.set(0, 180, 0);
    currentPlane.quaternion.identity();

    let flight = new FlightModel(currentPlane);
    let effects = new PlaneEffects(scene, currentPlane);
    let maneuvers = new ManeuverEngine(flight, (label, kind) => {
        if (kind === 'start') {
            hud.showManeuver(label);
            const burstPos = currentPlane.position.clone();
            effects.burst(burstPos, 0xfff0b0);
        }
    });

    const hud = new PlanesHUD();
    hud.setPlaneName(planeDefs[currentIdx].name);
    hud.setActiveChip(currentIdx);

    // Camera modes: 0 chase, 1 cockpit, 2 cinematic side
    let cameraMode = 0;
    const controls = new PlanesControls({
        flight,
        maneuvers,
        onSwitchPlane: (idx) => {
            if (idx === currentIdx) return;
            switchPlane(idx);
        },
        onToggleCamera: () => {
            cameraMode = (cameraMode + 1) % 3;
        },
    });

    function switchPlane(idx) {
        const oldPlane = currentPlane;
        const newPlane = planeMeshes[idx];

        // Carry over position/orientation + speed
        newPlane.position.copy(oldPlane.position);
        newPlane.quaternion.copy(oldPlane.quaternion);
        oldPlane.visible = false;
        newPlane.visible = true;

        // Rebuild flight + effects bound to the new plane
        const prev = {
            speed: flight.speed, throttle: flight.throttle, afterburner: flight.afterburner,
        };
        maneuvers.stop();

        // Tear down old effects
        for (const s of effects.flameSprites) oldPlane.remove(s);

        currentPlane = newPlane;
        currentIdx = idx;
        flight = new FlightModel(newPlane);
        flight.speed = prev.speed;
        flight.throttle = prev.throttle;
        flight.afterburner = prev.afterburner;

        effects = new PlaneEffects(scene, newPlane);
        maneuvers = new ManeuverEngine(flight, (label, kind) => {
            if (kind === 'start') {
                hud.showManeuver(label);
                effects.burst(currentPlane.position.clone(), 0xfff0b0);
            }
        });

        controls.setFlight(flight);
        controls.setManeuvers(maneuvers);

        hud.setPlaneName(planeDefs[idx].name);
        hud.setActiveChip(idx);
        hud.showManeuver(`${planeDefs[idx].name.toUpperCase()} ВЫБРАН`);
    }

    // Chase-cam state for smoothing
    const camTarget = new THREE.Vector3();
    const camPos    = new THREE.Vector3(0, 200, 30);

    function positionCamera(dt) {
        const offsets = [
            // chase
            { offset: new THREE.Vector3(0, 4.5, 18), lookAt: new THREE.Vector3(0, 1.5, -10), smooth: 6 },
            // cockpit
            { offset: new THREE.Vector3(0, 1.2, -2.0), lookAt: new THREE.Vector3(0, 1.0, -40), smooth: 25 },
            // cinematic
            { offset: new THREE.Vector3(22, 6, 5), lookAt: new THREE.Vector3(0, 0, -5), smooth: 3.5 },
        ];
        const mode = offsets[cameraMode];
        const worldOffset = mode.offset.clone().applyQuaternion(currentPlane.quaternion);
        const worldLook   = mode.lookAt.clone().applyQuaternion(currentPlane.quaternion);
        const desiredPos  = currentPlane.position.clone().add(worldOffset);
        const desiredTgt  = currentPlane.position.clone().add(worldLook);

        const k = Math.min(1, mode.smooth * dt);
        camPos.lerp(desiredPos, k);
        camTarget.lerp(desiredTgt, k);

        // Don't dive below the ground
        if (camPos.y < 8) camPos.y = 8;

        camera.position.copy(camPos);
        camera.lookAt(camTarget);
    }

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    let prevTime = performance.now();
    function loop(t) {
        const dt = Math.min(0.05, (t - prevTime) / 1000);
        prevTime = t;

        controls.update(dt);
        maneuvers.update(dt);
        flight.update(dt);
        effects.update(dt, flight);
        world.update(dt, currentPlane.position);
        positionCamera(dt);
        hud.update(dt, flight);

        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }

    // Click chips to swap planes (in addition to 1-5 keys)
    document.querySelectorAll('.plane-chip').forEach(chip => {
        chip.style.pointerEvents = 'auto';
        chip.addEventListener('click', () => {
            const idx = parseInt(chip.getAttribute('data-idx'), 10);
            if (!isNaN(idx)) switchPlane(idx);
        });
    });

    // Initial maneuver banner so the user can see what's available
    hud.showManeuver('Су-27 В ВОЗДУХЕ');

    requestAnimationFrame(loop);
})();
