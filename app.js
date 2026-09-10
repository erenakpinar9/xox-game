(() => {
  'use strict';

  /* ---------------------------------------------------------------
     Varyant tanımları
  --------------------------------------------------------------- */
  const VARIANTS = {
    classic:  { size: 3, winLen: 3, vanish: false, misere: false, ultimate: false,
                hint: 'Tanıdık 3×3 tahta — sırayla oynayın, ilk 3 sırayı yapan kazanır.' },
    grid4:    { size: 4, winLen: 4, vanish: false, misere: false, ultimate: false,
                hint: '4×4 tahta üstünde 4 taşı art arda dizen kazanır. Daha geniş strateji alanı.' },
    grid5:    { size: 5, winLen: 4, vanish: false, misere: false, ultimate: false,
                hint: '5×5 tahtada 4 taşı art arda dizmek yeterli — 5 sıraya gerek yok, tempo önemli.' },
    vanish:   { size: 3, winLen: 3, vanish: true, misere: false, ultimate: false,
                hint: 'Her oyuncunun tahtada en fazla 3 taşı kalır — 4. taşı koyunca en eski taşın kaybolur. Tahta hiç dolmaz, beraberlik yok: biri kazanana kadar oynanır.' },
    misere:   { size: 3, winLen: 3, vanish: false, misere: true, ultimate: false,
                hint: 'Kurallar aynı, kazanan ters: 3 sırayı ilk tamamlayan kaybeder. Rakibini "kazanmaya" zorla.' },
    ultimate: { size: 3, winLen: 3, vanish: false, misere: false, ultimate: true,
                hint: '9 küçük tahtadan oluşan meta oyun. Oynadığın hücre, rakibin oynayacağı mini tahtayı belirler.' },
  };

  const cellPoint = (i, n) => {
    const cellSize = 300 / n;
    return { x: cellSize / 2 + (i % n) * cellSize, y: cellSize / 2 + Math.floor(i / n) * cellSize };
  };

  /* ---------------------------------------------------------------
     DOM referansları
  --------------------------------------------------------------- */
  const el = {
    themeBtn: document.getElementById('themeBtn'),

    menuScreen: document.getElementById('menuScreen'),
    gameScreen: document.getElementById('gameScreen'),

    variantGrid: document.getElementById('variantGrid'),
    variantCards: document.querySelectorAll('[data-variant]'),
    variantHint: document.getElementById('variantHint'),

    modeButtons: document.querySelectorAll('[data-mode]'),
    difficultyGroup: document.getElementById('difficultyGroup'),
    difficultyButtons: document.querySelectorAll('[data-difficulty]'),
    nameX: document.getElementById('nameX'),
    nameO: document.getElementById('nameO'),
    fieldO: document.getElementById('fieldO'),
    startBtn: document.getElementById('startBtn'),
    menuHint: document.getElementById('menuHint'),

    timerToggle: document.getElementById('timerToggle'),
    timerSecondsGroup: document.getElementById('timerSecondsGroup'),
    timerSecondsButtons: document.querySelectorAll('[data-seconds]'),

    scoreXName: document.getElementById('scoreXName'),
    scoreOName: document.getElementById('scoreOName'),
    scoreXValue: document.getElementById('scoreXValue'),
    scoreOValue: document.getElementById('scoreOValue'),
    scoreDraw: document.getElementById('scoreDraw'),

    turnStrip: document.getElementById('turnStrip'),
    turnText: document.getElementById('turnText'),
    turnTimer: document.getElementById('turnTimer'),

    vanishBadge: document.getElementById('vanishBadge'),

    boardWrap: document.getElementById('boardWrap'),
    board: document.getElementById('board'),
    winLinePath: document.getElementById('winLinePath'),

    undoBtn: document.getElementById('undoBtn'),
    soundBtn: document.getElementById('soundBtn'),
    menuBtn: document.getElementById('menuBtn'),
    restartBtn: document.getElementById('restartBtn'),

    resultOverlay: document.getElementById('resultOverlay'),
    resultEyebrow: document.getElementById('resultEyebrow'),
    resultTitle: document.getElementById('resultTitle'),
    resultMenuBtn: document.getElementById('resultMenuBtn'),
    resultNextBtn: document.getElementById('resultNextBtn'),
    confetti: document.getElementById('confetti'),
  };

  /* ---------------------------------------------------------------
     Oyun durumu
  --------------------------------------------------------------- */
  const state = {
    variant: 'classic',
    mode: 'pvp',            // 'pvp' | 'ai'
    difficulty: 'medium',   // 'easy' | 'medium' | 'hard'
    nameX: 'Oyuncu 1',
    nameO: 'Oyuncu 2',

    // klasik/grid/vanish/misère motoru
    n: 3,
    winLen: 3,
    board: Array(9).fill(null),

    // ultimate motoru
    subBoards: [],      // 9 x (n*n) mini tahta
    subWinners: [],      // 9 eleman: null | 'X' | 'O' | 'draw'
    activeSub: null,      // null = herhangi bir yerde oyna

    // vanish (sınırsız) motoru: her oyuncunun tahtadaki taşlarının
    // konma sırası — en eski taş, ilk elemandır (FIFO kuyruk)
    vanishQueues: { X: [], O: [] },
    vanishMaxPieces: 3,

    current: 'X',
    active: false,
    scores: { X: 0, O: 0, draw: 0 },
    soundOn: true,

    timerOn: false,
    timerSeconds: 10,
    timerRemaining: 10,
    timerHandle: null,

    history: [],          // undo için anlık durum yığını
  };

  /* ---------------------------------------------------------------
     Tema
  --------------------------------------------------------------- */
  const THEMES = ['neon', 'sunset', 'forest', 'mono'];
  function loadTheme() {
    try {
      const saved = localStorage.getItem('xox_theme');
      if (saved && THEMES.includes(saved)) applyTheme(saved);
    } catch (err) { /* localStorage yoksa sessizce geç */ }
  }
  function applyTheme(name) {
    if (name === 'neon') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('xox_theme', name); } catch (err) { /* geç */ }
  }
  el.themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'neon';
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    applyTheme(next);
  });
  loadTheme();

  /* ---------------------------------------------------------------
     Kalıcı skor tablosu (localStorage)
  --------------------------------------------------------------- */
  function scoreKey() { return `xox_scores_${state.variant}_${state.mode}`; }
  function loadScores() {
    try {
      const raw = localStorage.getItem(scoreKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.X === 'number') return parsed;
      }
    } catch (err) { /* geç */ }
    return { X: 0, O: 0, draw: 0 };
  }
  function saveScores() {
    try { localStorage.setItem(scoreKey(), JSON.stringify(state.scores)); } catch (err) { /* geç */ }
  }

  /* ---------------------------------------------------------------
     Basit ses sentezleyici (dosya gerektirmez)
  --------------------------------------------------------------- */
  let audioCtx = null;
  function beep(freq, duration, type = 'sine', gain = 0.05) {
    if (!state.soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(audioCtx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) { /* ses yoksa sessizce geç */ }
  }
  const sfx = {
    x: () => beep(520, 0.12, 'triangle'),
    o: () => beep(360, 0.12, 'triangle'),
    win: () => { beep(660, 0.14, 'square', 0.04); setTimeout(() => beep(880, 0.22, 'square', 0.04), 110); },
    draw: () => beep(220, 0.3, 'sine', 0.04),
    tick: () => beep(880, 0.05, 'square', 0.02),
    timeout: () => beep(180, 0.22, 'sawtooth', 0.05),
  };

  /* ---------------------------------------------------------------
     Menü etkileşimleri — Varyant seçimi
  --------------------------------------------------------------- */
  el.variantCards.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.variantCards.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      state.variant = btn.dataset.variant;
      el.variantHint.textContent = VARIANTS[state.variant].hint;
    });
  });

  el.modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.modeButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      state.mode = btn.dataset.mode;

      const isAi = state.mode === 'ai';
      el.difficultyGroup.hidden = !isAi;
      el.fieldO.classList.toggle('is-disabled', isAi);
      if (isAi) el.nameO.value = '';
    });
  });

  el.difficultyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.difficultyButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      state.difficulty = btn.dataset.difficulty;
    });
  });

  el.timerToggle.addEventListener('change', () => {
    state.timerOn = el.timerToggle.checked;
    el.timerSecondsGroup.hidden = !state.timerOn;
  });
  el.timerSecondsButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.timerSecondsButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.timerSeconds = Number(btn.dataset.seconds);
    });
  });

  el.startBtn.addEventListener('click', () => {
    state.nameX = el.nameX.value.trim() || 'Oyuncu 1';
    state.nameO = state.mode === 'ai' ? 'Bilgisayar' : (el.nameO.value.trim() || 'Oyuncu 2');

    const v = VARIANTS[state.variant];
    state.n = v.size;
    state.winLen = v.winLen;
    state.scores = loadScores();

    el.scoreXName.textContent = state.nameX;
    el.scoreOName.textContent = state.nameO;
    updateScoreboard();

    el.boardWrap.classList.toggle('board-wrap--ultimate', v.ultimate);

    el.menuScreen.hidden = true;
    el.gameScreen.hidden = false;
    newRound();
  });

  el.menuBtn.addEventListener('click', backToMenu);
  el.resultMenuBtn.addEventListener('click', backToMenu);
  el.restartBtn.addEventListener('click', () => { hideResult(); newRound(); });
  el.resultNextBtn.addEventListener('click', () => { hideResult(); newRound(); });
  el.undoBtn.addEventListener('click', undoMove);

  el.soundBtn.addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    el.soundBtn.textContent = state.soundOn ? 'Ses açık' : 'Ses kapalı';
    el.soundBtn.setAttribute('aria-pressed', String(state.soundOn));
  });

  function backToMenu() {
    stopTimer();
    hideResult();
    el.gameScreen.hidden = true;
    el.menuScreen.hidden = false;
  }

  /* ---------------------------------------------------------------
     Tur / tahta yönetimi
  --------------------------------------------------------------- */
  function newRound() {
    const v = VARIANTS[state.variant];
    state.current = 'X';
    state.active = true;
    state.vanishQueues = { X: [], O: [] };
    state.history = [];
    el.undoBtn.disabled = true;
    el.vanishBadge.hidden = !v.vanish;

    if (v.ultimate) {
      state.subBoards = Array.from({ length: 9 }, () => Array(9).fill(null));
      state.subWinners = Array(9).fill(null);
      state.activeSub = null;
      renderUltimateBoard();
    } else {
      state.board = Array(state.n * state.n).fill(null);
      renderBoard();
    }

    updateTurnStrip();
    startTimer();
  }

  function snapshotState() {
    const v = VARIANTS[state.variant];
    if (v.ultimate) {
      return {
        subBoards: state.subBoards.map((b) => b.slice()),
        subWinners: state.subWinners.slice(),
        activeSub: state.activeSub,
        current: state.current,
      };
    }
    return {
      board: state.board.slice(),
      current: state.current,
      vanishQueues: { X: state.vanishQueues.X.slice(), O: state.vanishQueues.O.slice() },
    };
  }

  function pushHistory() {
    state.history.push(snapshotState());
    el.undoBtn.disabled = state.history.length === 0 || state.mode === 'ai';
  }

  function undoMove() {
    if (!state.history.length || !state.active) return;
    // AI modunda geri alma iki hamleyi (oyuncu + AI) birlikte geri alır
    const stepsBack = state.mode === 'ai' ? Math.min(2, state.history.length) : 1;
    let snap = null;
    for (let i = 0; i < stepsBack; i++) snap = state.history.pop();

    const v = VARIANTS[state.variant];
    if (v.ultimate) {
      state.subBoards = snap.subBoards;
      state.subWinners = snap.subWinners;
      state.activeSub = snap.activeSub;
      state.current = snap.current;
      renderUltimateBoard();
    } else {
      state.board = snap.board;
      state.current = snap.current;
      state.vanishQueues = snap.vanishQueues;
      renderBoard();
    }
    el.winLinePath.classList.remove('is-active');
    updateTurnStrip();
    resetTimer();
    el.undoBtn.disabled = state.history.length === 0;
  }

  function renderBoard() {
    const v = VARIANTS[state.variant];
    el.board.className = 'board';
    if (state.n === 4) el.board.classList.add('board--grid4');
    if (state.n === 5) el.board.classList.add('board--grid5');

    el.board.innerHTML = '';
    state.board.forEach((mark, i) => {
      const n = state.n;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(i);
      cell.setAttribute('aria-label', `${Math.floor(i / n) + 1}. satır, ${(i % n) + 1}. sütun`);
      if (mark) {
        cell.appendChild(markNode(mark));
        cell.disabled = true;
      }
      cell.addEventListener('click', () => handleCellClick(i));
      el.board.appendChild(cell);
    });
    el.winLinePath.classList.remove('is-active');
    if (v.vanish) markNextToVanish(state.current);
  }

  function markNode(mark) {
    const span = document.createElement('span');
    if (mark === 'X') {
      span.className = 'mark--x';
      span.innerHTML = `<svg viewBox="0 0 44 44"><path d="M6 6 L38 38"/><path d="M38 6 L6 38"/></svg>`;
    } else {
      span.className = 'mark--o';
      span.innerHTML = `<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="15"/></svg>`;
    }
    return span;
  }

  function handleCellClick(index) {
    if (!state.active || state.board[index]) return;
    if (state.mode === 'ai' && state.current === 'O') return; // sıra bilgisayarda

    playMove(index, state.current);
  }

  function playMove(index, mark) {
    pushHistory();
    stopTimer();

    const v = VARIANTS[state.variant];
    let vanishedIndex = null;

    if (v.vanish) {
      const queue = state.vanishQueues[mark];
      queue.push(index);
      if (queue.length > state.vanishMaxPieces) {
        vanishedIndex = queue.shift();
        state.board[vanishedIndex] = null;
        const vanishedCellEl = el.board.children[vanishedIndex];
        if (vanishedCellEl) { vanishedCellEl.innerHTML = ''; vanishedCellEl.disabled = false; }
      }
    }

    state.board[index] = mark;
    const cellEl = el.board.children[index];
    cellEl.innerHTML = '';
    cellEl.appendChild(markNode(mark));
    cellEl.disabled = true;
    if (v.vanish) {
      document.querySelectorAll('.cell.is-newest').forEach((c) => c.classList.remove('is-newest'));
      cellEl.classList.add('is-newest');
      markNextToVanish(mark === 'X' ? 'O' : 'X');
    }
    mark === 'X' ? sfx.x() : sfx.o();

    const winLine = findWinLine(state.board, mark, state.n, state.winLen);
    const boardFull = state.board.every(Boolean);

    if (winLine) {
      if (v.misere) {
        // Misère: sırayı tamamlayan kaybeder — rakip kazanır
        const winner = mark === 'X' ? 'O' : 'X';
        finishRound('win', winner, winLine, true);
      } else {
        finishRound('win', mark, winLine);
      }
      return;
    }
    // Vanish modda tahta hiçbir zaman dolmaz (her oyuncu en fazla 3 taş
    // tutar), bu yüzden beraberlik kontrolüne gerek yok.
    if (!v.vanish && boardFull) {
      finishRound('draw');
      return;
    }

    state.current = mark === 'X' ? 'O' : 'X';
    updateTurnStrip();
    startTimer();

    if (state.active && state.mode === 'ai' && state.current === 'O') {
      el.board.classList.add('is-thinking');
      setTimeout(() => {
        const move = aiChooseMove(state.board, state.difficulty, state.n, state.winLen, v.misere, v.vanish, state.vanishQueues, state.vanishMaxPieces);
        if (move != null && state.active) {
          el.board.classList.remove('is-thinking');
          playMove(move, 'O');
        }
      }, 420);
    }
  }

  // Vanish modda, verilen oyuncunun 3 taşı doluysa (yani bir sonraki
  // hamlesinde en eski taşı kaybolacaksa) o hücreyi görsel olarak işaretler.
  function markNextToVanish(playerMark) {
    document.querySelectorAll('.cell.will-vanish').forEach((c) => c.classList.remove('will-vanish'));
    const queue = state.vanishQueues[playerMark];
    if (queue.length >= state.vanishMaxPieces) {
      const oldestIndex = queue[0];
      const oldestCell = el.board.children[oldestIndex];
      if (oldestCell) oldestCell.classList.add('will-vanish');
    }
  }

  function findWinLine(board, mark, n, winLen) {
    return computeWinLines(n, winLen).find((line) => line.every((i) => board[i] === mark)) || null;
  }

  // n boyutlu tahtada winLen uzunluğundaki tüm olası kazanma çizgilerini hesaplar (cache'li)
  const winLinesCache = new Map();
  function computeWinLines(n, winLen) {
    const key = `${n}-${winLen}`;
    if (winLinesCache.has(key)) return winLinesCache.get(key);

    const lines = [];
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        for (const [dr, dc] of dirs) {
          const cells = [];
          for (let k = 0; k < winLen; k++) {
            const rr = r + dr * k, cc = c + dc * k;
            if (rr < 0 || rr >= n || cc < 0 || cc >= n) { cells.length = 0; break; }
            cells.push(rr * n + cc);
          }
          if (cells.length === winLen) lines.push(cells);
        }
      }
    }
    winLinesCache.set(key, lines);
    return lines;
  }

  function finishRound(kind, mark, winLine, isMisereFlip) {
    state.active = false;
    stopTimer();

    if (kind === 'win') {
      state.scores[mark]++;
      if (winLine) {
        winLine.forEach((i) => el.board.children[i] && el.board.children[i].classList.add('is-win'));
        drawWinLine(winLine);
      }
      sfx.win();
      updateScoreboard();
      saveScores();
      launchConfetti();
      const winnerName = mark === 'X' ? state.nameX : state.nameO;
      const eyebrow = isMisereFlip ? 'Misère — rakip 3 sıra yaptı!' : 'El bitti';
      showResult(eyebrow, `${winnerName} kazandı`);
    } else {
      state.scores.draw++;
      sfx.draw();
      updateScoreboard();
      saveScores();
      showResult('El bitti', 'Berabere');
    }
  }

  function drawWinLine(line) {
    const n = state.n;
    const start = cellPoint(line[0], n);
    const end = cellPoint(line[line.length - 1], n);
    el.winLinePath.setAttribute('x1', start.x);
    el.winLinePath.setAttribute('y1', start.y);
    el.winLinePath.setAttribute('x2', end.x);
    el.winLinePath.setAttribute('y2', end.y);
    void el.winLinePath.getBoundingClientRect();
    el.winLinePath.classList.add('is-active');
  }

  function updateTurnStrip() {
    const name = state.current === 'X' ? state.nameX : state.nameO;
    const isAiTurn = state.mode === 'ai' && state.current === 'O';
    el.turnText.textContent = isAiTurn
      ? `${name} düşünüyor…`
      : `Sıra ${name}'de`;
    el.turnStrip.classList.toggle('is-o', state.current === 'O');
  }

  function updateScoreboard() {
    el.scoreXValue.textContent = String(state.scores.X);
    el.scoreOValue.textContent = String(state.scores.O);
    el.scoreDraw.textContent = String(state.scores.draw);
  }

  function showResult(eyebrow, title) {
    el.resultEyebrow.textContent = eyebrow;
    el.resultTitle.textContent = title;
    el.resultOverlay.hidden = false;
  }
  function hideResult() {
    el.resultOverlay.hidden = true;
    const ctx = el.confetti.getContext('2d');
    ctx && ctx.clearRect(0, 0, el.confetti.width, el.confetti.height);
  }

  /* ---------------------------------------------------------------
     Zamanlayıcı (hamle başına süre sınırı)
  --------------------------------------------------------------- */
  function startTimer() {
    stopTimer();
    if (!state.timerOn || !state.active) { el.turnTimer.hidden = true; return; }
    // AI'nın sırasında zamanlayıcı çalıştırma
    if (state.mode === 'ai' && state.current === 'O') { el.turnTimer.hidden = true; return; }

    state.timerRemaining = state.timerSeconds;
    el.turnTimer.hidden = false;
    el.turnTimer.textContent = String(state.timerRemaining);
    el.turnTimer.classList.remove('is-urgent');

    state.timerHandle = setInterval(() => {
      state.timerRemaining--;
      el.turnTimer.textContent = String(state.timerRemaining);
      if (state.timerRemaining <= 3) { el.turnTimer.classList.add('is-urgent'); sfx.tick(); }
      if (state.timerRemaining <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }
  function stopTimer() {
    if (state.timerHandle) { clearInterval(state.timerHandle); state.timerHandle = null; }
  }
  function resetTimer() { startTimer(); }

  function handleTimeout() {
    if (!state.active) return;
    sfx.timeout();
    const v = VARIANTS[state.variant];
    // Süresi dolan oyuncunun sırası pas geçilir, sıra rakibe kalır
    if (v.ultimate) {
      state.current = state.current === 'X' ? 'O' : 'X';
      updateActiveSubHighlight();
    } else {
      state.current = state.current === 'X' ? 'O' : 'X';
      if (v.vanish) markNextToVanish(state.current);
    }
    updateTurnStrip();
    startTimer();

    if (state.active && state.mode === 'ai' && state.current === 'O') {
      if (v.ultimate) { setTimeout(aiUltimateMove, 420); }
      else {
        el.board.classList.add('is-thinking');
        setTimeout(() => {
          const move = aiChooseMove(state.board, state.difficulty, state.n, state.winLen, v.misere, v.vanish, state.vanishQueues, state.vanishMaxPieces);
          if (move != null && state.active) {
            el.board.classList.remove('is-thinking');
            playMove(move, 'O');
          }
        }, 420);
      }
    }
  }

  /* ---------------------------------------------------------------
     Yapay zeka — minimax (zor = yenilmez, klasik 3x3'te tam derinlik)
     Büyük tahtalarda derinlik sınırlı sezgisel değerlendirme kullanılır.
     Vanish modda arama ağacı yerine "kazan / engelle / iyi konum" sezgiseli
     kullanılır (taşların kaybolması minimax'i pratik olmaktan çıkarır).
  --------------------------------------------------------------- */
  function aiChooseMove(board, difficulty, n, winLen, misere, vanish, vanishQueues, vanishMax) {
    const empties = board.reduce((acc, v, i) => (v ? acc : (acc.push(i), acc)), []);
    if (empties.length === 0) return null;

    const useBest =
      difficulty === 'hard' ? true :
      difficulty === 'medium' ? Math.random() < 0.55 :
      Math.random() < 0.15; // easy

    if (vanish) {
      if (!useBest) return empties[Math.floor(Math.random() * empties.length)];
      return bestVanishMove(board, n, winLen, vanishQueues, vanishMax);
    }

    if (!useBest) {
      return empties[Math.floor(Math.random() * empties.length)];
    }
    // Klasik 3x3'te tam minimax; daha büyük tahtalarda derinlik sınırlı + sezgisel
    if (n === 3) return bestMoveMinimax(board, n, winLen, misere);
    return bestMoveHeuristic(board, n, winLen, misere, empties);
  }

  // Vanish modda hamle seçimi: taşların ileride kaybolacağını hesaba katan
  // sezgisel bir değerlendirme. AI her zaman 'O' oynar.
  function bestVanishMove(board, n, winLen, vanishQueues, vanishMax) {
    const empties = board.reduce((acc, v, i) => (v ? acc : (acc.push(i), acc)), []);

    // Bu hamleden sonra AI'nın kendi en eski taşı kaybolacak mı? (kendi kuyruğu doluysa)
    const oQueueFull = vanishQueues.O.length >= vanishMax;
    const oOldest = oQueueFull ? vanishQueues.O[0] : null;
    const xQueueFull = vanishQueues.X.length >= vanishMax;
    const xOldest = xQueueFull ? vanishQueues.X[0] : null;

    const simulateAfterOMove = (idx) => {
      const next = board.slice();
      if (oOldest !== null) next[oOldest] = null; // AI'nın kendi eski taşı kaybolur
      next[idx] = 'O';
      return next;
    };
    const simulateAfterXMove = (idx) => {
      const next = board.slice();
      if (xOldest !== null) next[xOldest] = null; // insanın eski taşı kaybolur
      next[idx] = 'X';
      return next;
    };

    // 1) Hemen kazandıran hamle var mı?
    for (const i of empties) {
      if (findWinLine(simulateAfterOMove(i), 'O', n, winLen)) return i;
    }
    // 2) İnsanın bir sonraki hamlede kazanmasını engelle
    for (const i of empties) {
      if (findWinLine(simulateAfterXMove(i), 'X', n, winLen)) return i;
    }
    // 3) Sezgisel puanlama: potansiyel çizgi değeri + kendi taşını
    //    gereksiz yere erken kaybetmemek + merkez tercihi
    const lines = computeWinLines(n, winLen);
    let best = { score: -Infinity, index: empties[0] };
    for (const i of empties) {
      let score = 0;
      const afterMove = simulateAfterOMove(i);
      for (const line of lines) {
        if (!line.includes(i)) continue;
        const marksOnLine = line.map((idx) => afterMove[idx]);
        const oCount = marksOnLine.filter((m) => m === 'O').length;
        const xCount = marksOnLine.filter((m) => m === 'X').length;
        if (xCount === 0) score += oCount * oCount;
        if (oCount === 0) score += xCount * xCount * 0.9;
      }
      const midR = (n - 1) / 2, midC = (n - 1) / 2;
      const r = Math.floor(i / n), c = i % n;
      score += (1 - (Math.abs(r - midR) + Math.abs(c - midC)) / n) * 0.5;
      if (score > best.score) best = { score, index: i };
    }
    return best.index;
  }

  function bestMoveMinimax(board, n, winLen, misere) {
    let best = { score: -Infinity, index: null };
    board.forEach((v, i) => {
      if (v) return;
      const next = board.slice();
      next[i] = 'O';
      const score = minimax(next, 0, false, n, winLen, misere);
      if (score > best.score) best = { score, index: i };
    });
    return best.index;
  }

  function minimax(board, depth, isMaximizing, n, winLen, misere) {
    const oWin = findWinLine(board, 'O', n, winLen);
    const xWin = findWinLine(board, 'X', n, winLen);
    if (oWin) return misere ? depth - 10 : 10 - depth;
    if (xWin) return misere ? 10 - depth : depth - 10;
    if (board.every(Boolean)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      board.forEach((v, i) => {
        if (v) return;
        const next = board.slice();
        next[i] = 'O';
        best = Math.max(best, minimax(next, depth + 1, false, n, winLen, misere));
      });
      return best;
    } else {
      let best = Infinity;
      board.forEach((v, i) => {
        if (v) return;
        const next = board.slice();
        next[i] = 'X';
        best = Math.min(best, minimax(next, depth + 1, true, n, winLen, misere));
      });
      return best;
    }
  }

  // Büyük tahtalar için: 1-ply bak + basit sezgisel puanlama (performans amaçlı)
  function bestMoveHeuristic(board, n, winLen, misere, empties) {
    // 1) Kazanacaksak hemen kazan (misère'de kazanmaktan kaçın)
    for (const i of empties) {
      const next = board.slice(); next[i] = 'O';
      if (findWinLine(next, 'O', n, winLen)) return misere ? -1 : i;
    }
    // 2) Rakip kazanacaksa engelle
    for (const i of empties) {
      const next = board.slice(); next[i] = 'X';
      if (findWinLine(next, 'X', n, winLen)) return i;
    }
    // 3) Sezgisel: her boş hücreyi, oluşturduğu potansiyel çizgi sayısına göre puanla
    const lines = computeWinLines(n, winLen);
    let best = { score: -Infinity, index: empties[0] };
    for (const i of empties) {
      let score = 0;
      for (const line of lines) {
        if (!line.includes(i)) continue;
        const marksOnLine = line.map((idx) => board[idx]);
        const oCount = marksOnLine.filter((m) => m === 'O').length;
        const xCount = marksOnLine.filter((m) => m === 'X').length;
        if (xCount === 0) score += oCount * oCount; // kendi potansiyelimiz
        if (oCount === 0) score += xCount * xCount * 0.9; // rakibi engelleme değeri
      }
      // merkeze yakınlık hafif bonus
      const midR = (n - 1) / 2, midC = (n - 1) / 2;
      const r = Math.floor(i / n), c = i % n;
      score += (1 - (Math.abs(r - midR) + Math.abs(c - midC)) / n) * 0.5;
      if (misere) score *= -1;
      if (score > best.score) best = { score, index: i };
    }
    return best.index;
  }

  /* ---------------------------------------------------------------
     ULTIMATE XOX motoru
  --------------------------------------------------------------- */
  function renderUltimateBoard() {
    el.board.className = 'board board--ultimate';
    el.board.innerHTML = '';

    for (let s = 0; s < 9; s++) {
      const sub = document.createElement('div');
      sub.className = 'ultimate-sub';
      sub.dataset.sub = String(s);

      const winner = state.subWinners[s];
      if (winner === 'X' || winner === 'O') {
        sub.classList.add(winner === 'X' ? 'is-won-x' : 'is-won-o');
        const markEl = document.createElement('div');
        markEl.className = `ultimate-sub__mark ultimate-sub__mark--${winner.toLowerCase()}`;
        markEl.textContent = winner;
        sub.appendChild(markEl);
      } else if (winner === 'draw') {
        sub.classList.add('is-drawn');
      }

      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'ultimate-sub__cell';
        const mark = state.subBoards[s][c];
        if (mark) {
          cell.appendChild(markNode(mark));
          cell.disabled = true;
        }
        if (winner) cell.disabled = true;
        cell.addEventListener('click', () => handleUltimateClick(s, c));
        sub.appendChild(cell);
      }
      el.board.appendChild(sub);
    }
    updateActiveSubHighlight();
    el.winLinePath.classList.remove('is-active');
  }

  function updateActiveSubHighlight() {
    const subs = el.board.querySelectorAll('.ultimate-sub');
    subs.forEach((sub, i) => {
      const playable = state.subWinners[i] === null &&
        (state.activeSub === null || state.activeSub === i);
      sub.classList.toggle('is-playable', playable && state.active);
    });
  }

  function handleUltimateClick(subIndex, cellIndex) {
    if (!state.active) return;
    if (state.mode === 'ai' && state.current === 'O') return;
    if (state.subWinners[subIndex] !== null) return;
    if (state.activeSub !== null && state.activeSub !== subIndex) return;
    if (state.subBoards[subIndex][cellIndex]) return;

    playUltimateMove(subIndex, cellIndex, state.current);
  }

  function playUltimateMove(subIndex, cellIndex, mark) {
    pushHistory();
    stopTimer();

    state.subBoards[subIndex][cellIndex] = mark;
    mark === 'X' ? sfx.x() : sfx.o();

    // Mini tahta kazanıldı mı?
    const subWinLine = findWinLine(state.subBoards[subIndex], mark, 3, 3);
    if (subWinLine) {
      state.subWinners[subIndex] = mark;
    } else if (state.subBoards[subIndex].every(Boolean)) {
      state.subWinners[subIndex] = 'draw';
    }

    renderUltimateBoard();

    // Meta tahtada (subWinners üzerinde) kazanma kontrolü
    const metaBoard = state.subWinners.map((w) => (w === 'draw' ? null : w));
    const metaWinLine = findWinLine(metaBoard, mark, 3, 3);
    const metaFull = state.subWinners.every((w) => w !== null);

    if (metaWinLine) {
      state.active = false;
      stopTimer();
      highlightMetaWin(metaWinLine, mark);
      state.scores[mark]++;
      sfx.win();
      updateScoreboard();
      saveScores();
      launchConfetti();
      const winnerName = mark === 'X' ? state.nameX : state.nameO;
      showResult('El bitti', `${winnerName} kazandı`);
      return;
    }
    if (metaFull) {
      state.active = false;
      stopTimer();
      state.scores.draw++;
      sfx.draw();
      updateScoreboard();
      saveScores();
      showResult('El bitti', 'Berabere');
      return;
    }

    // Sıradaki aktif mini tahtayı belirle: rakip, oynanan hücrenin index'iyle aynı numaralı tahtaya gider
    state.activeSub = state.subWinners[cellIndex] === null ? cellIndex : null;
    state.current = mark === 'X' ? 'O' : 'X';
    updateActiveSubHighlight();
    updateTurnStrip();
    startTimer();

    if (state.active && state.mode === 'ai' && state.current === 'O') {
      setTimeout(aiUltimateMove, 420);
    }
  }

  function highlightMetaWin(metaLine, mark) {
    metaLine.forEach((s) => {
      const subEl = el.board.querySelector(`.ultimate-sub[data-sub="${s}"]`);
      if (subEl) subEl.classList.add(mark === 'X' ? 'is-won-x' : 'is-won-o');
    });
  }

  function aiUltimateMove() {
    if (!state.active) return;
    const candidates = [];
    const subsToCheck = state.activeSub !== null ? [state.activeSub] : [0,1,2,3,4,5,6,7,8].filter((s) => state.subWinners[s] === null);

    subsToCheck.forEach((s) => {
      state.subBoards[s].forEach((v, c) => { if (!v) candidates.push([s, c]); });
    });
    if (!candidates.length) return;

    // Basit sezgisel: önce kazandıracak hamle, sonra rakibin mini-tahta kazanmasını engelleyen, yoksa rastgele iyi hücre
    for (const [s, c] of candidates) {
      const next = state.subBoards[s].slice(); next[c] = 'O';
      if (findWinLine(next, 'O', 3, 3)) return playUltimateMove(s, c, 'O');
    }
    for (const [s, c] of candidates) {
      const next = state.subBoards[s].slice(); next[c] = 'X';
      if (findWinLine(next, 'X', 3, 3)) return playUltimateMove(s, c, 'O');
    }
    // merkezi hücreleri (c===4) ve merkezi mini tahtayı (s===4) hafif tercih et
    candidates.sort((a, b) => {
      const scoreOf = ([s, c]) => (s === 4 ? 2 : 0) + (c === 4 ? 1 : 0);
      return scoreOf(b) - scoreOf(a);
    });
    const [s, c] = candidates[0];
    playUltimateMove(s, c, 'O');
  }

  /* ---------------------------------------------------------------
     Konfeti (yalnızca kazanma anında, kısa patlama)
  --------------------------------------------------------------- */
  function launchConfetti() {
    const canvas = el.confetti;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#4cf5d6', '#f5478c', '#ffd166'];
    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -6 - 2,
      size: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));

    let frame = 0;
    const maxFrames = 70;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    (function tick() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (frame < maxFrames && !el.resultOverlay.hidden) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
  }

})();
