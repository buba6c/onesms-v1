import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, TrendingUp, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

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

export default function AdminMonitoring() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [countries, setCountries] = useState<CountryHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch dashboard stats
      const { data: statsData } = await supabase
        .from('v_dashboard_stats')
        .select('*')
        .single()

      // Fetch service health
      const { data: servicesData } = await supabase
        .from('v_service_health')
        .select('*')
        .order('total_activations_24h', { ascending: false })

      // Fetch country health
      const { data: countriesData } = await supabase
        .from('v_country_health')
        .select('*')
        .order('total_activations_24h', { ascending: false })

      setStats(statsData)
      setServices(servicesData || [])
      setCountries(countriesData || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'text-green-600 bg-green-100'
      case 'GOOD':
        return 'text-blue-600 bg-blue-100'
      case 'WARNING':
        return 'text-orange-600 bg-orange-100'
      case 'CRITICAL':
        return 'text-red-600 bg-red-100'
      case 'HEALTHY':
        return 'text-green-600 bg-green-100'
      case 'INSUFFICIENT_DATA':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
      case 'GOOD':
      case 'HEALTHY':
        return <CheckCircle className="h-5 w-5" />
      case 'WARNING':
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Système</h1>
          <p className="text-gray-600 mt-1">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Global Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status Global</p>
                  <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.global_health_status)}`}>
                    {getStatusIcon(stats.global_health_status)}
                    {stats.global_health_status}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total (24h)</p>
                  <p className="text-2xl font-bold mt-1">{stats.total_activations_24h}</p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Succès</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.successful_24h}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Annulés</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{stats.cancelled_24h}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-400" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taux de Succès</p>
                  <p className="text-2xl font-bold mt-1">{stats.global_success_rate_pct}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taux de succès global</span>
                <span className="font-bold">{stats.global_success_rate_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    stats.global_success_rate_pct >= 60
                      ? 'bg-green-600'
                      : stats.global_success_rate_pct >= 35
                      ? 'bg-orange-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(stats.global_success_rate_pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>35% (Warning)</span>
                <span>60% (Good)</span>
                <span>100%</span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Services Health */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Santé des Services (24h)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Service</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-right py-3 px-4">Succès</th>
                <th className="text-right py-3 px-4">Annulés</th>
                <th className="text-right py-3 px-4">Timeout</th>
                <th className="text-right py-3 px-4">Taux</th>
                <th className="text-center py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.service_code} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{service.service_code}</td>
                    <td className="text-right py-3 px-4">{service.total_activations_24h}</td>
                    <td className="text-right py-3 px-4 text-green-600">
                      {service.successful_activations}
                    </td>
                    <td className="text-right py-3 px-4 text-orange-600">
                      {service.cancelled_activations}
                    </td>
                    <td className="text-right py-3 px-4 text-red-600">
                      {service.timeout_activations}
                    </td>
                    <td className="text-right py-3 px-4 font-bold">
                      {service.success_rate_pct}%
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          service.health_status
                        )}`}
                      >
                        {getStatusIcon(service.health_status)}
                        {service.health_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Countries Health */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Santé des Pays (24h)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Pays</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-right py-3 px-4">Succès</th>
                <th className="text-right py-3 px-4">Taux</th>
                <th className="text-center py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {countries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              ) : (
                countries.slice(0, 10).map((country) => (
                  <tr key={country.country_code} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{country.country_code}</td>
                    <td className="text-right py-3 px-4">{country.total_activations_24h}</td>
                    <td className="text-right py-3 px-4 text-green-600">
                      {country.successful_activations}
                    </td>
                    <td className="text-right py-3 px-4 font-bold">
                      {country.success_rate_pct}%
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          country.health_status
                        )}`}
                      >
                        {getStatusIcon(country.health_status)}
                        {country.health_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alerts */}
      {stats && stats.global_success_rate_pct < 35 && (
        <Card className="p-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900 mb-1">Alerte Critique</h3>
              <p className="text-red-800">
                Le taux de succès est inférieur à 35%. Veuillez vérifier les services et pays
                en difficulté ci-dessus et désactiver ceux qui ne fonctionnent pas.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
