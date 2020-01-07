import * as _ from 'lodash';

export const getSearchableString = (minLength: number, ...values: Array<string | null>): string => {
  const substrings = values
    .map(_.toString)
    .map(_.trim)
    .map(_.lowerCase)
    .map(str => getAllSubstrings(str, minLength));

  return _(substrings)
    .flatMap()
    .uniq()
    .join(' ');
};

export const getAllSubstrings = (str: string, minLength: number): string[] => {
  const substrings: string[] = [];

  for (let length = minLength; length <= str.length; ++length) {
    for (let start = 0; start + length <= str.length; ++start) {
      const subString = str.substring(start, start + length).trim();
      if (subString.length >= minLength) {
        substrings.push(subString);
      }
    }
  }

  return substrings;
};
