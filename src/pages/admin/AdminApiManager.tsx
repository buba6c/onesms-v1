// @ts-nocheck
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Download, Filter, Search } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'

export default function AdminApiManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'clients' | 'activations' | 'logs' | 'recharges'>('clients')
  const [searchTerm, setSearchTerm] = useState('')
  const [logSearchTerm, setLogSearchTerm] = useState('') // New state for log filtering
  const [showValues, setShowValues] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [discountRate, setDiscountRate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const pageSize = 30

  // ============================================
  // QUERIES
  // ============================================

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-api-stats'],
    queryFn: async () => {
      // Total API clients (users with at least 1 key)
      const { data: keys } = await supabase.from('api_keys').select('user_id', { count: 'exact' })
      const uniqueUsers = new Set((keys || []).map((k: any) => k.user_id))
      const totalClients = uniqueUsers.size

      // API activations
      const { data: apiActivations, count: totalApiActivations } = await (supabase as any)
        .from('activations')
        .select('id, status, price, charged', { count: 'exact' })
        .eq('source', 'api')

      const apiRevenue = (apiActivations || [])
        .filter((a: any) => a.charged === true)
        .reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0)

      const apiReceived = (apiActivations || [])
        .filter((a: any) => ['received', 'completed'].includes(a.status)).length

      const apiSuccessRate = totalApiActivations && totalApiActivations > 0
        ? Math.round((apiReceived / totalApiActivations) * 100)
        : 0

      // Requests today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count: requestsToday } = await supabase
        .from('api_request_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

      return {
        totalClients,
        totalApiActivations: totalApiActivations || 0,
        apiRevenue: Math.floor(apiRevenue),
        apiSuccessRate,
        requestsToday: requestsToday || 0
      }
    },
    refetchInterval: 30000
  })

  // API Clients (users with api_keys)
  const { data: apiClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['admin-api-clients', searchTerm],
    queryFn: async () => {
      const { data: keys, error } = await (supabase as any)
        .from('api_keys')
        .select(`
          id, key, is_active, label, request_count, last_used_at, created_at,
          user:users(id, email, balance, frozen_balance, api_discount_rate, role)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch total recharged per user
      const userIds = [...new Set((keys || []).filter((k: any) => k.user).map((k: any) => k.user.id))]
      if (userIds.length > 0) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('user_id, amount')
          .in('user_id', userIds)
          .eq('type', 'recharge')
          .eq('status', 'completed')
        
        const rechargedMap: Record<string, number> = {}
        for (const tx of (txs || [])) {
          rechargedMap[tx.user_id] = (rechargedMap[tx.user_id] || 0) + parseFloat(tx.amount || 0)
        }
        
        keys.forEach((k: any) => {
          if (k.user) {
            k.user.total_recharged = rechargedMap[k.user.id] || 0
          }
        })
      }

      // Filter by search
      let filtered = keys || []
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        filtered = filtered.filter((k: any) =>
          k.user?.email?.toLowerCase().includes(s) ||
          k.label?.toLowerCase().includes(s) ||
          k.key?.toLowerCase().includes(s)
        )
      }

      return filtered
    },
    enabled: activeTab === 'clients'
  })

  // API Activations (source = 'api')
  const { data: apiActivations = [], isLoading: activationsLoading } = useQuery({
    queryKey: ['admin-api-activations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('activations')
        .select(`
          id, order_id, phone, service_code, country_code, price, status, sms_code, sms_text,
          provider, charged, frozen_amount, source, created_at, expires_at,
          user:users(id, email)
        `)
        .eq('source', 'api')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      return data || []
    },
    enabled: activeTab === 'activations',
    refetchInterval: 15000
  })

  // API Logs
  const { data: apiLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['admin-api-logs', logSearchTerm],
    queryFn: async () => {
      let userIds: string[] | null = null

      if (logSearchTerm) {
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .ilike('email', `%${logSearchTerm}%`)
        
        userIds = users?.map(u => u.id) || []
        if (userIds.length === 0) return [] // No matching user
      }

      let query = (supabase as any)
        .from('api_request_logs')
        .select(`
          id, endpoint, method, response_status, duration_ms, created_at,
          user:users(id, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: activeTab === 'logs',
    refetchInterval: 10000
  })

  // Recharges for API users
  const { data: apiRecharges = [], isLoading: rechargesLoading } = useQuery({
    queryKey: ['admin-api-recharges'],
    queryFn: async () => {
      // Get all API user IDs
      const { data: keys } = await supabase.from('api_keys').select('user_id')
      const userIds = [...new Set((keys || []).map((k: any) => k.user_id))]

      if (userIds.length === 0) return []

      const { data, error } = await (supabase as any)
        .from('transactions')
        .select(`
          id, amount, type, status, description, payment_method, created_at,
          user:users(id, email, balance)
        `)
        .in('user_id', userIds)
        .eq('type', 'recharge')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data || []
    },
    enabled: activeTab === 'recharges'
  })

  // ============================================
  // ACTIONS
  // ============================================

  const handleUpdateDiscount = async () => {
    if (!selectedClient) return
    const rate = parseInt(discountRate)

    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: 'Erreur', description: 'Le pourcentage doit être entre 0 et 100', variant: 'destructive' })
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ api_discount_rate: rate })
        .eq('id', selectedClient.user?.id)

      if (error) throw error
      toast({ title: 'Succès', description: `Réduction API mise à jour : ${rate}%` })
      setDiscountDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-api-clients'] })
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleKey = async (keyId: string, currentActive: boolean) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentActive })
        .eq('id', keyId)

      if (error) throw error
      toast({ title: 'Succès', description: `Clé API ${currentActive ? 'désactivée' : 'activée'}` })
      queryClient.invalidateQueries({ queryKey: ['admin-api-clients'] })
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleForceRefund = async (activation: any) => {
    setActionLoading(true)
    try {
      const { data, error } = await (supabase as any).rpc('atomic_refund', {
        p_user_id: activation.user_id || activation.user?.id,
        p_activation_id: activation.id,
        p_rental_id: null,
        p_transaction_id: null,
        p_reason: 'Admin API force refund'
      })

      if (error) throw error
      toast({ title: 'Remboursement effectué', description: `${data?.refunded || activation.price} Ⓐ remboursés` })
      queryClient.invalidateQueries({ queryKey: ['admin-api-activations'] })
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportCSV = async (client: any) => {
    setActionLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('activations')
        .select('id, service_code, phone, price, status, created_at')
        .eq('user_id', client.user?.id)
        .eq('source', 'api')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        toast({ title: 'Information', description: 'Aucune activation API à exporter pour ce client' })
        return
      }

      const headers = ['Date', 'ID', 'Service', 'Téléphone', 'Prix (A)', 'Statut']
      const rows = data.map((act: any) => [
        new Date(act.created_at).toLocaleString('fr-FR'),
        act.id,
        act.service_code?.toUpperCase(),
        act.phone,
        act.price,
        act.status
      ])

      const csvContent = [
        headers.join(';'),
        ...rows.map((r: any) => r.join(';'))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `activations_${client.user?.email}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({ title: 'Succès', description: 'Fichier CSV exporté' })
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  const maskKey = (key: string) => {
    if (!key || key.length < 12) return '****'
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  // Pagination
  const paginate = (data: any[]) => {
    const total = Math.ceil(data.length / pageSize)
    return {
      items: data.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      totalPages: total,
      total: data.length
    }
  }

  // Badge Color logic for discount
  const getDiscountBadge = (rate: number) => {
    if (!rate || rate === 0) return <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">0% (Standard)</span>
    if (rate === 5) return <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">-5%</span>
    if (rate === 15) return <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">-15%</span>
    if (rate === 20) return <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md">-20%</span>
    if (rate >= 30) return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">-{rate}% (VIP)</span>
    return <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md">-{rate}% (Custom)</span>
  }

  // ============================================
  // RENDER
  // ============================================

  const statCards = [
    { title: 'Clients API Actifs', value: stats?.totalClients || 0, subtitle: 'Fournisseurs API' },
    { title: 'Revenus API Générés', value: `${stats?.apiRevenue || 0} Ⓐ`, subtitle: 'Total encaissé' },
    { title: 'Activations Traitées', value: stats?.totalApiActivations || 0, subtitle: 'Demandes de numéros' },
    { title: "Requêtes Aujourd'hui", value: stats?.requestsToday || 0, subtitle: 'Trafic journalier' },
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">API Manager</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestion avancée des fournisseurs API, consommations et clés API.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowValues(!showValues)} 
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-4 py-2.5 rounded-xl hover:bg-slate-50"
          >
            {showValues ? 'Masquer les montants' : 'Afficher les montants'}
          </button>
          <button 
            onClick={() => queryClient.invalidateQueries()} 
            className="text-sm font-semibold bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-500" />
            <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
            <h2 className={cn(
              "text-3xl font-black mt-3 mb-1 tracking-tight",
              statsLoading ? "text-slate-300" : "text-slate-900"
            )}>
              {showValues ? stat.value : '••••'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        {/* TABS & SEARCH SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {[
              { id: 'clients', label: 'Clients API' },
              { id: 'activations', label: 'Activations' },
              { id: 'logs', label: 'Logs Trafic' },
              { id: 'recharges', label: 'Recharges API' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
                className={cn(
                  "text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap transition-all duration-200",
                  activeTab === tab.id 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {activeTab === 'logs' ? (
            <div className="relative w-full md:w-80">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer par email client..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          ) : (
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un client, une clé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          )}
        </div>

        {/* DATA SECTION */}
        <div className="w-full overflow-x-auto">
          {/* Tab: Clients API */}
          {activeTab === 'clients' && (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="py-4 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Rechargé</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Réduction API</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clé d'Accès</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requêtes</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="py-4 pr-6 pl-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientsLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm font-medium text-slate-400">Chargement des clients API...</td></tr>
                ) : apiClients.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm font-medium text-slate-400">Aucun client API trouvé</td></tr>
                ) : paginate(apiClients).items.map((client: any) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 pl-6 pr-4">
                      <div className="font-bold text-sm text-slate-900">{showValues ? client.user?.email : '••••@••••.•••'}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">Solde: {showValues ? Math.floor(client.user?.balance || 0) : '••••'} Ⓐ</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-sm text-blue-600">
                        {showValues ? `${Math.floor(client.user?.total_recharged || 0)} Ⓐ` : '••••'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getDiscountBadge(client.user?.api_discount_rate)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                        {showValues ? maskKey(client.key) : '••••••••••••'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-500">{client.request_count || 0}</td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                        client.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {client.is_active ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleExportCSV(client)}
                          title="Exporter CSV"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedClient(client); setDiscountRate(client.user?.api_discount_rate?.toString() || '0'); setDiscountDialogOpen(true) }}
                          className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Palier API
                        </button>
                        <button
                          onClick={() => handleToggleKey(client.id, client.is_active)}
                          className={cn(
                            "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                            client.is_active ? "text-red-600 hover:bg-red-50" : "text-amber-600 hover:bg-amber-50"
                          )}
                        >
                          {client.is_active ? 'Suspendre' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tab: Activations API */}
          {activeTab === 'activations' && (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="py-4 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Référence</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Service</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Numéro Alloué</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Coût</th>
                  <th className="py-4 pr-6 pl-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Gestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activationsLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm font-medium text-slate-400">Chargement des activations...</td></tr>
                ) : apiActivations.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm font-medium text-slate-400">Aucune activation via API</td></tr>
                ) : paginate(apiActivations).items.map((act: any) => {
                  const isSuccess = ['received', 'completed'].includes(act.status)
                  const isPending = ['pending', 'waiting'].includes(act.status)
                  const isFailed = ['cancelled', 'timeout', 'refunded'].includes(act.status)

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 pl-6 pr-4">
                        <div className="text-xs font-medium text-slate-400 uppercase">{act.id.split('-')[0]}</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{showValues ? act.user?.email?.split('@')[0] : '••••'}</div>
                      </td>
                      <td className="py-4 px-4 font-bold text-sm text-slate-900 uppercase">{act.service_code}</td>
                      <td className="py-4 px-4 text-sm font-mono font-medium text-slate-600">{showValues ? act.phone : '••••••••••••'}</td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                          isSuccess ? 'bg-emerald-100 text-emerald-700' : 
                          isPending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        )}>
                          {isSuccess ? 'Réussi' : isPending ? 'En cours' : 'Échoué'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-900">{showValues ? `${act.price} Ⓐ` : '••••'}</td>
                      <td className="py-4 pr-6 pl-4 text-right">
                        {(isPending || (act.frozen_amount > 0 && isFailed)) ? (
                          <button
                            onClick={() => handleForceRefund(act)}
                            disabled={actionLoading}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Forcer Remboursement
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Tab: Logs API */}
          {activeTab === 'logs' && (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="py-4 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Horodatage</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requête HTTP</th>
                  <th className="py-4 pr-6 pl-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Code Retour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsLoading ? (
                  <tr><td colSpan={4} className="py-12 text-center text-sm font-medium text-slate-400">Lecture des journaux...</td></tr>
                ) : apiLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-sm font-medium text-slate-400">Aucun trafic enregistré pour cette recherche</td></tr>
                ) : paginate(apiLogs).items.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-6 pr-4 text-xs font-medium text-slate-500">
                      {new Date(log.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-900">{showValues ? log.user?.email?.split('@')[0] : '••••'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                          log.method === 'GET' ? "bg-blue-100 text-blue-700" :
                          log.method === 'POST' ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          {log.method}
                        </span>
                        <span className="text-sm font-mono text-slate-600">{log.endpoint}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-6 pl-4 text-right">
                      <span className={cn(
                        "text-[11px] font-bold px-2.5 py-1 rounded-full",
                        log.response_status < 400 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      )}>
                        {log.response_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tab: Recharges */}
          {activeTab === 'recharges' && (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="py-4 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant Ajouté</th>
                  <th className="py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Moyen de Paiement</th>
                  <th className="py-4 pr-6 pl-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Statut du Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rechargesLoading ? (
                  <tr><td colSpan={4} className="py-12 text-center text-sm font-medium text-slate-400">Recherche des recharges...</td></tr>
                ) : apiRecharges.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-sm font-medium text-slate-400">Aucune recharge API</td></tr>
                ) : paginate(apiRecharges).items.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 pl-6 pr-4">
                      <div className="text-sm font-bold text-slate-900">{showValues ? tx.user?.email : '••••'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 px-4 text-lg font-black text-blue-600">+{showValues ? tx.amount : '••••'} <span className="text-sm text-blue-400">Ⓐ</span></td>
                    <td className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{tx.payment_method || 'Interne'}</td>
                    <td className="py-4 pr-6 pl-4 text-right">
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                        tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {tx.status === 'completed' ? 'Validé' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {activeTab !== 'logs' && activeTab !== 'recharges' && paginate(activeTab === 'clients' ? apiClients : apiActivations).totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/30">
            <span className="text-sm font-medium text-slate-500">
              Page <span className="font-bold text-slate-900">{currentPage}</span> sur {paginate(activeTab === 'clients' ? apiClients : apiActivations).totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Précédent
              </button>
              <button 
                onClick={() => setCurrentPage(p => p + 1)} 
                disabled={currentPage >= paginate(activeTab === 'clients' ? apiClients : apiActivations).totalPages} 
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Attribuer un Palier API</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 mt-2">
              Client : <span className="text-slate-900 font-bold">{selectedClient?.user?.email}</span><br/>
              Total Rechargé : <span className="text-blue-600 font-bold">{Math.floor(selectedClient?.user?.total_recharged || 0)} Ⓐ</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 space-y-3">
            {[
              { rate: 0, label: 'Standard (0%)', desc: 'Tarif public, pas de réduction' },
              { rate: 5, label: 'API Standard (-5%)', desc: 'Pour les recharges de 2k à 5k Ⓐ' },
              { rate: 15, label: 'API Pro (-15%)', desc: 'Pour les recharges de 5k à 15k Ⓐ' },
              { rate: 20, label: 'API Expert (-20%)', desc: 'Pour les recharges de 15k à 50k Ⓐ' },
              { rate: 30, label: 'API VIP (-30%)', desc: 'Pour les recharges de + de 50k Ⓐ' }
            ].map(tier => (
              <label 
                key={tier.rate} 
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  parseInt(discountRate) === tier.rate 
                    ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                    : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
                onClick={() => setDiscountRate(tier.rate.toString())}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  parseInt(discountRate) === tier.rate ? "border-blue-500" : "border-slate-300"
                )}>
                  {parseInt(discountRate) === tier.rate && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{tier.label}</div>
                  <div className="text-xs font-medium text-slate-500">{tier.desc}</div>
                </div>
              </label>
            ))}

            <div className="pt-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">Ou % sur-mesure :</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 font-bold rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6 gap-3 sm:gap-0">
            <button 
              onClick={() => setDiscountDialogOpen(false)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-6 py-3 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={handleUpdateDiscount} 
              disabled={actionLoading || discountRate === ''}
              className="bg-blue-600 text-white text-sm font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none transition-all"
            >
              {actionLoading ? 'Application...' : 'Appliquer ce palier'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
