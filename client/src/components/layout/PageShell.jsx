import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Shared shell for public marketing/info pages.
 * Provides SEO title, breadcrumb, hero, and consistent StoreX spacing/typography.
 */
export default function PageShell({ title, overline, description, breadcrumbs = [], heroImage, children, eyebrow, testId }) {
  useEffect(() => {
    const prev = document.title;
    if (title) document.title = `${title} · StoreX`;
    return () => { document.title = prev; };
  }, [title]);

  return (
    <div className="min-h-screen bg-background" data-testid={testId || 'page-shell'}>
      {/* Breadcrumb */}
      <nav className="container-luxe pt-6 text-xs text-muted-foreground" aria-label="Breadcrumb" data-testid="breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          {breadcrumbs.map((b, i) => (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight size={12} />
              {b.to ? <Link to={b.to} className="hover:text-foreground transition-colors">{b.label}</Link> : <span className="text-foreground">{b.label}</span>}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero */}
      <header className="container-luxe grid gap-10 py-12 md:grid-cols-12 md:py-20">
        <div className="md:col-span-7 flex flex-col justify-center">
          {(overline || eyebrow) && (
            <p className="overline text-muted-foreground">{overline || eyebrow}</p>
          )}
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
          {description && <p className="mt-5 max-w-xl text-base font-light text-muted-foreground sm:text-lg">{description}</p>}
        </div>
        {heroImage && (
          <div className="md:col-span-5">
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img src={heroImage} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </header>

      <main className="container-luxe pb-24">{children}</main>
    </div>
  );
}

// Reusable section components (kept in same file to avoid extra imports).
export function Section({ title, children, testId }) {
  return (
    <section className="py-10 border-t border-border" data-testid={testId}>
      {title && <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-6">{title}</h2>}
      <div className="prose prose-neutral max-w-none text-muted-foreground [&_p]:my-3 [&_p]:leading-relaxed [&_li]:my-2 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function Grid({ items, columns = 3 }) {
  const cls = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[columns] || 'md:grid-cols-3';
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${cls} gap-6`}>
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-border p-6 bg-card">
          {it.icon && <div className="mb-3 text-foreground">{it.icon}</div>}
          <h3 className="font-semibold text-foreground">{it.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{it.description}</p>
        </div>
      ))}
    </div>
  );
}
