import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  fullWidth,
  loading,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          {children && <span>{children}</span>}
        </>
      )}
    </button>
  );
}
