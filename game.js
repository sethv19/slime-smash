// ══════════════════════════
// CONFIG
// ══════════════════════════
const TOTAL_ROUNDS  = 5;
const TOTAL_SLIMES  = 50;
const MIN_PER_ROUND = 3;
const MAX_SCORES    = 10;
const GREEN_V = {body:’#3fff6a’, dark:’#009e35’, eye:’#002a10’};
const PINK_V  = {body:’#ff3dbe’, dark:’#b5007c’, eye:’#2a0018’};

// ══════════════════════════
// STATE
// ══════════════════════════
let timerInt = null, t0 = 0, elapsed = 0;
let running  = false;
let round    = 0;          // 0-indexed, increments after each valid lock-in
let roundCounts = [];
let greens  = 0;           // greens left in current round — THE only lock-in gate
let locked  = false;       // brief cooldown between rounds

// ══════════════════════════
// ELEMENT REFS
// ══════════════════════════
const timerVal = document.getElementById(‘timer-val’);
const stackEl  = document.getElementById(‘stack-inner’);
const cbtn     = document.getElementById(‘cbtn’);
const flashEl  = document.getElementById(‘flash’);
const goScreen = document.getElementById(‘go-screen’);

// ══════════════════════════
// NAVIGATION
// ══════════════════════════
function showScreen(id){
document.querySelectorAll(’.screen’).forEach(s => s.classList.remove(‘active’));
document.getElementById(id).classList.add(‘active’);
}

document.querySelectorAll(’.tab’).forEach(tab => {
const handler = () => {
document.querySelectorAll(’.tab’).forEach(t => t.classList.remove(‘active’));
document.querySelectorAll(’.tab-panel’).forEach(p => p.classList.remove(‘active’));
tab.classList.add(‘active’);
document.getElementById(‘tab-’ + tab.dataset.tab).classList.add(‘active’);
if(tab.dataset.tab === ‘scores’) renderScores();
};
tab.addEventListener(‘touchend’, e => { e.preventDefault(); handler(); });
});

// ══════════════════════════
// SCORES
// ══════════════════════════
function getScores(){
try{ return JSON.parse(localStorage.getItem(‘slimesmash_scores’) || ‘[]’); }
catch(e){ return []; }
}
function saveScore(ms, rounds){
const scores = getScores();
scores.push({ms, rounds});
scores.sort((a, b) => {
const af = a.rounds >= TOTAL_ROUNDS, bf = b.rounds >= TOTAL_ROUNDS;
if(af && bf) return a.ms - b.ms;
if(af) return -1;
if(bf) return 1;
return b.rounds - a.rounds || a.ms - b.ms;
});
scores.splice(MAX_SCORES);
localStorage.setItem(‘slimesmash_scores’, JSON.stringify(scores));
}
function renderScores(){
const list = document.getElementById(‘score-list’);
const scores = getScores();
if(!scores.length){
list.innerHTML = ‘<div class="no-scores">No scores yet.<br>Play a round!</div>’;
return;
}
list.innerHTML = scores.map((s, i) => {
const cls   = i===0?‘rank-1’:i===1?‘rank-2’:i===2?‘rank-3’:‘rank-other’;
const medal = i===0?‘1st’:i===1?‘2nd’:i===2?‘3rd’:`${i+1}th`;
const lbl   = s.rounds >= TOTAL_ROUNDS ? ‘<span style="color:var(--green);font-weight:900;">WON</span>’ : `${s.rounds}/${TOTAL_ROUNDS}`;
return `<div class="score-row"> <div class="score-rank ${cls}">${medal}</div> <div class="score-time">${fmt(s.ms)}</div> <div class="score-rounds">${lbl}</div> </div>`;
}).join(’’);
}
document.getElementById(‘clear-btn’).addEventListener(‘touchend’, e => {
e.preventDefault();
localStorage.removeItem(‘slimesmash_scores’); renderScores();
});

// ══════════════════════════
// TIMER
// ══════════════════════════
function startTimer(){
t0 = performance.now() - elapsed;
timerInt = setInterval(() => {
elapsed = performance.now() - t0;
timerVal.textContent = (elapsed / 1000).toFixed(2);
}, 50);
}
function stopTimer(){ clearInterval(timerInt); }
function fmt(ms){ return (ms / 1000).toFixed(2) + ‘s’; }

// ══════════════════════════
// FLASH
// ══════════════════════════
function flash(c){ flashEl.className = ‘’; void flashEl.offsetWidth; flashEl.className = c; }

// ══════════════════════════
// SVG
// ══════════════════════════
function svgSlime(v){
return `<svg viewBox="0 0 70 60" xmlns="http://www.w3.org/2000/svg"> <ellipse cx="35" cy="57" rx="18" ry="4" fill="rgba(0,0,0,0.22)"/> <ellipse cx="35" cy="32" rx="26" ry="21" fill="${v.body}"/> <ellipse cx="20" cy="19" rx="11" ry="10" fill="${v.body}"/> <ellipse cx="35" cy="13" rx="12" ry="10" fill="${v.body}"/> <ellipse cx="50" cy="19" rx="11" ry="10" fill="${v.body}"/> <ellipse cx="27" cy="23" rx="9" ry="5.5" fill="rgba(255,255,255,.25)" transform="rotate(-15,27,23)"/> <circle cx="27" cy="33" r="7" fill="white"/><circle cx="43" cy="33" r="7" fill="white"/> <circle cx="28" cy="34" r="4" fill="${v.eye}"/><circle cx="44" cy="34" r="4" fill="${v.eye}"/> <circle cx="29" cy="32" r="1.6" fill="white"/><circle cx="45" cy="32" r="1.6" fill="white"/> <path d="M28 44 Q35 50 42 44" stroke="${v.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/> </svg>`;
}

// ══════════════════════════
// ROUND DISTRIBUTION
// ══════════════════════════
function generateRoundCounts(){
const counts = Array(TOTAL_ROUNDS).fill(MIN_PER_ROUND);
let rem = TOTAL_SLIMES - MIN_PER_ROUND * TOTAL_ROUNDS;
for(let i = 0; i < rem; i++) counts[Math.floor(Math.random() * TOTAL_ROUNDS)]++;
for(let i = counts.length - 1; i > 0; i–){
const j = Math.floor(Math.random() * (i + 1));
[counts[i], counts[j]] = [counts[j], counts[i]];
}
return counts;
}

// ══════════════════════════
// BUILD STACK
// ══════════════════════════
function buildStack(){
stackEl.innerHTML = ‘’;
locked = false;

const count = roundCounts[round];
greens = count;   // set AFTER clearing, right before building

const wrapH = document.getElementById(‘stack-wrap’).clientHeight;
const sz = Math.max(Math.min(Math.floor(wrapH / 3.0), 114), 50);

// Pink sits at the back (first in DOM = top of visual stack)
// Completely inert — tapping it does nothing
const pinkEl = document.createElement(‘div’);
pinkEl.className = ‘scard final’;
pinkEl.style.height = sz + ‘px’;
pinkEl.innerHTML = svgSlime(PINK_V);
pinkEl.style.pointerEvents = ‘none’;
stackEl.appendChild(pinkEl);

// Greens: last appended = bottom of visual stack
for(let i = 0; i < count; i++){
const el = document.createElement(‘div’);
el.className = ‘scard green-card’;
el.style.height = sz + ‘px’;
el.innerHTML = svgSlime(GREEN_V);
stackEl.appendChild(el);
}

wireBottom();

// Show tutorial hints on the very first round only
const hintL = document.getElementById(‘hint-left’);
const hintR = document.getElementById(‘hint-right’);
if(round === 0){
hintL.style.display = ‘flex’;
hintR.style.display = ‘none’; // right hint shows only when pink is last
} else {
hintL.style.display = ‘none’;
hintR.style.display = ‘none’;
}
}

// Always wire just the last .green-card that isn’t popping
function wireBottom(){
const cards = Array.from(stackEl.querySelectorAll(’.green-card:not(.popped)’));
if(!cards.length) return;
const bottom = cards[cards.length - 1];

const onTap = (e) => {
e.preventDefault();
if(!running) return;
greens–;
// Hide tutorial hint on first tap
document.getElementById(‘hint-left’).style.display = ‘none’;
// Show right hint when pink is the last one remaining (round 0 only)
if(greens === 0 && round === 0){
document.getElementById(‘hint-right’).style.display = ‘flex’;
}
bottom.classList.add(‘popped’);
bottom.addEventListener(‘animationend’, () => bottom.remove(), {once:true});
if(navigator.vibrate) navigator.vibrate(18);
wireBottom();
};

bottom.addEventListener(‘touchstart’, onTap, {once:true, passive:false});
}

// ══════════════════════════
// LOCK IN
// ══════════════════════════
cbtn.addEventListener(‘touchstart’, onLockIn, {passive:false});

function onLockIn(e){
e.preventDefault();
if(!running) return;
if(locked) return;

if(greens !== 0){
gameOver(‘You locked in too early!’);
return;
}

locked = true;
flash(‘good’);
if(navigator.vibrate) navigator.vibrate([18,10,18,10,30]);
round++;

if(round >= TOTAL_ROUNDS){
gameComplete();
return;
}

setTimeout(() => buildStack(), 120);
}

// ══════════════════════════
// GAME OVER
// ══════════════════════════
function gameOver(reason){
stopTimer();
running = false;
if(navigator.vibrate) navigator.vibrate([80,40,80,40,160]);
const splat = document.getElementById(‘splat’);
splat.classList.remove(‘active’);
void splat.offsetWidth;
splat.classList.add(‘active’);
const f = document.getElementById(‘field’);
f.classList.remove(‘shake’); void f.offsetWidth; f.classList.add(‘shake’);

saveScore(elapsed, round);
const scores  = getScores();
const myRank  = scores.findIndex(s => s.ms === elapsed && s.rounds === round);

setTimeout(() => {
document.getElementById(‘go-reason’).textContent = reason;
document.getElementById(‘go-time’).textContent   = fmt(elapsed);
document.getElementById(‘go-rounds’).textContent = round;
const gob = document.getElementById(‘go-best’);
if(myRank === 0 && round > 0){ gob.style.display=‘block’; gob.textContent=‘NEW BEST!’; }
else if(scores.length){ gob.style.display=‘block’; gob.textContent=`BEST  ${fmt(scores[0].ms)}`; }
else gob.style.display=‘none’;
goScreen.style.display = ‘flex’;
}, 340);
}

// ══════════════════════════
// GAME COMPLETE
// ══════════════════════════
function gameComplete(){
stopTimer();
running = false;
if(navigator.vibrate) navigator.vibrate([30,20,30,20,80,20,80]);

saveScore(elapsed, TOTAL_ROUNDS);
const scores = getScores();
const myRank = scores.findIndex(s => s.ms === elapsed && s.rounds === TOTAL_ROUNDS);

setTimeout(() => {
document.getElementById(‘go-reason’).textContent  = ‘You finished all 5 rounds!’;
document.getElementById(‘go-time’).textContent    = fmt(elapsed);
document.getElementById(‘go-rounds’).textContent  = TOTAL_ROUNDS + ’ / ’ + TOTAL_ROUNDS;
const gob = document.getElementById(‘go-best’);
if(myRank === 0){ gob.style.display=‘block’; gob.textContent=‘NEW BEST!’; }
else if(scores.length){ gob.style.display=‘block’; gob.textContent=`BEST  ${fmt(scores[0].ms)}`; }
else gob.style.display=‘none’;
document.getElementById(‘go-title’).textContent = ‘DONE!’;
document.getElementById(‘go-title’).style.color = ‘var(–green)’;
goScreen.style.display = ‘flex’;
}, 200);
}

// ══════════════════════════
// COUNTDOWN
// ══════════════════════════
function runCountdown(onDone){
const overlay = document.getElementById(‘countdown’);
const numEl   = document.getElementById(‘cd-num’);
const steps   = [‘3’,‘2’,‘1’,‘GO!’];
const colors  = [’#fff’,’#fff’,’#fff’,‘var(–green)’];
let i = 0;
overlay.classList.add(‘active’);

function tick(){
numEl.classList.remove(‘go’);
numEl.style.color = colors[i];
numEl.textContent = steps[i];
numEl.style.animation = ‘none’;
void numEl.offsetWidth;
numEl.style.animation = ‘’;
if(steps[i] === ‘GO!’) numEl.classList.add(‘go’);
if(navigator.vibrate) navigator.vibrate(i < 3 ? 30 : 60);
i++;
if(i < steps.length){
setTimeout(tick, 750);
} else {
setTimeout(() => { overlay.classList.remove(‘active’); onDone(); }, 750);
}
}
tick();
}

// ══════════════════════════
// START / RETRY / MENU
// ══════════════════════════
function startGame(){
goScreen.style.display = ‘none’;
document.getElementById(‘go-title’).textContent = ‘KO!’;
document.getElementById(‘go-title’).style.color = ‘’;
showScreen(‘game’);
elapsed = 0; round = 0; greens = 0; locked = false;
timerVal.textContent = ‘0.00’;
roundCounts = generateRoundCounts();
running = false;
buildStack();
runCountdown(() => { running = true; startTimer(); });
}

document.getElementById(‘play-btn’).addEventListener(‘touchend’, e => { e.preventDefault(); startGame(); });
document.getElementById(‘retry-btn’).addEventListener(‘touchend’, e => { e.preventDefault(); startGame(); });
document.getElementById(‘menu-btn’).addEventListener(‘touchend’, e => { e.preventDefault(); goToMenu(); });

function goToMenu(){
stopTimer();
running = false;
goScreen.style.display = ‘none’;
showScreen(‘menu’);
}