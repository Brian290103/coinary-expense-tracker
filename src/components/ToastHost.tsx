import { Toaster } from 'sonner';
import { useAppStore } from '@/store/useAppStore';

export default function ToastHost() {
  const theme = useAppStore((s) => s.settings?.theme);
  return (
    <Toaster
      position="top-center"
      theme={theme === 'light' ? 'light' : 'dark'}
      richColors
      closeButton
      toastOptions={{
        style: {
          borderRadius: '16px',
          fontSize: '13px',
        },
      }}
    />
  );
}
