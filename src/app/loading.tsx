export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">読み込み中…</span>
      <div className="skeleton h-7 w-40" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-16 w-full" />
      ))}
    </div>
  );
}
