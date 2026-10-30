/** Invented wordmarks — never real brands — styled to feel like a logo wall. */
const WORDMARKS: { name: string; className: string }[] = [
  { name: 'Meridian & Co', className: 'font-display text-xl' },
  { name: 'LATTICE', className: 'text-sm font-semibold uppercase tracking-[0.3em]' },
  { name: 'vellum.', className: 'font-display text-xl italic' },
  { name: 'NorthQuay', className: 'text-lg font-bold tracking-tight' },
  { name: 'ostrova', className: 'text-lg font-light lowercase tracking-wide' },
  { name: 'FATHOM', className: 'font-mono text-sm uppercase tracking-widest' },
  { name: 'Kelp & Co', className: 'font-display text-xl' },
  { name: 'Brimstone', className: 'text-lg font-semibold' },
  { name: 'AURIC', className: 'text-sm font-medium uppercase tracking-[0.35em]' },
  { name: 'pellegrini', className: 'font-display text-xl italic' },
  { name: 'SIGNAL°', className: 'text-lg font-bold tracking-tight' },
  { name: 'Dovetail', className: 'font-display text-xl' },
  { name: 'marmont', className: 'text-lg font-light lowercase' },
  { name: 'QUAY ST', className: 'font-mono text-sm uppercase tracking-widest' },
  { name: 'Inversia', className: 'font-display text-xl italic' },
];

export function LogoWall() {
  return (
    <div
      aria-label="Used by teams at"
      className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-x-6 gap-y-10 px-6 pb-20 sm:grid-cols-3 lg:grid-cols-5"
    >
      {WORDMARKS.map((w) => (
        <span
          key={w.name}
          className={`text-center text-ink/40 transition-opacity hover:opacity-100 ${w.className}`}
        >
          {w.name}
        </span>
      ))}
    </div>
  );
}
