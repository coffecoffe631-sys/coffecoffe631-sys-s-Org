import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');

export const initGoogleAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken = cachedAccessToken || localStorage.getItem('google_access_token');
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      const storedToken = cachedAccessToken || localStorage.getItem('google_access_token');
      const storedProfile = localStorage.getItem('google_user_profile');
      if (storedToken && storedProfile) {
        try {
          const parsedUser = JSON.parse(storedProfile);
          if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken);
          return;
        } catch (e) {
          console.warn('Could not parse stored profile', e);
        }
      }
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user_profile');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGsi = (): Promise<{ user: any; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const clientId = (firebaseConfig as any).oAuthClientId;
    
    if (!clientId) {
      reject(new Error('OAuth Client ID não configurado no projeto.'));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('SDK do Google ainda carregando. Por favor, tente novamente em alguns segundos.'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        const token = response.access_token;
        cachedAccessToken = token;
        localStorage.setItem('google_access_token', token);

        let user: any = { email: 'coffecoffe631@gmail.com', displayName: 'Usuário Conectado' };
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            user = {
              email: userData.email || 'coffecoffe631@gmail.com',
              displayName: userData.name || userData.email || 'Usuário Conectado',
              photoURL: userData.picture
            };
          }
        } catch (e) {
          console.warn('Erro ao carregar dados do usuário:', e);
        }

        localStorage.setItem('google_user_profile', JSON.stringify(user));
        resolve({ user, accessToken: token });
      },
      onerror: (err: any) => {
        reject(err);
      }
    });

    client.requestAccessToken();
  });
};

export const signInWithGoogle = async (): Promise<{ user: any; accessToken: string } | null> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso da conta Google.');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_access_token', credential.accessToken);
    const userObj = {
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL
    };
    localStorage.setItem('google_user_profile', JSON.stringify(userObj));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.warn('Firebase signInWithPopup falhou, tentando login direto via Google Identity:', error);
    try {
      const gsiResult = await signInWithGsi();
      return gsiResult;
    } catch (gsiError: any) {
      console.error('Erro na autenticação do Google:', gsiError);
      throw new Error(gsiError.message || 'Erro ao autenticar com a conta Google.');
    }
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore firebase signout error
  }
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user_profile');
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem('google_access_token');
};
