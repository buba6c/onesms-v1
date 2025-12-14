import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { contactMessagesApi, ContactMessage } from '@/lib/api/contactMessages';
import {
  Mail,
  MessageSquare,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  X,
  User,
  Calendar,
  ArrowLeft,
  Send,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  read: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  replied: 'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  read: 'Lu',
  replied: 'Répondu',
  archived: 'Archivé',
};

export default function AdminContactMessages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Fetch messages
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-contact-messages', statusFilter],
    queryFn: () => contactMessagesApi.getAllMessages(statusFilter),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessage['status'] }) =>
      contactMessagesApi.updateMessageStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      toast({ title: 'Statut mis à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactMessagesApi.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      setSelectedMessage(null);
      toast({ title: 'Message supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le message', variant: 'destructive' });
    },
  });

  // Filter messages by search query
  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.name.toLowerCase().includes(query) ||
      msg.email.toLowerCase().includes(query) ||
      msg.subject.toLowerCase().includes(query) ||
      msg.message.toLowerCase().includes(query)
    );
  });

  // Handle viewing a message
  const handleViewMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);
    if (message.status === 'new') {
      await updateStatusMutation.mutateAsync({ id: message.id, status: 'read' });
    }
  };

  // Count by status
  const newCount = messages.filter((m) => m.status === 'new').length;

  // Handle sending reply email
  const handleSendReply = async () => {
    if (!selectedMessage || !replyMessage.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez saisir un message', variant: 'destructive' });
      return;
    }

    setIsSendingReply(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Send email via send-email function (we'll create a new template for admin replies)
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
            replyMessage: replyMessage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Update message status to replied
      await updateStatusMutation.mutateAsync({ id: selectedMessage.id, status: 'replied' });

      toast({ title: 'Réponse envoyée', description: `Email envoyé à ${selectedMessage.email}` });
      setReplyMessage('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer la réponse', variant: 'destructive' });
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Messages de Contact
            {newCount > 0 && (
              <Badge className="bg-red-500 text-white ml-2">{newCount} nouveau{newCount > 1 ? 'x' : ''}</Badge>
            )}
          </h1>
          <p className="text-gray-500">Gérez les messages reçus via le formulaire de contact</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, sujet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {['all', 'new', 'read', 'replied', 'archived'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'Tous' : statusLabels[status]}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 space-y-3">
          {isLoading ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Chargement...</p>
            </Card>
          ) : filteredMessages.length === 0 ? (
            <Card className="p-8 text-center">
              <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucun message</p>
            </Card>
          ) : (
            filteredMessages.map((message) => (
              <Card
                key={message.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''
                } ${message.status === 'new' ? 'border-l-4 border-l-blue-500' : ''}`}
                onClick={() => handleViewMessage(message)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate">{message.name}</span>
                      <Badge className={statusColors[message.status]} variant="outline">
                        {statusLabels[message.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{message.subject}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(message.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {selectedMessage.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedMessage.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(selectedMessage.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
                <Badge className={statusColors[selectedMessage.status]} variant="outline">
                  {statusLabels[selectedMessage.status]}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Message</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.message}
                  </p>
                </div>
              </div>

              {/* Reply Form */}
              {showReplyForm ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Répondre à {selectedMessage.name}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Écrivez votre réponse ici..."
                    rows={6}
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSendingReply ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer la réponse
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowReplyForm(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(true);
                    setReplyMessage('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Répondre par email
                </Button>

                {selectedMessage.status !== 'replied' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, status: 'replied' })}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marquer comme répondu
                  </Button>
                )}

                {selectedMessage.status !== 'archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, status: 'archived' })}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archiver
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Supprimer ce message ?')) {
                      deleteMutation.mutate(selectedMessage.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Eye className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Sélectionnez un message pour voir les détails</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
