# 환수 관리 대시보드 (Project Aegis)

구글 로그인을 통한 안전한 환수 현황 관리 시스템

## 🚀 주요 기능

- **구글 OAuth 로그인**: 안전한 인증 시스템
- **실시간 대시보드**: KPI 및 현황 차트
- **개인별 관리**: 상세 환수 내역 조회
- **D-day 알림**: 상환일 기준 자동 알림
- **권한 관리**: 관리자/팀장/조회자 역할 구분
- **구글 시트 연동**: 실시간 데이터 동기화
- **반응형 디자인**: 모바일/태블릿 지원

## 🛠 기술 스택

- **Frontend**: React 18, Vite
- **UI**: Tailwind CSS, Lucide React Icons
- **Charts**: Recharts
- **Authentication**: Google OAuth 2.0
- **Data**: Google Sheets API
- **Deployment**: GitHub Pages

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.example`을 참고하여 `.env` 파일 생성:

```
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_SHEET_ID=your_sheet_id
VITE_APP_URL=http://localhost:5173
```

### 3. Google Cloud Console 설정

#### OAuth 2.0 클라이언트 ID 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" → "사용자 인증 정보"
4. "사용자 인증 정보 만들기" → "OAuth 2.0 클라이언트 ID"
5. 애플리케이션 유형: 웹 애플리케이션
6. 승인된 JavaScript 원본:
   - `http://localhost:5173` (개발용)
   - `https://username.github.io` (배포용)

#### Google Sheets API 활성화
1. "API 및 서비스" → "라이브러리"
2. "Google Sheets API" 검색 후 사용 설정

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 빌드 및 배포
```bash
# 빌드
npm run build

# GitHub Pages 배포
npm run deploy
```

## 🔐 보안 설정

### 허가된 사용자 설정
`src/services/googleAuth.js`에서 허가된 도메인/이메일 수정:

```javascript
const allowedDomains = ['yourcompany.com', 'gmail.com'];
const allowedEmails = [
  'admin@yourcompany.com',
  'manager@yourcompany.com',
  'your-email@gmail.com'
];
```

### 권한 설정
`src/App.jsx`에서 사용자 역할 수정:

```javascript
const adminEmails = ['admin@yourcompany.com'];
const managerEmails = ['manager@yourcompany.com'];
```

## 📊 Google Sheets 연동

### 시트 구조
다음과 같은 구조로 시트를 준비하세요:

| NO | 대상자 | 주민번호 | 연락처 | 입사일 | 퇴사일 | ... | 환수요청금액 | 상환중인금액 | 남은금액 |
|----|--------|----------|--------|--------|--------|-----|-------------|-------------|----------|

### 시트 권한
- 링크 공유: "링크가 있는 모든 사용자" (읽기)
- 또는 API 키를 사용한 공개 액세스

## 🚀 배포 가이드

### GitHub Pages 배포
1. GitHub 저장소 생성
2. 코드 푸시
3. `npm run deploy` 실행
4. GitHub 저장소 → Settings → Pages에서 gh-pages 브랜치 선택

### 환경변수 (GitHub Pages)
- 배포 후 Google Cloud Console에서 승인된 원본에 GitHub Pages URL 추가
- `https://username.github.io`

## 🎨 커스터마이징

### 색상 테마 변경
`src/utils/formatters.js`에서 상태별 색상 수정

### 알림 설정
`src/App.jsx`에서 D-day 계산 로직 수정

### 차트 설정
Recharts 설정을 통한 차트 커스터마이징

## 🐛 문제 해결

### 로그인 실패
- Google Cloud Console에서 승인된 원본 확인
- 브라우저 캐시 및 쿠키 삭제

### 데이터 로드 실패
- Google Sheets 공유 설정 확인
- 시트 ID 정확성 확인
- API 할당량 확인

### 빌드 오류
- Node.js 버전 확인 (v16 이상 권장)
- 의존성 재설치: `rm -rf node_modules && npm install`

## 📝 라이센스

MIT License

## 👥 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의사항이 있으시면 Issues를 통해 연락주세요.

---

**Project Aegis** - 회사의 중요 자산을 보호하는 방패 역할을 하는 환수 관리 시스템
