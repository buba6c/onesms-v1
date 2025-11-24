// @ts-nocheck
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Key,
  Database,
  CreditCard,
  Globe,
  CheckCircle,
  AlertCircle,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState<Record<string, boolean>>({});

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
    }
  }, [settings]);

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase
        .rpc('update_setting', {
          setting_key: key,
          setting_value: value,
        });

      if (error) throw error;
      return data;
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

  // Test connection functions
  const testSupabaseConnection = async () => {
    setTestingConnection({ ...testingConnection, supabase: true });
    try {
      const url = editedValues['supabase_url'];
      const key = editedValues['supabase_anon_key'];
      
      if (!url || !key) {
        throw new Error('URL et clé Supabase requis');
      }

      // Test connection
      const response = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': key }
      });

      if (response.ok) {
        toast({
          title: '✅ Connexion réussie',
          description: 'Supabase est correctement configuré',
        });
      } else {
        throw new Error('Connexion échouée');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection({ ...testingConnection, supabase: false });
    }
  };

  const test5simConnection = async () => {
    setTestingConnection({ ...testingConnection, '5sim': true });
    try {
      const apiKey = editedValues['5sim_api_key'];
      const apiUrl = editedValues['5sim_api_url'];
      
      if (!apiKey || !apiUrl) {
        throw new Error('Clé API 5sim requise');
      }

      const response = await fetch(`${apiUrl}/user/profile`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: '✅ Connexion réussie',
          description: `Balance: ${data.balance || 0} RUB`,
        });
      } else {
        throw new Error('Clé API invalide');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection({ ...testingConnection, '5sim': false });
    }
  };

  const testPaytechConnection = async () => {
    setTestingConnection({ ...testingConnection, paytech: true });
    try {
      const apiKey = editedValues['paytech_api_key'];
      const apiSecret = editedValues['paytech_api_secret'];
      
      if (!apiKey || !apiSecret) {
        throw new Error('Clés API PayTech requises');
      }

      toast({
        title: '✅ Configuration enregistrée',
        description: 'Les clés PayTech seront testées lors du prochain paiement',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection({ ...testingConnection, paytech: false });
    }
  };

  const handleSaveCategory = async (category: string) => {
    const categorySettings = settings?.filter(s => s.category === category) || [];
    
    for (const setting of categorySettings) {
      if (editedValues[setting.key] !== setting.value) {
        await updateSettingMutation.mutateAsync({
          key: setting.key,
          value: editedValues[setting.key],
        });
      }
    }

    // Reload page after saving to apply new settings
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleSaveAll = async () => {
    if (!settings) return;

    for (const setting of settings) {
      if (editedValues[setting.key] !== setting.value) {
        await updateSettingMutation.mutateAsync({
          key: setting.key,
          value: editedValues[setting.key],
        });
      }
    }

    // Reload page after saving
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets({ ...showSecrets, [key]: !showSecrets[key] });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'supabase':
        return <Database className="h-5 w-5 text-purple-600" />;
      case '5sim':
        return <Key className="h-5 w-5 text-blue-600" />;
      case 'paytech':
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case 'general':
        return <Globe className="h-5 w-5 text-gray-600" />;
      case 'pricing':
        return <CreditCard className="h-5 w-5 text-orange-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'supabase':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '5sim':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paytech':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'general':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pricing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isSecretKey = (key: string) => {
    return key.includes('key') || key.includes('secret') || key.includes('anon');
  };

  const getConnectionStatus = () => {
    const supabaseConfigured = editedValues['supabase_url'] && editedValues['supabase_anon_key'];
    const fivesimConfigured = editedValues['5sim_api_key'];
    const paytechConfigured = editedValues['paytech_api_key'] && editedValues['paytech_api_secret'];

    return {
      supabase: supabaseConfigured,
      '5sim': fivesimConfigured,
      paytech: paytechConfigured,
    };
  };

  const connectionStatus = getConnectionStatus();

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

  // Group settings by category
  const groupedSettings = settings?.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres Système</h1>
          <p className="text-gray-600">Configuration des API et paramètres de l'application</p>
        </div>
        <Button 
          onClick={handleSaveAll}
          disabled={updateSettingMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Tout Enregistrer
        </Button>
      </div>

      {/* Connection Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            État des Connexions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${connectionStatus.supabase ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5" />
                <span className="font-semibold">Supabase</span>
              </div>
              {connectionStatus.supabase ? (
                <Badge className="bg-green-600">✓ Configuré</Badge>
              ) : (
                <Badge variant="destructive">✗ Non configuré</Badge>
              )}
            </div>

            <div className={`p-4 rounded-lg border-2 ${connectionStatus['5sim'] ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5" />
                <span className="font-semibold">5sim.net</span>
              </div>
              {connectionStatus['5sim'] ? (
                <Badge className="bg-green-600">✓ Configuré</Badge>
              ) : (
                <Badge variant="secondary">⚠ Optionnel</Badge>
              )}
            </div>

            <div className={`p-4 rounded-lg border-2 ${connectionStatus.paytech ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5" />
                <span className="font-semibold">PayTech</span>
              </div>
              {connectionStatus.paytech ? (
                <Badge className="bg-green-600">✓ Configuré</Badge>
              ) : (
                <Badge variant="secondary">⚠ Optionnel</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings by Category */}
      <div className="space-y-6">
        {Object.entries(groupedSettings || {}).map(([category, categorySettings]) => (
          <Card key={category} className={`border-l-4 ${getCategoryColor(category)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getCategoryIcon(category)}
                  <div>
                    <CardTitle className="capitalize">{category}</CardTitle>
                    <CardDescription>
                      {category === 'supabase' && '⚠️ REQUIS - Base de données et authentification'}
                      {category === '5sim' && 'Fournisseur de numéros virtuels'}
                      {category === 'paytech' && 'Passerelle de paiement (Sénégal)'}
                      {category === 'general' && 'Paramètres généraux de l\'application'}
                      {category === 'pricing' && 'Configuration des prix et limites'}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveCategory(category)}
                  disabled={updateSettingMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer {category}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorySettings.map(setting => (
                <div key={setting.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {setting.description || setting.key}
                    </label>
                    {isSecretKey(setting.key) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowSecret(setting.key)}
                      >
                        {showSecrets[setting.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type={isSecretKey(setting.key) && !showSecrets[setting.key] ? 'password' : 'text'}
                      value={editedValues[setting.key] || ''}
                      onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
                      placeholder={`Entrez ${setting.description || setting.key}`}
                      className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Clé: {setting.key}</p>
                </div>
              ))}

              {/* Test Connection Buttons */}
              {category === 'supabase' && (
                <Button
                  variant="outline"
                  onClick={testSupabaseConnection}
                  disabled={testingConnection.supabase}
                  className="w-full mt-4"
                >
                  {testingConnection.supabase ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Tester la connexion Supabase
                </Button>
              )}

              {category === '5sim' && (
                <Button
                  variant="outline"
                  onClick={test5simConnection}
                  disabled={testingConnection['5sim']}
                  className="w-full mt-4"
                >
                  {testingConnection['5sim'] ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Tester la connexion 5sim
                </Button>
              )}

              {category === 'paytech' && (
                <Button
                  variant="outline"
                  onClick={testPaytechConnection}
                  disabled={testingConnection.paytech}
                  className="w-full mt-4"
                >
                  {testingConnection.paytech ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Vérifier les clés PayTech
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="h-5 w-5" />
            Instructions de Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p><strong>1. Supabase (REQUIS):</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Créez un compte sur <a href="https://supabase.com" target="_blank" className="underline">supabase.com</a></li>
            <li>Créez un nouveau projet</li>
            <li>Allez dans Settings → API</li>
            <li>Copiez la Project URL et l'anon/public key</li>
            <li>Exécutez le fichier <code className="bg-blue-100 px-1 rounded">supabase/schema.sql</code> dans SQL Editor</li>
          </ul>

          <p className="mt-4"><strong>2. 5sim.net (Optionnel):</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Inscrivez-vous sur <a href="https://5sim.net" target="_blank" className="underline">5sim.net</a></li>
            <li>Rechargez votre compte</li>
            <li>Copiez votre clé API depuis le profil</li>
          </ul>

          <p className="mt-4"><strong>3. PayTech (Optionnel):</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Contactez <a href="https://paytech.sn" target="_blank" className="underline">PayTech</a> pour obtenir un compte marchand</li>
            <li>Récupérez vos clés API (API Key et API Secret)</li>
          </ul>

          <p className="mt-4 text-red-700 font-semibold">
            ⚠️ Important: Après avoir enregistré les paramètres, l'application se rechargera automatiquement pour appliquer les nouvelles configurations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
