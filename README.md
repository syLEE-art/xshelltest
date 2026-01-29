# 🌐 네트워크 관제 센터 v4.0

보안 기능이 제거되고 Xshell 통합 설정 등록 기능이 추가된 경량화 버전입니다.

![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)

## ✨ v4.0 주요 변경사항

### 🔓 보안 기능 제거
- 비밀번호 입력 없이 바로 대시보드 접속
- 데이터 암호화 없이 일반 JSON으로 localStorage에 저장
- CryptoJS 라이브러리 제거 (경량화)

### 🛠️ Xshell 통합 설정 등록 (모든 버전 지원)
- 화면 **우측 하단**의 `Xshell 통합 설정` 버튼 클릭
- `.bat` 파일 다운로드 후 **관리자 권한으로 실행**
- 와일드카드 탐색으로 Xshell 5, 6, 7 등 모든 버전 자동 감지

```batch
:: 자동 탐색 로직
for /d %%D in ("C:\Program Files\NetSarang\Xshell*") do ...
for /d %%D in ("C:\Program Files (x86)\NetSarang\Xshell*") do ...
```

### 📝 서버 메모(Description) 기능
- 각 서버에 설명 추가 가능
- 서버 카드에 메모 표시 (truncate 처리)
- 수정 모달에서 메모 편집

## 🚀 기존 기능

- **Xshell SSH 원격 접속**: `ssh://` 프로토콜 핸들러
- **폴더(그룹) 관리**: 서버 분류 및 아코디언 UI
- **상태 확인**: HTTP Fetch 기반 Ping 테스트 (이미지 프로브)
- **응답 시간 그래프**: Canvas 시각화
- **글래스모피즘 디자인**: 애니메이션 배경 + 유리 효과

## 📁 파일 구조

```
├── index.html   # HTML (대시보드, 모달)
├── style.css    # 글래스모피즘 스타일
├── script.js    # 기능 로직
└── README.md
```

## 🔧 사용 방법

### 1. Xshell 프로토콜 핸들러 등록
1. 우측 하단 `Xshell 통합 설정` 버튼 클릭
2. `xshell_ssh_register.bat` 파일 다운로드
3. **관리자 권한**으로 배치 파일 실행
4. 등록 완료 후 ssh:// 링크 클릭 시 Xshell 자동 실행

### 2. 서버 관리
1. `새 폴더` 버튼으로 카테고리 생성
2. `서버 추가` 버튼으로 서버 등록 (메모 추가 가능)
3. 서버 카드의 ⚡ 버튼으로 빠른 접속
4. 📊 버튼으로 폴더 내 전체 서버 상태 확인

## 📊 데이터 저장

```javascript
// localStorage 키
const STORAGE_KEY = 'network_control_server_groups';

// 데이터 구조 (일반 JSON)
{
  "폴더명": [
    {
      "name": "서버명",
      "ip": "192.168.1.1",
      "port": "22",
      "username": "root",
      "description": "서버 설명",
      "status": "online"
    }
  ]
}
```

## 🚀 배포

```bash
git add .
git commit -m "feat: v4.0 - 보안 제거, Xshell 통합 설정 등록"
git push origin main
```

---

Made with 🌐 Network Control Center
