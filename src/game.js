'use strict';
/* Fetch Chaos v0.1 — one-tap slingshot + chaotic dog physics
   Canvas 960x540. Pointer drag to aim, release to throw.
   Dog chases automatically, jumps, and plows through crate stacks.
   Score: knock stuff over, catch the ball, launch it far. 10 throws. */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 960, H = 540, GROUND = 480, GRAV = 1800;
const $ = id => document.getElementById(id);
const scoreEl = $('score'), throwEl = $('throwNum'), bestEl = $('best'), toastEl = $('toast');

let best = +(localStorage.getItem('fetchChaosBest') || 0);
bestEl.textContent = best;

let soundOn = true, audioCtx = null;
function beep(freq, dur, type, vol) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
const bark = () => { beep(320, .08, 'square', .06); setTimeout(() => beep(260, .09, 'square', .06), 70); };
const boing = () => beep(520, .07, 'sine', .05);
const crash = () => beep(120, .15, 'sawtooth', .07);

function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

const LAUNCH = { x: 110, y: GROUND - 20 };
let score, throwsLeft, throwNum, gameOver, aiming, aimPt, settling;

const ball = { x: LAUNCH.x, y: LAUNCH.y, vx: 0, vy: 0, r: 14, live: false, resting: 0, maxX: 0, caught: false };
const dog = { x: 55, y: GROUND, vx: 0, vy: 0, w: 74, h: 46, state: 'idle', face: 1, runPhase: 0, caughtBall: false };
let obstacles = [];

function makeStack() {
  obstacles = [];
  const baseX = rand(600, 660);
  const patterns = [
    // pyramid of crates
    () => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) addCrate(baseX + c * 50 + r * 25, GROUND - 25 - r * 50); addBottle(baseX + 50, GROUND - 175); },
    // tower
    () => { for (let r = 0; r < 4; r++) addCrate(baseX + 40, GROUND - 25 - r * 50); addBottle(baseX + 90, GROUND - 22); addBottle(baseX - 10, GROUND - 22); },
    // wall + bottles on top
    () => { for (let c = 0; c < 3; c++) { addCrate(baseX + c * 50, GROUND - 25); addCrate(baseX + c * 50, GROUND - 75); addBottle(baseX + c * 50 + 10, GROUND - 122); } },
  ];
  patterns[Math.floor(Math.random() * patterns.length)]();
}
function addCrate(x, y) { obstacles.push({ kind: 'crate', x, y, w: 48, h: 48, vx: 0, vy: 0, angle: 0, va: 0, knocked: false, dynamic: false }); }
function addBottle(x, y) { obstacles.push({ kind: 'bottle', x, y, w: 20, h: 46, vx: 0, vy: 0, angle: 0, va: 0, knocked: false, dynamic: false }); }

function resetThrow() {
  ball.x = LAUNCH.x; ball.y = LAUNCH.y; ball.vx = ball.vy = 0; ball.live = false; ball.resting = 0; ball.maxX = ball.x; ball.caught = false;
  dog.x = 55; dog.y = GROUND; dog.vx = dog.vy = 0; dog.state = 'idle'; dog.caughtBall = false;
  makeStack(); settling = 0; updateHud();
}
function newGame() {
  score = 0; throwsLeft = 10; throwNum = 1; gameOver = false; resetThrow(); toast('Drag to aim — release to throw! 🎾');
}
function updateHud() {
  scoreEl.textContent = score; throwEl.textContent = (gameOver ? '10' : throwNum) + '/10'; bestEl.textContent = best;
}
function endGame() {
  gameOver = true;
  if (score > best) { best = score; localStorage.setItem('fetchChaosBest', best); toast('🏆 New best: ' + best + '!'); }
  else toast('Game over! Score: ' + score);
  updateHud();
}

function launchPower() {
  if (!aimPt) return { vx: 0, vy: 0 };
  const dx = LAUNCH.x - aimPt.x, dy = LAUNCH.y - aimPt.y;
  return { vx: clamp(dx * 4.2, -200, 1500), vy: clamp(dy * 4.2, -1300, 600) };
}
function trajectory() {
  const p = launchPower(), pts = []; let x = LAUNCH.x, y = LAUNCH.y, vx = p.vx, vy = p.vy;
  for (let i = 0; i < 42; i++) { vy += GRAV * 0.045; x += vx * 0.045; y += vy * 0.045; if (y > GROUND) break; pts.push({ x, y }); }
  return pts;
}

function circleRectCollide(cx, cy, r, o) {
  const nx = clamp(cx, o.x - o.w / 2, o.x + o.w / 2), ny = clamp(cy, o.y - o.h / 2, o.y + o.h / 2);
  const dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy < r * r;
}
function wake(o, ix, iy) {
  if (!o.dynamic) { o.dynamic = true; crash(); }
  o.vx += ix; o.vy += iy; o.va += rand(-6, 6);
  if (!o.knocked && Math.abs(ix) + Math.abs(iy) > 60) {
    o.knocked = true; score += o.kind === 'bottle' ? 15 : 10; updateHud();
  }
}

function step(dt) {
  // ball
  if (ball.live) {
    ball.vy += GRAV * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.maxX = Math.max(ball.maxX, ball.x);
    if (ball.y > GROUND - ball.r) { ball.y = GROUND - ball.r; ball.vy *= -0.62; ball.vx *= 0.82; if (Math.abs(ball.vy) > 120) boing(); if (Math.abs(ball.vy) < 90) ball.vy = 0; }
    if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -0.6; }
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.6; }
    if (ball.vy === 0 && Math.abs(ball.vx) < 25) ball.resting += dt; else ball.resting = 0;
    for (const o of obstacles) if (circleRectCollide(ball.x, ball.y, ball.r, o)) { wake(o, ball.vx * 0.45, -80); ball.vx *= 0.55; ball.vy -= 60; }
  }
  // dog AI
  const targetX = ball.live ? ball.x : 55;
  if (ball.live && !dog.caughtBall) {
    dog.state = 'chase';
    const dx = targetX - dog.x;
    dog.vx = clamp(dx * 4, -520, 620); dog.face = dog.vx >= 0 ? 1 : -1;
    // jump if ball is high and close, or a crate is right ahead
    const obstacleAhead = obstacles.some(o => Math.abs(o.x - (dog.x + dog.face * 50)) < 42 && dog.y - o.y < 60);
    if (dog.y >= GROUND && ((ball.y < GROUND - 130 && Math.abs(dx) < 180) || obstacleAhead)) { dog.vy = -880; boing(); }
    // catch!
    if (Math.abs(ball.x - dog.x) < 38 && Math.abs(ball.y - (dog.y - 30)) < 52 && !ball.caught) {
      ball.caught = true; dog.caughtBall = true; score += 50; bark(); toast('🐾 CAUGHT IT! +50'); updateHud();
    }
  } else if (dog.caughtBall) {
    dog.state = 'return'; dog.vx = clamp((55 - dog.x) * 4, -480, 480); dog.face = dog.vx >= 0 ? 1 : -1;
    ball.x = dog.x + dog.face * 26; ball.y = dog.y - 28;
    if (Math.abs(dog.x - 55) < 12) { dog.caughtBall = false; ball.live = false; finishThrow(); }
  } else { dog.state = 'idle'; dog.vx *= 0.8; }
  dog.vy += GRAV * dt; dog.x += dog.vx * dt; dog.y += dog.vy * dt;
  if (dog.y > GROUND) { dog.y = GROUND; dog.vy = 0; }
  dog.x = clamp(dog.x, 30, W - 30); dog.runPhase += Math.abs(dog.vx) * dt * 0.05;
  // dog plows through obstacles
  if (dog.state === 'chase') for (const o of obstacles) {
    if (Math.abs(o.x - dog.x) < (o.w / 2 + 34) && dog.y - o.y < 56 && dog.y - o.y > -20) wake(o, dog.vx * 0.7, -160);
  }
  // obstacles physics (simple: fall, spin, settle on ground)
  for (const o of obstacles) {
    if (!o.dynamic) continue;
    o.vy += GRAV * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.angle += o.va * dt; o.vx *= 0.99; o.va *= 0.98;
    const floor = GROUND - o.h / 2 + (Math.abs(Math.sin(o.angle)) * o.w * 0.18);
    if (o.y > floor) { o.y = floor; o.vy *= -0.3; o.vx *= 0.7; if (Math.abs(o.vy) < 80) o.vy = 0; }
    if (o.x < o.w / 2) { o.x = o.w / 2; o.vx *= -0.5; } if (o.x > W - o.w / 2) { o.x = W - o.w / 2; o.vx *= -0.5; }
    if (!o.knocked && (Math.abs(o.angle) > 0.55)) { o.knocked = true; score += o.kind === 'bottle' ? 15 : 10; updateHud(); }
  }
  // end of throw: ball settled and dog done, or timeout settle
  if (ball.live && !dog.caughtBall && (ball.resting > 0.7)) {
    settling += dt;
    if (settling > 0.5) { score += Math.floor(ball.maxX / 25); finishThrow(); }
  }
}
function finishThrow() {
  if (gameOver) return;
  updateHud();
  throwsLeft--; throwNum++;
  if (throwsLeft <= 0) { endGame(); return; }
  setTimeout(resetThrow, 650);
}

// drawing
function drawDog() {
  const { x, y } = dog, f = dog.face, run = dog.state !== 'idle';
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
  const wag = Math.sin(performance.now() / 90) * 8;
  ctx.strokeStyle = '#b5792e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-30, -28); ctx.quadraticCurveTo(-46, -40 + wag, -50, -30 + wag); ctx.stroke(); // tail
  ctx.strokeStyle = '#d99a3d'; ctx.lineWidth = 7;
  const lp = run ? Math.sin(dog.runPhase) * 12 : 0;
  for (const [lx, ph] of [[-20, lp], [-8, -lp], [14, -lp], [26, lp]]) { ctx.beginPath(); ctx.moveTo(lx, -12); ctx.lineTo(lx + ph * 0.5, 0); ctx.stroke(); }
  ctx.fillStyle = '#e8a84c'; ctx.beginPath(); ctx.ellipse(0, -26, 36, 20, 0, 0, Math.PI * 2); ctx.fill(); // body
  ctx.beginPath(); ctx.arc(34, -40, 17, 0, Math.PI * 2); ctx.fill(); // head
  ctx.fillStyle = '#c47f28'; ctx.beginPath(); ctx.ellipse(28, -46, 8, 14, 0.5, 0, Math.PI * 2); ctx.fill(); // ear
  ctx.fillStyle = '#e8a84c'; ctx.beginPath(); ctx.ellipse(50, -36, 10, 7, 0, 0, Math.PI * 2); ctx.fill(); // snout
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(59, -38, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(38, -44, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff6b81'; ctx.fillRect(48, -30, 9, 5); // tongue
  if (dog.caughtBall) { ctx.fillStyle = '#b6e34d'; ctx.beginPath(); ctx.arc(58, -30, 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#7ec8f7'); sky.addColorStop(1, '#d8f3ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; for (const [cx, cy, s] of [[150, 70, 26], [420, 50, 20], [760, 80, 30]]) { ctx.beginPath(); ctx.arc(cx, cy, s, 0, 7); ctx.arc(cx + s, cy + 4, s * .7, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#58b368'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#4da75d'; for (let i = 0; i < W; i += 42) ctx.fillRect(i, GROUND, 22, 5);
  // launcher
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(LAUNCH.x - 6, LAUNCH.y, 12, GROUND - LAUNCH.y);
  // aim
  if (aiming && !ball.live && !gameOver) {
    ctx.strokeStyle = 'rgba(255,60,60,.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(LAUNCH.x, LAUNCH.y); ctx.lineTo(aimPt.x, aimPt.y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const p of trajectory()) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill(); }
  }
  // obstacles
  for (const o of obstacles) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle);
    if (o.kind === 'crate') {
      ctx.fillStyle = o.knocked ? '#a9743a' : '#c98a4b'; ctx.fillRect(-24, -24, 48, 48);
      ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4; ctx.strokeRect(-24, -24, 48, 48);
      ctx.beginPath(); ctx.moveTo(-24, -24); ctx.lineTo(24, 24); ctx.moveTo(24, -24); ctx.lineTo(-24, 24); ctx.stroke();
    } else {
      ctx.fillStyle = o.knocked ? '#7fb069' : '#95d475'; ctx.fillRect(-8, -23, 16, 46);
      ctx.fillRect(-4, -30, 8, 8); ctx.fillStyle = '#e63946'; ctx.fillRect(-4, -33, 8, 4);
    }
    ctx.restore();
  }
  // ball
  if (!dog.caughtBall) { ctx.fillStyle = '#b6e34d'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r - 3, 0.6, 2.2); ctx.stroke(); }
  drawDog();
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '900 52px system-ui'; ctx.fillText('🎉 Game Over!', W / 2, 215);
    ctx.font = '700 32px system-ui'; ctx.fillText('Score: ' + score + '   Best: ' + best, W / 2, 265);
    ctx.font = '500 20px system-ui'; ctx.fillText('Tap Restart to play again — or share your chaos!', W / 2, 305);
  } else if (!ball.live && !aiming) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.font = '700 22px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('👆 Drag to aim, release to throw!', W / 2, 52);
  }
}

// input (mouse + touch via pointer events)
function toGame(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
canvas.addEventListener('pointerdown', e => { if (ball.live || gameOver) return; aiming = true; aimPt = toGame(e); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (aiming) aimPt = toGame(e); });
canvas.addEventListener('pointerup', () => {
  if (!aiming) return; aiming = false;
  const p = launchPower();
  if (Math.abs(p.vx) + Math.abs(p.vy) > 120) { ball.vx = p.vx; ball.vy = p.vy; ball.live = true; bark(); }
  aimPt = null;
});
canvas.addEventListener('pointercancel', () => { aiming = false; aimPt = null; });

$('restartBtn').onclick = newGame;
$('soundBtn').onclick = e => { soundOn = !soundOn; e.target.textContent = soundOn ? '🔊 Sound' : '🔇 Muted'; };
$('shareBtn').onclick = async () => {
  const text = `🐕 I scored ${score} in Fetch Chaos! Think your dog can cause more chaos?`;
  try { if (navigator.share) await navigator.share({ title: 'Fetch Chaos', text }); else throw 0; }
  catch (e) { try { await navigator.clipboard.writeText(text); toast('Score copied — paste it anywhere! 📋'); } catch (_) { toast(text); } }
};

let last = performance.now();
function loop(now) { const dt = Math.min((now - last) / 1000, 0.033); last = now; if (!gameOver) step(dt); draw(); requestAnimationFrame(loop); }
newGame();
requestAnimationFrame(loop);
