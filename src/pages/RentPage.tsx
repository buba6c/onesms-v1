import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Search, Copy, RefreshCw, Plus, ChevronDown, ChevronUp, Mail, Loader2 } from 'lucide-react'
import { getServiceLogo, getCountryFlag, getFlagEmoji } from '@/lib/logo-service'

interface Service { code: string; name: string; display_name?: string; available: number; total?: number; cost?: number; sellingPrice?: number }
interface Country { id: number; code: string; name: string; available: boolean }
interface Rental { id: string; rental_id: string; phone: string; service_code: string; country_code: string; price: number; rent_hours: number; status: string; end_date: string; created_at: string }
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

  // =========================================================================
  // 1. Récupérer les PAYS RENT disponibles directement depuis l'API
  // =========================================================================
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['rent-countries-api'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-rent-services', {
        body: { getCountries: true, rentTime: '4' }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Failed to fetch rent countries')
      return data.countries as Country[]
    },
    staleTime: 300000 // Cache 5 minutes
  })

  // =========================================================================
  // 2. Récupérer les SERVICES disponibles pour le pays sélectionné
  // =========================================================================
  const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['rent-services-api', selectedCountry?.id],
    queryFn: async () => {
      if (!selectedCountry) return { services: [], availableServices: [] }
      const { data, error } = await supabase.functions.invoke('get-rent-services', {
        body: { country: selectedCountry.id.toString(), rentTime: '4' }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Failed to fetch rent services')
      return {
        services: data.services || {},
        availableServices: (data.availableServices || []) as Service[]
      }
    },
    enabled: !!selectedCountry,
    staleTime: 60000 // Cache 1 minute
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
      const { data, error } = await supabase.functions.invoke('rent-sms-activate-number', {
        body: { service: selectedService.code, country: selectedCountry.id.toString(), rentHours: selectedDuration.hours, userId: user?.id }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Rental failed')
      toast.success('Number rented!', { description: `${data.data.phone} - Active for ${selectedDuration.label}` })
      setCurrentStep('country')
      setSelectedService(null)
      setSelectedCountry(null)
      setSelectedDuration(null)
      refetchRentals()
    } catch (error: any) {
      toast.error('Rental failed', { description: error.message })
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('rent.title')}</h1>
        <Button onClick={() => refetchRentals()} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2"/>{t('rent.refresh')}</Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('rent.activeRentals')}</h2>
        {rentalsLoading ? <Card className="p-4">{t('rent.loading')}</Card> : rentals.length === 0 ? (
          <Card className="p-8 text-center"><Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground"/><p>{t('rent.noActiveRentals')}</p></Card>
        ) : (
          <div className="grid gap-4">
            {rentals.map(r => <RentalCard key={r.id} rental={r} expanded={expandedRental===r.id} onToggle={()=>setExpandedRental(expandedRental===r.id?null:r.id)} onCopy={copyToClipboard} onExtend={handleExtendRental} onFetchInbox={fetchRentalInbox} getRemainingTime={getRemainingTime} t={t}/>)}
          </div>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{t('rent.rentNewNumber')}</h2>
        <div className="flex justify-center mb-6 gap-2">
          <StepIndicator step={1} label={t('rent.steps.country')} active={currentStep==='country'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={2} label={t('rent.steps.service')} active={currentStep==='service'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={3} label={t('rent.steps.duration')} active={currentStep==='duration'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={4} label={t('rent.steps.confirm')} active={currentStep==='confirm'}/>
        </div>

        {currentStep==='country' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">{t('rent.countrySelectHint', { count: countries.length })}</p>
            <Input placeholder={t('rent.searchCountry')} value={searchCountry} onChange={(e)=>setSearchCountry(e.target.value)}/>
            {countriesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin mr-2"/>{t('rent.loadingCountries')}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredCountries.map(c=><Button key={c.id} variant={selectedCountry?.id===c.id?'default':'outline'} className="justify-start" onClick={()=>{setSelectedCountry(c);setSelectedService(null);setCurrentStep('service')}}><span className="mr-2">{getFlagEmoji(c.code)}</span>{c.name}</Button>)}
              </div>
            )}
          </div>
        )}

        {currentStep==='service' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4"><Button variant="outline" size="sm" onClick={()=>{setCurrentStep('country');setSelectedCountry(null)}}>{t('rent.back')}</Button><span className="text-sm text-muted-foreground">{getFlagEmoji(selectedCountry?.code || '')} {selectedCountry?.name}</span></div>
            <Input placeholder={t('rent.searchService')} value={searchService} onChange={(e)=>setSearchService(e.target.value)}/>
            {servicesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin mr-2"/>{t('rent.loadingServices')}</div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('rent.noServices')}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {filteredServices.map(s=><Button key={s.code} variant={selectedService?.code===s.code?'default':'outline'} className="h-auto py-4 flex flex-col gap-2 relative" onClick={()=>{setSelectedService(s);setCurrentStep('duration')}}><img src={getServiceLogo(s.code)} alt={s.code} className="w-8 h-8" onError={(e)=>(e.target as HTMLImageElement).src='/placeholder-service.png'}/><span className="text-sm font-medium">{s.code.toUpperCase()}</span><span className="text-xs text-muted-foreground">{s.available} {t('rent.available')}</span></Button>)}
              </div>
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
        <div className="flex items-center gap-3 flex-1"><img src={getServiceLogo(rental.service_code)} alt={rental.service_code} className="w-10 h-10"/><div><div className="font-medium">{rental.phone}</div><div className="text-sm text-muted-foreground">{rental.service_code} • {rental.country_code}</div></div></div>
        <div className="flex items-center gap-2"><div className="text-right mr-4"><div className="text-sm font-medium">{getRemainingTime(rental.end_date)}</div><div className="text-xs text-muted-foreground">${rental.price.toFixed(2)}</div></div><Button variant="outline" size="sm" onClick={()=>onCopy(rental.phone)}><Copy className="w-4 h-4"/></Button><Button variant="outline" size="sm" onClick={()=>onExtend(rental.id)}><Plus className="w-4 h-4"/></Button><Button variant="ghost" size="sm" onClick={handleExpand}>{expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</Button></div>
      </div>
      {expanded&&<div className="mt-4 pt-4 border-t space-y-3"><div className="flex justify-between mb-2"><h4 className="font-medium">{t('rent.smsInbox')} ({messages.length})</h4><Button variant="outline" size="sm" onClick={handleExpand} disabled={loading}><RefreshCw className={`w-3 h-3 ${loading?'animate-spin':''}`}/></Button></div>{loading?<div className="text-center py-4 text-muted-foreground">{t('rent.loading')}</div>:messages.length===0?<div className="text-center py-4 text-muted-foreground">{t('rent.noMessages')}</div>:<div className="space-y-2 max-h-64 overflow-y-auto">{messages.map((m,i)=><Card key={i} className="p-3"><div className="flex justify-between mb-1"><span className="text-xs text-muted-foreground">{m.service}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleString()}</span></div><div className="text-sm">{m.text}</div>{m.code&&<div className="mt-2 flex items-center gap-2"><code className="bg-muted px-2 py-1 rounded text-sm font-mono">{m.code}</code><Button variant="ghost" size="sm" onClick={()=>onCopy(m.code!)}><Copy className="w-3 h-3"/></Button></div>}</Card>)}</div>}</div>}
    </Card>
  )
}

export default RentPage
