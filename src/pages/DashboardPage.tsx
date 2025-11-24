import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSmsPolling } from '@/hooks/useSmsPolling';
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
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled';
  smsCode?: string;
  smsText?: string;
  price: number;
  charged: boolean;
}

type Step = 'service' | 'country' | 'confirm' | 'active';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'activation' | 'rent'>('activation');
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
        // Fallback: utiliser get-services-counts si DB échoue
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

  // Synchroniser activeNumbers avec la DB
  useEffect(() => {
    if (dbActivations) {
      setActiveNumbers(dbActivations);
    }
  }, [dbActivations]);

  // Fetch countries LIVE - OPTIMISÉ: Vraies quantités via get-country-availability
  const { data: countries = [], isLoading: loadingCountries } = useQuery<Country[]>({
    queryKey: ['countries-live', selectedService?.code],
    queryFn: async () => {
      if (!selectedService?.code) return [];
      
      console.log('🌐 [LIVE] Chargement pays avec quantités réelles...');
      
      // Mapper les codes longs vers les codes courts de l'API SMS-Activate
      const serviceCodeMapping: Record<string, string> = {
        'whatsapp': 'wa',
        'telegram': 'tg',
        'facebook': 'fb',
        'instagram': 'ig',
        'google': 'go',
        'twitter': 'tw',
        'discord': 'dr',
        'uber': 'uk',
        'netflix': 'ne',
        'spotify': 'sp',
        'tiktok': 'ti',
        'linkedin': 'li',
        'amazon': 'am',
        'paypal': 'pm',
        'microsoft': 'microsoft'
      };
      
      // Utiliser le code court si disponible, sinon le code original
      const apiServiceCode = serviceCodeMapping[selectedService.code.toLowerCase()] || selectedService.code;
      
      console.log(`📝 [LIVE] Service: ${selectedService.code} → API code: ${apiServiceCode}`);
      
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
          .filter((c: any) => c.count > 0) // Seulement pays disponibles
          .map((c: any) => {
            // Utiliser notre prix ou celui de SMS-Activate
            const ourPrice = priceMap.get(c.countryCode.toLowerCase());
            const smsActivatePrice = c.price || 1.0;
            const finalPrice = ourPrice || smsActivatePrice;
            
            // ✅ CORRECTION: Utiliser notre DB en priorité pour success rate
            const ourSuccessRate = successRateMap.get(c.countryCode.toLowerCase());
            const smsActivateSuccessRate = c.successRate; // Peut être null
            
            // Priorité: Notre DB (plus fiable) > SMS-Activate (peut être null) > 95% par défaut
            const finalSuccessRate = ourSuccessRate || smsActivateSuccessRate || 95;
            
            return {
              id: c.countryId.toString(),
              name: c.countryName,
              code: c.countryCode,
              flag: getFlagEmoji(c.countryCode),
              successRate: Number(finalSuccessRate.toFixed(1)),
              count: c.coinsCount || Math.floor(c.price * 50), // ✅ Nombre de pièces (prix × 50)
              price: Number(finalPrice.toFixed(2)),
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
        
        // Fallback: utiliser données statiques
        const topCountries = Object.values(SMS_ACTIVATE_COUNTRIES)
          .filter(c => c.popular)
          .sort((a, b) => b.priority - a.priority);
        
        return topCountries.map(country => ({
          id: country.id.toString(),
          name: country.name,
          code: country.code,
          flag: getFlagEmoji(country.code),
          successRate: 95,
          count: 999,
          price: priceMap.get(country.code.toLowerCase()) || 1.0
        }));
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

  // Polling automatique pour vérifier les SMS reçus
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
      console.log('🚀 [ACTIVATE] Début achat:', {
        service: selectedService.code || selectedService.name,
        serviceCode: selectedService.code,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        price: selectedCountry.price,
        userId: user.id
      });

      // Vérifier le solde
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (!userData || userData.balance < selectedCountry.price) {
        toast({
          title: 'Solde insuffisant',
          description: `Besoin de ${selectedCountry.price}Ⓐ, disponible: ${userData?.balance || 0}Ⓐ`,
          variant: 'destructive'
        });
        return;
      }

      // SMS-Activate gère automatiquement la sélection d'opérateur
      // Pas besoin de sélection manuelle comme avec 5sim
      console.log('🔍 [ACTIVATE] SMS-Activate sélectionnera automatiquement le meilleur opérateur');
      
      // Acheter le numéro via Edge Function
      const requestBody = {
        country: selectedCountry.code,
        operator: 'any', // SMS-Activate choisit automatiquement le meilleur
        product: selectedService.code || selectedService.name.toLowerCase(),
        userId: user.id
      };
      
      console.log('📤 [ACTIVATE] Envoi à buy-sms-activate-number:', requestBody);
      
      const { data: buyData, error: buyError } = await supabase.functions.invoke('buy-sms-activate-number', {
        body: requestBody
      });

      console.log('📥 [ACTIVATE] Réponse:', { buyData, buyError });

      if (buyError || !buyData?.success) {
        console.error('❌ [ACTIVATE] Erreur détaillée:', { buyError, buyData });
        
        // Essayer de récupérer le message d'erreur depuis la réponse HTTP
        if (buyError && 'context' in buyError) {
          const context = (buyError as any).context;
          console.error('❌ [ACTIVATE] Context:', context);
          
          // Lire le body de la réponse pour avoir le message d'erreur
          if (context && typeof context.text === 'function') {
            try {
              const errorText = await context.text();
              console.error('❌ [ACTIVATE] Error body:', errorText);
              const errorJson = JSON.parse(errorText);
              console.error('❌ [ACTIVATE] Error JSON:', errorJson);
              throw new Error(errorJson.error || errorJson.message || 'Achat échoué');
            } catch (e) {
              console.error('❌ [ACTIVATE] Failed to parse error:', e);
            }
          }
        }
        
        throw new Error(buyData?.error || buyData?.details || buyError?.message || 'Achat échoué');
      }

      console.log('✅ [ACTIVATE] Numéro acheté:', buyData.data);

      // Recharger les activations depuis la DB
      // Le useEffect va automatiquement mettre à jour le state avec les données fraîches
      refetchActivations();
      
      // Vérifier IMMÉDIATEMENT si le SMS est déjà arrivé (détection instantanée)
      console.log('🚀 [ACTIVATE] Vérification immédiate du SMS...');
      setTimeout(async () => {
        try {
          await supabase.functions.invoke('check-sms-activate-status', {
            body: {
              activationId: buyData.data.activation_id,
              userId: user?.id
            }
          });
          // Recharger après vérification
          refetchActivations();
          console.log('✅ [ACTIVATE] Vérification immédiate terminée');
        } catch (e) {
          console.error('⚠️ [ACTIVATE] Erreur vérification immédiate:', e);
        }
      }, 1000); // Attendre 1 seconde que l'activation soit bien en DB
      
      // NE PAS changer l'étape - permettre d'acheter plusieurs numéros
      // setCurrentStep('active');

      toast({
        title: 'Numéro activé !',
        description: `${buyData.data.phone} - En attente du SMS...`,
      });

      // Réinitialiser la sélection pour permettre un nouvel achat
      setSelectedService(null);
      setSelectedCountry(null);
      setCurrentStep('service');

    } catch (error: any) {
      console.error('❌ [ACTIVATE] Exception:', error);
      toast({
        title: 'Activation échouée',
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
          <h1 className="text-xl font-bold text-gray-900 mb-5">Order number</h1>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-5">
            <button
              className="flex-1 py-2 text-sm font-semibold rounded-full transition-all bg-white text-gray-900 shadow-sm"
            >
              Activation
            </button>
            <Link
              to="/rent"
              className="flex-1 py-2 text-sm font-semibold rounded-full transition-all text-gray-600 hover:text-gray-900 text-center"
            >
              Rent
            </Link>
          </div>

          {/* STEP 1: Service Selection */}
          {currentStep === 'service' && (
            <>
              {/* CATEGORY TABS - ULTRA RAPIDE */}
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { id: 'all', name: '🌟 All', emoji: '' },
                  { id: 'social', name: 'Social', emoji: '💬' },
                  { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
                  { id: 'finance', name: 'Finance', emoji: '💰' },
                  { id: 'delivery', name: 'Delivery', emoji: '🚗' },
                  { id: 'tech', name: 'Tech', emoji: '💻' },
                  { id: 'dating', name: 'Dating', emoji: '❤️' },
                  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
                  { id: 'entertainment', name: 'Media', emoji: '🎬' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>

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

              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">
                {selectedCategory === 'all' ? 'POPULAR' : selectedCategory.toUpperCase()} ({filteredServices.length} services)
              </p>

              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
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
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm text-gray-900 truncate">{country.name}</p>
                              <span className={`${getSuccessRateBadge(country.successRate).bg} ${getSuccessRateBadge(country.successRate).text} px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0`}>
                                {country.successRate}%
                              </span>
                            </div>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              {country.count.toLocaleString()} pièces
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
                        {selectedCountry.count.toLocaleString()} pièces
                      </p>
                    </div>
                    <button onClick={() => setCurrentStep('country')} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                      <X className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>

                  <Button 
                    onClick={handleActivate}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6"
                  >
                    <span>Activate</span>
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
                      <span className="text-2xl">{Math.floor(selectedCountry.price)}</span>
                      <span className="text-sm">Ⓐ</span>
                    </div>
                  </Button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    If the number does not receive an SMS, the funds will be returned to the balance
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
                      <p className="font-semibold text-[15px] text-gray-900 leading-tight truncate">{num.service} + ...</p>
                      <p className="text-[13px] text-gray-500 leading-tight">{num.country}</p>
                    </div>

                    {/* Phone (180px) */}
                    <div className="flex items-center gap-2 w-[180px] flex-shrink-0">
                      <span className="font-mono text-[15px] font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{num.phone}</span>
                      <button
                        onClick={() => copyToClipboard(num.phone)}
                        className="p-1 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Copy className="h-4 w-4 text-blue-500" />
                      </button>
                    </div>

                    {/* Flexible right section */}
                    <div className="flex items-center gap-4 flex-1 justify-end">
                      {/* Code bleu OU Waiting spinner */}
                      {num.smsCode ? (
                        <div className="bg-[#007AFF] text-white rounded-2xl rounded-tr-md px-4 py-2.5 shadow-md max-w-md">
                          <span className="font-medium text-[14px] leading-relaxed">
                            {num.smsText || `Votre code de validation YouTube est ${num.smsCode}`}
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

                      {/* Badge (40px fixe) */}
                      <div className="flex items-center justify-center w-[40px] h-[40px] bg-[#E5E5E5] text-gray-600 rounded-full flex-shrink-0">
                        <span className="text-[13px] font-semibold">{Math.floor(num.price)}</span>
                        <span className="text-[11px] ml-0.5">Ⓐ</span>
                      </div>

                      {/* Timer (only when waiting) */}
                      {(num.status === 'waiting' || num.status === 'pending') && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="text-[13px]">
                            <span className="text-gray-400">Remaining:</span>
                            <br/>
                            <span className="font-semibold text-gray-900">{Math.floor(getRealTimeRemaining(num.expiresAt) / 60)} min.</span>
                          </div>
                        </div>
                      )}

                      {/* Menu dropdown - Show actions based on status */}
                      {!num.smsCode && (num.status === 'waiting' || num.status === 'pending') ? (
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
                              onClick={() => cancelActivation(num.id, num.orderId)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : num.smsCode ? (
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
                              <Clock className="h-4 w-4 mr-2" />
                              Marquer comme terminé
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
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
