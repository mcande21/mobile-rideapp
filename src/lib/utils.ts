import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Preset avatar colors
export const AVATAR_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

// Preset avatar patterns/gradients
export const AVATAR_PATTERNS = [
  "airplane-svgrepo-com",
  "battery-car-svgrepo-com", 
  "big-truck-svgrepo-com",
  "bike-svgrepo-com",
  "car-svgrepo-com",
  "fuel-tank-svgrepo-com",
  "helicopter-svgrepo-com",
  "high-speed-rail-svgrepo-com",
  "minibus-svgrepo-com",
  "motorboat-svgrepo-com",
  "motorcycle-svgrepo-com",
  "rocket-svgrepo-com",
  "sailboat-svgrepo-com",
  "school-bus-svgrepo-com",
  "small-truck-svgrepo-com",
  "the-bus-svgrepo-com",
  "the-ship-svgrepo-com",
  "traffic-light-svgrepo-com",
  "trailer-svgrepo-com",
  "train-fence-svgrepo-com",
  "train-svgrepo-com",
  "tram-svgrepo-com",
  "truck-svgrepo-com",
  "yacht-svgrepo-com",
];

// Function to get the best avatar URL for a user
export function getAvatarUrl(user: User): string {
  // Priority 1: Google profile picture if available, selected, and user has Google account
  if (user.customAvatar?.type === 'google' && user.googleAccount?.picture) {
    return user.googleAccount.picture;
  }
  
  // Priority 2: Custom preset avatar if set
  if (user.customAvatar?.type === 'preset' && user.customAvatar.value) {
    return `/patterns/${user.customAvatar.value}.svg`;
  }
  
  // Priority 3: Google profile picture as fallback (if not explicitly selected but available)
  if (user.customAvatar?.type !== 'google' && user.googleAccount?.picture) {
    return user.googleAccount.picture;
  }
  
  // Priority 4: Original avatarUrl only if it's not a placeholder
  if (user.avatarUrl && !user.avatarUrl.includes('placehold.co')) {
    return user.avatarUrl;
  }
  
  // Default: Return empty string to force fallback to colored background
  return '';
}

// Function to get avatar background color
export function getAvatarBackgroundColor(user: User): string {
  if (user.customAvatar?.type === 'color' && user.customAvatar.value) {
    return user.customAvatar.value;
  }
  
  // Generate a consistent color based on user ID
  const colors = AVATAR_COLORS;
  const index = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

// Function to get user initials
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
