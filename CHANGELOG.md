## 8.0.0 (2020-05-??)

- Refactor search to allow custom search implementations
- Refactor existing SearchService into GaeSearchService implementation

### Breaking changes:

- Search types are now exported from the root package and should be imported from there
- If you wish to use search you must explicitly define which SearchService implementation you wish to 
inject when instantiating the GCloudModule. e.g. to retain existing functionality:

```
GCloudModule.forConfiguration({
  configurationModule: ConfigurationModule,
  userModule: UserModule,
  searchModule: SearchModule.forConfiguration({ searchService: GaeSearchService }),
})
```

## 7.1.0 (2020-05-26)  7.x goes GA
Here is a summary of changes since v6. Changelog entries for v7 release candidates have been removed and are summarised here:
 - Update to NestJS 7 
 - Use cls-hooked to have thread-local-like functionality within app. We call it `request scope`.
 - Allow context to be accessed via `getContext()` without having to pass it around (uses request scope to store). Example usage:
    ```
    import { getContext } from '@mondomob/gae-node-nestjs';
    
    ...
    class MyClass {
    
        myFunc() {
            const context = getContext();
            // use it for the repositories, or to check access without requiring it as a parameter
        }
    }
    
    ``` 
 - Allow request log bundling per http request (uses request scope) if enabled. No changes required to calling loggers - just for the logger interface definition (see migration guide). See https://github.com/googleapis/nodejs-logging-bunyan#using-as-an-express-middleware
 - Request scope and log bundling are disabled by default, but can be enable via config (see migration guide).
 
 
 

### Breaking changes - migrating from v6
 - Potential breaking changes with NestJS 7. This is a smaller jump than v5 to v6 and the steps below should capture required changges. See https://docs.nestjs.com/migration-guide for further info
     - Ensure you have `express` `4.17.1` or later. This is listed as a `peerDepedency` now
     - Since our example project updated from nest v5 to v7 we can't be sure if this is new with v7 or v6 but modules now do not implicitly import nested modules. 
     A prime example is if module `A` imports Module `B` and Module `B` imports `ConfigurationModule`, then you will need to expliclty include `ConfigurationModule` 
     in Module `A`'s imports if it depends on components within that module. 
     If you are affected by this it will be obvious when you start your server and see a message similar to `Nest can't resolve dependencies of MyProvider (?).  Please make sure that the argument XX at index [0] is available in the YY context`
  - `configureExpress()` is now an async function. Change your `bootstrap.ts` or equivalent. Add `await` to the call as per below.
    ```
    // BEFORE
    export async function bootstrap() {
        ...
        configureExpress(expressApp, {
            ...
        });
    }
    ```
    
    ```
    // AFTER
    export async function bootstrap() {
        ...
        await configureExpress(expressApp, {
            ...
        });
    }
    ```         
 - We use our own `Logger` interface for `rootLogger` and `createLogger`. Replace all `bunyan` imports that define `Logger` with `import { logger } from '@mondomob/gae-node-nestjs';`
 - To enable `request scope` for being able to retrieve context via `getContext()` then you need to enable this via the `enabled` flag in config and to enable log bundling you need to set the `logBundlingEnabled` flag.
    - update `default.json` or similar config
        ```    
           "requestScope": {
             "enabled": true,
             "logBundlingEnabled": true
           },
        ```
    - update your `config.provider.ts` (or whatever you call your file that defines your configuration provider) to define a getter for `requestScope`. Example additions below:
        ```
        ...
        const requestScope = t.partial({
          enabled: t.boolean,
        });
        ...
        const Config = t.intersection([
          t.interface({
            ...
          }),
          t.partial({
            ...
          }),
        ]);
        
        export class ConfigurationProvider implements Configuration {
          configuration: t.TypeOf<typeof Config>;
          ...
        
          get requestScope() {
            return this.configuration.requestScope;
          }
        }
        ```

## 6.0.1 (2020-04-21)
 - Non release candidate version. New version publish only

## 6.0.0-rc.2 (2020-04-21)
 - More internal dependency updates

## 6.0.0-rc.1 (2020-04-21)
 - Fix dependency issue loading graphql
 - Update internal dependencies where not major breaking

## 6.0.0-rc.0 (2020-03-00)

- Update to NestJS 6

### Breaking changes:

Lots of changes:
- Follow official migration guide: https://docs.nestjs.com/v6/migration-guide
- Add @nestjs/platform-express
```
npm install @nestjs/platform-express
```
- Update `bootstrap.ts` to use express platform
```
const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
  logger: new BunyanLogger(),
});
```

-- In middleware and interceptors use new util method to access Request.

Change:
```
const request = context.switchToHttp().getRequest();
```
To:
```
const request = getRequestFromExecutionContext(context);
```

-- Add `@ResolveProperty()`, `@Parent` and `@GQLContext` annotations to any graphql property resolver methods
e.g.
```
 import { Parent, ResolveProperty, Resolver, Context as GqlContext } from '@nestjs/graphql';

 ...

 @ResolveProperty('recipients')
  async recipients(
    @Parent() parent: Message,
    @GqlContext() context: Context,
  ): Promise<Recipient[]> {}
```


## 5.2.0 (2020-04-08)
 - Optional auth callbacks to build user roles and build additional user properties (backwards-compatible ... not required)
 - To utilise create an `@Injectable` class that implements `AuthCallbacks` and define one or more methods

## 5.1.2 (2020-01-31)

- Fix typings to support multiple query predicates for arrays of primitives and union types.

## Older releases 
For older releases see the original repository this was forked from: https://github.com/3wks/gae-node-nestjs
