/**
 * GeminiApi - Client-Side Auto-Compressed Multi-Photo OCR & Emotion Dramatizer.
 * Automatically downsamples high-res mobile photos to ~150KB for instant, error-free API calls.
 */
class GeminiApi {
  constructor() {
    this.STORAGE_KEY_GEMINI_KEY = 'shadowing_gemini_api_key';
    this.STORAGE_KEY_OPENAI_KEY = 'shadowing_openai_api_key';
    this.STORAGE_KEY_ACTING_VOICE = 'shadowing_acting_voice';
  }

  getGeminiApiKey() {
    return localStorage.getItem(this.STORAGE_KEY_GEMINI_KEY) || '';
  }

  setGeminiApiKey(key) {
    if (key) {
      localStorage.setItem(this.STORAGE_KEY_GEMINI_KEY, key.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEY_GEMINI_KEY);
    }
  }

  getOpenAIApiKey() {
    return localStorage.getItem(this.STORAGE_KEY_OPENAI_KEY) || '';
  }

  setOpenAIApiKey(key) {
    if (key) {
      localStorage.setItem(this.STORAGE_KEY_OPENAI_KEY, key.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEY_OPENAI_KEY);
    }
  }

  getActingVoice() {
    return localStorage.getItem(this.STORAGE_KEY_ACTING_VOICE) || 'nova';
  }

  setActingVoice(voice) {
    localStorage.setItem(this.STORAGE_KEY_ACTING_VOICE, voice);
  }

  /**
   * 고화질 스마트폰 사진을 0.1초 만에 선명한 150KB 이미지로 자동 리사이징
   */
  compressImage(file, maxDimension = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',');
        resolve({
          mimeType: 'image/jpeg',
          data: base64
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지 파일을 읽을 수 없습니다: " + file.name));
      };
      img.src = objectUrl;
    });
  }

  getVoiceForSpeaker(speaker) {
    if (!speaker) return this.getActingVoice();
    const s = speaker.toLowerCase();
    
    if (s.includes('mom') || s.includes('mother') || s.includes('mrs') || s.includes('teacher') || s.includes('grandma') || s.includes('lady')) {
      return 'shimmer';
    }
    if (s.includes('dad') || s.includes('father') || s.includes('mr') || s.includes('man') || s.includes('driver')) {
      return 'echo';
    }
    if (s.includes('grandpa') || s.includes('grandfather') || s.includes('narrator') || s.includes('author')) {
      return 'fable';
    }
    return this.getActingVoice();
  }

  /**
   * 사진 원클릭 일괄 추출 및 감정 연기 태그 분석
   */
  async extractStoryWithEmotions(imageFiles, bookTitle, chapterName, onProgress = null) {
    const apiKey = this.getGeminiApiKey();
    if (!apiKey) {
      throw new Error("Gemini API 키가 필요합니다. [설정 > API 키]에서 키를 입력해주세요.");
    }

    if (!imageFiles || imageFiles.length === 0) {
      throw new Error("업로드할 사진을 1장 이상 선택해주세요.");
    }

    const imageParts = [];
    for (let i = 0; i < imageFiles.length; i++) {
      if (onProgress) onProgress(`사진 최적화 압축 중 (${i + 1}/${imageFiles.length})...`);
      const compressed = await this.compressImage(imageFiles[i]);
      imageParts.push({
        inlineData: {
          mimeType: compressed.mimeType,
          data: compressed.data
        }
      });
    }

    const promptText = `
You are a master children's book dramatizer and English shadowing specialist.
The attached images are sequential pages from an English children's book.

Your Tasks:
1. Transcribe all English sentences in exact chronological order from page 1 to the end.
2. Clean up hyphenated line breaks, page numbers, and scanning noise.
3. Keep the exact original text of the story (do NOT omit words or paraphrase).
4. Break long sentences into natural speaking chunks (6-12 words per chunk) for 1st-2nd graders.
5. For EVERY sentence, accurately tag the speaker, emotion emoji, and acting cue:
   - "speaker": character name (e.g. "Junie B.", "Mom", "Dad", "Mrs.", "Lucille", "Grandpa", "Narrator")
   - "emotionEmoji": expressive emoji (e.g. "😤", "😡", "😱", "😆", "🤫", "👧", "👩", "👨", "👴")
   - "emotionLabel": short lively Korean acting cue (e.g. "😤 새침하고 당당하게!", "👩 다정하게 미소 지으며", "👨 든든하고 친절하게", "😱 가슴 졸이며 속삭이듯...", "😆 신나고 장난스럽게!")

Format Requirement:
Return ONLY a valid JSON object matching this schema:
{
  "title": "${bookTitle || '영어 동화'}",
  "chapter": "${chapterName || 'Chapter 1'}",
  "sentences": [
    {
      "text": "My name is Junie B. Jones.",
      "speaker": "Junie B.",
      "emotionEmoji": "👧",
      "emotionLabel": "👧 씩씩하고 밝게 자기소개!"
    }
  ]
}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            ...imageParts
          ]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    };

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ];

    let lastError = null;
    let resJson = null;

    for (const modelName of candidateModels) {
      if (onProgress) onProgress(`Gemini AI (${modelName})로 책 분석 중...`);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          resJson = await response.json();
          break; // 성공!
        } else {
          const errText = await response.text();
          console.warn(`Endpoint ${modelName} returned ${response.status}:`, errText);
          lastError = new Error(`Gemini API 오류 (${response.status}): ${errText}`);
        }
      } catch (networkErr) {
        lastError = networkErr;
      }
    }

    if (!resJson) {
      throw lastError || new Error("Gemini AI 호출에 실패했습니다. aistudio.google.com에서 API 키를 확인해주세요.");
    }

    const rawContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error("Gemini AI로부터 올바른 응답을 받지 못했습니다.");
    }

    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }

  async generateCharacterAudio(text, speaker = 'Junie B.', speed = 0.88) {
    const openAIKey = this.getOpenAIApiKey();
    if (!openAIKey) return null;

    const voice = this.getVoiceForSpeaker(speaker);
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          speed: speed,
          response_format: 'mp3'
        })
      });

      if (!response.ok) return null;
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      return null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.GeminiApi = GeminiApi;
}
