import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Fab() {
  const openTxSheet = useAppStore((s) => s.openTxSheet);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="mx-auto flex w-full max-w-lg justify-end px-5">
        <motion.button
          type="button"
          onClick={() => openTxSheet(null)}
          aria-label="Add transaction"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.1 }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ y: -2 }}
          className="pointer-events-auto mb-[78px] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus size={26} strokeWidth={2.4} />
        </motion.button>
      </div>
    </div>
  );
}
