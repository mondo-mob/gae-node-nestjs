export const unique = <T>(src: T[] | ReadonlyArray<T>, ...newValues: T[]): T[] => {
  const set = new Set(src);
  newValues.forEach(val => set.add(val));
  return Array.from(set);
};
