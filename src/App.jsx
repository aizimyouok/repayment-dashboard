import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Search, Eye, LogOut, Sync, Bell, DollarSign, CheckCircle, Clock, Target } from 'lucide-react';
import GoogleLogin from './components/GoogleLogin';
import { googleAuth } from './services/googleAuth';
import { googleSheets } from './services/googleSheets';
import { formatCurrency, formatPercent, maskSSN, getStatusClass, calculateDday } from './utils/formatters';

function App() {
  // 상태 관리
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 사용자 권한 정의
  const userRoles = {
    admin: { name: '관리자', permissions: ['read', 'write', 'delete', 'manage_users'] },
    manager: { name: '팀장', permissions: ['read', 'write'] },
    viewer: { name: '조회자', permissions: ['read'] }
  };

  // 알림 추가 함수
  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  // Google Sheets 동기화
  const syncWithGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      const data = await googleSheets.fetchSheetData();
      setDashboardData(data);
      setLastSyncTime(new Date());
      addNotification('데이터 동기화가 완료되었습니다.', 'success');
    } catch (error) {
      console.error('동기화 실패:', error);
      addNotification('데이터 동기화에 실패했습니다.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 권한 확인 함수
  const hasPermission = (permission) => {
    return user && userRoles[user.role]?.permissions.includes(permission);
  };

  // 초기화 및 로그인 상태 확인
  useEffect(() => {
    const checkExistingLogin = async () => {
      try {
        await googleAuth.initialize();
        const currentUser = googleAuth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // 데이터 로드
          const data = await googleSheets.fetchSheetData();
          setDashboardData(data);
          setLastSyncTime(new Date());
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingLogin();
  }, []);

  // 로그인 성공 처리
  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    addNotification(`${userData.name}님 환영합니다!`, 'success');
    
    // 데이터 로드
    try {
      const data = await googleSheets.fetchSheetData();
      setDashboardData(data);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    googleAuth.signOut();
    setUser(null);
    setDashboardData(null);
  };

  // 필터링된 개인 데이터
  const filteredIndividuals = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.individuals.filter(person => {
      const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           person.phone.includes(searchTerm);
      const matchesStatus = statusFilter === '전체' || person.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dashboardData, searchTerm, statusFilter]);

  // D-day 알림 생성
  const ddayAlerts = useMemo(() => {
    if (!dashboardData) return [];
    const alerts = [];
    
    dashboardData.individuals.forEach(person => {
      if (person.nextPaymentDate && person.status === '상환중') {
        const dday = calculateDday(person.nextPaymentDate);
        if (dday === '오늘' || dday.includes('D-') || dday.includes('초과')) {
          alerts.push({
            id: `alert-${person.no}`,
            type: dday === '오늘' || dday.includes('초과') ? 'urgent' : 'warning',
            message: `${person.name} - ${dday} 상환 예정`,
            person: person
          });
        }
      }
    });
    
    return alerts;
  }, [dashboardData]);

  // KPI 카드 컴포넌트
  const KPICard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className="h-8 w-8" style={{ color }} />
      </div>
    </div>
  );

  // 알림 패널 컴포넌트
  const NotificationPanel = () => {
    if (notifications.length === 0 && ddayAlerts.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-40 space-y-2 max-w-sm">
        {ddayAlerts.map(alert => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg shadow-lg ${
              alert.type === 'urgent' ? 'bg-red-100 border-l-4 border-red-500' :
              'bg-yellow-100 border-l-4 border-yellow-500'
            }`}
          >
            <div className="flex items-start">
              <Bell className={`h-5 w-5 mt-0.5 mr-3 ${
                alert.type === 'urgent' ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                <p className="text-xs text-gray-600 mt-1">상환 알림</p>
              </div>
            </div>
          </div>
        ))}
        
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' :
              notification.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' :
              'bg-blue-100 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {notification.timestamp.toLocaleTimeString('ko-KR')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 개인 상세 모달
  const PersonDetailModal = ({ person, onClose }) => {
    if (!person) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{person.name} 상세 정보</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">주민번호:</span>
                    <span className="font-medium">{maskSSN(person.ssn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">연락처:</span>
                    <span className="font-medium">{person.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">입사일:</span>
                    <span className="font-medium">{person.joinDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">퇴사일:</span>
                    <span className="font-medium">{person.leaveDate}</span>
                  </div>
                  {person.nextPaymentDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">다음 상환일:</span>
                      <span className="font-medium text-orange-600">{person.nextPaymentDate}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">환수 현황</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 환수요청금액:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(person.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">상환완료금액:</span>
                    <span className="font-medium text-green-600">{formatCurrency(person.repaidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">잔여금액:</span>
                    <span className="font-medium text-red-600">{formatCurrency(person.remainingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">상환율:</span>
                    <span className="font-medium">
                      {person.totalAmount > 0 ? formatPercent(person.repaidAmount / person.totalAmount) : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">시스템을 초기화하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 로그인 필요
  if (!user) {
    return <GoogleLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // 데이터 로딩 중
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">환수 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { kpi, individuals, summary } = dashboardData;

  // 차트 데이터 준비
  const statusColors = {
    '상환완료': '#10B981',
    '상환중': '#3B82F6', 
    '미상환': '#EF4444',
    '연체': '#DC2626',
    '채권추심': '#8B5CF6',
    '유예': '#F59E0B'
  };

  const statusChartData = Object.entries(summary.statusDistribution).map(([status, count]) => ({
    name: status,
    value: count,
    color: statusColors[status] || '#6B7280'
  }));

  const monthlyTrendData = [
    { month: '2024-01', amount: Math.floor(kpi.totalRepaid * 0.15) },
    { month: '2024-02', amount: Math.floor(kpi.totalRepaid * 0.12) },
    { month: '2024-03', amount: Math.floor(kpi.totalRepaid * 0.18) },
    { month: '2024-04', amount: Math.floor(kpi.totalRepaid * 0.20) },
    { month: '2024-05', amount: Math.floor(kpi.totalRepaid * 0.22) },
    { month: '2024-06', amount: Math.floor(kpi.totalRepaid * 0.13) }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 알림 패널 */}
      <NotificationPanel />

      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">환수 관리 대시보드</h1>
              <p className="text-sm text-gray-500 mt-1">
                Project Aegis · {user.name} ({userRoles[user.role].name})
                {lastSyncTime && ` · 마지막 동기화: ${lastSyncTime.toLocaleString('ko-KR')}`}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 동기화 버튼 */}
              <button
                onClick={syncWithGoogleSheets}
                disabled={isSyncing}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Sync className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '동기화 중...' : '데이터 동기화'}
              </button>
              
              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="총 환수요청금액"
            value={formatCurrency(kpi.totalRequested)}
            icon={DollarSign}
            color="#3B82F6"
            subtitle={`총 ${summary.totalCount}명`}
          />
          <KPICard
            title="상환완료금액"
            value={formatCurrency(kpi.totalRepaid)}
            icon={CheckCircle}
            color="#10B981"
            subtitle={`완료 ${summary.statusDistribution['상환완료'] || 0}명`}
          />
          <KPICard
            title="잔여금액"
            value={formatCurrency(kpi.totalRemaining)}
            icon={Clock}
            color="#EF4444"
            subtitle={`진행중 ${(summary.statusDistribution['상환중'] || 0) + (summary.statusDistribution['미상환'] || 0)}명`}
          />
          <KPICard
            title="전체 환수율"
            value={formatPercent(kpi.repaymentRate)}
            icon={Target}
            color="#8B5CF6"
            subtitle={`연체 ${summary.statusDistribution['연체'] || 0}명`}
          />
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 상환금액 추이</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => [formatCurrency(value), '상환금액']} />
                <Bar dataKey="amount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">환수 상태별 현황</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value}명 (${(percent).toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 개인별 환수 내역 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">개인별 환수 내역</h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="이름 또는 연락처 검색"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <select
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="전체">전체 상태</option>
                  <option value="상환완료">상환완료</option>
                  <option value="상환중">상환중</option>
                  <option value="미상환">미상환</option>
                  <option value="연체">연체</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주민번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">환수요청금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상환완료금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">잔여금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">다음상환일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIndividuals.map((person) => (
                  <tr key={person.no} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {maskSSN(person.ssn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {person.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(person.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(person.repaidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {formatCurrency(person.remainingAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {person.nextPaymentDate || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(person.status)}`}>
                        {person.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIndividuals.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 개인 상세 모달 */}
      {showModal && selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => {
            setShowModal(false);
            setSelectedPerson(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
