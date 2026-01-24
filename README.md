# 🖥️ 네트워크 관제 센터 v2.0

서버 원격 접속 및 상태 모니터링을 위한 웹 기반 대시보드입니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ v2.0 새로운 기능

### 📁 폴더(그룹) 기능
- **서버 분류**: 개발/운영/테스트 등 용도별로 서버를 폴더로 분류
- **아코디언 UI**: 폴더를 클릭하면 서버 목록이 펼쳐지거나 접힘
- **폴더 관리**: 폴더 생성, 이름 수정, 삭제 기능
- **그룹 상태 확인**: 폴더별 전체 서버 상태 일괄 확인 (Ping)

### 🖥️ 서버 관리
- **서버 추가**: 폴더 선택 후 서버 이름, IP, 포트, 사용자명 입력
- **빠른 접속**: 서버 목록에서 바로 SSH 연결
- **상태 표시**: 각 서버별 온라인/오프라인 LED 인디케이터

## 🚀 주요 기능

### 🔌 Xshell 원격 접속
- SSH 프로토콜 핸들러를 통한 Xshell 7 즉시 실행
- IP 주소, 포트, 사용자 이름 입력 지원
- 서버 목록에서 원클릭 접속

### 📡 상태 확인 (Ping Test)
- HTTP Fetch 기반 연결 테스트
- 실시간 응답 속도 그래프 시각화
- 상태 LED 인디케이터 (정상/응답없음/확인중)
- 통계 정보 (성공률, 평균/최소/최대 응답 시간)

### 🎨 UI/UX
- 다크 모드 기반 사이버펑크 디자인
- 반응형 웹 디자인 (모바일/태블릿/데스크톱)
- 한국어 UI 완벽 지원

## 📁 데이터 구조

```javascript
// localStorage에 저장되는 데이터 구조
{
  "개발 서버": [
    {
      "name": "웹서버 #1",
      "ip": "192.168.1.100",
      "port": "22",
      "username": "root",
      "status": "online",
      "lastChecked": "2024-01-15T10:30:00.000Z"
    },
    // ...
  ],
  "운영 서버": [
    // ...
  ]
}
```

## 🚀 빠른 시작

### 로컬에서 실행하기
```bash
cd monitoring-dashboard
python -m http.server 8080
# 또는
npx serve .
```

브라우저에서 `http://localhost:8080` 접속

## 💻 Git 명령어 가이드

### 새 저장소에 업로드
```bash
git init
git remote add origin https://github.com/syLEE-art/monitoring-test01.git
git add .
git commit -m "feat: 네트워크 관제 대시보드 v2.0 - 폴더 기능 추가"
git branch -M main
git push -u origin main
```

### 변경사항 업데이트
```bash
git add .
git commit -m "fix: 버그 수정 내용"
git push origin main
```

### GitHub Pages 배포
1. Repository > Settings > Pages
2. Source: "Deploy from a branch" 선택
3. Branch: main / root 선택
4. Save 클릭

## ⚙️ 설정 커스터마이징

### 설정 변수 (script.js)
```javascript
const CONFIG = {
    PING_COUNT: 10,           // 상태 확인 요청 횟수
    PING_INTERVAL: 1000,      // 요청 간격 (ms)
    PING_TIMEOUT: 5000,       // 타임아웃 (ms)
    GRAPH_MAX_POINTS: 20,     // 그래프 최대 포인트
    GRAPH_MAX_MS: 500,        // Y축 최대값 (ms)
    STORAGE_KEY: 'network_control_server_groups',  // localStorage 키
    DEFAULT_SSH_PORT: 22      // 기본 SSH 포트
};
```

## 🔒 보안 고려사항

- 브라우저 보안 정책으로 인해 실제 ICMP Ping은 불가능
- HTTP Fetch 기반 연결 테스트 사용
- 로컬 스토리지 데이터는 해당 브라우저에서만 접근 가능
- SSH 비밀번호는 저장되지 않음

## 📝 라이센스

MIT License

---

Made with ❤️ for Network Engineers
