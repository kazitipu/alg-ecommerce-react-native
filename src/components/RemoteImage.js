import React from 'react';
import FastImage from 'react-native-fast-image';

const RESIZE = {
  cover: FastImage.resizeMode.cover,
  contain: FastImage.resizeMode.contain,
  stretch: FastImage.resizeMode.stretch,
  center: FastImage.resizeMode.center,
};

/**
 * A remote product picture, drawn with react-native-fast-image: images are
 * decoded off the UI thread and kept in a memory + disk cache, so scrolling
 * back to a card, or reopening a product, shows it at once without the
 * re-download and re-decode that made rails stutter as they came into view.
 *
 * Same props as `<Image>` for what the app uses: `uri`, `style`,
 * `resizeMode`, plus `priority` ('low' | 'normal' | 'high').
 */
const RemoteImage = ({ uri, style, resizeMode = 'cover', priority = 'normal', onLoad, onError, ...rest }) =>
  uri ? (
    <FastImage
      source={{ uri, priority: FastImage.priority?.[priority] ?? priority }}
      style={style}
      resizeMode={RESIZE[resizeMode] || RESIZE.cover}
      onLoad={onLoad}
      onError={onError}
      {...rest}
    />
  ) : null;

export default React.memo(RemoteImage);
