import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

export default function ConfirmHost() {
  const request = useAppStore((s) => s.confirmRequest);
  const close = useAppStore((s) => s.closeConfirm);

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm rounded-[26px] border-border bg-card p-5">
        <DialogHeader>
          <DialogTitle className="pr-6 font-heading text-[17px] leading-snug">{request?.title}</DialogTitle>
          {request?.description ? (
            <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {request.description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1 rounded-xl" onClick={close}>
            {request?.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={request?.destructive ? 'destructive' : 'default'}
            className="flex-1 rounded-xl"
            onClick={() => {
              const action = request?.onConfirm;
              close();
              action?.();
            }}
          >
            {request?.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
