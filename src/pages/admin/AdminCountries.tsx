// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw, Plus, Edit, Ban, Globe, Eye, Loader2 } from 'lucide-react'
import { getCountries, updateCountry, triggerSync, getLatestSyncLog, type Country } from '@/lib/sync-service'
import { getCountryFlag, getFlagEmoji } from '@/lib/logo-service'

export default function AdminCountries() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ['admin-countries', searchTerm, statusFilter],
    queryFn: () => getCountries({
      search: searchTerm || undefined,
      active: statusFilter === 'all' ? undefined : statusFilter === 'active'
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
        description: `${data.stats?.countries || 0} pays synchronisés`
      })
      queryClient.invalidateQueries({ queryKey: ['admin-countries'] })
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

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Country> }) => 
      updateCountry(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-countries'] })
      toast({ title: 'Pays mis à jour' })
    }
  })

  // Handlers
  const handleToggleActive = (country: Country) => {
    updateMutation.mutate({
      id: country.id,
      updates: { active: !country.active }
    })
  }

  // Stats
  const totalCountries = countries.length
  const activeCountries = countries.filter(c => c.active).length
  const avgMultiplier = countries.length > 0
    ? (countries.reduce((sum, c) => sum + Number(c.price_multiplier || 1), 0) / countries.length).toFixed(2)
    : '1.00'
  const premiumCountries = countries.filter(c => Number(c.price_multiplier || 1) >= 1.3).length

  const stats = [
    { label: 'Total Countries', value: totalCountries, icon: Globe },
    { label: 'Active', value: activeCountries, icon: Eye },
    { label: 'Inactive', value: totalCountries - activeCountries, icon: Ban },
    { label: 'Avg Multiplier', value: `x${avgMultiplier}`, icon: Plus },
    { label: 'Premium (≥1.3x)', value: premiumCountries, icon: Plus }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Countries Management</h1>
          <p className="text-gray-500">
            {activeCountries} actifs / {totalCountries} pays
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <stat.icon className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Countries Table */}
      <Card>
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Chargement des pays...</p>
          </div>
        ) : countries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">Aucun pays trouvé</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Multiplicateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {countries.map(country => (
                  <tr key={country.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded border border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                          <img 
                            src={getCountryFlag(country.code)} 
                            alt={country.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to emoji if flag fails to load
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const emoji = target.nextElementSibling as HTMLSpanElement
                              if (emoji) emoji.style.display = 'flex'
                            }}
                          />
                          <span className="text-2xl hidden items-center justify-center">{getFlagEmoji(country.code)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{country.name}</div>
                          <div className="text-xs text-gray-500">{country.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={country.active ? 'success' : 'destructive'}>
                        {country.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">x{Number(country.price_multiplier || 1).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-600 font-medium">
                        {country.available_numbers?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-blue-600">{country.provider}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleToggleActive(country)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Toggle Active"
                        >
                          <Ban className={`w-4 h-4 ${country.active ? 'text-orange-500' : 'text-green-500'}`} />
                        </button>
                      </div>
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
