import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('coffee_google_token');
let cachedUser: any = null;

try {
  const savedUser = localStorage.getItem('coffee_google_user');
  if (savedUser) cachedUser = JSON.parse(savedUser);
} catch (e) {
  cachedUser = null;
}

declare global {
  interface Window {
    google?: any;
  }
}

const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.getElementById('gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

export const initGoogleAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedAccessToken && cachedUser && onAuthSuccess) {
    onAuthSuccess(cachedUser, cachedAccessToken);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken && onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else if (!cachedAccessToken) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: any; accessToken: string } | null> => {
  isSigningIn = true;

  // 1. Primary Method: Google Identity Services (GIS) Token Client
  try {
    await loadGsiScript();
    if (window.google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
      const token = await new Promise<string>((resolve, reject) => {
        let isSettled = false;
        
        // Safety timeout of 60 seconds
        const timeout = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            reject(new Error('A autenticação do Google expirou por inatividade.'));
          }
        }, 60000);

        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: firebaseConfig.oAuthClientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (response: any) => {
              clearTimeout(timeout);
              if (isSettled) return;
              isSettled = true;
              if (response.error) {
                reject(new Error(response.error_description || response.error));
              } else if (response.access_token) {
                resolve(response.access_token);
              } else {
                reject(new Error('Nenhum token retornado pelo Google.'));
              }
            },
            error_callback: (err: any) => {
              clearTimeout(timeout);
              if (isSettled) return;
              isSettled = true;
              reject(new Error(err?.message || 'Erro na autenticação do Google.'));
            }
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch (initErr) {
          clearTimeout(timeout);
          if (!isSettled) {
            isSettled = true;
            reject(initErr);
          }
        }
      });

      // Retrieve Google user info using the token
      let userInfo = { displayName: 'Usuário do Google', email: '' };
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          userInfo = {
            displayName: profile.name || profile.given_name || profile.email || 'Usuário do Google',
            email: profile.email || ''
          };
        }
      } catch (e) {
        console.warn('Could not fetch Google profile details:', e);
      }

      cachedAccessToken = token;
      cachedUser = userInfo;
      localStorage.setItem('coffee_google_token', token);
      localStorage.setItem('coffee_google_user', JSON.stringify(userInfo));
      isSigningIn = false;
      return { user: userInfo, accessToken: token };
    }
  } catch (gsiError: any) {
    console.warn('GIS Token client failed, trying Firebase fallback:', gsiError);
  }

  // 2. Secondary Method: Firebase signInWithPopup
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso da conta Google.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    localStorage.setItem('coffee_google_token', cachedAccessToken);
    localStorage.setItem('coffee_google_user', JSON.stringify({
      displayName: result.user.displayName,
      email: result.user.email
    }));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação do Google:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela do Google foi fechada. Por favor, verifique se seu navegador não bloqueou o pop-up.');
    }
    if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain') || error.message?.includes('origin_mismatch')) {
      throw new Error('Não foi possível autenticar o pop-up no ambiente atual. Lembre-se: para carregar/ler sua planilha, não é necessário login se ela estiver como "Qualquer pessoa com o link"!');
    }
    throw new Error(error.message || 'Erro ao autenticar com o Google.');
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore signOut errors
  }
  cachedAccessToken = null;
  cachedUser = null;
  localStorage.removeItem('coffee_google_token');
  localStorage.removeItem('coffee_google_user');
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem('coffee_google_token');
};

