# GitHub 업로드 명령어들 (리포지토리 생성 후 실행)

# 1. 원격 리포지토리 추가 (GitHub 리포지토리 URL로 변경하세요)
git remote add origin https://github.com/[username]/repayment-dashboard.git

# 2. 메인 브랜치로 변경
git branch -M main

# 3. GitHub에 업로드
git push -u origin main

# 4. 의존성 설치 (개발 시작할 때)
npm install

# 5. 개발 서버 실행
npm run dev

# 6. GitHub Pages 배포 (나중에)
npm run deploy
