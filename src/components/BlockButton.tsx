type BlockButtonProps = {
  title: string;
  icon: string;
  size: string;
  onClick?: () => void;
};

const BlockButton = ({ title, icon, size, onClick }: BlockButtonProps) => {
  return (
    <div className='flex flex-col items-center gap-[10px]'>
      <div 
        className='w-full h-[84px] px-[20px] py-[13px] bg-[#F1F7FF] rounded-xl cursor-pointer hover:bg-[#E5F0FF] transition-colors flex items-center justify-center'
        onClick={onClick}
      >
        <img src={icon} alt={title} className={size} />
      </div>
      <p className='text-xs text-black font-bold'>{title}</p>
    </div>
  );
};

export default BlockButton; 