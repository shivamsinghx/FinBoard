'use client';

import { cancelExportKeys, resolveExportKeys } from '@/lib/dashboardActions';
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
 * Export gate — when widget URLs embed API keys (`token=`/`apikey=`,
 * non-demo), asks whether to strip them before the file downloads.
 */
export function ExportKeyDialog() {
  const count = useDashboardStore((s) => s.exportKeyPrompt);

  return (
    <AlertDialog
      open={count !== null}
      onOpenChange={(open) => {
        if (!open) cancelExportKeys();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export contains API keys</AlertDialogTitle>
          <AlertDialogDescription>
            This export contains API keys in {count ?? 0}{' '}
            {count === 1 ? 'widget' : 'widgets'}. Remove them from the file?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            onClick={() => resolveExportKeys(false)}
          >
            Keep keys
          </AlertDialogAction>
          <AlertDialogAction onClick={() => resolveExportKeys(true)}>
            Remove keys
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
