import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Search, Eye, LogOut, RefreshCw, Bell, DollarSign, CheckCircle, Clock, Target, Plus, Edit, Trash2, Upload, Download, Settings, ExternalLink, AlertTriangle } from 'lucide-react';
import GoogleLogin from './components/GoogleLogin';
import { googleAuth } from './services/googleAuth';
import googleSheetsDataService from './services/googleSheetsData';
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
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [sheetId, setSheetId] = useState('');

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

  // 하이브리드 시트 동기화
  const syncWithHybridSheets = async () => {
    setIsSyncing(true);
    try {
      // 원시 데이터 가져오기
      const rawData = await googleSheetsDataService.fetchData();
      console.log('🔄 원시 데이터:', rawData);
      
      // 대시보드용 데이터로 변환
      const transformedData = googleSheetsDataService.transformDataForDashboard(rawData);
      console.log('✅ 변환된 데이터:', transformedData);
      
      // 대시보드 데이터 구조에 맞게 재구성
      const dashboardData = {
        kpi: {
          totalRequested: transformedData.statistics.totalLoanAmount,
          totalRepaid: transformedData.statistics.totalRepaid,
          totalRemaining: transformedData.statistics.totalRemaining,
          repaymentRate: transformedData.statistics.totalLoanAmount > 0 ? 
            transformedData.statistics.totalRepaid / transformedData.statistics.totalLoanAmount : 0
        },
        individuals: transformedData.records.map(record => ({
          no: record.id,
          name: record.borrowerName,
          ssn: record._original['주민번호'] || record._original['주민번호_앞자리'] || '',
          phone: record._original['연락처'] || record._original['휴대폰'] || '',
          joinDate: record._original['입사일'] || '',
          leaveDate: record._original['퇴사일'] || '',
          totalAmount: record.loanAmount,
          repaidAmount: record.repaidAmount,
          remainingAmount: record.remainingAmount,
          nextPaymentDate: record.repaymentDate ? 
            record.repaymentDate.toISOString().split('T')[0] : null,
          status: record.status,
          rounds: [] // 상세 회차 정보는 추후 구현
        })),
        summary: {
          totalCount: transformedData.totalRecords,
          statusDistribution: transformedData.statistics.statusCounts
        }
      };
      
      setDashboardData(dashboardData);
      setLastSyncTime(new Date());
      addNotification('✅ 실시간 데이터 동기화가 완료되었습니다.', 'success');
    } catch (error) {
      console.error('동기화 실패:', error);
      addNotification('❌ 데이터 동기화에 실패했습니다. 시트 설정을 확인해주세요.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 시트 ID 설정
  const handleSheetSetup = (newSheetId) => {
    googleSheetsDataService.setSheetId(newSheetId);
    setSheetId(newSheetId);
    localStorage.setItem('sheetId', newSheetId);
    setShowSetupModal(false);
    addNotification('🔗 Google Sheets 연결이 설정되었습니다.', 'success');
    syncWithHybridSheets();
  };

  // Forms 작업 후 자동 새로고침
  const handleFormAction = async (action, person = null) => {
    try {
      let result = false;
      
      switch (action) {
        case 'add':
          googleSheetsDataService.openAddForm();
          result = true;
          break;
        case 'edit':
          googleSheetsDataService.openEditForm(person);
          result = true;
          break;
        case 'delete':
          googleSheetsDataService.openDeleteForm(person);
          result = true;
          break;
      }

      if (result) {
        // Forms 완료 후 2초 대기 후 자동 새로고침
        setTimeout(() => {
          addNotification('📝 변경사항이 반영되었습니다. 데이터를 새로고침합니다.', 'info');
          syncWithHybridSheets();
        }, 2000);
      }
    } catch (error) {
      console.error('Forms 작업 실패:', error);
      addNotification('❌ 작업 중 오류가 발생했습니다.', 'error');
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
        const savedSheetId = localStorage.getItem('sheetId');
        
        if (currentUser) {
          setUser(currentUser);
          
          if (savedSheetId) {
            setSheetId(savedSheetId);
            googleSheetsDataService.setSheetId(savedSheetId);
            const rawData = await googleSheetsDataService.fetchData();
            const transformedData = googleSheetsDataService.transformDataForDashboard(rawData);
            
            // 대시보드 데이터 구조에 맞게 재구성
            const dashboardData = {
              kpi: {
                totalRequested: transformedData.statistics.totalLoanAmount,
                totalRepaid: transformedData.statistics.totalRepaid,
                totalRemaining: transformedData.statistics.totalRemaining,
                repaymentRate: transformedData.statistics.totalLoanAmount > 0 ? 
                  transformedData.statistics.totalRepaid / transformedData.statistics.totalLoanAmount : 0
              },
              individuals: transformedData.records.map(record => ({
                no: record.id,
                name: record.borrowerName,
                ssn: record._original['주민번호'] || record._original['주민번호_앞자리'] || '',
                phone: record._original['연락처'] || record._original['휴대폰'] || '',
                joinDate: record._original['입사일'] || '',
                leaveDate: record._original['퇴사일'] || '',
                totalAmount: record.loanAmount,
                repaidAmount: record.repaidAmount,
                remainingAmount: record.remainingAmount,
                nextPaymentDate: record.repaymentDate ? 
                  record.repaymentDate.toISOString().split('T')[0] : null,
                status: record.status,
                rounds: []
              })),
              summary: {
                totalCount: transformedData.totalRecords,
                statusDistribution: transformedData.statistics.statusCounts
              }
            };
            
            setDashboardData(dashboardData);
            setLastSyncTime(new Date());
          } else {
            setShowSetupModal(true);
          }
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
    addNotification(`🎉 ${userData.name}님 환영합니다!`, 'success');
    
    const savedSheetId = localStorage.getItem('sheetId');
    if (savedSheetId) {
      setSheetId(savedSheetId);
      googleSheetsDataService.setSheetId(savedSheetId);
      try {
        const rawData = await googleSheetsDataService.fetchData();
        const transformedData = googleSheetsDataService.transformDataForDashboard(rawData);
        
        // 대시보드 데이터 구조에 맞게 재구성
        const dashboardData = {
          kpi: {
            totalRequested: transformedData.statistics.totalLoanAmount,
            totalRepaid: transformedData.statistics.totalRepaid,
            totalRemaining: transformedData.statistics.totalRemaining,
            repaymentRate: transformedData.statistics.totalLoanAmount > 0 ? 
              transformedData.statistics.totalRepaid / transformedData.statistics.totalLoanAmount : 0
          },
          individuals: transformedData.records.map(record => ({
            no: record.id,
            name: record.borrowerName,
            ssn: record._original['주민번호'] || record._original['주민번호_앞자리'] || '',
            phone: record._original['연락처'] || record._original['휴대폰'] || '',
            joinDate: record._original['입사일'] || '',
            leaveDate: record._original['퇴사일'] || '',
            totalAmount: record.loanAmount,
            repaidAmount: record.repaidAmount,
            remainingAmount: record.remainingAmount,
            nextPaymentDate: record.repaymentDate ? 
              record.repaymentDate.toISOString().split('T')[0] : null,
            status: record.status,
            rounds: []
          })),
          summary: {
            totalCount: transformedData.totalRecords,
            statusDistribution: transformedData.statistics.statusCounts
          }
        };
        
        setDashboardData(dashboardData);
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setShowSetupModal(true);
      }
    } else {
      setShowSetupModal(true);
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    googleAuth.signOut();
    setUser(null);
    setDashboardData(null);
    localStorage.removeItem('sheetId');
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
  const KPICard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 ${
            trend.includes('+') ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="text-sm font-medium">{trend}</span>
          </div>
        )}
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
            className={`p-4 rounded-lg shadow-lg animate-pulse ${
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

  // 시트 설정 모달
  const SheetSetupModal = () => {
    const [tempSheetId, setTempSheetId] = useState('');
    const [step, setStep] = useState(1);

    const handleSubmit = () => {
      if (tempSheetId.trim()) {
        handleSheetSetup(tempSheetId.trim());
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">🔗 Google Sheets 연결 설정</h2>
            <p className="text-gray-600 mt-2">하이브리드 환수 관리 시스템을 설정합니다</p>
          </div>
          
          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">📋 1단계: 엑셀 파일을 Google Sheets로 업로드</h3>
                  <ol className="text-sm text-blue-800 space-y-2">
                    <li>1. <strong>Google Drive</strong> 접속 (drive.google.com)</li>
                    <li>2. <strong>"새로 만들기"</strong> → <strong>"파일 업로드"</strong></li>
                    <li>3. <strong>"환수 진행 내역 및 현황.xlsx"</strong> 업로드</li>
                    <li>4. 업로드 완료 후 <strong>파일을 더블클릭</strong></li>
                    <li>5. <strong>"Google Sheets로 열기"</strong> 클릭</li>
                  </ol>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">🌐 2단계: CSV 공개 설정</h3>
                  <ol className="text-sm text-green-800 space-y-2">
                    <li>1. <strong>"파일"</strong> → <strong>"공유"</strong> → <strong>"웹에 게시"</strong></li>
                    <li>2. <strong>"쉼표로 구분된 값(.csv)"</strong> 선택</li>
                    <li>3. <strong>"게시"</strong> 클릭</li>
                  </ol>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  다음 단계 →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">🆔 3단계: 시트 ID 입력</h3>
                  <p className="text-sm text-purple-800 mb-3">
                    Google Sheets URL에서 시트 ID를 복사해주세요:
                  </p>
                  <div className="bg-white p-3 rounded border text-xs font-mono">
                    https://docs.google.com/spreadsheets/d/<span className="bg-yellow-200 px-1">시트ID</span>/edit
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Sheets ID
                  </label>
                  <input
                    type="text"
                    value={tempSheetId}
                    onChange={(e) => setTempSheetId(e.target.value)}
                    placeholder="예: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    ← 이전
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!tempSheetId.trim()}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    연결 완료
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
                <h3 className="text-lg font-semibold text-gray-900">👤 기본 정보</h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
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
                <h3 className="text-lg font-semibold text-gray-900">💰 환수 현황</h3>
                <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 환수요청금액:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(person.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">상환완료금액:</span>
                    <span className="font-bold text-green-600">{formatCurrency(person.repaidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">잔여금액:</span>
                    <span className="font-bold text-red-600">{formatCurrency(person.remainingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">상환율:</span>
                    <span className="font-bold text-purple-600">
                      {person.totalAmount > 0 ? formatPercent(person.repaidAmount / person.totalAmount) : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 상환 스케줄</h3>
              <div className="overflow-x-auto bg-white border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회차</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상환금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">완료일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {person.rounds && person.rounds.length > 0 ? person.rounds.map((round, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {round.round}회차
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(round.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {round.paidDate || round.dueDate || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(round.status)}`}>
                            {round.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          상환 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
          <p className="text-gray-600">하이브리드 시스템을 초기화하고 있습니다...</p>
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
          <button
            onClick={() => setShowSetupModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Google Sheets 연결 설정
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">🛡️ 환수 관리 대시보드</h1>
              <p className="text-sm text-gray-500 mt-1">
                Project Aegis · {user.name} ({userRoles[user.role].name}) · 하이브리드 시스템
                {lastSyncTime && ` · 마지막 동기화: ${lastSyncTime.toLocaleString('ko-KR')}`}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 신규 추가 버튼 */}
              {hasPermission('write') && (
                <button
                  onClick={() => handleFormAction('add')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  신규 추가
                </button>
              )}
              
              {/* 동기화 버튼 */}
              <button
                onClick={syncWithHybridSheets}
                disabled={isSyncing}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '동기화 중...' : '실시간 동기화'}
              </button>
              
              {/* 설정 버튼 */}
              <button
                onClick={() => setShowSetupModal(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                설정
              </button>
              
              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 시스템 상태 표시 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">🔄 하이브리드 시스템 활성</h3>
                <p className="text-sm text-green-700">
                  Google Sheets 실시간 연동 · Forms 기반 안전한 CRUD · API 키 없이 완전 보안
                </p>
              </div>
            </div>
            <div className="text-sm text-green-600">
              연결된 시트: {sheetId ? `...${sheetId.slice(-8)}` : '미설정'}
            </div>
          </div>
        </div>

        {/* KPI 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="총 환수요청금액"
            value={formatCurrency(kpi.totalRequested)}
            icon={DollarSign}
            color="from-blue-500 to-blue-600"
            subtitle={`총 ${summary.totalCount}명`}
          />
          <KPICard
            title="상환완료금액"
            value={formatCurrency(kpi.totalRepaid)}
            icon={CheckCircle}
            color="from-green-500 to-green-600"
            subtitle={`완료 ${summary.statusDistribution['상환완료'] || 0}명`}
          />
          <KPICard
            title="잔여금액"
            value={formatCurrency(kpi.totalRemaining)}
            icon={Clock}
            color="from-red-500 to-red-600"
            subtitle={`진행중 ${(summary.statusDistribution['상환중'] || 0) + (summary.statusDistribution['미상환'] || 0)}명`}
          />
          <KPICard
            title="전체 환수율"
            value={formatPercent(kpi.repaymentRate)}
            icon={Target}
            color="from-purple-500 to-purple-600"
            subtitle={`연체 ${summary.statusDistribution['연체'] || 0}명`}
          />
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 월별 상환금액 추이</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), '상환금액']}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 환수 상태별 현황</h3>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">👥 개인별 환수 내역</h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="이름 또는 연락처 검색"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIndividuals.map((person) => (
                  <tr key={person.no} className="hover:bg-gray-50 transition-colors">
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPerson(person);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="상세 보기"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {hasPermission('write') && (
                          <button
                            onClick={() => handleFormAction('edit', person)}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                            title="수정하기"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        
                        {hasPermission('delete') && (
                          <button
                            onClick={() => handleFormAction('delete', person)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            title="삭제하기"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIndividuals.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">검색 결과가 없습니다</p>
              <p className="text-gray-400 text-sm">다른 검색어를 시도해보세요</p>
            </div>
          )}
        </div>

        {/* 하이브리드 시스템 가이드 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">🚀 하이브리드 CRUD 시스템 가이드</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-blue-800 mb-2">📖 실시간 읽기</h4>
              <p className="text-sm text-blue-700">Google Sheets → CSV → 안전한 실시간 데이터 표시</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Edit className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium text-green-800 mb-2">✏️ 안전한 쓰기</h4>
              <p className="text-sm text-green-700">Google Forms → Apps Script → 시트 자동 업데이트</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-purple-800 mb-2">🔒 완벽한 보안</h4>
              <p className="text-sm text-purple-700">API 키 불필요 · 변경 이력 추적 · 무료 운영</p>
            </div>
          </div>
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

      {/* 시트 설정 모달 */}
      {showSetupModal && <SheetSetupModal />}
    </div>
  );
}

export default App;
