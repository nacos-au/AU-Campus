export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-sm bg-rule" />
      <div className="space-y-3">
        <div className="h-4 w-full max-w-xl rounded-sm bg-rule" />
        <div className="h-4 w-full max-w-lg rounded-sm bg-rule" />
        <div className="h-4 w-2/3 max-w-md rounded-sm bg-rule" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-20 rounded-sm bg-rule" />
        <div className="h-20 rounded-sm bg-rule" />
        <div className="h-20 rounded-sm bg-rule" />
        <div className="h-20 rounded-sm bg-rule" />
      </div>
    </div>
  );
}
