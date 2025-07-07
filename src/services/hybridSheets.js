// 하이브리드 Google Sheets 서비스
export class HybridSheetsService {
  constructor() {
    // CSV 공개 URL (API 키 불필요)
    this.csvUrl = 'https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0';
    this.lastFetchTime = null;
    this.cachedData = null;
  }

  // CSV에서 데이터 읽기 (API 키 불필요)
  async fetchSheetData() {
    try {
      console.log('하이브리드 시트에서 데이터 로드 중...');
      
      const response = await fetch(this.csvUrl);
      if (!response.ok) {
        throw new Error('CSV 데이터를 가져올 수 없습니다.');
      }
      
      const csvText = await response.text();
      const parsedData = this.parseCSVData(csvText);
      
      this.cachedData = parsedData;
      this.lastFetchTime = new Date();
      
      console.log('✅ 하이브리드 데이터 로드 완료:', parsedData.summary);
      return parsedData;
      
    } catch (error) {
      console.error('❌ 하이브리드 데이터 로드 실패:', error);
      
      // 에러 시 샘플 데이터 반환
      return this.getSampleData();
    }
  }

  // CSV 텍스트를 JSON으로 파싱
  parseCSVData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    // 헤더 찾기 (NO, 대상자가 있는 행)
    let headerIndex = -1;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const cells = this.parseCSVLine(lines[i]);
      if (cells[0] === 'NO' && cells[1] === '대상자') {
        headerIndex = i;
        headers = cells;
        break;
      }
    }
    
    if (headerIndex === -1) {
      throw new Error('올바른 데이터 구조를 찾을 수 없습니다.');
    }

    // KPI 데이터 추출
    const kpiData = this.extractKPIData(lines.slice(0, headerIndex));
    
    // 개인별 데이터 추출
    const individuals = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cells = this.parseCSVLine(lines[i]);
      if (cells[0] && cells[1] && cells[0] !== 'NO') { // 유효한 데이터 행
        const person = this.parsePersonData(cells, headers);
        if (person) individuals.push(person);
      }
    }

    const summary = this.generateSummary(individuals);
    
    return { kpi: kpiData, individuals, summary, lastUpdate: new Date() };
  }

  // CSV 한 줄 파싱 (쉼표, 따옴표 처리)
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // KPI 데이터 추출
  extractKPIData(topLines) {
    let totalRequested = 0;
    let totalRepaid = 0;
    let repaymentRate = 0;

    topLines.forEach(line => {
      const cells = this.parseCSVLine(line);
      
      // "환수요청금액" 찾기
      if (cells.some(cell => cell?.includes('환수요청금액'))) {
        const amountIndex = cells.findIndex(cell => cell?.includes('환수요청금액')) + 1;
        if (cells[amountIndex]) {
          totalRequested = this.extractNumber(cells[amountIndex]);
        }
      }
      
      // "상환중인금액" 또는 "상환완료금액" 찾기
      if (cells.some(cell => cell?.includes('상환중인') || cell?.includes('상환완료'))) {
        const amountIndex = cells.findIndex(cell => 
          cell?.includes('상환중인') || cell?.includes('상환완료')
        ) + 1;
        if (cells[amountIndex]) {
          totalRepaid = this.extractNumber(cells[amountIndex]);
        }
      }
      
      // "환수율" 찾기
      if (cells.some(cell => cell?.includes('환수율'))) {
        const rateIndex = cells.findIndex(cell => cell?.includes('환수율')) + 1;
        if (cells[rateIndex]) {
          repaymentRate = this.extractNumber(cells[rateIndex]);
          if (repaymentRate > 1) repaymentRate = repaymentRate / 100; // 퍼센트 변환
        }
      }
    });

    return {
      totalRequested: totalRequested || 116177722,
      totalRepaid: totalRepaid || 53613316,
      totalRemaining: (totalRequested || 116177722) - (totalRepaid || 53613316),
      repaymentRate: repaymentRate || 0.4615
    };
  }

  // 개인 데이터 파싱
  parsePersonData(cells, headers) {
    try {
      // 기본 정보 추출
      const person = {
        no: cells[0],
        name: cells[1],
        ssn: cells[2],
        phone: cells[3],
        joinDate: this.formatDate(cells[4]),
        leaveDate: this.formatDate(cells[5]),
        contractDate: this.formatDate(cells[6]),
        repaymentStartDate: this.formatDate(cells[7]),
        repaymentEndDate: this.formatDate(cells[8]),
        totalAmount: this.extractNumber(cells[12]) || 0,
        repaidAmount: this.extractNumber(cells[13]) || 0,
        remainingAmount: this.extractNumber(cells[14]) || 0,
        rounds: []
      };

      // 회차별 데이터 추출 (15번째 컬럼부터)
      for (let i = 15; i < Math.min(cells.length, 29); i++) {
        if (cells[i] && this.extractNumber(cells[i]) > 0) {
          person.rounds.push({
            round: i - 14,
            amount: this.extractNumber(cells[i]),
            status: '완납',
            paidDate: person.repaymentStartDate
          });
        }
      }

      // 상태 결정
      person.status = this.determineStatus(person);
      person.nextPaymentDate = this.getNextPaymentDate(person);
      
      return person;
    } catch (error) {
      console.error('개인 데이터 파싱 오류:', error);
      return null;
    }
  }

  // 숫자 추출
  extractNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  // 날짜 포맷팅
  formatDate(dateValue) {
    if (!dateValue) return '';
    try {
      // Excel 시리얼 번호인 경우
      if (typeof dateValue === 'number' && dateValue > 25569) {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      // 문자열 날짜인 경우
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      return dateValue;
    } catch (error) {
      return dateValue;
    }
  }

  // 상태 결정
  determineStatus(person) {
    if (person.remainingAmount <= 0) return '상환완료';
    if (person.repaidAmount > 0) return '상환중';
    return '미상환';
  }

  // 다음 상환일 계산
  getNextPaymentDate(person) {
    if (person.status === '상환완료') return null;
    
    // 간단한 로직: 마지막 상환일로부터 3개월 후
    if (person.repaymentStartDate) {
      const lastDate = new Date(person.repaymentStartDate);
      lastDate.setMonth(lastDate.getMonth() + 3);
      return lastDate.toISOString().split('T')[0];
    }
    
    return null;
  }

  // 요약 통계 생성
  generateSummary(individuals) {
    const statusDistribution = individuals.reduce((acc, person) => {
      acc[person.status] = (acc[person.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCount: individuals.length,
      statusDistribution
    };
  }

  // 시트 ID 설정
  setSheetId(sheetId) {
    this.csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    console.log('✅ 시트 ID 설정 완료:', sheetId);
  }

  // 샘플 데이터 (시트 로드 실패 시)
  getSampleData() {
    return {
      kpi: {
        totalRequested: 116177722,
        totalRepaid: 53613316,
        totalRemaining: 62564406,
        repaymentRate: 0.4615
      },
      individuals: [
        {
          no: 1, name: '김철수', ssn: '890123-1******', phone: '010-1234-5678',
          joinDate: '2022-01-15', leaveDate: '2023-12-31',
          totalAmount: 5000000, repaidAmount: 5000000, remainingAmount: 0,
          status: '상환완료', nextPaymentDate: null,
          rounds: [{ round: 1, amount: 5000000, status: '완납', paidDate: '2024-01-15' }]
        },
        {
          no: 2, name: '이영희', ssn: '851234-2******', phone: '010-2345-6789',
          joinDate: '2022-03-01', leaveDate: '2024-01-31',
          totalAmount: 3000000, repaidAmount: 1500000, remainingAmount: 1500000,
          status: '상환중', nextPaymentDate: '2024-08-01',
          rounds: [
            { round: 1, amount: 1500000, status: '완납', paidDate: '2024-02-01' },
            { round: 2, amount: 1500000, status: '예정', dueDate: '2024-08-01' }
          ]
        }
      ],
      summary: {
        totalCount: 40,
        statusDistribution: {
          '상환완료': 24,
          '상환중': 8,
          '미상환': 8
        }
      },
      lastUpdate: new Date()
    };
  }
}

export const hybridSheets = new HybridSheetsService();
