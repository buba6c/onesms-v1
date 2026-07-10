// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
// import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, X, Send, Minus, Loader2, Bot, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getSetting } from '@/lib/settings'
import { motion, AnimatePresence } from 'framer-motion'

export function FloatingSupportButton() {
    const { user } = useAuthStore()
    const location = useLocation()
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [isTyping, setIsTyping] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)

    // 1. Check if support is enabled
    const { data: settings } = useQuery({
        queryKey: ['support-settings'],
        queryFn: async () => {
            const value = await getSetting('support_enabled');
            // Si la valeur n'existe pas encore dans la DB, on active par défaut (true)
            return { enabled: value === '' ? true : value === 'true' }
        },
        staleTime: 300000 // 5 mins
    })

    // 2. Fetch or Create Conversation
    useEffect(() => {
        if (isOpen && user) {
            initializeConversation();
        }
    }, [isOpen, user])

    // 3. Subscribe to Realtime Messages
    useEffect(() => {
        if (!conversationId || !isOpen) return

        fetchMessages(conversationId)

        const channel = supabase
            .channel(`user-chat-${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'support_messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === payload.new.id)) return prev
                    return [...prev, payload.new]
                })
                scrollToBottom()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [conversationId, isOpen])

    const initializeConversation = async () => {
        if (!user) return
        // Check for open conversation
        const { data: existing } = await supabase
            .from('support_conversations' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'open')
            .single()

        if (existing) {
            setConversationId(existing.id)
        }
    }

    const fetchMessages = async (id: string) => {
        const { data } = await supabase
            .from('support_messages' as any)
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true })
        if (data) {
            setMessages(data)
            scrollToBottom()
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isOpen, sending]) // Scroll when messages change or chat opens

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }
        }, 100)
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return

        const msgContent = newMessage // Capture content
        setNewMessage('') // Clear input immediately
        setSending(true)

        // Optimistic Update: Add message to UI immediately
        const tempId = 'temp-' + Date.now()
        const optimisticMsg = {
            id: tempId,
            conversation_id: conversationId || 'temp',
            sender_role: 'user',
            content: msgContent,
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimisticMsg])
        scrollToBottom()

        let currentConvId = conversationId

        try {
            if (!currentConvId) {
                // Create new conversation
                const { data: newConv, error } = await supabase
                    .from('support_conversations' as any)
                    .insert({ user_id: user.id, status: 'open' })
                    .select()
                    .single()

                if (error) throw error
                currentConvId = newConv.id
                setConversationId(newConv.id)
            }

            // Insert Message
            const { data: insertedMsg, error: msgError } = await supabase
                .from('support_messages' as any)
                .insert({
                    conversation_id: currentConvId,
                    sender_role: 'user',
                    content: msgContent
                })
                .select()
                .single()

            if (msgError) throw msgError

            // Replace temp message with real one (optional, but good for id consistency)
            setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg : m))

            // Trigger AI Response (Edge Function)
            const { data: aiResponse, error: aiError } = await supabase.functions.invoke('chat-support', {
                body: {
                    conversationId: currentConvId,
                    message: msgContent,
                    userId: user.id
                }
            })

            if (aiError) throw aiError

            // Optimistic AI Update (if returned by function)
            if (aiResponse && aiResponse.data) {
                // HUMAN DELAY: Wait 1.5s to 3.5s to simulate typing
                const delay = Math.random() * 2000 + 1500

                // Show typing indicator (we'll implement the UI for this next if not exists, 
                // but for now we just hold the message back)
                setIsTyping(true) // Need to add this state

                setTimeout(() => {
                    setMessages(prev => {
                        if (prev.some(m => m.id === aiResponse.data.id)) return prev
                        return [...prev, aiResponse.data]
                    })
                    setIsTyping(false)
                    scrollToBottom()
                }, delay)
            }

        } catch (e) {
            console.error('Failed to send', e)
            // Rollback on error (remove temp message)
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setNewMessage(msgContent) // Restore text
        } finally {
            setSending(false)
        }
    }

    if (settings && !settings.enabled) return null
    if (!user) return null

    // Only show on dashboard page
    if (location.pathname !== '/dashboard') return null

    return (
        <>
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-20 right-4 left-4 md:left-auto md:bottom-24 md:right-6 md:w-[400px] h-[60vh] md:h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-primary-foreground flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">Assistant OneSMS</h3>
                                    <p className="text-[10px] text-blue-50 opacity-90">IA & Support Humain</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setIsMinimized(true)}>
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 bg-gray-50/50 p-4 overflow-y-auto">
                            <div className="space-y-4">
                                {/* Welcome Message */}
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] rounded-2xl rounded-bl-none px-4 py-2 text-sm bg-white border border-gray-100 shadow-sm text-gray-700">
                                        <p>Bonjour ! 👋 Je suis l'assistant IA de OneSMS. Comment puis-je vous aider aujourd'hui ?</p>
                                    </div>
                                </div>

                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender_role === 'user'
                                    const isAi = msg.sender_role === 'assistant'
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={cn(
                                                "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                isMe ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none" :
                                                    isAi ? "bg-white border text-gray-800 rounded-bl-none" :
                                                        "bg-yellow-50 border border-yellow-200 text-gray-800 rounded-bl-none" // Admin
                                            )}>
                                                {msg.sender_role === 'admin' && <div className="text-[10px] font-bold text-yellow-700 mb-1 flex items-center gap-1">Support Agent</div>}
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    )
                                })}

                                {sending && (
                                    <div className="flex justify-end">
                                        <div className="bg-blue-600/10 px-4 py-2 rounded-2xl rounded-br-none">
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                        </div>
                                    </div>
                                )}

                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border text-gray-500 rounded-2xl rounded-bl-none px-4 py-2 text-sm shadow-sm flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white border-t flex gap-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Posez une question..."
                                className="rounded-full bg-gray-50 border-gray-200 focus:ring-blue-500/30"
                            />
                            <Button
                                size="icon"
                                onClick={handleSendMessage}
                                disabled={sending || !newMessage.trim()}
                                className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-md"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </motion.div >
                )
                }
            </AnimatePresence >

            {/* Floating Button or Minimized State */}
            < motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setIsOpen(true)
                    setIsMinimized(false)
                }}
                className={
                    cn(
                        "fixed bottom-[110px] md:bottom-6 right-5 md:right-6 w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-white z-50 transition-all hover:shadow-xl hover:shadow-blue-500/40",
                        isOpen && !isMinimized ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
                    )}
            >
                <MessageCircle className="w-7 h-7" />
            </motion.button >
        </>
    )
}
