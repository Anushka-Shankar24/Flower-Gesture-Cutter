// ==========================================
// ELEMENTS
// ==========================================

const video =
    document.getElementById("video");

const canvas =
    document.getElementById("canvas");

const ctx =
    canvas.getContext("2d");

const gameArea =
    document.getElementById("gameArea");

const scoreElement =
    document.getElementById("score");

const livesElement =
    document.getElementById("lives");

const timerElement =
    document.getElementById("timer");

const gameOver =
    document.getElementById("gameOver");

const finalScore =
    document.getElementById("finalScore");


// ==========================================
// GAME VARIABLES
// ==========================================

let score = 0;

let lives = 3;

let timeLeft = 60;

let gameRunning = true;

let flowers = [];

let handPoints = null;

let lastFlowerTime = 0;

let lastFrameTime = 0;

let timerInterval;


// ==========================================
// CANVAS SIZE
// ==========================================

function resizeCanvas() {

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;

}


resizeCanvas();


window.addEventListener(
    "resize",
    resizeCanvas
);


// ==========================================
// MEDIAPIPE HANDS
// ==========================================

const hands = new Hands({

    locateFile: (file) => {

        return (
            "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" +
            file
        );

    }

});


hands.setOptions({

    maxNumHands: 1,

    modelComplexity: 0,

    minDetectionConfidence: 0.5,

    minTrackingConfidence: 0.5

});


// ==========================================
// CONVERT HAND POSITION
// ==========================================

function convertHandPoints(landmarks) {

    const vw =
        video.videoWidth;

    const vh =
        video.videoHeight;

    const sw =
        window.innerWidth;

    const sh =
        window.innerHeight;


    if (!vw || !vh) {

        return [];

    }


    // ======================================
    // OBJECT-FIT COVER SCALE
    // ======================================

    const scale =
        Math.max(
            sw / vw,
            sh / vh
        );


    const displayWidth =
        vw * scale;

    const displayHeight =
        vh * scale;


    // Amount cropped from video
    const cropX =
        (displayWidth - sw) / 2;

    const cropY =
        (displayHeight - sh) / 2;


    // ======================================
    // CONVERT LANDMARKS
    // ======================================

    return landmarks.map(point => {

        /*
         * MediaPipe:
         * x = 0 left
         * x = 1 right
         *
         * Camera is mirrored using CSS.
         * So we mirror X here too.
         */

        const x =
            sw -
            (
                point.x * displayWidth
                - cropX
            );


        const y =
            point.y * displayHeight
            - cropY;


        return {

            x: x,

            y: y

        };

    });

}


// ==========================================
// DRAW HAND
// ==========================================

function drawHand(points) {

    if (
        !points ||
        points.length === 0
    ) {

        return;

    }


    // ======================================
    // HAND CONNECTIONS
    // ======================================

    const connections = [

        // Thumb
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],

        // Index
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],

        // Middle
        [0, 9],
        [9, 10],
        [10, 11],
        [11, 12],

        // Ring
        [0, 13],
        [13, 14],
        [14, 15],
        [15, 16],

        // Pinky
        [0, 17],
        [17, 18],
        [18, 19],
        [19, 20],

        // Palm
        [5, 9],
        [9, 13],
        [13, 17]

    ];


    // ======================================
    // GREEN LINES
    // ======================================

    ctx.strokeStyle =
        "#00ff66";

    ctx.lineWidth = 5;

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    connections.forEach(
        ([startIndex, endIndex]) => {

            const start =
                points[startIndex];

            const end =
                points[endIndex];


            ctx.beginPath();

            ctx.moveTo(
                start.x,
                start.y
            );

            ctx.lineTo(
                end.x,
                end.y
            );

            ctx.stroke();

        }
    );


    // ======================================
    // LANDMARK DOTS
    // ======================================

    ctx.fillStyle =
        "#00ff66";


    points.forEach(point => {

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();

    });


    // ======================================
    // INDEX FINGER POINTER
    // ======================================

    const index =
        points[8];


    ctx.beginPath();

    ctx.arc(
        index.x,
        index.y,
        12,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "white";

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        index.x,
        index.y,
        7,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "#00ff66";

    ctx.fill();

}


// ==========================================
// MEDIAPIPE RESULTS
// ==========================================

hands.onResults((results) => {

    // Always clear old hand
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // ======================================
    // NO HAND
    // ======================================

    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {

        handPoints = null;

        return;

    }


    // ======================================
    // HAND FOUND
    // ======================================

    const landmarks =
        results.multiHandLandmarks[0];


    handPoints =
        convertHandPoints(landmarks);


    // Draw only when hand detected
    drawHand(handPoints);

});


// ==========================================
// CREATE FLOWER
// ==========================================

function createFlower() {

    if (!gameRunning) {

        return;

    }


    const element =
        document.createElement("div");


    element.className =
        "flower flower-floating";


    element.innerHTML =
        "🌸";


    // ======================================
    // RANDOM X
    // ======================================

    const flowerSize = 75;

    const x =
        Math.random() *
        (
            window.innerWidth -
            flowerSize
        );


    // ======================================
    // INITIAL POSITION
    // ======================================

    element.style.left =
        `${x}px`;

    element.style.top =
        "0px";


    gameArea.appendChild(
        element
    );


    // ======================================
    // FLOWER OBJECT
    // ======================================

    const flower = {

        element: element,

        x:
            x + flowerSize / 2,

        y:
            -flowerSize,

        speed:
            2.5 +
            Math.random() * 2,

        size:
            flowerSize,

        cut:
            false

    };


    flowers.push(flower);

}


// ==========================================
// CHECK COLLISION
// ==========================================

function isFlowerCut(flower) {

    if (
        !handPoints ||
        handPoints.length === 0
    ) {

        return false;

    }


    const flowerX =
        flower.x;

    const flowerY =
        flower.y;


    // Check every hand landmark
    for (
        const point of handPoints
    ) {

        const dx =
            point.x -
            flowerX;

        const dy =
            point.y -
            flowerY;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (
            distance <
            65
        ) {

            return true;

        }

    }


    return false;

}


// ==========================================
// CUT FLOWER
// ==========================================

function cutFlower(flower) {

    if (flower.cut) {

        return;

    }


    flower.cut = true;


    // ======================================
    // SCORE
    // ======================================

    score += 5;

    scoreElement.textContent =
        score;


    // ======================================
    // CUT EFFECT
    // ======================================

    const effect =
        document.createElement("div");


    effect.className =
        "cut-effect";


    effect.innerHTML =
        "✨";


    effect.style.left =
        `${flower.x - 25}px`;


    effect.style.top =
        `${flower.y - 25}px`;


    gameArea.appendChild(
        effect
    );


    // Remove flower
    flower.element.remove();


    // Remove from array
    flowers =
        flowers.filter(
            item =>
                item !== flower
        );


    // Remove effect
    setTimeout(() => {

        effect.remove();

    }, 500);

}


// ==========================================
// UPDATE FLOWERS
// ==========================================

function updateFlowers(deltaTime) {

    if (!gameRunning) {

        return;

    }


    for (
        let i = flowers.length - 1;
        i >= 0;
        i--
    ) {

        const flower =
            flowers[i];


        // ==================================
        // MOVE
        // ==================================

        flower.y +=
            flower.speed *
            deltaTime;


        flower.element.style.transform =
            `translateY(${flower.y}px)`;


        // ==================================
        // COLLISION
        // ==================================

        if (
            isFlowerCut(flower)
        ) {

            cutFlower(flower);

            continue;

        }


        // ==================================
        // MISSED FLOWER
        // ==================================

        if (
            flower.y >
            window.innerHeight + 80
        ) {

            flower.element.remove();


            flowers.splice(i, 1);


            // Lose one life
            lives--;


            livesElement.textContent =
                lives;


            // =================================
            // GAME OVER
            // =================================

            if (lives <= 0) {

                endGame();

                return;

            }

        }

    }

}


// ==========================================
// GAME LOOP
// ==========================================

function gameLoop(timestamp) {

    if (!gameRunning) {

        return;

    }


    // ======================================
    // DELTA TIME
    // ======================================

    if (!lastFrameTime) {

        lastFrameTime =
            timestamp;

    }


    const deltaTime =
        Math.min(
            (timestamp -
                lastFrameTime) /
            16.67,
            2
        );


    lastFrameTime =
        timestamp;


    // ======================================
    // CREATE FLOWERS
    // ======================================

    if (
        timestamp -
        lastFlowerTime >
        700
    ) {

        createFlower();

        lastFlowerTime =
            timestamp;

    }


    // ======================================
    // UPDATE
    // ======================================

    updateFlowers(
        deltaTime
    );


    requestAnimationFrame(
        gameLoop
    );

}


// ==========================================
// TIMER
// ==========================================

function startTimer() {

    clearInterval(
        timerInterval
    );


    timerInterval =
        setInterval(() => {

            if (!gameRunning) {

                return;

            }


            timeLeft--;


            timerElement.textContent =
                timeLeft;


            if (
                timeLeft <= 0
            ) {

                endGame();

            }

        }, 1000);

}


// ==========================================
// GAME OVER
// ==========================================

function endGame() {

    if (!gameRunning) {

        return;

    }


    gameRunning = false;


    clearInterval(
        timerInterval
    );


    finalScore.textContent =
        score;


    gameOver.classList.add(
        "show"
    );


    // Remove all flowers
    flowers.forEach(
        flower => {

            flower.element.remove();

        }
    );


    flowers = [];

}


// ==========================================
// RESTART GAME
// ==========================================

function restartGame() {

    // Reset values
    score = 0;

    lives = 3;

    timeLeft = 60;

    gameRunning = true;

    handPoints = null;

    lastFlowerTime = 0;

    lastFrameTime = 0;


    // Update UI
    scoreElement.textContent =
        score;

    livesElement.textContent =
        lives;

    timerElement.textContent =
        timeLeft;


    // Hide game over
    gameOver.classList.remove(
        "show"
    );


    // Clear old flowers
    flowers.forEach(
        flower => {

            flower.element.remove();

        }
    );


    flowers = [];


    // Start timer
    startTimer();


    // Start game
    requestAnimationFrame(
        gameLoop
    );

}


// ==========================================
// START CAMERA
// ==========================================

const camera =
    new Camera(video, {

        onFrame: async () => {

            await hands.send({

                image: video

            });

        },

        width: 640,

        height: 480

    });


// Start camera
camera.start();


// ==========================================
// START GAME
// ==========================================

startTimer();

requestAnimationFrame(
    gameLoop
);