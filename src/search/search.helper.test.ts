import { getSearchableString } from './search.helper';

const assertMatches = (searchText: string, ...expectedMatches: string[]) => {
  expectedMatches.forEach((expectedMatch) => expect(searchText).toMatch(wordRegex(expectedMatch)));
};

// Mimick how google search works by searching for a term that starts at the
// start of the string or separated by a space
const wordRegex = (text: string) => new RegExp(`\\b${text}\\b`);

describe('searchHelper', () => {
  describe('getSearchableString', () => {
    it('returns empty string when only nulls and blanks', () => {
      const searchableText = getSearchableString(1, null, '', '     ');

      expect(searchableText).toBe('');
    });

    it('ignores nulls and blanks', () => {
      const searchableText = getSearchableString(1, null, 'ab', '', '     ');

      expect(searchableText).toMatch(wordRegex('a'));
      expect(searchableText).toMatch(wordRegex('a'));
      expect(searchableText).toMatch(wordRegex('ab'));
    });

    it('generates substrings', () => {
      const studentNumber = '1234';
      const studentName = 'Jo Smith';

      const searchableText = getSearchableString(1, studentNumber, studentName);

      expect(searchableText.length).toBe(151);
      assertMatches(
        searchableText,
        '1',
        '2',
        '3',
        '4',
        '12',
        '123',
        '1234',
        '23',
        '234',
        '34',

        'j',
        'o',
        's',
        'm',
        'i',
        't',
        'h',
        'jo',
        'jo s',
        'jo sm',
        'jo smi',
        'jo smit',
        'jo smith',

        'sm',
        'smi',
        'smit',
        'smith',
        'mi',
        'mit',
        'mith',
        'it',
        'ith',
        'th',
      );
    });

    it('generates min length 2', () => {
      const studentNumber = '1234';
      const studentName = 'Jo Smith';

      const searchableText = getSearchableString(2, studentNumber, studentName);

      expect(searchableText.length).toBe(129);
      assertMatches(
        searchableText,
        '12',
        '123',
        '1234',
        '23',
        '234',
        '34',

        'jo',
        'jo s',
        'jo sm',
        'jo smi',
        'jo smit',
        'jo smith',

        'o s',
        'sm',
        'smi',
        'smit',
        'smith',
        'mi',
        'mit',
        'mith',
        'it',
        'ith',
        'th',
      );
    });
  });
});
