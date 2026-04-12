interface RatingChartProps {
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  totalCount: number;
}

export default function RatingChart({ distribution, totalCount }: RatingChartProps) {
  // Find max value to calculate percentage relative to largest bar
  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Puan Dağılımı</h3>
      
      <div className="space-y-4">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star as keyof typeof distribution] || 0;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const displayPercentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          
          return (
            <div key={star} className="flex items-center gap-4">
              <div className="flex items-center gap-1 w-12 text-sm text-gray-600 font-medium whitespace-nowrap">
                {star} <StarIcon />
              </div>
              
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#fbbc04]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="w-20 text-right text-sm">
                <span className="font-semibold text-gray-700">{count}</span>
                <span className="text-gray-400 text-xs ml-1">({displayPercentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
