const path = require('path');
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

const rootEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: rootEnvPath });

const app = express();
const PORT = Number(process.env.PORT || 5177);
const API_BASE_URL = 'https://api.thenewsapi.com/v1/news/all';
const CACHE_TTL_MS = 60_000;
const cache = new Map();
const allowedCategories = [
  'tech',
  'general',
  'science',
  'sports',
  'business',
  'health',
  'entertainment',
  'politics',
  'food',
  'travel'
];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function fetchWithRetry(params, token, attempt = 0) {
  try {
    const response = await axios.get(API_BASE_URL, {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data || {};
  } catch (error) {
    const status = error.response?.status;
    const shouldRetry = attempt < 2 && [429, 500, 502, 503, 504].includes(status);

    if (shouldRetry) {
      const waitMs = 250 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return fetchWithRetry(params, token, attempt + 1);
    }

    throw error;
  }
}

app.get('/api/news/all', async (req, res) => {
  const token = process.env.THENEWSAPI_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Missing THE_NEWS_API token' });
  }

  const page = Number(req.query.page || 1);
  const categories = req.query.categories;
  const search = req.query.search;

  const params = {
    language: 'en',
    limit: 3,
    page: Number.isFinite(page) && page > 0 ? page : 1
  };

  if (search && String(search).trim()) {
    params.search = String(search).trim();
  } else {
    const selectedCategory = categories && allowedCategories.includes(String(categories))
      ? String(categories)
      : 'tech';
    params.categories = selectedCategory;
  }

  const cacheKey = JSON.stringify({ route: '/api/news/all', params });
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return res.json(cachedEntry.payload);
  }
  if (cachedEntry) {
    cache.delete(cacheKey);
  }

  console.log(
    `[proxy] /api/news/all -> ${API_BASE_URL}?${new URLSearchParams({ ...params, language: 'en', limit: '3' }).toString()}`
  );

  try {
    const payload = await fetchWithRetry(params, token);
    const items = Array.isArray(payload.data) ? payload.data : [];
    const responsePayload = {
      data: items,
      meta: payload.meta || {
        page: params.page,
        total_pages: 1,
        limit: 3
      }
    };

    cache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload: responsePayload
    });

    return res.json(responsePayload);
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.message || 'Request failed';

    if (status === 429) {
      return res.status(429).json({ error: 'Daily request limit reached. Please try again tomorrow.' });
    }

    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'TheNewsApi authentication failed. Check your token.' });
    }

    return res.status(status || 500).json({ error: detail });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});
