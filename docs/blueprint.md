# **App Name**: Ride Queue

## Core Features:

- Location Input & Fare Calculation: Allows users to provide pickup and drop-off locations with address autocomplete and calculates the ride fare in real-time based on distance and trip type.
- Driver Ride Queue: Drivers have a dedicated view to see their accepted, scheduled rides in chronological order. They can also see and accept or reject new ride requests from a separate queue.
- Ride Cancellation: Users can cancel a previously scheduled ride, which may include a cancellation fee depending on the ride's status.
- Scheduling Logic: The app handles the entire ride lifecycle, from the user's initial request and confirmation to the driver accepting the ride. All data is managed in real-time with a Firestore database.

## Style Guidelines:

- Primary Color: Sky Blue (`#74B9FF`), used for buttons, links, and active states (`bg-blue-600`).
- Background Color: Light Gray (`#F0F4F8`), used for the main app background (`bg-gray-50`).
- Accent Color: Electric Blue (`#747AFF`), used for highlights and interactive elements.
- Font: 'Inter' sans-serif for headings and body text.
- Icons: The `lucide-react` icon library is used for clean and consistent icons throughout the app.
- Layout: A clean, list-based layout is used to display ride information for easy scanning.
- Transitions: Subtle transitions are used on interactive elements like buttons and switches to provide user feedback.