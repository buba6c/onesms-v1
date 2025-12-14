import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactSettingsApi, ContactSettings } from '@/lib/api/contactSettings';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Mail, 
  MessageSquare, 
  MapPin, 
  Clock,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function AdminContactSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ContactSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['admin-contact-settings'],
    queryFn: contactSettingsApi.getSettings,
  });

  // Set form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: contactSettingsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-settings'] });
      queryClient.invalidateQueries({ queryKey: ['contact-settings'] });
      toast({
        title: 'Paramètres mis à jour',
        description: 'Les informations de contact ont été sauvegardées.',
      });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder les paramètres.',
        variant: 'destructive',
      });
    },
  });

  const handleChange = (field: keyof ContactSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres de Contact</h1>
            <p className="text-gray-500 mt-1">Gérez les informations affichées sur la page Contact</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Email</h2>
                <p className="text-sm text-gray-500">Adresse email de contact</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse Email
                </label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temps de réponse
                </label>
                <Input
                  value={formData.email_response_time || ''}
                  onChange={(e) => handleChange('email_response_time', e.target.value)}
                  placeholder="Réponse sous 24h"
                />
              </div>
            </div>
          </Card>

          {/* WhatsApp Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">WhatsApp</h2>
                <p className="text-sm text-gray-500">Numéro WhatsApp de support</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro WhatsApp
                </label>
                <Input
                  value={formData.whatsapp || ''}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="+1 683 777 0410"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horaires disponibles
                </label>
                <Input
                  value={formData.whatsapp_hours || ''}
                  onChange={(e) => handleChange('whatsapp_hours', e.target.value)}
                  placeholder="Lun-Sam, 9h-18h"
                />
              </div>
            </div>
          </Card>

          {/* Instagram Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Instagram</h2>
                <p className="text-sm text-gray-500">Compte Instagram officiel</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'utilisateur Instagram
              </label>
              <Input
                value={formData.instagram || ''}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@onesms.sn"
              />
            </div>
          </Card>

          {/* Address Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Adresse</h2>
                <p className="text-sm text-gray-500">Localisation de l'entreprise</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville / Pays
                </label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Dakar, Sénégal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Détails supplémentaires
                </label>
                <Input
                  value={formData.address_detail || ''}
                  onChange={(e) => handleChange('address_detail', e.target.value)}
                  placeholder="Afrique de l'Ouest"
                />
              </div>
            </div>
          </Card>

          {/* Hours Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Horaires d'ouverture</h2>
                <p className="text-sm text-gray-500">Heures de disponibilité</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lundi - Vendredi
                </label>
                <Input
                  value={formData.hours_weekday || ''}
                  onChange={(e) => handleChange('hours_weekday', e.target.value)}
                  placeholder="Lundi - Vendredi: 9h - 18h"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Samedi
                </label>
                <Input
                  value={formData.hours_saturday || ''}
                  onChange={(e) => handleChange('hours_saturday', e.target.value)}
                  placeholder="Samedi: 9h - 14h"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimanche
                </label>
                <Input
                  value={formData.hours_sunday || ''}
                  onChange={(e) => handleChange('hours_sunday', e.target.value)}
                  placeholder="Dimanche: Fermé"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">Aperçu</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">📧 Email</div>
              <div className="text-blue-600">{formData.email}</div>
              <div className="text-gray-500 text-xs mt-1">{formData.email_response_time}</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">💬 WhatsApp</div>
              <div className="text-green-600">{formData.whatsapp}</div>
              <div className="text-gray-500 text-xs mt-1">{formData.whatsapp_hours}</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">📍 Adresse</div>
              <div className="text-purple-600">{formData.address}</div>
              <div className="text-gray-500 text-xs mt-1">{formData.address_detail}</div>
            </div>
          </div>
        </Card>
      </div>
  );
}
