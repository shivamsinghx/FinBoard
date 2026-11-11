'use client';

import { useDashboardStore } from '@/store/dashboardStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * "Replace your current dashboard?" gate — any template request while
 * widgets exist lands here via `pendingTemplate` in the store.
 */
export function TemplateConfirmDialog() {
  const pending = useDashboardStore((s) => s.pendingTemplate);
  const confirm = useDashboardStore((s) => s.confirmTemplate);
  const cancel = useDashboardStore((s) => s.cancelTemplate);

  return (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace your current dashboard?</AlertDialogTitle>
          <AlertDialogDescription>
            Loading the {pending?.name ?? 'template'} template will replace{' '}
            your existing widgets. You can export them first to keep a copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>
            Load template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
