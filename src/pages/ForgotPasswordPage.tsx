import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resetPasswordForEmail } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!email || !email.includes('@')) {
      toast({
        title: 'Email invalide',
        description: 'Veuillez entrer une adresse email valide.',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const { error } = await resetPasswordForEmail(email)

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthLayout
        title={t('auth.emailSent', 'Check your email')}
        subtitle={t('auth.resetEmailSentDescription', 'We have sent a password reset link to your email address.')}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-700">
            <p className="font-medium mb-1">{t('auth.checkSpam', 'Please check your spam folder if you do not see the email.')}</p>
            <p className="text-blue-600 font-bold">{email}</p>
          </div>
          
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50 transition-all font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('auth.backToLogin', 'Back to login')}
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.forgotPasswordTitle', 'Forgot Password?')}
      subtitle={t('auth.forgotPasswordDescription', "No worries, we'll send you reset instructions.")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            {t('auth.email', 'Email')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="eg. alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all" 
          disabled={loading}
        >
          {loading ? t('common.loading', 'Loading...') : t('auth.sendResetLink', 'Send reset link')}
        </Button>
      </form>

      <div className="mt-8 text-center space-y-4">
        <Link 
          to="/login" 
          className="text-sm font-semibold text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.backToLogin', 'Back to login')}
        </Link>
        <div className="text-sm text-gray-500">
          Pas de compte ?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
            Créer un compte
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
