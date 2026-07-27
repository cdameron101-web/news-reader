import type { NewsArticle } from '../lib/newsapi';

interface HeadlinesListProps {
  articles: NewsArticle[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  favorites: string[];
  onToggleFavorite: (article: NewsArticle) => void;
  loading: boolean;
}

export function HeadlinesList({ articles, selectedIndex, onSelect, favorites, onToggleFavorite, loading }: HeadlinesListProps) {
  if (loading && articles.length === 0) {
    return (
      <div className="list-skeleton" role="status" aria-live="polite">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    );
  }

  return (
    <div className="headline-list" aria-label="article list">
      {articles.map((article, index) => {
        const isActive = index === selectedIndex;
        const favorite = favorites.includes(article.uuid || article.title || '');
        return (
          <div
            key={article.uuid || `${article.title}-${index}`}
            className={`headline-card ${isActive ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(index);
              }
            }}
            aria-pressed={isActive}
          >
            <div className="headline-card__body">
              <div>
                <p className="headline-card__eyebrow">{article.source || 'News'}</p>
                <h3>{article.title || 'Untitled article'}</h3>
              </div>
              <button
                className="favorite-pill"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(article);
                }}
                type="button"
                aria-label={favorite ? 'Remove from favorites' : 'Save to favorites'}
              >
                {favorite ? '★' : '☆'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
