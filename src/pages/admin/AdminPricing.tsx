// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw, DollarSign, TrendingUp, Package, Loader2 } from 'lucide-react'
import { getPricingRules, updatePricingRule, triggerSync, getLatestSyncLog, type PricingRule } from '@/lib/sync-service'

export default function AdminPricing() {
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: pricingRules = [], isLoading } = useQuery({
    queryKey: ['admin-pricing', serviceFilter, countryFilter],
    queryFn: () => getPricingRules({
      service_code: serviceFilter === 'all' ? undefined : serviceFilter,
      country_code: countryFilter === 'all' ? undefined : countryFilter,
      active: true
    })
  })

  const { data: latestSync } = useQuery({
    queryKey: ['latest-sync'],
    queryFn: getLatestSyncLog,
    refetchInterval: 5000
  })

  // Mutations
  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: (data) => {
      toast({
        title: 'Synchronisation réussie',
        description: `${data.stats?.prices || 0} prix synchronisés`
      })
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] })
      queryClient.invalidateQueries({ queryKey: ['latest-sync'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur de synchronisation',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Filter data
  const filteredRules = pricingRules.filter(rule => {
    const matchSearch = !searchTerm || 
      rule.service_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.country_code.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  // Stats
  const totalRules = filteredRules.length
  const avgMargin = filteredRules.length > 0
    ? (filteredRules.reduce((sum, r) => sum + Number(r.margin_percentage || 0), 0) / filteredRules.length).toFixed(1)
    : '0'
  const avgActivationPrice = filteredRules.length > 0
    ? (filteredRules.reduce((sum, r) => sum + Number(r.activation_price || 0), 0) / filteredRules.length).toFixed(2)
    : '0'
  const totalAvailable = filteredRules.reduce((sum, r) => sum + Number(r.available_count || 0), 0)

  const stats = [
    { label: 'Total Prices', value: totalRules, icon: Package, color: 'text-blue-600' },
    { label: 'Avg Margin', value: `${avgMargin}%`, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Avg Activation', value: `${avgActivationPrice} Ⓐ`, icon: DollarSign, color: 'text-purple-600' },
    { label: 'Total Available', value: totalAvailable.toLocaleString(), icon: Package, color: 'text-orange-600' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Management</h1>
          <p className="text-gray-500">
            {totalRules} règles de tarification
          </p>
          {latestSync && (
            <p className="text-xs text-gray-400 mt-1">
              Dernière sync: {new Date(latestSync.started_at).toLocaleString()} - {latestSync.status}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || latestSync?.status === 'running'}
          >
            {syncMutation.isPending || latestSync?.status === 'running' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync avec 5sim
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par service ou pays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous les services</option>
            </select>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous les pays</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing Table */}
      <Card>
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Chargement des prix...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">Aucun prix trouvé</p>
            <Button onClick={() => syncMutation.mutate()} className="bg-purple-600">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync avec 5sim
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opérateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coût</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Vente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marge</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium capitalize">{rule.service_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium uppercase">{rule.country_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-gray-600">{rule.operator || 'any'}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">{Number(rule.activation_cost || 0).toFixed(2)}</span>
                        <span className="text-xs">Ⓐ</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-blue-600">{Number(rule.activation_price || 0).toFixed(2)}</span>
                        <span className="text-xs">Ⓐ</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-green-600">
                        {Number(rule.margin_percentage || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{rule.available_count || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={rule.active ? 'success' : 'destructive'}>
                        {rule.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
