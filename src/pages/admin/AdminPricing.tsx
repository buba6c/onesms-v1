import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, RefreshCw, DollarSign, TrendingUp, Package, Loader2, Globe, AlertCircle, Info } from 'lucide-react'
import { supabase, cloudFunctions } from '@/lib/supabase'

// Fetch real-time prices from edge function
const fetchRealTimePrices = async (country: string, service?: string) => {
  // Build URL with query params
  let functionUrl = `get-real-time-prices?country=${country}&type=activation`
  if (service) functionUrl += `&service=${service}`
  
  const { data, error } = await cloudFunctions.invoke(functionUrl)
  
  if (error) throw error
  return data
}

// Liste des pays populaires (hardcodé pour éviter les problèmes de DB)
const POPULAR_COUNTRIES = [
  { code: 'russia', name: 'Russia', flag_emoji: '🇷🇺' },
  { code: 'usa', name: 'USA', flag_emoji: '🇺🇸' },
  { code: 'india', name: 'India', flag_emoji: '🇮🇳' },
  { code: 'indonesia', name: 'Indonesia', flag_emoji: '🇮🇩' },
  { code: 'philippines', name: 'Philippines', flag_emoji: '🇵🇭' },
  { code: 'england', name: 'England', flag_emoji: '🇬🇧' },
  { code: 'france', name: 'France', flag_emoji: '🇫🇷' },
  { code: 'germany', name: 'Germany', flag_emoji: '🇩🇪' },
  { code: 'brazil', name: 'Brazil', flag_emoji: '🇧🇷' },
  { code: 'canada', name: 'Canada', flag_emoji: '🇨🇦' },
  { code: 'australia', name: 'Australia', flag_emoji: '🇦🇺' },
  { code: 'thailand', name: 'Thailand', flag_emoji: '🇹🇭' },
  { code: 'vietnam', name: 'Vietnam', flag_emoji: '🇻🇳' },
  { code: 'malaysia', name: 'Malaysia', flag_emoji: '🇲🇾' },
  { code: 'spain', name: 'Spain', flag_emoji: '🇪🇸' },
  { code: 'italy', name: 'Italy', flag_emoji: '🇮🇹' },
  { code: 'netherlands', name: 'Netherlands', flag_emoji: '🇳🇱' },
  { code: 'mexico', name: 'Mexico', flag_emoji: '🇲🇽' },
  { code: 'ukraine', name: 'Ukraine', flag_emoji: '🇺🇦' },
  { code: 'poland', name: 'Poland', flag_emoji: '🇵🇱' },
]

interface ServiceOption {
  code: string;
  name: string;
}

// Get list of services
const fetchServices = async (): Promise<ServiceOption[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('code, name')
    .eq('active', true)
    .order('name')
  
  if (error) throw error
  return (data || []) as ServiceOption[]
}

export default function AdminPricing() {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('russia')
  const [selectedService, setSelectedService] = useState('')

  // Use hardcoded countries list
  const countries = POPULAR_COUNTRIES

  // Fetch services list
  const { data: services = [] } = useQuery({
    queryKey: ['admin-services-list'],
    queryFn: fetchServices
  })

  // Fetch real-time prices
  const { data: pricesData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['real-time-prices', selectedCountry, selectedService],
    queryFn: () => fetchRealTimePrices(selectedCountry, selectedService || undefined),
    enabled: !!selectedCountry,
    staleTime: 30000, // 30 secondes
    refetchInterval: 60000, // Refresh every minute
  })

  // Transform prices data for display - format from edge function: { success, data: [...], meta }
  const pricesList = pricesData?.data 
    ? pricesData.data.map((item: any) => ({
        service_code: item.serviceCode,
        country_code: item.countryCode,
        cost: item.priceUSD || 0,
        priceCoins: item.priceCoins || 0,
        count: item.count || 0,
        // Selling price is already calculated with margin by the edge function
        selling_price: item.priceCoins || 0,
        margin: pricesData.meta?.marginPercentage || 10
      }))
    : []

  // Filter by search
  const filteredPrices = pricesList.filter((price: any) => {
    if (!searchTerm) return true
    return price.service_code.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Stats
  const totalServices = filteredPrices.length
  const totalNumbers = filteredPrices.reduce((sum, p) => sum + (p.count || 0), 0)
  const avgCost = filteredPrices.length > 0
    ? (filteredPrices.reduce((sum, p) => sum + p.cost, 0) / filteredPrices.length).toFixed(2)
    : '0'
  const avgSellingPrice = filteredPrices.length > 0
    ? (filteredPrices.reduce((sum, p) => sum + parseFloat(p.selling_price), 0) / filteredPrices.length).toFixed(2)
    : '0'

  const stats = [
    { label: 'Services disponibles', value: totalServices, icon: Package, color: 'text-blue-600' },
    { label: 'Numéros totaux', value: totalNumbers.toLocaleString(), icon: Globe, color: 'text-green-600' },
    { label: 'Coût moyen', value: `${avgCost} Ⓐ`, icon: DollarSign, color: 'text-orange-600' },
    { label: 'Prix vente moyen', value: `${avgSellingPrice} Ⓐ`, icon: TrendingUp, color: 'text-purple-600' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-cyan-600" />
            </div>
            {t('admin.pricing')}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="h-10 rounded-full px-4 bg-gray-900 text-white hover:bg-black shadow-sm gap-2"
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Prix dynamiques en temps réel</h3>
              <p className="text-sm text-blue-700 mt-1">
                Les prix sont récupérés directement depuis l'API SMS-Activate et peuvent varier à tout moment. 
                Une marge de 30% est automatiquement appliquée aux prix de vente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher un service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">Sélectionner un pays</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.flag_emoji} {country.name}
                </option>
              ))}
            </select>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">Tous les services</option>
              {services.map(service => (
                <option key={service.code} value={service.code}>
                  {service.name}
                </option>
              ))}
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
      <Card className="overflow-hidden shadow-sm border-0 ring-1 ring-gray-100">
        {error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 font-medium mb-2">Erreur de chargement</p>
            <p className="text-gray-500 text-sm mb-4">{(error as Error).message}</p>
            <Button onClick={() => refetch()} variant="outline" className="rounded-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Chargement des prix en temps réel...</p>
          </div>
        ) : !selectedCountry ? (
          <div className="p-12 text-center">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Sélectionnez un pays pour voir les prix</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun prix trouvé pour cette combinaison</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Pays</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Coût API</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Prix Vente</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Marge</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrices.map((price, index) => (
                  <tr key={`${price.service_code}-${index}`} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium uppercase">{price.service_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium uppercase">{price.country_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">{price.cost.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">Ⓐ</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-blue-600">{price.selling_price}</span>
                        <span className="text-xs text-blue-400">Ⓐ</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        +{price.margin}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${price.count > 100 ? 'text-green-600' : price.count > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                        {price.count.toLocaleString()}
                      </span>
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
