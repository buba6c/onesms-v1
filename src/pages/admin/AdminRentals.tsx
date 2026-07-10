import React, { useState, Fragment } from 'react';
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
  Copy,
  Timer,
  RotateCcw,
  Calendar,
  Hourglass,
  MessageSquare,
  Eye,
  Shield,
  ArrowUpRight,
  Snowflake,
  X,
  Mail,
  Globe,
  Cpu,
  Hash,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Rental {
  id: string;
  user_id: string;
  rental_id: string;
  rent_id?: string;
  order_id?: string;
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
  end_date?: string;
  expires_at: string | null;
  frozen_amount?: number;
  charged?: boolean;
  provider?: string;
  message_count?: number;
  metadata?: any;
  refund_amount?: number;
  user?: {
    id: string;
    email: string;
    balance: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  active:    { label: 'Actif',      color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  pending:   { label: 'En attente', color: 'text-amber-700',   bgColor: 'bg-amber-50 border-amber-200',    icon: Clock },
  completed: { label: 'Terminé',    color: 'text-blue-700',    bgColor: 'bg-blue-50 border-blue-200',      icon: CheckCircle },
  cancelled: { label: 'Annulé',     color: 'text-red-700',     bgColor: 'bg-red-50 border-red-200',        icon: XCircle },
  expired:   { label: 'Expiré',     color: 'text-gray-600',    bgColor: 'bg-gray-100 border-gray-200',     icon: Timer },
  refunded:  { label: 'Remboursé',  color: 'text-purple-700',  bgColor: 'bg-purple-50 border-purple-200',  icon: RotateCcw },
};

export default function AdminRentals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [rentalToRefund, setRentalToRefund] = useState<Rental | null>(null);
  const [detailModal, setDetailModal] = useState<Rental | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch all rentals with user info
  const { data: rentals = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-rentals', statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('rentals')
        .select('*, sms_messages:rental_messages(*)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all' && statusFilter !== 'frozen') {
        query = query.eq('status', statusFilter);
      }

      const { data: rentalsData, error } = await query;
      if (error) throw error;
      if (!rentalsData || rentalsData.length === 0) return [] as Rental[];

      const userIds = [...new Set(rentalsData.map((r: any) => r.user_id).filter(Boolean))];
      const { data: usersData } = await (supabase as any)
        .from('users')
        .select('id, email, balance')
        .in('id', userIds);

      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
      
      return rentalsData.map((rental: any) => ({
        ...rental,
        user: usersMap.get(rental.user_id) || null
      })) as Rental[];
    },
    refetchInterval: 30000,
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
      
      let revenueData: any[] = [];
      let page = 0;
      const pageSize = 10000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from('rentals')
          .select('total_cost, frozen_amount')
          .in('status', ['completed', 'expired', 'active'])
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) break;
        if (data && data.length > 0) revenueData = revenueData.concat(data);
        if (!data || data.length < pageSize) break;
        page++;
        if (page > 100) break;
      }
      
      const totalRevenue = revenueData
        .filter((r: any) => (r.frozen_amount || 0) === 0)
        .reduce((sum: number, r: any) => sum + (r.total_cost || 0), 0);
      
      const totalFrozen = revenueData
        .reduce((sum: number, r: any) => sum + (r.frozen_amount || 0), 0);

      return { total: total || 0, active: active || 0, completed: completed || 0, cancelled: cancelled || 0, expired: expired || 0, totalRevenue, totalFrozen };
    },
  });

  // Cancel/Refund rental
  const refundMutation = useMutation({
    mutationFn: async (rental: Rental) => {
      if (!rental || ['refunded', 'completed', 'cancelled'].includes(rental.status)) {
        throw new Error('Location déjà traitée ou remboursée');
      }
      const { data: refundResult, error: refundError } = await (supabase as any).rpc('atomic_refund', {
        p_user_id: rental.user_id,
        p_rental_id: rental.id,
        p_reason: `Admin refund rental ${rental.rental_id || rental.id}`
      });
      if (refundError) throw new Error(`Refund failed: ${refundError.message}`);
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: 'Location remboursée', description: 'Le solde a été restauré.' });
      queryClient.invalidateQueries({ queryKey: ['admin-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rentals-stats'] });
      setRefundDialogOpen(false);
      setRentalToRefund(null);
      setDetailModal(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Filter
  const filteredRentals = rentals.filter(rental => {
    const matchesSearch = 
      rental.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.rental_id?.toString().includes(searchTerm) ||
      rental.service_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
        case 'today': return rentalDate.toDateString() === now.toDateString();
        case 'week': return rentalDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month': return rentalDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default: return true;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copié!', duration: 1000 });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateShort = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}j ${hours % 24}h`;
    return `${hours}h ${minutes}m`;
  };

  const getSmsCount = (rental: Rental) => {
    return rental.sms_messages?.length || rental.message_count || 0;
  };

  const getMinutesElapsed = (rental: Rental) => {
    const start = new Date(rental.created_at).getTime();
    const end = rental.end_date ? new Date(rental.end_date).getTime() : Date.now();
    return Math.round((end - start) / 60000);
  };

  const getFinancialVerdict = (rental: Rental): { label: string; color: string } => {
    const frozen = rental.frozen_amount || 0;
    if (rental.status === 'active' && frozen > 0) return { label: `${frozen}Ⓐ gelés`, color: 'text-amber-600' };
    if (rental.status === 'active' && frozen === 0 && rental.charged) return { label: 'Débité', color: 'text-emerald-600' };
    if (rental.status === 'cancelled' && (rental.refund_amount || 0) > 0) return { label: 'Remboursé', color: 'text-purple-600' };
    if (rental.status === 'cancelled' && frozen === 0 && rental.charged) return { label: 'Committed', color: 'text-red-600' };
    if (rental.status === 'cancelled' && frozen === 0) return { label: 'Libéré', color: 'text-gray-500' };
    if (rental.status === 'expired' && frozen === 0 && rental.charged) return { label: 'Consommé', color: 'text-emerald-600' };
    if (rental.status === 'expired' && frozen > 0) return { label: `⚠️ ${frozen}Ⓐ bloqués!`, color: 'text-red-600' };
    if (rental.status === 'expired' && frozen === 0) return { label: 'Libéré', color: 'text-gray-500' };
    if (rental.status === 'completed' && frozen === 0) return { label: 'Consommé', color: 'text-emerald-600' };
    return { label: '-', color: 'text-gray-400' };
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Rental ID', 'User', 'Phone', 'Service', 'Country', 'Hours', 'Cost', 'Frozen', 'SMS', 'Status', 'Created'];
    const rows = filteredRentals.map(r => [
      r.id, r.rental_id, r.user?.email || 'N/A', r.phone, r.service_code, r.country_code,
      r.rent_hours || r.duration_hours || '', r.total_cost, r.frozen_amount || 0,
      getSmsCount(r), r.status, formatDate(r.created_at)
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Hourglass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Locations</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Gérez les locations longue durée de numéros</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="h-10 rounded-xl px-4 bg-white border-gray-200 hover:bg-gray-50 shadow-sm gap-2 font-semibold">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={exportToCSV} className="h-10 rounded-xl px-4 bg-gray-900 text-white hover:bg-black shadow-sm gap-2 font-semibold">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats?.total || 0, color: 'gray', icon: Hash },
          { label: 'Actives', value: stats?.active || 0, color: 'emerald', icon: CheckCircle },
          { label: 'Terminées', value: stats?.completed || 0, color: 'blue', icon: CheckCircle },
          { label: 'Annulées', value: stats?.cancelled || 0, color: 'red', icon: XCircle },
          { label: 'Expirées', value: stats?.expired || 0, color: 'gray', icon: Timer },
          { label: 'Revenu', value: `${Math.floor(stats?.totalRevenue || 0)}Ⓐ`, color: 'cyan', icon: DollarSign },
          { label: 'Gelé', value: `${Math.floor(stats?.totalFrozen || 0)}Ⓐ`, color: 'amber', icon: Snowflake },
        ].map((stat) => (
          <Card key={stat.label} className={`p-4 shadow-sm border-${stat.color}-100 rounded-2xl bg-white hover:shadow-md transition-shadow`}>
            <div className={`text-xs text-${stat.color}-600 font-semibold flex items-center gap-1.5 mb-1`}>
              <stat.icon className="h-3.5 w-3.5" /> {stat.label}
            </div>
            <div className={`text-2xl font-black text-${stat.color}-700 tracking-tight`}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-2 shadow-sm border border-gray-100 rounded-2xl bg-white flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par téléphone, ID, service, email..."
            className="pl-11 h-12 rounded-xl border-0 shadow-none focus-visible:ring-0 bg-transparent"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="h-px md:h-8 w-full md:w-px bg-gray-100 my-auto hidden md:block"></div>
        <div className="flex gap-2 p-1">
          <div className="relative">
            <select
              className="appearance-none h-10 px-4 py-2 pr-10 rounded-xl border-0 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 transition-colors cursor-pointer outline-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
              <option value="expired">Expiré</option>
              <option value="frozen">Gelés (frozen&gt;0)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="appearance-none h-10 px-4 py-2 pr-10 rounded-xl border-0 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 transition-colors cursor-pointer outline-none"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Results count */}
      <div className="text-sm font-medium text-gray-500 px-1">
        {filteredRentals.length} location(s) trouvée(s)
      </div>

      {/* Table */}
      <Card className="overflow-hidden shadow-sm border border-gray-100 rounded-2xl bg-white">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-500 font-medium">Chargement des locations...</p>
          </div>
        ) : paginatedRentals.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Aucun résultat</h3>
            <p className="text-gray-500">Aucune location ne correspond à vos critères.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Téléphone</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">SMS</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Prix</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Statut</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Finance</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedRentals.map((rental) => {
                  const status = statusConfig[rental.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const smsCount = getSmsCount(rental);
                  const timeRemaining = getTimeRemaining(rental.expires_at || rental.end_date || null);
                  const financialVerdict = getFinancialVerdict(rental);
                  
                  return (
                    <tr 
                      key={rental.id}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                      onClick={() => setDetailModal(rental)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                            {rental.user?.email?.split('@')[0] || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-mono text-sm font-medium text-gray-900">{rental.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-semibold px-2 py-0.5 text-xs">
                          {rental.service_code}
                        </Badge>
                      </td>
                      {/* SMS Count Column */}
                      <td className="px-5 py-3.5 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                          ${smsCount > 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-gray-50 text-gray-400 border border-gray-100'
                          }`}
                        >
                          <MessageSquare className={`h-3 w-3 ${smsCount > 0 ? 'text-emerald-500' : 'text-gray-300'}`} />
                          {smsCount}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{rental.total_cost}<span className="text-gray-400 font-medium ml-0.5">Ⓐ</span></span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge className={`border ${status.bgColor} ${status.color} px-2 py-0.5 shadow-none font-semibold text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      {/* Financial Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-xs font-bold ${financialVerdict.color}`}>{financialVerdict.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">{formatDateShort(rental.created_at)}</span>
                          {rental.status === 'active' && timeRemaining && (
                            <span className={`text-[11px] font-bold ${timeRemaining === 'Expiré' ? 'text-red-500' : 'text-emerald-500'}`}>
                              {timeRemaining} restant
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={(e) => { e.stopPropagation(); setDetailModal(rental); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(rental.status === 'active' || rental.status === 'pending') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm font-medium text-gray-500 px-1">
            Page <span className="text-gray-900">{currentPage}</span> sur <span className="text-gray-900">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl border-gray-200 h-9 px-3 font-medium" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl border-gray-200 h-9 px-3 font-medium" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* DETAIL MODAL — Premium rental details view     */}
      {/* ═══════════════════════════════════════════════ */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {detailModal && (() => {
            const rental = detailModal;
            const status = statusConfig[rental.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const smsCount = getSmsCount(rental);
            const minutesElapsed = getMinutesElapsed(rental);
            const hoursUsed = Math.floor(minutesElapsed / 60);
            const minsUsed = minutesElapsed % 60;
            const financialVerdict = getFinancialVerdict(rental);

            return (
              <>
                {/* Header */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold font-mono tracking-tight">{rental.phone}</h2>
                        <p className="text-sm text-gray-400 font-medium">{rental.service_code?.toUpperCase()} · {rental.provider || 'sms-activate'}</p>
                      </div>
                    </div>
                    <Badge className={`border ${status.bgColor} ${status.color} px-3 py-1 shadow-none font-bold text-xs`}>
                      <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                      {status.label}
                    </Badge>
                  </div>
                  {/* Quick stats row */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Prix</div>
                      <div className="text-lg font-black">{rental.total_cost}<span className="text-sm text-gray-400 ml-0.5">Ⓐ</span></div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Durée</div>
                      <div className="text-lg font-black">{rental.rent_hours || rental.duration_hours || '4'}<span className="text-sm text-gray-400 ml-0.5">h</span></div>
                    </div>
                    <div className={`rounded-xl p-3 border ${smsCount > 0 ? 'bg-emerald-500/15 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                      <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <MessageSquare className={`h-3 w-3 ${smsCount > 0 ? 'text-emerald-400' : ''}`} />
                        SMS
                      </div>
                      <div className={`text-lg font-black ${smsCount > 0 ? 'text-emerald-400' : ''}`}>{smsCount}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Utilisé</div>
                      <div className="text-lg font-black">{hoursUsed}<span className="text-sm text-gray-400">h</span>{minsUsed}<span className="text-sm text-gray-400">m</span></div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Utilisateur" value={rental.user?.email || 'N/A'} />
                    <InfoRow icon={Globe} label="Pays" value={String(rental.country_code)} />
                    <InfoRow icon={Cpu} label="Opérateur" value={rental.operator || 'Auto'} />
                    <InfoRow icon={Hash} label="Rental ID" value={rental.rental_id || rental.rent_id || 'N/A'} mono copyable onCopy={() => copyToClipboard(rental.rental_id || rental.rent_id || '')} />
                    <InfoRow icon={Calendar} label="Créé le" value={formatDate(rental.created_at)} />
                    <InfoRow icon={Timer} label="Expire le" value={rental.expires_at ? formatDate(rental.expires_at) : rental.end_date ? formatDate(rental.end_date) : 'N/A'} />
                  </div>

                  {/* Financial Section */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" />
                      Données Financières
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-[11px] text-gray-400 font-semibold uppercase">Coût total</div>
                        <div className="text-base font-black text-gray-900 mt-0.5">{rental.total_cost} Ⓐ</div>
                      </div>
                      <div className={`rounded-lg p-3 border ${(rental.frozen_amount || 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                        <div className="text-[11px] text-gray-400 font-semibold uppercase flex items-center gap-1">
                          <Snowflake className="h-3 w-3" /> Gelé
                        </div>
                        <div className={`text-base font-black mt-0.5 ${(rental.frozen_amount || 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{rental.frozen_amount || 0} Ⓐ</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-[11px] text-gray-400 font-semibold uppercase">Verdict</div>
                        <div className={`text-sm font-black mt-0.5 ${financialVerdict.color}`}>{financialVerdict.label}</div>
                      </div>
                    </div>
                    {rental.charged && (
                      <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Transaction confirmée (charged)
                      </div>
                    )}
                  </div>

                  {/* SMS Messages Section */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Messages SMS
                      </h4>
                      <Badge className={`text-xs font-bold shadow-none ${smsCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                        {smsCount} message{smsCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="p-3">
                      {rental.sms_messages && rental.sms_messages.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {rental.sms_messages.map((sms: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Mail className="h-3.5 w-3.5 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-mono font-bold text-gray-400">
                                    {new Date(sms.date || sms.received_at || sms.created_at).toLocaleString('fr-FR')}
                                  </span>
                                  {sms.sender && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-gray-50">
                                      {sms.sender}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-900 leading-relaxed break-words whitespace-pre-wrap">
                                  {sms.text || sms.message || sms.content || 'Contenu indisponible'}
                                </p>
                              </div>
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 flex-shrink-0 text-gray-300 hover:text-gray-700"
                                onClick={() => copyToClipboard(sms.text || sms.message || sms.content || '')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <MessageSquare className="h-5 w-5 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">Aucun SMS reçu</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ID Section */}
                  <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <span>ID: {rental.id}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(rental.id)}>
                      <Copy className="h-2.5 w-2.5 text-gray-400 hover:text-gray-700" />
                    </Button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold border-gray-200" onClick={() => setDetailModal(null)}>
                    Fermer
                  </Button>
                  {(rental.status === 'active' || rental.status === 'pending') && (
                    <Button 
                      className="flex-1 h-11 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      onClick={() => {
                        setRentalToRefund(rental);
                        setRefundDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Annuler & Rembourser
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-red-500 mb-4 border border-red-100">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-red-900 mb-1">
              Confirmer l'annulation
            </DialogTitle>
            <DialogDescription className="text-red-700 font-medium text-sm">
              Cette action est irréversible et remboursera les crédits gelés.
            </DialogDescription>
          </div>
          
          {rentalToRefund && (
            <div className="p-6 bg-white space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500 font-medium">Rental ID</span>
                <span className="text-sm font-mono font-bold text-gray-900">{rentalToRefund.rental_id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500 font-medium">Téléphone</span>
                <span className="text-sm font-mono font-bold text-gray-900">{rentalToRefund.phone}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500 font-medium">SMS reçus</span>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className={`h-3.5 w-3.5 ${getSmsCount(rentalToRefund) > 0 ? 'text-emerald-500' : 'text-gray-300'}`} />
                  <span className="text-sm font-bold text-gray-900">{getSmsCount(rentalToRefund)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500 font-medium">Montant à rembourser</span>
                <span className="text-base font-black text-amber-600">{rentalToRefund.frozen_amount || rentalToRefund.total_cost} Ⓐ</span>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold border-gray-200" onClick={() => setRefundDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="flex-1 h-11 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              onClick={() => rentalToRefund && refundMutation.mutate(rentalToRefund)}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {refundMutation.isPending ? 'En cours...' : 'Rembourser'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reusable Info Row Component ─────────────────────────────
function InfoRow({ icon: Icon, label, value, mono, copyable, onCopy }: {
  icon: any; label: string; value: string; mono?: boolean; copyable?: boolean; onCopy?: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
          {copyable && onCopy && (
            <button onClick={onCopy} className="text-gray-300 hover:text-gray-700 transition-colors">
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
