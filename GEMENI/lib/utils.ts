import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateRange(startDate: string, endDate?: string): string {
  const start = new Date(startDate);

  if (!endDate) {
    return formatDate(startDate);
  }

  const end = new Date(endDate);

  // If same day, just return the date once
  if (start.toDateString() === end.toDateString()) {
    return formatDate(startDate);
  }

  // If same month, format as "Jan 1-5, 2023"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
  }

  // Otherwise, format as "Jan 1 - Feb 5, 2023"
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}