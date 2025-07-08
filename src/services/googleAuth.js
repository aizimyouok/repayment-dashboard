import { GOOGLE_CONFIG } from '../config/google.js';

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

      // ⚠️ 중요: 이 부분은 모든 구글 사용자가 로그인할 수 있도록 허용합니다.
      // 특정 사용자만 허용하려면 아래 주석처리된 코드를 활용하세요.
      /*
      const allowedDomains = ['yourcompany.com'];
      const allowedEmails = ['admin@gmail.com'];
      const userDomain = decoded.email.split('@')[1];
      if (!allowedDomains.includes(userDomain) && !allowedEmails.includes(decoded.email)) {
        throw new Error('허가되지 않은 계정입니다.');
      }
      */
      
      this.currentUser = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        // 모든 사용자는 기본적으로 'viewer' 권한을 가집니다.
        // 특정 이메일에 따라 권한을 다르게 하려면 determineUserRole 함수를 수정하세요.
        role: this.determineUserRole(decoded.email)
      };

      localStorage.setItem('user', JSON.stringify(this.currentUser));
      window.dispatchEvent(new CustomEvent('googleLoginSuccess', { detail: this.currentUser }));

    } catch (error) {
      console.error('Login failed:', error);
      window.dispatchEvent(new CustomEvent('googleLoginError', { detail: error.message }));
    }
  }

  /**
   * 이메일 주소에 따라 사용자 역할을 결정합니다.
   * 필요에 따라 이 부분을 수정하여 권한을 관리하세요.
   */
  determineUserRole(email) {
    // 예시: 특정 이메일은 'admin' 권한 부여
    if (email === 'your-admin-email@example.com') {
      return 'admin';
    }
    // 기본 권한은 'viewer'
    return 'viewer';
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
