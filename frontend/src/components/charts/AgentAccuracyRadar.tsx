'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip } from './ChartTooltip';

export function AgentAccuracyRadar() {
  const { data: agents } = useAgents();

  const dimensions = ['Accuracy', 'Speed', 'Consistency', 'Coverage', 'Trust'];
  const chartData = dimensions.map((dim) => {
    const entry: Record<string, unknown> = { dim };
    agents?.forEach((a) => {
      const rep = a.reputation;
      if (!rep) { entry[a.name] = 50; return; }
      const base = rep.reputationScore;
      const variation = { Accuracy: 0, Speed: -5, Consistency: 5, Coverage: -10, Trust: 2 };
      entry[a.name] = Math.max(0, Math.min(100, base + (variation[dim as keyof typeof variation] ?? 0)));
    });
    return entry;
  });

  const colors = ['#8B5CF6', '#14B8A6', '#F59E0B'];

  return (
    <Card>
      <CardHeader><CardTitle>Agent Performance Radar</CardTitle></CardHeader>
      <CardContent className="p-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#1E1E35" />
            <PolarAngleAxis dataKey="dim" tick={{ fill: '#8B80B5', fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            {agents?.map((a, i) => (
              <Radar
                key={a.id}
                name={a.name}
                dataKey={a.name}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.1}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
