import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useSEO } from '@/hooks/useSEO';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { packagesApi } from '@/lib/api/packages';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Globe,
  Shield,
  Zap,
  Smartphone,
  Headphones,
  DollarSign,
  CreditCard,
  Gift,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

// ─── DESIGN SYSTEM: NOCTURNAL PULSE ───────────────────────
// Palette: Deep nocturnal base with singular cyan accent
// Typography: Manrope (display) + Space Grotesk (data/mono)
// Shape: Generous radius (1.25rem–2.5rem), glassmorphism depth
// Motion: Spring physics (stiffness: 100, damping: 20)
// Anti-patterns: No emojis, no pure #000, no Inter, no 3-col equal grids,
//   no neon glows, no AI copy clichés, no fake data

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 };
const STAGGER_CHILDREN = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};
const FADE_IN = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};
const SCALE_IN = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: SPRING },
};

// ─── ANIMATED SECTION WRAPPER ─────────────────────────────
function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={STAGGER_CHILDREN}
      className={className}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </motion.div>
  );
}

// ─── SERVICE BRAND LOGO (SVG) ─────────────────────────────
const SERVICE_BRANDS: Record<string, { svg: JSX.Element; bg: string; label: string }> = {
  wa: {
    label: 'WhatsApp',
    bg: '#25D366',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  tg: {
    label: 'Telegram',
    bg: '#229ED9',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  ig: {
    label: 'Instagram',
    bg: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
      </svg>
    ),
  },
  fb: {
    label: 'Facebook',
    bg: '#1877F2',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  tw: {
    label: 'X',
    bg: '#14171A',
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  ds: {
    label: 'Discord',
    bg: '#5865F2',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
      </svg>
    ),
  },
  tt: {
    label: 'TikTok',
    bg: '#14171A',
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#25F4EE" d="M9.37 23.5a7.14 7.14 0 0 1-5.09-2.1A7.14 7.14 0 0 1 2.18 16.3a7.14 7.14 0 0 1 2.1-5.09 7.14 7.14 0 0 1 5.09-2.1v3.45a3.7 3.7 0 0 0-2.63 1.09 3.7 3.7 0 0 0-1.09 2.63 3.7 3.7 0 0 0 1.09 2.63 3.7 3.7 0 0 0 2.63 1.09V23.5Z" />
        <path fill="#FE2C55" d="M9.88 23.5V9.11h3.45v3.45a3.7 3.7 0 0 0 2.63-1.09 3.7 3.7 0 0 0 1.09-2.63h3.45a7.14 7.14 0 0 1-2.1 5.09 7.14 7.14 0 0 1-5.09 2.1v7.47H9.88Z" />
        <path fill="white" d="M9.88 23.5V20a3.7 3.7 0 0 0 2.63-1.09 3.7 3.7 0 0 0 1.09-2.63 3.7 3.7 0 0 0-1.09-2.63 3.7 3.7 0 0 0-2.63-1.09V9.11a7.14 7.14 0 0 1 5.09 2.1 7.14 7.14 0 0 1 2.1 5.09 7.14 7.14 0 0 1-2.1 5.09 7.14 7.14 0 0 1-5.09 2.1Z" />
      </svg>
    ),
  },
  yt: {
    label: 'YouTube',
    bg: '#FF0000',
    svg: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
};

// ─── FLOATING GRID BACKGROUND ─────────────────────────────
function NocturnalGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Radial gradient depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(37,99,235,0.06),transparent_60%)]" />
      {/* Grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
    </div>
  );
}

// ─── GLASS CARD ───────────────────────────────────────────
function GlassCard({
  children,
  className = '',
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      variants={SCALE_IN}
      whileHover={hover ? { y: -4, transition: SPRING } : undefined}
      className={`
        relative rounded-[1.25rem] border border-white/[0.06]
        bg-gradient-to-br from-white/[0.04] to-white/[0.01]
        backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        ${className}
      `}
    >
      {/* Inner glow */}
      <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function HomePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { formatPrice, currency } = useCurrency();

  useSEO({
    titleKey: 'homepage.hero.title',
    descriptionKey: 'homepage.hero.description',
  });

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  // ─── DATA FETCHING (same as V1) ──────────────────────────
  const { data: topServices } = useQuery({
    queryKey: ['homepage-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('code, name')
        .eq('active', true)
        .in('code', ['wa', 'tg', 'ig', 'fb', 'go', 'tw', 'ds', 'tt', 'li', 'yt', 'sn', 'nf'])
        .limit(12);
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const [servicesResult, countriesResult] = await Promise.all([
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('countries').select('*', { count: 'exact', head: true }).eq('active', true),
      ]);
      const countriesCount = Math.min(countriesResult.count || 0, 195);
      return {
        services: servicesResult.count || 0,
        countries: countriesCount,
        availableNumbers: '5.2M+',
        successRate: '99.7%',
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: topUpPackages = [] } = useQuery({
    queryKey: ['homepage-packages'],
    queryFn: async () => {
      try {
        const packages = await packagesApi.getActivePackages();
        const sorted = packages.sort((a, b) => a.display_order - b.display_order);
        const popularIndex = sorted.findIndex((p) => p.is_popular);
        if (popularIndex !== -1 && sorted.length >= 3) {
          const popular = sorted.splice(popularIndex, 1)[0];
          const middleIndex = Math.floor(sorted.length / 2);
          sorted.splice(middleIndex, 0, popular);
        }
        return sorted;
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const { data: settings } = useQuery({
    queryKey: ['system-settings-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['show_service_logos'])
        .returns<{ key: string; value: string }[]>();
      const m: Record<string, string> = {};
      data?.forEach((s) => (m[s.key] = s.value));
      return m;
    },
    staleTime: 1000 * 60 * 5,
  });

  const showServiceLogos = settings?.['show_service_logos'] !== 'false';

  const displayServices = useMemo(() => {
    if (!topServices || topServices.length === 0) {
      return [
        { code: 'wa', name: 'WhatsApp' },
        { code: 'tg', name: 'Telegram' },
        { code: 'ig', name: 'Instagram' },
        { code: 'fb', name: 'Facebook' },
        { code: 'tw', name: 'Twitter/X' },
        { code: 'ds', name: 'Discord' },
        { code: 'tt', name: 'TikTok' },
        { code: 'yt', name: 'YouTube' },
      ];
    }
    return topServices;
  }, [topServices]);

  // Parallax ref
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Feature set
  const features = [
    { icon: Zap, title: t('homepage.features.feature1Title'), desc: t('homepage.features.feature1Desc'), accent: '#06B6D4' },
    { icon: Globe, title: t('homepage.features.feature2Title'), desc: t('homepage.features.feature2Desc'), accent: '#2563EB' },
    { icon: DollarSign, title: t('homepage.features.feature3Title'), desc: t('homepage.features.feature3Desc'), accent: '#06B6D4' },
    { icon: Shield, title: t('homepage.features.feature4Title'), desc: t('homepage.features.feature4Desc'), accent: '#2563EB' },
    { icon: Smartphone, title: t('homepage.features.feature5Title'), desc: t('homepage.features.feature5Desc'), accent: '#06B6D4' },
    { icon: Headphones, title: t('homepage.features.feature6Title'), desc: t('homepage.features.feature6Desc'), accent: '#2563EB' },
  ];

  return (
    <div
      className="min-h-screen bg-[#0B0F19] text-white overflow-x-hidden"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {/* ═══ Google Fonts ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Manrope', sans-serif; }
        .font-mono-data { font-family: 'Space Grotesk', monospace; }
        
        /* Clean minimal styles */
      `}</style>

      {/* ════════════════════════════════════════════════════════
          HERO SECTION — Asymmetric Split Layout
      ═════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[100dvh] flex items-center overflow-hidden">
        <NocturnalGrid />

        {/* Clean Hero Background without ambient orbs */}


        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-20 lg:py-0"
        >
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-center">
            {/* Left — Copy */}
            <AnimatedSection className="space-y-8">
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2.5 rounded-full border border-slate-700/50 bg-slate-800/50 px-4 py-1.5">
                <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
                  {t('homepage.hero.badge', 'Virtual Number Platform')}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={FADE_UP} className="font-display text-[clamp(2.2rem,5.5vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight">
                <span className="text-slate-50">OneSMS</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  {t('homepage.hero.titleHighlight')}
                </span>
              </motion.h1>

              {/* Subline */}
              <motion.p variants={FADE_UP} className="text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed">
                {t('homepage.hero.description')}
              </motion.p>

              {/* CTA */}
              <motion.div variants={FADE_UP}>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97, y: 1 }}
                    className="group relative h-14 px-10 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg text-white shadow-[0_4px_24px_rgba(6,182,212,0.3)] transition-shadow hover:shadow-[0_8px_40px_rgba(6,182,212,0.4)]"
                  >
                    <span className="flex items-center gap-3">
                      {t('homepage.hero.getStarted')}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                </Link>
              </motion.div>
            </AnimatedSection>

            {/* Right — Bento Stats Grid */}
            <AnimatedSection className="grid grid-cols-2 gap-3 sm:gap-4" delay={200}>
              {[
                { value: stats?.availableNumbers || '5.2M+', label: t('homepage.stats.availableNumbers'), accent: 'cyan' },
                { value: `${stats?.services || '1683'}+`, label: t('homepage.stats.services'), accent: 'blue' },
                { value: `${stats?.countries || '180'}+`, label: t('homepage.stats.countries'), accent: 'cyan' },
                { value: stats?.successRate || '99.7%', label: t('homepage.stats.successRate'), accent: 'blue' },
              ].map((stat, i) => (
                <GlassCard key={i} className="p-5 sm:p-6">
                  <div className={`font-mono-data text-2xl sm:text-3xl font-bold ${stat.accent === 'cyan' ? 'text-cyan-400' : 'text-blue-400'} mb-1.5`}>
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium">{stat.label}</div>
                </GlassCard>
              ))}
            </AnimatedSection>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SERVICES — Asymmetric flowing grid
      ═════════════════════════════════════════════════════════ */}
      {showServiceLogos && (
        <section className="relative py-20 sm:py-28">
          <NocturnalGrid />
          <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
            <AnimatedSection>
              <motion.div variants={FADE_UP} className="mb-12 lg:mb-16 max-w-xl">
                <p className="text-xs font-semibold tracking-[0.2em] text-cyan-400/60 uppercase mb-3">
                  {t('homepage.services.title', 'Supported Services')}
                </p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-100">
                  {t('homepage.services.sectionTitle', 'All the platforms you need')}
                </h2>
              </motion.div>

              {/* Service brand tiles — flowing wrap, not equal grid */}
              <motion.div variants={STAGGER_CHILDREN} className="flex flex-wrap gap-3 sm:gap-4">
                {displayServices.map((service) => {
                  const brand = SERVICE_BRANDS[service.code];
                  if (!brand) return null;
                  const bgStyle = brand.bg.startsWith('linear')
                    ? { background: brand.bg }
                    : { backgroundColor: brand.bg };
                  const routeMap: Record<string, string> = {
                    wa: '/landing/whatsapp',
                    tg: '/landing/telegram',
                    ig: '/landing/instagram',
                    ds: '/landing/discord',
                  };
                  const targetRoute = routeMap[service.code] || '/catalog';

                  return (
                    <Link key={service.code} to={targetRoute}>
                      <motion.div
                        variants={SCALE_IN}
                        whileHover={{ scale: 1.08, transition: SPRING }}
                        className="group relative"
                      >
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg transition-shadow group-hover:shadow-xl"
                          style={bgStyle}
                        >
                          {brand.svg}
                        </div>
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {brand.label}
                        </span>
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>

              {/* More indicator */}
              <motion.div variants={FADE_UP} className="mt-14">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5">
                  <span className="text-sm text-slate-400">
                    + {stats?.services || 1600} {t('homepage.services.more', 'services available')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                </div>
              </motion.div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          FEATURES — Bento Grid Design (Light Theme Stripe)
      ═════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 lg:auto-rows-[220px]">
              {/* Card 1: Activation Instantanée */}
              <motion.div variants={FADE_UP} className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20 flex items-center justify-center text-white">
                    <Zap className="w-6 h-6" fill="currentColor" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-2">Activation Instantanée</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">Recevez votre numéro virtuel en moins de 3 secondes. Zéro attente, zéro friction.</p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold">
                    <Zap className="w-3 h-3" />
                    <span>&lt; 3 sec</span>
                  </div>
                </div>
              </motion.div>

              {/* Card 4: Couverture Mondiale (Green) -> Spans 2 rows */}
              <motion.div variants={FADE_UP} className="md:row-span-2 lg:col-start-3 bg-[#10B981] rounded-3xl p-8 shadow-xl shadow-emerald-500/10 flex flex-col justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white mb-6">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white mb-3">Couverture Mondiale</h3>
                  <p className="text-emerald-50 leading-relaxed text-sm">190+ pays et 1683+ services couverts. Où que vous soyez, nous sommes là.</p>
                </div>
                <div className="relative z-10 flex gap-3 mt-8">
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-4 flex-1">
                    <div className="font-display text-2xl font-bold text-white mb-1">190+</div>
                    <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Pays</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-4 flex-1">
                    <div className="font-display text-2xl font-bold text-white mb-1">1683+</div>
                    <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Services</div>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Prix Imbattables */}
              <motion.div variants={FADE_UP} className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-2">Prix Imbattables</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">À partir de 1₳ par activation. Tarifs transparents, sans frais cachés.</p>
                </div>
              </motion.div>

              {/* Card 3: Sécurité Maximale (Dark) */}
              <motion.div variants={FADE_UP} className="bg-[#111827] rounded-3xl p-8 shadow-xl flex flex-col sm:flex-row sm:items-center gap-6 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full" />
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/30 flex items-center justify-center text-white relative z-10">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="relative z-10">
                  <h3 className="font-display text-xl font-bold text-white mb-2">Sécurité Maximale</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Chiffrement bout-en-bout, données jamais partagées. Votre vie privée est sacrée.</p>
                </div>
              </motion.div>

              {/* Card 5: Interface Premium */}
              <motion.div variants={FADE_UP} className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200 flex items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-violet-500 shadow-lg shadow-violet-500/20 flex items-center justify-center text-white">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-slate-900 mb-2">Interface Premium</h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-[200px]">Dashboard intuitif et moderne. Gérez tout en un clic depuis n'importe quel appareil.</p>
                  </div>
                </div>
                <div className="hidden md:flex flex-col gap-2 opacity-30">
                  <div className="w-12 h-1.5 rounded-full bg-slate-400" />
                  <div className="w-16 h-1.5 rounded-full bg-slate-400" />
                  <div className="w-10 h-1.5 rounded-full bg-slate-400" />
                </div>
              </motion.div>

              {/* Card 6: Support Dédié 24/7 (Blue Gradient) */}
              <motion.div variants={FADE_UP} className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-xl shadow-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white mb-2">Support Dédié 24/7</h3>
                    <p className="text-sm text-blue-100 leading-relaxed max-w-[300px]">Équipe réactive en français et anglais. Réponse en moins de 5 minutes.</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full relative z-10 mt-4 sm:mt-0">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">En ligne</span>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS — Custom Mockup Cards
      ═════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 bg-[#0B0F19]">
        <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <AnimatedSection>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Step 1 */}
              <motion.div variants={FADE_UP} className="bg-[#111623] rounded-[2rem] p-8 border border-slate-800 relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="absolute right-6 top-4 font-display text-[80px] font-black text-slate-800/30 select-none">01</div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6 relative z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3 relative z-10">Choisir le Service</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 relative z-10 max-w-[280px]">Sélectionnez le service et le pays parmi plus de 1683 options disponibles.</p>
                
                {/* Mockup 1 */}
                <div className="mt-auto bg-[#0B0F19] rounded-2xl p-4 border border-slate-800/80 relative z-10">
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">WA</div>
                      <span className="text-sm font-medium text-slate-300">WhatsApp</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">TG</div>
                      <span className="text-sm font-medium text-white">Telegram</span>
                    </div>
                    <Check className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={FADE_UP} className="bg-[#111623] rounded-[2rem] p-8 border border-slate-800 relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="absolute right-6 top-4 font-display text-[80px] font-black text-slate-800/30 select-none">02</div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6 relative z-10">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3 relative z-10">Obtenir un Numéro</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 relative z-10 max-w-[280px]">Recevez instantanément un numéro virtuel prêt à l'emploi en 3 secondes.</p>
                
                {/* Mockup 2 */}
                <div className="mt-auto bg-[#0B0F19] rounded-2xl p-6 border border-slate-800/80 relative z-10 flex flex-col items-center justify-center gap-4 shadow-inner">
                  <div className="font-mono-data text-2xl font-bold text-white tracking-widest">+1 (555) 123-4567</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Succès</span>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={FADE_UP} className="bg-[#111623] rounded-[2rem] p-8 border border-slate-800 relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="absolute right-6 top-4 font-display text-[80px] font-black text-slate-800/30 select-none">03</div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6 relative z-10">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3 relative z-10">Recevoir le Code</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 relative z-10 max-w-[280px]">Le code SMS de vérification apparaît automatiquement dans votre dashboard.</p>
                
                {/* Mockup 3 */}
                <div className="mt-auto bg-[#0B0F19] rounded-2xl p-6 border border-slate-800/80 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">SMS REÇU</span>
                    </div>
                    <span className="text-[10px] text-slate-500">À l'instant</span>
                  </div>
                  <div className="font-mono-data text-3xl font-bold text-white tracking-[0.2em] text-center">847 291</div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          PRICING — Asymmetric Glassmorphism Cards
      ═════════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-20 sm:py-28 scroll-mt-20">
        <NocturnalGrid />

        <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <AnimatedSection>
            <motion.div variants={FADE_UP} className="mb-12 lg:mb-16 max-w-xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-cyan-400/60 uppercase mb-3">
                <CreditCard className="inline w-4 h-4 mr-2 -mt-0.5" />
                {t('homepage.pricing.subtitle')}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-100 mb-4">
                {t('homepage.pricing.title')}
              </h2>
              <p className="text-base text-slate-400">
                {t('homepage.pricing.description', 'Choose your activation package and start receiving SMS instantly')}
              </p>
            </motion.div>

            {/* Horizontal scroll on mobile, grid on desktop */}
            <div className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-5 overflow-x-auto lg:overflow-visible pb-6 lg:pb-0 snap-x snap-mandatory scrollbar-hide">
              {(topUpPackages.length > 0
                ? topUpPackages
                : [
                    { id: 'f1', activations: 5, price_xof: 500, is_popular: false, savings_percentage: 0 },
                    { id: 'f2', activations: 20, price_xof: 2000, is_popular: true, savings_percentage: 0 },
                    { id: 'f3', activations: 100, price_xof: 10000, is_popular: false, savings_percentage: 0 },
                  ]
              ).map((pkg: any, i: number) => {
                const isPopular = pkg.is_popular;
                return (
                  <motion.div
                    key={pkg.id || i}
                    variants={SCALE_IN}
                    className={`flex-shrink-0 w-[300px] lg:w-auto snap-center ${isPopular ? 'lg:scale-[1.03] z-10' : ''}`}
                  >
                    <div
                      className={`
                        relative rounded-[1.5rem] p-[1px] h-full
                        ${isPopular
                          ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-400'
                          : 'bg-white/[0.06]'}
                      `}
                    >
                      {/* Popular label */}
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-bold px-4 py-1 rounded-full tracking-wide uppercase shadow-[0_4px_16px_rgba(6,182,212,0.4)]">
                            {t('homepage.pricing.mostPopular', 'POPULAIRE')}
                          </div>
                        </div>
                      )}

                      <div className="bg-[#0D1220] rounded-[1.45rem] p-7 sm:p-8 h-full flex flex-col">
                        {/* Activations */}
                        <div className="mb-6">
                          <div className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase mb-2">
                            {t('homepage.pricing.package', 'Package')}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono-data text-4xl sm:text-5xl font-bold text-white">
                              {pkg.activations}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">
                              {t('homepage.pricing.activations', 'activations')}
                            </span>
                          </div>
                        </div>

                        {/* Savings */}
                        {pkg.savings_percentage > 0 && (
                          <div className="inline-flex self-start items-center gap-1.5 bg-cyan-500/10 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full mb-4">
                            -{pkg.savings_percentage}%
                          </div>
                        )}

                        {/* Price */}
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono-data text-3xl font-bold text-white">
                              {formatPrice(pkg.price_xof).replace(/[^\d\s]/g, '').trim()}
                            </span>
                            <span className="text-sm font-semibold text-slate-500">
                              {formatPrice(pkg.price_xof).replace(/[\d\s.,]/g, '').trim().replace('XOF', 'FCFA')}
                            </span>
                          </div>
                        </div>

                        {/* Per unit */}
                        <div className="bg-white/[0.03] rounded-xl p-3 mb-6 border border-white/[0.04]">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">{t('homepage.pricing.perUnit', 'Par activation')}</span>
                            <span className="font-mono-data font-bold text-slate-300">
                              {formatPrice(pkg.price_xof / pkg.activations, true).replace('XOF', 'FCFA')}
                            </span>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-2.5 mb-8 flex-grow">
                          {[
                            t('homepage.pricing.feature1', 'Livraison instantanee'),
                            t('homepage.pricing.feature2', 'Sans expiration'),
                            t('homepage.pricing.feature3', 'Support 24/7'),
                          ].map((feat, fi) => (
                            <div key={fi} className="flex items-center gap-2.5 text-sm text-slate-400">
                              <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                              {feat}
                            </div>
                          ))}
                        </div>

                        {/* CTA */}
                        <Link to="/register" className="block mt-auto">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98, y: 1 }}
                            className={`
                              w-full h-12 rounded-xl font-bold text-sm transition-all
                              ${isPopular
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_4px_20px_rgba(6,182,212,0.3)]'
                                : 'bg-white/[0.06] text-slate-300 border border-white/[0.08] hover:bg-white/[0.1]'}
                            `}
                          >
                            {t('homepage.pricing.buyNow', 'Acheter')}
                          </motion.button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Custom package CTA */}
            <motion.div variants={FADE_UP} className="mt-12 text-center">
              <p className="text-sm text-slate-500 mb-3">{t('homepage.pricing.customPackage', 'Need a custom package?')}</p>
              <Link to="/contact">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="h-11 px-8 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-colors"
                >
                  {t('homepage.pricing.contactUs', 'Contact Us')}
                </motion.button>
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          REFERRAL — Asymmetric Split Glassmorphism
      ═════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28">
        <NocturnalGrid />

        <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <AnimatedSection>
            <GlassCard hover={false} className="overflow-hidden">
              <div className="grid lg:grid-cols-[1.3fr_1fr]">
                {/* Left content */}
                <div className="p-8 sm:p-10 lg:p-14">
                  <motion.div variants={FADE_UP}>
                    <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 mb-6">
                      <Gift className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">
                        {t('homepage.referralBanner.badge')}
                      </span>
                    </div>
                  </motion.div>

                  <motion.h2 variants={FADE_UP} className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 mb-3 leading-tight">
                    {t('homepage.referralBanner.title')}{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                      {t('homepage.referralBanner.titleHighlight')}
                    </span>
                  </motion.h2>

                  <motion.p variants={FADE_UP} className="text-sm text-slate-400 mb-8 max-w-lg leading-relaxed">
                    {t('homepage.referralBanner.description')}
                  </motion.p>

                  {/* Benefits */}
                  <motion.div variants={STAGGER_CHILDREN} className="space-y-3 mb-8">
                    {[t('homepage.referralBanner.benefit1'), t('homepage.referralBanner.benefit2'), t('homepage.referralBanner.benefit3')].map((b, i) => (
                      <motion.div
                        key={i}
                        variants={FADE_UP}
                        className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-sm text-slate-300 font-medium">{b}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.div variants={FADE_UP}>
                    <Link to="/register">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97, y: 1 }}
                        className="h-13 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-[0_4px_24px_rgba(6,182,212,0.3)] transition-shadow hover:shadow-[0_8px_40px_rgba(6,182,212,0.4)]"
                      >
                        <span className="flex items-center gap-2">
                          {t('homepage.referralBanner.cta')}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>

                {/* Right — Visual */}
                <div className="border-t lg:border-t-0 lg:border-l border-white/[0.04] p-8 sm:p-10 lg:p-14 flex flex-col items-center justify-center bg-gradient-to-br from-white/[0.01] to-transparent">
                  <motion.div variants={SCALE_IN} className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
                      <Users className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{t('homepage.referralBanner.haveCode')}</p>
                    <p className="text-lg font-bold text-slate-200 mb-6">{t('homepage.referralBanner.enterCode')}</p>

                    {/* Fake code */}
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-6 py-4 inline-block">
                      <div className="flex items-center gap-3 justify-center">
                        <Gift className="w-4 h-4 text-cyan-400" />
                        <span className="font-mono-data text-lg font-bold tracking-widest text-cyan-300">ABC123XYZ</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">{t('homepage.referralBanner.codeExample')}</p>
                    </div>

                    <Link to="/referral" className="flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium mt-6 transition-colors">
                      {t('homepage.referralBanner.ctaLearnMore')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </GlassCard>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
      ═════════════════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32">
        <NocturnalGrid />
        {/* Ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <AnimatedSection>
            <motion.h2 variants={FADE_UP} className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 mb-5 leading-tight">
              {t('homepage.cta.title')}
            </motion.h2>
            <motion.p variants={FADE_UP} className="text-base sm:text-lg text-slate-400 mb-10 max-w-xl mx-auto">
              {t('homepage.cta.subtitle')}
            </motion.p>
            <motion.div variants={FADE_UP}>
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96, y: 1 }}
                  className="h-14 px-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg text-white shadow-[0_4px_32px_rgba(6,182,212,0.35)] transition-shadow hover:shadow-[0_8px_48px_rgba(6,182,212,0.45)]"
                >
                  <span className="flex items-center gap-3">
                    {t('homepage.cta.button')}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </motion.button>
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
