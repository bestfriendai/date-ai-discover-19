import React from "react";
import { Music, Trophy, Palette, Users, Utensils, CalendarDays, PartyPopper } from "lucide-react";

const LEGEND = [
  {
    label: "Music",
    icon: Music,
    color: "#3b82f6", // Blue
  },
  {
    label: "Sports",
    icon: Trophy,
    color: "#22c55e", // Green
  },
  {
    label: "Arts/Theatre",
    icon: Palette,
    color: "#ec4899", // Pink
  },
  {
    label: "Family",
    icon: Users,
    color: "#eab308", // Yellow/Amber
  },
  {
    label: "Food/Restaurant",
    icon: Utensils,
    color: "#f97316", // Orange
  },
  {
    label: "Party",
    icon: PartyPopper,
    color: "#a855f7", // Purple
  },
  {
    label: "Other",
    icon: CalendarDays,
    color: "#6b7280", // Gray
  },
];

const EventMarkerLegend: React.FC = () => (
  <div
    className="absolute bottom-6 left-6 z-40 bg-background/80 border border-border/50 rounded-lg shadow-lg px-4 py-3 flex flex-col gap-2 backdrop-blur-md text-foreground"
    aria-label="Event marker legend"
    tabIndex={0}
    style={{ minWidth: 180, maxWidth: 260 }}
  >
    <div className="font-semibold text-sm mb-1 text-primary">Event Categories</div>
    <ul className="flex flex-col gap-1">
      {LEGEND.map(({ label, icon: Icon, color }) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center rounded-full border border-border/50`}
            style={{ width: 28, height: 28, backgroundColor: color }}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4 text-white" strokeWidth={2} />
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default EventMarkerLegend;