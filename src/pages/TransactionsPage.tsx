
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Download,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Wallet,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { formatDate, formatCurrency, generateRef, cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  reference: string | null; // Renamed from payment_ref
  description: string | null;
  created_at: string;
  related_activation_id?: string | null;
  related_rental_id?: string | null;
  metadata?: any;
}

interface Activation {
  id: string;
  status: string;
  expires_at: string;
}

interface CreditHistory {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(5000);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        // Explicitly select existing columns to avoid 400 errors with * if schema changed
        .select('id, user_id, type, amount, status, payment_method, reference, description, created_at, related_activation_id, related_rental_id, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch activations to check their real status
  const { data: activations } = useQuery<Activation[]>({
    queryKey: ['activations-for-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('activations')
        .select('id, status, expires_at')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Helper function to get real status of transaction based on activation status
  const getRealTransactionStatus = (transaction: Transaction): string => {
    // Si déjà complété, refunded ou failed, garder le statut
    if (['completed', 'refunded', 'failed', 'cancelled'].includes(transaction.status)) {
      return transaction.status;
    }

    // Si c'est un achat (purchase) avec pending, vérifier l'activation liée
    if (transaction.type === 'purchase' && transaction.status === 'pending') {
      const activationId = transaction.related_activation_id || transaction.metadata?.activation_id;

      if (activationId && activations) {
        const activation = activations.find(a => a.id === activationId);
        if (activation) {
          // Vérifier si expirée
          const now = new Date();
          const expiresAt = new Date(activation.expires_at);

          if (activation.status === 'received') {
            return 'completed';
          } else if (activation.status === 'cancelled' || activation.status === 'refunded') {
            return 'refunded';
          } else if (activation.status === 'timeout' || (now > expiresAt && activation.status !== 'received')) {
            return 'refunded'; // Timeout = refunded
          }
        }
      }

      // Vérifier si la transaction est trop ancienne (plus de 30 min = expirée)
      const txnAge = (Date.now() - new Date(transaction.created_at).getTime()) / 1000 / 60;
      if (txnAge > 30) {
        return 'refunded'; // Probablement expirée et remboursée
      }
    }

    return transaction.status;
  };

  // Fetch credits history
  const { data: creditsHistory, isLoading: creditsLoading } = useQuery<CreditHistory[]>({
    queryKey: ['credits-history', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('credits_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Recharge credits mutation
  const rechargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user?.id) throw new Error('User not authenticated');

      const ref = generateRef('RECHARGE');

      // Call Edge Function to securely generate PayTech URL and insert transaction
      const { data, error } = await supabase.functions.invoke('paytech-create-payment', {
        body: {
          amount: amount,
          item_name: 'Rechargement crédits One SMS',
          command_name: ref,
          ipn_url: import.meta.env.VITE_PAYTECH_IPN_URL || 'https://api.sms-activate.org/api/ipn', // Fallback, update in Edge Function for prod
          success_url: import.meta.env.VITE_PAYTECH_SUCCESS_URL || window.location.origin + '/dashboard/transactions',
          cancel_url: import.meta.env.VITE_PAYTECH_CANCEL_URL || window.location.origin + '/dashboard/transactions'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erreur lors de la création du paiement');
      }
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Erreur lors de la création du paiement');
      }

      return data;
    },
    onSuccess: (payment) => {
      // Verify payment response
      if (!payment.redirect_url) {
        throw new Error('Aucune URL de redirection reçue de PayTech');
      }
      if (payment.success !== 1) {
        throw new Error(payment.message || 'Erreur lors de la création du paiement');
      }
      // Redirect to payment page
      window.location.href = payment.redirect_url;
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Export to CSV
  const exportToCSV = () => {
    if (!transactions || transactions.length === 0) return;

    const headers = ['Date', 'Type', 'Montant', 'Statut', 'Référence', 'Description'];
    const rows = filteredTransactions.map(t => [
      formatDate(t.created_at),
      t.type,
      t.amount.toString(),
      t.status,
      t.reference || '-', // Corrected
      t.description || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    a.click();

    toast({
      title: 'Export réussi',
      description: 'Fichier CSV téléchargé',
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!transactions || transactions.length === 0) return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('ONE SMS - Historique des Transactions', 14, 20);
    doc.setFontSize(10);
    doc.text(`Généré le ${formatDate(new Date().toISOString())}`, 14, 28);
    doc.text(`Utilisateur: ${user?.email}`, 14, 34);

    // Table
    (doc as any).autoTable({
      startY: 40,
      head: [['Date', 'Type', 'Montant (XOF)', 'Statut', 'Référence']],
      body: filteredTransactions.map(t => [
        formatDate(t.created_at),
        t.type,
        t.amount.toLocaleString(),
        t.status,
        t.reference || '-', // Corrected
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`transactions_${Date.now()}.pdf`);

    toast({
      title: 'Export réussi',
      description: 'Fichier PDF téléchargé',
    });
  };

  // Filter transactions - using real status
  const filteredTransactions = (transactions || []).filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const realStatus = getRealTransactionStatus(t);
    const matchesStatus = filterStatus === 'all' || realStatus === filterStatus;
    const matchesDate = (!dateRange.start || new Date(t.created_at) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(t.created_at) <= new Date(dateRange.end));
    return matchesType && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon?: React.ReactNode }> = {
      completed: { label: t('status.completed'), variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      pending: { label: t('status.pending'), variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1 animate-pulse" /> },
      failed: { label: t('status.failed'), variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      cancelled: { label: t('status.cancelled'), variant: 'outline', icon: <XCircle className="h-3 w-3 mr-1" /> },
      refunded: { label: 'Remboursé', variant: 'outline', icon: <RefreshCw className="h-3 w-3 mr-1" /> },
    };
    return config[status] || { label: status, variant: 'outline', icon: <AlertCircle className="h-3 w-3 mr-1" /> };
  };

  const getTypeIcon = (type: string) => {
    return type === 'recharge' ? (
      <ArrowDownRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    );
  };

  const totalRecharge = transactions?.filter(t => t.type === 'recharge' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalSpent = transactions?.filter(t => t.type === 'purchase' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8 pt-10 lg:pt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.transactions')}</h1>
          <p className="text-gray-600">{t('history.viewTransactions', 'View your transaction history')}</p>
        </div>
        <Button onClick={() => setShowRechargeModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('nav.topUp')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Solde Actuel</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(user?.credits || 0, 'XOF')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rechargé</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRecharge, 'XOF')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Dépensé</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent, 'XOF')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Filtres</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 border rounded-lg bg-background"
            >
              <option value="all">Tous les types</option>
              <option value="recharge">Rechargements</option>
              <option value="purchase">Achats</option>
              <option value="refund">Remboursements</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border rounded-lg bg-background"
            >
              <option value="all">Tous les statuts</option>
              <option value="completed">Complété</option>
              <option value="pending">En attente</option>
              <option value="refunded">Remboursé</option>
              <option value="failed">Échoué</option>
              <option value="cancelled">Annulé</option>
            </select>

            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              placeholder="Date début"
            />

            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              placeholder="Date fin"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {transactionsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="space-y-3">
          {filteredTransactions.map(transaction => {
            // Obtenir le statut réel basé sur l'activation liée
            const realStatus = getRealTransactionStatus(transaction);
            const statusConfig = getStatusBadge(realStatus);

            // Déterminer si c'est un crédit ou débit
            const isCredit = ['recharge', 'topup', 'credit', 'refund', 'bonus'].includes(transaction.type);
            const isRefunded = realStatus === 'refunded';

            return (
              <Card key={transaction.id} className={`hover:shadow-md transition-shadow ${isRefunded ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10' : ''
                }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Icon */}
                      <div className={`p-2.5 rounded-full flex-shrink-0 ${isRefunded ? 'bg-orange-100 dark:bg-orange-900/30' :
                          isCredit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                        {isRefunded ? (
                          <RefreshCw className="h-4 w-4 text-orange-600" />
                        ) : isCredit ? (
                          <ArrowDownRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm capitalize truncate">
                          {transaction.description ? transaction.description.replace(/\s*\([^)]*\)/g, '').trim() : transaction.type}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.created_at)}
                          </span>
                          {transaction.reference && ( // Corrected from payment_ref
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              {transaction.reference.slice(0, 15)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount + Status */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-base font-bold ${isRefunded ? 'text-orange-600' :
                          isCredit ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), 'XOF')}
                      </p>
                      <Badge
                        variant={statusConfig.variant}
                        className={`mt-1 text-xs ${realStatus === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            realStatus === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              realStatus === 'refunded' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                ''
                          }`}
                      >
                        <span className="flex items-center">
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">Aucune transaction</h3>
            <p className="text-gray-600">Vos transactions apparaîtront ici</p>
          </CardContent>
        </Card>
      )}

      {/* Recharge Modal - PREMIUM REDESIGN */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md overflow-hidden border-0 shadow-[0_0_50px_-12px_rgba(37,99,235,0.5)] animate-in zoom-in-95 duration-300">
            {/* Header avec Dégradé */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-white/5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/20">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Recharger mes crédits</h2>
                <p className="text-blue-100 font-medium mt-1 text-sm">Ajoutez du solde pour acheter vos numéros</p>
              </div>
            </div>

            <CardContent className="p-6 space-y-6 bg-white dark:bg-gray-950">
              {/* Input du montant */}
              <div className="text-center space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Montant (XOF)</label>
                <div className="relative max-w-[200px] mx-auto group">
                  <Input
                    type="number"
                    value={rechargeAmount || ''}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    min={500}
                    step={500}
                    className="text-5xl font-black text-center h-20 border-b-2 border-t-0 border-l-0 border-r-0 rounded-none border-gray-200 focus-visible:ring-0 focus-visible:border-blue-600 p-0 transition-colors bg-transparent"
                  />
                  <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">XOF</span>
                </div>
              </div>

              {/* Raccourcis de prix */}
              <div className="grid grid-cols-3 gap-3">
                {[2000, 5000, 10000, 20000, 50000, 100000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount)}
                    className={cn(
                      "py-2.5 px-1 rounded-xl text-sm font-bold transition-all duration-200 border-2",
                      rechargeAmount === amount 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]" 
                        : "bg-transparent border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
                    )}
                  >
                    {amount >= 1000 ? `${amount / 1000}k` : amount}
                  </button>
                ))}
              </div>

              {/* Récapitulatif */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 space-y-3 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Total à payer:</span>
                  <span className="font-black text-xl text-gray-900 dark:text-white">{formatCurrency(rechargeAmount || 0, 'XOF')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Moyens acceptés:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-600 px-2 py-1 rounded-md">Orange</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-1 rounded-md">Wave</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRechargeModal(false)}
                  className="px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => rechargeMutation.mutate(rechargeAmount)}
                  disabled={rechargeMutation.isPending || !rechargeAmount || rechargeAmount < 500}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl py-4 shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
                >
                  {rechargeMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</>
                  ) : (
                    <>Payer maintenant <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
