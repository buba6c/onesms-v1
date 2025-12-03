import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, Users, Phone, DollarSign, Activity } from 'lucide-react'

export default function AdminAnalytics() {
  const { t } = useTranslation()
  
  // Fetch revenue chart data (last 7 days)
  const { data: revenueData = [] } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as { data: { amount: string; created_at: string }[] | null }

      // Group by day
      const grouped: Record<string, number> = {}
      data?.forEach((t: any) => {
        const date = new Date(t.created_at).toLocaleDateString()
        grouped[date] = (grouped[date] || 0) + parseFloat(t.amount || '0')
      })

      return Object.entries(grouped).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue)
      }))
    },
    refetchInterval: 60000
  })

  // Fetch users growth data (last 7 days)
  const { data: usersData = [] } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as { data: { created_at: string }[] | null }

      // Group by day
      const grouped: Record<string, number> = {}
      data?.forEach((u: any) => {
        const date = new Date(u.created_at).toLocaleDateString()
        grouped[date] = (grouped[date] || 0) + 1
      })

      return Object.entries(grouped).map(([date, count]) => ({
        date,
        users: count
      }))
    },
    refetchInterval: 60000
  })

  // Fetch popular services
  const { data: servicesData = [] } = useQuery({
    queryKey: ['analytics-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('service_code, price')
        .eq('status', 'completed') as { data: { service_code: string; price: string }[] | null }

      // Group by service
      const grouped: Record<string, { count: number; revenue: number }> = {}
      data?.forEach((a: any) => {
        if (!grouped[a.service_code]) {
          grouped[a.service_code] = { count: 0, revenue: 0 }
        }
        grouped[a.service_code].count++
        grouped[a.service_code].revenue += parseFloat(a.price || '0')
      })

      return Object.entries(grouped)
        .map(([service, stats]) => ({
          name: service,
          count: stats.count,
          revenue: Math.round(stats.revenue)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    },
    refetchInterval: 60000
  })

  // Fetch countries distribution
  const { data: countriesData = [] } = useQuery({
    queryKey: ['analytics-countries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('country_code')
        .eq('status', 'completed') as { data: { country_code: string }[] | null }

      // Group by country
      const grouped: Record<string, number> = {}
      data?.forEach((a: any) => {
        grouped[a.country_code] = (grouped[a.country_code] || 0) + 1
      })

      return Object.entries(grouped)
        .map(([country, count]) => ({
          name: country,
          value: count
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    },
    refetchInterval: 60000
  })

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Today stats
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString()) as { data: { amount: string }[] | null }

      const { data: yesterdayTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString()) as { data: { amount: string }[] | null }

      const todayRevenue = todayTransactions?.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0) || 0
      const yesterdayRevenue = yesterdayTransactions?.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0) || 0
      const revenueTrend = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
        : '0'

      // Users
      const { count: todayUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      const { count: yesterdayUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

      const usersTrend = yesterdayUsers && yesterdayUsers > 0
        ? (((todayUsers || 0) - yesterdayUsers) / yesterdayUsers * 100).toFixed(1)
        : '0'

      // Numbers sold
      const { count: todayNumbers } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', today.toISOString())

      const { count: yesterdayNumbers } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

      const numbersTrend = yesterdayNumbers && yesterdayNumbers > 0
        ? (((todayNumbers || 0) - yesterdayNumbers) / yesterdayNumbers * 100).toFixed(1)
        : '0'

      // Conversion rate (completed / total activations)
      const { count: totalActivations } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })

      const { count: completedActivations } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      const conversionRate = totalActivations && totalActivations > 0
        ? ((completedActivations || 0) / totalActivations * 100).toFixed(1)
        : '0'

      return {
        revenue: Math.round(todayRevenue),
        revenueTrend: parseFloat(revenueTrend),
        users: todayUsers || 0,
        usersTrend: parseFloat(usersTrend),
        numbers: todayNumbers || 0,
        numbersTrend: parseFloat(numbersTrend),
        conversionRate: parseFloat(conversionRate)
      }
    },
    refetchInterval: 60000
  })

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  const statCards = [
    {
      label: t('admin.stats.revenueToday'),
      value: `${stats?.revenue || 0} Ⓐ`,
      trend: `${stats?.revenueTrend || 0}%`,
      trendUp: (stats?.revenueTrend || 0) >= 0,
      icon: DollarSign,
      color: 'text-green-500'
    },
    {
      label: t('admin.stats.newUsers'),
      value: stats?.users || 0,
      trend: `${stats?.usersTrend || 0}%`,
      trendUp: (stats?.usersTrend || 0) >= 0,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      label: t('admin.stats.numbersSold'),
      value: stats?.numbers || 0,
      trend: `${stats?.numbersTrend || 0}%`,
      trendUp: (stats?.numbersTrend || 0) >= 0,
      icon: Phone,
      color: 'text-purple-500'
    },
    {
      label: t('admin.stats.conversionRate'),
      value: `${stats?.conversionRate || 0}%`,
      trend: 'Global',
      trendUp: true,
      icon: Activity,
      color: 'text-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('admin.analytics')}</h1>
        <p className="text-gray-500">{t('admin.analyticsDescription', 'Detailed insights and metrics')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold mb-2">{stat.value}</h3>
                  <div className="flex items-center text-sm">
                    {stat.trendUp ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={stat.trendUp ? 'text-green-500' : 'text-red-500'}>
                      {stat.trend}
                    </span>
                    <span className="text-gray-500 ml-1">vs yesterday</span>
                  </div>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Users Growth */}
        <Card>
          <CardHeader>
            <CardTitle>New Users (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Countries Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={countriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {countriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Popular Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Services Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {servicesData.map((service, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {service.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium capitalize">{service.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{service.count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-green-600">{service.revenue} Ⓐ</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
