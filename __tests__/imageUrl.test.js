import { largeImage, sizedImage, thumbImage, tileImage } from '../src/utils/imageUrl';

const PIC = 'https://cbu01.alicdn.com/img/ibank/O1CN01aICGGymheqI2aNQi_!!2222457806862-0-cib.jpg';

describe('resized product images', () => {
  it('asks the Alibaba CDN for a smaller copy', () => {
    expect(tileImage(PIC)).toBe(`${PIC}_400x400.jpg`);
    expect(thumbImage(PIC)).toBe(`${PIC}_200x200.jpg`);
    expect(largeImage(PIC)).toBe(`${PIC}_800x800.jpg`);
  });

  it('fixes protocol-less links and keeps a query string', () => {
    expect(tileImage('//img.alicdn.com/a.png?x=1')).toBe('https://img.alicdn.com/a.png_400x400.jpg?x=1');
  });

  it('leaves other hosts, already-sized links and blanks alone', () => {
    expect(sizedImage('https://firebasestorage.googleapis.com/x.jpg')).toBe('https://firebasestorage.googleapis.com/x.jpg');
    expect(tileImage(`${PIC}_300x300.jpg`)).toBe(`${PIC}_300x300.jpg`);
    expect(tileImage('')).toBe('');
    expect(tileImage(undefined)).toBe('');
  });
});
