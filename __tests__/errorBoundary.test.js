import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';

import ErrorBoundary from '../src/components/ErrorBoundary';

jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));

let shouldThrow = true;
const Flaky = () => {
  if (shouldThrow) throw new Error('boom');
  return <Text>recovered</Text>;
};

const texts = tree => tree.root.findAllByType(Text).map(node => [].concat(node.props.children).join(''));

describe('ErrorBoundary', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => console.error.mockRestore());

  it('shows the fallback and recovers on "Try again"', () => {
    let tree;
    act(() => {
      tree = create(
        <ErrorBoundary>
          <Flaky />
        </ErrorBoundary>,
      );
    });
    expect(texts(tree)).toContain('Oops! Something went wrong');

    shouldThrow = false;
    const retry = tree.root.findAll(node => node.props.onPress && texts({ root: node }).includes('Try again'))[0];
    act(() => retry.props.onPress());
    expect(texts(tree)).toContain('recovered');
  });
});
