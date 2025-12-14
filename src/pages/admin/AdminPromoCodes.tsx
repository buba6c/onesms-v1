import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Ticket, 
  Gift,
  Users,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  Loader2,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  start_date: string | null;
  end_date: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

const initialFormState = {
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 10,
  min_purchase: 0,
  max_discount: '',
  start_date: '',
  end_date: '',
  max_uses: '',
  max_uses_per_user: 1,
  is_active: true,
};

export default function AdminPromoCodes() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [promoFieldEnabled, setPromoFieldEnabled] = useState(true);
  const [loadingToggle, setLoadingToggle] = useState(false);

  // Fetch promo field visibility setting
  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'promo_code_field_visible')
        .single();
      
      if (data) {
        setPromoFieldEnabled((data as any).value === 'true');
      }
    };
    fetchSetting();
  }, []);

  // Toggle promo field visibility
  const togglePromoField = async (enabled: boolean) => {
    setLoadingToggle(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'promo_code_field_visible',
          value: enabled ? 'true' : 'false',
          category: 'promo',
          description: 'Afficher le champ code promo sur la page TopUp',
          updated_at: new Date().toISOString()
        } as any, { onConflict: 'key' });

      if (error) throw error;
      
      setPromoFieldEnabled(enabled);
      toast({
        title: enabled ? 'Champ code promo activé' : 'Champ code promo masqué',
        description: enabled 
          ? 'Les utilisateurs peuvent maintenant entrer un code promo'
          : 'Le champ code promo est maintenant masqué sur TopUp',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingToggle(false);
    }
  };

  // Fetch promo codes
  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PromoCode[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_purchase: data.min_purchase || 0,
        max_discount: data.max_discount ? parseFloat(data.max_discount) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        max_uses_per_user: data.max_uses_per_user || 1,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingCode) {
        const { error } = await (supabase as any)
          .from('promo_codes')
          .update(payload)
          .eq('id', editingCode.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('promo_codes')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast({
        title: editingCode ? 'Code modifié' : 'Code créé',
        description: `Le code ${formData.code} a été ${editingCode ? 'modifié' : 'créé'} avec succès`,
      });
      setShowDialog(false);
      setEditingCode(null);
      setFormData(initialFormState);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast({ title: 'Code supprimé' });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('promo_codes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });

  const openEditDialog = (code: PromoCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_purchase: code.min_purchase,
      max_discount: code.max_discount?.toString() || '',
      start_date: code.start_date?.split('T')[0] || '',
      end_date: code.end_date?.split('T')[0] || '',
      max_uses: code.max_uses?.toString() || '',
      max_uses_per_user: code.max_uses_per_user,
      is_active: code.is_active,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingCode(null);
    setFormData(initialFormState);
    setShowDialog(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copié !' });
  };

  const filteredCodes = promoCodes?.filter(code => 
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExpired = (code: PromoCode) => {
    if (!code.end_date) return false;
    return new Date(code.end_date) < new Date();
  };

  const isExhausted = (code: PromoCode) => {
    if (!code.max_uses) return false;
    return code.current_uses >= code.max_uses;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-purple-500" />
            Codes Promo
          </h1>
          <p className="text-muted-foreground">
            Gérez les codes promotionnels pour les recharges
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau code
          </Button>
        </div>
      </div>

      {/* Toggle Promo Field Visibility */}
      <Card className={`border-2 transition-colors ${promoFieldEnabled ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {promoFieldEnabled ? (
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="p-2 bg-gray-200 rounded-lg">
                  <EyeOff className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-semibold">
                  {promoFieldEnabled ? 'Champ code promo visible' : 'Champ code promo masqué'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {promoFieldEnabled 
                    ? 'Les utilisateurs peuvent entrer un code promo sur la page TopUp'
                    : 'Le champ code promo est caché sur la page TopUp'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loadingToggle && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch
                checked={promoFieldEnabled}
                onCheckedChange={togglePromoField}
                disabled={loadingToggle}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Ticket className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promoCodes?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Codes total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {promoCodes?.filter(c => c.is_active && !isExpired(c) && !isExhausted(c)).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {promoCodes?.reduce((sum, c) => sum + c.current_uses, 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Utilisations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Gift className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {promoCodes?.filter(c => c.discount_type === 'percentage').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Codes %</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Codes List */}
      <Card>
        <CardHeader>
          <CardTitle>Tous les codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCodes && filteredCodes.length > 0 ? (
            <div className="space-y-3">
              {filteredCodes.map((code) => (
                <div
                  key={code.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    !code.is_active || isExpired(code) || isExhausted(code)
                      ? 'bg-gray-50 opacity-60'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="font-mono text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent cursor-pointer"
                      onClick={() => copyCode(code.code)}
                    >
                      {code.code}
                      <Copy className="inline h-3 w-3 ml-1 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={code.discount_type === 'percentage' ? 'default' : 'secondary'}>
                        {code.discount_type === 'percentage' 
                          ? `+${code.discount_value}%`
                          : `+${code.discount_value}Ⓐ`
                        }
                      </Badge>
                      
                      {isExpired(code) && (
                        <Badge variant="destructive">Expiré</Badge>
                      )}
                      {isExhausted(code) && (
                        <Badge variant="destructive">Épuisé</Badge>
                      )}
                      {!code.is_active && (
                        <Badge variant="outline">Désactivé</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">
                        {code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''} utilisations
                      </div>
                      {code.min_purchase > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Min: {code.min_purchase}Ⓐ
                        </div>
                      )}
                    </div>

                    <Switch
                      checked={code.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: code.id, is_active: checked })
                      }
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(code)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Supprimer ce code promo ?')) {
                            deleteMutation.mutate(code.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucun code promo</p>
              <Button variant="link" onClick={openCreateDialog}>
                Créer votre premier code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Modifier le code' : 'Nouveau code promo'}
            </DialogTitle>
            <DialogDescription>
              {editingCode 
                ? 'Modifiez les paramètres du code promo'
                : 'Créez un nouveau code promotionnel pour vos utilisateurs'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Code *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => 
                    setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="percentage">Pourcentage (%)</option>
                  <option value="fixed">Fixe (Ⓐ)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Offre de bienvenue"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Valeur {formData.discount_type === 'percentage' ? '(%)' : '(Ⓐ)'}
                </label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Achat minimum (Ⓐ)</label>
                <Input
                  type="number"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {formData.discount_type === 'percentage' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Bonus maximum (Ⓐ) - optionnel</label>
                <Input
                  type="number"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  placeholder="Illimité"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date début</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date fin</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Utilisations max</label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Illimité"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max par utilisateur</label>
                <Input
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <label className="text-sm">Actif immédiatement</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.code || saveMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingCode ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
