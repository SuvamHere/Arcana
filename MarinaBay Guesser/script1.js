/* ============================================================
   BayGuessr
   Guess the Bay
   Section 1/4
   Constants • Game Data • State • DOM References
============================================================ */

/* -----------------------------
   Game Configuration
----------------------------- */

const MAP_WIDTH = 800;
const MAP_HEIGHT = 500;

const EARTH_RADIUS = 6371000;

const TOTAL_ROUNDS = 6;
const MAX_POINTS = 5000;


/* -----------------------------
   Landmark Data
----------------------------- */

const ROUNDS = [

    {
        id: "mbs",
        title: "Marina Bay Sands",
        fact: "The SkyPark spans all three hotel towers and offers one of Singapore's most famous skyline views.",
        x: 344,
        y: 343,
        scene: "mbs",
        image: ""
    },

    {
        id: "artscience",
        title: "ArtScience Museum",
        fact: "The museum's lotus-inspired design has become one of Marina Bay's architectural icons.",
        x: 398,
        y: 276,
        scene: "artscience",
        image: ""
    },

    {
        id: "helix",
        title: "Helix Bridge",
        fact: "Its double-helix structure was inspired by human DNA.",
        x: 458,
        y: 220,
        scene: "helix",
        image: ""
    },

    {
        id: "merlion",
        title: "Merlion Park",
        fact: "The Merlion represents Singapore's origins as a fishing village and its lion-city identity.",
        x: 520,
        y: 184,
        scene: "merlion",
        image: ""
    },

    {
        id: "supertrees",
        title: "Supertree Grove",
        fact: "The Supertrees generate solar energy and collect rainwater.",
        x: 548,
        y: 316,
        scene: "supertrees",
        image: ""
    },

    {
        id: "esplanade",
        title: "Esplanade",
        fact: "Locals affectionately call it 'The Durian' because of its spiky roof.",
        x: 612,
        y: 308,
        scene: "esplanade",
        image: ""
    }

];


/* -----------------------------
   Game State
----------------------------- */

let currentRound = 0;

let totalScore = 0;

let roundScore = 0;

let selectedPoint = null;

let roundDistances = [];

let bestRound = 0;

let perfectPins = 0;


/* -----------------------------
   DOM References
----------------------------- */

const screens = {

    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    reveal: document.getElementById("screen-reveal"),
    end: document.getElementById("screen-end")

};

const mapSVG = document.getElementById("map-svg");
const revealSVG = document.getElementById("reveal-svg");

const pinLayer = document.getElementById("pins-layer");
const revealLayer = document.getElementById("reveal-layer");

const photoFrame = document.getElementById("photo-frame");

const progressFill = document.getElementById("progress-fill");

const roundCurrent = document.getElementById("round-current");
const roundTotal = document.getElementById("round-total");

const liveScore = document.getElementById("score-live");

const guessButton = document.getElementById("btn-guess");
const nextButton = document.getElementById("btn-next");

const revealTitle = document.getElementById("reveal-title");
const revealFact = document.getElementById("reveal-fact");
const revealDistance = document.getElementById("reveal-distance");
const revealPoints = document.getElementById("reveal-points");

const endScore = document.getElementById("end-score");

const statBest = document.getElementById("stat-best");
const statAverage = document.getElementById("stat-avg-dist");
const statPerfect = document.getElementById("stat-perfect");


/* -----------------------------
   Utility Helpers
----------------------------- */

function clamp(value, min, max) {

    return Math.min(Math.max(value, min), max);

}

function lerp(a, b, t) {

    return a + (b - a) * t;

}

function radians(degrees) {

    return degrees * Math.PI / 180;

}

function showScreen(screen) {

    Object.values(screens).forEach(s =>
        s.classList.remove("active")
    );

    screen.classList.add("active");

}
/* ============================================================
   BayGuessr
   Section 2/4
   Utility Functions • SVG Drawing • Scoring Engine
============================================================ */


/* ----------------------------------------------------------
   Convert mouse click to SVG coordinates
---------------------------------------------------------- */

function getSVGPoint(event) {

    const point = mapSVG.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const svgPoint = point.matrixTransform(
        mapSVG.getScreenCTM().inverse()
    );

    return {
        x: clamp(svgPoint.x, 0, MAP_WIDTH),
        y: clamp(svgPoint.y, 0, MAP_HEIGHT)
    };

}


/* ----------------------------------------------------------
   Clear SVG Layers
---------------------------------------------------------- */

function clearLayer(layer) {

    while (layer.firstChild) {

        layer.removeChild(layer.firstChild);

    }

}


/* ----------------------------------------------------------
   Create SVG Element
---------------------------------------------------------- */

function svgElement(type, attributes = {}) {

    const el = document.createElementNS(
        "http://www.w3.org/2000/svg",
        type
    );

    Object.entries(attributes).forEach(([key, value]) => {

        el.setAttribute(key, value);

    });

    return el;

}


/* ----------------------------------------------------------
   Draw Pin
---------------------------------------------------------- */

function drawPin(layer, x, y, color = "#FF4D7A") {

    const group = svgElement("g");

    group.classList.add("pin");

    group.style.transformOrigin = `${x}px ${y}px`;

    const stem = svgElement("line", {
        x1: x,
        y1: y,
        x2: x,
        y2: y - 18,
        stroke: color,
        "stroke-width": 4,
        "stroke-linecap": "round"
    });

    const circle = svgElement("circle", {
        cx: x,
        cy: y - 22,
        r: 9,
        fill: color,
        stroke: "white",
        "stroke-width": 3
    });

    group.appendChild(stem);
    group.appendChild(circle);

    layer.appendChild(group);

}


/* ----------------------------------------------------------
   Draw Guess Line
---------------------------------------------------------- */

function drawGuessLine(layer, start, end) {

    const line = svgElement("line", {

        x1: start.x,
        y1: start.y,

        x2: end.x,
        y2: end.y,

        stroke: "#FFFFFF",

        "stroke-width": 4,

        "stroke-linecap": "round",

        opacity: ".75"

    });

    line.classList.add("guess-line");

    layer.appendChild(line);

}


/* ----------------------------------------------------------
   Distance Between Two Points
---------------------------------------------------------- */

function getDistance(pointA, pointB) {

    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;

    return Math.sqrt(dx * dx + dy * dy);

}


/* ----------------------------------------------------------
   Convert Pixels → Approx. Metres

   (Calibrated for your 800x500 map)
---------------------------------------------------------- */

function pixelsToMeters(px) {

    return Math.round(px * 7.5);

}


/* ----------------------------------------------------------
   GeoGuessr Style Score
---------------------------------------------------------- */

function scoreFromDistance(distance) {

    if (distance <= 25) return 5000;
    if (distance <= 50) return 4900;
    if (distance <= 100) return 4700;
    if (distance <= 200) return 4400;
    if (distance <= 350) return 3900;
    if (distance <= 500) return 3300;
    if (distance <= 700) return 2600;
    if (distance <= 900) return 2000;
    if (distance <= 1200) return 1500;
    if (distance <= 1600) return 1000;
    if (distance <= 2200) return 600;

    return 100;

}


/* ----------------------------------------------------------
   Update Top HUD
---------------------------------------------------------- */

function updateHUD() {

    roundCurrent.textContent = currentRound + 1;

    roundTotal.textContent = TOTAL_ROUNDS;

    liveScore.textContent = totalScore.toLocaleString();

    progressFill.style.width =
        ((currentRound) / TOTAL_ROUNDS) * 100 + "%";

}


/* ----------------------------------------------------------
   Reveal Card
---------------------------------------------------------- */

function updateReveal(distance, score) {

    const round = ROUNDS[currentRound];

    revealTitle.textContent = round.title;

    revealFact.textContent = round.fact;

    revealDistance.textContent =
        distance.toLocaleString() + " m";

    revealPoints.textContent =
        score.toLocaleString();

}


/* ----------------------------------------------------------
   End Screen Statistics
---------------------------------------------------------- */

function updateEndStats() {

    endScore.textContent =
        totalScore.toLocaleString();

    statBest.textContent =
        bestRound.toLocaleString();

    statPerfect.textContent =
        perfectPins;

    const average =

        roundDistances.reduce((a, b) => a + b, 0) /
        roundDistances.length;

    statAverage.textContent =
        Math.round(average).toLocaleString() + " m";

}


/* ----------------------------------------------------------
   Camera Zoom
---------------------------------------------------------- */

function zoomReveal(x, y) {

    revealSVG.style.transition =
        "transform .8s cubic-bezier(.2,1,.2,1)";

    revealSVG.style.transformOrigin =
        `${x}px ${y}px`;

    revealSVG.style.transform =
        "scale(1.7)";

}


/* ----------------------------------------------------------
   Reset Camera
---------------------------------------------------------- */

function resetRevealZoom() {

    revealSVG.style.transform = "scale(1)";

}


/* ----------------------------------------------------------
   Load Scene
---------------------------------------------------------- */

function loadRoundScene() {

    const round = ROUNDS[currentRound];

    /*
      We'll build the SVG scene generator
      in Section 4.

      For now this simply clears the frame.
    */

    photoFrame.innerHTML = "";

}
/* ============================================================
   BayGuessr
   Section 3/4
   Game Flow • User Interaction • Reveal Logic
============================================================ */


/* ----------------------------------------------------------
   Start Game
---------------------------------------------------------- */

function startGame() {

    currentRound = 0;
    totalScore = 0;
    bestRound = 0;
    perfectPins = 0;

    roundDistances = [];

    startRound();

}


/* ----------------------------------------------------------
   Start Current Round
---------------------------------------------------------- */

function startRound() {

    selectedPoint = null;

    clearLayer(pinLayer);
    clearLayer(revealLayer);

    guessButton.disabled = true;

    resetRevealZoom();

    updateHUD();

    loadRoundScene();

    showScreen(screens.game);

}


/* ----------------------------------------------------------
   Map Click
---------------------------------------------------------- */

mapSVG.addEventListener("click", (event) => {

    selectedPoint = getSVGPoint(event);

    clearLayer(pinLayer);

    drawPin(
        pinLayer,
        selectedPoint.x,
        selectedPoint.y,
        "#ff4d7a"
    );

    guessButton.disabled = false;

});


/* ----------------------------------------------------------
   Lock Guess
---------------------------------------------------------- */

guessButton.addEventListener("click", () => {

    if (!selectedPoint) return;

    revealRound();

});


/* ----------------------------------------------------------
   Reveal Round
---------------------------------------------------------- */

function revealRound() {

    const round = ROUNDS[currentRound];

    const correct = {

        x: round.x,
        y: round.y

    };

    const pixelDistance = getDistance(
        selectedPoint,
        correct
    );

    const meterDistance =
        pixelsToMeters(pixelDistance);

    const score =
        scoreFromDistance(meterDistance);

    totalScore += score;

    if (score > bestRound)
        bestRound = score;

    if (meterDistance <= 25)
        perfectPins++;

    roundDistances.push(meterDistance);

    updateReveal(meterDistance, score);

    clearLayer(revealLayer);

    showScreen(screens.reveal);

    /* -----------------------
       Reveal Animation
    ------------------------ */

    drawPin(
        revealLayer,
        selectedPoint.x,
        selectedPoint.y,
        "#ff4d7a"
    );

    setTimeout(() => {

        drawPin(
            revealLayer,
            correct.x,
            correct.y,
            "#3DDC97"
        );

    }, 450);

    setTimeout(() => {

        drawGuessLine(
            revealLayer,
            selectedPoint,
            correct
        );

    }, 900);

    setTimeout(() => {

        zoomReveal(
            correct.x,
            correct.y
        );

    }, 1100);

}


/* ----------------------------------------------------------
   Next Round
---------------------------------------------------------- */

nextButton.addEventListener("click", () => {

    currentRound++;

    if (currentRound >= TOTAL_ROUNDS) {

        finishGame();

        return;

    }

    startRound();

});


/* ----------------------------------------------------------
   Finish Game
---------------------------------------------------------- */

function finishGame() {

    updateEndStats();

    showScreen(screens.end);

}


/* ----------------------------------------------------------
   Replay
---------------------------------------------------------- */

document
.getElementById("btn-replay")
.addEventListener("click", () => {

    startGame();

});


/* ----------------------------------------------------------
   Start Screen Buttons
---------------------------------------------------------- */

document
.getElementById("btn-play")
.addEventListener("click", startGame);




/* ----------------------------------------------------------
   Rules Modal
---------------------------------------------------------- */

const modal =
document.getElementById("modal-backdrop");

document
.getElementById("btn-howto")
.addEventListener("click", () => {

    modal.classList.add("active");

});


document
.getElementById("btn-close-howto")
.addEventListener("click", () => {

    modal.classList.remove("active");

});




/* ----------------------------------------------------------
   Keyboard Shortcuts
---------------------------------------------------------- */

document.addEventListener("keydown", (event) => {

    if (event.code === "Space") {

        event.preventDefault();

        if (!guessButton.disabled &&
            screens.game.classList.contains("active")) {

            guessButton.click();

        }

    }

    if (event.key === "Enter") {

        if (screens.reveal.classList.contains("active")) {

            nextButton.click();

        }

    }

});


/* ----------------------------------------------------------
   Initialize
---------------------------------------------------------- */

updateHUD();
/* ============================================================
   BayGuessr
   Section 4/4
   Scene Generator • Leaderboard • Sky • Finish
============================================================ */


/* ----------------------------------------------------------
   Simple SVG Landmark Scenes
---------------------------------------------------------- */

const SCENES = {

    mbs: `
<svg viewBox="0 0 800 500">
<rect width="800" height="500" fill="#8FCBFF"/>
<rect y="340" width="800" height="160" fill="#5FA8D3"/>

<rect x="230" y="120" width="70" height="220" rx="10" fill="#6D7A88"/>
<rect x="330" y="110" width="70" height="230" rx="10" fill="#6D7A88"/>
<rect x="430" y="120" width="70" height="220" rx="10" fill="#6D7A88"/>

<rect x="200" y="90" width="330" height="35" rx="18" fill="#3A4750"/>
</svg>
`,

    artscience: `
<svg viewBox="0 0 800 500">
<rect width="800" height="500" fill="#9ED3FF"/>
<rect y="340" width="800" height="160" fill="#69B3D6"/>

<ellipse cx="400" cy="300" rx="120" ry="35" fill="#EFEFEF"/>

<path d="M400 150
C350 170 320 230 340 300
C380 260 390 220 400 170
C410 220 420 260 460 300
C480 230 450 170 400 150Z"
fill="#F8F8F8"/>

</svg>
`,

    helix: `
<svg viewBox="0 0 800 500">
<rect width="800" height="500" fill="#B8DFFF"/>
<rect y="330" width="800" height="170" fill="#62A9D3"/>

<path
d="M150 220
C250 120 350 320 450 220
C550 120 650 320 750 220"
stroke="#FFFFFF"
stroke-width="12"
fill="none"/>

</svg>
`,

    merlion: `
<svg viewBox="0 0 800 500">
<rect width="800" height="500" fill="#A8D9FF"/>
<rect y="340" width="800" height="160" fill="#66B7E0"/>

<circle cx="400" cy="200" r="45" fill="#F4F4F4"/>
<rect x="380" y="240" width="40" height="100" fill="#F4F4F4"/>

<path d="M445 205 L540 180"
stroke="#FFFFFF"
stroke-width="10"/>

</svg>
`,

    supertrees: `
<svg viewBox="0 0 800 500">
<rect width="800" height="500" fill="#B5E6C8"/>
<rect y="340" width="800" height="160" fill="#6EBE76"/>

<line x1="260" y1="330" x2="260" y2="180" stroke="#664B3A" stroke-width="10"/>
<circle cx="260" cy="160" r="45" fill="#4CAF50"/>

<line x1="400" y1="330" x2="400" y2="150" stroke="#664B3A" stroke-width="10"/>
<circle cx="400" cy="130" r="55" fill="#56C271"/>

<line x1="540" y1="330" x2="540" y2="190" stroke="#664B3A" stroke-width="10"/>
<circle cx="540" cy="170" r="42" fill="#4CAF50"/>

</svg>
`,

    esplanade: `
<svg viewBox="0 0 800 500">
<rect width="800" height="500" fill="#9FD2FF"/>
<rect y="340" width="800" height="160" fill="#63A9D2"/>

<ellipse cx="310" cy="260" rx="90" ry="65" fill="#C7C7C7"/>
<ellipse cx="500" cy="260" rx="90" ry="65" fill="#C7C7C7"/>

</svg>
`

};


/* ----------------------------------------------------------
   Load Scene
---------------------------------------------------------- */

function loadRoundScene() {

    const round = ROUNDS[currentRound];

    photoFrame.innerHTML =
        SCENES[round.scene] || "";

}


/* ----------------------------------------------------------
   Dynamic Sky
---------------------------------------------------------- */

function updateSky() {

    const sky =
        document.getElementById("sky");

    const colors = [

        "#FDBB92",
        "#F8AFA6",
        "#E89BC7",
        "#BFA2DB",
        "#8FA7F0",
        "#5B6EE1"

    ];

    sky.style.background =
        `linear-gradient(180deg,
        ${colors[currentRound]},
        #13253F)`;

}


/* ----------------------------------------------------------
   Leaderboard
---------------------------------------------------------- */

function updateLeaderboard() {

    let scores =

        JSON.parse(
            localStorage.getItem("bayguessr_scores")
        ) || [];

    scores.push(totalScore);

    scores.sort((a, b) => b - a);

    scores = scores.slice(0, 5);

    localStorage.setItem(
        "bayguessr_scores",
        JSON.stringify(scores)
    );

    const list =
        document.getElementById("leaderboard-list");

    list.innerHTML = "";

    scores.forEach(score => {

        const li =
            document.createElement("li");

        li.textContent =
            score.toLocaleString() + " pts";

        list.appendChild(li);

    });

}


/* ----------------------------------------------------------
   Player Rank
---------------------------------------------------------- */

function getRank(score) {

    if (score >= 29000)
        return "🏆 Marina Legend";

    if (score >= 26000)
        return "🥇 Bay Master";

    if (score >= 22000)
        return "🥈 Marina Explorer";

    if (score >= 18000)
        return "🥉 Tourist";

    return "🚶 First-Time Visitor";

}


/* ----------------------------------------------------------
   Override Finish
---------------------------------------------------------- */

function finishGame() {

    updateEndStats();

    updateLeaderboard();

    document.querySelector(".end-score-label").textContent =
        getRank(totalScore);

    showScreen(screens.end);

}


/* ----------------------------------------------------------
   Improve Round Start
---------------------------------------------------------- */

const oldStartRound = startRound;

startRound = function () {

    updateSky();

    oldStartRound();

};


/* ----------------------------------------------------------
   Improve Replay
---------------------------------------------------------- */

document
.getElementById("btn-replay")
.addEventListener("click", () => {

    resetRevealZoom();

});


/* ----------------------------------------------------------
   Welcome
---------------------------------------------------------- */

console.log(`
██████╗  █████╗ ██╗   ██╗
██╔══██╗██╔══██╗╚██╗ ██╔╝
██████╔╝███████║ ╚████╔╝
██╔══██╗██╔══██║  ╚██╔╝
██████╔╝██║  ██║   ██║
╚═════╝ ╚═╝  ╚═╝   ╚═╝

BayGuessr Loaded Successfully
`);