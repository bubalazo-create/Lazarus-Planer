import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}

export default function Input({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
  required,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required={required}
          {...(props as any)}
        />
      ) : (
        <input
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          {...(props as any)}
        />
      )}
    </div>
  );
}
