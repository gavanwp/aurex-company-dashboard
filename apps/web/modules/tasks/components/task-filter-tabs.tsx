'use client'

import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@aurexos/ui/components/tabs'

export type TaskFilter = 'all' | 'mine'

/** searchParams-driven All / Mine switch for the Tasks page. */
export function TaskFilterTabs({ filter }: { filter: TaskFilter }) {
  const router = useRouter()

  return (
    <Tabs
      value={filter}
      onValueChange={(value) => router.push(value === 'mine' ? '/tasks?filter=mine' : '/tasks')}
    >
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="mine">Mine</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
