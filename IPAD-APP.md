# Masterly Air Academy — iPad App Development Plan

> **Platform:** React Native (Expo) for iPad — **Student Only**
> **Spec Reference:** Architecture.md §2.3, §9
> **Status:** Phase B — Not Yet Started
> **Date:** July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Project Structure](#4-project-structure)
5. [Shared Code Strategy](#5-shared-code-strategy)
6. [Authentication & Security](#6-authentication--security)
7. [Navigation Architecture](#7-navigation-architecture)
8. [Screen-by-Screen Design](#8-screen-by-screen-design)
9. [API Integration Layer](#9-api-integration-layer)
10. [State Management](#10-state-management)
11. [Offline Support & Data Sync](#11-offline-support--data-sync)
12. [Internationalization (EN/FR/AR)](#12-internationalization)
13. [Push Notifications](#13-push-notifications)
14. [PDF Viewing & Export](#14-pdf-viewing--export)
15. [Calendar & Scheduling](#15-calendar--scheduling)
16. [Charts & Data Visualization](#16-charts--data-visualization)
17. [Exam Taking Experience](#17-exam-taking-experience)
18. [Camera & Document Scanning](#18-camera--document-scanning)
19. [Biometric Authentication](#19-biometric-authentication)
20. [Performance Optimization](#20-performance-optimization)
21. [Testing Strategy](#21-testing-strategy)
22. [Build & Deployment](#22-build--deployment)
23. [Backend Changes Required](#23-backend-changes-required)
24. [Development Phases](#24-development-phases)
25. [Risk Assessment](#25-risk-assessment)

---

## 1. Executive Summary

The iPad app is a **Phase B**, **student-only** deliverable that consumes the same Django REST API as the web platform. It gives students a native, offline-capable companion for their training journey.

### What Students Can Do on iPad

| Feature | Read | Write |
|---------|:---:|:---:|
| View dashboard (KPIs, progress, radar chart) | ✅ | — |
| Browse courses & modules | ✅ | — |
| View flight lessons & results | ✅ | — |
| Take exams (with anti-cheat) | ✅ | ✅ Submit |
| View & download certificates (PDF) | ✅ | — |
| View & download invoices (PDF) | ✅ | — |
| View schedule (calendar) | ✅ | — |
| View attendance history | ✅ | — |
| View medical certificate status | ✅ | — |
| Read & send messages | ✅ | ✅ |
| Read notifications | ✅ | ✅ Mark read |
| View profile | ✅ | ✅ Update |
| Switch language (EN/FR/AR) | — | ✅ |

### What Students Cannot Do (Web Only)

| Feature | Reason |
|---------|--------|
| Mark attendance | Instructor-only |
| Evaluate flights | Instructor-only |
| Create invoices | Finance-only |
| View quality audits/NCRs | Quality-only |
| Manage users/admin | Admin-only |
| Submit safety events | Quality-only |
| Access Django Admin | Admin-only |

### Key Principles
1. **Same API, same data** — no duplicate backend needed
2. **Offline-first** — cache courses, flights, certificates, exams
3. **Student-only UI** — no role branching, no permission guards
4. **Shared types & validators** — reuse `shared/` directory code
5. **LAN-first** — optimized for school WiFi, not internet-dependent

---

## 2. Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.76+ | Core framework |
| **Expo SDK** | 52+ | Build tooling, OTA updates |
| **Expo Router** | 4.x | File-based navigation |
| **React Navigation** | 7.x | Stack/tab navigation |
| **TanStack Query** | 5.x | Server state management |
| **Zustand** | 5.x | Client state management |
| **MMKV** | 3.x | Fast local storage (tokens, prefs, cache) |
| **i18next** | 24.x | Internationalization (shared with web) |
| **react-i18next** | 15.x | React Native i18n bindings |
| **Zod** | 3.23+ | Schema validation (shared with web) |
| **React Native Paper** | 5.x | Material Design UI components |
| **React Native Reanimated** | 3.x | Smooth animations |
| **React Native Gesture Handler** | 2.x | Touch interactions |
| **expo-camera** | 16.x | Document scanning (medical certs) |
| **expo-notifications** | 0.29.x | Push notifications |
| **expo-secure-store** | 14.x | Secure token storage |
| **expo-local-authentication** | 14.x | Face ID / Touch ID |
| **react-native-pdf** | 6.x | PDF viewing (certs, invoices) |
| **react-native-chart-kit** | 6.x | Radar charts, progress bars |
| **react-native-calendars** | 14.x | Calendar views |
| **@shopify/flash-list** | 1.x | Fast scrollable lists |
| **axios** | 1.7+ | HTTP client |
| **react-hook-form** | 7.x | Form management |
| **expo-print** | 13.x | PDF export/share |

### Why These Choices

- **Expo SDK 52+**: Managed workflow, OTA updates without App Store, pre-built native modules
- **MMKV over AsyncStorage**: 30x faster reads, synchronous API, encrypted storage
- **TanStack Query**: Automatic caching, background refetch, offline support built-in
- **Zustand over Redux**: Minimal boilerplate, no providers needed, works with TanStack Query
- **React Native Paper**: Mature Material Design library, good accessibility, RTL support
- **Zod shared with web**: Same validation schemas, type-safe, no duplication
- **FlashList**: 5x faster than FlatList for long lists (courses, flight history)

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              iPad App (Student Only)             │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Screens  │  │ Navigation│  │ Components   │  │
│  │ (10 tabs)│  │ (Stack+Tab│  │ (UI kit)     │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│  ┌────┴──────────────┴───────────────┴───────┐  │
│  │            State Management                │  │
│  │  ┌─────────────┐  ┌──────────────────┐    │  │
│  │  │ TanStack    │  │ Zustand          │    │  │
│  │  │ Query       │  │ (auth, UI, sync) │    │  │
│  │  └──────┬──────┘  └────────┬─────────┘    │  │
│  └─────────┼──────────────────┼──────────────┘  │
│            │                  │                  │
│  ┌─────────┴──────────────────┴──────────────┐  │
│  │           API Client (Axios)               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ Auth     │  │ Request  │  │ Offline  │ │  │
│  │  │ Interceptor│ │ Queue    │  │ Cache    │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘ │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴───────────────────────┐  │
│  │          Local Storage (MMKV)              │  │
│  │  tokens │ user │ cache │ prefs │ sync queue│  │
│  └────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────┘
                        │ HTTP
                        ▼
┌───────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy)                 │
│         Port 80/443 → Django API :8000            │
└───────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│           Django REST API (same as web)            │
│  /api/login/  /api/student/dashboard/              │
│  /api/courses/  /api/flight-lessons/               │
│  /api/exams/  /api/certificates/                   │
└───────────────────────────────────────────────────┘
```

### Data Flow
1. **Online**: iPad → Nginx → Django API → JSON → TanStack Query cache → UI
2. **Offline**: MMKV cache → UI → queue writes → sync when online
3. **Background**: TanStack Query stale-while-revalidate → auto-refetch on reconnect

---

## 4. Project Structure

```
ipad/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout (providers, i18n, splash)
│   ├── index.tsx                 # Splash → auth check → redirect
│   ├── login.tsx                 # Student login screen
│   └── (app)/                    # Main app group (requires auth)
│       ├── _layout.tsx           # Tab navigator layout
│       ├── dashboard/
│       │   └── index.tsx         # Student dashboard
│       ├── courses/
│       │   ├── index.tsx         # Course list
│       │   └── [id].tsx          # Course detail + modules
│       ├── flights/
│       │   ├── index.tsx         # Flight lesson list
│       │   └── [id].tsx          # Flight detail + results
│       ├── exams/
│       │   ├── index.tsx         # Exam list
│       │   └── [id].tsx          # Take exam (anti-cheat)
│       ├── schedule/
│       │   └── index.tsx         # Calendar view
│       ├── certificates/
│       │   └── index.tsx         # Certificate list + PDF
│       ├── invoices/
│       │   ├── index.tsx         # Invoice list
│       │   └── [id].tsx          # Invoice detail + PDF
│       ├── messages/
│       │   ├── index.tsx         # Inbox
│       │   └── compose.tsx       # New message
│       ├── notifications/
│       │   └── index.tsx         # Notification list
│       ├── profile/
│       │   └── index.tsx         # Profile + medical status
│       └── settings/
│           └── index.tsx         # Language, biometrics, about
├── components/                   # Reusable UI components
│   ├── ui/                       # Base components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorState.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── ProgressRadar.tsx
│   │   ├── UpcomingSchedule.tsx
│   │   └── RecentResults.tsx
│   ├── courses/
│   │   ├── CourseCard.tsx
│   │   └── ModuleProgress.tsx
│   ├── flights/
│   │   ├── FlightCard.tsx
│   │   └── FlightResult.tsx
│   ├── exam/
│   │   ├── QuestionCard.tsx
│   │   ├── ExamTimer.tsx
│   │   ├── ExamProgress.tsx
│   │   └── AntiCheatOverlay.tsx
│   ├── calendar/
│   │   ├── EventCard.tsx
│   │   └── DayView.tsx
│   ├── charts/
│   │   └── ProgressRadar.tsx
│   └── pdf/
│       └── PDFViewer.tsx
├── lib/                          # Core libraries
│   ├── api.ts                    # Axios client + interceptors
│   ├── auth.ts                   # Login, logout, biometrics
│   ├── storage.ts                # MMKV + SecureStore helpers
│   ├── sync.ts                   # Offline sync manager
│   └── notifications.ts          # Push notification setup
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Auth state + actions
│   ├── useTranslation.ts         # i18n hook
│   ├── useOffline.ts             # Network status
│   └── useNotifications.ts       # Notification badge count
├── store/                        # Zustand stores
│   ├── auth-store.ts             # Auth state (tokens, user)
│   ├── ui-store.ts               # UI state (theme, language)
│   └── sync-store.ts             # Offline sync queue
├── services/                     # API service modules
│   ├── auth.service.ts
│   ├── courses.service.ts
│   ├── flights.service.ts
│   ├── exams.service.ts
│   ├── certificates.service.ts
│   ├── invoices.service.ts
│   ├── schedule.service.ts
│   ├── messages.service.ts
│   ├── notifications.service.ts
│   └── profile.service.ts
├── types/                        # TypeScript types
│   ├── api.ts                    # API response types
│   ├── models.ts                 # Data model types
│   └── navigation.ts             # Navigation param types
├── constants/                    # App constants
│   ├── colors.ts                 # Color palette (from shared)
│   ├── config.ts                 # API URL, timeouts
│   └── layout.ts                 # iPad-specific dimensions
├── utils/                        # Utility functions
│   ├── formatters.ts             # Date, currency, number formatting
│   ├── validators.ts             # Zod schemas (from shared)
│   └── pdf.ts                    # PDF export helpers
├── assets/                       # Static assets
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo-white.png
│   │   └── splash.png
│   └── locales/
│       ├── en/common.json
│       ├── fr/common.json
│       └── ar/common.json
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md
```

---

## 5. Shared Code Strategy

### What to Share with Web

| Item | Source | How to Share |
|------|--------|-------------|
| **TypeScript types** | `shared/types/index.ts` | Copy into `ipad/types/shared.ts` |
| **Zod validators** | `shared/validators/index.ts` | Copy into `ipad/utils/validators.ts` |
| **Color palette** | `shared/colors.ts` | Copy into `ipad/constants/colors.ts` |
| **Locale JSONs** | `shared/locales/{en,fr,ar}/common.json` | Extend + copy into `ipad/assets/locales/` |

### What NOT to Share

| Item | Reason |
|------|--------|
| React components | Different frameworks (Next.js vs React Native) |
| CSS/Tailwind | React Native uses StyleSheet |
| Navigation | Different routing systems |
| State management | Different patterns (Context vs Zustand) |

### Shared Package Strategy (Future)

Create a shared npm package for cleaner reuse:

```
shared/
├── package.json          # @maa/shared
├── src/
│   ├── types/index.ts    # UserRole, Student, FlightLesson, etc.
│   ├── validators/       # loginSchema, examSubmitSchema, etc.
│   ├── colors.ts         # navy, gold, surface, text
│   └── locales/          # en/fr/ar JSON
└── tsconfig.json
```

Both `web/` and `ipad/` import from `@maa/shared`:
```ts
import { Student, FlightLesson } from '@maa/shared/types';
import { loginSchema } from '@maa/shared/validators';
import { colors } from '@maa/shared/colors';
```

### Locale Expansion for iPad

The shared locales have 51 keys (landing page). The iPad app needs additional student-specific keys:

```json
{
  "app": {
    "name": "Masterly Air Academy",
    "tagline": "Your training, everywhere"
  },
  "tabs": {
    "dashboard": "Dashboard",
    "courses": "Courses",
    "flights": "Flights",
    "exams": "Exams",
    "schedule": "Schedule",
    "more": "More"
  },
  "dashboard": {
    "welcome": "Welcome, {{name}}",
    "flightHours": "Flight Hours",
    "coursesEnrolled": "Courses Enrolled",
    "theoryProgress": "Theory Progress",
    "flightProgress": "Flight Progress",
    "examAverage": "Exam Average",
    "overdueInvoice": "Overdue Invoice",
    "expiringDocs": "Expiring Documents",
    "upcomingSchedule": "Upcoming Schedule",
    "recentResults": "Recent Results",
    "skillBreakdown": "Skill Breakdown",
    "noData": "No data available"
  },
  "courses": {
    "title": "My Courses",
    "modules": "Modules",
    "progress": "Progress",
    "instructor": "Instructor",
    "room": "Room",
    "schedule": "Schedule",
    "enrolled": "{{count}} students enrolled"
  },
  "flights": {
    "title": "My Flights",
    "instructor": "Instructor",
    "aircraft": "Aircraft",
    "duration": "Duration",
    "grade": "Grade",
    "result": "Result",
    "pass": "Pass",
    "fail": "Fail",
    "scheduled": "Scheduled",
    "completed": "Completed",
    "cancelled": "Cancelled"
  },
  "exams": {
    "title": "My Exams",
    "startExam": "Start Exam",
    "submitExam": "Submit Exam",
    "timeRemaining": "Time Remaining",
    "question": "Question {{current}} of {{total}}",
    "previous": "Previous",
    "next": "Next",
    "antiCheat": "Do not leave this screen",
    "tabSwitched": "Exam paused — you switched screens",
    "examSubmitted": "Exam submitted successfully",
    "score": "Score",
    "passed": "Passed",
    "failed": "Failed",
    "outOf": "{{score}} / {{total}}"
  },
  "certificates": {
    "title": "My Certificates",
    "number": "Certificate #{{number}}",
    "issued": "Issued: {{date}}",
    "validUntil": "Valid until: {{date}}",
    "downloadPdf": "Download PDF"
  },
  "invoices": {
    "title": "My Invoices",
    "amount": "Amount",
    "status": "Status",
    "dueDate": "Due: {{date}}",
    "paid": "Paid",
    "issued": "Issued",
    "overdue": "Overdue",
    "downloadPdf": "Download PDF"
  },
  "schedule": {
    "title": "My Schedule",
    "today": "Today",
    "noClasses": "No classes scheduled",
    "course": "Course",
    "flight": "Flight"
  },
  "messages": {
    "title": "Messages",
    "inbox": "Inbox",
    "sent": "Sent",
    "compose": "New Message",
    "to": "To",
    "subject": "Subject",
    "body": "Message",
    "send": "Send",
    "noMessages": "No messages"
  },
  "profile": {
    "title": "My Profile",
    "studentNumber": "Student #",
    "program": "Program",
    "enrollmentDate": "Enrolled",
    "medicalStatus": "Medical Certificate",
    "medicalValid": "Valid until {{date}}",
    "medicalExpiring": "Expiring soon!",
    "medicalExpired": "Expired",
    "noMedical": "No medical certificate on file"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "biometric": "Face ID Login",
    "notifications": "Notifications",
    "about": "About",
    "version": "Version {{version}}",
    "logout": "Sign Out"
  },
  "offline": {
    "cached": "Showing cached data",
    "lastSynced": "Last synced: {{time}}",
    "syncing": "Syncing...",
    "syncComplete": "All data up to date",
    "syncFailed": "Sync failed. Will retry when online."
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "email": "Email",
    "password": "Password",
    "rememberMe": "Remember me",
    "biometric": "Use Face ID",
    "biometricPrompt": "Sign in with Face ID",
    "sessionExpired": "Session expired. Please sign in again.",
    "invalidCredentials": "Invalid email or password",
    "networkError": "Connection error. Check your WiFi."
  }
}
```

---

## 6. Authentication & Security

### 6.1 Login Flow

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Login Screen │────▶│ API Call │────▶│ Store    │────▶│ Navigate │
│ (email/pass) │     │ POST     │     │ Tokens   │     │ to Tabs  │
└─────────────┘     │ /api/login│     │ + User   │     └──────────┘
                    └──────────┘     └──────────┘
```

Only student roles are allowed: `student`, `candidate`, `graduate`. If the API returns any other role, show an error: "This app is for students only. Please use the web portal."

### 6.2 Token Storage

```ts
// ipad/lib/storage.ts
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';

const mmkv = new MMKV();

// MMKV — fast, non-sensitive data
export const storeUser = (user: User) => mmkv.set('user', JSON.stringify(user));
export const getUser = (): User | null => {
  const json = mmkv.getString('user');
  return json ? JSON.parse(json) : null;
};
export const storeLocale = (locale: string) => mmkv.set('locale', locale);
export const getLocale = () => mmkv.getString('locale') || 'en';

// SecureStore — encrypted, sensitive data
export const storeTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync('access_token', access);
  await SecureStore.setItemAsync('refresh_token', refresh);
};
export const getAccessToken = () => SecureStore.getItemAsync('access_token');
export const getRefreshToken = () => SecureStore.getItemAsync('refresh_token');
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};
```

### 6.3 Token Refresh

```ts
// Automatic refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/token/refresh/`, {
            refresh: refreshToken,
          });
          await storeTokens(data.access, data.refresh || refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          await clearTokens();
          // Redirect to login
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### 6.4 Biometric Authentication

```ts
// ipad/lib/auth.ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(prompt: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Use password',
    disableDeviceFallback: false,
    maxAttempts: 3,
  });
  return result.success;
}
```

### 6.5 Security Measures

| Measure | Implementation |
|---------|---------------|
| Token storage | `expo-secure-store` (AES-256 encrypted) |
| Biometric auth | `expo-local-authentication` (Face ID / Touch ID) |
| Role gate | Reject non-student logins at app level |
| No sensitive data in logs | Remove console.log in production |
| Session timeout | 15-minute access token, 7-day refresh |
| App Transport Security | Enforce HTTPS in Info.plist |
| Jailbreak detection | Optional `react-native-jailbreak-detection` |

---

## 7. Navigation Architecture

### 7.1 Tab Structure

The iPad app uses **Expo Router** with a fixed student-only tab layout:

```
Root Layout (_layout.tsx)
├── Auth Check → redirect to login or app
├── Login (login.tsx)
└── App Group ((app)/_layout.tsx)
    ├── Tab Navigator (5 bottom tabs)
    │   ├── Dashboard Tab
    │   ├── Courses Tab
    │   ├── Flights Tab
    │   ├── Exams Tab
    │   └── More Tab (schedule, certs, invoices, messages, profile, settings)
    └── Stack Screens (pushed on tap)
        ├── Course Detail
        ├── Flight Detail
        ├── Exam Taking
        ├── Certificate Detail
        ├── Invoice Detail
        ├── Message Compose
        └── Notification List
```

### 7.2 Tab Bar Design

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│   🏠    │   📚    │   ✈️    │   📝    │   •••   │
│Dashboard│ Courses │ Flights │  Exams  │  More   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 7.3 Navigation Code

```tsx
// ipad/app/(app)/_layout.tsx
import { Tabs } from 'expo-router';
import { colors } from '@/constants/colors';
import { useTranslation } from '@/hooks/useTranslation';

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold[500],
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.navy[800],
          borderTopColor: colors.navy[700],
        },
        headerStyle: { backgroundColor: colors.navy[900] },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: t('tabs.courses'),
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="flights"
        options={{
          title: t('tabs.flights'),
          tabBarIcon: ({ color, size }) => <Plane size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: t('tabs.exams'),
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### 7.4 iPad Sidebar Layout (Landscape)

On iPad in landscape, use a **sidebar + detail** split view:

```tsx
// ipad/app/(app)/_layout.tsx (tablet)
import { useWindowDimensions } from 'react-native';

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const isLandscape = width >= 1024;

  if (isLandscape) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar
          items={[
            { icon: 'home', label: t('tabs.dashboard'), route: 'dashboard' },
            { icon: 'book', label: t('tabs.courses'), route: 'courses' },
            { icon: 'plane', label: t('tabs.flights'), route: 'flights' },
            { icon: 'file', label: t('tabs.exams'), route: 'exams' },
            { icon: 'more', label: t('tabs.more'), route: '(more)' },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Stack />
        </View>
      </View>
    );
  }

  return <Tabs />;
}
```

---

## 8. Screen-by-Screen Design

### 8.1 Login Screen

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                                                    │
│                    [MAA Logo]                       │
│                                                    │
│              Masterly Air Academy                  │
│           Your training, everywhere                │
│                                                    │
│    ┌──────────────────────────────────────────┐    │
│    │  📧  Email                               │    │
│    └──────────────────────────────────────────┘    │
│    ┌──────────────────────────────────────────┐    │
│    │  🔒  Password                            │    │
│    └──────────────────────────────────────────┘    │
│                                                    │
│    ☐ Remember me              🔑 Use Face ID      │
│                                                    │
│    ┌──────────────────────────────────────────┐    │
│    │              Sign In                     │    │
│    └──────────────────────────────────────────┘    │
│                                                    │
│                   EN | FR | AR                     │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Features:**
- Email/password inputs with Zod validation
- "Remember me" toggle (persists email in MMKV)
- Face ID button (if available and previously enabled)
- Language switcher (EN/FR/AR)
- Loading spinner during API call
- Error message display (red banner)
- Keyboard avoiding view
- Rejects non-student roles with clear message

### 8.2 Student Dashboard

```
┌────────────────────────────────────────────────────┐
│  Welcome, Ahmed 👋                    🔔 3    👤  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  12.5h   │ │    2     │ │   78%    │           │
│  │  Flight  │ │ Courses  │ │  Theory  │           │
│  │  Hours   │ │  Active  │ │ Progress │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   8.2    │ │    1     │ │    2     │           │
│  │  Exam    │ │ Overdue  │ │Expiring  │           │
│  │ Average  │ │ Invoice  │ │  Docs    │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                    │
│  Upcoming Schedule                                 │
│  ┌────────────────────────────────────────────┐    │
│  │ 📅 Mon 14 Jul  Navigation Basics          │    │
│  │    09:00-11:00 · Classroom A              │    │
│  ├────────────────────────────────────────────┤    │
│  │ ✈️ Tue 15 Jul  Flight w/ Hassan           │    │
│  │    14:00 · CN-TAA (Cessna C172S)         │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Skill Breakdown                                   │
│  ┌────────────────────────────────────────────┐    │
│  │ Navigation      ████████████░░░  80%       │    │
│  │ Meteorology     ██████████████░  93%       │    │
│  │ Regulation      ████████░░░░░░░  53%       │    │
│  │ Communication   ██████████░░░░░  67%       │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Recent Results                                    │
│  ┌────────────────────────────────────────────┐    │
│  │ NAV-PPL-01   8.5/10  ✅ Pass   10 Jul     │    │
│  │ MET-PPL-01   7.0/10  ✅ Pass    5 Jul     │    │
│  └────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

**Data source:** `GET /api/student/dashboard/`

### 8.3 Course List

```
┌────────────────────────────────────────────────────┐
│  📚 My Courses                                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  Navigation Basics (NAV-101)               │    │
│  │  PPL · Instructor: Karim Bensaid           │    │
│  │  Mon/Wed 09:00-11:00 · Classroom A        │    │
│  │  ████████████████░░░░  80% · 4 modules     │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  Weather Fundamentals (MET-201)            │    │
│  │  PPL · Instructor: Karim Bensaid           │    │
│  │  Tue/Thu 10:00-12:00 · Classroom B        │    │
│  │  ██████████████████░░  90% · 4 modules     │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.4 Course Detail

```
┌────────────────────────────────────────────────────┐
│  ←  Navigation Basics (NAV-101)                   │
├────────────────────────────────────────────────────┤
│                                                    │
│  Instructor: Karim Bensaid                         │
│  Room: Classroom A · Capacity: 25                  │
│  Schedule: Mon/Wed 09:00-11:00                     │
│                                                    │
│  Modules (4)                                       │
│  ┌────────────────────────────────────────────┐    │
│  │ ✅ 1.1  Aviation Rules           100%     │    │
│  │ ✅ 1.2  Airspace Classes         100%     │    │
│  │ 🔄 1.3  Chart Reading            60%      │    │
│  │ ⬜ 1.4  Flight Planning           0%      │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  My Attendance                                     │
│  ┌────────────────────────────────────────────┐    │
│  │ Mon 07 Jul   ✅ Present                    │    │
│  │ Wed 09 Jul   ✅ Present                    │    │
│  │ Mon 14 Jul   ⏳ Upcoming                   │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.5 Flight Lesson List

```
┌────────────────────────────────────────────────────┐
│  ✈️ My Flights                                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  Completed (1)                                     │
│  ┌────────────────────────────────────────────┐    │
│  │ 10 Jul 2026  CN-TAA  Hassan Ouazzani      │    │
│  │ 1.5h · Grade: 8.5/10 · ✅ Pass           │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Scheduled (2)                                     │
│  ┌────────────────────────────────────────────┐    │
│  │ 15 Jul 2026  CN-TAA  Hassan Ouazzani      │    │
│  │ 1.5h · ⏳ Scheduled                       │    │
│  ├────────────────────────────────────────────┤    │
│  │ 20 Jul 2026  CN-TAB  Hassan Ouazzani      │    │
│  │ 1.0h · ⏳ Scheduled                       │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.6 Flight Detail

```
┌────────────────────────────────────────────────────┐
│  ←  Flight Lesson Detail                           │
├────────────────────────────────────────────────────┤
│                                                    │
│  Date: 10 Jul 2026                                 │
│  Aircraft: CN-TAA (Cessna C172S)                   │
│  Instructor: Hassan Ouazzani                       │
│  Duration: 1.5 hours                               │
│  Status: ✅ Completed                              │
│                                                    │
│  Result                                            │
│  ┌────────────────────────────────────────────┐    │
│  │  Grade:        8.5 / 10                   │    │
│  │  Result:       Pass                        │    │
│  │  Total Hours:  12.5h                       │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Maneuvers Covered                                 │
│  ┌────────────────────────────────────────────┐    │
│  │  ✅ Takeoff & Landing                      │    │
│  │  ✅ Straight & Level Flight                │    │
│  │  ✅ Turns (shallow, medium, steep)         │    │
│  │  ✅ Slow Flight                            │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Instructor Remarks                                │
│  ┌────────────────────────────────────────────┐    │
│  │  Good control during turns. Needs more     │    │
│  │  practice on slow flight configurations.   │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.7 Exam List

```
┌────────────────────────────────────────────────────┐
│  📝 My Exams                                       │
├────────────────────────────────────────────────────┤
│                                                    │
│  Available (1)                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  NAV-PPL-01  Aviation Navigation          │    │
│  │  30 min · 6 questions · 70% to pass       │    │
│  │  Attempts: 0/3                             │    │
│  │  ┌──────────────────────────────────┐      │    │
│  │  │          Start Exam              │      │    │
│  │  └──────────────────────────────────┘      │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Completed (1)                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  MET-PPL-01  Meteorology                  │    │
│  │  7.0/10 · ✅ Pass · 5 Jul 2026           │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.8 Exam Taking Screen

```
┌────────────────────────────────────────────────────┐
│  ←  NAV-PPL-01                          ⏱ 24:30  │
├────────────────────────────────────────────────────┤
│                                                    │
│  Question 3 of 6                    ████████░░ 50% │
│                                                    │
│  What is the standard pressure at sea level        │
│  in aviation?                                      │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  ○  1013.25 hPa (29.92 inHg)             │    │
│  ├────────────────────────────────────────────┤    │
│  │  ●  1000.00 hPa (29.53 inHg)             │    │
│  ├────────────────────────────────────────────┤    │
│  │  ○  1023.25 hPa (30.22 inHg)             │    │
│  ├────────────────────────────────────────────┤    │
│  │  ○  990.00 hPa (29.24 inHg)              │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│       ┌──────────┐      ┌──────────┐              │
│       │ Previous │      │   Next   │              │
│       └──────────┘      └──────────┘              │
│                                                    │
│       ┌──────────────────────────────┐            │
│       │        Submit Exam           │            │
│       └──────────────────────────────┘            │
└────────────────────────────────────────────────────┘
```

**Anti-Cheat Features:**
- App foreground detection (expo-task-manager)
- Tab switch warning overlay → exam pauses
- Copy/paste disabled
- Time limit enforced client-side + server-side
- Screenshot prevention (optional, iOS restriction)
- Exam state saved to MMKV (resume if app crashes)

### 8.9 Schedule Calendar

```
┌────────────────────────────────────────────────────┐
│  📅 Schedule · July 2026                           │
├────────────────────────────────────────────────────┤
│                                                    │
│  Mo   Tu   We   Th   Fr   Sa   Su                 │
│        1    2    3    4    5    6                  │
│   7    8    9   10   11   12   13                  │
│  [14]  15   16   17   18   19   20                │
│  21   22   23   24   25   26   27                 │
│  28   29   30   31                                │
│                                                    │
│  Monday, 14 July 2026                              │
│  ┌────────────────────────────────────────────┐    │
│  │ 09:00-11:00  📚 Navigation Basics         │    │
│  │               Classroom A                  │    │
│  ├────────────────────────────────────────────┤    │
│  │ 14:00-15:30  ✈️ Flight · CN-TAA           │    │
│  │               w/ Hassan Ouazzani           │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Tuesday, 15 July 2026                             │
│  ┌────────────────────────────────────────────┐    │
│  │ 10:00-11:30  📚 Weather Fundamentals      │    │
│  │               Classroom B                  │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.10 Certificates

```
┌────────────────────────────────────────────────────┐
│  🏆 My Certificates                                │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  Certificate of Completion                 │    │
│  │  PPL — Private Pilot License               │    │
│  │  #MAA-PPL-2026-001                         │    │
│  │  Issued: 01 Jun 2026                       │    │
│  │                                            │    │
│  │  ┌──────────────┐  ┌──────────────┐       │    │
│  │  │  View PDF    │  │  Share       │       │    │
│  │  └──────────────┘  └──────────────┘       │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  No other certificates yet.                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.11 Invoices

```
┌────────────────────────────────────────────────────┐
│  💰 My Invoices                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  INV-2026-0001                             │    │
│  │  PPL Training Package                      │    │
│  │  45,000 DZD · ✅ Paid                      │    │
│  │  Issued: 01 Jan 2026                       │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  INV-2026-0002                             │    │
│  │  Flight Hours (15h)                        │    │
│  │  75,000 DZD · ⏳ Issued                    │    │
│  │  Due: 15 Aug 2026                          │    │
│  │  ┌──────────────┐  ┌──────────────┐       │    │
│  │  │  View PDF    │  │  Pay Now     │       │    │
│  │  └──────────────┘  └──────────────┘       │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  INV-2026-0003                             │    │
│  │  Exam Fee — NAV-PPL-01                     │    │
│  │  15,000 DZD · ⚠️ Overdue                   │    │
│  │  Due: 01 Jul 2026                          │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.12 Messages

```
┌────────────────────────────────────────────────────┐
│  💬 Messages                        ✉️ Compose     │
├────────────────────────────────────────────────────┤
│                                                    │
│  Inbox (2)                                         │
│  ┌────────────────────────────────────────────┐    │
│  │  Flight Schedule Update                    │    │
│  │  Hassan Ouazzani · 2 hours ago             │    │
│  │  Your flight on Jul 15 has been moved...   │    │
│  ├────────────────────────────────────────────┤    │
│  │  Welcome to Navigation Basics              │    │
│  │  Karim Bensaid · 3 days ago                │    │
│  │  You have been enrolled in NAV-101...      │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.13 Notifications

```
┌────────────────────────────────────────────────────┐
│  🔔 Notifications                    Mark All Read │
├────────────────────────────────────────────────────┤
│                                                    │
│  Unread (3)                                        │
│  ┌────────────────────────────────────────────┐    │
│  │ ✈️ Flight Scheduled                       │    │
│  │ Your flight with Hassan has been           │    │
│  │ scheduled for Jul 15 at 14:00              │    │
│  │ 2 hours ago                                │    │
│  ├────────────────────────────────────────────┤    │
│  │ 📋 Course Assignment                       │    │
│  │ You have been enrolled in                  │    │
│  │ Navigation Basics (NAV-101)                │    │
│  │ 5 hours ago                                │    │
│  ├────────────────────────────────────────────┤    │
│  │ 💰 Invoice Created                         │    │
│  │ INV-2026-0002 for 75,000 DZD              │    │
│  │ Due: Aug 15, 2026                          │    │
│  │ 1 day ago                                  │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.14 Profile

```
┌────────────────────────────────────────────────────┐
│  👤 My Profile                                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐                                     │
│  │   [AV]   │  Ahmed Benali                       │
│  │          │  ahmed@student.maa.dz               │
│  └──────────┘                                     │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │  Student #       STU-001                   │    │
│  │  Program         PPL (Private Pilot)       │    │
│  │  Status          Active                    │    │
│  │  Enrolled        15 Sep 2025               │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Medical Certificate                               │
│  ┌────────────────────────────────────────────┐    │
│  │  Status:  ✅ Valid                         │    │
│  │  Issuer:  Dr. Benkirane                    │    │
│  │  Expires: 15 Mar 2027                      │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │           Edit Profile                     │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 8.15 Settings

```
┌────────────────────────────────────────────────────┐
│  ⚙️ Settings                                       │
├────────────────────────────────────────────────────┤
│                                                    │
│  Language                                          │
│  ┌────────────────────────────────────────────┐    │
│  │  ○ English (EN)                           │    │
│  │  ○ Français (FR)                          │    │
│  │  ○ العربية (AR)                           │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  Security                                          │
│  ┌────────────────────────────────────────────┐    │
│  │  Face ID Login              [Toggle: ON]  │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  About                                             │
│  ┌────────────────────────────────────────────┐    │
│  │  Version  1.0.0                           │    │
│  │  Build    2026.07.13                      │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │              Sign Out                      │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 9. API Integration Layer

### 9.1 Axios Client Setup

```ts
// ipad/lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://185.185.80.188';

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto-refresh on 401, unwrap ApiResponse
api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data?.success === true && data.data !== undefined) {
      response.data = data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/token/refresh/`, {
            refresh: refreshToken,
          });
          await storeTokens(data.access, data.refresh || refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          await clearTokens();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 9.2 API Service Modules (Student Only)

```ts
// ipad/services/auth.service.ts
export const AuthService = {
  login: (email: string, password: string) =>
    api.post('/login/', { email, password }),
  logout: () => api.post('/logout/'),
  getProfile: () => api.get('/me/'),
  updateProfile: (data: Partial<User>) => api.put('/profile/', data),
};

// ipad/services/courses.service.ts
export const CoursesService = {
  list: () => api.get('/courses/'),
  get: (id: string) => api.get(`/courses/${id}/`),
  getModules: (courseId: string) => api.get('/modules/', { params: { course: courseId } }),
};

// ipad/services/flights.service.ts
export const FlightsService = {
  list: () => api.get('/flight-lessons/'),
  get: (id: string) => api.get(`/flight-lessons/${id}/`),
};

// ipad/services/exams.service.ts
export const ExamsService = {
  list: () => api.get('/exams/'),
  get: (id: string) => api.get(`/exams/${id}/`),
  submit: (examId: string, answers: Answer[]) =>
    api.post('/quiz-attempts/', { exam: examId, answers }),
};

// ipad/services/certificates.service.ts
export const CertificatesService = {
  list: () => api.get('/certificates/'),
  get: (id: string) => api.get(`/certificates/${id}/`),
  getPdfUrl: (id: string) => `${API_BASE}/api/certificates/${id}/pdf/`,
  verify: (number: string) =>
    api.get('/student/certificates/verify/', { params: { number } }),
};

// ipad/services/invoices.service.ts
export const InvoicesService = {
  list: () => api.get('/invoices/'),
  get: (id: string) => api.get(`/invoices/${id}/`),
  getPdfUrl: (id: string) => `${API_BASE}/api/invoices/${id}/pdf/`,
};

// ipad/services/notifications.service.ts
export const NotificationsService = {
  list: () => api.get('/notifications/'),
  markRead: (id: string) => api.put(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.put('/notifications/mark_all_read/'),
};

// ipad/services/messages.service.ts
export const MessagesService = {
  list: () => api.get('/messages/'),
  getSent: () => api.get('/messages/sent/'),
  send: (data: { receiver: string; subject: string; body: string }) =>
    api.post('/messages/', data),
};

// ipad/services/schedule.service.ts
export const ScheduleService = {
  getCalendar: () => Promise.all([
    api.get('/courses/'),
    api.get('/flight-lessons/'),
  ]),
};

// ipad/services/dashboard.service.ts
export const DashboardService = {
  get: () => api.get('/student/dashboard/'),
};
```

### 9.3 API Endpoints Used (Student Only)

| Endpoint | Method | Screen | Offline Cached |
|----------|--------|--------|:---:|
| `/api/login/` | POST | Login | No |
| `/api/token/refresh/` | POST | Auto-refresh | No |
| `/api/me/` | GET | Profile, Header | Yes |
| `/api/profile/` | PUT | Profile edit | Queue |
| `/api/logout/` | POST | Logout | No |
| `/api/student/dashboard/` | GET | Dashboard | Yes |
| `/api/courses/` | GET | Course list | Yes |
| `/api/courses/{id}/` | GET | Course detail | Yes |
| `/api/modules/` | GET | Course modules | Yes |
| `/api/flight-lessons/` | GET | Flight list | Yes |
| `/api/flight-lessons/{id}/` | GET | Flight detail | Yes |
| `/api/exams/` | GET | Exam list | Yes |
| `/api/exams/{id}/` | GET | Exam questions | Yes |
| `/api/quiz-attempts/` | POST | Submit exam | Queue |
| `/api/certificates/` | GET | Certificate list | Yes |
| `/api/certificates/{id}/pdf/` | GET | PDF viewer | No |
| `/api/invoices/` | GET | Invoice list | Yes |
| `/api/invoices/{id}/` | GET | Invoice detail | Yes |
| `/api/invoices/{id}/pdf/` | GET | PDF viewer | No |
| `/api/notifications/` | GET | Notification list | Yes |
| `/api/notifications/{id}/mark_read/` | PUT | Mark read | Queue |
| `/api/notifications/mark_all_read/` | PUT | Mark all read | Queue |
| `/api/messages/` | GET | Inbox | Yes |
| `/api/messages/sent/` | GET | Sent | Yes |
| `/api/messages/` | POST | Send message | Queue |
| `/api/medical-certificates/` | GET | Profile medical | Yes |
| `/api/attendance/` | GET | Course attendance | Yes |
| `/api/search/` | GET | Global search | No |

---

## 10. State Management

### 10.1 Auth Store (Zustand)

```ts
// ipad/store/auth-store.ts
import { create } from 'zustand';
import { getUser, storeUser, clearTokens } from '@/lib/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    storeUser(user);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await clearTokens();
    // MMKV user cleared separately
    set({ user: null, isAuthenticated: false });
  },

  hydrate: () => {
    const user = getUser();
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
}));
```

### 10.2 TanStack Query Config

```ts
// ipad/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 30 * 60 * 1000,        // 30 minutes
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 10.3 Example Hooks

```tsx
// ipad/hooks/useStudentDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '@/services/dashboard.service';

export function useStudentDashboard() {
  return useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => DashboardService.get().then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

// ipad/hooks/useCourses.ts
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => CoursesService.list().then(r => r.data),
  });
}

// ipad/hooks/useFlightLessons.ts
export function useFlightLessons() {
  return useQuery({
    queryKey: ['flight-lessons'],
    queryFn: () => FlightsService.list().then(r => r.data),
  });
}
```

---

## 11. Offline Support & Data Sync

### 11.1 Network Detection

```ts
// ipad/hooks/useOffline.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setIsOffline(!s.isConnected));
    return () => unsub();
  }, []);
  return { isOffline };
}
```

### 11.2 Cache Strategy (Student Data)

| Data | Cache Duration | Priority | Why |
|------|---------------|----------|-----|
| Dashboard KPIs | 5 min | High | Primary landing screen |
| Course list | 30 min | Medium | Changes rarely mid-day |
| Course modules | 30 min | Medium | Static during session |
| Flight lessons | 5 min | High | Schedule changes |
| Exam questions | Until submitted | Critical | Must survive offline |
| Certificates | 24 hours | Low | Never changes mid-day |
| Invoices | 1 hour | Low | Changes rarely |
| Notifications | 2 min | High | Real-time updates |
| Messages | 10 min | Medium | Moderate frequency |
| Medical cert | 24 hours | Low | Static |
| Attendance | 1 hour | Low | Read-only for student |
| Schedule | 15 min | Medium | Changes occasionally |

### 11.3 Offline Queue (Writes Only)

When offline, write operations queue in MMKV and sync when reconnected:

```ts
// ipad/store/sync-store.ts
interface SyncAction {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount: number;
}
```

**Student write operations that queue offline:**
- Submit exam answers
- Mark notifications as read
- Send messages
- Update profile

### 11.4 Offline UI Indicators

```
┌────────────────────────────────────────┐
│  ⚠️ Offline — showing cached data     │
│  Last synced: 2 min ago                │
└────────────────────────────────────────┘
```

When reconnected:
```
┌────────────────────────────────────────┐
│  ✅ Synced — all data up to date      │
└────────────────────────────────────────┘
```

---

## 12. Internationalization

### 12.1 Setup

```ts
// ipad/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocale, storeLocale } from './storage';
import en from '@/assets/locales/en/common.json';
import fr from '@/assets/locales/fr/common.json';
import ar from '@/assets/locales/ar/common.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr }, ar: { translation: ar } },
  lng: getLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### 12.2 Language Switching

```ts
// ipad/hooks/useTranslation.ts
import { useTranslation as useI18n } from 'react-i18next';
import { storeLocale } from '@/lib/storage';
import { I18nManager } from 'react-native';

export function useTranslation() {
  const { t, i18n } = useI18n();
  const switchTo = (locale: 'en' | 'fr' | 'ar') => {
    i18n.changeLanguage(locale);
    storeLocale(locale);
    const isRTL = locale === 'ar';
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  };
  return { t, locale: i18n.language, switchTo };
}
```

### 12.3 RTL Support

- Arabic triggers full RTL layout flip
- Tab bar mirrors (icons on right)
- Text alignment flips
- Back button moves to right
- Calendar week starts on Monday (consistent across languages)

---

## 13. Push Notifications

### 13.1 Expo Push Setup

```ts
// ipad/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id',
  });
  // Register token with backend
  await api.post('/device-tokens/', {
    token: token.data,
    platform: Platform.OS,
  });
}
```

### 13.2 Notification Types Students Receive

| Trigger | Title | Example |
|---------|-------|---------|
| Flight scheduled | Flight Scheduled | "Your flight with Hassan on Jul 15 at 14:00" |
| Flight evaluated | Flight Graded | "Your flight graded: 8.5/10 (Pass)" |
| Exam result | Exam Result | "You scored 8.5/10 on NAV-PPL-01 (Pass)" |
| Course scheduled | Course Update | "NAV-101 class moved to Classroom B" |
| Invoice created | New Invoice | "INV-2026-0002 for 75,000 DZD" |
| Document expiring | Document Expiring | "Medical certificate expires in 30 days" |
| Certificate issued | Certificate Ready | "Your PPL certificate is ready" |
| Message received | New Message | "Message from Hassan Ouazzani" |

---

## 14. PDF Viewing & Export

### 14.1 PDF Viewer

```tsx
// ipad/components/pdf/PDFViewer.tsx
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';

export function PDFViewer({ url }: { url: string }) {
  return (
    <Pdf
      source={{ uri: url }}
      style={{ flex: 1 }}
      onLoadComplete={(n) => console.log(`PDF loaded: ${n} pages`)}
      onError={(e) => console.error('PDF error:', e)}
    />
  );
}

export async function sharePDF(url: string, filename: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(url, { mimeType: 'application/pdf', dialogTitle: filename });
  }
}
```

### 14.2 Available PDFs for Students

| PDF | Endpoint | How to Access |
|-----|----------|---------------|
| Certificate | `/api/certificates/{id}/pdf/` | Certificates screen → "View PDF" |
| Invoice | `/api/invoices/{id}/pdf/` | Invoices screen → "View PDF" |
| Flight Logbook | `/api/students/flight-log/` | Dashboard → flight hours link |

---

## 15. Calendar & Scheduling

### 15.1 Calendar Component

```tsx
// ipad/components/calendar/ScheduleCalendar.tsx
import { Calendar, DateData } from 'react-native-calendars';
import { colors } from '@/constants/colors';

export function ScheduleCalendar({ events, onDayPress }) {
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    events.forEach(e => {
      marks[e.date] = { marked: true, dotColor: e.type === 'flight' ? '#3b82f6' : colors.gold[500] };
    });
    return marks;
  }, [events]);

  return (
    <Calendar
      markedDates={markedDates}
      onDayPress={onDayPress}
      theme={{
        backgroundColor: colors.navy[900],
        calendarBackground: colors.navy[900],
        textSectionTitleColor: colors.text.secondary,
        selectedDayBackgroundColor: colors.gold[500],
        todayTextColor: colors.gold[500],
        dayTextColor: colors.text.primary,
        arrowColor: colors.gold[500],
      }}
    />
  );
}
```

### 15.2 Events Merged from Two Sources

The schedule merges:
- **Courses** from `/api/courses/` → `scheduled_date` + `start_time`/`end_time`
- **Flights** from `/api/flight-lessons/` → `scheduled_date` + instructor + aircraft

---

## 16. Charts & Data Visualization

### 16.1 Skill Progress Bars (Dashboard)

```
Navigation      ████████████░░░  80%
Meteorology     ██████████████░  93%
Regulation      ████████░░░░░░░  53%
Communication   ██████████░░░░░  67%
```

### 16.2 Radar Chart (Optional — for larger iPads)

```tsx
// ipad/components/charts/ProgressRadar.tsx
// Use react-native-chart-kit or custom SVG for radar
// Simple bar representation recommended for readability
```

### 16.3 Flight Hours Over Time

```
Hours
 20 ┤
 15 ┤         ╭──╮
 10 ┤    ╭────╯  ╰──╮
  5 ┤────╯           ╰──
  0 ┼────────────────────
    Jan  Feb  Mar  Apr  May  Jun
```

---

## 17. Exam Taking Experience

### 17.1 Anti-Cheat System

```tsx
// ipad/components/exam/AntiCheatOverlay.tsx
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Modal, View, Text } from 'react-native';

export function AntiCheatOverlay({ onPause, onResume }) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setIsPaused(true);
        onPause();
      } else if (isPaused) {
        setIsPaused(false);
        onResume();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Modal visible={isPaused} transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ef4444', fontSize: 24, fontWeight: 'bold' }}>⚠️ Exam Paused</Text>
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Do not leave the exam screen</Text>
        <Text style={{ color: '#94a3b8', marginTop: 4 }}>Return to the exam to continue</Text>
      </View>
    </Modal>
  );
}
```

### 17.2 Exam State Persistence

Exam progress saves to MMKV every answer change:
```ts
// If app crashes or is killed, student can resume
const savedState = mmkv.getString(`exam_${examId}`);
if (savedState) {
  // Resume from last saved question
}
```

### 17.3 Exam Timer

- 30-minute countdown (or per exam config)
- Timer pauses when app is backgrounded
- Warning at 5 minutes remaining
- Auto-submit when time runs out
- Timer state saved to MMKV

---

## 18. Camera & Document Scanning

### 18.1 Use Cases

| Feature | Camera Use |
|---------|-----------|
| Medical certificate | Photograph/scan document for upload |
| Profile photo | Take profile picture |
| Document upload | Attach files to messages |

### 18.2 Implementation

```tsx
import * as ImagePicker from 'expo-image-picker';

export async function pickFromCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  return result.canceled ? null : result.assets[0].uri;
}

export async function pickFromGallery() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  return result.canceled ? null : result.assets[0].uri;
}
```

---

## 19. Biometric Authentication

### 19.1 Flow

```
Login Screen → Check if biometric enabled
  ├─ Yes → Show Face ID button → Authenticate → Auto-login
  └─ No  → Show email/password form
             └─ After login → Ask "Enable Face ID?"
                ├─ Yes → Authenticate → Store preference
                └─ No  → Continue
```

### 19.2 Storage

```ts
// Biometric preference stored in SecureStore
await SecureStore.setItemAsync('biometric_enabled', 'true');
// Remembered email stored in MMKV (non-sensitive)
mmkv.set('remembered_email', email);
// Password NOT stored — use refresh token for silent auth
```

---

## 20. Performance Optimization

### 20.1 Lists

```tsx
// Use FlashList for all scrollable lists
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={courses}
  renderItem={({ item }) => <CourseCard course={item} />}
  estimatedItemSize={120}
  keyExtractor={(item) => item.id}
/>
```

### 20.2 Images

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: avatarUrl }}
  placeholder={blurHash}
  contentFit="cover"
  transition={300}
  cachePolicy="memory-disk"
/>
```

### 20.3 Memoization

```tsx
const sortedFlights = useMemo(() =>
  [...flights].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)),
  [flights]
);
```

### 20.4 Bundle

- Hermes engine (default in Expo 52+)
- Lazy-load exam screen (heavy)
- Tree-shake unused libraries
- Use `@expo/vector-icons` tree-shaking

---

## 21. Testing Strategy

### 21.1 Unit Tests

| Area | Tests |
|------|-------|
| API client | Token refresh, 401 handling, response unwrap |
| Auth store | Login, logout, hydrate, role gate |
| Storage | MMKV read/write, SecureStore encrypt |
| Validators | Zod schemas (shared with web) |
| Formatters | Date, currency, number |
| Sync queue | Add, process, retry, clear |

### 21.2 Component Tests

| Screen | Tests |
|--------|-------|
| Login | Valid/invalid creds, biometric prompt, role rejection |
| Dashboard | Data rendering, KPI cards, loading states |
| Courses | List rendering, detail navigation, module progress |
| Exams | Question navigation, timer, anti-cheat, submit |
| Schedule | Calendar rendering, event dots, day detail |

### 21.3 Integration Tests

| Flow | What to Test |
|------|-------------|
| Login → Dashboard | Full auth flow |
| Course list → Detail → Modules | Navigation stack |
| Exam → Questions → Submit → Results | Complete exam flow |
| Offline → Reconnect → Sync | Queue processing |
| Language switch → RTL flip | i18n integration |

### 21.4 E2E Tests (Maestro)

```yaml
appId: com.masterly.airacademy
---
- launchApp
- inputText: "ahmed@student.maa.dz"
- tapOn: "Password"
- inputText: "student123"
- tapOn: "Sign In"
- assertVisible: "Welcome, Ahmed"
- tapOn: "Courses"
- assertVisible: "Navigation Basics"
- tapOn: "Flights"
- assertVisible: "My Flights"
```

---

## 22. Build & Deployment

### 22.1 EAS Build

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": { "simulator": false }
    }
  }
}
```

### 22.2 Build Commands

```bash
# Dev build
eas build --platform ios --profile development

# Preview (internal testing)
eas build --platform ios --profile preview

# Production (App Store)
eas build --platform ios --profile production

# OTA update (no rebuild)
eas update --branch production --message "Bug fix"
```

### 22.3 Deployment Options

| Method | Best For | Cost |
|--------|----------|------|
| **App Store** | Public distribution | $99/year Apple Dev |
| **TestFlight** | Internal testing (up to 10k) | Free with Apple Dev |
| **Apple Business Manager** | On-premise school iPads | $299/year |
| **MDM (Jamf, Mosyle)** | Managed school devices | Varies |
| **Ad Hoc** | Up to 100 specific devices | Free with Apple Dev |

**Recommended for on-premise school iPads:** Apple Business Manager + MDM — deploy directly to managed devices without App Store review.

### 22.4 OTA Updates

```bash
# Push update without App Store review
eas update --branch production --message "Fix exam timer"

# Rollback
eas update --branch production --rollback
```

---

## 23. Backend Changes Required

### 23.1 Device Token Model (New)

```python
# apps/notifications/models.py
class DeviceToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_tokens')
    token = models.CharField(max_length=500, unique=True)
    platform = models.CharField(max_length=20)  # ios
    device_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 23.2 Device Token ViewSet

```python
# apps/notifications/views.py
class DeviceTokenViewSet(viewsets.ModelViewSet):
    queryset = DeviceToken.objects.all()
    serializer_class = DeviceTokenSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```

### 23.3 Push Notification Sending

```python
# apps/notifications/services.py
EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

@staticmethod
def send_push_to_user(user, title, body, data=None):
    tokens = DeviceToken.objects.filter(user=user, is_active=True)
    messages = [{
        'to': dt.token,
        'title': title,
        'body': body,
        'data': data or {},
        'sound': 'default',
        'badge': 1,
    } for dt in tokens]
    if messages:
        requests.post(EXPO_PUSH_URL, json=messages)
```

### 23.4 URL Registration

```python
# config/api_urls.py
router.register(r'device-tokens', DeviceTokenViewSet)
```

### 23.5 CORS (Already Compatible)

The iPad app runs on the same LAN server — no CORS changes needed. The existing `CORS_ALLOWED_ORIGINS` covers the server IP.

---

## 24. Development Phases

### Phase 1: Foundation (Weeks 1-2)

| Task | Hours |
|------|-------|
| Initialize Expo project | 4 |
| TypeScript + ESLint + Prettier | 2 |
| Project structure setup | 4 |
| Axios client + interceptors | 6 |
| Auth store (Zustand + MMKV) | 4 |
| Login screen | 6 |
| Biometric auth | 3 |
| Root + tab navigation | 4 |
| i18n setup (3 locales) | 4 |
| **Subtotal** | **37** |

### Phase 2: Core Student Screens (Weeks 3-5)

| Task | Hours |
|------|-------|
| Student dashboard | 8 |
| Course list + detail | 8 |
| Flight list + detail | 6 |
| Exam list + taking interface | 10 |
| Anti-cheat system | 6 |
| Exam timer + state persistence | 4 |
| Schedule calendar | 6 |
| Certificate list + PDF viewer | 4 |
| Invoice list + detail + PDF | 4 |
| **Subtotal** | **56** |

### Phase 3: Communication & Profile (Week 6)

| Task | Hours |
|------|-------|
| Notification center | 4 |
| Message inbox + compose | 6 |
| Profile screen + medical status | 4 |
| Settings screen | 3 |
| **Subtotal** | **17** |

### Phase 4: Offline & Polish (Weeks 7-8)

| Task | Hours |
|------|-------|
| Network detection | 2 |
| Offline queue (MMKV) | 4 |
| Cache strategy per data type | 3 |
| Sync manager | 4 |
| Offline UI indicators | 2 |
| Push notifications (Expo) | 4 |
| Device token registration | 2 |
| Error handling + retry | 3 |
| Loading skeletons | 3 |
| Empty states | 2 |
| **Subtotal** | **29** |

### Phase 5: Testing & Deployment (Weeks 9-10)

| Task | Hours |
|------|-------|
| Unit tests | 6 |
| Component tests | 6 |
| Integration tests | 4 |
| E2E tests (Maestro) | 4 |
| Performance optimization | 3 |
| Accessibility audit | 3 |
| EAS Build config | 2 |
| App Store / ABM submission | 3 |
| **Subtotal** | **31** |

### Total Estimate

| Phase | Hours | Weeks |
|-------|-------|-------|
| Foundation | 37 | 1-2 |
| Core Screens | 56 | 3-5 |
| Communication | 17 | 6 |
| Offline & Polish | 29 | 7-8 |
| Testing & Deployment | 31 | 9-10 |
| **Total** | **170** | **~10 weeks** |

---

## 25. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Exam anti-cheat not strict enough | High | Medium | App foreground detection + server-side timer |
| Offline exam submission conflicts | High | Low | Exams are one-shot, queue with retry |
| App Store rejection | Medium | Low | Follow Apple guidelines, prepare early |
| LAN connectivity drops | Medium | High | Aggressive caching, offline-first design |
| iPad hardware variations | Low | Medium | Test on multiple models |
| Battery drain from sync | Medium | Low | Limit background refresh, use silent push |
| Shared code drift (web vs iPad) | Medium | Medium | Create shared npm package |
| Student tries to access admin features | Low | Low | Role gate at login + no admin screens |
| Expo SDK breaking changes | Medium | Low | Pin SDK version |
| Arabic RTL layout issues | Medium | Medium | Test RTL thoroughly, use I18nManager |

---

## Appendix A: iPad Model Compatibility

| iPad Model | iOS | Status |
|------------|-----|--------|
| iPad Pro 12.9" (M2/M4) | iOS 17+ | Fully supported |
| iPad Pro 11" (M2/M4) | iOS 17+ | Fully supported |
| iPad Air (M1/M2) | iOS 17+ | Fully supported |
| iPad (10th gen) | iOS 17+ | Fully supported |
| iPad mini (6th gen) | iOS 17+ | Fully supported |
| iPad (9th gen) | iOS 16+ | Supported |

## Appendix B: Environment Variables

```bash
# ipad/.env
EXPO_PUBLIC_API_URL=http://185.185.80.188
EXPO_PROJECT_ID=your-expo-project-id
```

---

*This document covers every aspect of building the student-only iPad app. Start with Phase 1 and iterate through each phase. The app consumes the same Django API — no backend duplication needed, only a small DeviceToken model for push notifications.*
