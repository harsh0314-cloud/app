import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ArrowDown, Truck, RotateCcw, ShieldCheck, Headphones } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import Magnetic from '../components/Magnetic';
import SEO from '../components/SEO';

const ease = [0.76, 0, 0.24, 1];

const HERO = 'https://images.pexels.com/photos/20238915/pexels-photo-20238915.jpeg?auto=compress&cs=tinysrgb&w=1600';
const EDITORIAL = 'https://images.unsplash.com/photo-1739808914849-01ba195c4f93?auto=format&fit=crop&w=1400&q=80';

const collections = [
  { name: 'Hoodies', slug: 'hoodies', image: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?crop=entropy&cs=srgb&fm=jpg&q=85&w=900' },
  { name: 'T-Shirts', slug: 't-shirts', image: 'https://images.unsplash.com/photo-1622445272461-c6580cab8755?crop=entropy&cs=srgb&fm=jpg&q=85&w=900' },
  { name: 'Jackets', slug: 'jackets', image: 'https://images.unsplash.com/photo-1603189343302-e603f7add05a?auto=format&fit=crop&w=900&q=80' },
  { name: 'Trousers', slug: 'trousers', image: 'https://images.unsplash.com/photo-1763888647863-d6d0c7383151?auto=format&fit=crop&w=900&q=80' },
  { name: 'Footwear', slug: 'footwear', image: 'https://images.pexels.com/photos/12317922/pexels-photo-12317922.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { name: 'Accessories', slug: 'accessories', image: 'https://images.pexels.com/photos/20380733/pexels-photo-20380733.jpeg?auto=compress&cs=tinysrgb&w=900' },
];

const marqueeItems = ['New Season 2026', 'Free Shipping Over ₹500', 'Crafted In-House', 'Made To Endure', 'The Icon Collection'];

function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RevealNow({ children, delay = 0, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay, ease }} className={className}>
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '60%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    api.get('/products', { params: { limit: 8 } })
      .then((res) => setProducts(res.data.products || []))
      .catch(() => {});
  }, []);

  const handleMouse = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setMouse({ x, y });
  };

  const featured = products.slice(0, 8);

  return (
    <>
      <SEO 
        title="StoreX — Luxury Essentials | Premium Clothing & Accessories"
        description="Discover considered essentials and elevated staples. Designed in-house, made to endure. Shop premium hoodies, t-shirts, jackets, and more."
        keywords="luxury clothing, premium fashion, designer wear, online shopping, StoreX, hoodies, t-shirts, jackets, footwear"
        url="https://storex-frontend-gold.vercel.app"
      />
      <div className="bg-background overflow-x-hidden">
        {/* HERO */}
        <section ref={heroRef} onMouseMove={handleMouse} className="relative h-[90dvh] md:h-screen overflow-hidden bg-ink text-white">
          <motion.div style={{ y: imgY }} className="absolute inset-0 z-0">
            <motion.img
              src={HERO}
              alt="Editorial hero"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease }}
              style={{ x: mouse.x * -18, y: mouse.y * -18 }}
              className="h-full w-full object-cover object-[center_35%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
          </motion.div>

          <div className="container-luxe relative z-10 flex h-full flex-col justify-end pb-[8vh] md:pb-[14vh]">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease }} className="overline mb-4 md:mb-5 text-white/70">
              Autumn / Winter 2026
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 1, ease }} style={{ x: mouse.x * 12 }}>
              <h1 className="font-display text-[15vw] font-extrabold uppercase leading-[0.85] tracking-tighter text-white drop-shadow-[0_2px_40px_rgba(0,0,0,0.7)] sm:text-[14vw] lg:text-[11vw]">
                The Icon
              </h1>
            </motion.div>
            <div className="mt-4 md:mt-6 flex flex-col justify-between gap-6 md:gap-8 sm:flex-row sm:items-end">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }} className="max-w-xs md:max-w-md text-sm md:text-base font-light text-white/75">
                A study in restraint. Elevated staples cut from the finest fabrics — the wardrobe, distilled.
              </motion.p>
              <Magnetic>
                <Link to="/products" data-testid="hero-cta" className="group inline-flex items-center gap-3 bg-white px-8 py-3.5 md:px-10 md:py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-foreground transition-colors hover:bg-gold hover:text-white">
                  Shop The Collection
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
            </div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="hidden md:flex absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex-col items-center gap-2 text-white/60">
            <span className="text-[10px] uppercase tracking-luxe-sm">Scroll</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}><ArrowDown size={16} /></motion.div>
          </motion.div>
        </section>

        {/* MARQUEE */}
        <div className="border-y border-border bg-background py-5">
          <div className="flex w-max animate-marquee gap-16 whitespace-nowrap">
            {[...marqueeItems, ...marqueeItems].map((t, i) => (
              <span key={i} className="flex items-center gap-16 font-display text-sm font-semibold uppercase tracking-luxe-sm text-foreground/70">
                {t} <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* COLLECTIONS */}
        <section className="container-luxe py-24 md:py-32">
          <Reveal className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="overline text-muted-foreground">Curated</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Shop by Category</h2>
            </div>
            <Link to="/products" className="link-underline w-fit text-[11px] font-semibold uppercase tracking-luxe-sm">View All Categories</Link>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {collections.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.06}>
                <Link to={`/products?category=${c.slug}`} data-testid={`collection-${c.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-surface">
                    <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-70" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-white">
                      <span className="font-display text-sm font-bold uppercase tracking-luxe-sm">{c.name}</span>
                      <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* EDITORIAL SPLIT */}
        <section className="relative bg-surface">
          <div className="grid md:grid-cols-2">
            <div className="relative min-h-[60vh] overflow-hidden">
              <motion.img initial={{ scale: 1.15 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease }} src={EDITORIAL} alt="Editorial" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="flex items-center px-8 py-20 md:px-20">
              <Reveal>
                <p className="overline text-gold">The Philosophy</p>
                <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Fewer, better things.</h2>
                <p className="mt-6 max-w-md text-base font-light leading-relaxed text-muted-foreground">
                  Every piece begins with the fabric. We source mills renowned for their craft, then cut clean, considered silhouettes designed to outlast the season — and the trend.
                </p>
                <Magnetic className="mt-10 w-fit">
                  <Link to="/products" className="group inline-flex items-center gap-3 border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">
                    Explore The Story <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Magnetic>
              </Reveal>
            </div>
          </div>
        </section>

        {/* BEST SELLERS */}
        <section className="container-luxe py-24 md:py-32">
          <Reveal className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="overline text-muted-foreground">Most Wanted</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">The Essentials</h2>
            </div>
            <Link to="/products" className="link-underline w-fit text-[11px] font-semibold uppercase tracking-luxe-sm">Shop All</Link>
          </Reveal>

          {featured.length === 0 ? (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse bg-surface" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
              {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>

        {/* TRUST */}
        <section className="border-t border-border bg-surface">
          <div className="container-luxe grid grid-cols-2 gap-8 py-16 md:grid-cols-4">
            {[
              { icon: Truck, title: 'Complimentary Shipping', desc: 'On all orders over ₹500' },
              { icon: RotateCcw, title: 'Easy Returns', desc: '30-day return window' },
              { icon: ShieldCheck, title: 'Secure Checkout', desc: 'Encrypted & protected' },
              { icon: Headphones, title: 'Client Care', desc: 'Here whenever you need' },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 0.08} className="flex flex-col items-center gap-4 text-center">
                <t.icon size={26} strokeWidth={1.4} />
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-luxe-sm">{t.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}