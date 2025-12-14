const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'public/icons/icon-512x512.svg');
const outputDir = path.join(__dirname, 'public/icons');

// Read SVG
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  console.log('🎨 Generating PNG icons from SVG...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }
  
  // Generate special sizes
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(outputDir, 'icon-32x32.png'));
  console.log('✅ Generated: icon-32x32.png');
  
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('✅ Generated: favicon-16x16.png');
  
  // Generate badge for notifications
  await sharp(svgBuffer).resize(72, 72).png().toFile(path.join(outputDir, 'badge-72x72.png'));
  console.log('✅ Generated: badge-72x72.png');
  
  // Shortcut icons
  await sharp(svgBuffer).resize(96, 96).png().toFile(path.join(outputDir, 'shortcut-buy.png'));
  await sharp(svgBuffer).resize(96, 96).png().toFile(path.join(outputDir, 'shortcut-activations.png'));
  console.log('✅ Generated: shortcut icons');
  
  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
