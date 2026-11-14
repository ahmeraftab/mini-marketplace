export default function Loading() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-64 rounded-card" />
      <div className="skeleton mt-4 h-5 w-96 max-w-full rounded-card" />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton aspect-[4/3] rounded-card" />
            <div className="skeleton h-4 w-3/4 rounded-card" />
            <div className="skeleton h-4 w-1/3 rounded-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
