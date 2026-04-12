'use client';

interface GoogleTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function GoogleTabs({ activeTab, onTabChange }: GoogleTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Genel Bakış' },
    { id: 'reviews', label: 'Yorumlar' },
    { id: 'photos', label: 'Fotoğraflar' },
    { id: 'about', label: 'Hakkında' }
  ];

  return (
    <div className="w-full bg-white border-b border-[#dadce0] overflow-x-auto no-scrollbar sticky top-0 z-10 transition-shadow">
      <div className="flex px-4 items-center min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3.5 text-sm font-medium transition-all relative ${
              activeTab === tab.id 
                ? "text-[#1a73e8]" 
                : "text-[#70757a] hover:text-[#202124]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a73e8] rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
