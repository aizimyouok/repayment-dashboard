/**
 * Google Sheets 하이브리드 데이터 관리 서비스
 * 읽기: Google Sheets CSV 공개 링크 → 대시보드
 * 쓰기: Google Forms → Apps Script → Google Sheets
 */

class GoogleSheetsDataService {
  constructor() {
    // Apps Script 웹 앱 URL (배포 후 설정)
    this.APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
    
    // 기존 CSV 방식도 백업으로 유지
    this.SHEET_ID = this.getSheetId();
    this.GID = '1799048710';
    
    if (this.SHEET_ID.startsWith('2PACX-')) {
      this.CSV_URL = `https://docs.google.com/spreadsheets/d/e/${this.SHEET_ID}/pub?gid=${this.GID}&single=true&output=csv`;
    } else {
      this.CSV_URL = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/export?format=csv&gid=0`;
    }
    
    // Google Forms 링크들 (나중에 설정 예정)
    this.FORMS = {
      ADD: import.meta.env.VITE_GOOGLE_FORM_ADD_URL || '',
      EDIT: import.meta.env.VITE_GOOGLE_FORM_EDIT_URL || '',
      DELETE: import.meta.env.VITE_GOOGLE_FORM_DELETE_URL || ''
    };
  }

  /**
   * Google Apps Script 또는 CSV에서 데이터를 가져옵니다
   * @returns {Promise<Array>} 파싱된 데이터 배열
   */
  async fetchData() {
    // Apps Script URL이 설정되어 있으면 우선 사용
    if (this.APPS_SCRIPT_URL && this.APPS_SCRIPT_URL !== '') {
      return this.fetchFromAppsScript();
    } else {
      console.log('⚠️ Apps Script URL이 설정되지 않아 CSV 방식을 사용합니다.');
      return this.fetchFromCSV();
    }
  }

  /**
   * Google Apps Script에서 JSON 데이터를 가져옵니다
   * @returns {Promise<Array>} 파싱된 데이터 배열
   */
  async fetchFromAppsScript() {
    try {
      console.log('🚀 Google Apps Script에서 데이터를 가져오는 중...');
      console.log('📍 Apps Script URL:', this.APPS_SCRIPT_URL);
      
      const response = await fetch(this.APPS_SCRIPT_URL, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.json();
      console.log('✅ Apps Script 응답:', jsonData);

      if (!jsonData.success) {
        throw new Error(jsonData.message || 'Apps Script에서 오류가 발생했습니다.');
      }

      console.log(`🎯 Apps Script에서 ${jsonData.data.length}개 레코드 가져옴`);
      
      // Apps Script에서 이미 표준화된 데이터를 받으므로 바로 반환
      return jsonData.data;
      
    } catch (error) {
      console.error('❌ Google Apps Script 데이터 가져오기 실패:', error);
      console.log('🔄 CSV 방식으로 대체합니다...');
      
      // Apps Script 실패 시 CSV 방식으로 폴백
      return this.fetchFromCSV();
    }
  }

  /**
   * CSV에서 데이터를 가져옵니다 (백업 방식)
   * @returns {Promise<Array>} 파싱된 데이터 배열
   */
  async fetchFromCSV() {
    try {
      console.log('📄 CSV에서 데이터를 가져오는 중...');
      console.log('📍 CSV URL:', this.CSV_URL);
      
      const response = await fetch(this.CSV_URL, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'text/csv; charset=utf-8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      const cleanedCsvText = csvText.replace(/^\uFEFF/, '');
      
      console.log('✅ CSV 데이터 가져오기 성공');
      
      const parsedData = this.parseCSV(cleanedCsvText);
      return parsedData;
      
    } catch (error) {
      console.error('❌ CSV 데이터 가져오기 실패:', error);
      console.log('🔄 더미 데이터로 대체합니다...');
      return this.getDummyData();
    }
  }

  /**
   * CSV 텍스트를 JavaScript 객체 배열로 파싱합니다
   * @param {string} csvText - CSV 형식의 텍스트
   * @returns {Array} 파싱된 데이터 배열
   */
  parseCSV(csvText) {
    console.log('🔍 CSV 파싱 시작...');
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      console.warn('⚠️ CSV 데이터가 너무 적습니다');
      return [];
    }

    // 실제 헤더 행 찾기 (NO, 번호, ID, 대상자 등이 포함된 행)
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) { // 처음 10줄 내에서 헤더 찾기
      const potentialHeaders = this.parseCSVLine(lines[i]);
      console.log(`🔍 ${i}번째 줄 확인:`, potentialHeaders);
      
      // 헤더로 보이는 키워드들 체크
      const headerKeywords = ['NO', '번호', 'ID', '대상자', '차용자', '이름', '성명', '금액', '대출', '환수', '요청'];
      const hasHeaderKeywords = potentialHeaders.some(header => 
        headerKeywords.some(keyword => header.includes(keyword))
      );
      
      if (hasHeaderKeywords && potentialHeaders.length > 3) { // 3개 이상의 컬럼이 있고 헤더 키워드를 포함
        headerRowIndex = i;
        headers = potentialHeaders;
        console.log(`✅ ${i}번째 줄을 헤더로 선택:`, headers);
        break;
      }
    }

    // 헤더를 찾지 못한 경우 첫 번째 줄을 헤더로 사용
    if (headerRowIndex === -1) {
      console.warn('⚠️ 헤더 행을 찾을 수 없어 첫 번째 줄을 헤더로 사용');
      headerRowIndex = 0;
      headers = this.parseCSVLine(lines[0]);
    }

    console.log('📋 최종 헤더 개수:', headers.length);
    console.log('📋 최종 헤더 목록:', headers);
    console.log('📋 최종 헤더 상세:', JSON.stringify(headers, null, 2));

    // 헤더 다음 줄부터 데이터 파싱
    const data = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length > 0 && values[0] && values[0].trim()) { // 빈 행 제외
        const record = {};
        headers.forEach((header, index) => {
          // 헤더와 값 모두 trim 처리
          const cleanHeader = header.trim();
          const cleanValue = values[index] ? values[index].trim() : '';
          record[cleanHeader] = cleanValue;
        });
        data.push(record);
      }
    }

    console.log(`✅ ${data.length}개의 레코드 파싱 완료`);
    if (data.length > 0) {
      console.log('📄 첫 번째 레코드 샘플:', JSON.stringify(data[0], null, 2));
      console.log('📄 첫 번째 레코드 키들:', Object.keys(data[0]));
    }
    return data;
  }

  /**
   * CSV 라인을 개별 값들로 파싱합니다 (쉼표, 따옴표 처리)
   * @param {string} line - 파싱할 CSV 라인
   * @returns {Array} 파싱된 값들의 배열
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    // 각 문자를 순회하면서 파싱
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // 다음 따옴표 건너뛰기
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // 마지막 필드 추가
    result.push(current.trim());
    return result;
  }

  /**
   * 데이터를 대시보드에서 사용할 수 있는 형태로 변환합니다
   * @param {Array} rawData - 원시 데이터 (Apps Script 또는 CSV)
   * @returns {Object} 변환된 대시보드 데이터
   */
  transformDataForDashboard(rawData) {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return this.getEmptyDashboardData();
    }

    console.log('🔧 대시보드 데이터 변환 시작...');

    let transformedData = [];

    // Apps Script에서 온 데이터인지 확인 (이미 표준화됨)
    if (rawData[0] && rawData[0].borrowerName !== undefined) {
      console.log('✅ Apps Script 표준화된 데이터 사용');
      transformedData = rawData.map((record, index) => ({
        id: record.id || `record_${index + 1}`,
        borrowerName: record.borrowerName || `대상자${index + 1}`,
        loanAmount: record.loanAmount || 0,
        remainingAmount: record.remainingAmount || 0,
        repaidAmount: record.repaidAmount || 0,
        loanDate: record.loanDate ? new Date(record.loanDate) : null,
        repaymentDate: record.repaymentDate ? new Date(record.repaymentDate) : null,
        daysUntilRepayment: record.daysUntilRepayment,
        status: record.status || '미정',
        note: record.note || '',
        _original: record.original || record
      }));
    } else {
      console.log('📄 CSV 데이터 복잡 변환 수행');
      console.log('🔧 원시 데이터 샘플:', JSON.stringify(rawData[0], null, 2));

      transformedData = rawData.map((record, index) => {
        // 다양한 컬럼명 패턴으로 데이터 추출
        const possibleIdFields = ['ID', '번호', 'NO', 'No', '순번'];
        const possibleNameFields = ['차용자', '차용자명', '대상자', '이름', '성명', '성명(실명)', '실명'];
        const possibleLoanAmountFields = ['대출금액', '대출_금액', '환수요청금액', '요청금액', '총금액', '원금'];
        const possibleRemainingFields = ['잔여금액', '잔여_금액', '미상환금액', '남은금액', '잔액'];
        const possibleLoanDateFields = ['대출일', '대출_일자', '시작일', '계약일'];
        const possibleRepaymentDateFields = ['상환예정일', '상환_예정일', '만료일', '종료일'];

        // 실제 값 찾기 함수
        const findValue = (fields) => {
          for (const field of fields) {
            if (record[field] && record[field].toString().trim()) {
              return record[field].toString().trim();
            }
          }
          return '';
        };

        // 숫자만 포함된 값 찾기 (금액용)
        const findNumericValue = (fields) => {
          for (const field of fields) {
            if (record[field]) {
              const value = record[field].toString().replace(/[^\d.-]/g, '');
              if (value && !isNaN(parseFloat(value))) {
                return value;
              }
            }
          }
          return '0';
        };

        // 날짜 필드들 처리
        const loanDate = this.parseDate(findValue(possibleLoanDateFields));
        const repaymentDate = this.parseDate(findValue(possibleRepaymentDateFields));
        
        // 금액 필드들 처리
        const loanAmount = this.parseAmount(findNumericValue(possibleLoanAmountFields));
        const remainingAmount = this.parseAmount(findNumericValue(possibleRemainingFields));
        
        // ID와 이름 추출
        const id = findValue(possibleIdFields) || `record_${index + 1}`;
        const borrowerName = findValue(possibleNameFields) || `대상자${index + 1}`;

        return {
          id: id,
          borrowerName: borrowerName,
          loanAmount: loanAmount,
          remainingAmount: remainingAmount,
          repaidAmount: Math.max(0, loanAmount - remainingAmount),
          loanDate: loanDate,
          repaymentDate: repaymentDate,
          daysUntilRepayment: this.calculateDaysUntil(repaymentDate),
          status: this.calculateStatus(repaymentDate, remainingAmount),
          note: record['비고'] || record['메모'] || record['특이사항'] || '',
          _original: record
        };
      });

      // 유효한 데이터만 필터링 (이름이나 금액이 있는 것)
      transformedData = transformedData.filter(item => 
        item.borrowerName !== `대상자${transformedData.indexOf(item) + 1}` || 
        item.loanAmount > 0 || 
        item.remainingAmount > 0
      );
    }

    console.log(`🔧 최종 유효한 데이터: ${transformedData.length}개`);

    // 대시보드 통계 계산
    const statistics = this.calculateStatistics(transformedData);

    return {
      records: transformedData,
      statistics: statistics,
      lastUpdated: new Date().toISOString(),
      totalRecords: transformedData.length
    };
  }

  /**
   * 날짜 문자열을 Date 객체로 파싱합니다
   * @param {string} dateStr - 날짜 문자열
   * @returns {Date|null} 파싱된 Date 객체 또는 null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // 다양한 날짜 형식 지원
    const formats = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{4})\.(\d{1,2})\.(\d{1,2})/, // YYYY.MM.DD
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // YYYY/MM/DD
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[3]) { // MM/DD/YYYY 형식
          return new Date(match[3], match[1] - 1, match[2]);
        } else { // YYYY-MM-DD 형식들
          return new Date(match[1], match[2] - 1, match[3]);
        }
      }
    }

    // 기본 Date 파싱 시도
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 금액 문자열을 숫자로 파싱합니다
   * @param {string} amountStr - 금액 문자열
   * @returns {number} 파싱된 금액
   */
  parseAmount(amountStr) {
    if (!amountStr) return 0;
    
    // 문자열에서 숫자와 소수점만 추출
    const cleanStr = amountStr.toString().replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleanStr);
    
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * 특정 날짜까지 남은 일수를 계산합니다
   * @param {Date} targetDate - 목표 날짜
   * @returns {number} 남은 일수 (음수면 지난 일수)
   */
  calculateDaysUntil(targetDate) {
    if (!targetDate) return null;
    
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * 상환 상태를 계산합니다
   * @param {Date} repaymentDate - 상환 예정일
   * @param {number} remainingAmount - 잔여 금액
   * @returns {string} 상태 ('완료', '정상', '주의', '연체')
   */
  calculateStatus(repaymentDate, remainingAmount) {
    if (remainingAmount <= 0) {
      return '완료';
    }
    
    if (!repaymentDate) {
      return '미정';
    }
    
    const daysUntil = this.calculateDaysUntil(repaymentDate);
    
    if (daysUntil < 0) {
      return '연체';
    } else if (daysUntil <= 7) {
      return '주의';
    } else {
      return '정상';
    }
  }

  /**
   * 대시보드 통계를 계산합니다
   * @param {Array} records - 레코드 배열
   * @returns {Object} 계산된 통계
   */
  calculateStatistics(records) {
    const stats = {
      totalLoanAmount: 0,
      totalRemaining: 0,
      totalRepaid: 0,
      statusCounts: {
        '완료': 0,
        '정상': 0,
        '주의': 0,
        '연체': 0,
        '미정': 0
      },
      averageDaysUntilRepayment: 0
    };

    let validDaysCount = 0;
    let totalDays = 0;

    records.forEach(record => {
      stats.totalLoanAmount += record.loanAmount;
      stats.totalRemaining += record.remainingAmount;
      stats.totalRepaid += record.repaidAmount;
      
      if (stats.statusCounts[record.status] !== undefined) {
        stats.statusCounts[record.status]++;
      }
      
      if (record.daysUntilRepayment !== null && record.daysUntilRepayment >= 0) {
        totalDays += record.daysUntilRepayment;
        validDaysCount++;
      }
    });

    stats.averageDaysUntilRepayment = validDaysCount > 0 ? 
      Math.round(totalDays / validDaysCount) : 0;

    return stats;
  }

  /**
   * 빈 대시보드 데이터를 반환합니다
   * @returns {Object} 빈 대시보드 데이터
   */
  getEmptyDashboardData() {
    return {
      records: [],
      statistics: {
        totalLoanAmount: 0,
        totalRemaining: 0,
        totalRepaid: 0,
        statusCounts: {
          '완료': 0,
          '정상': 0,
          '주의': 0,
          '연체': 0,
          '미정': 0
        },
        averageDaysUntilRepayment: 0
      },
      lastUpdated: new Date().toISOString(),
      totalRecords: 0
    };
  }

  /**
   * 개발/테스트용 더미 데이터를 반환합니다
   * @returns {Array} 더미 데이터 배열
   */
  getDummyData() {
    console.log('⚠️ 더미 데이터를 사용합니다 (Google Sheets 연결 실패)');
    
    return [
      {
        'ID': '001',
        '차용자': '김철수',
        '대출금액': '1000000',
        '잔여금액': '500000',
        '대출일': '2024-01-15',
        '상환예정일': '2025-01-15',
        '비고': '정상 상환 중'
      },
      {
        'ID': '002',
        '차용자': '이영희',
        '대출금액': '2000000',
        '잔여금액': '0',
        '대출일': '2024-03-10',
        '상환예정일': '2024-12-10',
        '비고': '상환 완료'
      },
      {
        'ID': '003',
        '차용자': '박민수',
        '대출금액': '1500000',
        '잔여금액': '1200000',
        '대출일': '2024-06-01',
        '상환예정일': '2025-06-01',
        '비고': '월납 진행 중'
      }
    ];
  }

  /**
   * Google Forms을 통한 신규 추가 (새 창에서 열기)
   * @param {Object} prefillData - 미리 채울 데이터
   */
  openAddForm(prefillData = {}) {
    if (!this.FORMS.ADD) {
      alert('신규 추가 폼이 아직 설정되지 않았습니다.');
      return;
    }
    
    const url = this.buildFormURL(this.FORMS.ADD, prefillData);
    window.open(url, '_blank');
  }

  /**
   * Google Forms을 통한 수정 (새 창에서 열기)
   * @param {Object} recordData - 수정할 레코드 데이터
   */
  openEditForm(recordData) {
    if (!this.FORMS.EDIT) {
      alert('수정 폼이 아직 설정되지 않았습니다.');
      return;
    }
    
    const url = this.buildFormURL(this.FORMS.EDIT, recordData);
    window.open(url, '_blank');
  }

  /**
   * Google Forms을 통한 삭제 요청 (새 창에서 열기)
   * @param {Object} recordData - 삭제할 레코드 데이터
   */
  openDeleteForm(recordData) {
    if (!this.FORMS.DELETE) {
      alert('삭제 요청 폼이 아직 설정되지 않았습니다.');
      return;
    }
    
    const url = this.buildFormURL(this.FORMS.DELETE, {
      id: recordData.id,
      borrowerName: recordData.borrowerName,
      reason: ''
    });
    window.open(url, '_blank');
  }

  /**
   * Google Forms URL에 미리 채울 데이터를 추가합니다
   * @param {string} baseURL - 기본 폼 URL
   * @param {Object} data - 미리 채울 데이터
   * @returns {string} 완성된 URL
   */
  buildFormURL(baseURL, data) {
    // Google Forms의 prefill 매개변수 형식으로 변환
    // 실제 구현 시 폼의 필드 ID에 맞게 조정 필요
    const params = new URLSearchParams();
    
    Object.keys(data).forEach(key => {
      if (data[key]) {
        params.append(`entry.${key}`, data[key]);
      }
    });
    
    return `${baseURL}?${params.toString()}`;
  }

  /**
   * 다양한 소스에서 시트 ID를 가져옵니다
   * 우선순위: URL 파라미터 → 환경변수 → localStorage → 기본값
   * @returns {string} 시트 ID
   */
  getSheetId() {
    // 1. URL 파라미터에서 확인 (예: ?sheetId=abc123)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSheetId = urlParams.get('sheetId');
    if (urlSheetId) {
      console.log('📋 URL 파라미터에서 시트 ID 가져옴:', urlSheetId);
      localStorage.setItem('sheetId', urlSheetId); // 저장해둠
      return urlSheetId;
    }

    // 2. 환경변수에서 확인
    const envSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
    if (envSheetId && envSheetId !== 'YOUR_SHEET_ID_HERE') {
      console.log('🔧 환경변수에서 시트 ID 가져옴');
      return envSheetId;
    }

    // 3. localStorage에서 확인 (이전에 설정한 값)
    const savedSheetId = localStorage.getItem('sheetId');
    if (savedSheetId && savedSheetId !== 'YOUR_SHEET_ID_HERE') {
      console.log('💾 localStorage에서 시트 ID 가져옴');
      return savedSheetId;
    }

    // 4. 기본값 (실제 운영시에는 여기에 실제 시트 ID 입력)
    const defaultSheetId = '2PACX-1vTcHjc9thzEUoZ86YiOyVrB6ayDOVk-FwVstWS_61DdZXNGh9EtzZMG9AABrLLe3J2_DeC1tuhDQlcb'; // 자동 연결용 기본 시트
    console.log('⚙️ 기본 시트 ID 사용 - 자동 연결');
    return defaultSheetId;
  }

  /**
   * 시트 ID 설정 및 저장
   * @param {string} sheetId - Google Sheets ID
   * @param {string} gid - 시트 탭 ID (선택사항)
   */
  setSheetId(sheetId, gid = null) {
    this.SHEET_ID = sheetId;
    if (gid) {
      this.GID = gid;
    }
    
    // Published sheet의 경우 다른 URL 형식 사용
    if (this.SHEET_ID.startsWith('2PACX-')) {
      this.CSV_URL = `https://docs.google.com/spreadsheets/d/e/${this.SHEET_ID}/pub?gid=${this.GID}&single=true&output=csv`;
    } else {
      this.CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    }
    
    localStorage.setItem('sheetId', sheetId); // 자동 저장
    if (gid) {
      localStorage.setItem('sheetGid', gid);
    }
    console.log('✅ Google Sheets ID 설정 및 저장 완료:', sheetId);
  }

  /**
   * 시트 ID가 유효한지 확인
   * @returns {boolean} 유효한 시트 ID인지 여부
   */
  isValidSheetId() {
    return this.SHEET_ID && 
           this.SHEET_ID !== 'YOUR_SHEET_ID_HERE' && 
           this.SHEET_ID.length > 10;
  }

  /**
   * 현재 설정된 시트 ID 반환
   * @returns {string} 현재 시트 ID
   */
  getCurrentSheetId() {
    return this.SHEET_ID;
  }

  /**
   * 폼 URL들 설정
   * @param {Object} forms - 폼 URL 객체 {ADD, EDIT, DELETE}
   */
  setFormURLs(forms) {
    this.FORMS = { ...this.FORMS, ...forms };
    console.log('✅ Google Forms URLs 설정 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const googleSheetsDataService = new GoogleSheetsDataService();
export default googleSheetsDataService;
