import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Loader2, 
  Sparkles, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Star,
  Globe
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import paytech from '@/lib/api/paytech';
import { packagesApi, ActivationPackage } from '@/lib/api/packages';

const PAYMENT_PROVIDERS = [
  {
    id: 'paytech',
    name: 'PayTech',
    description: 'Orange Money, Wave, Free Money',
    icon: '💳',
    gradient: 'from-orange-500 to-red-500',
    supported: ['XOF', 'EUR', 'USD'],
    popular: true,
    features: ['Instantané', 'Mobile Money', 'Sécurisé']
  },
];

export default function TopUpPage() {
  const { t } = useTranslation();
  const [selectedCurrency, setSelectedCurrency] = useState<'XOF' | 'EUR' | 'USD'>('XOF');
  const [selectedProvider, setSelectedProvider] = useState<string>('paytech');
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

  const generateRef = (prefix: string) => {
    return `${prefix}_${user?.id || 'GUEST'}_${Date.now()}`;
  };

  const rechargeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackageId) {
        throw new Error('Veuillez sélectionner un montant');
      }
      if (!selectedProvider) {
        throw new Error('Veuillez sélectionner un moyen de paiement');
      }
      if (!user) {
        throw new Error('Vous devez être connecté pour recharger');
      }

      const packageData = packages.find(pkg => pkg.id === selectedPackageId);
      if (!packageData) {
        throw new Error('Package non trouvé');
      }

      const amount = selectedCurrency === 'XOF' 
        ? packageData.price_xof 
        : selectedCurrency === 'EUR'
        ? packageData.price_eur
        : packageData.price_usd;
      const ref = generateRef('RECHARGE');

      const payment = await paytech.requestPayment(
        {
          item_name: `Rechargement ${packageData.activations} activations ONE SMS`,
          item_price: selectedCurrency === 'XOF' ? amount : Math.round(amount * 100),
          currency: selectedCurrency,
          ref_command: ref,
          command_name: `Rechargement ${packageData.activations} activations`,
          custom_field: {
            user_id: user.id,
            type: 'recharge',
            provider: selectedProvider,
            activations: packageData.activations
          }
        },
        import.meta.env.VITE_PAYTECH_IPN_URL,
        import.meta.env.VITE_PAYTECH_SUCCESS_URL,
        import.meta.env.VITE_PAYTECH_CANCEL_URL
      );

      if (!payment.redirect_url) {
        throw new Error('Aucune URL de redirection reçue de PayTech');
      }
      if (payment.success !== 1) {
        throw new Error(payment.message || 'Erreur lors de la création du paiement');
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'recharge',
        amount: Math.round(amount * 100),
        currency: selectedCurrency,
        status: 'pending',
        payment_method: 'paytech',
        payment_ref: ref,
        description: `Rechargement de ${packageData.activations} activations via ${PAYMENT_PROVIDERS.find(p => p.id === selectedProvider)?.name}`,
      });

      if (error) throw error;

      return payment;
    },
    onSuccess: (payment) => {
      window.location.href = payment.redirect_url;
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du paiement',
        variant: 'destructive',
      });
    }
  });

  const selectedPackageData = packages.find(pkg => pkg.id === selectedPackageId);
  const selectedProviderData = PAYMENT_PROVIDERS.find(p => p.id === selectedProvider);

  if (loadingPackages) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6 md:py-12 max-w-7xl">
        <div className="mb-8 md:mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-lg">
            <Sparkles className="w-4 h-4" />
            <span>Rechargez instantanément</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
            Rechargement Rapide
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Achetez des activations pour recevoir des SMS de vérification sur 1000+ services
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Moyen de paiement</h2>
              </div>
              
              <div className="space-y-3">
                {PAYMENT_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all group hover:scale-[1.02] ${
                      selectedProvider === provider.id
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${provider.gradient} rounded-xl flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                        {provider.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{provider.name}</p>
                          {provider.popular && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
                              Populaire
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{provider.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {provider.features.map((feature) => (
                            <span key={feature} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">DEVISE</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCurrency('XOF')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                      selectedCurrency === 'XOF'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    XOF
                  </button>
                  <button
                    onClick={() => setSelectedCurrency('EUR')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                      selectedCurrency === 'EUR'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    EUR
                  </button>
                  <button
                    onClick={() => setSelectedCurrency('USD')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                      selectedCurrency === 'USD'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Packages d'Activations</h2>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Sparkles className="w-3 h-3 mr-1" />
                Meilleur prix
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {packages.map((pkg) => {
                const price = selectedCurrency === 'XOF' 
                  ? pkg.price_xof 
                  : selectedCurrency === 'EUR'
                  ? pkg.price_eur
                  : pkg.price_usd;
                
                const currencySymbol = selectedCurrency === 'XOF' 
                  ? 'FCFA' 
                  : selectedCurrency === 'EUR'
                  ? '€'
                  : '$';
                
                const pricePerActivation = (price / pkg.activations).toFixed(2);
                
                return (
                  <Card
                    key={pkg.id}
                    className={`relative p-5 md:p-6 cursor-pointer transition-all hover:scale-105 ${
                      selectedPackageId === pkg.id
                        ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-2xl'
                        : 'border border-gray-200 hover:border-blue-300 hover:shadow-xl'
                    }`}
                    onClick={() => setSelectedPackageId(pkg.id)}
                  >
                    {pkg.is_popular && (
                      <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Populaire
                      </Badge>
                    )}
                    {pkg.savings_percentage > 0 && (
                      <Badge className="absolute -top-2 left-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        -{pkg.savings_percentage}%
                      </Badge>
                    )}
                    
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                        <span className="text-2xl font-bold text-white">{pkg.activations}</span>
                      </div>
                      
                      <p className="text-3xl font-bold mb-2 text-gray-900">
                        {pkg.activations} Ⓐ
                      </p>
                      
                      <p className="text-gray-600 mb-4 text-sm">Activations</p>
                      
                      <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                        {selectedCurrency === 'XOF' ? '' : currencySymbol}
                        {selectedCurrency === 'XOF' ? price.toLocaleString() : price.toFixed(2)}
                        {selectedCurrency === 'XOF' ? ' FCFA' : ''}
                      </div>
                      
                      <p className="text-sm text-gray-500">
                        ≈ {selectedCurrency === 'XOF' ? '' : currencySymbol}
                        {pricePerActivation}
                        {selectedCurrency === 'XOF' ? ' FCFA' : ''} / activation
                      </p>
                      
                      {selectedPackageId === pkg.id && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold text-sm">Sélectionné</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {selectedProvider && selectedPackageData && (
              <Card className="mt-8 p-6 md:p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-white mb-6">
                  <div>
                    <p className="text-sm md:text-base font-medium mb-2 text-blue-100">Package Sélectionné</p>
                    <p className="text-3xl md:text-4xl font-bold">
                      {selectedPackageData.activations} Ⓐ
                    </p>
                    <p className="text-blue-100 mt-2 flex items-center gap-2">
                      <span className="text-2xl">{selectedProviderData?.icon}</span>
                      <span>via {selectedProviderData?.name}</span>
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm md:text-base text-blue-100 mb-2">Total à payer</p>
                    <p className="text-4xl md:text-5xl font-bold">
                      {selectedCurrency === 'XOF' ? '' : (selectedCurrency === 'EUR' ? '€' : '$')}
                      {selectedCurrency === 'XOF' 
                        ? selectedPackageData.price_xof.toLocaleString()
                        : selectedCurrency === 'EUR'
                        ? selectedPackageData.price_eur.toFixed(2)
                        : selectedPackageData.price_usd.toFixed(2)
                      }
                      {selectedCurrency === 'XOF' ? ' FCFA' : ''}
                    </p>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-white text-blue-600 hover:bg-gray-100 h-14 md:h-16 text-lg font-bold shadow-xl hover:shadow-2xl transition-all"
                  onClick={() => rechargeMutation.mutate()}
                  disabled={!selectedPackageData || !selectedProvider || rechargeMutation.isPending}
                >
                  {rechargeMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Payer maintenant
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card className="p-5 border-blue-200 bg-blue-50">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">Paiement Sécurisé</p>
                    <p className="text-sm text-blue-800">
                      Toutes les transactions sont protégées par le chiffrement SSL et vérifiées par PayTech.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-green-200 bg-green-50">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900 mb-1">Instantané</p>
                    <p className="text-sm text-green-800">
                      Vos activations sont ajoutées immédiatement après validation du paiement.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="mt-4 p-5 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-indigo-900 mb-1">À propos des Activations</p>
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    <strong>1 Activation = 1 numéro virtuel</strong> pour recevoir un code SMS de vérification. 
                    Utilisable sur 1000+ services : WhatsApp, Telegram, Instagram, Facebook, Google, TikTok, etc.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
