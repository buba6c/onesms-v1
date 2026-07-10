import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Send, Mail, Users, Filter, Clock, CheckCircle, AlertCircle, Loader2,
  History, Play, Pause, Square, AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

const EMAIL_TEMPLATES = {
  operational: {
    name: 'Service operationnel',
    title: 'One SMS est maintenant pleinement operationnel',
    message: 'Nous sommes ravis de vous annoncer que la plateforme One SMS fonctionne maintenant a 100% de ses capacites. Vous pouvez des maintenant louer des numeros temporaires et recevoir vos SMS de verification en temps reel.',
    icon: '✅',
  },
  maintenance: {
    name: 'Maintenance programmee',
    title: 'Maintenance technique prevue',
    message: 'Une maintenance technique est prevue le [DATE] de [HEURE] a [HEURE]. Durant cette periode, certains services pourraient etre temporairement indisponibles. Nous nous excusons pour la gene occasionnee.',
    icon: '🛠️',
  },
  incident: {
    name: 'Incident resolu',
    title: 'Le service est retabli',
    message: 'Suite a un incident technique, tous nos services sont maintenant retablis et fonctionnent normalement. Merci pour votre patience et votre comprehension.',
    icon: '🚑',
  },
  new_feature: {
    name: 'Nouvelle fonctionnalite',
    title: 'Nouvelle fonctionnalite disponible',
    message: 'Decouvrez notre nouvelle fonctionnalite : [DESCRIPTION]. Cette amelioration vous permet de [AVANTAGE]. Connectez-vous pour l\'essayer des maintenant.',
    icon: '✨',
  },
  new_rental: {
    name: 'Annonce: Locations Longue Durée',
    title: 'Nouveau service de location de numéros disponible',
    message: 'Bonjour,\n\nNous vous informons du lancement de notre nouveau service de location longue durée sur la plateforme One SMS.\n\nIl est désormais possible de louer un numéro de téléphone dédié pour une durée allant de 4 heures jusqu\'à 1 mois. Ce service vous permet de recevoir de manière illimitée vos codes de vérification durant toute la période de location choisie.\n\nCette option est particulièrement recommandée pour la sécurisation durable de vos comptes.\n\nVous pouvez retrouver l\'ensemble de ces offres directement depuis votre espace client.\n\nCordialement,\nL\'équipe One SMS',
    icon: '•',
  },
  welcome_back: {
    name: 'Retour utilisateur inactif',
    title: 'Nous vous avons manque',
    message: 'Cela fait un moment que nous ne vous avons pas vu. Revenez decouvrir nos nouveaux services et profitez de votre solde pour activer vos comptes en toute securite.',
    icon: '👋',
  },
  security: {
    name: 'Alerte securite',
    title: 'Information de securite importante',
    message: 'Par mesure de securite, nous vous recommandons de [ACTION]. Cette demarche garantit la protection de votre compte et de vos donnees personnelles.',
    icon: '🛡️',
  },
  promo: {
    name: 'Promotion Offre',
    title: '',
    message: '',
    icon: '🏷️',
  },
  custom: {
    name: 'Message personnalise',
    title: '',
    message: '',
    icon: '✏️',
  },
};

const BATCH_SIZE = 100;

export default function AdminEmails() {
  const [activeTab, setActiveTab] = useState('compose');

  // Form state
  const [emailType, setEmailType] = useState<keyof typeof EMAIL_TEMPLATES>('operational');
  const [title, setTitle] = useState(EMAIL_TEMPLATES['operational'].title);
  const [message, setMessage] = useState(EMAIL_TEMPLATES['operational'].message);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState('');

  // Filters
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [inactiveDays, setInactiveDays] = useState('');
  const [limit, setLimit] = useState('');
  const [startOffset, setStartOffset] = useState('');

  // Sending state
  const [sendingState, setSendingState] = useState<'idle' | 'preparing' | 'sending' | 'paused' | 'completed' | 'error'>('idle');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  // Batch Progress
  const [progress, setProgress] = useState({
    total: 0,
    sent: 0,
    success: 0,
    failed: 0,
    currentOffset: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);

  // Prevent closing tab while sending
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sendingState === 'sending' || sendingState === 'paused') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sendingState]);

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

  const fetchPreviewCount = async () => {
    setLoadingPreview(true);
    try {
      let query = supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
        .neq('email', '');

      if (minBalance) query = query.gte('balance', parseFloat(minBalance));
      if (maxBalance) query = query.lte('balance', parseFloat(maxBalance));
      if (inactiveDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(inactiveDays));
        query = query.lte('updated_at', cutoffDate.toISOString());
      }

      const { count, error } = await query;
      if (error) throw error;

      let finalCount = count || 0;
      if (limit && finalCount > parseInt(limit)) {
        finalCount = parseInt(limit);
      }

      setPreviewCount(finalCount);
      return finalCount;
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de calculer le nombre de destinataires',
        variant: 'destructive',
      });
      return 0;
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreviewCount();
    }, 500);
    return () => clearTimeout(timer);
  }, [minBalance, maxBalance, inactiveDays, limit]);

  const startSending = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Champs requis', description: 'Le titre et le message sont obligatoires', variant: 'destructive' });
      return;
    }

    setSendingState('preparing');
    const totalToProcess = await fetchPreviewCount();
    if (totalToProcess === 0) {
      toast({ title: 'Attention', description: 'Aucun destinataire ne correspond aux critères', variant: 'default' });
      setSendingState('idle');
      return;
    }

    let campaignId: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("No user");

      const campaignData: any = {
        name: `${title} (${emailType})`,
        subject: `${title} - One SMS`,
        title,
        message,
        status: 'in_progress',
        total_recipients: totalToProcess,
        sent_count: 0,
        created_by: session.user.id,
        sent_at: new Date().toISOString(),
      }
      if (promoCode) campaignData.promo_code = promoCode;
      if (discount) campaignData.discount = discount;

      const { data, error: createError } = await supabase
        .from('email_campaigns')
        .insert(campaignData)
        .select('id')
        .single();
        
      const campaign = data as any;

      if (createError) throw createError;
      campaignId = campaign.id;
      setCurrentCampaignId(campaign.id);

      const initialOffset = startOffset ? parseInt(startOffset) : 0;
      setProgress({
        total: totalToProcess,
        sent: 0,
        success: 0,
        failed: 0,
        currentOffset: initialOffset
      });

      setSendingState('sending');
      pausedRef.current = false;
      processBatchLoop(totalToProcess, initialOffset, campaignId);
    } catch (err) {
      console.error("Failed to create unified campaign", err);
      toast({ title: 'Erreur', description: 'Impossible de créer la campagne', variant: 'destructive' });
      setSendingState('idle');
      return;
    }
  };

  const processBatchLoop = async (total: number, offset: number, campaignId: string | null) => {
    let currentOffset = offset;
    let processedCount = 0;

    // Safety break
    if (processedCount >= total) {
      finishSending(campaignId);
      return;
    }

    // Keep track of local progress for this session to update UI
    // Note: 'total' here is remaining total if we were clever, but here we pass full total and work from offset?
    // Be careful. 'total' passed from startSending is fetchPreviewCount (TOTAL ELIGIBLE).
    // 'offset' is where we start.
    // So we loop until we cover 'total' items starting from 'offset'? 
    // Wait: fetchPreviewCount returns filtered count. 
    // If offset is 0, we process 'total' items.
    // If offset is 100, and total is 500 (preview count on filtered query might ignore offset or not?)
    // fetchPreviewCounts query ignored offset in our code above!
    // But the sendBatch filter USES offset.
    // So if fetchPreviewCount says 1000 users match filters.
    // And we start at offset 500.
    // We should process 1000 - 500 = 500 users? Or just 1000 users starting at 500?
    // Actually the 'users' list is ordered by ID.
    // If we have 1000 users total matching 'active > 30 days'.
    // And we say start at 500.
    // We probably want to process the 500 remaining.
    // But let's assume standard behavior: 'total' is just the count to display.
    // We will iterate until we fail to find users OR we hit the batch limit if user set one.
    // But simplified: We defined 'total' as the NUMBER OF EMAILS TO SEND.
    // If I have 1000 users and say offset 0, I send 1000.
    // If I have 1000 users and say offset 500, do I send 500? Or do I send 1000 starting from 500 (implies 1500 users?)
    // Let's assume the user uses offset to RESUME or SKIP.
    // So we should process (Total from Preview) emails?
    // Wait, if I say "skip first 500", the preview count (which applies filters but not offset usually in count queries unless specified)
    // The previous preview query logic:
    // query.not('email', 'is', null) ... apply filters ...
    // It returns TOTAL eligible.
    // If I supply offset 500, I effectively want to process (Total - 500).
    // Let's rely on the loop:

    const targetCount = total; // We try to process this many as per the preview

    try {
      while (processedCount < targetCount) {
        if (pausedRef.current) {
          setSendingState('paused');
          if (campaignId) {
            await (supabase.from('email_campaigns') as any).update({ status: 'paused' }).eq('id', campaignId);
          }
          return;
        }

        const batchSize = Math.min(BATCH_SIZE, targetCount - processedCount);
        if (batchSize <= 0) break;

        // Send Batch with robust retry logic
        let retries = 3;
        let success = false;
        let batchSent = 0;
        let batchFailed = 0;

        while (retries > 0 && !success) {
          try {
            const result = await sendBatch(currentOffset, batchSize, campaignId);
            batchSent = result.sent || 0;
            batchFailed = result.failed || 0;
            success = true;
          } catch (err: any) {
            console.error(`Batch error at offset ${currentOffset}, retries left: ${retries - 1}`, err);
            retries--;
            if (retries === 0) {
              throw err;
            }
            // Wait 2.5 seconds before retrying to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 2500));
          }
        }

        processedCount += batchSize;
        currentOffset += batchSize;

        // Update Stats
        setProgress(prev => {
          const nextSuccess = prev.success + batchSent;
          const nextFailed = prev.failed + batchFailed;

          // Fire and forget update to DB (best effort for live feedback)
          if (campaignId) {
            (supabase.from('email_campaigns') as any).update({
              sent_count: nextSuccess
            }).eq('id', campaignId).then();
          }

          return {
            ...prev,
            sent: prev.sent + batchSize,
            success: nextSuccess,
            failed: nextFailed,
            currentOffset: currentOffset
          };
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      finishSending(campaignId);

    } catch (err) {
      console.error("Batch Loop Error", err);
      setSendingState('error');
      toast({ title: 'Erreur Batch', description: 'Une erreur est survenue lors de l\'envoi par lots.', variant: 'destructive' });
    }
  };

  const sendBatch = async (offset: number, limit: number, campaignId: string | null) => {
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
          skipCampaignLog: true, // Use centralized logging in frontend
          campaignId: campaignId, // Pass ID just in case logic uses it for refs, though we skip db log
          filter: {
            ...(minBalance && { minBalance: parseFloat(minBalance) }),
            ...(maxBalance && { maxBalance: parseFloat(maxBalance) }),
            ...(inactiveDays && { inactiveDays: parseInt(inactiveDays) }),
            limit: limit,
            offset: offset,
          },
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erreur batch');
    return { sent: result.sent || 0, failed: result.failed || 0 };
  };

  const togglePause = () => {
    if (sendingState === 'sending') {
      pausedRef.current = true;
      setSendingState('paused');
    } else if (sendingState === 'paused') {
      pausedRef.current = false;
      setSendingState('sending');
      // Resume
      const remaining = progress.total - progress.sent;
      processBatchLoop(remaining, progress.currentOffset, currentCampaignId);
    }
  };

  const stopSending = () => {
    pausedRef.current = true;
    setSendingState('idle');
    setPreviewCount(null);
    setProgress({ total: 0, sent: 0, success: 0, failed: 0, currentOffset: 0 });
    setCurrentCampaignId(null);
  };

  const finishSending = async (campaignId?: string | null) => {
    const id = campaignId || currentCampaignId;
    if (id) {
      try {
        await (supabase.from('email_campaigns') as any).update({
          status: 'sent',
          // Ensure final consistent state
          sent_count: progress.success,
        }).eq('id', id);
      } catch (e) { console.error(e) }
    }

    setSendingState('completed');
    toast({ title: 'Campagne terminée', description: 'Tous les emails ont été traités.' });
    refetchCampaigns();
  };

  const resumeCampaignFromHistory = (campaign: any) => {
    setTitle(campaign.title);
    setMessage(campaign.message);
    if (campaign.promo_code) setPromoCode(campaign.promo_code);
    if (campaign.discount) setDiscount(campaign.discount);
    
    // Set the offset to what was already sent
    setStartOffset(campaign.sent_count.toString());
    setLimit((campaign.total_recipients - campaign.sent_count).toString());
    
    // Go to compose tab
    setActiveTab('compose');
    
    toast({ 
      title: 'Campagne restaurée', 
      description: `Vous pouvez reprendre l'envoi. ${campaign.sent_count} emails ont déjà été envoyés.` 
    });
  };

  const progressPercentage = progress.total > 0 ? (progress.sent / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-purple-500" />
            Emails Marketing
          </h1>
          <p className="text-muted-foreground">
            Envoyez des emails promotionnels en masse (Batching intelligent)
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

        <TabsContent value="compose" className="space-y-6">

          {sendingState !== 'idle' && sendingState !== 'preparing' && (
            <Card className="border-blue-200 bg-blue-50/50 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
                        {sendingState === 'completed' ? <CheckCircle className="text-green-500" /> : <Loader2 className="animate-spin text-blue-500" />}
                        {sendingState === 'completed' ? 'Envoi terminé' : 'Envoi en cours...'}
                      </h3>
                      <p className="text-sm text-blue-700">Traitement par lots de {BATCH_SIZE} emails</p>
                    </div>
                    <div className="flex gap-2">
                      {sendingState !== 'completed' && (
                        <Button variant={sendingState === 'paused' ? "default" : "outline"} size="sm" onClick={togglePause}>
                          {sendingState === 'paused' ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                          {sendingState === 'paused' ? 'Reprendre' : 'Pause'}
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={stopSending}>
                        <Square className="w-4 h-4 mr-1 fill-current" /> Arreter
                      </Button>
                    </div>
                  </div>

                  {sendingState === 'sending' && (
                    <div className="bg-blue-100/50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                      <strong>Important :</strong> Ne fermez pas cet onglet pendant l'envoi. La campagne sera mise en pause si vous quittez la page.
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-blue-800">
                      <span>Progression: {progress.sent} / {progress.total}</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div className="bg-white/50 rounded p-2">
                      <span className="block font-bold text-green-600">{progress.success}</span>
                      <span className="text-gray-500 text-xs">Succès</span>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <span className="block font-bold text-red-600">{progress.failed}</span>
                      <span className="text-gray-500 text-xs">Échecs</span>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <span className="block font-bold text-blue-600">~{Math.ceil((progress.total - progress.sent) / BATCH_SIZE) * 1}s</span>
                      <span className="text-gray-500 text-xs">Temps restant estimé</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className={sendingState !== 'idle' ? 'opacity-50 pointer-events-none' : ''}>
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Type d'email *</label>
                  <select
                    value={emailType}
                    onChange={(e) => {
                      const type = e.target.value as keyof typeof EMAIL_TEMPLATES;
                      setEmailType(type);
                      const template = EMAIL_TEMPLATES[type];
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
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Titre *</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'email" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message *</label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Contenu du message..." />
                </div>

                {emailType === 'promo' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Code promo</label>
                      <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="CODE" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Réduction</label>
                      <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="-20%" />
                    </div>
                  </div>
                )}

                {(title || message) && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-sm">
                    <p className="font-bold text-gray-900 mb-2">{title}</p>
                    <p className="whitespace-pre-wrap text-gray-600">{message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className={cn("space-y-6", sendingState !== 'idle' ? 'opacity-50 pointer-events-none' : '')}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    Ciblage & Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="filters">
                      <AccordionTrigger>Filtres Avancés & Limite</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Solde Min</label>
                              <Input type="number" value={minBalance} onChange={e => setMinBalance(e.target.value)} placeholder="0" className="h-8" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Solde Max</label>
                              <Input type="number" value={maxBalance} onChange={e => setMaxBalance(e.target.value)} placeholder="Max" className="h-8" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Inactif depuis (jours)</label>
                              <Input type="number" value={inactiveDays} onChange={e => setInactiveDays(e.target.value)} placeholder="ex: 30" className="h-8" />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Limite Totale (Test)</label>
                              <Input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Toutes" className="h-8" />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm font-medium">Estimer l'audience</div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold text-blue-700">{previewCount !== null ? previewCount : '-'}</div>
                          <div className="text-xs text-blue-600">destinataires éligibles</div>
                        </div>
                      </div>
                      {previewCount !== null && previewCount > 1000 && (
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          Gros volume
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg mt-4"
                    onClick={startSending}
                    disabled={sendingState !== 'idle' || loadingPreview}
                  >
                    {sendingState === 'preparing' ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    Lancer la campagne {previewCount ? `(${previewCount})` : ''}
                  </Button>
                  <p className="text-xs text-center text-gray-400">
                    L'envoi se fera par lots de {BATCH_SIZE} emails.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Vos dernières campagnes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                {loadingCampaigns ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
                  campaigns?.length ? (
                    <div className="space-y-4 text-left">
                      {campaigns.map(c => (
                        <div key={c.id} className="p-4 bg-white border rounded shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                          <div>
                            <div className="font-bold text-gray-900">{c.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{c.message}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Créé le {new Date(c.created_at).toLocaleDateString()} à {new Date(c.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={c.status === 'sent' ? 'default' : c.status === 'in_progress' || c.status === 'paused' ? 'outline' : 'secondary'}>
                              {(c.status === 'in_progress' || c.status === 'paused') && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                              {c.sent_count} / {c.total_recipients}
                            </Badge>
                            
                            {c.status === 'sent' ? (
                              <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3" /> Terminé
                              </span>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => resumeCampaignFromHistory(c)} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                                <Play className="w-3 h-3 mr-1" />
                                Reprendre
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : "Aucune campagne trouvée"
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RefreshCw(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
}
