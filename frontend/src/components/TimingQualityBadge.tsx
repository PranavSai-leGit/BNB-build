import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TimingQualityBadgeProps {
  quality?: 'Good' | 'Normal' | 'Review recommended' | string;
  refreshRate?: number;
  showDetails?: boolean;
}

export const TimingQualityBadge: React.FC<TimingQualityBadgeProps> = ({
  quality = 'Good',
  refreshRate = 60,
  showDetails = false,
}) => {
  if (quality === 'Good') {
    return (
      <span
        title="High-resolution VSYNC timing active with stable frame intervals"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Timing: Good (~{refreshRate}Hz)
      </span>
    );
  }

  if (quality === 'Review recommended') {
    return (
      <span
        title="Elevated frame jitter or hardware latency detected. Review recommended for sub-10ms millisecond tasks."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Timing: Review Recommended
      </span>
    );
  }

  return (
    <span
      title="Standard browser timing precision active"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30"
    >
      <Activity className="w-3.5 h-3.5" />
      Timing: Normal (~{refreshRate}Hz)
    </span>
  );
};
