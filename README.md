# Thinkly — Frontend (Quiz Master)

React (Vite) client for **Thinkly**: landing, batched quiz, results, saved sessions, and a **topic tutor** chat. The API lives in a **separate backend repository**; set `VITE_API_BASE_URL` to that server’s origin.

## Why this topic

The product is a **learning** experience, not a generic chat skin.

- **First screen** explains the journey: pick a topic → quiz → results → optional tutor chat or reopen history—so users always know why the assistant exists.  
- **Topic tutor** is labeled and scoped to the topic from the form, with a welcome line and **suggested prompts** so a new thread is not an empty box.  
- **Loading, error, and empty** are designed: thinking states, retry on failure, and cold-start suggestions instead of a blank list.

The UI makes the topic part of layout and state, not just marketing copy.

## What this app implements

| Screen / flow | Role |
|---------------|------|
| `src/components/Landing.jsx` | Topic (dropdown + custom), difficulty, question type, count; entry to quiz or chat. |
| `src/components/QuizViewBatched.jsx` | Batched questions, timer, anonymous in-quiz run, loading/error. |
| `src/components/Results.jsx` | Score where applicable, colored review, explanations. |
| `src/components/SessionHistory.jsx` | Paginated history; loading, empty, DB error/retry when `querySucceeded` is false. |
| `src/components/ChatView.jsx` | Topic tutor, welcome + suggestions, send/loading/error/retry, keyboard hints, `aria-live` for new assistant content. |

App shell: `src/QuizMasterApp.jsx`. API helpers: `src/lib/api.js`.

## Frontend thinking (short)

- **First impression:** Title, instructions, clear paths to quiz vs chat vs history.  
- **Loading:** e.g. “Generating questions…”, chat “Thinking…” with disabled send.  
- **Errors:** Friendly copy, **Try again** / **Retry send**; no raw stack traces.  
- **Empty / cold start:** Suggested prompts in chat until the first user message.  
- **Details:** Auto-scroll, autofocus on chat open, Enter to send / Shift+Enter for newline.

If you keep a demo script or rubric notes in this repo, you can add a `FRONTEND_THINKING_DEMO.md` at the root with shot-by-shot Loom ideas.

## Configuration

Create a `.env` (or use your host’s env UI) with:

```bash
VITE_API_BASE_URL=https://your-backend.example.com
```

For local development against a Flask API on port 5000 (PowerShell):

```powershell
$env:VITE_API_BASE_URL="http://localhost:5000"; npm run dev
```

The backend must allow your frontend origin (CORS). Use the same variable in production pointing at your deployed API.

## Scripts

```bash
npm install
npm run dev      # development
npm run build    # production build
npm run preview  # preview production build
```

## Stack

- React 19, Vite 8  
- Tailwind CSS 4  

## Demo

- **Live app:** (add your Vercel or static host URL)  
- **Backend repo:** (link to your API repo)
