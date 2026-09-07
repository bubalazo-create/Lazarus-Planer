import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './Input.module.css';
import './DateInput.css';

import { enGB } from 'date-fns/locale/en-GB';

registerLocale('en-GB', enGB);

export interface DateInputProps {
  label?: string;
  value: string; // ISO string format YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  openToDate?: Date;
}

export default function DateInput({
  label,
  value,
  onChange,
  required,
  className = '',
  openToDate,
}: DateInputProps) {
  let selectedDate = null;
  if (value) {
    const [y, m, d] = value.split('-');
    selectedDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }

  const initialDate = selectedDate || openToDate || new Date();
  const [navMode, setNavMode] = useState<'days' | 'months' | 'years'>('days');
  const [navYear, setNavYear] = useState<number>(initialDate.getFullYear());

  return (
    <div className={`${styles.container} ${className} lazarus-date-wrapper`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => {
          if (date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            onChange(`${y}-${m}-${d}`);
          } else {
            onChange('');
          }
        }}
        dateFormat="dd/MM/yyyy"
        locale="en-GB"
        calendarStartDay={1}
        fixedHeight
        className={styles.input}
        required={required}
        openToDate={openToDate}
        portalId="root"
        popperPlacement="bottom-start"
        onClickOutside={() => setNavMode('days')}
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => {
          const currentYear = date.getFullYear();
          const currentMonth = date.getMonth();

          return (
            <div className="lazarus-date-header">
              {navMode === 'days' && (
                <>
                  <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="lazarus-date-nav-btn">
                    &lt;
                  </button>
                  <button type="button" onClick={() => { setNavYear(currentYear); setNavMode('years'); }} className="lazarus-date-title">
                    {date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
                  </button>
                  <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="lazarus-date-nav-btn">
                    &gt;
                  </button>
                </>
              )}

              {navMode === 'years' && (
                <div className="lazarus-date-overlay">
                  <div className="lazarus-date-overlay-header">
                    <button type="button" onClick={() => setNavYear(y => y - 12)} className="lazarus-date-nav-btn">&lt;</button>
                    <span className="lazarus-date-title" style={{ cursor: 'default', background: 'transparent' }}>
                      {navYear - 5} - {navYear + 6}
                    </span>
                    <button type="button" onClick={() => setNavYear(y => y + 12)} className="lazarus-date-nav-btn">&gt;</button>
                  </div>
                  <div className="lazarus-date-grid">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const y = navYear - 5 + i;
                      return (
                        <button 
                          key={y} 
                          type="button"
                          className={`lazarus-date-cell ${y === currentYear ? 'active' : ''}`}
                          onClick={() => {
                            changeYear(y);
                            setNavMode('months');
                          }}
                        >
                          {y}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {navMode === 'months' && (
                <div className="lazarus-date-overlay">
                  <div className="lazarus-date-overlay-header">
                    <button type="button" onClick={() => { changeYear(currentYear - 1); }} className="lazarus-date-nav-btn">&lt;</button>
                    <button type="button" onClick={() => { setNavYear(currentYear); setNavMode('years'); }} className="lazarus-date-title">
                      {currentYear}
                    </button>
                    <button type="button" onClick={() => { changeYear(currentYear + 1); }} className="lazarus-date-nav-btn">&gt;</button>
                  </div>
                  <div className="lazarus-date-grid">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const mDate = new Date(currentYear, i, 1);
                      const monthName = mDate.toLocaleString('en-GB', { month: 'short' });
                      return (
                        <button 
                          key={i} 
                          type="button"
                          className={`lazarus-date-cell ${i === currentMonth ? 'active' : ''}`}
                          onClick={() => {
                            changeMonth(i);
                            setNavMode('days');
                          }}
                        >
                          {monthName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
