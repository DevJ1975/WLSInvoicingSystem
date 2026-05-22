import { useEffect, useState } from 'react';
import { getImageUrl } from '../lib/storage';

// Resolves a Cloud Storage path to a download URL, caching per path.
export function useImageUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    getImageUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}
