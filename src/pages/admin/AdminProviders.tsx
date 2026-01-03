import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  DollarSign,
  Zap,
  Globe,
  Clock,
  Key,
  Settings
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

export default function AdminProviders() {
  const { toast } = useToast()
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({
    'sms_provider_mode': 'sms-activate', // default
    'sms_provider_strategy': 'reliable'
  })

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const data = await getSettings(['sms_provider_mode', 'sms_provider_strategy'])
    setSettings(prev => ({ ...prev, ...data }))
  }

  const handleUpdateSetting = async (key: string, value: string) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }))

    // Save to DB
    const success = await updateSetting(key, value)

    if (success) {
      toast({
        title: '✅ Configuration sauvegardée',
        description: 'Les paramètres de routage ont été mis à jour',
      })
    } else {
      toast({
        title: '❌ Erreur',
        description: 'Impossible de sauvegarder la configuration',
        variant: 'destructive'
      })
      // Revert on error
      loadSettings()
    }
  }



  // Fetch provider status
  const { data: providers = [], isLoading, refetch } = useQuery<ProviderStatus[]>({
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

      if (!response.ok) {
        throw new Error('Failed to fetch provider status')
      }

      const result = await response.json()
      return result.providers || []
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    await loadSettings()
    setRefreshing(false)
    toast({
      title: '✅ Status actualisé',
      description: 'Les informations des providers ont été mises à jour'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Active', class: 'bg-green-100 text-green-800' },
      error: { label: 'Error', class: 'bg-red-100 text-red-800' },
      inactive: { label: 'Inactive', class: 'bg-gray-100 text-gray-800' }
    }
    return config[status as keyof typeof config] || config.inactive
  }

  // Calculate totals
  const totalBalance = providers.reduce((sum, p) => sum + p.balance, 0)
  const activeProviders = providers.filter(p => p.status === 'active').length
  const todayPurchases = providers.reduce((sum, p) => sum + (p.stats?.todayPurchases || 0), 0)
  const avgResponseTime = providers.length > 0
    ? providers.reduce((sum, p) => sum + (p.stats?.avgResponseTime || 0), 0) / providers.length
    : 0

  // Configuration Dialog State
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null)
  const [newApiKey, setNewApiKey] = useState('')
  const [newApiUsername, setNewApiUsername] = useState('') // For TextVerified email

  const openConfig = (provider: ProviderStatus) => {
    setSelectedProvider(provider)
    setNewApiKey('') // Reset formatting, user must enter new key or we could fetch existing if needed but better security to just set new
    setNewApiUsername('') // Reset email field
    setConfigOpen(true)
  }

  const handleSaveApiKey = async () => {
    if (!selectedProvider || !newApiKey) return

    // TextVerified needs 2 credentials
    if (selectedProvider.name === 'TextVerified') {
      if (!newApiUsername) {
        toast({
          title: '❌ Erreur',
          description: 'Veuillez entrer l\'email de votre compte TextVerified',
          variant: 'destructive'
        })
        return
      }

      // Save both API key and username
      const keySuccess = await updateSetting('textverified_api_key', newApiKey)
      const usernameSuccess = await updateSetting('textverified_api_username', newApiUsername)

      if (keySuccess && usernameSuccess) {
        toast({
          title: '✅ Credentials TextVerified mis à jour',
          description: 'API Key et email configurés avec succès'
        })
        setConfigOpen(false)
        refetch()
      } else {
        toast({
          title: '❌ Erreur',
          description: 'Impossible de sauvegarder les credentials',
          variant: 'destructive'
        })
      }
      return
    }

    // Map provider name to setting key
    const keyNameMap: Record<string, string> = {
      'SMS-Activate': 'sms_activate_api_key',
      '5sim': '5sim_api_key',
      'SMSPVA': 'smspva_api_key',
      'OnlineSIM': 'onlinesim_api_key',
      'Grizzly SMS': 'grizzly_api_key',
      'SMSPool': 'smspool_api_key'
    }
    const keyName = keyNameMap[selectedProvider.name] || 'sms_activate_api_key'

    const success = await updateSetting(keyName, newApiKey)

    if (success) {
      toast({
        title: '✅ Clé API mise à jour',
        description: `La clé pour ${selectedProvider.name} a été enregistrée`,
      })
      setConfigOpen(false)
      handleRefresh()
    } else {
      toast({
        title: '❌ Erreur',
        description: 'Impossible de sauvegarder la clé API',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Providers</h1>
          <p className="text-gray-500">Real-time monitoring and status</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Providers</p>
                <h3 className="text-2xl font-bold mt-1">
                  {activeProviders}/{providers.length}
                </h3>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Balance</p>
                <h3 className="text-2xl font-bold mt-1">
                  {totalBalance.toFixed(2)} ₽
                </h3>
              </div>
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today Purchases</p>
                <h3 className="text-2xl font-bold mt-1">{todayPurchases}</h3>
              </div>
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Response</p>
                <h3 className="text-2xl font-bold mt-1">{avgResponseTime.toFixed(0)}ms</h3>
              </div>
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Configuration */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Intelligent Routing</CardTitle>
                <p className="text-sm text-gray-500">Configure how the system selects providers for purchases</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <img src="/icons/5sim.png" className="w-6 h-6 object-contain opacity-50 grayscale data-[active=true]:opacity-100 data-[active=true]:grayscale-0" />
              <img src="/icons/sms-activate.png" className="w-6 h-6 object-contain opacity-50 grayscale data-[active=true]:opacity-100 data-[active=true]:grayscale-0" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mode Selection */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">Active Mode</label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'sms-activate', label: 'SMS Activate Only', desc: 'Force all purchases via SMS Activate' },
                  { id: '5sim', label: '5sim Only', desc: 'Force all purchases via 5sim' },
                  { id: 'grizzly', label: 'Grizzly SMS Only', desc: 'Force all purchases via Grizzly SMS (Reliable)' },
                  { id: 'textverified', label: 'TextVerified Only', desc: 'Force all purchases via TextVerified (Premium USA/UK)' },
                  { id: 'smspva', label: 'SMSPVA Only', desc: 'Force all purchases via SMSPVA' },
                  { id: 'onlinesim', label: 'OnlineSIM Only', desc: 'Force all purchases via OnlineSIM' },
                  { id: 'smart', label: 'Smart Selection (Auto)', desc: 'Automatically choose best provider per purchase' }
                ].map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => handleUpdateSetting('sms_provider_mode', mode.id)}
                    className={`relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${settings['sms_provider_mode'] === mode.id
                      ? 'border-blue-500 bg-white shadow-sm'
                      : 'border-transparent hover:bg-white/50'
                      }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${settings['sms_provider_mode'] === mode.id ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                      {settings['sms_provider_mode'] === mode.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${settings['sms_provider_mode'] === mode.id ? 'text-blue-700' : 'text-gray-700'
                        }`}>{mode.label}</p>
                      <p className="text-xs text-gray-500">{mode.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Strategy (Only if Smart) */}
            <div className={`space-y-4 transition-opacity duration-300 ${settings['sms_provider_mode'] === 'smart' ? 'opacity-100' : 'opacity-50 pointer-events-none'
              }`}>
              <label className="text-sm font-medium text-gray-700">Optimization Strategy</label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'cheapest', label: '💰 Lowest Price', desc: 'Always choose the cheapest option' },
                  { id: 'reliable', label: '✅ Highest Reliability', desc: 'Prioritize success rate over price' },
                  { id: 'fastest', label: '⚡ Fastest Delivery', desc: 'Prioritize speed and stock availability' }
                ].map((strategy) => (
                  <div
                    key={strategy.id}
                    onClick={() => handleUpdateSetting('sms_provider_strategy', strategy.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${settings['sms_provider_strategy'] === strategy.id
                      ? 'border-green-500 bg-white shadow-sm'
                      : 'border-gray-200 bg-gray-50'
                      }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${settings['sms_provider_strategy'] === strategy.id ? 'border-green-500' : 'border-gray-300'
                      }`}>
                      {settings['sms_provider_strategy'] === strategy.id && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{strategy.label}</p>
                      <p className="text-xs text-gray-500">{strategy.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Status */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 h-fit">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                System Health
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Current Logic</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 capitalize">
                    {settings['sms_provider_mode'] === 'smart'
                      ? `Auto (${settings['sms_provider_strategy']})`
                      : settings['sms_provider_mode'] || 'SMS Activate'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">5sim Balance</span>
                  <span className="font-mono">{providers.find(p => p.name === '5sim')?.balance.toFixed(2) ?? '0.00'} ₽</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">SMS-Activate Balance</span>
                  <span className="font-mono">{providers.find(p => p.name === 'SMS-Activate')?.balance.toFixed(2) ?? '0.00'} ₽</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">SMSPVA Balance</span>
                  <span className="font-mono">{providers.find(p => p.name === 'SMSPVA')?.balance.toFixed(2) ?? '0.00'} $</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">OnlineSIM Balance</span>
                  <span className="font-mono">{providers.find(p => p.name === 'OnlineSIM')?.balance.toFixed(2) ?? '0.00'} $</span>
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-center text-gray-400">
                    Changes are applied immediately to all new orders
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Providers - Always visible */}
      <h2 className="text-xl font-bold mt-8 mb-4">Providers Disponibles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* SMS-Activate Card */}
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <CardTitle className="text-lg">SMS-Activate</CardTitle>
                  <p className="text-sm text-gray-500">sms-activate.ae</p>
                </div>
              </div>
              {providers.find(p => p.name === 'SMS-Activate')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider principal pour les activations SMS. Large couverture mondiale.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: 'SMS-Activate', status: 'inactive', balance: 0, currency: 'RUB', apiUrl: 'https://sms-activate.ae', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer la clé API
            </Button>
          </CardContent>
        </Card>

        {/* 5sim Card */}
        <Card className="border-l-4 border-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">5️⃣</span>
                </div>
                <div>
                  <CardTitle className="text-lg">5sim</CardTitle>
                  <p className="text-sm text-gray-500">5sim.net</p>
                </div>
              </div>
              {providers.find(p => p.name === '5sim')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider alternatif avec des prix compétitifs. Bonne disponibilité.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: '5sim', status: 'inactive', balance: 0, currency: 'RUB', apiUrl: 'https://5sim.net', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer la clé API
            </Button>
          </CardContent>
        </Card>

        {/* SMSPVA Card */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🟢</span>
                </div>
                <div>
                  <CardTitle className="text-lg">SMSPVA</CardTitle>
                  <p className="text-sm text-gray-500">smspva.com</p>
                </div>
              </div>
              {providers.find(p => p.name === 'SMSPVA')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider SMS avec bonne disponibilité internationale.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: 'SMSPVA', status: 'inactive', balance: 0, currency: 'USD', apiUrl: 'https://smspva.com', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer la clé API
            </Button>
          </CardContent>
        </Card>

        {/* OnlineSIM Card */}
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🌐</span>
                </div>
                <div>
                  <CardTitle className="text-lg">OnlineSIM</CardTitle>
                  <p className="text-sm text-gray-500">onlinesim.io</p>
                </div>
              </div>
              {providers.find(p => p.name === 'OnlineSIM')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider avec support Rent (location longue durée).
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: 'OnlineSIM', status: 'inactive', balance: 0, currency: 'USD', apiUrl: 'https://onlinesim.io', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer la clé API
            </Button>
          </CardContent>
        </Card>

        {/* Grizzly SMS Card */}
        <Card className="border-l-4 border-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🐻</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Grizzly SMS</CardTitle>
                  <p className="text-sm text-gray-500">grizzlysms.com</p>
                </div>
              </div>
              {providers.find(p => p.name === 'Grizzly SMS')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider fiable pour activation, meilleur que 5sim. Remplace 5sim comme workhorse principal.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: 'Grizzly SMS', status: 'inactive', balance: 0, currency: 'USD', apiUrl: 'https://api.grizzlysms.com', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer la clé API
            </Button>
          </CardContent>
        </Card>

        {/* SMSPool Card - High Quality */}
        <Card className="border-l-4 border-indigo-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🏊</span>
                </div>
                <div>
                  <CardTitle className="text-lg">SMSPool</CardTitle>
                  <p className="text-sm text-gray-500">smspool.net</p>
                </div>
              </div>
              {providers.find(p => p.name === 'SMSPool')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : providers.find(p => p.name === 'SMSPool')?.status === 'error' ? (
                <Badge className="bg-red-100 text-red-800">Erreur</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider "Premium" pour les services US/EU difficiles (WhatsApp, Tinder, Google). Très haute qualité.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: 'SMSPool', status: 'inactive', balance: 0, currency: 'USD', apiUrl: 'https://smspool.net', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer la clé API
            </Button>
          </CardContent>
        </Card>

        {/* TextVerified Card */}
        <Card className="border-l-4 border-pink-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💎</span>
                </div>
                <div>
                  <CardTitle className="text-lg">TextVerified</CardTitle>
                  <p className="text-sm text-gray-500">textverified.com</p>
                </div>
              </div>
              {providers.find(p => p.name === 'TextVerified')?.status === 'active' ? (
                <Badge className="bg-green-100 text-green-800">Connecté</Badge>
              ) : providers.find(p => p.name === 'TextVerified')?.status === 'error' ? (
                <Badge className="bg-red-100 text-red-800">Erreur</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Non configuré</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Provider Premium USA/UK. Non-VoIP pour WhatsApp/TikTok. Très fiable mais cher (1-2.5 Ⓐ).
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedProvider({ name: 'TextVerified', status: 'inactive', balance: 0, currency: 'USD', apiUrl: 'https://www.textverified.com', lastCheck: '' })
                setNewApiKey('')
                setConfigOpen(true)
              }}
            >
              <Key className="w-4 h-4" />
              Configurer les credentials
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <h2 className="text-xl font-bold mt-8 mb-4">Connectivities</h2>
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Chargement des providers...</p>
          </CardContent>
        </Card>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Aucun provider configuré</h3>
            <p className="text-gray-500 mb-4">
              Configurez vos clés API dans les paramètres système
            </p>
            <Button onClick={() => window.location.href = '/admin/settings'}>
              Aller aux paramètres
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((provider) => {
            const statusBadge = getStatusBadge(provider.status)
            const isHealthy = provider.status === 'active' && provider.balance > 100

            return (
              <Card key={provider.name} className={`border-l-4 ${isHealthy ? 'border-green-500' :
                provider.status === 'error' ? 'border-red-500' :
                  'border-yellow-500'
                }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(provider.status)}
                      <div>
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        <p className="text-sm text-gray-500">{provider.apiUrl}</p>
                      </div>
                    </div>
                    <Badge className={statusBadge.class}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {provider.status === 'error' ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900">Erreur de connexion</p>
                          <p className="text-sm text-red-700 mt-1">{provider.error}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Balance Warning */}
                      {provider.balance < 100 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <p className="text-sm text-yellow-800">
                              Balance faible - Rechargez votre compte
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs font-medium">Balance</span>
                          </div>
                          <p className="text-lg font-bold">
                            {provider.balance.toFixed(2)} {provider.currency}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs font-medium">Today</span>
                          </div>
                          <p className="text-lg font-bold">
                            {provider.stats?.todayPurchases || 0} SMS
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-medium">Response</span>
                          </div>
                          <p className="text-lg font-bold">
                            {provider.stats?.avgResponseTime || 0}ms
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium">Last Check</span>
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(provider.lastCheck).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => openConfig(provider)}
                      className="flex-1 gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Configurer
                    </Button>
                    <Button
                      variant={provider.status === 'error' ? 'destructive' : 'default'}
                      className="flex-1"
                    >
                      Voir détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer {selectedProvider?.name}</DialogTitle>
            <DialogDescription>
              {selectedProvider?.name === 'TextVerified' ? (
                'Entrez votre API Key et l\'email de votre compte TextVerified. Ces informations seront stockées de manière sécurisée.'
              ) : (
                `Entrez la clé API pour ${selectedProvider?.name}. Cette clé sera stockée de manière sécurisée.`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{selectedProvider?.name === 'TextVerified' ? 'API Key' : 'Clé API'}</Label>
              <div className="relative">
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={selectedProvider?.name === 'TextVerified' ? 'Entrez votre API Key...' : 'Entrez la nouvelle clé API...'}
                  className="pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <Key className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {selectedProvider?.name === 'TextVerified' ? 'Obtenue depuis votre dashboard TextVerified' : 'Laissez vide pour annuler. La clé actuelle n\'est pas affichée pour des raisons de sécurité.'}
              </p>
            </div>

            {/* Second field for TextVerified (Email) */}
            {selectedProvider?.name === 'TextVerified' && (
              <div className="space-y-2">
                <Label>Account Email (Username)</Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={newApiUsername}
                    onChange={(e) => setNewApiUsername(e.target.value)}
                    placeholder="votre-email@example.com"
                    className="pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    <span className="text-lg">📧</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  L'email de votre compte TextVerified (utilisé comme username pour l'authentification)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveApiKey}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Configuration des Providers</h3>
              <p className="text-sm text-blue-800 mb-2">
                Les providers sont configurés via les paramètres système. Assurez-vous d'avoir:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• <strong>SMS-Activate:</strong> Clé API configurée dans SMS_ACTIVATE_API_KEY</li>
                <li>• <strong>5sim:</strong> Clé API configurée dans FIVESIM_API_KEY</li>
                <li>• <strong>SMSPVA:</strong> Clé API configurée dans SMSPVA_API_KEY</li>
                <li>• <strong>OnlineSIM:</strong> Clé API configurée dans ONLINESIM_API_KEY</li>
                <li>• <strong>Balance minimum:</strong> Maintenez un solde suffisant sur chaque provider</li>
              </ul>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => window.location.href = '/admin/settings'}
              >
                Configurer maintenant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
