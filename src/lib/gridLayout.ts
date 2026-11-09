/**
 * Span computation for the dashboard's CSS grid — mirrors the greedy
 * auto-placement the browser would do (an item that doesn't fit wraps
 * to the next row) so we can spot the special case that needs a
 * different span: a table alone in its row expands to full width.
 */

import type { WidgetInstance } from '@/types/widget';

export interface GridSpan {
  /** Columns occupied (of the grid's `cols` tracks). */
  col: number;
  /** Rows occupied — the widget's fixed height in grid units. */
  row: number;
}

/**
 * Map each widget id to its effective span. Widgets pack
 * left-to-right in store order; when a table is the only item in a
 * row it widens to all `cols` columns.
 */
export function computeGridSpans(
  widgets: readonly Pick<WidgetInstance, 'id' | 'type' | 'layout'>[],
  cols: number,
): Map<string, GridSpan> {
  const spans = new Map<string, GridSpan>();
  let row: { id: string; type: WidgetInstance['type']; col: number; h: number }[] =
    [];
  let used = 0;

  const flush = () => {
    const loneTable = row.length === 1 && row[0].type === 'table';
    for (const w of row) {
      spans.set(w.id, { col: loneTable ? cols : w.col, row: w.h });
    }
    row = [];
    used = 0;
  };

  for (const w of widgets) {
    const col = Math.max(1, Math.min(cols, Math.round(w.layout.w)));
    if (used + col > cols && row.length) flush();
    row.push({ id: w.id, type: w.type, col, h: w.layout.h });
    used += col;
  }
  flush();
  return spans;
}
