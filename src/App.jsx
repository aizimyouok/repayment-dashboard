// ================================================================================
//  4. src/App.jsx - 모든 기능이 통합된 핵심 파일입니다. /src 폴더 안에 위치시킵니다.
// ================================================================================
import React, { useState, useEffect, useCallback } from 'react';

// --- 설정: 이 부분을 필요에 맞게 수정하세요. ---

// ⚠️ 1단계에서 배포하고 복사한 Apps Script 웹 앱 URL을 여기에 붙여넣으세요.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0P-2aKR4yFpStW3ackwJCFhDf4kT2dlxgJwUIB4cvNc1lK0IKHNdoNbM0-ZWQYaUk/exec";

// 🔒 여기에 로그인 및 권한을 부여할 Google 계정 이메일을 등록합니다.
const anthorizedUsers = {
  "aizimyouok46@gmail.com": { role: 'admin' },
  "viewer@example.com": { role: 'viewer' },
  // 필요에 따라 계정을 추가하세요. 예: "my-email@gmail.com": { role: 'admin' }
};

// 👤 사용자 역할별 권한 정의
const userRoles = {
  admin: { name: '관리자', canEdit: true, canDelete: true },
  viewer: { name: '조회자', canEdit: false, canDelete: false },
};

// --- 애플리케이션 시작 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // --- 데이터 관리 로직 ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setData(result.data);
    } catch (err) {
      setError(`데이터 로딩 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSave = useCallback(async (rowData) => {
    const action = rowData.ID ? 'UPDATE' : 'CREATE';
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({ action, data: rowData }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      alert(result.message);
      fetchData(); // 데이터 새로고침
    } catch (err) {
      alert(`저장 실패: ${err.message}`);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm(`정말로 ID [${id}] 데이터를 삭제하시겠습니까?`)) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          redirect: 'follow',
          body: JSON.stringify({ action: 'DELETE', id }),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        alert(result.message);
        fetchData(); // 데이터 새로고침
      } catch (err) {
        alert(`삭제 실패: ${err.message}`);
      }
    }
  }, [fetchData]);


  // --- 로그인 로직 ---
  useEffect(() => {
    const handleCredentialResponse = (response) => {
      try {
        const decoded = JSON.parse(atob(response.credential.split('.')[1]));
        const userEmail = decoded.email;
        const authorizedUser = anthorizedUsers[userEmail];
        if (!authorizedUser) {
          throw new Error(`접근 권한이 없습니다: ${userEmail}`);
        }
        setUser({ email: userEmail, name: decoded.name, role: authorizedUser.role });
      } catch (err) {
        alert(err.message);
      }
    };

    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "276452544438-pe1jq8quope9naakkkqbtf5gb81a8jqh.apps.googleusercontent.com", // 클라이언트 ID
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large' }
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);


  // --- UI 렌더링 ---
  if (isLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">환수 관리 대시보드 로그인</h1>
        <div id="google-signin-button"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">환수 관리 대시보드</h1>
        <div>{user.name} ({userRoles[user.role].name})</div>
      </header>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <DataTable
        data={data}
        onSave={handleSave}
        onDelete={handleDelete}
        canEdit={userRoles[user.role].canEdit}
        canDelete={userRoles[user.role].canDelete}
      />
    </div>
  );
}


// --- 하위 컴포넌트: 데이터 테이블 ---
function DataTable({ data, onSave, onDelete, canEdit, canDelete }) {
  const [editingRow, setEditingRow] = useState(null);

  const handleSaveClick = (rowData) => {
    onSave(rowData);
    setEditingRow(null);
  };

  if (!data || data.length === 0) {
    return <p>표시할 데이터가 없습니다.</p>;
  }

  const headers = Object.keys(data[0] || {});

  return (
    <div className="overflow-x-auto">
      {canEdit && <button onClick={() => setEditingRow({})} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">신규 추가</button>}
      
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {headers.map(header => <th key={header} className="py-2 px-4 border-b text-left">{header}</th>)}
            {(canEdit || canDelete) && <th className="py-2 px-4 border-b text-left">작업</th>}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.ID} className="hover:bg-gray-50">
              {headers.map(header => <td key={header} className="py-2 px-4 border-b">{row[header]}</td>)}
              {(canEdit || canDelete) && (
                <td className="py-2 px-4 border-b">
                  {canEdit && <button onClick={() => setEditingRow(row)} className="text-green-600 mr-2">수정</button>}
                  {canDelete && <button onClick={() => onDelete(row.ID)} className="text-red-600">삭제</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editingRow && (
        <EditModal
          rowData={editingRow}
          headers={headers}
          onSave={handleSaveClick}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}


// --- 하위 컴포넌트: 수정/추가 모달 ---
function EditModal({ rowData, headers, onSave, onClose }) {
  const [currentData, setCurrentData] = useState(rowData);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">{rowData.ID ? '데이터 수정' : '신규 추가'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {headers.filter(h => h !== 'ID').map(header => (
            <div key={header}>
              <label className="block text-sm font-medium">{header}</label>
              <input
                type="text"
                name={header}
                value={currentData[header] || ''}
                onChange={handleChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">취소</button>
          <button onClick={() => onSave(currentData)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  );
}
