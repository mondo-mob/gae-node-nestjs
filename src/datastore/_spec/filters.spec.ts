import { buildFilters } from '../filters';

const buildQuery = () => {
  const query = {
    filter: jest.fn()
  };

  query.filter.mockReturnValue(query);

  return query;
};

describe('filters', () => {
  it('should build up empty filter', () => {
    let query = buildQuery();

    buildFilters(query, {});

    expect(query.filter).not.toHaveBeenCalled();
  });

  it('should build up simple filter', () => {
    let query = buildQuery();

    buildFilters(query, {
      test: 123
    });

    expect(query.filter).toHaveBeenCalledWith("test", 123);
  });

  it('should build up several filters', () => {
    let query = buildQuery();

    buildFilters(query, {
      test: 123,
      test2: 1234
    });

    expect(query.filter).toHaveBeenCalledWith("test", 123);
    expect(query.filter).toHaveBeenCalledWith("test2", 1234);
  });

  it('should build up complex filters', () => {
    let query = buildQuery();

    buildFilters(query, {
      test: {
        op: '>',
        value: 123
      }
    });

    expect(query.filter).toHaveBeenCalledWith("test", '>', 123);
  });

  it('should build up complex range filters', () => {
    let query = buildQuery();

    buildFilters(query, {
      test: [{
        op: '>',
        value: 123
      }, {
        op: '<',
        value: 134
      }]
    });

    expect(query.filter).toHaveBeenCalledWith("test", '>', 123);
    expect(query.filter).toHaveBeenCalledWith("test", '<', 134);
  });

  it('should build up nested property filters', () => {
    let query = buildQuery();

    buildFilters(query, {
      test: {
        test2: 123
      }
    });

    expect(query.filter).toHaveBeenCalledWith("test.test2", 123);
  });

  it('should build up nested complex property filters', () => {
    let query = buildQuery();

    buildFilters(query, {
      test: {
        test2: {
          op: '>',
          value: 123
        }
      }
    });

    expect(query.filter).toHaveBeenCalledWith("test.test2", '>', 123);
  });
});
