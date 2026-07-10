import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { getSettings, updateSetting } from '@/lib/settings'
import {
  RefreshCw,
  AlertCircle,
  Activity,
  Zap,
  Key,
  Settings,
  Server,
  Network,
  CheckCircle
} from 'lucide-react'

interface ProviderStatus {
  name: string
  status: 'active' | 'inactive' | 'error'
  balance: number
  currency: string
  apiUrl: string
  lastCheck: string
  error?: string
  stats?: {
    todayPurchases: number
    totalAvailable: number
    avgResponseTime: number
  }
}

const STATIC_PROVIDERS_CONFIG = [
  { name: 'SMS-Activate', domain: 'sms-activate.ae', desc: 'Provider principal (Workhorse)' },
  { name: '5sim', domain: '5sim.net', desc: 'Alternative économique globale' },
  { name: 'Grizzly SMS', domain: 'grizzlysms.com', desc: 'Haute fiabilité d\'activation' },
  { name: 'SMSPool', domain: 'smspool.net', desc: 'Réseau Premium (Tinder/WhatsApp)' },
  { name: 'TextVerified', domain: 'textverified.com', desc: 'Lignes réelles USA/UK (Non-VoIP)' },
  { name: 'SMSPVA', domain: 'smspva.com', desc: 'Disponibilité internationale' },
  { name: 'OnlineSIM', domain: 'onlinesim.io', desc: 'Spécialisé locations longue durée' }
];

export default function AdminProviders() {
  const { toast } = useToast()
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({
    'sms_provider_mode': 'sms-activate',
    'sms_provider_strategy': 'reliable'
  })

  // Dialog State
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<any>(null)
  const [newApiKey, setNewApiKey] = useState('')
  const [newApiUsername, setNewApiUsername] = useState('') 

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const data = await getSettings(['sms_provider_mode', 'sms_provider_strategy'])
    setSettings(prev => ({ ...prev, ...data }))
  }

  const handleUpdateSetting = async (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    const success = await updateSetting(key, value)
    if (success) {
      toast({ title: '✅ Configuration sauvegardée', description: 'Le routage a été mis à jour.' })
    } else {
      toast({ title: '❌ Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' })
      loadSettings()
    }
  }

  const { data: fetchProviders = [], isLoading, refetch } = useQuery<ProviderStatus[]>({
    queryKey: ['providers-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-providers-status`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
        }
      )
      if (!response.ok) throw new Error('Failed to fetch provider status')
      const result = await response.json()
      return result.providers || []
    },
    refetchInterval: 60000 
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    await loadSettings()
    setRefreshing(false)
    toast({ title: '✅ Actualisé', description: 'Les données financières sont à jour.' })
  }

  const openConfig = (provider: any) => {
    setSelectedProvider(provider)
    setNewApiKey('')
    setNewApiUsername('')
    setConfigOpen(true)
  }

  const handleSaveApiKey = async () => {
    if (!selectedProvider || !newApiKey) return

    if (selectedProvider.name === 'TextVerified') {
      if (!newApiUsername) {
        toast({ title: '❌ Erreur', description: 'L\'email TextVerified est requis.', variant: 'destructive' })
        return
      }
      const keySuccess = await updateSetting('textverified_api_key', newApiKey.trim())
      const usernameSuccess = await updateSetting('textverified_api_username', newApiUsername.trim())
      if (keySuccess && usernameSuccess) {
        toast({ title: '✅ Succès', description: 'Credentials TextVerified sauvegardés.' })
        setConfigOpen(false)
        refetch()
      }
      return
    }

    const keyNameMap: Record<string, string> = {
      'SMS-Activate': 'sms_activate_api_key',
      '5sim': '5sim_api_key',
      'SMSPVA': 'smspva_api_key',
      'OnlineSIM': 'onlinesim_api_key',
      'Grizzly SMS': 'grizzly_api_key',
      'SMSPool': 'smspool_api_key'
    }
    const keyName = keyNameMap[selectedProvider.name] || 'sms_activate_api_key'
    const success = await updateSetting(keyName, newApiKey.trim())

    if (success) {
      toast({ title: '✅ Clé API mise à jour', description: `La clé pour ${selectedProvider.name} a été enregistrée.` })
      setConfigOpen(false)
      handleRefresh()
    }
  }

  // Merge static configs with dynamic states
  const providers = useMemo(() => {
    return STATIC_PROVIDERS_CONFIG.map(sp => {
      const activeData = fetchProviders.find(p => p.name === sp.name)
      if (activeData) return { ...sp, ...activeData }
      return { 
        ...sp, 
        status: 'inactive' as const, 
        balance: 0, 
        currency: '-', 
        apiUrl: `https://${sp.domain}`, 
        lastCheck: '' 
      }
    })
  }, [fetchProviders])

  const totalActive = providers.filter(p => p.status === 'active').length
  const totalBalanceApprox = providers.reduce((sum, p) => {
    // Rough normalization if everything isn't the same currency, but for UI sake we sum it raw or just show it's multi-currency
    return sum + (p.balance > 0 ? p.balance : 0)
  }, 0)

  return (
    <div className="space-y-8">
      {/* HEADER - Data-driven style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Server className="w-6 h-6 text-slate-700" />
            Infrastructure API
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos fournisseurs SMS et votre politique de routage.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 px-6 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Active Nodes</p>
              <p className="font-mono text-lg font-bold text-slate-900">{totalActive}/{providers.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Total Funds</p>
              <p className="font-mono text-lg font-bold text-emerald-600">~{totalBalanceApprox.toFixed(1)}</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            variant="outline"
            className="h-11 border-slate-200 gap-2 font-medium"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* ROUTING CONTROL PANEL (Bento Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Mode Selector */}
        <Card className="lg:col-span-8 shadow-sm border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Network className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Traffic Routing Protocol</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: 'smart', label: 'Auto (Smart)', desc: 'Algorithme intelligent' },
                { id: 'sms-activate', label: 'SMS Activate', desc: 'Routage exclusif' },
                { id: '5sim', label: '5sim', desc: 'Routage exclusif' },
                { id: 'grizzly', label: 'Grizzly SMS', desc: 'Routage exclusif' },
                { id: 'textverified', label: 'TextVerified', desc: 'Routage exclusif' },
                { id: 'smspool', label: 'SMSPool', desc: 'Routage exclusif' }
              ].map((mode) => {
                const isActive = settings['sms_provider_mode'] === mode.id
                return (
                  <div
                    key={mode.id}
                    onClick={() => handleUpdateSetting('sms_provider_mode', mode.id)}
                    className={`cursor-pointer border p-4 transition-all ${
                      isActive 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {mode.label}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    </div>
                    <span className="text-xs text-slate-500">{mode.desc}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Strategy Selector (Enabled only if Smart) */}
        <Card className="lg:col-span-4 shadow-sm border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Smart Strategy</h3>
            </div>

            <div className={`space-y-3 transition-opacity ${settings['sms_provider_mode'] === 'smart' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {[
                { id: 'cheapest', label: 'Lowest Price', desc: 'Optimise les marges' },
                { id: 'reliable', label: 'Highest Reliability', desc: 'Taux de succès max' },
                { id: 'fastest', label: 'Fastest Delivery', desc: 'Temps de réception' }
              ].map((strategy) => {
                const isActive = settings['sms_provider_strategy'] === strategy.id
                return (
                  <div
                    key={strategy.id}
                    onClick={() => handleUpdateSetting('sms_provider_strategy', strategy.id)}
                    className={`cursor-pointer border px-4 py-3 flex items-center justify-between ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-bold ${isActive ? 'text-emerald-900' : 'text-slate-700'}`}>{strategy.label}</p>
                      <p className="text-[11px] text-slate-500">{strategy.desc}</p>
                    </div>
                    {isActive && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MASTER PROVIDERS LIST */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4">API Endpoints & Balances</h2>
        
        {isLoading ? (
          <div className="p-12 text-center border border-slate-200 bg-slate-50 rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-mono text-slate-500 uppercase">Synchronizing...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {providers.map((provider) => {
              const isConfigured = provider.status !== 'inactive'
              const isError = provider.status === 'error'
              
              return (
                <div key={provider.name} className={`relative flex flex-col bg-white border transition-shadow hover:shadow-sm ${isError ? 'border-red-200' : isConfigured ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-70'}`}>
                  
                  {/* Card Top: Identity & Status */}
                  <div className="p-5 flex justify-between items-start border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900">{provider.name}</h3>
                        {/* Status LED */}
                        <div className={`w-2 h-2 rounded-full ${
                          isError ? 'bg-red-500 animate-pulse' : 
                          isConfigured ? 'bg-emerald-500' : 
                          'bg-slate-300'
                        }`}></div>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500">{provider.domain}</p>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openConfig(provider)}
                      className="h-8 px-2 text-slate-400 hover:text-slate-900"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Card Middle: Balance or Error */}
                  <div className="p-5 flex-1 flex flex-col justify-center">
                    {!isConfigured ? (
                      <div className="text-center py-4">
                        <p className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-widest">No API Key</p>
                        <Button variant="outline" size="sm" onClick={() => openConfig(provider)}>
                          Connect Endpoint
                        </Button>
                      </div>
                    ) : isError ? (
                      <div className="text-center py-2">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-xs text-red-600 font-medium">{provider.error || "Connection Refused"}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Live Balance</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-3xl font-black text-slate-900 tracking-tight">
                            {provider.balance.toFixed(2)}
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-400">
                            {provider.currency}
                          </span>
                        </div>
                        
                        {/* Low balance warning inline */}
                        {provider.balance < 50 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 uppercase tracking-wider w-fit">
                            <AlertCircle className="w-3 h-3" /> Low Funds
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Metrics (if active) */}
                  {isConfigured && !isError && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] uppercase text-slate-400 tracking-wider mb-1">Today</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {provider.stats?.todayPurchases || 0} req
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-slate-400 tracking-wider mb-1">Latency</span>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-slate-400" />
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            {provider.stats?.avgResponseTime || 0}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DIALOG CONFIGURATION */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-slate-500" />
              {selectedProvider?.name} Setup
            </DialogTitle>
            <DialogDescription>
              Entrez vos identifiants API pour activer la connexion avec {selectedProvider?.domain}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold">API Key</Label>
              <Input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="font-mono text-sm"
              />
            </div>

            {selectedProvider?.name === 'TextVerified' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Account Email</Label>
                <Input
                  type="email"
                  value={newApiUsername}
                  onChange={(e) => setNewApiUsername(e.target.value)}
                  placeholder="admin@onesms.com"
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveApiKey} className="bg-slate-900 hover:bg-slate-800 text-white">Save Credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
