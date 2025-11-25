import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Activity,
  DollarSign,
  Zap,
  Globe,
  Clock
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

      {/* Providers List */}
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
              <Card key={provider.name} className={`border-l-4 ${
                isHealthy ? 'border-green-500' : 
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
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(provider.apiUrl, '_blank')}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.location.href = '/admin/settings'}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
                <li>• <strong>Balance minimum:</strong> Maintenez au moins 100 RUB sur chaque provider</li>
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
