// This script generates proper icon files
const fs = require('fs');
const path = require('path');

// Base SVG template for icons
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#EF6F6C" rx="20%" ry="20%" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${size * 0.4}" fill="white">N</text>
  <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${size * 0.1}" fill="white">Nestled</text>
</svg>
`;

// Icon sizes to generate
const sizes = [192, 384, 512];

// Generate SVG files
sizes.forEach(size => {
  // Write SVG file
  const svgFilePath = path.join(__dirname, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgFilePath, createIconSVG(size));
  console.log(`Generated SVG icon: ${svgFilePath}`);
  
  // For PWA compatibility, also save the SVG content to the PNG filename
  // This is a temporary solution; in a real app, you'd use a proper image conversion tool
  const pngFilePath = path.join(__dirname, `icon-${size}x${size}.png`);
  fs.writeFileSync(pngFilePath, createIconSVG(size));
  console.log(`Generated PNG icon: ${pngFilePath}`);
});

console.log('Icon generation complete. To create real PNG files, please use a proper image conversion tool or service.'); 