import { useEffect, useState } from 'react';
import { db } from '@/lib/db';

export function useReceiptUrl(receiptId: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    if (!receiptId) {
      setUrl(null);
      return undefined;
    }
    db.receipts.get(receiptId).then((record) => {
      if (!alive || !record?.blob) return;
      objectUrl = URL.createObjectURL(record.blob);
      setUrl(objectUrl);
    }).catch(() => {});
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receiptId]);

  return url;
}

export default function ReceiptImage({ receiptId, alt = 'Receipt', className }: { receiptId?: string | null; alt?: string; className?: string }) {
  const url = useReceiptUrl(receiptId);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}
