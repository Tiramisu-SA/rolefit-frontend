import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Icon className="size-6" aria-hidden /></span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-destructive-soft text-destructive"><AlertTriangle className="size-6" aria-hidden /></span>
      <h3 className="text-lg font-bold">Something went wrong</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="lg" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export function ListSkeleton({ rows = 4, className = "h-36" }: { rows?: number; className?: string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={cn("w-full rounded-2xl", className)} />)}
    </div>
  );
}
