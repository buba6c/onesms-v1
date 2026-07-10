import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info, AlertTriangle, CheckCircle, Plus, Trash2, Edit, Bell, Sparkles, LayoutTemplate, Target, Eye, Wrench, RefreshCw, Gift, Newspaper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AnnouncementsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    title: '',
    content: '',
    type: 'info',
    is_active: false,
    show_as_popup: false,
    show_in_header: true,
    target_type: 'all',
    target_users: '[]',
    design_template: 'default',
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const dataToSave = {
        ...payload,
        target_users: payload.target_type === 'specific_users' ? JSON.parse(payload.target_users || '[]') : [],
        start_date: payload.start_date ? new Date(payload.start_date).toISOString() : null,
        end_date: payload.end_date ? new Date(payload.end_date).toISOString() : null,
      };
      
      let result;
      if (editingId) {
        result = await (supabase.from('system_announcements') as any).update(dataToSave as any).eq('id', editingId);
      } else {
        result = await (supabase.from('system_announcements') as any).insert(dataToSave as any);
      }
      
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
      setIsOpen(false);
      resetForm();
      toast({ title: '✅ Sauvegarde réussie', description: 'La notification a été enregistrée.' });
    },
    onError: (error: any) => {
      console.error('Error saving announcement:', error);
      toast({ title: '❌ Erreur de sauvegarde', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_announcements').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
      toast({ title: '🗑️ Notification supprimée' });
    },
    onError: (error: any) => {
      toast({ title: '❌ Erreur de suppression', description: error.message, variant: 'destructive' });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await (supabase.from('system_announcements') as any).update({ is_active }).eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
    },
    onError: (error: any) => {
      toast({ title: '❌ Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      type: 'info',
      is_active: true,
      show_as_popup: false,
      show_in_header: true,
      target_type: 'all',
      target_users: '[]',
      design_template: 'default',
      color_theme: 'primary',
      start_date: '',
      end_date: '',
    });
  };

  const handleEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      is_active: announcement.is_active,
      show_as_popup: announcement.show_as_popup,
      show_in_header: announcement.show_in_header,
      target_type: announcement.target_type || 'all',
      target_users: JSON.stringify(announcement.target_users || []),
      design_template: announcement.design_template || 'default',
      color_theme: announcement.color_theme || 'primary',
      start_date: announcement.start_date ? new Date(announcement.start_date).toISOString().slice(0, 16) : '',
      end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().slice(0, 16) : '',
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(formData);
  };

  const handlePreview = (announcement: any) => {
    window.dispatchEvent(new CustomEvent('open-popup', { detail: announcement }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'promotional': return <Sparkles className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Popups & Notifications</h2>
          <p className="text-gray-500 text-sm">Gérez les messages système envoyés aux utilisateurs.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] rounded-2xl flex flex-col md:flex-row p-0 overflow-hidden gap-0">
            <div className="w-full md:w-1/2 p-6 overflow-y-auto max-h-[85vh] custom-scrollbar">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Modifier la notification' : 'Créer une notification'}</DialogTitle>
              </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  placeholder="Ex: Maintenance serveur" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu (Texte)</Label>
                <Textarea 
                  id="content" 
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})} 
                  placeholder="Écrivez votre message ici..." 
                  className="min-h-[100px]"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de message</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (Bleu)</SelectItem>
                      <SelectItem value="warning">Avertissement (Orange)</SelectItem>
                      <SelectItem value="error">Erreur / Urgent (Rouge)</SelectItem>
                      <SelectItem value="success">Succès (Vert)</SelectItem>
                      <SelectItem value="promotional">Promotionnel (Violet)</SelectItem>
                      <SelectItem value="maintenance">Maintenance (Clé anglaise)</SelectItem>
                      <SelectItem value="update">Mise à jour (Rafraîchissement)</SelectItem>
                      <SelectItem value="gift">Cadeau / Offre (Cadeau)</SelectItem>
                      <SelectItem value="alert">Alerte (Cloche)</SelectItem>
                      <SelectItem value="news">Nouveauté (Journal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modèle (Design Popup)</Label>
                  <Select value={formData.design_template} onValueChange={(val) => setFormData({...formData, design_template: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Modèle de design" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Défaut (Classique)</SelectItem>
                      <SelectItem value="modern">Moderne (Épuré)</SelectItem>
                      <SelectItem value="glassmorphism">Glassmorphism (Premium)</SelectItem>
                      <SelectItem value="neon">Néon (Cyber)</SelectItem>
                      <SelectItem value="elegant">Élégant (Minimaliste)</SelectItem>
                      <SelectItem value="playful">Playful (Animé & Ludique)</SelectItem>
                      <SelectItem value="brutalism">Néo-Brutalisme (Audacieux)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Couleur Principale (Thème)</Label>
                  <Select value={formData.color_theme} onValueChange={(val) => setFormData({...formData, color_theme: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Couleur du popup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Bleu Logo (Marque)</SelectItem>
                      <SelectItem value="secondary">Gris Élégant (Secondaire)</SelectItem>
                      <SelectItem value="danger">Rouge (Urgent/Erreur)</SelectItem>
                      <SelectItem value="warning">Orange (Avertissement)</SelectItem>
                      <SelectItem value="success">Vert (Succès)</SelectItem>
                      <SelectItem value="dark">Noir (Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début (Optionnel)</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.start_date} 
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin (Optionnel)</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.end_date} 
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ciblage Utilisateurs</Label>
                <Select value={formData.target_type} onValueChange={(val) => setFormData({...formData, target_type: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Qui verra ce message ?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    <SelectItem value="positive_balance">Utilisateurs avec Solde Positif</SelectItem>
                    <SelectItem value="negative_balance">Utilisateurs avec Solde Zéro/Négatif</SelectItem>
                    <SelectItem value="specific_users">Utilisateurs spécifiques (Emails/IDs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.target_type === 'specific_users' && (
                <div className="space-y-2">
                  <Label htmlFor="target_users">Liste des cibles (JSON Array d'emails)</Label>
                  <Textarea 
                    id="target_users" 
                    value={formData.target_users} 
                    onChange={(e) => setFormData({...formData, target_users: e.target.value})} 
                    placeholder='["user1@example.com", "user2@example.com"]' 
                    className="min-h-[60px] font-mono text-sm"
                  />
                  <p className="text-[10px] text-gray-500">Format requis: ["email1", "email2"]. Utilisateurs exacts uniquement.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold text-gray-900">Actif</Label>
                    <p className="text-xs text-gray-500">Activer ou désactiver cette annonce globalement.</p>
                  </div>
                  <Switch 
                    checked={formData.is_active} 
                    onCheckedChange={(c) => setFormData({...formData, is_active: c})} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold text-gray-900">Afficher comme Popup</Label>
                    <p className="text-xs text-gray-500">S'affichera au milieu de l'écran (1 seule fois par utilisateur).</p>
                  </div>
                  <Switch 
                    checked={formData.show_as_popup} 
                    onCheckedChange={(c) => setFormData({...formData, show_as_popup: c})} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold text-gray-900">Afficher dans la Cloche</Label>
                    <p className="text-xs text-gray-500">S'affichera dans le menu de notifications du header.</p>
                  </div>
                  <Switch 
                    checked={formData.show_in_header} 
                    onCheckedChange={(c) => setFormData({...formData, show_in_header: c})} 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Créer')}
              </Button>
            </form>
            </div>
            {/* Live Preview Panel */}
            <div className="hidden md:flex w-full md:w-1/2 bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-4 w-full text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-800 px-3 py-1 rounded-full border shadow-sm">Prévisualisation en temps réel</span>
              </div>
              <div className="w-full transform scale-90 origin-center transition-all duration-300">
                <LivePopupPreview formData={formData} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">Chargement des notifications...</div>
        ) : announcements?.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Bell className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune notification système</h3>
            <p className="text-sm text-gray-500 max-w-md">Créez votre première notification ou popup pour informer vos utilisateurs de manière ciblée et élégante.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {announcements?.map((ann: any) => (
              <div key={ann.id} className={`flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group ${!ann.is_active ? 'opacity-75 grayscale-[20%]' : ''}`}>
                
                {/* Visual Preview Header representing the design template */}
                <div className={`h-28 relative flex items-center justify-center transition-all duration-500 overflow-hidden ${
                  ann.design_template === 'modern' ? 'bg-primary/5 rounded-b-[2rem] mx-2 mt-2 shadow-inner' : 
                  ann.design_template === 'neon' ? 'bg-gray-950 border-b border-primary/30 shadow-[inset_0_-10px_20px_rgba(var(--primary),0.1)]' : 
                  ann.design_template === 'glassmorphism' ? 'bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-md' :
                  ann.design_template === 'elegant' ? 'bg-[#FAFAFA] border-b border-gray-200' :
                  ann.design_template === 'playful' ? 'bg-gradient-to-tr from-primary/20 via-pink-500/10 to-yellow-500/10 rounded-[2rem] m-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden' :
                  ann.design_template === 'brutalism' ? 'bg-white border-b-4 border-black' :
                  'bg-white border-b border-gray-100'} p-6 relative`}
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className={`p-3 rounded-full 
                    ${ann.design_template === 'default' ? 'bg-primary/10' : 
                    ann.design_template === 'glassmorphism' ? 'bg-white/50 backdrop-blur-md border border-white/40 shadow-sm' : 
                    ann.design_template === 'neon' ? 'bg-gray-900 border border-primary/50 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-pulse' : 
                    ann.design_template === 'elegant' ? 'bg-transparent opacity-80' :
                    ann.design_template === 'playful' ? 'bg-white shadow-[0_4px_15px_rgba(0,0,0,0.1)] animate-bounce' :
                    ann.design_template === 'brutalism' ? 'bg-primary border-2 border-black rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] text-white' :
                    'bg-white shadow-sm'}`}
                  >
                    {getTypeIcon(ann.type)}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm ${ann.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {ann.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h4 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{ann.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-5 flex-1 leading-relaxed">{ann.content}</p>
                  
                  {/* Badges/Tags */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-semibold flex items-center gap-1.5" title="Modèle de Design">
                      <LayoutTemplate className="h-3 w-3" /> <span className="capitalize">{ann.design_template}</span>
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-semibold flex items-center gap-1.5" title="Ciblage">
                      <Target className="h-3 w-3" /> 
                      {ann.target_type === 'all' ? 'Tous' : ann.target_type === 'positive_balance' ? 'Solde > 0' : ann.target_type === 'negative_balance' ? 'Solde ≤ 0' : 'Emails'}
                    </span>
                    {ann.show_as_popup && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">Popup</span>}
                    {ann.show_in_header && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-semibold">Cloche</span>}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 pl-2">
                    <Switch 
                      checked={ann.is_active} 
                      onCheckedChange={(c) => toggleStatusMutation.mutate({ id: ann.id, is_active: c })} 
                      className="scale-90"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(ann)} className="text-indigo-600 hover:bg-indigo-100 h-9 px-3 rounded-xl font-semibold" title="Aperçu visuel">
                      <Eye className="h-4 w-4 mr-1.5" /> Voir
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ann)} className="text-blue-600 hover:bg-blue-100 h-9 w-9 rounded-xl" title="Modifier">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ann.id)} className="text-red-600 hover:bg-red-100 h-9 w-9 rounded-xl" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------
// LIVE PREVIEW COMPONENT
// ------------------------------------
function LivePopupPreview({ formData }: { formData: any }) {
  const getIcon = () => {
    const colorClass = formData.color_theme === 'danger' ? 'text-red-500' :
                       formData.color_theme === 'warning' ? 'text-amber-500' :
                       formData.color_theme === 'success' ? 'text-emerald-500' :
                       formData.color_theme === 'secondary' ? 'text-slate-500' :
                       formData.color_theme === 'dark' ? 'text-gray-900' :
                       'text-primary';

    switch (formData.type) {
      case 'warning': return <AlertTriangle className={`h-8 w-8 ${colorClass}`} />;
      case 'error': return <AlertTriangle className={`h-8 w-8 ${colorClass}`} />;
      case 'success': return <CheckCircle className={`h-8 w-8 ${colorClass}`} />;
      case 'promotional': return <Sparkles className={`h-8 w-8 ${colorClass}`} />;
      case 'maintenance': return <Wrench className={`h-8 w-8 ${colorClass}`} />;
      case 'update': return <RefreshCw className={`h-8 w-8 ${colorClass}`} />;
      case 'gift': return <Gift className={`h-8 w-8 ${colorClass}`} />;
      case 'alert': return <Bell className={`h-8 w-8 ${colorClass}`} />;
      case 'news': return <Newspaper className={`h-8 w-8 ${colorClass}`} />;
      default: return <Info className={`h-8 w-8 ${colorClass}`} />;
    }
  };

  const getGradient = () => {
    switch (formData.color_theme) {
      case 'secondary': return 'from-slate-600 to-slate-500';
      case 'danger': return 'from-red-600 to-red-500';
      case 'warning': return 'from-amber-500 to-amber-400';
      case 'success': return 'from-emerald-600 to-emerald-500';
      case 'dark': return 'from-gray-900 to-gray-800';
      default: return 'from-primary to-primary/80';
    }
  };

  const title = formData.title || 'Titre de la notification';
  const content = formData.content || 'Le contenu de votre notification s\'affichera ici...';

  // We wrap the preview in a div that fakes the DialogContent look
  const wrapperClass = "relative w-full max-w-[400px] shadow-2xl mx-auto rounded-3xl overflow-hidden pointer-events-none";

  if (formData.design_template === 'modern') {
    return (
      <div className={`${wrapperClass} bg-white dark:bg-slate-900 p-6`}>
        <div className="flex flex-col items-center text-center mt-4">
          <div className={`p-4 rounded-3xl bg-gradient-to-br ${getGradient()} shadow-lg mb-6`}>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl">
              {getIcon()}
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h2>
          <div className="mt-4 text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed line-clamp-4">{content}</div>
          <div className="w-full mt-8">
            <div className={`w-full py-4 rounded-2xl font-bold text-center text-white bg-gradient-to-r ${getGradient()}`}>D'accord, c'est noté</div>
          </div>
        </div>
      </div>
    );
  }

  if (formData.design_template === 'glassmorphism') {
    return (
      <div className={`${wrapperClass} p-8 bg-white/70 dark:bg-slate-900/70 border border-white/20 backdrop-blur-xl`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-10`}></div>
        <div className="relative">
          <div className={`p-3 rounded-2xl bg-white/50 inline-block mb-6`}>{getIcon()}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
          <div className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-4">{content}</div>
          <div className="mt-8">
            <div className="w-full text-center py-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 font-semibold border border-white/50">Continuer</div>
          </div>
        </div>
      </div>
    );
  }

  if (formData.design_template === 'neon') {
    return (
      <div className={`${wrapperClass} bg-gray-900 p-1 border border-gray-800`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${getGradient()} opacity-50`}></div>
        <div className="relative bg-gray-950 p-8 rounded-[20px] h-full flex flex-col items-center text-center">
          <div className={`p-1 rounded-full bg-gradient-to-r ${getGradient()} mb-6`}>
            <div className="bg-gray-950 p-3 rounded-full">{getIcon()}</div>
          </div>
          <h2 className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${getGradient()} uppercase tracking-wider`}>{title}</h2>
          <div className="mt-4 text-gray-400 text-sm line-clamp-4">{content}</div>
          <div className="w-full mt-8">
            <div className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 border border-gray-800">Fermer</div>
          </div>
        </div>
      </div>
    );
  }

  // Elegant Template
  if (formData.design_template === 'elegant') {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-[400px] p-8 border border-gray-200 shadow-xl rounded-none bg-[#FAFAFA] relative">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 opacity-80">{getIcon()}</div>
            <div className="w-8 h-px bg-gray-300 mb-4"></div>
            <h3 className="text-xl font-serif text-gray-900 font-light tracking-wide mb-3">{formData.title || 'Titre de l\'annonce'}</h3>
            <p className="text-gray-500 text-xs leading-loose font-serif">{formData.content || 'Contenu de l\'annonce apparaîtra ici. C\'est un design élégant et minimal.'}</p>
            <div className="w-full mt-6">
              <div className="rounded-xl bg-primary text-white px-8 py-3 uppercase tracking-widest text-[10px] font-semibold text-center shadow-md">Continuer</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playful Template
  if (formData.design_template === 'playful') {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-[400px] p-6 border-0 shadow-2xl rounded-[2.5rem] bg-white relative overflow-hidden">
          <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${getGradient()} opacity-20 rounded-full blur-2xl animate-pulse`}></div>
          <div className={`absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr ${getGradient()} opacity-20 rounded-full blur-2xl animate-pulse delay-700`}></div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className={`mb-4 p-4 rounded-full bg-white shadow-xl animate-bounce`}>
              {getIcon()}
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{formData.title || 'Titre de l\'annonce'}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">{formData.content || 'Contenu de l\'annonce apparaîtra ici. C\'est un design très ludique, arrondi et animé.'}</p>
            <div className="w-full">
              <div className={`w-full rounded-full py-4 text-sm font-bold text-white bg-gradient-to-r ${getGradient()} text-center shadow-lg transform transition-transform hover:scale-105`}>
                Génial !
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Brutalism Template
  if (formData.design_template === 'brutalism') {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4 bg-[#e5e5e5] dark:bg-gray-900 pattern-isometric">
        <div className="w-full max-w-[400px] p-6 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4f4f0] relative">
          <div className="flex items-start gap-4">
            <div className={`p-3 bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]`}>
              {getIcon()}
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-2">{formData.title || 'Titre de l\'annonce'}</h3>
              <p className="text-black/80 text-sm leading-relaxed font-mono">{formData.content || 'Contenu brut et direct. Pas de chichis, juste l\'information importante dans un style Néo-Brutaliste.'}</p>
            </div>
          </div>
          <div className="w-full mt-6">
            <div className={`w-full py-3 text-sm font-black text-white bg-black border-2 border-black text-center shadow-[4px_4px_0px_rgba(0,0,0,0.5)]`}>
              OK J'AI COMPRIS
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Template
  return (
    <div className={`${wrapperClass} bg-white dark:bg-slate-900`}>
      <div className={`h-24 w-full bg-gradient-to-r ${getGradient()} relative flex items-center justify-center`}>
        <div className="relative z-10 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-lg mt-12">{getIcon()}</div>
      </div>
      <div className="p-6 pt-10 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-4">{content}</div>
        <div className="pt-4 pb-2">
          <div className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${getGradient()}`}>Compris</div>
        </div>
      </div>
    </div>
  );
}
