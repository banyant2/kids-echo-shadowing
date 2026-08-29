/**
 * GeminiApi & Multi-Speaker Voice Synthesizer with Dynamic Model Discovery.
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

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',');
        resolve({
          mimeType: file.type || 'image/jpeg',
          data: base64String
        });
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
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
   * API 키에서 지원하는 모델을 실시간으로 자동 조회
   */
  async getAvailableModel(apiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          const preferred = data.models.find(m => 
            (m.name.includes('flash') || m.name.includes('pro')) && 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
          );
          if (preferred) return preferred.name;
          const fallback = data.models.find(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
          if (fallback) return fallback.name;
        }
      }
    } catch (e) {
      console.warn("ListModels 조회 실패:", e);
    }
    return null;
  }

  async extractStoryWithEmotions(imageFiles, bookTitle, chapterName, onProgress = null) {
    const apiKey = this.getGeminiApiKey();
    if (!apiKey) {
      throw new Error("Gemini API 키가 필요합니다. [설정 > API 키]에서 키를 입력해주세요.");
    }

    if (!imageFiles || imageFiles.length === 0) {
      throw new Error("업로드할 사진을 1장 이상 선택해주세요.");
    }

    if (onProgress) onProgress(`사진 ${imageFiles.length}장 인코딩 중...`);

    const imageParts = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const b64 = await this.fileToBase64(imageFiles[i]);
      imageParts.push({
        inline_data: {
          mime_type: b64.mimeType,
          data: b64.data
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

    if (onProgress) onProgress("Gemini API 모델 자동 감지 중...");
    const discoveredModelName = await this.getAvailableModel(apiKey);

    const candidateEndpoints = [];
    if (discoveredModelName) {
      candidateEndpoints.push(`https://generativelanguage.googleapis.com/v1beta/${discoveredModelName}:generateContent?key=${apiKey}`);
    }

    candidateEndpoints.push(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`
    );

    let lastError = null;
    let resJson = null;

    for (let i = 0; i < candidateEndpoints.length; i++) {
      const endpoint = candidateEndpoints[i];
      const modelCleanName = endpoint.split('/models/') ? endpoint.split('/models/').split(':')[0] : 'gemini';

      if (onProgress) onProgress(`Gemini AI (${modelCleanName}) 분석 중...`);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          resJson = await response.json();
          break;
        } else {
          const errText = await response.text();
          console.warn(`Endpoint ${modelCleanName} failed:`, errText);
          lastError = new Error(`Gemini API 오류 (${response.status}): ${errText}`);
        }
      } catch (networkErr) {
        lastError = networkErr;
      }
    }

    if (!resJson) {
      throw lastError || new Error("Gemini API 호출에 실패했습니다. aistudio.google.com에서 발급받은 API 키인지 확인해주세요.");
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

window.GeminiApi = GeminiApi;
