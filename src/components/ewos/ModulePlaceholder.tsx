export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="grid min-h-[16rem] place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <div>
          <div className="text-sm font-medium text-foreground">Coming soon</div>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            This module will be implemented in a future sprint. It will connect to the corresponding
            backend endpoints once they are available.
          </p>
        </div>
      </div>
    </div>
  );
}
