import { useEffect, useMemo, useState } from 'react';
import { HeadlinesList } from './components/HeadlinesList';
import type { NewsArticle } from './lib/newsapi';
import { fetchNews } from './lib/newsapi';

const categories = ['tech', 'general', 'science', 'sports', 'business', 'health', 'entertainment', 'politics', 'food', 'travel'];

function getFallbackImage() {
  return '/placeholder.png';
}

function App() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('tech');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [favoritesView, setFavoritesView] = useState(false);
  const [cache, setCache] = useState<Record<string, NewsArticle[]>>({});
  const [prefetchedNext, setPrefetchedNext] = useState<{ page: number; articles: NewsArticle[] } | null>(null);
  const [prefetchedPrev, setPrefetchedPrev] = useState<{ page: number; articles: NewsArticle[] } | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [preferredTopics, setPreferredTopics] = useState<string[]>([]);

  const filterKey = `${selectedCategory}:${searchTerm || 'all'}`;

  useEffect(() => {
    const stored = window.localStorage.getItem('news-reader-favorites');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('news-reader-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('news-reader-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    const storedTopics = window.localStorage.getItem('news-reader-preferred-topics');
    if (storedTopics) {
      try {
        const parsed = JSON.parse(storedTopics) as string[];
        setPreferredTopics(parsed.filter((topic) => typeof topic === 'string' && topic.length > 0));
      } catch {
        setPreferredTopics([]);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('news-reader-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('news-reader-preferred-topics', JSON.stringify(preferredTopics));
  }, [preferredTopics]);

  useEffect(() => {
    const cacheKey = `${filterKey}:${page}`;
    const cached = cache[cacheKey];

    setLoading(true);
    setError('');
    setArticles([]);
    setSelectedIndex(0);
    setPrefetchedNext(null);
    setPrefetchedPrev(null);

    if (cached) {
      setArticles(cached);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    fetchNews({ page, category: selectedCategory, search: searchTerm })
      .then((data) => {
        if (isCancelled) return;
        const nextArticles = data.data || [];
        setArticles(nextArticles);
        setCache((prev) => ({ ...prev, [cacheKey]: nextArticles }));
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cache, filterKey, page, searchTerm, selectedCategory]);

  useEffect(() => {
    if (selectedIndex >= 1 && page >= 1) {
      const nextPage = page + 1;
      const nextKey = `${filterKey}:${nextPage}`;
      if (cache[nextKey]) {
        setPrefetchedNext({ page: nextPage, articles: cache[nextKey] });
        return;
      }

      fetchNews({ page: nextPage, category: selectedCategory, search: searchTerm })
        .then((data) => {
          const nextArticles = data.data || [];
          setPrefetchedNext({ page: nextPage, articles: nextArticles });
          setCache((prev) => ({ ...prev, [nextKey]: nextArticles }));
        })
        .catch(() => {
          setPrefetchedNext(null);
        });
    }
  }, [cache, filterKey, page, searchTerm, selectedCategory, selectedIndex]);

  useEffect(() => {
    if (selectedIndex === 0 && page > 1) {
      const prevPage = page - 1;
      const prevKey = `${filterKey}:${prevPage}`;
      if (cache[prevKey]) {
        setPrefetchedPrev({ page: prevPage, articles: cache[prevKey] });
        return;
      }

      fetchNews({ page: prevPage, category: selectedCategory, search: searchTerm })
        .then((data) => {
          const prevArticles = data.data || [];
          setPrefetchedPrev({ page: prevPage, articles: prevArticles });
          setCache((prev) => ({ ...prev, [prevKey]: prevArticles }));
        })
        .catch(() => {
          setPrefetchedPrev(null);
        });
    }
  }, [cache, filterKey, page, searchTerm, selectedCategory, selectedIndex]);

  const currentArticle = useMemo(() => {
    const sourceList = favoritesView ? articles.filter((article) => favorites.includes(article.uuid || article.title || '')) : articles;
    return sourceList[selectedIndex] || null;
  }, [articles, favorites, favoritesView, selectedIndex]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage === page) return;

    if (nextPage === page + 1 && prefetchedNext?.page === nextPage) {
      setPage(nextPage);
      setArticles(prefetchedNext.articles);
      setSelectedIndex(0);
      setPrefetchedNext(null);
      return;
    }

    if (nextPage === page - 1 && prefetchedPrev?.page === nextPage) {
      setPage(nextPage);
      setArticles(prefetchedPrev.articles);
      setSelectedIndex(0);
      setPrefetchedPrev(null);
      return;
    }

    setPage(nextPage);
    setSelectedIndex(0);
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const togglePreferredTopic = (topic: string) => {
    setPreferredTopics((prev) => (prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]));
  };

  const toggleFavorite = (article: NewsArticle) => {
    const id = article.uuid || article.title || '';
    setFavorites((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const visibleArticles = favoritesView
    ? articles.filter((article) => favorites.includes(article.uuid || article.title || ''))
    : articles;

  const handleCategoryChange = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    setPage(1);
    setSelectedIndex(0);
    setFavoritesView(false);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
    setSelectedIndex(0);
    setFavoritesView(false);
  };

  const pagerPages = [Math.max(1, page - 1), page, page + 1];

  const renderArticle = currentArticle ? (
    <article className="featured-card">
      <img
        src={currentArticle.image_url || getFallbackImage()}
        alt={currentArticle.title || 'News article'}
        className="featured-image"
        loading="lazy"
        decoding="async"
      />
      <div className="featured-overlay">
        <p className="featured-meta">{currentArticle.source || 'News'} • {currentArticle.published_at || ''}</p>
        <h2>{currentArticle.title || 'Untitled article'}</h2>
        <p className="featured-description">{currentArticle.description || currentArticle.snippet || 'No description available.'}</p>
        <div className="featured-actions">
          <a href={currentArticle.url} target="_blank" rel="noreferrer" className="cta-button">View Full Article</a>
          <button type="button" className="secondary-button" onClick={() => toggleFavorite(currentArticle)}>
            {favorites.includes(currentArticle.uuid || currentArticle.title || '') ? 'Saved' : 'Save to Favorites'}
          </button>
        </div>
      </div>
    </article>
  ) : (
    <div className="empty-state">No articles to display.</div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__top">
          <h1>News Reader</h1>
          <p>Flipboard-style headlines with smart paging and favorites.</p>
          <label className="search-box">
            <span>Search</span>
            <input value={searchTerm} onChange={(event) => handleSearch(event.target.value)} placeholder="Search stories" />
          </label>
          <div className="category-list" role="list">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`chip ${selectedCategory === category ? 'chip--active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="preferences-panel">
            <p className="preferences-title">Preferred topics</p>
            <div className="category-list" role="list" aria-label="preferred topics">
              {categories.map((category) => (
                <button
                  key={`${category}-pref`}
                  type="button"
                  className={`chip ${preferredTopics.includes(category) ? 'chip--active chip--preferred' : ''}`}
                  onClick={() => togglePreferredTopic(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="preferences-hint">
              {preferredTopics.length > 0 ? `Saved picks: ${preferredTopics.join(', ')}` : 'Pick a few topics to personalize your feed.'}
            </p>
          </div>
        </div>
        <div className="sidebar__bottom">
          <button type="button" className="favorites-toggle" onClick={() => setFavoritesView((prev) => !prev)}>
            {favoritesView ? 'Live Results' : 'Favorites'}
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Featured story</p>
            <h2>{favoritesView ? 'Favorites' : (searchTerm ? `Search: ${searchTerm}` : selectedCategory)}</h2>
          </div>
          <div className="topbar-actions">
            <button type="button" className="theme-toggle" onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
            <button type="button" className="mobile-toggle" onClick={() => setShowFilters((prev) => !prev)}>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </header>

        <div className={`mobile-filter-stack ${showFilters ? 'visible' : ''}`}>
          <label className="search-box mobile-search">
            <span>Search</span>
            <input value={searchTerm} onChange={(event) => handleSearch(event.target.value)} placeholder="Search stories" />
          </label>
          <div className="category-list" role="list">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`chip ${selectedCategory === category ? 'chip--active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="preferences-panel">
            <p className="preferences-title">Preferred topics</p>
            <div className="category-list" role="list" aria-label="preferred topics">
              {categories.map((category) => (
                <button
                  key={`${category}-pref-mobile`}
                  type="button"
                  className={`chip ${preferredTopics.includes(category) ? 'chip--active chip--preferred' : ''}`}
                  onClick={() => togglePreferredTopic(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="content-grid">
          <section className="featured-panel">
            {loading ? <div className="loading-shell" role="status" aria-live="polite">Loading...</div> : renderArticle}
          </section>
          <section className="list-panel">
            <HeadlinesList
              articles={visibleArticles}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              loading={loading}
            />
          </section>
        </div>

        <nav className="pager" aria-label="Pagination">
          <button type="button" className="pager-button" onClick={() => handlePageChange(1)}>{'«'}</button>
          <button type="button" className="pager-button" onClick={() => handlePageChange(page - 1)}>{'‹'}</button>
          {pagerPages.map((pagerPage) => (
            <button
              key={pagerPage}
              type="button"
              className={`pager-button ${pagerPage === page ? 'pager-button--active' : ''}`}
              onClick={() => handlePageChange(pagerPage)}
            >
              {pagerPage}
            </button>
          ))}
          <button type="button" className="pager-button" onClick={() => handlePageChange(page + 1)}>{'›'}</button>
        </nav>
      </main>
    </div>
  );
}

export default App;
