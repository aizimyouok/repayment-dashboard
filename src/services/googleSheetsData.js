/**
 * Google Sheets API 서비스 (Apps Script 웹 앱 활용)
 * 기능:
 * - fetchData: GET 요청으로 모든 데이터를 가져옴
 * - postData: POST 요청으로 데이터 생성, 수정, 삭제
 */
class GoogleSheetsDataService {
  constructor() {
    // ⚠️ 위에서 배포하고 복사한 Apps Script 웹 앱 URL로 반드시 변경하세요.
    this.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykFLX24cpvcxfzzQvAbH-OEFFuImpMdXxFM4srMXEmb3PAFL-KBbjOwPgY8VbXNSjx/exec';
  }

  /**
   * Google Apps Script에서 모든 데이터를 가져옵니다. (GET)
   * @returns {Promise<Array>} 대시보드 형식으로 변환된 데이터 배열
   */
  async fetchData() {
    try {
      if (!this.APPS_SCRIPT_URL) {
        throw new Error("Apps Script URL이 설정되지 않았습니다.");
      }

      const response = await fetch(this.APPS_SCRIPT_URL, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '데이터를 가져오는 데 실패했습니다.');
      }

      // 원본 데이터를 대시보드에서 사용하기 좋은 형태로 변환합니다.
      return this.transformDataForDashboard(result.data);

    } catch (error) {
      console.error('❌ 데이터 로딩 실패:', error);
      // UI에서 에러를 처리할 수 있도록 에러를 던집니다.
      throw error;
    }
  }

  /**
   * Google Apps Script로 데이터를 생성, 수정, 삭제합니다. (POST)
   * @param {string} action - 'CREATE', 'UPDATE', 'DELETE' 중 하나
   * @param {object} payload - Apps Script로 전송할 데이터
   * @returns {Promise<object>} 작업 결과
   */
  async postData(action, payload) {
    try {
      const response = await fetch(this.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script 웹 앱은 이 형식을 선호합니다.
        redirect: 'follow', // 리디렉션 발생 시 따라가도록 설정
        body: JSON.stringify({ action, ...payload }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || `${action} 작업에 실패했습니다.`);
      }

      return result;
    } catch (error) {
      console.error(`❌ ${action} 작업 실패:`, error);
      throw error;
    }
  }
  
  /**
   * Apps Script에서 받은 원본 데이터를 대시보드 형식으로 변환합니다.
   * @param {Array} rawData - 원본 데이터 배열
   * @returns {Object} 대시보드용 데이터 (kpi, individuals, summary)
   */
  transformDataForDashboard(rawData) {
    if (!Array.isArray(rawData)) {
      rawData = [];
    }

    const individuals = rawData.map(record => {
      const totalAmount = parseFloat(record['환수요청금액'] || 0);
      const repaidAmount = parseFloat(record['상환완료금액'] || 0);
      const remainingAmount = totalAmount - repaidAmount;
      
      let status = '미상환';
      if (remainingAmount <= 0) {
        status = '상환완료';
      } else if (repaidAmount > 0) {
        status = '상환중';
      }

      return {
        ...record, // 원본 데이터 전부 포함
        no: record['ID'],
        name: record['차용자'],
        totalAmount,
        repaidAmount,
        remainingAmount,
        status,
        nextPaymentDate: record['상환예정일'] || '-',
      };
    });

    // KPI 및 요약 정보 계산
    const totalRequested = individuals.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalRepaid = individuals.reduce((sum, p) => sum + p.repaidAmount, 0);
    const statusDistribution = individuals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      kpi: {
        totalRequested,
        totalRepaid,
        totalRemaining: totalRequested - totalRepaid,
        repaymentRate: totalRequested > 0 ? totalRepaid / totalRequested : 0,
      },
      individuals,
      summary: {
        totalCount: individuals.length,
        statusDistribution,
      },
    };
  }
}

// 싱글톤 인스턴스를 생성하여 내보냅니다.
const googleSheetsDataService = new GoogleSheetsDataService();
export default googleSheetsDataService;
