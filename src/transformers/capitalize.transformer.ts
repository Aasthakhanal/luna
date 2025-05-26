import { Transform } from 'class-transformer';

export const CapitalizeTransformer = () => {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
        letter.toUpperCase(),
      );
    }
    return value;
  });
};
