import { useEffect, useRef } from 'react';

// Re-runs `reset` when a modal opens or its target key changes, so edit forms
// load the right record and re-open clean.
export function useResetForm(key: string, open: boolean, reset: () => void) {
  const last = useRef<string>('');
  useEffect(() => {
    if (open && last.current !== key) {
      last.current = key;
      reset();
    }
    if (!open) last.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);
}
