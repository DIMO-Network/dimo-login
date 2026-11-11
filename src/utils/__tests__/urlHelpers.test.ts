import { removeQueryParam } from '../urlHelpers';

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
});
