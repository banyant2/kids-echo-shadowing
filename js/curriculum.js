/**
 * CurriculumManager - Manages daily lessons, sentence splitting, points, and curriculum storage.
 */
class CurriculumManager {
  constructor() {
    this.STORAGE_KEY_CHAPTERS = 'shadowing_chapters_v1';
    this.STORAGE_KEY_PROGRESS = 'shadowing_progress_v1';
    this.STORAGE_KEY_RECORDS = 'shadowing_records_v1';

    this.defaultCurriculum = {
      id: 'junie_b_ch1',
      title: 'Junie B. Jones and the Stupid Smelly Bus',
      chapter: 'Chapter 1: I Am Not a Baby',
      days: {
        1: {
          theme: 'Day 1: 캐릭터 소개 및 감정 표현',
          sentences: [
            "My name is Junie B. Jones.",
            "The B stands for Beatrice.",
            "Except I do not like Beatrice.",
            "I just like B and that's all.",
            "I am in kindergarten this year.",
            "My teacher is named Mrs. She has another name, too.",
            "Except I only like Mrs. and that's all."
          ]
        },
        2: {
          theme: 'Day 2: 스쿨버스 이야기 시작',
          sentences: [
            "Today was the first day of school.",
            "I do not want to ride the school bus.",
            "Because the big kids make fun of me.",
            "And they squish people into the seats.",
            "Also, it is too loud and smelly.",
            "My mother said I have to be brave.",
            "But I don't want to be brave at all."
          ]
        },
        3: {
          theme: 'Day 3: 친구와의 대화 & 교실 상황',
          sentences: [
            "I saw my best friend Lucille on the playground.",
            "Lucille had on a beautiful fluffy dress.",
            "She said her grandmother bought it for her.",
            "I told her my shoes were brand new, too.",
            "Then we ran together to the classroom door.",
            "Our classroom has shiny tables and little chairs."
          ]
        },
        4: {
          theme: 'Day 4: 스쿨버스 탑승의 위기',
          sentences: [
            "At three o'clock, the loud bell rang.",
            "Mrs. told everybody to get in line.",
            "My heart started beating very fast.",
            "The big yellow bus was waiting outside.",
            "I walked very slowly down the sidewalk.",
            "I tried to hide behind a tall bush."
          ]
        },
        5: {
          theme: 'Day 5: 챕터 1 핵심 표현 총정리 복습',
          sentences: [
            "My name is Junie B. Jones.",
            "I just like B and that's all.",
            "I do not want to ride the school bus.",
            "Because the big kids make fun of me.",
            "Mrs. said everybody has to listen carefully.",
            "Tomorrow is going to be a brand new day!"
          ]
        }
      }
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
        currentDay: 1,
        totalPoints: 0,
        completedDays: {},
        lastCompletedDate: null
      });
    }
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
        currentDay: 1,
        totalPoints: 0,
        completedDays: {},
        lastCompletedDate: null
      };
    } catch (e) {
      return { currentChapterId: 'junie_b_ch1', currentDay: 1, totalPoints: 0 };
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

  getCurrentDaySentences() {
    const chapter = this.getCurrentChapter();
    const progress = this.getProgress();
    const dayData = chapter.days[progress.currentDay];
    if (dayData && dayData.sentences) {
      return dayData.sentences;
    }
    // Fallback to day 1
    return (chapter.days[1] && chapter.days[1].sentences) || [];
  }

  setDay(dayNum) {
    const progress = this.getProgress();
    progress.currentDay = parseInt(dayNum, 10);
    this.saveProgress(progress);
  }

  awardMissionPoints() {
    const progress = this.getProgress();
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `${progress.currentChapterId}_day${progress.currentDay}_${todayStr}`;

    progress.totalPoints = (progress.totalPoints || 0) + 5;
    progress.completedDays = progress.completedDays || {};
    progress.completedDays[key] = {
      date: todayStr,
      points: 5,
      chapter: progress.currentChapterId,
      day: progress.currentDay
    };
    progress.lastCompletedDate = todayStr;

    // Auto advance to next day if available
    const chapter = this.getCurrentChapter();
    const maxDay = Math.max(...Object.keys(chapter.days).map(Number));
    if (progress.currentDay < maxDay) {
      progress.currentDay += 1;
    }

    this.saveProgress(progress);
    return progress.totalPoints;
  }

  /**
   * Split raw OCR / Photo text into optimal elementary school sentences
   */
  splitRawTextIntoSentences(rawText) {
    if (!rawText) return [];

    // Normalize whitespace
    let text = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/ +/g, ' ');

    // Match sentences ending in punctuation
    const rawMatches = text.match(/[^.!?\n]+[.!?]+["']?|[^.!?\n]+$/g) || [];
    const result = [];

    rawMatches.forEach(chunk => {
      let trimmed = chunk.trim();
      if (trimmed.length < 3) return;

      // Clean leading page numbers or garbage
      trimmed = trimmed.replace(/^[\d\s\-_.,]+/, '').trim();
      if (!trimmed) return;

      // If sentence is too long (> 16 words), try splitting at commas or conjunctions for young kids
      const words = trimmed.split(' ');
      if (words.length > 16) {
        const commaIndex = trimmed.indexOf(', ');
        if (commaIndex > 15 && commaIndex < trimmed.length - 15) {
          result.push(trimmed.slice(0, commaIndex + 1).trim());
          result.push(trimmed.slice(commaIndex + 2).trim());
          return;
        }
      }

      result.push(trimmed);
    });

    return result;
  }

  /**
   * Automatically organize a list of sentences into 5-10 day sets
   */
  createChapterFromSentences(title, chapterName, sentences, daysCount = 6) {
    const total = sentences.length;
    const perDay = Math.max(6, Math.ceil(total / daysCount));
    const days = {};

    for (let d = 1; d <= daysCount; d++) {
      const start = (d - 1) * perDay;
      const end = Math.min(start + perDay, total);
      let daySentences = sentences.slice(start, end);

      if (daySentences.length === 0 && d > 1) {
        // Add review sentences for later days
        daySentences = sentences.slice(0, Math.min(8, total));
      }

      days[d] = {
        theme: `Day ${d}: 핵심 문장 학습`,
        sentences: daySentences
      };
    }

    const newChapter = {
      id: 'custom_' + Date.now(),
      title: title || '새로운 영어 동화',
      chapter: chapterName || 'Chapter 1',
      days: days
    };

    const chapters = this.getChapters();
    chapters.unshift(newChapter); // Make it the first/active one
    this.saveChapters(chapters);

    const progress = this.getProgress();
    progress.currentChapterId = newChapter.id;
    progress.currentDay = 1;
    this.saveProgress(progress);

    return newChapter;
  }
}

window.CurriculumManager = CurriculumManager;
