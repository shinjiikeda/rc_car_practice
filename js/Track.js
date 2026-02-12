class Track {
    constructor(mapId) {
        this.mesh = new THREE.Group();
        this.walls = [];
        this.obstacles = [];
        this.mapId = parseInt(mapId) || 0;

        this.setupMap();
    }

    setupMap() {
        // Default visuals
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        if (this.mapId === 0) {
            // Standard Practice (formerly Wide Area)
            this.gameWidth = 2000;
            this.gameHeight = 2000;
            this.createFloor(this.gameWidth, this.gameHeight, floorMat);
            this.createBoundaryWalls(this.gameWidth, this.gameHeight, wallMat);

            // 2 Pylons
            this.addCone(-500, 0, 0xffa500);
            this.addCone(500, 0, 0xffa500);
        }
        else if (this.mapId === 1) {
            // Oval Course
            this.gameWidth = 2000;
            this.gameHeight = 1200;
            this.createFloor(this.gameWidth, this.gameHeight, floorMat);
            this.createBoundaryWalls(this.gameWidth, this.gameHeight, wallMat);

            // Inner Wall (Island)
            const islandW = 1200;
            const islandH = 600;
            this.createWallRect(0, 0, islandW, islandH, wallMat);
        }
    }

    createFloor(w, h, mat) {
        const geometry = new THREE.PlaneGeometry(w, h);
        const ground = new THREE.Mesh(geometry, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.mesh.add(ground);
    }

    createBoundaryWalls(gameW, gameH, mat) {
        const t = 20; // Thickness
        const h = 20; // Height
        // Top, Bottom, Left, Right
        this.createWallBox(0, -gameH / 2, gameW, t, h, mat);
        this.createWallBox(0, gameH / 2, gameW, t, h, mat);
        this.createWallBox(-gameW / 2, 0, t, gameH, h, mat);
        this.createWallBox(gameW / 2, 0, t, gameH, h, mat);
    }

    createWallRect(x, z, w, d, mat) {
        const h = 20;
        this.createWallBox(x, z, w, d, h, mat);
    }

    createWallBox(x, z, w, d, h, mat) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.mesh.add(mesh);

        // Store physics data (Rectangle Center and Size)
        this.walls.push({ x, z, w, d });
    }

    addCone(x, z, color) {
        const geo = new THREE.ConeGeometry(5, 15, 16);
        const mat = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 7.5, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.mesh.add(mesh);
        this.obstacles.push({ x, y: z, radius: 5 }); // y is z in physics
    }
}
