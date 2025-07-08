import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Search, LogOut, RefreshCw, DollarSign, CheckCircle, Clock, Target, Plus, Edit, Trash2 } from 'lucide-react';
import GoogleLogin from './components/GoogleLogin';
import { googleAuth } from './services/googleAuth';
import googleSheetsDataService from './services/googleSheetsData';
import { formatCurrency, formatPercent, getStatusClass } from './utils/formatters';

// --- Main App Component ---
function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [notifications, setNotifications] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  // 사용자 권한 정의
  const userRoles = {
    admin: { name: '관리자', permissions: ['read', 'write', 'delete'] },
    manager: { name: '팀장', permissions: ['read', 'write'] },
    viewer: { name: '조회자', permissions: ['read'] }
  };
  
  // 알림 추가 함수
  const addNotification = (message, type = 'info') => {
    const newNotification = { id: Date.now(), message, type };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotification.id)), 5000);
  };

  // 데이터 동기화 함수
  const syncData = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const data = await googleSheetsDataService.fetchData();
      setDashboardData(data);
      setLastSyncTime(new Date());
      addNotification('✅ 실시간 데이터 동기화 완료!', 'success');
    } catch (error) {
      console.error('동기화 실패:', error);
      setDashboardData(null); // 실패 시 데이터 초기화
      addNotification(`❌ 데이터 동기화 실패: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // 로그인 상태 확인 및 초기 데이터 로드
  useEffect(() => {
    const checkLogin = async () => {
      setIsLoading(true);
      try {
        await googleAuth.initialize();
        const currentUser = googleAuth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          await syncData();
        }
      } catch (error) {
        console.error("초기화 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, [syncData]);

  // 로그인 성공 핸들러
  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    addNotification(`🎉 ${userData.name}님 환영합니다!`, 'success');
    await syncData();
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    googleAuth.signOut();
    setUser(null);
    setDashboardData(null);
  };

  // 데이터 저장/수정/삭제 핸들러
  const handleSave = async (data) => {
    const action = data.ID ? 'UPDATE' : 'CREATE';
    setIsSyncing(true);
    try {
      const result = await googleSheetsDataService.postData(action, { data });
      addNotification(`✅ ${result.message}`, 'success');
      setIsModalOpen(false);
      await syncData(); // 변경 후 데이터 새로고침
    } catch (error) {
      addNotification(`❌ 저장 실패: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };
  
  // 삭제 핸들러
  const handleDelete = async (person) => {
    if (window.confirm(`정말로 '${person.name}'님의 데이터를 삭제하시겠습니까?`)) {
      setIsSyncing(true);
      try {
        const result = await googleSheetsDataService.postData('DELETE', { id: person.ID });
        addNotification(`✅ ${result.message}`, 'success');
        await syncData();
      } catch (error) {
        addNotification(`❌ 삭제 실패: ${error.message}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 모달 열기
  const openModal = (person = null) => {
    setEditingPerson(person); // null이면 신규, 객체면 수정
    setIsModalOpen(true);
  };

  // 권한 확인
  const hasPermission = (permission) => user && userRoles[user.role]?.permissions.includes(permission);

  // 필터링된 데이터
  const filteredIndividuals = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.individuals.filter(p => 
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.연락처?.includes(searchTerm)) &&
      (statusFilter === '전체' || p.status === statusFilter)
    );
  }, [dashboardData, searchTerm, statusFilter]);

  // 로딩 화면
  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  // 로그인 화면
  if (!user) return <GoogleLogin onLoginSuccess={handleLoginSuccess} />;
  
  // --- Main App Component ---
  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationPanel notifications={notifications} />
      {/* --- Header --- */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛡️ 환수 관리 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">
              {`Project Aegis · ${user.name} (${userRoles[user.role].name})`}
              {lastSyncTime && ` · 마지막 동기화: ${lastSyncTime.toLocaleTimeString('ko-KR')}`}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {hasPermission('write') && (
              <button onClick={() => openModal(null)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> 신규 추가
              </button>
            )}
            <button onClick={syncData} disabled={isSyncing} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? '동기화 중' : '새로고침'}
            </button>
            <button onClick={handleLogout} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              <LogOut className="h-4 w-4 mr-2" /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!dashboardData ? (
           <div className="text-center py-10">
            <p>데이터를 불러오는 중이거나, 로드에 실패했습니다.</p>
            <p>잠시 후 새로고침 버튼을 눌러주세요.</p>
           </div>
        ) : (
          <>
            {/* KPI Cards, Charts, Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard title="총 환수요청금액" value={formatCurrency(dashboardData.kpi.totalRequested)} icon={DollarSign} color="from-blue-500 to-blue-600" />
              <KPICard title="상환완료금액" value={formatCurrency(dashboardData.kpi.totalRepaid)} icon={CheckCircle} color="from-green-500 to-green-600" />
              <KPICard title="잔여금액" value={formatCurrency(dashboardData.kpi.totalRemaining)} icon={Clock} color="from-red-500 to-red-600" />
              <KPICard title="전체 환수율" value={formatPercent(dashboardData.kpi.repaymentRate)} icon={Target} color="from-purple-500 to-purple-600" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">👥 개인별 환수 내역</h3>
                <div className="flex gap-4">
                  <input type="text" placeholder="이름/연락처 검색" className="px-4 py-2 border rounded-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <select className="px-4 py-2 border rounded-lg" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="전체">전체 상태</option>
                    <option value="상환완료">상환완료</option>
                    <option value="상환중">상환중</option>
                    <option value="미상환">미상환</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">연락처</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">환수요청금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">상환완료금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">잔여금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIndividuals.map((p) => (
                      <tr key={p.ID}>
                        <td className="px-6 py-4 whitespace-nowrap">{p.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{p.연락처}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(p.totalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-600">{formatCurrency(p.repaidAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-red-600">{formatCurrency(p.remainingAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(p.status)}`}>{p.status}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {hasPermission('write') && <button onClick={() => openModal(p)} className="text-green-600 hover:text-green-800"><Edit size={16} /></button>}
                            {hasPermission('delete') && <button onClick={() => handleDelete(p)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* --- Modal --- */}
      {isModalOpen && (
        <DataEditModal
          person={editingPerson}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// --- Helper Components ---
const KPICard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-lg bg-gradient-to-r ${color}`}><Icon className="h-6 w-6 text-white" /></div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const NotificationPanel = ({ notifications }) => (
  <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
    {notifications.map(n => (
      <div key={n.id} className={`p-4 rounded-lg shadow-lg border-l-4 ${n.type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'}`}>
        <p className="text-sm font-medium">{n.message}</p>
      </div>
    ))}
  </div>
);

// --- Data Edit Modal Component ---
const DataEditModal = ({ person, onClose, onSave }) => {
  const [formData, setFormData] = useState(person || {});

  useEffect(() => {
    // 모달이 열릴 때 초기 데이터 설정
    setFormData(person || {});
  }, [person]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  // Google 시트의 헤더와 일치해야 합니다.
  const fields = ['대상자', '주민번호', '연락처', '입사일', '퇴사일', '환수요청금액', '상환완료금액', '상환예정일', '비고'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">{person ? `수정: ${person.name}` : '신규 환수 데이터 추가'}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {fields.map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field}</label>
                <input
                  type={field.includes('금액') ? 'number' : field.includes('일') ? 'date' : 'text'}
                  name={field}
                  value={formData[field] || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="p-6 border-t flex justify-end space-x-3 bg-gray-50 rounded-b-lg">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">취소</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">저장하기</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
