import { Bell, Info, AlertTriangle, CheckCircle, AlertCircle, Sparkles, Wrench, RefreshCw, Gift, Newspaper } from 'lucide-react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationBellProps {
  isTransparent?: boolean;
}

export function NotificationBell({ isTransparent = false }: NotificationBellProps) {
  const { data: announcements } = useAnnouncements();
  const { i18n, t } = useTranslation();

  // Filter announcements that should be shown in the header
  const headerAnnouncements = announcements?.filter(a => a.show_in_header) || [];
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-primary" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-primary" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'promotional': return <Sparkles className="h-4 w-4 text-primary" />;
      case 'maintenance': return <Wrench className="h-4 w-4 text-primary" />;
      case 'update': return <RefreshCw className="h-4 w-4 text-primary" />;
      case 'gift': return <Gift className="h-4 w-4 text-primary" />;
      case 'alert': return <Bell className="h-4 w-4 text-primary" />;
      case 'news': return <Newspaper className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getBadgeColor = (type: string) => {
    // Use primary brand color for all badges
    return 'bg-primary/10 text-primary border-primary/20';
  };

  const handleNotificationClick = (announcement: any) => {
    // Open the popup matching the notification
    window.dispatchEvent(new CustomEvent('open-popup', { detail: announcement }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative p-2.5 rounded-xl transition-all duration-200 border ${
            isTransparent
              ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              : 'hover:bg-gray-100 border-gray-200 text-gray-700'
          }`}
        >
          <Bell className="w-5 h-5" />
          {headerAnnouncements.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="center" 
        sideOffset={16}
        collisionPadding={16} 
        className="w-[calc(100vw-32px)] sm:w-96 max-w-[400px] p-0 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 z-[100]"
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 border-b border-primary/20 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl transform"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl transform"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <h3 className="font-black text-xl text-white tracking-wide">Notifications</h3>
            {headerAnnouncements.length > 0 && (
              <span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-sm animate-pulse">
                {headerAnnouncements.length} {headerAnnouncements.length > 1 ? 'nouvelles' : 'nouvelle'}
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="h-[350px]">
          {headerAnnouncements.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm">Aucune notification pour le moment</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {headerAnnouncements.map((announcement, index) => (
                <div 
                  key={announcement.id}
                  onClick={() => handleNotificationClick(announcement)}
                  className={`p-5 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both ${
                    index !== headerAnnouncements.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md group-hover:border-primary/20">
                        {getIcon(announcement.type)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-primary transition-colors">
                          {announcement.title}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                          {formatDistanceToNow(new Date(announcement.created_at), { 
                            addSuffix: true,
                            locale: i18n.language === 'fr' ? fr : enUS 
                          })}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {announcement.content}
                      </p>
                      <div className="pt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-bold border uppercase tracking-widest ${getBadgeColor(announcement.type)} shadow-sm`}>
                          {announcement.type === 'info' ? 'Info' : announcement.type === 'warning' ? 'Avertissement' : announcement.type === 'error' ? 'Urgent' : announcement.type === 'success' ? 'Succès' : announcement.type === 'promotional' ? 'Promo' : announcement.type === 'maintenance' ? 'Maintenance' : announcement.type === 'update' ? 'Mise à jour' : announcement.type === 'gift' ? 'Cadeau' : announcement.type === 'alert' ? 'Alerte' : announcement.type === 'news' ? 'Nouveauté' : 'Info'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {headerAnnouncements.length > 0 && (
          <div className="p-3 border-t border-primary/10 bg-primary/5 dark:bg-primary/10 flex items-center justify-center">
            <span className="text-[11px] text-primary uppercase tracking-[0.2em] font-black text-center w-full">
              ONE SMS SYSTEM
            </span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
