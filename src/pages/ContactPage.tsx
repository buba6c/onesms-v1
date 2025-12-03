import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { contactSettingsApi } from '@/lib/api/contactSettings';
import { 
  Mail, 
  MessageSquare, 
  Send, 
  MapPin, 
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function ContactPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // Fetch contact settings from database
  const { data: settings } = useQuery({
    queryKey: ['contact-settings'],
    queryFn: contactSettingsApi.getSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    
    toast({
      title: t('toasts.messageSent'),
      description: t('toasts.messageSentDesc'),
    });

    // Reset form after showing success
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitted(false);
    }, 3000);
  };

  // Build contact info from settings
  const contactInfo = [
    {
      icon: Mail,
      title: t('contact.email'),
      value: settings?.email || 'support@onesms-sn.com',
      description: settings?.email_response_time || t('contact.emailResponseTime')
    },
    {
      icon: MessageSquare,
      title: t('contact.whatsapp'),
      value: settings?.whatsapp || '+221 77 123 45 67',
      description: settings?.whatsapp_hours || t('contact.whatsappHours')
    },
    {
      icon: MapPin,
      title: t('contact.address'),
      value: settings?.address || 'Dakar, Sénégal',
      description: settings?.address_detail || t('contact.addressDetail')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.2),transparent_60%)]"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Support Client</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
              Contactez-
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">nous</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100/80 max-w-2xl mx-auto">
              Une question ? Un besoin spécifique ? Notre équipe est là pour vous aider.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Contact Info Cards */}
              <div className="lg:col-span-1 space-y-4">
                {contactInfo.map((info, index) => (
                  <Card 
                    key={index}
                    className="p-6 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <info.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">{info.title}</h3>
                        <p className="text-blue-600 font-medium">{info.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Hours Card */}
                <Card className="p-6 bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-0 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Horaires</h3>
                      <div className="space-y-1 text-sm text-blue-100">
                        <p>{settings?.hours_weekday || 'Lundi - Vendredi: 9h - 18h'}</p>
                        <p>{settings?.hours_saturday || 'Samedi: 9h - 14h'}</p>
                        <p>{settings?.hours_sunday || 'Dimanche: Fermé'}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <Card className="p-8 bg-white border-0 shadow-xl">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Envoyez-nous un message</h2>
                    <p className="text-gray-600">Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.</p>
                  </div>

                  {isSubmitted ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé !</h3>
                      <p className="text-gray-600">Merci de nous avoir contactés. Nous vous répondrons très bientôt.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('contact.form.name')}
                          </label>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t('contact.form.namePlaceholder')}
                            required
                            className="h-12"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('contact.form.email')}
                          </label>
                          <Input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={t('contact.form.emailPlaceholder')}
                            required
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('contact.form.subject')}
                        </label>
                        <Input
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder={t('contact.form.subjectPlaceholder')}
                          required
                          className="h-12"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('contact.form.message')}
                        </label>
                        <Textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder={t('contact.form.messagePlaceholder')}
                          required
                          rows={6}
                          className="resize-none"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {t('common.loading')}
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            {t('contact.form.send')}
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Quick Links */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Questions fréquentes</h3>
            <p className="text-gray-600 mb-6">
              Consultez notre FAQ pour des réponses rapides aux questions courantes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Comment recharger ?', 'Délai de réception SMS', 'Remboursement', 'Services supportés'].map((q, i) => (
                <span 
                  key={i}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-full text-sm font-medium transition-colors cursor-pointer"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
