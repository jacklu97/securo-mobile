import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import { deleteCategory, listCategories, listCategoryGroups } from '../lib/securo'
import type { Category, CategoryGroup } from '../lib/types'
import { CategoryFormSheet } from './CategoryFormSheet'
import { CategoryIcon } from './CategoryIcon'

interface CategoriesSheetProps {
  onClose: () => void
}

export function CategoriesSheet({ onClose }: CategoriesSheetProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [form, setForm] = useState<Category | null | 'new'>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(false)
    try {
      const [cats, grps] = await Promise.all([listCategories(), listCategoryGroups()])
      setCategories(cats)
      setGroups([...grps].sort((a, b) => a.position - b.position))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (category: Category) => {
    setDeletingId(category.id)
    try {
      await deleteCategory(category.id)
      setCategories((current) => current.filter((item) => item.id !== category.id))
      setConfirmDeleteId(null)
    } catch {
      setError(true)
    } finally {
      setDeletingId(null)
    }
  }

  // Same layout as securo's categories page: one section per group (in
  // position order), then the ungrouped remainder.
  const sections: { key: string; title: string; color?: string; items: Category[] }[] = [
    ...groups.map((group) => ({
      key: group.id,
      title: group.name,
      color: group.color,
      items: categories.filter((category) => category.group_id === group.id),
    })),
    { key: 'ungrouped', title: 'Other', items: categories.filter((category) => !category.group_id) },
  ].filter((section) => section.items.length > 0)

  const renderRow = (category: Category) => {
    const isConfirming = confirmDeleteId === category.id
    const isDeleting = deletingId === category.id
    return (
      <li key={category.id} className="flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setForm(category)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <CategoryIcon icon={category.icon} color={category.color} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground">{category.name}</span>
            {(category.treat_as_transfer || category.is_ignored) && (
              <span className="block text-xs text-muted-foreground">
                {[
                  category.treat_as_transfer ? 'transfer' : null,
                  category.is_ignored ? 'ignored' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </span>
          <span
            className="size-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: category.color }}
          />
        </button>

        {isConfirming ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void handleDelete(category)}
              disabled={isDeleting}
              className="rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive disabled:opacity-50"
            >
              {isDeleting ? '…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              disabled={isDeleting}
              aria-label="Cancel"
              className="p-1.5 text-muted-foreground"
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          !category.is_system && (
            <button
              type="button"
              onClick={() => setConfirmDeleteId(category.id)}
              aria-label={`Delete ${category.name}`}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={15} />
            </button>
          )
        )}
      </li>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      <header className="mx-auto flex w-full max-w-md items-center gap-3 p-4">
        <button type="button" onClick={onClose} aria-label="Back" className="text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-foreground">Categories</h1>
        <button
          type="button"
          onClick={() => setForm('new')}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={16} />
          Add
        </button>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto p-4 pt-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Something went wrong — close and reopen to retry.
          </p>
        )}
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

        {sections.map((section) => (
          <section
            key={section.key}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <h2
              className="border-b border-border px-4 py-2.5 text-sm font-semibold"
              style={section.color ? { color: section.color } : undefined}
            >
              {section.title}
            </h2>
            <ul className="divide-y divide-border">{section.items.map(renderRow)}</ul>
          </section>
        ))}

        {!loading && sections.length === 0 && !error && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No categories yet — add your first one
          </p>
        )}
      </div>

      {form !== null && (
        <CategoryFormSheet
          key={form === 'new' ? 'new' : form.id}
          category={form === 'new' ? null : form}
          groups={groups}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            void load()
          }}
        />
      )}
    </div>
  )
}
