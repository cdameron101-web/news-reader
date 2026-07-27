export interface NewsArticle {
  uuid?: string;
  title?: string;
  description?: string;
  url?: string;
  image_url?: string;
  source?: string;
  published_at?: string;
  snippet?: string;
  categories?: string[];
}

interface NewsResponse {
  data: NewsArticle[];
  meta?: {
    page?: number;
    total_pages?: number;
    limit?: number;
  };
}

export async function fetchNews(params: { page: number; category?: string; search?: string }) {
  const query = new URLSearchParams({
    page: String(params.page)
  });

  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  } else {
    query.set('categories', params.category || 'tech');
  }

  const response = await fetch(`/api/news/all?${query.toString()}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Unable to load news');
  }

  return (await response.json()) as NewsResponse;
}
