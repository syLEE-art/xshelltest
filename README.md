# 🖥️ 네트워크 관제 센터

서버 원격 접속 및 상태 모니터링을 위한 웹 기반 대시보드입니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ 주요 기능

### 🔌 Xshell 원격 접속
- SSH 프로토콜 핸들러를 통한 Xshell 7 즉시 실행
- IP 주소, 포트, 사용자 이름 입력 지원
- 즐겨찾기 기능으로 자주 사용하는 호스트 저장

### 📡 상태 확인 (Ping Test)
- HTTP Fetch 기반 연결 테스트 (브라우저 보안 정책 준수)
- 실시간 응답 속도 그래프 시각화
- 상태 LED 인디케이터 (정상/응답없음/확인중)
- 통계 정보 (성공률, 평균/최소/최대 응답 시간)

### 🎨 UI/UX
- 다크 모드 기반 사이버펑크 디자인
- 네트워크 관제 센터 스타일 인터페이스
- 반응형 웹 디자인 (모바일/태블릿/데스크톱)
- 애니메이션 효과 및 LED 인디케이터
- **한국어 UI 완벽 지원**

## 🚀 빠른 시작

### 로컬에서 실행하기
```bash
# 프로젝트 폴더로 이동
cd monitoring-dashboard

# Python으로 간단한 HTTP 서버 실행
python -m http.server 8080

# 또는 Node.js 사용
npx serve .
```

브라우저에서 `http://localhost:8080` 접속

### GitHub Pages로 배포하기
프로젝트를 GitHub에 업로드하고 Settings > Pages에서 배포하면 됩니다.

## 📁 프로젝트 구조

```
monitoring-dashboard/
├── index.html      # 메인 HTML 파일
├── style.css       # 커스텀 CSS 스타일
├── script.js       # JavaScript 로직
└── README.md       # 프로젝트 문서
```

## 🔧 Xshell SSH 프로토콜 핸들러 설정

### Windows (Xshell 사용 시)
Xshell이 설치되면 자동으로 `ssh://` 프로토콜 핸들러가 등록됩니다.

수동 등록이 필요한 경우:
1. 레지스트리 편집기 실행 (`regedit`)
2. `HKEY_CLASSES_ROOT\ssh` 키 생성
3. `shell\open\command` 하위 키에 Xshell 경로 설정

### macOS/Linux
터미널 애플리케이션이 기본 SSH 핸들러로 동작합니다.

## 💻 Git 명령어 가이드

### 1. 저장소 클론 (처음 시작하는 경우)
```bash
git clone https://github.com/syLEE-art/monitoring-test01.git
cd monitoring-test01
```

### 2. 새 저장소에 업로드 (처음 푸시하는 경우)
```bash
# Git 저장소 초기화
git init

# 원격 저장소 연결
git remote add origin https://github.com/syLEE-art/monitoring-test01.git

# 파일 추가
git add .

# 커밋
git commit -m "feat: 네트워크 관제 대시보드 초기 버전"

# 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

### 3. 변경사항 업데이트
```bash
# 변경된 파일 확인
git status

# 모든 변경사항 스테이징
git add .

# 또는 특정 파일만 스테이징
git add index.html style.css script.js

# 커밋 (의미있는 메시지 작성)
git commit -m "fix: 상태 확인 타임아웃 수정"

# 푸시
git push origin main
```

### 4. GitHub Pages 배포 방법
```bash
# GitHub 웹사이트에서:
# 1. Repository > Settings > Pages
# 2. Source: "Deploy from a branch" 선택
# 3. Branch: main / root 선택
# 4. Save 클릭

# 몇 분 후 https://syLEE-art.github.io/monitoring-test01/ 에서 접속 가능
```

### 5. 자주 사용하는 Git 명령어
```bash
# 커밋 히스토리 확인
git log --oneline

# 브랜치 확인
git branch -a

# 원격 저장소 정보 확인
git remote -v

# 변경사항 되돌리기 (커밋 전)
git checkout -- <파일명>

# 마지막 커밋 메시지 수정
git commit --amend -m "새로운 커밋 메시지"
```

## ⚙️ 설정 커스터마이징

### 설정 변수 (script.js)
```javascript
const CONFIG = {
    PING_COUNT: 10,           // 상태 확인 요청 횟수
    PING_INTERVAL: 1000,      // 요청 간격 (ms)
    PING_TIMEOUT: 5000,       // 타임아웃 (ms)
    GRAPH_MAX_POINTS: 20,     // 그래프 최대 포인트
    GRAPH_MAX_MS: 500,        // Y축 최대값 (ms)
    DEFAULT_SSH_PORT: 22      // 기본 SSH 포트
};
```

### 메시지 커스터마이징 (script.js)
```javascript
const MESSAGES = {
    STATUS: {
        STANDBY: '대기중',
        TESTING: '확인중...',
        ONLINE: '정상',
        OFFLINE: '응답없음',
        UNSTABLE: '불안정'
    },
    // ... 기타 메시지
};
```

### 색상 팔레트 (style.css)
```css
:root {
    --neon-cyan: #00f5ff;     /* 메인 강조색 */
    --neon-green: #00ff88;    /* 정상 상태 */
    --neon-red: #ff0055;      /* 응답없음 상태 */
    --neon-orange: #ff8800;   /* 확인중 상태 */
    --neon-purple: #bf00ff;   /* 보조 강조색 */
}
```

## 🔒 보안 고려사항

- 브라우저 보안 정책으로 인해 실제 ICMP Ping은 불가능합니다.
- HTTP Fetch 기반 연결 테스트를 사용합니다.
- 로컬 스토리지에 저장된 호스트 정보는 해당 브라우저에서만 접근 가능합니다.
- SSH 연결 시 비밀번호는 저장되지 않습니다.

## 📝 라이센스

MIT License

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Made with ❤️ for Network Engineers
