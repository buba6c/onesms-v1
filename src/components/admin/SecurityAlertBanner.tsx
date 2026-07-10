import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, ShieldCheck, X, Bell, ChevronDown, ChevronUp, AlertTriangle, Skull } from 'lucide-react';

interface SecurityAlert {
  id: string;
  alert_type: string;
  provider: string;
  severity: string;
  message: string;
  details: any;
  acknowledged: boolean;
  created_at: string;
}

export default function SecurityAlertBanner() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch unacknowledged alerts
  const fetchAlerts = async () => {
    const { data } = await (supabase as any)
      .from('security_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setAlerts(data);
  };

  useEffect(() => {
    fetchAlerts();
    // Real-time subscription
    const channel = supabase.channel('security-alerts-admin')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    // Poll every 2 minutes as backup
    const interval = setInterval(fetchAlerts, 120000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const acknowledgeAlert = async (id: string) => {
    await (supabase as any)
      .from('security_alerts')
      .update({ acknowledged: true })
      .eq('id', id);
    setDismissed(prev => new Set(prev).add(id));
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 300);
  };

  const acknowledgeAll = async () => {
    const ids = alerts.map(a => a.id);
    await (supabase as any)
      .from('security_alerts')
      .update({ acknowledged: true })
      .in('id', ids);
    setAlerts([]);
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id) && a.alert_type !== 'email_pending');
  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = visibleAlerts.filter(a => a.severity === 'warning').length;

  if (visibleAlerts.length === 0) return null;

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical') return <Skull className="w-4 h-4 text-red-400 shrink-0" />;
    if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    return <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffMin < 1440) return `il y a ${Math.floor(diffMin / 60)}h`;
    return d.toLocaleDateString('fr-FR');
  };

  return (
    <div className="mb-4">
      {/* Header Banner */}
      <div 
        className={`
          rounded-xl overflow-hidden border cursor-pointer transition-all duration-300
          ${criticalCount > 0 
            ? 'bg-gradient-to-r from-red-950/80 to-red-900/40 border-red-800/50' 
            : 'bg-gradient-to-r from-amber-950/80 to-amber-900/40 border-amber-800/50'}
        `}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${criticalCount > 0 ? 'bg-red-500/20' : 'bg-amber-500/20'}
            `}>
              <ShieldAlert className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {criticalCount > 0 
                  ? `🚨 ${criticalCount} alerte${criticalCount > 1 ? 's' : ''} critique${criticalCount > 1 ? 's' : ''}`
                  : `⚠️ ${warningCount} alerte${warningCount > 1 ? 's' : ''} de sécurité`}
              </p>
              <p className="text-xs text-slate-400">
                {visibleAlerts.length} alerte{visibleAlerts.length > 1 ? 's' : ''} non acquittée{visibleAlerts.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); acknowledgeAll(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all font-medium"
            >
              Tout acquitter
            </button>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Expanded Alert List */}
        {expanded && (
          <div className="border-t border-white/10 max-h-[300px] overflow-y-auto">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`
                  px-4 py-3 border-b border-white/5 flex items-start gap-3 group
                  hover:bg-white/5 transition-all
                  ${dismissed.has(alert.id) ? 'opacity-0 scale-95' : 'opacity-100'}
                `}
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{formatTime(alert.created_at)}</span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full font-medium
                      ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' 
                        : alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'}
                    `}>
                      {alert.provider === 'sms_activate' ? 'HeroSMS' : alert.provider}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); acknowledgeAlert(alert.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 transition-all"
                  title="Acquitter"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
