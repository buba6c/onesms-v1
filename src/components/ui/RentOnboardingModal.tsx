import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Infinity, ShieldCheck, ArrowRight, Check } from 'lucide-react';

export const RentOnboardingModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenRentOnboarding_v4');
        if (!hasSeen) {
            const timer = setTimeout(() => setIsOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenRentOnboarding_v4', 'true');
    };

    const nextStep = () => {
        if (step < 2) setStep(step + 1);
        else handleClose();
    };

    const steps = [
        {
            id: 'time',
            tag: "Location Longue Durée",
            title: "Des Numéros Qui Durent",
            desc: "Idéal pour les vérifications espacées dans le temps. Louez de 4 heures jusqu'à un mois et gardez le contrôle total.",
            icon: <Clock className="w-16 h-16 text-blue-600" strokeWidth={1.5} />,
            glow: "bg-blue-500/20",
        },
        {
            id: 'full',
            tag: "L'exclusivité ONE SMS",
            title: "Location Complète",
            desc: "Avec cette option, vous recevez les SMS de TOUTES les applications (WhatsApp, Banques, Telegram...) sur un seul numéro.",
            icon: <Infinity className="w-16 h-16 text-purple-600" strokeWidth={1.5} />,
            glow: "bg-purple-500/20",
        },
        {
            id: 'guarantee',
            tag: "Satisfait ou Remboursé",
            title: "Garantie de remboursement",
            desc: "Si vous ne recevez aucun SMS durant les 5 premières minutes, vous pouvez annuler et être remboursé. Attention, passé ce délai ou si un SMS est reçu, aucun remboursement ne sera possible.",
            icon: <ShieldCheck className="w-16 h-16 text-emerald-500" strokeWidth={1.5} />,
            glow: "bg-emerald-500/20",
        }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Minimalist Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm cursor-pointer"
                onClick={handleClose}
            />

            {/* Modal */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative w-full max-w-[400px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col items-center text-center border border-slate-100"
            >
                {/* Header Actions */}
                <div className="absolute top-5 right-5 z-20">
                    <button 
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress Indicators */}
                <div className="absolute top-8 left-8 flex gap-1.5 z-20">
                    {steps.map((_, i) => (
                        <div 
                            key={i}
                            className={`h-1 rounded-full transition-all duration-500 ${
                                i === step ? 'w-6 bg-slate-900' : 'w-2 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>

                <div className="w-full pt-20 pb-8 px-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center"
                        >
                            {/* Floating Icon with Glow */}
                            <div className="relative mb-10 mt-6">
                                <div className={`absolute inset-0 ${steps[step].glow} blur-3xl rounded-full transform scale-150`} />
                                <motion.div 
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 4, repeat: 9999, ease: "easeInOut" }}
                                    className="relative z-10 bg-white shadow-xl shadow-slate-200/50 w-28 h-28 rounded-full flex items-center justify-center border border-slate-50"
                                >
                                    {steps[step].icon}
                                </motion.div>
                            </div>

                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                                {steps[step].tag}
                            </span>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
                                {steps[step].title}
                            </h2>
                            <p className="text-[14px] text-slate-500 font-medium leading-relaxed max-w-[280px]">
                                {steps[step].desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Next Button */}
                    <div className="mt-10 w-full">
                        <button 
                            onClick={nextStep}
                            className="w-full group relative flex items-center justify-center h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {step === 2 ? (
                                    <>Commencer <Check className="w-4 h-4" /></>
                                ) : (
                                    <>Continuer <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
