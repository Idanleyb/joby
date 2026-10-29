/**
 * Shown at once while the next page loads on the server, so a click never looks stuck.
 * Links do not prefetch (prefetch={false}): prefetching every menu and card link made each
 * page load trigger ~25 extra server renders, which slowed real clicks (2026-10-29).
 */
export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <span className="sr-only">טוען…</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-border" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/70" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/50" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/30" />
    </main>
  );
}
