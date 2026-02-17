export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">You are offline</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        GleamOps is running with cached data. Reconnect to sync pending updates.
      </p>
    </main>
  );
}
