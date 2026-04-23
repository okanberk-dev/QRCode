'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface TrendsChartProps {
  data: {
    date: string;
    count: number;
    avgRating: number;
  }[];
}

export default function TrendsChart({ data }: TrendsChartProps) {
  return (
    <div className="flex flex-col h-[350px] w-full">
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={[0, 5]}
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelStyle={{ fontWeight: 800, color: '#0A0A0A', marginBottom: '4px' }}
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="count" 
              name="Taramalar"
              stroke="#0A0A0A" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorCount)" 
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avgRating" 
              name="Ort. Puan"
              stroke="#C6F24E" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#C6F24E', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
