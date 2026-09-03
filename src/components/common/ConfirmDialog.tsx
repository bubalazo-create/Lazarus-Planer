import React from 'react';
import Modal from './Modal';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'danger';
  tertiaryAction?: () => void;
  tertiaryText?: string;
  tertiaryVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  tertiaryAction,
  tertiaryText,
  tertiaryVariant = 'secondary'
}: ConfirmDialogProps) {
  const Icon = variant === 'danger' ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className={styles.container}>
        <div className={`${styles.iconContainer} ${styles[variant]}`}>
          {Icon}
        </div>
        <div className={styles.message}>
          {message}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {cancelText}
        </Button>
        {tertiaryAction && tertiaryText && (
          <Button variant={tertiaryVariant} onClick={tertiaryAction}>
            {tertiaryText}
          </Button>
        )}
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
