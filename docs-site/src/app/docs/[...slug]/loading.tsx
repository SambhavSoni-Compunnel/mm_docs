export default function DocLoadingSkeleton() {
  return (
    <div className="flex gap-8 max-w-full animate-pulse">
      <div className="flex-1 min-w-0 py-8 px-4 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <div className="skeleton h-4 w-8" />
          <div className="skeleton h-4 w-4 rounded-full" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-4 rounded-full" />
          <div className="skeleton h-4 w-32" />
        </div>

        {/* Title */}
        <div className="skeleton h-9 w-3/4 mb-4" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-5/6 mb-8" />

        {/* Content blocks */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-6">
            <div className="skeleton h-6 w-1/2 mb-3" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        ))}
      </div>

      {/* TOC */}
      <div className="hidden xl:block w-64 shrink-0 py-8 pr-4">
        <div className="skeleton h-4 w-24 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-3.5 w-full mb-2" />
        ))}
      </div>
    </div>
  );
}
