'use client';

import dynamic from 'next/dynamic';

const AddWidgetModal = dynamic(
  () =>
    import('@/components/dashboard/AddWidgetModal').then(
      (m) => m.AddWidgetModal,
    ),
  { ssr: false },
);

/**
 * Mounts the Add Widget modal on /docs so "Open in builder" buttons
 * (and the header's own entry points) work here. Template loading
 * navigates to `/`, whose confirm dialog handles the rest.
 */
export function DocsModals() {
  return <AddWidgetModal />;
}
