/**
 * GeminiApi - Dedicated to the Single Most Cost-Effective & Fastest Model (Gemini 2.0 Flash).
 * Zero redundant model cycling, 100% free-tier eligible.
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
        const result = reader.result;
        // Extract exact base64 data string after the comma
        const base64String = (typeof result === 'string' && result.indexOf(',') !== -1)
          ? result.split(',')[1]
          : result;
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
   * Single Dedicated Call to the Fastest & Cheapest Model (Gemini 2.0 Flash)
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
        inlineData: {
          mimeType: b64.mimeType,
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

    if (onProgress) onProgress("Gemini 2.0 Flash로 책 분석 중...");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Gemini API 오류 (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg += `: ${parsed.error.message}`;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const resJson = await response.json();
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
