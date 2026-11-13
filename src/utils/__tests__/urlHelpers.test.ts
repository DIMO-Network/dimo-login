import { readHistoryState, removeQueryParam } from '../urlHelpers';

describe('removeQueryParam', () => {
  it('drops the one parameter, keeping the others as written and the hash', () => {
    window.history.pushState({}, '', '/p?a=1%202&loginHint=jun%40x.co&b=x+y#top');
    removeQueryParam('loginHint');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      '/p?a=1%202&b=x+y#top',
    );
  });

  it('leaves no stray ? when it was the only parameter', () => {
    window.history.pushState({}, '', '/p?loginHint=jun%40x.co');
    removeQueryParam('loginHint');
    expect(window.location.href).toBe('http://localhost:3000/p');
  });

  it('leaves a URL without it untouched and adds no history entry', () => {
    window.history.pushState({}, '', '/p?code=abc&state=xyz');
    const length = window.history.length;
    removeQueryParam('loginHint');
    expect(window.location.search).toBe('?code=abc&state=xyz');
    expect(window.history.length).toBe(length);
  });

  it('keeps the value in this history entry’s state, beside what is there', () => {
    window.history.pushState({ scroll: 3 }, '', '/p?a=1&loginHint=jun%40x.co');
    removeQueryParam('loginHint');
    expect(window.history.state).toEqual({ scroll: 3, loginHint: 'jun@x.co' });
    expect(readHistoryState('loginHint')).toBe('jun@x.co');
  });

  it('starts the state afresh when the entry had none', () => {
    window.history.pushState(null, '', '/p?loginHint=jun%40x.co');
    removeQueryParam('loginHint');
    expect(window.history.state).toEqual({ loginHint: 'jun@x.co' });
  });

  it('leaves the state alone when the URL has no such parameter', () => {
    window.history.pushState({ scroll: 3 }, '', '/p?code=abc');
    removeQueryParam('loginHint');
    expect(window.history.state).toEqual({ scroll: 3 });
  });
});

describe('readHistoryState', () => {
  it.each([null, 'a string', 7])('reads nothing from a state of %j', (state) => {
    window.history.pushState(state, '', '/p');
    expect(readHistoryState('loginHint')).toBeUndefined();
  });
});
