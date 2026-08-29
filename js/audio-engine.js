/**
 * AudioEngine - Web Audio API, Persistent Mic Stream, AEC, AGC, VAD Effort Analyzer, and High-Quality Slower TTS.
 */
class AudioEngine {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.analyserInterval = null;
    
    // VAD / Effort Tracking
    this.vocalSamples = 0;
    this.totalSamples = 0;
    this.vocalEnergySum = 0;

    // TTS Settings - Default 0.60x for clear elementary shadowing
    this.selectedVoiceURI = localStorage.getItem('shadowing_voice_uri') || '';
    this.ttsRate = parseFloat(localStorage.getItem('shadowing_tts_rate') || '0.60');
    this.ttsPitch = 1.0;
    this.availableVoices = [];

    this.initVoices();
  }

  initVoices() {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices && allVoices.length > 0) {
        this.availableVoices = allVoices.filter(v => v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB'));
        
        this.availableVoices.sort((a, b) => {
          const aPri = (a.name.includes('Natural') || a.name.includes('Google') || a.name.includes('Jenny') || a.name.includes('Guy') || a.name.includes('Samantha') || a.name.includes('Zira')) ? 1 : 0;
          const bPri = (b.name.includes('Natural') || b.name.includes('Google') || b.name.includes('Jenny') || b.name.includes('Guy') || b.name.includes('Samantha') || b.name.includes('Zira')) ? 1 : 0;
          return bPri - aPri;
        });

        if (!this.selectedVoiceURI && this.availableVoices.length > 0) {
          const preferred = this.availableVoices.find(v => 
            v.lang.includes('US') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Samantha') || v.name.includes('Zira'))
          ) || this.availableVoices.find(v => v.lang.includes('US')) || this.availableVoices[0];
          
          if (preferred) {
            this.selectedVoiceURI = preferred.voiceURI;
          }
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    let retryCount = 0;
    const pollInterval = setInterval(() => {
      loadVoices();
      retryCount++;
      if (this.availableVoices.length > 0 || retryCount > 15) {
        clearInterval(pollInterval);
      }
    }, 250);
  }

  getEnglishVoices() {
    if ('speechSynthesis' in window) {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices && allVoices.length > 0) {
        this.availableVoices = allVoices.filter(v => v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB'));
        this.availableVoices.sort((a, b) => {
          const aPri = (a.name.includes('Natural') || a.name.includes('Google') || a.name.includes('Jenny') || a.name.includes('Guy') || a.name.includes('Samantha') || a.name.includes('Zira')) ? 1 : 0;
          const bPri = (b.name.includes('Natural') || b.name.includes('Google') || b.name.includes('Jenny') || b.name.includes('Guy') || b.name.includes('Samantha') || b.name.includes('Zira')) ? 1 : 0;
          return bPri - aPri;
        });
      }
    }
    return this.availableVoices;
  }

  getSelectedVoice() {
    const voices = this.getEnglishVoices();
    return voices.find(v => v.voiceURI === this.selectedVoiceURI) || voices[0] || null;
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI;
    localStorage.setItem('shadowing_voice_uri', voiceURI);
  }

  setRate(rate) {
    this.ttsRate = Math.max(0.25, Math.min(1.2, parseFloat(rate)));
    localStorage.setItem('shadowing_tts_rate', this.ttsRate.toString());
  }

  isSecure() {
    return window.isSecureContext && location.protocol !== 'file:' && location.protocol !== 'content:';
  }

  async initMicSession() {
    if (this.mediaStream) {
      return this.mediaStream;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!this.isSecure()) {
        throw new Error("보안 제한: 로컬 파일 경로에서는 마이크 권한 창이 차단됩니다. GitHub Pages(https://...)에 올려 접속하시면 마이크 권한이 정상 작동합니다.");
      }
      throw new Error("이 브라우저는 마이크 입력을 지원하지 않습니다.");
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
      }

      return this.mediaStream;
    } catch (err) {
      console.error("Microphone initialization error:", err);
      if (!this.isSecure()) {
        throw new Error("로컬 파일 경로(content://, file://)로 열려 있어 마이크 권한 요청이 자동 차단되었습니다. GitHub Pages(https://...)를 통해 접속해주세요.");
      }
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error("마이크 권한이 거부되었습니다. 브라우저 주소창 좌측 자물쇠(설정) 아이콘을 눌러 [마이크 허용]으로 변경해주세요.");
      }
      throw new Error("마이크 권한 오류: " + err.message);
    }
  }

  startRecording() {
    if (!this.mediaStream) {
      throw new Error("마이크 세션이 초기화되지 않았습니다.");
    }

    this.recordedChunks = [];
    this.vocalSamples = 0;
    this.totalSamples = 0;
    this.vocalEnergySum = 0;
    
    let options = { mimeType: 'audio/webm;codecs=opus' };
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported(options.mimeType)) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else {
        options = {};
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(100);

      this.startVADAnalysis();
    } catch (e) {
      console.warn("MediaRecorder start fallback:", e);
    }
  }

  startVADAnalysis() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    if (this.analyserInterval) clearInterval(this.analyserInterval);
    this.analyserInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      this.totalSamples++;
      this.vocalEnergySum += avg;

      if (avg > 15) {
        this.vocalSamples++;
      }
    }, 100);
  }

  stopRecording() {
    if (this.analyserInterval) {
      clearInterval(this.analyserInterval);
      this.analyserInterval = null;
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);

          const ratio = this.totalSamples > 0 ? (this.vocalSamples / this.totalSamples) : 0;
          let effortRating = 5;
          if (ratio >= 0.25) {
            effortRating = 5;
          } else if (ratio >= 0.12) {
            effortRating = 4;
          } else if (ratio > 0.04) {
            effortRating = 3;
          } else {
            effortRating = 2;
          }

          resolve({
            blob: audioBlob,
            url: audioUrl,
            effortRating: effortRating,
            ratio: ratio
          });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cleanTextForTTS(text) {
    if (!text) return '';
    return text
      .replace(/\b([A-Z])\.\s*/g, '$1 ')
      .replace(/\bMrs\.\s*/gi, 'Mrs ')
      .replace(/\bMr\.\s*/gi, 'Mr ')
      .replace(/\bDr\.\s*/gi, 'Dr ')
      .replace(/\b([a-zA-Z]+)-([a-zA-Z]+)\b/g, '$1 $2')
      .trim();
  }

  speakTTS(text, onWordCallback) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error("이 브라우저는 음성 합성을 지원하지 않습니다."));
        return;
      }

      window.speechSynthesis.cancel();

      const spokenText = this.cleanTextForTTS(text);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = 'en-US';
      
      // Explicitly clamp rate between 0.25 and 1.2
      const currentRate = Math.max(0.25, Math.min(1.2, this.ttsRate || 0.60));
      utterance.rate = currentRate;
      utterance.pitch = this.ttsPitch;

      const voice = this.getSelectedVoice();
      if (voice) {
        utterance.voice = voice;
      }

      if (onWordCallback) {
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            onWordCallback(event.charIndex, event.charLength);
          }
        };
      }

      const startMark = performance.now();

      utterance.onend = () => {
        const elapsed = performance.now() - startMark;
        resolve({ durationMs: elapsed });
      };

      utterance.onerror = (e) => {
        const elapsed = performance.now() - startMark;
        console.warn("TTS Event Notice:", e);
        resolve({ durationMs: elapsed });
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  previewVoice() {
    return this.speakTTS("My name is Junie B. Jones. Today is the first day of school.");
  }

  stopTTS() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  playAudioUrl(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      const startMark = performance.now();
      audio.onended = () => resolve({ durationMs: performance.now() - startMark });
      audio.onerror = (e) => {
        console.warn("Audio playback error:", e);
        resolve({ durationMs: performance.now() - startMark });
      };
      audio.play().catch((err) => {
        console.warn("Audio play prevented:", err);
        resolve({ durationMs: performance.now() - startMark });
      });
    });
  }

  playChime() {
    if (!this.audioContext) return;
    try {
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') ctx.resume();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Chime failed", e);
    }
  }

  playFanfare() {
    if (!this.audioContext) return;
    try {
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [
        { f: 523.25, d: 0.15 },
        { f: 659.25, d: 0.15 },
        { f: 783.99, d: 0.15 },
        { f: 1046.50, d: 0.5 }
      ];

      let startTime = ctx.currentTime + 0.05;
      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + note.d);

        startTime += note.d * 0.9;
      });
    } catch (e) {
      console.warn("Fanfare failed", e);
    }
  }
}

window.AudioEngine = AudioEngine;
