// NOTE: Passwords are included for seeding purposes in this demo environment.
// In a real application, you should never hardcode credentials.
export const seedUsers = [
  { name: 'Alice Johnson', avatarUrl: 'https://placehold.co/100x100.png', role: 'user' as const, email: 'alice@example.com', password: 'password123' },
  { name: 'Bob Williams', avatarUrl: 'https://placehold.co/100x100.png', role: 'user' as const, email: 'bob@example.com', password: 'password123' },
  { name: 'Charlie Brown', avatarUrl: 'https://placehold.co/100x100.png', role: 'driver' as const, email: 'charlie@example.com', password: 'password123' },
  { name: 'Diana Miller', avatarUrl: 'https://placehold.co/100x100.png', role: 'driver' as const, email: 'diana@example.com', password: 'password123' },
];
