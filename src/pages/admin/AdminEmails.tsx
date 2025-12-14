import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Mail, 
  Users, 
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Gift,
  TrendingUp,
  History
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  title: string;
  message: string;
  promo_code: string | null;
  discount: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  created_at: string;
  sent_at: string | null;
}

// Templates prédéfinis
const EMAIL_TEMPLATES = {
  operational: {
    name: 'Service operationnel',
    title: 'One SMS est maintenant pleinement operationnel',
    message: 'Nous sommes ravis de vous annoncer que la plateforme One SMS fonctionne maintenant a 100% de ses capacites. Vous pouvez des maintenant louer des numeros temporaires et recevoir vos SMS de verification en temps reel.',
    icon: '',
  },
  maintenance: {
    name: 'Maintenance programmee',
    title: 'Maintenance technique prevue',
    message: 'Une maintenance technique est prevue le [DATE] de [HEURE] a [HEURE]. Durant cette periode, certains services pourraient etre temporairement indisponibles. Nous nous excusons pour la gene occasionnee.',
    icon: '',
  },
  incident: {
    name: 'Incident resolu',
    title: 'Le service est retabli',
    message: 'Suite a un incident technique, tous nos services sont maintenant retablis et fonctionnent normalement. Merci pour votre patience et votre comprehension.',
    icon: '',
  },
  new_feature: {
    name: 'Nouvelle fonctionnalite',
    title: 'Nouvelle fonctionnalite disponible',
    message: 'Decouvrez notre nouvelle fonctionnalite : [DESCRIPTION]. Cette amelioration vous permet de [AVANTAGE]. Connectez-vous pour l\'essayer des maintenant.',
    icon: '',
  },
  welcome_back: {
    name: 'Retour utilisateur inactif',
    title: 'Nous vous avons manque',
    message: 'Cela fait un moment que nous ne vous avons pas vu. Revenez decouvrir nos nouveaux services et profitez de votre solde pour activer vos comptes en toute securite.',
    icon: '',
  },
  security: {
    name: 'Alerte securite',
    title: 'Information de securite importante',
    message: 'Par mesure de securite, nous vous recommandons de [ACTION]. Cette demarche garantit la protection de votre compte et de vos donnees personnelles.',
    icon: '',
  },
  promo: {
    name: 'Promotion Offre',
    title: '',
    message: '',
    icon: '',
  },
  custom: {
    name: 'Message personnalise',
    title: '',
    message: '',
    icon: '',
  },
};

export default function AdminEmails() {
  const [activeTab, setActiveTab] = useState('compose');
  
  // Form state
  const [emailType, setEmailType] = useState<keyof typeof EMAIL_TEMPLATES>('operational');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState('');
  
  // Filters
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [inactiveDays, setInactiveDays] = useState('');
  const [limit, setLimit] = useState('');
  const [offset, setOffset] = useState('');
  
  // Sending state
  const [sending, setSending] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch campaigns history
  const { data: campaigns, isLoading: loadingCampaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as EmailCampaign[];
    },
  });

  // Fetch user count for preview
  const fetchPreviewCount = async () => {
    setLoadingPreview(true);
    try {
      let query = supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null);

      if (minBalance) query = query.gte('balance', parseFloat(minBalance));
      if (maxBalance) query = query.lte('balance', parseFloat(maxBalance));
      if (limit) query = query.limit(parseInt(limit));

      const { count, error } = await query;
      
      if (error) throw error;
      setPreviewCount(count || 0);
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de calculer le nombre de destinataires',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Send promo emails
  const handleSendPromo = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Le titre et le message sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-promo-emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title,
            message,
            emailType,
            promoCode: promoCode || undefined,
            discount: discount || undefined,
            filter: {
              ...(minBalance && { minBalance: parseFloat(minBalance) }),
              ...(maxBalance && { maxBalance: parseFloat(maxBalance) }),
              ...(inactiveDays && { inactiveDays: parseInt(inactiveDays) }),
              ...(limit && { limit: parseInt(limit) }),
              ...(offset && { offset: parseInt(offset) }),
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast({
        title: '✅ Emails envoyés !',
        description: `${result.sent} emails envoyés sur ${result.total} destinataires`,
      });

      // Reset form
      setTitle('');
      setMessage('');
      setPromoCode('');
      setDiscount('');
      setPreviewCount(null);
      
      // Refresh campaigns
      refetchCampaigns();
      setActiveTab('history');

    } catch (error: any) {
      console.error('Send error:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-purple-500" />
            Emails Marketing
          </h1>
          <p className="text-muted-foreground">
            Envoyez des emails promotionnels à vos utilisateurs
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Composer
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Email Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Contenu de l'email
                </CardTitle>
                <CardDescription>
                  Composez votre message aux utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sélecteur de type d'email */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Type d'email *</label>
                  <select
                    value={emailType}
                    onChange={(e) => {
                      const type = e.target.value as keyof typeof EMAIL_TEMPLATES;
                      setEmailType(type);
                      const template = EMAIL_TEMPLATES[type];
                      // Ne pas pré-remplir pour "custom" et "promo"
                      if (type !== 'custom' && type !== 'promo') {
                        setTitle(template.title);
                        setMessage(template.message);
                      } else {
                        setTitle('');
                        setMessage('');
                      }
                      if (type !== 'promo') {
                        setPromoCode('');
                        setDiscount('');
                      }
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                      <option key={key} value={key}>
                        {template.icon} {template.name}
                      </option>
                    ))}
                  </select>
                  {emailType === 'custom' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Mode libre : ecrivez votre propre message personnalise
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Titre *
                    {emailType !== 'custom' && emailType !== 'promo' && (
                      <button
                        type="button"
                        onClick={() => {
                          const template = EMAIL_TEMPLATES[emailType];
                          setTitle(template.title);
                        }}
                        className="ml-2 text-xs text-blue-600 hover:underline"
                      >
                        Restaurer le template
                      </button>
                    )}
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={emailType === 'custom' ? "Ex: Annonce importante" : "Ex: One SMS est opérationnel"}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {title.length}/60 caractères (optimal pour éviter le spam)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Message *
                    {emailType !== 'custom' && emailType !== 'promo' && (
                      <button
                        type="button"
                        onClick={() => {
                          const template = EMAIL_TEMPLATES[emailType];
                          setMessage(template.message);
                        }}
                        className="ml-2 text-xs text-blue-600 hover:underline"
                      >
                        Restaurer le template
                      </button>
                    )}
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={emailType === 'custom' ? "Rédigez votre message personnalisé..." : "Écrivez votre message ici..."}
                    rows={emailType === 'custom' ? 8 : 6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Conseil : Soyez clair et concis. Evitez les majuscules excessives et les mots spam (GRATUIT, URGENT, etc.)
                  </p>
                </div>

                {/* Champs promo uniquement si type = promo */}
                {emailType === 'promo' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Code promo (optionnel)</label>
                      <Input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="BLACK50"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Réduction (optionnel)</label>
                      <Input
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="-50%"
                      />
                    </div>
                  </div>
                )}

                {/* Preview */}
                {(title || message) && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-muted-foreground mb-2">Apercu de l'email :</div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-semibold text-blue-900">{title || 'Titre...'}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1 leading-relaxed">{message || 'Message...'}</div>
                    {(promoCode || discount) && (
                      <div className="mt-3 flex gap-2">
                        {discount && <Badge className="bg-green-600">{discount}</Badge>}
                        {promoCode && <Badge variant="outline" className="border-green-600 text-green-700">{promoCode}</Badge>}
                      </div>
                    )}
                  </div>
                )}

                {/* Conseils anti-spam */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-xs font-medium text-yellow-800 mb-1">Score anti-spam</div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <div>[OK] Structure HTML simple</div>
                    <div>[OK] Lien de desinscription</div>
                    <div className={message.match(/GRATUIT|URGENT|PROMO|!!!|€€€/gi) ? 'text-red-600' : 'text-green-600'}>
                      {message.match(/GRATUIT|URGENT|PROMO|!!!|€€€/gi) ? '[ALERTE] Mots spam detectes' : '[OK] Pas de mots spam'}
                    </div>
                    <div className={title.length > 60 ? 'text-orange-600' : 'text-green-600'}>
                      {title.length > 60 ? '[ATTENTION] Titre trop long (max 60 car.)' : '[OK] Titre optimal'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Filters & Send */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    Ciblage (optionnel)
                  </CardTitle>
                  <CardDescription>
                    Filtrez les destinataires
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Solde min (Ⓐ)</label>
                      <Input
                        type="number"
                        value={minBalance}
                        onChange={(e) => setMinBalance(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Solde max (Ⓐ)</label>
                      <Input
                        type="number"
                        value={maxBalance}
                        onChange={(e) => setMaxBalance(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Inactifs depuis (jours)</label>
                      <Input
                        type="number"
                        value={inactiveDays}
                        onChange={(e) => setInactiveDays(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Limite max</label>
                      <Input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <span>Offset (commencer à partir de)</span>
                        <span className="text-xs text-gray-500">⚠️ Important pour éviter doublons</span>
                      </label>
                      <Input
                        type="number"
                        value={offset}
                        onChange={(e) => setOffset(e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ex: 218 pour commencer après les 218 premiers
                      </p>
                    </div>
                    <div className="flex items-end">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                        <p className="font-semibold mb-1">💡 Astuce</p>
                        <p>Utilisez offset pour envoyer par batches et éviter les timeouts</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={fetchPreviewCount}
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Prévisualiser les destinataires
                  </Button>

                  {previewCount !== null && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{previewCount}</span>
                      <span className="text-muted-foreground">utilisateurs ciblés</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Send Button */}
              <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardContent className="pt-6">
                  <div className="mb-4 text-center">
                    <div className="text-sm opacity-90 mb-1">Type d'email</div>
                    <div className="text-lg font-bold">{EMAIL_TEMPLATES[emailType].name}</div>
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-white text-blue-600 hover:bg-gray-100"
                    onClick={handleSendPromo}
                    disabled={sending || !title.trim() || !message.trim()}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Envoyer la campagne
                      </>
                    )}
                  </Button>
                  <p className="text-center text-sm mt-3 text-white/80">
                    {previewCount !== null 
                      ? `${previewCount} emails seront envoyés`
                      : 'Cliquez sur prévisualiser pour voir le nombre'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-gray-500" />
                Historique des campagnes
              </CardTitle>
              <CardDescription>
                Toutes les campagnes emails envoyées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : campaigns && campaigns.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div 
                      key={campaign.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{campaign.title}</span>
                          {campaign.promo_code && (
                            <Badge variant="outline" className="border-green-600 text-green-700">{campaign.promo_code}</Badge>
                          )}
                          {campaign.discount && (
                            <Badge className="bg-green-600">{campaign.discount}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {campaign.message}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6 ml-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {campaign.status === 'sent' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-medium">
                              {campaign.sent_count}/{campaign.total_recipients}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">emails envoyés</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">
                              {new Date(campaign.sent_at || campaign.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Aucune campagne envoyée</p>
                  <p className="text-sm">Composez votre premier email promotionnel</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
