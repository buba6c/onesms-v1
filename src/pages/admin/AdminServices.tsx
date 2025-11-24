import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw, Plus, Edit, Star, Ban, Trash2, Loader2 } from 'lucide-react'
import { 
  getServices, 
  updateService, 
  triggerSync,
  updatePopularityScores,
  updateSuccessRates,
  getServiceStats, 
  getLatestSyncLog,
  type Service 
} from '@/lib/sync-service'
import { getServiceIcon, getServiceLogo, getServiceLogoFallback } from '@/lib/logo-service'

// Gestionnaire d'erreur pour les images - utilise fallback SVG
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, serviceCode?: string) => {
  const target = e.target as HTMLImageElement
  
  // Empêcher les multiples déclenchements et boucles infinies
  if (target.dataset.fallbackLoaded === 'true') {
    console.warn('⚠️ [ADMIN] Fallback also failed, showing emoji:', serviceCode)
    // Si le fallback échoue aussi, afficher l'emoji
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
    return
  }
  
  // Si on a un serviceCode, charger le fallback SVG
  if (serviceCode) {
    console.log('🔄 [ADMIN] Loading fallback for:', serviceCode)
    target.dataset.fallbackLoaded = 'true'
    target.src = getServiceLogoFallback(serviceCode)
  } else {
    // Sinon, afficher l'emoji directement
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
  }
  
  target.src = TRANSPARENT_PIXEL
  const emoji = target.nextElementSibling as HTMLSpanElement
  if (emoji) {
    emoji.style.display = 'block'
    target.style.display = 'none'
  }
}

export default function AdminServices() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch services (pas besoin d'icon_url, tout via Logo.dev)
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services', searchTerm, categoryFilter, statusFilter],
    queryFn: async () => {
      return await getServices({
        search: searchTerm || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined
      });
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['service-stats'],
    queryFn: getServiceStats
  })

  // Fetch latest sync
  const { data: latestSync } = useQuery({
    queryKey: ['latest-sync'],
    queryFn: getLatestSyncLog,
    refetchInterval: 5000
  })

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Sync completed!',
          description: `Synced ${result.stats?.services || 0} services, ${result.stats?.countries || 0} countries, ${result.stats?.prices || 0} prices`
        })
        queryClient.invalidateQueries({ queryKey: ['admin-services'] })
        queryClient.invalidateQueries({ queryKey: ['service-stats'] })
        queryClient.invalidateQueries({ queryKey: ['latest-sync'] })
      } else {
        toast({
          title: 'Sync failed',
          description: result.error,
          variant: 'destructive'
        })
      }
    }
  })

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Service> }) => 
      updateService(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
      toast({ title: 'Service updated successfully' })
    }
  })

  const handleToggleActive = (service: Service) => {
    updateMutation.mutate({
      id: service.id,
      updates: { active: !service.active }
    })
  }

  const handleTogglePopular = (service: Service) => {
    updateMutation.mutate({
      id: service.id,
      updates: { popularity_score: service.popularity_score >= 50 ? 0 : 100 }
    })
  }

  const statCards = [
    { label: 'Total Services', value: stats?.totalServices || 0, color: 'text-gray-500' },
    { label: 'Active', value: stats?.activeServices || 0, color: 'text-green-500' },
    { label: 'Popular', value: stats?.popularServices || 0, color: 'text-orange-500' },
    { label: 'Total Numbers', value: stats?.totalAvailable?.toLocaleString() || '0', color: 'text-blue-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services Management</h1>
          <p className="text-gray-500">
            {stats?.activeServices || 0} active / {stats?.totalServices || 0} services
          </p>
          {latestSync && (
            <p className="text-xs text-gray-400 mt-1">
              Last sync: {new Date(latestSync.started_at).toLocaleString()} - {latestSync.status}
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
            Sync with 5sim
          </Button>
          <Button 
            variant="outline" 
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
            onClick={async () => {
              try {
                toast({ title: '🔄 Updating scores...', description: 'This may take a few seconds' });
                const result = await updatePopularityScores();
                if (result.success) {
                  toast({ title: '✅ Popularity scores updated!', description: result.message });
                  queryClient.invalidateQueries({ queryKey: ['admin-services'] });
                  queryClient.invalidateQueries({ queryKey: ['service-stats'] });
                } else {
                  toast({ title: '❌ Update failed', description: result.error, variant: 'destructive' });
                }
              } catch (err: any) {
                toast({ title: '❌ Update failed', description: err.message, variant: 'destructive' });
              }
            }}
          >
            <Star className="w-4 h-4 mr-2" />
            Update Scores
          </Button>
          <Button 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50"
            onClick={async () => {
              try {
                toast({ title: '🌍 Updating rates...', description: 'Calculating from real data' });
                const result = await updateSuccessRates();
                if (result.success) {
                  toast({ title: '✅ Success rates updated!', description: result.message });
                  queryClient.invalidateQueries({ queryKey: ['admin-services'] });
                } else {
                  toast({ title: '❌ Update failed', description: result.error, variant: 'destructive' });
                }
              } catch (err: any) {
                toast({ title: '❌ Update failed', description: err.message, variant: 'destructive' });
              }
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Rates
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Categories</option>
              <option value="social">Social</option>
              <option value="tech">Tech</option>
              <option value="other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Services Table */}
      <Card>
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No services found</p>
            <Button onClick={() => syncMutation.mutate()} className="bg-purple-600">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync with 5sim
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Popular</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.map(service => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                          <img 
                            src={getServiceLogo(service.code)} 
                            alt={service.name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => handleImageError(e, service.code)}
                          />
                          <span className="text-2xl hidden">{getServiceIcon(service.code)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{service.display_name || service.name}</div>
                          <div className="text-xs text-gray-500">{service.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={service.active ? 'success' : 'destructive'}>
                        {service.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm capitalize">{service.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{service.popularity_score >= 50 ? '⭐ Yes' : 'No'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-500 font-medium">
                        {service.total_available?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleTogglePopular(service)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Toggle Popular"
                        >
                          <Star className={`w-4 h-4 ${service.popularity_score >= 50 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                        </button>
                        <button 
                          onClick={() => handleToggleActive(service)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Toggle Active"
                        >
                          <Ban className={`w-4 h-4 ${service.active ? 'text-orange-500' : 'text-green-500'}`} />
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
