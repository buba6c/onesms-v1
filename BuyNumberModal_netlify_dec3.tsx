/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { formatCurrency, extractCodeFromSMS, calculateTimeRemaining } from '@/lib/utils';
import { getCountryFlag, getFlagEmoji } from '@/lib/logo-service';
import { 
  Check, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Phone, 
  MessageSquare,
  Globe,
  ChevronRight,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BuyNumberModalProps {
  open: boolean;
  onClose: () => void;
  countryCode?: string;
  serviceName?: string;
  price?: number;
}

type PurchaseStep = 'select' | 'confirm' | 'processing' | 'waiting';

interface PurchaseData {
  country: string;
  operator: string;
  service: string;
  price: number;
  mode: 'activation' | 'rental';
  rentalDays?: number;
}

interface ActivationData {
  id: number;
  phone: string;
  status: string;
  sms?: Array<{
    text: string;
    code?: string;
    date: string;
  }>;
  expires_at?: string;
}

export default function BuyNumberModal({ 
  open, 
  onClose, 
  countryCode = 'france',
  serviceName = 'whatsapp',
  price = 100
}: BuyNumberModalProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<PurchaseStep>('select');
  const [loading, setLoading] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseData>({
    country: countryCode,
    operator: 'any',
    service: serviceName,
    price: price,
    mode: 'activation',
  });
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setActivationData(null);
      setCountdown(600);
      setCopiedPhone(false);
      setCopiedCode(false);
      setFrozenBalance(0);
      setLastPollTime(null);
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (step === 'waiting' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  // DEPRECATED: Polling removed - use DashboardPage

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Check user credits
      const { data: userData } = await supabase
        .from('users')
        .select('credits, balance')
        .eq('id', user.id)
        .single() as { data: { credits?: number; balance?: number } | null };

      const userBalance = userData?.balance || userData?.credits || 0;
      if (!userData || userBalance < purchaseData.price) {
        throw new Error('Crédits insuffisants');
      }

      // DEPRECATED: Ce composant utilise l'ancienne API 5sim
      // Utilisez DashboardPage pour les achats SMS-Activate
      throw new Error('Ce composant est obsolète. Utilisez le Dashboard pour acheter des numéros.');

      toast({
        title: '✅ Numéro Acheté !',
        description: `Numéro acheté avec succès`,
      });
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'achat',
        variant: 'destructive',
      });
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'phone' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    toast({
      title: 'Copié !',
      description: `${type === 'phone' ? 'Numéro' : 'Code'} copié dans le presse-papiers`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {['select', 'confirm', 'processing', 'waiting'].map((s, index) => (
        <div key={s} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
            ${step === s ? 'bg-blue-600 border-blue-600 text-white' : 
            ['select', 'confirm', 'processing', 'waiting'].indexOf(step) > index ? 
            'bg-green-600 border-green-600 text-white' : 
            'bg-gray-200 border-gray-300 text-gray-500'}`}>
            {['select', 'confirm', 'processing', 'waiting'].indexOf(step) > index ? 
              <Check className="h-4 w-4" /> : 
              index + 1
            }
          </div>
          {index < 3 && (
            <div className={`w-12 h-1 mx-2 
              ${['select', 'confirm', 'processing', 'waiting'].indexOf(step) > index ? 
              'bg-green-600' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-2xl">Acheter un Numéro Virtuel</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 'select' && 'Sélectionnez les options de votre numéro'}
            {step === 'confirm' && 'Confirmez votre achat'}
            {step === 'processing' && 'Traitement en cours...'}
            {step === 'waiting' && 'En attente du SMS'}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {/* Step 1: Select Options */}
        {step === 'select' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Mode d'achat</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPurchaseData({ ...purchaseData, mode: 'activation' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        purchaseData.mode === 'activation' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold">Activation</span>
                      </div>
                      <p className="text-sm text-gray-600">Usage unique, 10 minutes</p>
                      <p className="text-lg font-bold mt-2">{formatCurrency(price, 'XOF')}</p>
                    </button>

                    <button
                      onClick={() => setPurchaseData({ ...purchaseData, mode: 'rental' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        purchaseData.mode === 'rental' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold">Location</span>
                      </div>
                      <p className="text-sm text-gray-600">Réception multiple</p>
                      <p className="text-lg font-bold mt-2">{formatCurrency(price * 5, 'XOF')}/7j</p>
                    </button>
                  </div>
                </div>

                {purchaseData.mode === 'rental' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Durée de location</label>
                    <select
                      value={purchaseData.rentalDays || 7}
                      onChange={(e) => setPurchaseData({ 
                        ...purchaseData, 
                        rentalDays: Number(e.target.value),
                        price: price * 5 * (Number(e.target.value) / 7)
                      })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value={7}>7 jours</option>
                      <option value={14}>14 jours</option>
                      <option value={30}>30 jours</option>
                    </select>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Pays:</span>
                    </span>
                    <span className="text-gray-700 capitalize">{purchaseData.country}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Service:</span>
                    </span>
                    <span className="text-gray-700 capitalize">{purchaseData.service}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-bold text-lg">Prix Total:</span>
                    <span className="font-bold text-2xl text-blue-600">
                      {formatCurrency(purchaseData.price, 'XOF')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Annuler
              </Button>
              <Button onClick={() => setStep('confirm')} className="flex-1">
                Continuer
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <Phone className="h-16 w-16 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-xl font-bold mb-2">Confirmez votre achat</h3>
                  <p className="text-gray-600">
                    {purchaseData.mode === 'activation' 
                      ? 'Numéro valide pendant 10 minutes pour 1 SMS'
                      : `Numéro valide pendant ${purchaseData.rentalDays} jours`
                    }
                  </p>
                </div>

                <div className="space-y-3 bg-white rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold capitalize">{purchaseData.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pays:</span>
                    <span className="font-semibold capitalize">{purchaseData.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-semibold capitalize">{purchaseData.service}</span>
                  </div>
                  {purchaseData.mode === 'rental' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-semibold">{purchaseData.rentalDays} jours</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t text-lg">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(purchaseData.price, 'XOF')}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-4 text-center">
                  Vos crédits: <span className="font-semibold">{formatCurrency(user?.credits || 0, 'XOF')}</span>
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Retour
              </Button>
              <Button onClick={handlePurchase} className="flex-1">
                Confirmer l'achat
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="text-center py-16">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Traitement en cours</h3>
            <p className="text-sm text-gray-500">Veuillez patienter...</p>
          </div>
        )}

        {/* Step 4: Waiting for SMS - Clean Modern Design */}
        {step === 'waiting' && activationData && (
          <div className="space-y-5">
            {/* Status Badge */}
            <div className="flex justify-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                activationData.status === 'RECEIVED' 
                  ? 'bg-green-100 text-green-700' 
                  : activationData.status === 'TIMEOUT' || activationData.status === 'CANCELED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {activationData.status === 'RECEIVED' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    SMS Reçu
                  </>
                ) : activationData.status === 'TIMEOUT' ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Expiré
                  </>
                ) : activationData.status === 'CANCELED' ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Annulé
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    En attente
                  </>
                )}
              </div>
            </div>

            {/* Phone Number - Clean Card */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Numéro</span>
                <span className="text-xs text-gray-400">
                  {getFlagEmoji(purchaseData.country)} {purchaseData.service}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-gray-900 tracking-wide">
                    {activationData.phone}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(activationData.phone, 'phone')}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    copiedPhone 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {copiedPhone ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Timer - Minimal */}
            {activationData.status !== 'RECEIVED' && activationData.status !== 'TIMEOUT' && activationData.status !== 'CANCELED' && (
              <div className="flex items-center justify-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-gray-900">{formatTime(countdown)}</span>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        countdown < 120 ? 'bg-red-500' : countdown < 300 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(countdown / 600) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SMS Content */}
            <div className="min-h-[180px] flex flex-col">
              {activationData.sms && activationData.sms.length > 0 ? (
                <div className="space-y-4">
                  {activationData.sms.map((sms, index) => {
                    const code = extractCodeFromSMS(sms.text);
                    return (
                      <div key={index} className="space-y-3">
                        {/* Code Display - Big & Clear */}
                        {code && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">
                              Votre code
                            </p>
                            <div className="flex items-center justify-center gap-3">
                              <span className="text-4xl sm:text-5xl font-mono font-bold text-blue-600 tracking-[0.2em]">
                                {code}
                              </span>
                              <button
                                onClick={() => copyToClipboard(code, 'code')}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                  copiedCode 
                                    ? 'bg-blue-500 text-white scale-95' 
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'
                                }`}
                              >
                                {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Message Text */}
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm text-gray-600 leading-relaxed">{sms.text}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(sms.date).toLocaleTimeString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4">
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                      <div className="absolute inset-0 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900 mb-1">En attente du SMS</p>
                  <p className="text-sm text-gray-500 text-center max-w-[200px]">
                    Utilisez ce numéro sur {purchaseData.service} pour recevoir le code
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-12 rounded-xl text-sm font-medium"
              >
                Fermer
              </Button>
              {activationData.status === 'RECEIVED' ? (
                <Button 
                  onClick={() => {
                    onClose();
                    window.location.href = '/my-numbers';
                  }}
                  className="flex-1 h-12 rounded-xl text-sm font-medium bg-green-500 hover:bg-green-600"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Terminer
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(activationData.phone);
                    toast({ title: 'Numéro copié !', description: activationData.phone });
                  }}
                  className="flex-1 h-12 rounded-xl text-sm font-medium"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le numéro
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
