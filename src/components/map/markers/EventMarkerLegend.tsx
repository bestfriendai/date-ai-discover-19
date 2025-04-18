import React from "react";
import { Music, Trophy, Palette, Users, Utensils, CalendarDays } from "lucide-react";

const LEGEND = [
  {
    label: "Music",
    icon: Music,
    color: "bg-blue-500/80",
  },
  {
    label: "Sports",
    icon: Trophy,
    color: "bg-green-500/80",
  },
  {
    label: "Arts/Theatre",
    icon: Palette,
    color: "bg-pink-500/80",
  },
  {
    label: "Family",
    icon: Users,
    color: "bg-yellow-400/80",
  },
  {
    label: "Food/Restaurant",
    icon: Utensils,
    color: "bg-orange-500/80",
  },
  {
    label: "Other",
    icon: CalendarDays,
    color: "bg-gray-700/80",
  },
];

const EventMarkerLegend: React.FC = () => (
  <div
    className="fixed bottom-6 left-6 z-50 bg-white/90 border border-border rounded-lg shadow-lg px-4 py-3 flex flex-col gap-2 backdrop-blur-md"
    aria-label="Event marker legend"
    tabIndex={0}
    style={{ minWidth: 180, maxWidth: 260 }}
  >
    <div className="font-semibold text-sm mb-1 text-primary">Event Categories</div>
    <ul className="flex flex-col gap-1">
      {LEGEND.map(({ label, icon: Icon, color }) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center rounded-full border border-border/50 ${color}`}
            style={{ width: 28, height: 28 }}
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