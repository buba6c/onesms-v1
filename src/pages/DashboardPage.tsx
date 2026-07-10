/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/uiStore';
import { SmsRevealPopup } from '@/components/ui/SmsRevealPopup';
import { StatusFeedbackModal } from '@/components/ui/StatusFeedbackModal';
import { PaymentSuccessModal } from '@/components/ui/PaymentSuccessModal';
import { useSmsPolling } from '@/hooks/useSmsPolling';
import { useRentPolling, type RentMessagesCache } from '@/hooks/useRentPolling';
import { useRealtimeSms } from '@/hooks/useRealtimeSms';
import { useFeatures } from '@/hooks/useFeatures';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { RentOnboardingModal } from '../components/ui/RentOnboardingModal';
import { ExtendRentalModal } from '@/components/ExtendRentalModal';
import { computeServiceCountrySuccessRate, sortCountriesByReliability, getRealServiceCountryStats, getAnchorCompletedSms } from '@/lib/country-scoring';
import {
  Search,
  X,
  Copy,
  Clock,
  MoreVertical,
  XCircle,
  Home,
  Phone,
  Wallet,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Gift,
  Link2,
  Share2,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Award,
  TrendingUp,
  Sparkles,
  Check,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToastAction } from "@/components/ui/toast";
import { getServiceLogo, getServiceLogoFallback, getServiceIcon, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';
import { getAllServices, getServicesByCategory, SMS_ACTIVATE_COUNTRIES, type SMSActivateService } from '@/lib/sms-activate-data';
import { get5simProductName } from '@/lib/service-mapping';
import { getSetting } from '@/lib/settings';

// ============================================================================
const EMPTY_ARRAY: any[] = [];

// ============================================================================
// 🗺️ MAPPING SMS-ACTIVATE ID → NOM DU PAYS
// Pour convertir les country_code stockés en DB vers des noms lisibles
// ============================================================================
const SMS_ACTIVATE_ID_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.values(SMS_ACTIVATE_COUNTRIES).map(c => [c.id.toString(), c.name])
);

// ============================================================================
// 🎯 MAPPING COMPLET DES CODES SERVICES → NOMS
// Pour éviter d'afficher les codes bruts (wa, tg, fb...) à la place des noms
// ============================================================================
const SERVICE_CODE_TO_NAME: Record<string, string> = {
  // 📱 TOP SOCIAL / MESSAGING
  'wa': 'WhatsApp', 'tg': 'Telegram', 'ig': 'Instagram', 'fb': 'Facebook',
  'tw': 'Twitter/X', 'ds': 'Discord', 'fu': 'Snapchat', 'lf': 'TikTok',
  'vi': 'Viber', 'wb': 'WeChat', 'vk': 'VKontakte', 'ok': 'Odnoklassniki',
  'tn': 'LinkedIn', 'bnl': 'Reddit', 'me': 'Line', 'kt': 'KakaoTalk',
  'bw': 'Signal', 'op': 'Imo', 'chy': 'Zalo', 'qq': 'QQ',
  'sg': 'Signal', 'sk': 'Skype', 'sl': 'Slack', 'zm': 'Zoom',

  // 🔍 TECH & SERVICES
  'go': 'Google', 'mm': 'Microsoft', 'wx': 'Apple', 'dr': 'OpenAI/ChatGPT',
  'mb': 'Yahoo', 'pm': 'AOL', 'nv': 'Naver', 'yw': 'Yandex', 'bd': 'Baidu',

  // 🛒 SHOPPING
  'am': 'Amazon', 'ka': 'Shopee', 'dl': 'Lazada', 'ep': 'Temu', 'aez': 'Shein',
  'hx': 'AliExpress', 'za': 'JD.com', 'xt': 'Flipkart', 'dh': 'eBay',
  'sn': 'OLX', 'kc': 'Vinted', 'wr': 'Walmart', 'by': 'Mercari',

  // 💰 FINANCE
  'ts': 'PayPal', 're': 'Coinbase', 'aon': 'Binance', 'nc': 'Payoneer',
  'ij': 'Revolut', 'bo': 'Wise', 'ti': 'Crypto.com', 'hw': 'Alipay',
  'xh': 'OVO', 'fr': 'Dana', 'hy': 'GoPay', 'ev': 'PicPay',
  'adi': 'Cash App', 'aat': 'Venmo', 'aji': 'Skrill', 'afz': 'Klarna',

  // 🍕 DELIVERY
  'ub': 'Uber', 'jg': 'Grab', 'ac': 'DoorDash', 'aq': 'Glovo',
  'rr': 'Wolt', 'nz': 'Foodpanda', 'ni': 'Gojek', 'xk': 'DiDi',
  'rl': 'inDriver', 'ki': '99app',

  // ❤️ DATING
  'oi': 'Tinder', 'mo': 'Bumble', 'qv': 'Badoo', 'vz': 'Hinge',
  'df': 'Happn', 'gr': 'Grindr', 'bpd': 'Feeld',

  // 🎮 GAMING
  'mt': 'Steam', 'aiw': 'Roblox', 'blm': 'Epic Games', 'bz': 'Blizzard',
  'ah': 'Escape From Tarkov', 'xo': 'Xbox', 'ps': 'PlayStation',

  // 🎬 ENTERTAINMENT
  'nf': 'Netflix', 'alj': 'Spotify', 'hb': 'Twitch', 'yt': 'YouTube',
  'dp': 'Disney+', 'hbo': 'HBO Max', 'pr': 'Prime Video',

  // 📞 TELECOM
  'at': 'AT&T', 've': 'Verizon', 'tmb': 'T-Mobile', 'vo': 'Vodafone',
  'ora': 'Orange', 'sf': 'SFR', 'bou': 'Bouygues',

  // 🏦 BANKING
  'ing': 'ING', 'bnp': 'BNP', 'hsbc': 'HSBC', 'brc': 'Barclays',
  'dv': 'Monzo', 'dx': 'Monese', 'n26': 'N26',

  // 🚗 TRANSPORT
  'ly': 'Lyft', 'bt': 'Bolt', 'cp': 'Cabify', 'fn': 'FreeNow',

  // 🔧 OTHER
  'ot': 'Any Other', 'full': 'Full Rent',

  // 🇨🇳 CHINA SERVICES
  'dz': 'Douyin', 'xhs': 'Xiaohongshu', 'weibo': 'Weibo',
  'taobao': 'Taobao', 'pdd': 'Pinduoduo', 'jd': 'JD.com', 'meituan': 'Meituan',
};

// Helper: Convertir country_code en nom lisible
const getCountryName = (code: string): string => {
  if (!code) return 'Unknown';

  // Enlever le préfixe "rent-" si présent
  const cleanCode = code.replace(/^rent-/i, '');

  // Essayer de trouver dans le mapping
  const name = SMS_ACTIVATE_ID_TO_NAME[cleanCode] || SMS_ACTIVATE_ID_TO_NAME[cleanCode.toLowerCase()];
  if (name) return name;

  // Si c'est un nombre, essayer de le mapper
  if (/^\d+$/.test(cleanCode)) {
    return SMS_ACTIVATE_ID_TO_NAME[cleanCode] || `Country ${cleanCode}`;
  }

  // Sinon, formater le code (remplacer _ par espace, capitaliser)
  return cleanCode
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

// ============================================================================
// 🎯 PRIORITÉ DES SERVICES - Basé sur l'ordre officiel SMS-Activate
// Source: https://sms-activate.io/rent et https://sms-activate.io/freePrice
// ============================================================================
const SERVICE_PRIORITY: Record<string, number> = {
  // 🔥 TOP SERVICES RENT (ordre SMS-Activate.io/rent)
  'full': 1000,    // Location complète - toujours en premier
  'hw': 980,       // Alipay / Alibaba / 1688
  'go': 960,       // Google, YouTube, Gmail
  'wa': 940,       // WhatsApp
  'oi': 920,       // Tinder
  'fb': 900,       // Facebook
  'ot': 880,       // Any other
  'tg': 860,       // Telegram
  'wx': 840,       // Apple / WeChat
  'mb': 820,       // Yahoo

  // 📱 TOP SERVICES ACTIVATION (homepage SMS-Activate)
  'ig': 800,       // Instagram + Threads
  'tt': 780,       // TikTok / Douyin
  'ds': 760,       // Discord
  'vi': 740,       // Viber
  'tw': 720,       // Twitter / X
  'nf': 700,       // Netflix
  'am': 680,       // Amazon
  'pp': 660,       // PayPal
  'ms': 640,       // Microsoft
  'li': 620,       // LinkedIn
  'sn': 600,       // Snapchat
  'ok': 580,       // OK.ru / Odnoklassniki
  'vk': 560,       // VKontakte
  'dr': 540,       // OpenAI / ChatGPT
  'ub': 520,       // Uber
  'gr': 500,       // Grab
  'ym': 480,       // Yandex
  'gl': 460,       // Globo
  'lf': 440,       // TikTok / Douyin (alt)
  'me': 420,       // Line Messenger

  // 🎮 GAMING
  'st': 400,       // Steam
  'ep': 380,       // Epic Games
  'rc': 360,       // Rockstar
  'ea': 340,       // EA / Origin
  'bg': 320,       // Blizzard

  // 💰 FINANCIAL
  'qw': 300,       // Qiwi
  'bn': 280,       // Binance
  'cb': 260,       // Coinbase
  'rv': 240,       // Revolut
  'ws': 220,       // Wise

  // 🛒 E-COMMERCE
  'av': 200,       // Avito
  'al': 180,       // AliExpress
  'eb': 160,       // eBay
  'et': 140,       // Etsy
  'sh': 120,       // Shopee

  // 🚗 TRANSPORT
  'dd': 100,       // DiDi
  'bk': 80,        // Bolt
  'ly': 60,        // Lyft

  // Default pour services non-listés
  'default': 0
};

// Fonction pour obtenir la priorité d'un service
const getServicePriority = (code: string): number => {
  return SERVICE_PRIORITY[code?.toLowerCase()] ?? SERVICE_PRIORITY['default'];
};

// Gestionnaire d'erreur pour les logos de SERVICES - utilise fallback SVG au lieu d'emoji
const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>, serviceCode: string) => {
  const target = e.target as HTMLImageElement

  // Empêcher les multiples déclenchements et boucles infinies
  if (target.dataset.fallbackLoaded === 'true') {
    // Si le fallback échoue aussi, afficher l'emoji
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
    return
  }

  // Charger le fallback SVG
  target.dataset.fallbackLoaded = 'true'
  target.src = getServiceLogoFallback(serviceCode)
}

// Gestionnaire d'erreur pour les drapeaux de PAYS - utilise emoji au lieu de logo.dev
const handleFlagError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.target as HTMLImageElement
  // Cacher l'image et afficher l'emoji à la place
  target.style.display = 'none'
  const emoji = target.nextElementSibling as HTMLSpanElement
  if (emoji) {
    emoji.style.display = 'flex'
  }
}

// Helper function to get badge color based on success rate
const getSuccessRateBadge = (rate: number) => {
  if (rate >= 95) {
    return {
      bg: 'bg-green-500',
      text: 'text-white',
      label: 'Excellent'
    };
  } else if (rate >= 85) {
    return {
      bg: 'bg-yellow-500',
      text: 'text-white',
      label: 'Bon'
    };
  } else if (rate >= 70) {
    return {
      bg: 'bg-orange-500',
      text: 'text-white',
      label: 'Moyen'
    };
  } else {
    return {
      bg: 'bg-red-500',
      text: 'text-white',
      label: 'Faible'
    };
  }
};

interface Service {
  id: string;
  name: string;
  code?: string;
  icon: string;
  count: number;
}

interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  successRate: number;
  count: number;
  price: number;
}

interface ActiveNumber {
  id: string;
  orderId: string;
  activationId: string;
  phone: string;
  service: string;
  country: string;
  timeRemaining: number;
  expiresAt: string; // ISO timestamp pour recalculer timeRemaining
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled' | 'active';
  smsCode?: string;
  smsText?: string;
  price: number;
  charged: boolean;
  metadata?: Record<string, any>;
  // Champs spécifiques aux rentals
  type?: 'activation' | 'rental';
  rentalId?: string;
  durationHours?: number;
  messageCount?: number;
  createdAt?: string; // Pour calculer l'âge du rental
  frozenAmount?: number; // Pour afficher dans le dialog
  provider?: 'sms-activate' | '5sim' | 'grizzly' | 'textverified' | 'smspool' | 'onlinesim' | 'smspva'; // Provider for multi-provider support
}

// Types pour les données DB brutes
interface DBService {
  code: string;
  name: string;
  display_name: string | null;
  icon: string | null;
  total_available: number | null;
  category: string | null;
  popularity_score: number | null;
}

interface DBActivation {
  id: string;
  order_id: string;
  phone: string;
  service_code: string;
  country_code: string;
  expires_at: string;
  sms_code: string | null;
  sms_text: string | null;
  price: number;
  charged: boolean;
  status: string;
  created_at: string;
  frozen_amount: number | null;
  provider: string;
}

interface DBRental {
  id: string;
  order_id: number | null;
  rent_id: string | null;
  rental_id: string | null;
  phone: string;
  service_code: string;
  country_code: string;
  expires_at: string | null;
  end_date: string | null;
  start_date: string | null;
  rent_hours: number | null;
  duration_hours: number | null;
  total_cost: number | null;
  price: number | null;
  hourly_rate: number | null;
  message_count: number | null;
  sms_count: number | null;
  status: string;
  created_at: string;
  frozen_amount: number | null;
}

// Types pour les requêtes de pays et pricing
interface DBCountry {
  id: string;
  name: string;
  code: string;
  success_rate: number | null;
}

interface DBPricingRule {
  country_code: string;
  activation_price: number;
  available_count: number;
}

interface DBUserProfile {
  id: string;
  email: string;
  balance: number;
  frozen_balance: number;
}

type Step = 'service' | 'country' | 'confirm' | 'active';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { showSmsReveal, showStatusFeedback } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<'activation' | 'rent'>('activation');
  const { isRentalsEnabled } = useFeatures();

  // Force activation mode if rentals are disabled
  useEffect(() => {
    if (!isRentalsEnabled && mode === 'rent') {
      setMode('activation');
    }
  }, [isRentalsEnabled, mode]);

  // Request notification permission on mount via Toast (better UX)
  useEffect(() => {
    import('@/lib/notification-manager').then(({ NotificationManager }) => {
      // Check if supported and not already granted/denied (default)
      if (NotificationManager.isSupported() && NotificationManager.getPermission() === 'default') {
        toast({
          title: "🔔 Notifications SMS",
          description: "Ne ratez plus jamais un code de vérification",
          action: (
            <ToastAction
              altText="Activer les notifications"
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold px-4 shrink-0"
              onClick={() => {
                NotificationManager.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    toast({
                      title: "✅ Notifications activées",
                      description: "Vous recevrez une alerte à chaque SMS",
                      duration: 4000
                    });
                  }
                });
              }}
            >
              Activer
            </ToastAction>
          ),
          duration: Infinity, // Stay open until interaction
        });
      }
    });
  }, []);

  const [rentDuration, setRentDuration] = useState<'4hours' | '1day' | '1week' | '1month'>('4hours');

  // 🚀 FLASH-FREE: Initialize step from localStorage to immediately show correct view
  const getInitialStep = (): Step => {
    try {
      const hasActiveNumbers = localStorage.getItem('onesms_has_active_numbers');
      return hasActiveNumbers === 'true' ? 'active' : 'service';
    } catch {
      return 'service';
    }
  };
  const [currentStep, setCurrentStep] = useState<Step>(getInitialStep);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // Afficher tous les services (triés par popularity_score comme SMS-Activate)
  const [searchService, setSearchService] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);

  // State pour le popup de solde insuffisant
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
  const [insufficientBalanceData, setInsufficientBalanceData] = useState<{
    needed: number;
    available: number;
    missing: number;
  } | null>(null);

  // State pour le modal des messages de rental
  const [showRentMessagesModal, setShowRentMessagesModal] = useState(false);
  const [selectedRentalForMessages, setSelectedRentalForMessages] = useState<{
    rentalId: string;
    phone: string;
    service: string;
  } | null>(null);
  const [rentMessagesCache, setRentMessagesCache] = useState<RentMessagesCache>({});
  const [isLoadingRentMessages, setIsLoadingRentMessages] = useState(false);

  // State pour le modal d'attente SMS (activations)
  const [showSmsWaitingModal, setShowSmsWaitingModal] = useState(false);
  const [selectedActivation, setSelectedActivation] = useState<ActiveNumber | null>(null);

  // Référentiel parrainage
  const referralCode = user?.referral_code as string | undefined;
  const [referralLinkBase, setReferralLinkBase] = useState<string>('');

  useEffect(() => {
    const loadReferralBase = async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_setting', { setting_key: 'referral_link_base' });

        if (!error && data) {
          setReferralLinkBase(String(data));
        }
      } catch (err) {
        console.warn('[REFERRAL] load base failed', err);
      }
    };
    loadReferralBase();
  }, []);

  const referralLink = useMemo(() => {
    const base = referralLinkBase || (typeof window !== 'undefined' ? `${window.location.origin}/register` : '');
    if (!referralCode) return base;
    return `${base}?ref=${encodeURIComponent(referralCode)}`;
  }, [referralCode, referralLinkBase]);

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: t('referral.copiedCode') });
    } catch {
      toast({ title: t('common.error'), description: t('referral.copyFallback'), variant: 'destructive' });
    }
  };

  const handleShareReferral = async () => {
    if (!referralLink) return;
    const payload = {
      title: t('referral.shareTitle'),
      text: t('referral.shareText'),
      url: referralLink
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (err) {
      console.warn('[REFERRAL] native share error', err);
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: t('referral.linkCopied') });
    } catch {
      toast({ title: t('common.error'), description: t('referral.copyFallback'), variant: 'destructive' });
    }
  };

  // Helper pour ouvrir le modal d'attente SMS
  const openSmsWaitingModal = (num: ActiveNumber) => {
    setSelectedActivation(num);
    setShowSmsWaitingModal(true);
  };

  // Helper pour ouvrir le modal et charger les messages
  const openRentMessagesModal = async (rentalId: string, phone: string, service: string) => {
    setSelectedRentalForMessages({ rentalId, phone, service });
    setShowRentMessagesModal(true);

    // Charger les messages depuis l'API
    setIsLoadingRentMessages(true);
    try {
      const { data, error } = await cloudFunctions.invoke('get-rent-status', {
        body: { rentId: rentalId, userId: user?.id }
      });

      if (!error && data?.messages) {
        setRentMessagesCache(prev => ({
          ...prev,
          [rentalId]: data.messages
        }));
      }
    } catch (e) {
      console.warn('Failed to load rent messages:', e);
    } finally {
      setIsLoadingRentMessages(false);
    }
  };

  // State pour le popup de confirmation Finish Rental
  const [showFinishRentalDialog, setShowFinishRentalDialog] = useState(false);
  const [rentalToFinish, setRentalToFinish] = useState<{ rentalId: string; phone: string } | null>(null);
  const [isFinishingRental, setIsFinishingRental] = useState(false);

  // State pour le popup de confirmation Cancel Rental
    const [showExtendRentalDialog, setShowExtendRentalDialog] = useState(false);
  const [rentalToExtend, setRentalToExtend] = useState<{ rentalId: string; phone: string; service: string } | null>(null);
  const [showCancelRentalDialog, setShowCancelRentalDialog] = useState(false);
  const [rentalToCancel, setRentalToCancel] = useState<{ rentalId: string; phone: string; createdAt: string; frozenAmount?: number; messageCount?: number } | null>(null);
  const [isCancellingRental, setIsCancellingRental] = useState(false);

  // State pour la bannière de succès de paiement
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  
  const [showReferralBonus, setShowReferralBonus] = useState(false);
  const [referralBonusAmount, setReferralBonusAmount] = useState(0);

  // Timer state to force re-render every second for real-time countdown
  const [, setTimerTick] = useState(0);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 AUTO-SWITCH TO ACTIVE VIEW: Basculer immédiatement vers la vue "numéros actifs" si des numéros existent
  const lastActiveCountRef = useRef(0);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    const activationNumbers = activeNumbers.filter(n => n.type !== 'rental');
    const currentCount = activationNumbers.length;
    const prevCount = lastActiveCountRef.current;

    // 🎯 INITIAL AUTO-SWITCH: Only run once when data is first loaded for this session
    if (currentCount > 0 && !hasAutoOpenedRef.current && currentStep === 'service') {
      setCurrentStep('active');
      hasAutoOpenedRef.current = true;
    }

    // 🎯 NEW NUMBER DETECTION: If count INCREASED (new purchase), force switch to active view
    if (currentCount > prevCount && currentCount > 0) {
      if (currentStep !== 'active') {
        setCurrentStep('active');
        // Mark as auto-opened so we don't loop
        hasAutoOpenedRef.current = true;
      }

      // Find the latest number
      const latestNumber = activationNumbers[0];

      if (latestNumber && latestNumber.status !== 'received' && !hasAutoOpenedRef.current) {
        const timeout = setTimeout(() => {
          setSelectedActivation(latestNumber);
          setShowSmsWaitingModal(true);
        }, 100);
        return () => clearTimeout(timeout);
      }
    }

    // 🎯 AUTO-CLOSE: If no active numbers left, go back to service view
    if (currentCount === 0 && currentStep === 'active') {
      setCurrentStep('service');
      hasAutoOpenedRef.current = false;
    }

    // 💾 PERSIST
    try {
      localStorage.setItem('onesms_has_active_numbers', currentCount > 0 ? 'true' : 'false');
    } catch { }

    // Update ref for next render
    lastActiveCountRef.current = currentCount;

  }, [activeNumbers, currentStep]);

  // Utility function to calculate minutes elapsed since rental creation
  const calculateMinutesElapsed = (createdAt: string): number => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  // 💰 Detect payment success from URL params (after MoneyFusion redirect)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      // Show success banner (visible on mobile)
      setShowPaymentSuccess(true);

      // Refresh user balance
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });

      // 🎁 Check if user received a referral bonus (within last 60 seconds)
      const checkReferralBonus = async () => {
        if (!user?.id) return;

        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

        const { data: bonusTx } = await (supabase
          .from('transactions') as any)
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'referral_bonus')
          .eq('status', 'completed')
          .gte('created_at', oneMinuteAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (bonusTx && bonusTx.length > 0) {
          const bonusAmount = bonusTx[0].amount as number;
          setReferralBonusAmount(bonusAmount);
          setShowReferralBonus(true);

          // Toast for referral bonus
          toast({
            title: `🎁 ${t('toasts.referralBonusReceived')}`,
            description: t('toasts.referralBonusReceivedDesc', { amount: bonusAmount }),
            duration: 10000,
          });
        }
      };

      // Delay slightly to ensure webhook has processed
      setTimeout(checkReferralBonus, 2000);

      // Auto-hide banner after 10 seconds
      setTimeout(() => setShowPaymentSuccess(false), 10000);

      // Remove the payment param from URL to avoid showing toast on refresh
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      toast({
        title: `❌ ${t('toasts.paymentFailed')}`,
        description: t('toasts.paymentFailedDesc'),
        variant: 'destructive',
        duration: 5000,
      });

      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  // Fetch services - OPTIMISÉ: Lecture directe depuis DB avec total_available mis à jour par Cron
  // 🔄 En mode RENT, on charge les services depuis l'API getRentServicesAndCountries
  const { data: services = EMPTY_ARRAY, isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ['services', selectedCategory, mode, rentDuration],
    queryFn: async () => {
      // Debug disabled: console.log(`⚡ [SERVICES] Chargement mode=${mode}...`);

      // 🏠 MODE RENT: Charger les services disponibles pour la location via API
      if (mode === 'rent') {
        // Loading rent services from API

        try {
          const rentTimeMap: Record<string, string> = {
            '4hours': '4',
            '1day': '24',
            '1week': '168',
            '1month': '720'
          };
          const rentTime = rentTimeMap[rentDuration];

          // Appeler l'API pour obtenir les services rent
          const { data: rentData, error } = await cloudFunctions.invoke('get-sms-activate-rent-services', {
            body: { time: rentTime, getServices: true } // getServices: true is handled below to fetch for default country
          });

          if (error) {
            console.error('❌ [RENT SERVICES] Erreur:', error);
            throw error;
          }

          // Récupérer les noms des services depuis la DB
          const { data: dbServices } = await supabase
            .from('services')
            .select('code, name, display_name')
            .eq('active', true) as { data: { code: string; name: string; display_name: string }[] | null; error: any };

          const serviceNamesMap = new Map(
            dbServices?.map(s => [s.code, s.display_name || s.name]) || []
          );

          // Create a map of available quantities from API
          const availableQuantities = new Map(
            (rentData?.availableServices || []).map((s: any) => [s.code, s.available || 0])
          );

          // Mapper tous les services de la DB (actifs) vers le format Service
          const mappedServices = (dbServices || [])
            .filter(s => s.code !== 'full' && s.code !== 'ot' && s.code !== 'any') // Exclure full et "Any other"
            .map(s => {
              const quantity = availableQuantities.get(s.code) || 0;
              return {
                id: s.code,
                name: s.display_name || s.name || s.code,
                code: s.code,
                icon: s.code,
                count: quantity, // Quantité réelle ou 0 si pas de stock
                _priority: getServicePriority(s.code)
              };
            })
            .sort((a, b) => {
              // Si un service a du stock et l'autre non, celui avec stock passe en premier
              if (Number(a.count) > 0 && Number(b.count) === 0) return -1;
              if (Number(a.count) === 0 && Number(b.count) > 0) return 1;
              
              // Ensuite on trie par priorité
              if (a._priority !== b._priority) return b._priority - a._priority;
              
              // Enfin par quantité décroissante
              return Number(b.count) - Number(a.count);
            })
            .map(({ _priority, ...service }) => service);

          // Top 5 rent services logged

          return mappedServices;

        } catch (err) {
          console.error('❌ [RENT SERVICES] Erreur, fallback vers DB:', err);
          // Fallback: charger depuis DB comme avant
        }
      }

      // 📱 MODE ACTIVATION: Charger depuis la DB (comportement actuel)

      // Récupérer les services depuis la DB avec total_available à jour
      // Utiliser .range() au lieu de .limit() pour contourner la limite PostgREST de 1000
      const { data: dbServices, error } = await supabase
        .from('services')
        .select('code, name, display_name, icon, total_available, category, popularity_score')
        .eq('active', true)
        .order('popularity_score', { ascending: false })
        .order('total_available', { ascending: false })
        .range(0, 9999) as { data: DBService[] | null; error: any }; // Range permet de dépasser la limite PostgREST par défaut

      if (error) {
        console.error('❌ [SERVICES] Erreur DB:', error);
        throw error;
      }

      if (!dbServices || dbServices.length === 0) {
        console.warn('⚠️ [SERVICES] Aucun service disponible');
        // Fallback: utiliser get-services-counts si DB est vide
        console.error('⚠️ [SERVICES] Fallback vers API Edge function...');
        const { data: fallbackData } = await cloudFunctions.invoke('get-services-counts', {
          body: { countries: [187, 4, 6] }
        });

        const staticServices = selectedCategory === 'all'
          ? getAllServices()
          : getServicesByCategory(selectedCategory as any);

        const counts = fallbackData?.counts || {};

        // 🎯 Appliquer le même tri intelligent au fallback
        return staticServices
          .filter(s => s.code !== 'ot' && s.code !== 'any') // 🚫 Masquer "Any other" en activation
          .map(s => ({
            id: s.code,
            name: s.name,
            code: s.code,
            icon: s.code,
            count: counts[s.code] || 0,
            _priority: getServicePriority(s.code)
          }))
          .filter(s => s.count > 0)
          .sort((a, b) => {
            if (a._priority !== b._priority) return b._priority - a._priority;
            return b.count - a.count;
          })
          .map(({ _priority, ...service }) => service);
      }

      // Filtrer par catégorie si nécessaire
      let filtered = selectedCategory === 'all'
        ? dbServices
        : dbServices.filter(s => s.category === selectedCategory);

      // 🚫 Masquer "Any other" (code: ot, any) en activation et rent
      if (mode === 'activation' || mode === 'rent') {
        filtered = filtered.filter(s => s.code !== 'ot' && s.code !== 'any');
      }

      // Debug: Services loaded from DB
      // console.log('✅ [SERVICES] Chargés depuis DB:', filtered.length, 'services');

      // 🎯 Tri intelligent basé sur l'ordre SMS-Activate officiel
      const sortedServices = filtered
        .map(s => ({
          id: s.code,
          name: s.display_name || s.name,
          code: s.code,
          icon: s.code,
          count: s.total_available || 0,
          _priority: getServicePriority(s.code)
        }))
        .sort((a, b) => {
          // 1. Priorité SMS-Activate (services populaires en premier)
          if (a._priority !== b._priority) {
            return b._priority - a._priority;
          }
          // 2. Disponibilité (si même priorité)
          return b.count - a.count;
        })
        .map(({ _priority, ...service }) => service); // Retirer _priority du résultat

      // Debug: console.log('🏆 [SERVICES] Top 5:', sortedServices.slice(0, 5).map(s => s.code));

      return sortedServices;
    },
    staleTime: 60000, // ⚡ Cache 60s (DB mise à jour par Cron toutes les 15 min maintenant)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
  });

  // Charger les activations en cours depuis la DB
  const {
    data: dbActivations = EMPTY_ARRAY,
    refetch: refetchActivations,
    isLoading: loadingActivations,
    isFetching: fetchingActivations,
    isPending: pendingActivations
  } = useQuery<ActiveNumber[]>({
    queryKey: ['active-numbers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // console.log('🔄 [LOAD] Chargement activations DB...');

      // Récupérer le timestamp actuel pour filtrer les expirés
      const now = new Date();
      const nowISO = now.toISOString();

      // Limite: ne pas récupérer les activations expirées depuis plus de 5 minutes
      // Cela évite de charger d'anciennes activations inutiles
      const graceLimit = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'waiting', 'received'])
        .or(`expires_at.gt.${nowISO},and(sms_code.not.is.null,expires_at.gt.${graceLimit})`) // Pas expiré OU (a SMS et expiré depuis moins de 5 min)
        .order('created_at', { ascending: false }) as { data: DBActivation[] | null; error: any };

      if (error) {
        console.error('❌ [LOAD] Erreur:', error);
        throw error;
      }

      // console.log('✅ [LOAD] Activations brutes:', data?.length || 0);

      // map directly without client-side strict filtering
      return (data || []).map(act => {
        const expiresAt = new Date(act.expires_at).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

        // Trust backend status primarily
        // Only show timeout if backend says so OR if local time is significantly past expiry (tolerant)
        // actually, if backend sends it in 'active-numbers', it is ACTIVE.
        let displayStatus: 'received' | 'waiting' | 'timeout' = 'waiting';

        if (act.sms_code) {
          displayStatus = 'received';
        } else if (act.status === 'timeout' || act.status === 'cancelled' || act.status === 'expired') {
          displayStatus = 'timeout';
        } else {
          // Status is pending/waiting/active
          displayStatus = 'waiting';
        }

        return {
          id: act.id,
          orderId: act.order_id,
          activationId: act.id,
          phone: act.phone,
          service: act.service_code,
          country: act.country_code,
          timeRemaining,
          expiresAt: act.expires_at,
          status: displayStatus,
          smsCode: act.sms_code || undefined,
          smsText: act.sms_text || undefined,
          price: act.price,
          charged: act.charged || false,
          createdAt: act.created_at || '',
          frozenAmount: act.frozen_amount || 0,
          provider: act.provider || 'sms-activate'
        } as ActiveNumber;
      });
    },
    enabled: !!user?.id,
    staleTime: 0, // Pas de cache pour éviter le flash des données périmées
    gcTime: 0, // Supprimer le cache immédiatement après unmount
    refetchOnMount: 'always', // Toujours refetch au mount
    // Polling désactivé - les mises à jour arrivent via WebSocket (useRealtimeSms)
    // Le polling manuel est déclenché par useRentPolling pour les rentals
    refetchInterval: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
  });

  // Charger les rentals actifs depuis la DB
  const {
    data: dbRentals = EMPTY_ARRAY,
    refetch: refetchRentals,
    isLoading: loadingRentals,
    isFetching: fetchingRentals,
    isPending: pendingRentals
  } = useQuery<ActiveNumber[]>({
    queryKey: ['active-rentals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // console.log('🏠 [LOAD] Chargement rentals DB...');

      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }) as { data: DBRental[] | null; error: any };

      if (error) {
        console.error('❌ [LOAD] Erreur rentals:', error);
        throw error;
      }

      // console.log('✅ [LOAD] Rentals chargés:', data?.length || 0);

      // Mapper les rentals DB vers le format ActiveNumber
      return (data || []).map((rent: DBRental) => {
        // Support both column naming conventions
        // rental_id / rent_id = SMS-Activate rental ID
        // IMPORTANT: Pour les rentals, utiliser end_date en priorité car c'est mis à jour lors des prolongations
        const expiresAt = new Date(rent.end_date || rent.expires_at || '').getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

        // SMS-Activate rental ID (stored in rental_id and rent_id)
        const smsActivateRentId = rent.rental_id || rent.rent_id;

        return {
          id: rent.id,
          orderId: String(smsActivateRentId),
          activationId: rent.id,
          rentalId: String(smsActivateRentId), // SMS-Activate rent ID for polling
          phone: rent.phone,
          service: rent.service_code,
          country: rent.country_code,
          timeRemaining,
          expiresAt: rent.end_date || rent.expires_at || '',
          status: timeRemaining > 0 ? 'active' : 'timeout',
          price: rent.total_cost || rent.price || (rent.hourly_rate ? rent.hourly_rate * (rent.rent_hours || rent.duration_hours || 1) : 0),
          charged: true,
          type: 'rental' as const,
          durationHours: rent.duration_hours || rent.rent_hours || 0,
          messageCount: rent.message_count || rent.sms_count || 0,
          createdAt: rent.created_at || rent.start_date || '',
          frozenAmount: rent.frozen_amount || 0
        } as ActiveNumber;
      });
    },
    enabled: !!user?.id,
    staleTime: 0, // Pas de cache pour éviter le flash des données périmées
    gcTime: 0, // Supprimer le cache immédiatement après unmount
    refetchOnMount: 'always', // Toujours refetch au mount
    // Polling désactivé - les mises à jour arrivent via WebSocket (useRealtimeSms)
    // Le polling manuel est déclenché par useRentPolling pour les rentals
    refetchInterval: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
  });

  // Synchroniser activeNumbers avec la DB (fusionner activations + rentals)
  // Auto-masquer les numéros qui ont reçu un SMS après 20 secondes
  const [hiddenNumbers, setHiddenNumbers] = useState<Set<string>>(new Set());
  const [smsReceivedTimestamps, setSmsReceivedTimestamps] = useState<Map<string, number>>(new Map());
  const [timeoutTimestamps, setTimeoutTimestamps] = useState<Set<string>>(new Set());
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const hiddenStorageKey = user?.id ? `hiddenNumbers:${user.id}` : null;

  // Flag pour savoir si le chargement initial est terminé
  // isPending = true seulement au TOUT PREMIER fetch (pas de données en cache)
  // isFetching = true pendant tout fetch (initial ou refetch)
  const isInitialLoading = pendingActivations || pendingRentals || fetchingActivations || fetchingRentals;

  // Track si on a déjà fait le premier chargement réussi
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {
    // Si invitÃ© (pas de user), pas besoin d'attendre les activations/rentals
    if (!user) {
      setHasInitiallyLoaded(true);
      return;
    }

    // Safety timeout: si le chargement prend trop de temps (>3s), on force l'affichage
    const timer = setTimeout(() => {
      if (!hasInitiallyLoaded) {
        console.warn('âš ï¸ [DASHBOARD] Loading timeout - forcing display');
        setHasInitiallyLoaded(true);
      }
    }, 3000);

    // Marquer comme chargÃ© une fois que le premier fetch est terminÃ©
    if (!pendingActivations && !pendingRentals && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }

    return () => clearTimeout(timer);
  }, [pendingActivations, pendingRentals, hasInitiallyLoaded, user]);

  useEffect(() => {
    // NE PAS mettre à jour si on n'a pas encore fait le premier chargement
    // Cela évite le flash des données en cache
    if (!hasInitiallyLoaded) {
      return;
    }

    const combined = [
      ...dbActivations.map(a => ({ ...a, type: 'activation' as const })),
      ...dbRentals
    ];

    // Détecter les nouveaux SMS reçus et enregistrer le timestamp
    combined.forEach(num => {
      if (num.type === 'activation' && num.smsCode && !smsReceivedTimestamps.has(num.id)) {
        setSmsReceivedTimestamps(prev => new Map(prev).set(num.id, Date.now()));
        // Afficher le popup SMS premium
        const code = num.smsCode.includes('STATUS_OK:') ? num.smsCode.split(':')[1] : num.smsCode;
        showSmsReveal({ id: num.id, service_code: num.serviceCode, sms_code: code, phone: num.phone });
      }

      // Détecter les timeouts / expirations automatiques pour afficher le feedback premium
      if ((num.status === 'timeout' || num.status === 'expired' || num.status === 'cancelled') && !num.smsCode && !timeoutTimestamps.has(num.id)) {
        // Seulement déclencher si l'expiration est récente (dans les 10 dernières secondes) pour éviter les spams au chargement
        const expiresAtTime = num.expiresAt ? new Date(num.expiresAt).getTime() : 0;
        const nowTime = Date.now();
        if (expiresAtTime > 0 && Math.abs(nowTime - expiresAtTime) < 10000) {
          setTimeoutTimestamps(prev => new Set(prev).add(num.id));
          showStatusFeedback('timeout');
        }
      }
    });

    // Filtrer les numéros masqués ET les numéros expirés/timeout
    const now = Date.now();
    const SMS_DISPLAY_GRACE_PERIOD = 2 * 60 * 1000; // 2 minutes après expiration pour voir le SMS
    const RENT_GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes après expiration pour les rentals

    const visibleNumbers = combined.filter(num => {
      // Si masqué manuellement, ne pas afficher
      if (hiddenNumbers.has(num.id)) return false;

      // RENTALS: Calculer en temps réel si expiré
      if (num.type === 'rental') {
        // Calculer le temps restant en temps réel basé sur expiresAt
        if (num.expiresAt) {
          const expiresAtTime = new Date(num.expiresAt).getTime();
          const realTimeRemaining = Math.max(0, Math.floor((expiresAtTime - now) / 1000));

          // Si encore actif (temps restant > 0), l'afficher
          if (realTimeRemaining > 0) return true;

          // Si expiré, afficher pendant grace period seulement
          const timeSinceExpiry = now - expiresAtTime;
          if (timeSinceExpiry < RENT_GRACE_PERIOD) return true;

          // Expiré et grace period passée - ne pas afficher
          return false;
        }
        // Si pas de expiresAt, afficher par défaut
        return true;
      }

      // ACTIVATIONS: logique existante
      // Si timeout et pas de SMS reçu, ne pas afficher sur le dashboard
      if (num.status === 'timeout' && !num.smsCode) return false;

      // Vérifier si le numéro est expiré (temps écoulé)
      if (num.expiresAt) {
        const expiresAtTime = new Date(num.expiresAt).getTime();
        const isExpired = expiresAtTime < now;

        // Si expiré et pas de SMS reçu, ne pas afficher
        if (isExpired && !num.smsCode) {
          return false;
        }

        // NOUVEAU: Si expiré depuis plus de 2 minutes, masquer même avec SMS
        // Cela évite d'afficher d'anciennes activations avec SMS reçus
        if (isExpired && num.smsCode) {
          const timeSinceExpiry = now - expiresAtTime;
          if (timeSinceExpiry > SMS_DISPLAY_GRACE_PERIOD) {
            return false;
          }
        }
      }

      return true;
    });

    // Filter result log disabled
    setActiveNumbers(visibleNumbers);
  }, [dbActivations, dbRentals, hiddenNumbers, hasInitiallyLoaded]);

  // Persister le masquage par utilisateur
  useEffect(() => {
    if (!hiddenStorageKey) return;
    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setHiddenNumbers(new Set(arr));
      }
    } catch (e) {
      console.warn('[DASHBOARD] load hiddenNumbers failed', e);
    }
  }, [hiddenStorageKey]);

  useEffect(() => {
    if (!hiddenStorageKey) return;
    try {
      localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenNumbers)));
    } catch (e) {
      console.warn('[DASHBOARD] persist hiddenNumbers failed', e);
    }
  }, [hiddenStorageKey, hiddenNumbers]);

  // Auto-masquer les numéros 20 secondes après réception du SMS
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const toHide: string[] = [];

      smsReceivedTimestamps.forEach((timestamp, id) => {
        if (now - timestamp >= 20000) { // 20 secondes
          toHide.push(id);
        }
      });

      if (toHide.length > 0) {
        setHiddenNumbers(prev => {
          const newSet = new Set(prev);
          toHide.forEach(id => newSet.add(id));
          return newSet;
        });
        setSmsReceivedTimestamps(prev => {
          const newMap = new Map(prev);
          toHide.forEach(id => newMap.delete(id));
          return newMap;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [smsReceivedTimestamps]);

  // 🔴 REALTIME: Écouter les changements sur activations, rentals et users (balance)
  useEffect(() => {
    if (!user?.id) return;

    // console.log('🔔 [REALTIME-DASHBOARD] Setting up subscriptions for user:', user.id);

    // Channel pour écouter les changements
    const channel = supabase
      .channel(`dashboard-${user.id}-${Date.now()}`)
      // Écouter les nouvelles activations
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // console.log('📱 [REALTIME] Activation changed:', payload.eventType);
          refetchActivations();
        }
      )
      // Écouter les nouvelles rentals
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rentals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // console.log('🏠 [REALTIME] Rental changed:', payload.eventType);
          refetchRentals();
        }
      )
      // Écouter les changements de balance
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // console.log('💰 [REALTIME] Balance changed:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        }
      )
      .subscribe((status) => {
        // console.log('🔔 [REALTIME-DASHBOARD] Subscription status:', status);
      });

    return () => {
      // console.log('🔌 [REALTIME-DASHBOARD] Cleaning up subscriptions');
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchActivations, refetchRentals, queryClient]);

  // Polling automatique pour les rentals actifs (non expirés seulement)
  const activeRentalIds = dbRentals
    .filter(r => r.timeRemaining > 0 && r.status === 'active') // Only poll non-expired rentals
    .map(r => r.rentalId)
    .filter(Boolean) as string[];

  useRentPolling({
    enabled: activeRentalIds.length > 0,
    rentalIds: activeRentalIds,
    onUpdate: () => {
      refetchRentals(); // Rafraîchir la liste quand nouveaux messages
    },
    onMessagesUpdate: (newCache) => {
      setRentMessagesCache(prev => ({ ...prev, ...newCache }));
    },
    intervalMs: 10000 // Vérifier toutes les 10 secondes (réduit de 5s)
  });

  // Fetch countries LIVE - OPTIMISÉ: Vraies quantités via get-country-availability
  const { data: countries = [], isLoading: loadingCountries } = useQuery<Country[]>({
    queryKey: ['countries-live', selectedService?.code, mode, rentDuration],
    queryFn: async () => {
      if (!selectedService?.code) return [];

      // Loading countries for selected service

      // ✅ En mode RENT, utiliser getRentServicesAndCountries (API différente)
      if (mode === 'rent') {
        // Convertir rentDuration en rentTime pour l'API
        const rentTimeMap: Record<string, string> = {
          '4hours': '4',
          '1day': '24',
          '1week': '168',
          '1month': '720'
        };
        const rentTime = rentTimeMap[rentDuration];

        // Récupérer les infos des pays depuis notre DB
        const { data: dbCountries } = await supabase
          .from('countries')
          .select('id, code, name, success_rate')
          .eq('active', true) as { data: DBCountry[] | null; error: any };

        // Mapper par NOM du pays (case insensitive) car les codes sont inconsistants
        const dbCountriesMap = new Map(
          dbCountries?.map((c: DBCountry) => [c.name.toLowerCase(), c]) || []
        );

        // 1️⃣ D'abord, obtenir la liste des pays disponibles (avec getCountries: true)
        // 🔑 Pour Full Rent ou services spécifiques, passer le serviceCode pour obtenir les quantités
        const serviceCode = selectedService.code;
        const { data: rentData, error } = await cloudFunctions.invoke('get-sms-activate-rent-services', {
          body: {
            time: rentTime,
            getCountries: true,
            serviceCode: serviceCode // Not fully supported by API but we pass it anyway
          }
        });

        if (error) {
          throw error;
        }

        // L'API retourne maintenant countries: [{ id, code, name, available, quantity, cost, sellingPrice, activationPrice }]
        // Tous les pays sont inclus, avec quantity=0 si pas de stock
        const countriesArray = rentData?.countries || [];

        // 💰 L'API calcule maintenant le sellingPrice côté serveur
        // avec la garantie que sellingPrice >= activationPrice
        const MIN_PRICE_COINS = 5; // Prix minimum 5 Ⓐ

        // Convertir directement les données de l'API en format Country
        const availableCountries: Country[] = countriesArray.map((c: any, idx: number) => {
          const sellingPrice = c.sellingPrice || MIN_PRICE_COINS;
          const dbCountry = dbCountriesMap.get(c.name.toLowerCase());
          const rate = computeServiceCountrySuccessRate(c.code, c.name, serviceCode, dbCountry?.success_rate);

          return {
            id: `rent-${c.id}`,
            name: c.name,
            code: c.code,
            flag: getFlagEmoji(c.code) || '🌍',
            successRate: rate,
            count: c.quantity || 0,
            price: sellingPrice,
            compositeScore: (c.quantity || 0) * rate / 100,
            rank: idx + 1,
            share: 0,
            _smsActivateId: c.id,
            _service: serviceCode
          } as Country;
        });

        // ✅ Tri intelligent: en stock en premier, puis par FIABILITÉ par service (taux de réussite)
        return sortCountriesByReliability(availableCountries);
      }

      // ✅ MODE ACTIVATION (code existant)
      const apiServiceCode = selectedService.code;

      // 2️⃣ Récupérer les success_rate depuis countries table
      const { data: countriesData } = await supabase
        .from('countries')
        .select('code, name, success_rate')
        .eq('active', true) as { data: DBCountry[] | null; error: any };

      const successRateMap = new Map(
        countriesData?.map((c: DBCountry) => [c.code.toLowerCase(), c.success_rate]) || []
      );

      // 🧠 Auto-Apprentissage : Récupérer les vrais taux d'activations par pays pour CE service
      const realStatsMap = await getRealServiceCountryStats(apiServiceCode, supabase);

      // 3️⃣ Appeler Edge Function pour obtenir les pays triés intelligemment
      // ✅ Utilise getTopCountriesByServiceRank de SMS-Activate (tri par performance + popularité)

      try {
        const { data: availabilityData, error } = await cloudFunctions.invoke('get-top-countries-by-service', {
          body: {
            service: apiServiceCode // ✅ Tri intelligent: success rate + popularity + availability
          }
        });

        if (error) {
          throw error;
        }

        // Parse response

        // Extraire countries (nouvelle structure avec stats SMS-Activate)
        const countries = availabilityData?.countries || [];

        if (!countries || countries.length === 0) {
          throw new Error('No countries available');
        }

        // 4️⃣ Mapper vers le format Country avec tri par taux de réussite SMS
        const mapped = countries
          .filter((c: any) => c.count > 0 && c.price > 0)
          .map((c: any, idx: number) => {
            const finalPrice = c.price;
            const ourSuccessRate = successRateMap.get(c.countryCode.toLowerCase());
            const realStat = realStatsMap.get(c.countryCode?.toLowerCase()) ||
                             realStatsMap.get(c.countryName?.toLowerCase()) ||
                             realStatsMap.get(c.countryId?.toString());
            const finalSuccessRate = computeServiceCountrySuccessRate(
              c.countryCode,
              c.countryName,
              apiServiceCode,
              ourSuccessRate,
              c.successRate,
              realStat
            );

            return {
              id: c.countryId.toString(),
              name: c.countryName,
              code: c.countryCode,
              flag: getFlagEmoji(c.countryCode),
              successRate: finalSuccessRate,
              completedSms: realStat ? realStat.completed : getAnchorCompletedSms(apiServiceCode, c.countryCode, c.countryName),
              count: c.count,
              price: Number(finalPrice.toFixed(2)),
              compositeScore: c.compositeScore,
              rank: c.rank || (idx + 1),
              share: c.share
            };
          });

        // ✅ TRI STRICT PAR FIABILITÉ ET TAUX DE RÉUSSITE PAR SERVICE
        return sortCountriesByReliability(mapped);
      } catch (error) {
        // Fallback: récupérer prix en temps réel via get-real-time-prices
        try {

          const { data: pricesData, error: pricesError } = await cloudFunctions.invoke('get-real-time-prices', {
            body: {
              type: 'activation',
              service: apiServiceCode
            }
          });

          if (pricesError || !pricesData?.data || pricesData.data.length === 0) {
            return [];
          }

          // Récupérer les infos pays depuis la DB pour success_rate
          const countryCodes = [...new Set(pricesData.data.map((p: any) => p.countryCode))];
          const { data: dbCountries } = await supabase
            .from('countries')
            .select('id, code, name, success_rate')
            .in('code', countryCodes) as { data: DBCountry[] | null; error: any };

          const countryInfoMap = new Map(
            (dbCountries || []).map((c: DBCountry) => [c.code.toLowerCase(), c])
          );

          const mappedFallback = pricesData.data.map((p: any) => {
            const countryInfo = countryInfoMap.get(p.countryCode.toLowerCase());
            const rate = computeServiceCountrySuccessRate(
              p.countryCode,
              countryInfo?.name || p.countryCode,
              apiServiceCode,
              countryInfo?.success_rate
            );
            return {
              id: p.countryCode,
              name: countryInfo?.name || p.countryCode,
              code: p.countryCode,
              flag: getFlagEmoji(p.countryCode),
              successRate: rate,
              count: p.count,
              price: p.priceCoins,
              compositeScore: null,
              rank: null,
              share: null
            };
          }).filter((c: any) => c.count > 0 && c.price > 0);

          return sortCountriesByReliability(mappedFallback);
        } catch (fallbackError) {
          console.error('❌ [FALLBACK] Erreur get-real-time-prices:', fallbackError);
          return [];
        }
      }
    },
    enabled: !!selectedService?.code,
    staleTime: 30000, // Cache 30 secondes (Edge Function rapide)
    refetchInterval: false
  });

  // ⚡ Timer dupliqué supprimé — le timer setTimerTick (ligne 660) gère déjà le re-render chaque seconde

  // Polling automatique pour vérifier les SMS reçus (backup)
  // ⚡️ MEMOIZED CALLBACKS: Prevent polling restart on every render (component renders every 1s)
  const handlePollingUpdate = useCallback((updatedNumber: any) => {
    refetchActivations();
  }, [refetchActivations]);

  const handlePollingBalance = useCallback(() => {
    // Balance refresh handled silently
  }, []);

  // Polling automatique pour vérifier les SMS reçus (backup)
  useSmsPolling({
    activeNumbers,
    userId: user?.id,
    onUpdate: handlePollingUpdate,
    onBalanceUpdate: handlePollingBalance
  });

  // WebSocket temps réel pour détection instantanée des SMS
  useRealtimeSms({
    userId: user?.id,
    onSmsReceived: (activation) => {
      // SMS received - reload activations
      refetchActivations();
    },
    onBalanceUpdate: () => {
      // Balance update handled silently
    }
  });

  // Filtrer par recherche seulement (la catégorie est déjà filtrée dans la query)
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchService.toLowerCase())
  );

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchCountry.toLowerCase())
  );

  const [purchaseLock, setPurchaseLock] = useState(false); // Prevent double-click

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setCurrentStep('country');
    setSearchService('');
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setCurrentStep('confirm');
    setSearchCountry('');
  };

  const handleActivate = async () => {
    if (!selectedService || !selectedCountry || !user?.id) return;

    if (purchaseLock) return;
    setPurchaseLock(true);

    try {
      const isRent = mode === 'rent';

      // ✅ Calculer le prix final selon le mode
      // Pour RENT: appliquer le multiplicateur de durée (même formule que le bouton)
      // Pour ACTIVATION: prix simple
      const durationMultiplier = isRent ? (
        rentDuration === '4hours' ? 1 :
          rentDuration === '1day' ? 3 :
            rentDuration === '1week' ? 15 : 50
      ) : 1;
      const finalPrice = Math.ceil(selectedCountry.price * durationMultiplier);

      // Purchase started - service: selectedService.code, country: selectedCountry.code

      // Vérifier le solde (en tenant compte du frozen_balance)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', user.id)
        .single() as { data: { balance: number; frozen_balance: number } | null; error: any };

      // Si erreur DB, utiliser le balance du store comme fallback
      // solde = balance - frozen_balance (solde disponible)
      const totalBalance = userData?.balance ?? user?.balance ?? 0;
      const frozenBalance = userData?.frozen_balance ?? 0;
      const solde = totalBalance - frozenBalance;

      // Log pour debug si erreur
      if (userError) {
        console.warn('[handleActivate] Erreur récupération solde DB:', userError.message, '- Utilisation balance store:', user?.balance);
      }

      // Vérifier si le solde est suffisant
      if (solde < finalPrice) {
        const missing = finalPrice - solde;
        setInsufficientBalanceData({
          needed: finalPrice,
          available: solde,
          missing: Math.ceil(missing)
        });
        setShowInsufficientBalanceDialog(true);
        return;
      }

      // SMS-Activate gère automatiquement la sélection d'opérateur
      // Auto-selecting best operator via SMS-Activate

      // Préparer le body selon le mode
      // ✅ Envoyer l'ID numérique du pays pour le mapping SMS-Activate
      // ✅ Envoyer le prix affiché au frontend pour garantir la cohérence
      setPurchaseLock(false);

      // 1. Get Provider Strategy
      const providerMode = await getSetting('sms_provider_mode') || 'sms-activate';
      console.log('🔄 Provider Strategy:', providerMode);

      // 2. Prepare Common Variables
      const countryId = isRent
        ? ((selectedCountry as any)._smsActivateId || selectedCountry.id.replace('rent-', ''))
        : selectedCountry.id;

      const productCode = (selectedCountry as any)._service || selectedService.code || selectedService.name.toLowerCase();

      let functionName = '';
      let requestBody: any = {};

      if (isRent) {
        // 🏢 RENTAL: Force SMS Activate (5sim rent support pending)
        functionName = 'buy-sms-activate-rent';
        requestBody = {
          country: countryId,
          operator: 'any',
          product: productCode,
          userId: user.id,
          expectedPrice: finalPrice,
          duration: rentDuration
        };
      } else {
        // ⚡ ACTIVATION: Check Provider
        if (providerMode === '5sim') {
          // 🟥 USE 5SIM
          functionName = 'buy-number-intelligent';
          requestBody.providerOverride = '5sim';

          // Map ID to Name (5sim needs 'england', 'russia' etc.)
          let countryName = getCountryName(countryId).toLowerCase();
          // Edge case fixes for 5sim naming
          if (countryName === 'united kingdom') countryName = 'england';
          if (countryName === 'usa') countryName = 'usa'; // 5sim uses 'usa' or 'united states'? Usually 'usa' works.

          const product5sim = get5simProductName(productCode);

          requestBody = {
            country: countryName,
            operator: 'any',
            product: product5sim,
            userId: user.id,
            expectedPrice: finalPrice
          };
        } else if (providerMode === 'smspva') {
          // 🟢 USE SMSPVA
          functionName = 'buy-smspva-number';
          requestBody = {
            country: countryId,
            operator: 'any',
            product: productCode,
            userId: user.id,
            expectedPrice: finalPrice
          };
        } else if (providerMode === 'onlinesim') {
          // 🟠 USE ONLINESIM
          functionName = 'buy-number-intelligent';
          requestBody.providerOverride = 'onlinesim';
          requestBody = {
            country: countryId,
            operator: 'any',
            product: productCode,
            userId: user.id,
            expectedPrice: finalPrice
          };
        } else if (providerMode === 'intelligent' || providerMode === 'smart') {
          // 🧠 INTELLIGENT MODE: Try HeroSMS first (fallback handled in error handler)
          functionName = 'buy-number-intelligent';
          requestBody.providerOverride = 'sms-activate';
          requestBody = {
            country: countryId,
            operator: 'any',
            product: productCode,
            userId: user.id,
            expectedPrice: finalPrice
          };
        } else {
          // 🟦 DEFAULT: SMS ACTIVATE (HeroSMS)
          functionName = 'buy-number-intelligent';
          requestBody.providerOverride = 'sms-activate';
          requestBody = {
            country: countryId,
            operator: 'any',
            product: productCode,
            userId: user.id,
            expectedPrice: finalPrice
          };
        }
      }

      console.log('🚀 Executing purchase:', { functionName, providerMode, requestBody });

      // Show purchase in progress
      toast({
        title: `🔄 Achat en cours`,
        description: `Connexion en cours...`,
      });

      const { data: buyData, error: buyError } = await cloudFunctions.invoke(functionName, {
        body: requestBody
      });

      // Gérer les erreurs - la fonction retourne toujours un JSON avec success/error
      if (buyError || !buyData?.success) {
        // Priorité: message d'erreur de la fonction > message générique
        let errorMessage = 'Achat échoué';

        // 1. Essayer d'obtenir l'erreur depuis buyData (réponse JSON de la fonction)
        if (buyData?.error) {
          errorMessage = buyData.error;
        } else if (buyData?.message) {
          errorMessage = buyData.message;
        }
        // 2. Sinon essayer depuis buyError
        else if (buyError?.message && !buyError.message.includes('Edge Function')) {
          errorMessage = buyError.message;
        }

        // 🧠 SMART MODE: Auto-fallback to 5sim if NO_NUMBERS
        const isSmartMode = providerMode === 'intelligent' || providerMode === 'smart';
        const isNoNumbers = errorMessage.toUpperCase().includes('NO_NUMBERS') ||
          errorMessage.toUpperCase().includes('NO_BALANCE');

        if (isSmartMode && isNoNumbers && functionName !== 'buy-5sim-number') {
          console.log('🧠 Smart mode: HeroSMS unavailable, trying 5sim...');
          // Note: No user-facing toast - switching is transparent to user

          // Retry with 5sim
          let countryName = getCountryName(countryId).toLowerCase();
          if (countryName === 'united kingdom') countryName = 'england';

          const requestBody5sim = {
            country: countryName,
            operator: 'any',
            product: get5simProductName(productCode),
            userId: user.id,
            expectedPrice: finalPrice
          };

          const { data: buyData5sim, error: buyError5sim } = await cloudFunctions.invoke('buy-number-intelligent', {
            body: { ...requestBody5sim, providerOverride: '5sim' }
          });

          if (buyError5sim || !buyData5sim?.success) {
            throw new Error(buyData5sim?.error || buyError5sim?.message || 'Aucun numéro disponible');
          }

          // Success with 5sim - continue normal flow
          console.log('✅ 5sim fallback succeeded');
        } else {
          throw new Error(errorMessage);
        }
      }

      // Number purchased successfully

      // Recharger les données depuis la DB selon le type d'achat
      if (isRent) {
        // Pour rent: recharger les rentals ET invalider le cache
        refetchRentals();
        queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
      } else {
        // Pour activation: recharger les activations
        refetchActivations();
      }

      // Rafraîchir la balance utilisateur immédiatement après l'achat
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });

      if (!isRent) {
        // Track which provider was actually used (for status check)
        const usedProvider = buyData?.data?.provider || (functionName.includes('5sim') ? '5sim' : 'sms-activate');

        // Pour activation: Vérifier IMMÉDIATEMENT si le SMS est déjà arrivé
        // Use provider-specific status checker dynamically
        const statusCheckerFunction = `check-${usedProvider}-status`;

        setTimeout(async () => {
          try {
            await cloudFunctions.invoke(statusCheckerFunction, {
              body: {
                activationId: buyData.data.id, // ✅ UUID de la DB
                userId: user?.id
              }
            });
            refetchActivations();
          } catch (e) {
            // Silent error handling for immediate check
          }
        }, 1000);
      }

      toast({
        title: isRent ? t('toasts.numberRented') : t('toasts.numberActivated'),
        description: isRent
          ? `${buyData.data.phone} - ${t('toasts.rentalSuccess', { duration: rentDuration })}`
          : `${buyData.data.phone} - ${t('toasts.activationSuccess')}`,
      });

      // Réinitialiser la sélection pour permettre un nouvel achat
      setSelectedService(null);
      setSelectedCountry(null);
      setCurrentStep('service');
      // Fermer le panneau mobile après l'achat
      setMobileOrderPanelOpen(false);

    } catch (error: any) {
      // Error during purchase
      toast({
        title: mode === 'rent' ? t('toasts.rentalFailed') : t('toasts.activationFailed'),
        description: error.message || t('toasts.unknownError'),
        variant: 'destructive'
      });
    }
  };

  const handleReset = () => {
    setSelectedService(null);
    setSelectedCountry(null);
    setCurrentStep('service');
  };

  const copyToClipboard = (text: string, type: 'phone' | 'code' = 'phone') => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('dashboard.copied'),
      description: type === 'code' ? t('dashboard.codeCopied') : t('dashboard.numberCopied')
    });
  };

  // Helper: Get full service name from code (wa -> WhatsApp)
  const getServiceName = (code: string): string => {
    if (!code) return 'Unknown';
    const lowerCode = code.toLowerCase();

    // 1. D'abord chercher dans le mapping statique (plus rapide et plus fiable)
    if (SERVICE_CODE_TO_NAME[lowerCode]) {
      return SERVICE_CODE_TO_NAME[lowerCode];
    }

    // 2. Sinon chercher dans getAllServices()
    const allServices = getAllServices();
    const found = allServices.find(s => s.code.toLowerCase() === lowerCode);
    if (found?.name) return found.name;

    // 3. Fallback: formater le code (remplacer _ par espace, capitaliser)
    return code.length <= 4
      ? code.toUpperCase()
      : code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const cancelActivation = async (activationId: string, orderId: string, provider?: string) => {
    try {
      // Cancel via Edge Function - use provider-specific function
      let cancelFunction = 'cancel-sms-activate-order';
      if (provider === '5sim') cancelFunction = 'cancel-5sim-order';
      else if (provider === 'grizzly') cancelFunction = 'cancel-grizzly-order';
      else if (provider === 'textverified') cancelFunction = 'cancel-textverified-order';
      else if (provider === 'onlinesim') cancelFunction = 'cancel-onlinesim-order';
      else if (provider === 'smspva') cancelFunction = 'cancel-smspva-order';
      else if (provider === 'smspool') cancelFunction = 'cancel-smspool-order';

      const { data, error } = await cloudFunctions.invoke(cancelFunction, {
        body: {
          orderId: orderId,
          activationId: activationId,
          userId: user?.id
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Annulation échouée');
      }

      // Update Supabase status
      const updateData = { status: 'cancelled', charged: false };
      await (supabase.from('activations') as any).update(updateData).eq('id', activationId);

      // Refresh queries - including balance since credits should be unfrozen
      await queryClient.invalidateQueries({ queryKey: ['active-numbers'] });
      await queryClient.invalidateQueries({ queryKey: ['orders-history'] });
      await queryClient.invalidateQueries({ queryKey: ['user-balance'] });

      toast({
        title: t('toasts.cancelled'),
        description: t('toasts.cancelledDesc'),
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error?.message || t('toasts.cancelError'),
        variant: 'destructive'
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculer le temps restant en temps réel depuis expires_at
  const getRealTimeRemaining = (expiresAt: string): number => {
    const expiresAtMs = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiresAtMs - now) / 1000));
  };

  // Calculer le temps écoulé depuis la création (pour savoir si annulation est autorisée après 5 min)
  const getTimeElapsedSinceCreation = (expiresAt: string): number => {
    // expiresAt = création + 20 minutes, donc création = expiresAt - 20 min
    const expiresAtMs = new Date(expiresAt).getTime();
    const createdAtMs = expiresAtMs - (20 * 60 * 1000); // 20 min before expiry
    const now = Date.now();
    return Math.floor((now - createdAtMs) / 1000); // Temps écoulé en secondes
  };

  // Vérifier si l'annulation est autorisée (après 5 minutes = 300 secondes)
  const canCancelActivation = (expiresAt: string): boolean => {
    const elapsed = getTimeElapsedSinceCreation(expiresAt);
    return elapsed >= 300; // 5 minutes = 300 secondes
  };

  // État pour le panneau mobile
  const [mobileOrderPanelOpen, setMobileOrderPanelOpen] = useState(false);


  // Open mobile panel if URL has ?action=buy
  useEffect(() => {
    if (searchParams.get('action') === 'buy') {
      setMobileOrderPanelOpen(true);
      // Optional: Clean up URL after opening
      // const newParams = new URLSearchParams(searchParams);
      // newParams.delete('action');
      // setSearchParams(newParams);
    }
  }, [searchParams]);

  // Swipe to close pour le panneau mobile
  const { handlers: swipeHandlers, style: swipeStyle, isDragging: isSwipeDragging } = useSwipeToClose({
    onClose: () => setMobileOrderPanelOpen(false),
    threshold: 80,
    direction: 'down',
    enabled: mobileOrderPanelOpen
  });

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] pt-4 lg:pt-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <RentOnboardingModal />
      
      {/* 🎉 Bannière de succès de paiement - 21ST DYNAMIC PILL DESIGN */}
      <AnimatePresence>
        {showPaymentSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-24 md:top-28 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div className="relative pointer-events-auto bg-white rounded-full p-2 pr-6 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.2)] border border-blue-100 flex items-center gap-4 overflow-hidden group">
              {/* Highlight sweep animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              
              {/* Spinning Check Icon */}
              <div className="relative flex-shrink-0 w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", bounce: 0.6 }}
                >
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </motion.div>
                {/* Ping effect */}
                <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-20" />
              </div>
              
              <div className="flex flex-col py-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-blue-900 text-sm tracking-tight">
                    {t('toasts.paymentSuccess')}
                  </h3>
                </div>
                <p className="text-xs text-blue-600/70 font-bold">
                  {t('toasts.paymentSuccessDesc')}
                </p>
              </div>
              
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="ml-2 flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-all text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 🎁 Bannière de bonus de parrainage - PREMIUM DESIGN */}
      {showReferralBonus && (
        <div className="fixed top-16 left-0 right-0 z-50 mx-4 animate-in slide-in-from-top zoom-in-95 duration-500" style={{ top: showPaymentSuccess ? '160px' : '64px' }}>
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500 text-white rounded-3xl p-5 shadow-2xl shadow-purple-500/40 border border-white/20">
            {/* Sparkle decorations */}
            <div className="absolute top-3 left-12 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
            <div className="absolute bottom-4 right-16 w-1.5 h-1.5 bg-pink-200 rounded-full animate-pulse" />

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Gift className="w-7 h-7 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-xl tracking-tight">{t('toasts.referralBonusReceived')}</h3>
                  <span className="px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-black animate-pulse">
                    +{referralBonusAmount} Ⓐ
                  </span>
                </div>
                <p className="text-sm text-white/90 mt-1 font-medium">{t('toasts.referralBonusReceivedDesc', { amount: referralBonusAmount })}</p>
                <button
                  onClick={() => {
                    setShowReferralBonus(false);
                    navigate('/referral');
                  }}
                  className="mt-3 px-5 py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
                >
                  <Share2 className="w-4 h-4" />
                  {t('toasts.referralBonusCta')}
                </button>
              </div>
              <button
                onClick={() => setShowReferralBonus(false)}
                className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Mobile: Overlay pour fermer */}
      {mobileOrderPanelOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOrderPanelOpen(false)}
        />
      )}

      {/* Sidebar - Order Number */}
      <aside
        style={mobileOrderPanelOpen ? swipeStyle : undefined}
        className={`
        ${mobileOrderPanelOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto
        w-full lg:w-[400px] 
        bg-white/95 backdrop-blur-xl 
        border-t lg:border-t-0 lg:border-r border-gray-200/50 
        overflow-hidden shadow-xl shadow-gray-200/50 
        max-h-[85vh] lg:max-h-[calc(100vh-64px)]
        z-50 lg:z-auto
        ${isSwipeDragging ? '' : 'transition-transform duration-300 ease-out'}
        rounded-t-3xl lg:rounded-none
      `}>
        {/* Mobile: Handle bar - zone de swipe principale */}
        <div
          {...swipeHandlers}
          className="lg:hidden flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none"
          onClick={() => setMobileOrderPanelOpen(false)}
        >
          <div className="w-16 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(85vh-56px)] lg:max-h-[calc(100vh-64px)] p-4 lg:p-6 pt-0 lg:pt-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">

          {/* Header - Always visible */}
          <div className="mb-4 lg:mb-6">
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">{t('dashboard.orderNumber')}</h1>
            <p className="text-xs text-gray-500">{t('dashboard.selectService')}</p>
          </div>

          {/* Mode Toggle - Magic UI / 21st style segment control with Logo Colors */}
          {isRentalsEnabled && (
            <div className="relative flex bg-gray-100/80 backdrop-blur-sm rounded-[20px] p-1.5 mb-6 shadow-inner border border-gray-200/50">
              {/* Sliding Pill Background */}
              <div 
                className={`absolute inset-y-1.5 left-1.5 rounded-[16px] shadow-md transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) ${
                  mode === 'activation' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/30' 
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-cyan-500/30'
                }`}
                style={{
                  width: 'calc(50% - 6px)',
                  transform: mode === 'activation' ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button
                onClick={() => setMode('activation')}
                className={`relative z-10 flex-1 py-3 text-[15px] font-extrabold tracking-wide rounded-[16px] transition-colors duration-300 ${mode === 'activation'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
              >
                {t('common.activation')}
              </button>
              <button
                onClick={() => setMode('rent')}
                className={`relative z-10 flex-1 py-3 text-[15px] font-extrabold tracking-wide rounded-[16px] transition-colors duration-300 ${mode === 'rent'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
              >
                {/* Nouveau Badge */}
                <span className="absolute -top-2 right-2 sm:right-6 md:right-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30 border border-white/20 animate-bounce">
                    Nouveau
                </span>
                {t('common.rent')}
              </button>
            </div>
          )}

          {/* 🔄 LOADING STATE for Content */}
          {!hasInitiallyLoaded ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            </div>
          ) : null}

          {/* Only show content after initial load */}
          {hasInitiallyLoaded && (
            <>
              {/* STEP 1: Service Selection */}
              {(currentStep === 'service' || currentStep === 'active') && (
                <>
                  <div className="relative mb-5">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                    <Input
                      type="text"
                      placeholder={t('dashboard.enterServiceName')}
                      value={searchService}
                      onChange={(e) => setSearchService(e.target.value)}
                      className="pl-12 h-12 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm hover:shadow-md"
                    />
                  </div>

                  {/* Special Service for Rent Mode */}
                  {mode === 'rent' && (
                    <div className="mb-6 relative">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                        <p className="text-[11px] text-blue-600 uppercase tracking-widest font-extrabold">
                          Exclusivité
                        </p>
                      </div>
                      
                      {/* Location complète - Full Blue Premium */}
                      <div
                        onClick={() => handleServiceSelect({ id: 'full', name: t('dashboard.fullRent'), code: 'full', count: 597, icon: 'home' })}
                        className="relative group cursor-pointer overflow-hidden rounded-[1.2rem] shadow-lg hover:shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        {/* Full Blue Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#004ade] via-blue-500 to-[#18c2ec]" />
                        
                        {/* Inner Glow / Highlights */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
                        <div className="absolute -inset-[1.5px] bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 rounded-[1.2rem] opacity-0 group-hover:opacity-40 blur-sm transition-opacity duration-500" />
                        
                        {/* Shimmer sweep effect */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl z-10 pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        </div>

                        {/* Card Content */}
                        <div className="relative z-20 p-4 flex items-center gap-4">
                          
                          {/* Premium Icon Container - White Glassmorphism */}
                          <div className="relative w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20 backdrop-blur-md border border-white/30 group-hover:bg-white/30 transition-colors">
                            <Home className="w-7 h-7 text-white drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-lg text-white drop-shadow-sm">
                              {t('dashboard.fullRent')}
                            </p>
                            <p className="text-sm font-medium text-blue-50/90 drop-shadow-sm">
                              {t('dashboard.receiveFromAny')}
                            </p>
                          </div>
                          
                          {/* Chevron */}
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300 shadow-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
                      <span className="w-5 h-0.5 bg-blue-400 rounded-full"></span>
                      {selectedCategory === 'all' ? t('dashboard.allServices') : selectedCategory.toUpperCase()}
                    </p>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      {filteredServices.length} {t('dashboard.services')}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {filteredServices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                        <Search className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Aucun service trouvé</p>
                      </div>
                    ) : (
                      filteredServices.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => {
                            if (service.count > 0) handleServiceSelect(service);
                          }}
                          className={`group bg-white border rounded-2xl p-3.5 flex items-center justify-between transition-all duration-300 ${service.count > 0 ? 'border-gray-200/80 shadow-2xs cursor-pointer hover:border-[#00A3FF] hover:shadow-sm active:scale-[0.99]' : 'border-gray-100 opacity-50 grayscale cursor-not-allowed'}`}
                        >
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <div className="w-11 h-11 bg-gray-50 border border-gray-200/60 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs group-hover:bg-[#00A3FF]/10 transition-colors">
                              <img
                                src={getServiceLogo(service.code || service.name)}
                                alt={service.name}
                                className="w-6 h-6 object-contain"
                                onError={(e) => handleLogoError(e, service.code || service.name)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm text-gray-900 truncate transition-colors ${service.count > 0 ? 'group-hover:text-[#0055FF]' : ''}`}>{service.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                  <span className={`w-1.5 h-1.5 rounded-full ${service.count > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                  {service.count > 0 ? `${service.count.toLocaleString()} disponibles` : 'Rupture de stock'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#0055FF] group-hover:text-white transition-all flex-shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* STEP 2: Country Selection */}
              {(currentStep === 'country' || currentStep === 'confirm') && selectedService && (
                <>
                  <div className="relative mb-4 opacity-50">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <Input
                      type="text"
                      placeholder="Enter service name..."
                      value={searchService}
                      disabled
                      className="pl-12 h-12 text-sm bg-gray-50 border-2 border-gray-100 rounded-xl cursor-not-allowed"
                    />
                  </div>

                  <p className="text-[11px] text-blue-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <span className="w-5 h-0.5 bg-blue-400 rounded-full"></span>
                    {t('dashboard.selectedService')}
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 mb-5 flex items-center gap-4 shadow-sm">
                    <div className="w-14 h-14 bg-white border-2 border-blue-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                      <img
                        src={getServiceLogo(selectedService.code || selectedService.name)}
                        alt={selectedService.name}
                        className="w-9 h-9 object-contain"
                        onError={(e) => handleLogoError(e, selectedService.code || selectedService.name)}
                      />
                      <span className="text-xl hidden items-center justify-center">{getServiceIcon(selectedService.code || selectedService.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-gray-900 truncate">{selectedService.name}</p>
                      <p className="text-sm text-blue-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                        {selectedService.count >= 0 ? `${selectedService.count.toLocaleString()} ${t('dashboard.numbersAvailable')}` : t('dashboard.available')}
                      </p>
                    </div>
                    <button onClick={handleReset} className="p-2 hover:bg-blue-100 rounded-xl transition-all flex-shrink-0 group">
                      <X className="h-5 w-5 text-blue-400 group-hover:text-blue-600 transition-colors" />
                    </button>
                  </div>

                  {currentStep === 'country' && (
                    <>
                      <p className="text-[11px] text-green-600 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                        <span className="w-5 h-0.5 bg-green-400 rounded-full"></span>
                        {t('dashboard.countrySelection')}
                      </p>
                      <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-400" />
                        <Input
                          type="text"
                          placeholder={t('dashboard.enterCountryName')}
                          value={searchCountry}
                          onChange={(e) => setSearchCountry(e.target.value)}
                          className="pl-12 h-12 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all shadow-sm hover:shadow-md"
                          disabled={loadingCountries}
                        />
                      </div>

                      {loadingCountries ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                          <p className="text-sm text-gray-500 animate-pulse">🌐 {t('dashboard.loadingRates')}</p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 p-4 bg-white border border-gray-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0055FF] to-[#00A3FF] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                <Trophy className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-gray-900 tracking-wide uppercase">
                                  Classement par Réussite SMS
                                </h4>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Ordre d'activation optimisé pour <span className="font-bold text-gray-900">{selectedService?.name}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {filteredCountries.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                                <Search className="w-6 h-6" />
                              </div>
                              <p className="text-sm text-gray-500">{t('dashboard.noCountryAvailable')}</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-[calc(100vh-500px)] overflow-y-auto pr-1">
                              {filteredCountries.map((country, idx) => {
                                const hasStock = (country.count || 0) > 0;
                                const rankPos = (country as any).rank || (idx + 1);
                                const isTop1 = rankPos === 1 && hasStock;
                                const isTop3 = rankPos <= 3 && hasStock;

                                return (
                                  <div
                                    key={country.id}
                                    onClick={() => hasStock && handleCountrySelect(country)}
                                    className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${hasStock
                                      ? isTop1
                                        ? 'bg-gradient-to-r from-[#00A3FF]/5 via-white to-white border-[#00A3FF]/40 shadow-2xs cursor-pointer hover:border-[#0055FF] hover:shadow-sm active:scale-[0.99]'
                                        : 'bg-white border-gray-200/80 shadow-2xs cursor-pointer hover:border-gray-300 hover:shadow-sm active:scale-[0.99]'
                                      : 'bg-gray-50/60 border-gray-100 opacity-50 grayscale cursor-not-allowed'
                                      }`}
                                  >
                                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                      {/* Rank Indicator */}
                                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${isTop1
                                        ? 'bg-[#0055FF] text-white shadow-2xs'
                                        : isTop3
                                          ? 'bg-gray-900 text-white'
                                          : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        #{rankPos}
                                      </div>

                                      {/* Flag Container */}
                                      <div className="w-11 h-8 rounded-lg border border-gray-200/80 overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                        <img
                                          src={getCountryFlag(country.name)}
                                          alt={country.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className={`font-bold text-sm tracking-tight truncate transition-colors ${hasStock ? 'text-gray-900 group-hover:text-[#0055FF]' : 'text-gray-400'}`}>
                                            {country.name}
                                          </p>
                                          {isTop1 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/20 text-[#0055FF] text-[10px] font-black uppercase tracking-wider">
                                              <Award className="w-3 h-3 text-[#0055FF]" />
                                              1er Rang
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                          <p className={`text-xs flex items-center gap-1.5 ${hasStock ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                            {hasStock
                                              ? `${country.count.toLocaleString()} ${t('dashboard.numbersAvailable')}`
                                              : t('dashboard.noStock')}
                                          </p>
                                          {hasStock && (
                                            country.successRate !== null && country.successRate !== undefined ? (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                                {country.successRate}% Réussite
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                --% Réussite
                                              </span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className={`px-3.5 py-2 rounded-xl font-bold transition-all flex-shrink-0 ${hasStock
                                      ? 'bg-gradient-to-r from-[#0055FF] to-[#00A3FF] text-white shadow-sm shadow-[#00A3FF]/25 group-hover:from-[#0044CC] group-hover:to-[#0088CC] group-hover:shadow-md'
                                      : 'bg-gray-100 border border-gray-200 text-gray-400'
                                      }`}>
                                      <span className="text-sm font-black tracking-tight">{Math.floor(country.price || 0)}</span>
                                      <span className="text-xs ml-0.5 font-normal opacity-90">Ⓐ</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* STEP 3: Confirmation */}
                  {currentStep === 'confirm' && selectedCountry && (
                    <>
                      <p className="text-[11px] text-green-600 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                        <span className="w-5 h-0.5 bg-green-400 rounded-full"></span>
                        {t('dashboard.selectedCountry')}
                      </p>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-5 flex items-center gap-4 shadow-sm">
                        <div className="w-16 h-12 rounded-lg border-2 border-green-100 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                          <img
                            src={getCountryFlag(selectedCountry.name)}
                            alt={selectedCountry.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const emoji = target.nextElementSibling as HTMLSpanElement
                              if (emoji) emoji.style.display = 'flex'
                            }}
                          />
                          <span className="text-4xl hidden items-center justify-center">{getFlagEmoji(selectedCountry.name)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-base text-gray-900">{selectedCountry.name}</p>
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {selectedCountry.count.toLocaleString()} {t('dashboard.numbersAvailable')}
                          </p>
                        </div>
                        <button onClick={() => setCurrentStep('country')} className="p-2 hover:bg-green-100 rounded-xl transition-all group">
                          <X className="h-5 w-5 text-green-400 group-hover:text-green-600 transition-colors" />
                        </button>
                      </div>

                      {/* Rent Duration Selector - Modernisé */}
                      {mode === 'rent' && (
                        <div className="mb-6">
                          <p className="text-[11px] text-purple-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                            <span className="w-5 h-0.5 bg-purple-400 rounded-full"></span>
                            {t('dashboard.duration')}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { value: '4hours' as const, label: t('rentDurations.4hours'), icon: '⏰', price: selectedCountry.price * 1 },
                              { value: '1day' as const, label: t('rentDurations.1day'), icon: '🌅', price: selectedCountry.price * 3 },
                              { value: '1week' as const, label: t('rentDurations.1week'), icon: '📅', price: selectedCountry.price * 15 },
                              { value: '1month' as const, label: t('rentDurations.1month'), icon: '🗓️', price: selectedCountry.price * 50 }
                            ].map(option => (
                              <button
                                key={option.value}
                                onClick={() => setRentDuration(option.value)}
                                className={`p-4 rounded-xl border-2 transition-all duration-300 ${rentDuration === option.value
                                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100 scale-[1.02]'
                                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                                  }`}
                              >
                                <div className="text-2xl mb-1">{option.icon}</div>
                                <div className="text-sm font-bold text-gray-900">{option.label}</div>
                                <div className={`text-lg font-black ${rentDuration === option.value ? 'text-purple-600' : 'text-blue-600'
                                  }`}>{Math.ceil(option.price)} Ⓐ</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bouton Activate/Rent modernisé */}
                      <Button
                        onClick={handleActivate}
                        className={`w-full h-16 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6 shadow-xl transition-all duration-300 hover:scale-[1.02] ${mode === 'rent'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 shadow-cyan-500/30'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30'
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          {mode === 'rent' ? '🏠' : '⚡'}
                          {mode === 'rent' ? t('dashboard.rent') : t('dashboard.activate')}
                        </span>
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                          <span className="text-2xl font-black">
                            {mode === 'rent'
                              ? Math.ceil(selectedCountry.price * (
                                rentDuration === '4hours' ? 1 :
                                  rentDuration === '1day' ? 3 :
                                    rentDuration === '1week' ? 15 : 50
                              ))
                              : Math.floor(selectedCountry.price)
                            }
                          </span>
                          <span className="text-sm font-semibold opacity-80">Ⓐ</span>
                        </div>
                      </Button>
                      <p className="text-center text-sm text-gray-500 mt-4 mb-0 px-2">
                        {mode === 'rent'
                          ? t('dashboard.rentInfo')
                          : t('dashboard.refundInfo')
                        }
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </aside>

      {/* Main Content - Active Numbers */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30">
        <div className="p-4 lg:p-8">
          {/* Header avec titre et compteur - Seulement si des numéros actifs */}
          {activeNumbers.length > 0 && (
            <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {t('dashboard.activeNumbers')}
                  </h2>
                  <div className="bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-[13px] font-bold flex items-center gap-2 border border-green-200/50 dark:border-green-800">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    {activeNumbers.length} {t('dashboard.active')}
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {t('dashboard.manageNumbers')}
                </p>
              </div>
            </div>
          )}

          {/* Show loading spinner while checking for active numbers */}
          {!hasInitiallyLoaded && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            </div>
          )}

          {hasInitiallyLoaded && activeNumbers.length === 0 ? (
            <div className="space-y-6">
              {/* Two main cards: Activation & Rent */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Activation Card */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 lg:p-6 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">{t('dashboard.emptyState.activationTitle')}</h3>
                  <p className="text-sm text-gray-500 mb-5">{t('dashboard.emptyState.activationDesc')}</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature1')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature2')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature3')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature4')}</span>
                    </div>
                  </div>
                </div>

                {/* Rent Card */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 lg:p-6 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">{t('dashboard.emptyState.rentTitle')}</h3>
                  <p className="text-sm text-gray-500 mb-5">{t('dashboard.emptyState.rentDesc')}</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.rentFeature1')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.rentFeature2')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.rentFeature3')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps Section */}
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 lg:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <div className="flex flex-col items-start relative">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{t('dashboard.emptyState.step1Title')}</h4>
                    <p className="text-sm text-gray-500">{t('dashboard.emptyState.step1Desc')}</p>
                    <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex flex-col items-start relative">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{t('dashboard.emptyState.step2Title')}</h4>
                    <p className="text-sm text-gray-500">{t('dashboard.emptyState.step2Desc')}</p>
                    <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex flex-col items-start">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{t('dashboard.emptyState.step3Title')}</h4>
                    <p className="text-sm text-gray-500">{t('dashboard.emptyState.step3Desc')}</p>
                  </div>
                </div>
              </div>

              {/* Features Grid - Activation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 lg:p-5 border border-blue-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.wideChoice')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.wideChoiceDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-4 lg:p-5 border border-green-100">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.bigVolumes')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.bigVolumesDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 lg:p-5 border border-amber-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.affordablePrice')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.affordablePriceDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-4 lg:p-5 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.suitableTasks')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.suitableTasksDesc')}</p>
                </div>
              </div>

              {/* Features Grid - Rent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-2xl p-4 lg:p-5 border border-pink-100">
                  <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.accountInsurance')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.accountInsuranceDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 lg:p-5 border border-indigo-100">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.flexibleSettings')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.flexibleSettingsDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-2xl p-4 lg:p-5 border border-cyan-100">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.reliableSuppliers')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.reliableSuppliersDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-2xl p-4 lg:p-5 border border-rose-100">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.anyPurpose')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.anyPurposeDesc')}</p>
                </div>
              </div>

              {/* Call to Action - Different for mobile and desktop */}
              <div className="flex items-center justify-center py-6">
                {/* Desktop CTA */}
                <div className="hidden lg:flex items-center gap-3 text-blue-600 bg-blue-50 px-6 py-3 rounded-2xl">
                  <span className="animate-bounce text-xl">←</span>
                  <span className="font-medium">{t('dashboard.emptyState.getItNow')} - {t('dashboard.selectFromSidebar')}</span>
                </div>
                {/* Mobile CTA - Button to open panel */}
                <button
                  onClick={() => setMobileOrderPanelOpen(true)}
                  className="lg:hidden flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all"
                >
                  <Phone className="w-6 h-6" />
                  <span className="font-bold text-lg">{t('dashboard.orderNumber', 'Commander un numéro')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNumbers.map((num) => {
                // Déterminer si un SMS/code a été reçu
                const hasCode = num.type === 'activation' && num.smsCode;
                // Dédupliquer les messages par leur texte
                const rawRentMessages = num.type === 'rental' ? (rentMessagesCache[num.rentalId || ''] || []) : [];
                const rentMessages = rawRentMessages.filter((msg, index, arr) =>
                  arr.findIndex(m => m.text === msg.text) === index
                );
                const hasMessages = num.type === 'rental' && (rentMessages.length > 0 || (num.messageCount && num.messageCount > 0));
                const isReceived = hasCode || hasMessages;

                const remainingSeconds = getRealTimeRemaining(num.expiresAt);
                const remainingMinutes = Math.floor(remainingSeconds / 60);

                return (
                  <div
                    key={num.id}
                    className={`rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                      isReceived
                        ? 'bg-gradient-to-b from-emerald-50/60 via-white to-white border-emerald-400 shadow-xl shadow-emerald-500/10'
                        : 'bg-white border-gray-200/80 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {/* Header Row: Logo, Service, Country & Live Time Badge */}
                    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
                      <div className="flex items-center gap-3.5">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${num.type === 'rental' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                            <img
                              src={getServiceLogo(num.service.toLowerCase())}
                              alt={num.service}
                              className="w-7 h-7 object-contain"
                              onError={(e) => handleLogoError(e, num.service.toLowerCase())}
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm flex items-center justify-center bg-white">
                            <img
                              src={getCountryFlag(num.country)}
                              alt={num.country}
                              className="w-full h-full object-cover"
                              onError={(e) => handleFlagError(e)}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-gray-900 text-base sm:text-lg leading-tight">
                              {getServiceName(num.service)}
                            </h3>
                            {num.type === 'rental' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                                Location {num.durationHours ? `${num.durationHours}H` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            {getCountryName(num.country)}
                          </p>
                        </div>
                      </div>

                      {/* Live Status Badge */}
                      <div className="flex items-center gap-2">
                        {isReceived ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                            <span>SMS REÇU</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0055FF] text-xs font-bold border border-blue-200 shadow-sm">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>
                              Expire dans {remainingMinutes > 0 ? `${remainingMinutes} min` : `${remainingSeconds}s`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phone Number Banner (Ultra-Visible & One-Click Copy) */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                          Numéro de téléphone attribué
                        </span>
                        <span className="text-xl sm:text-2xl font-mono font-black tracking-wider select-all text-white">
                          {formatPhoneNumber(num.phone)}
                        </span>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          copyToClipboard(num.phone, 'phone');
                          setCopiedPhoneId(num.id);
                          setTimeout(() => setCopiedPhoneId(null), 2500);
                        }}
                        className={`h-11 px-5 rounded-xl font-extrabold transition-all shadow-md flex items-center gap-2 ${
                          copiedPhoneId === num.id
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-[#0055FF] hover:bg-[#0044CC] text-white'
                        }`}
                      >
                        {copiedPhoneId === num.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copier le numéro</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* SMS Status / Live Waiting Area */}
                    <div className="p-4 sm:p-5">
                      {num.type === 'rental' ? (
                        hasMessages ? (
                          <button
                            onClick={() => openRentMessagesModal(num.rentalId || '', num.phone, num.service)}
                            className="w-full px-5 py-4 flex items-center justify-between text-purple-800 bg-purple-50 border-2 border-purple-200 rounded-2xl font-bold hover:bg-purple-100 transition-all shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <MessageSquare className="w-5 h-5 text-purple-600" />
                              <span>{rentMessages.length || num.messageCount} messages reçus — Cliquez pour consulter</span>
                            </div>
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="w-full bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Loader2 className="w-5 h-5 text-[#0055FF] animate-spin" />
                              </div>
                              <div>
                                <p className="text-sm font-extrabold text-gray-900">En attente de SMS sur cette location...</p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Mise à jour automatique en continu</p>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        hasCode ? (
                          /* SMS CODE RECEIVED HERO BOX */
                          <div className="bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 sm:p-6 text-center sm:text-left shadow-inner">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-200/80 text-emerald-900 text-xs font-black uppercase tracking-wider mb-2">
                                  ✓ Code Reçu
                                </div>
                                <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-900 tracking-tight select-all">
                                  {num.smsCode?.includes('STATUS_OK:') ? num.smsCode.split(':')[1] : num.smsCode}
                                </div>
                              </div>

                              <Button
                                type="button"
                                onClick={() => {
                                  const cleanCode = num.smsCode?.includes('STATUS_OK:')
                                    ? num.smsCode.split(':')[1]
                                    : num.smsCode || '';
                                  copyToClipboard(cleanCode, 'code');
                                  setCopiedCodeId(num.id);
                                  setTimeout(() => setCopiedCodeId(null), 2500);
                                }}
                                className={`h-12 px-6 rounded-xl font-extrabold text-sm transition-all shadow-md flex items-center gap-2 ${
                                  copiedCodeId === num.id
                                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {copiedCodeId === num.id ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Code Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    <span>Copier le Code</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* LIVE WAITING & ACTION BAR */
                          <div className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Activity className="w-5 h-5 text-[#0055FF] animate-pulse" />
                              </div>
                              <div>
                                <h4 className="text-sm font-extrabold text-gray-900">
                                  📡 En attente de votre SMS en direct...
                                </h4>
                                <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                                  Entrez le numéro ci-dessus dans l&apos;application <span className="font-bold text-gray-900">{getServiceName(num.service)}</span>. Dès que le SMS arrive, il s&apos;affichera automatiquement ici.
                                </p>
                              </div>
                            </div>

                            {/* Direct Actions: Check Now & Cancel/Refund */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-blue-100">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await cloudFunctions.invoke(`check-${num.provider}-status`, {
                                      body: { activationId: num.id, userId: user?.id }
                                    });
                                    if (error) throw error;
                                    if (data?.smsCode) {
                                      toast({ title: 'SMS Reçu !', description: 'Le code SMS est maintenant disponible.', variant: 'success' });
                                    } else {
                                      toast({ title: 'Vérification terminée', description: 'En attente, aucun SMS pour l\'instant...', variant: 'info' });
                                    }
                                    refetchActivations();
                                  } catch (e: any) {
                                    toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                  }
                                }}
                                className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 border-blue-200 text-[#0055FF]"
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                <span>⚡ Vérifier maintenant</span>
                              </Button>

                              {canCancelActivation(num.expiresAt) ? (
                                <Button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      let cancelFunction = 'cancel-sms-activate-order';
                                      if (num.provider === '5sim') cancelFunction = 'cancel-5sim-order';
                                      else if (num.provider === 'grizzly') cancelFunction = 'cancel-grizzly-order';
                                      else if (num.provider === 'textverified') cancelFunction = 'cancel-textverified-order';
                                      else if (num.provider === 'onlinesim') cancelFunction = 'cancel-onlinesim-order';
                                      else if (num.provider === 'smspva') cancelFunction = 'cancel-smspva-order';
                                      else if (num.provider === 'smspool') cancelFunction = 'cancel-smspool-order';
                                      const { data, error } = await cloudFunctions.invoke(cancelFunction, {
                                        body: { activationId: num.id, orderId: num.orderId, userId: user?.id }
                                      });
                                      if (error || !data?.success) throw new Error(data?.error || error?.message);
                                      showStatusFeedback('cancelled');
                                      refetchActivations();
                                    } catch (e: any) {
                                      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                    }
                                  }}
                                  className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 shadow-none"
                                >
                                  <X className="w-3.5 h-3.5 mr-1.5" />
                                  <span>🛡️ Annuler & Rembourser (Gratuit)</span>
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400 font-medium">
                                  Annulation dans {Math.ceil((300 - getTimeElapsedSinceCreation(num.expiresAt)) / 60)} min
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal des messages de rental - Design Minimaliste et Propre */}
      <Dialog open={showRentMessagesModal} onOpenChange={setShowRentMessagesModal}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
          {/* Header Minimaliste */}
          <div className="px-5 py-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <img
                    src={getServiceLogo(selectedRentalForMessages?.service?.toLowerCase() || '')}
                    alt={selectedRentalForMessages?.service}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<span class="text-lg">📨</span>';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{getServiceName(selectedRentalForMessages?.service || '')}</h3>
                  <p className="text-sm text-gray-500 font-mono">{formatPhoneNumber(selectedRentalForMessages?.phone || '')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {(() => {
              if (isLoadingRentMessages) {
                return (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative w-12 h-12 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-sm text-gray-500">Chargement...</p>
                  </div>
                );
              }

              const rawMessages = rentMessagesCache[selectedRentalForMessages?.rentalId || ''] || [];
              // Dédupliquer les messages par leur texte
              const messages = rawMessages.filter((msg, index, arr) =>
                arr.findIndex(m => m.text === msg.text) === index
              );

              if (messages.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <MessageSquare className="h-7 w-7 text-gray-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        <div className="absolute inset-0 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 mb-1">{t('modals.rentMessages.noMessages')}</p>
                    <p className="text-sm text-gray-500 text-center max-w-[220px]">{t('modals.rentMessages.autoDisplay')}</p>
                  </div>
                );
              }

              const decodeHtml = (text: string) => {
                return text
                  .replace(/&#10;/g, '\n')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"');
              };

              return (
                <div className="space-y-3">
                  {messages.map((msg, index) => {
                    const decodedText = decodeHtml(msg.text);
                    const codePatterns = [
                      /(?:code|Code|CODE)[:\s]*([0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9]?[-\s]?[0-9]?[-\s]?[0-9]?)/i,
                      /\b(\d{3}[-\s]?\d{3,4})\b/,
                      /\b(\d{4,8})\b/
                    ];

                    let extractedCode: string | null = null;
                    for (const pattern of codePatterns) {
                      const match = decodedText.match(pattern);
                      if (match) {
                        extractedCode = match[1].replace(/[-\s]/g, '');
                        break;
                      }
                    }

                    return (
                      <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                        {/* Code Section */}
                        {extractedCode ? (
                          <div className="mb-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Code</p>
                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-mono font-bold text-gray-900 tracking-wider">{extractedCode}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(extractedCode!);
                                  toast({
                                    title: t('modals.rentMessages.copied'),
                                    description: extractedCode,
                                  });
                                }}
                                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{decodedText}</p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            {msg.phoneFrom || msg.service || 'SMS'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(msg.date).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white">
            <Button
              onClick={async () => {
                if (!selectedRentalForMessages?.rentalId) return;
                try {
                  const { data, error } = await cloudFunctions.invoke('get-rent-status', {
                    body: { rentId: selectedRentalForMessages.rentalId, userId: user?.id }
                  });
                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                  const newMessages = data.messages || [];
                  setRentMessagesCache(prev => ({
                    ...prev,
                    [selectedRentalForMessages.rentalId]: newMessages
                  }));
                  toast({ title: t('modals.rentMessages.refreshed'), description: t('modals.rentMessages.messagesCount', { count: newMessages.length }) });
                } catch (e: any) {
                  toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
                }
              }}
              className="w-full h-11 rounded-xl font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.refresh')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de solde insuffisant */}
      {/* Dialog de solde insuffisant - PREMIUM REDESIGN */}
      <Dialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
        <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden shadow-[0_0_50px_-12px_rgba(37,99,235,0.5)]">
          {/* Header avec Dégradé */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl border border-white/20">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">{t('insufficientBalance.title')}</DialogTitle>
              <DialogDescription className="text-blue-100 font-medium mt-1 text-sm px-4">
                {t('insufficientBalance.description')}
              </DialogDescription>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-gray-950 space-y-6">
            {insufficientBalanceData && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 space-y-3 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('insufficientBalance.needed')}</span>
                  <span className="font-black text-lg text-gray-900 dark:text-white">{insufficientBalanceData.needed} Ⓐ</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('insufficientBalance.available')}</span>
                  <span className="font-black text-lg text-gray-900 dark:text-white">{insufficientBalanceData.available} Ⓐ</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-black text-red-500 uppercase tracking-widest">{t('insufficientBalance.missing')}</span>
                  <span className="font-black text-xl text-red-600 dark:text-red-400">{insufficientBalanceData.missing} Ⓐ</span>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-3 sm:gap-3 flex-row pt-2">
              <button
                onClick={() => setShowInsufficientBalanceDialog(false)}
                className="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowInsufficientBalanceDialog(false);
                  navigate('/top-up');
                }}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl py-4 shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                {t('insufficientBalance.topUp')}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation Finish Rental */}
      <Dialog open={showFinishRentalDialog} onOpenChange={setShowFinishRentalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Terminer la location ?
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              <><span className="block text-red-600 font-semibold mb-2">⚠️ Attention : Action Définitive</span>Si vous terminez cette location, l'argent sera <strong className="text-gray-900">définitivement débité</strong> de votre solde et vous ne pourrez plus annuler ni demander de remboursement. Êtes-vous sûr de vouloir continuer ?</>
            </DialogDescription>
          </DialogHeader>

          {rentalToFinish && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-mono font-medium text-gray-900">{rentalToFinish.phone}</p>
                  <p className="text-sm text-gray-500">{t('modals.finishRental.irreversible')}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowFinishRentalDialog(false);
                setRentalToFinish(null);
              }}
              disabled={isFinishingRental}
              className="flex-1 border-2 border-gray-200 hover:bg-gray-50 font-semibold text-gray-600"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!rentalToFinish) return;
                setIsFinishingRental(true);
                try {
                  const { data, error } = await cloudFunctions.invoke('set-rent-status', {
                    body: { rentId: rentalToFinish.rentalId, action: 'finish', userId: user?.id }
                  });
                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                  toast({ title: t('modals.finishRental.success'), description: t('modals.finishRental.released') });
                  // Invalider le cache et refetch pour mise à jour immédiate
                  await queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
                  await refetchRentals();
                  // Rafraîchir le solde car les crédits gelés sont libérés
                  queryClient.invalidateQueries({ queryKey: ['user-balance'] });
                  setShowFinishRentalDialog(false);
                  setRentalToFinish(null);
                } catch (e: any) {
                  toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
                } finally {
                  setIsFinishingRental(false);
                }
              }}
              disabled={isFinishingRental}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isFinishingRental ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('modals.finishRental.processing')}
                </>
              ) : (
                t('modals.finishRental.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation Cancel Rental */}
      <Dialog open={showCancelRentalDialog} onOpenChange={setShowCancelRentalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {t('modals.cancelRental.title')}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              {t('modals.cancelRental.description')}
            </DialogDescription>
          </DialogHeader>

          {rentalToCancel && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-mono font-medium text-gray-900">{rentalToCancel.phone}</p>
                  <p className="text-sm text-green-600 font-medium">
                    {(() => {
                      if (rentalToCancel.messageCount > 0) {
                        return <span className="text-orange-500">⚠️ Annulation sans remboursement (SMS déjà reçu)</span>;
                      }
                      const minutesLeft = 20 - calculateMinutesElapsed(rentalToCancel.createdAt);
                      return minutesLeft > 0
                        ? `✅ Remboursement possible (${minutesLeft}min restantes)`
                        : <span className="text-red-500">⚠️ Période de grâce expirée</span>;
                    })()}
                  </p>
                  {rentalToCancel.frozenAmount && (
                    <p className="text-xs text-gray-500">
                      Montant à rembourser: {rentalToCancel.frozenAmount} Ⓐ
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelRentalDialog(false);
                setRentalToCancel(null);
              }}
              disabled={isCancellingRental}
              className="flex-1 border-2 border-gray-200 hover:bg-gray-50 font-semibold text-gray-600"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!rentalToCancel) return;
                setIsCancellingRental(true);
                try {
                  const { data, error } = await cloudFunctions.invoke('set-rent-status', {
                    body: { rentId: rentalToCancel.rentalId, action: 'cancel', userId: user?.id }
                  });
                  if (error || !data?.success) throw new Error(data?.error || error?.message);

                  // Show success message with refund amount
                  const refundAmount = data.refundAmount || rentalToCancel.frozenAmount || 0;
                  toast({
                    title: t('modals.cancelRental.success'),
                    description: refundAmount > 0
                      ? `${refundAmount} Ⓐ remboursé sur votre compte`
                      : t('modals.cancelRental.cancelled')
                  });

                  // Invalider le cache et refetch pour mise à jour immédiate
                  await queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
                  await refetchRentals();
                  // Rafraîchir le solde car les crédits sont remboursés
                  queryClient.invalidateQueries({ queryKey: ['user-balance'] });
                  setShowCancelRentalDialog(false);
                  setRentalToCancel(null);
                } catch (e: any) {
                  toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
                } finally {
                  setIsCancellingRental(false);
                }
              }}
              disabled={isCancellingRental}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {isCancellingRental ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('modals.cancelRental.processing')}
                </>
              ) : (
                t('modals.cancelRental.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SmsRevealPopup />
      <StatusFeedbackModal />
    </div>
  );
}
