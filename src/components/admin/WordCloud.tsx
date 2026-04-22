'use client';

interface Word {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: Word[];
}

export default function WordCloud({ words }: WordCloudProps) {
  if (!words || words.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-[#E8ECF2]">
        Yorumlardan henüz yeterli veri toplanamadı.
      </div>
    );
  }

  // Find max value for scaling
  const maxVal = Math.max(...words.map(w => w.value));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8ECF2] h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-red-500 rounded-full"></span>
        Popüler Geri Bildirimler
      </h3>
      <div className="flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2 p-2 sm:p-4 min-h-[160px] sm:min-h-[200px]">
        {words.map((word, idx) => {
          // Normalize size (from 0.8rem to 2.5rem)
          const size = 0.8 + (word.value / maxVal) * 1.7;
          // Vary opacity based on frequency
          const opacity = 0.4 + (word.value / maxVal) * 0.6;
          // Colors: More frequent words are more "red/primary"
          const isTopTier = word.value > maxVal * 0.7;
          
          return (
            <span
              key={idx}
              style={{ 
                fontSize: `${size}rem`,
                opacity: opacity,
              }}
              className={`
                transition-all duration-300 hover:scale-110 cursor-default
                ${isTopTier ? 'text-red-600 font-bold' : 'text-gray-600 font-medium'}
              `}
              title={`${word.value} kez kullanıldı`}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
