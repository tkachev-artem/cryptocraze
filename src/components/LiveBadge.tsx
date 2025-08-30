import type React from 'react'
import { useTranslation } from '@/lib/i18n'

type LiveBadgeProps = { isConnected: boolean }

const LiveBadge: React.FC<LiveBadgeProps> = ({ isConnected }) => {
  const { t } = useTranslation()
  const label = isConnected ? t('liveBadge.live') : t('liveBadge.offline')
  const color = isConnected ? 'bg-[#2EBD85]' : 'bg-[#F6465D]'
  const ring = isConnected ? 'ring-[#2EBD85]/30' : 'ring-[#F6465D]/30'
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={isConnected ? t('liveBadge.ariaLiveActive') : t('liveBadge.ariaLiveOffline')}
      tabIndex={0}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${color} ring-4 ${ring}`}
    >
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
      {label}
    </span>
  )
}

export default LiveBadge

