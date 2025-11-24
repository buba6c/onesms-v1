// @ts-nocheck
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Download, Eye } from 'lucide-react'

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    setTransactions(data || [])
  }

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  const pending = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  const refunded = transactions.filter(t => t.type === 'refund').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0)

  const stats = [
    { label: 'Total Revenue', value: `${Math.floor(totalRevenue)}`, icon: '💰', color: 'text-green-500' },
    { label: 'Pending', value: `${Math.floor(pending)}`, icon: '⏳', color: 'text-yellow-500' },
    { label: 'Refunded', value: `${Math.floor(refunded)}`, icon: '🔄', color: 'text-red-500' },
    { label: 'Success Rate', value: 'NaN%', icon: '📊', color: 'text-blue-500' }
  ]

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'success'
      case 'pending': return 'warning'
      case 'failed': return 'destructive'
      default: return 'secondary'
    }
  }

  const getTypeColor = (type) => {
    switch(type) {
      case 'purchase': return 'bg-blue-100 text-blue-700'
      case 'recharge': return 'bg-blue-100 text-blue-700'
      case 'refund': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-gray-500">{transactions.length} total transactions (données de test)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTransactions} variant="outline" className="bg-green-600 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
          <Button className="bg-blue-600">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

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
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="recharge">Recharge</option>
              <option value="refund">Refund</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Aucune transaction</td>
                </tr>
              ) : (
                transactions.map((tx, i) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">TXN{String(i + 1).padStart(3, '0')}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{tx.description || 'Transaction'}</div>
                        <div className="text-xs text-gray-500">User: user{i + 1}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${getTypeColor(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${parseFloat(tx.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {parseFloat(tx.amount) > 0 ? '+' : ''}{Math.floor(tx.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(tx.status)}>{tx.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
