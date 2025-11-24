/**
 * 🎨 EDGE FUNCTION - Génération automatique d'icônes de services
 * 
 * Déclenché automatiquement lors de l'insertion d'un nouveau service
 * ou peut être appelé manuellement via POST
 * 
 * @endpoint POST /functions/v1/generate-service-icon
 * @body { "service_id": "uuid" } ou { "service_code": "code" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface ServiceData {
  id: string
  code: string
  name: string
  display_name?: string
}

interface IconResult {
  success: boolean
  source?: string
  svg_url?: string
  error?: string
}

// ============================================================================
// ICON SOURCES
// ============================================================================

/**
 * Try to find icon in simple-icons library
 */
async function trySimpleIcons(serviceName: string): Promise<string | null> {
  try {
    // Simple fuzzy matching with common service names
    const normalized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Map to simple-icons names
    const iconMap: Record<string, string> = {
      'whatsapp': 'whatsapp',
      'telegram': 'telegram',
      'facebook': 'facebook',
      'instagram': 'instagram',
      'twitter': 'twitter',
      'tiktok': 'tiktok',
      'google': 'google',
      'amazon': 'amazon',
      'netflix': 'netflix',
      'spotify': 'spotify',
      'youtube': 'youtube',
      'linkedin': 'linkedin',
      'discord': 'discord',
      'slack': 'slack',
      'uber': 'uber',
      'airbnb': 'airbnb',
      'paypal': 'paypal',
      'stripe': 'stripe',
    }
    
    const iconName = iconMap[normalized]
    if (!iconName) return null
    
    // Fetch from simple-icons CDN
    const response = await fetch(`https://cdn.simpleicons.org/${iconName}`)
    if (!response.ok) return null
    
    return await response.text()
  } catch {
    return null
  }
}

/**
 * Try to get icon from Clearbit Logo API
 */
async function tryClearbit(serviceName: string): Promise<string | null> {
  try {
    const domain = `${serviceName.toLowerCase().replace(/\s+/g, '')}.com`
    const response = await fetch(`https://logo.clearbit.com/${domain}?size=256&format=png`)
    
    if (!response.ok) return null
    
    // For MVP, we'll return the PNG URL directly
    // In production, you'd want to convert PNG to SVG
    return `https://logo.clearbit.com/${domain}?size=256&format=png`
  } catch {
    return null
  }
}

/**
 * Generate fallback SVG with initials
 */
function generateFallback(serviceName: string): string {
  const initials = serviceName
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'XX'
  
  // Generate color from service name
  let hash = 0
  for (let i = 0; i < serviceName.length; i++) {
    hash = serviceName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = `hsl(${hash % 360}, 65%, 50%)`
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${color}" rx="20"/>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central" 
        font-family="Arial, sans-serif" font-size="40" font-weight="bold" 
        fill="white">${initials}</text>
</svg>`
}

/**
 * Upload SVG to S3
 */
async function uploadToS3(
  svgContent: string,
  serviceCode: string,
  awsConfig: { accessKeyId: string; secretAccessKey: string; bucket: string; region: string }
): Promise<string> {
  const key = `icons/${serviceCode}/icon.svg`
  const url = `https://${awsConfig.bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`
  
  // Create AWS Signature V4
  const endpoint = `https://${awsConfig.bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`
  
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-amz-acl': 'public-read',
      },
      body: svgContent,
    })
    
    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status}`)
    }
    
    return url
  } catch (error) {
    console.error('S3 upload error:', error)
    throw error
  }
}

/**
 * Main icon generation logic
 */
async function generateIcon(service: ServiceData, awsConfig: any): Promise<IconResult> {
  const serviceName = service.display_name || service.name
  
  console.log(`🎨 Generating icon for: ${serviceName} (${service.code})`)
  
  try {
    // Try sources in order
    let svgContent: string | null = null
    let source: string = ''
    
    // 1. Simple Icons
    svgContent = await trySimpleIcons(serviceName)
    if (svgContent) {
      source = 'simple-icons'
      console.log(`  ✅ Found in simple-icons`)
    }
    
    // 2. Clearbit (returns PNG URL for now)
    if (!svgContent) {
      const clearbitUrl = await tryClearbit(serviceName)
      if (clearbitUrl) {
        // For MVP, store PNG URL directly
        await updateServiceIcon(service.id, clearbitUrl)
        return {
          success: true,
          source: 'clearbit',
          svg_url: clearbitUrl,
        }
      }
    }
    
    // 3. Fallback
    if (!svgContent) {
      svgContent = generateFallback(serviceName)
      source = 'fallback'
      console.log(`  🎨 Generated fallback`)
    }
    
    // Upload to S3 (requires AWS credentials in environment)
    if (awsConfig.enabled) {
      try {
        const svgUrl = await uploadToS3(svgContent, service.code, awsConfig)
        await updateServiceIcon(service.id, svgUrl)
        
        return {
          success: true,
          source,
          svg_url: svgUrl,
        }
      } catch (uploadError) {
        console.error('S3 upload failed, saving SVG directly to database')
        // Fallback: save SVG as data URL
        const dataUrl = `data:image/svg+xml;base64,${btoa(svgContent)}`
        await updateServiceIcon(service.id, dataUrl)
        
        return {
          success: true,
          source: `${source}-dataurl`,
          svg_url: dataUrl,
        }
      }
    } else {
      // No S3 configured, save as data URL
      const dataUrl = `data:image/svg+xml;base64,${btoa(svgContent)}`
      await updateServiceIcon(service.id, dataUrl)
      
      return {
        success: true,
        source: `${source}-dataurl`,
        svg_url: dataUrl,
      }
    }
  } catch (error) {
    console.error(`❌ Error generating icon:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update service with icon URL
 */
async function updateServiceIcon(serviceId: string, iconUrl: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { error } = await supabase
    .from('services')
    .update({ 
      icon_url: iconUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', serviceId)
  
  if (error) {
    throw new Error(`Database update failed: ${error.message}`)
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // AWS Configuration (optional)
    const awsConfig = {
      enabled: !!Deno.env.get('AWS_ACCESS_KEY_ID'),
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      bucket: Deno.env.get('S3_BUCKET') ?? '',
      region: Deno.env.get('AWS_REGION') ?? 'eu-north-1',
    }

    // Parse request
    const body = await req.json()
    const { service_id, service_code, record } = body

    let service: ServiceData | null = null

    // Case 1: Triggered by database trigger (webhook)
    if (record?.id) {
      service = {
        id: record.id,
        code: record.code,
        name: record.name,
        display_name: record.display_name,
      }
    }
    // Case 2: Manual call with service_id
    else if (service_id) {
      const { data, error } = await supabase
        .from('services')
        .select('id, code, name, display_name')
        .eq('id', service_id)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Service not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
      service = data
    }
    // Case 3: Manual call with service_code
    else if (service_code) {
      const { data, error } = await supabase
        .from('services')
        .select('id, code, name, display_name')
        .eq('code', service_code)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Service not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
      service = data
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing service_id, service_code, or record' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate icon
    const result = await generateIcon(service, awsConfig)

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
