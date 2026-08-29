# 📚 Kids Echo Shadowing (초등 집중듣기 듀엣 쉐도잉 앱)

초등학교 1~2학년 형제/자매가 **스마트 TV 또는 태블릿** 앞에서 함께 15분 동안 재미있게 따라 읽을 수 있도록 최적화된 집중듣기 쉐도잉 웹 애플리케이션입니다.

---

## 🌟 핵심 특징

1. **기계 판정(STT) 배제 — 실패 경험 제로**:
   - "틀렸습니다", "못 들었습니다" 같은 기계 오류로 인한 아이들의 좌절감을 원천 차단합니다.
   - 아이가 읽었는지 평가하지 않고, 오직 **성실하게 15분 루틴을 완주했는가**만 격려합니다.

2. **5단계 완전 자동 순환 루프 (One-Touch Start)**:
   - 아이는 처음에 `[START]` 버튼만 한 번 누르면 끝까지 자동으로 진행됩니다.
   - `🔊 원음 재생 (하이라이트)` ➡️ `🎤 듀엣 동시 녹음` ➡️ `👂 방금 우리 둘이 읽은 목소리 자동 재생` ➡️ `🔊 원음 재확인` ➡️ `➡️ 다음 문장 자동 이동`

3. **스마트 TV 미러링 & 에코 캔슬레이션(AEC) 최적화**:
   - 소리는 2~3m 떨어진 TV 스피커에서 나오고, 마이크는 아이들 앞 테이블 스마트폰에 위치하여 **원음 간섭 없이 아이들 목소리만 깨끗하게 녹음**됩니다.

4. **두 아이 동시 낭독 (Choral Reading)**:
   - 한 명씩 번갈아 하지 않고 두 아이가 함께 소리 내어 읽어 **15분 안에 두 아이의 하루 분량을 동시에 완료**합니다.
   - `Auto Gain Control (AGC)`이 자동 적용되어 성량 차이를 보정합니다.

5. **성실도 기반 5점 보상 & 팡파르 축하**:
   - 오늘 할당된 문장을 끝까지 완주하면 **화려한 폭죽 애니메이션과 팡파르 음악과 함께 ⭐⭐⭐⭐⭐ 5점이 부여**됩니다.
   - 누적 점수판으로 동기부여를 유지합니다.

6. **사진 기반 지능형 챕터 분할 (Curriculum Manager)**:
   - 종이책 사진 10~20장을 찍어 텍스트를 넣으면, 아이들 호흡에 맞는 문장으로 정제하여 **6~12일 치 일자별 코스(Day 1, Day 2...)로 자동 편성**합니다.

---

## 🚀 GitHub에 올리고 GitHub Pages로 배포하는 방법

이 프로젝트는 별도의 백엔드 서버나 빌드 과정 없이 순수 정적 웹 기술(HTML5, Web Audio API, Vanilla JS)로 작성되어 **GitHub Pages에 올리면 30초 만에 무료 배포**됩니다.

### 1단계: GitHub 새 저장소(Repository) 생성
1. [GitHub](https://github.com)에 로그인 후 우측 상단 `+` 버튼 ➡️ **New repository** 클릭.
2. Repository name 입력 (예: `kids-echo-shadowing`).
3. **Public** (또는 Private) 선택 후 **Create repository** 클릭.

### 2단계: 코드 푸시 (터미널 / VS Code)
프로젝트 폴더 안에서 터미널을 열고 다음 명령어를 실행합니다:

```bash
git init
git add .
git commit -m "feat: Initial commit for Kids Echo Shadowing App"
git branch -M main
git remote add origin https://github.com/<본인-GitHub-아이디>/kids-echo-shadowing.git
git push -u origin main
```

### 3단계: GitHub Pages 1클릭 활성화
1. 생성한 GitHub 저장소 페이지의 **Settings** 탭으로 이동합니다.
2. 좌측 메뉴에서 **Pages**를 클릭합니다.
3. **Build and deployment > Source**에서 `Deploy from a branch`를 선택합니다.
4. **Branch**를 `main` / `/(root)`로 설정하고 **Save**를 누릅니다.
5. 1분 후 제공되는 URL(예: `https://<아이디>.github.io/kids-echo-shadowing/`)로 접속하면 **태블릿, 스마트폰, TV 브라우저 어디서나 즉시 사용 가능**합니다!

---

## 📱 스마트 TV 및 태블릿 세팅 팁

1. **스마트 TV 연결**:
   - 스마트폰이나 태블릿에서 브라우저로 접속한 뒤, **Smart View(삼성) / AirPlay(애플) / 화면 미러링**을 켭니다.
   - TV 화면에 큼직한 텍스트와 하이라이트가 표시됩니다.
2. **마이크 배치**:
   - 폰 또는 태블릿을 두 아이의 정중앙(테이블 위 약 30~50cm)에 거치합니다.
3. **홈 화면에 추가 (PWA)**:
   - 브라우저 메뉴에서 `홈 화면에 추가`를 누르면 일반 앱처럼 주소창 없이 전체화면으로 실행됩니다.

---

## 📂 파일 구조

```
├── index.html           # TV/태블릿 최적화 메인 UI 및 모달
├── manifest.json        # PWA 매니페스트 (앱 설치 지원)
├── sw.js                # 오프라인 캐시 서비스 워커
├── css/
│   └── style.css        # 고대비·대형 타이포그래피 스타일시트
├── js/
│   ├── audio-engine.js  # Web Audio, AEC, 마이크 세션, TTS, 효과음 엔진
│   ├── curriculum.js    # 문장 분할, 일자별 코스, 점수 저장 관리자
│   └── app.js           # 5단계 상태 머신 및 UI 동기화 컨트롤러
└── README.md            # 사용 및 배포 설명서
```
