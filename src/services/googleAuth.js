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
            auto_select: false,
            cancel_on_tap_outside: true,
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
      // JWT 토큰 디코딩 (간단한 방법)
      const decoded = JSON.parse(atob(response.credential.split('.')[1]));
      
      // 허가된 이메일 도메인 체크
      const allowedDomains = ['company.com', 'gmail.com']; // 실제 회사 도메인으로 변경
      const allowedEmails = [
        'admin@company.com',
        'manager@company.com',
        'viewer@company.com',
        'your-email@gmail.com' // 실제 이메일로 변경
      ];
      
      const userDomain = decoded.email.split('@')[1];
      
      if (!allowedDomains.includes(userDomain) && !allowedEmails.includes(decoded.email)) {
        throw new Error('허가되지 않은 계정입니다.');
      }

      this.currentUser = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        role: this.determineUserRole(decoded.email)
      };

      // 사용자 정보를 localStorage에 저장
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      
      // 로그인 성공 이벤트 발생
      window.dispatchEvent(new CustomEvent('googleLoginSuccess', { 
        detail: this.currentUser 
      }));

    } catch (error) {
      console.error('Login failed:', error);
      window.dispatchEvent(new CustomEvent('googleLoginError', { 
        detail: error.message 
      }));
    }
  }

  determineUserRole(email) {
    // 이메일 기반 권한 설정
    const adminEmails = ['admin@company.com', 'your-admin@gmail.com'];
    const managerEmails = ['manager@company.com'];
    
    if (adminEmails.includes(email)) return 'admin';
    if (managerEmails.includes(email)) return 'manager';
    return 'viewer';
  }

  renderSignInButton(elementId) {
    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250
      }
    );
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
