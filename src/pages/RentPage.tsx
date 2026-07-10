/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { supabase, cloudFunctions } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, Copy, RefreshCw, Plus, ChevronDown, ChevronUp, Mail, Loader2, Clock, Timer } from 'lucide-react'
import { getServiceLogo, getCountryFlag, getFlagEmoji } from '@/lib/logo-service'

interface Service { code: string; name: string; display_name?: string; available: number; total?: number; cost?: number; sellingPrice?: number }
interface Country { id: number; code: string; name: string; available: boolean }
interface Rental { id: string; rental_id: string; phone: string; service_code: string; country_code: string; price: number; rent_hours: number; status: string; end_date: string; created_at: string; provider?: string }
interface Message { text: string; code: string | null; service: string; date: string }
interface RentDuration { hours: number; label: string; description: string; price: number; loading?: boolean; available?: number }

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
  const [currentStep, setCurrentStep] = useState<'service' | 'country' | 'duration' | 'confirm'>('country')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<RentDuration | null>(null)
  const [searchService, setSearchService] = useState('')
  const [searchCountry, setSearchCountry] = useState('')
  const [isRenting, setIsRenting] = useState(false)
  const [expandedRental, setExpandedRental] = useState<string | null>(null)

  // Extension dialog states
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [extendingRental, setExtendingRental] = useState<Rental | null>(null)
  const [extensionHours, setExtensionHours] = useState<string>('4')
  const [isExtending, setIsExtending] = useState(false)
  const [extensionPrice, setExtensionPrice] = useState<number | null>(null)
  const [extensionPriceLoading, setExtensionPriceLoading] = useState(false)
  const [extensionError, setExtensionError] = useState<string | null>(null)
  const [userCanAfford, setUserCanAfford] = useState(true)

  // =========================================================================
  // 1. Récupérer les PAYS RENT disponibles directement depuis l'API
  // =========================================================================
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['rent-countries'],
    queryFn: async () => {
      const { data, error } = await cloudFunctions.invoke('get-sms-activate-rent-services', {
        body: { getCountries: true }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Failed to fetch rent countries')
      return data.countries as Country[]
    },
    staleTime: 300000, // Cache 5 minutes
    retry: false // Prevent rate limit spam
  })

  // =========================================================================
  // 2. Récupérer les SERVICES disponibles pour le pays sélectionné
  // =========================================================================
  const { data: pricingData, isLoading: pricingLoading, refetch: refetchPricing } = useQuery({
    queryKey: ['rent-pricing', selectedCountry?.id],
    queryFn: async () => {
      if (!selectedCountry) return { pricing: {}, availableServices: [], available: false }
      const { data, error } = await cloudFunctions.invoke('get-sms-activate-rent-services', {
        body: { country: selectedCountry.id.toString(), time: 4 }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Failed to fetch pricing')
      return {
        pricing: data.pricing || {},
        availableServices: data.availableServices || [],
        available: data.availableServices?.length > 0 || !!data.pricing?.full
      }
    },
    enabled: !!selectedCountry,
    staleTime: 60000,
    retry: false
  })

  const { data: rentals = [], isLoading: rentalsLoading, refetch: refetchRentals } = useQuery({
    queryKey: ['rentals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('rentals').select('*').eq('user_id', user?.id).order('created_at', { ascending: false })
      if (error) throw error
      return data as Rental[]
    },
    enabled: !!user
  })

  const SMS_ACTIVATE_RENT_DURATIONS: RentDuration[] = [
    { hours: 4, label: '4hours', description: 'quickRental', price: 0 },
    { hours: 24, label: '1day', description: '24hours', price: 0 },
    { hours: 168, label: '1week', description: '7days', price: 0 },
    { hours: 720, label: '1month', description: '30days', price: 0 }
  ]

  const rentDurations = useMemo(() => {
    // Estimating prices for longer durations based on the 4-hour base price returned by the API
    const basePrice = selectedService?.cost || pricingData?.pricing?.full?.price || 15
    const available = selectedService?.available || pricingData?.pricing?.full?.available || 0
    return SMS_ACTIVATE_RENT_DURATIONS.map(d => ({
      ...d,
      price: d.hours === 4 ? basePrice : d.hours === 24 ? Math.ceil(basePrice * 1.5) : d.hours === 168 ? Math.ceil(basePrice * 4.5) : Math.ceil(basePrice * 12),
      available: available > 0 ? 999 : 0,
      loading: pricingLoading
    }))
  }, [pricingData, pricingLoading, selectedService])

  // Services filtrés (depuis l'API)
  const services = pricingData?.availableServices || []
  const filteredServices = services.filter(s =>
    s.code.toLowerCase().includes(searchService.toLowerCase()) ||
    (s.name && s.name.toLowerCase().includes(searchService.toLowerCase()))
  ).sort((a, b) => {
    // Les services dispos (available > 0) d'abord, puis par disponibilité décroissante
    if (a.available > 0 && b.available === 0) return -1;
    if (b.available > 0 && a.available === 0) return 1;
    return b.available - a.available;
  })

  const fetchRentalInbox = async (rentalId: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId)
      if (!rental) return []

      // Route to appropriate provider
      const functionName = rental.provider === 'smspool'
        ? 'check-smspool-rental'
        : rental.provider === 'onlinesim'
          ? 'get-onlinesim-rent-inbox'
          : 'get-rent-status'

      const { data, error } = await cloudFunctions.invoke(functionName, {
        body: { rentalId, userId: user?.id }
      })

      if (error || !data?.success) throw new Error(data?.error || 'Failed to fetch inbox')
      return data.data.messages as Message[]
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch inbox')
      return []
    }
  }

  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(searchCountry.toLowerCase()))

  const handleRent = async () => {
    if (!selectedCountry || !selectedDuration) return
    setIsRenting(true)
    try {
      const { data, error } = await cloudFunctions.invoke('buy-sms-activate-rent', {
        body: {
          country: selectedCountry.id.toString(),
          product: selectedService?.code || 'full',
          duration: selectedDuration.label,
          userId: user?.id
        }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Rental failed')
      toast.success(t('rent.success', 'Numéro loué !'), { description: `${data.data.phone} - ${t('rent.activeFor', 'Actif pour')} ${t(`rent.durations.${selectedDuration.label}`, selectedDuration.label)}` })
      setCurrentStep('country')
      setSelectedCountry(null)
      setSelectedDuration(null)
      refetchRentals()
    } catch (error: any) {
      toast.error(t('rent.failed', 'Location échouée'), { description: error.message })
    } finally {
      setIsRenting(false)
    }
  }

  // Fetch extension price
  const fetchExtensionPrice = async (rentalId: string, hours: number) => {
    setExtensionPriceLoading(true)
    setExtensionError(null)
    setExtensionPrice(null)
    try {
      const { data, error } = await cloudFunctions.invoke('get-rent-extension-price', {
        body: { rentalId, userId: user?.id, hours }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Impossible d\'obtenir le prix')
      setExtensionPrice(data.data.price)
      setUserCanAfford(data.data.canAfford)
    } catch (err: any) {
      setExtensionError(err.message)
    } finally {
      setExtensionPriceLoading(false)
    }
  }

  // Open extension dialog
  const handleExtendRental = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId)
    if (!rental) return
    setExtendingRental(rental)
    const defaultHours = rental.rent_hours || 4
    setExtensionHours(String(defaultHours))
    setExtensionPrice(null)
    setExtensionError(null)
    setExtendDialogOpen(true)
    fetchExtensionPrice(rental.id, defaultHours)
  }

  // Handle hours change
  const handleExtensionHoursChange = (hours: string) => {
    setExtensionHours(hours)
    if (extendingRental) fetchExtensionPrice(extendingRental.id, parseInt(hours))
  }

  // Perform extension with selected duration
  const performExtension = async () => {
    if (!extendingRental || isExtending || !extensionPrice) return
    setIsExtending(true)
    try {
      const { data, error } = await cloudFunctions.invoke('continue-sms-activate-rent', {
        body: { rentalId: extendingRental.id, userId: user?.id, hours: parseInt(extensionHours) }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Extension failed')
      toast.success(t('rent.rentalExtended'), {
        description: `+${data.data.hours}h • ${data.data.price}Ⓐ • ${t('rent.newEnd')}: ${new Date(data.data.end_date).toLocaleString()}`
      })
      setExtendDialogOpen(false)
      setExtendingRental(null)
      setExtensionPrice(null)
      refetchRentals()
    } catch (error: any) {
      toast.error(t('rent.extensionFailed'), { description: error.message })
    } finally {
      setIsExtending(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('rent.copied'))
  }

  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const getRemainingTime = (endDate: string) => {
    const diff = new Date(endDate).getTime() - currentTime
    if (diff <= 0) return t('rent.expired')
    const totalSeconds = Math.floor(diff / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hours > 24) return `${Math.floor(hours / 24)}j ${hours % 24}h`
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('rent.title')}</h1>
        <Button onClick={() => refetchRentals()} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" />{t('rent.refresh')}</Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('rent.activeRentals')}</h2>
        {rentalsLoading ? <Card className="p-4">{t('rent.loading')}</Card> : rentals.length === 0 ? (
          <Card className="p-8 text-center"><Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p>{t('rent.noActiveRentals')}</p></Card>
        ) : (
          <div className="grid gap-4">
            {rentals.map(r => <RentalCard key={r.id} rental={r} expanded={expandedRental === r.id} onToggle={() => setExpandedRental(expandedRental === r.id ? null : r.id)} onCopy={copyToClipboard} onExtend={handleExtendRental} onFetchInbox={fetchRentalInbox} getRemainingTime={getRemainingTime} t={t} />)}
          </div>
        )}
      </div>

      <Card className="p-6 relative overflow-hidden min-h-[300px] border-blue-100 dark:border-blue-900/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-cyan-400/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-blue-400/5 rounded-full blur-2xl -z-10 -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">{t('rent.rentNewNumber')}</h2>
        <div className="flex justify-center mb-6 gap-2">
          <StepIndicator step={1} label={t('rent.steps.country')} active={currentStep === 'country'} />
          <div className="w-8 h-px bg-border my-auto" />
          <StepIndicator step={2} label={t('rent.service')} active={currentStep === 'service'} />
          <div className="w-8 h-px bg-border my-auto" />
          <StepIndicator step={3} label={t('rent.steps.duration')} active={currentStep === 'duration'} />
          <div className="w-8 h-px bg-border my-auto" />
          <StepIndicator step={4} label={t('rent.steps.confirm')} active={currentStep === 'confirm'} />
        </div>

        {currentStep === 'country' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">{t('rent.countrySelectHint', { count: countries.length })}</p>
            <Input placeholder={t('rent.searchCountry')} value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)} />
            {countriesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin mr-2" />{t('rent.loadingCountries')}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredCountries.map(c => <Button key={c.id} variant={selectedCountry?.id === c.id ? 'default' : 'outline'} className="justify-start" onClick={() => { setSelectedCountry(c); setCurrentStep('service') }}><span className="mr-2">{getFlagEmoji(c.code)}</span>{c.name}</Button>)}
              </div>
            )}
          </div>
        )}

        {currentStep === 'service' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4"><Button variant="outline" size="sm" onClick={() => { setCurrentStep('country'); setSelectedCountry(null) }}>{t('rent.back')}</Button><span className="text-sm text-muted-foreground">{getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name}</span></div>
            <Input placeholder={t('rent.searchService')} value={searchService} onChange={(e) => setSearchService(e.target.value)} />
            {pricingLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin mr-2" />{t('rent.loadingServices')}</div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('rent.noServices')}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {filteredServices.map(s => <Button key={s.code} variant={selectedService?.code === s.code ? 'default' : 'outline'} className={`h-auto py-4 flex flex-col gap-2 relative transition-all duration-200 ${s.available === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-blue-300 hover:shadow-sm'} ${selectedService?.code === s.code ? 'bg-gradient-to-r from-blue-500 to-cyan-400 border-transparent shadow-md' : ''}`} disabled={s.available === 0} onClick={() => { setSelectedService(s); setCurrentStep('duration') }}><img src={getServiceLogo(s.code)} alt={`Logo ${s.name || s.code}`} className="w-8 h-8 drop-shadow-sm" onError={(e) => (e.target as HTMLImageElement).src = '/placeholder-service.png'} /><span className={`text-sm font-medium ${selectedService?.code === s.code ? 'text-white' : ''}`}>{s.name || s.code.toUpperCase()}</span><span className={`text-xs ${selectedService?.code === s.code ? 'text-blue-50' : 'text-muted-foreground'}`}>{s.available} {t('rent.available')}</span></Button>)}
                <Button variant={selectedService?.code === 'full' ? 'default' : 'outline'} className={`h-auto py-4 flex flex-col gap-2 relative transition-all duration-300 ${selectedService?.code === 'full' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-transparent shadow-lg text-white' : 'border-blue-400/50 bg-blue-500/5 hover:bg-blue-500/10 hover:shadow-md hover:-translate-y-0.5'}`} onClick={() => { setSelectedService({ code: 'full', name: 'Universal (All Sites)', available: pricingData?.pricing?.full?.available || 999, cost: pricingData?.pricing?.full?.price || 15 }); setCurrentStep('duration') }}><span className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold transition-colors ${selectedService?.code === 'full' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-md'}`}>U</span><span className={`text-sm font-medium ${selectedService?.code === 'full' ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400'}`}>Universal (Full)</span><span className={`text-xs ${selectedService?.code === 'full' ? 'text-blue-100' : 'text-muted-foreground'}`}>{pricingData?.pricing?.full?.available || 999} {t('rent.available')}</span></Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'duration' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4"><Button variant="outline" size="sm" onClick={() => setCurrentStep('service')}>{t('rent.back')}</Button><span className="text-sm text-muted-foreground">{getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name} • {selectedService?.name || 'Universal Number'}</span></div>
            <div className="grid gap-3">
              {rentDurations.map(d => <Button key={d.hours} variant={selectedDuration?.hours === d.hours ? 'default' : 'outline'} className="h-auto py-4 justify-between" onClick={() => { setSelectedDuration(d); setCurrentStep('confirm') }} disabled={d.loading || d.price === 0 || d.available === 0}><div className="text-left"><div className="font-medium">{t(`rent.durations.${d.label}`)}</div><div className="text-sm text-muted-foreground">{t(`rent.durations.${d.description}`)} {d.available > 0 && `• ${d.available} ${t('rent.available')}`}</div></div>{d.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="text-lg font-bold">{d.price > 0 ? `${Math.floor(d.price)} Ⓐ` : t('rent.notAvailable')}</div>}</Button>)}
            </div>
            {pricingLoading && <p className="text-sm text-muted-foreground text-center">{t('rent.loadingPrices')}</p>}
          </div>
        )}

        {currentStep === 'confirm' && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep('duration')}>{t('rent.back')}</Button>
            <Card className="p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.country')}:</span><span className="font-medium">{getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.service')}:</span><span className="font-medium">{selectedService?.name || 'Universal (All Sites)'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.duration')}:</span><span className="font-medium">{t(`rent.durations.${selectedDuration?.label}`)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('rent.available')}:</span><span className="font-medium">{selectedDuration?.available} {t('rent.numbers')}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>{t('rent.total')}:</span><span>{Math.floor(selectedDuration?.price || 0)} Ⓐ</span></div>
            </Card>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>Les locations sont non-remboursables après 20 minutes d'utilisation. Assurez-vous de vérifier la réception des SMS rapidement.</span>
            </div>
            <Button onClick={handleRent} disabled={isRenting} className="w-full" size="lg">{isRenting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t('rent.renting')}</> : t('rent.confirmRental')}</Button>
          </div>
        )}
      </Card>

      {/* Extension Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              {t('rent.extendRental')}
            </DialogTitle>
            <DialogDescription>
              {extendingRental && (
                <span>{extendingRental.phone} • {extendingRental.service_code}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('rent.extensionDuration')}</label>
              <Select value={extensionHours} onValueChange={handleExtensionHoursChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('rent.selectDuration')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 {t('rent.hours')}</SelectItem>
                  <SelectItem value="8">8 {t('rent.hours')}</SelectItem>
                  <SelectItem value="12">12 {t('rent.hours')}</SelectItem>
                  <SelectItem value="24">24 {t('rent.hours')} (1 {t('rent.day')})</SelectItem>
                  <SelectItem value="48">48 {t('rent.hours')} (2 {t('rent.days')})</SelectItem>
                  <SelectItem value="72">72 {t('rent.hours')} (3 {t('rent.days')})</SelectItem>
                  <SelectItem value="168">168 {t('rent.hours')} (1 {t('rent.week')})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price display */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('rent.extensionPrice')}:</span>
                {extensionPriceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : extensionError ? (
                  <span className="text-sm text-destructive">{t('common.error')}</span>
                ) : extensionPrice !== null ? (
                  <span className="text-lg font-bold text-primary">{extensionPrice} Ⓐ</span>
                ) : (
                  <span className="text-sm text-muted-foreground">--</span>
                )}
              </div>
              {extensionError && (
                <p className="text-xs text-destructive">{extensionError}</p>
              )}
              {!userCanAfford && extensionPrice !== null && (
                <p className="text-xs text-destructive">{t('rent.insufficientBalance')}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={performExtension}
              disabled={isExtending || extensionPriceLoading || !extensionPrice || !userCanAfford || !!extensionError}
            >
              {isExtending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t('rent.extending')}</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />{t('rent.extend')} {extensionPrice ? `(${extensionPrice}Ⓐ)` : ''}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const StepIndicator = ({ step, label, active }: { step: number; label: string; active: boolean }) => (
  <div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{step}</div><span className={`text-xs mt-1 ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{label}</span></div>
)

const RentalCard = ({ rental, expanded, onToggle, onCopy, onExtend, onFetchInbox, getRemainingTime, t }: { rental: Rental; expanded: boolean; onToggle: () => void; onCopy: (t: string) => void; onExtend: (id: string) => void; onFetchInbox: (id: string) => Promise<Message[]>; getRemainingTime: (d: string) => string; t: (key: string) => string }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const handleExpand = async () => { if (!expanded) { setLoading(true); setMessages(await onFetchInbox(rental.id)); setLoading(false) } onToggle() }
  return (
    <Card className="p-4 border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <img src={getServiceLogo(rental.service_code)} alt={`Service ${rental.service_code}`} className="w-10 h-10 object-contain" />
          <div className="min-w-0">
            <div className="font-semibold flex items-center gap-2">
              <span className="font-mono">{rental.phone}</span>
              <span>{getFlagEmoji(rental.country_code)}</span>
              {rental.status === 'active' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Actif
                </span>
              ) : rental.status === 'expired' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  Expiré
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {rental.status === 'completed' ? 'Terminé' : 'Annulé'}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{rental.service_code} • {rental.country_code}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">{getRemainingTime(rental.end_date)}</div>
            <div className="text-xs font-bold text-muted-foreground">{Math.floor(rental.price)} Ⓐ</div>
          </div>
          {['active', 'completed', 'expired'].includes(rental.status) && (
            <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/30" onClick={() => onExtend(rental.id)}>
              <Clock className="w-3.5 h-3.5 mr-1" />
              Prolonger
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onCopy(rental.phone)} title="Copier le numéro"><Copy className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={handleExpand}>{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
        </div>
      </div>
      {expanded && <div className="mt-4 pt-4 border-t space-y-3"><div className="flex justify-between mb-2"><h4 className="font-medium">{t('rent.smsInbox')} ({messages.length})</h4><Button variant="outline" size="sm" onClick={handleExpand} disabled={loading}><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /></Button></div>{loading ? <div className="text-center py-4 text-muted-foreground">{t('rent.loading')}</div> : messages.length === 0 ? <div className="text-center py-4 text-muted-foreground">{t('rent.noMessages')}</div> : <div className="space-y-2 max-h-64 overflow-y-auto">{messages.map((m, i) => <Card key={i} className="p-3"><div className="flex justify-between mb-1"><span className="text-xs text-muted-foreground">{m.service}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleString()}</span></div><div className="text-sm">{m.text}</div>{m.code && <div className="mt-2 flex items-center gap-2"><code className="bg-muted px-2 py-1 rounded text-sm font-mono">{m.code}</code><Button variant="ghost" size="sm" onClick={() => onCopy(m.code!)}><Copy className="w-3 h-3" /></Button></div>}</Card>)}</div>}</div>}
    </Card>
  )
}

export default RentPage
