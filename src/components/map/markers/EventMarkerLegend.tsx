
import React from "react";
import { 
  MusicIcon, 
  TrophyIcon, 
  TheaterIcon, 
  HeartIcon, 
  UtensilsIcon, 
  TicketIcon, 
  PartyPopperIcon, 
  SparklesIcon 
} from "@/lib/icons";

const LEGEND = [
  {
    label: "Music/Concert",
    icon: MusicIcon,
    color: "linear-gradient(to right bottom, #4f46e5, #3b82f6)", // Indigo to Blue
  },
  {
    label: "Festival",
    icon: SparklesIcon,
    color: "linear-gradient(to right bottom, #d946ef, #a855f7)", // Fuchsia to Purple
  },
  {
    label: "Sports",
    icon: TrophyIcon,
    color: "linear-gradient(to right bottom, #10b981, #22c55e)", // Emerald to Green
  },
  {
    label: "Arts/Theatre",
    icon: TheaterIcon,
    color: "linear-gradient(to right bottom, #ec4899, #db2777)", // Pink to Rose
  },
  {
    label: "Family",
    icon: HeartIcon,
    color: "linear-gradient(to right bottom, #f59e0b, #eab308)", // Amber to Yellow
  },
  {
    label: "Food/Restaurant",
    icon: UtensilsIcon,
    color: "linear-gradient(to right bottom, #f97316, #ea580c)", // Orange to Dark Orange
  },
  {
    label: "Party",
    icon: PartyPopperIcon,
    color: "linear-gradient(to right bottom, #8b5cf6, #7c3aed)", // Violet to Purple
  },
  {
    label: "Other",
    icon: TicketIcon,
    color: "linear-gradient(to right bottom, #64748b, #475569)", // Slate to Gray
  },
];

const EventMarkerLegend: React.FC = () => (
  <div
    className="absolute bottom-6 left-6 z-40 bg-background/90 border border-border/50 rounded-xl shadow-xl px-4 py-3 flex flex-col gap-2 backdrop-blur-md text-foreground transition-all duration-300 hover:shadow-2xl hover:bg-background/95"
    aria-label="Event marker legend"
    tabIndex={0}
    style={{ minWidth: 190, maxWidth: 260 }}
  >
    <div className="font-semibold text-sm mb-2 text-primary flex items-center gap-1.5">
      <TicketIcon className="h-4 w-4" />
      <span>Map Marker Categories</span>
    </div>
    <ul className="flex flex-col gap-1">
      {LEGEND.map(({ label, icon: Icon, color }) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center rounded-full border border-white/30 shadow-sm`}
            style={{ width: 30, height: 30, background: color }}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4 text-white drop-shadow-sm" strokeWidth={2.5} />
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default EventMarkerLegend;
