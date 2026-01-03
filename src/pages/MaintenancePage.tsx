import { Wrench, Clock, AlertTriangle } from 'lucide-react';

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

                {/* Animated Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent transform scale-150 animate-pulse"></div>

                    <div className="relative z-10 flex justify-center mb-4">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/30">
                            <Wrench className="w-10 h-10 text-white animate-spin-slow" style={{ animationDuration: '3s' }} />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Maintenance</h1>
                    <p className="text-amber-100 font-medium">Nous améliorons l'expérience OneSMS</p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-blue-900">Mise à jour en cours</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Nos équipes déploient actuellement une nouvelle version de l'application.
                            </p>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-gray-600">
                            L'accès est temporairement restreint. Veuillez revenir dans quelques instants.
                        </p>
                        <p className="text-xs text-gray-400">
                            Merci de votre patience ! 🚀
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-sm shadow-lg hover:shadow-xl active:scale-95"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-gray-400 font-mono">OneSMS System Status • {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M21 21v-5h-5" />
        </svg>
    );
}
