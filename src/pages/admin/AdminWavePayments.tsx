import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Image as ImageIcon,
  User,
  Calendar,
  DollarSign,
  ExternalLink,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface WavePaymentProof {
  id: string;
  user_id: string;
  amount: number;
  activations: number;
  proof_url: string;
  status: string;
  rejection_reason?: string;
  validated_by?: string;
  validated_at?: string;
  created_at: string;
  updated_at: string;
  metadata: {
    base_activations?: number;
    bonus_activations?: number;
    uploaded_at?: string;
    wave_url?: string;
  };
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export default function AdminWavePayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProof, setSelectedProof] = useState<WavePaymentProof | null>(null);

  // Fetch Wave payment proofs
  const { data: proofs = [], isLoading, error: queryError } = useQuery({
    queryKey: ['wave-payment-proofs', statusFilter],
    queryFn: async () => {
      console.log('[WAVE ADMIN] Fetching proofs, filter:', statusFilter);
      
      // 1. Récupérer les preuves
      let proofsQuery = supabase
        .from('wave_payment_proofs')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        proofsQuery = proofsQuery.eq('status', statusFilter);
      }

      const { data: proofsData, error: proofsError } = await proofsQuery;
      if (proofsError) {
        console.error('[WAVE ADMIN] Error fetching proofs:', proofsError);
        throw proofsError;
      }

      console.log('[WAVE ADMIN] Proofs found:', proofsData?.length);

      // 2. Récupérer les infos utilisateurs
      const userIds = [...new Set(proofsData?.map(p => p.user_id) || [])];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', userIds);

      if (usersError) {
        console.error('[WAVE ADMIN] Error fetching users:', usersError);
      }

      console.log('[WAVE ADMIN] Users found:', usersData?.length);

      // 3. Joindre manuellement
      const proofsWithUsers = proofsData?.map(proof => ({
        ...proof,
        user: usersData?.find(u => u.id === proof.user_id)
      }));

      console.log('[WAVE ADMIN] Final proofs with users:', proofsWithUsers?.length);
      return proofsWithUsers as WavePaymentProof[];
    },
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });

  // Marquer comme validé (vous créditez manuellement après)
  const validateMutation = useMutation({
    mutationFn: async ({ proofId }: { proofId: string }) => {
      const currentUser = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('wave_payment_proofs')
        .update({
          status: 'validated',
          validated_by: currentUser.data.user?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', proofId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wave-payment-proofs'] });
      toast({
        title: 'Marqué comme validé',
        description: 'N\'oubliez pas de créditer l\'utilisateur manuellement',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject payment proof
  const rejectMutation = useMutation({
    mutationFn: async ({ proofId, reason }: { proofId: string; reason: string }) => {
      const { error } = await supabase
        .from('wave_payment_proofs')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', proofId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wave-payment-proofs'] });
      setSelectedProof(null);
      toast({
        title: 'Paiement rejeté',
        description: 'La preuve a été marquée comme rejetée',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', variant: 'default' as const, icon: Clock },
      validated: { label: 'Validé', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      rejected: { label: 'Rejeté', variant: 'destructive' as const, icon: XCircle },
    };
    const cfg = config[status as keyof typeof config] || config.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className={cfg.className}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const filteredProofs = proofs.filter(proof => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        proof.user?.email?.toLowerCase().includes(search) ||
        proof.user?.name?.toLowerCase().includes(search) ||
        proof.id.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: proofs.length,
    pending: proofs.filter(p => p.status === 'pending').length,
    validated: proofs.filter(p => p.status === 'validated').length,
    rejected: proofs.filter(p => p.status === 'rejected').length,
    totalAmount: proofs
      .filter(p => p.status === 'validated')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-8 h-8 animate-spin" />
        <p className="ml-4">Chargement des paiements Wave...</p>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600">Erreur: {(queryError as Error).message}</p>
      </div>
    );
  }

  console.log('[WAVE ADMIN RENDER] Proofs:', proofs?.length, 'Filtered:', filteredProofs?.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          Paiements Wave
        </h1>
        <p className="text-muted-foreground mt-1">
          Validez ou rejetez les paiements Wave avec preuve
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        
        <Card className="p-4 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
        </Card>

        <Card className="p-4 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Validés</p>
              <p className="text-2xl font-bold text-green-600">{stats.validated}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejetés</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Montant validé</p>
              <p className="text-xl font-bold text-blue-600">
                {stats.totalAmount.toLocaleString()} F
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, nom ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              Tous
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              size="sm"
            >
              <Clock className="w-4 h-4 mr-1" />
              En attente
            </Button>
            <Button
              variant={statusFilter === 'validated' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('validated')}
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Validés
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment Proofs List */}
      <div className="grid gap-4">
        {filteredProofs.length === 0 ? (
          <Card className="p-8 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun paiement Wave trouvé</p>
          </Card>
        ) : (
          filteredProofs.map((proof) => (
            <Card key={proof.id} className="p-6">
              <div className="grid md:grid-cols-[200px_1fr_auto] gap-6">
                {/* Proof Image */}
                <div>
                  {proof.proof_url ? (
                    <div className="relative group">
                      <img
                        src={proof.proof_url}
                        alt="Preuve de paiement"
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                        onClick={() => window.open(proof.proof_url, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Proof Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(proof.status)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(proof.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{proof.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{proof.user?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{proof.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-bold text-lg">{proof.amount.toLocaleString()} FCFA</p>
                        <p className="text-xs text-muted-foreground">
                          {proof.activations} activations
                          {proof.metadata?.bonus_activations > 0 && (
                            <span className="text-green-600"> (+{proof.metadata.bonus_activations} bonus)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {proof.rejection_reason && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                      <strong>Raison du rejet:</strong> {proof.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {proof.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => {
                          const confirmText = `Marquer comme VALIDÉ ?\n\nUtilisateur: ${proof.user?.email}\nMontant: ${proof.amount} FCFA\nActivations: ${proof.activations}\n\n⚠️ Vous devez créditer manuellement après !`;
                          if (confirm(confirmText)) {
                            validateMutation.mutate({ proofId: proof.id });
                          }
                        }}
                        disabled={validateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marquer validé
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Raison du rejet :');
                          if (reason) {
                            rejectMutation.mutate({ proofId: proof.id, reason });
                          }
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeter
                      </Button>
                    </>
                  )}
                  
                  {proof.status === 'validated' && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30">
                      ⚠️ Créditer utilisateur
                    </Badge>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(proof.proof_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Voir preuve
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
