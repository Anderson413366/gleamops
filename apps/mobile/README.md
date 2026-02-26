# GleamOps Mobile

React Native (Expo) app for field staff operations.

## Setup

```bash
cd apps/mobile
pnpm install
npx expo start
```

## Screens

| Tab | Description |
|-----|-------------|
| Today | Today's work tickets with stats |
| Tickets | This week's tickets with search |
| Clock | Clock in/out with live timer |
| Profile | Staff profile + sign out |

### Detail Screen
- **Ticket Detail** — Full ticket info, checklist with toggle, status actions (Start/Complete)

## Environment

Copy `.env` and update with your Supabase project credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Architecture

- **Expo Router** for file-based navigation
- **Supabase JS** with SecureStore for auth persistence
- **AuthProvider** context for session management
- Protected routing: unauthenticated users redirect to login
