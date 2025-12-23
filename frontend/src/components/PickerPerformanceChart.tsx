import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface PickerData {
  timestamp: string;
  user: string;
  count: number;
}

interface PickerPerformanceChartProps {
  data: PickerData[];
  dateRange: 'today' | 'yesterday' | 'last7' | 'custom';
  fromDate?: string;
  toDate?: string;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
];

const PickerPerformanceChart: React.FC<PickerPerformanceChartProps> = ({
  data,
  dateRange,
  fromDate,
  toDate
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Debug logging - check raw data
    const uniqueDates = new Set<string>();
    data.forEach(item => {
      const dt = new Date(item.timestamp);
      uniqueDates.add(dt.toISOString().split('T')[0]);
    });
    
    const uniqueDatesArray = Array.from(uniqueDates).sort();
    console.log(`PickerPerformanceChart: ${data.length} items, dates: ${uniqueDatesArray.join(', ')}, range: ${dateRange}`);

    // Determine grouping interval based on date range
    let groupByHour = false;

    if (dateRange === 'custom' && fromDate && toDate) {
      // Custom range: calculate difference between dates
      const from = parseISO(fromDate);
      const to = parseISO(toDate);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      groupByHour = diffDays <= 1; // Hourly if 1 day or less, daily if more
    } else if (dateRange === 'today') {
      groupByHour = true; // Hourly on day view
    } else if (dateRange === 'yesterday') {
      groupByHour = true; // Hourly on yesterday view
    } else if (dateRange === 'last7') {
      groupByHour = false; // Daily on week view
    }

    // Group data by time and picker
    const grouped: { [key: string]: { time: string; sortKey: number; [key: string]: string | number } } = {};

    data.forEach((item) => {
      const timestamp = parseISO(item.timestamp);
      let timeKey: string;
      let sortKey: number;

      if (groupByHour) {
        timeKey = format(timestamp, 'HH:00');
        sortKey = parseInt(timeKey.split(':')[0]); // Hour for sorting (0-23)
      } else {
        timeKey = format(timestamp, 'MMM dd');
        sortKey = timestamp.getTime(); // Timestamp for sorting dates
      }

      if (!grouped[timeKey]) {
        grouped[timeKey] = { time: timeKey, sortKey };
      }

      if (!grouped[timeKey][item.user]) {
        grouped[timeKey][item.user] = 0;
      }

      (grouped[timeKey][item.user] as number) += item.count;
    });

    // Convert to array format for Recharts and sort ascending
    const chartArray = Object.values(grouped).sort((a, b) => {
      return (a.sortKey as number) - (b.sortKey as number);
    });

    console.log(`Chart grouped into ${chartArray.length} time buckets: ${chartArray.map(c => c.time).join(', ')}`);

    // Remove sortKey from final data before returning
    return chartArray.map(({ sortKey, ...rest }) => rest);
  }, [data, dateRange, fromDate, toDate]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Picker Performance</h3>
        <div className="text-center py-8 text-gray-500">
          No picker data available for this period
        </div>
      </div>
    );
  }

  // Get unique pickers for legend
  const pickers = useMemo(() => {
    const pickerSet = new Set<string>();
    data.forEach((item) => pickerSet.add(item.user));
    return Array.from(pickerSet).sort();
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Picker Performance</h3>
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              angle={dateRange === 'last7' ? -45 : 0}
              textAnchor={dateRange === 'last7' ? 'end' : 'middle'}
              height={dateRange === 'last7' ? 80 : 30}
            />
            <YAxis label={{ value: 'Picks', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value) => value}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #ccc', borderRadius: '4px', opacity: 1 }}
            />
            <Legend />
            {pickers.map((picker, index) => (
              <Line
                key={picker}
                type="monotone"
                dataKey={picker}
                stroke={COLORS[index % COLORS.length]}
                dot={chartData.length <= 24} // Show dots only for small datasets
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PickerPerformanceChart;
