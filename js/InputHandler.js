class InputHandler {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false
        };

        this.throttle = 0; // -1 (reverse/brake) to 1 (gas)
        this.steering = 0; // -1 (left) to 1 (right)
        this.profile = 'propo'; // 'propo' or 'single'

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
        // Gamepad connection
        this.gamepadIndex = -1;
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            this.gamepadIndex = e.gamepad.index;
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = -1;
            }
        });
    }

    update() {
        // Reset inputs
        this.throttle = 0;
        this.steering = 0;

        // 1. Check Keyboard
        if (this.keys.ArrowUp || this.keys.w) this.throttle += 1;
        if (this.keys.ArrowDown || this.keys.s) this.throttle -= 1;
        if (this.keys.ArrowLeft || this.keys.a) this.steering -= 1;
        if (this.keys.ArrowRight || this.keys.d) this.steering += 1;

        // Clamp keyboard values
        this.throttle = Math.max(-1, Math.min(1, this.throttle));
        this.steering = Math.max(-1, Math.min(1, this.steering));

        // 2. Check Gamepad (Override keyboard if active)
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        // Use the connected index if available, else try 0
        const gp = (this.gamepadIndex !== -1) ? gamepads[this.gamepadIndex] : gamepads[0];

        if (gp) {
            // Apply deadzone
            const deadzone = 0.1; // Lower deadzone

            // Profile-based axis selection
            let axisX, axisY;
            if (this.profile === 'single') {
                // Left Stick Only (Axis 0 and 1)
                axisX = gp.axes[0];
                axisY = gp.axes[1];
            } else {
                // Propo-style (Right Stick X for steering, Left Stick Y for throttle)
                axisX = gp.axes[2];
                axisY = gp.axes[1];
            }

            // Steering (Axis X or D-Pad Left/Right)
            const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
            const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;

            if (Math.abs(axisX) > deadzone) {
                this.steering = axisX;
            } else if (dpadLeft) {
                this.steering = -1;
            } else if (dpadRight) {
                this.steering = 1;
            }

            // Throttle/Brake (Axis Y or D-Pad Up/Down)
            const dpadUp = gp.buttons[12] && gp.buttons[12].pressed;
            const dpadDown = gp.buttons[13] && gp.buttons[13].pressed;

            if (Math.abs(axisY) > deadzone) {
                this.throttle = -axisY;
            } else if (dpadUp) {
                this.throttle = 1;
            } else if (dpadDown) {
                this.throttle = -1;
            }
        }
    }

    setProfile(profile) {
        this.profile = profile;
        console.log(`Controller profile set to: ${profile}`);
    }
}
