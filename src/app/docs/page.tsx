import { Header } from '@/components/dashboard/Header';
import { DocsContent } from '@/components/docs/DocsContent';
import { DocsModals } from '@/components/docs/DocsModals';
import { DocsSearch } from '@/components/docs/DocsSearch';
import { DocsToc } from '@/components/docs/DocsToc';

export const metadata = {
  title: 'Docs — FinBoard',
  description:
    'How FinBoard turns any finance API into live cards, tables and charts.',
};

export default function Docs() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-8">
          <div className="max-w-xl">
            <h1 className="font-display text-[32px] leading-none tracking-tight">
              Docs
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              FinBoard turns any finance API into live cards, tables and
              charts, arranged your way. Everything below matches what the app
              actually does — API keys stay on the server.
            </p>
          </div>
          <DocsSearch />
        </div>

        <div className="mt-8 grid gap-x-12 lg:mt-10 lg:grid-cols-[190px_minmax(0,1fr)]">
          <DocsToc />
          <DocsContent />
        </div>
      </main>
      <DocsModals />
    </div>
  );
}
