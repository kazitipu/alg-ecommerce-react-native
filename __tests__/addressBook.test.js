import { companyOf, profileOf, withAddressIds, withSavedAddress, withoutAddress } from '../src/screens/profile/ProfileInformationScreen';
import { toDraft } from '../src/screens/profile/components/AddressSheet';

jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));

const home = { id: 'a', name: 'Home', defaultShipping: true };
const office = { id: 'b', name: 'Office', defaultShipping: false };

describe('address book', () => {
  it('makes the first address the default', () => {
    expect(withSavedAddress([], { id: 'a', name: 'Home' })).toEqual([{ id: 'a', name: 'Home', defaultShipping: true }]);
  });

  it('adds a non-default address without touching the default', () => {
    const book = withSavedAddress([home], { id: 'b', name: 'Office' });
    expect(book.map(item => item.defaultShipping)).toEqual([true, false]);
  });

  it('keeps exactly one default when another becomes it', () => {
    const book = withSavedAddress([home, office], { ...office, defaultShipping: true });
    expect(book.filter(item => item.defaultShipping).map(item => item.id)).toEqual(['b']);
  });

  it('edits in place', () => {
    const book = withSavedAddress([home, office], { ...office, name: 'New office' });
    expect(book[1].name).toBe('New office');
    expect(book).toHaveLength(2);
  });

  it('hands the default role on when the default is deleted', () => {
    expect(withoutAddress([home, office], 'a')).toEqual([{ ...office, defaultShipping: true }]);
    expect(withoutAddress([home, office], 'b')).toEqual([home]);
  });
});

describe('values stored in other shapes', () => {
  it('reads numbers and nulls from Firestore as text', () => {
    expect(profileOf({ displayName: null, mobileNo: 1641103558, gender: undefined })).toEqual({
      displayName: '',
      gender: '',
      mobileNo: '1641103558',
    });
  });

  it('turns a stored address into a form draft with text fields', () => {
    const draft = toDraft({ id: 7, name: 'Kazi', mobileNo: 1641103558, areaObj: { id: 1, name: 'Mirpur' } });
    expect(draft).toMatchObject({ id: 7, name: 'Kazi', mobileNo: '1641103558', address: '', division: '', areaObj: { id: 1 } });
    expect(toDraft(null).name).toBe('');
  });

  it('gives addresses without an id their own, so deleting one keeps the rest', () => {
    const book = withAddressIds([{ name: 'A' }, { name: 'B', id: 42 }, { name: 'C' }]);
    expect(book.map(item => item.id)).toEqual(['address-1', 42, 'address-3']);
    expect(withoutAddress(book, 'address-1').map(item => item.name)).toEqual(['B', 'C']);
    expect(withAddressIds(undefined)).toEqual([]);
  });
});

describe('company information', () => {
  it('reads the web\'s company object field by field', () => {
    const user = { company: { name: 'ALG', businessType: 'Import', address: 'Dhaka', mobileNo: 1881934658 } };
    expect(companyOf(user)).toEqual({ name: 'ALG', businessType: 'Import', address: 'Dhaka', mobileNo: '1881934658' });
  });

  it('never shows an object as text, and keeps a plain-text company as its name', () => {
    expect(companyOf({ company: 'ALG Ltd' }).name).toBe('ALG Ltd');
    expect(companyOf({}).name).toBe('');
    expect(companyOf({ company: { name: { nested: true } } }).name).toBe('');
  });
});
