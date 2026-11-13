export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
