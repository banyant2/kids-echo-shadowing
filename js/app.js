/**
 * Main Application Coordinator - Slower Paced Shadowing, 2X Recording Window, Continuous Timer & UI Sync.
 */
document.addEventListener('DOMContentLoaded', () => {
  const audio = new AudioEngine();
  const curriculum = new CurriculumManager();
  const gemini = new GeminiApi();

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
  let currentSentenceIndex = curriculum.getBookmarkIndex();
  let isPaused = false;
  let lastRecordedAudioUrl = null;
  let sessionEffortScores = [];
  let selectedImageFiles = [];
  let finalEarnedPoints = 5;
  let sentencesReadThisSession = 0;

  // Session Timer (Default 30 minutes)
  let sessionDurationMinutes = curriculum.getSettings().sessionDurationMinutes || 30;
  let remainingSeconds = sessionDurationMinutes * 60;
  let timerInterval = null;

  // DOM Elements
  const securityBanner = document.getElementById('securityBanner');
  const sentenceDisplay = document.getElementById('sentenceDisplay');
  const emotionBadge = document.getElementById('emotionBadge');
  const statusPill = document.getElementById('statusPill');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const replayBtn = document.getElementById('replayBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const timerBadge = document.getElementById('timerBadge');
  const totalPointsEl = document.getElementById('totalPoints');
  const chapterTitleEl = document.getElementById('chapterTitle');
  const chapterSubEl = document.getElementById('chapterSub');
  const displayCard = document.getElementById('displayCard');

  // Modals & Admin
  const adminBtn = document.getElementById('adminBtn');
  const adminModal = document.getElementById('adminModal');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  
  // Admin Tabs
  const tabBtns = document.querySelectorAll('.admin-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Voice & Time Settings Elements
  const actingVoiceSelect = document.getElementById('actingVoiceSelect');
  const voiceSelect = document.getElementById('voiceSelect');
  const ttsRateRange = document.getElementById('ttsRateRange');
  const ttsRateVal = document.getElementById('ttsRateVal');
  const previewVoiceBtn = document.getElementById('previewVoiceBtn');
  const sessionDurationSelect = document.getElementById('sessionDurationSelect');
  const speedPresetBtns = document.querySelectorAll('.btn-speed-preset');

  // Photo Upload Tab
  const photoFileInput = document.getElementById('photoFileInput');
  const fileDropArea = document.getElementById('fileDropArea');
  const selectedCountText = document.getElementById('selectedCountText');
  const previewGrid = document.getElementById('previewGrid');
  const photoBookTitle = document.getElementById('photoBookTitle');
  const photoChapterName = document.getElementById('photoChapterName');
  const aiProcessBtn = document.getElementById('aiProcessBtn');
  const aiStatusMsg = document.getElementById('aiStatusMsg');

  // Text Tab
  const processTextBtn = document.getElementById('processTextBtn');
  const rawTextInput = document.getElementById('rawTextInput');
  const newBookTitle = document.getElementById('newBookTitle');
  const newChapterName = document.getElementById('newChapterName');

  // API Key Tab
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const openaiApiKeyInput = document.getElementById('openaiApiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const apiSavedNotice = document.getElementById('apiSavedNotice');

  // Celebration Modal
  const celebrationModal = document.getElementById('celebrationModal');
  const closeCelebrationBtn = document.getElementById('closeCelebrationBtn');
  const earnedPointsEl = document.getElementById('earnedPoints');
  const cumulativePointsEl = document.getElementById('cumulativePoints');
  const celebrationSummaryText = document.getElementById('celebrationSummaryText');
  const starsRatingEl = document.getElementById('starsRating');
  const parentPraiseText = document.getElementById('parentPraiseText');
  const starScoreBtns = document.querySelectorAll('.btn-star-score');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

  // Check Secure Context
  if (!audio.isSecure()) {
    if (securityBanner) {
      securityBanner.classList.add('active');
      securityBanner.innerHTML = `⚠️ <strong>안내</strong>: 현재 로컬 파일 경로(<code>${location.protocol}</code>)로 열려 있습니다. 브라우저 정책상 마이크 권한 창은 <strong>GitHub Pages(https://...)</strong>로 접속할 때 정상 작동합니다.`;
    }
  }

  function resizeCanvas() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Populate Voice Dropdown
  function populateVoices() {
    if (!voiceSelect) return;
    const voices = audio.getEnglishVoices();
    voiceSelect.innerHTML = '';

    if (!voices || voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">(기본 시스템 음성)</option>';
      return;
    }

    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      let label = `${v.name} (${v.lang})`;
      if (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Guy') || v.name.includes('Samantha') || v.name.includes('Zira')) {
        label = `🌟 ` + label;
      }
      opt.innerText = label;
      if (v.voiceURI === audio.selectedVoiceURI) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });
  }

  if (actingVoiceSelect) {
    actingVoiceSelect.value = gemini.getActingVoice();
    actingVoiceSelect.addEventListener('change', () => {
      gemini.setActingVoice(actingVoiceSelect.value);
    });
  }

  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      audio.setVoice(voiceSelect.value);
    });
    voiceSelect.addEventListener('focus', populateVoices);
    voiceSelect.addEventListener('click', populateVoices);
  }

  // Speed Slider & Presets
  function updateSpeedUI(rateVal) {
    const rate = parseFloat(rateVal);
    audio.setRate(rate);
    if (ttsRateRange) ttsRateRange.value = rate.toFixed(2);
    if (ttsRateVal) ttsRateVal.innerText = `${rate.toFixed(2)}x`;
    speedPresetBtns.forEach(b => {
      if (Math.abs(parseFloat(b.dataset.speed) - rate) < 0.03) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  if (ttsRateRange && ttsRateVal) {
    ttsRateRange.value = audio.ttsRate;
    ttsRateVal.innerText = `${audio.ttsRate.toFixed(2)}x`;

    ttsRateRange.addEventListener('input', () => {
      updateSpeedUI(ttsRateRange.value);
    });
  }

  speedPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      updateSpeedUI(btn.dataset.speed);
    });
  });

  if (previewVoiceBtn) {
    previewVoiceBtn.addEventListener('click', () => {
      audio.previewVoice();
    });
  }

  if (sessionDurationSelect) {
    const settings = curriculum.getSettings();
    sessionDurationMinutes = settings.sessionDurationMinutes || 30;
    sessionDurationSelect.value = sessionDurationMinutes.toString();

    sessionDurationSelect.addEventListener('change', () => {
      sessionDurationMinutes = parseInt(sessionDurationSelect.value, 10);
      curriculum.setSessionDuration(sessionDurationMinutes);
      resetTimer();
      renderHeaderAndProgress();
    });
  }

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
      audio.initVoices();
      populateVoices();
    };
  }
  setTimeout(populateVoices, 300);
  setTimeout(populateVoices, 1000);

  // Timer Management
  function resetTimer() {
    remainingSeconds = sessionDurationMinutes * 60;
    updateTimerDisplay();
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    if (timerBadge) {
      timerBadge.innerHTML = `⏱️ 남은 시간: <strong>${formatTime(remainingSeconds)}</strong> / ${sessionDurationMinutes}분`;
    }
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isPaused && currentState !== STATE.IDLE && currentState !== STATE.COMPLETE) {
        if (remainingSeconds > 0) {
          remainingSeconds--;
          updateTimerDisplay();
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Admin Tab Switcher
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`tab-${targetTab}`);
      if (activePane) activePane.classList.add('active');
    });
  });

  // Render Header & Progress
  function renderHeaderAndProgress() {
    const progress = curriculum.getProgress();
    const chapter = curriculum.getCurrentChapter();
    const sentences = curriculum.getAllSentences();
    const total = sentences.length;
    const current = Math.min(currentSentenceIndex + 1, total);
    
    totalPointsEl.innerText = `${progress.totalPoints || 0}점`;
    chapterTitleEl.innerText = chapter.title;
    chapterSubEl.innerText = `${chapter.chapter} — 연속 집중듣기`;

    updateTimerDisplay();

    const pct = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${pct}%`;
    progressText.innerText = `책 전체 진행: ${current} / ${total} 문장 (${pct.toFixed(0)}% 완독)`;
  }

  function renderCurrentSentence() {
    const item = curriculum.getCurrentSentenceItem(currentSentenceIndex);
    if (!item) {
      sentenceDisplay.innerHTML = '<span class="word">등록된 문장이 없습니다. [설정 & 교재]에서 사진을 등록해주세요.</span>';
      if (emotionBadge) emotionBadge.style.display = 'none';
      return;
    }

    if (emotionBadge) {
      emotionBadge.style.display = 'inline-flex';
      emotionBadge.innerHTML = `${item.emotionEmoji || '👧'} <strong>${item.speaker || 'Narrator'}</strong> &nbsp;|&nbsp; ${item.emotionLabel || '또박또박 낭독하기'}`;
    }

    const words = item.text.split(' ');
    sentenceDisplay.innerHTML = '';
    
    words.forEach((w, idx) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.id = `word-${idx}`;
      span.innerText = w;
      sentenceDisplay.appendChild(span);
    });
  }

  function highlightWord(charIndex, charLength) {
    const item = curriculum.getCurrentSentenceItem(currentSentenceIndex);
    if (!item) return;

    const sub = item.text.substring(0, charIndex);
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
    stopTimer();
    audio.stopTTS();
    audio.stopRecording();
    clearHighlight();
    displayCard.classList.remove('active-reading');
    setStatus('⏸ 일시정지 / 대기 중', 'status-idle');
    startBtn.style.display = 'inline-flex';
    startBtn.innerHTML = `▶ 이어서 읽기 (${currentSentenceIndex + 1}번부터)`;
    pauseBtn.style.display = 'none';
    currentState = STATE.IDLE;
  }

  // State Machine Loop with 2X Slower Shadowing Trailing Window
  async function runCycle() {
    const sentences = curriculum.getAllSentences();
    if (!sentences || sentences.length === 0) return;

    if (currentSentenceIndex >= sentences.length) {
      handleSessionComplete(true);
      return;
    }

    if (remainingSeconds <= 0) {
      handleSessionComplete(false);
      return;
    }

    if (isPaused) return;

    const item = curriculum.getCurrentSentenceItem(currentSentenceIndex);
    renderHeaderAndProgress();
    renderCurrentSentence();

    try {
      // 1. Play Native & Record
      currentState = STATE.PLAY_AND_RECORD;
      setStatus(`🔊 1. 원음 듣기 & 따라 읽기 (#${currentSentenceIndex + 1})`, 'status-native');
      displayCard.classList.add('active-reading');
      audio.playChime();
      
      const playbackStart = performance.now();
      audio.startRecording();

      let playbackResult = { durationMs: 3000 };
      if (item.audioUrl) {
        playbackResult = await audio.playAudioUrl(item.audioUrl);
      } else {
        playbackResult = await audio.speakTTS(item.text, (charIdx, len) => {
          highlightWord(charIdx, len);
        });
      }

      if (isPaused) return;

      // 2. Generous 2X Recording Window for Children (원음 재생 시간만큼을 추가로 더 대기)
      currentState = STATE.BUFFER;
      clearHighlight();
      
      const measuredPlaybackMs = (playbackResult && playbackResult.durationMs) ? playbackResult.durationMs : (performance.now() - playbackStart);
      // Trailing buffer is equal to the playback duration (min 3.5 seconds)
      const trailingBufferMs = Math.max(3500, Math.round(measuredPlaybackMs * 1.1));
      const trailingSecs = (trailingBufferMs / 1000).toFixed(1);

      setStatus(`🎤 쉐도잉 녹음 중 (+${trailingSecs}초 여유)...`, 'status-buffer');
      await new Promise(r => setTimeout(r, trailingBufferMs));

      if (isPaused) return;

      const recordRes = await audio.stopRecording();
      if (recordRes) {
        lastRecordedAudioUrl = recordRes.url;
        sessionEffortScores.push(recordRes.effortRating || 5);
      }

      if (isPaused) return;

      // 3. Play Kids Recorded Voice
      currentState = STATE.PLAY_RECORDED;
      setStatus('👂 2. 방금 우리가 읽은 목소리', 'status-kids');
      if (lastRecordedAudioUrl) {
        await audio.playAudioUrl(lastRecordedAudioUrl);
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }

      if (isPaused) return;

      // 4. Replay Native Audio
      currentState = STATE.REPLAY_NATIVE;
      setStatus('🔊 3. 원음 다시 확인하기', 'status-replay');
      if (item.audioUrl) {
        await audio.playAudioUrl(item.audioUrl);
      } else {
        await audio.speakTTS(item.text, (charIdx, len) => {
          highlightWord(charIdx, len);
        });
      }
      clearHighlight();

      if (isPaused) return;

      // 5. Save Bookmark & Move to Next Sentence
      sentencesReadThisSession++;
      currentSentenceIndex++;
      curriculum.saveBookmarkIndex(currentSentenceIndex);

      currentState = STATE.IDLE;
      setStatus('➡️ 다음 문장 준비 중...', 'status-next');
      await new Promise(r => setTimeout(r, 1200));

      if (isPaused) return;

      runCycle();

    } catch (err) {
      console.error("Cycle error:", err);
      setStatus('⚠️ ' + err.message, 'status-buffer');
      stopAllActivity();
    }
  }

  // Session Completion
  function handleSessionComplete(isBookFinished) {
    currentState = STATE.COMPLETE;
    stopTimer();
    displayCard.classList.remove('active-reading');
    clearHighlight();

    if (isBookFinished) {
      setStatus('🏆 챕터 전체 완독을 축하합니다!', 'status-next');
      celebrationSummaryText.innerText = `대단해요! 챕터 전체를 끝까지 모두 완독했습니다. (오늘 읽은 문장: ${sentencesReadThisSession}개)`;
      currentSentenceIndex = 0;
      curriculum.saveBookmarkIndex(0);
    } else {
      setStatus(`🎉 오늘 ${sessionDurationMinutes}분 집중듣기 완주!`, 'status-next');
      celebrationSummaryText.innerText = `오늘 약속된 ${sessionDurationMinutes}분 동안 총 ${sentencesReadThisSession}개의 문장을 실감 나게 완독했습니다!`;
    }

    startBtn.style.display = 'inline-flex';
    startBtn.innerHTML = `▶ 내일 이어서 읽기 (${currentSentenceIndex + 1}번부터)`;
    pauseBtn.style.display = 'none';

    let avgEffort = 5;
    if (sessionEffortScores.length > 0) {
      const sum = sessionEffortScores.reduce((a, b) => a + b, 0);
      avgEffort = Math.round(sum / sessionEffortScores.length);
    }
    finalEarnedPoints = Math.max(2, Math.min(5, avgEffort));

    updateCelebrationDisplay(finalEarnedPoints);

    audio.playFanfare();
    startConfetti();

    celebrationModal.classList.add('active');
  }

  function updateCelebrationDisplay(points) {
    finalEarnedPoints = points;
    earnedPointsEl.innerText = `+${points}점`;
    
    let starsStr = '⭐⭐⭐⭐⭐';
    let praise = '두 아이가 감정을 실어 열정적으로 낭독을 완주했습니다!';
    if (points === 4) {
      starsStr = '⭐⭐⭐⭐☆';
      praise = '성실하게 오늘 집중듣기를 마쳤습니다. 훌륭해요!';
    } else if (points === 3) {
      starsStr = '⭐⭐⭐☆☆';
      praise = '오늘 미션을 끝마쳤습니다! 소리를 조금 더 힘차게 내면 5점 만점!';
    } else if (points <= 2) {
      starsStr = '⭐⭐☆☆☆';
      praise = '끝까지 자리를 지켰어요. 다음에는 더 씩씩하게 소리 내어 보아요!';
    }

    starsRatingEl.innerText = starsStr;
    parentPraiseText.innerText = praise;

    starScoreBtns.forEach(btn => {
      if (parseInt(btn.dataset.score, 10) === points) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  starScoreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const score = parseInt(btn.dataset.score, 10);
      updateCelebrationDisplay(score);
    });
  });

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
    let duration = 180;
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

      if (currentState === STATE.COMPLETE || remainingSeconds <= 0) {
        resetTimer();
        sentencesReadThisSession = 0;
        sessionEffortScores = [];
      }

      startTimer();
      runCycle();
    } catch (e) {
      alert(e.message);
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
    const sentences = curriculum.getAllSentences();
    if (currentSentenceIndex < sentences.length - 1) {
      currentSentenceIndex++;
      curriculum.saveBookmarkIndex(currentSentenceIndex);
      runCycle();
    } else {
      handleSessionComplete(true);
    }
  });

  // Modal Open/Close
  adminBtn.addEventListener('click', () => {
    populateVoices();
    if (geminiApiKeyInput) geminiApiKeyInput.value = gemini.getGeminiApiKey();
    if (openaiApiKeyInput) openaiApiKeyInput.value = gemini.getOpenAIApiKey();
    adminModal.classList.add('active');
  });

  closeAdminBtn.addEventListener('click', () => {
    adminModal.classList.remove('active');
  });

  closeCelebrationBtn.addEventListener('click', () => {
    const totalPoints = curriculum.recordSessionCompletion(finalEarnedPoints, sentencesReadThisSession, sessionDurationMinutes);
    cumulativePointsEl.innerText = `${totalPoints}점`;
    renderHeaderAndProgress();
    celebrationModal.classList.remove('active');
    resetTimer();
  });

  // Save API Key
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const gKey = geminiApiKeyInput.value.trim();
      const oKey = openaiApiKeyInput.value.trim();
      gemini.setGeminiApiKey(gKey);
      gemini.setOpenAIApiKey(oKey);
      apiSavedNotice.style.display = 'block';
      setTimeout(() => {
        apiSavedNotice.style.display = 'none';
      }, 3000);
    });
  }

  // Multi-Photo Selection & Preview
  if (fileDropArea && photoFileInput) {
    fileDropArea.addEventListener('click', () => {
      photoFileInput.click();
    });

    photoFileInput.addEventListener('change', (e) => {
      selectedImageFiles = Array.from(e.target.files);
      if (selectedImageFiles.length > 0) {
        selectedCountText.innerText = `총 ${selectedImageFiles.length}장의 사진이 선택되었습니다.`;
        previewGrid.innerHTML = '';
        selectedImageFiles.slice(0, 10).forEach((file, idx) => {
          const chip = document.createElement('span');
          chip.className = 'preview-chip';
          chip.innerText = `${idx + 1}. ${file.name}`;
          previewGrid.appendChild(chip);
        });
        if (selectedImageFiles.length > 10) {
          const more = document.createElement('span');
          more.className = 'preview-chip';
          more.innerText = `...외 ${selectedImageFiles.length - 10}장`;
          previewGrid.appendChild(more);
        }
      } else {
        selectedCountText.innerText = '갤러리에서 사진을 여러 장 선택하거나 촬영하세요.';
        previewGrid.innerHTML = '';
      }
    });
  }

  // AI Process Photos Button
  if (aiProcessBtn) {
    aiProcessBtn.addEventListener('click', async () => {
      if (!selectedImageFiles || selectedImageFiles.length === 0) {
        alert("책 사진을 먼저 1장 이상 선택(촬영)해주세요.");
        return;
      }

      const apiKey = gemini.getGeminiApiKey();
      if (!apiKey) {
        alert("Gemini API 키가 입력되지 않았습니다. [API 키] 탭으로 이동하여 키를 먼저 저장해주세요.");
        const apiTabBtn = document.querySelector('[data-tab="apikey"]');
        if (apiTabBtn) apiTabBtn.click();
        return;
      }

      aiProcessBtn.disabled = true;
      aiStatusMsg.style.display = 'block';
      aiStatusMsg.innerText = "책의 전체 문장과 주인공의 감정선을 분석 중입니다...";

      try {
        const title = photoBookTitle.value.trim() || '새로운 책';
        const chapter = photoChapterName.value.trim() || 'Chapter 1';

        const data = await gemini.extractStoryWithEmotions(
          selectedImageFiles,
          title,
          chapter,
          (msg) => {
            aiStatusMsg.innerText = msg;
          }
        );

        if (!data.sentences || data.sentences.length === 0) {
          throw new Error("추출된 문장이 없습니다.");
        }

        curriculum.addContinuousChapter(data.title, data.chapter, data.sentences);
        alert(`🎉 성공! 총 ${data.sentences.length}개의 문장이 연속 독서 코스로 등록되었습니다. 1번 문장부터 시작합니다!`);

        adminModal.classList.remove('active');
        selectedImageFiles = [];
        photoFileInput.value = '';
        selectedCountText.innerText = '갤러리에서 사진을 여러 장 선택하거나 촬영하세요.';
        previewGrid.innerHTML = '';
        currentSentenceIndex = 0;
        resetTimer();
        stopAllActivity();
        renderHeaderAndProgress();
        renderCurrentSentence();

      } catch (err) {
        console.error("AI Generation Error:", err);
        alert("AI 분석 오류: " + err.message);
      } finally {
        aiProcessBtn.disabled = false;
        aiStatusMsg.style.display = 'none';
      }
    });
  }

  // Manual Text Process
  if (processTextBtn) {
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

      const formatted = sentences.map(s => ({
        text: s,
        speaker: "Narrator",
        emotionEmoji: "📖",
        emotionLabel: "📖 또박또박 낭독하기"
      }));

      const title = newBookTitle.value.trim() || '새로운 책';
      const chapter = newChapterName.value.trim() || 'Chapter 1';

      curriculum.addContinuousChapter(title, chapter, formatted);
      alert(`총 ${sentences.length}개의 문장이 연속 독서 코스로 등록되었습니다!`);

      adminModal.classList.remove('active');
      rawTextInput.value = '';
      currentSentenceIndex = 0;
      resetTimer();
      stopAllActivity();
      renderHeaderAndProgress();
      renderCurrentSentence();
    });
  }

  // Initial Render
  resetTimer();
  renderHeaderAndProgress();
  renderCurrentSentence();
  setStatus('준비 완료 ([START]를 누르세요)', 'status-idle');
});
