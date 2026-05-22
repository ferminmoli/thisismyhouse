export function renderHatchDefs(): string {
  return `<defs>
  <pattern id="arch-pat-bath" width="1.8" height="1.8" patternUnits="userSpaceOnUse">
    <rect width="1.8" height="1.8" fill="#FAFAFA"/>
    <line x1="0" y1="1.8" x2="1.8" y2="0" stroke="#D4D4D8" stroke-width="0.08" stroke-opacity="0.4"/>
  </pattern>
  <pattern id="arch-pat-kitchen" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
    <rect width="2.4" height="2.4" fill="#FCFCFC"/>
    <line x1="0" y1="0" x2="2.4" y2="0" stroke="#E4E4E7" stroke-width="0.06" stroke-opacity="0.45"/>
  </pattern>
  <pattern id="arch-pat-laundry" width="2" height="2" patternUnits="userSpaceOnUse">
    <rect width="2" height="2" fill="#FBFBFB"/>
    <line x1="0" y1="2" x2="2" y2="0" stroke="#E4E4E7" stroke-width="0.07" stroke-opacity="0.38"/>
  </pattern>
  <pattern id="arch-pat-outdoor" width="2.5" height="2.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <line x1="0" y1="0" x2="0" y2="2.5" stroke="#94A3B8" stroke-width="0.1" stroke-opacity="0.18"/>
  </pattern>
</defs>`;
}
