import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, DollarSign, MessageSquare, Phone, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPhoneNumber } from '@/utils/phoneFormatter';

// Helpers pour calculer XOF et Crédits
const getAmountXOF = (tx: any): number => {
  if (tx.type === 'referral_bonus' || tx.type === 'admin_bonus') return 0;
  if (tx.metadata?.amount_xof) return Number(tx.metadata.amount_xof) || 0;
  if (tx.metadata?.payment_provider === 'paydunya') return Number(tx.amount) || 0;

  const provider = (tx.metadata?.payment_provider || tx.provider || tx.payment_method || '').toLowerCase();
  if (provider === 'moneyfusion' && tx.amount && tx.amount < 50) return Number(tx.amount) * 100;
  return Number(tx.amount) || 0;
};

const getCredits = (tx: any): number => {
  if (tx.metadata?.activations) return parseInt(String(tx.metadata.activations), 10) || 0;
  const provider = (tx.metadata?.payment_provider || tx.provider || tx.payment_method || '').toLowerCase();
  if (provider === 'moneyfusion' && tx.amount && tx.amount < 50) return Number(tx.amount) || 0;
  if (tx.metadata?.amount_xof) return Math.round(Number(tx.metadata.amount_xof) / 100) || 0;
  return Number(tx.amount) || 0;
};

interface UserDetailsModalProps {
  userId: string | null;
  onClose: () => void;
  userEmail?: string;
}

export function UserDetailsModal({ userId, onClose, userEmail }: UserDetailsModalProps) {
  const isOpen = !!userId;

  // 1. Fetch Transactions (Recharges)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['admin-user-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // 2. Fetch Activations (Achats SMS)
  const { data: activations = [], isLoading: isLoadingActivations } = useQuery({
    queryKey: ['admin-user-activations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // 3. Fetch Rentals (Locations)
  const { data: rentals = [], isLoading: isLoadingRentals } = useQuery({
    queryKey: ['admin-user-rentals', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 border-b bg-gray-50 dark:bg-gray-900">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Historique Complet
          </DialogTitle>
          <DialogDescription>
            Utilisateur : <span className="font-semibold text-gray-900 dark:text-white">{userEmail || userId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950 p-6">
          <Tabs defaultValue="activations" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="activations" className="flex gap-2">
                <MessageSquare className="w-4 h-4" /> Achats (Activations)
              </TabsTrigger>
              <TabsTrigger value="rentals" className="flex gap-2">
                <Phone className="w-4 h-4" /> Locations (Rentals)
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex gap-2">
                <DollarSign className="w-4 h-4" /> Recharges (Transactions)
              </TabsTrigger>
            </TabsList>

            {/* TAB: ACTIVATIONS */}
            <TabsContent value="activations" className="mt-0">
              {isLoadingActivations ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : activations.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Aucune activation trouvée.</div>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Numéro</th>
                        <th className="px-4 py-3">Coût</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Code / SMS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activations.map((act: any) => (
                        <tr key={act.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(act.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 font-semibold">{act.service_code}</td>
                          <td className="px-4 py-3 font-mono">{formatPhoneNumber(act.phone)}</td>
                          <td className="px-4 py-3 font-bold text-blue-600">{Math.floor(act.price)} Ⓐ</td>
                          <td className="px-4 py-3">
                            <Badge variant={act.status === 'received' ? 'success' : act.status === 'cancelled' || act.status === 'timeout' ? 'destructive' : 'secondary'}>
                              {act.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {act.sms_code ? (
                              <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                {act.sms_code.includes('STATUS_OK:') ? act.sms_code.split(':')[1] : act.sms_code}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* TAB: RENTALS */}
            <TabsContent value="rentals" className="mt-0">
              {isLoadingRentals ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : rentals.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Aucune location trouvée.</div>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Numéro</th>
                        <th className="px-4 py-3">Durée</th>
                        <th className="px-4 py-3">Coût / Gelé</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">SMS Reçus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rentals.map((rent: any) => (
                        <tr key={rent.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(rent.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 font-semibold">{rent.service_code}</td>
                          <td className="px-4 py-3 font-mono">{formatPhoneNumber(rent.phone)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-700">{rent.rent_hours || rent.duration_hours || '-'} h</div>
                            {rent.rent_hours > (rent.duration_hours || rent.rent_hours) && (
                              <Badge variant="outline" className="mt-1 text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200">
                                Prolongé
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-purple-600">{Math.floor(rent.total_cost || rent.price || 0)} Ⓐ</div>
                            {rent.frozen_amount > 0 && (
                              <div className="text-xs text-orange-500 flex items-center gap-1">🔒 {Math.floor(rent.frozen_amount)} Ⓐ</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={['active', 'completed'].includes(rent.status) ? 'default' : 'secondary'} className={rent.status === 'active' ? 'bg-purple-500' : ''}>
                              {rent.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold bg-gray-100 px-2 py-1 rounded">
                              {rent.message_count || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* TAB: TRANSACTIONS */}
            <TabsContent value="transactions" className="mt-0">
              {isLoadingTransactions ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Aucune transaction trouvée.</div>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Montant (FCFA)</th>
                        <th className="px-4 py-3">Crédits (Ⓐ)</th>
                        <th className="px-4 py-3">Statut (Commit)</th>
                        <th className="px-4 py-3">Détails / Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((tx: any) => {
                        const amountXOF = getAmountXOF(tx);
                        const credits = getCredits(tx);
                        
                        return (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={tx.type === 'deposit' || tx.type === 'admin_bonus' || tx.type === 'refund' || tx.type === 'recharge' ? 'success' : 'secondary'}>
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium">
                            {amountXOF > 0 ? (
                              <span className="text-green-600">+{amountXOF} FCFA</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 font-bold ${credits > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {credits > 0 ? '+' : ''}{Math.floor(credits)} Ⓐ
                          </td>
                          <td className="px-4 py-3">
                            {tx.status === 'pending' ? (
                              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">En attente (Gelé)</Badge>
                            ) : tx.status === 'completed' ? (
                              <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-200">Commit (Confirmé)</Badge>
                            ) : tx.status === 'failed' ? (
                              <Badge variant="destructive">Échoué / Remboursé</Badge>
                            ) : (
                              <Badge variant="secondary">{tx.status}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">
                                {tx.description?.toLowerCase().includes('location') || tx.description?.toLowerCase().includes('rent') ? (
                                  <Badge variant="outline" className="mr-2 text-purple-600 border-purple-200 bg-purple-50 text-[10px]">Location</Badge>
                                ) : tx.description?.toLowerCase().includes('prolongation') || tx.description?.toLowerCase().includes('extend') ? (
                                  <Badge variant="outline" className="mr-2 text-indigo-600 border-indigo-200 bg-indigo-50 text-[10px]">Extension</Badge>
                                ) : tx.type === 'purchase' ? (
                                  <Badge variant="outline" className="mr-2 text-blue-600 border-blue-200 bg-blue-50 text-[10px]">Activation</Badge>
                                ) : null}
                                {tx.description || '-'}
                              </span>
                              {tx.metadata?.completion_reason && (
                                <span className="text-[10px] text-gray-400 italic">
                                  Raison du commit: {tx.metadata.completion_reason}
                                </span>
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
            </TabsContent>

          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
