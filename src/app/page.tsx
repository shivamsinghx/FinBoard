export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-page text-ink">
      <header className="border-b border-subtle bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-6">
          <span className="font-display text-2xl tracking-tight">FinBoard</span>
        </div>
      </header>
      <section className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-xl border border-dashed border-strong bg-surface px-6 py-16 text-center">
          <h1 className="font-display text-3xl">Your dashboard is empty</h1>
          <p className="text-sm text-muted">Widgets you add will appear here.</p>
        </div>
      </section>
    </main>
  );
}
