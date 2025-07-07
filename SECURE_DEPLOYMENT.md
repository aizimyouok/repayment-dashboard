# Netlify/Vercel 배포 가이드

## Netlify 배포 (추천)

### 1단계: Netlify 계정 생성
- https://netlify.com 접속
- GitHub 계정으로 로그인

### 2단계: GitHub 저장소 연결
- "New site from Git" 클릭
- GitHub 선택
- "aizimyouok/repayment-dashboard" 선택

### 3단계: 빌드 설정
- Build command: `npm run build`
- Publish directory: `dist`
- "Deploy site" 클릭

### 4단계: 환경변수 설정
- Site settings → Environment variables
- 새 변수 추가:
  - Name: `VITE_GOOGLE_CLIENT_ID`
  - Value: `your_client_id_here`

### 5단계: 도메인 업데이트
생성된 Netlify URL을 Google Cloud Console의 승인된 원본에 추가

## Vercel 배포

### 1단계: Vercel 계정 생성
- https://vercel.com 접속
- GitHub 계정으로 로그인

### 2단계: 프로젝트 가져오기
- "New Project" 클릭
- GitHub에서 저장소 선택

### 3단계: 환경변수 설정
- Project Settings → Environment Variables
- 새 변수 추가:
  - Name: `VITE_GOOGLE_CLIENT_ID`
  - Value: `your_client_id_here`

## 장점
✅ 환경변수로 클라이언트 ID 보호
✅ 자동 HTTPS
✅ 더 빠른 CDN
✅ 더 나은 배포 관리
