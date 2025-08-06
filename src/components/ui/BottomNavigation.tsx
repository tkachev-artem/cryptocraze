import { useLocation, useNavigate } from 'react-router-dom';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'home', path: '/home', activeIcon: '/menu/active/home.svg', inactiveIcon: '/menu/no-active/home.svg' },
    { id: 'trading', path: '/trade', activeIcon: '/menu/active/trading.svg', inactiveIcon: '/menu/no-active/trading.svg' },
    { id: 'portfolio', path: '/portfolio', activeIcon: '/menu/active/awards.svg', inactiveIcon: '/menu/no-active/awards.svg' },
    { id: 'rating', path: '/rating', activeIcon: '/menu/active/rating.svg', inactiveIcon: '/menu/no-active/rating.svg' },
    { id: 'profile', path: '/profile', activeIcon: '/menu/active/profile.svg', inactiveIcon: '/menu/no-active/profile.svg' }
  ];

  const handleTabClick = (path: string) => {
    void navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className='fixed bottom-0 left-0 right-0 h-[50px] bg-white border-t border-gray-200 flex justify-center items-center gap-[45px] px-4'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            handleTabClick(tab.path);
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive(tab.path) 
              ? 'text-[#0C54EA]' 
              : 'text-[#808080]'
          }`}

        >
          <img 
            src={isActive(tab.path) ? tab.activeIcon : tab.inactiveIcon} 
            alt={tab.id} 
            className="w-6 h-6"
          />
        </button>
      ))}
    </div>
  );
};

export default BottomNavigation; 