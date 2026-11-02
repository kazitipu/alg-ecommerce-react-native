import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

/**
 * Pastel section backdrops. Each pairs a tint with its own motif, drawn in a
 * colour a few shades deeper, so neighbouring sections read as separate bands.
 */
export const PATTERNS = [
  { type: 'confetti', background: '#fff8ec', ink: '#f3d3a0' }, // cream
  { type: 'grid', background: '#eef6ff', ink: '#d3e4f8' }, // ice blue
  { type: 'plus', background: '#effaf4', ink: '#c3e8d3' }, // mint
  { type: 'stripes', background: '#f5f1ff', ink: '#e6dcfd' }, // lavender
  { type: 'waves', background: '#fff2f3', ink: '#f8d1d7' }, // blush
  { type: 'dots', background: '#fbfcff', ink: '#cddff4' }, // white, blue dots
];

/** The repeating tile for each motif: its size and the shapes inside it. */
const TILES = {
  dots: {
    size: 18,
    render: ink => <Circle cx={9} cy={9} r={1.4} fill={ink} />,
  },
  grid: {
    size: 22,
    render: ink => <Path d="M22 0V22M0 22H22" stroke={ink} strokeWidth={1} />,
  },
  plus: {
    size: 26,
    render: ink => (
      <Path d="M13 9v8M9 13h8" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
    ),
  },
  stripes: {
    size: 16,
    render: ink => <Path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" stroke={ink} strokeWidth={3} />,
  },
  waves: {
    size: 32,
    render: ink => (
      <Path
        d="M0 10c4-4 8-4 12 0s8 4 12 0 8-4 8 0M0 26c4-4 8-4 12 0s8 4 12 0 8-4 8 0"
        stroke={ink}
        strokeWidth={1.6}
        fill="none"
      />
    ),
  },
  confetti: {
    size: 44,
    render: ink => (
      <>
        <Rect x={6} y={8} width={6} height={2.5} rx={1.2} fill={ink} transform="rotate(-30 9 9)" />
        <Circle cx={31} cy={11} r={2} fill="#f8c6cf" />
        <Rect x={24} y={30} width={6} height={2.5} rx={1.2} fill="#c9dcf6" transform="rotate(35 27 31)" />
        <Circle cx={10} cy={34} r={1.6} fill={ink} />
        <Path d="M38 26l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#d9cdfb" />
      </>
    ),
  },
};

/** Fills its parent with the motif chosen by `variant`. */
const PatternBackground = ({ variant = 0 }) => {
  const pattern = PATTERNS[variant % PATTERNS.length];
  const tile = TILES[pattern.type];
  const id = `pattern-${pattern.type}`;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: pattern.background }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={tile.size} height={tile.size} patternUnits="userSpaceOnUse">
            {tile.render(pattern.ink)}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
};

export default PatternBackground;
