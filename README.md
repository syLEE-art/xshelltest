# 🌐 네트워크 관제 센터 v4.1 - Nord Theme

눈이 편한 **Nord 색상 팔레트**를 적용한 서버 모니터링 대시보드입니다.

![Version](https://img.shields.io/badge/version-4.1.0-88C0D0.svg)
![Theme](https://img.shields.io/badge/theme-Nord-2E3440.svg)

## 🎨 Nord Theme 색상

| 용도 | 이름 | HEX 코드 |
|------|------|----------|
| 메인 배경 | Deep Arctic Blue | `#2E3440` |
| 카드 배경 | Polar Night | `#3B4252` |
| 메인 텍스트 | Snow Storm | `#D8DEE9` |
| 강조색 (버튼) | Frost Blue | `#88C0D0` |
| 온라인 상태 | Aurora Green (파스텔) | `#A3BE8C` |
| 오프라인 상태 | Aurora Red (파스텔) | `#BF616A` |

## ✨ 디자인 특징

- ❌ **글래스모피즘/블러 효과 제거** → 명확한 색상 대비
- ✅ **부드러운 둥근 모서리** (12px radius)
- ✅ **IBM Plex Sans KR** 가독성 좋은 산세리프 폰트
- ✅ **넉넉한 행간** (line-height: 1.7)
- ✅ **파스텔 톤 상태 표시** (눈 피로 감소)

## 🚀 기능 (100% 유지)

| 기능 | 상태 |
|------|------|
| 폴더(그룹) 관리 | ✅ |
| 서버 메모(Description) | ✅ |
| 이미지 프로브 핑 체크 | ✅ |
| Xshell SSH 원격 접속 | ✅ |
| Xshell 통합 등록 (.bat) | ✅ |
| 응답 시간 그래프 | ✅ |
| 보안 제거 (직접 접속) | ✅ |

## 📁 파일 구조

```
├── index.html   # HTML (Nord 클래스 적용)
├── style.css    # Nord Theme CSS
├── script.js    # 기능 로직 (변경 없음)
└── README.md
```

## 🔧 사용 방법

1. **페이지 접속** → 바로 대시보드 표시
2. **우측 하단 `Xshell 통합 설정`** → .bat 파일 다운로드 후 관리자 권한 실행
3. **폴더 생성** → 서버 추가 (메모 포함 가능)
4. **⚡ 빠른 접속** / **📊 전체 상태 확인**

## 🚀 배포

```bash
git add .
git commit -m "style: Nord Theme 적용 - 눈이 편한 디자인"
git push origin main
```

---

Made with 🎨 Nord Theme • 눈이 편한 디자인