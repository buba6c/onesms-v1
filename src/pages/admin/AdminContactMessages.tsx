import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactMessagesApi, ContactMessage } from '@/lib/api/contactMessages';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Inbox,
  Archive,
  Star,
  Trash2,
  Reply,
  MoreVertical,
  CheckCircle2,
  Mail,
  User,
  Clock,
  Send,
  Loader2,
  X,
  ChevronLeft,
  Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function AdminContactMessages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // --- DATA FETCHING ---
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: () => contactMessagesApi.getAllMessages('all'),
    refetchInterval: 30000,
  });

  // --- MUTATIONS ---
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessage['status'] }) =>
      contactMessagesApi.updateMessageStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      // Don't toast for small status changes to keep it clean, or maybe a small one
      if (variables.status === 'archived') {
        toast({ title: 'Message archivé' });
        if (selectedId === variables.id) setSelectedId(null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactMessagesApi.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      toast({ title: 'Message supprimé' });
      setSelectedId(null);
    },
  });

  // --- FILTERING ---
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q)
      );
    }

    // Sort by date desc
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [messages, statusFilter, searchQuery]);

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId),
    [messages, selectedId]
  );

  // --- ACTIONS ---
  const handleSelect = (id: string) => {
    setSelectedId(id);
    const msg = messages.find((m) => m.id === id);
    if (msg && msg.status === 'new') {
      updateStatusMutation.mutate({ id, status: 'read' });
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSending(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          type: 'admin_reply',
          email: selectedMessage.email,
          data: {
            name: selectedMessage.name,
            originalSubject: selectedMessage.subject,
            replyMessage: replyText,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to send');

      await updateStatusMutation.mutateAsync({ id: selectedMessage.id, status: 'replied' });
      toast({ title: 'Réponse envoyée avec succès' });
      setIsReplyOpen(false);
      setReplyText('');
    } catch (error) {
      toast({ title: 'Erreur', description: "L'envoi a échoué", variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  // --- UTILS ---
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500';
      case 'replied':
        return 'bg-green-500';
      case 'archived':
        return 'bg-gray-400';
      default: // read
        return 'bg-secondary';
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* LEFT SIDEBAR - MESSAGE LIST */}
      <div className={cn("w-full md:w-1/3 min-w-[320px] flex flex-col border-r bg-gray-50/50", selectedId ? "hidden md:flex" : "flex")}>

        {/* Header / Search */}
        <div className="p-4 border-b space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-800">Boîte de réception</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {messages.filter(m => m.status === 'new').length} nouveaux
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'new', label: 'Non lus' },
              { id: 'replied', label: 'Répondus' },
              { id: 'archived', label: 'Archivés' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap",
                  statusFilter === filter.id
                    ? "bg-slate-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <Inbox className="w-12 h-12 mb-2 opacity-50" />
              <p>Aucun message trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleSelect(message.id)}
                  className={cn(
                    "group p-4 cursor-pointer hover:bg-white transition-all relative",
                    selectedId === message.id ? "bg-white border-l-4 border-l-blue-600 shadow-sm z-10" : "bg-transparent border-l-4 border-l-transparent",
                    message.status === 'new' && selectedId !== message.id ? "bg-blue-50/40" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor(message.status))} />
                      <span className={cn("truncate text-sm", message.status === 'new' ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                        {message.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">
                      {format(new Date(message.created_at), 'dd MMM', { locale: fr })}
                    </span>
                  </div>

                  <div className={cn("text-sm mb-1 truncate", message.status === 'new' ? "font-semibold text-slate-800" : "text-slate-600")}>
                    {message.subject}
                  </div>

                  <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {message.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT MAIN - DETAIL VIEW */}
      <div className={cn("flex-1 flex flex-col bg-slate-50/30", !selectedId ? "hidden md:flex" : "flex w-full fixed inset-0 md:relative md:w-auto z-20 bg-white md:bg-transparent")}>
        {selectedMessage ? (
          <>
            {/* Detail Header */}
            <div className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedId(null)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(selectedMessage.id)}>
                        <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500 transition-colors" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Supprimer</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateStatusMutation.mutate({
                          id: selectedMessage.id,
                          status: selectedMessage.status === 'archived' ? 'read' : 'archived'
                        })}
                      >
                        <Archive className={cn("w-4 h-4 transition-colors", selectedMessage.status === 'archived' ? "text-blue-500" : "text-slate-500 hover:text-blue-500")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{selectedMessage.status === 'archived' ? 'Désarchiver' : 'Archiver'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center text-sm text-gray-400">
                <Clock className="w-3 h-3 mr-1.5" />
                {format(new Date(selectedMessage.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-3xl mx-auto space-y-8">

                {/* Subject & Meta */}
                <div className="space-y-6">
                  {/* Subject Line */}
                  <div className="flex items-start justify-between gap-4 border-b pb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={cn("uppercase text-[10px] tracking-wider h-6",
                        selectedMessage.status === 'replied' ? "border-green-200 text-green-700 bg-green-50" :
                          selectedMessage.status === 'new' ? "border-blue-200 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600"
                      )}>
                        {selectedMessage.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Sender Info Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200 shadow-sm">
                        {getInitials(selectedMessage.name)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-slate-900 text-base">{selectedMessage.name}</span>
                          <span className="text-sm text-slate-500 hidden sm:inline">&lt;{selectedMessage.email}&gt;</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <span>à</span>
                          <span className="font-medium text-slate-700">Support OneSMS</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-sm text-slate-900 font-medium">
                        {format(new Date(selectedMessage.created_at), 'd MMMM yyyy', { locale: fr })}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(selectedMessage.created_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[200px] relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-t-xl" />
                  <div className="prose prose-slate max-w-none">
                    {selectedMessage.message ? (
                      <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap font-normal">
                        {selectedMessage.message}
                      </p>
                    ) : (
                      <p className="text-gray-400 italic text-center py-8">
                        (Aucun contenu texte)
                      </p>
                    )}
                  </div>
                </div>

                {/* Reply Section */}
                {isReplyOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-100"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Réponse à {selectedMessage.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsReplyOpen(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="p-4">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Écrivez votre réponse..."
                        className="min-h-[150px] border-0 focus-visible:ring-0 px-0 resize-none text-base"
                        autoFocus
                      />
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="text-gray-400">
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => setIsReplyOpen(false)}>Annuler</Button>
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            onClick={handleSendReply}
                            disabled={isSending || !replyText.trim()}
                          >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Envoyer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex gap-3 pt-6 border-t">
                    <Button
                      onClick={() => setIsReplyOpen(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-6"
                    >
                      <Reply className="w-4 h-4" />
                      Répondre
                    </Button>
                    <Button variant="outline" onClick={() => updateStatusMutation.mutate({
                      id: selectedMessage.id,
                      status: selectedMessage.status === 'archived' ? 'read' : 'archived'
                    })}>
                      {selectedMessage.status === 'archived' ? 'Désarchiver' : 'Archiver'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
            <Mail className="w-24 h-24 mb-6 opacity-20" />
            <p className="text-xl font-medium text-slate-400">Sélectionnez un message pour le lire</p>
          </div>
        )}
      </div>
    </div>
  );
}
