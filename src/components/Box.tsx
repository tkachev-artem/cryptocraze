import { useState } from 'react'
import { API_BASE_URL } from '@/lib/api'
import { useAppDispatch } from '@/app/hooks'
import { forceUserUpdate } from '@/app/userSlice'
import { fetchUserDataNoCache } from '@/lib/noCacheApi'
import { useTranslation } from '../lib/i18n'

export type BoxType = 'red' | 'green' | 'x'

type Prize = {
  amount?: number
  type?: 'pro'
  days?: number
  chance: number
  energySpent?: number
}

type BoxProps = {
  type: BoxType
  isOpen: boolean
  onClose: () => void
}

export const Box = ({ type, isOpen, onClose }: BoxProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [isOpening, setIsOpening] = useState(false)
  const [prize, setPrize] = useState<Prize | null>(null)
  const isPrizeOpen = Boolean(prize)

  if (!isOpen && !isPrizeOpen) return null

  const boxConfig = {
    red: { closeImage: '/boxes/red-box/close/box.svg', openImage: '/boxes/red-box/open/open-box.svg', title: t('box.red.title') },
    green: { closeImage: '/boxes/green-box/close/box.svg', openImage: '/boxes/green-box/open/open-box.svg', title: t('box.green.title') },
    x: { closeImage: '/boxes/x-box/close/box.svg', openImage: '/boxes/x-box/open/open-box.svg', title: t('box.x.title') },
  } as const

  const cfg = boxConfig[type]

  // Принудительное обновление пользователя
  const forceUpdateUser = async () => {
    try {
      console.log('[Box] ПРИНУДИТЕЛЬНОЕ обновление пользователя');
      const response = await fetchUserDataNoCache();
      if (response.ok) {
        const userData = await response.json();
        dispatch(forceUserUpdate(userData));
        console.log('[Box] Пользователь обновлен:', { coins: userData.coins, balance: userData.balance, energy: userData.energyTasksBonus });
      }
    } catch (error) {
      console.error('[Box] Ошибка обновления пользователя:', error);
    }
  };

  const handleOpen = async () => {
    if (isOpening) return
    try {
      setIsOpening(true)
      await new Promise((r) => setTimeout(r, 1500))

      const endpoint = `${API_BASE_URL}/${String(type)}-box/open`
      const resp = await fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? t('box.openError'))
      }
      const data = (await resp.json()) as { prize: Prize; energySpent?: number }

      setPrize({ ...data.prize, energySpent: data.energySpent })

      // ПРИНУДИТЕЛЬНО обновляем данные пользователя
      await forceUpdateUser();
    } catch (e) {
       
      alert(e instanceof Error ? e.message : t('box.openError'))
    } finally {
      setIsOpening(false)
    }
  }

  const handleClosePrize = async () => {
    setPrize(null)
    onClose()
    // ПРИНУДИТЕЛЬНО обновляем данные пользователя
    await forceUpdateUser();
  }

  // Prize modal
  if (isPrizeOpen && prize) {
    const isPro = prize.type === 'pro'
    const text = isPro ? t('box.proPrize', { days: String(prize.days ?? 3) }) : `$${String(prize.amount ?? 0)}`
    return (
      <div className="fixed inset-0 z-50">
        <div
          className="w-full h-full relative p-4"
          style={{ background: 'radial-gradient(197.89% 49.47% at 50% 50%, #422982 0%, #25094F 100%), #FFF' }}
        >
          <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 text-center">
            <h2 className="text-white text-[29px] font-bold mb-4">{t('box.yourPrize')}</h2>
            <p className="text-[#F5A600] text-[40px] font-extrabold">{text}</p>
          </div>
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img src={cfg.openImage} alt="Opened Box" className="w-52 h-60" />
          </div>
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full px-4">
            <button
              onClick={() => void handleClosePrize()}
              className="flex w-full h-[48px] px-[16px] flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold transition-colors hover:bg-[#0A4BD8]"
            >
              {t('common.claim')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Box modal
  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50">
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4"
          style={{ background: 'radial-gradient(197.89% 49.47% at 50% 50%, #422982 0%, #25094F 100%), #FFF' }}
        >
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className={`cursor-pointer transition-transform ${isOpening ? 'shake-animation' : 'hover:scale-105'}`}
              onClick={isOpening ? undefined : () => void handleOpen()}
            >
              <img src={cfg.closeImage} alt={`${type} box`} className="w-52 h-60 mb-6" />
            </div>
            {!isOpening && (
              <>
                <h2 className="text-white text-3xl font-bold mb-4">{cfg.title}</h2>
                <p className="text-white text-lg opacity-80 text-center">{t('box.tapInstruction')}</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}