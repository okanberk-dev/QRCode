'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DayDistributionChartProps {
  data: {
    name: string;
    count: number;
  }[];
}

export default function DayDistributionChart({ data }: DayDistributionChartProps) {
  return (
    <div className="flex flex-col h-[350px] w-full">
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelStyle={{ fontWeight: 800, color: '#1A2332', marginBottom: '4px' }}
            />
            <Bar 
              dataKey="count" 
              name="Yorum Sayısı"
              radius={[6, 6, 0, 0]}
              barSize={32}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.count === Math.max(...data.map(d => d.count)) ? '#F4B400' : '#e5e7eb'} 
                  className="hover:fill-[#1A2332] transition-colors"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
