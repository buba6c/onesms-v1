import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  XCircle
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
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'activation' | 'rent'>('activation');
  const [rentDuration, setRentDuration] = useState<'4hours' | '1day' | '1week' | '1month'>('4hours');
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchService, setSearchService] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);

  // Fetch services - OPTIMISÉ: Lecture directe depuis DB avec total_available mis à jour par Cron
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services', selectedCategory],
    queryFn: async () => {
      console.log('⚡ [SERVICES] Chargement depuis DB (optimisé)...');
      
      // Récupérer les services depuis la DB avec total_available à jour
      const { data: dbServices, error } = await supabase
        .from('services')
        .select('code, name, display_name, icon, total_available, category, popularity_score')
        .eq('active', true)
        .gt('total_available', 0) // Seulement services disponibles
        .order('popularity_score', { ascending: false })
        .order('total_available', { ascending: false });
      
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
  const { data: dbActivations = [], refetch: refetchActivations } = useQuery<ActiveNumber[]>({
    queryKey: ['active-numbers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('🔄 [LOAD] Chargement activations DB...');
      
      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'waiting', 'received'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [LOAD] Erreur:', error);
        return [];
      }

      console.log('✅ [LOAD] Activations chargées:', data?.length || 0);

      // Mapper les activations DB vers le format ActiveNumber
      return data?.map(act => {
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
      }) || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000 // Recharger toutes les 10 secondes
  });

  // Charger les rentals actifs depuis la DB
  const { data: dbRentals = [], refetch: refetchRentals } = useQuery<ActiveNumber[]>({
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
        const expiresAt = new Date(rent.expires_at || rent.end_date).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

        return {
          id: rent.id,
          orderId: rent.rental_id || rent.rent_id,
          activationId: rent.id,
          rentalId: rent.rental_id || rent.rent_id,
          phone: rent.phone,
          service: rent.service_code,
          country: rent.country_code,
          timeRemaining,
          expiresAt: rent.expires_at || rent.end_date,
          status: timeRemaining > 0 ? 'active' : 'timeout',
          price: rent.total_cost || rent.hourly_rate * (rent.rent_hours || rent.duration_hours),
          charged: true,
          type: 'rental' as const,
          durationHours: rent.duration_hours || rent.rent_hours,
          messageCount: rent.message_count || 0
        } as ActiveNumber;
      }) || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000 // Recharger toutes les 10 secondes
  });

  // Synchroniser activeNumbers avec la DB (fusionner activations + rentals)
  useEffect(() => {
    const combined = [
      ...dbActivations.map(a => ({ ...a, type: 'activation' as const })),
      ...dbRentals
    ];
    console.log('🔄 [SYNC] Synchronisation activeNumbers:', {
      activations: dbActivations.length,
      rentals: dbRentals.length,
      total: combined.length
    });
    if (dbRentals.length > 0) {
      console.log('📋 [SYNC] Premier rental dans combined:', combined.find(n => n.type === 'rental'));
    }
    setActiveNumbers(combined);
  }, [dbActivations, dbRentals]);

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
      const requestBody = {
        country: selectedCountry.code,
        operator: 'any', // SMS-Activate choisit automatiquement le meilleur
        product: selectedService.code || selectedService.name.toLowerCase(),
        userId: user.id,
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Phone number copied to clipboard'
    });
  };

  const cancelActivation = async (activationId: string, orderId: string) => {
    try {
      console.log('🚫 [CANCEL] Starting cancellation for:', { activationId, orderId });

      // 1. Cancel via Edge Function (plus sécurisé)
      const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
        body: { activationId, userId: user?.id }
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

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar - Order Number */}
      <aside className="w-[380px] bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Order number</h1>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-4">
            <button
              onClick={() => setMode('activation')}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                mode === 'activation'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activation
            </button>
            <button
              onClick={() => setMode('rent')}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                mode === 'rent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rent
            </button>
          </div>

          {/* STEP 1: Service Selection */}
          {currentStep === 'service' && (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter service name..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="pl-10 h-11 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              {/* Special Service for Rent Mode */}
              {mode === 'rent' && (
                <div className="mb-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">
                    IF THE REQUIRED SERVICE IS NOT IN THE LIST
                  </p>
                  <div className="space-y-2 mb-4">
                    {/* Full rent - Universal service */}
                    <div
                      onClick={() => handleServiceSelect({ id: 'full', name: 'Full rent', code: 'full', count: 597, icon: '🏠', category: 'other', active: true })}
                      className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                      <div className="w-11 h-11 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🏠</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900">Full rent</p>
                        <p className="text-xs text-gray-500">Receive SMS from any service</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">
                POPULAR ({filteredServices.length} services)
              </p>

              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
                  >
                    <div className="w-11 h-11 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img 
                        src={getServiceLogo(service.code || service.name)} 
                        alt={service.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => handleLogoError(e, service.code || service.name)}
                      />
                      <span className="text-xl hidden items-center justify-center">{getServiceIcon(service.code || service.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.count.toLocaleString()} numbers</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP 2: Country Selection */}
          {(currentStep === 'country' || currentStep === 'confirm') && selectedService && (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter service name..."
                  value={searchService}
                  disabled
                  className="pl-10 h-11 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">SELECTED SERVICE</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-3">
                <div className="w-11 h-11 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img 
                    src={getServiceLogo(selectedService.code || selectedService.name)} 
                    alt={selectedService.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => handleLogoError(e, selectedService.code || selectedService.name)}
                  />
                  <span className="text-xl hidden items-center justify-center">{getServiceIcon(selectedService.code || selectedService.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{selectedService.name}</p>
                  <p className="text-xs text-gray-500">{selectedService.count.toLocaleString()} numbers</p>
                </div>
                <button onClick={handleReset} className="p-1.5 hover:bg-gray-200 rounded-full transition-all flex-shrink-0">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {currentStep === 'country' && (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">COUNTRY SELECTION</p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter country name..."
                      value={searchCountry}
                      onChange={(e) => setSearchCountry(e.target.value)}
                      className="pl-10 h-11 text-sm bg-gray-50 border-gray-200"
                      disabled={loadingCountries}
                    />
                  </div>

                  {loadingCountries ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500 animate-pulse">🌐 Chargement des taux en temps réel depuis 5sim...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2 text-[10px] text-gray-500 px-1">
                        <span>Country, success rate</span>
                        <span>Price</span>
                      </div>

                      {filteredCountries.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">Aucun pays disponible pour ce service</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredCountries.map((country) => (
                      <div
                        key={country.id}
                        onClick={() => handleCountrySelect(country)}
                        className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-12 h-9 rounded border border-gray-200 overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
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
                            <p className="font-bold text-sm text-gray-900 truncate">{country.name}</p>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              {country.count.toLocaleString()} numbers
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-base flex-shrink-0">
                          <span>{Math.floor(country.price)}</span>
                          <span className="text-xs">Ⓐ</span>
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
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">SELECTED COUNTRY</p>
                  <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <div className="w-16 h-12 rounded border border-gray-200 overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
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
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {selectedCountry.count.toLocaleString()} numbers
                      </p>
                    </div>
                    <button onClick={() => setCurrentStep('country')} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                      <X className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Rent Duration Selector */}
                  {mode === 'rent' && (
                    <div className="mb-6">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">DURATION</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: '4hours' as const, label: '4 Hours', price: selectedCountry.price * 1 },
                          { value: '1day' as const, label: '1 Day', price: selectedCountry.price * 3 },
                          { value: '1week' as const, label: '1 Week', price: selectedCountry.price * 15 },
                          { value: '1month' as const, label: '1 Month', price: selectedCountry.price * 50 }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => setRentDuration(option.value)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              rentDuration === option.value
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                            <div className="text-lg font-bold text-blue-600">{Math.ceil(option.price)} Ⓐ</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleActivate}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6"
                  >
                    <span>{mode === 'rent' ? 'Rent' : 'Activate'}</span>
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
                      <span className="text-2xl">
                        {mode === 'rent' 
                          ? Math.ceil(selectedCountry.price * (
                              rentDuration === '4hours' ? 1 :
                              rentDuration === '1day' ? 3 :
                              rentDuration === '1week' ? 15 : 50
                            ))
                          : Math.floor(selectedCountry.price)
                        }
                      </span>
                      <span className="text-sm">Ⓐ</span>
                    </div>
                  </Button>

                  <p className="text-center text-sm text-gray-500 mt-4 mb-0">
                    {mode === 'rent' 
                      ? 'The number will be available for the selected duration and can receive multiple SMS'
                      : 'If the number does not receive an SMS, the funds will be returned to the balance'
                    }
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content - Active Numbers */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Active numbers</h2>

          {activeNumbers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">📱</span>
              </div>
              <p className="text-gray-500 mb-2">No active numbers</p>
              <p className="text-sm text-gray-400">Select a service and country to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNumbers.map((num) => (
                <div key={num.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    {/* Logo + Flag (52px zone) */}
                    <div className="relative flex-shrink-0">
                      <div className="w-[52px] h-[52px] bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                        <img 
                          src={getServiceLogo(num.service.toLowerCase())}
                          alt={num.service}
                          className="w-7 h-7 object-contain"
                          onError={(e) => handleLogoError(e, num.service.toLowerCase())}
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3px] border-white overflow-hidden bg-white shadow-md">
                        <img 
                          src={getCountryFlag(num.country)}
                          alt={num.country}
                          className="w-full h-full object-cover"
                          onError={(e) => handleLogoError(e, num.country)}
                        />
                      </div>
                    </div>

                    {/* Service + Country (140px) */}
                    <div className="w-[140px] flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-[15px] text-gray-900 leading-tight truncate">{num.service} + ...</p>
                        {num.type === 'rental' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                            RENT
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 leading-tight">{num.country}</p>
                    </div>

                    {/* Phone (240px pour le format complet) */}
                    <div className="flex items-center gap-2 w-[240px] flex-shrink-0">
                      <span className="font-mono text-[14px] font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded whitespace-nowrap">
                        {formatPhoneNumber(num.phone)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(num.phone)}
                        className="p-1 hover:bg-blue-50 rounded-md transition-colors"
                        title="Copier le numéro"
                      >
                        <Copy className="h-4 w-4 text-blue-500" />
                      </button>
                    </div>

                    {/* Flexible right section */}
                    <div className="flex items-center gap-4 flex-1 justify-end">
                      {/* Pour RENTAL: afficher le compteur de messages */}
                      {num.type === 'rental' ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] text-purple-700 font-medium">
                                📨 {num.messageCount || 0} message{(num.messageCount || 0) !== 1 ? 's' : ''}
                              </span>
                              {num.durationHours && (
                                <span className="text-[12px] text-purple-600">
                                  • {num.durationHours}h rental
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Code bleu OU Waiting spinner (pour activation) */}
                          {num.smsCode ? (
                            <div className="bg-[#007AFF] text-white rounded-2xl rounded-tr-md px-4 py-2.5 shadow-md max-w-md">
                              <span className="font-medium text-[14px] leading-relaxed">
                                {(() => {
                                  // Extraire le code SMS si le format est STATUS_OK:code
                                  const cleanCode = num.smsCode.includes('STATUS_OK:') 
                                    ? num.smsCode.split(':')[1] 
                                    : num.smsCode;
                                  
                                  // Récupérer le nom du service
                                  const serviceName = services.find(s => s.code === num.service)?.name || num.service;
                                  
                                  return num.smsText && !num.smsText.includes('STATUS_OK:') 
                                    ? num.smsText 
                                    : `Votre code de validation ${serviceName} est ${cleanCode}`;
                                })()}
                              </span>
                            </div>
                          ) : (num.status === 'waiting' || num.status === 'pending') ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-[2.5px] border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                              <span className="text-[14px] text-gray-400">Waiting for SMS...</span>
                            </div>
                          ) : num.status === 'timeout' ? (
                            <span className="text-[14px] text-gray-400">No SMS</span>
                          ) : null}
                        </>
                      )}

                      {/* Badge (40px fixe) */}
                      <div className="flex items-center justify-center w-[40px] h-[40px] bg-[#E5E5E5] text-gray-600 rounded-full flex-shrink-0">
                        <span className="text-[13px] font-semibold">{Math.floor(num.price)}</span>
                        <span className="text-[11px] ml-0.5">Ⓐ</span>
                      </div>

                      {/* Timer */}
                      {(num.status === 'waiting' || num.status === 'pending' || num.status === 'active') && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="text-[13px]">
                            <span className="text-gray-400">Remaining:</span>
                            <br/>
                            <span className="font-semibold text-gray-900">
                              {num.type === 'rental' && num.durationHours && num.durationHours >= 24
                                ? `${Math.floor(getRealTimeRemaining(num.expiresAt) / 3600)}h`
                                : `${Math.floor(getRealTimeRemaining(num.expiresAt) / 60)} min.`
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
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                              <MoreVertical className="h-5 w-5 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
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
                              className="cursor-pointer"
                            >
                              <span className="text-blue-600">📨 Refresh messages</span>
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
                              className="cursor-pointer"
                            >
                              <span className="text-green-600">➕ Extend rental (+4h)</span>
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
                            <DropdownMenuContent align="end" className="w-48">
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
                              Demander un autre SMS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('cancel-sms-activate', {
                                    body: { orderId: num.orderId }
                                  });
                                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                                  toast({ title: 'Annulation effectuée', description: 'Le numéro a été annulé.' });
                                  refetchActivations();
                                } catch (e: any) {
                                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <span className="text-red-600">❌ Cancel</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )
                      )}
                      
                      {/* Menu dropdown for completed activation with SMS code */}
                      {num.type !== 'rental' && num.smsCode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                              <MoreVertical className="h-5 w-5 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('finish-sms-activate', {
                                    body: { orderId: num.orderId }
                                  });
                                  if (error || !data?.success) throw new Error(data?.error || error?.message);
                                  toast({ title: 'Activation terminée', description: 'Le numéro a été marqué comme réussi' });
                                  refetchActivations();
                                } catch (e: any) {
                                  toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
                            >
                                <span className="text-green-600">✅ Marquer comme terminé</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      
                      {/* Empty space if no menu */}
                      {!((num.type === 'rental') || 
                          (num.type !== 'rental' && !num.smsCode && (num.status === 'waiting' || num.status === 'pending')) ||
                          (num.type !== 'rental' && num.smsCode)) && (
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
