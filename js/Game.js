class Game {
    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        // Fog for depth
        // this.scene.fog = new THREE.Fog(0x87CEEB, 200, 1000);

        // Camera setup (Zoomed out - doubled distance)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.set(0, 1200, 800);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.zIndex = '0';

        // OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 6000;
        this.controls.target.set(0, 0, 0);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 100);
        dirLight.castShadow = true;

        // Shadow properties
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;

        this.scene.add(dirLight);

        // Sizing
        window.addEventListener('resize', () => this.resize());

        // Entities
        this.input = new InputHandler();

        // Entities
        this.input = new InputHandler();
        this.track = null;
        this.car = new Car(0, 0);
        this.scene.add(this.car.mesh);

        // Pre-load Default Map but don't start loop yet
        // this.loadMap(0); 

        // Game Loop
        this.lastTime = 0;
        this.loopId = null;
        this.animate = this.animate.bind(this);
    }

    loadMap(mapId) {
        // Remove old track
        if (this.track) {
            this.scene.remove(this.track.mesh);
        }

        // Create new track
        this.track = new Track(mapId);
        this.scene.add(this.track.mesh);

        // Reset Car
        this.car.x = 0;
        this.car.y = 0;
        this.car.speed = 0;
        this.car.angle = 0;
        if (mapId == 1) {
            // For Oval, spawn outside the inner wall, facing sideways
            this.car.y = 800;
            this.car.angle = Math.PI / 2;
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(deltaTime) {
        this.input.update();
        if (this.track) {
            this.car.update(this.input, this.track, deltaTime); // Physics update
        }

        // Camera Follow Logic (Smooth)
        if (this.controls) {
            // this.controls.target.set(this.car.x, 0, this.car.y);
            this.controls.update();
        } else {
            const targetX = this.car.x;
            const targetZ = this.car.y;
            this.camera.position.x = targetX;
            this.camera.position.z = targetZ + 200;
            this.camera.position.y = 300;
            this.camera.lookAt(targetX, 0, targetZ);
        }

        // Update HUD
        const speedKmh = Math.abs(this.car.speed * 10).toFixed(0);
        document.getElementById('speedometer').innerText = speedKmh + ' km/h';

        const gpStatus = document.getElementById('gamepad-status');
        if (this.input.gamepadIndex !== -1) {
            gpStatus.innerText = "🎮 Controller Connected";
            gpStatus.style.color = "#4CAF50";
        } else {
            gpStatus.innerText = "🎮 No Controller (Press Button)";
            gpStatus.style.color = "#aaa";
        }
    }

    draw() {
        this.renderer.render(this.scene, this.camera);
    }

    animate(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        this.update(deltaTime);
        this.draw();

        this.loopId = requestAnimationFrame(this.animate);
    }

    start(mapId) {
        this.loadMap(mapId);

        // Reset time
        this.lastTime = performance.now();

        // Start loop if not running
        if (!this.loopId) {
            this.animate(this.lastTime);
        }

        // Initial HUD state
        document.getElementById('instructions').style.display = 'block';
        document.getElementById('hud').style.display = 'none';

        window.addEventListener('keydown', () => {
            document.getElementById('instructions').style.display = 'none';
            document.getElementById('hud').style.display = 'flex';
        }, { once: true });
    }

    stop() {
        if (this.loopId) {
            cancelAnimationFrame(this.loopId);
            this.loopId = null;
        }
    }

    initUI() {
        // Options UI
        const optionsModal = document.getElementById('options-modal');
        const speedSlider = document.getElementById('speed-slider');
        const steerSlider = document.getElementById('steer-slider');
        const brakeSlider = document.getElementById('brake-slider');
        const mapSelect = document.getElementById('map-select');
        const speedVal = document.getElementById('speed-val');
        const steerVal = document.getElementById('steer-val');
        const brakeVal = document.getElementById('brake-val');

        const openOptions = (e) => {
            e.stopPropagation();
            optionsModal.style.display = 'block';
        };

        const closeOptions = (e) => {
            e.stopPropagation();
            optionsModal.style.display = 'none';
        };

        document.getElementById('options-btn').addEventListener('click', openOptions);
        document.getElementById('close-options').addEventListener('click', closeOptions);

        // Toggle options with ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (optionsModal.style.display === 'block') {
                    closeOptions(e);
                } else {
                    openOptions(e);
                }
            }
        });

        speedSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            speedVal.innerText = val + '%';
            this.car.setMaxSpeed(val);
        });

        steerSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            steerVal.innerText = val + '%';
            this.car.setRotationSpeed(val);
        });

        if (brakeSlider) {
            brakeSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                if (brakeVal) brakeVal.innerText = val + '%';
                this.car.setBrakeForce(val);
            });
        }

        const dragBrakeSlider = document.getElementById('drag-brake-slider');
        const dragBrakeVal = document.getElementById('drag-brake-val');
        if (dragBrakeSlider) {
            dragBrakeSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                dragBrakeVal.innerText = val + '%';
                this.car.setDragBrake(val);
            });
        }

        // EXP sliders
        const fwdExpSlider = document.getElementById('fwd-exp-slider');
        const fwdExpVal = document.getElementById('fwd-exp-val');
        const brakeExpSlider = document.getElementById('brake-exp-slider');
        const brakeExpVal = document.getElementById('brake-exp-val');
        const steeringExpSlider = document.getElementById('steering-exp-slider');
        const steeringExpVal = document.getElementById('steering-exp-val');

        if (fwdExpSlider) {
            fwdExpSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                fwdExpVal.innerText = val + '%';
                this.car.setForwardExp(val);
            });
        }

        if (brakeExpSlider) {
            brakeExpSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                brakeExpVal.innerText = val + '%';
                this.car.setBrakeExp(val);
            });
        }

        if (steeringExpSlider) {
            steeringExpSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                steeringExpVal.innerText = val + '%';
                this.car.setSteeringExp(val);
            });
        }

        // Endpoints / D/R sliders
        const fwdMaxSlider = document.getElementById('fwd-max-slider');
        const fwdMaxVal = document.getElementById('fwd-max-val');
        const revMaxSlider = document.getElementById('rev-max-slider');
        const revMaxVal = document.getElementById('rev-max-val');
        const steerDrSlider = document.getElementById('steer-dr-slider');
        const steerDrVal = document.getElementById('steer-dr-val');

        if (fwdMaxSlider) {
            fwdMaxSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                fwdMaxVal.innerText = val + '%';
                this.car.setForwardMax(val);
            });
        }

        if (revMaxSlider) {
            revMaxSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                revMaxVal.innerText = val + '%';
                this.car.setReverseMax(val);
            });
        }

        if (steerDrSlider) {
            steerDrSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                steerDrVal.innerText = val + '%';
                this.car.setSteeringDR(val);
            });
        }

        const profileSelect = document.getElementById('controller-profile-select');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                this.input.setProfile(e.target.value);
            });
        }

        if (mapSelect) {
            mapSelect.addEventListener('change', (e) => {
                this.loadMap(e.target.value);
            });
        }
    }
}
