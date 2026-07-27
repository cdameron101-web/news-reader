# News Reader

A React + Vite frontend paired with an Express proxy for TheNewsApi.

## Features
- Flipboard-like single-article view
- Category and search filters
- Pagination with cached pages and prefetching
- Favorites stored in localStorage
- Responsive design for desktop and mobile

## Setup
1. Copy `.env.example` to `.env` and set `THENEWSAPI_TOKEN`.
2. Install dependencies:
   ```bash
   npm run server:install
   ```
3. Start both servers:
   ```bash
   npm run dev
   ```

The frontend runs on http://localhost:5176 and the proxy on http://localhost:5177.
