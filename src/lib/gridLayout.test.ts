import { describe, expect, it } from 'vitest';
import { computeGridSpans } from './gridLayout';
import type { WidgetInstance } from '@/types/widget';

const w = (
  id: string,
  type: WidgetInstance['type'],
  width: number,
  h = 4,
): Pick<WidgetInstance, 'id' | 'type' | 'layout'> => ({
  id,
  type,
  layout: { x: 0, y: 0, w: width, h },
});

describe('computeGridSpans', () => {
  it('keeps widget spans when packed into 12 columns', () => {
    const spans = computeGridSpans(
      [w('a', 'card', 3), w('b', 'card', 4), w('c', 'chart', 6)],
      12,
    );
    expect(spans.get('a')).toEqual({ col: 3, row: 4 });
    expect(spans.get('b')).toEqual({ col: 4, row: 4 });
    expect(spans.get('c')).toEqual({ col: 6, row: 4 });
  });
  it('expands a table alone in its row to full width', () => {
    const spans = computeGridSpans(
      [w('a', 'card', 3), w('t', 'table', 8), w('b', 'table', 8)],
      12,
    );
    // 3+8=11 shares row 1; second table wraps to its own row → 12.
    expect(spans.get('t')).toEqual({ col: 8, row: 4 });
    expect(spans.get('b')).toEqual({ col: 12, row: 4 });
  });
  it('does not widen a table that shares its row', () => {
    const spans = computeGridSpans([w('t', 'table', 8), w('a', 'card', 4)], 12);
    expect(spans.get('t')).toEqual({ col: 8, row: 4 });
  });
  it('wraps widgets that do not fit the remaining columns', () => {
    const spans = computeGridSpans(
      [w('a', 'card', 3), w('b', 'card', 3), w('c', 'chart', 6), w('d', 'table', 8)],
      12,
    );
    // row1: a+b =6, chart 6 fits → 12. row2: table alone → 12.
    expect(spans.get('d')).toEqual({ col: 12, row: 4 });
  });
  it('clamps spans wider than the grid', () => {
    const spans = computeGridSpans([w('t', 'table', 8)], 6);
    expect(spans.get('t')).toEqual({ col: 6, row: 4 });
  });
});
