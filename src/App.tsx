import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Box, PaintBucket, Palette, CheckCircle2, ChevronRight, Layers, ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import Lenis from 'lenis';

// Vercel deployment trigger - force fresh cache refresh
// --- SHARED DATA ---
const TOONS = [
  { id: 1, name: 'Blush Buddy', price: 49, src: '/images/toon1.webp', bg: '#F4845F', panel: '#F79B7F', tag: 'Dreamy', rarity: 'Common', desc: 'A soft-hearted companion with a punch of color.' },
  { id: 2, name: 'Forest Pop', price: 59, src: '/images/toon2.webp', bg: '#6BBF7A', panel: '#85CC92', tag: 'Heroes', rarity: 'Rare', desc: 'Guardian of the digital woods. Swift and stylish.' },
  { id: 3, name: 'Candy Muse', price: 69, src: '/images/toon3.webp', bg: '#E882B4', panel: '#ED9DC4', tag: 'Limited', rarity: 'Ultra Rare', desc: 'The sweet icon of the collection. Highly sought after.' },
  { id: 4, name: 'Sky Rookie', price: 49, src: '/images/toon4.webp', bg: '#6EB5FF', panel: '#8DC4FF', tag: 'Heroes', rarity: 'Common', desc: 'Ready to take flight and conquer your display shelf.' },
];

export type Toon = typeof TOONS[0];
export interface CartItem extends Toon { quantity: number; }

const GRAIN_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E`;
const TRANSITION_STYLE = '650ms cubic-bezier(0.4, 0, 0.2, 1)';

// --- REUSABLE COMPONENTS ---
const GrainOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none z-50 mix-blend-overlay"
    style={{
      backgroundImage: `url("${GRAIN_SVG}")`,
      backgroundSize: '200px 200px',
      backgroundRepeat: 'repeat',
      opacity: 0.4,
    }}
  />
);

const GhostText = ({ text, opacity = 1, zIndex = 2 }: { text: string, opacity?: number, zIndex?: number }) => (
  <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none" style={{ top: '15%', zIndex: zIndex }}>
    <span
      style={{
        fontFamily: "'Anton', sans-serif",
        fontSize: 'clamp(90px, 28vw, 380px)',
        fontWeight: 900,
        color: 'white',
        opacity: opacity,
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  </div>
);

const TopNav = ({ currentPage, navigate, cartCount, onOpenShelf }: { currentPage: string, navigate: (p: 'home' | 'collection' | 'studio') => void, cartCount: number, onOpenShelf: () => void }) => (
  <nav className="fixed top-0 inset-x-0 z-[100] flex justify-between items-center p-6 sm:p-8">
    <div
      onClick={() => navigate('home')}
      className="text-white text-xs sm:text-sm font-bold uppercase cursor-pointer hover:scale-105 transition-transform"
      style={{ letterSpacing: '0.18em', opacity: 0.95 }}
    >
      TOONHUB
    </div>
    <div className="flex gap-4 sm:gap-8 bg-black/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
      {(['home', 'collection', 'studio'] as const).map((page) => (
        <button
          key={page}
          onClick={() => navigate(page)}
          className={`text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
            currentPage === page ? 'text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          {page}
        </button>
      ))}
    </div>
    <div className="flex items-center">
      <button 
        onClick={onOpenShelf}
        className="relative group p-3 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-colors"
      >
        <ShoppingBag size={20} className="text-white" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  </nav>
);

const Toast = ({ message, bgColor, isVisible }: { message: string, bgColor: string, isVisible: boolean }) => (
  <div 
    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}
  >
    <div 
      className="px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md text-white font-semibold tracking-wide text-sm border border-white/20"
      style={{ backgroundColor: bgColor }}
    >
      <CheckCircle2 size={18} className="text-white" />
      {message}
    </div>
  </div>
);

const ShelfDrawer = ({ 
  isOpen, 
  onClose, 
  items, 
  onRemove, 
  onUpdateQuantity 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  items: CartItem[];
  onRemove: (id: number) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
}) => {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-black/40 backdrop-blur-2xl border-l border-white/20 z-[130] p-6 sm:p-8 flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-anton text-4xl text-white uppercase tracking-tight">Your Shelf</h2>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/50 space-y-4">
              <Box size={48} className="opacity-50" />
              <p className="font-medium text-lg">Your shelf is looking empty.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-white/10 border border-white/10 rounded-3xl p-4 flex gap-4 items-center group transition-all hover:bg-white/15">
                <div className="w-20 h-24 rounded-2xl flex items-center justify-center p-2" style={{ backgroundColor: item.panel }}>
                  <img src={item.src} alt={item.name} className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1">
                  <h4 className="font-anton text-xl text-white uppercase tracking-tight">{item.name}</h4>
                  <p className="text-white/60 text-sm font-semibold">${item.price}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center bg-black/30 rounded-full">
                      <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-2 text-white/70 hover:text-white transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-2 text-white/70 hover:text-white transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => onRemove(item.id)} className="p-3 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors self-start">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="flex justify-between items-center mb-6 text-white">
            <span className="font-medium text-lg">Subtotal</span>
            <span className="font-anton text-3xl">${subtotal}</span>
          </div>
          <button 
            className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-lg transition-colors bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={items.length === 0}
          >
            Checkout
          </button>
        </div>
      </div>
    </>
  );
};

// --- PAGES ---

// 1. HOME PAGE
const HomePage = ({ setGlobalBg, navigate, isActive }: { setGlobalBg: (c: string) => void, navigate: (p: 'home' | 'collection' | 'studio') => void, isActive: boolean }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isActive) {
      setGlobalBg(TOONS[activeIndex].bg);
    }
  }, [activeIndex, setGlobalBg, isActive]);

  const nextPrev = useCallback((direction: 'next' | 'prev') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => direction === 'next' ? (prev + 1) % 4 : (prev + 3) % 4);
    setTimeout(() => setIsAnimating(false), 650);
  }, [isAnimating]);

  const getRoleStyles = (index: number) => {
    const isCenter = index === activeIndex;
    const isLeft = index === (activeIndex + 3) % 4;
    const isRight = index === (activeIndex + 1) % 4;
    const isBack = index === (activeIndex + 2) % 4;

    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      aspectRatio: '0.6 / 1',
      transition: `transform ${TRANSITION_STYLE}, filter ${TRANSITION_STYLE}, opacity ${TRANSITION_STYLE}, left ${TRANSITION_STYLE}, height ${TRANSITION_STYLE}, bottom ${TRANSITION_STYLE}`,
      willChange: 'transform, filter, opacity, left, bottom, height',
    };

    if (isCenter) {
      return {
        ...baseStyles,
        transform: `translateX(-50%) scale(${isMobile ? 1.25 : 1.68})`,
        filter: 'blur(0px)',
        opacity: 1,
        zIndex: 20,
        left: '50%',
        height: isMobile ? '60%' : '92%',
        bottom: isMobile ? '22%' : '0',
      };
    }
    if (isLeft) {
      return {
        ...baseStyles,
        transform: 'translateX(-50%) scale(1)',
        filter: 'blur(2px)',
        opacity: 0.85,
        zIndex: 10,
        left: isMobile ? '20%' : '30%',
        height: isMobile ? '16%' : '28%',
        bottom: isMobile ? '32%' : '12%',
      };
    }
    if (isRight) {
      return {
        ...baseStyles,
        transform: 'translateX(-50%) scale(1)',
        filter: 'blur(2px)',
        opacity: 0.85,
        zIndex: 10,
        left: isMobile ? '80%' : '70%',
        height: isMobile ? '16%' : '28%',
        bottom: isMobile ? '32%' : '12%',
      };
    }
    if (isBack) {
      return {
        ...baseStyles,
        transform: 'translateX(-50%) scale(1)',
        filter: 'blur(4px)',
        opacity: 1,
        zIndex: 5,
        left: '50%',
        height: isMobile ? '13%' : '22%',
        bottom: isMobile ? '32%' : '12%',
      };
    }
    return baseStyles;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GhostText text="3D SHAPE" zIndex={2} />
      
      <div className="absolute inset-0 z-[3]">
        {TOONS.map((img, index) => (
          <div key={index} style={getRoleStyles(index)}>
            <img src={img.src} alt={img.name} draggable={false} className="w-full h-full object-contain object-bottom" />
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-4 sm:bottom-20 sm:left-24 z-[60] max-w-[320px]">
        <p className="font-bold uppercase text-white mb-2 sm:mb-3 text-base sm:text-[22px] tracking-wider opacity-95">TOONHUB FIGURINES</p>
        <p className="hidden sm:block text-white text-sm mb-5 opacity-85 leading-relaxed">
          The artwork is stunning, shipped fully prepared. The finish is a vision, the 3D craft is flawless. Many thanks! Wishing you the win. Order now.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => nextPrev('prev')} className="group w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white flex items-center justify-center text-white bg-transparent hover:bg-white/10 hover:scale-105 transition-all">
            <ArrowLeft size={26} strokeWidth={2.25} />
          </button>
          <button onClick={() => nextPrev('next')} className="group w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white flex items-center justify-center text-white bg-transparent hover:bg-white/10 hover:scale-105 transition-all">
            <ArrowRight size={26} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 right-4 sm:bottom-20 sm:right-10 z-[60]">
        <button onClick={() => navigate('collection')} className="flex items-center text-white group opacity-95 hover:opacity-100 transition-opacity">
          <span className="font-anton text-[clamp(20px,4vw,56px)] tracking-tight uppercase">DISCOVER IT</span>
          <ArrowRight className="ml-2 sm:ml-4 w-5 h-5 sm:w-8 sm:h-8 group-hover:translate-x-2 transition-transform" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
};

// 2. COLLECTION PAGE
const CollectionPage = ({ setGlobalBg, isActive, addToShelf }: { setGlobalBg: (c: string) => void, isActive: boolean, addToShelf: (t: Toon) => void }) => {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Heroes', 'Dreamy', 'Limited'];
  
  const filteredToons = filter === 'All' ? TOONS : TOONS.filter(t => t.tag === filter);

  useEffect(() => {
    if (isActive) {
      setGlobalBg(TOONS[0].bg);
    }
  }, [isActive, setGlobalBg]);

  return (
    <div className="relative w-full min-h-screen pt-32 pb-24 px-6 sm:px-12 max-w-7xl mx-auto">
      <GhostText text="TOON SET" opacity={0.15} zIndex={0} />

      {/* Header & Filters */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div>
          <h1 className="font-anton text-5xl sm:text-7xl text-white uppercase tracking-tight">The Collection</h1>
          <p className="text-white/80 font-medium mt-2 text-lg">Curated 3D designer toys for your shelf.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all whitespace-nowrap border-2 ${
                filter === f ? 'bg-white text-black border-white' : 'bg-black/20 text-white border-white/20 hover:border-white/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Drop */}
      <div 
        className="relative z-10 w-full rounded-[2.5rem] p-8 sm:p-12 mb-32 flex flex-col md:flex-row items-center gap-8 shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer group"
        style={{ backgroundColor: TOONS[2].panel }}
        onMouseEnter={() => { if (isActive) setGlobalBg(TOONS[2].bg); }}
        onMouseLeave={() => { if (isActive) setGlobalBg(TOONS[0].bg); }}
      >
        <div className="w-full md:w-1/2 flex justify-center -mt-24 sm:-mt-32 md:-ml-12">
          <img src={TOONS[2].src} alt="Featured" className="w-64 sm:w-80 lg:w-[400px] object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="w-full md:w-1/2 text-white flex flex-col items-start text-left">
          <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <Sparkles size={14} /> Featured Drop
          </div>
          <h2 className="font-anton text-4xl sm:text-6xl uppercase tracking-tight leading-none mb-4">{TOONS[2].name}</h2>
          <p className="text-white/90 text-lg mb-8 max-w-md">{TOONS[2].desc} Get it before it's gone forever.</p>
          <button onClick={() => addToShelf(TOONS[2])} className="bg-white text-black px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors flex items-center gap-3">
            Add to Shelf <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-32">
        {filteredToons.map((toon) => (
          <div 
            key={toon.id}
            className="relative group rounded-[2rem] p-8 pt-24 mt-20 flex flex-col transition-all duration-500 hover:-translate-y-4 shadow-xl hover:shadow-2xl cursor-pointer"
            style={{ backgroundColor: toon.panel }}
            onMouseEnter={() => { if (isActive) setGlobalBg(toon.bg); }}
          >
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-72">
              <img src={toon.src} alt={toon.name} className="w-full h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-500" />
            </div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-anton text-3xl text-white uppercase tracking-tight">{toon.name}</h3>
                <p className="text-white/80 font-medium">{toon.tag}</p>
              </div>
              <span className="font-anton text-2xl text-white">${toon.price}</span>
            </div>
            
            <div className="mt-auto pt-6 flex gap-3">
              <button onClick={() => addToShelf(toon)} className="flex-1 bg-white/20 hover:bg-white text-white hover:text-black font-bold py-3 rounded-full transition-colors flex justify-center items-center gap-2">
                <Box size={18} /> Add to Shelf
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. STUDIO PAGE
const StudioPage = ({ setGlobalBg, navigate, isActive, addToShelf }: { setGlobalBg: (c: string) => void, navigate: (p: 'home' | 'collection' | 'studio') => void, isActive: boolean, addToShelf: (t: Toon) => void }) => {
  const [customIdx, setCustomIdx] = useState(0);
  const [size, setSize] = useState('Classic');
  const activeToon = TOONS[customIdx];

  // Set initial bg for studio
  useEffect(() => {
    if (isActive) {
      setGlobalBg(activeToon.bg);
    }
  }, [activeToon, setGlobalBg, isActive]);

  const PROCESS_STEPS = [
    { icon: Layers, title: '01. Sketch', desc: 'Every character begins as a wild vision, drafted with precision and personality.' },
    { icon: Box, title: '02. Sculpt', desc: 'Molded in 3D using cutting-edge tools to ensure flawless topology.' },
    { icon: Palette, title: '03. Paint', desc: 'Hand-painted digital textures applied for that premium collectible finish.' }
  ];

  return (
    <div className="relative w-full min-h-screen pt-32 pb-24 px-6 sm:px-12 max-w-6xl mx-auto overflow-hidden">
      <GhostText text="STUDIO" opacity={0.15} zIndex={0} />

      {/* Process Section */}
      <div className="relative z-10 mb-32">
        <h1 className="font-anton text-5xl sm:text-7xl text-white uppercase tracking-tight mb-16 text-center">Made In 3D</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROCESS_STEPS.map((step, i) => (
            <div key={i} className="bg-black/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-black/20 transition-colors group">
              <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <step.icon size={24} />
              </div>
              <h3 className="font-anton text-2xl text-white uppercase mb-3">{step.title}</h3>
              <p className="text-white/80 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Customizer Section */}
      <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[3rem] p-8 sm:p-12 flex flex-col lg:flex-row items-center gap-12 mb-32 shadow-2xl">
        <div className="w-full lg:w-1/2 flex justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-full blur-3xl -z-10 scale-75"></div>
          <img 
            src={activeToon.src} 
            alt="Customizer" 
            className="w-64 sm:w-96 h-[400px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)] transition-transform duration-700 hover:scale-105" 
          />
        </div>
        
        <div className="w-full lg:w-1/2 space-y-8">
          <div>
            <h2 className="font-anton text-4xl sm:text-5xl text-white uppercase tracking-tight flex items-center gap-3">
              <PaintBucket className="text-white/80" /> Customizer
            </h2>
            <p className="text-white/80 mt-2 text-lg">Test colors and configurations before you collect.</p>
          </div>

          {/* Color Swatches */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Select Theme</h4>
            <div className="flex gap-4">
              {TOONS.map((t, idx) => (
                <button 
                  key={t.id}
                  onClick={() => setCustomIdx(idx)}
                  className={`w-14 h-14 rounded-full border-[3px] transition-all duration-300 ${customIdx === idx ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: t.panel }}
                  aria-label={`Select ${t.name}`}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Figure Size</h4>
            <div className="flex gap-3 bg-black/20 p-2 rounded-full w-fit border border-white/10">
              {['Mini', 'Classic', 'Giant'].map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-6 py-2 rounded-full text-sm font-bold uppercase transition-colors ${size === s ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center gap-4">
            <span className="font-anton text-4xl text-white">${activeToon.price}</span>
            <button onClick={() => addToShelf(activeToon)} className="flex-1 bg-black text-white hover:bg-white hover:text-black py-4 rounded-full font-bold uppercase tracking-wider transition-colors flex justify-center items-center gap-2">
               <Box size={20} /> Add to Shelf
            </button>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 text-center py-20">
        <h2 className="font-anton text-6xl sm:text-[100px] text-white uppercase tracking-tighter leading-none mb-8">Ready For<br/>Your Shelf?</h2>
        <button 
          onClick={() => navigate('collection')}
          className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
        >
          Explore Collection
        </button>
      </div>
    </div>
  );
};


// --- MAIN APP ---
export default function App() {
  const [activeSection, setActiveSection] = useState<'home' | 'collection' | 'studio'>('home');
  const [globalBg, setGlobalBg] = useState(TOONS[0].bg);
  const lenisRef = useRef<Lenis | null>(null);

  // Shelf State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isShelfOpen, setIsShelfOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, color: string, visible: boolean }>({ message: '', color: '', visible: false });

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const showToast = (message: string, color: string) => {
    setToast({ message, color, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const addToShelf = (toon: Toon) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === toon.id);
      if (existing) {
        return prev.map(item => item.id === toon.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...toon, quantity: 1 }];
    });
    showToast(`Added ${toon.name} to shelf!`, toon.panel);
  };

  const removeFromShelf = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
      }
      return item;
    }));
  };

  // Preload Images & Fonts
  useEffect(() => {
    console.log('Toonhub initial loader v1.0.1');
    if (!document.getElementById('anton-inter-fonts')) {
      const link = document.createElement('link');
      link.id = 'anton-inter-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
    TOONS.forEach((img) => (new Image().src = img.src));
  }, []);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Set up IntersectionObserver to update top nav based on scroll position
  useEffect(() => {
    const sections = ['home', 'collection', 'studio'];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id as 'home' | 'collection' | 'studio');
            }
          });
        },
        {
          rootMargin: '-30% 0px -30% 0px',
        }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  // Custom Router Transition logic (now scrolls to section)
  const navigate = useCallback((newPage: 'home' | 'collection' | 'studio') => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${newPage}`, {
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      const el = document.getElementById(newPage);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <div
      className="relative w-full min-h-screen overflow-x-hidden selection:bg-white/30 selection:text-black"
      style={{
        backgroundColor: globalBg,
        transition: `background-color ${TRANSITION_STYLE}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <GrainOverlay />
      
      <TopNav currentPage={activeSection} navigate={navigate} cartCount={totalItems} onOpenShelf={() => setIsShelfOpen(true)} />

      {/* Page Content Wrapper (all pages are stacked and active) */}
      <main className="relative z-10 w-full">
        <section id="home" className="w-full">
          <HomePage setGlobalBg={setGlobalBg} navigate={navigate} isActive={activeSection === 'home'} />
        </section>
        <section id="collection" className="w-full">
          <CollectionPage setGlobalBg={setGlobalBg} isActive={activeSection === 'collection'} addToShelf={addToShelf} />
        </section>
        <section id="studio" className="w-full">
          <StudioPage setGlobalBg={setGlobalBg} navigate={navigate} isActive={activeSection === 'studio'} addToShelf={addToShelf} />
        </section>
      </main>

      <ShelfDrawer 
        isOpen={isShelfOpen} 
        onClose={() => setIsShelfOpen(false)} 
        items={cartItems} 
        onRemove={removeFromShelf} 
        onUpdateQuantity={updateQuantity} 
      />
      <Toast message={toast.message} bgColor={toast.color} isVisible={toast.visible} />
    </div>
  );
}
