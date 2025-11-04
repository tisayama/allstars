/**
 * LoginPage Component
 * Authentication page with Google login
 * Redirects authenticated users to control panel
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import styles from './LoginPage.module.css';

export function LoginPage(): ReactElement {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to control panel
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/control', { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>AllStars Host Control</h1>
          <p className={styles.subtitle}>Wedding Quiz Game Host Interface</p>
        </div>

        <div className={styles.content}>
          <GoogleLoginButton />
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Sign in with your authorized Google account to access the host controls.
          </p>
        </div>
      </div>
    </div>
  );
}
