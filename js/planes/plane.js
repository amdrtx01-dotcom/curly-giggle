/* Plane factory: builds detailed Russian/Soviet fighter models out of primitives.
 * Each builder returns a Group whose forward direction is -Z, up is +Y, wings span X.
 * The Group's userData carries flight tuning + nozzle/wingtip anchor positions. */

class PlaneFactory {
    static list() {
        return [
            { id: 'su27',  name: 'Су-27',  build: PlaneFactory.buildSu27,  camo: () => PlaneTextures.camoSu27()  },
            { id: 'su24',  name: 'Су-24',  build: PlaneFactory.buildSu24,  camo: () => PlaneTextures.camoSu24()  },
            { id: 'su35',  name: 'Су-35',  build: PlaneFactory.buildSu35,  camo: () => PlaneTextures.camoSu35()  },
            { id: 'su57',  name: 'Су-57',  build: PlaneFactory.buildSu57,  camo: () => PlaneTextures.camoSu57()  },
            { id: 'mig29', name: 'МиГ-29', build: PlaneFactory.buildMig29, camo: () => PlaneTextures.camoMig29() },
        ];
    }

    // ---------------- Shared building blocks ----------------

    static bodyMat(camoTex) {
        return new THREE.MeshPhongMaterial({
            map: camoTex,
            color: 0xffffff,
            shininess: 30,
            specular: 0x303030,
        });
    }

    static darkMat() {
        return new THREE.MeshPhongMaterial({ color: 0x1a1d22, shininess: 60, specular: 0x222222 });
    }

    static glassMat() {
        return new THREE.MeshPhongMaterial({
            color: 0x202a36,
            shininess: 220,
            specular: 0xa8c8e8,
            transparent: true,
            opacity: 0.78,
        });
    }

    static nozzleMat() {
        return new THREE.MeshPhongMaterial({ color: 0x2a2a2a, shininess: 80, specular: 0x444444 });
    }

    static nozzleInnerMat() {
        return new THREE.MeshBasicMaterial({ color: 0x441400 });
    }

    static missileMat() {
        return new THREE.MeshPhongMaterial({ color: 0xe8e2d4, shininess: 90 });
    }

    static finPair(rootChord, tipChord, height, thickness, sweep) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(sweep, height);
        shape.lineTo(sweep + tipChord, height);
        shape.lineTo(rootChord, 0);
        shape.lineTo(0, 0);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
        geo.translate(-rootChord / 2, 0, -thickness / 2);
        return geo;
    }

    /** Symmetric wing extruded along X, parametric for sweep & taper. */
    static wing(rootChord, tipChord, span, sweep, thickness) {
        const halfShape = new THREE.Shape();
        halfShape.moveTo(0, 0);
        halfShape.lineTo(span, sweep);
        halfShape.lineTo(span, sweep + tipChord);
        halfShape.lineTo(0, rootChord);
        halfShape.lineTo(0, 0);
        const geo = new THREE.ExtrudeGeometry(halfShape, { depth: thickness, bevelEnabled: false });
        geo.rotateZ(0);
        // Center wing thickness around Y
        geo.translate(0, 0, -thickness / 2);
        // Tilt -X into the X axis: the shape lies in (X,Y) where Y is chord-direction; rotate so chord is along Z
        geo.rotateY(0);
        // We want span -> X, chord -> Z. Currently X=span, Y=chord. Rotate -90 around Z to send Y->-X, X->Y; that's wrong.
        // Instead, rotate -90 around X to send Y->Z.
        geo.rotateX(-Math.PI / 2);
        // After rotateX(-pi/2): X stays, Y becomes -Z, Z becomes Y. Chord now along -Z (forward in our convention). Good.
        return geo;
    }

    static buildWingPair(parent, mat, opts) {
        // opts: { rootChord, tipChord, span, sweep, thickness, y, zRoot, dihedralDeg, anhedralDeg }
        const dihedral = THREE.MathUtils.degToRad(opts.dihedralDeg || 0);
        const right = new THREE.Mesh(PlaneFactory.wing(opts.rootChord, opts.tipChord, opts.span, opts.sweep, opts.thickness), mat);
        right.position.set(0, opts.y || 0, opts.zRoot || 0);
        right.rotation.z = -dihedral;
        parent.add(right);

        const left = new THREE.Mesh(PlaneFactory.wing(opts.rootChord, opts.tipChord, opts.span, opts.sweep, opts.thickness), mat);
        left.position.set(0, opts.y || 0, opts.zRoot || 0);
        left.scale.x = -1;
        left.rotation.z = dihedral;
        parent.add(left);

        return { right, left };
    }

    static buildVerticalTwin(parent, mat, opts) {
        // Two vertical stabilizers offset on +/- X
        const makeOne = (sign) => {
            const geo = PlaneFactory.finPair(opts.rootChord, opts.tipChord, opts.height, opts.thickness, opts.sweep);
            const m = new THREE.Mesh(geo, mat);
            m.rotation.x = Math.PI / 2; // stand vertical
            // After rotateX(pi/2): chord along x, height along -z; flip
            m.rotation.x = -Math.PI / 2;
            // Reorient: we want chord along Z (length), height along Y. So extrude in X (thickness already z), then rotate.
            // Simpler: build a custom geometry directly.
            parent.remove(m);
            return null;
        };
        makeOne; // unused fallback path
        const fin = (sign) => {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.lineTo(opts.sweep, opts.height);
            shape.lineTo(opts.sweep + opts.tipChord, opts.height);
            shape.lineTo(opts.rootChord, 0);
            shape.lineTo(0, 0);
            const geo = new THREE.ExtrudeGeometry(shape, { depth: opts.thickness, bevelEnabled: false });
            geo.translate(-opts.rootChord / 2, 0, -opts.thickness / 2);
            // Now Y=height, X=chord(forward). Rotate -90 about Y so chord goes to -Z (forward).
            geo.rotateY(-Math.PI / 2);
            const m = new THREE.Mesh(geo, mat);
            m.position.set(sign * (opts.xOffset || 0), opts.y || 0, opts.z || 0);
            m.rotation.z = sign * THREE.MathUtils.degToRad(opts.cantDeg || 0);
            parent.add(m);
            return m;
        };
        return { right: fin(1), left: fin(-1) };
    }

    static buildSingleFin(parent, mat, opts) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(opts.sweep, opts.height);
        shape.lineTo(opts.sweep + opts.tipChord, opts.height);
        shape.lineTo(opts.rootChord, 0);
        shape.lineTo(0, 0);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: opts.thickness, bevelEnabled: false });
        geo.translate(-opts.rootChord / 2, 0, -opts.thickness / 2);
        geo.rotateY(-Math.PI / 2);
        const fin = new THREE.Mesh(geo, mat);
        fin.position.set(0, opts.y || 0, opts.z || 0);
        parent.add(fin);
        return fin;
    }

    static buildHorizontalStab(parent, mat, opts) {
        return PlaneFactory.buildWingPair(parent, mat, opts);
    }

    static buildCanopy(parent, opts) {
        const len   = opts.length || 2.4;
        const w     = opts.width  || 0.9;
        const h     = opts.height || 0.6;
        const geo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        geo.scale(w / 2, h, len / 2);
        const mesh = new THREE.Mesh(geo, PlaneFactory.glassMat());
        mesh.position.set(0, opts.y || 0.4, opts.z || 0);
        parent.add(mesh);

        // Canopy frame underneath
        const frameGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        frameGeo.scale(w / 2 + 0.02, h * 0.05, len / 2 + 0.05);
        const frame = new THREE.Mesh(frameGeo, PlaneFactory.darkMat());
        frame.position.set(0, opts.y || 0.4, opts.z || 0);
        parent.add(frame);
        return mesh;
    }

    static buildEngineNacelle(parent, bodyMat, opts) {
        // Cylindrical nacelle with hot nozzle at tail
        const len  = opts.length;
        const rad  = opts.radius;
        const x    = opts.x;
        const y    = opts.y || 0;
        const zCtr = opts.zCenter || 0;

        const naGeo = new THREE.CylinderGeometry(rad, rad * 0.92, len, 18);
        naGeo.rotateX(Math.PI / 2);
        const na = new THREE.Mesh(naGeo, bodyMat);
        na.position.set(x, y, zCtr);
        parent.add(na);

        // Intake (open dark cone at front)
        const intakeGeo = new THREE.CylinderGeometry(rad * 0.95, rad * 0.85, 0.4, 18, 1, true);
        intakeGeo.rotateX(Math.PI / 2);
        const intake = new THREE.Mesh(intakeGeo, PlaneFactory.darkMat());
        intake.position.set(x, y, zCtr - len / 2 + 0.18);
        parent.add(intake);

        // Outer nozzle ring
        const nozOutGeo = new THREE.CylinderGeometry(rad * 0.95, rad * 1.05, 0.5, 18);
        nozOutGeo.rotateX(Math.PI / 2);
        const nozOut = new THREE.Mesh(nozOutGeo, PlaneFactory.nozzleMat());
        nozOut.position.set(x, y, zCtr + len / 2);
        parent.add(nozOut);

        // Inner nozzle (afterburner color)
        const nozInGeo = new THREE.CylinderGeometry(rad * 0.78, rad * 0.78, 0.4, 18, 1, true);
        nozInGeo.rotateX(Math.PI / 2);
        const nozIn = new THREE.Mesh(nozInGeo, PlaneFactory.nozzleInnerMat());
        nozIn.position.set(x, y, zCtr + len / 2 + 0.1);
        parent.add(nozIn);

        return { nacelle: na, nozzlePos: new THREE.Vector3(x, y, zCtr + len / 2 + 0.25) };
    }

    static attachStar(parent, x, y, z, scale, rotY) {
        const star = new THREE.Sprite(new THREE.SpriteMaterial({
            map: PlaneTextures.redStar(),
            transparent: true,
            depthWrite: false,
        }));
        star.scale.set(scale, scale, 1);
        star.position.set(x, y, z);
        if (rotY) star.material.rotation = rotY;
        parent.add(star);
    }

    // ---------------- Su-27 "Flanker" ----------------
    static buildSu27() {
        const group = new THREE.Group();
        const camo  = PlaneTextures.camoSu27();
        const bodyMat = PlaneFactory.bodyMat(camo);

        // Long blended fuselage
        const fuselageGeo = new THREE.CylinderGeometry(0.62, 0.55, 7.2, 16);
        fuselageGeo.rotateX(Math.PI / 2);
        const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
        fuselage.position.set(0, 0, 0);
        group.add(fuselage);

        // Pointed nose (radome)
        const noseGeo = new THREE.ConeGeometry(0.62, 2.3, 16);
        noseGeo.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(0, 0, -4.6);
        group.add(nose);
        // Pitot tube
        const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.7, 8), PlaneFactory.darkMat());
        pitot.rotation.x = Math.PI / 2;
        pitot.position.set(0, 0, -5.95);
        group.add(pitot);

        // LERX (leading-edge root extensions)
        const lerxShape = new THREE.Shape();
        lerxShape.moveTo(0, 0); lerxShape.lineTo(0, -2.6); lerxShape.lineTo(1.6, -0.6); lerxShape.lineTo(1.6, 0); lerxShape.lineTo(0, 0);
        const lerxGeo = new THREE.ExtrudeGeometry(lerxShape, { depth: 0.15, bevelEnabled: false });
        lerxGeo.translate(0, 0, -0.075);
        lerxGeo.rotateY(-Math.PI / 2);
        // After rotateY(-pi/2): x becomes -z, z becomes x; so we need to rotate to lay flat.
        // Simpler: build flat in (X,Z) directly.
        const lerxFlat = (sign) => {
            const sh = new THREE.Shape();
            sh.moveTo(0, 0); sh.lineTo(sign * 0.4, -2.6); sh.lineTo(sign * 1.7, -0.4); sh.lineTo(sign * 0.4, 0.2); sh.lineTo(0, 0);
            const g = new THREE.ShapeGeometry(sh);
            // ShapeGeometry lies in XY. We want lying in XZ.
            g.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(g, bodyMat);
            m.position.set(0, 0.05, -1.0);
            group.add(m);
        };
        lerxFlat(1); lerxFlat(-1);
        // Remove the broken extrude wing we tried earlier (not added, no cleanup needed)
        lerxGeo.dispose();

        // Main wings (swept back)
        PlaneFactory.buildWingPair(group, bodyMat, {
            rootChord: 4.0, tipChord: 1.3, span: 6.0, sweep: 2.2, thickness: 0.15,
            y: 0.05, zRoot: 0.4, dihedralDeg: 0
        });

        // Horizontal stabilizers (tailerons)
        PlaneFactory.buildHorizontalStab(group, bodyMat, {
            rootChord: 1.8, tipChord: 0.7, span: 2.6, sweep: 1.0, thickness: 0.1,
            y: 0.1, zRoot: 3.4, dihedralDeg: -3
        });

        // Twin vertical stabilizers
        PlaneFactory.buildVerticalTwin(group, bodyMat, {
            rootChord: 1.8, tipChord: 0.7, height: 1.7, thickness: 0.1, sweep: 1.0,
            xOffset: 0.75, y: 0.55, z: 3.0, cantDeg: 6
        });

        // Canopy (bubble)
        PlaneFactory.buildCanopy(group, { length: 2.2, width: 1.0, height: 0.55, y: 0.55, z: -2.2 });

        // Twin engines (Lyulka AL-31F): widely spaced
        const eng = [];
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 4.0, radius: 0.55, x:  0.8, y: -0.05, zCenter: 1.6 }));
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 4.0, radius: 0.55, x: -0.8, y: -0.05, zCenter: 1.6 }));

        // Tail "sting" between engines
        const sting = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.05, 1.8, 10), bodyMat);
        sting.rotation.x = Math.PI / 2;
        sting.position.set(0, 0.05, 3.6);
        group.add(sting);

        // Red star markings on wings
        PlaneFactory.attachStar(group,  1.6, 0.16, 1.4, 0.7);
        PlaneFactory.attachStar(group, -1.6, 0.16, 1.4, 0.7);

        group.userData = {
            displayName: 'Су-27',
            id: 'su27',
            nozzles: eng.map(e => e.nozzlePos.clone()),
            wingtips: [new THREE.Vector3( 6.0, 0.05,  3.0), new THREE.Vector3(-6.0, 0.05,  3.0)],
            stats: { thrust: 1.0, maneuverability: 1.0, mass: 1.0 },
        };
        return group;
    }

    // ---------------- Su-24 "Fencer" (variable-sweep) ----------------
    static buildSu24() {
        const group = new THREE.Group();
        const camo  = PlaneTextures.camoSu24();
        const bodyMat = PlaneFactory.bodyMat(camo);

        // Longer rectangular-ish fuselage
        const fuselageGeo = new THREE.CylinderGeometry(0.72, 0.62, 8.5, 14);
        fuselageGeo.rotateX(Math.PI / 2);
        const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
        group.add(fuselage);

        // Nose (rounder)
        const noseGeo = new THREE.ConeGeometry(0.72, 2.0, 14);
        noseGeo.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(0, 0, -5.1);
        group.add(nose);

        // Side-by-side canopy (wide)
        PlaneFactory.buildCanopy(group, { length: 2.0, width: 1.7, height: 0.55, y: 0.6, z: -2.8 });

        // Variable-sweep main wings, shown in mid-sweep (~45 deg)
        PlaneFactory.buildWingPair(group, bodyMat, {
            rootChord: 4.5, tipChord: 1.2, span: 6.8, sweep: 3.4, thickness: 0.14,
            y: 0.05, zRoot: 0.2, dihedralDeg: -2
        });

        // Glove (fixed wing root in front of variable wings)
        const gloveFlat = (sign) => {
            const sh = new THREE.Shape();
            sh.moveTo(0, 0); sh.lineTo(sign * 1.2, -1.2); sh.lineTo(sign * 1.4, 0.0); sh.lineTo(0, 0);
            const g = new THREE.ShapeGeometry(sh);
            g.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(g, bodyMat);
            m.position.set(0, 0.05, -0.7);
            group.add(m);
        };
        gloveFlat(1); gloveFlat(-1);

        // Tailerons
        PlaneFactory.buildHorizontalStab(group, bodyMat, {
            rootChord: 2.0, tipChord: 0.8, span: 2.7, sweep: 1.2, thickness: 0.1,
            y: 0.05, zRoot: 3.6, dihedralDeg: -4
        });

        // Single tall vertical tail
        PlaneFactory.buildSingleFin(group, bodyMat, {
            rootChord: 2.8, tipChord: 1.0, height: 2.4, thickness: 0.12, sweep: 1.5,
            y: 0.55, z: 3.0
        });

        // Twin engines (lower body, closely spaced rectangular feel)
        const eng = [];
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 4.6, radius: 0.6, x:  0.55, y: -0.25, zCenter: 1.5 }));
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 4.6, radius: 0.6, x: -0.55, y: -0.25, zCenter: 1.5 }));

        PlaneFactory.attachStar(group,  1.8, 0.13, 1.0, 0.7);
        PlaneFactory.attachStar(group, -1.8, 0.13, 1.0, 0.7);

        group.userData = {
            displayName: 'Су-24',
            id: 'su24',
            nozzles: eng.map(e => e.nozzlePos.clone()),
            wingtips: [new THREE.Vector3( 6.8, 0.05,  3.6), new THREE.Vector3(-6.8, 0.05,  3.6)],
            stats: { thrust: 0.85, maneuverability: 0.7, mass: 1.25 },
        };
        return group;
    }

    // ---------------- Su-35 "Super Flanker" (canards + 3D nozzles) ----------------
    static buildSu35() {
        const group = new THREE.Group();
        const camo  = PlaneTextures.camoSu35();
        const bodyMat = PlaneFactory.bodyMat(camo);

        // Same Flanker base as Su-27
        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.58, 7.5, 16), bodyMat);
        fuselage.rotation.x = Math.PI / 2;
        group.add(fuselage);

        const noseGeo = new THREE.ConeGeometry(0.65, 2.4, 16);
        noseGeo.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(0, 0, -4.9);
        group.add(nose);

        // LERX
        const lerxFlat = (sign) => {
            const sh = new THREE.Shape();
            sh.moveTo(0, 0); sh.lineTo(sign * 0.5, -2.8); sh.lineTo(sign * 1.8, -0.4); sh.lineTo(sign * 0.4, 0.2); sh.lineTo(0, 0);
            const g = new THREE.ShapeGeometry(sh);
            g.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(g, bodyMat);
            m.position.set(0, 0.05, -1.0);
            group.add(m);
        };
        lerxFlat(1); lerxFlat(-1);

        // Canards (small foreplanes)
        PlaneFactory.buildWingPair(group, bodyMat, {
            rootChord: 0.9, tipChord: 0.4, span: 1.6, sweep: 0.6, thickness: 0.08,
            y: 0.25, zRoot: -3.0, dihedralDeg: 2
        });

        // Main wings
        PlaneFactory.buildWingPair(group, bodyMat, {
            rootChord: 4.1, tipChord: 1.3, span: 6.2, sweep: 2.3, thickness: 0.15,
            y: 0.05, zRoot: 0.3, dihedralDeg: 0
        });

        // Tailerons
        PlaneFactory.buildHorizontalStab(group, bodyMat, {
            rootChord: 1.9, tipChord: 0.7, span: 2.7, sweep: 1.0, thickness: 0.1,
            y: 0.1, zRoot: 3.5, dihedralDeg: -3
        });

        // Twin verticals
        PlaneFactory.buildVerticalTwin(group, bodyMat, {
            rootChord: 1.9, tipChord: 0.7, height: 1.75, thickness: 0.1, sweep: 1.1,
            xOffset: 0.78, y: 0.55, z: 3.1, cantDeg: 7
        });

        // Canopy
        PlaneFactory.buildCanopy(group, { length: 2.3, width: 1.0, height: 0.6, y: 0.55, z: -2.4 });

        // Engines with thrust-vectoring nozzles (slightly extended/different)
        const eng = [];
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 4.2, radius: 0.58, x:  0.85, y: -0.05, zCenter: 1.7 }));
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 4.2, radius: 0.58, x: -0.85, y: -0.05, zCenter: 1.7 }));

        // Tail sting
        const sting = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.05, 1.8, 10), bodyMat);
        sting.rotation.x = Math.PI / 2;
        sting.position.set(0, 0.05, 3.7);
        group.add(sting);

        PlaneFactory.attachStar(group,  1.7, 0.16, 1.4, 0.7);
        PlaneFactory.attachStar(group, -1.7, 0.16, 1.4, 0.7);

        group.userData = {
            displayName: 'Су-35',
            id: 'su35',
            nozzles: eng.map(e => e.nozzlePos.clone()),
            wingtips: [new THREE.Vector3( 6.2, 0.05,  3.1), new THREE.Vector3(-6.2, 0.05,  3.1)],
            stats: { thrust: 1.15, maneuverability: 1.15, mass: 1.0 },
        };
        return group;
    }

    // ---------------- Su-57 "Felon" (5th-gen stealth) ----------------
    static buildSu57() {
        const group = new THREE.Group();
        const camo  = PlaneTextures.camoSu57();
        const bodyMat = PlaneFactory.bodyMat(camo);

        // Flattened diamond fuselage
        const fuselageGeo = new THREE.BoxGeometry(2.0, 0.7, 8.5);
        // Beveled by scaling top/bottom
        const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
        group.add(fuselage);

        // Pointed flat nose
        const noseGeo = new THREE.ConeGeometry(0.95, 2.2, 4);
        noseGeo.rotateX(-Math.PI / 2);
        noseGeo.rotateZ(Math.PI / 4);
        noseGeo.scale(1.2, 0.5, 1);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(0, 0, -5.0);
        group.add(nose);

        // Diamond wings (trapezoidal)
        PlaneFactory.buildWingPair(group, bodyMat, {
            rootChord: 4.6, tipChord: 1.4, span: 5.8, sweep: 2.6, thickness: 0.16,
            y: 0.0, zRoot: -0.6, dihedralDeg: 0
        });

        // Small all-moving tailplanes
        PlaneFactory.buildHorizontalStab(group, bodyMat, {
            rootChord: 1.5, tipChord: 0.5, span: 2.0, sweep: 0.9, thickness: 0.1,
            y: 0.05, zRoot: 3.2, dihedralDeg: 0
        });

        // Two outward-canted vertical tails
        PlaneFactory.buildVerticalTwin(group, bodyMat, {
            rootChord: 1.6, tipChord: 0.5, height: 1.3, thickness: 0.1, sweep: 0.9,
            xOffset: 1.05, y: 0.4, z: 2.7, cantDeg: 26
        });

        // Sleek canopy
        PlaneFactory.buildCanopy(group, { length: 2.4, width: 1.0, height: 0.5, y: 0.4, z: -2.6 });

        // Wide-spaced engines flush with body
        const eng = [];
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 3.8, radius: 0.55, x:  0.95, y: -0.15, zCenter: 2.0 }));
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 3.8, radius: 0.55, x: -0.95, y: -0.15, zCenter: 2.0 }));

        PlaneFactory.attachStar(group,  1.6, 0.16, 0.6, 0.7);
        PlaneFactory.attachStar(group, -1.6, 0.16, 0.6, 0.7);

        group.userData = {
            displayName: 'Су-57',
            id: 'su57',
            nozzles: eng.map(e => e.nozzlePos.clone()),
            wingtips: [new THREE.Vector3( 5.8, 0.0,  2.0), new THREE.Vector3(-5.8, 0.0,  2.0)],
            stats: { thrust: 1.25, maneuverability: 1.25, mass: 0.95 },
        };
        return group;
    }

    // ---------------- MiG-29 "Fulcrum" ----------------
    static buildMig29() {
        const group = new THREE.Group();
        const camo  = PlaneTextures.camoMig29();
        const bodyMat = PlaneFactory.bodyMat(camo);

        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 6.2, 14), bodyMat);
        fuselage.rotation.x = Math.PI / 2;
        group.add(fuselage);

        const noseGeo = new THREE.ConeGeometry(0.55, 1.9, 14);
        noseGeo.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(0, 0, -4.05);
        group.add(nose);

        // LERX
        const lerxFlat = (sign) => {
            const sh = new THREE.Shape();
            sh.moveTo(0, 0); sh.lineTo(sign * 0.45, -2.2); sh.lineTo(sign * 1.4, -0.3); sh.lineTo(sign * 0.4, 0.2); sh.lineTo(0, 0);
            const g = new THREE.ShapeGeometry(sh);
            g.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(g, bodyMat);
            m.position.set(0, 0.05, -0.8);
            group.add(m);
        };
        lerxFlat(1); lerxFlat(-1);

        // Main wings
        PlaneFactory.buildWingPair(group, bodyMat, {
            rootChord: 3.3, tipChord: 1.1, span: 5.4, sweep: 1.9, thickness: 0.13,
            y: 0.05, zRoot: 0.2, dihedralDeg: 0
        });

        // Tailerons
        PlaneFactory.buildHorizontalStab(group, bodyMat, {
            rootChord: 1.6, tipChord: 0.6, span: 2.4, sweep: 0.9, thickness: 0.1,
            y: 0.1, zRoot: 3.0, dihedralDeg: -4
        });

        // Twin verticals (more outward-canted than Su-27)
        PlaneFactory.buildVerticalTwin(group, bodyMat, {
            rootChord: 1.6, tipChord: 0.6, height: 1.5, thickness: 0.1, sweep: 0.9,
            xOffset: 0.95, y: 0.5, z: 2.6, cantDeg: 12
        });

        // Canopy (slightly bulged)
        PlaneFactory.buildCanopy(group, { length: 1.9, width: 0.95, height: 0.6, y: 0.5, z: -1.9 });

        // Twin engines (more widely spaced)
        const eng = [];
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 3.4, radius: 0.48, x:  0.95, y: -0.05, zCenter: 1.4 }));
        eng.push(PlaneFactory.buildEngineNacelle(group, bodyMat, { length: 3.4, radius: 0.48, x: -0.95, y: -0.05, zCenter: 1.4 }));

        PlaneFactory.attachStar(group,  1.5, 0.15, 1.2, 0.6);
        PlaneFactory.attachStar(group, -1.5, 0.15, 1.2, 0.6);

        group.userData = {
            displayName: 'МиГ-29',
            id: 'mig29',
            nozzles: eng.map(e => e.nozzlePos.clone()),
            wingtips: [new THREE.Vector3( 5.4, 0.05,  2.5), new THREE.Vector3(-5.4, 0.05,  2.5)],
            stats: { thrust: 1.05, maneuverability: 1.2, mass: 0.85 },
        };
        return group;
    }
}
