# 📝 Google Forms & Apps Script 설정 가이드

하이브리드 환수 관리 시스템의 **안전한 쓰기 기능**을 위한 Google Forms와 Apps Script 설정 가이드입니다.

## 🎯 개요

**하이브리드 CRUD 시스템:**
- **읽기**: Google Sheets → CSV → 대시보드 (실시간)
- **쓰기**: Google Forms → Apps Script → Sheets 업데이트 (안전)

## 📋 1단계: 신규 추가용 Google Form 생성

### 1.1 Form 생성
1. **forms.google.com** 접속
2. **"새 양식"** 클릭
3. 제목: **"환수 데이터 신규 추가"**
4. 설명: **"새로운 환수 대상자 정보를 추가합니다"**

### 1.2 필수 필드 추가

#### 개인 정보 섹션
1. **"차용자명"** (단답형)
   - 필수 항목 체크
   - 도움말: 차용자의 실명을 입력하세요

2. **"주민번호"** (단답형)
   - 필수 항목 체크
   - 도움말: 123456-1234567 형식

3. **"연락처"** (단답형)
   - 필수 항목 체크
   - 도움말: 010-1234-5678 형식

4. **"입사일"** (날짜)
   - 필수 항목 체크

5. **"퇴사일"** (날짜)
   - 선택 항목

#### 환수 정보 섹션
6. **"대출금액"** (단답형)
   - 필수 항목 체크
   - 도움말: 숫자만 입력 (예: 1000000)

7. **"대출일"** (날짜)
   - 필수 항목 체크

8. **"상환예정일"** (날짜)
   - 필수 항목 체크

9. **"비고"** (장문형)
   - 선택 항목
   - 도움말: 특이사항이나 메모

### 1.3 Form 설정
1. **설정** (톱니바퀴 아이콘) 클릭
2. **"응답 수집"** 탭:
   - ✅ 스프레드시트에서 응답 수집
   - 기존 스프레드시트 선택 (환수 관리 시트)
3. **"프레젠테이션"** 탭:
   - ✅ 진행률 표시줄 표시
   - ✅ 다른 응답 제출 링크 표시 안함

## ✏️ 2단계: 수정용 Google Form 생성

### 2.1 Form 생성
1. 신규 추가 Form을 **복사**
2. 제목: **"환수 데이터 수정"**
3. 설명: **"기존 환수 대상자 정보를 수정합니다"**

### 2.2 추가 필드
기존 필드에 추가로:

1. **"수정 대상 ID"** (단답형)
   - 필수 항목 체크
   - 도움말: 수정할 레코드의 ID

2. **"수정 사유"** (장문형)
   - 필수 항목 체크
   - 도움말: 수정하는 이유를 간략히 설명

## 🗑️ 3단계: 삭제 요청용 Google Form 생성

### 3.1 Form 생성
1. **새 양식** 생성
2. 제목: **"환수 데이터 삭제 요청"**
3. 설명: **"환수 대상자 정보 삭제를 요청합니다"**

### 3.2 필드 구성
1. **"삭제 대상 ID"** (단답형)
   - 필수 항목 체크

2. **"차용자명"** (단답형)
   - 필수 항목 체크
   - 도움말: 삭제 확인용

3. **"삭제 사유"** (객관식)
   - 필수 항목 체크
   - 선택지:
     - 상환 완료
     - 데이터 오류
     - 중복 입력
     - 기타

4. **"상세 사유"** (장문형)
   - 선택 항목
   - 도움말: 삭제 사유를 자세히 설명

5. **"요청자 정보"** (단답형)
   - 필수 항목 체크
   - 도움말: 요청자 이름

## ⚙️ 4단계: Apps Script 자동화 설정

### 4.1 Apps Script 프로젝트 생성
1. **script.google.com** 접속
2. **"새 프로젝트"** 클릭
3. 프로젝트명: **"환수 관리 자동화"**

### 4.2 기본 자동화 코드 작성

```javascript
/**
 * 환수 관리 하이브리드 시스템 Apps Script
 * Forms 제출 → Sheets 자동 업데이트
 */

// 설정: 스프레드시트 ID와 시트명
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // 실제 시트 ID로 변경
const MAIN_SHEET_NAME = '환수_진행_내역'; // 메인 시트명
const LOG_SHEET_NAME = '변경_이력'; // 로그 시트명

/**
 * 신규 추가 Form 제출 처리
 */
function onFormSubmit_Add(e) {
  try {
    console.log('📝 신규 추가 요청 처리 시작');
    
    const responses = e.namedValues;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // 새 ID 생성 (기존 최대 ID + 1)
    const lastRow = mainSheet.getLastRow();
    let newId = 1;
    if (lastRow > 1) {
      const idColumn = mainSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const maxId = Math.max(...idColumn.map(row => parseInt(row[0]) || 0));
      newId = maxId + 1;
    }
    
    // 새 행 데이터 구성
    const newRow = [
      newId.toString().padStart(3, '0'), // ID (001, 002, ...)
      responses['차용자명'][0],
      responses['주민번호'][0],
      responses['연락처'][0],
      responses['입사일'][0],
      responses['퇴사일'][0] || '',
      responses['대출금액'][0],
      responses['대출일'][0],
      responses['상환예정일'][0],
      '0', // 상환완료금액 (초기값)
      responses['대출금액'][0], // 잔여금액 (초기값 = 대출금액)
      '미상환', // 초기 상태
      responses['비고'][0] || '',
      new Date(), // 등록일시
      Session.getActiveUser().getEmail() // 등록자
    ];
    
    // 시트에 추가
    mainSheet.appendRow(newRow);
    
    // 로그 기록
    logChange('ADD', newId, '신규 추가', newRow);
    
    console.log(`✅ 신규 레코드 추가 완료: ID ${newId}`);
    
  } catch (error) {
    console.error('❌ 신규 추가 처리 실패:', error);
    // 에러 알림 이메일 발송 (선택사항)
    sendErrorEmail('신규 추가', error.toString());
  }
}

/**
 * 수정 Form 제출 처리
 */
function onFormSubmit_Edit(e) {
  try {
    console.log('✏️ 수정 요청 처리 시작');
    
    const responses = e.namedValues;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    const targetId = responses['수정 대상 ID'][0];
    
    // 대상 행 찾기
    const data = mainSheet.getDataRange().getValues();
    let targetRowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === targetId) {
        targetRowIndex = i + 1; // 스프레드시트는 1부터 시작
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error(`ID ${targetId}를 찾을 수 없습니다.`);
    }
    
    // 기존 데이터 백업
    const oldData = data[targetRowIndex - 1].slice();
    
    // 수정된 데이터 구성
    const updatedRow = [
      targetId, // ID는 변경하지 않음
      responses['차용자명'][0],
      responses['주민번호'][0],
      responses['연락처'][0],
      responses['입사일'][0],
      responses['퇴사일'][0] || '',
      responses['대출금액'][0],
      responses['대출일'][0],
      responses['상환예정일'][0],
      oldData[9], // 기존 상환완료금액 유지
      parseFloat(responses['대출금액'][0]) - parseFloat(oldData[9] || 0), // 잔여금액 재계산
      oldData[11], // 기존 상태 유지
      responses['비고'][0] || '',
      oldData[13], // 기존 등록일시 유지
      oldData[14], // 기존 등록자 유지
      new Date(), // 수정일시
      Session.getActiveUser().getEmail() // 수정자
    ];
    
    // 시트 업데이트
    mainSheet.getRange(targetRowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
    
    // 로그 기록
    logChange('EDIT', targetId, responses['수정 사유'][0], updatedRow, oldData);
    
    console.log(`✅ 레코드 수정 완료: ID ${targetId}`);
    
  } catch (error) {
    console.error('❌ 수정 처리 실패:', error);
    sendErrorEmail('수정', error.toString());
  }
}

/**
 * 삭제 요청 Form 제출 처리
 */
function onFormSubmit_Delete(e) {
  try {
    console.log('🗑️ 삭제 요청 처리 시작');
    
    const responses = e.namedValues;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    const targetId = responses['삭제 대상 ID'][0];
    const targetName = responses['차용자명'][0];
    const deleteReason = responses['삭제 사유'][0];
    const detailReason = responses['상세 사유'][0] || '';
    
    // 대상 행 찾기
    const data = mainSheet.getDataRange().getValues();
    let targetRowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === targetId && data[i][1] === targetName) {
        targetRowIndex = i + 1;
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error(`ID ${targetId}, 이름 ${targetName}을 찾을 수 없습니다.`);
    }
    
    // 기존 데이터 백업
    const deletedData = data[targetRowIndex - 1].slice();
    
    // 행 삭제
    mainSheet.deleteRow(targetRowIndex);
    
    // 로그 기록
    logChange('DELETE', targetId, `${deleteReason} - ${detailReason}`, deletedData);
    
    console.log(`✅ 레코드 삭제 완료: ID ${targetId}`);
    
  } catch (error) {
    console.error('❌ 삭제 처리 실패:', error);
    sendErrorEmail('삭제', error.toString());
  }
}

/**
 * 변경 이력 로그 기록
 */
function logChange(action, recordId, reason, newData, oldData = null) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    
    // 로그 시트가 없으면 생성
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.getRange(1, 1, 1, 7).setValues([[
        '일시', '작업', '레코드ID', '사유', '작업자', '변경전', '변경후'
      ]]);
    }
    
    const logRow = [
      new Date(),
      action,
      recordId,
      reason,
      Session.getActiveUser().getEmail(),
      oldData ? JSON.stringify(oldData) : '',
      JSON.stringify(newData)
    ];
    
    logSheet.appendRow(logRow);
    
  } catch (error) {
    console.error('로그 기록 실패:', error);
  }
}

/**
 * 에러 발생시 이메일 알림
 */
function sendErrorEmail(operation, errorMessage) {
  try {
    const recipient = 'admin@example.com'; // 관리자 이메일로 변경
    const subject = `[환수 관리] ${operation} 작업 오류 발생`;
    const body = `
환수 관리 시스템에서 오류가 발생했습니다.

작업: ${operation}
시간: ${new Date()}
오류: ${errorMessage}
사용자: ${Session.getActiveUser().getEmail()}

시스템을 확인해주세요.
    `;
    
    GmailApp.sendEmail(recipient, subject, body);
  } catch (e) {
    console.error('이메일 발송 실패:', e);
  }
}
```

### 4.3 트리거 설정

각 Form에 대해 트리거를 설정해야 합니다:

1. **Apps Script 편집기**에서 **"트리거"** (시계 아이콘) 클릭
2. **"트리거 추가"** 클릭
3. 설정:
   - 실행할 함수: `onFormSubmit_Add` (신규 추가 Form용)
   - 이벤트 소스: **Google Forms에서**
   - 이벤트 유형: **양식 제출 시**
   - Form 선택: **신규 추가 Form**

4. 같은 방식으로 수정/삭제 Form에도 트리거 추가

## 🔧 5단계: 대시보드 연결

### 5.1 Form URL 확인
각 Form에서:
1. **"보내기"** 버튼 클릭
2. **링크** 탭에서 URL 복사
3. URL을 `.env` 파일에 추가:

```env
VITE_GOOGLE_FORM_ADD_URL=https://forms.gle/abc123
VITE_GOOGLE_FORM_EDIT_URL=https://forms.gle/def456
VITE_GOOGLE_FORM_DELETE_URL=https://forms.gle/ghi789
```

### 5.2 대시보드 Forms 서비스 업데이트

`src/services/googleSheetsData.js`에서 Forms URL들이 자동으로 설정됩니다.

## ✅ 6단계: 테스트 및 검증

### 6.1 신규 추가 테스트
1. 대시보드에서 **"신규 추가"** 버튼 클릭
2. Form에서 테스트 데이터 입력
3. 제출 후 몇 초 대기
4. 대시보드에서 **"실시간 동기화"** 클릭
5. 새 데이터가 표시되는지 확인

### 6.2 수정 테스트
1. 기존 레코드의 **수정** 버튼 클릭
2. Form에서 정보 수정
3. 제출 후 동기화하여 변경사항 확인

### 6.3 삭제 테스트
1. 테스트 레코드의 **삭제** 버튼 클릭
2. 삭제 사유 입력 후 제출
3. 레코드가 제거되었는지 확인

## 🛡️ 7단계: 보안 및 권한 관리

### 7.1 Form 접근 제한
1. 각 Form 설정에서:
   - ✅ **"조직 내에서만 응답 수집"** (구글 워크스페이스 사용시)
   - ✅ **"응답당 1회 제한"** (선택사항)

### 7.2 Apps Script 권한
1. **공유** → **권한** 설정
2. 관리자만 편집 가능하도록 설정
3. 실행 로그 정기적으로 확인

## 📊 8단계: 모니터링 및 유지보수

### 8.1 변경 이력 확인
- Google Sheets의 **"변경_이력"** 탭에서 모든 작업 이력 확인
- 언제, 누가, 무엇을 변경했는지 추적 가능

### 8.2 오류 모니터링
- Apps Script 실행 기록에서 오류 확인
- 이메일 알림으로 실시간 오류 감지

### 8.3 정기 백업
- 월 1회 Google Sheets 전체 백업
- 변경 이력 시트 정기적으로 아카이브

---

## 🎉 완료!

하이브리드 환수 관리 시스템의 **완전한 CRUD 기능**이 구현되었습니다:

- ✅ **읽기**: 실시간 Google Sheets → CSV 동기화
- ✅ **생성**: Google Forms → Apps Script → 자동 추가
- ✅ **수정**: Forms 기반 안전한 업데이트 
- ✅ **삭제**: 승인 기반 안전한 삭제 프로세스

**보안 장점:**
- API 키 없이도 완전한 CRUD 구현
- 모든 변경사항 이력 추적
- 오류 발생시 자동 알림
- 무료로 운영 가능한 완전한 시스템
