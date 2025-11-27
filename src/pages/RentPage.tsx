import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Search, Copy, RefreshCw, Plus, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import { getServiceLogo, getCountryFlag } from '@/lib/logo-service'

interface Service { code: string; name: string; available: boolean }
interface Country { code: string; name: string; available: boolean }
interface Rental { id: string; rental_id: string; phone: string; service_code: string; country_code: string; price: number; rent_hours: number; status: string; end_date: string; created_at: string }
interface Message { text: string; code: string | null; service: string; date: string }

const RENT_DURATIONS = [
  { hours: 4, label: '4 hours', description: 'Quick rental', price: 0.50 },
  { hours: 24, label: '1 day', description: '24 hours', price: 1.00 },
  { hours: 168, label: '1 week', description: '7 days', price: 5.00 },
  { hours: 720, label: '1 month', description: '30 days', price: 15.00 }
]

const RentPage = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState<'service' | 'country' | 'duration' | 'confirm'>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<typeof RENT_DURATIONS[0] | null>(null)
  const [searchService, setSearchService] = useState('')
  const [searchCountry, setSearchCountry] = useState('')
  const [isRenting, setIsRenting] = useState(false)
  const [expandedRental, setExpandedRental] = useState<string | null>(null)

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').eq('available', true).eq('provider', 'sms-activate').order('name')
      if (error) throw error
      return data as Service[]
    }
  })

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('countries').select('*').eq('available', true).eq('provider', 'sms-activate').order('name')
      if (error) throw error
      return data as Country[]
    }
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

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchService.toLowerCase()))
  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(searchCountry.toLowerCase()))

  const handleRent = async () => {
    if (!selectedService || !selectedCountry || !selectedDuration) return
    setIsRenting(true)
    try {
      const { data, error } = await supabase.functions.invoke('rent-sms-activate-number', {
        body: { service: selectedService.code, country: selectedCountry.code, rentHours: selectedDuration.hours, userId: user?.id }
      })
      if (error || !data?.success) throw new Error(data?.error || 'Rental failed')
      toast.success('Number rented!', { description: `${data.data.phone} - Active for ${selectedDuration.label}` })
      setCurrentStep('service')
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
      toast.error('Extension failed', { description: error.message })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  const getRemainingTime = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 24) return `${Math.floor(hours/24)}d ${hours%24}h`
    return `${hours}h ${mins}m`
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Rent Numbers</h1>
        <Button onClick={() => refetchRentals()} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Rentals</h2>
        {rentalsLoading ? <Card className="p-4">Loading...</Card> : rentals.length === 0 ? (
          <Card className="p-8 text-center"><Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground"/><p>No active rentals</p></Card>
        ) : (
          <div className="grid gap-4">
            {rentals.map(r => <RentalCard key={r.id} rental={r} expanded={expandedRental===r.id} onToggle={()=>setExpandedRental(expandedRental===r.id?null:r.id)} onCopy={copyToClipboard} onExtend={handleExtendRental} onFetchInbox={fetchRentalInbox} getRemainingTime={getRemainingTime}/>)}
          </div>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Rent New Number</h2>
        <div className="flex justify-center mb-6 gap-2">
          <StepIndicator step={1} label="Service" active={currentStep==='service'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={2} label="Country" active={currentStep==='country'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={3} label="Duration" active={currentStep==='duration'}/>
          <div className="w-12 h-px bg-border my-auto"/>
          <StepIndicator step={4} label="Confirm" active={currentStep==='confirm'}/>
        </div>

        {currentStep==='service' && (
          <div className="space-y-4">
            <Input placeholder="Search..." value={searchService} onChange={(e)=>setSearchService(e.target.value)}/>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {filteredServices.map(s=><Button key={s.code} variant={selectedService?.code===s.code?'default':'outline'} className="h-auto py-4 flex flex-col gap-2" onClick={()=>{setSelectedService(s);setCurrentStep('country')}}><img src={getServiceLogo(s.code)} alt={s.name} className="w-8 h-8"/><span className="text-sm">{s.name}</span></Button>)}
            </div>
          </div>
        )}

        {currentStep==='country' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4"><Button variant="outline" size="sm" onClick={()=>setCurrentStep('service')}>← Back</Button><span className="text-sm text-muted-foreground">{selectedService?.name}</span></div>
            <Input placeholder="Search..." value={searchCountry} onChange={(e)=>setSearchCountry(e.target.value)}/>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredCountries.map(c=><Button key={c.code} variant={selectedCountry?.code===c.code?'default':'outline'} className="justify-start" onClick={()=>{setSelectedCountry(c);setCurrentStep('duration')}}><span className="mr-2">{getCountryFlag(c.code)}</span>{c.name}</Button>)}
            </div>
          </div>
        )}

        {currentStep==='duration' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4"><Button variant="outline" size="sm" onClick={()=>setCurrentStep('country')}>← Back</Button><span className="text-sm text-muted-foreground">{selectedService?.name} • {selectedCountry?.name}</span></div>
            <div className="grid gap-3">
              {RENT_DURATIONS.map(d=><Button key={d.hours} variant={selectedDuration?.hours===d.hours?'default':'outline'} className="h-auto py-4 justify-between" onClick={()=>{setSelectedDuration(d);setCurrentStep('confirm')}}><div className="text-left"><div className="font-medium">{d.label}</div><div className="text-sm text-muted-foreground">{d.description}</div></div><div className="text-lg font-bold">${d.price.toFixed(2)}</div></Button>)}
            </div>
          </div>
        )}

        {currentStep==='confirm' && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={()=>setCurrentStep('duration')}>← Back</Button>
            <Card className="p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Service:</span><span className="font-medium">{selectedService?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Country:</span><span className="font-medium">{selectedCountry?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration:</span><span className="font-medium">{selectedDuration?.label}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Total:</span><span>${selectedDuration?.price.toFixed(2)}</span></div>
            </Card>
            <Button onClick={handleRent} disabled={isRenting} className="w-full" size="lg">{isRenting?'Renting...':'Confirm Rental'}</Button>
          </div>
        )}
      </Card>
    </div>
  )
}

const StepIndicator=({step,label,active}:{step:number;label:string;active:boolean})=>(
  <div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${active?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{step}</div><span className={`text-xs mt-1 ${active?'text-primary font-medium':'text-muted-foreground'}`}>{label}</span></div>
)

const RentalCard=({rental,expanded,onToggle,onCopy,onExtend,onFetchInbox,getRemainingTime}:{rental:Rental;expanded:boolean;onToggle:()=>void;onCopy:(t:string)=>void;onExtend:(id:string)=>void;onFetchInbox:(id:string)=>Promise<Message[]>;getRemainingTime:(d:string)=>string})=>{
  const [messages,setMessages]=useState<Message[]>([])
  const [loading,setLoading]=useState(false)
  const handleExpand=async()=>{if(!expanded){setLoading(true);setMessages(await onFetchInbox(rental.id));setLoading(false)};onToggle()}
  return(
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1"><img src={getServiceLogo(rental.service_code)} alt={rental.service_code} className="w-10 h-10"/><div><div className="font-medium">{rental.phone}</div><div className="text-sm text-muted-foreground">{rental.service_code} • {rental.country_code}</div></div></div>
        <div className="flex items-center gap-2"><div className="text-right mr-4"><div className="text-sm font-medium">{getRemainingTime(rental.end_date)}</div><div className="text-xs text-muted-foreground">${rental.price.toFixed(2)}</div></div><Button variant="outline" size="sm" onClick={()=>onCopy(rental.phone)}><Copy className="w-4 h-4"/></Button><Button variant="outline" size="sm" onClick={()=>onExtend(rental.id)}><Plus className="w-4 h-4"/></Button><Button variant="ghost" size="sm" onClick={handleExpand}>{expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</Button></div>
      </div>
      {expanded&&<div className="mt-4 pt-4 border-t space-y-3"><div className="flex justify-between mb-2"><h4 className="font-medium">SMS Inbox ({messages.length})</h4><Button variant="outline" size="sm" onClick={handleExpand} disabled={loading}><RefreshCw className={`w-3 h-3 ${loading?'animate-spin':''}`}/></Button></div>{loading?<div className="text-center py-4 text-muted-foreground">Loading...</div>:messages.length===0?<div className="text-center py-4 text-muted-foreground">No messages</div>:<div className="space-y-2 max-h-64 overflow-y-auto">{messages.map((m,i)=><Card key={i} className="p-3"><div className="flex justify-between mb-1"><span className="text-xs text-muted-foreground">{m.service}</span><span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleString()}</span></div><div className="text-sm">{m.text}</div>{m.code&&<div className="mt-2 flex items-center gap-2"><code className="bg-muted px-2 py-1 rounded text-sm font-mono">{m.code}</code><Button variant="ghost" size="sm" onClick={()=>onCopy(m.code!)}><Copy className="w-3 h-3"/></Button></div>}</Card>)}</div>}</div>}
    </Card>
  )
}

export default RentPage
