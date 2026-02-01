import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <Skeleton className="h-4 w-96 rounded-lg" />
                </div>
                <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-6 rounded-[2rem] bg-zinc-900/5 dark:bg-zinc-100/5 border border-border space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-32 rounded-lg" />
                            <Skeleton className="h-3 w-48 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-8">
                    <div className="p-8 rounded-[2.5rem] bg-zinc-900/5 dark:bg-zinc-100/5 border border-border space-y-6">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-48 rounded-lg" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                        <div className="space-y-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/2 rounded-lg" />
                                        <Skeleton className="h-3 w-1/4 rounded-lg" />
                                    </div>
                                    <Skeleton className="h-4 w-24 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="md:col-span-4">
                    <div className="p-8 rounded-[2.5rem] bg-zinc-900/5 dark:bg-zinc-100/5 border border-border space-y-6">
                        <Skeleton className="h-6 w-32 rounded-lg" />
                        <div className="flex justify-center py-8">
                            <Skeleton className="h-48 w-48 rounded-full" />
                        </div>
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-24 rounded-lg" />
                                    <Skeleton className="h-4 w-16 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
