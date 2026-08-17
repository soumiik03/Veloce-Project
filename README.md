# 🚀 Veloce

### AI-Powered Email & Calendar Workspace

Veloce is an AI-powered workspace assistant that brings **email, calendar, and daily commitments into one intelligent interface**.

Instead of constantly switching between Gmail, Google Calendar, and productivity tools, Veloce lets you interact with your workday through **natural language** — helping you find important emails, manage meetings, track commitments, and start your day with a personalized briefing.

> **Your inbox, calendar, and commitments — one intelligent workspace.**

---

## ✨ What Veloce Does

### 📧 Intelligent Email Management

Manage your inbox without manually digging through hundreds of emails.

* Read and summarize emails
* Identify high-priority conversations
* Search emails using natural language
* Draft and send emails with AI assistance
* Surface emails that require your attention

### 📅 AI Calendar Assistant

Stay on top of your schedule without constantly switching to Google Calendar.

* View upcoming meetings
* Access meeting details
* Schedule and manage events
* Check calendar availability
* Understand your schedule through natural language

### 🌅 Daily Morning Briefing

Start every morning with a concise overview of what actually matters.

Veloce generates a personalized briefing containing:

* 🔴 Top emails requiring your attention
* 📅 Today's meetings and relevant context
* ⏳ Pending commitments and follow-ups
* 🎯 Important deadlines
* 💡 One actionable recommendation for the day

The goal is simple: **know what needs your attention before your day gets busy.**

### 🤖 AI Workspace Assistant

Interact with your workspace using natural language instead of navigating through multiple applications.

Veloce provides:

* Natural language interaction
* Context-aware responses
* Unified email and calendar access
* Personalized productivity assistance
* AI-powered workflow automation

---

## 🧠 Why Veloce?

Modern work is fragmented across multiple applications.

You check Gmail for emails, Google Calendar for meetings, another tool for tasks, and your memory for commitments.

Veloce brings these workflows together.

```text
                 ┌─────────────────────┐
                 │       Veloce        │
                 │   AI Workspace      │
                 └──────────┬──────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        ┌─────▼─────┐               ┌─────▼─────┐
        │   Gmail   │               │  Calendar │
        └───────────┘               └───────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                   ┌────────▼────────┐
                   │ AI + Context    │
                   │ + Automation    │
                   └─────────────────┘
```

The result is a single workspace that helps users **understand, prioritize, and act on their work.**

---

## 🛠️ Tech Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Framework        | Next.js               |
| Language         | TypeScript            |
| Styling          | Tailwind CSS          |
| Database         | PostgreSQL            |
| Database Hosting | Neon                  |
| ORM              | Drizzle ORM           |
| Authentication   | Clerk                 |
| Email            | Gmail                 |
| Calendar         | Google Calendar       |
| Integrations     | Corsair               |
| AI               | LLM-powered workflows |
| Deployment       | Vercel                |

---

## 🏗️ Architecture

Veloce is built around a unified AI workspace that connects external productivity services with application data and AI-powered workflows.

```text
User
 │
 ▼
Veloce UI
 │
 ▼
Next.js Application
 │
 ├── AI Workspace
 │     └── LLM-powered workflows
 │
 ├── Email Integration
 │     └── Gmail
 │
 ├── Calendar Integration
 │     └── Google Calendar
 │
 └── Application Data
       └── PostgreSQL + Drizzle
```

Authentication and external service integrations are handled through **Clerk and Corsair**, while PostgreSQL provides persistent application storage.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/veloce.git
cd veloce
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
DATABASE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

OPENROUTER_API_KEY=
```

> Make sure all required credentials are configured before starting the application.

### 4. Push the database schema

```bash
npx drizzle-kit push
```

### 5. Start the development server

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

---

## 🎯 Problem

Knowledge workers spend a significant amount of time switching between communication and productivity tools.

Important emails can get buried.

Meetings can lack preparation.

Follow-ups and commitments can easily be forgotten.

The problem isn't a lack of information — **it's the friction involved in managing it.**

---

## 💡 Solution

Veloce acts as an intelligent layer over your existing productivity workflow.

Instead of asking users to manually navigate through multiple applications, Veloce helps them:

**Understand → Prioritize → Act**

It combines email and calendar context with AI-powered assistance to reduce workflow friction and help users focus on the work that actually matters.

---

## 🔮 Roadmap

### Planned

* [ ] Multi-account support
* [ ] Slack integration
* [ ] AI-generated meeting preparation
* [ ] Automatic follow-up actions
* [ ] Smarter commitment tracking
* [ ] Team collaboration
* [ ] Mobile application

---

## 🏆 Built For

Veloce is designed for people who live in their inbox and calendar:

* 👨‍💻 Developers
* 🎓 Students
* 🚀 Founders
* 💼 Professionals
* 👥 Teams
* ⚡ Productivity enthusiasts

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome.

If you find a bug or have an idea for improving Veloce, feel free to open an issue or submit a pull request.

---

## 📄 License

This project is currently for educational and experimental purposes.

---

<div align="center">

### ⚡ Veloce

**Work less on managing your work.**

Built with ❤️ using Next.js, PostgreSQL, Drizzle, Clerk, and Corsair.

</div>
