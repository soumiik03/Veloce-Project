# 🚀 Veloce

**AI-Powered Email & Calendar Assistant**

Veloce is an AI-powered workspace assistant that helps users manage emails, meetings, and daily commitments through natural language. Instead of switching between Gmail and Google Calendar, users can interact with a single AI assistant to organize their workday efficiently.

## ✨ Features

### 📧 Smart Email Management

* Read and summarize emails
* Prioritize important conversations
* Draft and send emails using AI
* Search emails using natural language

### 📅 Intelligent Calendar Assistant

* View upcoming events
* Schedule and manage meetings
* Access meeting details instantly
* Coordinate calendar availability

### 🌅 Daily Morning Briefing

Every morning, Veloce generates a personalized briefing containing:

* Top emails requiring attention
* Today's meetings with relevant context
* Pending commitments and follow-ups
* Important deadlines
* Actionable recommendations for the day

### 🤖 AI Workspace Assistant

* Natural language interface
* Unified access to email and calendar data
* Context-aware responses
* Personalized productivity assistance

## 🛠️ Tech Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* Next.js Server Actions
* PostgreSQL (Neon)
* Drizzle ORM

### Authentication

* Clerk

### Integrations

* Gmail
* Google Calendar
* Corsair

### AI

* LLM-powered workflow automation

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/yourusername/veloce.git
cd veloce
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

OPENROUTER_API_KEY=
```

### Run Database Migrations

```bash
npx drizzle-kit push
```

### Start Development Server

```bash
npm run dev
```

## 🎯 Problem Statement

Modern professionals spend significant time switching between email, calendar, and productivity tools. Important emails get missed, meetings lack preparation, and commitments slip through the cracks.

## 💡 Solution

Veloce unifies email and calendar workflows into a single AI-powered assistant that proactively helps users stay organized, prioritize tasks, and prepare for their day through intelligent automation and personalized insights.

## 🔮 Future Roadmap

* Multi-account support
* Slack integration
* Meeting preparation briefs
* AI-generated follow-up actions
* Team collaboration features
* Mobile application

## 🏆 Built For

Hackathons, productivity enthusiasts, students, professionals, founders, and teams looking to reduce workflow friction and increase productivity.

---

Made with ❤️ using Next.js, Neon, Drizzle, Clerk, and Corsair.
