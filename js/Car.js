class Car {
    constructor(startX, startY) {
        this.width = 20;
        this.length = 35;

        // Physics Position
        this.x = startX;
        this.y = startY;

        // Physics
        this.speed = 0;
        this.baseMaxSpeed = 5;
        this.maxSpeed = this.baseMaxSpeed;

        this.acceleration = 0.1;
        this.friction = 0.06;
        this.angle = 0;

        this.baseRotationSpeed = 0.025;
        this.rotationSpeed = this.baseRotationSpeed;

        this.baseBrakeForce = 0.2;
        this.brakeForce = this.baseBrakeForce;

        // Reverse Logic
        this.reverseTimer = 0;
        this.braking = false;

        // EXP Curves (-1 = soft, 0 = linear, 1 = aggressive)
        this.forwardExp = 0;
        this.brakeExp = 0;
        this.steeringExp = 0;

        // Motor Inertia
        this.motorThrottle = 0;

        // Endpoints / Dual Rate (0.0 to 1.0)
        this.forwardMax = 1.0;
        this.reverseMax = 1.0;
        this.steeringDR = 1.0;

        // 3D Mesh
        this.mesh = this.createMesh();
        this.mesh.position.set(this.x, 0, this.y);
    }

    createMesh() {
        const group = new THREE.Group();

        // Colors
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeb400 }); // Main body (Gold/Yellow)
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Carbon fiber/accent
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

        // 1. Chassis / Lower Body
        // Lower and wider for racing look
        const chassisGeo = new THREE.BoxGeometry(this.width, 6, this.length);
        const chassis = new THREE.Mesh(chassisGeo, bodyMat);
        chassis.position.y = 5;
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        group.add(chassis);

        // 2. Cabin (Cockpit)
        // Streamlined, further back
        const cabinGeo = new THREE.BoxGeometry(this.width - 4, 5, 12);
        const cabin = new THREE.Mesh(cabinGeo, glassMat);
        cabin.position.y = 10;
        cabin.position.z = -2; // Slightly back
        cabin.castShadow = true;
        group.add(cabin);

        // 3. Rear Wing (Spoiler)
        const wingHeight = 14;
        const wingDepth = 8;

        // Wing Struts
        const strutGeo = new THREE.BoxGeometry(2, 6, 4);
        const strutL = new THREE.Mesh(strutGeo, darkMat);
        strutL.position.set(-6, 10, 14);
        group.add(strutL);

        const strutR = strutL.clone();
        strutR.position.set(6, 10, 14);
        group.add(strutR);

        // Wing Blade
        const wingBladeGeo = new THREE.BoxGeometry(this.width + 4, 2, 6);
        const wingBlade = new THREE.Mesh(wingBladeGeo, darkMat);
        wingBlade.position.set(0, 14, 14); // sits on struts
        wingBlade.castShadow = true;
        group.add(wingBlade);

        // 4. Front Splitter / Nose
        const noseGeo = new THREE.BoxGeometry(this.width, 4, 5);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(0, 4, -this.length / 2 - 2);
        group.add(nose);

        // 5. Headlights
        const lightGeo = new THREE.BoxGeometry(4, 2, 1);
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaa8800 });
        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-7, 6, -this.length / 2);
        group.add(leftLight);

        const rightLight = leftLight.clone();
        rightLight.position.x = 7;
        group.add(rightLight);

        // 6. Wheels (Wider racing tires)
        const wheelGeo = new THREE.CylinderGeometry(5, 5, 3, 24);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        wheelGeo.rotateZ(Math.PI / 2);

        const wheels = [
            { x: -12, z: -10 }, { x: 12, z: -10 },
            { x: -12, z: 12 }, { x: 12, z: 12 }
        ];

        wheels.forEach(pos => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(pos.x, 5, pos.z);
            w.castShadow = true;
            group.add(w);
        });

        return group;
    }

    update(input, track, deltaTime) {
        this.move(input, deltaTime);
        this.checkCollision(track);
        this.updateMesh();
    }

    move(input, deltaTime) {
        const dt = (deltaTime || 16) / 1000;

        // 5% deadzone - treat small inputs as neutral
        const deadzone = 0.05;
        const rawThrottle = Math.abs(input.throttle) < deadzone ? 0 : input.throttle;
        const rawSteering = Math.abs(input.steering) < deadzone ? 0 : input.steering;

        // Apply EXP curves (analog gamepad only)
        // Formula: x + k * (x - x^3)
        let throttle = 0;
        if (rawThrottle > 0) {
            throttle = this.applyExp(rawThrottle, this.forwardExp);
        } else {
            throttle = this.applyExp(rawThrottle, this.brakeExp);
        }
        let steering = this.applyExp(rawSteering, this.steeringExp);

        // Apply Endpoints / Dual Rate
        if (throttle > 0) throttle *= this.forwardMax;
        if (throttle < 0) throttle *= this.reverseMax;
        steering *= this.steeringDR;

        // Motor Inertia (Smooth throttle to simulate motor spin up/down)
        const spinUpSpeed = 3.0;   // rapid acceleration
        const spinDownSpeed = 5.0; // slower coasting/braking ramp

        // Move motorThrottle towards target throttle
        if (this.motorThrottle < throttle) {
            this.motorThrottle += spinUpSpeed * dt;
            if (this.motorThrottle > throttle) this.motorThrottle = throttle;
        } else if (this.motorThrottle > throttle) {
            this.motorThrottle -= spinDownSpeed * dt;
            if (this.motorThrottle < throttle) this.motorThrottle = throttle;
        }

        const drive = this.motorThrottle;

        if (drive > 0) {
            // Forward: clear all reverse state
            this.reverseTimer = 0;
            this.brakeLocked = false;
            if (this.speed < this.maxSpeed) {
                this.speed += this.acceleration * drive;
            }
        } else if (drive < 0) {
            if (this.speed > 0.1) {
                // Moving forward -> brake
                this.speed += this.brakeForce * drive; // drive is negative
                if (this.speed < 0) this.speed = 0;
                this.brakeLocked = true; // Lock reverse until input released
            } else if (this.speed >= -0.1 && this.speed <= 0.1) {
                this.speed = 0;
                // Check ACTUAL input for neutral/reverse triggers, not the lagged motor
                if (throttle >= -0.05) {
                    this.brakeLocked = false;
                }

                if (!this.brakeLocked) {
                    if (throttle < -0.05) {
                        this.reverseTimer += dt;
                        if (this.reverseTimer > 0.2) {
                            this.speed = -0.2;
                        }
                    } else {
                        this.reverseTimer = 0;
                    }
                }
            } else {
                // Already reversing
                if (this.speed > -this.maxSpeed / 2) {
                    this.speed += this.acceleration * drive;
                }
            }
        } else {
            // Motor is neutral (0)
            // Check input for unlock
            if (throttle === 0) {
                this.reverseTimer = 0;
                this.brakeLocked = false;
            }
        }

        // Apply Friction (Always, representing rolling resistance/drag)
        // If we are driving, friction should still oppose motion (simpler: apply when throttle is 0 or low)
        // User want "drag brake" (neutral brake).
        // So applying it when throttle input is 0 is correct for "drag brake".
        if (throttle === 0) {
            if (this.speed > 0) {
                this.speed -= this.friction;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.friction;
                if (this.speed > 0) this.speed = 0;
            }
        }

        // Max Speed Caps
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

        // Update Angle
        if (Math.abs(this.speed) > 0.1) {
            const flip = this.speed > 0 ? 1 : -1;
            this.angle += steering * this.rotationSpeed * flip;
        }

        // Update Position
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    checkCollision(track) {
        const halfW = track.gameWidth / 2;
        const halfH = track.gameHeight / 2;
        const carRadius = 15;

        if (this.x < -halfW + 20) { this.x = -halfW + 20; this.speed = 0; }
        if (this.x > halfW - 20) { this.x = halfW - 20; this.speed = 0; }
        if (this.y < -halfH + 20) { this.y = -halfH + 20; this.speed = 0; }
        if (this.y > halfH - 20) { this.y = halfH - 20; this.speed = 0; }

        if (track.walls) {
            for (const wall of track.walls) {
                const left = wall.x - wall.w / 2 - carRadius;
                const right = wall.x + wall.w / 2 + carRadius;
                const top = wall.z - wall.d / 2 - carRadius;
                const bottom = wall.z + wall.d / 2 + carRadius;

                if (this.x > left && this.x < right && this.y > top && this.y < bottom) {
                    this.speed = -this.speed * 0.5;
                    const dLeft = Math.abs(this.x - left);
                    const dRight = Math.abs(this.x - right);
                    const dTop = Math.abs(this.y - top);
                    const dBottom = Math.abs(this.y - bottom);
                    const min = Math.min(dLeft, dRight, dTop, dBottom);

                    if (min === dLeft) this.x = left;
                    else if (min === dRight) this.x = right;
                    else if (min === dTop) this.y = top;
                    else if (min === dBottom) this.y = bottom;
                }
            }
        }

        for (const obs of track.obstacles) {
            const dx = this.x - obs.x;
            const dy = this.y - obs.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < carRadius + obs.radius) {
                this.speed = -this.speed * 0.5;
                const angle = Math.atan2(dy, dx);
                const overlap = (carRadius + obs.radius) - distance;
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }
    }

    updateMesh() {
        this.mesh.position.x = this.x;
        this.mesh.position.z = this.y;
        this.mesh.rotation.y = -this.angle;
    }

    setMaxSpeed(percent) {
        this.maxSpeed = this.baseMaxSpeed * (percent / 100);
    }

    setRotationSpeed(percent) {
        this.rotationSpeed = this.baseRotationSpeed * (percent / 100);
    }

    setBrakeForce(percent) {
        this.brakeForce = this.baseBrakeForce * (percent / 100);
    }

    // EXP curve: blends linear and cubic
    // k=-1 (soft), k=0 (linear), k=1 (aggressive)
    // Formula: x + k * (x - x^3)
    applyExp(input, k) {
        if (k === 0) return input;

        // Clamp k to -1 to 1
        k = Math.max(-1, Math.min(1, k));

        // Formula: y = x + k(x - x^3)
        // If k=1:  y = 2x - x^3 (Aggressive start)
        // If k=-1: y = x^3 (Soft start)
        return input + k * (input - input * input * input);
    }

    setForwardExp(percent) {
        // Percent: -100 to 100
        this.forwardExp = percent / 100;
    }

    setBrakeExp(percent) {
        // Percent: -100 to 100
        this.brakeExp = percent / 100;
    }

    setSteeringExp(percent) {
        // Percent: -100 to 100
        this.steeringExp = percent / 100;
    }

    setForwardMax(percent) {
        this.forwardMax = percent / 100;
    }

    setReverseMax(percent) {
        this.reverseMax = percent / 100;
    }

    setSteeringDR(percent) {
        this.steeringDR = percent / 100;
    }

    setDragBrake(percent) {
        // Drag Brake = Friction
        // 0% -> 0.01 (min friction)
        // 100% -> 0.2 (strong braking)
        const minF = 0.01;
        const maxF = 0.2;
        this.friction = minF + (maxF - minF) * (percent / 100);
    }
}
