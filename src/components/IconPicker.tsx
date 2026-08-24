import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { CATEGORY_ICONS } from '../lib/category-icons'

interface IconPickerProps {
  value: string
  color: string
  onChange: (iconName: string) => void
}

/** Ported from securo's icon-picker.tsx: searchable grid over CATEGORY_ICONS. */
export function IconPicker({ value, color, onChange }: IconPickerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return CATEGORY_ICONS
    return CATEGORY_ICONS.filter(
      (entry) => entry.name.includes(q) || entry.label.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder={t('categories.searchIcon')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
      />
      <div className="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto p-1">
        {filtered.map((entry) => {
          const isSelected = value === entry.name
          const Icon = entry.icon
          return (
            <button
              key={entry.name}
              type="button"
              title={entry.label}
              onClick={() => onChange(entry.name)}
              className={`flex size-9 items-center justify-center rounded-lg ${
                isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'hover:bg-muted'
              }`}
              style={isSelected ? { backgroundColor: color || '#6B7280' } : undefined}
            >
              <Icon
                size={18}
                strokeWidth={2}
                className={isSelected ? 'text-white' : 'text-muted-foreground'}
              />
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
            {t('categories.noIcons')}
          </p>
        )}
      </div>
    </div>
  )
}
