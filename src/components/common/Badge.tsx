import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  status: string;
  variant?: 'default' | 'project' | 'assignment';
  className?: string;
}

export default function Badge({ status, variant = 'default', className = '' }: BadgeProps) {
  // Determine color based on status text (case insensitive)
  const normalizedStatus = status.toLowerCase();
  
  let colorClass = styles.muted;
  if (normalizedStatus.includes('active') || normalizedStatus.includes('progress')) {
    colorClass = styles.accent;
  } else if (normalizedStatus.includes('hold') || normalizedStatus.includes('pending') || normalizedStatus.includes('warning')) {
    colorClass = styles.warning;
  } else if (normalizedStatus.includes('complete') || normalizedStatus.includes('success')) {
    colorClass = styles.success;
  } else if (normalizedStatus.includes('danger') || normalizedStatus.includes('error')) {
    colorClass = styles.danger;
  }

  return (
    <span className={`${styles.badge} ${styles[variant]} ${colorClass} ${className}`}>
      {status}
    </span>
  );
}
