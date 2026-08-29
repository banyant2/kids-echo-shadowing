/**
 * CurriculumManager - Continuous Sequential Reading with Emotion/Acting Metadata.
 */
class CurriculumManager {
  constructor() {
    this.STORAGE_KEY_CHAPTERS = 'shadowing_emotion_chapters_v3';
    this.STORAGE_KEY_PROGRESS = 'shadowing_emotion_progress_v3';
    this.STORAGE_KEY_SETTINGS = 'shadowing_emotion_settings_v3';

    // Rich emotion-tagged Chapter 1 of Junie B. Jones
    this.defaultCurriculum = {
      id: 'junie_b_ch1',
      title: 'Junie B. Jones and the Stupid Smelly Bus',
      chapter: 'Chapter 1: I Am Not a Baby',
      sentences: [
        {
          text: "My name is Junie B. Jones.",
          speaker: "Junie B.",
          emotionEmoji: "👧",
          emotionLabel: "👧 씩씩하고 밝게 자기소개!"
        },
        {
          text: "The B stands for Beatrice.",
          speaker: "Junie B.",
          emotionEmoji: "🤫",
          emotionLabel: "🤫 살짝 비밀을 알려주듯"
        },
        {
          text: "Except I do not like Beatrice.",
          speaker: "Junie B.",
          emotionEmoji: "😤",
          emotionLabel: "😤 고개를 저으며 단호하게!"
        },
        {
          text: "I just like B and that's all.",
          speaker: "Junie B.",
          emotionEmoji: "😆",
          emotionLabel: "😆 딱 잘라 말하며 찡긋!"
        },
        {
          text: "I am in kindergarten this year.",
          speaker: "Junie B.",
          emotionEmoji: "🎒",
          emotionLabel: "🎒 자랑스럽고 의기양양하게!"
        },
        {
          text: "My teacher is named Mrs. She has another name, too.",
          speaker: "Junie B.",
          emotionEmoji: "👩‍🏫",
          emotionLabel: "👩‍🏫 생각에 잠기며 또박또박"
        },
        {
          text: "Except I only like Mrs. and that's all.",
          speaker: "Junie B.",
          emotionEmoji: "😤",
          emotionLabel: "😤 고집부리듯 당차게!"
        },
        {
          text: "Today was the first day of school.",
          speaker: "Junie B.",
          emotionEmoji: "📅",
          emotionLabel: "📅 오늘의 중요한 사건 이야기하듯"
        },
        {
          text: "I do not want to ride the school bus.",
          speaker: "Junie B.",
          emotionEmoji: "😡",
          emotionLabel: "😡 입을 삐죽이며 강하게 거부!"
        },
        {
          text: "Because the big kids make fun of me.",
          speaker: "Junie B.",
          emotionEmoji: "🥺",
          emotionLabel: "🥺 억울하고 속상한 마음으로"
        },
        {
          text: "And they squish people into the seats.",
          speaker: "Junie B.",
          emotionEmoji: "😣",
          emotionLabel: "😣 으악! 찡그리며 불평하듯"
        },
        {
          text: "Also, it is too loud and smelly.",
          speaker: "Junie B.",
          emotionEmoji: "👃",
          emotionLabel: "👃 코를 쥐어막으며 질색하듯!"
        },
        {
          text: "My mother said I have to be brave.",
          speaker: "Junie B.",
          emotionEmoji: "👩",
          emotionLabel: "👩 엄마 흉내 내며 얌전하게"
        },
        {
          text: "But I don't want to be brave at all.",
          speaker: "Junie B.",
          emotionEmoji: "😤",
          emotionLabel: "😤 발을 동동 구르며 투정 부리듯!"
        },
        {
          text: "I saw my best friend Lucille on the playground.",
          speaker: "Junie B.",
          emotionEmoji: "👭",
          emotionLabel: "👭 친구를 발견하고 반갑게!"
        },
        {
          text: "Lucille had on a beautiful fluffy dress.",
          speaker: "Junie B.",
          emotionEmoji: "👗",
          emotionLabel: "👗 눈을 크게 뜨며 감탄하듯"
        },
        {
          text: "She said her grandmother bought it for her.",
          speaker: "Lucille",
          emotionEmoji: "💅",
          emotionLabel: "💅 새침하고 도도한 공주님처럼"
        },
        {
          text: "I told her my shoes were brand new, too.",
          speaker: "Junie B.",
          emotionEmoji: "👟",
          emotionLabel: "👟 질 수 없다는 듯 자랑하며!"
        },
        {
          text: "Then we ran together to the classroom door.",
          speaker: "Junie B.",
          emotionEmoji: "🏃‍♀️",
          emotionLabel: "🏃‍♀️ 우다다 뛰어가듯 신나게!"
        },
        {
          text: "Our classroom has shiny tables and little chairs.",
          speaker: "Junie B.",
          emotionEmoji: "✨",
          emotionLabel: "✨ 신기한 교실을 둘러보며"
        },
        {
          text: "At three o'clock, the loud bell rang.",
          speaker: "Junie B.",
          emotionEmoji: "🔔",
          emotionLabel: "🔔 땡땡땡! 소리에 깜짝 놀라며"
        },
        {
          text: "Mrs. told everybody to get in line for the bus.",
          speaker: "Junie B.",
          emotionEmoji: "😱",
          emotionLabel: "😱 올 것이 왔다는 듯 긴장하며"
        },
        {
          text: "My heart started beating very fast.",
          speaker: "Junie B.",
          emotionEmoji: "💓",
          emotionLabel: "💓 쿵쾅쿵쾅 가슴을 짚으며 조마조마하게..."
        },
        {
          text: "The big yellow bus was waiting outside the door.",
          speaker: "Junie B.",
          emotionEmoji: "🚌",
          emotionLabel: "🚌 거대한 괴물을 보듯 떨리는 목소리로"
        },
        {
          text: "I walked very slowly down the sidewalk.",
          speaker: "Junie B.",
          emotionEmoji: "🐢",
          emotionLabel: "🐢 거북이처럼 발을 질질 끌며"
        },
        {
          text: "I tried to hide behind a tall green bush.",
          speaker: "Junie B.",
          emotionEmoji: "🤫",
          emotionLabel: "🤫 숨죽여 쉿! 속삭이듯이"
        },
        {
          text: "Because I am not going to ride that smelly bus today!",
          speaker: "Junie B.",
          emotionEmoji: "😤",
          emotionLabel: "😤 결심한 듯 굳건하고 당차게 외치기!"
        }
      ]
    };

    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(this.STORAGE_KEY_CHAPTERS)) {
      this.saveChapters([this.defaultCurriculum]);
    }

    if (!localStorage.getItem(this.STORAGE_KEY_PROGRESS)) {
      this.saveProgress({
        currentChapterId: 'junie_b_ch1',
        currentSentenceIndex: 0,
        totalPoints: 0,
        completedSessions: []
      });
    }

    if (!localStorage.getItem(this.STORAGE_KEY_SETTINGS)) {
      this.saveSettings({
        sessionDurationMinutes: 30
      });
    }
  }

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY_SETTINGS)) || { sessionDurationMinutes: 30 };
    } catch (e) {
      return { sessionDurationMinutes: 30 };
    }
  }

  saveSettings(settings) {
    localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  setSessionDuration(minutes) {
    const s = this.getSettings();
    s.sessionDurationMinutes = parseInt(minutes, 10);
    this.saveSettings(s);
  }

  getChapters() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY_CHAPTERS)) || [this.defaultCurriculum];
    } catch (e) {
      return [this.defaultCurriculum];
    }
  }

  saveChapters(chapters) {
    localStorage.setItem(this.STORAGE_KEY_CHAPTERS, JSON.stringify(chapters));
  }

  getProgress() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY_PROGRESS)) || {
        currentChapterId: 'junie_b_ch1',
        currentSentenceIndex: 0,
        totalPoints: 0,
        completedSessions: []
      };
    } catch (e) {
      return { currentChapterId: 'junie_b_ch1', currentSentenceIndex: 0, totalPoints: 0, completedSessions: [] };
    }
  }

  saveProgress(progress) {
    localStorage.setItem(this.STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  }

  getCurrentChapter() {
    const progress = this.getProgress();
    const chapters = this.getChapters();
    return chapters.find(c => c.id === progress.currentChapterId) || chapters[0] || this.defaultCurriculum;
  }

  getAllSentences() {
    const chapter = this.getCurrentChapter();
    return chapter.sentences || [];
  }

  getCurrentSentenceItem(index) {
    const sentences = this.getAllSentences();
    const item = sentences[index];
    if (!item) return null;
    if (typeof item === 'string') {
      return {
        text: item,
        speaker: 'Narrator',
        emotionEmoji: '📖',
        emotionLabel: '📖 또박또박 낭독하기'
      };
    }
    return item;
  }

  getBookmarkIndex() {
    const progress = this.getProgress();
    return progress.currentSentenceIndex || 0;
  }

  saveBookmarkIndex(index) {
    const progress = this.getProgress();
    progress.currentSentenceIndex = index;
    this.saveProgress(progress);
  }

  recordSessionCompletion(earnedPoints, readCount, durationMinutes) {
    const progress = this.getProgress();
    const todayStr = new Date().toISOString();

    progress.totalPoints = (progress.totalPoints || 0) + earnedPoints;
    progress.completedSessions = progress.completedSessions || [];
    progress.completedSessions.push({
      date: todayStr,
      points: earnedPoints,
      readCount: readCount,
      durationMinutes: durationMinutes,
      chapterId: progress.currentChapterId
    });

    this.saveProgress(progress);
    return progress.totalPoints;
  }

  addContinuousChapter(title, chapterName, sentences) {
    if (!sentences || sentences.length === 0) {
      throw new Error("추출된 문장이 없습니다.");
    }

    const newChapter = {
      id: 'chapter_' + Date.now(),
      title: title || '새로운 책',
      chapter: chapterName || 'Chapter 1',
      sentences: sentences
    };

    const chapters = this.getChapters();
    chapters.unshift(newChapter);
    this.saveChapters(chapters);

    const progress = this.getProgress();
    progress.currentChapterId = newChapter.id;
    progress.currentSentenceIndex = 0;
    this.saveProgress(progress);

    return newChapter;
  }
}

window.CurriculumManager = CurriculumManager;
