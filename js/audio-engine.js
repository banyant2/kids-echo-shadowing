/**
 * AudioEngine - Manages Web Audio API, Persistent Mic Stream, AEC, TTS, and Recording.
 */
class AudioEngine {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.audioContext = null;
    this.ttsVoice = null;
    this.ttsRate = 0.88; // Optimized for 1st-2nd graders
    this.initVoices();
  }

  initVoices() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer high quality US English voices
        this.ttsVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) 
                     || voices.find(v => v.lang.startsWith('en')) 
                     || null;
      };
    }
  }

  async initMicSession() {
    if (this.mediaStream) {
      return this.mediaStream;
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
      }

      return this.mediaStream;
    } catch (err) {
      console.error("Microphone initialization error:", err);
      throw new Error("마이크 권한을 허용해주세요: " + err.message);
    }
  }

  startRecording() {
    if (!this.mediaStream) {
      throw new Error("마이크 세션이 초기화되지 않았습니다.");
    }

    this.recordedChunks = [];
    
    // Choose best supported mimeType
    let options = { mimeType: 'audio/webm;codecs=opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else {
        options = {};
      }
    }

    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // 100ms timeslices for smooth data collection
  }

  stopRecording() {
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
          resolve({ blob: audioBlob, url: audioUrl });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  speakTTS(text, onWordCallback) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error("이 브라우저는 음성 합성을 지원하지 않습니다."));
        return;
      }

      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = this.ttsRate;
      utterance.pitch = 1.05; // Slightly clear and friendly tone

      if (this.ttsVoice) {
        utterance.voice = this.ttsVoice;
      }

      if (onWordCallback) {
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            onWordCallback(event.charIndex, event.charLength);
          }
        };
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn("TTS Event Notice:", e);
        resolve(); // Continue even if interrupted
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stopTTS() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  playAudioUrl(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = (e) => {
        console.warn("Audio playback error:", e);
        resolve();
      };
      audio.play().catch((err) => {
        console.warn("Audio play prevented:", err);
        resolve();
      });
    });
  }

  // Synthesized Sound Effects (Zero external file dependencies)
  playChime() {
    if (!this.audioContext) return;
    try {
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') ctx.resume();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

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
        { f: 523.25, d: 0.15 }, // C5
        { f: 659.25, d: 0.15 }, // E5
        { f: 783.99, d: 0.15 }, // G5
        { f: 1046.50, d: 0.5 }  // C6
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
