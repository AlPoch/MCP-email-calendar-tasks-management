# MCP Email, Calendar & Tasks Management

This project is a powerful **MCP (Model Context Protocol) Server** designed to fully integrate your email, calendar, and tasks with AI models (such as ChatGPT, Claude, and others).

[![Русский](https://img.shields.io/badge/lang-ru-red.svg)](README.ru.md)
[![Deutsch](https://img.shields.io/badge/lang-de-gold.svg)](README.de.md)

## 🚀 Key Features

### 🤖 AI Integration (ChatGPT & Others)
Gives your AI assistant "hands" to manage your digital life:
- **Smart Search**: Ask the AI to find important emails, meetings, or tasks.
- **Automated Replies**: AI can draft or send replies in your specific style.
- **Summaries**: Get quick summaries of long email threads or your daily agenda.

### 📧 Email Management (Multi-Email Support)
Full support for multiple mailboxes simultaneously:
- **Any Provider**: Support for GMX, Gmail, Outlook, and others via IMAP/SMTP.
- **Dynamic Configuration**: Add unlimited accounts through `.env` using a generic format.
- **Secure**: Supports SSL/TLS and STARTTLS. Uses App Passwords for Google accounts.
- **Auto-Sorting**: Move unimportant emails to a dedicated folder (e.g., `GPTAussortiert`).

### 📅 Calendar & Tasks
Full synchronization with **Google Calendar** and **Google Tasks**:
- **Scheduling**: Create, edit, and delete events via natural language.
- **Task Lists**: Manage your to-dos and shopping lists.
- **Reminders**: Stay on top of your schedule with direct Google service integration.

## 🛠 Tech Stack
- **Runtime**: Node.js & TypeScript
- **Protocol**: Model Context Protocol (MCP)
- **Email**: imap-simple & nodemailer
- **Google API**: Google APIs Node.js Client
- **Server**: Express with SSE & ngrok support.

## 📦 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AlPoch/MCP-email-calendar-tasks-management.git
   ```

2. **Setup Environment**:
   Copy `mcp-server/.env.example` to `mcp-server/.env` and fill in your credentials.

3. **Install dependencies**:
   ```bash
   cd mcp-server
   npm install
   ```

4. **Run the server**:
   
   **Development mode** (auto-reload):
   ```bash
   npm run dev
   ```
   
   **Production mode** (build & start):
   ```bash
   npm run build
   npm run start
   ```

## 💎 Why use this?
Instead of switching between email tabs, calendars, and task managers, you interact with everything in one window. You can say: *"Find the email from Alex about the contract, schedule a meeting for Thursday, and add 'buy champagne' to my shopping list"*. This project makes it happen!

---
Developed with ❤️ to automate your productivity.
