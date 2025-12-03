import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Search,
  RefreshCw,
  Download,
  XCircle,
  CheckCircle,
  Clock,
  Phone,
  User,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Timer,
  RotateCcw,
  Calendar,
  Hourglass
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
// Navigation handled by links

interface Rental {
  id: string;
  user_id: string;
  rental_id: string;
  phone: string;
  service_code: string;
  country_code: string | number;
  operator?: string;
  total_cost: number;
  status: string;
  duration_hours?: number;
  rent_hours?: number;
  duration?: string | number;
  rent_time?: number;
  sms_messages?: any[];
  created_at: string;
  expires_at: string | null;
  frozen_amount?: number;
  user?: {
    id: string;
    email: string;
    balance: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Actif', color: 'bg-green-500', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  completed: { label: 'Terminé', color: 'bg-blue-500', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
  expired: { label: 'Expiré', color: 'bg-gray-500', icon: Timer },
  refunded: { label: 'Remboursé', color: 'bg-purple-500', icon: RotateCcw },
};

const durationLabels: Record<string, string> = {
  '4hours': '4 heures',
  '1day': '1 jour',
  '1week': '1 semaine',
  '1month': '1 mois',
};

export default function AdminRentals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [rentalToRefund, setRentalToRefund] = useState<Rental | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch all rentals with user info
  const { data: rentals = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-rentals', statusFilter],
    queryFn: async () => {
      // Fetch rentals
      let query = (supabase as any)
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: rentalsData, error } = await query;
      if (error) {
        console.error('[AdminRentals] Error:', error);
        throw error;
      }

      if (!rentalsData || rentalsData.length === 0) {
        return [] as Rental[];
      }

      // Fetch users for these rentals
      const userIds = [...new Set(rentalsData.map((r: any) => r.user_id).filter(Boolean))];
      const { data: usersData } = await (supabase as any)
        .from('users')
        .select('id, email, balance')
        .in('id', userIds);

      // Map users to rentals
      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
      
      return rentalsData.map((rental: any) => ({
        ...rental,
        user: usersMap.get(rental.user_id) || null
      })) as Rental[];
    },
    refetchInterval: 30000, // Refresh toutes les 30s
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-rentals-stats'],
    queryFn: async () => {
      const { count: total } = await (supabase as any).from('rentals').select('*', { count: 'exact', head: true });
      const { count: active } = await (supabase as any).from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: completed } = await (supabase as any).from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'completed');
      const { count: cancelled } = await (supabase as any).from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'cancelled');
      const { count: expired } = await (supabase as any).from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'expired');
      
      // Model A: Revenue = rentals avec frozen_amount=0 (débloqués/consommés)
      const { data: revenueData } = await (supabase as any)
        .from('rentals')
        .select('total_cost, frozen_amount')
        .in('status', ['completed', 'expired', 'active']);
      
      const totalRevenue = (revenueData || [])
        .filter((r: any) => (r.frozen_amount || 0) === 0) // Consommés
        .reduce((sum: number, r: any) => sum + (r.total_cost || 0), 0);
      
      // Total frozen (fonds actuellement gelés)
      const totalFrozen = (revenueData || [])
        .reduce((sum: number, r: any) => sum + (r.frozen_amount || 0), 0);

      return {
        total: total || 0,
        active: active || 0,
        completed: completed || 0,
        cancelled: cancelled || 0,
        expired: expired || 0,
        totalRevenue,
        totalFrozen
      };
    },
  });

  // Cancel/Refund rental (Model A)
  const refundMutation = useMutation({
    mutationFn: async (rental: Rental) => {
      // Model A: Utiliser atomic_refund qui gère tout atomiquement
      const { data: refundResult, error: refundError } = await (supabase as any).rpc('atomic_refund', {
        p_user_id: rental.user_id,
        p_rental_id: rental.id,
        p_reason: `Admin refund rental ${rental.rental_id || rental.id}`
      });
      
      if (refundError) {
        throw new Error(`Refund failed: ${refundError.message}`);
      }

      console.log('✅ Admin refund success:', refundResult);
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: 'Location remboursée', description: 'Le solde a été restauré.' });
      queryClient.invalidateQueries({ queryKey: ['admin-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rentals-stats'] });
      setRefundDialogOpen(false);
      setRentalToRefund(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Filter rentals - Model A: inclut filtre frozen
  const filteredRentals = rentals.filter(rental => {
    const matchesSearch = 
      rental.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.rental_id?.toString().includes(searchTerm) ||
      rental.service_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre par statut (inclut frozen)
    let matchesStatus = true;
    if (statusFilter === 'frozen') {
      matchesStatus = (rental.frozen_amount || 0) > 0;
    } else if (statusFilter !== 'all') {
      matchesStatus = rental.status === statusFilter;
    }
    
    const matchesDate = (() => {
      if (dateFilter === 'all') return true;
      const rentalDate = new Date(rental.created_at);
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          return rentalDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return rentalDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return rentalDate >= monthAgo;
        }
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesDate && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);
  const paginatedRentals = filteredRentals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copié!', duration: 1000 });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expiré';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Rental ID', 'User', 'Phone', 'Service', 'Country', 'Duration', 'Total Cost', 'Status', 'Created'];
    const rows = filteredRentals.map(r => [
      r.id,
      r.rental_id,
      r.user?.email || 'N/A',
      r.phone,
      r.service_code,
      r.country_code,
      durationLabels[r.duration] || r.duration,
      r.total_cost,
      r.status,
      formatDate(r.created_at)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hourglass className="h-7 w-7 text-primary" />
            Locations (Rentals)
          </h1>
          <p className="text-muted-foreground">
            Gérer toutes les locations de numéros
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards - Model A */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
        </Card>
        <Card className="p-4 border-green-500/30">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" /> Actives
          </div>
          <div className="text-2xl font-bold text-green-500">{stats?.active || 0}</div>
        </Card>
        <Card className="p-4 border-blue-500/30">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-blue-500" /> Terminées
          </div>
          <div className="text-2xl font-bold text-blue-500">{stats?.completed || 0}</div>
        </Card>
        <Card className="p-4 border-red-500/30">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" /> Annulées
          </div>
          <div className="text-2xl font-bold text-red-500">{stats?.cancelled || 0}</div>
        </Card>
        <Card className="p-4 border-gray-500/30">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Timer className="h-3 w-3 text-gray-500" /> Expirées
          </div>
          <div className="text-2xl font-bold text-gray-500">{stats?.expired || 0}</div>
        </Card>
        <Card className="p-4 border-primary/30">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-primary" /> Revenu
          </div>
          <div className="text-2xl font-bold text-primary">{Math.floor(stats?.totalRevenue || 0)} Ⓐ</div>
        </Card>
        <Card className="p-4 border-orange-500/30">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 text-orange-500" /> Gelé
          </div>
          <div className="text-2xl font-bold text-orange-500">{Math.floor(stats?.totalFrozen || 0)} Ⓐ</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par téléphone, ID, service, email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="px-3 py-2 rounded-md border bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="pending">En attente</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
            <option value="expired">Expiré</option>
            <option value="refunded">Remboursé</option>
            <option value="frozen">Gelés (frozen&gt;0)</option>
          </select>
          
          <select
            className="px-3 py-2 rounded-md border bg-background"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </select>
        </div>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredRentals.length} location(s) trouvée(s)
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Chargement...</p>
          </div>
        ) : paginatedRentals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Aucune location trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rental ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Téléphone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Durée</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Prix</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Temps restant</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedRentals.map((rental) => {
                  const status = statusConfig[rental.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const isExpanded = expandedRows.has(rental.id);
                  const timeRemaining = getTimeRemaining(rental.expires_at);
                  
                  return (
                    <>
                      <tr 
                        key={rental.id} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleRow(rental.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-mono text-sm">{rental.rental_id}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(rental.rental_id);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">
                              {rental.user?.email || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{rental.phone}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(rental.phone);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{rental.service_code}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {durationLabels[rental.duration] || rental.duration}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-semibold">{rental.total_cost} Ⓐ</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${status.color} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {rental.status === 'active' && timeRemaining ? (
                            <span className={`text-sm ${timeRemaining === 'Expiré' ? 'text-red-500' : 'text-green-500'}`}>
                              {timeRemaining}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(rental.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {(rental.status === 'active' || rental.status === 'pending') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRentalToRefund(rental);
                                  setRefundDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">ID interne:</span>
                                <p className="font-mono text-xs">{rental.id}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pays:</span>
                                <p>{rental.country_code}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Opérateur:</span>
                                <p>{rental.operator || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Frozen:</span>
                                <p>{rental.frozen_amount || 0} Ⓐ</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Durée (heures):</span>
                                <p>{rental.rent_time}h</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Expire le:</span>
                                <p>{rental.expires_at ? formatDate(rental.expires_at) : 'N/A'}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">SMS reçus:</span>
                                <p>{rental.sms_messages?.length || 0} message(s)</p>
                                {rental.sms_messages && rental.sms_messages.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {rental.sms_messages.map((sms: any, idx: number) => (
                                      <div key={idx} className="p-2 bg-background rounded text-xs">
                                        <span className="text-muted-foreground">
                                          {new Date(sms.date || sms.received_at).toLocaleString('fr-FR')}:
                                        </span>
                                        <p className="mt-1">{sms.text || sms.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmer le remboursement
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment annuler et rembourser cette location ?
            </DialogDescription>
          </DialogHeader>
          
          {rentalToRefund && (
            <div className="space-y-2 py-4">
              <p><strong>Rental ID:</strong> {rentalToRefund.rental_id}</p>
              <p><strong>Téléphone:</strong> {rentalToRefund.phone}</p>
              <p><strong>Service:</strong> {rentalToRefund.service_code}</p>
              <p><strong>Montant à rembourser:</strong> {rentalToRefund.frozen_amount || rentalToRefund.total_cost} Ⓐ</p>
              <p><strong>Utilisateur:</strong> {rentalToRefund.user?.email}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={() => rentalToRefund && refundMutation.mutate(rentalToRefund)}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Rembourser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
