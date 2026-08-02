// Lets add these first
const ROUNDS = [

{
    title: "Marina Bay Sands",
    fact: "The SkyPark sits atop three 55-storey towers and holds the world's largest rooftop infinity pool, longer than three Olympic pools laid end to end.",
    x:404,
    y:240,
    image:"images/mbs.jpg"
},

{
    title:"Helix Bridge",
    fact:"The bridge's double-helix structure was inspired by the strands of DNA, symbolising life and continuity. It lights up in a different pattern every night.",
    x:491,
    y:98,
    image:"images/helix.jpeg"
},

{
    title:"ArtScience Museum",
    fact:"Shaped like a lotus flower with ten 'fingers', the museum's roof doubles as a rainwater collector, funnelling water into an indoor waterfall during storms.",
    x:544,
    y:293,
    image:"images/art-science.jpeg"
},

{
    title:"Merlion Park",
    fact:"The Merlion has stood watch over the bay since 1972 — half lion, half fish, representing Singapore's original name 'Singapura' (Lion City).",
    x:515,
    y:379,
    image:"images/merlion.jpeg"
},

{
    title:"Supertree Grove",
    fact:"The Supertrees stand up to 16 storeys tall and act as vertical gardens, collecting rainwater and generating solar power for the conservatories nearby.",
    x:495,
    y:298,
    image:"images/supertrees.jpeg"
},

{
    title:"Esplanade",
    fact:"Locals nicknamed it 'The Durian' for its spiky twin domes, designed to shade the concert halls inside from Singapore's harsh equatorial sun.",
    x:566,
    y:341,
    image:"images/esplanade.jpeg"
}

];

const MAX_SCORE_PER_ROUND = 5000;
const MAP_WIDTH = 800, MAP_HEIGHT = 500;

const METERS_PER_UNIT = 3.2;

let state = {
  order: [],
  roundIndex: 0,
  totalScore: 0,
  roundScores: [],
  roundDistances: [],
  currentGuess: null
};

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
  sky.className = ""; 
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

  if(state.roundIndex >= Math.ceil(ROUNDS.length * 0.66)) sky.className = "night";
  else if(state.roundIndex >= Math.ceil(ROUNDS.length * 0.33)) sky.className = "dusk";

  clearPins("pins-layer");
  document.getElementById("btn-guess").disabled = true;
}

function renderPhotoFrame(round){
  const frame = document.getElementById("photo-frame");
  if(!round.image){
    frame.innerHTML = renderScene(round);
    return;
  }
  frame.innerHTML = `<div class="photo-loading">Loading photo…</div>`;
  const img = new Image();
  img.alt = round.title;
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.onload = () => { frame.innerHTML = ""; frame.appendChild(img); };
  img.onerror = () => { frame.innerHTML = renderScene(round); };
  img.src = round.image;
}

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
  const outer = document.createElementNS(ns, "g");
  outer.setAttribute("transform", `translate(${x},${y})`);

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
  if(distanceMeters <= 60) return MAX_SCORE_PER_ROUND;
  const decay = 550; 
  const score = MAX_SCORE_PER_ROUND * Math.exp(-distanceMeters / decay);
  return Math.max(0, Math.round(score / 10) * 10);
}

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

function showEndScreen(){
  showScreen("end");
  sky.className = "night";

  const total = ROUNDS.length;
  const hits = state.roundScores.filter(s => s >= 1500).length;

  let headline, sub;
  if(hits === total){
    headline = "YAYYYYYY YOU GOT THEM ALLLL";
    sub = `${hits}/${total}, certified bay local fr`;
  } else if(hits >= total / 2){
    headline = "YAYYY YOU GOT MOST OF IT RIGHT";
    sub = `${hits}/${total}, ok that's actually kinda solid`;
  } else {
    headline = `${hits}/${total}... bestie`;
    sub = "go visit the place again pls HAHA";
  }

  document.querySelector("#screen-end .end-card").innerHTML = `
    <p class="eyebrow">${headline}</p>
    <div class="end-score">${state.totalScore.toLocaleString()}</div>
    <p class="end-score-max">${sub}</p>
    <button class="btn btn-primary" id="btn-replay">Play again</button>
  `;
  document.getElementById("btn-replay").addEventListener("click", startGame);
}

function renderScene(round) {
  return `
    <div class="photo-fallback">
      <p class="photo-fallback-title">Photo unavailable</p>
      <p class="photo-fallback-sub">${round.title}</p>
    </div>
  `;
}
