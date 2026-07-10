import React from 'react';
import { Home, ShoppingCart, CreditCard, ChevronLeft, MessageCircle, Menu } from 'lucide-react';

export default function ExportUIPage() {
  return (
    <div className="w-[1290px] h-[2796px] bg-slate-50 flex flex-col relative overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-16 pb-8 pt-24 bg-white shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="text-6xl font-bold text-blue-600 font-display tracking-tighter">
            One<span className="text-cyan-500">SMS</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center bg-blue-50 px-8 py-4 rounded-full border border-blue-100">
            <span className="text-4xl font-bold text-blue-600">15 Ⓐ</span>
          </div>
          <Menu className="w-16 h-16 text-slate-600" />
        </div>
      </div>

      {/* Search / Service Selection */}
      <div className="px-16 py-12 bg-white z-10 shadow-sm relative">
        <div className="flex items-center justify-between bg-blue-600 rounded-[40px] px-12 py-8 border border-blue-500 shadow-sm shadow-blue-500/20 mb-12">
          <div className="flex flex-col">
            <span className="text-3xl text-blue-100 font-medium leading-none mb-4">Service actuel</span>
            <span className="text-5xl font-bold text-white leading-none">Changer de service</span>
          </div>
          <ChevronLeft className="w-16 h-16 text-white opacity-70" />
        </div>
        <div className="flex items-center gap-6 bg-slate-100 rounded-[40px] px-12 py-8 border border-slate-200">
          <MessageCircle className="w-12 h-12 text-slate-400" />
          <span className="text-4xl font-medium text-slate-400">Search country...</span>
        </div>
      </div>

      {/* Countries List */}
      <div className="flex-1 relative overflow-hidden bg-slate-50 px-16 py-8 flex flex-col gap-8">
        {[
          { flag: '🇮🇩', name: 'Indonesia', tag: 'TOP', price: 23, success: 93.7 },
          { flag: '🇨🇴', name: 'Colombia', tag: 'TOP', price: 30, success: 86.3 },
          { flag: '🇧🇷', name: 'Brazil', tag: 'PREMIUM', price: 104, success: 98.6 },
          { flag: '🇨🇱', name: 'Chile', tag: 'TOP', price: 30, success: 85.0 },
          { flag: '🇵🇭', name: 'Philippines', tag: 'TOP', price: 25, success: 94.2 },
          { flag: '🇺🇸', name: 'United States', tag: 'TOP', price: 45, success: 99.1 },
          { flag: '🇬🇧', name: 'United Kingdom', tag: 'HOT', price: 60, success: 97.4 },
          { flag: '🇮🇳', name: 'India', tag: 'TOP', price: 15, success: 91.2 },
          { flag: '🇩🇪', name: 'Germany', tag: 'PREMIUM', price: 85, success: 99.5 },
          { flag: '🇫🇷', name: 'France', tag: 'HOT', price: 70, success: 98.1 },
        ].map((country, idx) => (
          <div key={idx} className="w-full bg-white rounded-[40px] p-12 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="text-7xl">{country.flag}</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-bold text-slate-800 leading-none">{country.name}</span>
                  {country.tag === 'PREMIUM' ? (
                    <span className="text-2xl px-4 py-2 rounded-xl bg-purple-100 text-purple-700 font-bold tracking-wider leading-none">{country.tag}</span>
                  ) : (
                    <span className="text-2xl px-4 py-2 rounded-xl bg-green-100 text-green-700 font-bold tracking-wider leading-none">{country.tag}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className="w-4 h-4 rounded-full bg-green-500"></span>
                  <span className="text-3xl text-slate-500 leading-none">{country.success}% Succès</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 text-blue-700 font-bold text-4xl px-8 py-4 rounded-[20px] border border-blue-100 leading-none h-max">
              {country.price} Ⓐ
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-100 flex justify-around items-center py-12 px-16 pb-24 z-10 relative shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Home className="w-16 h-16" />
          <span className="text-3xl font-medium">Accueil</span>
        </div>
        <div className="flex flex-col items-center justify-center -mt-32">
          <div className="w-48 h-48 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 text-white border-[12px] border-slate-50">
            <ShoppingCart className="w-20 h-20 translate-x-[-2px]" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <CreditCard className="w-16 h-16" />
          <span className="text-3xl font-medium">Recharger</span>
        </div>
      </div>
    </div>
  );
}
