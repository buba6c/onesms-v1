
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
  RefreshCw,
  Download,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  Smartphone,
  Copy,
  ExternalLink,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutList,
  Layers,
  Gift
} from 'lucide-react'
import { useSearchParams, Link } from 'react-router-dom'

const ITEMS_PER_PAGE = 25

type ViewMode = 'list' | 'day' | 'week' | 'month' | 'year'

interface GroupedRecharges {
  key: string;
  label: string;
  sublabel?: string;
  recharges: Recharge[];
  totalXOF: number;
  totalCredits: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  bonusCount: number;
}

interface Recharge {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method?: string;
  payment_ref?: string;
  description?: string;
  created_at: string;
  metadata?: any;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export default function AdminTransactions() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const userIdFromUrl = searchParams.get('user')

  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecharge, setSelectedRecharge] = useState<Recharge | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Set search term if user param is present
  useEffect(() => {
    if (userIdFromUrl) {
      supabase.from('users').select('email').eq('id', userIdFromUrl).single()
        .then(({ data }: { data: { email: string } | null }) => {
          if (data && data.email) setSearchTerm(data.email)
        })
    }
  }, [userIdFromUrl])

  // 1. Query for STATS (Unlimited, lightweight) - Fixes "Revenue Decreasing" issue
  const { data: statsRecharges = [] } = useQuery<Recharge[]>({
    queryKey: ['admin-recharges-stats'],
    queryFn: async () => {
      // Fetch ONLY necessary columns for stats to keep payload small
      const { data, error } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount, status, created_at, metadata, payment_method')
        .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit', 'referral_bonus'])
        // No limit or very high limit to ensure total accuracy
        .limit(50000)

      if (error) {
        console.error('Error fetching stats:', error)
        return []
      }
      return (data as Recharge[]) || []
    },
    refetchInterval: 60000,
    staleTime: 60000 // Cache for 1 minute
  })

  // 2. Query for LIST (Limited, Detailed)
  const { data: recharges = [], isLoading, refetch } = useQuery<Recharge[]>({
    queryKey: ['admin-recharges-list', statusFilter, methodFilter],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          user:users(id, email, name)
        `)
        .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit', 'referral_bonus'])
        .order('created_at', { ascending: false })
        .limit(1000) // Lower limit for the list view to stay fast

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (methodFilter !== 'all') query = query.eq('payment_method', methodFilter)

      const { data, error } = await query
      if (error) {
        toast({ title: 'Erreur', description: error?.message || 'Erreur chargement', variant: 'destructive' })
        return []
      }
      return (data as Recharge[]) || []
    },
    refetchInterval: 30000,
  })

  // Filter by date
  const getDateFilteredRecharges = useCallback((rechargesList: Recharge[]) => {
    if (dateFilter === 'all') return rechargesList;

    const now = new Date();
    const filterDate = new Date();

    switch (dateFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return rechargesList;
    }

    return rechargesList.filter(r => new Date(r.created_at) >= filterDate);
  }, [dateFilter]);

  // Filter by search term
  const filteredRecharges = useMemo(() => {
    const filtered = getDateFilteredRecharges(recharges);

    if (!searchTerm) return filtered;

    const searchLower = searchTerm.toLowerCase();
    return filtered.filter(r =>
      r.id?.toLowerCase().includes(searchLower) ||
      r.user?.email?.toLowerCase().includes(searchLower) ||
      r.user?.name?.toLowerCase().includes(searchLower) ||
      r.payment_ref?.toLowerCase().includes(searchLower) ||
      r.description?.toLowerCase().includes(searchLower)
    );
  }, [recharges, searchTerm, getDateFilteredRecharges]);

  // Helper pour extraire le montant XOF depuis metadata ou amount (TOUJOURS retourner un nombre!)
  const getAmountXOF = useCallback((r: Recharge): number => {
    // Les bonus de parrainage n'ont pas de valeur monétaire réelle (crédits gratuits)
    if (r.type === 'referral_bonus') return 0;

    // Priorité 1: montant XOF explicite dans metadata
    if (r.metadata?.amount_xof) {
      return Number(r.metadata.amount_xof) || 0;
    }

    // Priorité 2: Pour PayDunya, le montant est déjà correct
    if (r.metadata?.payment_provider === 'paydunya') {
      return Number(r.amount) || 0;
    }

    // Priorité 3: Pour les anciennes transactions MoneyFusion où amount = activations
    // Si amount est petit (< 1000) et qu'on a des activations similaires, c'est probablement le nombre d'activations
    if (r.metadata?.payment_provider === 'moneyfusion' && r.amount && r.amount < 1000) {
      // Utiliser le ratio standard: 100 FCFA par activation
      return Number(r.amount) * 100;
    }

    // Par défaut: utiliser le montant tel quel
    return Number(r.amount) || 0;
  }, []);

  // Helper pour extraire le nombre de crédits (TOUJOURS retourner un nombre!)
  const getCredits = useCallback((r: Recharge): number => {
    // Priorité 1: activations explicites dans metadata
    if (r.metadata?.activations) {
      // IMPORTANT: Convertir en nombre car metadata peut stocker des strings
      return parseInt(String(r.metadata.activations), 10) || 0;
    }

    // Priorité 2: Pour les anciennes transactions MoneyFusion où amount = activations
    if (r.metadata?.payment_provider === 'moneyfusion' && r.amount && r.amount < 1000) {
      return Number(r.amount) || 0;
    }

    // Priorité 3: Calculer depuis amount_xof (1 activation = 100 FCFA)
    if (r.metadata?.amount_xof) {
      return Math.round(Number(r.metadata.amount_xof) / 100) || 0;
    }

    // Par défaut
    return Number(r.amount) || 0;
  }, []);

  // Helper pour vérifier si c'est un bonus (crédit gratuit)
  const isBonus = useCallback((r: Recharge) => {
    return r.type === 'referral_bonus';
  }, []);

  // Helper pour extraire le provider
  const getProvider = useCallback((r: Recharge) => {
    return r.metadata?.payment_provider || r.payment_method || 'N/A';
  }, []);

  // Group recharges by period
  const groupedRecharges = useMemo((): GroupedRecharges[] => {
    if (viewMode === 'list') return [];

    const groups: Map<string, Recharge[]> = new Map();

    filteredRecharges.forEach(r => {
      const date = new Date(r.created_at);
      let key: string;

      switch (viewMode) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week': {
          // Get ISO week
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 4 - (d.getDay() || 7));
          const yearStart = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          key = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(r);
    });

    // Convert to array and sort descending
    const result: GroupedRecharges[] = Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, groupRecharges]) => {
        // Sort recharges within each group by date descending
        const sortedRecharges = [...groupRecharges].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const completed = sortedRecharges.filter(r => r.status === 'completed');
        const pending = sortedRecharges.filter(r => r.status === 'pending');
        const failed = sortedRecharges.filter(r => r.status === 'failed');

        let label: string;
        let sublabel: string | undefined;

        switch (viewMode) {
          case 'day': {
            // Parse YYYY-MM-DD correctly in local timezone
            const [year, month, day] = key.split('-').map(Number);
            const dayDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (dayDate.getTime() === today.getTime()) {
              label = "Aujourd'hui";
            } else if (dayDate.getTime() === yesterday.getTime()) {
              label = "Hier";
            } else {
              label = dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            }
            sublabel = dayDate.toLocaleDateString('fr-FR', { year: 'numeric' });
            break;
          }
          case 'week': {
            const [year, week] = key.split('-W');
            label = `Semaine ${week}`;
            sublabel = year;
            break;
          }
          case 'month': {
            const monthDate = new Date(key + '-01');
            label = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
            sublabel = monthDate.getFullYear().toString();
            break;
          }
          case 'year':
            label = `Année ${key}`;
            break;
          default:
            label = key;
        }

        // Exclure les bonus des totaux XOF (crédits gratuits)
        const realCompleted = completed.filter(r => r.type !== 'referral_bonus');

        return {
          key,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          sublabel,
          recharges: sortedRecharges,
          totalXOF: realCompleted.reduce((sum, r) => sum + getAmountXOF(r), 0),
          totalCredits: realCompleted.reduce((sum, r) => sum + getCredits(r), 0),
          completedCount: realCompleted.length,
          pendingCount: pending.length,
          failedCount: failed.length,
          bonusCount: completed.length - realCompleted.length
        };
      });

    return result;
  }, [filteredRecharges, viewMode, getAmountXOF, getCredits]);

  // Toggle group expansion
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Expand all groups
  const expandAllGroups = () => {
    setExpandedGroups(new Set(groupedRecharges.map(g => g.key)));
  };

  // Collapse all groups
  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  // Stats calculations - Uses the UNLIMITED 'statsRecharges'
  const stats = useMemo(() => {
    // 1. Apply Filters to the Stats Dataset
    let filteredStats = statsRecharges;

    // Filter by Date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      switch (dateFilter) {
        case 'today': filterDate.setHours(0, 0, 0, 0); break;
        case 'week': filterDate.setDate(now.getDate() - 7); break;
        case 'month': filterDate.setMonth(now.getMonth() - 1); break;
        case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
      }
      filteredStats = filteredStats.filter(r => new Date(r.created_at) >= filterDate);
    }

    // Filter by Method (if applied)
    if (methodFilter !== 'all') {
      filteredStats = filteredStats.filter(r => r.payment_method === methodFilter);
    }

    // Filter by Status (if applied)
    if (statusFilter !== 'all') {
      filteredStats = filteredStats.filter(r => r.status === statusFilter);
    }

    const completed = filteredStats.filter(r => r.status === 'completed');
    const pending = filteredStats.filter(r => r.status === 'pending');
    const failed = filteredStats.filter(r => r.status === 'failed');

    // Create subsets
    const realRecharges = completed.filter(r => !isBonus(r));
    const bonusRecharges = completed.filter(r => isBonus(r));

    // Revenue Calculation
    const totalCompletedXOF = realRecharges.reduce((sum, r) => sum + getAmountXOF(r), 0);
    const totalPendingXOF = pending.filter(r => !isBonus(r)).reduce((sum, r) => sum + getAmountXOF(r), 0);

    // Credits Calculation
    const totalCreditsReal = realRecharges.reduce((sum, r) => sum + getCredits(r), 0);
    const totalCreditsBonus = bonusRecharges.reduce((sum, r) => sum + getCredits(r), 0);

    const uniqueUsers = new Set(realRecharges.map(r => r.user_id)).size;
    const avgAmountXOF = realRecharges.length > 0 ? totalCompletedXOF / realRecharges.length : 0;

    return {
      totalRevenueXOF: totalCompletedXOF,
      pendingAmountXOF: totalPendingXOF,
      totalCredits: totalCreditsReal,
      totalCreditsBonus,
      bonusCount: bonusRecharges.length,
      completedCount: realRecharges.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      uniqueUsers,
      avgAmountXOF,
      successRate: filteredStats.length > 0
        ? ((completed.length / filteredStats.length) * 100).toFixed(1)
        : '0'
    };
  }, [statsRecharges, dateFilter, methodFilter, statusFilter, getAmountXOF, getCredits, isBonus]);

  // Pagination
  const totalPages = Math.ceil(filteredRecharges.length / ITEMS_PER_PAGE)
  const paginatedRecharges = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRecharges.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRecharges, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, methodFilter, dateFilter, searchTerm])

  // Reset expanded groups when view mode changes
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [viewMode]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Utilisateur', 'Email', 'Montant (XOF)', 'Crédits', 'Provider', 'Statut', 'Référence', 'ID Transaction']
    const rows = filteredRecharges.map(r => [
      new Date(r.created_at).toLocaleString('fr-FR'),
      r.user?.name || 'N/A',
      r.user?.email || 'N/A',
      getAmountXOF(r),
      getCredits(r),
      getProvider(r),
      r.status,
      r.payment_ref || r.metadata?.moneyfusion_token || 'N/A',
      r.id
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `recharges-${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: '✅ Export réussi',
      description: `${filteredRecharges.length} recharges exportées`
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copié !', description: text.slice(0, 30) + '...' });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Complété',
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
      case 'pending':
        return {
          label: 'En attente',
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'failed':
        return {
          label: 'Échoué',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      case 'cancelled':
        return {
          label: 'Annulé',
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-700',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
    }
  };

  const getMethodIcon = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'paytech':
      case 'wave':
      case 'orange_money':
      case 'mobile_money':
        return <Smartphone className="w-4 h-4" />;
      case 'card':
      case 'visa':
      case 'mastercard':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Wallet className="w-8 h-8 text-green-600" />
            Recharges Utilisateurs
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des dépôts et rechargements de crédits sur la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={handleExport} disabled={filteredRecharges.length === 0} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenus Réels</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatAmount(stats.totalRevenueXOF)} <span className="text-sm">FCFA</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalCredits} crédits • {stats.completedCount} recharges
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bonus (gratuits) */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bonus Offerts</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {stats.totalCreditsBonus} <span className="text-sm">crédits</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.bonusCount} parrainages
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">En Attente</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {formatAmount(stats.pendingAmountXOF)} <span className="text-sm">FCFA</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingCount} transactions
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unique Users */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Utilisateurs Uniques</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.uniqueUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Moy: {formatAmount(Math.round(stats.avgAmountXOF))} FCFA
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taux de Succès</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.successRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.failedCount} échecs
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          {/* View Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b">
            <span className="text-sm font-medium text-muted-foreground mr-2">Vue :</span>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <LayoutList className="w-4 h-4 mr-1.5" />
              Liste
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="h-8"
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Par Jour
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="h-8"
            >
              <CalendarDays className="w-4 h-4 mr-1.5" />
              Par Semaine
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="h-8"
            >
              <CalendarRange className="w-4 h-4 mr-1.5" />
              Par Mois
            </Button>
            <Button
              variant={viewMode === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('year')}
              className="h-8"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Par Année
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par email, nom, référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-sm min-w-[140px]"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="year">Cette année</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-sm min-w-[130px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="completed">✅ Complété</option>
              <option value="pending">⏳ En attente</option>
              <option value="failed">❌ Échoué</option>
              <option value="cancelled">🚫 Annulé</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-sm min-w-[140px]"
            >
              <option value="all">Toutes méthodes</option>
              <option value="paytech">PayTech</option>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="card">Carte bancaire</option>
            </select>
          </div>

          {/* Active filters summary */}
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <span>{filteredRecharges.length} recharges affichées</span>
            {viewMode !== 'list' && (
              <span className="text-muted-foreground/60">• {groupedRecharges.length} {viewMode === 'day' ? 'jours' : viewMode === 'week' ? 'semaines' : viewMode === 'month' ? 'mois' : 'années'}</span>
            )}
            {(statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setMethodFilter('all');
                  setDateFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs h-6 px-2"
              >
                Réinitialiser filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grouped View */}
      {viewMode !== 'list' && (
        <div className="space-y-4">
          {/* Group controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {viewMode === 'day' && <Calendar className="w-5 h-5 text-blue-600" />}
              {viewMode === 'week' && <CalendarDays className="w-5 h-5 text-purple-600" />}
              {viewMode === 'month' && <CalendarRange className="w-5 h-5 text-orange-600" />}
              {viewMode === 'year' && <Layers className="w-5 h-5 text-green-600" />}
              Recharges par {viewMode === 'day' ? 'jour' : viewMode === 'week' ? 'semaine' : viewMode === 'month' ? 'mois' : 'année'}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAllGroups}>
                <ChevronDown className="w-4 h-4 mr-1" />
                Tout déplier
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAllGroups}>
                <ChevronUp className="w-4 h-4 mr-1" />
                Tout replier
              </Button>
            </div>
          </div>

          {/* Grouped Cards */}
          {groupedRecharges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground mt-2">Aucune recharge trouvée</p>
              </CardContent>
            </Card>
          ) : (
            groupedRecharges.map((group) => {
              const isExpanded = expandedGroups.has(group.key);

              return (
                <Card key={group.key} className="overflow-hidden">
                  {/* Group Header - Clickable */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors border-b"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${viewMode === 'day' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        viewMode === 'week' ? 'bg-purple-100 dark:bg-purple-900/30' :
                          viewMode === 'month' ? 'bg-orange-100 dark:bg-orange-900/30' :
                            'bg-green-100 dark:bg-green-900/30'
                        }`}>
                        {viewMode === 'day' && <Calendar className="w-5 h-5 text-blue-600" />}
                        {viewMode === 'week' && <CalendarDays className="w-5 h-5 text-purple-600" />}
                        {viewMode === 'month' && <CalendarRange className="w-5 h-5 text-orange-600" />}
                        {viewMode === 'year' && <Layers className="w-5 h-5 text-green-600" />}
                      </div>
                      <div>
                        <p className="font-semibold">{group.label}</p>
                        {group.sublabel && (
                          <p className="text-sm text-muted-foreground">{group.sublabel}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-green-600">{formatAmount(group.totalXOF)} FCFA</p>
                        <p className="text-xs text-muted-foreground">{group.totalCredits} crédits</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {group.completedCount}
                        </span>
                        {group.pendingCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Clock className="w-3 h-3" />
                            {group.pendingCount}
                          </span>
                        )}
                        {group.failedCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <XCircle className="w-3 h-3" />
                            {group.failedCount}
                          </span>
                        )}
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Utilisateur</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Montant</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Provider</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {group.recharges.map((recharge) => {
                            const statusConfig = getStatusConfig(recharge.status);
                            return (
                              <tr key={recharge.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2">
                                  <div className="text-sm">
                                    {new Date(recharge.created_at).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  {viewMode !== 'day' && (
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(recharge.created_at).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: 'short'
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <Link
                                    to={`/admin/users?search=${recharge.user?.email || ''}`}
                                    className="hover:text-primary transition-colors"
                                  >
                                    <div className="font-medium text-sm truncate max-w-[150px]">
                                      {recharge.user?.name || 'Utilisateur'}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                      {recharge.user?.email || 'N/A'}
                                    </div>
                                  </Link>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="font-bold text-green-600">{formatAmount(getAmountXOF(recharge))} FCFA</div>
                                  <div className="text-xs text-blue-600">{getCredits(recharge)} crédits</div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    {getMethodIcon(getProvider(recharge))}
                                    <span className="text-sm capitalize">{getProvider(recharge).replace('_', ' ')}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                    {statusConfig.icon}
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRecharge(recharge);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Group Total Row */}
                        <tfoot className="bg-muted/50 border-t-2">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 font-semibold text-sm">
                              Total {group.label}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-green-600">{formatAmount(group.totalXOF)} FCFA</div>
                              <div className="text-xs text-blue-600">{group.totalCredits} crédits</div>
                            </td>
                            <td colSpan={3} className="px-4 py-3 text-right text-sm text-muted-foreground">
                              {group.recharges.length} transaction{group.recharges.length > 1 ? 's' : ''}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Recharges Table (List View) */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montant / Crédits</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Référence</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">Chargement...</p>
                    </td>
                  </tr>
                ) : paginatedRecharges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground mt-2">Aucune recharge trouvée</p>
                      <p className="text-xs text-muted-foreground">Modifiez vos filtres pour voir plus de résultats</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRecharges.map((recharge) => {
                    const statusConfig = getStatusConfig(recharge.status);

                    return (
                      <tr key={recharge.id} className="hover:bg-muted/30 transition-colors">
                        {/* Date */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">
                            {new Date(recharge.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(recharge.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/users?search=${recharge.user?.email || ''}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="font-medium text-sm truncate max-w-[180px]">
                              {recharge.user?.name || 'Utilisateur'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {recharge.user?.email || 'N/A'}
                            </div>
                          </Link>
                        </td>

                        {/* Amount XOF */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-lg font-bold text-green-600">
                                {formatAmount(getAmountXOF(recharge))}
                              </span>
                              <span className="text-xs text-muted-foreground">FCFA</span>
                            </div>
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {getCredits(recharge)} crédit{getCredits(recharge) > 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                              {getMethodIcon(getProvider(recharge))}
                            </div>
                            <span className="text-sm capitalize">
                              {getProvider(recharge).replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </td>

                        {/* Reference */}
                        <td className="px-4 py-3">
                          {(recharge.payment_ref || recharge.metadata?.moneyfusion_token) ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded truncate max-w-[120px]">
                                {recharge.payment_ref || recharge.metadata?.moneyfusion_token}
                              </span>
                              <button
                                onClick={() => copyToClipboard(recharge.payment_ref || recharge.metadata?.moneyfusion_token)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                              >
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecharge(recharge)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Page numbers */}
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
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2"
                >
                  »»
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recharge Details Modal */}
      {selectedRecharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  Détails de la Recharge
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecharge(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Amount highlight */}
              <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-sm text-muted-foreground">Montant payé</p>
                <p className="text-4xl font-bold text-green-600 mt-1">
                  {formatAmount(getAmountXOF(selectedRecharge))} <span className="text-lg">FCFA</span>
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {getCredits(selectedRecharge)} crédit{getCredits(selectedRecharge) > 1 ? 's' : ''} ajouté{getCredits(selectedRecharge) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Statut</label>
                  <div className="mt-1">
                    {(() => {
                      const config = getStatusConfig(selectedRecharge.status);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Provider</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getMethodIcon(getProvider(selectedRecharge))}
                    <span className="capitalize">{getProvider(selectedRecharge).replace('_', ' ')}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Date</label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedRecharge.created_at).toLocaleString('fr-FR', {
                      dateStyle: 'full',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">ID Transaction</label>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded truncate">
                      {selectedRecharge.id.slice(0, 12)}...
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedRecharge.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* User info */}
              <div className="pt-4 border-t">
                <label className="text-xs font-medium text-muted-foreground uppercase">Utilisateur</label>
                <div className="mt-2 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{selectedRecharge.user?.name || 'Utilisateur'}</p>
                    <p className="text-sm text-muted-foreground">{selectedRecharge.user?.email}</p>
                  </div>
                  <Link
                    to={`/admin/users?search=${selectedRecharge.user?.email}`}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Payment reference */}
              {selectedRecharge.payment_ref && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Référence paiement</label>
                  <div className="mt-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <span className="font-mono text-sm flex-1 break-all">{selectedRecharge.payment_ref}</span>
                    <button
                      onClick={() => copyToClipboard(selectedRecharge.payment_ref!)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedRecharge.description && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                  <p className="mt-1 text-sm p-3 bg-muted/50 rounded-lg">{selectedRecharge.description}</p>
                </div>
              )}

              {/* Metadata */}
              {selectedRecharge.metadata && Object.keys(selectedRecharge.metadata).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Métadonnées</label>
                  <pre className="mt-1 p-3 bg-muted/50 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedRecharge.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Close button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedRecharge(null)}
              >
                Fermer
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
