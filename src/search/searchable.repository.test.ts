import { anything, deepEqual, instance, mock, reset, verify, when } from 'ts-mockito';
import { SearchableRepository } from './searchable.repository';
import * as t from 'io-ts';
import { IndexEntry, Page, SearchFields, SearchService, Sort } from './search.service';
import { Context } from '../datastore/context';
import { DatastoreLoader } from '../datastore/loader';
import { mockContext, mockDatastoreProvider, user } from '../_test/mocks';

const itemSchema = t.interface({
  id: t.string,
  text1: t.string,
  text2: t.string,
});

interface Item extends t.TypeOf<typeof itemSchema> {}

describe('SearchableRepository', () => {
  let context: Context;
  let repository: SearchableRepository<Item>;
  const searchService: SearchService = mock<SearchService>();

  const initRepo = () =>
    new SearchableRepository(mockDatastoreProvider().datastore, instance(searchService), 'Item', itemSchema, {
      searchIndex: {
        text1: true,
      },
    });

  const initContext = () => mockContext({ user: user() });

  const verifyIndexEntries = (entries: IndexEntry[]) => {
    verify(searchService.index('Item', deepEqual(entries))).once();
  };

  beforeEach(() => {
    context = initContext();
    reset(searchService);
    repository = initRepo();
  });

  describe('save', () => {
    it('indexes fields in repository config (single item)', async () => {
      const item: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };

      await repository.save(context, item);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
      ]);
    });

    it('indexes fields in repository config (multiple items)', async () => {
      const item1: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };
      const item2: Item = {
        id: 'item2',
        text1: 'text3',
        text2: 'text4',
      };

      await repository.save(context, [item1, item2]);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
        {
          id: 'item2',
          fields: {
            text1: 'text3',
          },
        },
      ]);
    });
  });

  describe('update', () => {
    it('indexes fields in repository config (single item)', async () => {
      const item: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };

      await repository.update(context, item);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
      ]);
    });

    it('indexes fields in repository config (multiple items)', async () => {
      const item1: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };
      const item2: Item = {
        id: 'item2',
        text1: 'text3',
        text2: 'text4',
      };

      await repository.update(context, [item1, item2]);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
        {
          id: 'item2',
          fields: {
            text1: 'text3',
          },
        },
      ]);
    });
  });

  describe('insert', () => {
    it('indexes fields in repository config (single item)', async () => {
      const item: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };

      await repository.insert(context, item);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
      ]);
    });

    it('indexes fields in repository config (multiple items)', async () => {
      const item1: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };
      const item2: Item = {
        id: 'item2',
        text1: 'text3',
        text2: 'text4',
      };

      await repository.insert(context, [item1, item2]);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
        {
          id: 'item2',
          fields: {
            text1: 'text3',
          },
        },
      ]);
    });
  });

  describe('upsert', () => {
    it('indexes fields in repository config (single item)', async () => {
      const item: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };

      await repository.upsert(context, item);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
      ]);
    });

    it('indexes fields in repository config (multiple items)', async () => {
      const item1: Item = {
        id: 'item1',
        text1: 'text1',
        text2: 'text2',
      };
      const item2: Item = {
        id: 'item2',
        text1: 'text3',
        text2: 'text4',
      };

      await repository.upsert(context, [item1, item2]);

      verifyIndexEntries([
        {
          id: 'item1',
          fields: {
            text1: 'text1',
          },
        },
        {
          id: 'item2',
          fields: {
            text1: 'text3',
          },
        },
      ]);
    });
  });

  describe('delete', () => {
    it('requests index deletion (single item)', async () => {
      await repository.delete(context, 'item1');

      verify(searchService.delete('Item', 'item1')).once();
    });

    it('requests index deletion (multiple items)', async () => {
      await repository.delete(context, 'item1', 'item2');

      verify(searchService.delete('Item', 'item1', 'item2')).once();
    });
  });

  describe('deleteAll', () => {
    it('requests deletion of all items', async () => {
      await repository.deleteAll(context);

      verify(searchService.deleteAll('Item')).once();
    });
  });

  describe('search', () => {
    it('searches and fetches results', async () => {
      when(searchService.query('Item', anything(), anything())).thenResolve({
        resultCount: 2,
        limit: 0,
        offset: 0,
        ids: ['item1', 'item2'],
      });
      const loader = mock(DatastoreLoader);
      when(loader.get(anything())).thenResolve([]);
      context = mockContext({ user: user(), mockLoader: loader });

      const searchFields: SearchFields = {
        text1: 'text1',
      };

      await repository.search(context, searchFields);

      verify(loader.get(deepEqual([repository.key('item1'), repository.key('item2')]))).once();
    });
  });

  describe('searchWithPagination', () => {
    it('searches and fetches results', async () => {
      const searchFields: SearchFields = {
        text1: 'text1',
      };
      const sort: Sort = {
        field: 'text1',
      };
      const page: Page = {
        limit: 10,
        offset: 10,
      };
      when(searchService.query('Item', anything(), anything(), anything())).thenResolve({
        resultCount: 2,
        limit: 10,
        offset: 10,
        ids: ['item1', 'item2'],
      });
      const loader = mock(DatastoreLoader);
      when(loader.get(anything())).thenResolve([]);
      context = mockContext({ user: user(), mockLoader: loader });

      const results = await repository.searchWithPagination(context, searchFields, sort, page);

      verify(loader.get(deepEqual([repository.key('item1'), repository.key('item2')]))).once();
      expect(results).toEqual({
        resultCount: 2,
        limit: 10,
        offset: 10,
        results: [],
      });
    });
  });
});
