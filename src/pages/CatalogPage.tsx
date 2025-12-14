import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input';
import { Search, Check, ChevronRight } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  icon: string;
  numbers: number;
  category: string;
}

const POPULAR_SERVICES: Service[] = [
  { id: 'instagram', name: 'Instagram + Threads', icon: '📷', numbers: 1485012, category: 'social' },
  { id: 'google', name: 'Google,youtube,Gmail', icon: '🔍', numbers: 999418, category: 'email' },
  { id: 'whatsapp', name: 'Whatsapp', icon: '💬', numbers: 1359561, category: 'messaging' },
  { id: 'facebook', name: 'Facebook', icon: '👥', numbers: 1730427, category: 'social' },
  { id: 'apple', name: 'Apple', icon: '🍎', numbers: 3092476, category: 'tech' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', numbers: 1088119, category: 'messaging' },
  { id: 'tiktok', name: 'TikTok/Douyin', icon: '🎵', numbers: 2723355, category: 'social' },
  { id: 'twitter', name: 'Twitter / X', icon: '🐦', numbers: 3217757, category: 'social' },
  { id: 'microsoft', name: 'Microsoft', icon: '🪟', numbers: 2878159, category: 'tech' },
  { id: 'discord', name: 'Discord', icon: '🎮', numbers: 2156432, category: 'messaging' },
];

export default function CatalogPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'activation' | 'rent'>('activation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const filteredServices = POPULAR_SERVICES.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6">Order number</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('activation')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'activation'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('common.activation')}
          </button>
          <button
            onClick={() => setActiveTab('rent')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'rent'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('common.rent')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Services List */}
          <div className="lg:col-span-1">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Enter service name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Any Other Option - MASQUÉ pour activation */}
            {/* 
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">
                IF THE REQUIRED SERVICE IS NOT IN THE LIST
              </p>
              <button
                onClick={() => setSelectedService('any')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 transition-all ${
                  selectedService === 'any' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                  ❓
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Any other</p>
                  <p className="text-sm text-gray-500">1375367 numbers</p>
                </div>
              </button>
            </div>
            */}

            {/* Popular Services */}
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">POPULAR</p>
              <div className="space-y-2">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 transition-all ${
                      selectedService === service.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl">
                      {service.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-500">{service.numbers.toLocaleString()} numbers</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'activation' ? (
              <div className="space-y-6">
                {/* Activation Card */}
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-2">Activation</h2>
                  <p className="text-gray-600 mb-6">One-time SMS reception on a number from one site</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>New, previously unused number</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>Only SMS messages from the selected service / site / application</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>A huge number of numbers</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>Number usage time: up to 20 minutes</p>
                    </div>
                  </div>
                </Card>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">Step 1</h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      To create a second account in any service, select this service and country.
                    </p>
                  </Card>

                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">Step 2</h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      To receive SMS, copy the number and paste it into the registration form.
                    </p>
                  </Card>

                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">Step 3</h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      After receiving the SMS, copy the confirmation code to activate the account.
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Rent Card */}
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{t('catalog.rentTitle')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('catalog.rentDesc')}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>{t('catalog.rentFeature1')}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>{t('catalog.rentFeature2')}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      <p>{t('catalog.rentFeature3')}</p>
                    </div>
                  </div>
                </Card>

                {/* Steps for Rent */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">{t('catalog.step')} 1</h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('catalog.rentStep1')}
                    </p>
                  </Card>

                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">{t('catalog.step')} 2</h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('catalog.rentStep2')}
                    </p>
                  </Card>

                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">{t('catalog.step')} 3</h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('catalog.rentStep3')}
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
