import { refetchUrl } from '@/hooks/useWidgetData';
import { urlWithSymbol } from '@/lib/cardDisplay';
import { countKeyedWidgets, stripKeysFromExport } from '@/lib/exportKeys';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/components/ui/toast';

/**
 * Shared dashboard-level actions used by the header, toolbar, hero
 * chips and the command palette — one code path, one set of toasts.
 */

/** Refetch every widget URL; symbol watchlists refetch per-symbol. */
export async function refreshAllWidgets(): Promise<void> {
  const { widgets } = useDashboardStore.getState();
  const urls = new Set<string>();
  for (const w of widgets) {
    urls.add(w.config.endpoint);
    if (
      w.type === 'card' &&
      !w.config.card?.listPath &&
      w.config.card?.symbols?.length
    ) {
      for (const s of w.config.card.symbols) {
        urls.add(urlWithSymbol(w.config.endpoint, s));
      }
    }
  }
  await Promise.allSettled([...urls].map(refetchUrl));
}

/** Serialize the dashboard and download it as JSON. */
export function exportDashboardJson(stripKeys = false): void {
  const raw = useDashboardStore.getState().exportDashboard();
  const json = stripKeys ? stripKeysFromExport(raw) : raw;
  const blob = new Blob([json], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'finboard-dashboard.json';
  a.click();
  URL.revokeObjectURL(href);
  toast.add({ title: 'Dashboard exported', type: 'success' });
}

/**
 * Export entry point — when widget URLs embed API keys, routes through the
 * confirm dialog (`exportKeyPrompt`) instead of downloading immediately.
 */
export function requestExport(): void {
  const n = countKeyedWidgets(useDashboardStore.getState().widgets);
  if (n === 0) exportDashboardJson();
  else useDashboardStore.setState({ exportKeyPrompt: n });
}

/** Dialog answer: download the export with keys stripped or kept. */
export function resolveExportKeys(stripKeys: boolean): void {
  useDashboardStore.setState({ exportKeyPrompt: null });
  exportDashboardJson(stripKeys);
}

/** Dialog dismissed — no download. */
export function cancelExportKeys(): void {
  useDashboardStore.setState({ exportKeyPrompt: null });
}

/** Open a file picker, read a dashboard JSON, and import it. */
export function pickAndImportDashboard(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      const err = useDashboardStore.getState().importDashboard(text);
      if (err) {
        toast.add({
          title: 'Import failed',
          description: err,
          type: 'error',
        });
      } else {
        const n = useDashboardStore.getState().widgets.length;
        toast.add({
          title: `Imported ${n} ${n === 1 ? 'widget' : 'widgets'}`,
          type: 'success',
        });
      }
    });
  };
  input.click();
}
