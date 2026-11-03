import React from 'react';
import { View } from 'react-native';

// Resting angles cycled by position, so neighbours lean different ways.
const ANGLES = [-2, 1.6, -1.2, 2.2, -1.8, 1.2];

/**
 * Gives its child a slight resting lean (`motion="sway"`) — neighbours lean
 * different ways, like cards pinned to a board. It no longer moves on its
 * own: ~26 home cards bobbing forever, each with a shadow, made the phone
 * redraw them every frame (up to 144 times a second) and the home screen lag.
 * `motion="float"` keeps the card upright.
 */
const Tilt = ({ index = 0, origin = 'center', motion = 'sway', children, style }) => {
  const angle = motion === 'float' ? 0 : ANGLES[index % ANGLES.length];
  return (
    <View style={[{ transformOrigin: origin }, angle ? { transform: [{ rotate: `${angle}deg` }] } : null, style]}>
      {children}
    </View>
  );
};

export default Tilt;
