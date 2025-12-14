/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { useRealtimeActivations, useRealtimeRentals, useRealtimeTransactions } from '@/hooks/useRealtimeSubscription';
import { 
  Copy,
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  XCircle,
  CheckCircle2,
  Home,
  Wallet,
  ShoppingCart,
  RefreshCw,
  Gift,
  Phone,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  MessageSquare,
  X
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
import { getServiceLogo, getServiceLogoFallback, getServiceIcon, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';

// Type pour les messages de rent
interface RentMessage {
  phoneFrom: string;
  text: string;
  service: string;
  date: string;
}

// Cache des messages par rentalId
type RentMessagesCache = Record<string, RentMessage[]>;

// Gestionnaire d'erreur pour les images - utilise fallback SVG
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, serviceCode?: string) => {
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
  
  // Si on a un serviceCode, charger le fallback SVG
  if (serviceCode) {
    target.dataset.fallbackLoaded = 'true'
    target.src = getServiceLogoFallback(serviceCode)
  } else {
    // Sinon, afficher l'emoji directement
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
  }
}

interface Order {
  id: string;
  order_id: string;
  phone: string;
  service_code: string;
  country_code: string;
  operator: string;
  price: number;
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled';
  sms_code?: string;
  sms_text?: string;
  created_at: string;
  expires_at: string;
  charged: boolean;
  type?: 'activation';
}

interface Rental {
  id: string;
  rent_id: string;
  phone: string;
  service_code: string;
  country_code: string;
  operator: string;
  total_cost: number;
  hourly_rate: number;
  status: 'active' | 'completed' | 'cancelled';
  message_count: number;
  created_at: string;
  end_date: string;
  rent_hours: number;
  type?: 'rental';
}

// Type unifié pour l'affichage
interface HistoryItem {
  id: string;
  orderId: string;
  phone: string;
  serviceCode: string;
  countryCode: string;
  price: number;
  status: string;
  smsCode?: string;
  smsText?: string;
  createdAt: string;
  expiresAt: string;
  type: 'activation' | 'rental';
  messageCount?: number;
  durationHours?: number;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  metadata?: any;
}

type Tab = 'orders' | 'payments';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const itemsPerPage = 10;

  // State pour le modal des messages de rental
  const [showRentMessagesModal, setShowRentMessagesModal] = useState(false);
  const [selectedRentalForMessages, setSelectedRentalForMessages] = useState<{
    rentalId: string;
    phone: string;
    service: string;
  } | null>(null);
  const [rentMessagesCache, setRentMessagesCache] = useState<RentMessagesCache>({});
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 🔴 REALTIME: Écoute les changements en temps réel (WebSocket)
  useRealtimeActivations(user?.id, {
    onSmsReceived: (activation) => {
      toast({
        title: '✅ SMS Reçu !',
        description: `Code: ${activation.sms_code} pour ${activation.service_code}`,
        duration: 5000,
      });
    },
    onStatusChange: (activation, _oldStatus) => {
      if (activation.status === 'cancelled' || activation.status === 'timeout') {
        toast({
          title: activation.status === 'timeout' ? '⏰ Expiration' : '❌ Annulation',
          description: `${activation.phone} - Crédits remboursés`,
          variant: 'destructive',
          duration: 4000,
        });
      }
    }
  });
  
  useRealtimeRentals(user?.id);
  useRealtimeTransactions(user?.id);

  // Fetch activations history
  const { data: activations = [], isLoading: activationsLoading } = useQuery<Order[]>({
    queryKey: ['activations-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [HISTORY] Erreur chargement orders:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch payments history
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['payments-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [HISTORY] Erreur chargement payments:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch rentals history
  const { data: rentals = [], isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ['rentals-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [HISTORY] Erreur chargement rentals:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Combiner activations + rentals en une liste unifiée triée par date
  const combinedOrders: HistoryItem[] = [
    ...activations.map(a => ({
      id: a.id,
      orderId: a.order_id,
      phone: a.phone,
      serviceCode: a.service_code,
      countryCode: a.country_code,
      price: a.price,
      status: a.status,
      smsCode: a.sms_code,
      smsText: a.sms_text,
      createdAt: a.created_at,
      expiresAt: a.expires_at,
      type: 'activation' as const
    })),
    ...rentals.map(r => ({
      id: r.id,
      orderId: r.rent_id,
      phone: r.phone,
      serviceCode: r.service_code,
      countryCode: r.country_code,
      price: r.total_cost || (r.hourly_rate * (r.rent_hours || 1)),
      status: r.status,
      createdAt: r.created_at,
      expiresAt: r.end_date,
      type: 'rental' as const,
      messageCount: r.message_count || 0,
      durationHours: r.rent_hours
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const ordersLoading = activationsLoading || rentalsLoading;

  // Fonction pour charger les messages d'un rental
  const loadRentalMessages = async (rentalId: string) => {
    if (rentMessagesCache[rentalId]) return; // Déjà en cache

    setLoadingMessages(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-rent-status', {
        body: { rentId: rentalId, userId: user?.id }
      });
      if (!error && data?.success) {
        setRentMessagesCache(prev => ({
          ...prev,
          [rentalId]: data.messages || []
        }));
      }
    } catch (e) {
      console.error('Erreur chargement messages:', e);
    }
    setLoadingMessages(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.copied'),
      description: t('common.success')
    });
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

  const cancelActivation = async (activationId: string, orderId: string) => {
    try {
      // console.log('🚫 [CANCEL] Starting cancellation for:', { activationId, orderId });

      // 1. Cancel via Edge Function (plus sécurisé)
      const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
        body: { orderId: parseInt(orderId) }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || '5sim cancellation failed');
      }

      // console.log('✅ [CANCEL] 5sim cancellation successful');

      // 2. Update Supabase status
      const { error: updateError } = await (supabase
        .from('activations') as any)
        .update({ 
          status: 'cancelled',
          charged: false
        })
        .eq('id', activationId);

      if (updateError) {
        console.error('❌ [CANCEL] Supabase update error:', updateError);
        throw updateError;
      }

      // console.log('✅ [CANCEL] Database updated to cancelled');

      // 3. Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['orders-history'] });
      await queryClient.invalidateQueries({ queryKey: ['active-numbers'] });

      toast({
        title: 'Activation annulée',
        description: 'Le numéro a été annulé avec succès',
      });

    } catch (error: any) {
      console.error('❌ [CANCEL] Error:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'annuler l\'activation',
        variant: 'destructive'
      });
    }
  };

  const checkActivationStatus = async (activationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-sms-activate-status', {
        body: { activationId, userId: user?.id }
      });

      if (error) throw error;

      toast({
        title: 'Statut vérifié',
        description: data?.smsCode ? 'SMS reçu !' : 'Toujours en attente...'
      });

      await queryClient.invalidateQueries({ queryKey: ['activations-history', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['orders-history', user?.id] });
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message || 'Impossible de vérifier le statut',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (expiresAt: string): number => {
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expires - now) / 1000));
  };

  const getItemStatus = (item: HistoryItem): string => {
    // Pour les rentals
    if (item.type === 'rental') {
      // Vérifier si le rental est expiré
      const now = new Date();
      const expiresAt = new Date(item.expiresAt);
      if (item.status === 'active' && now > expiresAt) {
        return 'expired';
      }
      return item.status; // 'active', 'completed', 'cancelled', 'expired'
    }
    
    // Pour les activations - statuts terminaux
    if (['received', 'timeout', 'cancelled', 'refunded', 'expired'].includes(item.status)) {
      return item.status;
    }
    
    // Vérifier l'expiration en temps réel
    const timeRemaining = getTimeRemaining(item.expiresAt);
    if (timeRemaining <= 0 && (item.status === 'waiting' || item.status === 'pending')) {
      return 'timeout';
    }
    
    return item.status === 'pending' ? 'waiting' : item.status;
  };

  const getServiceName = (code: string): string => {
    // Mapping complet des codes SMS-Activate vers noms lisibles
    const serviceMap: Record<string, string> = {
      // Messaging
      'wa': 'WhatsApp',
      'tg': 'Telegram',
      'vi': 'Viber',
      'wb': 'WeChat',
      'ln': 'Line',
      'kk': 'KakaoTalk',
      'sg': 'Signal',
      'sk': 'Skype',
      
      // Social
      'ig': 'Instagram',
      'fb': 'Facebook',
      'tw': 'Twitter',
      'lf': 'TikTok',
      'fu': 'Snapchat',
      'vk': 'VKontakte',
      'ds': 'Discord',
      'tn': 'LinkedIn',
      'ok': 'Odnoklassniki',
      'bnl': 'Reddit',
      
      // Tech
      'go': 'Google',
      'mm': 'Microsoft',
      'wx': 'Apple',
      'dr': 'OpenAI',
      'mb': 'Yahoo',
      'pm': 'AOL',
      'zm': 'Zoom',
      'sl': 'Slack',
      
      // Finance
      'ts': 'PayPal',
      'aon': 'Binance',
      're': 'Coinbase',
      'ij': 'Revolut',
      'bo': 'Wise',
      'ti': 'Crypto.com',
      'nc': 'Payoneer',
      
      // Shopping
      'am': 'Amazon',
      'hx': 'AliExpress',
      'ka': 'Shopee',
      'aez': 'Shein',
      'ep': 'Temu',
      'dl': 'Lazada',
      'xt': 'Flipkart',
      
      // Entertainment
      'nf': 'Netflix',
      'alj': 'Spotify',
      'hb': 'Twitch',
      
      // Dating
      'oi': 'Tinder',
      'gr': 'Grindr',
      'mo': 'Bumble',
      'qv': 'Badoo',
      'vz': 'Hinge',
      'df': 'Happn',
      
      // Delivery
      'ub': 'Uber',
      'jg': 'Grab',
      'ac': 'DoorDash',
      'aq': 'Glovo',
      'nz': 'Foodpanda',
      'rr': 'Wolt',
      
      // Gaming
      'mt': 'Steam',
      'aiw': 'Roblox',
      'blm': 'Epic Games',
      'bz': 'Blizzard',
      'ah': 'Tarkov',
      
      // Legacy/full names
      'instagram': 'Instagram',
      'whatsapp': 'WhatsApp',
      'google': 'Google',
      'facebook': 'Facebook',
      'telegram': 'Telegram',
      'twitter': 'Twitter',
      'tiktok': 'TikTok',
      'snapchat': 'Snapchat',
      'discord': 'Discord',
      'amazon': 'Amazon',
      'netflix': 'Netflix',
      'paypal': 'PayPal',
      'uber': 'Uber',
      'tinder': 'Tinder',
      'bumble': 'Bumble',
      'badoo': 'Badoo',
      'microsoft': 'Microsoft',
      'apple': 'Apple',
      'steam': 'Steam',
      'spotify': 'Spotify',
      'linkedin': 'LinkedIn',
      'yahoo': 'Yahoo',
      'binance': 'Binance',
      'coinbase': 'Coinbase',
      'viber': 'Viber',
      'wechat': 'WeChat',
      'line': 'Line',
      'signal': 'Signal',
      'openai': 'OpenAI',
      
      // Rent
      'full': 'Full Rent'
    };
    return serviceMap[code.toLowerCase()] || code.toUpperCase();
  };

  const getCountryName = (code: string): string => {
    // Mapping complet des codes pays vers noms lisibles
    const countryMap: Record<string, string> = {
      // ISO 2-letter codes
      'us': 'États-Unis',
      'gb': 'Royaume-Uni',
      'uk': 'Royaume-Uni',
      'fr': 'France',
      'de': 'Allemagne',
      'es': 'Espagne',
      'it': 'Italie',
      'pt': 'Portugal',
      'nl': 'Pays-Bas',
      'be': 'Belgique',
      'ch': 'Suisse',
      'at': 'Autriche',
      'pl': 'Pologne',
      'ru': 'Russie',
      'ua': 'Ukraine',
      'kz': 'Kazakhstan',
      'cn': 'Chine',
      'jp': 'Japon',
      'kr': 'Corée du Sud',
      'in': 'Inde',
      'id': 'Indonésie',
      'ph': 'Philippines',
      'vn': 'Vietnam',
      'th': 'Thaïlande',
      'my': 'Malaisie',
      'sg': 'Singapour',
      'hk': 'Hong Kong',
      'tw': 'Taïwan',
      'au': 'Australie',
      'nz': 'Nouvelle-Zélande',
      'ca': 'Canada',
      'mx': 'Mexique',
      'br': 'Brésil',
      'ar': 'Argentine',
      'co': 'Colombie',
      'cl': 'Chili',
      'pe': 'Pérou',
      'ma': 'Maroc',
      'dz': 'Algérie',
      'tn': 'Tunisie',
      'eg': 'Égypte',
      'ng': 'Nigeria',
      'ke': 'Kenya',
      'za': 'Afrique du Sud',
      'gh': 'Ghana',
      'sn': 'Sénégal',
      'ci': 'Côte d\'Ivoire',
      'cm': 'Cameroun',
      'ae': 'Émirats Arabes Unis',
      'sa': 'Arabie Saoudite',
      'tr': 'Turquie',
      'il': 'Israël',
      'pk': 'Pakistan',
      'bd': 'Bangladesh',
      'mm': 'Myanmar',
      'np': 'Népal',
      'lk': 'Sri Lanka',
      'kh': 'Cambodge',
      'la': 'Laos',
      'ro': 'Roumanie',
      'bg': 'Bulgarie',
      'cz': 'République Tchèque',
      'hu': 'Hongrie',
      'sk': 'Slovaquie',
      'hr': 'Croatie',
      'rs': 'Serbie',
      'gr': 'Grèce',
      'se': 'Suède',
      'no': 'Norvège',
      'dk': 'Danemark',
      'fi': 'Finlande',
      'ie': 'Irlande',
      'uz': 'Ouzbékistan',
      'kg': 'Kirghizistan',
      
      // SMS-Activate numeric IDs
      '0': 'Russie',
      '1': 'Ukraine',
      '2': 'Kazakhstan',
      '3': 'Chine',
      '4': 'Philippines',
      '5': 'Myanmar',
      '6': 'Indonésie',
      '7': 'Malaisie',
      '8': 'Kenya',
      '9': 'Tanzanie',
      '10': 'Vietnam',
      '11': 'Kirghizistan',
      '12': 'Angleterre',
      '13': 'Israël',
      '14': 'Hong Kong',
      '15': 'Pologne',
      '16': 'Égypte',
      '17': 'Nigeria',
      '19': 'Maroc',
      '20': 'Ghana',
      '21': 'Argentine',
      '22': 'Inde',
      '23': 'Ouzbékistan',
      '24': 'Cambodge',
      '25': 'Cameroun',
      '27': 'Allemagne',
      '32': 'Roumanie',
      '33': 'Colombie',
      '36': 'Canada',
      '37': 'Arabie Saoudite',
      '38': 'Mexique',
      '39': 'Afrique du Sud',
      '40': 'Espagne',
      '43': 'Pays-Bas',
      '44': 'Bangladesh',
      '45': 'Brésil',
      '46': 'Turquie',
      '47': 'Japon',
      '48': 'Corée du Sud',
      '49': 'Taïwan',
      '50': 'Singapour',
      '51': 'Émirats Arabes Unis',
      '52': 'Thaïlande',
      '53': 'Pakistan',
      '56': 'Portugal',
      '58': 'Italie',
      '60': 'Suisse',
      '61': 'Grèce',
      '62': 'République Tchèque',
      '63': 'Hongrie',
      '64': 'Danemark',
      '65': 'Norvège',
      '66': 'Finlande',
      '67': 'Irlande',
      '73': 'Pérou',
      '74': 'Chili',
      '78': 'France',
      '117': 'Portugal',
      '175': 'Australie',
      '187': 'États-Unis',
      
      // Legacy names
      'russia': 'Russie',
      'ukraine': 'Ukraine',
      'usa': 'États-Unis',
      'england': 'Angleterre',
      'france': 'France',
      'germany': 'Allemagne',
      'indonesia': 'Indonésie',
      'india': 'Inde',
      'philippines': 'Philippines',
      'vietnam': 'Vietnam',
      'brazil': 'Brésil',
      'mexico': 'Mexique',
      'canada': 'Canada',
      'australia': 'Australie',
      'spain': 'Espagne',
      'italy': 'Italie',
      'thailand': 'Thaïlande',
      'malaysia': 'Malaisie',
      'morocco': 'Maroc',
      'argentina': 'Argentine'
    };
    return countryMap[code.toLowerCase()] || countryMap[code] || code.toUpperCase();
  };

  // Normaliser un label de rent venu de SMS-Activate en français
  const formatRentalLabel = (serviceCode: string, durationHours?: number, countryCode?: string): string => {
    if (!serviceCode) return 'Location';

    // Exemple attendu: "Rent Google,youtube,Gmail in 6 for 4hours"
    const rentPattern = /^rent\s+(.+?)(?:\s+in\s+([^\s]+))?\s+for\s+(\d+)\s*hours?/i;
    const match = rentPattern.exec(serviceCode);

    if (match) {
      const services = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(', ');
      const hours = Number(match[3]) || durationHours;
      const durationText = hours ? `${hours}h` : '';
      const countryHint = match[2] || countryCode;
      const countryLabel = countryHint ? getCountryName(countryHint) : '';
      const countryText = countryLabel ? ` (${countryLabel})` : '';

      return `Location ${services}${countryText}${durationText ? ` pendant ${durationText}` : ''}`;
    }

    const normalized = serviceCode.toLowerCase();
    if (normalized === 'full') return 'Location multi-service';
    if (normalized === 'ot') return 'Location autre service';

    return `Location ${getServiceName(serviceCode)}`;
  };

  // Pagination for orders (combined activations + rentals)
  const totalOrdersPages = Math.ceil(combinedOrders.length / itemsPerPage);
  const paginatedOrders = combinedOrders.slice(
    (ordersPage - 1) * itemsPerPage,
    ordersPage * itemsPerPage
  );

  // Pagination for payments
  const totalPaymentsPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = payments.slice(
    (paymentsPage - 1) * itemsPerPage,
    paymentsPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-background pt-4 lg:pt-0">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground text-center mb-4">{t('history.title')}</h1>
          
          {/* Tabs - Full width on mobile */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('history.orders')}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'payments'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('history.payments')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4">
        {activeTab === 'orders' ? (
          <>
            {/* Orders List */}
            {ordersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">{t('common.loading')}</p>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">📋</span>
                </div>
                <p className="text-gray-500 mb-2">{t('history.noOrders')}</p>
                <p className="text-sm text-gray-400">{t('history.noOrders')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedOrders.map((item) => {
                  const actualStatus = getItemStatus(item);
                  const timeRemaining = getTimeRemaining(item.expiresAt);
                  const isRental = item.type === 'rental';
                  const hasSms = !!item.smsCode;
                  
                  return (
                  <div
                    key={item.id}
                    className={`bg-card border rounded-xl p-3 sm:px-5 sm:py-4 hover:shadow-md transition-all ${
                      isRental ? 'border-purple-200 dark:border-purple-800' : 'border-border'
                    }`}>
                    {/* Badge type rental */}
                    {isRental && (
                      <div className="flex items-center gap-1 mb-2">
                        <Home className="w-3 h-3 text-purple-500" />
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{t('history.rentalHours', { hours: item.durationHours })}</span>
                      </div>
                    )}
                    {/* Mobile Layout */}
                    <div className="flex flex-col sm:hidden gap-3">
                      {/* Top row: Logo + Service + Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Logo + Flag */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 border rounded-xl flex items-center justify-center ${
                              isRental ? 'bg-purple-50 border-purple-200' : 'bg-muted border-border'
                            }`}>
                              <img 
                                src={getServiceLogo(item.serviceCode)}
                                alt={item.serviceCode}
                                className="w-6 h-6 object-contain"
                                onError={(e) => handleImageError(e, item.serviceCode)}
                              />
                              <span className="text-base hidden items-center justify-center">{getServiceIcon(item.serviceCode)}</span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-background overflow-hidden bg-background shadow-md flex items-center justify-center">
                              <img 
                                src={getCountryFlag(item.countryCode)}
                                alt={item.countryCode}
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageError(e)}
                              />
                              <span className="text-xs hidden items-center justify-center">{getFlagEmoji(item.countryCode)}</span>
                            </div>
                          </div>
                          {/* Service Name */}
                          <div>
                            <p className="font-semibold text-sm text-foreground leading-tight">
                              {isRental ? formatRentalLabel(item.serviceCode, item.durationHours, item.countryCode) : getServiceName(item.serviceCode)}
                            </p>
                            <p className="text-xs text-muted-foreground">{getCountryName(item.countryCode)}</p>
                          </div>
                        </div>
                        {/* Price + Menu */}
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center px-2.5 py-1.5 rounded-full ${isRental ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground'}`}>
                            <span className="text-xs font-semibold">{Math.floor(item.price)}</span>
                            <span className="text-[10px] ml-0.5">Ⓐ</span>
                          </div>
                          {!isRental ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {!hasSms && (actualStatus === 'waiting' || actualStatus === 'pending') && (
                                  <DropdownMenuItem
                                    onClick={() => checkActivationStatus(item.id)}
                                    className="cursor-pointer text-sm"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                                    Vérifier SMS
                                  </DropdownMenuItem>
                                )}

                                {hasSms && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const cleanCode = item.smsCode?.includes('STATUS_OK:') 
                                        ? item.smsCode.split(':')[1] 
                                        : item.smsCode || '';
                                      copyToClipboard(cleanCode);
                                    }}
                                    className="cursor-pointer text-sm"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copier le code
                                  </DropdownMenuItem>
                                )}

                                {!hasSms && (actualStatus === 'waiting' || actualStatus === 'pending') ? (
                                  canCancelActivation(item.expiresAt) ? (
                                    <DropdownMenuItem
                                      onClick={() => cancelActivation(item.id, item.orderId)}
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-sm"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      {t('dashboard.cancel')}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      disabled
                                      className="cursor-not-allowed opacity-50 text-xs"
                                    >
                                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                      <span>{t('history.cancelIn', { minutes: Math.ceil((300 - getTimeElapsedSinceCreation(item.expiresAt)) / 60) })}</span>
                                    </DropdownMenuItem>
                                  )
                                ) : null}

                                {(actualStatus === 'cancelled' || actualStatus === 'timeout') && (
                                  <DropdownMenuItem disabled className="cursor-not-allowed opacity-60 text-xs">
                                    <X className="h-4 w-4 mr-2 text-gray-400" />
                                    <span>{actualStatus === 'cancelled' ? t('history.cancelled') : t('history.timeout')}</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            // Placeholder bouton désactivé pour garder l'UI cohérente
                            <button className="p-1.5 rounded-lg opacity-50 cursor-not-allowed" disabled>
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Phone number row */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground bg-muted px-2.5 py-1 rounded flex-1">
                          {formatPhoneNumber(item.phone)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.phone)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Copy className="h-4 w-4 text-primary" />
                        </button>
                      </div>
                      
                      {/* Status / SMS Code row */}
                      <div className="flex items-center justify-between">
                        {isRental ? (
                          /* RENTAL: Afficher messages ou status */
                          actualStatus === 'active' || actualStatus === 'completed' ? (
                            <button
                              onClick={() => {
                                setSelectedRentalForMessages({
                                  rentalId: item.orderId,
                                  phone: item.phone,
                                  service: item.serviceCode
                                });
                                loadRentalMessages(item.orderId);
                                setShowRentMessagesModal(true);
                              }}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl rounded-tr-sm px-3 py-2 shadow-sm flex-1 mr-2 text-left active:scale-95 transition-transform"
                            >
                              <span className="font-medium text-xs leading-relaxed block">
                                📨 {t('history.messagesReceived', { count: item.messageCount || 0 })}
                              </span>
                              <span className="text-[10px] opacity-70 flex items-center gap-1 mt-1">
                                {t('history.clickToView')}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-600">
                              <span className="text-xs">✕</span>
                              <span className="text-xs font-semibold">{t('history.cancelled')}</span>
                            </div>
                          )
                        ) : (
                          /* ACTIVATION: Logique existante */
                          actualStatus === 'received' && item.smsCode ? (
                          <button
                            onClick={() => {
                              const cleanCode = item.smsCode?.includes('STATUS_OK:') 
                                ? item.smsCode.split(':')[1] 
                                : item.smsCode || '';
                              copyToClipboard(cleanCode);
                            }}
                            className="bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-3 py-2 shadow-sm flex-1 mr-2 text-left active:scale-95 transition-transform"
                          >
                            <span className="font-medium text-xs leading-relaxed block">
                              {(() => {
                                const cleanCode = item.smsCode?.includes('STATUS_OK:') 
                                  ? item.smsCode.split(':')[1] 
                                  : item.smsCode;
                                return item.smsText && !item.smsText.includes('STATUS_OK:') 
                                  ? item.smsText 
                                  : `Code: ${cleanCode}`;
                              })()}
                            </span>
                            <span className="text-[10px] opacity-70 flex items-center gap-1 mt-1">
                              <Copy className="w-3 h-3" /> {t('dashboard.clickToCopy')}
                            </span>
                          </button>
                        ) : actualStatus === 'waiting' ? (
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
                            <span className="text-xs text-muted-foreground">{t('dashboard.waitingForSMS')}</span>
                          </div>
                        ) : actualStatus === 'timeout' ? (
                          <div className="flex items-center gap-1.5 text-orange-600">
                            <span className="text-xs">⏰</span>
                            <span className="text-xs font-semibold">{t('history.timeout')}</span>
                          </div>
                        ) : actualStatus === 'cancelled' ? (
                          <div className="flex items-center gap-1.5 text-red-600">
                            <span className="text-xs">✕</span>
                            <span className="text-xs font-semibold">{t('history.cancelled')}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('dashboard.noSMS')}</span>
                        )
                        )}
                        
                        {/* Timer - only when waiting (activation only) */}
                        {!isRental && actualStatus === 'waiting' && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">{formatTime(timeRemaining)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center gap-3">
                      {/* Logo + Flag (48px zone) */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-12 h-12 border rounded-xl flex items-center justify-center ${
                          isRental ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700' : 'bg-muted border-border'
                        }`}>
                          <img 
                            src={getServiceLogo(item.serviceCode)}
                            alt={item.serviceCode}
                            className="w-6 h-6 object-contain"
                            onError={(e) => handleImageError(e, item.serviceCode)}
                          />
                          <span className="text-lg hidden items-center justify-center">{getServiceIcon(item.serviceCode)}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background overflow-hidden bg-background shadow-sm flex items-center justify-center">
                          <img 
                            src={getCountryFlag(item.countryCode)}
                            alt={item.countryCode}
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e)}
                          />
                          <span className="text-sm hidden items-center justify-center">{getFlagEmoji(item.countryCode)}</span>
                        </div>
                      </div>

                      {/* Service + Country (130px) */}
                      <div className="w-[130px] flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm text-foreground leading-tight truncate">
                            {isRental ? formatRentalLabel(item.serviceCode, item.durationHours, item.countryCode) : getServiceName(item.serviceCode)}
                          </p>
                          {isRental && <Home className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight truncate">{getCountryName(item.countryCode)}</p>
                      </div>

                      {/* Phone number avec fond gris */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-sm font-semibold text-foreground bg-muted px-2 py-1 rounded">
                          {formatPhoneNumber(item.phone)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.phone)}
                          className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                          title="Copier le numéro"
                        >
                          <Copy className="h-4 w-4 text-primary" />
                        </button>
                      </div>

                      {/* Flexible right section */}
                      <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                        {/* Status / SMS - zone flexible avec limite */}
                        <div className="flex-1 min-w-0 max-w-[280px]">
                          {/* Pour RENTAL: Afficher messages ou status */}
                          {isRental ? (
                            actualStatus === 'active' || actualStatus === 'completed' ? (
                              <button
                                onClick={() => {
                                  setSelectedRentalForMessages({
                                    rentalId: item.orderId,
                                    phone: item.phone,
                                    service: item.serviceCode
                                  });
                                  loadRentalMessages(item.orderId);
                                  setShowRentMessagesModal(true);
                                }}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl px-3 py-2 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all w-full text-left"
                              >
                                <span className="font-medium text-xs leading-relaxed block truncate">
                                  📨 {t('history.messagesReceivedShort', { count: item.messageCount || 0, hours: item.durationHours })}
                                </span>
                              </button>
                            ) : actualStatus === 'expired' ? (
                              <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                                <span className="text-sm">⏰</span>
                                <span className="text-xs font-semibold">{t('history.expired')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                                <span className="text-sm">✕</span>
                                <span className="text-xs font-semibold">{t('history.cancelled')}</span>
                              </div>
                            )
                          ) : actualStatus === 'received' && item.smsCode ? (
                            <button
                              onClick={() => {
                                const cleanCode = item.smsCode?.includes('STATUS_OK:') 
                                  ? item.smsCode.split(':')[1] 
                                  : item.smsCode || '';
                                copyToClipboard(cleanCode);
                              }}
                              className="bg-primary text-primary-foreground rounded-xl px-3 py-2 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all w-full text-left"
                            >
                              <span className="font-medium text-xs leading-relaxed block truncate">
                                {(() => {
                                  const cleanCode = item.smsCode?.includes('STATUS_OK:') 
                                    ? item.smsCode.split(':')[1] 
                                    : item.smsCode;
                                  
                                  return item.smsText && !item.smsText.includes('STATUS_OK:') 
                                    ? item.smsText 
                                    : `Code: ${cleanCode}`;
                                })()}
                              </span>
                              <span className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
                                <Copy className="w-2.5 h-2.5" /> {t('history.copy')}
                              </span>
                            </button>
                          ) : actualStatus === 'waiting' || actualStatus === 'pending' ? (
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                              <div className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin flex-shrink-0"></div>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('dashboard.waitingForSMS')}</span>
                            </div>
                          ) : actualStatus === 'timeout' ? (
                            <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                              <span className="text-sm">⏰</span>
                              <span className="text-xs font-semibold">{t('history.timeout')}</span>
                            </div>
                          ) : actualStatus === 'cancelled' || actualStatus === 'refunded' ? (
                            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                              <span className="text-sm">✕</span>
                              <span className="text-xs font-semibold">{t('history.cancelled')}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t('dashboard.noSMS')}</span>
                          )}
                        </div>

                        {/* Timer (only when waiting) - Only for activations */}
                        {!isRental && (actualStatus === 'waiting' || actualStatus === 'pending') && timeRemaining > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg flex-shrink-0">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">{formatTime(timeRemaining)}</span>
                          </div>
                        )}

                        {/* Prix Badge */}
                        <div className={`flex items-center justify-center px-2.5 py-1.5 rounded-full flex-shrink-0 ${
                          isRental ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className="text-xs font-semibold">{Math.floor(item.price)}</span>
                          <span className="text-[10px] ml-0.5">Ⓐ</span>
                        </div>

                        {/* Menu dropdown - Aligné sur le comportement du dashboard (attente SMS) */}
                        {!isRental ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={5} className="w-44">
                              {!hasSms && (actualStatus === 'waiting' || actualStatus === 'pending') && (
                                <DropdownMenuItem
                                  onClick={() => checkActivationStatus(item.id)}
                                  className="cursor-pointer text-sm"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                                  Vérifier SMS
                                </DropdownMenuItem>
                              )}

                              {hasSms && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const cleanCode = item.smsCode?.includes('STATUS_OK:') 
                                      ? item.smsCode.split(':')[1] 
                                      : item.smsCode || '';
                                    copyToClipboard(cleanCode);
                                  }}
                                  className="cursor-pointer text-sm"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copier le code
                                </DropdownMenuItem>
                              )}

                              {!hasSms && (actualStatus === 'waiting' || actualStatus === 'pending') ? (
                                canCancelActivation(item.expiresAt) ? (
                                  <DropdownMenuItem
                                    onClick={() => cancelActivation(item.id, item.orderId)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-sm"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('dashboard.cancel')}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    disabled
                                    className="cursor-not-allowed opacity-50 text-xs"
                                  >
                                    <Clock className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                    <span>{t('history.cancelIn', { minutes: Math.ceil((300 - getTimeElapsedSinceCreation(item.expiresAt)) / 60) })}</span>
                                  </DropdownMenuItem>
                                )
                              ) : null}

                              {(actualStatus === 'cancelled' || actualStatus === 'timeout') && (
                                <DropdownMenuItem disabled className="cursor-not-allowed opacity-60 text-xs">
                                  <X className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{actualStatus === 'cancelled' ? t('history.cancelled') : t('history.timeout')}</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          // Bouton désactivé pour garder l'alignement (même visuel que menu)
                          <button className="p-1.5 rounded-lg opacity-50 cursor-not-allowed flex-shrink-0" disabled>
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalOrdersPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                  disabled={ordersPage === 1}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {[...Array(totalOrdersPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalOrdersPages ||
                    Math.abs(page - ordersPage) <= 1
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setOrdersPage(page)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          page === ordersPage
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === ordersPage - 2 || page === ordersPage + 2) {
                    return <span key={page} className="text-muted-foreground">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setOrdersPage(Math.min(totalOrdersPages, ordersPage + 1))}
                  disabled={ordersPage === totalOrdersPages}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Transactions List */}
            {paymentsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-muted border-t-primary rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
              </div>
            ) : paginatedPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Wallet className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">{t('history.noPayments')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPayments.map((payment) => {
                  // Déterminer l'icône et la couleur selon le type
                  const getTransactionIcon = () => {
                    switch (payment.type) {
                      case 'purchase':
                        return <ShoppingCart className="w-5 h-5 text-blue-600" />;
                      case 'rent':
                      case 'rental':
                        return <Phone className="w-5 h-5 text-purple-600" />;
                      case 'topup':
                      case 'credit':
                        return <ArrowUpCircle className="w-5 h-5 text-green-600" />;
                      case 'refund':
                        return <RefreshCw className="w-5 h-5 text-orange-600" />;
                      case 'bonus':
                        return <Gift className="w-5 h-5 text-yellow-600" />;
                      default:
                        return payment.amount > 0 
                          ? <ArrowUpCircle className="w-5 h-5 text-green-600" />
                          : <ArrowDownCircle className="w-5 h-5 text-red-600" />;
                    }
                  };

                  const getTransactionLabel = () => {
                    if (payment.type === 'rent' || payment.type === 'rental') {
                      return formatRentalLabel(
                        payment.description || payment.metadata?.service_code || 'rent',
                        payment.metadata?.rent_hours || payment.metadata?.duration_hours,
                        payment.metadata?.country_code
                      );
                    }

                    const typeKey = `history.transactionTypes.${payment.type}`;
                    const translated = t(typeKey);
                    // Si la traduction n'existe pas, retourner le type brut formaté
                    if (translated === typeKey) {
                      return payment.type.charAt(0).toUpperCase() + payment.type.slice(1);
                    }
                    return translated;
                  };

                  const getStatusLabel = () => {
                    switch (payment.status) {
                      case 'completed':
                        return t('history.completed');
                      case 'pending':
                        return t('history.pending');
                      case 'refunded':
                        return t('history.refunded');
                      case 'failed':
                        return t('history.failed');
                      default:
                        return payment.status;
                    }
                  };

                  const getStatusColor = () => {
                    switch (payment.status) {
                      case 'completed':
                        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                      case 'pending':
                        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
                      case 'refunded':
                        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                      case 'failed':
                        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                      default:
                        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
                    }
                  };

                  return (
                    <div
                      key={payment.id}
                      className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all"
                    >
                      {/* Layout unifié Mobile + Desktop */}
                      <div className="flex items-start gap-3">
                        {/* Icône */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.amount > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                          {getTransactionIcon()}
                        </div>

                        {/* Contenu principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground">
                                {getTransactionLabel()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {(payment.type === 'rent' || payment.type === 'rental')
                                  ? formatRentalLabel(
                                      payment.description || payment.metadata?.service_code || 'rent',
                                      payment.metadata?.rent_hours || payment.metadata?.duration_hours,
                                      payment.metadata?.country_code
                                    )
                                  : (payment.description || '-')}
                              </p>
                            </div>
                            {/* Montant */}
                            <div className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                              payment.amount > 0
                                ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
                                : 'bg-red-50 text-red-600 dark:bg-red-900/20'
                            }`}>
                              <span>{payment.amount > 0 ? '+' : ''}{Math.floor(payment.amount)}</span>
                              <span className="text-xs">Ⓐ</span>
                            </div>
                          </div>

                          {/* Détails supplémentaires */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {/* Statut */}
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor()}`}>
                              {getStatusLabel()}
                            </span>
                            
                            {/* Date et heure */}
                            <span className="text-xs text-muted-foreground">
                              {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPaymentsPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                  disabled={paymentsPage === 1}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {[...Array(totalPaymentsPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPaymentsPages ||
                    Math.abs(page - paymentsPage) <= 1
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setPaymentsPage(page)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          page === paymentsPage
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === paymentsPage - 2 || page === paymentsPage + 2) {
                    return <span key={page} className="text-muted-foreground">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setPaymentsPage(Math.min(totalPaymentsPages, paymentsPage + 1))}
                  disabled={paymentsPage === totalPaymentsPages}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal pour afficher les messages de Rent - Design Minimaliste */}
      <Dialog open={showRentMessagesModal} onOpenChange={setShowRentMessagesModal}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('history.rentMessages.title')}</h3>
                {selectedRentalForMessages && (
                  <p className="text-sm text-gray-500 font-mono">
                    {formatPhoneNumber(selectedRentalForMessages.phone)}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setShowRentMessagesModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
            {loadingMessages ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-12 h-12 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm text-gray-500">{t('common.loading')}</p>
              </div>
            ) : selectedRentalForMessages && rentMessagesCache[selectedRentalForMessages.rentalId]?.length > 0 ? (
              <div className="space-y-3">
                {rentMessagesCache[selectedRentalForMessages.rentalId].map((msg, index) => {
                  // Extraire le code
                  const text = msg.text || '';
                  const codePatterns = [
                    /[Cc]ode\s*[:\s]?\s*(\d[\d\-\s]{2,7}\d)/,
                    /\b(\d{3}[-\s]?\d{3,4})\b/,
                    /\b(\d{4,8})\b/
                  ];
                  let extractedCode = '';
                  for (const pattern of codePatterns) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                      extractedCode = match[1].replace(/[-\s]/g, '');
                      break;
                    }
                  }
                  
                  return (
                    <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                      {/* Code Section */}
                      {extractedCode && (
                        <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('history.rentMessages.code')}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-3xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">{extractedCode}</span>
                            <button
                              onClick={() => copyToClipboard(extractedCode)}
                              className="w-10 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Message */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{text}</p>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-gray-400">{msg.phoneFrom || 'SMS'}</span>
                        <span className="text-xs text-gray-400">{msg.date || ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <MessageSquare className="h-7 w-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">{t('history.rentMessages.noMessages')}</p>
                <p className="text-sm text-gray-500 text-center">{t('history.rentMessages.noMessagesDesc')}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white dark:bg-gray-900">
            <Button 
              variant="outline" 
              onClick={() => setShowRentMessagesModal(false)}
              className="w-full h-11 rounded-xl"
            >
              {t('history.rentMessages.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
