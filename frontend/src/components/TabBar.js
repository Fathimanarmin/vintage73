import { useRouter } from 'next/router';
import { useTabs } from '@/context/TabContext';
import { FiX, FiHome } from 'react-icons/fi';

export default function TabBar() {
  const { tabs, removeTab, closeAllTabs } = useTabs();
  const router = useRouter();

  if (tabs.length === 0) return null;

  return (
    <div className="bg-transparent px-2 md:px-4 pt-1 md:pt-2 flex items-center gap-1 md:gap-2 relative">
      {/* Scrollable tabs container */}
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar flex-1" style={{ paddingRight: tabs.length > 1 ? '120px' : '0' }}>
        {tabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => router.push(tab.path)}
            className={`
              group flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-t-lg cursor-pointer border-t border-l border-r text-[11px] md:text-xs font-medium transition-all min-w-[90px] md:min-w-[100px] max-w-[140px] md:max-w-[180px]
              ${router.pathname === tab.path
                ? 'bg-white border-gray-200 text-emerald-600 border-b-white -mb-px relative z-10'
                : 'bg-gray-50 border-transparent text-slate-500 hover:bg-gray-100'
              }
            `}
          >
            {tab.path === '/dashboard' || tab.path === '/' ? <FiHome className="shrink-0 text-sm" /> : null}
            <span className="truncate flex-1">{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.path, router.pathname);
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
            >
              <FiX size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Sticky Clear All button - fixed on the right */}
      {tabs.length > 1 && (
        <button
          onClick={closeAllTabs}
          className="absolute right-2 md:right-6 top-1 md:top-2 text-[10px] md:text-xs text-slate-400 hover:text-red-500 px-2 md:px-3 py-1 whitespace-nowrap z-20 border-l border-gray-200 pl-2 md:pl-4 bg-white/95 backdrop-blur-sm"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
