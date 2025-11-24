// @ts-nocheck
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import paytech from '@/lib/api/paytech';
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
  Receipt
} from 'lucide-react';
import { formatDate, formatCurrency, generateRef } from '@/lib/utils';
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
  payment_ref: string | null;
  description: string | null;
  created_at: string;
}

interface CreditHistory {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(5000);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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
      
      // Request payment from PayTech
      const payment = await paytech.requestPayment(
        {
          item_name: 'Rechargement crédits One SMS',
          item_price: amount,
          command_name: ref,
        },
        import.meta.env.VITE_PAYTECH_IPN_URL,
        import.meta.env.VITE_PAYTECH_SUCCESS_URL,
        import.meta.env.VITE_PAYTECH_CANCEL_URL
      );

      // Save transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'recharge',
          amount: amount,
          status: 'pending',
          payment_method: 'paytech',
          payment_ref: ref,
          description: `Rechargement de ${amount} XOF`,
        });

      if (error) throw error;

      return payment;
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
      t.payment_ref || '-',
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
        t.payment_ref || '-',
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

  // Filter transactions
  const filteredTransactions = (transactions || []).filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesDate = (!dateRange.start || new Date(t.created_at) >= new Date(dateRange.start)) &&
                       (!dateRange.end || new Date(t.created_at) <= new Date(dateRange.end));
    return matchesType && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      completed: { label: 'Complété', variant: 'default' },
      pending: { label: 'En attente', variant: 'secondary' },
      failed: { label: 'Échoué', variant: 'destructive' },
      cancelled: { label: 'Annulé', variant: 'outline' },
    };
    return config[status] || { label: status, variant: 'outline' };
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-gray-600">Consultez l'historique de vos transactions</p>
        </div>
        <Button onClick={() => setShowRechargeModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Recharger
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
              className="p-2 border rounded-lg"
            >
              <option value="all">Tous les types</option>
              <option value="recharge">Rechargements</option>
              <option value="purchase">Achats</option>
              <option value="refund">Remboursements</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border rounded-lg"
            >
              <option value="all">Tous les statuts</option>
              <option value="completed">Complété</option>
              <option value="pending">En attente</option>
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
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="space-y-3">
          {filteredTransactions.map(transaction => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gray-100">
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{transaction.description || transaction.type}</p>
                      <p className="text-sm text-gray-600">{formatDate(transaction.created_at)}</p>
                      {transaction.payment_ref && (
                        <p className="text-xs text-gray-500 font-mono">Réf: {transaction.payment_ref}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      transaction.type === 'recharge' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'recharge' ? '+' : '-'}{formatCurrency(transaction.amount, 'XOF')}
                    </p>
                    <Badge {...getStatusBadge(transaction.status)}>
                      {getStatusBadge(transaction.status).label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Recharger mes crédits</CardTitle>
              <CardDescription>Choisissez le montant à recharger</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Montant (XOF)</label>
                <Input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(Number(e.target.value))}
                  min={500}
                  step={500}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[2000, 5000, 10000, 20000, 50000, 100000].map(amount => (
                  <Button
                    key={amount}
                    variant={rechargeAmount === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRechargeAmount(amount)}
                  >
                    {amount / 1000}k
                  </Button>
                ))}
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span>Montant:</span>
                  <span className="font-bold">{formatCurrency(rechargeAmount, 'XOF')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Méthode:</span>
                  <span>PayTech (Wave, Orange Money, etc.)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRechargeModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => rechargeMutation.mutate(rechargeAmount)}
                  disabled={rechargeMutation.isPending}
                  className="flex-1"
                >
                  {rechargeMutation.isPending ? 'Traitement...' : 'Continuer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
