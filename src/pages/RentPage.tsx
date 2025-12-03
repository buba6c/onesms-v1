import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Copy, RefreshCw, Plus, ChevronDown, ChevronUp, Mail, Loader2, AlertTriangle, Wallet, LogIn } from 'lucide-react'
import { getServiceLogo, getCountryFlag, getFlagEmoji } from '@/lib/logo-service'

interface Service { code: string; name: string; display_name?: string; available: number; total?: number; cost?: number; sellingPrice?: number }
interface Country { id: number; code: string; name: string; available: boolean }
interface Rental { id: string; rental_id: string; phone: string; service_code: string; country_code: string; price: number; rent_hours: number; status: string; end_date: string; created_at: string }
interface Message { text: string; code: string | null; service: string; date: string }
interface RentDuration { hours: number; label: string; description: string; price: number; loading?: boolean; available?: number }

// ============================================================================
// 🗺️ MAPPING SMS-ACTIVATE ID → NOM DU PAYS
// ============================================================================
const SMS_ACTIVATE_ID_TO_NAME: Record<string, string> = {
  '0': 'Russia', '1': 'Ukraine', '2': 'Kazakhstan', '3': 'China', '4': 'Philippines',
  '5': 'Myanmar', '6': 'Indonesia', '7': 'Malaysia', '8': 'Kenya', '9': 'Tanzania',
  '10': 'Vietnam', '11': 'Kyrgyzstan', '12': 'England', '13': 'Israel', '14': 'Hong Kong',
  '15': 'Poland', '16': 'Egypt', '17': 'Nigeria', '18': 'Macau', '19': 'Morocco',
  '20': 'Ghana', '21': 'Argentina', '22': 'India', '23': 'Uzbekistan', '24': 'Cambodia',
  '25': 'Cameroon', '26': 'Chad', '27': 'Germany', '28': 'Lithuania', '29': 'Croatia',
  '30': 'Sweden', '31': 'Iraq', '32': 'Romania', '33': 'Colombia', '34': 'Austria',
  '35': 'Belarus', '36': 'Canada', '37': 'Saudi Arabia', '38': 'Mexico', '39': 'South Africa',
  '40': 'Spain', '41': 'Iran', '42': 'Algeria', '43': 'Netherlands', '44': 'Bangladesh',
  '45': 'Brazil', '46': 'Turkey', '47': 'Japan', '48': 'South Korea', '49': 'Taiwan',
  '50': 'Singapore', '51': 'UAE', '52': 'Thailand', '53': 'Pakistan', '54': 'Nepal',
  '55': 'Sri Lanka', '56': 'Portugal', '57': 'New Zealand', '58': 'Italy', '59': 'Belgium',
  '60': 'Switzerland', '61': 'Greece', '62': 'Czech Republic', '63': 'Hungary', '64': 'Denmark',
  '65': 'Norway', '66': 'Finland', '67': 'Ireland', '68': 'Slovakia', '69': 'Bulgaria',
  '70': 'Serbia', '71': 'Slovenia', '72': 'North Macedonia', '73': 'Peru', '74': 'Chile',
  '78': 'France', '175': 'Australia', '187': 'USA', '196': 'Senegal',
  // Par code pays
  'russia': 'Russia', 'indonesia': 'Indonesia', 'india': 'India', 'usa': 'USA',
  'brazil': 'Brazil', 'france': 'France', 'germany': 'Germany', 'england': 'England'
};

const getCountryName = (code: string): string => {
  if (!code) return 'Unknown';
  const cleanCode = code.replace(/^rent-/i, '');
  const name = SMS_ACTIVATE_ID_TO_NAME[cleanCode] || SMS_ACTIVATE_ID_TO_NAME[cleanCode.toLowerCase()];
  if (name) return name;
  if (/^\d+$/.test(cleanCode)) return SMS_ACTIVATE_ID_TO_NAME[cleanCode] || `Country ${cleanCode}`;
  return cleanCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Durées de base - les prix seront récupérés dynamiquement
// Labels will be translated in the component using t()
const BASE_RENT_DURATIONS: RentDuration[] = [
  { hours: 4, label: '4hours', description: 'quickRental', price: 0 },
  { hours: 24, label: '1day', description: '24hours', price: 0 },
  { hours: 168, label: '1week', description: '7days', price: 0 },
  { hours: 720, label: '1month', description: '30days', price: 0 }
]

const RentPage = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState<'service' | 'country' | 'duration' | 'confirm'>('country')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<RentDuration | null>(null)
  const [searchService, setSearchService] = useState('')
  const [searchCountry, setSearchCountry] = useState('')
  const [isRenting, setIsRenting] = useState(false)
  const [expandedRental, setExpandedRental] = useState<string | null>(null)
  
  // State pour le modal de solde insuffisant
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false)
  const [insufficientBalanceData, setInsufficientBalanceData] = useState<{
    needed: number
    available: number
    missing: number
  } | null>(null)

  // =========================================================================
  // AUTH GUARD - Rediriger si pas connecté
  // =========================================================================
  useEffect(() => {
    if (!user) {
      console.warn('[RentPage] User not authenticated, redirecting to login')
      toast.error(t('errors.authRequired') || 'Vous devez être connecté pour accéder à cette page')
      navigate('/login', { replace: true })
    }
  }, [user, navigate, t])

  // =========================================================================
  // 1. Récupérer les PAYS RENT disponibles directement depuis l'API
  // =========================================================================
  const { data: countries = [], isLoading: countriesLoading, error: countriesError } = useQuery({
    queryKey: ['rent-countries-api'],
    queryFn: async () => {
      console.log('[RentPage] Fetching countries...')
      const { data, error } = await supabase.functions.invoke('get-rent-services', {
        body: { getCountries: true, rentTime: '4' }
      })
      if (error) {
        console.error('[RentPage] Edge Function error:', error)
        throw new Error(error.message || 'Failed to call edge function')
      }
      if (!data?.success) {
        console.error('[RentPage] API error:', data?.error)
        throw new Error(data?.error || 'API returned error')
      }
      console.log(`[RentPage] ✅ ${data.countries?.length || 0} countries loaded`)
      return data.countries as Country[]
    },
    enabled: !!user, // Seulement si user connecté
    staleTime: 300000, // Cache 5 minutes
    retry: 2,
    onError: (error: any) => {
      console.error('[RentPage] Countries query error:', error)
      toast.error(t('rent.errorLoadingCountries') || 'Erreur de chargement des pays')
    }
  })

  // =========================================================================
  // 2. Récupérer les SERVICES disponibles pour le pays sélectionné
  // =========================================================================
  const { data: servicesData, isLoading: servicesLoading, error: servicesError, refetch: refetchServices } = useQuery({
    queryKey: ['rent-services-api', selectedCountry?.id],
    queryFn: async () => {
      if (!selectedCountry) return { services: [], availableServices: [] }
      console.log(`[RentPage] Fetching services for country ${selectedCountry.name}...`)
      const { data, error } = await supabase.functions.invoke('get-rent-services', {
        body: { country: selectedCountry.id.toString(), rentTime: '4' }
      })
      if (error) throw new Error(error.message || 'Edge function error')
      if (!data?.success) throw new Error(data?.error || 'API error')
      console.log(`[RentPage] ✅ ${data.availableServices?.length || 0} services loaded`)
      return {
        services: data.services || {},
        availableServices: (data.availableServices || []) as Service[]
      }
    },
    enabled: !!selectedCountry && !!user,
    staleTime: 60000, // Cache 1 minute
    retry: 2,
    onError: (error: any) => {
      console.error('[RentPage] Services query error:', error)
      toast.error(t('rent.errorLoadingServices') || 'Erreur de chargement des services')
    }
  })

  const { data: rentals = [], isLoading: rentalsLoading, error: rentalsError, refetch: refetchRentals } = useQuery({
    queryKey: ['rentals', user?.id],
    queryFn: async () => {
      console.log(`[RentPage] Fetching rentals for user ${user?.id}...`)
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[RentPage] Rentals DB error:', error)
        throw error
      }
      console.log(`[RentPage] ✅ ${data?.length || 0} rentals loaded`)
      return data as Rental[]
    },
    enabled: !!user,
    retry: 2,
    onError: (error: any) => {
      console.error('[RentPage] Rentals query error:', error)
      toast.error(t('rent.errorLoadingRentals') || 'Erreur de chargement des locations')
    }
  })

  // =========================================================================
  // 3. Récupérer les PRIX pour chaque durée (service + pays sélectionnés)
  // =========================================================================
  const { data: rentPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['rent-prices', selectedService?.code, selectedCountry?.id],
    queryFn: async () => {
      if (!selectedService?.code || !selectedCountry?.id) return null
      
      const prices: Record<number, { price: number; available: number }> = {}
      
      // Récupérer les prix pour toutes les durées en parallèle
      await Promise.all(BASE_RENT_DURATIONS.map(async (duration) => {
        try {
          const { data } = await supabase.functions.invoke('get-rent-services', {
            body: { 
              rentTime: duration.hours.toString(),
              country: selectedCountry.id.toString()
            }
          })
          
          if (data?.services) {
            const serviceData = data.services[selectedService.code]
            if (serviceData) {
              prices[duration.hours] = {
                price: serviceData.sellingPrice || Math.ceil(serviceData.cost * 1.3 * 100) / 100,
                available: serviceData.available || 0
              }
            }
          }
        } catch (e) {
          console.warn(`Erreur récupération prix ${duration.hours}h:`, e)
        }
      }))
      
      return prices
    },
    enabled: !!selectedService?.code && !!selectedCountry?.id && currentStep === 'duration',
    staleTime: 60000
  })

  // Construire les durées avec les prix dynamiques
  const rentDurations = useMemo(() => {
    return BASE_RENT_DURATIONS.map(d => ({
      ...d,
      price: rentPrices?.[d.hours]?.price ?? 0,
      available: rentPrices?.[d.hours]?.available ?? 0,
      loading: pricesLoading && !(rentPrices && rentPrices[d.hours])
    }))
  }, [rentPrices, pricesLoading])

  // Services filtrés (depuis l'API)
  const services = servicesData?.availableServices || []
  const filteredServices = services.filter(s => 
    s.code.toLowerCase().includes(searchService.toLowerCase()) ||
    (s.name && s.name.toLowerCase().includes(searchService.toLowerCase()))
  )

  const fetchRentalInbox = async (rentalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-sms-activate-inbox', { body: { rentalId, userId: user?.id } })
      if (error || !data?.success) throw new Error(data?.error || 'Failed to fetch inbox')
      return data.data.messages as Message[]
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch inbox')
      return []
    }
  }

  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(searchCountry.toLowerCase()))

  const handleRent = async () => {
    if (!selectedService || !selectedCountry || !selectedDuration) return
    setIsRenting(true)
    try {
      // Vérifier le solde avant d'appeler l'API (en tenant compte du frozen_balance)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', user?.id)
        .single()
      
      // Si erreur DB, utiliser le balance du store comme fallback
      // solde = balance - frozen_balance (solde disponible)
      const totalBalance = userData?.balance ?? user?.balance ?? 0
      const frozenBalance = userData?.frozen_balance ?? 0
      const solde = totalBalance - frozenBalance
      const requiredPrice = selectedDuration.price

      // Log pour debug si erreur
      if (userError) {
        console.warn('[handleRent] Erreur récupération solde DB:', userError.message, '- Utilisation balance store:', user?.balance)
      }
      
      // Vérifier si le solde est suffisant
      if (solde < requiredPrice) {
        const missing = requiredPrice - solde
        setInsufficientBalanceData({
          needed: requiredPrice,
          available: solde,
          missing: Math.ceil(missing)
        })
        setShowInsufficientBalanceDialog(true)
        setIsRenting(false)
        return
      }

      const { data, error } = await supabase.functions.invoke('buy-sms-activate-rent', {
        body: { 
          product: selectedService.code, 
          country: `rent-${selectedCountry.id}`, 
          duration: `${selectedDuration.hours}hours`,
          userId: user?.id,
          expectedPrice: selectedDuration.price
        }
      })
      
      // Vérifier si l'erreur est liée au solde insuffisant
      if (error || !data?.success) {
        const errorMessage = data?.error || error?.message || 'Rental failed'
        if (errorMessage.toLowerCase().includes('solde insuffisant') || errorMessage.toLowerCase().includes('insufficient')) {
          const match = errorMessage.match(/Disponible:\s*(\d+).*Requis:\s*(\d+)/i)
          if (match) {
            setInsufficientBalanceData({
              needed: parseInt(match[2]),
              available: parseInt(match[1]),
              missing: parseInt(match[2]) - parseInt(match[1])
            })
          } else {
            setInsufficientBalanceData({
              needed: requiredPrice,
              available: availableBalance,
              missing: Math.ceil(requiredPrice - availableBalance)
            })
          }
          setShowInsufficientBalanceDialog(true)
          setIsRenting(false)
          return
        }
        throw new Error(errorMessage)
      }
      
      toast.success(t('rent.success') || 'Number rented!', { description: `${data.data.phone} - ${selectedDuration.hours}h` })
      setCurrentStep('country')
      setSelectedService(null)
      setSelectedCountry(null)
      setSelectedDuration(null)
      // Invalider le cache et forcer un refetch immédiat
      await queryClient.invalidateQueries({ queryKey: ['rentals', user?.id] })
      refetchRentals()
    } catch (error: any) {
      toast.error(t('rent.failed') || 'Rental failed', { description: error.message })
    } finally {
      setIsRenting(false)
    }
  }

  const handleExtendRental = async (rentalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('continue-sms-activate-rent', { body: { rentalId, userId: user?.id } })
      if (error || !data?.success) throw new Error(data?.error || 'Extension failed')
      toast.success('Rental extended!', { description: `New end: ${new Date(data.data.end_date).toLocaleString()}` })
      refetchRentals()
    } catch (error: any) {
      toast.error(t('rent.extensionFailed'), { description: error.message })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('rent.copied'))
  }

  const getRemainingTime = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now()
    if (diff <= 0) return t('rent.expired')
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 24) return `${Math.floor(hours/24)}j ${hours%24}h`
    return `${hours}h ${mins}m`
  }

  // =========================================================================
  // GUARDS - Loading et Auth
  // =========================================================================
  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="p-8 text-center max-w-md mx-auto">
          <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">{t('errors.authRequired') || 'Authentification requise'}</h2>
          <p className="text-muted-foreground mb-4">
            {t('rent.loginRequired') || 'Vous devez être connecté pour louer des numéros'}
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            <LogIn className="w-4 h-4 mr-2" />
            {t('common.login') || 'Se connecter'}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 pt-8 lg:pt-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('rent.title')}</h1>
        <Button onClick={() => refetchRentals()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2"/>
          {t('rent.refresh')}
        </Button>
      </div>

      {/* Section: Mes locations actives */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('rent.activeRentals')}</h2>
        
        {rentalsLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('rent.loading')}</p>
          </Card>
        ) : rentalsError ? (
          <Card className="p-8 text-center border-red-200 bg-red-50 dark:bg-red-900/10">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h3 className="font-semibold mb-2 text-red-600">{t('errors.loadingFailed')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{rentalsError.message}</p>
            <Button onClick={() => refetchRentals()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.retry') || 'Réessayer'}
            </Button>
          </Card>
        ) : rentals.length === 0 ? (
          <Card className="p-8 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground"/>
            <p className="text-muted-foreground">{t('rent.noActiveRentals')}</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {rentals.map(r => <RentalCard key={r.id} rental={r} expanded={expandedRental===r.id} onToggle={()=>setExpandedRental(expandedRental===r.id?null:r.id)} onCopy={copyToClipboard} onExtend={handleExtendRental} onFetchInbox={fetchRentalInbox} getRemainingTime={getRemainingTime} t={t}/>)}
          </div>
        )}
      </div>

      {/* Section: Louer un nouveau numéro */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{t('rent.rentNewNumber')}</h2>
        
        {/* Indicateurs d'étapes */}
        <div className="flex justify-center mb-6 gap-2">
          <StepIndicator step={1} label={t('rent.steps.country')} active={currentStep==='country'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={2} label={t('rent.steps.service')} active={currentStep==='service'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={3} label={t('rent.steps.duration')} active={currentStep==='duration'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={4} label={t('rent.steps.confirm')} active={currentStep==='confirm'}/>
        </div>

        {/* STEP 1: Sélection du pays */}
        {currentStep==='country' && (
          <div className="space-y-4">
            {countriesError ? (
              <Card className="p-8 text-center border-red-200 bg-red-50 dark:bg-red-900/10">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
                <h3 className="font-semibold mb-2 text-red-600">{t('rent.errorLoadingCountries')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{countriesError.message}</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['rent-countries-api'] })} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.retry') || 'Réessayer'}
                </Button>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  {countriesLoading ? t('rent.loading') : t('rent.countrySelectHint', { count: countries.length })}
                </p>
                <Input 
                  placeholder={t('rent.searchCountry')} 
                  value={searchCountry} 
                  onChange={(e)=>setSearchCountry(e.target.value)}
                  disabled={countriesLoading}
                />
                {countriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary"/>
                    <span>{t('rent.loadingCountries')}</span>
                  </div>
                ) : filteredCountries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {countries.length === 0 
                      ? t('rent.noCountriesAvailable') || 'Aucun pays disponible'
                      : t('rent.noCountriesMatchingSearch') || 'Aucun pays ne correspond à votre recherche'
                    }
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {filteredCountries.map(c=><Button key={c.id} variant={selectedCountry?.id===c.id?'default':'outline'} className="justify-start" onClick={()=>{setSelectedCountry(c);setSelectedService(null);setCurrentStep('service')}}><span className="mr-2">{getFlagEmoji(c.code)}</span>{c.name}</Button>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* STEP 2: Sélection du service */}
        {currentStep==='service' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={()=>{setCurrentStep('country');setSelectedCountry(null)}}>
                {t('rent.back')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name}
              </span>
            </div>
            
            {servicesError ? (
              <Card className="p-8 text-center border-red-200 bg-red-50 dark:bg-red-900/10">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
                <h3 className="font-semibold mb-2 text-red-600">{t('rent.errorLoadingServices')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{servicesError.message}</p>
                <Button onClick={() => refetchServices()} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.retry') || 'Réessayer'}
                </Button>
              </Card>
            ) : (
              <>
                <Input 
                  placeholder={t('rent.searchService')} 
                  value={searchService} 
                  onChange={(e)=>setSearchService(e.target.value)}
                  disabled={servicesLoading}
                />
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary"/>
                    <span>{t('rent.loadingServices')}</span>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {services.length === 0
                      ? t('rent.noServicesForCountry') || 'Aucun service disponible pour ce pays'
                      : t('rent.noServicesMatchingSearch') || 'Aucun service ne correspond à votre recherche'
                    }
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {filteredServices.map(s=><Button key={s.code} variant={selectedService?.code===s.code?'default':'outline'} className="h-auto py-4 flex flex-col gap-2 relative" onClick={()=>{setSelectedService(s);setCurrentStep('duration')}}><img src={getServiceLogo(s.code)} alt={s.code} className="w-8 h-8" onError={(e)=>(e.target as HTMLImageElement).src='/placeholder-service.png'}/><span className="text-sm font-medium">{s.code.toUpperCase()}</span><span className="text-xs text-muted-foreground">{s.available} {t('rent.available')}</span></Button>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentStep==='duration' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4"><Button variant="outline" size="sm" onClick={()=>setCurrentStep('service')}>{t('rent.back')}</Button><span className="text-sm text-muted-foreground">{getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name} • {selectedService?.code.toUpperCase()}</span></div>
            <div className="grid gap-3">
              {rentDurations.map(d=><Button key={d.hours} variant={selectedDuration?.hours===d.hours?'default':'outline'} className="h-auto py-4 justify-between" onClick={()=>{setSelectedDuration(d);setCurrentStep('confirm')}} disabled={d.loading || d.price === 0 || d.available === 0}><div className="text-left"><div className="font-medium">{t(`rent.durations.${d.label}`)}</div><div className="text-sm text-muted-foreground">{t(`rent.durations.${d.description}`)} {d.available > 0 && `• ${d.available} ${t('rent.available')}`}</div></div>{d.loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <div className="text-lg font-bold">{d.price > 0 ? `$${d.price.toFixed(2)}` : t('rent.notAvailable')}</div>}</Button>)}
            </div>
            {pricesLoading && <p className="text-sm text-muted-foreground text-center">{t('rent.loadingPrices')}</p>}
          </div>
        )}

        {currentStep==='confirm' && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={()=>setCurrentStep('duration')}>{t('rent.back')}</Button>
            <Card className="p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.country')}:</span><span className="font-medium">{getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.service')}:</span><span className="font-medium">{selectedService?.code.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.duration')}:</span><span className="font-medium">{t(`rent.durations.${selectedDuration?.label}`)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.available')}:</span><span className="font-medium">{selectedDuration?.available} {t('rent.numbers')}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>{t('rent.total')}:</span><span>${selectedDuration?.price.toFixed(2)}</span></div>
            </Card>
            <Button onClick={handleRent} disabled={isRenting} className="w-full" size="lg">{isRenting?<><Loader2 className="w-4 h-4 animate-spin mr-2"/>{t('rent.renting')}</>:t('rent.confirmRental')}</Button>
          </div>
        )}
      </Card>
      {/* Modal de solde insuffisant */}
      <Dialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <DialogTitle className="text-lg sm:text-xl">{t('insufficientBalance.title')}</DialogTitle>
            </div>
            <DialogDescription className="text-sm sm:text-base">
              {t('insufficientBalance.description')}
            </DialogDescription>
          </DialogHeader>
          
          {insufficientBalanceData && (
            <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
              <div className="flex justify-between items-center p-2.5 sm:p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t('insufficientBalance.needed')}</span>
                <span className="font-bold text-base sm:text-lg">{insufficientBalanceData.needed.toFixed(0)} Ⓐ</span>
              </div>
              <div className="flex justify-between items-center p-2.5 sm:p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t('insufficientBalance.available')}</span>
                <span className="font-semibold text-base sm:text-lg">{insufficientBalanceData.available.toFixed(0)} Ⓐ</span>
              </div>
              <div className="flex justify-between items-center p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{t('insufficientBalance.missing')}</span>
                <span className="font-bold text-base sm:text-lg text-red-600 dark:text-red-400">{insufficientBalanceData.missing.toFixed(0)} Ⓐ</span>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientBalanceDialog(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                setShowInsufficientBalanceDialog(false)
                navigate('/top-up')
              }}
              className="w-full sm:w-auto gap-2 order-1 sm:order-2"
            >
              <Wallet className="w-4 h-4" />
              {t('insufficientBalance.topUp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const StepIndicator=({step,label,active}:{step:number;label:string;active:boolean})=>(
  <div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${active?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{step}</div><span className={`text-xs mt-1 ${active?'text-primary font-medium':'text-muted-foreground'}`}>{label}</span></div>
)

const RentalCard=({rental,expanded,onToggle,onCopy,onExtend,onFetchInbox,getRemainingTime,t}:{rental:Rental;expanded:boolean;onToggle:()=>void;onCopy:(t:string)=>void;onExtend:(id:string)=>void;onFetchInbox:(id:string)=>Promise<Message[]>;getRemainingTime:(d:string)=>string;t:(key:string)=>string})=>{
  const [messages,setMessages]=useState<Message[]>([])
  const [loading,setLoading]=useState(false)
  const handleExpand=async()=>{if(!expanded){setLoading(true);setMessages(await onFetchInbox(rental.id));setLoading(false)}onToggle()}
  return(
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1"><img src={getServiceLogo(rental.service_code)} alt={rental.service_code} className="w-10 h-10"/><div><div className="font-medium">{rental.phone}</div><div className="text-sm text-muted-foreground">{rental.service_code} • {getCountryName(rental.country_code)}</div></div></div>
        <div className="flex items-center gap-2"><div className="text-right mr-4"><div className="text-sm font-medium">{getRemainingTime(rental.end_date)}</div><div className="text-xs text-muted-foreground">${rental.price.toFixed(2)}</div></div><Button variant="outline" size="sm" onClick={()=>onCopy(rental.phone)}><Copy className="w-4 h-4"/></Button>{/* Bouton Prolonger masqué */}<Button variant="ghost" size="sm" onClick={handleExpand}>{expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</Button></div>
      </div>
      {expanded&&<div className="mt-4 pt-4 border-t space-y-3"><div className="flex justify-between mb-2"><h4 className="font-medium">{t('rent.smsInbox')} ({messages.length})</h4><Button variant="outline" size="sm" onClick={handleExpand} disabled={loading}><RefreshCw className={`w-3 h-3 ${loading?'animate-spin':''}`}/></Button></div>{loading?<div className="text-center py-4 text-muted-foreground">{t('rent.loading')}</div>:messages.length===0?<div className="text-center py-4 text-muted-foreground">{t('rent.noMessages')}</div>:<div className="space-y-2 max-h-64 overflow-y-auto">{messages.map((m,i)=><Card key={i} className="p-3"><div className="flex justify-between mb-1"><span className="text-xs text-muted-foreground">{m.service}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleString()}</span></div><div className="text-sm">{m.text}</div>{m.code&&<div className="mt-2 flex items-center gap-2"><code className="bg-muted px-2 py-1 rounded text-sm font-mono">{m.code}</code><Button variant="ghost" size="sm" onClick={()=>onCopy(m.code!)}><Copy className="w-3 h-3"/></Button></div>}</Card>)}</div>}</div>}
    </Card>
  )
}

export default RentPage
