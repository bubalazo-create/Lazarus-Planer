import { useState, useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { formatDate } from '../utils/dateUtils';

export function useContinuousCalendar() {
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [loadedMonths, setLoadedMonths] = useState<Date[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return [
      new Date(year, month - 1, 1),
      new Date(year, month, 1),
      new Date(year, month + 1, 1),
    ];
  });
  
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  // Ref for latest state inside event listeners
  const loadedMonthsRef = useRef(loadedMonths);
  loadedMonthsRef.current = loadedMonths;
  const isUpdatingRef = useRef(false);

  const toggleCopyMode = () => setIsCopyMode(prev => !prev);

  const handlePrependMonth = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    const firstLoaded = loadedMonthsRef.current[0];
    const prevMonth = new Date(firstLoaded.getFullYear(), firstLoaded.getMonth() - 1, 1);
    
    const container = document.documentElement;
    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop || document.body.scrollTop;
    
    flushSync(() => {
      setLoadedMonths(prev => [prevMonth, ...prev]);
    });
    
    const newScrollHeight = container.scrollHeight;
    const diff = newScrollHeight - oldScrollHeight;
    window.scrollTo({ top: oldScrollTop + diff, behavior: 'instant' as any });
    
    // Allow next update after short delay to prevent thrashing
    setTimeout(() => { isUpdatingRef.current = false; }, 100);
  }, []);

  const handleAppendMonth = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    const lastLoaded = loadedMonthsRef.current[loadedMonthsRef.current.length - 1];
    const nextMonth = new Date(lastLoaded.getFullYear(), lastLoaded.getMonth() + 1, 1);
    
    setLoadedMonths(prev => [...prev, nextMonth]);
    
    setTimeout(() => { isUpdatingRef.current = false; }, 100);
  }, []);

  const initialScrollStarted = useRef(false);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (initialScrollStarted.current) return;
    initialScrollStarted.current = true;

    let retries = 0;
    const attemptScroll = () => {
      const todayCell = document.querySelector('[data-today="true"][data-current-month="true"]');
      if (todayCell) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const rect = todayCell.getBoundingClientRect();
            const container = document.documentElement;
            const relativeTop = rect.top + (container.scrollTop || document.body.scrollTop);
            
            const originalScrollBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';
            
            window.scrollTo({ top: Math.max(0, relativeTop - 165), behavior: 'auto' });
            
            setTimeout(() => {
              container.style.scrollBehavior = originalScrollBehavior;
              initialScrollDone.current = true;
            }, 100);
          });
        });
      } else if (retries < 10) {
        retries++;
        setTimeout(attemptScroll, 50);
      }
    };

    attemptScroll();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const container = document.documentElement;
      const scrollTop = container.scrollTop || document.body.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      const THRESHOLD = 1000;
      if (initialScrollDone.current) {
        if (scrollTop < THRESHOLD) {
          handlePrependMonth();
        } else if (scrollHeight - (scrollTop + clientHeight) < THRESHOLD) {
          handleAppendMonth();
        }
      }

      const monthSections = document.querySelectorAll('[data-month]');
      let closestMonthStr = '';
      const offsetTop = 200; 
      
      monthSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= offsetTop && rect.bottom >= offsetTop) {
          closestMonthStr = section.getAttribute('data-month') || '';
        }
      });
      
      if (closestMonthStr) {
        const newVisible = new Date(closestMonthStr);
        setVisibleMonth(prev => {
          if (prev.getTime() !== newVisible.getTime()) return newVisible;
          return prev;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handlePrependMonth, handleAppendMonth]);

  const scrollToMonth = (targetMonth: Date, offset = 160) => {
    setTimeout(() => {
      const monthStr = formatDate(targetMonth);
      const section = document.querySelector(`[data-month="${monthStr}"]`);
      if (section) {
        const rect = section.getBoundingClientRect();
        const container = document.documentElement;
        const relativeTop = rect.top + (container.scrollTop || document.body.scrollTop);
        window.scrollTo({ top: Math.max(0, relativeTop - 165), behavior: 'smooth' });
      }
    }, 50);
  };

  const handlePrevMonth = () => {
    const target = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    const isLoaded = loadedMonths.some(m => m.getTime() === target.getTime());
    
    if (!isLoaded) {
      flushSync(() => {
        setLoadedMonths(prev => [target, ...prev]);
      });
    }
    scrollToMonth(target);
  };
  
  const handleNextMonth = () => {
    const target = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    const isLoaded = loadedMonths.some(m => m.getTime() === target.getTime());
    
    if (!isLoaded) {
      flushSync(() => {
        setLoadedMonths(prev => [...prev, target]);
      });
    }
    scrollToMonth(target);
  };

  const handleToday = () => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const isLoaded = loadedMonths.some(m => m.getTime() === targetMonth.getTime());
    
    if (!isLoaded) {
      flushSync(() => {
        setLoadedMonths([
          new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1),
          targetMonth,
          new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1),
        ]);
      });
    }

    setTimeout(() => {
      const todayCell = document.querySelector('[data-today="true"][data-current-month="true"]');
      if (todayCell) {
        const rect = todayCell.getBoundingClientRect();
        const container = document.documentElement;
        const relativeTop = rect.top + (container.scrollTop || document.body.scrollTop);
        window.scrollTo({ top: Math.max(0, relativeTop - 165), behavior: 'smooth' });
      } else {
        scrollToMonth(targetMonth);
      }
    }, 50);
  };

  return {
    loadedMonths,
    visibleMonth,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    isCopyMode,
    toggleCopyMode,
  };
}
