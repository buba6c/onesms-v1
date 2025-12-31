import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Loader2, RefreshCw, Smartphone, Clock, XCircle, Home, ShoppingCart, MessageSquare, Copy, CheckCircle2, ChevronRight, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getServiceLogo, getCountryFlag, getFlagEmoji } from '@/lib/logo-service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, calculateTimeRemaining } from '@/lib/utils'

// Reuse interfaces from HistoryPage mostly
interface Activation {
  id: string
  order_id: string
  phone: string
  service_code: string
  country_code: string
  price: number
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled' | 'refunded' | 'expired' | 'completed'
  sms_code?: string
  sms_text?: string
  created_at: string
  expires_at: string
  type: 'activation'
}

interface Rental {
  id: string
  rent_id: string
  phone: string
  service_code: string
  country_code: string
  total_cost: number
  status: 'active' | 'completed' | 'cancelled' | 'expired'
  message_count: number
  created_at: string
  end_date: string
  type: 'rental'
}

type NumberItem = Activation | Rental

export default function MyNumbersPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { toast } = useToast()

  // Queries
  const { data: activations = [], isLoading: loadingActivations, refetch: refetchActivations } = useQuery({
    queryKey: ['my-numbers-activations', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(a => ({ ...a, type: 'activation' as const }))
    },
    enabled: !!user
  })

  const { data: rentals = [], isLoading: loadingRentals, refetch: refetchRentals } = useQuery({
    queryKey: ['my-numbers-rentals', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(r => ({ ...r, type: 'rental' as const }))
    },
    enabled: !!user
  })

  const loading = loadingActivations || loadingRentals

  // Combine & Filter
  const allNumbers = [...activations, ...rentals] as NumberItem[]

  // Filter for "Active" numbers (Pending, Waiting, Received, Active)
  const activeNumbers = allNumbers.filter(n => {
    if (n.type === 'activation') {
      return ['pending', 'waiting', 'received'].includes(n.status)
    } else {
      // Rental
      return n.status === 'active'
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const hasNumbers = activeNumbers.length > 0

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: t('common.copied'), description: text })
  }

  const handleRefresh = () => {
    refetchActivations()
    refetchRentals()
    toast({ title: t('common.refreshed') })
  }

  // --- Render Helpers ---

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'received':
        return <Badge className="bg-green-500 hover:bg-green-600">Actif</Badge>
      case 'pending':
      case 'waiting':
        return <Badge className="bg-amber-500 hover:bg-amber-600 animate-pulse">En attente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto max-w-4xl pb-24 px-4 pt-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.myNumbers')}</h1>
          <p className="text-sm text-gray-500 mt-1">Vos numéros temporaires et locations actifs</p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Chargement de vos numéros...</p>
        </div>
      ) : !hasNumbers ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 bg-gray-50 rounded-3xl border border-gray-100/50 dashed">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Aucun numéro actif</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Vous n'avez aucun numéro en cours d'utilisation. Achetez un numéro pour commencer.
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="rounded-xl" onClick={() => window.location.href = '/buy'}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Acheter un numéro
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeNumbers.map((item) => (
            <div key={`${item.type}-${item.id}`}>

              {/* --- DESKTOP VIEW (Hidden on Mobile) --- */}
              <Card className="hidden md:block p-0 overflow-hidden border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon / Service Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={getServiceLogo(item.service_code)}
                          alt={item.service_code}
                          className="w-12 h-12 rounded-xl object-contain bg-gray-50 p-1"
                          onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.png'}
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xs">{getFlagEmoji(item.country_code)}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg tabular-nums tracking-tight text-gray-900">
                            {item.phone}
                          </h3>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">
                          {item.type === 'rental' ? 'Location' : 'Activation'} • {item.service_code}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => copyToClipboard(item.phone)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* SMS Code Display (For Activations) */}
                  {item.type === 'activation' && item.sms_code && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-green-700 font-bold uppercase">Code SMS</p>
                          <p className="text-lg font-mono font-bold text-green-800 tracking-widest">{item.sms_code}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-green-700 hover:bg-green-100" onClick={() => copyToClipboard(item.sms_code!)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 border-t pt-3">
                    <div className="flex items-center gap-1.5 basis-1/2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {item.type === 'activation'
                          ? `Expire: ${formatDate(item.expires_at)}`
                          : `Fin: ${formatDate(item.end_date)}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 basis-1/2 justify-end">
                      <span className="font-medium text-gray-600">
                        {item.type === 'rental' ? item.total_cost : item.price} Ⓐ
                      </span>
                    </div>
                  </div>
                </div>
              </Card>


              {/* --- MOBILE VIEW (Visible only on Mobile) --- */}
              <div className="md:hidden bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={getServiceLogo(item.service_code)}
                        alt={item.service_code}
                        className="w-10 h-10 rounded-lg object-contain bg-gray-50 p-1"
                        onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.png'}
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm text-[10px]">
                        {getFlagEmoji(item.country_code)}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-base text-gray-900 flex items-center gap-2">
                        {item.phone}
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">{item.service_code}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 -mr-2" onClick={() => copyToClipboard(item.phone)}>
                    <Copy className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>

                {/* Status & Timer row */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2 mb-3">
                  {getStatusBadge(item.status)}
                  <div className="flex items-center text-xs text-gray-500 gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {calculateTimeRemaining(item.type === 'activation' ? item.expires_at : item.end_date)}
                    </span>
                  </div>
                </div>

                {/* SMS Code Section for Mobile */}
                {item.type === 'activation' && item.sms_code ? (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1 cursor-pointer active:scale-[0.98] transition-all" onClick={() => copyToClipboard(item.sms_code!)}>
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Votre Code</p>
                    <p className="text-2xl font-mono font-black text-green-700 tracking-[0.2em]">{item.sms_code}</p>
                    <p className="text-[10px] text-green-500/80">Tapez pour copier</p>
                  </div>
                ) : item.type === 'activation' && (
                  <div className="bg-gray-50 border border-gray-100 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">En attente du SMS...</span>
                  </div>
                )}

              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
