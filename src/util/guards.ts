import * as _ from 'lodash';

export const isEmpty = <T>(value: T | null | undefined): value is null | undefined => _.isEmpty(value);
