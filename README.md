# 🏆 Sports Community Hub

A comprehensive sports management and scoring system designed for community clubs and tournaments.

## 🚀 Features

### Management System
- **User Management**: Roles (Admin/Player), grouping, and profiles.
- **Subscriptions**: Daily & Monthly plans with automatic validity tracking.
- **Financials**:
  - **Ledger**: Complete transaction history (Fees, Fines, Payments).
  - **Fine System**: Smart rules with exponential escalation logic.
  - **Attendance**: One-tap daily check-in with auto-fee generation.
  - **Analytics**: Financial health overview and reports.

### Cricket Engine
- **Tournament**: Create tournaments, manage teams, assign squads.
- **Live Scoring**: 
  - Real-time ball-by-ball scoring.
  - Wicket, Extras (Wide, No-ball), and Over management.
  - Live match status tracking.
- **Match Analytics**:
  - Detailed Scorecards (Batting/Bowling stats).
  - Awards management (Man of the Match).

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Mobile App**: React Native (Expo) + React Native Paper
- **Infrastructure**: Render (Backend deployment), GitHub Actions (CI/CD)

## 📦 Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install

# Setup Environment Variables (.env)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Run migrations
npx prisma generate
npx prisma migrate deploy

# Start server
npm run dev
```

### 2. Mobile App Setup

```bash
cd mobile
npm install

# Setup Environment (.env)
EXPO_PUBLIC_API_URL="https://your-backend-url.onrender.com"

# Run App
npx expo start
```

## 📱 Project Structure

- `backend/src/controllers`: Logic for Users, Finances, Scoring.
- `backend/prisma/schema.prisma`: Database Schema.
- `mobile/app/(tabs)`: Main application screens.
- `mobile/services/api.service.ts`: Centralized API client.

## 🤝 Contribution

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
Built with ❤️ by the Sports Community Team
