import { GOOGLE_CONFIG } from '../config/google.js';

/**
 * 🔒 허용된 사용자 및 권한 관리
 * 여기에 로그인 및 특정 권한을 부여할 Google 계정 이메일을 등록합니다.
 *
 * - admin: 모든 데이터 보기, 생성, 수정, 삭제 가능
 * - manager: 데이터 보기, 생성, 수정 가능
 * - viewer: 데이터 보기만 가능
 */
const anthorizedUsers = {
  // --- 관리자 (Admin) ---
  "aizimyouok46@gmail.com": { role: 'admin' },
  "another-in@gmail.com": { role: 'admin' },

  // --- 팀장 (Manager) ---
  "cfc240528@gmail.com": { role: 'manager' },
  "manager2@gmail.com": { role: 'manager' },

  // --- 조회자 (Viewer) ---
  "viewer@example.com": { role: 'viewer' },
};


export class GoogleAuth {
  constructor() {
    this.clientId = GOOGLE_CONFIG.CLIENT_ID;
    this.isInitialized = false;
    this.currentUser = null;
  }

  async initialize() {
    return new Promise((resolve) => {
      if (this.isInitialized) {
        resolve();
        return;
      }
      const checkGoogle = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: this.handleCredentialResponse.bind(this),
          });
          this.isInitialized = true;
          resolve();
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      checkGoogle();
    });
  }

  handleCredentialResponse(response) {
    try {
      const decoded = JSON.parse(atob(response.credential.split('.')[1]));
      const userEmail = decoded.email;

      // ⚠️ 중요: 허용된 사용자인지 확인
      const authorizedUser = anthorizedUsers[userEmail];
      if (!authorizedUser) {
        // 목록에 없는 이메일이면 에러를 발생시켜 로그인 차단
        throw new Error(`접근 권한이 없습니다. 관리자에게 문의하세요. (${userEmail})`);
      }

      this.currentUser = {
        id: decoded.sub,
        email: userEmail,
        name: decoded.name,
        picture: decoded.picture,
        role: authorizedUser.role, // 등록된 권한 부여
      };

      localStorage.setItem('user', JSON.stringify(this.currentUser));
      window.dispatchEvent(new CustomEvent('googleLoginSuccess', { detail: this.currentUser }));

    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message); // 사용자에게 직접 에러 메시지 표시
      window.dispatchEvent(new CustomEvent('googleLoginError', { detail: error.message }));
    }
  }

  renderSignInButton(elementId) {
    if (document.getElementById(elementId)) {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular' }
      );
    }
  }

  signOut() {
    window.google.accounts.id.disableAutoSelect();
    localStorage.removeItem('user');
    this.currentUser = null;
    window.location.reload();
  }

  getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    const saved = localStorage.getItem('user');
    if (saved) {
      this.currentUser = JSON.parse(saved);
      return this.currentUser;
    }
    return null;
  }
}

export const googleAuth = new GoogleAuth();
