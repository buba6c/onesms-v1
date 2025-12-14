import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Sparkles, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Star,
  CreditCard,
  Ticket,
  X,
  Gift
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { packagesApi } from '@/lib/api/packages';

export default function TopUpPage() {
  const { t } = useTranslation();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discount_amount?: number;
    final_amount?: number;
    message?: string;
    error?: string;
    promo_code_id?: string;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Load packages from database
  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['activation-packages'],
    queryFn: packagesApi.getActivePackages,
  });

  // Check if promo field is enabled
  const { data: promoFieldVisible = true } = useQuery({
    queryKey: ['promo-field-visible'],
    queryFn: async () => {
      try {
        const result = await (supabase as any)
          .from('system_settings')
          .select('value')
          .eq('key', 'promo_code_field_visible')
          .single();
        
        return result.data?.value !== 'false';
      } catch {
        return true;
      }
    },
    staleTime: 60000,
  });

  // Auto-select first popular package or first package
  useEffect(() => {
    if (packages.length > 0 && !selectedPackageId) {
      const popularPackage = packages.find(pkg => pkg.is_popular);
      setSelectedPackageId(popularPackage?.id || packages[0].id);
    }
  }, [packages, selectedPackageId]);

  // Reset promo result when package changes
  useEffect(() => {
    if (promoResult?.valid && promoCode) {
      // Re-validate when package changes
      setPromoResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackageId]);

  // Validate promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim() || !user || !selectedPackageId) return;
    
    const packageData = packages.find(pkg => pkg.id === selectedPackageId);
    if (!packageData) return;

    setValidatingPromo(true);
    try {
      const result = await (supabase as any).rpc('validate_promo_code', {
        p_code: promoCode.trim(),
        p_user_id: user.id,
        p_purchase_amount: packageData.activations
      });
      
      const { data, error } = result || {};

      if (error) throw error;
      if (data) {
        setPromoResult(data);
        
        if (data.valid) {
          toast({
            title: '🎉 Code promo appliqué !',
            description: data.message,
          });
        }
      }
    } catch (error: any) {
      console.error('Promo validation error:', error);
      setPromoResult({ valid: false, error: 'Erreur de validation' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const clearPromoCode = () => {
    setPromoCode('');
    setPromoResult(null);
  };

  // Get active payment providers
  const { data: paymentProviders = [] } = useQuery({
    queryKey: ['payment-providers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      return data || [];
    },
    staleTime: 60000,
  });

  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Auto-select default provider
  useEffect(() => {
    if (paymentProviders.length > 0 && !selectedProvider) {
      const defaultProvider = paymentProviders.find(p => p.is_default);
      setSelectedProvider(defaultProvider?.provider_code || paymentProviders[0].provider_code);
    }
  }, [paymentProviders, selectedProvider]);

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
      
      // Calculate bonus activations from promo code
      const bonusActivations = promoResult?.valid ? promoResult.discount_amount || 0 : 0;
      const totalActivations = packageData.activations + bonusActivations;
      
      // Payment return URLs
      const returnUrl = window.location.hostname === 'localhost' 
        ? 'https://onesms-sn.com/dashboard?payment=success'
        : `${window.location.origin}/dashboard?payment=success`;

      const cancelUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5173/topup?payment=cancel'
        : `${window.location.origin}/topup?payment=cancel`;

      const metadata = {
        user_id: user.id,
        type: 'recharge',
        activations: totalActivations,
        base_activations: packageData.activations,
        bonus_activations: bonusActivations,
        package_id: packageData.id,
        promo_code_id: promoResult?.valid ? promoResult.promo_code_id : null,
        promo_code: promoResult?.valid ? promoCode.trim().toUpperCase() : null
      };

      // Route to appropriate payment provider
      if (selectedProvider === 'wave') {
        // Wave - Redirection simple vers page de paiement + upload de preuve
        // Récupérer la config du provider
        const { data: waveProvider } = await supabase
          .from('payment_providers')
          .select('config')
          .eq('provider_code', 'wave')
          .eq('is_active', true)
          .single();

        if (!waveProvider) {
          throw new Error('Wave non disponible. Contactez le support.');
        }

        const paymentLinkTemplate = waveProvider.config?.payment_link_template;
        if (!paymentLinkTemplate) {
          throw new Error('Configuration Wave invalide');
        }

        // Construire l'URL Wave avec le montant dynamique
        const waveUrl = paymentLinkTemplate.replace('{amount}', amount.toString());
        
        // Rediriger vers la page de paiement avec les infos nécessaires
        const params = new URLSearchParams({
          amount: amount.toString(),
          activations: totalActivations.toString(),
          base_activations: packageData.activations.toString(),
          bonus_activations: bonusActivations.toString(),
          wave_url: waveUrl
        });
        
        return { 
          redirect_url: `/wave-proof?${params.toString()}`,
          isLocalRedirect: true 
        };

      } else if (selectedProvider === 'paydunya') {
        // PayDunya payment
        const { data, error } = await cloudFunctions.invoke('paydunya-create-payment', {
          body: {
            amount: amount,
            userId: user.id,
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
            metadata: {
              ...metadata,
              description: `Rechargement ${totalActivations} activations ONE SMS${bonusActivations > 0 ? ` (dont ${bonusActivations} bonus)` : ''}`,
              return_url: returnUrl,
              cancel_url: cancelUrl
            }
          }
        });

        if (error) throw new Error(error.message || t('common.error'));
        
        const paymentUrl = data?.payment_url;
        if (!paymentUrl) throw new Error(t('topup.noPaymentUrl', 'Payment URL not received'));

        return { redirect_url: paymentUrl };

      } else {
        // MoneyFusion payment (default)
        const { data, error } = await cloudFunctions.invoke('init-moneyfusion-payment', {
          body: {
            amount: amount,
            currency: 'XOF',
            description: `Rechargement ${totalActivations} activations ONE SMS${bonusActivations > 0 ? ` (dont ${bonusActivations} bonus)` : ''}`,
            metadata: {
              ...metadata,
              provider: 'moneyfusion'
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
      }
    },
    onSuccess: (payment) => {
      // Si c'est une redirection locale (Wave proof), utiliser navigate
      if (payment.isLocalRedirect) {
        window.location.href = payment.redirect_url;
      } else {
        window.location.href = payment.redirect_url;
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-cyan-50/30 pt-4 lg:pt-0">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-100 to-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-3 shadow-sm">
            <Wallet className="w-4 h-4" />
            <span>Rechargement</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 bg-clip-text text-transparent mb-2">
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
                className={`relative p-4 cursor-pointer transition-all duration-300 active:scale-[0.98] flex flex-col items-center text-center ${
                  isSelected
                    ? 'border-2 border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-500/30'
                    : 'border border-gray-200 bg-white hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10'
                }`}
                onClick={() => setSelectedPackageId(pkg.id)}
              >
                {/* Popular Badge */}
                {pkg.is_popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white text-[10px] px-2 py-0.5 shadow-lg shadow-orange-500/30">
                      <Star className="w-2.5 h-2.5 mr-0.5" />
                      Populaire
                    </Badge>
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                  </div>
                )}

                {/* Activations Count */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-3 mt-2 transition-all duration-300 ${
                  isSelected 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/40' 
                    : 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700'
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
                <div className={`w-full py-2 px-3 rounded-xl transition-all duration-300 ${
                  isSelected 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
                    : 'bg-gray-100'
                }`}>
                  <p className={`text-lg font-bold ${isSelected ? '' : 'text-gray-900'}`}>
                    {pkg.price_xof.toLocaleString()}
                  </p>
                  <p className={`text-[10px] ${isSelected ? 'opacity-80' : 'text-gray-500'}`}>
                    FCFA
                  </p>
                </div>

                {/* Savings Badge */}
                {pkg.savings_percentage > 0 && (
                  <Badge variant="secondary" className="text-[10px] mt-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    -{pkg.savings_percentage}%
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>

        {/* Promo Code Section - Only show if enabled */}
        {promoFieldVisible && (
          <Card className="p-4 mb-4 border-dashed border-2 border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-900">Code promo</span>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    if (promoResult) setPromoResult(null);
                  }}
                  placeholder="Entrez votre code"
                  className={`font-mono uppercase ${
                    promoResult?.valid 
                      ? 'border-green-500 bg-green-50' 
                      : promoResult?.error 
                        ? 'border-red-500 bg-red-50' 
                        : ''
                  }`}
                  disabled={validatingPromo}
                />
                {promoCode && (
                  <button
                    onClick={clearPromoCode}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={validatePromoCode}
                disabled={!promoCode.trim() || validatingPromo || !selectedPackageId}
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                {validatingPromo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Appliquer'
                )}
              </Button>
            </div>

            {/* Promo Result */}
            {promoResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                promoResult.valid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {promoResult.valid ? (
                  <>
                    <Gift className="w-5 h-5 text-green-600" />
                    <div>
                      <span className="font-semibold">{promoResult.message}</span>
                      <span className="ml-2 text-sm">
                        (+{promoResult.discount_amount} activations bonus)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    <span>{promoResult.error}</span>
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Payment Button */}
        {selectedPackageData && (
          <div className="sticky bottom-4 z-10">
            <Card className="p-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/30 border-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm opacity-90">Total à payer</p>
                  <p className="text-2xl font-bold">
                    {selectedPackageData.price_xof.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-90">
                    {promoResult?.valid 
                      ? `${selectedPackageData.activations} + ${promoResult.discount_amount} bonus`
                      : selectedPackageData.activations
                    }
                  </p>
                  <p className="text-lg font-semibold">
                    {promoResult?.valid 
                      ? `${selectedPackageData.activations + (promoResult.discount_amount || 0)} Activations`
                      : 'Activations'
                    }
                  </p>
                </div>
              </div>
              
              {/* Bonus highlight */}
              {promoResult?.valid && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-white/20 rounded-lg">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    🎁 {promoResult.message} appliqué !
                  </span>
                </div>
              )}

              {/* Payment Provider Selection */}
              {paymentProviders.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs opacity-80 mb-2">Moyen de paiement</p>
                  <div className="flex gap-2">
                    {paymentProviders.map((provider) => (
                      <button
                        key={provider.provider_code}
                        onClick={() => setSelectedProvider(provider.provider_code)}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                          selectedProvider === provider.provider_code
                            ? 'bg-white text-blue-700 shadow-md'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        {provider.provider_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full h-12 bg-white text-blue-700 hover:bg-white/95 font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
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
          <Card className="p-4 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Crédit instantané</p>
                <p className="text-xs text-gray-600">
                  Vos activations sont ajoutées immédiatement après le paiement.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Paiement sécurisé</p>
                <p className="text-xs text-gray-600">
                  Orange Money, Wave, MTN Mobile Money, Moov Money
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">1 Activation = 1 Numéro</p>
                <p className="text-xs text-gray-600">
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
