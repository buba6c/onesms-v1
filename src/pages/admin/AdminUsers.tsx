 
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Search, RefreshCw, UserPlus, Eye, Mail, Ban, Trash2, CheckCircle, Coins, ShieldOff, Shield, ChevronLeft, ChevronRight, Download, Snowflake, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

const ITEMS_PER_PAGE = 50

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'balance' | 'email'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    banned: 0,
    admins: 0,
    totalBalance: 0,
    totalFrozen: 0
  })
  
  // Dialog states
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userActivations, setUserActivations] = useState<any[]>([])
  const [userTransactions, setUserTransactions] = useState<any[]>([])
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
    setCurrentPage(1) // Reset page on filter change
  }, [searchTerm, statusFilter, sortBy, sortOrder, users])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers(data)
      calculateStats(data)
    }
    setLoading(false)
  }

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      active: data.filter(u => u.role !== 'banned').length,
      banned: data.filter(u => u.role === 'banned').length,
      admins: data.filter(u => u.role === 'admin').length,
      totalBalance: data.reduce((sum, u) => sum + (u.balance || 0), 0),
      totalFrozen: data.reduce((sum, u) => sum + (u.frozen_balance || 0), 0)
    })
  }

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'banned') {
        filtered = filtered.filter(u => u.role === 'banned')
      } else if (statusFilter === 'active') {
        filtered = filtered.filter(u => u.role !== 'banned')
      } else if (statusFilter === 'admin') {
        filtered = filtered.filter(u => u.role === 'admin')
      } else if (statusFilter === 'with_frozen') {
        filtered = filtered.filter(u => (u.frozen_balance || 0) > 0)
      }
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal
      if (sortBy === 'created_at') {
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
      } else if (sortBy === 'balance') {
        aVal = a.balance || 0
        bVal = b.balance || 0
      } else {
        aVal = a.email?.toLowerCase() || ''
        bVal = b.email?.toLowerCase() || ''
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

    setFilteredUsers(filtered)
  }

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Role', 'Balance', 'Frozen', 'Disponible', 'Created At']
    const csvData = filteredUsers.map(u => [
      u.email,
      u.name || '',
      u.role || 'user',
      Math.floor(u.balance || 0),
      Math.floor(u.frozen_balance || 0),
      Math.floor((u.balance || 0) - (u.frozen_balance || 0)),
      new Date(u.created_at).toISOString()
    ])
    
    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // View user details
  const openUserDetail = async (user) => {
    setSelectedUser(user)
    setUserDetailDialogOpen(true)
    
    // Fetch user's recent activations
    const { data: activations } = await supabase
      .from('activations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    setUserActivations(activations || [])

    // Fetch user's recent transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    setUserTransactions(transactions || [])
  }

  const handleAddCredit = async () => {
    if (!selectedUser || !creditAmount) return
    
    setActionLoading(true)
    try {
      const amount = parseFloat(creditAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: t('common.error'),
          description: t('admin.usersPage.invalidAmount'),
          variant: 'destructive'
        })
        setActionLoading(false)
        return
      }

      // Model A: Utiliser admin_add_credit (RPC atomique)
      const { data: result, error } = await (supabase as any).rpc('admin_add_credit', {
        p_user_id: selectedUser.id,
        p_amount: amount,
        p_admin_note: creditNote || `Crédit ajouté par admin`
      })

      if (error) {
        console.error('[AdminUsers] admin_add_credit error:', error)
        throw new Error(error.message)
      }

      console.log('[AdminUsers] Credit added:', result)

      toast({
        title: '✅ Succès',
        description: `${amount}Ⓐ ajoutés. Balance: ${result.balance_before} → ${result.balance_after}Ⓐ`
      })

      setCreditDialogOpen(false)
      setCreditAmount('')
      setCreditNote('')
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!selectedUser) return
    
    setActionLoading(true)
    try {
      const isBanned = selectedUser.role === 'banned'
      const newRole = isBanned ? 'user' : 'banned'

      const { error } = await (supabase
        .from('users') as any)
        .update({ role: newRole })
        .eq('id', selectedUser.id)

      if (error) throw error

      toast({
        title: 'Succès',
        description: isBanned 
          ? `${selectedUser.email} a été débanni`
          : `${selectedUser.email} a été banni`
      })

      setBanDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id)

      if (error) throw error

      toast({
        title: 'Succès',
        description: `Utilisateur ${selectedUser.email} supprimé`
      })

      setDeleteDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const openCreditDialog = (user) => {
    setSelectedUser(user)
    setCreditAmount('')
    setCreditNote('')
    setCreditDialogOpen(true)
  }

  const openBanDialog = (user) => {
    setSelectedUser(user)
    setBanDialogOpen(true)
  }

  const openDeleteDialog = (user) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const statCards = [
    { title: t('admin.stats.totalUsers'), value: stats.total, icon: CheckCircle, color: 'text-blue-500' },
    { title: t('admin.active'), value: stats.active, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Banned', value: stats.banned, icon: Ban, color: 'text-red-500' },
    { title: 'Admins', value: stats.admins, icon: Mail, color: 'text-purple-500' },
    { title: 'Solde Total', value: `${Math.floor(stats.totalBalance)} Ⓐ`, icon: Coins, color: 'text-yellow-500' },
    { title: 'Fonds Gelés', value: `${Math.floor(stats.totalFrozen)} Ⓐ`, icon: Snowflake, color: 'text-cyan-500' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.users')}</h1>
          <p className="text-gray-500">{t('admin.stats.total')}: {stats.total} ({stats.active} {t('admin.active').toLowerCase()}, {stats.banned} banned)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchUsers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.title}</p>
                  <h3 className="text-xl font-bold mt-1">{stat.value}</h3>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
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
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="admin">Admin</option>
              <option value="with_frozen">Avec fonds gelés</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="created_at">Date inscription</option>
              <option value="balance">Solde</option>
              <option value="email">Email</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Gelé</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Disponible</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Chargement...</td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">{t('common.noResults')}</td>
                </tr>
              ) : (
                paginatedUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.name || t('admin.usersPage.noName')}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role || 'user'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={user.role === 'banned' ? 'destructive' : 'success'}>
                        {user.role === 'banned' ? 'banned' : 'active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-medium text-blue-600">{Math.floor(user.balance || 0)} Ⓐ</td>
                    <td className="px-4 py-4 text-sm">
                      {(user.frozen_balance || 0) > 0 ? (
                        <span className="text-orange-600 font-medium flex items-center gap-1">
                          <Snowflake className="w-3 h-3" />
                          {Math.floor(user.frozen_balance)} Ⓐ
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-green-600">
                      {Math.floor((user.balance || 0) - (user.frozen_balance || 0))} Ⓐ
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openUserDetail(user)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </button>
                        <button 
                          onClick={() => openCreditDialog(user)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Ajouter du crédit"
                        >
                          <Coins className="w-4 h-4 text-green-500" />
                        </button>
                        <button 
                          onClick={() => openBanDialog(user)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title={user.role === 'banned' ? 'Débannir' : 'Bannir'}
                        >
                          {user.role === 'banned' ? (
                            <Shield className="w-4 h-4 text-green-500" />
                          ) : (
                            <Ban className="w-4 h-4 text-orange-500" />
                          )}
                        </button>
                        <button 
                          onClick={() => openDeleteDialog(user)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages} ({filteredUsers.length} utilisateurs)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog Détails Utilisateur */}
      <Dialog open={userDetailDialogOpen} onOpenChange={setUserDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'utilisateur</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Info - Model A */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Balance (Total)</p>
                <p className="text-lg font-bold">{Math.floor(selectedUser?.balance || 0)} Ⓐ</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gelé</p>
                <p className="text-lg font-bold text-orange-600">{Math.floor(selectedUser?.frozen_balance || 0)} Ⓐ</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className="text-lg font-bold text-green-600">{Math.floor((selectedUser?.balance || 0) - (selectedUser?.frozen_balance || 0))} Ⓐ</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant={selectedUser?.role === 'admin' ? 'default' : 'secondary'}>
                  {selectedUser?.role || 'user'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inscrit le</p>
                <p className="text-sm">{selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString('fr-FR') : '-'}</p>
              </div>
            </div>

            {/* Recent Activations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Activations récentes</h4>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => {
                    setUserDetailDialogOpen(false)
                    navigate(`/admin/activations?user=${selectedUser?.id}`)
                  }}
                >
                  Voir tout <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
              {userActivations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activation</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userActivations.map((act: any) => (
                    <div key={act.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div>
                        <span className="font-medium">{act.service_code}</span>
                        <span className="text-muted-foreground ml-2">{act.phone_number}</span>
                      </div>
                      <Badge variant={act.status === 'completed' ? 'success' : act.status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {act.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Transactions récentes</h4>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => {
                    setUserDetailDialogOpen(false)
                    navigate(`/admin/transactions?user=${selectedUser?.id}`)
                  }}
                >
                  Voir tout <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
              {userTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune transaction</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div>
                        <span className="font-medium">{tx.type}</span>
                        <span className="text-muted-foreground ml-2">{new Date(tx.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <span className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {tx.amount >= 0 ? '+' : ''}{Math.floor(tx.amount)} Ⓐ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDetailDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter Crédit */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter du crédit</DialogTitle>
            <DialogDescription>
              Ajouter des pièces (Ⓐ) au compte de {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Solde actuel</label>
              <div className="text-2xl font-bold text-blue-600">
                {Math.floor(selectedUser?.balance || 0)} Ⓐ
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Montant à ajouter</label>
              <Input
                type="number"
                placeholder="Ex: 100"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0"
                step="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Note (optionnel)</label>
              <Input
                placeholder="Ex: Bonus de bienvenue"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
              />
            </div>
            {creditAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">Nouveau solde</p>
                <p className="text-xl font-bold text-blue-600">
                  {Math.floor((selectedUser?.balance || 0) + parseFloat(creditAmount || '0'))} Ⓐ
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditDialogOpen(false)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddCredit}
              disabled={actionLoading || !creditAmount}
            >
              {actionLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Bannir/Débannir */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.role === 'banned' ? 'Débannir l\'utilisateur' : 'Bannir l\'utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.role === 'banned' 
                ? `Êtes-vous sûr de vouloir débannir ${selectedUser?.email} ? L'utilisateur pourra à nouveau accéder à la plateforme.`
                : `Êtes-vous sûr de vouloir bannir ${selectedUser?.email} ? L'utilisateur ne pourra plus accéder à la plateforme.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialogOpen(false)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              variant={selectedUser?.role === 'banned' ? 'default' : 'destructive'}
              onClick={handleBanUser}
              disabled={actionLoading}
            >
              {actionLoading ? 'Traitement...' : (selectedUser?.role === 'banned' ? 'Débannir' : 'Bannir')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Supprimer */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement {selectedUser?.email} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={actionLoading}
            >
              {actionLoading ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
