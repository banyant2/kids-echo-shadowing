/**
 * GeminiApi & VoiceSynthesizer - Handles Photo OCR, Emotion/Speaker Tagging, and Character-Acted Voice Generation.
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
        const base64String = reader.result.split(',')[1];
        resolve({
          mimeType: file.type || 'image/jpeg',
          data: base64String
        });
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 1단계: 사진에서 텍스트 추출 + 화자 및 감정 연기 태그 정밀 분석
   */
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

    if (onProgress) onProgress("Gemini AI가 책의 전체 내용과 주인공의 감정선을 분석 중입니다...");

    const promptText = `
You are a master children's book dramatizer and English shadowing specialist.
The attached images are sequential pages from an English children's book (e.g. Junie B. Jones).

Your Tasks:
1. Transcribe all English sentences in exact chronological order from page 1 to the end.
2. Clean up hyphenated line breaks, page numbers, and scanning noise.
3. Keep the exact original text of the story (do NOT omit words or paraphrase).
4. Break long sentences into natural speaking chunks (6-12 words per chunk) for 1st-2nd graders.
5. For EVERY sentence, analyze the speaker, emotional state, and voice-acting direction:
   - "speaker": character name (e.g. "Junie B.", "Mom", "Mrs.", "Lucille", "Narrator")
   - "emotionEmoji": expressive emoji (e.g. "😤", "😡", "😱", "😆", "🤫", "👧")
   - "emotionLabel": short lively Korean acting cue (e.g. "😤 새침하고 당당하게!", "😡 앙칼지게 투정 부리듯!", "😱 가슴 졸이며 속삭이듯...", "😆 신나고 장난스럽게!", "👧 씩씩하고 밝게!")

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
      "emotionLabel": "👧 씩씩하고 당당하게!"
    },
    {
      "text": "Except I do not like Beatrice!",
      "speaker": "Junie B.",
      "emotionEmoji": "😤",
      "emotionLabel": "😤 팔짱 끼고 새침하게!"
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

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Gemini API 호출 실패 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          msg += `: ${errJson.error.message}`;
        }
      } catch (e) {}
      throw new Error(msg);
    }

    const resJson = await response.json();
    const rawContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error("Gemini AI로부터 올바른 응답을 받지 못했습니다.");
    }

    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }

  /**
   * 2단계: OpenAI 고음질 성우 음성(MP3) 생성 (OpenAI API 키가 있을 경우 자동 수행)
   */
  async generateOpenAIAudio(text, voice = 'nova', speed = 0.88) {
    const openAIKey = this.getOpenAIApiKey();
    if (!openAIKey) {
      return null; // Fallback to enhanced Web Speech
    }

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

    if (!response.ok) {
      console.warn("OpenAI TTS fetch failed, fallback to Web Speech", response.status);
      return null;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

window.GeminiApi = GeminiApi;
