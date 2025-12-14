import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle, AlertCircle, Loader2, Camera, ArrowLeft, ExternalLink, CreditCard } from 'lucide-react';

export default function WavePaymentProof() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('0');
  const [activations, setActivations] = useState<string>('0');
  const [baseActivations, setBaseActivations] = useState<string>('0');
  const [bonusActivations, setBonusActivations] = useState<string>('0');
  const [waveUrl, setWaveUrl] = useState<string>('');
  const [hasPaid, setHasPaid] = useState(false);

  useEffect(() => {
    const amt = searchParams.get('amount');
    const act = searchParams.get('activations');
    const baseAct = searchParams.get('base_activations');
    const bonusAct = searchParams.get('bonus_activations');
    const wUrl = searchParams.get('wave_url');
    
    if (amt) setAmount(amt);
    if (act) setActivations(act);
    if (baseAct) setBaseActivations(baseAct);
    if (bonusAct) setBonusActivations(bonusAct);
    if (wUrl) setWaveUrl(decodeURIComponent(wUrl));

    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [searchParams, user, navigate, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erreur',
        description: 'L\'image ne doit pas dépasser 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    
    // Créer preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // 1. Upload de l'image vers Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `wave-proof-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // 3. Enregistrer la preuve dans la table wave_payment_proofs
      const { error: insertError } = await supabase
        .from('wave_payment_proofs')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          activations: parseInt(activations),
          proof_url: publicUrl,
          status: 'pending',
          metadata: {
            base_activations: parseInt(baseActivations),
            bonus_activations: parseInt(bonusActivations),
            uploaded_at: new Date().toISOString(),
            wave_url: waveUrl
          }
        });

      if (insertError) throw insertError;

      setSubmitted(true);
      
      toast({
        title: 'Preuve envoyée !',
        description: 'Votre paiement sera vérifié sous peu',
      });

      // Rediriger vers le dashboard après 3 secondes
      setTimeout(() => {
        navigate('/dashboard?payment=pending');
      }, 3000);

    } catch (error: any) {
      console.error('Error uploading proof:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'envoi',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Preuve envoyée !</h2>
          <p className="text-muted-foreground mb-6">
            Votre preuve de paiement a été envoyée avec succès. 
            Notre équipe va vérifier votre paiement et créditer votre compte dans les plus brefs délais.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Retour au dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-3xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">Paiement Wave</h1>
          <p className="text-muted-foreground mt-2">
            Suivez les étapes pour compléter votre paiement
          </p>
        </div>

        {/* Étape 1 : Payer via Wave */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Effectuer le paiement</h2>
              <p className="text-muted-foreground mb-4">
                Montant à payer : <span className="font-bold text-2xl text-blue-600">{parseInt(amount).toLocaleString()} FCFA</span>
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              window.open(waveUrl, '_blank');
              setHasPaid(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Payer avec Wave
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-3">
            Cliquez pour ouvrir l'application Wave et effectuer le paiement
          </p>
        </Card>

        {/* Étape 2 : Soumettre la preuve */}
        <Card className="p-6 border-2 border-green-500 shadow-lg">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 ${hasPaid ? 'bg-green-600 animate-pulse' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0`}>
              2
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">📸 Envoyez votre preuve</h2>
              <p className="text-sm text-muted-foreground">
                Capture d'écran de votre reçu Wave • Montant : <strong>{parseInt(amount).toLocaleString()} FCFA</strong>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!previewUrl ? (
              <div className="border-2 border-dashed border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-950/20 rounded-xl p-6 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  id="proof-upload"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">
                    Choisir la capture d'écran
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    JPG/PNG • Max 5MB
                  </p>
                  <Button type="button" size="lg" className="bg-green-600 hover:bg-green-700">
                    <Upload className="w-5 h-5 mr-2" />
                    Sélectionner l'image
                  </Button>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    Changer
                  </Button>
                </div>

                {/* File Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedFile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile!.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-6 font-bold shadow-lg"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirmer et envoyer
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Help Card avec contacts */}
        <Card className="p-6 mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Besoin d'aide ?</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Si vous avez déjà payé mais n'avez pas de capture, contactez-nous avec votre numéro de transaction Wave.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WhatsApp */}
            <a
              href="https://wa.me/16837770410"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">WhatsApp</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Réponse rapide</p>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/onesms_sn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Instagram</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">@onesms_sn</p>
              </div>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
