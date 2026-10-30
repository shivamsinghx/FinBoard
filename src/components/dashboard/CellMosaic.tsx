/* ------------------------------------------------------------------ */
/* Spreadsheet-cell mosaic — gradient cells on an invisible grid        */
/* ------------------------------------------------------------------ */

const CELL_W = 170;
const CELL_H = 32;

const CELL_COLORS = {
  mint: '#8FD3B6',
  lavender: '#CDB4E6',
  coral: '#F7A391',
  aqua: '#8EE3EA',
  butter: '#F8E38A',
} as const;

type CellColor = keyof typeof CELL_COLORS;

interface Cell {
  c: CellColor;
  /** gradient direction: 'r' fades left→right, 'l' fades right→left */
  d: 'r' | 'l';
  /** gradient intensity 0–1 */
  a: number;
}

/** A vertical run of stacked cells on the shared grid. */
interface Stack {
  /** grid column (0-based from the side's edge; negative bleeds off) */
  col: number;
  /** starting grid row */
  row: number;
  cells: Cell[];
}

const LEFT_STACKS: Stack[] = [
  {
    col: 0,
    row: 0,
    cells: [
      { c: 'mint', d: 'r', a: 0.95 },
      { c: 'mint', d: 'l', a: 0.55 },
      { c: 'lavender', d: 'r', a: 0.7 },
      { c: 'butter', d: 'l', a: 0.45 },
    ],
  },
  {
    col: -1,
    row: 2,
    cells: [
      { c: 'lavender', d: 'r', a: 0.5 },
      { c: 'coral', d: 'l', a: 0.35 },
      { c: 'mint', d: 'r', a: 0.6 },
    ],
  },
  {
    col: 1,
    row: 4,
    cells: [
      { c: 'aqua', d: 'r', a: 0.6 },
      { c: 'coral', d: 'l', a: 0.75 },
      { c: 'mint', d: 'r', a: 0.9 },
      { c: 'lavender', d: 'l', a: 0.5 },
      { c: 'mint', d: 'r', a: 0.4 },
    ],
  },
  {
    col: 2,
    row: 8,
    cells: [
      { c: 'coral', d: 'r', a: 0.7 },
      { c: 'mint', d: 'l', a: 0.85 },
      { c: 'aqua', d: 'r', a: 0.5 },
      { c: 'lavender', d: 'l', a: 0.65 },
      { c: 'butter', d: 'r', a: 0.4 },
      { c: 'mint', d: 'l', a: 0.55 },
    ],
  },
  {
    col: 0,
    row: 12,
    cells: [
      { c: 'aqua', d: 'r', a: 0.5 },
      { c: 'mint', d: 'l', a: 0.8 },
      { c: 'butter', d: 'r', a: 0.6 },
      { c: 'lavender', d: 'l', a: 0.4 },
    ],
  },
  {
    col: -1,
    row: 14,
    cells: [
      { c: 'coral', d: 'r', a: 0.4 },
      { c: 'aqua', d: 'l', a: 0.55 },
    ],
  },
  {
    col: 1,
    row: 16,
    cells: [
      { c: 'lavender', d: 'r', a: 0.7 },
      { c: 'mint', d: 'l', a: 0.9 },
      { c: 'coral', d: 'r', a: 0.45 },
      { c: 'aqua', d: 'l', a: 0.6 },
    ],
  },
  {
    col: 2,
    row: 19,
    cells: [
      { c: 'mint', d: 'r', a: 0.75 },
      { c: 'lavender', d: 'l', a: 0.5 },
      { c: 'butter', d: 'r', a: 0.65 },
    ],
  },
];

const RIGHT_STACKS: Stack[] = [
  {
    col: 0,
    row: 1,
    cells: [
      { c: 'mint', d: 'l', a: 0.9 },
      { c: 'lavender', d: 'r', a: 0.55 },
      { c: 'butter', d: 'l', a: 0.7 },
      { c: 'mint', d: 'r', a: 0.4 },
    ],
  },
  {
    col: 2,
    row: 3,
    cells: [
      { c: 'lavender', d: 'l', a: 0.65 },
      { c: 'mint', d: 'r', a: 0.85 },
      { c: 'coral', d: 'l', a: 0.5 },
    ],
  },
  {
    col: 1,
    row: 5,
    cells: [
      { c: 'coral', d: 'l', a: 0.8 },
      { c: 'aqua', d: 'r', a: 0.5 },
      { c: 'lavender', d: 'l', a: 0.75 },
      { c: 'mint', d: 'r', a: 0.6 },
      { c: 'butter', d: 'l', a: 0.45 },
    ],
  },
  {
    col: -1,
    row: 9,
    cells: [
      { c: 'butter', d: 'l', a: 0.5 },
      { c: 'mint', d: 'r', a: 0.7 },
      { c: 'aqua', d: 'l', a: 0.4 },
    ],
  },
  {
    col: 0,
    row: 11,
    cells: [
      { c: 'aqua', d: 'l', a: 0.7 },
      { c: 'coral', d: 'r', a: 0.55 },
      { c: 'mint', d: 'l', a: 0.85 },
      { c: 'lavender', d: 'r', a: 0.45 },
    ],
  },
  {
    col: 1,
    row: 15,
    cells: [
      { c: 'mint', d: 'l', a: 0.8 },
      { c: 'butter', d: 'r', a: 0.6 },
      { c: 'aqua', d: 'l', a: 0.5 },
      { c: 'lavender', d: 'r', a: 0.7 },
    ],
  },
  {
    col: 2,
    row: 18,
    cells: [
      { c: 'coral', d: 'l', a: 0.6 },
      { c: 'mint', d: 'r', a: 0.75 },
      { c: 'butter', d: 'l', a: 0.5 },
    ],
  },
];

function toAlpha(color: string, a: number): string {
  return color + Math.round(a * 255).toString(16).padStart(2, '0');
}

/* ------------------------------------------------------------------ */
/* Dark theme: solid dark-teal bars with hairline borders, staggered   */
/* ------------------------------------------------------------------ */

const DARK_BAR_FILL = 'rgba(18, 68, 71, 0.55)';
const DARK_BAR_BORDER = 'rgba(148, 200, 192, 0.28)';
const DARK_BAR_H = 52;

interface DarkStack {
  /** px from the side's edge */
  x: number;
  /** px from hero top */
  y: number;
  /** each bar: width + horizontal offset (the staircase step) */
  bars: { w: number; x: number }[];
}

const LEFT_DARK_STACKS: DarkStack[] = [
  {
    x: 24,
    y: 70,
    bars: [
      { w: 390, x: 0 },
      { w: 390, x: 74 },
      { w: 390, x: -8 },
      { w: 390, x: 68 },
    ],
  },
  {
    x: 56,
    y: 330,
    bars: [
      { w: 340, x: 0 },
      { w: 340, x: 66 },
      { w: 340, x: -6 },
      { w: 340, x: 60 },
      { w: 340, x: 0 },
    ],
  },
];

const RIGHT_DARK_STACKS: DarkStack[] = [
  {
    x: 24,
    y: 90,
    bars: [
      { w: 390, x: 0 },
      { w: 390, x: -74 },
      { w: 390, x: 8 },
      { w: 390, x: -68 },
    ],
  },
  {
    x: 56,
    y: 350,
    bars: [
      { w: 340, x: 0 },
      { w: 340, x: -66 },
      { w: 340, x: 6 },
      { w: 340, x: -60 },
      { w: 340, x: 0 },
    ],
  },
];

export function CellMosaic({ side }: { side: 'left' | 'right' }) {
  const left = side === 'left';
  const stacks = left ? LEFT_STACKS : RIGHT_STACKS;
  const darkStacks = left ? LEFT_DARK_STACKS : RIGHT_DARK_STACKS;
  const edge = left ? 'left' : 'right';

  return (
    <>
      {/* light theme: pastel gradient cells */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 h-[85%] w-[33%] overflow-hidden dark:hidden ${
          left ? 'left-0' : 'right-0'
        }`}
      >
        {stacks.map((stack, si) =>
          stack.cells.map((cell, ci) => (
            <span
              key={`${si}-${ci}`}
              className="absolute block"
              style={{
                [edge]: stack.col * CELL_W,
                top: (stack.row + ci) * CELL_H,
                width: CELL_W,
                height: CELL_H,
                background: `linear-gradient(to ${cell.d === 'r' ? 'right' : 'left'}, ${toAlpha(
                  CELL_COLORS[cell.c],
                  cell.a,
                )}, transparent)`,
              }}
            />
          )),
        )}
      </div>

      {/* dark theme: staggered dark-teal bars */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 hidden h-[85%] w-[33%] overflow-hidden dark:block ${
          left ? 'left-0' : 'right-0'
        }`}
      >
        {darkStacks.map((stack, si) =>
          stack.bars.map((bar, bi) => (
            <span
              key={`${si}-${bi}`}
              className="absolute block rounded-2xl border"
              style={{
                [edge]: stack.x + bar.x,
                top: stack.y + bi * (DARK_BAR_H + 10),
                width: bar.w,
                height: DARK_BAR_H,
                backgroundColor: DARK_BAR_FILL,
                borderColor: DARK_BAR_BORDER,
              }}
            />
          )),
        )}
      </div>
    </>
  );
}
