import { useEffect } from 'react';

const SEO = ({ 
  title, 
  description, 
  image, 
  url,
  type = 'website',
  keywords = ''
}) => {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Helper to update or create meta tag
    const setMeta = (selector, content, property = false) => {
      if (!content) return;
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${selector}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, selector);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Standard meta
    if (description) setMeta('description', description);
    if (keywords) setMeta('keywords', keywords);

    // Open Graph
    if (title) setMeta('og:title', title, true);
    if (description) setMeta('og:description', description, true);
    if (image) setMeta('og:image', image, true);
    if (url) setMeta('og:url', url, true);
    setMeta('og:type', type, true);

    // Twitter
    if (title) setMeta('twitter:title', title, true);
    if (description) setMeta('twitter:description', description, true);
    if (image) setMeta('twitter:image', image, true);
    if (url) setMeta('twitter:url', url, true);

    // Canonical
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
    }

    return () => {
      // Reset to homepage defaults on unmount
      document.title = 'StoreX — Luxury Essentials | Premium Clothing & Accessories';
    };
  }, [title, description, image, url, type, keywords]);

  return null;
};

export default SEO;