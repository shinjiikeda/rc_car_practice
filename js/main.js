

window.addEventListener('load', () => {
    const game = new Game();
    game.initUI(); // Setup generic UI listeners

    // UI Elements
    const mainMenu = document.getElementById('main-menu');
    const courseSelect = document.getElementById('course-select');
    const gameContainer = document.getElementById('game-container');
    const startBtn = document.getElementById('start-btn');
    const backBtn = document.getElementById('back-to-menu');
    const courseBtns = document.querySelectorAll('.course-btn');
    const optionsModal = document.getElementById('options-modal');

    // 1. Main Menu -> Course Select
    startBtn.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        courseSelect.style.display = 'flex';
    });

    // 2. Course Select -> Settings -> Game
    courseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.course-btn');
            const mapId = target.dataset.map;

            courseSelect.style.display = 'none';
            gameContainer.style.display = 'block';

            // Show settings modal first before starting
            game.start(mapId);
            optionsModal.style.display = 'block';
        });
    });

    // 3. Back to Menu (From Course Select)
    backBtn.addEventListener('click', () => {
        courseSelect.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    // Add "Return to Menu" button inside options modal
    const returnBtn = document.createElement('button');
    returnBtn.innerText = "Back to Main Menu";
    returnBtn.style.width = "100%";
    returnBtn.style.marginTop = "10px";
    returnBtn.style.backgroundColor = "#d32f2f";

    returnBtn.addEventListener('click', () => {
        game.stop();
        gameContainer.style.display = 'none';
        mainMenu.style.display = 'flex';
        optionsModal.style.display = 'none';
    });

    optionsModal.appendChild(returnBtn);
});
