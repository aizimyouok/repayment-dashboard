import React, { useState, useEffect, useCallback } from 'react';

// --- 설정: 이 부분을 필요에 맞게 수정하세요. ---
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0P-2aKR4yFpStW3ackwJCFhDf4kT2dlxgJwUIB4cvNc1lK0IKHNdoNbM0-ZWQYaUk/exec";

const anthorizedUsers = {
  "aizimyouok46@gmail.com": { role: 'admin' },
  // 여기에 허용할 구글 이메일 계정을 추가하세요.
};

const userRoles = {
  admin: { name: '관리자', canEdit: true, canDelete: true },
  viewer: { name: '조회자', canEdit: false, canDelete: false },
};

// --- 애플리케이션 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

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
      const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action, data: rowData }) });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      alert(result.message);
      setIsModalOpen(false);
      setEditingRow(null);
      fetchData();
    } catch (err) {
      alert(`저장 실패: ${err.message}`);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm(`정말로 ID [${id}] 데이터를 삭제하시겠습니까?`)) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'DELETE', id }) });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        alert(result.message);
        fetchData();
      } catch (err) {
        alert(`삭제 실패: ${err.message}`);
      }
    }
  }, [fetchData]);

  const handleLogin = useCallback((response) => {
    try {
      const decoded = JSON.parse(atob(response.credential.split('.')[1]));
      const userEmail = decoded.email;
      const authorizedUser = anthorizedUsers[userEmail];
      if (!authorizedUser) throw new Error(`접근 권한이 없습니다: ${userEmail}`);
      setUser({ email: userEmail, name: decoded.name, role: authorizedUser.role });
    } catch (err) {
      alert(err.message);
    }
  }, []);

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "276452544438-pe1jq8quope9naakkkqbtf5gb81a8jqh.apps.googleusercontent.com",
        callback: handleLogin,
      });
      setIsLoading(false);
    }
  }, [handleLogin]);

  useEffect(() => {
    if (!isLoading && !user && window.google) {
      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, { theme: 'outline', size: 'large' });
      }
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const openModal = (row = null) => {
    setEditingRow(row);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
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
    <div className="p-4 sm:p-6">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">환수 관리 대시보드</h1>
        <div>{user.name} ({userRoles[user.role].name})</div>
      </header>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      <DataTable data={data} onEdit={openModal} onDelete={handleDelete} onAdd={() => openModal(null)} canEdit={userRoles[user.role].canEdit} canDelete={userRoles[user.role].canDelete} />
      {isModalOpen && <EditModal rowData={editingRow} headers={Object.keys(data[0] || {})} onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingRow(null); }} />}
    </div>
  );
}

function DataTable({ data, onEdit, onDelete, onAdd, canEdit, canDelete }) {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  if (headers.length === 0) return <button onClick={onAdd} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">신규 추가</button>;
  
  return (
    <div className="overflow-x-auto">
      {canEdit && <button onClick={onAdd} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">신규 추가</button>}
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">{headers.map(h => <th key={h} className="p-2 border-b text-left">{h}</th>)}
          {(canEdit || canDelete) && <th className="p-2 border-b text-left">작업</th>}</tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.ID} className="hover:bg-gray-50">
              {headers.map(h => <td key={h} className="p-2 border-b">{String(row[h])}</td>)}
              {(canEdit || canDelete) && (
                <td className="p-2 border-b">
                  {canEdit && <button onClick={() => onEdit(row)} className="text-green-600 mr-2">수정</button>}
                  {canDelete && <button onClick={() => onDelete(row.ID)} className="text-red-600">삭제</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditModal({ rowData, headers, onSave, onClose }) {
  const [currentData, setCurrentData] = useState(rowData || {});
  const handleChange = (e) => setCurrentData(p => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">{rowData ? '데이터 수정' : '신규 추가'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {headers.filter(h => h !== 'ID').map(header => (
            <div key={header}><label className="block text-sm font-medium">{header}</label>
            <input type="text" name={header} value={currentData[header] || ''} onChange={handleChange} className="mt-1 p-2 border rounded w-full"/></div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">취소</button>
          <button onClick={() => onSave(currentData)} className="px-4 py-2 bg-blue-600 text-white rounded">저장</button>
        </div>
      </div>
    </div>
  );
}
