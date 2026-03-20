# Label Wise Dashboard

Admin dashboard for the Label Wise backend.

This project is a React + TypeScript + Vite frontend used to inspect:
- registered app installations
- ingested training/distillation payload records
- future export and model-training actions

## Purpose

The dashboard is part of the Label Wise thesis workflow. It gives a simple admin surface for viewing the data collected from the mobile app before that data is used for dataset curation, distillation, and future small-language-model training.

## Current Features

- View registered installations from the backend
- View ingested payload record summaries
- Connect to the local or deployed Label Wise backend API
- Lightweight admin UI for backend health and record inspection

## Tech Stack

- React
- TypeScript
- Vite

## Project Structure

```text
src/
  api/
  components/
  pages/
  types/
  utils/
  App.tsx
  main.tsx
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

By default, Vite runs locally at:

```text
http://127.0.0.1:5173/
```

## Backend Dependency

This dashboard expects the Label Wise backend API to be running.

Current local backend URL:

```text
http://127.0.0.1:8000/api
```

The dashboard fetches:
- `GET /api/installations`
- `GET /api/records`

## Production Deployment

Recommended hosting:
- Render Static Site

Suggested build settings:

Build command:

```bash
npm install && npm run build
```

Publish directory:

```text
dist
```

## Thesis Context

This dashboard is part of the broader Label Wise system developed by Suresh Lama at Novia UAS. The long-term purpose of the backend and dashboard is to support collection and inspection of structured teacher outputs that can later be used in knowledge distillation and small-language-model training workflows.
