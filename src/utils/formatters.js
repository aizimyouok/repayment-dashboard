// 숫자 포맷팅 함수들
export const formatCurrency = (amount) => {
  return `${amount?.toLocaleString() || 0}원`;
};

export const formatPercent = (rate) => {
  return `${(rate * 100).toFixed(1)}%`;
};

// 주민번호 마스킹 (앞자리와 뒷자리 첫 번째까지 표시)
export const maskSSN = (ssn) => {
  if (!ssn) return '';
  const cleaned = ssn.replace(/[^\d]/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.substring(0, 6)}-${cleaned.substring(6, 7)}******`;
  }
  return ssn;
};

// 날짜 포맷팅
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
};

// D-day 계산
export const calculateDday = (targetDate) => {
  if (!targetDate) return null;
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '오늘';
  if (diffDays > 0) return `D-${diffDays}`;
  return `${Math.abs(diffDays)}일 초과`;
};

// 상태별 색상 매핑
export const getStatusColor = (status) => {
  const colors = {
    '상환완료': '#10B981',
    '상환중': '#3B82F6',
    '미상환': '#EF4444',
    '연체': '#DC2626',
    '채권추심': '#8B5CF6',
    '유예': '#F59E0B'
  };
  return colors[status] || '#6B7280';
};

// 상태별 CSS 클래스
export const getStatusClass = (status) => {
  const classes = {
    '상환완료': 'bg-green-100 text-green-800',
    '상환중': 'bg-blue-100 text-blue-800',
    '미상환': 'bg-red-100 text-red-800',
    '연체': 'bg-red-100 text-red-800',
    '채권추심': 'bg-purple-100 text-purple-800',
    '유예': 'bg-yellow-100 text-yellow-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};
