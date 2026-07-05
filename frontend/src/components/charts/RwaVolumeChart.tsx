'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useRwas } from '@/hooks/useRwa';
import { ChartTooltip } from './ChartTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getDayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RwaVolumeChart() {
  const { data: rwas } = useRwas({ limit: 100 });

  const last7: Record<string, { submitted: number; approved: number; rejected: number }> = {};
  for (let i = 6; i >= 0; i--) {
    last7[getDayLabel(i)] = { submitted: 0, approved: 0, rejected: 0 };
  }

  rwas?.forEach((r) => {
    const day = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (last7[day]) {
      last7[day].submitted++;
      if (r.status === 'APPROVED') last7[day].approved++;
      if (r.status === 'REJECTED') last7[day].rejected++;
    }
  });

  const chartData = Object.entries(last7).map(([date, v]) => ({ date, ...v }));

  return (
    <Card>
      <CardHeader><CardTitle>RWA Activity (7 days)</CardTitle></CardHeader>
      <CardContent className="p-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E35" />
            <XAxis dataKey="date" tick={{ fill: '#8B80B5', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8B80B5', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="submitted" name="Submitted" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
