import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Loader2,
    Bot,
    Settings as SettingsIcon,
    MessageSquare,
    Send,
    User,
    RefreshCw,
    TerminalSquare,
    KeySquare,
    Sparkles,
    Check,
    ArrowLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

export default function AdminSupport() {
    const { t } = useTranslation()
    const { toast } = useToast()

    const formatConversationDate = (dateString: string) => {
        const date = new Date(dateString);
        if (isToday(date)) return format(date, 'HH:mm', { locale: fr });
        if (isYesterday(date)) return 'Hier';
        return format(date, 'dd MMM', { locale: fr });
    };

    const getInitials = (nameOrEmail: string) => {
        if (!nameOrEmail) return '?'
        return nameOrEmail.substring(0, 2).toUpperCase()
    }

    // --- SETTINGS STATE ---
    const [supportEnabled, setSupportEnabled] = useState(true)
    const [aiEnabled, setAiEnabled] = useState(true)
    const [systemPrompt, setSystemPrompt] = useState('')
    const [openAiKey, setOpenAiKey] = useState('')
    const [loadingSettings, setLoadingSettings] = useState(false)

    // --- CHAT STATE ---
    const [conversations, setConversations] = useState<any[]>([])
    const [selectedConversation, setSelectedConversation] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loadingChats, setLoadingChats] = useState(false)
    const [sending, setSending] = useState(false)
    const [usersError, setUsersError] = useState<string | null>(null)
    const [loadingMessages, setLoadingMessages] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchSettings()
        fetchConversations()

        const channel = supabase
            .channel('admin-support-conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, () => {
                fetchConversations()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    useEffect(() => {
        if (!selectedConversation) return

        fetchMessages(selectedConversation.id)

        const channel = supabase
            .channel(`admin-chat-${selectedConversation.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'support_messages',
                filter: `conversation_id=eq.${selectedConversation.id}`
            }, (payload) => {
                setMessages(prev => {
                    // Prevent duplicates in UI
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new]
                })
                scrollToBottom()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [selectedConversation])

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' })
            }
        }, 100)
    }

    const fetchSettings = async () => {
        setLoadingSettings(true)
        const { data, error } = await (supabase.from('support_settings' as any) as any).select('*')
        if (data) {
            data.forEach((setting: any) => {
                if (setting.key === 'support_enabled') setSupportEnabled(setting.value === 'true')
                if (setting.key === 'ai_enabled') setAiEnabled(setting.value === 'true')
                if (setting.key === 'system_prompt') setSystemPrompt(setting.value)
                if (setting.key === 'openai_api_key') setOpenAiKey(setting.value)
            })
        }
        setLoadingSettings(false)
    }

    const saveSettings = async () => {
        setLoadingSettings(true)
        const updates = [
            { key: 'support_enabled', value: String(supportEnabled) },
            { key: 'ai_enabled', value: String(aiEnabled) },
            { key: 'system_prompt', value: systemPrompt },
            { key: 'openai_api_key', value: openAiKey }
        ]

        for (const update of updates) {
            await (supabase.from('support_settings' as any) as any).upsert(update, { onConflict: 'key' })
        }

        toast({ title: "Configuration Sauvegardée", description: "Les paramètres du module Support ont été mis à jour avec succès." })
        setLoadingSettings(false)
    }

    const fetchConversations = async () => {
        setLoadingChats(true)
        setUsersError(null)
        try {
            const { data, error } = await (supabase.from('support_conversations' as any) as any)
                .select('*, users:user_id(id, email, name)')
                .order('updated_at', { ascending: false })

            if (error) throw error

            if (!data || data.length === 0) {
                setConversations([])
                return
            }

            const chats = data as any[]
            const merged = chats.map(chat => ({
                ...chat,
                users: chat.users ? { ...chat.users, full_name: chat.users.name || chat.users.email?.split('@')[0] } : { email: 'Unknown', full_name: 'Inconnu' }
            }))

            setConversations(merged)
        } catch (e: any) {
            console.error('Error fetching chats:', e)
            setUsersError(e.message || 'Erreur DB')
        } finally {
            setLoadingChats(false)
        }
    }

    const fetchMessages = async (conversationId: string) => {
        setLoadingMessages(true)
        try {
            const { data, error } = await (supabase.from('support_messages' as any) as any)
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(data || [])
            scrollToBottom()

            // Mark as read
            await (supabase.from('support_conversations' as any) as any)
                .update({ unread_admin: 0 })
                .eq('id', conversationId)
                
            // Update local state to remove red dot
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_admin: 0 } : c))
        } catch (e) {
            console.error('Error fetching messages:', e)
        } finally {
            setLoadingMessages(false)
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return

        setSending(true)
        try {
            const { error } = await (supabase.from('support_messages' as any) as any).insert({
                conversation_id: selectedConversation.id,
                sender_role: 'admin',
                content: newMessage.trim()
            })

            if (error) throw error

            setNewMessage('')
            
            await (supabase.from('support_conversations' as any) as any).update({
                updated_at: new Date().toISOString(),
                unread_user: (selectedConversation.unread_user || 0) + 1
            }).eq('id', selectedConversation.id)
            
        } catch (e: any) {
            toast({ title: "Erreur d'envoi", description: e.message, variant: "destructive" })
        } finally {
            setSending(false)
            // Auto scroll is handled by realtime insert
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-slate-700" />
                        Helpdesk & IA
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Inbox de support client centralisée et configuration du bot.</p>
                </div>
            </div>

            <Tabs defaultValue="chat" className="w-full">
                <TabsList className="bg-slate-100/50 p-1 mb-6">
                    <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <MessageSquare className="w-4 h-4" /> Inbox
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <TerminalSquare className="w-4 h-4" /> Automation Rules
                    </TabsTrigger>
                </TabsList>

                {/* --- CHAT TAB --- */}
                <TabsContent value="chat" className="mt-0 outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-[600px] lg:h-[700px]">
                        
                        {/* Inbox List (Left Panel) */}
                        <div className={`lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/30 h-full overflow-hidden ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
                                <span className="text-sm font-bold tracking-widest text-slate-900 uppercase">Conversations</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={fetchConversations} disabled={loadingChats}>
                                    <RefreshCw className={`w-4 h-4 ${loadingChats ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>

                            {usersError && (
                                <div className="p-3 bg-red-50 text-red-600 text-[11px] font-mono border-b border-red-100 shrink-0">
                                    ERR: {usersError}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto min-h-0">
                                {loadingChats ? (
                                    <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                                ) : conversations.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Inbox Zero</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {conversations.map(conv => {
                                            const isActive = selectedConversation?.id === conv.id;
                                            const hasUnread = conv.unread_admin > 0;
                                            
                                            return (
                                                <div
                                                    key={conv.id}
                                                    onClick={() => setSelectedConversation(conv)}
                                                    className={`p-4 cursor-pointer transition-all flex items-start gap-3 ${
                                                        isActive 
                                                            ? 'bg-blue-50/50 border-l-2 border-l-blue-600' 
                                                            : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                                                    }`}
                                                >
                                                    <div className="relative shrink-0 mt-0.5">
                                                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">
                                                            {getInitials(conv.users?.full_name)}
                                                        </div>
                                                        {hasUnread && (
                                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className={`text-sm truncate pr-2 ${isActive ? 'font-bold text-slate-900' : hasUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                                {conv.users?.full_name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                {formatConversationDate(conv.updated_at)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <span className="text-xs text-slate-500 truncate pr-4">
                                                                {conv.users?.email}
                                                            </span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                conv.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {conv.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chat Window (Right Panel) */}
                        <div className={`lg:col-span-8 flex flex-col bg-slate-50 relative h-full overflow-hidden ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                            {selectedConversation ? (
                                <>
                                    {/* Header */}
                                    <div className="h-16 px-4 lg:px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2 lg:gap-3">
                                            <Button variant="ghost" size="icon" className="lg:hidden shrink-0 text-slate-500" onClick={() => setSelectedConversation(null)}>
                                                <ArrowLeft className="w-5 h-5" />
                                            </Button>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                                                {getInitials(selectedConversation.users?.full_name)}
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">{selectedConversation.users?.full_name}</h2>
                                                <p className="text-[11px] text-slate-500 font-mono truncate">ID: {selectedConversation.users?.id?.substring(0,8)}...</p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            selectedConversation.status === 'open' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                        }`}>
                                            Status: {selectedConversation.status}
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                                        {messages.length === 0 && !loadingMessages && (
                                            <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                                                Aucun message dans cette conversation.
                                            </div>
                                        )}
                                        
                                        {messages.map((msg, idx) => {
                                            const isMe = msg.sender_role === 'admin';
                                            const isAi = msg.sender_role === 'assistant';
                                            const isUser = msg.sender_role === 'user';
                                            
                                            return (
                                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`
                                                        max-w-[75%] rounded-2xl px-5 py-3 text-sm relative group
                                                        ${isMe ? 'bg-slate-900 text-slate-50 rounded-br-sm' : ''}
                                                        ${isAi ? 'bg-slate-100 text-slate-700 border border-slate-200 rounded-bl-sm' : ''}
                                                        ${isUser ? 'bg-white text-slate-900 border border-slate-200 shadow-sm rounded-bl-sm' : ''}
                                                    `}>
                                                        {isAi && (
                                                            <div className="flex items-center gap-1.5 mb-2 border-b border-slate-200 pb-2">
                                                                <Bot className="w-3.5 h-3.5 text-slate-500" />
                                                                <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500">AI AGENT</span>
                                                            </div>
                                                        )}
                                                        
                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        
                                                        <span className={`text-[9px] font-medium block mt-3 text-right ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                                                            {format(new Date(msg.created_at), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div ref={scrollRef} className="h-4" />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                                        <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                                            <Textarea
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                                placeholder="Répondre au client... (Entrée pour envoyer)"
                                                className="min-h-[52px] max-h-[200px] border-0 bg-transparent focus-visible:ring-0 resize-none py-3 px-4 text-sm"
                                                rows={1}
                                            />
                                            <div className="p-1 shrink-0">
                                                <Button 
                                                    onClick={handleSendMessage} 
                                                    disabled={sending || !newMessage.trim()} 
                                                    size="icon"
                                                    className="w-10 h-10 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
                                                >
                                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-center">
                                            <p className="text-[10px] text-slate-400 font-medium">L'utilisateur verra ce message comme venant de l'équipe de support.</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
                                    <MessageSquare className="w-12 h-12 mb-4 text-slate-200" />
                                    <p className="text-sm font-medium text-slate-500">Sélectionnez une conversation pour commencer</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* --- SETTINGS TAB --- */}
                <TabsContent value="settings" className="mt-0 outline-none">
                    <div className="max-w-4xl mx-auto space-y-6">
                        
                        {/* Section 1: Activation */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Module Status</h3>
                            </div>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    <div className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">Human Support (Live Chat)</h4>
                                            <p className="text-sm text-slate-500">Active la bulle de chat pour tous les utilisateurs sur la plateforme.</p>
                                        </div>
                                        <Switch checked={supportEnabled} onCheckedChange={setSupportEnabled} className="data-[state=checked]:bg-emerald-500" />
                                    </div>
                                    <div className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                                                AI Auto-Reply <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                            </h4>
                                            <p className="text-sm text-slate-500">L'IA intercepte les messages et répond instantanément selon les règles définies.</p>
                                        </div>
                                        <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} className="data-[state=checked]:bg-indigo-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: AI Configuration */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Automation Logic</h3>
                            </div>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-700">OpenAI API Key</label>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ENV REQUIRED</span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <KeySquare className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <Input
                                            type="password"
                                            value={openAiKey}
                                            onChange={(e) => setOpenAiKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="pl-10 font-mono text-sm border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-700">System Prompt</label>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">MARKDOWN SUPPORTED</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Définissez la personnalité, le ton, et les instructions de l'agent IA.</p>
                                    <Textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        className="min-h-[250px] font-mono text-xs leading-relaxed border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-indigo-500 resize-y p-4"
                                        placeholder="Tu es l'assistant de ONE SMS..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Save Action */}
                        <div className="flex justify-end pt-4 pb-12">
                            <Button 
                                onClick={saveSettings} 
                                disabled={loadingSettings}
                                className="bg-slate-900 text-white hover:bg-slate-800 h-11 px-8"
                            >
                                {loadingSettings ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                )}
                                Deploy Configuration
                            </Button>
                        </div>

                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
