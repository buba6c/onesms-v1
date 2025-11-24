#!/usr/bin/env node
/**
 * 🎯 GÉNÉRATEUR AUTOMATIQUE D'ICÔNES DE SERVICES
 * 
 * Script complet pour importer des icônes de +1300 services depuis multiple sources.
 * Génère SVG optimisé + PNG (32, 64, 128, 256, 512) et upload sur S3.
 * 
 * Sources (par priorité):
 * 1. simple-icons (fuzzy matching)
 * 2. Brandfetch API (avec vectorisation si PNG)
 * 3. Clearbit Logo API
 * 4. Google Favicon API
 * 5. Fallback (SVG généré avec initiales + couleur)
 * 
 * Usage: node import-icons.js
 */

// Load environment variables from .env.icons
import { config } from 'dotenv'
config({ path: '.env.icons' })

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import crypto from 'crypto'

// Dependencies
import * as simpleIcons from 'simple-icons'
import stringSimilarity from 'string-similarity'
import fetch from 'node-fetch'
import sharp from 'sharp'
import { optimize } from 'svgo'
import potrace from 'potrace'
import pLimit from 'p-limit'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

// Configuration
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT_DIR = join(__dirname, 'out-icons')
const PNG_SIZES = [32, 64, 128, 256, 512]
const CONCURRENCY_LIMIT = 10
const NDJSON_FILE = join(__dirname, 'import-results.ndjson')
const JSON_FILE = join(__dirname, 'import-results.json')

// Environment variables
const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const S3_BUCKET = process.env.S3_BUCKET
const S3_BASE_URL = process.env.S3_BASE_URL || `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validation
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET) {
  console.error('❌ Missing AWS credentials. Please set:')
  console.error('   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Please set:')
  console.error('   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize clients
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
})

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize service name for matching
 */
function normalizeServiceName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Remove duplicate hyphens
    .trim()
}

/**
 * Generate color from string hash
 */
function hashColor(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex')
  const hue = parseInt(hash.substring(0, 2), 16)
  const sat = 65 + (parseInt(hash.substring(2, 4), 16) % 20)
  const light = 45 + (parseInt(hash.substring(4, 6), 16) % 15)
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

/**
 * Generate initials from service name
 */
function getInitials(name) {
  const words = name.split(/[\s-]+/).filter(w => w.length > 0)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Optimize SVG with SVGO
 */
function optimizeSVG(svgString) {
  try {
    const result = optimize(svgString, {
      multipass: true,
      plugins: [
        'removeDoctype',
        'removeXMLProcInst',
        'removeComments',
        'removeMetadata',
        'removeEditorsNSData',
        'cleanupAttrs',
        'mergeStyles',
        'inlineStyles',
        'minifyStyles',
        'cleanupIds',
        'removeUselessDefs',
        'cleanupNumericValues',
        'convertColors',
        'removeUnknownsAndDefaults',
        'removeNonInheritableGroupAttrs',
        'removeUselessStrokeAndFill',
        'removeViewBox',
        'cleanupEnableBackground',
        'removeHiddenElems',
        'removeEmptyText',
        'convertShapeToPath',
        'convertEllipseToCircle',
        'moveElemsAttrsToGroup',
        'moveGroupAttrsToElems',
        'collapseGroups',
        'convertPathData',
        'convertTransform',
        'removeEmptyAttrs',
        'removeEmptyContainers',
        'mergePaths',
        'removeUnusedNS',
        'sortDefsChildren',
        'removeTitle',
        'removeDesc',
      ],
    })
    return result.data
  } catch (error) {
    console.error('⚠️  SVGO optimization failed:', error.message)
    return svgString
  }
}

/**
 * Vectorize PNG to SVG using potrace
 */
async function vectorizePNG(pngBuffer) {
  return new Promise((resolve, reject) => {
    potrace.trace(pngBuffer, {
      background: '#FFFFFF',
      color: 'auto',
      threshold: 128,
    }, (err, svg) => {
      if (err) reject(err)
      else resolve(svg)
    })
  })
}

/**
 * Generate PNG from SVG buffer
 */
async function generatePNG(svgBuffer, size) {
  return sharp(svgBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/**
 * Upload file to S3
 */
async function uploadToS3(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    // ACL removed - bucket must be configured with public read via bucket policy
  })

  try {
    await s3Client.send(command)
    return `${S3_BASE_URL}/${key}`
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`)
  }
}

/**
 * Append result to NDJSON file (real-time logging)
 */
async function appendToNDJSON(result) {
  await fs.appendFile(NDJSON_FILE, JSON.stringify(result) + '\n', 'utf-8')
}

// ============================================================================
// ICON SOURCES
// ============================================================================

/**
 * 1. Try simple-icons (fuzzy matching)
 */
async function trySimpleIcons(serviceName, serviceCode) {
  try {
    // Direct slug match
    const normalizedCode = normalizeServiceName(serviceCode)
    let icon = simpleIcons[`si${normalizedCode.charAt(0).toUpperCase() + normalizedCode.slice(1).replace(/-/g, '')}`]
    
    if (!icon) {
      // Fuzzy search on all icon titles
      const iconList = Object.values(simpleIcons).filter(i => i && i.title)
      const titles = iconList.map(i => i.title)
      const matches = stringSimilarity.findBestMatch(serviceName, titles)
      
      if (matches.bestMatch.rating > 0.6) {
        icon = iconList.find(i => i.title === matches.bestMatch.target)
      }
    }

    if (icon && icon.svg) {
      console.log(`  ✅ Found in simple-icons: ${icon.title}`)
      const svg = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#${icon.hex}"><title>${icon.title}</title><path d="${icon.path}"/></svg>`
      return { source: 'simple-icons', svg: optimizeSVG(svg) }
    }
  } catch (error) {
    console.log(`  ⚠️  simple-icons error: ${error.message}`)
  }
  return null
}

/**
 * 2. Try Brandfetch API
 */
async function tryBrandfetch(serviceName, serviceCode) {
  if (!BRANDFETCH_API_KEY) return null

  try {
    const domain = `${normalizeServiceName(serviceCode)}.com`
    const response = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { 'Authorization': `Bearer ${BRANDFETCH_API_KEY}` },
    })

    if (!response.ok) return null

    const data = await response.json()
    const logo = data.logos?.[0]

    if (!logo) return null

    // Download logo
    const logoResponse = await fetch(logo.formats[0].src)
    const logoBuffer = Buffer.from(await logoResponse.arrayBuffer())

    // Check if SVG or PNG
    const contentType = logoResponse.headers.get('content-type')
    
    if (contentType.includes('svg')) {
      console.log(`  ✅ Found SVG in Brandfetch`)
      return { source: 'brandfetch', svg: optimizeSVG(logoBuffer.toString()) }
    } else if (contentType.includes('png') || contentType.includes('jpeg')) {
      console.log(`  ✅ Found PNG in Brandfetch, vectorizing...`)
      const svg = await vectorizePNG(logoBuffer)
      return { source: 'brandfetch', svg: optimizeSVG(svg) }
    }
  } catch (error) {
    console.log(`  ⚠️  Brandfetch error: ${error.message}`)
  }
  return null
}

/**
 * 3. Try Clearbit Logo API
 */
async function tryClearbit(serviceName, serviceCode) {
  const domains = [
    `${normalizeServiceName(serviceCode)}.com`,
    `${normalizeServiceName(serviceName)}.com`,
    `${normalizeServiceName(serviceCode)}.io`,
  ]

  for (const domain of domains) {
    try {
      const url = `https://logo.clearbit.com/${domain}?size=256`
      const response = await fetch(url)
      
      if (response.ok) {
        console.log(`  ✅ Found PNG in Clearbit (${domain}), vectorizing...`)
        const buffer = Buffer.from(await response.arrayBuffer())
        const svg = await vectorizePNG(buffer)
        return { source: 'clearbit', svg: optimizeSVG(svg) }
      }
    } catch (error) {
      // Continue to next domain
    }
  }
  return null
}

/**
 * 4. Try Google Favicon API
 */
async function tryGoogleFavicon(serviceName, serviceCode) {
  const domains = [
    `${normalizeServiceName(serviceCode)}.com`,
    `${normalizeServiceName(serviceName)}.com`,
  ]

  for (const domain of domains) {
    try {
      const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
      const response = await fetch(url)
      
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer())
        
        // Check if it's not the default favicon (too small)
        if (buffer.length > 1000) {
          console.log(`  ✅ Found favicon from Google (${domain}), vectorizing...`)
          const svg = await vectorizePNG(buffer)
          return { source: 'google-favicon', svg: optimizeSVG(svg) }
        }
      }
    } catch (error) {
      // Continue to next domain
    }
  }
  return null
}

/**
 * 5. Generate fallback SVG
 */
function generateFallback(serviceName) {
  const initials = getInitials(serviceName)
  const color = hashColor(serviceName)
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${color}" rx="12"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="45" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">
        ${initials}
      </text>
    </svg>
  `
  
  console.log(`  🎨 Generated fallback with initials: ${initials}`)
  return { source: 'fallback', svg: optimizeSVG(svg) }
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

/**
 * Process one service
 */
async function processService(service) {
  const { id, code, name, display_name } = service
  const displayName = display_name || name
  
  console.log(`\n📦 Processing: ${displayName} (${code})`)
  
  const result = {
    id,
    code,
    name: displayName,
    success: false,
    source: null,
    svg_url: null,
    png_urls: {},
    error: null,
    timestamp: new Date().toISOString(),
  }

  try {
    // Try each source in order
    let iconData = 
      await trySimpleIcons(displayName, code) ||
      await tryBrandfetch(displayName, code) ||
      await tryClearbit(displayName, code) ||
      await tryGoogleFavicon(displayName, code) ||
      generateFallback(displayName)

    if (!iconData || !iconData.svg) {
      throw new Error('Failed to obtain SVG from all sources')
    }

    result.source = iconData.source
    const svgBuffer = Buffer.from(iconData.svg)

    // Create output directory for this service
    const serviceDir = join(OUTPUT_DIR, code)
    await fs.mkdir(serviceDir, { recursive: true })

    // Upload SVG to S3
    console.log(`  📤 Uploading SVG...`)
    const svgKey = `icons/${code}/icon.svg`
    result.svg_url = await uploadToS3(svgBuffer, svgKey, 'image/svg+xml')

    // Generate and upload PNGs
    console.log(`  🖼️  Generating PNGs...`)
    for (const size of PNG_SIZES) {
      const pngBuffer = await generatePNG(svgBuffer, size)
      const pngKey = `icons/${code}/icon-${size}.png`
      const pngUrl = await uploadToS3(pngBuffer, pngKey, 'image/png')
      result.png_urls[size] = pngUrl
      console.log(`    ✓ ${size}x${size}`)
    }

    // Update Supabase
    console.log(`  💾 Updating database...`)
    const { error: updateError } = await supabase
      .from('services')
      .update({ 
        icon_url: result.svg_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    result.success = true
    console.log(`  ✅ SUCCESS! (${iconData.source})`)

  } catch (error) {
    result.error = error.message
    console.error(`  ❌ ERROR: ${error.message}`)
  }

  // Append to NDJSON (real-time)
  await appendToNDJSON(result)

  return result
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 GÉNÉRATEUR AUTOMATIQUE D\'ICÔNES DE SERVICES\n')
  console.log('Configuration:')
  console.log(`  S3 Bucket: ${S3_BUCKET}`)
  console.log(`  Output Dir: ${OUTPUT_DIR}`)
  console.log(`  Concurrency: ${CONCURRENCY_LIMIT}`)
  console.log(`  Brandfetch API: ${BRANDFETCH_API_KEY ? '✓ Enabled' : '✗ Disabled'}`)
  console.log('')

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Clear NDJSON file
  await fs.writeFile(NDJSON_FILE, '', 'utf-8')

  // Fetch all services from Supabase
  console.log('📥 Fetching services from Supabase...')
  
  // Check for --limit argument
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
  const limit_services = limitArg ? parseInt(limitArg.split('=')[1]) : null
  
  let query = supabase
    .from('services')
    .select('id, code, name, display_name')
    .order('popularity_score', { ascending: false })
  
  if (limit_services) {
    query = query.limit(limit_services)
    console.log(`🧪 TEST MODE: Limité à ${limit_services} services`)
  }
  
  const { data: services, error } = await query

  if (error) {
    console.error('❌ Failed to fetch services:', error.message)
    process.exit(1)
  }

  console.log(`✅ Found ${services.length} services\n`)

  // Process in batches with concurrency limit
  const limit = pLimit(CONCURRENCY_LIMIT)
  const startTime = Date.now()

  const results = await Promise.all(
    services.map(service => limit(() => processService(service)))
  )

  // Write final JSON
  await fs.writeFile(JSON_FILE, JSON.stringify(results, null, 2), 'utf-8')

  // Statistics
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  const sourceStats = results.reduce((acc, r) => {
    if (r.source) acc[r.source] = (acc[r.source] || 0) + 1
    return acc
  }, {})

  console.log('\n' + '='.repeat(70))
  console.log('📊 STATISTIQUES FINALES')
  console.log('='.repeat(70))
  console.log(`✅ Succès:           ${successful}/${services.length}`)
  console.log(`❌ Échecs:           ${failed}`)
  console.log(`⏱️  Durée totale:     ${duration}s`)
  console.log(`⚡ Vitesse moyenne:  ${(services.length / duration).toFixed(2)} services/s`)
  console.log('')
  console.log('📦 Sources utilisées:')
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`   ${source.padEnd(20)} ${count}`)
  })
  console.log('')
  console.log(`📁 Fichiers générés:`)
  console.log(`   ${NDJSON_FILE}`)
  console.log(`   ${JSON_FILE}`)
  console.log('='.repeat(70))
  console.log('\n✨ Terminé!')
}

// Execute
main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
