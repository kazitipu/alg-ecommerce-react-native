import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';

import { SEARCH_PHOTO_OPTIONS, uploadSearchImage } from '../../api/products';
import { ROUTES } from '../../navigation/routes';
import { notifyError } from '../../utils/notify';
import { resolveSearchInput } from '../../utils/productLink';

/**
 * The home search box's behaviour, matching the web home page's form:
 *  - a short query searches the collection for that keyword
 *  - a pasted 1688 / Taobao link opens that product directly
 *  - the camera button uploads a photo and runs an image search
 */
const useHomeSearch = () => {
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);

  const submit = useCallback(
    query => {
      const intent = resolveSearchInput(query);
      if (!intent) return false;

      if (intent.type === 'product') {
        navigation.navigate(
          intent.source === '1688' ? ROUTES.PRODUCT_1688 : ROUTES.PRODUCT_TAOBAO,
          { id: intent.id, source: intent.source },
        );
      } else {
        navigation.navigate(ROUTES.COLLECTION, {
          keyword: intent.keyword,
          title: intent.keyword,
        });
      }
      return true;
    },
    [navigation],
  );

  const searchByPhoto = useCallback(async () => {
    const result = await launchImageLibrary(SEARCH_PHOTO_OPTIONS);

    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset) {
      notifyError('Could not read that photo.');
      return;
    }

    setUploading(true);
    try {
      const imgId = await uploadSearchImage(asset);
      if (!imgId) {
        notifyError('There was an error uploading your image.');
        return;
      }
      navigation.navigate(ROUTES.COLLECTION, { imgId, imageUri: asset.uri, title: 'Photo search' });
    } catch (error) {
      notifyError(error, 'There was an error uploading your image.');
    } finally {
      setUploading(false);
    }
  }, [navigation]);

  return { submit, searchByPhoto, uploading };
};

export default useHomeSearch;
