// Google Forms 기반 CRUD 관리 서비스
export class GoogleFormsService {
  constructor() {
    // Google Forms URL들 (3단계에서 생성될 예정)
    this.forms = {
      add: 'https://forms.gle/ADD_FORM_ID', // 신규 추가용
      edit: 'https://forms.gle/EDIT_FORM_ID', // 수정용
      delete: 'https://forms.gle/DELETE_FORM_ID' // 삭제용
    };
    
    this.isFormsReady = false;
  }

  // Forms URL 설정
  setFormsUrls(addUrl, editUrl, deleteUrl) {
    this.forms.add = addUrl;
    this.forms.edit = editUrl;
    this.forms.delete = deleteUrl;
    this.isFormsReady = true;
    console.log('✅ Google Forms URL 설정 완료');
  }

  // 신규 추가 Forms 열기
  openAddForm() {
    if (!this.isFormsReady) {
      this.showSetupGuide();
      return;
    }

    const popup = this.openFormPopup(this.forms.add, '신규 환수 대상자 추가');
    return this.waitForFormCompletion(popup);
  }

  // 수정 Forms 열기 (기존 데이터 pre-fill)
  openEditForm(person) {
    if (!this.isFormsReady) {
      this.showSetupGuide();
      return;
    }

    // URL에 기존 데이터 추가 (Google Forms pre-fill 방식)
    const prefillUrl = this.buildPrefillUrl(this.forms.edit, {
      'entry.1': person.name,           // 이름
      'entry.2': person.phone,          // 연락처  
      'entry.3': person.totalAmount,    // 환수금액
      'entry.4': person.no,             // ID (수정 식별용)
      'entry.5': person.joinDate,       // 입사일
      'entry.6': person.leaveDate       // 퇴사일
    });

    const popup = this.openFormPopup(prefillUrl, `${person.name} 정보 수정`);
    return this.waitForFormCompletion(popup);
  }

  // 삭제 Forms 열기
  openDeleteForm(person) {
    if (!this.isFormsReady) {
      this.showSetupGuide();
      return;
    }

    const confirmDelete = confirm(
      `⚠️ ${person.name} (${person.totalAmount?.toLocaleString()}원)을(를) 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );

    if (!confirmDelete) return Promise.resolve(false);

    const prefillUrl = this.buildPrefillUrl(this.forms.delete, {
      'entry.1': person.no,             // ID
      'entry.2': person.name,           // 이름
      'entry.3': person.totalAmount,    // 금액
      'entry.4': '사용자 요청'          // 삭제 사유
    });

    const popup = this.openFormPopup(prefillUrl, `${person.name} 삭제 요청`);
    return this.waitForFormCompletion(popup);
  }

  // Google Forms 팝업 열기
  openFormPopup(url, title) {
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const popup = window.open(
      url,
      'GoogleFormPopup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no`
    );

    if (!popup) {
      alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
      return null;
    }

    // 팝업 창 제목 설정 (가능한 경우)
    try {
      popup.document.title = title;
    } catch (e) {
      // 크로스 도메인 보안으로 인해 실패할 수 있음
    }

    return popup;
  }

  // Forms 완료 대기
  waitForFormCompletion(popup) {
    return new Promise((resolve) => {
      if (!popup) {
        resolve(false);
        return;
      }

      // 팝업이 닫힐 때까지 대기
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve(true);
        }
      }, 1000);

      // 10분 후 타임아웃
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!popup.closed) {
          popup.close();
        }
        resolve(false);
      }, 10 * 60 * 1000); // 10분
    });
  }

  // Pre-fill URL 생성
  buildPrefillUrl(baseUrl, data) {
    const url = new URL(baseUrl);
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  // 인라인 Forms (iframe 방식)
  createInlineForm(type, person = null) {
    let formUrl = '';
    let title = '';

    switch (type) {
      case 'add':
        formUrl = this.forms.add;
        title = '신규 환수 대상자 추가';
        break;
      case 'edit':
        formUrl = this.buildPrefillUrl(this.forms.edit, {
          'entry.1': person?.name,
          'entry.2': person?.phone,
          'entry.3': person?.totalAmount,
          'entry.4': person?.no
        });
        title = `${person?.name} 정보 수정`;
        break;
      case 'delete':
        formUrl = this.buildPrefillUrl(this.forms.delete, {
          'entry.1': person?.no,
          'entry.2': person?.name,
          'entry.3': person?.totalAmount
        });
        title = `${person?.name} 삭제 요청`;
        break;
    }

    return {
      url: formUrl,
      title: title,
      embedUrl: formUrl.replace('/viewform', '/viewform?embedded=true')
    };
  }

  // 설정 가이드 표시
  showSetupGuide() {
    const message = `
📋 Google Forms 설정이 필요합니다!

다음 단계를 완료해주세요:
1. 신규 추가용 Google Forms 생성
2. 수정용 Google Forms 생성  
3. 삭제용 Google Forms 생성
4. Apps Script 연동 설정

설정 완료 후 Forms URL을 입력해주세요.
    `;

    alert(message);
    
    // 설정 가이드 페이지로 이동 (옵션)
    // window.open('/setup-guide', '_blank');
  }

  // Forms 상태 확인
  checkFormsStatus() {
    return {
      isReady: this.isFormsReady,
      forms: this.forms,
      hasAddForm: this.forms.add !== 'https://forms.gle/ADD_FORM_ID',
      hasEditForm: this.forms.edit !== 'https://forms.gle/EDIT_FORM_ID',
      hasDeleteForm: this.forms.delete !== 'https://forms.gle/DELETE_FORM_ID'
    };
  }

  // 테스트용 샘플 Forms (개발 중)
  enableTestMode() {
    this.forms = {
      add: 'https://forms.gle/sample-add-form',
      edit: 'https://forms.gle/sample-edit-form', 
      delete: 'https://forms.gle/sample-delete-form'
    };
    this.isFormsReady = true;
    console.log('🧪 테스트 모드 활성화됨');
  }
}

// Forms 설정 가이드 정보
export const FORMS_SETUP_GUIDE = {
  steps: [
    {
      title: '1단계: 신규 추가용 Forms 생성',
      description: '새로운 환수 대상자를 추가하기 위한 양식',
      fields: [
        { name: '이름', type: 'text', required: true },
        { name: '주민번호', type: 'text', required: true },
        { name: '연락처', type: 'text', required: true },
        { name: '입사일', type: 'date', required: true },
        { name: '퇴사일', type: 'date', required: true },
        { name: '환수요청금액', type: 'number', required: true },
        { name: '분할상환 여부', type: 'choice', required: false },
        { name: '비고', type: 'text', required: false }
      ]
    },
    {
      title: '2단계: 수정용 Forms 생성',
      description: '기존 데이터를 수정하기 위한 양식 (pre-fill 지원)',
      fields: [
        { name: 'ID (숨김)', type: 'text', required: true },
        { name: '이름', type: 'text', required: true },
        { name: '연락처', type: 'text', required: false },
        { name: '환수요청금액', type: 'number', required: false },
        { name: '상환완료금액', type: 'number', required: false },
        { name: '수정 사유', type: 'text', required: true }
      ]
    },
    {
      title: '3단계: 삭제용 Forms 생성',
      description: '데이터 삭제 요청을 위한 양식',
      fields: [
        { name: 'ID', type: 'text', required: true },
        { name: '이름', type: 'text', required: true },
        { name: '환수금액', type: 'number', required: true },
        { name: '삭제 사유', type: 'choice', required: true, options: [
          '퇴사자 정보 정리',
          '중복 데이터',
          '오입력 수정',
          '기타'
        ]}
      ]
    },
    {
      title: '4단계: Apps Script 연동',
      description: 'Forms 제출 시 자동으로 Google Sheets 업데이트',
      code: `
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.openById('SHEET_ID').getActiveSheet();
  const responses = e.values;
  
  // Forms 응답을 시트에 추가/수정/삭제
  if (e.source.getTitle().includes('신규')) {
    // 신규 추가 로직
    sheet.appendRow(responses);
  } else if (e.source.getTitle().includes('수정')) {
    // 수정 로직
    updateRow(sheet, responses);
  } else if (e.source.getTitle().includes('삭제')) {
    // 삭제 로직
    deleteRow(sheet, responses);
  }
  
  // 이메일 알림 (옵션)
  MailApp.sendEmail('admin@company.com', '환수 데이터 변경 알림', 
    '데이터가 업데이트되었습니다: ' + JSON.stringify(responses));
}
      `
    }
  ]
};

export const googleForms = new GoogleFormsService();
