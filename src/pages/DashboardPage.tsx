import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSmsPolling } from '@/hooks/useSmsPolling';
import { useRentPolling } from '@/hooks/useRentPolling';
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
  Phone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getServiceLogo, getServiceLogoFallback, getServiceIcon, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';
import { getAllServices, getServicesByCategory, SMS_ACTIVATE_COUNTRIES, type SMSActivateService } from '@/lib/sms-activate-data';

// Gestionnaire d'erreur pour les logos - utilise fallback SVG au lieu d'emoji
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
}

type Step = 'service' | 'country' | 'confirm' | 'active';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'activation' | 'rent'>('activation');
  const [rentDuration, setRentDuration] = useState<'4hours' | '1day' | '1week' | '1month'>('4hours');
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // Afficher tous les services (triés par popularity_score comme SMS-Activate)
  const [searchService, setSearchService] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);
  
  // Timer state to force re-render every second for real-time countdown
  const [, setTimerTick] = useState(0);
  
  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch services - OPTIMISÉ: Lecture directe depuis DB avec total_available mis à jour par Cron
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services', selectedCategory],
    queryFn: async () => {
      console.log('⚡ [SERVICES] Chargement depuis DB (optimisé)...');
      
      // Récupérer les services depuis la DB avec total_available à jour
      // Utiliser .range() au lieu de .limit() pour contourner la limite PostgREST de 1000
      const { data: dbServices, error } = await supabase
        .from('services')
        .select('code, name, display_name, icon, total_available, category, popularity_score')
        .eq('active', true)
        .gt('total_available', 0) // Seulement services disponibles
        .order('popularity_score', { ascending: false })
        .order('total_available', { ascending: false })
        .range(0, 9999); // Range permet de dépasser la limite PostgREST par défaut
      
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
          : getServicesByCategory(selectedCategory);
        
        const counts = fallbackData?.counts || {};
        return staticServices.map(s => ({
          id: s.code,
          name: s.name,
          code: s.code,
          icon: s.code,
          count: counts[s.code] || 0
        })).filter(s => s.count > 0);
      }
      
      // Filtrer par catégorie si nécessaire
      const filtered = selectedCategory === 'all' 
        ? dbServices 
        : dbServices.filter(s => s.category === selectedCategory);
      
      console.log('✅ [SERVICES] Chargés depuis DB:', filtered.length, 'services');
      console.log('   Catégorie sélectionnée:', selectedCategory);
      console.log('   Total DB:', dbServices.length);
      console.log('   Après filtre:', filtered.length);
      
      return filtered.map(s => ({
        id: s.code,
        name: s.display_name || s.name,
        code: s.code,
        icon: s.code,
        count: s.total_available || 0
      }));
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

      console.log('🔄 [LOAD] Chargement activations DB...');
      
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [LOAD] Erreur:', error);
        return [];
      }

      console.log('✅ [LOAD] Activations brutes chargées:', data?.length || 0);
      
      // FILTRE SUPPLÉMENTAIRE: Éliminer les numéros expirés côté client immédiatement
      const nowTime = Date.now();
      const filteredData = data?.filter(act => {
        const expiresAtTime = new Date(act.expires_at).getTime();
        const isExpired = expiresAtTime < nowTime;
        const hasCode = !!act.sms_code;
        
        // Garder seulement si: pas expiré OU a reçu un SMS
        if (isExpired && !hasCode) {
          console.log('🚫 [FILTER-QUERY] Exclu car expiré sans SMS:', act.id, act.phone);
          return false;
        }
        return true;
      }) || [];
      
      console.log('✅ [LOAD] Activations après filtre client:', filteredData.length);

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
          charged: act.charged || false
        } as ActiveNumber;
      });
    },
    enabled: !!user?.id,
    staleTime: 0, // Pas de cache pour éviter le flash des données périmées
    gcTime: 0, // Supprimer le cache immédiatement après unmount
    refetchOnMount: 'always', // Toujours refetch au mount
    refetchInterval: 10000 // Recharger toutes les 10 secondes
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

      console.log('🏠 [LOAD] Chargement rentals DB...');
      
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [LOAD] Erreur rentals:', error);
        return [];
      }

      console.log('✅ [LOAD] Rentals chargés:', data?.length || 0);
      
      // DIAGNOSTIC: Afficher les données brutes
      if (data && data.length > 0) {
        console.log('📋 [LOAD] Premier rental (raw):', data[0]);
        console.log('📋 [LOAD] Phone:', data[0].phone);
        console.log('📋 [LOAD] Service:', data[0].service_code);
        console.log('📋 [LOAD] Country:', data[0].country_code);
        console.log('📋 [LOAD] Status:', data[0].status);
      } else {
        console.warn('⚠️ [LOAD] Aucun rental actif trouvé');
        console.warn('⚠️ [LOAD] User ID:', user.id);
        console.warn('⚠️ [LOAD] Vérifier: 1) status=active 2) user_id correspond');
      }

      // Mapper les rentals DB vers le format ActiveNumber
      return data?.map(rent => {
        // Support both column naming conventions
        // order_id is the SMS-Activate rental ID
        const expiresAt = new Date(rent.expires_at || rent.end_date).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        
        // order_id = SMS-Activate rental ID (number)
        const smsActivateRentId = rent.order_id || rent.rental_id || rent.rent_id;
        console.log('📋 [MAP] Rental mapping:', { 
          dbId: rent.id, 
          orderId: rent.order_id,
          rentalId: rent.rental_id,
          rentId: rent.rent_id,
          smsActivateRentId
        });

        return {
          id: rent.id,
          orderId: String(smsActivateRentId),
          activationId: rent.id,
          rentalId: String(smsActivateRentId), // SMS-Activate rent ID for polling
          phone: rent.phone,
          service: rent.service_code,
          country: rent.country_code,
          timeRemaining,
          expiresAt: rent.expires_at || rent.end_date,
          status: timeRemaining > 0 ? 'active' : 'timeout',
          price: rent.total_cost || rent.price || (rent.hourly_rate ? rent.hourly_rate * (rent.rent_hours || rent.duration_hours) : 0),
          charged: true,
          type: 'rental' as const,
          durationHours: rent.duration_hours || rent.rent_hours,
          messageCount: rent.message_count || rent.sms_count || 0
        } as ActiveNumber;
      });
    },
    enabled: !!user?.id,
    staleTime: 0, // Pas de cache pour éviter le flash des données périmées
    gcTime: 0, // Supprimer le cache immédiatement après unmount
    refetchOnMount: 'always', // Toujours refetch au mount
    refetchInterval: 10000 // Recharger toutes les 10 secondes
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
      console.log('✅ [INIT] Premier chargement terminé');
      setHasInitiallyLoaded(true);
    }
  }, [pendingActivations, pendingRentals, hasInitiallyLoaded]);

  useEffect(() => {
    // NE PAS mettre à jour si on n'a pas encore fait le premier chargement
    // Cela évite le flash des données en cache
    if (!hasInitiallyLoaded) {
      console.log('⏳ [SYNC] En attente du premier chargement...');
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

    console.log('🔄 [SYNC] Synchronisation activeNumbers:', {
      activations: dbActivations.length,
      rentals: dbRentals.length,
      total: combined.length
    });
    if (dbRentals.length > 0) {
      console.log('📋 [SYNC] Premier rental dans combined:', combined.find(n => n.type === 'rental'));
    }
    
    // Filtrer les numéros masqués ET les numéros expirés/timeout
    const now = Date.now();
    const SMS_DISPLAY_GRACE_PERIOD = 2 * 60 * 1000; // 2 minutes après expiration pour voir le SMS
    
    const visibleNumbers = combined.filter(num => {
      // Si masqué manuellement, ne pas afficher
      if (hiddenNumbers.has(num.id)) return false;
      
      // Si timeout et pas de SMS reçu, ne pas afficher sur le dashboard
      if (num.status === 'timeout' && !num.smsCode) return false;
      
      // Vérifier si le numéro est expiré (temps écoulé)
      if (num.expiresAt) {
        const expiresAtTime = new Date(num.expiresAt).getTime();
        const isExpired = expiresAtTime < now;
        
        // Si expiré et pas de SMS reçu, ne pas afficher
        if (isExpired && !num.smsCode) {
          console.log('🚫 [FILTER] Numéro expiré sans SMS masqué:', num.id, num.phone);
          return false;
        }
        
        // NOUVEAU: Si expiré depuis plus de 2 minutes, masquer même avec SMS
        // Cela évite d'afficher d'anciennes activations avec SMS reçus
        if (isExpired && num.smsCode) {
          const timeSinceExpiry = now - expiresAtTime;
          if (timeSinceExpiry > SMS_DISPLAY_GRACE_PERIOD) {
            console.log('🚫 [FILTER] Numéro expiré depuis trop longtemps masqué:', num.id, num.phone, 'expiré depuis', Math.round(timeSinceExpiry / 1000), 'sec');
            return false;
          }
        }
      }
      
      return true;
    });
    
    console.log('📊 [FILTER] Résultat filtrage:', {
      avant: combined.length,
      après: visibleNumbers.length,
      masqués: combined.length - visibleNumbers.length
    });
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

  // Polling automatique pour les rentals actifs
  const activeRentalIds = dbRentals.map(r => r.rentalId).filter(Boolean) as string[];
  useRentPolling({
    enabled: activeRentalIds.length > 0,
    rentalIds: activeRentalIds,
    onUpdate: () => {
      refetchRentals(); // Rafraîchir la liste quand nouveaux messages
    },
    intervalMs: 5000 // Vérifier toutes les 5 secondes
  });

  // Fetch countries LIVE - OPTIMISÉ: Vraies quantités via get-country-availability
  const { data: countries = [], isLoading: loadingCountries } = useQuery<Country[]>({
    queryKey: ['countries-live', selectedService?.code, mode, rentDuration],
    queryFn: async () => {
      if (!selectedService?.code) return [];
      
      console.log(`🌐 [LIVE] Chargement pays mode=${mode} service=${selectedService.code}`);
      
      // ✅ En mode RENT, utiliser getRentServicesAndCountries (API différente)
      if (mode === 'rent') {
        console.log(`🏠 [RENT] Récupération pays pour location (${rentDuration})...`);
        
        try {
          // Convertir rentDuration en rentTime pour l'API
          const rentTimeMap = {
            '4hours': '4',
            '1day': '24', 
            '1week': '168',
            '1month': '720'
          };
          const rentTime = rentTimeMap[rentDuration];
          
          const { data: rentData, error } = await supabase.functions.invoke('get-rent-services', {
            body: { rentTime }
          });
          
          if (error) {
            console.error('❌ [RENT] Erreur get-rent-services:', error);
            throw error;
          }
          
          console.log('📡 [RENT] Response:', rentData);
          
          // Structure: { countries: {"0": 2, "1": 6}, services: {"wa": {cost: 21.95, quant: {...}}} }
          const countriesMap = rentData?.countries || {};
          const services = rentData?.services || {};
          
          // Récupérer le service actuel dans la réponse
          const serviceCode = selectedService.code;
          let serviceData = services[serviceCode];
          let priceToUse = 0;
          let serviceName = selectedService.name;
          
          // Vérifier si le service existe dans la réponse API
          if (!serviceData) {
            console.warn(`⚠️ [RENT] Service ${serviceCode} pas disponible pour location`);
            
            // Fallback vers "full" (service universel)
            const fullService = services['full'];
            
            if (!fullService) {
              console.error(`❌ [RENT] Aucun service disponible (ni ${serviceCode}, ni full)`);
              return [];
            }
            
            serviceData = fullService;
            serviceName = 'Full rent';
            console.log(`🔄 [RENT] Fallback sur service "full": cost=${fullService.cost}`);
          }
          
          // Extraire le prix (peut être dans cost ou retail_cost selon l'API)
          priceToUse = serviceData.cost || parseFloat(serviceData.retail_cost) || 0;
          
          if (!priceToUse || priceToUse <= 0) {
            console.error(`❌ [RENT] Prix invalide pour ${serviceName}: ${priceToUse}`);
            return [];
          }
          
          console.log(`✅ [RENT] Service ${serviceName}: cost=${priceToUse}`);
          
          // Mapping SMS-Activate ID → Country code (complet)
          const SMS_ACTIVATE_COUNTRY_MAP: Record<string, string> = {
            '0': 'russia', '1': 'ukraine', '2': 'kazakhstan', '3': 'china', '4': 'philippines',
            '5': 'myanmar', '6': 'indonesia', '7': 'malaysia', '8': 'kenya', '9': 'tanzania',
            '10': 'vietnam', '11': 'kyrgyzstan', '12': 'england', '13': 'israel', '14': 'hongkong',
            '15': 'poland', '16': 'egypt', '17': 'nigeria', '18': 'macau', '19': 'morocco',
            '20': 'ghana', '21': 'argentina', '22': 'india', '23': 'uzbekistan', '24': 'cambodia',
            '25': 'cameroon', '26': 'chad', '27': 'germany', '28': 'lithuania', '29': 'croatia',
            '30': 'sweden', '31': 'iraq', '32': 'romania', '33': 'colombia', '34': 'austria',
            '35': 'belarus', '36': 'canada', '37': 'saudiarabia', '38': 'mexico', '39': 'argentina',
            '40': 'spain', '41': 'iran', '42': 'algeria', '43': 'germany', '44': 'bangladesh',
            '52': 'thailand', '56': 'spain', '58': 'italy', '73': 'brazil', '78': 'france',
            '82': 'mexico', '175': 'australia', '187': 'usa'
          };
          
          // Récupérer les infos des pays depuis notre DB
          const { data: dbCountries } = await supabase
            .from('countries')
            .select('id, code, name, success_rate')
            .eq('active', true);
          
          // Mapper par code pays (pas par ID)
          const dbCountriesMap = new Map(
            dbCountries?.map(c => [c.code.toLowerCase(), c]) || []
          );
          
          console.log(`📍 [RENT] Mapping ${Object.keys(countriesMap).length} pays de l'API avec DB...`);
          
          // Mapper les pays disponibles
          const availableCountries = Object.entries(countriesMap)
            .map(([countryId, quantity]) => {
              // Convertir l'ID API en code pays
              const countryCode = SMS_ACTIVATE_COUNTRY_MAP[countryId];
              if (!countryCode) {
                console.warn(`⚠️ [RENT] ID ${countryId} non mappé dans SMS_ACTIVATE_COUNTRY_MAP`);
                return null;
              }
              
              // Récupérer les infos depuis la DB
              const countryInfo = dbCountriesMap.get(countryCode.toLowerCase());
              if (!countryInfo) {
                console.warn(`⚠️ [RENT] Pays ${countryCode} (ID ${countryId}) non trouvé dans DB`);
                return null;
              }
              
              return {
                id: countryInfo.id,
                name: countryInfo.name,
                code: countryInfo.code,
                flag: getFlagEmoji(countryInfo.code),
                successRate: countryInfo.success_rate || null,
                count: quantity as number,
                price: priceToUse, // Prix du service sélectionné
                compositeScore: quantity as number, // Utiliser la quantité comme score
                rank: parseInt(countryId),
                share: 0
              };
            })
            .filter(Boolean) as Country[];
          
          console.log(`✅ [RENT] ${availableCountries.length} pays disponibles pour ${serviceName}`);
          return availableCountries;
          
        } catch (error) {
          console.error('❌ [RENT] Erreur:', error);
          throw error;
        }
      }
      
      // ✅ MODE ACTIVATION (code existant)
      const apiServiceCode = selectedService.code;
      console.log(`📝 [ACTIVATION] Service: ${selectedService.name} → API code: ${apiServiceCode}`);
      
      // 1️⃣ Récupérer les prix depuis pricing_rules (notre marge 20%)
      const { data: pricingData } = await supabase
        .from('pricing_rules')
        .select('country_code, activation_price')
        .eq('service_code', selectedService.code)
        .eq('active', true);
      
      const priceMap = new Map(
        pricingData?.map(p => [p.country_code.toLowerCase(), p.activation_price]) || []
      );
      
      // 2️⃣ Récupérer les success_rate depuis countries table
      const { data: countriesData } = await supabase
        .from('countries')
        .select('code, name, success_rate')
        .eq('active', true);
      
      const successRateMap = new Map(
        countriesData?.map(c => [c.code.toLowerCase(), c.success_rate]) || []
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
          console.error('❌ [LIVE] Erreur Edge Function:', error);
          throw error;
        }
        
        console.log('📡 [LIVE] Response:', availabilityData);
        
        // Extraire countries (nouvelle structure avec stats SMS-Activate)
        const countries = availabilityData?.countries || [];
        
        if (!countries || countries.length === 0) {
          console.warn('⚠️ [LIVE] Aucun pays disponible dans la réponse');
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
        
        console.log('🏆 [LIVE] Top 5 pays (tri intelligent):', mapped.slice(0, 5).map(c => 
          `${c.name} (${c.successRate}% - ${c.count} nums - $${c.price} - Score: ${c.compositeScore?.toFixed(1)})`
        ));
        
        return mapped;
      } catch (error) {
        console.error('❌ [LIVE] Erreur get-country-availability:', error);
        
        // Fallback: récupérer depuis pricing_rules
        try {
          const { data: pricingRules } = await supabase
            .from('pricing_rules')
            .select('country_code, available_count, activation_price')
            .eq('service_code', selectedService.code)
            .eq('active', true)
            .gt('available_count', 0);
          
          if (!pricingRules || pricingRules.length === 0) {
            console.warn('⚠️ [FALLBACK] Aucune pricing_rule trouvée');
            return [];
          }
          
          // Grouper par pays et additionner les quantités
          const countryMap = new Map<string, { count: number; price: number }>();
          pricingRules.forEach(rule => {
            const existing = countryMap.get(rule.country_code) || { count: 0, price: rule.activation_price };
            existing.count += rule.available_count;
            countryMap.set(rule.country_code, existing);
          });
          
          // Récupérer les infos pays depuis la DB
          const { data: dbCountries } = await supabase
            .from('countries')
            .select('id, code, name, success_rate')
            .in('code', Array.from(countryMap.keys()));
          
          return (dbCountries || []).map(country => ({
            id: country.id,
            name: country.name,
            code: country.code,
            flag: getFlagEmoji(country.code),
            successRate: country.success_rate || 90,
            count: countryMap.get(country.code)?.count || 0,
            price: countryMap.get(country.code)?.price || 1.0
          }));
        } catch (fallbackError) {
          console.error('❌ [FALLBACK] Erreur:', fallbackError);
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
      // Recharger le solde utilisateur
      console.log('💰 [POLLING] Rafraîchissement du solde...');
    }
  });

  // WebSocket temps réel pour détection instantanée des SMS
  useRealtimeSms({
    userId: user?.id,
    onSmsReceived: (activation) => {
      console.log('⚡ [REALTIME] SMS reçu, rechargement des activations...');
      // Recharger immédiatement les activations
      refetchActivations();
    },
    onBalanceUpdate: () => {
      console.log('💰 [REALTIME] Rafraîchissement du solde...');
      // TODO: Ajouter refetch du solde si nécessaire
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
      const priceMultiplier = isRent ? (
        rentDuration === '4hours' ? 1 :
        rentDuration === '1day' ? 3 :
        rentDuration === '1week' ? 15 : 50
      ) : 1;
      const finalPrice = Math.ceil(selectedCountry.price * priceMultiplier);

      console.log(`🚀 [${isRent ? 'RENT' : 'ACTIVATE'}] Début achat:`, {
        mode,
        duration: isRent ? rentDuration : 'N/A',
        service: selectedService.code || selectedService.name,
        serviceCode: selectedService.code,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        basePrice: selectedCountry.price,
        finalPrice,
        userId: user.id
      });

      // Vérifier le solde
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (!userData || userData.balance < finalPrice) {
        toast({
          title: 'Solde insuffisant',
          description: `Besoin de ${finalPrice}Ⓐ, disponible: ${userData?.balance || 0}Ⓐ`,
          variant: 'destructive'
        });
        return;
      }

      // SMS-Activate gère automatiquement la sélection d'opérateur
      console.log(`🔍 [${isRent ? 'RENT' : 'ACTIVATE'}] SMS-Activate sélectionnera automatiquement le meilleur opérateur`);
      
      // Préparer le body selon le mode
      // ✅ Envoyer le prix affiché au frontend pour garantir la cohérence
      const requestBody = {
        country: selectedCountry.code,
        operator: 'any', // SMS-Activate choisit automatiquement le meilleur
        product: selectedService.code || selectedService.name.toLowerCase(),
        userId: user.id,
        expectedPrice: finalPrice, // Prix affiché au frontend, à utiliser dans la DB
        ...(isRent && { duration: rentDuration })
      };
      
      const functionName = isRent ? 'buy-sms-activate-rent' : 'buy-sms-activate-number';
      console.log(`📤 [${isRent ? 'RENT' : 'ACTIVATE'}] Envoi à ${functionName}:`, requestBody);
      
      const { data: buyData, error: buyError } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      console.log(`📥 [${isRent ? 'RENT' : 'ACTIVATE'}] Réponse:`, { buyData, buyError });

      if (buyError || !buyData?.success) {
        console.error(`❌ [${isRent ? 'RENT' : 'ACTIVATE'}] Erreur détaillée:`, { buyError, buyData });
        
        // Essayer de récupérer le message d'erreur depuis la réponse HTTP
        if (buyError && 'context' in buyError) {
          const context = (buyError as any).context;
          console.error(`❌ [${isRent ? 'RENT' : 'ACTIVATE'}] Context:`, context);
          
          // Lire le body de la réponse pour avoir le message d'erreur
          if (context && typeof context.text === 'function') {
            try {
              const errorText = await context.text();
              console.error(`❌ [${isRent ? 'RENT' : 'ACTIVATE'}] Error body:`, errorText);
              const errorJson = JSON.parse(errorText);
              console.error(`❌ [${isRent ? 'RENT' : 'ACTIVATE'}] Error JSON:`, errorJson);
              throw new Error(errorJson.error || errorJson.message || 'Achat échoué');
            } catch (e) {
              console.error(`❌ [${isRent ? 'RENT' : 'ACTIVATE'}] Failed to parse error:`, e);
            }
          }
        }
        
        throw new Error(buyData?.error || buyData?.details || buyError?.message || 'Achat échoué');
      }

      console.log(`✅ [${isRent ? 'RENT' : 'ACTIVATE'}] Numéro acheté:`, buyData.data);

      // Recharger les activations depuis la DB
      refetchActivations();
      
      if (!isRent) {
        // Pour activation: Vérifier IMMÉDIATEMENT si le SMS est déjà arrivé
        console.log('🚀 [ACTIVATE] Vérification immédiate du SMS...');
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('check-sms-activate-status', {
              body: {
                activationId: buyData.data.activation_id,
                userId: user?.id
              }
            });
            refetchActivations();
            console.log('✅ [ACTIVATE] Vérification immédiate terminée');
          } catch (e) {
            console.error('⚠️ [ACTIVATE] Erreur vérification immédiate:', e);
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
      console.error(`❌ [${mode === 'rent' ? 'RENT' : 'ACTIVATE'}] Exception:`, error);
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
      console.log('🚫 [CANCEL] Starting cancellation for:', { activationId, orderId });

      // 1. Cancel via Edge Function - Envoyer TOUJOURS orderId (ID SMS-Activate)
      // L'activationId est l'UUID Supabase, orderId est l'ID de SMS-Activate
      const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
        body: { 
          orderId: orderId, // ID SMS-Activate (numérique)
          activationId: activationId, // UUID Supabase (pour mise à jour DB)
          userId: user?.id 
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'SMS-Activate cancellation failed');
      }

      console.log('✅ [CANCEL] SMS-Activate cancellation successful');

      // 2. Update Supabase status
      const { error: updateError } = await supabase
        .from('activations')
        .update({ 
          status: 'cancelled',
          charged: false
        })
        .eq('id', activationId);

      if (updateError) {
        console.error('❌ [CANCEL] Supabase update error:', updateError);
        throw updateError;
      }

      console.log('✅ [CANCEL] Database updated to cancelled');

      // 3. Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['active-numbers'] });
      await queryClient.invalidateQueries({ queryKey: ['orders-history'] });

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
              Activation
            </button>
            <button
              onClick={() => setMode('rent')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                mode === 'rent'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              Rent
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
                      onClick={() => handleServiceSelect({ id: 'full', name: 'Full rent', code: 'full', count: 597, icon: 'home', category: 'other', active: true })}
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
                        {service.count.toLocaleString()} {t('dashboard.numbersAvailable')}
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
                    {selectedService.count.toLocaleString()} {t('dashboard.numbersAvailable')}
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
                          {filteredCountries.map((country) => (
                      <div
                        key={country.id}
                        onClick={() => handleCountrySelect(country)}
                        className="group bg-white border-2 border-gray-100 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:border-green-400 hover:shadow-lg hover:shadow-green-100/50 transition-all duration-300 hover:scale-[1.01]"
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
                            <p className="font-bold text-sm text-gray-900 truncate group-hover:text-green-600 transition-colors">{country.name}</p>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              {country.count.toLocaleString()} {t('dashboard.numbersAvailable')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-bold text-base flex-shrink-0 shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-shadow">
                          <span>{Math.floor(country.price)}</span>
                          <span className="text-xs opacity-80">Ⓐ</span>
                        </div>
                      </div>
                          ))}
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
                        <div className="absolute -bottom-1 -right-1 lg:-bottom-1.5 lg:-right-1.5 w-6 h-6 lg:w-7 lg:h-7 rounded-full border-2 lg:border-[3px] border-white overflow-hidden bg-white shadow-lg">
                          <img 
                            src={getCountryFlag(num.country)}
                            alt={num.country}
                            className="w-full h-full object-cover"
                            onError={(e) => handleLogoError(e, num.country)}
                          />
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
                      {/* Pour RENTAL: afficher le compteur de messages */}
                      {num.type === 'rental' ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl px-3 lg:px-4 py-2 lg:py-2.5">
                            <div className="flex items-center gap-2 lg:gap-3">
                              <span className="text-xs lg:text-sm text-purple-700 font-bold">
                                📨 {num.messageCount || 0} {(num.messageCount || 0) === 1 ? t('dashboard.messages') : t('dashboard.messagesPlural')}
                              </span>
                              {num.durationHours && (
                                <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                                  {num.durationHours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
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
                                    body: { rentId: num.rentalId }
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
                                    body: { rentalId: num.rentalId, rentTime: 4 }
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
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('set-rent-status', {
                                    body: { rentalId: num.rentalId, status: 1 }
                                  });
                                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                                  toast({ title: 'Location terminée', description: 'Numéro libéré' });
                                  refetchRentals();
                                } catch (e: any) {
                                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <span className="text-orange-600">✅ Finish rental</span>
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
                            
                            {/* Cancel button - only show after 5 minutes */}
                            {canCancelActivation(num.expiresAt) ? (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
                                      body: { orderId: num.orderId }
                                    });
                                    if (error || !data?.success) throw new Error(data?.error || error?.message);
                                    toast({ 
                                      title: t('dashboard.cancelSuccess'), 
                                      description: `${t('dashboard.refunded')}: ${data.refunded || num.price}Ⓐ` 
                                    });
                                    refetchActivations();
                                    // Refresh user balance
                                    queryClient.invalidateQueries({ queryKey: ['user-balance'] });
                                  } catch (e: any) {
                                    toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                  }
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-2" />
                                {t('dashboard.cancelAndRefund')}
                              </DropdownMenuItem>
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-gray-400">
                                {t('dashboard.cancelAvailableIn')} {Math.ceil((300 - getTimeElapsedSinceCreation(num.expiresAt)) / 60)} min
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )
                      )}
                      
                      {/* Empty space if no menu (for completed activations with SMS, no dropdown needed) */}
                      {!((num.type === 'rental') || 
                          (num.type !== 'rental' && !num.smsCode && (num.status === 'waiting' || num.status === 'pending'))) && (
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
    </div>
  );
}
