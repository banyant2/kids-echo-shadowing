/**
 * Main Application Coordinator - State Machine & UI Synchronization.
 */
document.addEventListener('DOMContentLoaded', () => {
  const audio = new AudioEngine();
  const curriculum = new CurriculumManager();

  // State Constants
  const STATE = {
    IDLE: 'IDLE',
    PLAY_AND_RECORD: 'PLAY_AND_RECORD',
    BUFFER: 'BUFFER',
    PLAY_RECORDED: 'PLAY_RECORDED',
    REPLAY_NATIVE: 'REPLAY_NATIVE',
    PAUSED: 'PAUSED',
    COMPLETE: 'COMPLETE'
  };

  let currentState = STATE.IDLE;
  let currentSentenceIndex = 0;
  let isPaused = false;
  let lastRecordedAudioUrl = null;
  let sessionAudioRecordings = [];

  // DOM Elements
  const sentenceDisplay = document.getElementById('sentenceDisplay');
  const statusPill = document.getElementById('statusPill');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const replayBtn = document.getElementById('replayBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const totalPointsEl = document.getElementById('totalPoints');
  const chapterTitleEl = document.getElementById('chapterTitle');
  const chapterSubEl = document.getElementById('chapterSub');
  const daySelectorEl = document.getElementById('daySelector');
  const displayCard = document.getElementById('displayCard');

  // Modals
  const adminBtn = document.getElementById('adminBtn');
  const adminModal = document.getElementById('adminModal');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  const processTextBtn = document.getElementById('processTextBtn');
  const rawTextInput = document.getElementById('rawTextInput');
  const newBookTitle = document.getElementById('newBookTitle');
  const newChapterName = document.getElementById('newChapterName');

  const celebrationModal = document.getElementById('celebrationModal');
  const closeCelebrationBtn = document.getElementById('closeCelebrationBtn');
  const earnedPointsEl = document.getElementById('earnedPoints');
  const cumulativePointsEl = document.getElementById('cumulativePoints');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

  function resizeCanvas() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Initialize UI
  function renderHeaderAndProgress() {
    const progress = curriculum.getProgress();
    const chapter = curriculum.getCurrentChapter();
    
    totalPointsEl.innerText = `${progress.totalPoints || 0}점`;
    chapterTitleEl.innerText = chapter.title;
    chapterSubEl.innerText = `${chapter.chapter} — Day ${progress.currentDay}`;

    // Render Day Chips
    daySelectorEl.innerHTML = '';
    const dayKeys = Object.keys(chapter.days).map(Number).sort((a, b) => a - b);
    dayKeys.forEach(d => {
      const chip = document.createElement('button');
      chip.className = `day-chip ${d === progress.currentDay ? 'active' : ''}`;
      chip.innerText = `Day ${d}`;
      chip.onclick = () => {
        if (currentState !== STATE.IDLE && currentState !== STATE.PAUSED && currentState !== STATE.COMPLETE) {
          if (!confirm("학습 진행 중입니다. 일차를 변경하시겠습니까?")) return;
        }
        stopAllActivity();
        curriculum.setDay(d);
        currentSentenceIndex = 0;
        renderHeaderAndProgress();
        renderCurrentSentence();
      };
      daySelectorEl.appendChild(chip);
    });

    const sentences = curriculum.getCurrentDaySentences();
    const total = sentences.length;
    const current = Math.min(currentSentenceIndex + 1, total);
    const pct = total > 0 ? (currentSentenceIndex / total) * 100 : 0;
    
    progressFill.style.width = `${pct}%`;
    progressText.innerText = `문장 ${current} / ${total}`;
  }

  function renderCurrentSentence() {
    const sentences = curriculum.getCurrentDaySentences();
    if (!sentences || sentences.length === 0) {
      sentenceDisplay.innerHTML = '<span class="word">등록된 문장이 없습니다. 관리자에서 텍스트를 추가해주세요.</span>';
      return;
    }

    const sentence = sentences[currentSentenceIndex] || sentences[0];
    const words = sentence.split(' ');
    sentenceDisplay.innerHTML = '';
    
    words.forEach((w, idx) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.id = `word-${idx}`;
      span.innerText = w + ' ';
      sentenceDisplay.appendChild(span);
    });
  }

  function highlightWord(charIndex, charLength) {
    const sentences = curriculum.getCurrentDaySentences();
    const sentence = sentences[currentSentenceIndex];
    if (!sentence) return;

    // Approximate word index from charIndex
    const sub = sentence.substring(0, charIndex);
    const wordIdx = sub.split(' ').length - 1;

    document.querySelectorAll('.word').forEach((el, idx) => {
      if (idx === wordIdx) {
        el.classList.add('highlight');
      } else {
        el.classList.remove('highlight');
      }
    });
  }

  function clearHighlight() {
    document.querySelectorAll('.word').forEach(el => el.classList.remove('highlight'));
  }

  function setStatus(text, typeClass) {
    statusPill.className = `status-pill ${typeClass}`;
    statusPill.innerHTML = text;
  }

  function stopAllActivity() {
    isPaused = true;
    audio.stopTTS();
    audio.stopRecording();
    clearHighlight();
    displayCard.classList.remove('active-reading');
    setStatus('⏸ 대기 중', 'status-idle');
    startBtn.style.display = 'inline-flex';
    startBtn.innerHTML = '▶ 다시 시작';
    pauseBtn.style.display = 'none';
    currentState = STATE.IDLE;
  }

  // State Machine Loop
  async function runCycle() {
    const sentences = curriculum.getCurrentDaySentences();
    if (!sentences || currentSentenceIndex >= sentences.length) {
      handleMissionComplete();
      return;
    }

    if (isPaused) return;

    const currentSentence = sentences[currentSentenceIndex];
    renderHeaderAndProgress();
    renderCurrentSentence();

    try {
      // 1. Play Native & Record
      currentState = STATE.PLAY_AND_RECORD;
      setStatus('🔊 1. 원음 듣기 & 따라 읽기', 'status-native');
      displayCard.classList.add('active-reading');
      audio.playChime();
      
      // Start recording simultaneous with TTS
      audio.startRecording();

      await audio.speakTTS(currentSentence, (charIdx, len) => {
        highlightWord(charIdx, len);
      });

      if (isPaused) return;

      // 2. Buffer for child voice trailing
      currentState = STATE.BUFFER;
      clearHighlight();
      setStatus('🎤 쉐도잉 마무리 중 (+1.8초)...', 'status-buffer');
      await new Promise(r => setTimeout(r, 1800));

      if (isPaused) return;

      const recordRes = await audio.stopRecording();
      if (recordRes && recordRes.url) {
        lastRecordedAudioUrl = recordRes.url;
        sessionAudioRecordings.push({
          sentence: currentSentence,
          index: currentSentenceIndex + 1,
          url: recordRes.url
        });
      }

      if (isPaused) return;

      // 3. Play Kids Recorded Voice
      currentState = STATE.PLAY_RECORDED;
      setStatus('👂 2. 방금 우리가 읽은 목소리', 'status-kids');
      if (lastRecordedAudioUrl) {
        await audio.playAudioUrl(lastRecordedAudioUrl);
      } else {
        await new Promise(r => setTimeout(r, 1500));
      }

      if (isPaused) return;

      // 4. Replay Native Audio
      currentState = STATE.REPLAY_NATIVE;
      setStatus('🔊 3. 원음 다시 확인하기', 'status-replay');
      await audio.speakTTS(currentSentence, (charIdx, len) => {
        highlightWord(charIdx, len);
      });
      clearHighlight();

      if (isPaused) return;

      // 5. Next Sentence Transition
      currentState = STATE.IDLE;
      setStatus('➡️ 다음 문장 준비 중...', 'status-next');
      await new Promise(r => setTimeout(r, 1000));

      if (isPaused) return;

      currentSentenceIndex++;
      const updatedTotal = curriculum.getCurrentDaySentences().length;
      if (currentSentenceIndex < updatedTotal) {
        runCycle();
      } else {
        handleMissionComplete();
      }

    } catch (err) {
      console.error("Cycle error:", err);
      setStatus('⚠️ ' + err.message, 'status-buffer');
      stopAllActivity();
    }
  }

  // Celebration & Completion
  function handleMissionComplete() {
    currentState = STATE.COMPLETE;
    displayCard.classList.remove('active-reading');
    clearHighlight();
    setStatus('🎉 오늘의 미션 완료! 5점 획득!', 'status-next');
    startBtn.style.display = 'inline-flex';
    startBtn.innerHTML = '🔄 오늘 분량 다시 하기';
    pauseBtn.style.display = 'none';

    // Award 5 points
    const totalPoints = curriculum.awardMissionPoints();
    renderHeaderAndProgress();

    // Audio Fanfare & Visual Confetti
    audio.playFanfare();
    startConfetti();

    // Open Modal
    earnedPointsEl.innerText = '+5점';
    cumulativePointsEl.innerText = `${totalPoints}점`;
    celebrationModal.classList.add('active');
  }

  // Confetti Particle System
  let particles = [];
  let confettiAnimationId = null;

  function startConfetti() {
    if (!ctx) return;
    particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 10,
        color: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleInc: Math.random() * 0.07 + 0.05
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    let duration = 180; // ~3 seconds at 60fps
    function draw() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      particles.forEach(p => {
        p.y += (Math.cos(p.d) + 1 + p.r / 2) * 1.5;
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.d) * 15;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });

      duration--;
      if (duration > 0) {
        confettiAnimationId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    draw();
  }

  // Button Handlers
  startBtn.addEventListener('click', async () => {
    try {
      await audio.initMicSession();
      isPaused = false;
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      replayBtn.disabled = false;
      nextBtn.disabled = false;

      if (currentState === STATE.COMPLETE) {
        currentSentenceIndex = 0;
      }

      runCycle();
    } catch (e) {
      alert("마이크 연결 실패: " + e.message);
    }
  });

  pauseBtn.addEventListener('click', () => {
    stopAllActivity();
  });

  replayBtn.addEventListener('click', () => {
    if (isPaused) return;
    audio.stopTTS();
    audio.stopRecording();
    runCycle();
  });

  nextBtn.addEventListener('click', () => {
    if (isPaused) return;
    audio.stopTTS();
    audio.stopRecording();
    const sentences = curriculum.getCurrentDaySentences();
    if (currentSentenceIndex < sentences.length - 1) {
      currentSentenceIndex++;
      runCycle();
    } else {
      handleMissionComplete();
    }
  });

  // Admin Modal Handlers
  adminBtn.addEventListener('click', () => {
    adminModal.classList.add('active');
  });

  closeAdminBtn.addEventListener('click', () => {
    adminModal.classList.remove('active');
  });

  closeCelebrationBtn.addEventListener('click', () => {
    celebrationModal.classList.remove('active');
  });

  processTextBtn.addEventListener('click', () => {
    const raw = rawTextInput.value.trim();
    if (!raw) {
      alert("책 텍스트를 입력해주세요.");
      return;
    }

    const sentences = curriculum.splitRawTextIntoSentences(raw);
    if (sentences.length === 0) {
      alert("유효한 문장을 찾지 못했습니다.");
      return;
    }

    const title = newBookTitle.value.trim() || '새로운 책';
    const chapter = newChapterName.value.trim() || 'Chapter 1';

    curriculum.createChapterFromSentences(title, chapter, sentences, 6);
    alert(`총 ${sentences.length}개의 문장이 6일 치 커리큘럼으로 자동 배분되었습니다!`);

    adminModal.classList.remove('active');
    rawTextInput.value = '';
    currentSentenceIndex = 0;
    stopAllActivity();
    renderHeaderAndProgress();
    renderCurrentSentence();
  });

  // Initial Render
  renderHeaderAndProgress();
  renderCurrentSentence();
  setStatus('준비 완료 ([START]를 누르세요)', 'status-idle');
});
