const fs = require('fs');
const path = require('path');

// Simple script to generate icon files from SVG
async function generateIcons() {
  try {
    // Try to use sharp for image conversion
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '../public/icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    console.log('Generating PNG icons from SVG...\n');

    // Generate 192x192 icon
    console.log('Creating icon-192x192.png...');
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/icon-192x192.png'));
    console.log('✓ icon-192x192.png created');

    // Generate 512x512 icon
    console.log('Creating icon-512x512.png...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, '../public/icon-512x512.png'));
    console.log('✓ icon-512x512.png created');

    // Generate Apple Touch Icon (180x180)
    console.log('Creating apple-touch-icon.png...');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    console.log('✓ apple-touch-icon.png created');

    console.log('\n✅ All icons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Refresh your browser at http://localhost:3000');
    console.log('2. Check for the install button in the address bar');
    console.log('3. The 404 errors should be gone!\n');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Installing required package (sharp) for image processing...\n');
      console.log('Please run: npm install sharp\n');
      console.log('Then run this script again: node scripts/generate-icons.js\n');
    } else {
      console.error('Error generating icons:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
