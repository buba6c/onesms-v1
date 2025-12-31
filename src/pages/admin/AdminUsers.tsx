import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Search, RefreshCw, UserPlus, Eye, Mail, Ban, Trash2, CheckCircle, Coins, ShieldOff, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [balanceFilter, setBalanceFilter] = useState('all') // 'all', 'positive', 'frozen'
  const [loading, setLoading] = useState(true)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const PAGE_SIZE = 50

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    banned: 0,
    admins: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Dialog states
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsers(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, balanceFilter])

  // Initial load
  useEffect(() => {
    fetchStats()
  }, [])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(totalUsers / PAGE_SIZE)) return
    setPage(newPage)
    fetchUsers(newPage)
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      // Run counts in parallel for better performance since we just need numbers
      const [totalRes, activeRes, bannedRes, adminRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'banned'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'banned'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')
      ])

      setStats({
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        banned: bannedRes.count || 0,
        admins: adminRes.count || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
    setStatsLoading(false)
  }

  const fetchUsers = async (currentPage = page) => {
    setLoading(true)
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply Search
      if (searchTerm) {
        // Search by email or name
        query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      }

      // Apply Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'banned') {
          query = query.eq('role', 'banned')
        } else if (statusFilter === 'active') {
          query = query.neq('role', 'banned')
        } else if (statusFilter === 'admin') {
          query = query.eq('role', 'admin')
        }
      }

      // Apply Balance Filter
      if (balanceFilter !== 'all') {
        if (balanceFilter === 'positive') {
          query = query.gt('balance', 0)
        } else if (balanceFilter === 'frozen') {
          query = query.gt('frozen_balance', 0)
        }
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, count, error } = await query.range(from, to)

      if (error) throw error

      if (data) {
        setUsers(data)
        setTotalUsers(count || 0)
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: "Impossible de charger les utilisateurs",
        variant: 'destructive'
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const refreshAll = () => {
    fetchUsers(page)
    fetchStats()
  }

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => prev.includes(userId)
      ? prev.filter(id => id !== userId)
      : [...prev, userId])
  }

  const toggleSelectAll = () => {
    if (users.length === 0) return
    const allIds = users.map((u: any) => u.id)
    const allSelected = allIds.every(id => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : allIds)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedIds)

      if (error) throw error

      toast({
        title: 'Succès',
        description: `${selectedIds.length} utilisateur(s) supprimé(s)`
      })

      setBulkDeleteOpen(false)
      setSelectedIds([])
      refreshAll()
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

  const handleAddCredit = async () => {
    if (!selectedUser || !creditAmount) return

    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Erreur',
        description: 'Montant invalide',
        variant: 'destructive'
      })
      return
    }

    setActionLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_add_credit', {
        p_user_id: selectedUser.id,
        p_amount: amount,
        p_admin_note: creditNote || null
      }) as any

      if (error) throw error

      toast({
        title: 'Succès',
        description: `${amount}Ⓐ ajoutés au compte de ${selectedUser.email}`
      })

      setCreditDialogOpen(false)
      setCreditAmount('')
      setCreditNote('')
      // Update specific user in list to avoid full reload flicker if possible, or just fetch
      setUsers(users.map((u: any) =>
        u.id === selectedUser.id
          ? { ...u, balance: (u.balance || 0) + amount }
          : u
      ))

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter du crédit',
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

      // Optimistic update
      setUsers(users.map((u: any) =>
        u.id === selectedUser.id
          ? { ...u, role: newRole }
          : u
      ))
      fetchStats() // Update stats as active/banned counts changed

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
      refreshAll()
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
    { title: 'Total Users', value: stats.total, icon: CheckCircle, color: 'text-blue-500' },
    { title: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Banned', value: stats.banned, icon: Ban, color: 'text-red-500' },
    { title: 'Admins', value: stats.admins, icon: Mail, color: 'text-purple-500' }
  ]

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-gray-500">
            {statsLoading ? 'Chargement des stats...' : `Total: ${stats.total} users`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshAll} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button
            variant="destructive"
            disabled={selectedIds.length === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer ({selectedIds.length})
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  {statsLoading ? (
                    <div className="h-9 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                  )}
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
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
            </select>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous les soldes</option>
              <option value="positive">Avec Solde (Positif)</option>
              <option value="frozen">Avec Solde Gelé</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    aria-label="Sélectionner tout"
                    checked={users.length > 0 && users.every((u: any) => selectedIds.includes(u.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frozen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                      <p>Chargement des utilisateurs...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Aucun utilisateur trouvé</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${user.email}`}
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelect(user.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.name || 'No name'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role || 'user'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'banned' ? 'destructive' : 'success'}>
                        {user.role === 'banned' ? 'banned' : 'active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">{Math.floor(user.balance || 0)} Ⓐ</td>
                    <td className="px-6 py-4 font-medium text-orange-500">
                      {user.frozen_balance > 0 ? (
                        <span className="flex items-center gap-1">
                          🔒 {Math.floor(user.frozen_balance)} Ⓐ
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.updated_at ? new Date(user.updated_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openCreditDialog(user)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Ajouter du crédit"
                        >
                          <Coins className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={() => openBanDialog(user)}
                          className="p-1 hover:bg-gray-100 rounded"
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
                          className="p-1 hover:bg-gray-100 rounded"
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

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Affichage de {(page - 1) * PAGE_SIZE + 1} à {Math.min(page * PAGE_SIZE, totalUsers)} sur {totalUsers} utilisateurs
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>
            <div className="text-sm font-medium">
              Page {page} sur {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Dialog Suppression multiple */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer {selectedIds.length} utilisateur(s)</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Les comptes sélectionnés seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={actionLoading || selectedIds.length === 0}>
              {actionLoading ? 'Suppression...' : 'Supprimer'}
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
