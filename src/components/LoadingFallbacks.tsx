export function ChartLoadingFallback() {
  return (
    <div
      data-testid="chart-loading-fallback"
      className="flex h-96 w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl"
    >
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <span className="text-xs font-medium">Carregando visualizador...</span>
      </div>
    </div>
  );
}

export function BuildExplorerLoadingFallback() {
  return (
    <div
      data-testid="builds-loading-fallback"
      className="flex h-96 w-full items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl"
    >
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="text-xs font-medium">
          Carregando montador de PC...
        </span>
      </div>
    </div>
  );
}
