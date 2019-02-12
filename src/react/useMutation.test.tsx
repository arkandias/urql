// Note: Testing for hooks is not yet supported in Enzyme - https://github.com/airbnb/enzyme/issues/2011
jest.mock('../client', () => {
  const d = { data: 1234, error: 5678 };
  const { delay, fromValue, pipe } = require('wonka');
  const mock = {
    executeMutation: jest.fn(() =>
      pipe(
        fromValue({ data: 1, error: 2 }),
        delay(200)
      )
    ),
  };

  return {
    createClient: () => mock,
    data: d,
  };
});

import React, { FC } from 'react';
import renderer, { act } from 'react-test-renderer';
// @ts-ignore - data is imported from mock only
import { createClient } from '../client';
import { useMutation } from './useMutation';

// @ts-ignore
const client = createClient() as { executeMutation: jest.Mock };
const props = {
  query: 'example query',
};
let state: any;
let execute: any;

const MutationUser: FC<typeof props> = ({ query }) => {
  const [s, e] = useMutation(query);
  state = s;
  execute = e;
  return <p>{s.data}</p>;
};

beforeAll(() => {
  // tslint:disable-next-line
  console.log(
    'supressing console.error output due to react-test-renderer spam (hooks related)'
  );
  jest.spyOn(global.console, 'error').mockImplementation();
});

beforeEach(() => {
  client.executeMutation.mockClear();
  state = undefined;
  execute = undefined;
});

describe('on initial useEffect', () => {
  it('initialises default state', () => {
    renderer.create(<MutationUser {...props} />);
    expect(state).toMatchSnapshot();
  });

  it('does not execute subscription', () => {
    renderer.create(<MutationUser {...props} />);
    expect(client.executeMutation).toBeCalledTimes(0);
  });
});

describe('on execute', () => {
  const vars = { test: 1234 };

  it('sets fetching to true', () => {
    renderer.create(<MutationUser {...props} />);
    act(() => {
      execute(vars);
    });
    expect(state).toHaveProperty('fetching', true);
  });

  it('calls executeMutation', () => {
    renderer.create(<MutationUser {...props} />);
    act(() => {
      execute(vars);
    });
    expect(client.executeMutation).toBeCalledTimes(1);
  });

  it('calls executeMutation with query', () => {
    renderer.create(<MutationUser {...props} />);
    act(() => {
      execute(vars);
    });
    expect(client.executeMutation.mock.calls[0][0]).toHaveProperty(
      'query',
      props.query
    );
  });

  it('calls executeMutation with variables', () => {
    renderer.create(<MutationUser {...props} />);
    act(() => {
      execute(vars);
    });
    expect(client.executeMutation.mock.calls[0][0]).toHaveProperty(
      'variables',
      vars
    );
  });
});

describe('on subscription update', () => {
  it('forwards data response', async () => {
    const wrapper = renderer.create(<MutationUser {...props} />);
    await execute();
    wrapper.update(<MutationUser {...props} />);

    expect(state).toHaveProperty('data', 1);
  });

  it('forwards error response', async () => {
    const wrapper = renderer.create(<MutationUser {...props} />);
    await execute();
    wrapper.update(<MutationUser {...props} />);

    expect(state).toHaveProperty('error', 2);
  });

  it('sets fetching to false', async () => {
    const wrapper = renderer.create(<MutationUser {...props} />);
    wrapper.update(<MutationUser {...props} />);

    await execute();
    wrapper.update(<MutationUser {...props} />);
    expect(state).toHaveProperty('fetching', false);
  });
});
