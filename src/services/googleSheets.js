// 비활성화된 파일 - googleSheetsDataService를 사용하세요
console.log('⚠️ 이 파일은 비활성화되었습니다. googleSheetsDataService를 사용하세요.');

export class GoogleSheetsService {
  async fetchSheetData() {
    console.log('⚠️ googleSheets.js가 호출되었습니다! googleSheetsDataService를 사용해야 합니다.');
    return [];
  }
}

export const googleSheets = new GoogleSheetsService();