/** Simple procedural glyph for cartridge tiles. */
const GLYPHS: Record<string, string> = {
  'neon-coil': '◎',
  'prism-breaker': '▣',
  'void-wing': '✈',
  'shard-field': '✦',
  'lumen-chase': '◉',
  'rushline': '⫸',
  'cave-dart': '▴',
  'fluxball': '◉',
  'aegis-grid': '⛨',
  'sky-stack': '▤',
  'chrono-drop': '⧉',
  'gemfuse': '◆',
  'helix-2048': '2',
  'signal-sweep': '▦',
  'glyph-grid': '9',
  'shift-15': '⇄',
  'conduit': '⌁',
  'echo-pairs': '♤',
  'lexigrid': 'A',
  'cratecraft': '▣',
  'driftwire': ' cons',
  'horizon-drive': '▣',
  'lane-rush': '≡',
  'hover-tube': '◎',
  'arena-kart': '✪',
  'pulse-duel': '⚔',
  'edge-parry': '⚔',
  'street-surge': '👊',
  'ring-push': '⬤',
  'apex-gauntlet': '☠',
};

export function glyphFor(id: string): string {
  return GLYPHS[id] ?? '▶';
}
