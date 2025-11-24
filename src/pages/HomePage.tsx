import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Phone, 
  MessageSquare, 
  Globe, 
  Shield,
  Zap,
  DollarSign,
  Check,
  ArrowRight,
  Star
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Phone,
      title: '1000+ Services Supported',
      description: 'WhatsApp, Telegram, Instagram, Facebook, Twitter, and many more',
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: Globe,
      title: '150+ Countries Available',
      description: 'Virtual numbers from all major countries worldwide',
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      icon: Zap,
      title: 'Instant Delivery',
      description: 'Receive SMS codes within seconds, 24/7 availability',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: Shield,
      title: 'Privacy Protected',
      description: 'Your personal number stays private and secure',
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    },
    {
      icon: DollarSign,
      title: 'Affordable Prices',
      description: 'Starting from just 1Ⓐ per activation',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
    {
      icon: MessageSquare,
      title: 'SMS History',
      description: 'Access all your received messages anytime',
      color: 'text-pink-600',
      bg: 'bg-pink-100'
    }
  ];

  const popularServices = [
    { name: 'WhatsApp', icon: '💬', numbers: '1.3M+' },
    { name: 'Telegram', icon: '✈️', numbers: '1.1M+' },
    { name: 'Instagram', icon: '📷', numbers: '1.5M+' },
    { name: 'Facebook', icon: '👥', numbers: '1.7M+' },
    { name: 'Google', icon: '🔍', numbers: '999K+' },
    { name: 'Twitter/X', icon: '🐦', numbers: '3.2M+' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">Trusted by 100,000+ users worldwide</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Receive SMS Online
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                Instantly & Anonymously
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Get virtual phone numbers for SMS verification from 150+ countries. 
              Perfect for account creation, testing, and privacy protection.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 h-14 px-8 text-lg font-semibold">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/catalog">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 h-14 px-8 text-lg font-semibold">
                  Browse Numbers
                </Button>
              </Link>
            </div>

            {/* Popular Services Badges */}
            <div className="mt-16">
              <p className="text-sm text-blue-200 mb-4">SUPPORTED SERVICES</p>
              <div className="flex flex-wrap justify-center gap-3">
                {popularServices.map((service) => (
                  <div key={service.name} 
                       className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="text-2xl">{service.icon}</span>
                    <span className="font-medium">{service.name}</span>
                    <span className="text-xs text-blue-200">({service.numbers})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose SMS Virtual?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The most reliable virtual SMS service with unbeatable features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-500">
                <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get your virtual number in 3 simple steps</p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Select Service & Country</h3>
              <p className="text-gray-600">
                Choose from 1000+ services and 150+ countries
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Get Your Number</h3>
              <p className="text-gray-600">
                Receive a virtual number instantly, ready to use
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Receive SMS</h3>
              <p className="text-gray-600">
                Get verification codes instantly in your dashboard
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Pay only for what you use. No subscriptions, no hidden fees.
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto mb-8">
            <div className="text-6xl font-bold mb-2">1 Ⓐ</div>
            <div className="text-2xl text-gray-300 mb-6">Starting Price</div>
            <ul className="text-left space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>Instant SMS delivery</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>No expiration on credits</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>24/7 support</span>
              </li>
            </ul>
          </div>

          <Link to="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-8 text-lg font-semibold">
              Start Now - It's Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust SMS Virtual for their verification needs
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 h-14 px-8 text-lg font-semibold">
              Create Free Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
