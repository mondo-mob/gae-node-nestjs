import { DatastoreLoader } from "../loader";
import { mockContext } from "../../auth/_spec/auth.service.spec";
import * as Datastore from "@google-cloud/datastore";
import { instance, mock, reset, when } from 'ts-mockito';

describe("Loader", () => {
  const context = mockContext();
  const keyFactory = (id: string) => ({
    id,
    kind: "Kind",
    path: ["Kind", id]
  });

  const datastoreMock = mock(Datastore);
  const loader = new DatastoreLoader(
    instance(datastoreMock),
    context
  );

  afterEach(() => {
    reset(datastoreMock);
  });

  const entity = (key: object, data: object) => ({
    ...data,
    [Datastore.KEY]: key
  });

  describe('get', () => {
    it("should fetch values from datastore", async () => {
      const key = keyFactory("123");
      const fetchResult = entity(key, { test: 123 });

      when(datastoreMock.get([key])).thenResolve([[fetchResult]]);


      const [result] = await loader.get([key]);
      expect(result).toEqual(fetchResult);
    });

    it("should fetch values when `get` is called", async () => {
      const key = keyFactory("123");
      const fetchResult = entity(key, { test: 123 });

      const loader = new DatastoreLoader(
        {
          get: () => [[fetchResult]]
        } as any,
        context
      );
      const [result] = await loader.get([key]);
      expect(result).toEqual(fetchResult);
    });
  });


});
