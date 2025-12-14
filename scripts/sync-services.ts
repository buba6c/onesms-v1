#!/usr/bin/env node

/**
 * Script de synchronisation complète des services SMS-Activate
 * Utilise l'API REST Supabase avec SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// TOUS LES SERVICES À SYNCHRONISER
const services = [
  // 🌟 TOP SERVICES
  { code: 'wa', name: 'WhatsApp', category: 'social', icon: '📱', popularity: 1000 },
  { code: 'tg', name: 'Telegram', category: 'social', icon: '✈️', popularity: 980 },
  { code: 'ig', name: 'Instagram', category: 'social', icon: '📷', popularity: 960 },
  { code: 'fb', name: 'Facebook', category: 'social', icon: '👥', popularity: 940 },
  { code: 'go', name: 'Google', category: 'tech', icon: '🔍', popularity: 950 },
  { code: 'lf', name: 'TikTok', category: 'social', icon: '🎵', popularity: 920 },
  { code: 'tw', name: 'Twitter', category: 'social', icon: '🐦', popularity: 900 },
  { code: 'am', name: 'Amazon', category: 'shopping', icon: '📦', popularity: 880 },
  { code: 'oi', name: 'Tinder', category: 'dating', icon: '❤️', popularity: 860 },
  { code: 'mm', name: 'Microsoft', category: 'tech', icon: '🪟', popularity: 850 },
  
  // 📱 SOCIAL MEDIA
  { code: 'ds', name: 'Discord', category: 'social', icon: '💬', popularity: 820 },
  { code: 'fu', name: 'Snapchat', category: 'social', icon: '👻', popularity: 800 },
  { code: 'tn', name: 'LinkedIn', category: 'social', icon: '💼', popularity: 780 },
  { code: 'bnl', name: 'Reddit', category: 'social', icon: '🤖', popularity: 760 },
  { code: 'vi', name: 'Viber', category: 'social', icon: '📞', popularity: 740 },
  { code: 'wb', name: 'WeChat', category: 'social', icon: '💚', popularity: 720 },
  { code: 'me', name: 'Line', category: 'social', icon: '💚', popularity: 700 },
  { code: 'kt', name: 'KakaoTalk', category: 'social', icon: '💛', popularity: 680 },
  { code: 'vk', name: 'VK', category: 'social', icon: '🔵', popularity: 660 },
  { code: 'ok', name: 'Odnoklassniki', category: 'social', icon: '🟠', popularity: 640 },
  { code: 'bw', name: 'Signal', category: 'social', icon: '🔐', popularity: 620 },
  { code: 'op', name: 'Imo', category: 'social', icon: '💬', popularity: 600 },
  { code: 'chy', name: 'Zalo', category: 'social', icon: '💙', popularity: 580 },
  { code: 'qf', name: 'RedBook', category: 'social', icon: '📕', popularity: 560 },
  { code: 'hx', name: 'Weibo', category: 'social', icon: '🔴', popularity: 540 },
  { code: 'pz', name: 'Bilibili', category: 'social', icon: '📺', popularity: 520 },
  { code: 'qq', name: 'QQ', category: 'social', icon: '🐧', popularity: 500 },
  { code: 'lc', name: 'SoulApp', category: 'social', icon: '💫', popularity: 480 },
  { code: 'wh', name: 'TanTan', category: 'social', icon: '💕', popularity: 460 },
  { code: 'alc', name: 'BIGO LIVE', category: 'social', icon: '🎥', popularity: 440 },
  { code: 'cyb', name: 'Kwai', category: 'social', icon: '📱', popularity: 420 },
  { code: 'ayy', name: 'Clubhouse', category: 'social', icon: '🎙️', popularity: 400 },
  
  // 🛒 SHOPPING
  { code: 'ka', name: 'Shopee', category: 'shopping', icon: '🛍️', popularity: 850 },
  { code: 'dl', name: 'Lazada', category: 'shopping', icon: '🛒', popularity: 830 },
  { code: 'ep', name: 'Temu', category: 'shopping', icon: '🎁', popularity: 820 },
  { code: 'aez', name: 'Shein', category: 'shopping', icon: '👗', popularity: 810 },
  { code: 'hx', name: 'AliExpress', category: 'shopping', icon: '🏪', popularity: 800 },
  { code: 'za', name: 'JD.com', category: 'shopping', icon: '🐕', popularity: 780 },
  { code: 'xt', name: 'Flipkart', category: 'shopping', icon: '🛍️', popularity: 760 },
  { code: 'dh', name: 'eBay', category: 'shopping', icon: '🏷️', popularity: 740 },
  { code: 'sn', name: 'OLX', category: 'shopping', icon: '🔵', popularity: 720 },
  { code: 'xd', name: 'Tokopedia', category: 'shopping', icon: '🦜', popularity: 700 },
  { code: 'zm', name: 'Bukalapak', category: 'shopping', icon: '🐥', popularity: 680 },
  { code: 'kc', name: 'Vinted', category: 'shopping', icon: '👕', popularity: 660 },
  { code: 'bq', name: 'Wallapop', category: 'shopping', icon: '🌀', popularity: 640 },
  { code: 'dt', name: 'Marktplaats', category: 'shopping', icon: '🟠', popularity: 620 },
  { code: 'du', name: 'Subito', category: 'shopping', icon: '🔴', popularity: 600 },
  { code: 'kd', name: 'Carrefour', category: 'shopping', icon: '🏪', popularity: 580 },
  { code: 'ew', name: 'Nike', category: 'shopping', icon: '✔️', popularity: 560 },
  { code: 'wx', name: 'Apple', category: 'shopping', icon: '🍎', popularity: 900 },
  { code: 'wr', name: 'Walmart', category: 'shopping', icon: '⚡', popularity: 540 },
  { code: 'ju', name: 'Indomaret', category: 'shopping', icon: '🏪', popularity: 520 },
  
  // 💰 FINANCE
  { code: 'ts', name: 'PayPal', category: 'finance', icon: '💳', popularity: 870 },
  { code: 're', name: 'Coinbase', category: 'finance', icon: '🪙', popularity: 850 },
  { code: 'aon', name: 'Binance', category: 'finance', icon: '🟡', popularity: 840 },
  { code: 'nc', name: 'Payoneer', category: 'finance', icon: '💳', popularity: 820 },
  { code: 'ij', name: 'Revolut', category: 'finance', icon: '💳', popularity: 800 },
  { code: 'bo', name: 'Wise', category: 'finance', icon: '💚', popularity: 780 },
  { code: 'ti', name: 'Crypto.com', category: 'finance', icon: '💎', popularity: 760 },
  { code: 'xh', name: 'OVO', category: 'finance', icon: '💜', popularity: 740 },
  { code: 'fr', name: 'Dana', category: 'finance', icon: '💙', popularity: 720 },
  { code: 'hy', name: 'GoPay', category: 'finance', icon: '💚', popularity: 700 },
  { code: 'tm', name: 'Akulaku', category: 'finance', icon: '💰', popularity: 680 },
  { code: 'ev', name: 'PicPay', category: 'finance', icon: '💚', popularity: 660 },
  { code: 'aaa', name: 'Nubank', category: 'finance', icon: '💜', popularity: 640 },
  { code: 'aka', name: 'LinkAja', category: 'finance', icon: '❤️', popularity: 620 },
  { code: 'hw', name: 'Alipay', category: 'finance', icon: '💙', popularity: 880 },
  
  // 🍕 DELIVERY
  { code: 'ub', name: 'Uber', category: 'delivery', icon: '🚗', popularity: 860 },
  { code: 'jg', name: 'Grab', category: 'delivery', icon: '🟢', popularity: 840 },
  { code: 'ac', name: 'DoorDash', category: 'delivery', icon: '🔴', popularity: 820 },
  { code: 'aq', name: 'Glovo', category: 'delivery', icon: '🟡', popularity: 800 },
  { code: 'rr', name: 'Wolt', category: 'delivery', icon: '🔵', popularity: 780 },
  { code: 'nz', name: 'Foodpanda', category: 'delivery', icon: '🐼', popularity: 760 },
  { code: 'ni', name: 'Gojek', category: 'delivery', icon: '🟢', popularity: 740 },
  { code: 'ki', name: '99app', category: 'delivery', icon: '🟡', popularity: 720 },
  { code: 'xk', name: 'DiDi', category: 'delivery', icon: '🟠', popularity: 700 },
  { code: 'rl', name: 'inDriver', category: 'delivery', icon: '🔵', popularity: 680 },
  
  // ❤️ DATING
  { code: 'mo', name: 'Bumble', category: 'dating', icon: '💛', popularity: 840 },
  { code: 'vz', name: 'Hinge', category: 'dating', icon: '💕', popularity: 820 },
  { code: 'df', name: 'Happn', category: 'dating', icon: '💜', popularity: 800 },
  { code: 'qv', name: 'Badoo', category: 'dating', icon: '💙', popularity: 780 },
  { code: 'gr', name: 'Grindr', category: 'dating', icon: '🟡', popularity: 760 },
  { code: 'vm', name: 'OkCupid', category: 'dating', icon: '💚', popularity: 740 },
  { code: 'pf', name: 'POF', category: 'dating', icon: '🐠', popularity: 720 },
  { code: 'fd', name: 'Mamba', category: 'dating', icon: '💜', popularity: 700 },
  
  // 🎮 GAMING
  { code: 'mt', name: 'Steam', category: 'gaming', icon: '🎮', popularity: 880 },
  { code: 'aiw', name: 'Roblox', category: 'gaming', icon: '🟥', popularity: 860 },
  { code: 'blm', name: 'Epic Games', category: 'gaming', icon: '🎮', popularity: 840 },
  { code: 'ah', name: 'Escape From Tarkov', category: 'gaming', icon: '🔫', popularity: 820 },
  { code: 'bz', name: 'Blizzard', category: 'gaming', icon: '❄️', popularity: 800 },
  { code: 'pc', name: 'Casino/Gambling', category: 'gaming', icon: '🎰', popularity: 700 },
  
  // 🎬 ENTERTAINMENT
  { code: 'nf', name: 'Netflix', category: 'entertainment', icon: '🎬', popularity: 880 },
  { code: 'alj', name: 'Spotify', category: 'entertainment', icon: '🎵', popularity: 860 },
  { code: 'hb', name: 'Twitch', category: 'entertainment', icon: '🟣', popularity: 840 },
  { code: 'fv', name: 'Vidio', category: 'entertainment', icon: '📺', popularity: 720 },
  { code: 'gp', name: 'Ticketmaster', category: 'entertainment', icon: '🎫', popularity: 800 },
]

async function syncServices() {
  console.log('🚀 Début de la synchronisation des services...')
  console.log(`📊 Total: ${services.length} services\n`)
  
  let inserted = 0
  let updated = 0
  let errors = 0
  
  for (const service of services) {
    try {
      // Vérifier si le service existe
      const { data: existing } = await supabase
        .from('services')
        .select('code')
        .eq('code', service.code)
        .single()
      
      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('services')
          .update({
            name: service.name,
            display_name: service.name,
            category: service.category,
            icon: service.icon,
            popularity_score: service.popularity,
            updated_at: new Date().toISOString()
          })
          .eq('code', service.code)
        
        if (error) throw error
        updated++
        console.log(`✅ Mis à jour: ${service.code} - ${service.name}`)
      } else {
        // Insérer
        const { error } = await supabase
          .from('services')
          .insert({
            code: service.code,
            name: service.name,
            display_name: service.name,
            category: service.category,
            icon: service.icon,
            popularity_score: service.popularity,
            provider: 'sms-activate',
            active: true
          })
        
        if (error) throw error
        inserted++
        console.log(`🆕 Inséré: ${service.code} - ${service.name}`)
      }
    } catch (error) {
      console.error(`❌ Erreur pour ${service.code}:`, error)
      errors++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ SYNCHRONISATION TERMINÉE !')
  console.log('='.repeat(60))
  console.log(`🆕 Services insérés: ${inserted}`)
  console.log(`✏️ Services mis à jour: ${updated}`)
  console.log(`❌ Erreurs: ${errors}`)
  console.log(`📊 Total traité: ${inserted + updated + errors} / ${services.length}`)
  
  // Statistiques par catégorie
  const categories = new Map<string, number>()
  services.forEach(s => {
    categories.set(s.category, (categories.get(s.category) || 0) + 1)
  })
  
  console.log('\n📈 STATISTIQUES PAR CATÉGORIE:')
  console.log('='.repeat(60))
  for (const [category, count] of categories.entries()) {
    const icon = services.find(s => s.category === category)?.icon || '📌'
    console.log(`${icon} ${category}: ${count} services`)
  }
}

syncServices().catch(console.error)
