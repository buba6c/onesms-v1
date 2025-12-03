import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Sparkles, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Star,
  CreditCard
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { packagesApi, ActivationPackage } from '@/lib/api/packages';

export default function TopUpPage() {
  const { t } = useTranslation();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Load packages from database
  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['activation-packages'],
    queryFn: packagesApi.getActivePackages,
  });

  // Auto-select first popular package or first package
  useEffect(() => {
    if (packages.length > 0 && !selectedPackageId) {
      const popularPackage = packages.find(pkg => pkg.is_popular);
      setSelectedPackageId(popularPackage?.id || packages[0].id);
    }
  }, [packages, selectedPackageId]);

  const rechargeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackageId) {
        throw new Error('Veuillez sélectionner un montant');
      }
      if (!user) {
        throw new Error('Vous devez être connecté pour recharger');
      }

      const packageData = packages.find(pkg => pkg.id === selectedPackageId);
      if (!packageData) {
        throw new Error('Package non trouvé');
      }

      const amount = packageData.price_xof;
      
      // MoneyFusion - redirection directe
      const returnUrl = window.location.hostname === 'localhost' 
        ? 'https://onesms-sn.com/dashboard?payment=success'
        : `${window.location.origin}/dashboard?payment=success`;
        
      const { data, error } = await supabase.functions.invoke('init-moneyfusion-payment', {
        body: {
          amount: amount,
          currency: 'XOF',
          description: `Rechargement ${packageData.activations} activations ONE SMS`,
          metadata: {
            user_id: user.id,
            type: 'recharge',
            provider: 'moneyfusion',
            activations: packageData.activations,
            package_id: packageData.id
          },
          return_url: returnUrl,
          customer: {
            email: user.email || '',
            first_name: user.user_metadata?.first_name || 'Client',
            last_name: user.user_metadata?.last_name || 'ONESMS',
            phone: user.user_metadata?.phone || '00000000'
          }
        }
      });

      // console.log('🔍 [MONEYFUSION] Response:', data, error);

      if (error) throw new Error(error.message || t('common.error'));
      
      const checkoutUrl = data?.data?.checkout_url || data?.checkout_url;
      if (!checkoutUrl) throw new Error(t('topup.noPaymentUrl', 'Payment URL not received'));

      return { redirect_url: checkoutUrl };
    },
    onSuccess: (payment) => {
      window.location.href = payment.redirect_url;
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('topup.paymentError', 'Payment error'),
        variant: 'destructive',
      });
    }
  });

  const selectedPackageData = packages.find(pkg => pkg.id === selectedPackageId);

  if (loadingPackages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 lg:pt-0">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-3">
            <Wallet className="w-4 h-4" />
            <span>Rechargement</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Acheter des Activations
          </h1>
          <p className="text-muted-foreground text-sm">
            Choisissez un pack pour recevoir des SMS de vérification
          </p>
        </div>

        {/* Packages Grid - Vertical Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {packages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const pricePerActivation = Math.round(pkg.price_xof / pkg.activations);
            
            return (
              <Card
                key={pkg.id}
                className={`relative p-4 cursor-pointer transition-all active:scale-[0.98] flex flex-col items-center text-center ${
                  isSelected
                    ? 'border-2 border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                    : 'border border-border hover:border-primary/50 hover:shadow-md'
                }`}
                onClick={() => setSelectedPackageId(pkg.id)}
              >
                {/* Popular Badge */}
                {pkg.is_popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] px-2 py-0.5 shadow-sm">
                      <Star className="w-2.5 h-2.5 mr-0.5" />
                      Populaire
                    </Badge>
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                )}

                {/* Activations Count */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-3 mt-2 ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                    : 'bg-muted text-foreground'
                }`}>
                  {pkg.activations}
                </div>

                {/* Label */}
                <p className="font-semibold text-foreground text-sm mb-1">
                  Activations
                </p>

                {/* Price per activation */}
                <p className="text-[11px] text-muted-foreground mb-3">
                  ~{pricePerActivation.toLocaleString()} F/unité
                </p>

                {/* Price */}
                <div className={`w-full py-2 px-3 rounded-xl ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50'
                }`}>
                  <p className={`text-lg font-bold ${isSelected ? '' : 'text-foreground'}`}>
                    {pkg.price_xof.toLocaleString()}
                  </p>
                  <p className={`text-[10px] ${isSelected ? 'opacity-80' : 'text-muted-foreground'}`}>
                    FCFA
                  </p>
                </div>

                {/* Savings Badge */}
                {pkg.savings_percentage > 0 && (
                  <Badge variant="secondary" className="text-[10px] mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    Économie -{pkg.savings_percentage}%
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>

        {/* Payment Button */}
        {selectedPackageData && (
          <div className="sticky bottom-4 z-10">
            <Card className="p-4 bg-primary text-primary-foreground shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm opacity-90">Total à payer</p>
                  <p className="text-2xl font-bold">
                    {selectedPackageData.price_xof.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-90">{selectedPackageData.activations}</p>
                  <p className="text-lg font-semibold">Activations</p>
                </div>
              </div>
              
              <Button 
                className="w-full h-12 bg-white text-primary hover:bg-white/90 font-bold text-base shadow-lg"
                onClick={() => rechargeMutation.mutate()}
                disabled={!selectedPackageData || rechargeMutation.isPending}
              >
                {rechargeMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payer maintenant
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-3 text-xs opacity-80">
                <Shield className="w-3 h-3" />
                <span>Paiement sécurisé via Mobile Money</span>
              </div>
            </Card>
          </div>
        )}

        {/* Info Cards */}
        <div className="space-y-3 mt-6 pb-24">
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">Crédit instantané</p>
                <p className="text-xs text-muted-foreground">
                  Vos activations sont ajoutées immédiatement après le paiement.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">Paiement sécurisé</p>
                <p className="text-xs text-muted-foreground">
                  Orange Money, Wave, MTN Mobile Money, Moov Money
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">1 Activation = 1 Numéro</p>
                <p className="text-xs text-muted-foreground">
                  Recevez des codes SMS sur WhatsApp, Telegram, Instagram, TikTok et 1000+ services.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
