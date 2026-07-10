import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';
import { cloudFunctions } from '@/lib/supabase';
import { Loader2, Clock, AlertCircle } from 'lucide-react';

interface ExtendRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  rentalId: string | null;
  phone: string | null;
  serviceCode: string | null;
  onSuccess: () => void;
}

const EXTENSION_OPTIONS = [
  { value: '4', label: '4 Heures' },
  { value: '12', label: '12 Heures' },
  { value: '24', label: '24 Heures (1 Jour)' },
  { value: '48', label: '48 Heures (2 Jours)' },
  { value: '168', label: '168 Heures (1 Semaine)' },
  { value: '720', label: '720 Heures (1 Mois)' },
];

export function ExtendRentalModal({
  isOpen,
  onClose,
  rentalId,
  phone,
  serviceCode,
  onSuccess
}: ExtendRentalModalProps) {
  const { user } = useAuthStore();
  const [hours, setHours] = useState('4');
  const [price, setPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canAfford, setCanAfford] = useState(true);

  // Fetch price when modal opens or hours change
  useEffect(() => {
    if (!isOpen || !rentalId || !user?.id) return;

    let isMounted = true;
    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      setError(null);
      setPrice(null);
      
      try {
        const { data, error: fnError } = await cloudFunctions.invoke('get-rent-extension-price', {
          body: { rentalId, userId: user.id, hours: parseInt(hours, 10) }
        });

        if (fnError) throw fnError;
        if (!isMounted) return;

        if (data?.success) {
          setPrice(data.data.price);
          setCanAfford(data.data.canAfford);
        } else if (data?.blocked) {
           setError(data.error);
        } else {
          throw new Error(data?.error || 'Erreur lors de la récupération du prix');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Impossible de calculer le prix');
      } finally {
        if (isMounted) setIsLoadingPrice(false);
      }
    };

    fetchPrice();

    return () => {
      isMounted = false;
    };
  }, [isOpen, rentalId, user?.id, hours]);

  const handleExtend = async () => {
    if (!rentalId || !user?.id || !price) return;

    setIsExtending(true);
    setError(null);

    try {
      const { data, error: fnError } = await cloudFunctions.invoke('continue-sms-activate-rent', {
        body: { rentalId, userId: user.id, hours: parseInt(hours, 10) }
      });

      if (fnError) throw fnError;
      
      if (data?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(data?.error || 'Erreur lors de la prolongation');
      }
    } catch (err: any) {
      setError(err.message || 'La prolongation a échoué');
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Prolonger la location
          </DialogTitle>
          <DialogDescription>
            Prolongez la durée de validité de votre numéro de téléphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="bg-gray-50 rounded-lg p-3 border text-sm text-gray-700 font-medium">
            <p className="flex justify-between">
              <span className="text-gray-500">Numéro:</span>
              <span className="font-mono text-gray-900">{phone}</span>
            </p>
            <p className="flex justify-between mt-1">
              <span className="text-gray-500">Service:</span>
              <span className="uppercase">{serviceCode}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Durée d'extension</label>
            <Select
              value={hours}
              onValueChange={setHours}
              disabled={isExtending || isLoadingPrice}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une durée" />
              </SelectTrigger>
              <SelectContent>
                {EXTENSION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Info */}
          <div className="pt-2">
            {isLoadingPrice ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calcul du prix...
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            ) : price !== null ? (
              <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <span className="text-sm font-medium text-gray-700">Prix de l'extension:</span>
                <span className="text-lg font-bold text-blue-700">{price} Ⓐ</span>
              </div>
            ) : null}
            
            {price !== null && !canAfford && !error && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Solde insuffisant pour cette extension
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExtending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleExtend}
            disabled={isExtending || isLoadingPrice || !!error || !canAfford || price === null}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExtending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Prolongation...
              </>
            ) : (
              'Confirmer la prolongation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
