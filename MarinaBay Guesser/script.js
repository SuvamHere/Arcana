/* =========================================================
   BayGuessr — game logic
   Pure vanilla JS. No frameworks, no backend.
   Each round is illustrated (SVG) rather than a photo, so the
   game runs standalone with zero external image assets — drop
   real photos in later by swapping renderScene() for an <img>.
========================================================= */

/* ---------------- Round data ----------------
   x / y are coordinates on the 800x500 illustrated map (map-svg viewBox).
   Swap `image` for a real file path any time; renderScene falls back
   to the illustration when no image is provided. */
const ROUNDS = [
  {
    id: "supertrees",
    title: "Supertree Grove",
    fact: "The Supertrees act as vertical gardens and collect rainwater while generating solar power.",
    x: 545,
    y: 315,
    scene: "supertrees",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Supertree_Grove,_Gardens_by_the_Bay,_Singapore_-_20120704.jpg?width=900"
  },

  {
    id: "mbs",
    title: "Marina Bay Sands",
    fact: "The SkyPark sits atop three hotel towers.",
    x: 345,
    y: 345,
    scene: "mbs",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Infinity_Pool_at_Marina_Bay_Sands_SkyPark_Singapore_Ank_Kumar_Infosys_Limited_01.jpg?width=900"
  },

  {
    id: "artscience",
    title: "ArtScience Museum",
    fact: "Inspired by a lotus flower.",
    x: 400,
    y: 270,
    scene: "artscience",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Singapore_ArtScience_Museum_3.jpg?width=900"
  },

  {
    id: "helix",
    title: "Helix Bridge",
    fact: "A pedestrian bridge inspired by DNA.",
    x: 460,
    y: 215,
    scene: "helix",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Helix_Bridge,_Singapore.jpg?width=900"
  },

  {
    id: "merlion",
    title: "Merlion Park",
    fact: "Singapore's iconic half-lion, half-fish statue.",
    x: 520,
    y: 180,
    scene: "merlion",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Merlion_Singapore.JPG?width=900"
  },

  {
    id: "esplanade",
    title: "Esplanade",
    fact: "Known locally as the Durian because of its spiky domes.",
    x: 610,
    y: 315,
    scene: "esplanade",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Singapore_Esplanade_Theatres_on_the_Bay.jpg?width=900"
  }
];

const MAX_SCORE_PER_ROUND = 5000;
const MAP_WIDTH = 800, MAP_HEIGHT = 500;
// Flavor-only conversion so distance reads as real-world meters.
const METERS_PER_UNIT = 3.2;

/* ---------------- State ---------------- */
let state = {
  order: [],
  roundIndex: 0,
  totalScore: 0,
  roundScores: [],
  roundDistances: [],
  currentGuess: null
};

/* ---------------- DOM refs ---------------- */
const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  reveal: document.getElementById("screen-reveal"),
  end: document.getElementById("screen-end")
};
const sky = document.getElementById("sky");
const modalBackdrop = document.getElementById("modal-backdrop");

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ---------------- Start / instructions ---------------- */
document.getElementById("btn-play").addEventListener("click", startGame);
document.getElementById("btn-howto").addEventListener("click", () => modalBackdrop.classList.add("active"));
document.getElementById("btn-close-howto").addEventListener("click", () => modalBackdrop.classList.remove("active"));
modalBackdrop.addEventListener("click", (e) => { if(e.target === modalBackdrop) modalBackdrop.classList.remove("active"); });

function startGame(){
  state = {
    order: shuffle([...ROUNDS.keys()]),
    roundIndex: 0,
    totalScore: 0,
    roundScores: [],
    roundDistances: [],
    currentGuess: null
  };
  document.getElementById("round-total").textContent = ROUNDS.length;
  sky.className = ""; // reset time-of-day
  showScreen("game");
  loadRound();
}

function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------- Round loading ---------------- */
function currentRound(){
  return ROUNDS[state.order[state.roundIndex]];
}

function loadRound(){
  const round = currentRound();
  state.currentGuess = null;

  document.getElementById("round-current").textContent = state.roundIndex + 1;
  document.getElementById("score-live").textContent = state.totalScore.toLocaleString();
  document.getElementById("progress-fill").style.width =
    `${(state.roundIndex / ROUNDS.length) * 100}%`;

  renderPhotoFrame(round);

  // Shift ambient sky a little later into "evening" as rounds progress
  if(state.roundIndex >= Math.ceil(ROUNDS.length * 0.66)) sky.className = "night";
  else if(state.roundIndex >= Math.ceil(ROUNDS.length * 0.33)) sky.className = "dusk";

  clearPins("pins-layer");
  document.getElementById("btn-guess").disabled = true;
}

function renderPhotoFrame(round){
  const frame = document.getElementById("photo-frame");
  if(!round.image){
    frame.innerHTML = renderScene(round.scene);
    return;
  }
  frame.innerHTML = `<div class="photo-loading">Loading photo…</div>`;
  const img = new Image();
  img.alt = round.title;
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.onload = () => { frame.innerHTML = ""; frame.appendChild(img); };
  img.onerror = () => { frame.innerHTML = renderScene(round.scene); };
  img.src = round.image;
}

/* ---------------- Map click / guessing ---------------- */
const mapSvg = document.getElementById("map-svg");
mapSvg.addEventListener("click", (e) => {
  const pt = svgPoint(mapSvg, e.clientX, e.clientY);
  state.currentGuess = pt;
  clearPins("pins-layer");
  drawPin("pins-layer", pt.x, pt.y, "#ff8fa3");
  document.getElementById("btn-guess").disabled = false;
});

function svgPoint(svg, clientX, clientY){
  const rect = svg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * MAP_WIDTH;
  const y = ((clientY - rect.top) / rect.height) * MAP_HEIGHT;
  return { x, y };
}

function clearPins(groupId){
  document.getElementById(groupId).innerHTML = "";
}

function drawPin(groupId, x, y, color){
  const g = document.getElementById(groupId);
  const ns = "http://www.w3.org/2000/svg";
  // Position lives on this OUTER group's transform attribute. It must stay
  // free of any CSS `transform` (animation/class), because in SVG a CSS
  // `transform` on an element completely replaces its `transform` attribute
  // instead of combining with it — that was the bug causing pins to ignore
  // where you clicked.
  const outer = document.createElementNS(ns, "g");
  outer.setAttribute("transform", `translate(${x},${y})`);

  // The drop animation goes on this INNER group instead, so it animates
  // relative to (0,0) — which is now correctly the pinned point.
  const pin = document.createElementNS(ns, "g");
  pin.setAttribute("class", "pin");
  pin.innerHTML = `
    <path d="M0,-2 C8,-2 14,4 14,12 C14,22 0,34 0,34 C0,34 -14,22 -14,12 C-14,4 -8,-2 0,-2 Z"
          fill="${color}" stroke="rgba(10,6,20,0.6)" stroke-width="1.5" transform="translate(0,-30)"/>
    <circle cx="0" cy="-18" r="4.5" fill="rgba(10,6,20,0.75)"/>
  `;
  outer.appendChild(pin);
  g.appendChild(outer);
}

/* ---------------- Guess submission ---------------- */
document.getElementById("btn-guess").addEventListener("click", lockInGuess);

function lockInGuess(){
  const round = currentRound();
  const dx = state.currentGuess.x - round.x;
  const dy = state.currentGuess.y - round.y;
  const distanceUnits = Math.sqrt(dx * dx + dy * dy);
  const distanceMeters = distanceUnits * METERS_PER_UNIT;

  const points = scoreFromDistance(distanceMeters);

  state.roundScores.push(points);
  state.roundDistances.push(distanceMeters);
  state.totalScore += points;

  showReveal(round, state.currentGuess, distanceMeters, points);
}

function scoreFromDistance(distanceMeters){
  if(distanceMeters <= 60) return MAX_SCORE_PER_ROUND; // "perfect pin" tolerance
  const decay = 550; // controls how quickly points fall off with distance
  const score = MAX_SCORE_PER_ROUND * Math.exp(-distanceMeters / decay);
  return Math.max(0, Math.round(score / 10) * 10);
}

/* ---------------- Reveal screen ---------------- */
const revealLayer = "reveal-layer";

function showReveal(round, guess, distanceMeters, points){
  showScreen("reveal");

  document.getElementById("reveal-title").textContent = round.title;
  document.getElementById("reveal-fact").textContent = round.fact;
  document.getElementById("reveal-distance").textContent = formatDistance(distanceMeters);
  document.getElementById("reveal-points").textContent = "0";

  clearPins(revealLayer);
  const ns = "http://www.w3.org/2000/svg";
  const layer = document.getElementById(revealLayer);

  const line = document.createElementNS(ns, "line");
  line.setAttribute("x1", guess.x); line.setAttribute("y1", guess.y);
  line.setAttribute("x2", round.x); line.setAttribute("y2", round.y);
  line.setAttribute("class", "guess-line");
  layer.appendChild(line);

  drawPin(revealLayer, guess.x, guess.y, "#ff8fa3");
  drawPin(revealLayer, round.x, round.y, "#ffb347");

  animateCount(document.getElementById("reveal-points"), 0, points, 700);
}

function formatDistance(m){
  if(m < 60) return "Spot on!";
  if(m < 1000) return `${Math.round(m)} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

function animateCount(el, from, to, duration){
  const start = performance.now();
  function tick(now){
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if(t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.getElementById("btn-next").addEventListener("click", () => {
  state.roundIndex++;
  if(state.roundIndex >= ROUNDS.length){
    showEndScreen();
  } else {
    showScreen("game");
    loadRound();
  }
});

/* ---------------- End screen ---------------- */
function showEndScreen(){
  showScreen("end");
  sky.className = "night";

  const maxPossible = ROUNDS.length * MAX_SCORE_PER_ROUND;
  document.getElementById("end-score-max").textContent = maxPossible.toLocaleString();
  animateCount(document.getElementById("end-score"), 0, state.totalScore, 900);

  const bestIndex = state.roundScores.indexOf(Math.max(...state.roundScores));
  const bestRound = ROUNDS[state.order[bestIndex]];
  document.getElementById("stat-best").textContent = bestRound ? bestRound.title : "—";

  const avgDist = state.roundDistances.reduce((a,b) => a+b, 0) / state.roundDistances.length;
  document.getElementById("stat-avg-dist").textContent = formatDistance(avgDist).replace("Spot on!", "0 m");

  const perfectCount = state.roundScores.filter(s => s === MAX_SCORE_PER_ROUND).length;
  document.getElementById("stat-perfect").textContent = `${perfectCount} / ${ROUNDS.length}`;

  renderLeaderboard(state.totalScore);
}

function renderLeaderboard(playerScore){
  // Mock leaderboard: a spread of plausible scores so the player's
  // result lands somewhere realistic in the pack, not always #1.
  const mockNames = ["JiaHao", "PriyaK", "team_root", "nvm_ide", "hackrbay", "clueless.exe", "TeamOverflow"];
  const mockScores = mockNames.map(() =>
    Math.round((8000 + Math.random() * 20000) / 10) * 10
  );

  const entries = mockNames.map((name, i) => ({ name, score: mockScores[i], isYou: false }));
  entries.push({ name: "You", score: playerScore, isYou: true });
  entries.sort((a, b) => b.score - a.score);

  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";
  entries.forEach((entry, i) => {
    const li = document.createElement("li");
    if(entry.isYou) li.classList.add("is-you");
    li.innerHTML = `
      <span><span class="lb-rank">#${i + 1}</span>${entry.name}</span>
      <span class="lb-score">${entry.score.toLocaleString()}</span>
    `;
    list.appendChild(li);
  });
}

document.getElementById("btn-replay").addEventListener("click", startGame);

/* =========================================================
   Illustrated "photo" scenes — one distinct SVG per landmark.
   Swap any of these for `<img src="...">` later without
   touching game logic.
========================================================= */
function renderScene(key){
  const scenes = {
    supertrees: `
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a1f52"/><stop offset="55%" stop-color="#c1533f"/><stop offset="100%" stop-color="#ffb347"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g1)"/>
      <ellipse cx="200" cy="150" rx="90" ry="90" fill="#ffdca0" opacity="0.55"/>
      <g fill="#160c28">
        <path d="M120,300 L120,140 Q120,110 150,110 Q180,110 180,140 L180,165 Q180,185 205,185 L230,185" stroke="#160c28" stroke-width="6" fill="none"/>
        <circle cx="150" cy="100" r="30"/>
        <path d="M240,300 L240,170 Q240,145 265,145" stroke="#160c28" stroke-width="6" fill="none"/>
        <circle cx="265" cy="138" r="20"/>
        <path d="M300,300 L300,190 Q300,170 320,170" stroke="#160c28" stroke-width="6" fill="none"/>
        <circle cx="320" cy="163" r="15"/>
      </g>
    </svg>`,
    mbs: `
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#241539"/><stop offset="50%" stop-color="#b1503f"/><stop offset="100%" stop-color="#ffcf7d"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g2)"/>
      <rect x="0" y="230" width="400" height="70" fill="#20112f" opacity="0.85"/>
      <g fill="#140a20">
        <rect x="150" y="120" width="26" height="130"/>
        <rect x="188" y="95" width="26" height="155"/>
        <rect x="226" y="120" width="26" height="130"/>
        <path d="M140,120 Q200,70 264,120 L264,135 Q200,90 140,135 Z"/>
      </g>
      <rect x="0" y="270" width="400" height="30" fill="#0e0818" opacity="0.9"/>
    </svg>`,
    helix: `
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2b1846"/><stop offset="55%" stop-color="#c65a4a"/><stop offset="100%" stop-color="#ffcf7d"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g3)"/>
      <rect x="0" y="240" width="400" height="60" fill="#1b0f2c" opacity="0.85"/>
      <g fill="none" stroke="#140a20" stroke-width="5">
        <path d="M20,230 Q120,120 220,230"/>
        <path d="M60,230 Q160,150 260,230"/>
        <path d="M100,230 Q200,180 300,230"/>
        <line x1="20" y1="230" x2="360" y2="230" stroke-width="8"/>
      </g>
    </svg>`,
    merlion: `
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#33204d"/><stop offset="55%" stop-color="#d66148"/><stop offset="100%" stop-color="#ffd694"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g4)"/>
      <rect x="0" y="235" width="400" height="65" fill="#1c0f2e" opacity="0.85"/>
      <g fill="#150a24">
        <path d="M190,240 Q180,180 200,150 Q220,180 210,240 Z"/>
        <path d="M175,240 Q185,205 200,195 Q215,205 225,240 Z" opacity="0.001"/>
        <ellipse cx="200" cy="150" rx="18" ry="22"/>
        <path d="M180,150 Q170,120 185,110 Q195,120 190,145 Z"/>
        <path d="M215,240 Q260,235 275,255 Q250,260 215,250 Z"/>
      </g>
    </svg>`,
    artscience: `
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g5" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#291744"/><stop offset="55%" stop-color="#c65546"/><stop offset="100%" stop-color="#ffcf7d"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g5)"/>
      <rect x="0" y="245" width="400" height="55" fill="#1a0e2b" opacity="0.85"/>
      <g fill="#140a20">
        <path d="M200,245 Q120,245 100,180 Q150,210 200,200 Q250,210 300,180 Q280,245 200,245 Z"/>
        <path d="M200,200 Q190,150 200,120 Q210,150 200,200 Z"/>
        <path d="M160,205 Q155,160 175,130 Q185,165 175,205 Z"/>
        <path d="M240,205 Q245,160 225,130 Q215,165 225,205 Z"/>
      </g>
    </svg>`,
    esplanade: `
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g6" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#301c4a"/><stop offset="55%" stop-color="#c9583f"/><stop offset="100%" stop-color="#ffcf7d"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g6)"/>
      <rect x="0" y="240" width="400" height="60" fill="#190d2a" opacity="0.85"/>
      <g fill="#140a20">
        <circle cx="150" cy="200" r="55"/>
        <circle cx="255" cy="200" r="55"/>
        <g stroke="#301c4a" stroke-width="2">
          <line x1="150" y1="145" x2="150" y2="255"/>
          <line x1="120" y1="155" x2="180" y2="245"/>
          <line x1="180" y1="155" x2="120" y2="245"/>
          <line x1="255" y1="145" x2="255" y2="255"/>
          <line x1="225" y1="155" x2="285" y2="245"/>
          <line x1="285" y1="155" x2="225" y2="245"/>
        </g>
      </g>
    </svg>`
  };
  return scenes[key] || "";
}