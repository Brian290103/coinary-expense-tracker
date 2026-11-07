import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string;
}

export default function BottomSheet({ open, onClose, title, subtitle, children, footer, maxHeight = '90vh' }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
            style={{ maxHeight }}
            className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] border-t border-border bg-card pb-6 shadow-2xl md:inset-x-0 md:bottom-auto md:top-[7vh] md:max-w-2xl md:rounded-[28px] md:border md:pb-0 md:shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3 md:px-6 md:pb-3 md:pt-5">
              <div className="min-w-0">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
                <h2 className="text-[16px] font-bold leading-tight md:text-[18px]">{title}</h2>
                {subtitle ? <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X size={17} />
              </button>
            </div>
            <div className={cn('flex-1 overflow-y-auto px-5 pt-2 md:px-6')}>{children}</div>
            {footer ? <div className="border-t border-border/60 px-5 pb-6 pt-4 md:px-6 md:pb-5">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
