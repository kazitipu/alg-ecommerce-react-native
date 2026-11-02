import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

/**
 * Hand-drawn duotone icons for the shipping calculator rows, each taking the
 * row's two gradient colours. Drawn on a 32 × 32 grid.
 */

const Gradient = ({ id, from, to }) => (
  <Defs>
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor={from} />
      <Stop offset="1" stopColor={to} />
    </LinearGradient>
  </Defs>
);

/** Stacked parcels: total quantity. */
export const QuantityIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="qty" from={from} to={to} />
    <Rect x={4} y={16} width={11} height={11} rx={2} fill="url(#qty)" />
    <Rect x={17} y={16} width={11} height={11} rx={2} fill={to} />
    <Rect x={10.5} y={4} width={11} height={11} rx={2} fill={from} />
    <Path d="M9.5 16v4M22.5 16v4M16 4v4" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

/** Hanging scale: approximate weight. */
export const WeightIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="wt" from={from} to={to} />
    <Circle cx={16} cy={6} r={3} fill="none" stroke={to} strokeWidth={2.2} />
    <Path d="M9 11h14l3.5 15a2 2 0 0 1-2 2.4h-17a2 2 0 0 1-2-2.4z" fill="url(#wt)" />
    <SvgText x={16} y={24} fontSize={8.5} fontWeight="bold" fill="#fff" textAnchor="middle">
      KG
    </SvgText>
  </Svg>
);

/** Price tag with a hole: product type. */
export const TypeIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="type" from={from} to={to} />
    <Path d="M4 6a2 2 0 0 1 2-2h9.2a2 2 0 0 1 1.4.6l11 11a2 2 0 0 1 0 2.8l-9.2 9.2a2 2 0 0 1-2.8 0l-11-11A2 2 0 0 1 4 15.2z" fill="url(#type)" />
    <Circle cx={10.5} cy={10.5} r={2.6} fill="#fff" />
    <Path d="M14 19l5-5M17 22l5-5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
  </Svg>
);

/** Customs stamp: the per-kg customs & shipping rate. */
export const CustomsIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="cus" from={from} to={to} />
    <Path d="M12 4h8l-1.5 9h-5z" fill={to} />
    <Rect x={5} y={13} width={22} height={7} rx={2.5} fill="url(#cus)" />
    <Rect x={7} y={23} width={18} height={5} rx={1.5} fill="none" stroke={to} strokeWidth={2} strokeDasharray="2.5 2" />
    <Path d="M11 25.5h10" stroke={from} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

/** Cargo plane climbing over a dashed route: CN → BD freight. */
export const FreightIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="frt" from={from} to={to} />
    <Path d="M3 28h26" stroke={to} strokeWidth={1.8} strokeDasharray="2.5 2.5" strokeLinecap="round" />
    <Path
      d="M29 13.5c0-1-.9-1.7-2-1.7h-6.4L14.4 3h-2.8l3.2 8.8H9.2L7 9H4.6l1.5 4.5L4.6 18H7l2.2-2.8h5.6L11.6 24h2.8l6.2-8.8H27c1.1 0 2-.7 2-1.7z"
      fill="url(#frt)"
    />
    <Circle cx={24.5} cy={13.5} r={1} fill="#fff" />
    <Circle cx={21.5} cy={13.5} r={1} fill="#fff" />
  </Svg>
);

/** Delivery van: the China local courier leg. */
export const CourierIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="cou" from={from} to={to} />
    <Rect x={2} y={9} width={17} height={13} rx={2} fill="url(#cou)" />
    <Path d="M19 13h5.2a2 2 0 0 1 1.7 1l3.1 5V22h-10z" fill={to} />
    <Path d="M21.5 15h2.6l1.8 3h-4.4z" fill="#fff" opacity={0.8} />
    <Circle cx={8} cy={23.5} r={3} fill="#fff" stroke={to} strokeWidth={2.2} />
    <Circle cx={23} cy={23.5} r={3} fill="#fff" stroke={to} strokeWidth={2.2} />
    <Path d="M6 13.5h8M6 17h5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

/** Receipt: total cost. */
export const ReceiptIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="rcp" from={from} to={to} />
    <Path d="M7 3h18v26l-3-2-3 2-3-2-3 2-3-2-3 2z" fill="url(#rcp)" />
    <Path d="M11 10h10M11 15h10M11 20h6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/** Warning triangle for the battery / liquid surcharge note. */
export const AlertIcon = ({ size = 22, from, to }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Gradient id="alr" from={from} to={to} />
    <Path d="M14.2 4.6a2 2 0 0 1 3.6 0l11.4 21.2A2 2 0 0 1 27.4 29H4.6a2 2 0 0 1-1.8-3.2z" fill="url(#alr)" />
    <Path d="M16 12v7" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
    <Circle cx={16} cy={23.5} r={1.7} fill="#fff" />
  </Svg>
);
