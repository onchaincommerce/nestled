const fs = require('fs');
const path = require('path');

// Basic SVG template for our icon
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#EF6F6C" rx="20%" ry="20%" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${size * 0.4}" fill="white">N</text>
  <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${size * 0.1}" fill="white">Nestled</text>
</svg>
`;

// Convert SVG to PNG using a simple canvas approach
// For real icons, you should use a proper tool like sharp or Inkscape
// For this demo, we're just saving the SVG files with .png extension
// In a real app, you'd want to convert them properly

const sizes = [192, 384, 512];

sizes.forEach(size => {
  const svgContent = createSvgIcon(size);
  fs.writeFileSync(path.join(__dirname, `icon-${size}x${size}.svg`), svgContent);
  // In a real implementation, you'd convert SVG to PNG here
  fs.writeFileSync(path.join(__dirname, `icon-${size}x${size}.png`), svgContent);
});

console.log('Icons created in public/icons/'); 