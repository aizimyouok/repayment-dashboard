import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { googleAuth } from '../services/googleAuth';

const GoogleLogin = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await googleAuth.initialize();
        setIsLoading(false);
        
        // 기존 로그인 확인
        const currentUser = googleAuth.getCurrentUser();
        if (currentUser) {
          onLoginSuccess(currentUser);
          return;
        }

        // Google 로그인 버튼 렌더링
        setTimeout(() => {
          googleAuth.renderSignInButton('google-signin-button');
        }, 100);

      } catch (error) {
        setError('로그인 시스템 초기화에 실패했습니다.');
        setIsLoading(false);
      }
    };

    // 로그인 성공 이벤트 리스너
    const handleLoginSuccess = (event) => {
      onLoginSuccess(event.detail);
    };

    // 로그인 실패 이벤트 리스너
    const handleLoginError = (event) => {
      setError(event.detail);
    };

    window.addEventListener('googleLoginSuccess', handleLoginSuccess);
    window.addEventListener('googleLoginError', handleLoginError);

    initializeAuth();

    return () => {
      window.removeEventListener('googleLoginSuccess', handleLoginSuccess);
      window.removeEventListener('googleLoginError', handleLoginError);
    };
  }, [onLoginSuccess]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로그인 시스템을 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">환수 관리 시스템</h2>
          <p className="text-gray-600 mt-2">Project Aegis</p>
          <p className="text-sm text-gray-500 mt-4">
            구글 계정으로 안전하게 로그인하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="text-center">
          <div id="google-signin-button" className="flex justify-center"></div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600 mb-2">✅ 허가된 계정:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• @company.com 도메인</div>
            <div>• 승인된 Gmail 계정</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            다른 계정으로는 접근할 수 없습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleLogin;
