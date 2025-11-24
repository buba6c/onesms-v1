import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { packagesApi, ActivationPackage } from '@/lib/api/packages';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
  Star,
  Package,
} from 'lucide-react';

interface PackageFormData {
  activations: number;
  price_xof: number;
  price_eur: number;
  price_usd: number;
  is_popular: boolean;
  savings_percentage: number;
  display_order: number;
  is_active: boolean;
}

export default function PackagesManagementPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    activations: 0,
    price_xof: 0,
    price_eur: 0,
    price_usd: 0,
    is_popular: false,
    savings_percentage: 0,
    display_order: 0,
    is_active: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: packagesApi.getAllPackages,
  });

  const createMutation = useMutation({
    mutationFn: packagesApi.createPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['activation-packages'] });
      toast({ title: 'Package créé avec succès' });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivationPackage> }) =>
      packagesApi.updatePackage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['activation-packages'] });
      toast({ title: 'Package mis à jour avec succès' });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: packagesApi.deletePackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['activation-packages'] });
      toast({ title: 'Package supprimé avec succès' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      packagesApi.togglePackageStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['activation-packages'] });
      toast({ title: 'Statut mis à jour' });
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      activations: 0,
      price_xof: 0,
      price_eur: 0,
      price_usd: 0,
      is_popular: false,
      savings_percentage: 0,
      display_order: 0,
      is_active: true,
    });
  };

  const handleEdit = (pkg: ActivationPackage) => {
    setEditingId(pkg.id);
    setFormData({
      activations: pkg.activations,
      price_xof: pkg.price_xof,
      price_eur: pkg.price_eur,
      price_usd: pkg.price_usd,
      is_popular: pkg.is_popular,
      savings_percentage: pkg.savings_percentage,
      display_order: pkg.display_order,
      is_active: pkg.is_active,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Gestion des Packages
          </h1>
          <p className="text-gray-600 mt-1">
            Gérer les packages de recharge disponibles pour les utilisateurs
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau Package
          </Button>
        )}
      </div>

      {(isCreating || editingId) && (
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {editingId ? 'Modifier le Package' : 'Créer un Package'}
            </h2>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="activations">Nombre d'activations</Label>
                <Input
                  id="activations"
                  type="number"
                  value={formData.activations}
                  onChange={(e) =>
                    setFormData({ ...formData, activations: parseInt(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="price_xof">Prix XOF (FCFA)</Label>
                <Input
                  id="price_xof"
                  type="number"
                  step="0.01"
                  value={formData.price_xof}
                  onChange={(e) =>
                    setFormData({ ...formData, price_xof: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="price_eur">Prix EUR (€)</Label>
                <Input
                  id="price_eur"
                  type="number"
                  step="0.01"
                  value={formData.price_eur}
                  onChange={(e) =>
                    setFormData({ ...formData, price_eur: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="price_usd">Prix USD ($)</Label>
                <Input
                  id="price_usd"
                  type="number"
                  step="0.01"
                  value={formData.price_usd}
                  onChange={(e) =>
                    setFormData({ ...formData, price_usd: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="savings">Économie (%)</Label>
                <Input
                  id="savings"
                  type="number"
                  value={formData.savings_percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, savings_percentage: parseInt(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label htmlFor="order">Ordre d'affichage</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_popular: checked })
                  }
                />
                <Label htmlFor="popular">Package Populaire</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="active">Actif</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="p-6 relative">
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

            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-3">
                <span className="text-2xl font-bold text-white">{pkg.activations}</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{pkg.activations} Ⓐ</h3>
              <p className="text-sm text-gray-600">Activations</p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">XOF:</span>
                <span className="font-semibold">{pkg.price_xof.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">EUR:</span>
                <span className="font-semibold">€{pkg.price_eur.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">USD:</span>
                <span className="font-semibold">${pkg.price_usd.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Statut:</span>
              <Switch
                checked={pkg.is_active}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: pkg.id, isActive: checked })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleEdit(pkg)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Modifier
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir supprimer ce package ?')) {
                    deleteMutation.mutate(pkg.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
