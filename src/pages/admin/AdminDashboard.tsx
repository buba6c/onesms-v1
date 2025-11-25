// @ts-nocheck
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Users, DollarSign, Phone, MessageSquare, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  // Auto-refresh every 30s
  const { data: stats = {
    totalUsers: 0,
    totalRevenue: 0,
    activeNumbers: 1,
    smsReceived: 0,
    activeUsers: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    newUsersToday: 0,
    revenueToday: 0
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000 // 30 seconds
  })

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['admin-recent-transactions'],
    queryFn: fetchRecentTransactions,
    refetchInterval: 30000
  })

  const { data: recentUsers = [] } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: fetchRecentUsers,
    refetchInterval: 30000
  })

  async function fetchDashboardStats() {
    return await fetchDashboardData()
  }

  async function fetchRecentTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*, user:users(email)')
      .order('created_at', { ascending: false })
      .limit(5)
    return data || []
  }

  async function fetchRecentUsers() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    return data || []
  }

  const fetchDashboardData = async () => {
    // Fetch users
    const { data: users, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })

    // Fetch transactions
    const { data: transactions, count: transCount } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch virtual numbers
    const { count: numbersCount } = await supabase
      .from('virtual_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Calculate revenue
    const totalRevenue = transactions?.filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0

    const today = new Date().toISOString().split('T')[0]
    const revenueToday = transactions?.filter(t => 
      t.status === 'completed' && t.created_at?.startsWith(today)
    ).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0

    const newUsersToday = users?.filter(u => u.created_at?.startsWith(today)).length || 0

    return {
      totalUsers: usersCount || 0,
      totalRevenue: totalRevenue,
      activeNumbers: numbersCount || 1,
      smsReceived: 0,
      activeUsers: 0,
      avgOrderValue: transCount > 0 ? totalRevenue / transCount : 0,
      conversionRate: 0,
      newUsersToday: newUsersToday,
      revenueToday: revenueToday
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      trend: '+12.5%',
      trendUp: true,
      subtitle: `${stats.newUsersToday} new today`,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Revenue',
      value: `${Math.floor(stats.totalRevenue)}`,
      trend: '+8.2%',
      trendUp: true,
      subtitle: `${Math.floor(stats.revenueToday)} today`,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Active Numbers',
      value: stats.activeNumbers,
      trend: '-3.1%',
      trendUp: false,
      subtitle: `${stats.activeNumbers} total`,
      icon: Phone,
      color: 'bg-purple-500'
    },
    {
      title: 'SMS Received',
      value: stats.smsReceived,
      trend: '+15.7%',
      trendUp: true,
      subtitle: '0 today',
      icon: MessageSquare,
      color: 'bg-orange-500'
    }
  ]

  const secondRowStats = [
    { title: 'Active Users', value: stats.activeUsers, subtitle: 'NaN% of total users' },
    { title: 'Avg Order Value', value: `${Math.floor(stats.avgOrderValue)}`, subtitle: '0 transactions' },
    { title: 'Conversion Rate', value: `${stats.conversionRate}%`, subtitle: '0 pending transactions' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Welcome to One SMS Admin Panel</p>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold mb-2">{stat.value}</h3>
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
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {secondRowStats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold">{stat.value}</h3>
              <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Link to="/admin/transactions" className="text-blue-500 hover:underline text-sm">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentTransactions.map((tx, i) => (
                <tr key={tx.id}>
                  <td className="px-6 py-4 text-sm">{i + 1}</td>
                  <td className="px-6 py-4 text-sm">{tx.description || 'Transaction'}</td>
                  <td className="px-6 py-4 text-sm font-medium">{Math.floor(tx.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tx.created_at).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Users */}
      <Card>
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Users</h3>
          <Link to="/admin/users" className="text-blue-500 hover:underline text-sm">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">{user.name || '-'}</td>
                  <td className="px-6 py-4 text-sm">{Math.floor(user.balance || 0)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">active</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
