import { useState } from 'react'
import { getAccountTypeConfig } from '../lib/account-utils'

interface AccountIconProps {
  account: { type: string; institution_logo_url?: string | null }
  size?: number
}

/**
 * Mirrors securo's AccountIcon: institution logo when available, colored
 * account-type icon otherwise; a broken logo URL falls back to the type icon.
 */
export function AccountIcon({ account, size = 40 }: AccountIconProps) {
  const [errored, setErrored] = useState(false)
  const config = getAccountTypeConfig(account.type)
  const Icon = config.icon
  const logo = account.institution_logo_url
  const showImage = !!logo && !errored

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${
        showImage ? 'border border-border bg-white' : config.bg
      }`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={logo}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <Icon size={size * 0.45} className={config.color} />
      )}
    </span>
  )
}
