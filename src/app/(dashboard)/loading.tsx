import { Skeleton } from "@/components/ui/skeleton"

/** Esqueleto padrão das páginas do dashboard (mesmas proporções de PageHeader + StatGrid + SectionCard). */
export default function DashboardLoading() {
    return (
        <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Carregando">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-10 w-full md:w-48" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                <Skeleton className="h-96 rounded-xl lg:col-span-8" />
                <Skeleton className="h-96 rounded-xl lg:col-span-4" />
            </div>
        </div>
    )
}
