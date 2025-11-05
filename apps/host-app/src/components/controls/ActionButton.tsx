/**
 * ActionButton Component
 * Tablet-optimized button for host actions
 * Minimum touch target: 44x44px (NFR-002)
 */

import { type ReactElement, type ButtonHTMLAttributes } from 'react';
import styles from './ActionButton.module.css';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function ActionButton({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ActionButtonProps): ReactElement {
  const variantClass = styles[variant] || styles.primary;
  const fullWidthClass = fullWidth ? styles.fullWidth : '';
  const loadingClass = isLoading ? styles.loading : '';

  return (
    <button
      type="button"
      className={`${styles.button} ${variantClass} ${fullWidthClass} ${loadingClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className={styles.loadingSpinner}>⏳</span> : null}
      <span className={styles.buttonText}>{children}</span>
    </button>
  );
}
