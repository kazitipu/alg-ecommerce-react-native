/**
 * Photo search must be sent the way the server accepts it (checked against
 * the live API): JSON `{ imageBase64 }`, answered with `result.result`.
 */
import client from '../src/api/client';
import { SEARCH_PHOTO_OPTIONS, uploadSearchImage } from '../src/api/products';

jest.mock('../src/api/client', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));

describe('photo search upload', () => {
  beforeEach(() => client.post.mockReset());

  it('asks the picker for a 500 px, 70% JPEG with base64, as the web resizes it', () => {
    expect(SEARCH_PHOTO_OPTIONS).toMatchObject({ includeBase64: true, maxWidth: 500, maxHeight: 500, quality: 0.7 });
  });

  it('posts the base64 as JSON and returns the image id', async () => {
    client.post.mockResolvedValue({ data: { result: { success: 'true', code: '200', result: '1473008877152830417' } } });
    await expect(uploadSearchImage({ base64: 'AAAA', uri: 'file:///x.jpg' })).resolves.toBe('1473008877152830417');
    expect(client.post).toHaveBeenCalledWith('/api/products/upload-image', { imageBase64: 'AAAA' });
  });

  it('strips a data: prefix and returns null without a photo or an id', async () => {
    client.post.mockResolvedValue({ data: { message: 'imageBase64 is required' } });
    await expect(uploadSearchImage({ base64: 'data:image/jpeg;base64,BBBB' })).resolves.toBeNull();
    expect(client.post).toHaveBeenCalledWith('/api/products/upload-image', { imageBase64: 'BBBB' });
    client.post.mockClear();
    await expect(uploadSearchImage({ uri: 'file:///x.jpg' })).resolves.toBeNull();
    expect(client.post).not.toHaveBeenCalled();
  });
});
