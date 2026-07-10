// @ts-nocheck

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, X, PlayCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export function TutorialModal() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [hasSeen, setHasSeen] = useState(false);

    // Fetch video settings
    const { data: settings } = useQuery({
        queryKey: ['landing-video-settings'],
        queryFn: async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['landing_video_active', 'landing_video_url'])
                .returns<{ key: string; value: string }[]>();

            const settingsMap: Record<string, string> = {};
            data?.forEach(s => {
                settingsMap[s.key] = s.value;
            });
            return settingsMap;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const showVideoGlobal = settings?.['landing_video_active'] === 'true';
    const videoUrl = settings?.['landing_video_url'];

    useEffect(() => {
        // Only proceed if user is logged in, video is globally active, and user hasn't seen it yet
        if (user && showVideoGlobal && videoUrl && user.has_seen_tutorial === false) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                // Trigger confetti for welcome effect
                launchConfetti();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, showVideoGlobal, videoUrl]);

    const launchConfetti = () => {
        const end = Date.now() + 1000;
        const colors = ['#06b6d4', '#3b82f6', '#8b5cf6'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    const handleClose = async () => {
        setIsOpen(false);

        if (user) {
            try {
                const { error } = await supabase
                    .from('users')
                    .update({ has_seen_tutorial: true })
                    .eq('id', user.id);

                if (error) {
                    console.error('Failed to update tutorial status:', error);
                } else {
                    useAuthStore.getState().checkAuth();
                }
            } catch (err) {
                console.error('Error updating tutorial status:', err);
            }
        }
    };

    if (!user || hasSeen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl block">

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 z-50 p-2 rounded-full bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors shadow-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col md:flex-row h-full">
                    {/* Left Side: Welcome Text */}
                    <div className="w-full md:w-2/5 p-8 md:p-10 flex flex-col justify-center bg-gradient-to-br from-blue-50/50 via-white to-cyan-50/50 relative overflow-hidden border-r border-gray-100">

                        {/* Background blobs */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-40 pointer-events-none">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-[60px]"></div>
                            <div className="absolute bottom-0 right-0 w-60 h-60 bg-cyan-100 rounded-full blur-[60px]"></div>
                        </div>

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-sm font-semibold mb-6 shadow-sm">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                <span>Bienvenue sur {t('app.name')}</span>
                            </div>

                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
                                Prêt à commencer ?
                            </h2>

                            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                Découvrez comment obtenir vos numéros virtuels en quelques secondes avec notre guide rapide.
                            </p>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 text-gray-700">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100 shadow-sm">1</div>
                                    <span className="font-medium">Choisissez un service</span>
                                </div>
                                <div className="flex items-center gap-4 text-gray-700">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm border border-purple-100 shadow-sm">2</div>
                                    <span className="font-medium">Obtenez un numéro</span>
                                </div>
                                <div className="flex items-center gap-4 text-gray-700">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold text-sm border border-green-100 shadow-sm">3</div>
                                    <span className="font-medium">Recevez votre code</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Video */}
                    <div className="w-full md:w-3/5 bg-gray-50 relative flex flex-col">
                        <div className="flex-1 relative aspect-video md:aspect-auto">
                            {videoUrl ? (
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src={`https://www.youtube.com/embed/${videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop()}?autoplay=1&rel=0`}
                                    title={`${t('app.name')} Tutorial`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                    <PlayCircle className="w-16 h-16 opacity-30 mb-2" />
                                    <span className="text-sm font-medium opacity-80">Vidéo indisponible</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100 md:hidden flex justify-center">
                            <Button onClick={handleClose} size="lg" className="w-full max-w-sm rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                                Commencer à explorer
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
