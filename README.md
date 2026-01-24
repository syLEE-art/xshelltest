# 🔒 네트워크 관제 센터 v3.1

SHA-256 해시 검증, AES-256 암호화, 비밀번호 변경 기능이 적용된 보안 대시보드입니다.

![Version](https://img.shields.io/badge/version-3.1.0-red.svg)
![Security](https://img.shields.io/badge/security-SHA--256%20%2B%20AES--256-green.svg)

## ✨ v3.1 새로운 기능

### 1. 🔑 비밀번호 변경 기능
- 헤더의 ⚙️ 설정 버튼 클릭
- 현재 비밀번호 확인 후 새 비밀번호 설정
- 변경된 비밀번호로 데이터 자동 재암호화
- localStorage에 새 해시값 저장

### 2. 📥 Xshell 레지스트리 파일 다운로드
- 화면 좌측 하단의 **Xshell** 버튼 클릭
- `xshell_ssh_protocol_handler.reg` 파일 다운로드
- 실행 시 `ssh://` 프로토콜이 Xshell 7과 연결됨

## 🔐 보안 기능

### SHA-256 비밀번호 해시 검증
```
기본 비밀번호: dlthdud
해시값: db97cb66bad0d531ab03b5e39d9626fc8d85015615a082a00bb526486a3e49cf
```

### AES-256 데이터 암호화
- 서버 목록이 암호화된 상태로 localStorage에 저장
- 올바른 비밀번호로만 복호화 가능
- 비밀번호 변경 시 데이터 재암호화

### 세션 관리
- sessionStorage 사용으로 탭 종료 시 자동 로그아웃

## 🛠️ 기본 기능

- **Xshell SSH 원격 접속**: `ssh://` 프로토콜 핸들러
- **폴더(그룹) 관리**: 서버 분류 및 아코디언 UI
- **상태 확인**: HTTP Fetch 기반 Ping 테스트
- **응답 시간 그래프**: Canvas 시각화

## 📁 파일 구조

```
├── index.html   # HTML (로그인, 대시보드, 모달)
├── style.css    # 글래스모피즘 스타일
├── script.js    # 보안 로직 + 기능
└── README.md
```

## 🚀 배포

```bash
git add .
git commit -m "feat: 비밀번호 변경 및 Xshell 레지스트리 다운로드 기능 추가"
git push origin main
```

## ⚠️ 주의사항

1. **기본 비밀번호**: `dlthdud` (첫 로그인 시 사용)
2. **비밀번호 분실 시**: localStorage의 `ncc_custom_password_hash` 삭제 후 기본 비밀번호로 로그인
3. **Xshell 경로**: 기본 경로는 `C:\Program Files (x86)\NetSarang\Xshell 7\Xshell.exe`

---

Made with 🔒 Secure by Design
