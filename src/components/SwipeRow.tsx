import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

interface SwipeRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SwipeRow({ children, onEdit, onDelete }: SwipeRowProps) {
  const x = useMotionValue(0);
  const draggedRef = useRef(false);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit transaction"
          className="flex h-[calc(100%-8px)] w-14 flex-col items-center justify-center gap-1 rounded-xl bg-secondary text-muted-foreground"
        >
          <Pencil size={15} />
          <span className="text-[9.5px] font-medium">Edit</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete transaction"
          className="flex h-[calc(100%-8px)] w-14 flex-col items-center justify-center gap-1 rounded-xl bg-expense/15 text-expense"
        >
          <Trash2 size={15} />
          <span className="text-[9.5px] font-medium">Delete</span>
        </button>
      </div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -132, right: 0 }}
        dragElastic={0.06}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={() => {
          setTimeout(() => {
            draggedRef.current = false;
          }, 60);
        }}
        onClickCapture={(e) => {
          if (draggedRef.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
