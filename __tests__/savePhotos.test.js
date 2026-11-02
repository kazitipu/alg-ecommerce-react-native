import { cleanImageUrl, imageTypeOf } from '../src/utils/savePhotos';

describe('saving product photos', () => {
  it('makes marketplace links fetchable over https', () => {
    expect(cleanImageUrl('//cbu01.alicdn.com/a.jpg')).toBe('https://cbu01.alicdn.com/a.jpg');
    expect(cleanImageUrl('http://img.alicdn.com/a.jpg')).toBe('https://img.alicdn.com/a.jpg');
    expect(cleanImageUrl('https://x/a.jpg')).toBe('https://x/a.jpg');
  });

  it('names the file by the real image type', () => {
    expect(imageTypeOf('https://x/a.jpg', 'image/webp')).toBe('image/webp');
    expect(imageTypeOf('https://x/a.png?x=1', '')).toBe('image/png');
    expect(imageTypeOf('https://x/a', undefined)).toBe('image/jpeg');
  });
});

describe('invoice PDF', () => {
   
  const { invoiceFileName, shareInvoicePdf } = require('../src/utils/invoicePdf');
   
  const { generatePDF } = require('react-native-html-to-pdf');
   
  const Share = require('react-native-share').default;

  it('names the file after the invoice number', () => {
    expect(invoiceFileName('PC-1362222827839')).toBe('ALG-invoice-PC-1362222827839');
    expect(invoiceFileName('a/b c')).toBe('ALG-invoice-a_b_c');
  });

  it('generates with the v1 API and shares the PDF file', async () => {
    await shareInvoicePdf('<html></html>', 'PC-1');
    expect(generatePDF).toHaveBeenCalledWith({ html: '<html></html>', fileName: 'ALG-invoice-PC-1' });
    expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///tmp/ALG-invoice-PC-1.pdf', type: 'application/pdf' }));
  });
});
