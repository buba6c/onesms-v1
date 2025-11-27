// @ts-nocheck
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Download, Eye, XCircle, Search } from 'lucide-react'

export default function AdminTransactions() {
  const { t } = useTranslation();
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  // Fetch transactions with auto-refresh
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', typeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          user:users(id, email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query
      return data || []
    },
    refetchInterval: 30000 // Refresh every 30s
  })

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      // Create refund transaction
      const { error: refundError } = await supabase
        .from('transactions')
        .insert({
          user_id: transaction.user_id,
          type: 'refund',
          amount: -Math.abs(parseFloat(transaction.amount)),
          status: 'completed',
          description: `Refund for transaction ${transactionId}`,
          metadata: { original_transaction_id: transactionId }
        })

      if (refundError) throw refundError

      // Credit back user
      const { error: creditError } = await supabase.rpc('add_credits', {
        user_id: transaction.user_id,
        credits_to_add: Math.abs(parseFloat(transaction.amount))
      })

      if (creditError) throw creditError

      // Mark original as refunded
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'refunded' })
        .eq('id', transactionId)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      toast({
        title: '✅ Remboursement effectué',
        description: 'Le crédit a été recrédité à l\'utilisateur'
      })
      setSelectedTransaction(null)
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Export to CSV
  const handleExport = () => {
    const headers = ['ID', 'User', 'Type', 'Amount', 'Status', 'Date', 'Description']
    const rows = transactions.map(t => [
      t.id,
      t.user?.email || 'N/A',
      t.type,
      t.amount,
      t.status,
      new Date(t.created_at).toLocaleString(),
      (t.description || '').replace(/,/g, ';')
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: '✅ Export réussi',
      description: `${transactions.length} transactions exportées`
    })
  }

  // Filter by search term
  const filteredTransactions = transactions.filter(t => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      t.id?.toLowerCase().includes(searchLower) ||
      t.user?.email?.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    )
  })

  const totalRevenue = filteredTransactions.filter(t => t.status === 'completed' && parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  const pending = filteredTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  const refunded = filteredTransactions.filter(t => t.status === 'refunded').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0)
  const successRate = transactions.length > 0 ? ((filteredTransactions.filter(t => t.status === 'completed').length / transactions.length) * 100).toFixed(1) : '0'

  const stats = [
    { label: 'Total Revenue', value: `${Math.floor(totalRevenue)} Ⓐ`, icon: '💰', color: 'text-green-500' },
    { label: 'Pending', value: `${Math.floor(pending)} Ⓐ`, icon: '⏳', color: 'text-yellow-500' },
    { label: 'Refunded', value: `${Math.floor(refunded)} Ⓐ`, icon: '🔄', color: 'text-red-500' },
    { label: 'Success Rate', value: `${successRate}%`, icon: '📊', color: 'text-blue-500' }
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
          <p className="text-gray-500">{filteredTransactions.length} transactions affichées sur {transactions.length} total</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
          <Button onClick={handleExport} disabled={transactions.length === 0}>
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par ID, email, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous types</option>
              <option value="purchase">Purchase</option>
              <option value="recharge">Recharge</option>
              <option value="refund">Refund</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous statuts</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Aucune transaction trouvée</td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">{tx.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{tx.description || 'Transaction'}</div>
                        <div className="text-xs text-gray-500">{tx.user?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${getTypeColor(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${parseFloat(tx.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {parseFloat(tx.amount) > 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(2)} Ⓐ
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(tx.status)}>{tx.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={() => setSelectedTransaction(tx)}
                      >
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

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Transaction Details</h3>
                <Button variant="ghost" onClick={() => setSelectedTransaction(null)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">ID</label>
                    <p className="font-mono text-sm">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(selectedTransaction.status)}>
                        {selectedTransaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${getTypeColor(selectedTransaction.type)}`}>
                        {selectedTransaction.type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className={`text-lg font-bold ${parseFloat(selectedTransaction.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {parseFloat(selectedTransaction.amount) > 0 ? '+' : ''}{parseFloat(selectedTransaction.amount).toFixed(2)} Ⓐ
                    </p>
                  </div>
                </div>

                {selectedTransaction.user && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">User</label>
                    <p className="mt-1">{selectedTransaction.user.email}</p>
                    {selectedTransaction.user.full_name && (
                      <p className="text-sm text-gray-500">{selectedTransaction.user.full_name}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1">{selectedTransaction.description || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="mt-1">{new Date(selectedTransaction.created_at).toLocaleString('fr-FR')}</p>
                </div>

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Metadata</label>
                    <pre className="mt-1 p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6 pt-6 border-t">
                {selectedTransaction.status === 'completed' && selectedTransaction.type === 'purchase' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Confirmer le remboursement de ${parseFloat(selectedTransaction.amount).toFixed(2)} Ⓐ ?`)) {
                        refundMutation.mutate(selectedTransaction.id)
                      }
                    }}
                    disabled={refundMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {refundMutation.isPending ? 'Remboursement...' : 'Rembourser'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setSelectedTransaction(null)}
                >
                  Fermer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
