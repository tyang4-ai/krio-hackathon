import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle } from 'lucide-react';

// Google Client ID - should be set in environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface LocationState {
  from?: {
    pathname: string;
  };
}

function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsGuest, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [isGuestLoading, setIsGuestLoading] = React.useState(false);

  const from = (location.state as LocationState)?.from?.pathname || '/dashboard';

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('No credential received from Google');
      return;
    }

    try {
      setError(null);
      await login(credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  const handleGuestLogin = async () => {
    try {
      setError(null);
      setIsGuestLoading(true);
      await loginAsGuest();
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Guest login failed:', err);
      setError('Guest login failed. Please try again.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  // Show guest-only login if Google OAuth is not configured
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">StudyForge</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to track your learning progress
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {/* Guest Login - Primary option when OAuth not configured */}
            <button
              onClick={handleGuestLogin}
              disabled={isGuestLoading}
              className="w-full flex items-center justify-center space-x-3 px-6 py-4 border-2 border-indigo-500 rounded-lg text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium text-lg disabled:opacity-50"
            >
              {isGuestLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <UserCircle className="h-6 w-6" />
                  <span>Continue as Guest</span>
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Guest mode lets you test all features. Your data is stored locally.
            </p>

            <div className="text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              Google Sign-In is not configured. To enable it, set VITE_GOOGLE_CLIENT_ID in your environment.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">StudyForge</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to track your learning progress
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {/* Google Sign-In */}
            <div className="flex justify-center">
              {isLoading ? (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  or
                </span>
              </div>
            </div>

            {/* Guest Login - Prominent button */}
            <button
              onClick={handleGuestLogin}
              disabled={isGuestLoading || isLoading}
              className="w-full flex items-center justify-center space-x-3 px-6 py-3 border-2 border-indigo-500 rounded-lg text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium disabled:opacity-50"
            >
              {isGuestLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <UserCircle className="h-5 w-5" />
                  <span>Continue as Guest</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Guest mode lets you test all features without an account.
            </p>

            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginPage;
