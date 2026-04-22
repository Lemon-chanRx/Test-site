// ==========================================================
// Seagull Snack Attack — a tiny arcade-style game for you <3
// ==========================================================

const scene      = document.querySelector('.game-scene');
const player     = document.getElementById('player');
const playfield  = document.getElementById('playfield');
const scoreEl    = document.getElementById('score');
const bestEl     = document.getElementById('best');
const livesEl    = document.getElementById('lives');
const startOv    = document.getElementById('start-overlay');
const pauseOv    = document.getElementById('pause-overlay');
const overOv     = document.getElementById('over-overlay');
const startBtn   = document.getElementById('start-btn');
const resumeBtn  = document.getElementById('resume-btn');
const againBtn   = document.getElementById('again-btn');
const finalScore = document.getElementById('final-score');
const finalMsg   = document.getElementById('final-msg');

// -------- game state --------
const state = {
  running: false,
  paused: false,
  score: 0,
  lives: 3,
  best: Number(localStorage.getItem('seagullBest') || 0),
  playerX: 0.5,        // normalized 0..1
  items: [],
  spawnTimer: 0,
  elapsed: 0,
  difficulty: 1,
  magnetUntil: 0,
  lastTs: 0,
  keys: { left: false, right: false },
  targetX: null,       // pointer target
};

bestEl.textContent = state.best;

// -------- item catalog --------
const ITEMS = [
  { kind: 'fish',  emoji: '🐟', points:  10, bad: false, weight: 50, speed: 1.0, size: 36 },
  { kind: 'fries', emoji: '🍟', points:  25, bad: false, weight: 22, speed: 1.1, size: 40 },
  { kind: 'star',  emoji: '⭐', points: 100, bad: false, weight:  4, speed: 0.9, size: 44, magnet: true },
  { kind: 'crab',  emoji: '🦀', points:   0, bad: true,  weight: 18, speed: 1.2, size: 38 },
  { kind: 'ball',  emoji: '🏐', points:   0, bad: true,  weight:  6, speed: 1.5, size: 40 },
];

function rollItem() {
  const total = ITEMS.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of ITEMS) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return ITEMS[0];
}

// -------- setup --------
function resetGame() {
  state.running = true;
  state.paused = false;
  state.score = 0;
  state.lives = 3;
  state.playerX = 0.5;
  state.items.forEach(i => i.el.remove());
  state.items.length = 0;
  state.spawnTimer = 0;
  state.elapsed = 0;
  state.difficulty = 1;
  state.magnetUntil = 0;
  state.targetX = null;
  player.classList.remove('magnet', 'hit');
  updateHud();
  placePlayer();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = '❤'.repeat(Math.max(0, state.lives)) || '—';
  bestEl.textContent = state.best;
}

function placePlayer() {
  const w = scene.clientWidth;
  const pad = 60;
  const x = pad + state.playerX * (w - pad * 2);
  player.style.left = x + 'px';
}

// -------- spawning --------
function spawnItem() {
  const it = rollItem();
  const w = scene.clientWidth;
  const el = document.createElement('div');
  el.className = 'item' + (it.kind === 'star' ? ' star' : '');
  el.textContent = it.emoji;
  el.style.left = (Math.random() * (w - 40)) + 'px';
  el.style.top = '-50px';
  el.style.fontSize = it.size + 'px';
  playfield.appendChild(el);

  const drift = (Math.random() - 0.5) * 40; // px/sec horizontal
  const baseSpeed = 120 + Math.random() * 80;
  state.items.push({
    ...it, el,
    x: parseFloat(el.style.left),
    y: -50,
    vx: drift,
    vy: baseSpeed * it.speed * state.difficulty,
  });
}

// -------- popups --------
function showPopup(text, x, y, cls = '') {
  const p = document.createElement('div');
  p.className = 'popup ' + cls;
  p.textContent = text;
  p.style.left = x + 'px';
  p.style.top  = y + 'px';
  playfield.appendChild(p);
  setTimeout(() => p.remove(), 900);
}

// -------- collisions --------
function playerRect() {
  const r = player.getBoundingClientRect();
  const s = scene.getBoundingClientRect();
  return {
    left:   r.left   - s.left + 18,
    right:  r.right  - s.left - 18,
    top:    r.top    - s.top  + 14,
    bottom: r.bottom - s.top  - 12,
    cx:     r.left   - s.left + r.width / 2,
    cy:     r.top    - s.top  + r.height / 2,
  };
}

function hitsPlayer(item, pr) {
  const ir = item.el.getBoundingClientRect();
  const s  = scene.getBoundingClientRect();
  const left   = ir.left - s.left;
  const top    = ir.top  - s.top;
  const right  = left + ir.width;
  const bottom = top  + ir.height;
  return !(right < pr.left || left > pr.right || bottom < pr.top || top > pr.bottom);
}

// -------- main loop --------
function loop(ts) {
  if (!state.running) return;
  if (!state.lastTs) state.lastTs = ts;
  const dt = Math.min(40, ts - state.lastTs) / 1000;
  state.lastTs = ts;

  if (!state.paused) tick(dt);
  requestAnimationFrame(loop);
}

function tick(dt) {
  state.elapsed += dt;
  state.difficulty = 1 + state.elapsed / 45;           // ramps up over time

  // player movement
  const speed = 1.6;                                    // normalized units / sec
  if (state.targetX !== null) {
    const diff = state.targetX - state.playerX;
    state.playerX += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    if (Math.abs(diff) < 0.005) state.targetX = null;
  } else {
    if (state.keys.left)  state.playerX -= speed * dt;
    if (state.keys.right) state.playerX += speed * dt;
  }
  state.playerX = Math.max(0, Math.min(1, state.playerX));
  placePlayer();

  // spawn
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnItem();
    state.spawnTimer = Math.max(0.25, 0.9 / state.difficulty);
  }

  // magnet
  const magnetActive = state.elapsed < state.magnetUntil;
  player.classList.toggle('magnet', magnetActive);

  const pr = playerRect();

  // move items
  const h = scene.clientHeight;
  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];

    if (magnetActive && !it.bad) {
      const ir = it.el.getBoundingClientRect();
      const s  = scene.getBoundingClientRect();
      const cx = ir.left - s.left + ir.width / 2;
      const cy = ir.top  - s.top  + ir.height / 2;
      const dx = pr.cx - cx;
      const dy = pr.cy - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = 380;
      it.vx += (dx / dist) * pull * dt;
      it.vy += (dy / dist) * pull * dt;
    }

    it.x += it.vx * dt;
    it.y += it.vy * dt;
    it.el.style.left = it.x + 'px';
    it.el.style.top  = it.y + 'px';

    // collision
    if (hitsPlayer(it, pr)) {
      if (it.bad) {
        state.lives -= 1;
        player.classList.add('hit');
        setTimeout(() => player.classList.remove('hit'), 450);
        showPopup('–1 ❤', it.x, it.y, 'bad');
      } else {
        state.score += it.points;
        if (it.magnet) {
          state.magnetUntil = state.elapsed + 5;
          showPopup('+' + it.points + '  MAGNET!', it.x, it.y, 'big');
        } else {
          showPopup('+' + it.points, it.x, it.y);
        }
      }
      it.el.remove();
      state.items.splice(i, 1);
      updateHud();
      if (state.lives <= 0) return gameOver();
      continue;
    }

    // off-screen cleanup
    if (it.y > h + 60 || it.x < -120 || it.x > scene.clientWidth + 120) {
      it.el.remove();
      state.items.splice(i, 1);
    }
  }
}

function gameOver() {
  state.running = false;
  scene.classList.add('over');
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('seagullBest', state.best);
  }
  finalScore.textContent = state.score;
  finalMsg.textContent = pickMessage(state.score);
  updateHud();
  overOv.classList.remove('hidden');
}

function pickMessage(score) {
  if (score === 0)     return "The crabs won this round. Try again!";
  if (score < 100)     return "A humble snack. The tide is still rising.";
  if (score < 300)     return "Nicely done — feathers ruffled but proud.";
  if (score < 600)     return "A true beach bandit!";
  if (score < 1000)    return "Majestic. The sea salutes you.";
  return "Legend of the Shore. The seagull council bows to you.";
}

// -------- input --------
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') state.keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.keys.right = true;
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'r' || e.key === 'R') {
    if (!overOv.classList.contains('hidden') || state.running) {
      overOv.classList.add('hidden');
      pauseOv.classList.add('hidden');
      scene.classList.remove('paused', 'over');
      resetGame();
      state.lastTs = 0;
      requestAnimationFrame(loop);
    }
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') state.keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.keys.right = false;
});

function pointerToX(ev) {
  const rect = scene.getBoundingClientRect();
  const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
  const pad = 60;
  return Math.max(0, Math.min(1, (x - pad) / (rect.width - pad * 2)));
}
scene.addEventListener('pointermove', (ev) => {
  if (!state.running || state.paused) return;
  state.targetX = pointerToX(ev);
});
scene.addEventListener('touchmove', (ev) => {
  if (!state.running || state.paused) return;
  state.targetX = pointerToX(ev);
  ev.preventDefault();
}, { passive: false });

// -------- overlay buttons --------
function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseOv.classList.toggle('hidden', !state.paused);
  scene.classList.toggle('paused', state.paused);
  if (!state.paused) state.lastTs = 0;
}

startBtn.addEventListener('click', () => {
  startOv.classList.add('hidden');
  resetGame();
  state.lastTs = 0;
  requestAnimationFrame(loop);
});
resumeBtn.addEventListener('click', togglePause);
againBtn.addEventListener('click', () => {
  overOv.classList.add('hidden');
  scene.classList.remove('over');
  resetGame();
  state.lastTs = 0;
  requestAnimationFrame(loop);
});

// Keep player position valid if the window resizes
window.addEventListener('resize', placePlayer);
placePlayer();
