import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRealtimeAdminActivations } from '@/hooks/useRealtimeSubscription';
import {
  Search,
  RefreshCw,
  Download,
  XCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Phone,
  User,
  Globe,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Wifi,
  Timer,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface Activation {
  id: string;
  user_id: string;
  order_id: string;
  phone: string;
  service_code: string;
  country_code: string;
  operator?: string;
  price: number;
  status: string;
  sms_code: string | null;
  sms_text: string | null;
  created_at: string;
  expires_at: string | null;
  charged?: boolean;
  frozen_amount?: number;  // Montant gelé (système wallet atomique)
  user?: {
    id: string;
    email: string;
    balance: number;
  };
}

export default function AdminActivations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [activationToRefund, setActivationToRefund] = useState<Activation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // 🔴 REALTIME: Écoute toutes les activations en temps réel (WebSocket)
  useRealtimeAdminActivations();

  // Fetch all activations with user info
  const { data: activations = [], isLoading, refetch, error: fetchError } = useQuery({
    queryKey: ['admin-activations', statusFilter],
    queryFn: async () => {
      // console.log('[AdminActivations] Fetching activations...');
      let query = (supabase as any)
        .from('activations')
        .select(`
          *,
          user:users(id, email, balance)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      // console.log('[AdminActivations] Result:', { data: data?.length, error });
      if (error) {
        console.error('[AdminActivations] Error:', error);
        throw error;
      }
      return data || [];
    },
    refetchInterval: 15000 // Refresh every 15s
  });

  // Fetch stats - Model A: revenus, frozen total, charged count
  const { data: stats } = useQuery({
    queryKey: ['admin-activations-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('activations')
        .select('status, price, charged, frozen_amount');

      if (error) {
        console.error('[AdminActivations] Stats error:', error);
        return { total: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0, revenue: 0, successRate: 0, totalFrozen: 0 };
      }

      const total = data.length;
      const completed = data.filter((a: any) => a.status === 'received' || a.status === 'completed').length;
      const pending = data.filter((a: any) => a.status === 'pending' || a.status === 'waiting').length;
      const cancelled = data.filter((a: any) => a.status === 'cancelled' || a.status === 'timeout').length;
      const refunded = data.filter((a: any) => a.status === 'refunded').length;
      
      // ✅ Model A: Revenus = activations charged=true (fonds débloqués et consommés)
      const revenue = data
        .filter((a: any) => a.charged === true)
        .reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0);
      
      // 🔒 Total frozen (fonds actuellement gelés)
      const totalFrozen = data
        .reduce((sum: number, a: any) => sum + (parseFloat(a.frozen_amount) || 0), 0);
      
      // Taux de succès
      const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, pending, cancelled, refunded, revenue, successRate, totalFrozen };
    },
    refetchInterval: 30000
  });

  // Refund mutation - Utilise atomic_refund (Model A)
  const refundMutation = useMutation({
    mutationFn: async (activation: Activation) => {
      console.log('[AdminActivations] Refund starting for:', activation.id);
      
      // Model A: Utiliser atomic_refund qui gère tout atomiquement
      // - Débloque frozen (frozen -= amount)
      // - Balance INCHANGÉ (Model A)
      // - Update activation status
      // - Log dans balance_operations
      const { data: refundResult, error: refundError } = await (supabase as any).rpc('atomic_refund', {
        p_user_id: activation.user_id,
        p_activation_id: activation.id,
        p_reason: `Admin refund - ${activation.service_code} (${activation.phone})`
      });
      
      if (refundError) {
        console.error('[AdminActivations] atomic_refund failed:', refundError);
        throw new Error(`Refund failed: ${refundError.message}`);
      }

      console.log('[AdminActivations] atomic_refund SUCCESS:', refundResult);

      return refundResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-activations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activations-stats'] });
      toast({
        title: '✅ Remboursement effectué',
        description: `${result.amount_refunded} Ⓐ dégelés. Frozen: ${result.frozen_before} → ${result.frozen_after} Ⓐ`
      });
      setRefundDialogOpen(false);
      setActivationToRefund(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Filter activations avec date, charged, frozen
  const filteredActivations = activations.filter((a: Activation) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      a.phone?.toLowerCase().includes(search) ||
      a.user?.email?.toLowerCase().includes(search) ||
      a.service_code?.toLowerCase().includes(search) ||
      a.country_code?.toLowerCase().includes(search) ||
      a.sms_code?.toLowerCase().includes(search);
    const matchesService = !serviceFilter || a.service_code?.toLowerCase().includes(serviceFilter.toLowerCase());
    
    // Filtre par statut (inclut charged et frozen)
    let matchesStatus = true;
    if (statusFilter === 'charged') {
      matchesStatus = a.charged === true;
    } else if (statusFilter === 'frozen') {
      matchesStatus = (a.frozen_amount || 0) > 0;
    } else if (statusFilter !== 'all') {
      matchesStatus = a.status === statusFilter;
    }
    
    // Filtre par date
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const activationDate = new Date(a.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = activationDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = activationDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = activationDate >= monthAgo;
      }
    }
    
    return matchesSearch && matchesService && matchesDate && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredActivations.length / itemsPerPage);
  const paginatedActivations = filteredActivations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper: Check if activation is expired
  const isExpired = (activation: Activation) => {
    if (!activation.expires_at) return false;
    return new Date(activation.expires_at) < new Date();
  };

  // Helper: Time remaining or expired
  const getTimeStatus = (activation: Activation) => {
    if (!activation.expires_at) return null;
    const expiresAt = new Date(activation.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return { expired: true, text: 'Expiré' };
    }
    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return { expired: false, text: `${minutes}m restantes` };
    }
    const hours = Math.floor(minutes / 60);
    return { expired: false, text: `${hours}h restantes` };
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['ID', 'User Email', 'Service', 'Country', 'Phone', 'Price', 'Status', 'Charged', 'SMS Code', 'Created', 'Expires'];
    const rows = filteredActivations.map((a: Activation) => [
      a.id,
      a.user?.email || 'N/A',
      a.service_code,
      a.country_code,
      a.phone,
      a.price,
      a.status,
      a.charged ? 'Yes' : 'No',
      a.sms_code || '',
      new Date(a.created_at).toLocaleString(),
      a.expires_at ? new Date(a.expires_at).toLocaleString() : ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: '✅ Export réussi', description: `${filteredActivations.length} activations exportées` });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      'waiting': { color: 'bg-blue-100 text-blue-800', icon: MessageSquare, label: 'Attente SMS' },
      'received': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'SMS Reçu' },
      'completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Complété' },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Annulé' },
      'timeout': { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, label: 'Expiré' },
      // Retirer 'refunded' d'ici car c'est un état de paiement, pas un statut d'activation
    };
    const cfg = config[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  // Badge de paiement - basé sur le système wallet atomique
  // Priorité: 1) Fonds gelés → 2) Remboursé (manuel ou auto) → 3) Facturé → 4) Bloqué → 5) Non facturé
  const getPaymentBadge = (activation: Activation) => {
    const frozenAmount = activation.frozen_amount || 0;
    
    // 1. Si fonds encore gelés (en attente de résolution)
    if (frozenAmount > 0 && ['pending', 'waiting'].includes(activation.status)) {
      return (
        <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3" />
          Gelé ({frozenAmount} Ⓐ)
        </Badge>
      );
    }
    
    // 2. Si remboursé manuellement (status = 'refunded')
    if (activation.status === 'refunded') {
      return (
        <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
          <RotateCcw className="w-3 h-3" />
          Remboursé
        </Badge>
      );
    }
    
    // 3. Si facturé (activation réussie, fonds consommés)
    if (activation.charged === true || ['received', 'completed'].includes(activation.status)) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
          <CheckCircle className="w-3 h-3" />
          Facturé
        </Badge>
      );
    }
    
    // 4. Si fonds encore gelés sur activation annulée/expirée (BUG: devrait être remboursé)
    if (frozenAmount > 0 && ['cancelled', 'timeout', 'no_numbers', 'expired'].includes(activation.status)) {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
          <AlertTriangle className="w-3 h-3" />
          Bloqué ({frozenAmount} Ⓐ)
        </Badge>
      );
    }
    
    // 5. Remboursé automatiquement (cancelled/timeout/expired avec frozen=0 et charged=false)
    // Ces activations ont été annulées et les fonds ont été retournés automatiquement
    if (['cancelled', 'timeout', 'no_numbers', 'expired'].includes(activation.status) && frozenAmount === 0) {
      return (
        <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
          <RotateCcw className="w-3 h-3" />
          Remboursé
        </Badge>
      );
    }
    
    // 6. Non facturé (cas par défaut - ne devrait pas arriver souvent)
    return (
      <Badge className="bg-gray-100 text-gray-600 flex items-center gap-1 w-fit">
        <XCircle className="w-3 h-3" />
        Non facturé
      </Badge>
    );
  };

  // Vérifie si un remboursement manuel est possible
  // Le bouton ne doit s'afficher QUE si des fonds sont réellement gelés à rembourser
  const canRefund = (activation: Activation): boolean => {
    const frozenAmount = activation.frozen_amount || 0;
    
    // Jamais de bouton si déjà remboursé manuellement
    if (activation.status === 'refunded') return false;
    
    // Jamais de bouton si déjà facturé (SMS reçu)
    if (activation.charged === true || ['received', 'completed'].includes(activation.status)) return false;
    
    // Bouton uniquement si fonds gelés > 0 (il y a quelque chose à rembourser)
    if (frozenAmount > 0) return true;
    
    // Si frozen_amount = 0 et status cancelled/timeout/expired → déjà remboursé auto, pas de bouton
    if (['cancelled', 'timeout', 'expired', 'no_numbers'].includes(activation.status) && frozenAmount === 0) {
      return false;
    }
    
    // Cas spécial: pending/waiting sans frozen_amount (ancien système avant wallet atomique)
    // Permettre le remboursement manuel pour ces cas legacy
    if (['pending', 'waiting'].includes(activation.status)) {
      return true;
    }
    
    return false;
  };

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
    toast({ title: 'Copié !', description: text });
  };

  return (
    <div className="space-y-6">
      {/* Debug error */}
      {fetchError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Erreur:</strong> {(fetchError as any).message || 'Impossible de charger les données'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Activations & Achats</h1>
            <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Temps réel
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">Mises à jour instantanées via WebSocket</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards - Amélioré avec taux de succès et remboursements */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">{stats?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Complétés</p>
              <p className="text-xl font-bold text-green-600">{stats?.completed || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-xl font-bold text-yellow-600">{stats?.pending || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Annulés</p>
              <p className="text-xl font-bold text-red-600">{stats?.cancelled || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenus</p>
              <p className="text-xl font-bold text-emerald-600">{Math.floor(stats?.revenue || 0)} Ⓐ</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Taux succès</p>
              <p className="text-xl font-bold text-indigo-600">{stats?.successRate || 0}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Remboursés</p>
              <p className="text-xl font-bold text-purple-600">{stats?.refunded || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Gelé (Total)</p>
              <p className="text-xl font-bold text-orange-600">{Math.floor(stats?.totalFrozen || 0)} Ⓐ</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher (email, téléphone, service, code SMS...)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="waiting">Attente SMS</option>
              <option value="received">SMS Reçu</option>
              <option value="completed">Complété</option>
              <option value="charged">Facturés (charged=true)</option>
              <option value="frozen">Gelés (frozen&gt;0)</option>
              <option value="cancelled">Annulé</option>
              <option value="timeout">Expiré</option>
              <option value="refunded">Remboursé</option>
            </select>
            <Input
              placeholder="Filtrer service..."
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      {/* Activations Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service / Pays</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coût</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SMS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : filteredActivations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Aucune activation trouvée
                  </td>
                </tr>
              ) : (
                paginatedActivations.map((activation: Activation) => {
                  const timeStatus = getTimeStatus(activation);
                  return (
                  <React.Fragment key={activation.id}>
                    <tr className={`hover:bg-gray-50 ${isExpired(activation) && activation.status === 'pending' ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <button 
                              onClick={() => navigate(`/admin/users?search=${activation.user?.email}`)}
                              className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {activation.user?.email || 'N/A'}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <p className="text-xs text-gray-500">{Math.floor(activation.user?.balance || 0)} Ⓐ</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activation.service_code}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {activation.country_code}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{activation.phone}</code>
                          <button onClick={() => copyToClipboard(activation.phone)} className="text-gray-400 hover:text-gray-600">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{activation.price} Ⓐ</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(activation.status)}
                      </td>
                      <td className="px-4 py-3">
                        {getPaymentBadge(activation)}
                      </td>
                      <td className="px-4 py-3">
                        {activation.sms_code ? (
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                              {activation.sms_code}
                            </code>
                            <button onClick={() => copyToClipboard(activation.sms_code!)} className="text-gray-400 hover:text-gray-600">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-500">
                          <p>{new Date(activation.created_at).toLocaleDateString('fr-FR')}</p>
                          <p>{new Date(activation.created_at).toLocaleTimeString('fr-FR')}</p>
                          {timeStatus && (
                            <p className={`mt-1 flex items-center gap-1 ${timeStatus.expired ? 'text-red-500' : 'text-orange-500'}`}>
                              <Timer className="w-3 h-3" />
                              {timeStatus.text}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(activation.id)}
                          >
                            {expandedRows.has(activation.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          {/* Bouton remboursement: vérifie via canRefund() */}
                          {canRefund(activation) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setActivationToRefund(activation);
                                setRefundDialogOpen(true);
                              }}
                              title={`Rembourser ${activation.frozen_amount || activation.price} Ⓐ`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded row with full details */}
                    {expandedRows.has(activation.id) && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs mb-1">ID Activation</p>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded">{activation.id}</code>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Order ID (Provider)</p>
                              <code className="text-xs bg-gray-200 px-2 py-1 rounded">{activation.order_id}</code>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Opérateur</p>
                              <p className="font-medium">{activation.operator || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Expiration</p>
                              <p className="font-medium">{activation.expires_at ? new Date(activation.expires_at).toLocaleString('fr-FR') : 'N/A'}</p>
                            </div>
                            {activation.sms_text && (
                              <div className="col-span-4">
                                <p className="text-gray-500 text-xs mb-1">SMS Complet</p>
                                <div className="bg-white border rounded-lg p-3 text-sm">
                                  {activation.sms_text}
                                </div>
                              </div>
                            )}
                            <div className="col-span-4">
                              <p className="text-gray-500 text-xs mb-1">Solde utilisateur actuel</p>
                              <p className="font-medium">{Math.floor(activation.user?.balance || 0)} Ⓐ</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )})
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer avec pagination */}
        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {filteredActivations.length} activation(s) • Page {currentPage}/{totalPages || 1}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Refund Dialog - Amélioré avec info frozen_amount */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le remboursement</DialogTitle>
            <DialogDescription>
              Voulez-vous rembourser cette activation ?
            </DialogDescription>
          </DialogHeader>
          {activationToRefund && (() => {
            const frozenAmount = activationToRefund.frozen_amount || 0;
            const refundAmount = frozenAmount > 0 ? frozenAmount : activationToRefund.price;
            return (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Utilisateur:</span>
                  <span className="font-medium">{activationToRefund.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-medium">{activationToRefund.service_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Numéro:</span>
                  <span className="font-medium">{activationToRefund.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prix original:</span>
                  <span className="font-medium">{activationToRefund.price} Ⓐ</span>
                </div>
                {frozenAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fonds gelés:</span>
                    <span className="font-medium text-orange-600">{frozenAmount} Ⓐ</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-700 font-medium">Montant à rembourser:</span>
                  <span className="font-bold text-green-600">{refundAmount} Ⓐ</span>
                </div>
              </div>
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {frozenAmount > 0 
                  ? `Cette action va dégeler et restituer ${refundAmount} Ⓐ au compte de l'utilisateur.`
                  : `Cette action va créditer ${refundAmount} Ⓐ sur le compte de l'utilisateur.`
                }
              </p>
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => activationToRefund && refundMutation.mutate(activationToRefund)}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? 'Remboursement...' : 'Confirmer le remboursement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
