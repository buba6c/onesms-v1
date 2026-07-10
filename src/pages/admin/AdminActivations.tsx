import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getServiceLogo, getServiceLogoFallback, getServiceIcon, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { formatPhoneNumber } from '@/utils/phoneFormatter';

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
  ExternalLink,
  MoreVertical,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles
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

// Gestionnaire d'erreur pour logos/flags : tente un fallback SVG puis affiche l'emoji
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, serviceCode?: string) => {
  const target = e.target as HTMLImageElement

  // Éviter les boucles infinies
  if (target.dataset.fallbackLoaded === 'true') {
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
    return
  }

  if (serviceCode) {
    target.dataset.fallbackLoaded = 'true'
    target.src = getServiceLogoFallback(serviceCode)
  } else {
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
  }
}

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
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [activationToRefund, setActivationToRefund] = useState<Activation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const itemsPerPage = 50;

  const handleCopyField = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast({
      title: 'Copié ! 📋',
      description: 'Le contenu a été copié dans votre presse-papiers.'
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 🔴 REALTIME: Écoute toutes les activations en temps réel (WebSocket)
  useRealtimeAdminActivations();

  // Fetch all activations with user info
  const { data: activations = [], isLoading, refetch, error: fetchError } = useQuery({
    queryKey: ['admin-activations', statusFilter, debouncedSearch],
    queryFn: async () => {
      // console.log('[AdminActivations] Fetching activations...');
      let query = (supabase as any)
        .from('activations')
        .select(`
          *,
          user:users(id, email, balance, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter === 'completed') {
        query = query.in('status', ['received', 'completed']);
      } else if (statusFilter === 'pending') {
        query = query.in('status', ['pending', 'waiting']);
      } else if (statusFilter === 'cancelled') {
        query = query.in('status', ['cancelled', 'timeout', 'expired', 'no_numbers']);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (debouncedSearch) {
        // Clean the search: remove +, spaces, dashes
        const cleanSearch = debouncedSearch.replace(/[+\s-()]/g, '');
        
        // Try to extract meaningful phone digits (last 8-12 digits are most unique)
        const phoneDigits = cleanSearch.replace(/\D/g, '');
        // Use the last 7+ digits for a more flexible match if we have a long number
        const shortPhone = phoneDigits.length > 7 ? phoneDigits.slice(-Math.min(phoneDigits.length, 11)) : phoneDigits;
        
        // First, check if any user matches the search term (email or phone)
        const { data: matchedUsers } = await supabase
          .from('users')
          .select('id')
          .or(`email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,phone.ilike.%${cleanSearch}%`);
        const userIds = ((matchedUsers as any[]) || []).map(u => u.id);

        // Build phone search patterns
        const phonePatterns = [`phone.ilike.%${cleanSearch}%`];
        if (shortPhone !== cleanSearch && shortPhone.length >= 7) {
          phonePatterns.push(`phone.ilike.%${shortPhone}%`);
        }

        const baseFilters = [
          ...phonePatterns,
          `service_code.ilike.%${debouncedSearch}%`,
          `order_id.ilike.%${debouncedSearch}%`,
          `sms_code.ilike.%${debouncedSearch}%`,
          `country_code.ilike.%${debouncedSearch}%`,
        ];
        if (userIds.length > 0) {
          const userIdsString = `(${userIds.join(',')})`;
          baseFilters.push(`user_id.in.${userIdsString}`);
        }
        query = query.or(baseFilters.join(','));
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

  // Fast Stats using RPC
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-activations-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_activation_stats');
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000 // Cache for 1 minute
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
        p_rental_id: null,
        p_transaction_id: null,
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
    const cleanSearch = searchTerm.replace(/[+\s-()]/g, '').toLowerCase();
    const cleanPhone = a.phone?.replace(/[+\s-()]/g, '').toLowerCase() || '';
    const matchesSearch = !searchTerm ||
      // Phone in activation: match both directions
      a.phone?.toLowerCase().includes(search) ||
      a.phone?.toLowerCase().includes(cleanSearch) ||
      cleanPhone.includes(cleanSearch) ||
      cleanSearch.includes(cleanPhone) ||
      // Order ID
      a.order_id?.toLowerCase().includes(search) ||
      // User email & phone
      a.user?.email?.toLowerCase().includes(search) ||
      (a.user as any)?.phone?.toLowerCase().includes(search) ||
      (a.user as any)?.phone?.replace(/[+\s-]/g, '').toLowerCase().includes(cleanSearch) ||
      // Service, country, sms code
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
    } else if (statusFilter === 'completed') {
      matchesStatus = a.status === 'completed' || a.status === 'received';
    } else if (statusFilter === 'cancelled') {
      matchesStatus = ['cancelled', 'timeout', 'expired', 'no_numbers'].includes(a.status);
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


  const [showValues, setShowValues] = useState(true);
  const toggleValues = () => setShowValues(!showValues);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Activations
          </h1>
          <div className="hidden md:flex items-center bg-gray-50 p-1 rounded-lg border border-gray-100">
            <button className="px-3 py-1.5 text-xs font-semibold bg-white shadow-sm rounded-md text-gray-900">FCFA</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="h-10 rounded-xl px-3 border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={toggleValues} variant="outline" className="h-10 rounded-xl px-3 border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm">
            {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="h-10 appearance-none bg-white border border-gray-200 rounded-xl px-4 pr-10 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Cards (Warehouse style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            </div>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">Total Revenus <AlertTriangle className="w-3 h-3 text-gray-300" /></p>
            <div className="flex items-end gap-3 mt-2">
              <h2 className="text-2xl font-bold text-gray-900">{showValues ? `${(stats as any)?.revenue || 0} Ⓐ` : '****'}</h2>
              <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mb-1">↑</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            </div>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">Total Activations <AlertTriangle className="w-3 h-3 text-gray-300" /></p>
            <div className="flex items-end gap-3 mt-2">
              <h2 className="text-2xl font-bold text-gray-900">{showValues ? (stats as any)?.total || 0 : '****'}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            </div>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">Total Approved <AlertTriangle className="w-3 h-3 text-gray-300" /></p>
            <div className="flex items-end gap-3 mt-2">
              <h2 className="text-2xl font-bold text-gray-900">{showValues ? (stats as any)?.completed || 0 : '****'}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            </div>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">Total Cancelled <AlertTriangle className="w-3 h-3 text-gray-300" /></p>
            <div className="flex items-end gap-3 mt-2">
              <h2 className="text-2xl font-bold text-gray-900">{showValues ? (stats as any)?.cancelled || 0 : '****'}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Section */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Title + Tabs */}
            <div className="flex flex-wrap items-center gap-6">
              <h3 className="text-lg font-bold text-gray-900">Historique des Activations</h3>
              <div className="flex items-center bg-gray-50/80 p-1 rounded-xl border border-gray-100 overflow-x-auto">
                <button onClick={() => setStatusFilter('all')} className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap", statusFilter === 'all' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>Toutes</button>
                <button onClick={() => setStatusFilter('completed')} className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap", statusFilter === 'completed' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>Terminées</button>
                <button onClick={() => setStatusFilter('pending')} className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap", statusFilter === 'pending' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>En attente</button>
                <button onClick={() => setStatusFilter('cancelled')} className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap", statusFilter === 'cancelled' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>Annulées</button>
              </div>
            </div>

            {/* Right: Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numéro, email, service, code SMS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-gray-50/50 border-gray-200 text-sm focus-visible:ring-1 focus-visible:ring-gray-300 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F4F6F8]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-900">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-900">Service / Number</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-900">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-900">Country</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-900">Price</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-900">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-900 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2 text-sm">Loading...</p>
                  </td>
                </tr>
              ) : activations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-sm">No activations found.</p>
                  </td>
                </tr>
              ) : (
                activations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((activation: any) => {
                  const isCompleted = ['completed', 'received'].includes((activation.status || '').toLowerCase());
                  const isPending = ['pending', 'waiting'].includes((activation.status || '').toLowerCase());
                  
                  return (
                    <tr key={activation.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden",
                            isCompleted ? "bg-emerald-50" : isPending ? "bg-amber-50" : "bg-rose-50"
                          )}>
                             <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${activation.user?.email || activation.id}`} alt="avatar" className="w-8 h-8 opacity-90" />
                          </div>
                          <div>
                            <Link to={`/admin/users?search=${activation.user?.email || ''}`} className="font-bold text-sm text-gray-900 hover:text-cyan-600 transition-colors">
                              {showValues ? (activation.user?.email?.split('@')[0] || 'Unknown User') : '****'}
                            </Link>
                            <div className="text-xs text-gray-500 mt-0.5">{showValues ? (activation.user?.email || 'N/A') : '****@****.***'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <img 
                              src={getServiceLogo(activation.service_code)} 
                              alt={activation.service_code}
                              className="w-5 h-5 rounded-sm object-contain bg-white"
                              onError={(e) => handleImageError(e, activation.service_code)}
                            />
                            <div>
                                <span className="font-bold text-sm text-gray-900 uppercase">{activation.service_code}</span>
                                <div className="text-xs font-mono mt-0.5">{showValues ? (activation.phone ? formatPhoneNumber(activation.phone) : 'N/A') : '****'}</div>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {new Date(activation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="mx-2 text-gray-300">|</span>
                          {new Date(activation.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-lg">
                          {getFlagEmoji(activation.country_code)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {showValues ? `${activation.price} Ⓐ` : '****'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase",
                          isCompleted ? "bg-emerald-50 text-emerald-600" : isPending ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isCompleted ? "bg-emerald-500" : isPending ? "bg-amber-500" : "bg-rose-500"
                          )}></span>
                          {isCompleted ? 'Successful' : isPending ? 'Pending' : 'Declined'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setActivationToRefund(activation)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bottom */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-white">
          <div className="text-sm text-gray-500">
            Showing results {(currentPage - 1) * itemsPerPage + 1}-{(currentPage - 1) * itemsPerPage + activations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length} of {activations.length}
          </div>
          {Math.ceil(activations.length / itemsPerPage) > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 p-0 rounded-lg border-gray-200">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {Array.from({ length: Math.min(5, Math.ceil(activations.length / itemsPerPage)) }, (_, i) => {
                const totalPages = Math.ceil(activations.length / itemsPerPage);
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className={cn("w-8 h-8 p-0 rounded-lg text-xs font-semibold border-gray-200", currentPage === pageNum ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : "text-gray-600 hover:bg-gray-50")}>
                    {pageNum}
                  </Button>
                );
              })}

              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(Math.ceil(activations.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(activations.length / itemsPerPage)} className="w-8 h-8 p-0 rounded-lg border-gray-200">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Transaction Details / Refund Modal (Ultra-Premium Admin Audit Modal) */}
      {activationToRefund && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-gray-100 my-auto">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b from-gray-50/80 to-white">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm",
                  (activationToRefund.status || '').toLowerCase() === 'pending' ? 'bg-amber-50 border-amber-200' : (activationToRefund.status || '').toLowerCase() === 'failed' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
                )}>
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full",
                    (activationToRefund.status || '').toLowerCase() === 'pending' ? 'bg-amber-500 animate-pulse' : (activationToRefund.status || '').toLowerCase() === 'failed' ? 'bg-rose-500' : 'bg-emerald-500'
                  )}></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-gray-900 text-lg">Activation Details</h3>
                    <Badge variant="outline" className="text-[10px] font-mono bg-gray-100">
                      #{activationToRefund.id.slice(0, 8)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {new Date(activationToRefund.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowValues(!showValues)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                  title="Masquer/Afficher les informations sensibles"
                >
                  {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActivationToRefund(null)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Hero Price & Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-gray-50 via-gray-100/50 to-gray-50 border border-gray-100">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Price</span>
                  <div className="text-3xl font-black text-gray-900 mt-0.5">
                    {showValues ? `${activationToRefund.price}` : '****'}
                    <span className="text-base text-gray-500 font-bold ml-1">Ⓐ</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</span>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border shadow-sm",
                    (activationToRefund.status || '').toLowerCase() === 'pending' || (activationToRefund.status || '').toLowerCase() === 'waiting'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : (activationToRefund.status || '').toLowerCase() === 'failed' || (activationToRefund.status || '').toLowerCase() === 'timeout'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      (activationToRefund.status || '').toLowerCase() === 'pending' || (activationToRefund.status || '').toLowerCase() === 'waiting'
                        ? 'bg-amber-500 animate-pulse'
                        : (activationToRefund.status || '').toLowerCase() === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    )}></span>
                    <span>
                      {(activationToRefund.status || '').toUpperCase() === 'RECEIVED' ? 'SUCCESSFUL' : (activationToRefund.status || '').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 2 colonnes: Phone Number & SMS Code (Copie en 1 Clic) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number Box */}
                <div className="p-4 rounded-2xl bg-gray-900 text-white flex flex-col justify-between gap-3 shadow-md">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Phone Number
                    </span>
                    <span className="text-lg font-mono font-black text-white mt-1 block select-all">
                      {showValues ? formatPhoneNumber(activationToRefund.phone) : '****'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCopyField(activationToRefund.phone, 'phone')}
                    className={cn(
                      "w-full h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      copiedField === 'phone' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                    )}
                  >
                    {copiedField === 'phone' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le numéro</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* SMS Code Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100/60 to-emerald-50 border-2 border-emerald-300 flex flex-col justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                      SMS Code
                    </span>
                    <span className="text-2xl font-mono font-black text-emerald-900 mt-1 block select-all">
                      {showValues
                        ? (activationToRefund.sms_code?.includes('STATUS_OK:')
                            ? activationToRefund.sms_code.split(':')[1]
                            : activationToRefund.sms_code || 'En attente...')
                        : '****'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!activationToRefund.sms_code}
                    onClick={() => {
                      const cleanCode = activationToRefund.sms_code?.includes('STATUS_OK:')
                        ? activationToRefund.sms_code.split(':')[1]
                        : activationToRefund.sms_code || '';
                      handleCopyField(cleanCode, 'code');
                    }}
                    className={cn(
                      "w-full h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      copiedField === 'code'
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                  >
                    {copiedField === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Code Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le Code</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Full SMS Text Box (Non Tronqué + Copie Instantanée) */}
              {activationToRefund.sms_text && (
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase tracking-wider">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span>Full SMS Text (Message Intégral)</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyField(activationToRefund.sms_text || '', 'sms_text')}
                      className="h-8 px-3 rounded-lg text-xs font-bold bg-white hover:bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1.5"
                    >
                      {copiedField === 'sms_text' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier tout</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-blue-100 shadow-sm text-sm font-medium text-gray-900 whitespace-pre-wrap break-words select-all">
                    {showValues ? activationToRefund.sms_text : '****'}
                  </div>
                </div>
              )}

              {/* Technical Details List (Service, Order ID, Fournisseur, Utilisateur) */}
              <div className="bg-gray-50/80 rounded-2xl p-4 space-y-3 border border-gray-100">
                {/* Service */}
                <div className="flex items-center justify-between py-1.5 border-b border-gray-200/60">
                  <span className="text-xs font-semibold text-gray-500">Service</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={getServiceLogo(activationToRefund.service_code)}
                      alt="Service"
                      className="w-5 h-5 rounded-md object-contain"
                      onError={(e) => handleImageError(e, activationToRefund.service_code)}
                    />
                    <span className="text-sm font-extrabold text-gray-900 uppercase">
                      {activationToRefund.service_code}
                    </span>
                  </div>
                </div>

                {/* Order ID + Copy */}
                <div className="flex items-center justify-between py-1.5 border-b border-gray-200/60">
                  <span className="text-xs font-semibold text-gray-500">Order ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-gray-900 select-all">
                      {activationToRefund.order_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(activationToRefund.order_id, 'order_id')}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                      title="Copier Order ID"
                    >
                      {copiedField === 'order_id' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Fournisseur */}
                {(activationToRefund as any).provider && (
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200/60">
                    <span className="text-xs font-semibold text-gray-500">Fournisseur</span>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold uppercase text-xs">
                      {(activationToRefund as any).provider}
                    </Badge>
                  </div>
                )}

                {/* Utilisateur */}
                {activationToRefund.user?.email && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs font-semibold text-gray-500">Utilisateur</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 select-all">
                        {showValues ? activationToRefund.user.email : '****'}
                      </span>
                      {showValues && (
                        <button
                          type="button"
                          onClick={() => handleCopyField(activationToRefund.user?.email || '', 'email')}
                          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                          title="Copier Email"
                        >
                          {copiedField === 'email' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                onClick={() => setActivationToRefund(null)}
                variant="outline"
                className="rounded-xl h-11 px-6 font-bold border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Fermer
              </Button>
              {['pending', 'waiting', 'timeout'].includes((activationToRefund.status || '').toLowerCase()) && (
                <Button
                  type="button"
                  onClick={() => refundMutation.mutate(activationToRefund)}
                  className="rounded-xl h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
                  disabled={refundMutation.isPending}
                >
                  Force Refund
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
