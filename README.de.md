# MCP Email-, Kalender- & Aufgabenmanagement

Dieses Projekt ist ein leistungsstarker **MCP-Server (Model Context Protocol)**, der entwickelt wurde, um Ihre E-Mails, Kalender und Aufgaben vollständig in KI-Modelle (wie ChatGPT, Claude und andere) zu integrieren.

[![English](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![Русский](https://img.shields.io/badge/lang-ru-red.svg)](README.ru.md)

## 🚀 Hauptmerkmale

### 🤖 KI-Integration (ChatGPT & andere)
Verleiht Ihrem KI-Assistenten „Hände“, um Ihr digitales Leben zu verwalten:
- **Intelligente Suche**: Bitten Sie die KI, wichtige E-Mails, Termine oder Aufgaben zu finden.
- **Automatische Antworten**: Die KI kann E-Mails in Ihrem Stil entwerfen oder direkt versenden.
- **Zusammenfassungen**: Erhalten Sie kurze Zusammenfassungen langer E-Mail-Verläufe oder Ihre heutige Agenda.

### 📧 E-Mail-Management (Multi-Konto-Support)
Vollständige Unterstützung für mehrere Postfächer gleichzeitig:
- **Alle Anbieter**: Unterstützung für GMX, Gmail, Outlook und andere via IMAP/SMTP.
- **Dynamische Konfiguration**: Fügen Sie unbegrenzte Konten über `.env` in einem generischen Format hinzu.
- **Sicher**: Unterstützt SSL/TLS und STARTTLS. Verwendet App-Passwörter für Google-Konten.
- **Sortierung**: Verschieben Sie unwichtige E-Mails automatisch in einen speziellen Ordner (z. B. `GPTAussortiert`).

### 📅 Kalender & Aufgaben
Vollständige Synchronisation mit **Google Calendar** und **Google Tasks**:
- **Terminplanung**: Erstellen, bearbeiten und löschen Sie Ereignisse per natürlicher Sprache.
- **Aufgabenlisten**: Verwalten Sie Ihre To-dos und Einkaufslisten.
- **Erinnerungen**: Behalten Sie Ihren Zeitplan dank direkter Google-Integration immer im Blick.

## 🛠 Tech-Stack
- **Runtime**: Node.js & TypeScript
- **Protokoll**: Model Context Protocol (MCP)
- **E-Mail**: imap-simple & nodemailer
- **Google API**: Google APIs Node.js Client
- **Server**: Express mit SSE & ngrok-Unterstützung.

## 📦 Schnellstart

1. **Repository klonen**:
   ```bash
   git clone https://github.com/AlPoch/MCP-email-calendar-tasks-management.git
   ```

2. **Umgebung einrichten**:
   Kopieren Sie `mcp-server/.env.example` nach `mcp-server/.env` und füllen Sie Ihre Daten aus.

3. **Abhängigkeiten installieren**:
   ```bash
   cd mcp-server
   npm install
   ```

4. **Server starten**:

   **Entwicklungsmodus**:
   ```bash
   npm run dev
   ```

   **Produktionsmodus** (Kompilieren & Starten):
   ```bash
   npm run build
   npm run start
   ```

## 💎 Warum das Ganze?
Anstatt zwischen E-Mail-Tabs, Kalendern und Aufgabenplanern hin und her zu wechseln, interagieren Sie mit allem in einem einzigen Fenster. Sie können die KI bitten, eine komplexe Folge von Aktionen mit einer einzigen Nachricht auszuführen.

### Anwendungsbeispiele:

**1. Komplexe Terminplanung:**
> *"Suche einen freien Termin am 24. Februar gegen 14:00 Uhr. Erstelle ein Kalenderereignis um 13:45 Uhr mit dem Titel 'Business-Lunch mit Partnern'. Lade max.mustermann@example.com und erika.mustermann@example.org ein. Lege als Ort das Restaurant 'Main Street Grill' in der Hauptstraße 123, Berlin fest (suche die genauen Koordinaten). Und füge zwei Erinnerungen hinzu: 2 Tage und 2 Stunden vor Beginn."*

**2. E-Mail-Analyse & Aufgabenerstellung:**
> *"Durchsuche die letzten 10 E-Mails aus allen Postfächern zum Thema 'Projekt Alpha'. Erstelle eine Liste offener Punkte und füge den wichtigsten Punkt mit einer Frist bis morgen Abend zu meinen Google Tasks hinzu."*

**3. Kontoübergreifende Koordination:**
> *"Suche die Hotelbuchungsbestätigung im Postfach mustermann.privat@example.de. Leite sie an meine Hauptadresse mustermann.arbeit@example.com weiter und erstelle sofort ein Kalenderereignis für die in der E-Mail genannten Reisedaten."*

**4. Einkaufsliste & Zeitmanagement:**
> *"Füge 'Meeresfrüchte kaufen' zu meiner Einkaufsliste hinzu. Plane heute um 18:30 Uhr 30 Minuten für den Einkauf in meinem Kalender ein und setze eine Erinnerung 15 Minuten vor dem Aufbruch."*

**Ergebnis:**
Die KI führt eigenständig Suchvorgänge durch, extrahiert Daten, prüft Ihren Zeitplan, erstellt Termine, versendet Einladungen und richtet Benachrichtigungen in allen verbundenen Diensten ein. Das spart täglich dutzende Minuten an Routinearbeit!

---
Entwickelt mit ❤️ zur Automatisierung Ihrer Produktivität.
