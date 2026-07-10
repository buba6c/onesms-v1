import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, TrendingUp, AlertCircle, CheckCircle, RefreshCw, Trophy, Clock, Server, CreditCard, ShieldCheck, XCircle, Zap, ShieldAlert, DollarSign, ArrowDown, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardStats {
  total_activations_24h: number
  successful_24h: number
  cancelled_24h: number
  timeout_24h: number
  global_success_rate_pct: number
  global_health_status: string
}

interface ServiceHealth {
  service_code: string
  total_activations_24h: number
  successful_activations: number
  cancelled_activations: number
  timeout_activations: number
  success_rate_pct: number
  health_status: string
  last_activation_at: string
  minutes_since_last_use: number
}

interface CountryHealth {
  country_code: string
  total_activations_24h: number
  successful_activations: number
  success_rate_pct: number
  health_status: string
}

interface ProviderPerformance {
  provider: string
  service_code: string
  attempts: number
  successes: number
  score: number
  updated_at: string
}

interface ProviderAPIStatus {
  name: string
  status: 'active' | 'inactive' | 'error'
  balance: number
  currency: string
  apiUrl: string
  error?: string
  stats?: {
    todayPurchases: number
    avgResponseTime: number
  }
}

interface SystemLog {
  id: string
  created_at: string
  level: string
  category: string
  message: string
  metadata: any
}

interface PriceComparison {
  service: string
  label: string
  providers: Record<string, { price_usd: number, count: number }>
}

export default function AdminMonitoring() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [countries, setCountries] = useState<CountryHealth[]>([])
  const [providerStats, setProviderStats] = useState<ProviderPerformance[]>([])
  const [providerApiStatuses, setProviderApiStatuses] = useState<ProviderAPIStatus[]>([])
  const [liveLogs, setLiveLogs] = useState<SystemLog[]>([])
  const [priceComparison, setPriceComparison] = useState<PriceComparison[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else if (!stats) setLoading(true)

    try {
      const [
        { data: statsData },
        { data: servicesData },
        { data: countriesData },
        { data: providerData },
        { data: logsData },
        { data: apiStatusData }
      ] = await Promise.all([
        supabase.from('v_dashboard_stats').select('*').single(),
        supabase.from('v_service_health').select('*').order('total_activations_24h', { ascending: false }),
        supabase.from('v_country_health').select('*').order('total_activations_24h', { ascending: false }),
        supabase.from('provider_performance').select('*').order('score', { ascending: false }).limit(20),
        supabase.from('system_logs').select('*').in('category', ['SMART_ROUTING', 'api', 'purchase']).order('created_at', { ascending: false }).limit(15),
        supabase.functions.invoke('get-providers-status')
      ])

      setStats(statsData)
      setServices(servicesData || [])
      setCountries(countriesData || [])
      setProviderStats((providerData as any) || [])
      setLiveLogs(logsData || [])
      
      if (apiStatusData?.providers) {
        setProviderApiStatuses(apiStatusData.providers)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchPrices = async () => {
    setPricesLoading(true)
    try {
      const { data } = await supabase.functions.invoke('get-provider-prices-comparator')
      if (data?.comparison) {
        setPriceComparison(data.comparison)
      }
    } catch (error) {
      console.error('Error fetching price comparison:', error)
    } finally {
      setPricesLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // ⚡ Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(false), 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
            <RefreshCw className="h-10 w-10 animate-spin text-indigo-600 relative z-10" />
          </div>
          <p className="text-gray-500 font-medium tracking-tight">Analyse des systèmes en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Centre de Contrôle</h1>
          </div>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Synchronisé à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <Button 
          onClick={() => fetchData(true)} 
          disabled={refreshing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-200 transition-all active:scale-95"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Main Grid: Stats & API Balances */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Global KPIs */}
        <div className="xl:col-span-2 space-y-6">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5 border-0 shadow-sm ring-1 ring-gray-100 rounded-2xl bg-gradient-to-br from-white to-gray-50/50">
                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2">Volume (24h)</p>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black text-gray-900 leading-none">{stats.total_activations_24h}</span>
                  <Activity className="h-5 w-5 text-indigo-400 mb-0.5" />
                </div>
              </Card>

              <Card className="p-5 border-0 shadow-sm ring-1 ring-emerald-100 rounded-2xl bg-gradient-to-br from-white to-emerald-50/30">
                <p className="text-[13px] font-bold text-emerald-600/70 uppercase tracking-wider mb-2">Succès</p>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black text-emerald-600 leading-none">{stats.successful_24h}</span>
                  <CheckCircle className="h-5 w-5 text-emerald-400 mb-0.5" />
                </div>
              </Card>

              <Card className="p-5 border-0 shadow-sm ring-1 ring-rose-100 rounded-2xl bg-gradient-to-br from-white to-rose-50/30">
                <p className="text-[13px] font-bold text-rose-600/70 uppercase tracking-wider mb-2">Échecs/Annulés</p>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black text-rose-600 leading-none">{stats.cancelled_24h + stats.timeout_24h}</span>
                  <XCircle className="h-5 w-5 text-rose-400 mb-0.5" />
                </div>
              </Card>

              <Card className="p-5 border-0 shadow-sm ring-1 ring-indigo-100 rounded-2xl bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <TrendingUp className="w-24 h-24 text-indigo-600" />
                </div>
                <p className="text-[13px] font-bold text-indigo-600/70 uppercase tracking-wider mb-2">Taux Global</p>
                <div className="flex items-end gap-2 relative z-10">
                  <span className="text-4xl font-black text-indigo-600 leading-none tracking-tight">{stats.global_success_rate_pct}</span>
                  <span className="text-xl font-bold text-indigo-400 leading-none mb-0.5">%</span>
                </div>
                
                {/* Micro Progress Bar */}
                <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-4 relative z-10">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(stats.global_success_rate_pct, 100)}%` }}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Provider Performance / Intelligence */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Intelligence Artificielle</h3>
                  <p className="text-sm text-gray-500 font-medium">Top fournisseurs par service</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Fournisseur Prioritaire</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Score de Fiabilité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {providerStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md uppercase tracking-wider">
                          {stat.service_code}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 capitalize">{stat.provider}</span>
                          {idx < 3 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded",
                            stat.score >= 80 ? "bg-emerald-100 text-emerald-700" :
                            stat.score >= 50 ? "bg-indigo-100 text-indigo-700" :
                            "bg-rose-100 text-rose-700"
                          )}>
                            {Number(stat.score).toFixed(1)}%
                          </span>
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                stat.score >= 80 ? "bg-emerald-500" : stat.score >= 50 ? "bg-indigo-500" : "bg-rose-500"
                              )}
                              style={{ width: `${Math.min(stat.score, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: API Balances & Live Feed */}
        <div className="space-y-6">
          
          {/* API Balances */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl bg-white overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Soldes API</h3>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {providerApiStatuses.map((api, idx) => (
                <div key={idx} className={cn(
                  "p-4 rounded-2xl flex items-center justify-between border transition-all",
                  api.status === 'active' ? "border-gray-100 bg-white shadow-sm hover:border-indigo-100" :
                  api.status === 'inactive' ? "border-gray-100 bg-gray-50 opacity-60" :
                  "border-rose-100 bg-rose-50"
                )}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900">{api.name}</span>
                      {api.status === 'active' && <span className="flex h-2 w-2 rounded-full bg-emerald-500" />}
                      {api.status === 'error' && <span className="flex h-2 w-2 rounded-full bg-rose-500" />}
                    </div>
                    {api.status === 'active' && api.stats && (
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> {api.stats.avgResponseTime}ms</span>
                        <span>•</span>
                        <span>{api.stats.todayPurchases} achats (24h)</span>
                      </div>
                    )}
                    {api.status === 'error' && (
                      <p className="text-[11px] text-rose-600 font-medium max-w-[150px] truncate" title={api.error}>{api.error}</p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    {api.status === 'active' ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-gray-900">{api.balance.toFixed(2)}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">{api.currency}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 uppercase">{api.status}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {providerApiStatuses.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500 font-medium">
                  Chargement des soldes...
                </div>
              )}
            </div>
          </Card>

          {/* Live Feed */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl bg-white overflow-hidden flex flex-col h-[400px]">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Activité en Direct</h3>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto grow space-y-3 custom-scrollbar">
              {liveLogs.map((log) => {
                const isError = log.level === 'error' || log.level === 'warning'
                return (
                  <div key={log.id} className="flex gap-3 items-start relative group">
                    <div className="shrink-0 mt-0.5">
                      {isError ? (
                        <div className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-50 mt-1.5" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50 mt-1.5" />
                      )}
                    </div>
                    <div className="flex-1 bg-gray-50 group-hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100/50">
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          isError ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"
                        )}>
                          {log.category}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-700">{log.message}</p>
                      
                      {log.metadata?.final_provider && (
                        <p className="text-[10px] text-gray-500 mt-1 font-medium flex items-center gap-1">
                          <Server className="w-3 h-3" /> {log.metadata.final_provider}
                          {log.metadata?.total_ms && <span className="ml-1 opacity-60">({log.metadata.total_ms}ms)</span>}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {liveLogs.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500 font-medium">
                  Aucune activité récente.
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>

      {/* Price Comparator Section */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Comparateur de Prix (USA)</h3>
              <p className="text-sm text-gray-500 font-medium">Coût réel par fournisseur pour les services populaires</p>
            </div>
          </div>
          <Button
            onClick={fetchPrices}
            disabled={pricesLoading}
            variant="outline"
            className="rounded-xl border-gray-200 text-sm font-bold"
          >
            {pricesLoading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Chargement...</>
            ) : priceComparison.length > 0 ? (
              <><RefreshCw className="h-4 w-4 mr-2" /> Actualiser</>
            ) : (
              <><DollarSign className="h-4 w-4 mr-2" /> Charger les prix</>
            )}
          </Button>
        </div>

        {priceComparison.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Service</th>
                  {['sms-activate', 'grizzly', '5sim', 'smspool'].map(p => (
                    <th key={p} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                      {p === 'sms-activate' ? 'HeroSMS' : p === '5sim' ? '5sim' : p === 'grizzly' ? 'Grizzly' : 'SMSPool'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {priceComparison.map((item) => {
                  const providers = ['sms-activate', 'grizzly', '5sim', 'smspool']
                  const prices = providers.map(p => item.providers[p]?.price_usd ?? null)
                  const validPrices = prices.filter((p): p is number => p !== null && p > 0)
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null

                  return (
                    <tr key={item.service} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-sm font-bold text-gray-900">{item.label}</span>
                        <span className="text-[10px] text-gray-400 ml-2 font-mono uppercase">{item.service}</span>
                      </td>
                      {providers.map((p) => {
                        const data = item.providers[p]
                        const price = data?.price_usd
                        const isCheapest = price != null && price > 0 && minPrice != null && Math.abs(price - minPrice) < 0.001

                        return (
                          <td key={p} className="px-4 py-3 text-center">
                            {price != null && price > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
                                  isCheapest
                                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-gray-100 text-gray-600"
                                )}>
                                  {isCheapest && <Crown className="w-3 h-3" />}
                                  ${price.toFixed(3)}
                                </div>
                                {data?.count > 0 && (
                                  <span className="text-[10px] text-gray-400 font-medium">{data.count} dispo</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 font-medium">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Cliquez sur "Charger les prix" pour comparer les coûts fournisseurs</p>
          </div>
        )}
      </Card>

      {/* Bottom Grid: Granular Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Services Health */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
          <div className="px-6 py-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Santé des Services (24h)</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="bg-gray-50/90 backdrop-blur-sm">
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Volume</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Succès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((service) => (
                  <tr key={service.service_code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-bold text-sm text-gray-900 uppercase">
                      {service.service_code}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-bold text-gray-900 text-sm">{service.total_activations_24h}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn(
                          "text-xs font-bold",
                          service.success_rate_pct >= 60 ? "text-emerald-600" :
                          service.success_rate_pct >= 30 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {service.success_rate_pct}%
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              service.success_rate_pct >= 60 ? "bg-emerald-500" :
                              service.success_rate_pct >= 30 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(service.success_rate_pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Countries Health */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
          <div className="px-6 py-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Santé des Pays (24h)</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="bg-gray-50/90 backdrop-blur-sm">
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Pays</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Volume</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Succès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {countries.map((country) => (
                  <tr key={country.country_code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-bold text-sm text-gray-900 uppercase">
                      {country.country_code}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-bold text-gray-900 text-sm">{country.total_activations_24h}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn(
                          "text-xs font-bold",
                          country.success_rate_pct >= 60 ? "text-emerald-600" :
                          country.success_rate_pct >= 30 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {country.success_rate_pct}%
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              country.success_rate_pct >= 60 ? "bg-emerald-500" :
                              country.success_rate_pct >= 30 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(country.success_rate_pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  )
}
