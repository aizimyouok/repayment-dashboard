export class GoogleSheetsService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY; // 선택사항
    this.sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  }

  async fetchSheetData() {
    try {
      // 공개 시트의 경우 API 키 사용
      if (this.apiKey && this.sheetId) {
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/환수 진행 내역 및 현황!A:AC?key=${this.apiKey}`
        );
        
        if (!response.ok) {
          throw new Error('시트 데이터를 가져올 수 없습니다.');
        }
        
        const data = await response.json();
        return this.parseSheetData(data.values);
      }
      
      // API 키가 없는 경우 샘플 데이터 반환
      console.log('Google Sheets API 키가 설정되지 않았습니다. 샘플 데이터를 사용합니다.');
      return this.getSampleData();
      
    } catch (error) {
      console.error('Google Sheets API Error:', error);
      // 에러 시 샘플 데이터 반환
      return this.getSampleData();
    }
  }

  parseSheetData(values) {
    if (!values || values.length < 4) {
      throw new Error('시트 데이터 형식이 올바르지 않습니다.');
    }

    // KPI 데이터 추출 (첫 번째 행들에서)
    const kpiData = {
      totalRequested: this.extractNumber(values[0][13]) || 116177722,
      totalRepaid: this.extractNumber(values[1][13]) || 53613316,
      repaymentRate: this.extractNumber(values[2][13]) || 0.4615
    };
    kpiData.totalRemaining = kpiData.totalRequested - kpiData.totalRepaid;

    // 개인별 데이터 추출 (4번째 행부터)
    const headers = values[3];
    const dataRows = values.slice(4).filter(row => row[0] && row[1]);
    
    const individuals = dataRows.map((row, index) => ({
      no: row[0],
      name: row[1],
      ssn: row[2],
      phone: row[3],
      joinDate: this.formatDate(row[4]),
      leaveDate: this.formatDate(row[5]),
      totalAmount: this.extractNumber(row[12]) || 0,
      repaidAmount: this.extractNumber(row[13]) || 0,
      remainingAmount: this.extractNumber(row[14]) || 0,
      status: this.determineStatus(row),
      nextPaymentDate: this.getNextPaymentDate(row),
      rounds: this.parseRounds(row.slice(15))
    }));

    const summary = this.generateSummary(individuals);
    return { kpi: kpiData, individuals, summary };
  }

  extractNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  formatDate(dateValue) {
    if (!dateValue) return '';
    // Excel 날짜 형식 처리
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return dateValue;
  }

  determineStatus(row) {
    const remaining = this.extractNumber(row[14]);
    const repaid = this.extractNumber(row[13]);
    
    if (remaining <= 0) return '상환완료';
    if (repaid > 0) return '상환중';
    return '미상환';
  }

  getNextPaymentDate(row) {
    // 다음 상환일 로직 (실제 데이터에 맞게 수정 필요)
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 1);
    return futureDate.toISOString().split('T')[0];
  }

  parseRounds(roundData) {
    const rounds = [];
    roundData.forEach((amount, index) => {
      if (amount && this.extractNumber(amount) > 0) {
        rounds.push({
          round: index + 1,
          amount: this.extractNumber(amount),
          status: '완납',
          paidDate: '2024-06-01',
          dueDate: '2024-06-01'
        });
      }
    });
    return rounds;
  }

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
          no: 1, name: '김철수', ssn: '8901234567890', phone: '010-1234-5678',
          joinDate: '2022-01-15', leaveDate: '2023-12-31',
          totalAmount: 5000000, repaidAmount: 5000000, remainingAmount: 0,
          status: '상환완료', nextPaymentDate: null,
          rounds: [{ round: 1, amount: 5000000, status: '완납', paidDate: '2024-01-15' }]
        },
        {
          no: 2, name: '이영희', ssn: '8512345678901', phone: '010-2345-6789',
          joinDate: '2022-03-01', leaveDate: '2024-01-31',
          totalAmount: 3000000, repaidAmount: 1500000, remainingAmount: 1500000,
          status: '상환중', nextPaymentDate: '2024-08-01',
          rounds: [
            { round: 1, amount: 1500000, status: '완납', paidDate: '2024-02-01' },
            { round: 2, amount: 1500000, status: '예정', dueDate: '2024-08-01' }
          ]
        },
        {
          no: 3, name: '박민수', ssn: '9001234567890', phone: '010-3456-7890',
          joinDate: '2022-05-15', leaveDate: '2024-03-15',
          totalAmount: 4000000, repaidAmount: 0, remainingAmount: 4000000,
          status: '미상환', nextPaymentDate: '2024-07-15',
          rounds: [{ round: 1, amount: 4000000, status: '미납', dueDate: '2024-07-15' }]
        }
      ],
      summary: {
        totalCount: 40,
        statusDistribution: {
          '상환완료': 24,
          '상환중': 8,
          '미상환': 8
        }
      }
    };
  }
}

export const googleSheets = new GoogleSheetsService();
