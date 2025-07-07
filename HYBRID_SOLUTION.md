# 하이브리드 환수 관리 시스템 설계

## 개념
- **읽기**: 공개 Google Sheets (API 키 없이)
- **쓰기**: Google Forms + Apps Script 자동화

## 장점
✅ 완전 무료
✅ API 키 불필요
✅ 보안 안전
✅ 실시간 업데이트
✅ 모든 CRUD 기능

## 구현 방법

### 1단계: 읽기용 공개 시트
- Google Sheets를 CSV로 공개
- URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/export?format=csv&gid=0

### 2단계: 쓰기용 Google Forms
- 신규 추가: Google Forms
- 수정: Google Forms (기존 데이터 pre-fill)
- 삭제: Google Forms (삭제 요청)

### 3단계: Apps Script 자동화
- Forms 제출 시 자동으로 시트 업데이트
- 이메일 알림
- 데이터 검증

### 4단계: 웹앱 통합
- 읽기: CSV API 사용
- 쓰기: Forms iframe 또는 popup

## 보안 수준
🔒 API 키 불필요
🔒 시트 ID만 공개 (환수 데이터용 새 시트)
🔒 원본 데이터 보호
🔒 변경 이력 자동 추적

## 사용자 경험
👍 대시보드에서 바로 추가/수정
👍 실시간 데이터 반영
👍 모바일에서도 완벽 동작
👍 승인 워크플로우 가능
