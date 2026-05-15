# CodeHaven Education AI

CodeHaven Education AI is an **AI Learning Intelligence System** for BCS candidates, academic students, coaching centers, and educational institutions.

It provides AI-powered exam generation, exam operations, learner analytics, weakness detection, role-based dashboards, and admin management tools.

## Core Product Functions
 
### 1) Public Website
- Premium homepage with Bangla content and product positioning.
- Public navigation and footer across main public pages.
- Contact guidance for account opening (manual account provisioning).
- SEO metadata, Open Graph, Twitter image generation, robots, and sitemap.

### 2) Authentication & Access Control
- Secure login for both admins and learners.
- Session-based auth with server-side guards.
- Role-based route protection:
  - Admin-only pages under `/admin`
  - User-only pages under `/dashboard`
- Logout and password change support.

### 3) Smart Exam Experience (Learner Side)
- Subject-based smart MCQ exam generation.
- Timed exam-taking interface.
- Exam attempt submission and scoring.
- Attempt history loading and review.
- AI-powered post-exam review (summary, strengths, weaknesses, improvements).

### 4) Exam System (Published Quiz Exams)
- Published exam listing (`/exam`) with status handling.
- Exam start/progress/submit flow via APIs.
- Leaderboard endpoints for exam rankings.
- Result page with analytics charts.

### 5) User Dashboard
- Personal dashboard with performance analytics.
- Weak subject/topic insights from attempt data.
- User leaderboard view.
- Account password management.

### 6) Admin Dashboard & Management
- Admin overview dashboard.
- Quiz management:
  - Create quizzes
  - View quizzes
  - Delete quizzes
  - Timing/status monitoring
- Question bank management.
- Results analytics view.
- Leaderboard analytics view.
- User management and reset-password actions.
- Subject management endpoints.

### 7) AI & Data Intelligence
- AI MCQ generation pipelines.
- Embedding generation for retrieval workflows.
- Similarity search integration with Pinecone.
- Response parsing and validation.
- Weakness detection and AI recommendation logic.

### 8) Upload & Question Bank Ingestion
- Admin upload endpoint for MCQ ingestion.
- Supports CSV/XLSX workflows.
- Row-level validation and normalization.
- Subject auto-linking/management during ingestion.

### 9) Analytics & Visualization
- Dashboard analytics (user and admin sides).
- Custom chart components for trend, area, bar, real-time charts.
- Performance trend, weak-topic analysis, and accuracy visualization.

### 10) SEO & Sharing
- Site-level metadata in app layout.
- Dynamic Open Graph image (`/opengraph-image`).
- Dynamic Twitter image (`/twitter-image`).
- `robots.txt` via metadata conventions.
- `sitemap.xml` via metadata conventions.

## Main Route Map

### Public
- `/` Home
- `/login` Login
- `/exam` Exam listing
- `/smart-exam` Smart exam app

### Learner (Protected)
- `/dashboard`
- `/dashboard/leaderboard`
- `/dashboard/password`

### Admin (Protected)
- `/admin`
- `/admin/quizzes`
- `/admin/quizzes/create`
- `/admin/questions`
- `/admin/results`
- `/admin/leaderboard`
- `/admin/users`
- `/admin/mcq-bulider`

### System Pages
- Global error page
- Global not-found page

## API Capabilities (High-Level)

- Auth APIs: login, logout, me, change-password
- Exam APIs: list, start, progress, submit, leaderboard
- Attempt APIs: save/read attempts
- Admin APIs: quizzes, questions, users, results, leaderboard, subjects, upload
- AI APIs: MCQ generation, BCS generation, similarity, save-generated

## Tech Stack

- **Framework:** Next.js App Router (TypeScript)
- **UI:** Tailwind CSS + shadcn/ui
- **Animation:** Framer Motion
- **DB:** Postgres with Drizzle ORM
- **AI:** OpenAI SDK integration
- **Vector DB:** Pinecone

## Environment Notes

Create `.env` from `.env.example` and provide required secrets/keys (database, auth, AI, vector DB).

Optional public contact link used in homepage/login contact CTA:

```env
NEXT_PUBLIC_CONTACT_URL=https://codehaveneduai.com/contact
```

## Run Locally

```bash
pnpm install
pnpm dev
```

Open: `http://localhost:3000`

## Build & Quality

```bash
pnpm exec eslint .
pnpm build
```
