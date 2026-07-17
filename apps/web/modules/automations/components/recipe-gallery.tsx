import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '@aurexos/ui/components/badge'
import { Card } from '@aurexos/ui/components/card'
import { RECIPE_DEFS, actionLabel, triggerLabel } from '../constants'

/** Starter automations — one click prefills the builder (managers only). */
export function RecipeGallery({ canManage }: { canManage: boolean }) {
  if (!canManage) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Start from a recipe</h2>
      </div>
      <div className="aurex-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RECIPE_DEFS.map((recipe) => (
          <Link
            key={recipe.key}
            href={`/automations/new?recipe=${recipe.key}`}
            className="group block"
          >
            <Card interactive className="flex h-full flex-col gap-2 p-4">
              <p className="text-sm font-semibold text-foreground">{recipe.name}</p>
              <p className="flex-1 text-xs text-muted-foreground">{recipe.description}</p>
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="secondary" className="text-[11px]">
                  {triggerLabel(recipe.triggerEventType)}
                </Badge>
                {recipe.actionKeys.slice(0, 2).map((k) => (
                  <Badge key={k} variant="outline" className="text-[11px]">
                    {actionLabel(k)}
                  </Badge>
                ))}
              </div>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-[hsl(var(--accent-text))]">
                Use recipe
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
