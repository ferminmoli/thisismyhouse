export function renderHatchDefs(): string {
  return `<defs>
  <pattern id="arch-pat-dots" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
    <rect width="2.4" height="2.4" fill="#FAFAF9"/>
    <circle cx="1.2" cy="1.2" r="0.07" fill="#CBD5E1" opacity="0.35"/>
  </pattern>
  <pattern id="arch-pat-bath" width="2" height="2" patternUnits="userSpaceOnUse">
    <rect width="2" height="2" fill="#FFFFFF"/>
    <line x1="0" y1="2" x2="2" y2="0" stroke="#E2E8F0" stroke-width="0.06" stroke-opacity="0.55"/>
  </pattern>
  <pattern id="arch-pat-laundry" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
    <rect width="2.2" height="2.2" fill="#FFFFFF"/>
    <line x1="0" y1="2.2" x2="2.2" y2="0" stroke="#E2E8F0" stroke-width="0.06" stroke-opacity="0.45"/>
  </pattern>
  <pattern id="arch-pat-outdoor" width="2.8" height="2.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <rect width="2.8" height="2.8" fill="#FAFBFC"/>
    <line x1="0" y1="0" x2="0" y2="2.8" stroke="#CBD5E1" stroke-width="0.08" stroke-opacity="0.35"/>
  </pattern>
</defs>`;
}
