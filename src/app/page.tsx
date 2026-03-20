export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 text-center px-8">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          MilesControl
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Gerencie suas milhas e pontos em um só lugar.
        </p>
      </main>
    </div>
  );
}
