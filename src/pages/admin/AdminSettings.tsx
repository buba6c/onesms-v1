import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  RefreshCw, 
  Key,
  Database,
  Globe,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Wallet,
  Percent,
  Info,
  Palette,
  Upload,
  Image,
  Trash2,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
}

// Configuration des paramètres modernes (SMS-Activate + MoneyFusion)
const MODERN_SETTINGS = {
  'pricing': {
    icon: Percent,
    color: 'orange',
    title: 'Tarification',
    description: 'Configuration des marges et limites',
    settings: [
      { key: 'default_margin_percentage', label: 'Marge par défaut (%)', secret: false, placeholder: '30' },
      { key: 'min_purchase_amount', label: 'Achat minimum (FCFA)', secret: false, placeholder: '500' },
      { key: 'max_purchase_amount', label: 'Achat maximum (FCFA)', secret: false, placeholder: '100000' },
      { key: 'default_balance', label: 'Balance initiale', secret: false, placeholder: '0' },
    ]
  },
  'general': {
    icon: Globe,
    color: 'gray',
    title: 'Général',
    description: 'Paramètres généraux de l\'application',
    settings: [
      { key: 'app_name', label: 'Nom de l\'application', secret: false, placeholder: 'One SMS' },
      { key: 'app_currency', label: 'Devise', secret: false, placeholder: 'FCFA' },
      { key: 'app_locale', label: 'Langue', secret: false, placeholder: 'fr' },
    ]
  }
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState<Record<string, boolean>>({});
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  
  // Logo upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Fetch system settings
  const { data: settings, isLoading } = useQuery<SystemSetting[]>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Initialize edited values when settings load
  useEffect(() => {
    if (settings) {
      const values: Record<string, string> = {};
      settings.forEach(setting => {
        values[setting.key] = setting.value || '';
      });
      setEditedValues(values);
      
      // Load current logo preview
      const logoUrl = values['app_logo_url'];
      if (logoUrl) setLogoPreview(logoUrl);
      
      const faviconUrl = values['app_favicon_url'];
      if (faviconUrl) setFaviconPreview(faviconUrl);
    }
  }, [settings]);

  // Handle logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Erreur', description: 'Veuillez sélectionner une image', variant: 'destructive' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Erreur', description: 'L\'image ne doit pas dépasser 2 Mo', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle favicon file selection
  const handleFaviconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Erreur', description: 'Veuillez sélectionner une image', variant: 'destructive' });
        return;
      }
      if (file.size > 500 * 1024) {
        toast({ title: 'Erreur', description: 'Le favicon ne doit pas dépasser 500 Ko', variant: 'destructive' });
        return;
      }
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFaviconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Upload logo to Supabase Storage
  const uploadLogo = async () => {
    if (!logoFile) return;
    
    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // Save URL to settings
      await updateSettingMutation.mutateAsync({
        key: 'app_logo_url',
        value: publicUrl,
      });

      setLogoFile(null);
      toast({ title: '✅ Logo mis à jour', description: 'Le nouveau logo a été enregistré' });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({ title: 'Erreur', description: error.message || 'Impossible d\'uploader le logo', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Upload favicon to Supabase Storage
  const uploadFavicon = async () => {
    if (!faviconFile) return;
    
    setUploadingFavicon(true);
    try {
      const fileExt = faviconFile.name.split('.').pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, faviconFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // Save URL to settings
      await updateSettingMutation.mutateAsync({
        key: 'app_favicon_url',
        value: publicUrl,
      });

      setFaviconFile(null);
      toast({ title: '✅ Favicon mis à jour', description: 'Le nouveau favicon a été enregistré' });
    } catch (error: any) {
      console.error('Favicon upload error:', error);
      toast({ title: 'Erreur', description: error.message || 'Impossible d\'uploader le favicon', variant: 'destructive' });
    } finally {
      setUploadingFavicon(false);
    }
  };

  // Remove logo
  const removeLogo = async () => {
    try {
      await updateSettingMutation.mutateAsync({
        key: 'app_logo_url',
        value: '',
      });
      setLogoPreview(null);
      setLogoFile(null);
      toast({ title: 'Logo supprimé', description: 'Le logo par défaut sera utilisé' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Remove favicon
  const removeFavicon = async () => {
    try {
      await updateSettingMutation.mutateAsync({
        key: 'app_favicon_url',
        value: '',
      });
      setFaviconPreview(null);
      setFaviconFile(null);
      toast({ title: 'Favicon supprimé', description: 'Le favicon par défaut sera utilisé' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Try RPC first, fallback to direct update
      try {
        const { data, error } = await (supabase as any)
          .rpc('update_setting', {
            setting_key: key,
            setting_value: value,
          });
        if (error) throw error;
        return data;
      } catch {
        // Fallback: direct upsert
        const { error } = await (supabase as any)
          .from('system_settings')
          .upsert({ 
            key, 
            value,
            category: key.split('_')[0] || 'general',
            description: key.replace(/_/g, ' ')
          }, { onConflict: 'key' });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: '✅ Paramètre mis à jour',
        description: 'La configuration a été enregistrée',
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

  // Test SMS-Activate connection
  const testSmsActivateConnection = async () => {
    setTestingConnection({ ...testingConnection, 'sms-activate': true });
    try {
      // Call edge function to check balance
      const { data, error } = await supabase.functions.invoke('get-providers-status');
      
      if (error) throw error;
      
      if (data?.smsActivate?.balance !== undefined) {
        setApiBalance(data.smsActivate.balance);
        toast({
          title: '✅ Connexion SMS-Activate réussie',
          description: `Balance API: $${data.smsActivate.balance}`,
        });
      } else {
        toast({
          title: '✅ API accessible',
          description: 'La connexion à SMS-Activate fonctionne',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message || 'Impossible de tester la connexion',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection({ ...testingConnection, 'sms-activate': false });
    }
  };

  // Test MoneyFusion connection
  const testMoneyFusionConnection = async () => {
    setTestingConnection({ ...testingConnection, 'moneyfusion': true });
    try {
      toast({
        title: '✅ Configuration MoneyFusion',
        description: 'Le test réel se fait lors d\'un paiement.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection({ ...testingConnection, 'moneyfusion': false });
    }
  };

  const handleSaveCategory = async (category: string) => {
    const config = MODERN_SETTINGS[category as keyof typeof MODERN_SETTINGS];
    if (!config) return;

    for (const setting of config.settings) {
      const currentValue = settings?.find(s => s.key === setting.key)?.value;
      if (editedValues[setting.key] !== currentValue) {
        await updateSettingMutation.mutateAsync({
          key: setting.key,
          value: editedValues[setting.key],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres Système</h1>
          <p className="text-gray-600">Configuration des API et paramètres de l'application</p>
        </div>
      </div>

      {/* Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            État des Services
          </CardTitle>
          <CardDescription>
            Les clés API sont configurées dans les secrets Supabase (Dashboard → Edge Functions → Secrets)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SMS-Activate Status */}
            <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">SMS-Activate</span>
              </div>
              <Badge className="bg-blue-600">Provider Principal</Badge>
              {apiBalance !== null && (
                <p className="text-sm mt-2 text-blue-700">Balance: ${apiBalance}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={testSmsActivateConnection}
                disabled={testingConnection['sms-activate']}
              >
                {testingConnection['sms-activate'] ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Tester
              </Button>
            </div>

            {/* MoneyFusion Status */}
            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-green-600" />
                <span className="font-semibold">MoneyFusion</span>
              </div>
              <Badge className="bg-green-600">Paiements</Badge>
              <p className="text-xs mt-2 text-green-700">Wave, Orange Money, Free Money</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={testMoneyFusionConnection}
                disabled={testingConnection['moneyfusion']}
              >
                {testingConnection['moneyfusion'] ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Vérifier
              </Button>
            </div>

            {/* Database Status */}
            <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">Supabase</span>
              </div>
              <Badge className="bg-purple-600">✓ Connecté</Badge>
              <p className="text-xs mt-2 text-purple-700">Base de données active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Tarification</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Info</span>
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Aide</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Logo Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-blue-600" />
                  Logo du Site
                </CardTitle>
                <CardDescription>
                  Le logo apparaît dans l'en-tête du site (format recommandé: PNG/SVG, 200x50px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Logo Preview */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800">
                  {logoPreview ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="max-h-16 max-w-full object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Aperçu du logo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-xl">OS</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Logo par défaut</p>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir une image
                  </Button>
                  
                  {logoPreview && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={removeLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Save Logo Button */}
                {logoFile && (
                  <Button
                    onClick={uploadLogo}
                    disabled={uploadingLogo}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadingLogo ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer le logo
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Favicon Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Favicon
                </CardTitle>
                <CardDescription>
                  L'icône qui apparaît dans l'onglet du navigateur (format: ICO/PNG, 32x32 ou 64x64px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Favicon Preview */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800">
                  {faviconPreview ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img 
                          src={faviconPreview} 
                          alt="Favicon preview" 
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Aperçu du favicon</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">OS</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Favicon par défaut</p>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*,.ico"
                  onChange={handleFaviconSelect}
                  className="hidden"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir une image
                  </Button>
                  
                  {faviconPreview && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={removeFavicon}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Save Favicon Button */}
                {faviconFile && (
                  <Button
                    onClick={uploadFavicon}
                    disabled={uploadingFavicon}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {uploadingFavicon ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer le favicon
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Brand Colors Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-pink-600" />
                  Couleurs de la Marque
                </CardTitle>
                <CardDescription>
                  Personnalisez les couleurs principales du site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Couleur Primaire</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editedValues['app_primary_color'] || '#3B82F6'}
                        onChange={(e) => setEditedValues({ ...editedValues, app_primary_color: e.target.value })}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={editedValues['app_primary_color'] || '#3B82F6'}
                        onChange={(e) => setEditedValues({ ...editedValues, app_primary_color: e.target.value })}
                        placeholder="#3B82F6"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Couleur Secondaire</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editedValues['app_secondary_color'] || '#06B6D4'}
                        onChange={(e) => setEditedValues({ ...editedValues, app_secondary_color: e.target.value })}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={editedValues['app_secondary_color'] || '#06B6D4'}
                        onChange={(e) => setEditedValues({ ...editedValues, app_secondary_color: e.target.value })}
                        placeholder="#06B6D4"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Couleur d'Accent</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editedValues['app_accent_color'] || '#8B5CF6'}
                        onChange={(e) => setEditedValues({ ...editedValues, app_accent_color: e.target.value })}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={editedValues['app_accent_color'] || '#8B5CF6'}
                        onChange={(e) => setEditedValues({ ...editedValues, app_accent_color: e.target.value })}
                        placeholder="#8B5CF6"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 rounded-lg border bg-gradient-to-r" style={{
                  backgroundImage: `linear-gradient(to right, ${editedValues['app_primary_color'] || '#3B82F6'}, ${editedValues['app_secondary_color'] || '#06B6D4'})`
                }}>
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-10" />
                    ) : (
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">OS</span>
                      </div>
                    )}
                    <span className="text-white font-bold text-xl">One SMS</span>
                  </div>
                  <p className="text-white/80 text-sm mt-2">Aperçu avec vos couleurs</p>
                </div>

                <Button
                  onClick={async () => {
                    await updateSettingMutation.mutateAsync({ key: 'app_primary_color', value: editedValues['app_primary_color'] || '#3B82F6' });
                    await updateSettingMutation.mutateAsync({ key: 'app_secondary_color', value: editedValues['app_secondary_color'] || '#06B6D4' });
                    await updateSettingMutation.mutateAsync({ key: 'app_accent_color', value: editedValues['app_accent_color'] || '#8B5CF6' });
                    toast({ title: '✅ Couleurs enregistrées', description: 'Les nouvelles couleurs ont été appliquées' });
                  }}
                  disabled={updateSettingMutation.isPending}
                  className="w-full mt-4"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les couleurs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-orange-600" />
                Configuration Tarification
              </CardTitle>
              <CardDescription>
                Définissez les marges et limites d'achat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODERN_SETTINGS.pricing.settings.map(setting => (
                <div key={setting.key} className="space-y-2">
                  <label className="text-sm font-medium">{setting.label}</label>
                  <Input
                    type="text"
                    value={editedValues[setting.key] || ''}
                    onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
                    placeholder={setting.placeholder}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
              <Button
                onClick={() => handleSaveCategory('pricing')}
                disabled={updateSettingMutation.isPending}
                className="w-full mt-4"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer la tarification
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-600" />
                Paramètres Généraux
              </CardTitle>
              <CardDescription>
                Configuration de base de l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODERN_SETTINGS.general.settings.map(setting => (
                <div key={setting.key} className="space-y-2">
                  <label className="text-sm font-medium">{setting.label}</label>
                  <Input
                    type="text"
                    value={editedValues[setting.key] || ''}
                    onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
                    placeholder={setting.placeholder}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
              <Button
                onClick={() => handleSaveCategory('general')}
                disabled={updateSettingMutation.isPending}
                className="w-full mt-4"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Info Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Information API
              </CardTitle>
              <CardDescription>
                Les clés API sont stockées de manière sécurisée dans les secrets Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔐 SMS-Activate API Key</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Configurée dans: <code className="bg-blue-100 px-1 rounded">SMS_ACTIVATE_API_KEY</code>
                </p>
                <p className="text-xs text-blue-600">
                  Dashboard Supabase → Edge Functions → Manage Secrets
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">💳 MoneyFusion API URL</h4>
                <p className="text-sm text-green-700 mb-2">
                  Configurée dans: <code className="bg-green-100 px-1 rounded">MONEYFUSION_API_URL</code>
                </p>
                <p className="text-xs text-green-600">
                  Format: https://api.moneyfusion.net/v1/...
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">🗄️ Supabase</h4>
                <p className="text-sm text-purple-700 mb-2">
                  Variables automatiques: <code className="bg-purple-100 px-1 rounded">SUPABASE_URL</code>, <code className="bg-purple-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>
                </p>
                <p className="text-xs text-purple-600">
                  Configurées automatiquement par Supabase
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help">
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="h-5 w-5" />
                Guide de Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-800 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">📱 1. SMS-Activate (Numéros virtuels)</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Inscrivez-vous sur <a href="https://sms-activate.org" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">sms-activate.org</a></li>
                  <li>Rechargez votre compte avec un montant suffisant</li>
                  <li>Copiez votre clé API depuis le profil</li>
                  <li>Ajoutez-la dans Supabase Dashboard → Edge Functions → Secrets</li>
                  <li>Nom du secret: <code className="bg-amber-100 px-1 rounded">SMS_ACTIVATE_API_KEY</code></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">💰 2. MoneyFusion (Paiements)</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Contactez <a href="https://moneyfusion.net" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">MoneyFusion</a> pour un compte marchand</li>
                  <li>Récupérez l'URL API fournie</li>
                  <li>Ajoutez-la dans les secrets: <code className="bg-amber-100 px-1 rounded">MONEYFUSION_API_URL</code></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">⚙️ 3. Paramètres système</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>La marge par défaut s'applique à tous les prix</li>
                  <li>Les montants min/max limitent les recharges</li>
                  <li>La balance initiale est attribuée aux nouveaux comptes</li>
                </ul>
              </div>

              <div className="bg-red-100 border border-red-300 rounded-lg p-3 mt-4">
                <p className="text-red-800 font-semibold">
                  ⚠️ Important: Ne jamais exposer les clés API dans le code frontend!
                </p>
                <p className="text-red-700 text-xs mt-1">
                  Toutes les clés sensibles doivent être dans les secrets Supabase.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
