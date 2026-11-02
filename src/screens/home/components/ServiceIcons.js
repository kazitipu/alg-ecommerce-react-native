import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

/**
 * Hand-drawn duotone icons for the home services grid. Each takes the
 * service's two gradient colours, so every icon matches its card.
 * Drawn on a 48 × 48 grid.
 */

const Gradient = ({ id, from, to }) => (
  <Defs>
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor={from} />
      <Stop offset="1" stopColor={to} />
    </LinearGradient>
  </Defs>
);

/** Shopping bag with a heart: we buy it for you. */
export const BuyForMeIcon = ({ size = 34, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Gradient id="buy" from={from} to={to} />
    <Path d="M17 17v-3a7 7 0 0 1 14 0v3" stroke={to} strokeWidth={3} strokeLinecap="round" fill="none" />
    <Rect x={8} y={16} width={32} height={27} rx={8} fill="url(#buy)" />
    <Rect x={12} y={20} width={24} height={3} rx={1.5} fill="#fff" opacity={0.3} />
    <Path
      d="M24 37c-5.6-4-8-6.6-8-9.4a3.9 3.9 0 0 1 8-1.6 3.9 3.9 0 0 1 8 1.6c0 2.8-2.4 5.4-8 9.4z"
      fill="#fff"
    />
    <Path d="M41 3l1.4 4.1 4.1 1.4-4.1 1.4L41 14l-1.4-4.1-4.1-1.4 4.1-1.4z" fill={from} />
  </Svg>
);

/** Location pin at the end of a dashed route. */
export const TrackOrderIcon = ({ size = 34, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Gradient id="track" from={from} to={to} />
    <Path
      d="M9 40c9 0 6-11 16-10"
      stroke={to}
      strokeWidth={2.6}
      strokeDasharray="3 4"
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx={9} cy={40} r={4} fill={from} opacity={0.6} />
    <Ellipse cx={31} cy={40} rx={7} ry={2.2} fill={to} opacity={0.22} />
    <Path d="M31 5a11 11 0 0 1 11 11c0 8.2-11 22-11 22S20 24.2 20 16A11 11 0 0 1 31 5z" fill="url(#track)" />
    <Circle cx={31} cy={16} r={4.4} fill="#fff" />
  </Svg>
);

/** Open parcel with a plus badge: ask us for any product. */
export const RequestProductIcon = ({ size = 34, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Gradient id="request" from={from} to={to} />
    <Path d="M6 18l17 8.5V44L6 35.5z" fill="url(#request)" />
    <Path d="M23 26.5L40 18v17.5L23 44z" fill={to} />
    <Path d="M6 18l17-8.5L40 18l-17 8.5z" fill={from} opacity={0.6} />
    <Path d="M14.5 13.8l17 8.4" stroke="#fff" strokeWidth={2} opacity={0.7} />
    <Circle cx={38} cy={11} r={8} fill={to} stroke="#fff" strokeWidth={2.2} />
    <Path d="M38 7v8M34 11h8" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

/** Guide book with a play mark and a tick. */
export const HowToOrderIcon = ({ size = 34, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Gradient id="guide" from={from} to={to} />
    <Rect x={14} y={5} width={27} height={34} rx={6} fill={from} opacity={0.45} />
    <Rect x={8} y={9} width={27} height={34} rx={6} fill="url(#guide)" />
    <Path d="M18 20l10 6-10 6z" fill="#fff" />
    <Circle cx={38} cy={38} r={7.5} fill={to} stroke="#fff" strokeWidth={2.2} />
    <Path d="M34.6 38.2l2.4 2.4 4.4-4.8" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/** Receipt with a percentage coin: tax and shipping charges. */
export const RatesIcon = ({ size = 34, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Gradient id="rates" from={from} to={to} />
    <Path
      d="M12 5h18a4 4 0 0 1 4 4v34l-4-3-4 3-4-3-4 3-4-3-4 3V9a4 4 0 0 1 4-4z"
      fill="url(#rates)"
    />
    <Rect x={13} y={12} width={14} height={3} rx={1.5} fill="#fff" opacity={0.9} />
    <Rect x={13} y={19} width={10} height={3} rx={1.5} fill="#fff" opacity={0.65} />
    <Rect x={13} y={26} width={12} height={3} rx={1.5} fill="#fff" opacity={0.65} />
    <Circle cx={36} cy={34} r={9} fill={to} stroke="#fff" strokeWidth={2.2} />
    <SvgText x={36} y={38.4} fontSize={12} fontWeight="bold" fill="#fff" textAnchor="middle">
      %
    </SvgText>
  </Svg>
);

/** Two speech bubbles, the front one with a question mark. */
export const FaqIcon = ({ size = 34, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Gradient id="faq" from={from} to={to} />
    <Path d="M20 8h18a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-2v6l-7-6" fill={to} opacity={0.35} />
    <Path
      d="M10 14h20a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H19l-8 7v-7h-1a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z"
      fill="url(#faq)"
    />
    <SvgText x={20} y={32} fontSize={15} fontWeight="bold" fill="#fff" textAnchor="middle">
      ?
    </SvgText>
  </Svg>
);
