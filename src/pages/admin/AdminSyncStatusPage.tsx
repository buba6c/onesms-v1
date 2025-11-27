import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, TrendingUp, Database, Globe, Package } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SyncLog {
  id: string;
  sync_type: 'full' | 'partial' | 'manual';
  status: 'success' | 'partial' | 'error';
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  
  // Stats API
  api_services_count: number;
  api_countries_count: number;
  api_total_stock: number;
  
  // Stats DB
  db_services_total: number;
  db_services_active: number;
  
  // Modifications
  services_deactivated: number;
  services_added: number;
  services_reactivated: number;
  stocks_updated: number;
  
  // Erreurs
  error_count: number;
  error_details: any;
}

interface SyncStats {
  hour: string;
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  avg_duration: number;
  total_services_added: number;
  total_stocks_updated: number;
}

export default function AdminSyncStatusPage() {
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Dernière synchronisation
  const { data: latestSync, isLoading: isLoadingLatest, refetch: refetchLatest } = useQuery({
    queryKey: ['latest-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as SyncLog;
    },
    refetchInterval: 10000, // Refresh toutes les 10 secondes
  });

  // Historique des 10 dernières syncs
  const { data: recentSyncs, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recent-syncs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as SyncLog[];
    },
    refetchInterval: 30000, // Refresh toutes les 30 secondes
  });

  // Statistiques agrégées (dernières 24h)
  const { data: hourlyStats } = useQuery({
    queryKey: ['sync-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_stats')
        .select('*')
        .limit(24);
      
      if (error) throw error;
      return data as SyncStats[];
    },
    refetchInterval: 60000, // Refresh toutes les 60 secondes
  });

  // Déclencher sync manuelle
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    
    try {
      // Appeler API backend pour déclencher sync
      // (Vous devrez créer cette route)
      const response = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Attendre 5 secondes puis refresh
        setTimeout(() => {
          refetchLatest();
          setIsManualSyncing(false);
        }, 5000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Erreur sync manuelle:', error);
      setIsManualSyncing(false);
    }
  };

  // Calculer status global
  const getHealthStatus = () => {
    if (!latestSync) return 'unknown';
    
    const lastSyncTime = new Date(latestSync.completed_at).getTime();
    const now = Date.now();
    const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60);
    
    if (latestSync.status === 'error') return 'error';
    if (minutesSinceLastSync > 10) return 'warning'; // Plus de 10 min sans sync
    if (latestSync.status === 'success') return 'healthy';
    return 'partial';
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RefreshCw className="w-8 h-8" />
            Synchronisation Temps Réel
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoring de la synchronisation automatique avec SMS-Activate API
          </p>
        </div>

        <Button
          onClick={handleManualSync}
          disabled={isManualSyncing}
          size="lg"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
          {isManualSyncing ? 'Synchronisation...' : 'Sync Manuelle'}
        </Button>
      </div>

      {/* Status Global */}
      <Card className={`border-2 ${
        healthStatus === 'healthy' ? 'border-green-500' :
        healthStatus === 'warning' ? 'border-yellow-500' :
        healthStatus === 'error' ? 'border-red-500' :
        'border-gray-300'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {healthStatus === 'healthy' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              {healthStatus === 'warning' && <AlertCircle className="w-6 h-6 text-yellow-500" />}
              {healthStatus === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
              État du Système
            </span>
            <Badge variant={
              healthStatus === 'healthy' ? 'default' :
              healthStatus === 'warning' ? 'secondary' :
              healthStatus === 'error' ? 'destructive' :
              'outline'
            }>
              {healthStatus === 'healthy' && 'Opérationnel'}
              {healthStatus === 'warning' && 'Attention'}
              {healthStatus === 'error' && 'Erreur'}
              {healthStatus === 'unknown' && 'Inconnu'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLatest ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Chargement...
            </div>
          ) : latestSync ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dernière Sync</p>
                <p className="text-lg font-semibold">
                  {format(new Date(latestSync.completed_at), 'HH:mm:ss', { locale: fr })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(latestSync.completed_at), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="text-lg font-semibold">
                  {latestSync.duration_seconds.toFixed(2)}s
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Services Actifs</p>
                <p className="text-lg font-semibold text-green-600">
                  {latestSync.db_services_active?.toLocaleString() || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Stock Total API</p>
                <p className="text-lg font-semibold text-blue-600">
                  {latestSync.api_total_stock?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune synchronisation trouvée</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {latestSync && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Services API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {latestSync.api_services_count?.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pays Disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {latestSync.api_countries_count}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Services DB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">
                  {latestSync.db_services_total?.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stocks Mis à Jour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <span className="text-2xl font-bold">
                  {latestSync.stocks_updated}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dernières Modifications */}
      {latestSync && (latestSync.services_added > 0 || latestSync.services_deactivated > 0 || latestSync.services_reactivated > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Dernières Modifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {latestSync.services_added > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">+{latestSync.services_added}</Badge>
                  <span className="text-sm">Services ajoutés</span>
                </div>
              )}
              
              {latestSync.services_reactivated > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-500">↑{latestSync.services_reactivated}</Badge>
                  <span className="text-sm">Services réactivés</span>
                </div>
              )}
              
              {latestSync.services_deactivated > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">-{latestSync.services_deactivated}</Badge>
                  <span className="text-sm">Services désactivés</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique Récent */}
      <Card>
        <CardHeader>
          <CardTitle>Historique Récent</CardTitle>
          <CardDescription>10 dernières synchronisations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Chargement...
            </div>
          ) : recentSyncs && recentSyncs.length > 0 ? (
            <div className="space-y-2">
              {recentSyncs.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {sync.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {sync.status === 'partial' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                    {sync.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    
                    <div>
                      <p className="font-medium">
                        {format(new Date(sync.completed_at), 'dd MMM yyyy HH:mm:ss', { locale: fr })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sync.stocks_updated} stocks • {sync.duration_seconds.toFixed(1)}s
                        {sync.services_added > 0 && ` • +${sync.services_added} ajoutés`}
                        {sync.services_deactivated > 0 && ` • -${sync.services_deactivated} désactivés`}
                      </p>
                    </div>
                  </div>

                  <Badge variant={
                    sync.status === 'success' ? 'default' :
                    sync.status === 'partial' ? 'secondary' :
                    'destructive'
                  }>
                    {sync.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun historique disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Erreurs */}
      {latestSync?.error_count > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erreurs Détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-800">
                {latestSync.error_count} erreur(s) lors de la dernière synchronisation
              </p>
              {latestSync.error_details && (
                <pre className="text-xs mt-2 text-red-700 overflow-auto max-h-40">
                  {JSON.stringify(latestSync.error_details, null, 2)}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
