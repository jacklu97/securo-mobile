import { useState } from 'react'
import { X } from 'lucide-react'
import { createCategory, updateCategory } from '../lib/securo'
import type { Category, CategoryGroup } from '../lib/types'
import { IconPicker } from './IconPicker'

interface CategoryFormSheetProps {
  category: Category | null
  groups: CategoryGroup[]
  onClose: () => void
  onSaved: () => void
}

export function CategoryFormSheet({ category, groups, onClose, onSaved }: CategoryFormSheetProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [groupId, setGroupId] = useState(category?.group_id ?? '')
  // securo's dialog defaults: color #6366f1, icon circle-help
  const [color, setColor] = useState(category?.color ?? '#6366f1')
  const [icon, setIcon] = useState(category?.icon ?? 'circle-help')
  const [treatAsTransfer, setTreatAsTransfer] = useState(category?.treat_as_transfer ?? false)
  const [isIgnored, setIsIgnored] = useState(category?.is_ignored ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const payload = {
      name: name.trim(),
      icon,
      color,
      group_id: groupId || null,
      treat_as_transfer: treatAsTransfer,
      is_ignored: isIgnored,
    }
    try {
      if (category) {
        await updateCategory(category.id, payload)
      } else {
        await createCategory(payload)
      }
      onSaved()
    } catch {
      setError('Could not save the category')
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary'
  const labelClass = 'mb-1.5 block text-sm text-muted-foreground'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {category ? 'Edit category' : 'Add category'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Group</span>
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className={inputClass}
              >
                <option value="">No group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Color</span>
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                required
                className="h-[50px] w-full rounded-xl border border-border bg-background px-2 py-1"
              />
            </label>
          </div>

          <div>
            <span className={labelClass}>Icon</span>
            <IconPicker value={icon} color={color} onChange={setIcon} />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={treatAsTransfer}
              onChange={(event) => setTreatAsTransfer(event.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            <span className="text-sm text-foreground">
              Treat as transfer
              <span className="block text-xs text-muted-foreground">
                Excluded from income/expense totals
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={isIgnored}
              onChange={(event) => setIsIgnored(event.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            <span className="text-sm text-foreground">
              Ignore in reports
              <span className="block text-xs text-muted-foreground">
                Hidden from dashboards and summaries
              </span>
            </span>
          </label>

          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
