import type React from 'react';
import { useUser } from '../hooks/useUser';

const ProfileCryptoData: React.FC = () => {
  const { user } = useUser();

  // Используем реальные данные пользователя или значения по умолчанию
  const rating = user?.ratingRank30Days ? `# ${user.ratingRank30Days.toString()}` : 'Н/Д';
  const awards = user?.rewardsCount ?? 1;
  const analytics = user?.tradesCount ?? 1;
  const transactions = user?.tradesCount ?? 1;
  const experience = user?.ratingScore ?? 0;
  const loss = user?.maxLoss ? `-$${user.maxLoss}` : 'Н/Д';
  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-2">
        {/* Рейтинг за 30 дней */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between gap-5">
          <div className="flex items-start  justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">Рейтинг за 30 дней</p>
              <p className="text-2xl font-bold">{rating}</p>
            </div>
          </div>

          <div className="flex items-center flex-row gap-1 justify-between">
            <div className='flex flex-row justify-start items-center'>
              <p className="text-xs text-black opacity-50">Опыт</p>
              <img src="/awards.svg" alt="experience" className="w-[16px] h-[21px] mx-0.5" />
              <p className="text-xs text-black opacity-50">{experience}</p>
            </div>

            <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
              Топ 
            </div>
          </div>
        </div>

        {/* Аналитика */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative gap-5">
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">Аналитика</p>
              <p className="text-2xl font-bold mt-5">{analytics}</p>
            </div>
          </div>
          <div className="flex items-center flex-row gap-1 justify-between">
            <div className='flex flex-row justify-start items-center'>
              <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full absolute top-3 right-3 flex items-center justify-center">
                <img src="/pickaxe.svg" alt="analytics" className="w-[36px] h-[32px]" />
              </div>
            </div>
            <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
              Сделки
            </div>
          </div>
        </div>

        {/* Награды */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative">
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">Награды</p>
              <p className="text-2xl font-bold mt-5">{awards}</p>
            </div>
          </div>
          <div className="flex items-center flex-row gap-1 justify-between">
            <div className='flex flex-row justify-start items-center'>
              <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center absolute top-3 right-3">
                <img src="/w-cup.svg" alt="awards" className="w-[32px] h-[26px]" />
              </div>
            </div>
            <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
              Награды
            </div>
          </div>
        </div>

        {/* Сделки */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative">
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">Сделки</p>
              <p className="text-2xl font-bold mt-5">{transactions}</p>
            </div>
          </div>
          <div className="flex items-center flex-row gap-1 justify-between">
            <div className='flex flex-row justify-start items-center'>
              <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center absolute top-3 right-3">
                <img src="/transactions.svg" alt="transactions" className="w-[32px] h-[30px]" />
              </div>
            </div>

            <div className='flex flex-row justify-between items-center gap-1 w-full'>
              <p className="text-sm font-medium text-red-500">{loss}</p>
              <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
                Сделки
              </div>
            </div>

          </div>
        
        </div>
      </div>
    </div>
  );
};

export default ProfileCryptoData; 