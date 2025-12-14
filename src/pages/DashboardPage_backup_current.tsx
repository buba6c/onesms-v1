import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSmsPolling } from '@/hooks/useSmsPolling';
import { useRentPolling, type RentMessagesCache } from '@/hooks/useRentPolling';
import { useRealtimeSms } from '@/hooks/useRealtimeSms';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
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
  RefreshCw
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
import { getAllServices, getServicesByCategory, SMS_ACTIVATE_COUNTRIES, type SMSActivateService } from '@/lib/sms-activate-data';

// ============================================================================
// 🎯 PRIORITÉ DES SERVICES - Basé sur l'ordre officiel SMS-Activate
// Source: https://sms-activate.io/rent et https://sms-activate.io/freePrice
// ============================================================================
const SERVICE_PRIORITY: Record<string, number> = {
  // 🔥 TOP SERVICES RENT (ordre SMS-Activate.io/rent)
  'full': 1000,    // Full rent - toujours en premier
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
  // Champs spécifiques aux rentals
  type?: 'activation' | 'rental';
  rentalId?: string;
  durationHours?: number;
  messageCount?: number;
  createdAt?: string; // Pour calculer l'âge du rental
  frozenAmount?: number; // Pour afficher dans le dialog
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
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<'activation' | 'rent'>('activation');
  const [rentDuration, setRentDuration] = useState<'4hours' | '1day' | '1week' | '1month'>('4hours');
  const [currentStep, setCurrentStep] = useState<Step>('service');
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
  
  // State pour le popup de confirmation Finish Rental
  const [showFinishRentalDialog, setShowFinishRentalDialog] = useState(false);
  const [rentalToFinish, setRentalToFinish] = useState<{ rentalId: string; phone: string } | null>(null);
  const [isFinishingRental, setIsFinishingRental] = useState(false);
  
  // State pour le popup de confirmation Cancel Rental
  const [showCancelRentalDialog, setShowCancelRentalDialog] = useState(false);
  const [rentalToCancel, setRentalToCancel] = useState<{ rentalId: string; phone: string; createdAt: string; frozenAmount?: number } | null>(null);
  const [isCancellingRental, setIsCancellingRental] = useState(false);
  
  // Timer state to force re-render every second for real-time countdown
  const [, setTimerTick] = useState(0);
  
  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Utility function to calculate minutes elapsed since rental creation
  const calculateMinutesElapsed = (createdAt: string): number => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  // 💰 Detect payment success from URL params (after MoneyFusion redirect)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      // Show success toast
      toast({
        title: '✅ Paiement réussi !',
        description: 'Votre solde a été crédité. Merci pour votre achat !',
        duration: 5000,
      });
      
      // Refresh user balance
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      
      // Remove the payment param from URL to avoid showing toast on refresh
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      toast({
        title: '❌ Paiement échoué',
        description: 'Le paiement a été annulé ou a échoué. Veuillez réessayer.',
        variant: 'destructive',
        duration: 5000,
      });
      
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  // 🔄 Subscribe to balance updates (realtime) to reflect topups instantly
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-balance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Fetch services - OPTIMISÉ: Lecture directe depuis DB avec total_available mis à jour par Cron
  // 🔄 En mode RENT, on charge les services depuis l'API getRentServicesAndCountries
  const { data: services = [], isLoading: loadingServices } = useQuery<Service[]>({
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
          
          // Appeler l'API pour obtenir les services rent avec quantités agrégées
          const { data: rentData, error } = await supabase.functions.invoke('get-rent-services', {
            body: { rentTime, getServices: true }
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
          
          // rentData.services contient maintenant les quantités agrégées depuis plusieurs pays
          // { serviceCode: { cost, quant: { current, total }, ... } }
          const rentServices = rentData?.services || {};
          const servicesList = Object.entries(rentServices)
            .filter(([code]) => code !== 'full') // Exclure "full" car il y a déjà le bouton Full Rent
            .map(([code, data]: [string, any]) => ({
              code,
              quantity: data.quant?.current || data.quant?.total || 0
            }));
          
          // Services loaded for rent
          // console.log(`✅ [RENT SERVICES] ${servicesList.length} services disponibles`);
          
          // Mapper vers le format Service avec quantités réelles
          const mappedServices = servicesList.map(({ code, quantity }) => {
            return {
              id: code,
              name: serviceNamesMap.get(code) || code,
              code: code,
              icon: code,
              count: quantity, // Quantité agrégée réelle depuis les pays populaires
              _priority: getServicePriority(code)
            };
          })
          .sort((a, b) => {
            if (a._priority !== b._priority) return b._priority - a._priority;
            return b.count - a.count;
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
        .gt('total_available', 0) // Seulement services disponibles
        .order('popularity_score', { ascending: false })
        .order('total_available', { ascending: false })
        .range(0, 9999) as { data: DBService[] | null; error: any }; // Range permet de dépasser la limite PostgREST par défaut
      
      if (error) {
        console.error('❌ [SERVICES] Erreur DB:', error);
        toast({
          title: 'Erreur de chargement',
          description: 'Impossible de charger les services. Réessayez.',
          variant: 'destructive'
        });
        return [];
      }
      
      if (!dbServices || dbServices.length === 0) {
        console.warn('⚠️ [SERVICES] Aucun service disponible');        
        // Fallback: utiliser get-services-counts si DB est vide
        console.error('⚠️ [SERVICES] Fallback vers API Edge function...');
        const { data: fallbackData } = await supabase.functions.invoke('get-services-counts', {
          body: { countries: [187, 4, 6] }
        });
        
        const staticServices = selectedCategory === 'all' 
          ? getAllServices() 
          : getServicesByCategory(selectedCategory as any);
        
        const counts = fallbackData?.counts || {};
        
        // 🎯 Appliquer le même tri intelligent au fallback
        return staticServices
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
      const filtered = selectedCategory === 'all' 
        ? dbServices 
        : dbServices.filter(s => s.category === selectedCategory);
      
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
    staleTime: 30000 // Cache 30 secondes (DB mise à jour par Cron toutes les 5 min)
  });

  // Charger les activations en cours depuis la DB
  const { 
    data: dbActivations = [], 
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
        return [];
      }

      // console.log('✅ [LOAD] Activations brutes:', data?.length || 0);
      
      // FILTRE SUPPLÉMENTAIRE: Éliminer les numéros expirés côté client immédiatement
      const nowTime = Date.now();
      const filteredData = (data || []).filter((act: DBActivation) => {
        const expiresAtTime = new Date(act.expires_at).getTime();
        const isExpired = expiresAtTime < nowTime;
        const hasCode = !!act.sms_code;
        
        // Garder seulement si: pas expiré OU a reçu un SMS
        if (isExpired && !hasCode) {
          return false;
        }
        return true;
      }) || [];
      
      // console.log('✅ [LOAD] Activations filtrées:', filteredData.length);

      // Mapper les activations DB vers le format ActiveNumber
      return filteredData.map(act => {
        const expiresAt = new Date(act.expires_at).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

        return {
          id: act.id,
          orderId: act.order_id,
          activationId: act.id,
          phone: act.phone,
          service: act.service_code,
          country: act.country_code,
          timeRemaining,
          expiresAt: act.expires_at, // Garder le timestamp pour recalcul dynamique
          status: act.sms_code ? 'received' : (timeRemaining > 0 ? 'waiting' : 'timeout'),
          smsCode: act.sms_code || undefined,
          smsText: act.sms_text || undefined,
          price: act.price,
          charged: act.charged || false,
          createdAt: act.created_at || '',
          frozenAmount: act.frozen_amount || 0
        } as ActiveNumber;
      });
    },
    enabled: !!user?.id,
    staleTime: 0, // Pas de cache pour éviter le flash des données périmées
    gcTime: 0, // Supprimer le cache immédiatement après unmount
    refetchOnMount: 'always', // Toujours refetch au mount
    // Polling désactivé - les mises à jour arrivent via WebSocket (useRealtimeSms)
    // Le polling manuel est déclenché par useRentPolling pour les rentals
    refetchInterval: false
  });

  // Charger les rentals actifs depuis la DB
  const { 
    data: dbRentals = [], 
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
        return [];
      }

      // console.log('✅ [LOAD] Rentals chargés:', data?.length || 0);

      // Mapper les rentals DB vers le format ActiveNumber
      return (data || []).map((rent: DBRental) => {
        // Support both column naming conventions
        // order_id is the SMS-Activate rental ID
        const expiresAt = new Date(rent.expires_at || rent.end_date || '').getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        
        // order_id = SMS-Activate rental ID (number)
        const smsActivateRentId = rent.order_id || rent.rental_id || rent.rent_id;

        return {
          id: rent.id,
          orderId: String(smsActivateRentId),
          activationId: rent.id,
          rentalId: String(smsActivateRentId), // SMS-Activate rent ID for polling
          phone: rent.phone,
          service: rent.service_code,
          country: rent.country_code,
          timeRemaining,
          expiresAt: rent.expires_at || rent.end_date || '',
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
    refetchInterval: false
  });

  // Synchroniser activeNumbers avec la DB (fusionner activations + rentals)
  // Auto-masquer les numéros qui ont reçu un SMS après 20 secondes
  const [hiddenNumbers, setHiddenNumbers] = useState<Set<string>>(new Set());
  const [smsReceivedTimestamps, setSmsReceivedTimestamps] = useState<Map<string, number>>(new Map());
  
  // Flag pour savoir si le chargement initial est terminé
  // isPending = true seulement au TOUT PREMIER fetch (pas de données en cache)
  // isFetching = true pendant tout fetch (initial ou refetch)
  const isInitialLoading = pendingActivations || pendingRentals || fetchingActivations || fetchingRentals;
  
  // Track si on a déjà fait le premier chargement réussi
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  useEffect(() => {
    // Marquer comme chargé une fois que le premier fetch est terminé
    if (!pendingActivations && !pendingRentals && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [pendingActivations, pendingRentals, hasInitiallyLoaded]);

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
      }
    });

    // Filtrer les numéros masqués ET les numéros expirés/timeout
    const now = Date.now();
    const SMS_DISPLAY_GRACE_PERIOD = 2 * 60 * 1000; // 2 minutes après expiration pour voir le SMS
    
    const visibleNumbers = combined.filter(num => {
      // Si masqué manuellement, ne pas afficher
      if (hiddenNumbers.has(num.id)) return false;
      
      // RENTALS: Toujours afficher les rentals actifs (pas de smsCode, juste messageCount)
      if (num.type === 'rental') {
        // Si le rental est encore actif (temps restant > 0), l'afficher
        if (num.timeRemaining > 0) return true;
        // Si expiré mais a des messages, afficher pendant grace period
        if (num.expiresAt) {
          const expiresAtTime = new Date(num.expiresAt).getTime();
          const timeSinceExpiry = now - expiresAtTime;
          // Afficher pendant 10 minutes après expiration pour les rentals
          if (timeSinceExpiry < 10 * 60 * 1000) return true;
        }
        return false;
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
        
        // ✅ Mapping SMS-Activate ID → Nom du pays (pour matcher la colonne 'name' de la DB)
        const SMS_ACTIVATE_ID_TO_NAME: Record<number, string> = {
          0: 'Russia', 1: 'Ukraine', 2: 'Kazakhstan', 3: 'China', 4: 'Philippines',
          5: 'Myanmar', 6: 'Indonesia', 7: 'Malaysia', 8: 'Kenya', 9: 'Tanzania',
          10: 'Vietnam', 11: 'Kyrgyzstan', 12: 'England', 13: 'Israel', 14: 'Hong Kong',
          15: 'Poland', 16: 'Egypt', 17: 'Nigeria', 18: 'Macau', 19: 'Morocco',
          20: 'Ghana', 21: 'Argentina', 22: 'India', 23: 'Uzbekistan', 24: 'Cambodia',
          25: 'Cameroon', 26: 'Chad', 27: 'Germany', 28: 'Lithuania', 29: 'Croatia',
          30: 'Sweden', 31: 'Iraq', 32: 'Romania', 33: 'Colombia', 34: 'Austria',
          35: 'Belarus', 36: 'Canada', 37: 'Saudi Arabia', 38: 'Mexico', 39: 'South Africa',
          40: 'Spain', 41: 'Iran', 42: 'Algeria', 43: 'Netherlands', 44: 'Bangladesh',
          45: 'Brazil', 46: 'Turkey', 47: 'Japan', 48: 'South Korea', 49: 'Taiwan',
          50: 'Singapore', 51: 'UAE', 52: 'Thailand', 53: 'Pakistan', 54: 'Nepal',
          55: 'Sri Lanka', 56: 'Portugal', 57: 'New Zealand', 58: 'Italy', 59: 'Belgium',
          60: 'Switzerland', 61: 'Greece', 62: 'Czech Republic', 63: 'Hungary', 64: 'Denmark',
          65: 'Norway', 66: 'Finland', 67: 'Ireland', 68: 'Slovakia', 69: 'Bulgaria',
          70: 'Serbia', 71: 'Slovenia', 72: 'North Macedonia', 73: 'Peru', 74: 'Chile',
          75: 'Ecuador', 76: 'Venezuela', 77: 'Bolivia', 78: 'France', 79: 'Paraguay',
          80: 'Uruguay', 81: 'Costa Rica', 82: 'Panama', 83: 'Dominican Republic', 84: 'El Salvador',
          85: 'Guatemala', 86: 'Honduras', 87: 'Nicaragua', 88: 'Cuba', 89: 'Haiti',
          90: 'Jamaica', 91: 'Trinidad and Tobago', 92: 'Puerto Rico', 93: 'Barbados', 94: 'Bahamas',
          108: 'Afghanistan', 117: 'Laos', 129: 'Sudan', 141: 'Jordan', 163: 'Palestine',
          165: 'Bahrain', 172: 'Ethiopia', 175: 'Australia', 187: 'USA', 196: 'Senegal'
        };
        
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
        const { data: rentData, error } = await supabase.functions.invoke('get-rent-services', {
          body: { 
            rentTime, 
            getCountries: true,
            serviceCode: serviceCode // ✅ Retourne tous les pays avec quantités pour ce service
          }
        });
        
        if (error) {
          throw error;
        }
        
        // L'API retourne maintenant countries: [{ id, code, name, available, quantity, cost }]
        // Tous les pays sont inclus, avec quantity=0 si pas de stock
        const countriesArray = rentData?.countries || [];
        
        // 💰 Marge déjà appliquée côté serveur (get-rent-services calcule sellingPrice)
        // Utiliser la marge par défaut si le prix n'est pas fourni par l'API
        const DEFAULT_MARGIN = 30;
        
        // Convertir directement les données de l'API en format Country
        const availableCountries: Country[] = countriesArray.map((c: any) => {
          // Si l'API fournit déjà le prix avec marge, l'utiliser directement
          // Sinon, calculer: cost (USD) → FCFA → Coins + marge
          let sellingPrice = 0;
          if (c.cost && c.cost > 0) {
            const costUSD = c.cost;
            const priceFCFA = costUSD * 600; // USD_TO_FCFA
            const priceCoins = priceFCFA / 100; // FCFA_TO_COINS
            sellingPrice = Math.ceil(priceCoins * (1 + DEFAULT_MARGIN / 100));
          }
          
          return {
            id: `rent-${c.id}`,
            name: c.name,
            code: c.code,
            flag: getFlagEmoji(c.code) || '🌍',
            successRate: 85,
            count: c.quantity || 0,
            price: sellingPrice,
            compositeScore: (c.quantity || 0) * 85 / 100,
            rank: c.id,
            share: 0,
            _smsActivateId: c.id,
            _service: serviceCode
          } as Country;
        });
        
        // Tri: pays avec stock en premier (par quantité décroissante), puis les autres
        availableCountries.sort((a, b) => {
          if ((a.count || 0) > 0 && (b.count || 0) === 0) return -1;
          if ((a.count || 0) === 0 && (b.count || 0) > 0) return 1;
          if ((a.count || 0) > 0 && (b.count || 0) > 0) return (b.count || 0) - (a.count || 0);
          return a.name.localeCompare(b.name);
        });
        
        return availableCountries;
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
      
      // 3️⃣ Appeler Edge Function pour obtenir les pays triés intelligemment
      // ✅ Utilise getTopCountriesByServiceRank de SMS-Activate (tri par performance + popularité)
      
      try {
        const { data: availabilityData, error } = await supabase.functions.invoke('get-top-countries-by-service', {
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
        
        // 4️⃣ Mapper vers le format Country avec tri intelligent SMS-Activate
        const mapped = countries
          .filter((c: any) => c.count > 0 && c.price > 0) // ✅ Filtrer pays avec stock ET prix valide
          .map((c: any) => {
            // Utiliser directement le prix SMS-Activate (plus fiable et toujours à jour)
            const finalPrice = c.price;
            
            // ✅ Success rate : Utiliser notre DB si disponible, sinon ne pas afficher
            const ourSuccessRate = successRateMap.get(c.countryCode.toLowerCase());
            const smsActivateSuccessRate = c.successRate; // Peut être null
            
            // Priorité: Notre DB > SMS-Activate > null (pas de badge si pas de données)
            const finalSuccessRate = ourSuccessRate || smsActivateSuccessRate || null;
            
            return {
              id: c.countryId.toString(),
              name: c.countryName,
              code: c.countryCode,
              flag: getFlagEmoji(c.countryCode),
              successRate: finalSuccessRate ? Number(finalSuccessRate.toFixed(1)) : null,
              count: c.count, // ✅ Nombre de numéros disponibles chez SMS-Activate
              price: Number(finalPrice.toFixed(2)), // Prix en pièces (Ⓐ)
              compositeScore: c.compositeScore, // Score de tri intelligent
              rank: c.rank, // Position dans le classement SMS-Activate
              share: c.share // Part de marché
            };
          });
        
        return mapped;
      } catch (error) {
        // Fallback: récupérer prix en temps réel via get-real-time-prices
        try {
          
          const { data: pricesData, error: pricesError } = await supabase.functions.invoke('get-real-time-prices', {
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
          
          return pricesData.data.map((p: any) => {
            const countryInfo = countryInfoMap.get(p.countryCode.toLowerCase());
            return {
              id: p.countryCode,
              name: countryInfo?.name || p.countryCode,
              code: p.countryCode,
              flag: getFlagEmoji(p.countryCode),
              successRate: countryInfo?.success_rate || null,
              count: p.count,
              price: p.priceCoins,
              compositeScore: null,
              rank: null,
              share: null
            };
          }).filter((c: any) => c.count > 0 && c.price > 0);
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

  // Timer for active numbers - Recalculer timeRemaining à chaque seconde
  // SANS modifier le state, juste forcer un re-render
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling automatique pour vérifier les SMS reçus (backup)
  useSmsPolling({
    activeNumbers,
    userId: user?.id,
    onUpdate: (updatedNumber) => {
      // Ne pas modifier le state local, juste recharger depuis la DB
      // Le useEffect va automatiquement synchroniser avec les données fraîches
      refetchActivations();
    },
    onBalanceUpdate: () => {
      // Balance refresh handled silently
    }
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

    try {
      const isRent = mode === 'rent';
      
      // ✅ Pour RENT: le prix affiché est DÉJÀ le prix total pour la durée choisie
      // (récupéré depuis l'API avec le bon rentTime)
      // Pour ACTIVATION: prix simple
      const finalPrice = selectedCountry.price;

      // Purchase started - service: selectedService.code, country: selectedCountry.code

      // Vérifier le solde
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', user.id)
        .single() as { data: { balance: number } | null; error: any };

      if (!userData || userData.balance < finalPrice) {
        // Afficher le popup de solde insuffisant
        const missing = finalPrice - (userData?.balance ?? 0);
        setInsufficientBalanceData({
          needed: finalPrice,
          available: userData?.balance ?? 0,
          missing: Math.ceil(missing) // Arrondir à l'entier supérieur
        });
        setShowInsufficientBalanceDialog(true);
        return;
      }

      // SMS-Activate gère automatiquement la sélection d'opérateur
      // Auto-selecting best operator via SMS-Activate
      
      // Préparer le body selon le mode
      // ✅ Envoyer le prix affiché au frontend pour garantir la cohérence
      const requestBody = {
        country: selectedCountry.code,
        operator: 'any', // SMS-Activate choisit automatiquement le meilleur
        product: (selectedCountry as any)._service || selectedService.code || selectedService.name.toLowerCase(),
        userId: user.id,
        expectedPrice: finalPrice, // Prix affiché au frontend, à utiliser dans la DB
        ...(isRent && { duration: rentDuration })
      };
      
      const functionName = isRent ? 'buy-sms-activate-rent' : 'buy-sms-activate-number';
      
      const { data: buyData, error: buyError } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (buyError || !buyData?.success) {
        // Try to get error message from response
        if (buyError && 'context' in buyError) {
          const context = (buyError as any).context;
          
          // Read response body for error message
          if (context && typeof context.text === 'function') {
            try {
              const errorText = await context.text();
              const errorJson = JSON.parse(errorText);
              throw new Error(errorJson.error || errorJson.message || 'Achat échoué');
            } catch (e) {
              // Failed to parse, will use default message
            }
          }
        }
        
        throw new Error(buyData?.error || buyData?.details || buyError?.message || 'Achat échoué');
      }

      // Number purchased successfully

      // Recharger les activations depuis la DB
      refetchActivations();
      
      if (!isRent) {
        // Pour activation: Vérifier IMMÉDIATEMENT si le SMS est déjà arrivé
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('check-sms-activate-status', {
              body: {
                activationId: buyData.data.activation_id,
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
        title: isRent ? 'Numéro loué !' : 'Numéro activé !',
        description: isRent 
          ? `${buyData.data.phone} - Disponible pour ${rentDuration}`
          : `${buyData.data.phone} - En attente du SMS...`,
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
        title: mode === 'rent' ? 'Location échouée' : 'Activation échouée',
        description: error.message || 'Erreur inconnue',
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
    const allServices = getAllServices();
    const found = allServices.find(s => s.code.toLowerCase() === code.toLowerCase());
    return found?.name || code.toUpperCase();
  };

  const cancelActivation = async (activationId: string, orderId: string) => {
    try {
      // Cancel via Edge Function - orderId is SMS-Activate ID, activationId is Supabase UUID
      const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
        body: { 
          orderId: orderId,
          activationId: activationId,
          userId: user?.id 
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'SMS-Activate cancellation failed');
      }

      // Refresh queries (Edge a déjà mis à jour la DB)
      await queryClient.invalidateQueries({ queryKey: ['active-numbers'] });
      await queryClient.invalidateQueries({ queryKey: ['orders-history'] });

      toast({
        title: 'Activation annulée',
        description: 'Le numéro a été annulé avec succès',
      });

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'annuler l\'activation',
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

  // Autoriser l'annulation immédiate : plus de garde de 5 minutes (retour user)
  const canCancelActivation = (_expiresAt: string): boolean => {
    return true;
  };

  // État pour le panneau mobile
  const [mobileOrderPanelOpen, setMobileOrderPanelOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Mobile: Bouton flottant pour ouvrir le panneau de commande */}
      <button
        onClick={() => setMobileOrderPanelOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center text-white hover:scale-110 transition-transform"
      >
        <Phone className="w-7 h-7" />
      </button>

      {/* Mobile: Overlay pour fermer */}
      {mobileOrderPanelOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOrderPanelOpen(false)}
        />
      )}

      {/* Sidebar - Order Number */}
      <aside className={`
        ${mobileOrderPanelOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto
        w-full lg:w-[400px] 
        bg-white/95 backdrop-blur-xl 
        border-t lg:border-t-0 lg:border-r border-gray-200/50 
        overflow-y-auto shadow-xl shadow-gray-200/50 
        max-h-[85vh] lg:max-h-none
        z-50 lg:z-auto
        transition-transform duration-300 ease-out
        rounded-t-3xl lg:rounded-none
      `}>
        {/* Mobile: Handle bar */}
        <div className="lg:hidden flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" onClick={() => setMobileOrderPanelOpen(false)}></div>
        </div>
        
        <div className="p-4 lg:p-6 pt-0 lg:pt-6">
          {/* Header */}
          <div className="mb-4 lg:mb-6">
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">{t('dashboard.orderNumber')}</h1>
            <p className="text-xs text-gray-500">{t('dashboard.selectService')}</p>
          </div>

          {/* Mode Toggle - Modernisé */}
          <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1.5 mb-4 lg:mb-5 shadow-inner">
            <button
              onClick={() => setMode('activation')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                mode === 'activation'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              {t('common.activation')}
            </button>
            <button
              onClick={() => setMode('rent')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                mode === 'rent'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              {t('common.rent')}
            </button>
          </div>

          {/* STEP 1: Service Selection */}
          {currentStep === 'service' && (
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
                <div className="mb-5">
                  <p className="text-[10px] text-purple-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <span className="w-5 h-0.5 bg-purple-400 rounded-full"></span>
                    {t('dashboard.universalService')}
                  </p>
                  <div className="space-y-2 mb-4">
                    {/* Full rent - Universal service */}
                    <div
                      onClick={() => handleServiceSelect({ id: 'full', name: 'Full rent', code: 'full', count: 597, icon: 'home' })}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100 transition-all duration-300 group"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                        <Home className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base text-gray-900">Full rent</p>
                        <p className="text-xs text-purple-600">{t('dashboard.receiveFromAny')}</p>
                      </div>
                      <div className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
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

              <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="group bg-white border-2 border-gray-100 rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:border-blue-200 transition-all">
                      <img 
                        src={getServiceLogo(service.code || service.name)} 
                        alt={service.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => handleLogoError(e, service.code || service.name)}
                      />
                      <span className="text-xl hidden items-center justify-center">{getServiceIcon(service.code || service.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">{service.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        {service.count >= 0 ? `${service.count.toLocaleString()} ${t('dashboard.numbersAvailable')}` : t('dashboard.available')}
                      </p>
                    </div>
                    <div className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                      →
                    </div>
                  </div>
                ))}
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
                      <div className="flex items-center justify-between mb-3 text-[11px] text-gray-500 px-2 font-medium">
                        <span>{t('dashboard.countrySuccessRate')}</span>
                        <span>{t('dashboard.price')}</span>
                      </div>

                      {filteredCountries.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🌍</span>
                          </div>
                          <p className="text-sm text-gray-500">{t('dashboard.noCountryAvailable')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[calc(100vh-500px)] overflow-y-auto pr-1">
                          {filteredCountries.map((country) => {
                            const hasStock = (country.count || 0) > 0;
                            return (
                      <div
                        key={country.id}
                        onClick={() => hasStock && handleCountrySelect(country)}
                        className={`group bg-white border-2 rounded-xl p-3.5 flex items-center justify-between transition-all duration-300 ${
                          hasStock 
                            ? 'border-gray-100 cursor-pointer hover:border-green-400 hover:shadow-lg hover:shadow-green-100/50 hover:scale-[1.01]' 
                            : 'border-gray-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-9 rounded-lg border border-gray-200 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                            <img 
                              src={getCountryFlag(country.name)} 
                              alt={country.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const emoji = target.nextElementSibling as HTMLSpanElement
                                if (emoji) emoji.style.display = 'flex'
                              }}
                            />
                            <span className="text-2xl hidden items-center justify-center">{getFlagEmoji(country.name)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm truncate transition-colors ${hasStock ? 'text-gray-900 group-hover:text-green-600' : 'text-gray-400'}`}>{country.name}</p>
                            <p className={`text-xs flex items-center gap-1 ${hasStock ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                              {hasStock 
                                ? `${country.count.toLocaleString()} ${t('dashboard.numbersAvailable')}`
                                : t('dashboard.noStock')}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-base flex-shrink-0 shadow-lg transition-shadow ${
                          hasStock 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40' 
                            : 'bg-gray-200 text-gray-400 shadow-none'
                        }`}>
                          <span>{Math.floor(country.price || 0)}</span>
                          <span className="text-xs opacity-80">Ⓐ</span>
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
                          { value: '4hours' as const, label: '4 Hours', icon: '⏰', price: selectedCountry.price * 1 },
                          { value: '1day' as const, label: '1 Day', icon: '🌅', price: selectedCountry.price * 3 },
                          { value: '1week' as const, label: '1 Week', icon: '📅', price: selectedCountry.price * 15 },
                          { value: '1month' as const, label: '1 Month', icon: '🗓️', price: selectedCountry.price * 50 }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => setRentDuration(option.value)}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                              rentDuration === option.value
                                ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100 scale-[1.02]'
                                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                            }`}
                          >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <div className="text-sm font-bold text-gray-900">{option.label}</div>
                            <div className={`text-lg font-black ${
                              rentDuration === option.value ? 'text-purple-600' : 'text-blue-600'
                            }`}>{Math.ceil(option.price)} Ⓐ</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bouton Activate/Rent modernisé */}
                  <Button 
                    onClick={handleActivate}
                    className={`w-full h-16 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6 shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                      mode === 'rent' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30'
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
        </div>
      </aside>

      {/* Main Content - Active Numbers */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30">
        <div className="p-4 lg:p-8">
          {/* Header avec titre et compteur - Seulement si des numéros actifs */}
          {activeNumbers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{t('dashboard.activeNumbers')}</h2>
                <p className="text-sm text-gray-500">{t('dashboard.manageNumbers')}</p>
              </div>
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {activeNumbers.length} {t('dashboard.active')}
              </div>
            </div>
          )}

          {activeNumbers.length === 0 ? (
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
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature1')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature2')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.activationFeature3')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
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
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.rentFeature1')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="text-sm text-gray-700">{t('dashboard.emptyState.rentFeature2')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
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
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex flex-col items-start relative">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{t('dashboard.emptyState.step2Title')}</h4>
                    <p className="text-sm text-gray-500">{t('dashboard.emptyState.step2Desc')}</p>
                    <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
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
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.wideChoice')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.wideChoiceDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-4 lg:p-5 border border-green-100">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.bigVolumes')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.bigVolumesDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 lg:p-5 border border-amber-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.affordablePrice')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.affordablePriceDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-4 lg:p-5 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.suitableTasks')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.suitableTasksDesc')}</p>
                </div>
              </div>

              {/* Features Grid - Rent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-2xl p-4 lg:p-5 border border-pink-100">
                  <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.accountInsurance')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.accountInsuranceDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 lg:p-5 border border-indigo-100">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.flexibleSettings')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.flexibleSettingsDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-2xl p-4 lg:p-5 border border-cyan-100">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{t('dashboard.emptyState.reliableSuppliers')}</h4>
                  <p className="text-xs text-gray-500">{t('dashboard.emptyState.reliableSuppliersDesc')}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-2xl p-4 lg:p-5 border border-rose-100">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
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
            <div className="space-y-3 lg:space-y-4">
              {activeNumbers.map((num) => (
                <div key={num.id} className="group bg-white border-2 border-gray-100 rounded-2xl px-4 lg:px-6 py-4 lg:py-5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    {/* Row 1: Logo + Service + Phone */}
                    <div className="flex items-center gap-3 sm:gap-5">
                      {/* Logo + Flag */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:border-blue-200 transition-all">
                          <img 
                            src={getServiceLogo(num.service.toLowerCase())}
                            alt={num.service}
                            className="w-6 h-6 lg:w-8 lg:h-8 object-contain"
                            onError={(e) => handleLogoError(e, num.service.toLowerCase())}
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 lg:-bottom-1.5 lg:-right-1.5 w-6 h-6 lg:w-7 lg:h-7 rounded-full border-2 lg:border-[3px] border-white overflow-hidden bg-white shadow-lg flex items-center justify-center">
                          <img 
                            src={getCountryFlag(num.country)}
                            alt={num.country}
                            className="w-full h-full object-cover"
                            onError={(e) => handleFlagError(e)}
                          />
                          <span className="text-xs hidden items-center justify-center">{getFlagEmoji(num.country)}</span>
                        </div>
                      </div>

                      {/* Service + Country + Phone - Responsive layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className="min-w-0 sm:min-w-[100px]">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-gray-900 leading-tight truncate">{getServiceName(num.service)}</p>
                            {num.type === 'rental' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                                RENT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 leading-tight flex items-center gap-1">
                            <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                            {num.country}
                          </p>
                        </div>
                        {/* Phone Number */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200">
                            {formatPhoneNumber(num.phone)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(num.phone, 'phone')}
                            className="p-1.5 sm:p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 group/btn"
                            title={t('dashboard.copyNumber')}
                          >
                            <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Flexible right section */}
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 flex-1 justify-start lg:justify-end w-full lg:w-auto mt-3 lg:mt-0">
                      {/* Pour RENTAL: afficher le dernier message ou le compteur */}
                      {num.type === 'rental' ? (
                        (() => {
                          const messages = rentMessagesCache[num.rentalId || ''] || [];
                          const lastMessage = messages[0]; // Le plus récent
                          const messageCount = messages.length || num.messageCount || 0;
                          
                          if (lastMessage) {
                            // Afficher le dernier message (comme le code SMS pour activations)
                            // Décoder les entités HTML (&amp;#10; -> \n, etc.)
                            const decodeHtml = (text: string) => {
                              return text
                                .replace(/&#10;/g, ' ')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&quot;/g, '"');
                            };
                            const cleanText = decodeHtml(lastMessage.text);
                            // Tronquer si trop long
                            const displayText = cleanText.length > 80 
                              ? cleanText.substring(0, 77) + '...' 
                              : cleanText;
                            
                            return (
                              <div 
                                onClick={() => {
                                  setSelectedRentalForMessages({
                                    rentalId: num.rentalId || '',
                                    phone: num.phone,
                                    service: num.service
                                  });
                                  setShowRentMessagesModal(true);
                                }}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-md px-3 lg:px-4 py-2 lg:py-2.5 shadow-lg shadow-purple-500/30 max-w-full lg:max-w-md cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-all flex-1 lg:flex-initial"
                                title="Cliquer pour voir tous les messages"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm leading-relaxed flex-1">
                                    {displayText}
                                  </span>
                                  {messageCount > 1 && (
                                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                      +{messageCount - 1}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            // Pas de messages - afficher le compteur avec spinner ou 0
                            return (
                              <div 
                                onClick={() => {
                                  setSelectedRentalForMessages({
                                    rentalId: num.rentalId || '',
                                    phone: num.phone,
                                    service: num.service
                                  });
                                  setShowRentMessagesModal(true);
                                }}
                                className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl px-3 lg:px-4 py-2 lg:py-2.5 cursor-pointer hover:border-purple-300 transition-all"
                              >
                                <div className="flex items-center gap-2 lg:gap-3">
                                  {messageCount > 0 ? (
                                    <span className="text-xs lg:text-sm text-purple-700 font-bold">
                                      📨 {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <div className="w-4 h-4 border-[2px] border-purple-200 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-4 h-4 border-[2px] border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                      <span className="text-xs text-purple-600 font-medium">En attente de SMS...</span>
                                    </div>
                                  )}
                                  {num.durationHours && (
                                    <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                                      {num.durationHours}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <>
                          {/* Code bleu OU Waiting spinner (pour activation) */}
                          {num.smsCode ? (
                            <div 
                              onClick={() => {
                                const cleanCode = num.smsCode?.includes('STATUS_OK:') 
                                  ? num.smsCode.split(':')[1] 
                                  : num.smsCode || '';
                                copyToClipboard(cleanCode, 'code');
                              }}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-md px-3 lg:px-4 py-2 lg:py-2.5 shadow-lg shadow-blue-500/30 max-w-full lg:max-w-md cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex-1 lg:flex-initial"
                              title={t('dashboard.clickToCopy')}
                            >
                              <span className="font-medium text-sm leading-relaxed">
                                {(() => {
                                  // Extraire le code SMS si le format est STATUS_OK:code
                                  const cleanCode = num.smsCode.includes('STATUS_OK:') 
                                    ? num.smsCode.split(':')[1] 
                                    : num.smsCode;
                                  
                                  // Récupérer le nom du service avec helper
                                  const serviceName = getServiceName(num.service);
                                  
                                  return num.smsText && !num.smsText.includes('STATUS_OK:') 
                                    ? num.smsText 
                                    : `${t('dashboard.validationCode')} ${serviceName}: ${cleanCode}`;
                                })()}
                              </span>
                            </div>
                          ) : (num.status === 'waiting' || num.status === 'pending') ? (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                              <div className="relative">
                                <div className="w-4 h-4 border-[2px] border-amber-200 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-4 h-4 border-[2px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <span className="text-xs text-amber-700 font-medium">{t('dashboard.waitingForSMS')}</span>
                            </div>
                          ) : num.status === 'timeout' ? (
                            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-sm font-medium">
                              ⏰ {t('dashboard.noSMS')}
                            </div>
                          ) : null}
                        </>
                      )}

                      {/* Badge Prix */}
                      <div className="flex items-center justify-center min-w-[40px] lg:min-w-[45px] h-[36px] lg:h-[40px] bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 text-gray-700 rounded-lg flex-shrink-0">
                        <span className="text-xs lg:text-sm font-bold">{num.price > 0 ? (num.price < 1 ? num.price.toFixed(2) : Math.floor(num.price)) : 0}</span>
                        <span className="text-xs ml-0.5 opacity-70">Ⓐ</span>
                      </div>

                      {/* Timer */}
                      {(num.status === 'waiting' || num.status === 'pending' || num.status === 'active') && (
                        <div className="flex items-center gap-1.5 lg:gap-2 bg-blue-50 border border-blue-200 px-2 lg:px-3 py-1.5 lg:py-2 rounded-xl flex-shrink-0">
                          <Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-blue-500" />
                          <div className="text-xs lg:text-sm">
                            <span className="text-blue-600 font-bold">
                              {num.type === 'rental' && num.durationHours && num.durationHours >= 24
                                ? `${Math.floor(getRealTimeRemaining(num.expiresAt) / 3600)}h`
                                : `${Math.floor(getRealTimeRemaining(num.expiresAt) / 60)} min`
                              }
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Menu dropdown - Show actions based on type and status */}
                      {num.type === 'rental' ? (
                        /* Menu pour RENTAL */
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 lg:p-2.5 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0 group/menu">
                              <MoreVertical className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400 group-hover/menu:text-gray-600 transition-colors" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 lg:w-56 rounded-xl border-2 border-gray-100 shadow-xl">
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('get-rent-status', {
                                    body: { rentId: num.rentalId, userId: user?.id }
                                  });
                                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                                  const messages = data.messages || [];
                                  toast({ 
                                    title: `${messages.length} message(s)`, 
                                    description: messages.length > 0 ? messages[0].text : 'No messages yet' 
                                  });
                                  refetchRentals();
                                } catch (e: any) {
                                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="cursor-pointer rounded-lg"
                            >
                              <span className="text-blue-600 font-medium">📨 Refresh messages</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('continue-sms-activate-rent', {
                                    body: { rentalId: num.id, userId: user?.id }
                                  });
                                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                                  toast({ title: 'Location prolongée', description: '+4h ajoutées' });
                                  refetchRentals();
                                } catch (e: any) {
                                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="cursor-pointer rounded-lg"
                            >
                              <span className="text-green-600 font-medium">➕ Extend rental (+4h)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRentalToFinish({ rentalId: num.rentalId, phone: num.phone });
                                setShowFinishRentalDialog(true);
                              }}
                              className="cursor-pointer"
                            >
                              <span className="text-red-600 font-medium">✅ Finish rental</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        /* Menu pour ACTIVATION */
                        !num.smsCode && (num.status === 'waiting' || num.status === 'pending') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                                <MoreVertical className="h-5 w-5 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.functions.invoke('retry-sms-activate', {
                                      body: { orderId: num.orderId }
                                    });
                                    if (error || !data?.success) throw new Error(data?.error || error?.message);
                                    toast({ title: 'SMS retry demandé', description: 'Nouveau SMS en cours d\'envoi...' });
                                    refetchActivations();
                                  } catch (e: any) {
                                    toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                  }
                                }}
                              className="text-blue-600 focus:text-blue-600 focus:bg-blue-50 cursor-pointer"
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              {t('dashboard.requestAnotherSMS')}
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const activationId = (num as any)?.id || (num as any)?.activationId;
                                  const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
                                    body: { orderId: num.orderId, activationId, userId: user?.id }
                                  });
                                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                                  toast({ 
                                    title: t('dashboard.cancelSuccess'), 
                                    description: `${t('dashboard.refunded')}: ${data.refunded || num.price}Ⓐ` 
                                  });
                                  // Rafraîchir les données côté client
                                  refetchActivations();
                                  queryClient.invalidateQueries({ queryKey: ['user-balance'] });
                                  queryClient.invalidateQueries({ queryKey: ['orders-history'] });
                                } catch (e: any) {
                                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-2" />
                              {t('dashboard.cancelAndRefund')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )
                      )}
                      
                      {/* Empty space if no menu (for completed activations with SMS, no dropdown needed) */}
                      {!((num.type === 'rental') || 
                          (num.type === 'activation' && !num.smsCode && (num.status === 'waiting' || num.status === 'pending')) ||
                          (!num.type && !num.smsCode && (num.status === 'waiting' || num.status === 'pending'))) && (
                        <div className="w-9 h-9 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal des messages de rental */}
      <Dialog open={showRentMessagesModal} onOpenChange={setShowRentMessagesModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="text-2xl">📨</span>
              </div>
              <div>
                <DialogTitle className="text-xl">Messages reçus</DialogTitle>
                <DialogDescription className="text-sm">
                  {selectedRentalForMessages?.phone} • {selectedRentalForMessages?.service}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-4 max-h-[50vh]">
            {(() => {
              const messages = rentMessagesCache[selectedRentalForMessages?.rentalId || ''] || [];
              
              if (messages.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-3">📭</div>
                    <p>Aucun message reçu pour le moment</p>
                    <p className="text-sm mt-1">Les SMS seront affichés ici automatiquement</p>
                  </div>
                );
              }
              
              // Décoder les entités HTML
              const decodeHtml = (text: string) => {
                return text
                  .replace(/&#10;/g, '\n')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"');
              };
              
              return messages.map((msg, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full">
                      {msg.phoneFrom || msg.service || 'SMS'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.date).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {decodeHtml(msg.text)}
                  </p>
                  <button
                    onClick={() => {
                      // Extraire le code SMS du message
                      // Patterns courants: "Code: 123456", "code 123-456", "123456", "12-34-56"
                      const decodedText = decodeHtml(msg.text);
                      
                      // Pattern 1: "Code" suivi de chiffres (avec ou sans tirets/espaces)
                      const codePatterns = [
                        /(?:code|Code|CODE)[:\s]*([0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9]?[-\s]?[0-9]?[-\s]?[0-9]?)/i,
                        /\b(\d{3}[-\s]?\d{3,4})\b/, // Format 123-456 ou 123 456
                        /\b(\d{4,8})\b/ // Chiffres simples 4-8 digits
                      ];
                      
                      let extractedCode: string | null = null;
                      for (const pattern of codePatterns) {
                        const match = decodedText.match(pattern);
                        if (match) {
                          // Nettoyer le code (enlever espaces/tirets pour copie)
                          extractedCode = match[1].replace(/[-\s]/g, '');
                          break;
                        }
                      }
                      
                      const textToCopy = extractedCode || decodedText;
                      navigator.clipboard.writeText(textToCopy);
                      toast({
                        title: 'Copié !',
                        description: extractedCode ? `Code ${extractedCode} copié` : 'Message copié',
                      });
                    }}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {(() => {
                      // Afficher "Copier le code XXX" si un code est détecté
                      const decodedText = decodeHtml(msg.text);
                      const codeMatch = decodedText.match(/(?:code|Code|CODE)[:\s]*([0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9]?)/i) 
                        || decodedText.match(/\b(\d{3}[-\s]?\d{3,4})\b/)
                        || decodedText.match(/\b(\d{4,8})\b/);
                      if (codeMatch) {
                        return `Copier le code ${codeMatch[1].replace(/[-\s]/g, '')}`;
                      }
                      return 'Copier le message';
                    })()}
                  </button>
                </div>
              ));
            })()}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRentMessagesModal(false)}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
            <Button
              onClick={async () => {
                if (!selectedRentalForMessages?.rentalId) return;
                try {
                  const { data, error } = await supabase.functions.invoke('get-rent-status', {
                    body: { rentId: selectedRentalForMessages.rentalId, userId: user?.id }
                  });
                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                  const newMessages = data.messages || [];
                  setRentMessagesCache(prev => ({
                    ...prev,
                    [selectedRentalForMessages.rentalId]: newMessages
                  }));
                  toast({ title: 'Actualisé', description: `${newMessages.length} message(s)` });
                } catch (e: any) {
                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                }
              }}
              className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700"
            >
              🔄 Actualiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de solde insuffisant */}
      <Dialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <DialogTitle className="text-xl">{t('insufficientBalance.title')}</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              {t('insufficientBalance.description')}
            </DialogDescription>
          </DialogHeader>
          
          {insufficientBalanceData && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">{t('insufficientBalance.needed')}</span>
                <span className="font-bold text-lg">{insufficientBalanceData.needed.toFixed(0)} Ⓐ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">{t('insufficientBalance.available')}</span>
                <span className="font-semibold">{insufficientBalanceData.available.toFixed(0)} Ⓐ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                <span className="text-red-600 dark:text-red-400 font-medium">{t('insufficientBalance.missing')}</span>
                <span className="font-bold text-lg text-red-600 dark:text-red-400">{insufficientBalanceData.missing} Ⓐ</span>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientBalanceDialog(false)}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                setShowInsufficientBalanceDialog(false);
                navigate('/top-up');
              }}
              className="w-full sm:w-auto gap-2"
            >
              <Wallet className="w-4 h-4" />
              {t('insufficientBalance.topUp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation Finish Rental */}
      <Dialog open={showFinishRentalDialog} onOpenChange={setShowFinishRentalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Terminer la location
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              Êtes-vous sûr de vouloir terminer cette location sans remboursement ?
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
                  <p className="text-sm text-gray-500">Cette action est irréversible</p>
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
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!rentalToFinish) return;
                setIsFinishingRental(true);
                try {
                  const { data, error } = await supabase.functions.invoke('set-rent-status', {
                    body: { rentId: rentalToFinish.rentalId, action: 'finish', userId: user?.id }
                  });
                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                  toast({ title: 'Location terminée', description: 'Numéro libéré avec succès' });
                  refetchRentals();
                  setShowFinishRentalDialog(false);
                  setRentalToFinish(null);
                } catch (e: any) {
                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
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
                  En cours...
                </>
              ) : (
                'Oui, terminer'
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
                      const minutesLeft = 20 - calculateMinutesElapsed(rentalToCancel.createdAt);
                      return minutesLeft > 0 
                        ? `✅ Remboursement possible (${minutesLeft}min restantes)`
                        : '⚠️ Période de grâce expirée';
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
                  const { data, error } = await supabase.functions.invoke('set-rent-status', {
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
    </div>
  );
}
