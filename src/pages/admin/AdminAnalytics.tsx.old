// @ts-nocheck
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, Phone } from 'lucide-react'

export default function AdminAnalytics() {
  const stats = [
    { label: 'Revenue This Month', value: '12,456€', trend: '+18.2%', trendUp: true, icon: '💰' },
    { label: 'New Users', value: '342', trend: '+12.5%', trendUp: true, icon: '👥' },
    { label: 'Numbers Sold', value: '1,234', trend: '+8.3%', trendUp: true, icon: '📱' },
    { label: 'Conversion Rate', value: '23.4%', trend: '-2.1%', trendUp: false, icon: '📊' }
  ]

  const popularServices = [
    { name: 'WhatsApp', uses: 456, revenue: '1234€' },
    { name: 'Telegram', uses: 389, revenue: '987€' },
    { name: 'Facebook', uses: 267, revenue: '756€' },
    { name: 'Instagram', uses: 198, revenue: '543€' },
    { name: 'Twitter', uses: 145, revenue: '421€' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-500">Detailed insights and metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
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
                    <span className="text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">📊</span>
              <h3 className="font-semibold">Revenue Chart</h3>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Chart will be here (use Chart.js or Recharts)</p>
            </div>
          </CardContent>
        </Card>

        {/* Users Growth */}
        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Users className="text-green-500" />
              <h3 className="font-semibold">Users Growth</h3>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Chart will be here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Services */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="font-semibold">Popular Services</h3>
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            {popularServices.map((service, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {service.name.charAt(0)}
                  </div>
                  <span className="font-medium text-white">{service.name}</span>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Uses</div>
                    <div className="font-medium text-white">{service.uses}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Revenue</div>
                    <div className="font-medium text-green-500">{service.revenue}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
