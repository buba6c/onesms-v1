import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { packagesApi } from '@/lib/api/packages';
import {
  Phone,
  MessageSquare,
  Globe,
  Shield,
  Zap,
  DollarSign,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Play,
  MousePointer,
  Smartphone,
  CheckCircle2,
  Award,
  Headphones,
  CreditCard,
  Gift
} from 'lucide-react';
import { FeaturesCarousel } from '@/components/home/FeaturesCarousel';

// Service logos with SVG icons for beautiful UX
const ServiceLogo = ({ code, name }: { code: string; name: string }) => {
  const logos: Record<string, JSX.Element> = {
    'wa': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-xl group-hover:shadow-green-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">WhatsApp</span>
      </div>
    ),
    'tg': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#2AABEE] to-[#229ED9] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Telegram</span>
      </div>
    ),
    'ig': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:shadow-xl group-hover:shadow-pink-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Instagram</span>
      </div>
    ),
    'fb': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#1877F2] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:shadow-xl group-hover:shadow-blue-600/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Facebook</span>
      </div>
    ),
    'go': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-400/30 group-hover:shadow-xl group-hover:shadow-gray-400/40 group-hover:scale-110 transition-all duration-300 border border-gray-100">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Google</span>
      </div>
    ),
    'tw': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-gray-800/30 group-hover:shadow-xl group-hover:shadow-gray-800/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8 text-white fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">X</span>
      </div>
    ),
    'ds': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#5865F2] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-xl group-hover:shadow-indigo-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Discord</span>
      </div>
    ),
    'tt': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-gray-800/30 group-hover:shadow-xl group-hover:shadow-gray-800/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8 fill-current">
            <path fill="#25F4EE" d="M9.37 23.5a7.14 7.14 0 0 1-5.09-2.1A7.14 7.14 0 0 1 2.18 16.3a7.14 7.14 0 0 1 2.1-5.09 7.14 7.14 0 0 1 5.09-2.1v3.45a3.7 3.7 0 0 0-2.63 1.09 3.7 3.7 0 0 0-1.09 2.63 3.7 3.7 0 0 0 1.09 2.63 3.7 3.7 0 0 0 2.63 1.09V23.5Z" />
            <path fill="#FE2C55" d="M9.88 23.5V9.11h3.45v3.45a3.7 3.7 0 0 0 2.63-1.09 3.7 3.7 0 0 0 1.09-2.63h3.45a7.14 7.14 0 0 1-2.1 5.09 7.14 7.14 0 0 1-5.09 2.1v7.47H9.88Z" />
            <path fill="white" d="M9.88 23.5V20a3.7 3.7 0 0 0 2.63-1.09 3.7 3.7 0 0 0 1.09-2.63 3.7 3.7 0 0 0-1.09-2.63 3.7 3.7 0 0 0-2.63-1.09V9.11a7.14 7.14 0 0 1 5.09 2.1 7.14 7.14 0 0 1 2.1 5.09 7.14 7.14 0 0 1-2.1 5.09 7.14 7.14 0 0 1-5.09 2.1Z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">TikTok</span>
      </div>
    ),
    'li': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#0A66C2] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-700/30 group-hover:shadow-xl group-hover:shadow-blue-700/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-7 h-7 md:w-8 md:h-8 text-white fill-current">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">LinkedIn</span>
      </div>
    ),
    'sp': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#1DB954] rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-xl group-hover:shadow-green-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Spotify</span>
      </div>
    ),
    'nf': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:shadow-xl group-hover:shadow-red-600/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-6 h-8 md:w-7 md:h-9 text-[#E50914] fill-current">
            <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Netflix</span>
      </div>
    ),
    'yt': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#FF0000] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:shadow-xl group-hover:shadow-red-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">YouTube</span>
      </div>
    ),
    'sn': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#FFFC00] rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/30 group-hover:shadow-xl group-hover:shadow-yellow-400/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-black fill-current">
            <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Snapchat</span>
      </div>
    ),
    'pp': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#003087] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-800/30 group-hover:shadow-xl group-hover:shadow-blue-800/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 fill-current">
            <path fill="#009cde" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.769.769 0 0 1 .758-.648h6.913c2.281 0 3.964.758 4.698 2.126.344.64.504 1.361.504 2.206 0 .965-.21 2.063-.663 3.184-.472 1.165-1.183 2.175-2.116 3.006-1.001.893-2.214 1.487-3.614 1.766-.432.086-.878.129-1.336.129H8.406a.795.795 0 0 0-.785.67l-.542 3.178z" />
            <path fill="#012169" d="M23.048 7.668c-.001 0-.001 0 0 0-.017.109-.036.22-.06.334-.796 4.02-3.528 5.412-7.018 5.412h-1.774a.862.862 0 0 0-.852.729l-.919 5.829a.453.453 0 0 0 .448.522h3.14a.757.757 0 0 0 .747-.639l.031-.158.586-3.714.038-.203a.757.757 0 0 1 .747-.64h.471c3.05 0 5.437-1.238 6.135-4.82.292-1.497.141-2.746-.632-3.625a3.022 3.022 0 0 0-.868-.687z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">PayPal</span>
      </div>
    ),
    'ot': (
      <div className="group relative">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-[#FF4500] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-xl group-hover:shadow-orange-500/40 group-hover:scale-110 transition-all duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 text-white fill-current">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0zm6.5 14a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-9.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm10.242 2.865c-.345.345-1.459 1.635-5.242 1.635s-4.897-1.29-5.242-1.635a.5.5 0 0 1 .707-.707c.19.19 1.017.842 4.535.842s4.345-.652 4.535-.842a.5.5 0 1 1 .707.707zM17 9c-1.657 0-3 1.343-3 3h2c0-.552.448-1 1-1s1 .448 1 1h2c0-1.657-1.343-3-3-3zM7 12c0-1.657 1.343-3 3-3s3 1.343 3 3h-2c0-.552-.448-1-1-1s-1 .448-1 1H7z" />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Reddit</span>
      </div>
    ),
  };

  return logos[code] || (
    <div className="group relative">
      <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
        <span className="text-white font-bold text-lg">{name.substring(0, 2).toUpperCase()}</span>
      </div>
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-200/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{name}</span>
    </div>
  );
};

// Service logos mapping with real brand colors
const serviceLogos: Record<string, { bg: string; color: string; icon: string }> = {
  'wa': { bg: 'bg-[#25D366]', color: 'text-white', icon: 'WhatsApp' },
  'tg': { bg: 'bg-[#0088cc]', color: 'text-white', icon: 'Telegram' },
  'ig': { bg: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]', color: 'text-white', icon: 'Instagram' },
  'fb': { bg: 'bg-[#1877F2]', color: 'text-white', icon: 'Facebook' },
  'go': { bg: 'bg-white border border-gray-200', color: 'text-gray-700', icon: 'Google' },
  'tw': { bg: 'bg-black', color: 'text-white', icon: 'X' },
  'ds': { bg: 'bg-[#5865F2]', color: 'text-white', icon: 'Discord' },
  'yt': { bg: 'bg-[#FF0000]', color: 'text-white', icon: 'YouTube' },
  'ot': { bg: 'bg-[#FF4500]', color: 'text-white', icon: 'Reddit' },
  'sn': { bg: 'bg-[#FFFC00]', color: 'text-black', icon: 'Snapchat' },
  'tt': { bg: 'bg-black', color: 'text-white', icon: 'TikTok' },
  'li': { bg: 'bg-[#0A66C2]', color: 'text-white', icon: 'LinkedIn' },
  'pp': { bg: 'bg-[#003087]', color: 'text-white', icon: 'PayPal' },
  'nf': { bg: 'bg-[#E50914]', color: 'text-white', icon: 'Netflix' },
  'sp': { bg: 'bg-[#1DB954]', color: 'text-white', icon: 'Spotify' },
  'ub': { bg: 'bg-black', color: 'text-white', icon: 'Uber' },
};

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Auto-animate steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % 3) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real services from database
  const { data: topServices } = useQuery({
    queryKey: ['homepage-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('code, name')
        .eq('active', true)
        .in('code', ['wa', 'tg', 'ig', 'fb', 'go', 'tw', 'ds', 'tt', 'li', 'yt', 'sn', 'nf'])
        .limit(12);
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Pricing data - using default values (pricing is dynamic via edge functions)
  const pricingData = { min: 100, max: 5000, avg: 500 };

  // Fetch packages for carousel
  const { data: topUpPackages = [], isLoading: loadingPackages, error: packagesError } = useQuery({
    queryKey: ['homepage-packages'],
    queryFn: async () => {
      try {
        const packages = await packagesApi.getActivePackages();
        // Trier par display_order, puis mettre le populaire au milieu
        const sorted = packages.sort((a, b) => a.display_order - b.display_order);

        // Trouver le package populaire et le mettre au milieu
        const popularIndex = sorted.findIndex(p => p.is_popular);
        if (popularIndex !== -1 && sorted.length >= 3) {
          const popular = sorted.splice(popularIndex, 1)[0];
          const middleIndex = Math.floor(sorted.length / 2);
          sorted.splice(middleIndex, 0, popular);
        }

        return sorted;
      } catch (err) {
        console.error('❌ [PACKAGES] Error:', err);
        // Retourner les packages par défaut en cas d'erreur
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,
    retry: 1, // Ne pas trop retenter en cas d'erreur
  });

  // Log packages status - Disabled in production
  // useEffect(() => {
  //   console.log('📦 [PACKAGES] Current state:', { 
  //     count: topUpPackages.length, 
  //     loading: loadingPackages, 
  //     error: packagesError 
  //   });
  // }, [topUpPackages, loadingPackages, packagesError]);

  // Carousel state
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<'XOF' | 'EUR' | 'USD'>('XOF');
  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll to center (popular package) on load
  useEffect(() => {
    if (carouselRef.current && topUpPackages.length > 0) {
      // Attendre que le DOM soit prêt
      const timer = setTimeout(() => {
        if (carouselRef.current) {
          const cardWidth = 320; // width + gap
          const popularIndex = topUpPackages.findIndex(p => p.is_popular);
          const targetIndex = popularIndex !== -1 ? popularIndex : Math.floor(topUpPackages.length / 2);
          const scrollPosition = (targetIndex * cardWidth) - (carouselRef.current.offsetWidth / 2) + (cardWidth / 2);
          carouselRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [topUpPackages]);

  // Auto-scroll carousel - DISABLED to keep popular in center
  // useEffect(() => {
  //   if (topUpPackages.length <= 1) return;
  //   const interval = setInterval(() => {
  //     setCurrentPackageIndex(prev => (prev + 1) % topUpPackages.length);
  //   }, 4000);
  //   return () => clearInterval(interval);
  // }, [topUpPackages.length]);

  // Fetch platform stats - Real data from database
  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const [servicesResult, countriesResult] = await Promise.all([
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('countries').select('*', { count: 'exact', head: true }).eq('active', true)
      ]);

      // Limiter les pays à 195 max (nombre réel de pays dans le monde)
      const countriesCount = Math.min(countriesResult.count || 0, 195);

      return {
        services: servicesResult.count || 0,
        countries: countriesCount,
        // Nombre estimé de numéros disponibles (basé sur les providers)
        availableNumbers: '5.2M+',
        successRate: '99.7%'
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  const features = [
    {
      icon: Zap,
      title: t('homepage.features.feature1Title'),
      description: t('homepage.features.feature1Desc'),
      color: 'from-yellow-400 to-orange-500',
      iconBg: 'bg-gradient-to-br from-yellow-400 to-orange-500'
    },
    {
      icon: Globe,
      title: t('homepage.features.feature2Title'),
      description: t('homepage.features.feature2Desc'),
      color: 'from-green-400 to-emerald-500',
      iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500'
    },
    {
      icon: DollarSign,
      title: t('homepage.features.feature3Title'),
      description: t('homepage.features.feature3Desc'),
      color: 'from-blue-400 to-cyan-500',
      iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500'
    },
    {
      icon: Shield,
      title: t('homepage.features.feature4Title'),
      description: t('homepage.features.feature4Desc'),
      color: 'from-purple-400 to-pink-500',
      iconBg: 'bg-gradient-to-br from-purple-400 to-pink-500'
    },
    {
      icon: Smartphone,
      title: t('homepage.features.feature5Title'),
      description: t('homepage.features.feature5Desc'),
      color: 'from-indigo-400 to-purple-500',
      iconBg: 'bg-gradient-to-br from-indigo-400 to-purple-500'
    },
    {
      icon: Headphones,
      title: t('homepage.features.feature6Title'),
      description: t('homepage.features.feature6Desc'),
      color: 'from-rose-400 to-red-500',
      iconBg: 'bg-gradient-to-br from-rose-400 to-red-500'
    }
  ];

  const displayServices = useMemo(() => {
    if (!topServices || topServices.length === 0) {
      return [
        { code: 'wa', name: 'WhatsApp' },
        { code: 'tg', name: 'Telegram' },
        { code: 'ig', name: 'Instagram' },
        { code: 'fb', name: 'Facebook' },
        { code: 'go', name: 'Google' },
        { code: 'tw', name: 'Twitter/X' },
        { code: 'ds', name: 'Discord' },
        { code: 'tt', name: 'TikTok' },
      ];
    }
    return topServices;
  }, [topServices]);

  return (
    <div className="min-h-screen">
      {/* Hero Section - Modern Gradient with Animation */}
      <section className="relative min-h-[90vh] bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white overflow-hidden flex items-center pt-14 md:pt-0">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        <div className="container mx-auto px-4 py-12 md:py-24 relative z-10">
          <div className="max-w-5xl mx-auto text-center">

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-6 leading-tight tracking-tight animate-fade-in-up">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
                OneSMS
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                {t('homepage.hero.titleHighlight')}
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-blue-100/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4 animate-fade-in-up animate-delay-200">
              {t('homepage.hero.description')}
            </p>

            {/* CTA Button */}
            <div className="flex justify-center mb-12 md:mb-16 px-4 animate-fade-in-up animate-delay-300">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-14 md:h-16 px-10 md:px-14 text-lg md:text-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                  {t('homepage.hero.getStarted')}
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto mb-12 md:mb-16 px-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 animate-fade-in-up animate-delay-300">
                <div className="text-2xl md:text-4xl font-black text-white mb-1">{stats?.availableNumbers || '5.2M+'}</div>
                <div className="text-xs md:text-sm text-blue-200/60">{t('homepage.stats.availableNumbers')}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 animate-fade-in-up animate-delay-500">
                <div className="text-2xl md:text-4xl font-black text-white mb-1">{stats?.services || '1683'}+</div>
                <div className="text-xs md:text-sm text-blue-200/60">{t('homepage.stats.services')}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 animate-fade-in-up animate-delay-700">
                <div className="text-2xl md:text-4xl font-black text-white mb-1">{stats?.countries || '180'}+</div>
                <div className="text-xs md:text-sm text-blue-200/60">{t('homepage.stats.countries')}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 animate-fade-in-up animate-delay-1000">
                <div className="text-2xl md:text-4xl font-black text-white mb-1">{stats?.successRate || '99.7%'}</div>
                <div className="text-xs md:text-sm text-blue-200/60">{t('homepage.stats.successRate')}</div>
              </div>
            </div>

            {/* Popular Services with Real SVG Logos - Animated */}
            <div className="px-4 pb-8">
              <p className="text-xs md:text-sm text-blue-200/60 mb-6 md:mb-8 uppercase tracking-widest font-medium">
                {t('homepage.services.title', 'Supported Services')}
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {displayServices.map((service, index) => (
                  <div
                    key={service.code}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ServiceLogo code={service.code} name={service.name} />
                  </div>
                ))}
              </div>
              {/* More services indicator - Improved design */}
              <div className="mt-10 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 flex items-center gap-3">
                  <div className="flex items-center">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-sm font-medium text-blue-100">
                    {t('homepage.services.andMore', `et ${stats?.services || 1600}+ autres services`)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Modern Cards with Hover Effects */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 text-blue-700 px-6 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide uppercase mb-6 shadow-sm">
              {t('homepage.features.subtitle')}
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
              {t('homepage.features.title')}
            </h2>
          </div>

          {/* Horizontal Scroll Carousel for Mobile */}
          <FeaturesCarousel features={features} />

          {/* Desktop Grid (Hidden on Mobile) */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group relative p-8 bg-white hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/50 border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 rounded-[2rem] overflow-hidden"
              >
                {/* Decorative gradient */}
                <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.color} opacity-[0.08] rounded-full blur-3xl -translate-y-12 translate-x-12 group-hover:scale-125 transition-transform duration-500`}></div>

                <div className={`w-14 h-14 md:w-16 md:h-16 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5 md:mb-6 shadow-lg shadow-${feature.color.split(' ')[0].replace('from-', '')}/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-base text-gray-600 leading-relaxed font-medium">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Steps with Visuals */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.15),transparent_50%)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Play className="w-4 h-4 text-cyan-400" />
              {t('homepage.howItWorks.subtitle')}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
              {t('homepage.howItWorks.title')}
            </h2>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Desktop View - Horizontal Steps */}
            <div className="hidden lg:grid grid-cols-3 gap-8 relative">
              {/* Connection Line */}
              <div className="absolute top-24 left-1/6 right-1/6 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-green-500 rounded-full"></div>

              {/* Step 1 */}
              <div
                className={`relative transition-all duration-500 ${activeStep === 1 ? 'scale-105' : 'scale-100 opacity-70'}`}
                onMouseEnter={() => setActiveStep(1)}
              >
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-sm rounded-3xl p-8 border border-cyan-500/30 h-full">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/30">
                    <MousePointer className="w-10 h-10 text-white" />
                  </div>
                  <div className="bg-cyan-500 text-white text-sm font-bold px-3 py-1 rounded-full w-fit mx-auto mb-4">
                    {t('homepage.howItWorks.step1Title')}
                  </div>
                  <p className="text-blue-100/80 text-center">
                    {t('homepage.howItWorks.step1Desc')}
                  </p>
                  {/* Visual Mockup */}
                  <div className="mt-6 bg-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg mb-2">
                      <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center text-xs font-bold">WA</div>
                      <span className="text-sm">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-cyan-500/30 rounded-lg border border-cyan-400">
                      <div className="w-8 h-8 bg-[#0088cc] rounded-full flex items-center justify-center text-xs font-bold">TG</div>
                      <span className="text-sm">Telegram ✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`relative transition-all duration-500 ${activeStep === 2 ? 'scale-105' : 'scale-100 opacity-70'}`}
                onMouseEnter={() => setActiveStep(2)}
              >
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30 h-full">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/30">
                    <Smartphone className="w-10 h-10 text-white" />
                  </div>
                  <div className="bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded-full w-fit mx-auto mb-4">
                    {t('homepage.howItWorks.step2Title')}
                  </div>
                  <p className="text-blue-100/80 text-center">
                    {t('homepage.howItWorks.step2Desc')}
                  </p>
                  {/* Visual Mockup */}
                  <div className="mt-6 bg-white/10 rounded-xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-purple-400 mb-2">+1 (555) 123-4567</div>
                      <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('common.success', 'Active')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`relative transition-all duration-500 ${activeStep === 3 ? 'scale-105' : 'scale-100 opacity-70'}`}
                onMouseEnter={() => setActiveStep(3)}
              >
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm rounded-3xl p-8 border border-green-500/30 h-full">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
                    <MessageSquare className="w-10 h-10 text-white" />
                  </div>
                  <div className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full w-fit mx-auto mb-4">
                    {t('homepage.howItWorks.step3Title')}
                  </div>
                  <p className="text-blue-100/80 text-center">
                    {t('homepage.howItWorks.step3Desc')}
                  </p>
                  {/* Visual Mockup */}
                  <div className="mt-6 bg-white/10 rounded-xl p-4">
                    <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3">
                      <div className="text-xs text-green-300 mb-1">Telegram</div>
                      <div className="text-lg font-mono font-bold text-white">Code: 847291</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile View - Vertical Steps */}
            <div className="lg:hidden space-y-6">
              {[
                { num: 1, icon: MousePointer, color: 'cyan', title: t('homepage.howItWorks.step1Title'), desc: t('homepage.howItWorks.step1Desc') },
                { num: 2, icon: Smartphone, color: 'purple', title: t('homepage.howItWorks.step2Title'), desc: t('homepage.howItWorks.step2Desc') },
                { num: 3, icon: MessageSquare, color: 'green', title: t('homepage.howItWorks.step3Title'), desc: t('homepage.howItWorks.step3Desc') },
              ].map((step) => (
                <div key={step.num} className={`bg-gradient-to-br from-${step.color}-500/20 to-${step.color}-600/20 backdrop-blur-sm rounded-2xl p-6 border border-${step.color}-500/30`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br from-${step.color}-400 to-${step.color}-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className={`bg-${step.color}-500 text-white text-xs font-bold px-2 py-1 rounded-full w-fit mb-2`}>
                        {step.title}
                      </div>
                      <p className="text-blue-100/80 text-sm">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Referral Banner Section - Invite friends */}
      <section className="py-10 md:py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-cyan-100/50 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-6 md:mb-10">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-100 to-blue-100 text-blue-700 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold mb-3 md:mb-4 shadow-sm">
                <Gift className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {t('homepage.referralBanner.badge')}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-2">
                {t('homepage.referralBanner.title')}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600"> {t('homepage.referralBanner.titleHighlight')}</span>
              </h2>
              <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mt-3 md:mt-4 px-2">
                {t('homepage.referralBanner.description')}
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden relative">
              {/* Background elements */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.2),transparent_50%)]"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.2),transparent_50%)]"></div>
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

              <div className="grid md:grid-cols-2 gap-0 relative z-10">
                {/* Left Content */}
                <div className="p-5 sm:p-6 md:p-10 lg:p-12 text-white">
                  {/* Bonus Highlight - Mobile first */}
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-3 sm:p-4 mb-5 md:mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <p className="text-white font-bold text-sm sm:text-base md:text-lg">
                          {t('referral.bonusHighlight')}
                        </p>
                        <p className="text-yellow-200/80 text-xs sm:text-sm hidden sm:block">
                          {t('referral.bonusHighlightDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                    {[t('homepage.referralBanner.benefit1'), t('homepage.referralBanner.benefit2'), t('homepage.referralBanner.benefit3')].map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3 md:gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                          <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <span className="text-blue-100 font-medium text-sm md:text-lg">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/register" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-12 md:h-14 px-6 md:px-8 font-bold text-base md:text-lg shadow-lg shadow-cyan-500/30 transition-all hover:scale-105">
                        {t('homepage.referralBanner.cta')}
                        <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Right Visual */}
                <div className="p-5 sm:p-6 md:p-10 lg:p-12 flex flex-col justify-center relative border-t md:border-t-0 md:border-l border-white/10">
                  {/* Decorative circles - hidden on mobile */}
                  <div className="hidden md:block absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl" />
                  <div className="hidden md:block absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />

                  <div className="relative z-10 text-white text-center">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl shadow-cyan-500/40">
                      <Users className="w-7 h-7 md:w-10 md:h-10" />
                    </div>

                    <p className="text-blue-200/80 text-xs md:text-sm mb-1 md:mb-2">{t('homepage.referralBanner.haveCode')}</p>
                    <p className="text-lg md:text-2xl font-bold mb-4 md:mb-6">
                      {t('homepage.referralBanner.enterCode')}
                    </p>

                    {/* Fake code input visual */}
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg md:rounded-xl p-3 md:p-5 max-w-xs mx-auto">
                      <div className="flex items-center gap-2 md:gap-3 justify-center">
                        <Gift className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                        <span className="text-base md:text-xl font-mono font-bold tracking-wider md:tracking-widest text-cyan-300">ABC123XYZ</span>
                      </div>
                      <p className="text-[10px] md:text-xs text-blue-200/60 mt-2 md:mt-3">{t('homepage.referralBanner.codeExample')}</p>
                    </div>

                    <Link to="/referral" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium text-sm md:text-base mt-4 md:mt-6 transition-colors">
                      {t('homepage.referralBanner.ctaLearnMore')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - TopUp Packages Carousel */}
      <section id="pricing" className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-cyan-100 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold mb-4 shadow-sm">
              <CreditCard className="w-4 h-4" />
              {t('homepage.pricing.subtitle')}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              {t('homepage.pricing.title')}
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              {t('homepage.pricing.description', 'Choose your activation package and start receiving SMS instantly')}
            </p>
          </div>

          {/* TopUp Packages Carousel */}
          <div className="relative max-w-7xl mx-auto">
            {/* Navigation Arrows */}
            <button
              onClick={() => {
                if (carouselRef.current) {
                  carouselRef.current.scrollBy({ left: -320, behavior: 'smooth' });
                }
              }}
              className="absolute -left-2 md:left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-300 group"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => {
                if (carouselRef.current) {
                  carouselRef.current.scrollBy({ left: 320, behavior: 'smooth' });
                }
              }}
              className="absolute -right-2 md:right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-300 group"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Carousel Container */}
            <div
              ref={carouselRef}
              className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth px-4 md:px-12 pt-8 pb-6 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {topUpPackages.length > 0 ? (
                topUpPackages.map((pkg, index) => {
                  const isPopular = pkg.is_popular;
                  const gradient = isPopular ? 'from-orange-500 to-red-500' : 'from-blue-600 to-cyan-500';

                  return (
                    <div
                      key={pkg.id}
                      className={`flex-shrink-0 w-[280px] md:w-[300px] snap-center relative group ${isPopular ? 'z-10' : ''}`}
                    >
                      {/* Popular Badge - Enhanced */}
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/40 flex items-center gap-1.5 whitespace-nowrap">
                            <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                            {t('homepage.pricing.mostPopular', 'POPULAIRE')}
                            <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                          </div>
                        </div>
                      )}

                      <div className={`relative bg-white rounded-3xl shadow-xl border-2 ${isPopular ? 'border-orange-400 shadow-orange-200 ring-4 ring-orange-100' : 'border-gray-100'} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
                        {/* Header with gradient */}
                        <div className={`bg-gradient-to-r ${gradient} p-6 text-white relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/10"></div>
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
                          <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-white/10 rounded-full"></div>

                          <div className="relative z-10">
                            <div className="text-white/80 text-sm font-medium mb-1">
                              {t('homepage.pricing.package', 'Package')}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl md:text-5xl font-black">{pkg.activations}</span>
                              <span className="text-lg font-semibold text-white/90">Ⓐ</span>
                            </div>
                            <div className="text-white/80 text-sm mt-1">
                              {t('homepage.pricing.activations', 'activations')}
                            </div>
                          </div>
                        </div>

                        {/* Price Section - XOF Only */}
                        <div className="p-6">
                          {/* Savings Badge */}
                          {pkg.savings_percentage > 0 && (
                            <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
                              <Sparkles className="w-3 h-3" />
                              -{pkg.savings_percentage}%
                            </div>
                          )}

                          {/* Main Price - XOF Only */}
                          <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl md:text-4xl font-black text-gray-900">
                                {pkg.price_xof.toLocaleString('fr-FR')}
                              </span>
                              <span className="text-lg font-bold text-gray-500">FCFA</span>
                            </div>
                          </div>

                          {/* Per activation */}
                          <div className="bg-gray-50 rounded-xl p-3 mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">{t('homepage.pricing.perUnit', 'Par activation')}</span>
                              <span className="font-bold text-gray-700">
                                {Math.round(pkg.price_xof / pkg.activations).toLocaleString('fr-FR')} F
                              </span>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="space-y-2 mb-6">
                            {[
                              t('homepage.pricing.feature1', 'Livraison instantanée'),
                              t('homepage.pricing.feature2', 'Sans expiration'),
                              t('homepage.pricing.feature3', 'Support 24/7'),
                            ].map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          {/* CTA Button */}
                          <Link to="/register" className="block">
                            <Button className={`w-full h-12 font-bold text-base bg-gradient-to-r ${gradient} hover:opacity-90 shadow-lg transition-all duration-300 group-hover:shadow-xl`}>
                              {t('homepage.pricing.buyNow', 'Acheter')}
                              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback packages if DB is empty
                [
                  { activations: 5, price_xof: 500, is_popular: false, savings_percentage: 0 },
                  { activations: 10, price_xof: 1000, is_popular: false, savings_percentage: 0 },
                  { activations: 20, price_xof: 2000, is_popular: true, savings_percentage: 0 },
                  { activations: 50, price_xof: 5000, is_popular: false, savings_percentage: 0 },
                  { activations: 100, price_xof: 10000, is_popular: false, savings_percentage: 0 },
                ].map((pkg, index) => {
                  const isPopular = pkg.is_popular;
                  const gradient = isPopular ? 'from-orange-500 to-red-500' : 'from-blue-600 to-cyan-500';

                  return (
                    <div
                      key={index}
                      className={`flex-shrink-0 w-[280px] md:w-[300px] snap-center relative group ${isPopular ? 'z-10' : ''}`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/40 flex items-center gap-1.5 whitespace-nowrap">
                            <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                            {t('homepage.pricing.mostPopular', 'POPULAIRE')}
                            <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                          </div>
                        </div>
                      )}

                      <div className={`relative bg-white rounded-3xl shadow-xl border-2 ${isPopular ? 'border-orange-400 shadow-orange-200 ring-4 ring-orange-100' : 'border-gray-100'} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
                        <div className={`bg-gradient-to-r ${gradient} p-6 text-white relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/10"></div>
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
                          <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-white/10 rounded-full"></div>

                          <div className="relative z-10">
                            <div className="text-white/80 text-sm font-medium mb-1">
                              {t('homepage.pricing.package', 'Package')}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl md:text-5xl font-black">{pkg.activations}</span>
                              <span className="text-lg font-semibold text-white/90">Ⓐ</span>
                            </div>
                            <div className="text-white/80 text-sm mt-1">
                              {t('homepage.pricing.activations', 'activations')}
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          {pkg.savings_percentage > 0 && (
                            <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
                              <Sparkles className="w-3 h-3" />
                              -{pkg.savings_percentage}%
                            </div>
                          )}

                          <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl md:text-4xl font-black text-gray-900">
                                {pkg.price_xof.toLocaleString('fr-FR')}
                              </span>
                              <span className="text-lg font-bold text-gray-500">FCFA</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">{t('homepage.pricing.perUnit', 'Par activation')}</span>
                              <span className="font-bold text-gray-700">
                                {Math.round(pkg.price_xof / pkg.activations).toLocaleString('fr-FR')} F
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 mb-6">
                            {[
                              t('homepage.pricing.feature1', 'Livraison instantanée'),
                              t('homepage.pricing.feature2', 'Sans expiration'),
                              t('homepage.pricing.feature3', 'Support 24/7'),
                            ].map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          <Link to="/register" className="block">
                            <Button className={`w-full h-12 font-bold text-base bg-gradient-to-r ${gradient} hover:opacity-90 shadow-lg transition-all duration-300 group-hover:shadow-xl`}>
                              {t('homepage.pricing.buyNow', 'Acheter')}
                              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Scroll Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.min(5, topUpPackages.length || 5) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (carouselRef.current) {
                      const cardWidth = 320;
                      carouselRef.current.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
                    }
                  }}
                  className="w-2 h-2 rounded-full bg-gray-300 hover:bg-blue-500 transition-colors"
                />
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4">{t('homepage.pricing.customPackage', 'Need a custom package?')}</p>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all">
                {t('homepage.pricing.contactUs', 'Contact Us')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA - Clean design with proper background */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.2),transparent_70%)]"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_25%,rgba(255,255,255,0.02)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.02)_75%)] bg-[length:60px_60px]"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">{t('homepage.cta.title')}</h2>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('homepage.cta.subtitle')}
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white h-12 md:h-14 px-8 md:px-10 text-base md:text-lg font-bold shadow-xl shadow-blue-500/30 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              {t('homepage.cta.button')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
