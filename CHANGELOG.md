## 7.1.0-rc.5 (2020-05-21)
 - API change for using the logger. No more `logger()` function to obtain it - use the same `rootLogger` and `createLogger` that
 you were using before and when you go to `.debug(..)`, `info(..)` etc on that logger it will dynamically decide whether to use log
 bundling or not based on your config. In order to support this we had to slightly change the interface of the `Logger` we return to
 not be the raw bunyan logging interface, but a subset that only contains the relevant functions for making log statements
 
### Breaking Changes
 - If you used `logger()` from the previous 2 RCs this has been removed in favour of the old ways to get logger
 - Replace `import * as Logger from 'bunyan'` and `import Logger = require('bunyan')` with `import { Logger } from '@mondomob/gae-node-nestjs'`
 - `createLogger()` no longer has an optional second argument to allow override of options (although this was only available briefly and you most likely were never using that)


## 7.1.0-rc.4 (2020-05-18)
 - Preparing to have GA release and as such we will be disabling request local (cls-hooked) storage by default so that existing
 projects can safely upgrade and enable new features at their leisure. To enable request scope in general, and also enable log
 bundling via shared logger in request log you will need to add the following entry to your configuration. All loggers should be
 obtained at runtime using `logger()` as documented below and you can toggle the behaviour with the config below.
 
```    
  "requestScope": {
    "enabled": true,
    "logBundlingEnabled": true
  },
```

## 7.1.0-rc.3 (2020-05-13)
 - Consolidated logs per request! Logs will be grouped by http endpoint where a statement is made within a request. As per https://github.com/googleapis/nodejs-logging-bunyan#using-as-an-express-middleware. 
   To use, always use the `logger()` function dynamically for _every_ log statement without holding a reference to it. When a request
   logger cannot be obtained it will automatically use the `rootLogger`.
   
   ```
    import { logger } from '@mondomob/gae-node-nestjs';
    ...
    myFunc() {
        logger().info('My log statement');
    }
    ```
### Breaking Changes
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


## 7.1.0-rc.2 (2020-05-13)
 - Enable request scope by default but give projects option to disable (if performance is critical) with the addition of `"requestScope": {"enabled": false }` to your configuration file, and updating your configuration provider to expose a `get` function to expose `requestScope()`
 - Add extra convenience methods for request scope: `isRequestScopeEnabled()`, `getRequestScopeValueOrDefault()`

## 7.1.0-rc.1 (2020-05-12)
 - Use cls-hooked to have thread-local-like functionality within app. First real usage is to allow context to be retrieved with `getContext()`
 
Example usage:
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

## 7.0.0-rc.2 (2020-04-29)
 - Update to NestJS 7 (from rc.1)
 - Require `express` `4.17.1` and set as `peerDependency`. Update internal types.
 
### Breaking Changes
 - Potential breaking changes with NestJS 7. This is a smaller jump than v5 to v6.

Migration notes:
 - Official migration guide https://docs.nestjs.com/migration-guide
 - Ensure you have `express` `4.17.1` or later. This is listed as a `peerDepedency` now
 - Since our example project updated from nest v5 to v7 we can't be sure if this is new with v7 or v6 but modules now do not implicitly import nested modules. 
 A prime example is if module `A` imports Module `B` and Module `B` imports `ConfigurationModule`, then you will need to expliclty include `ConfigurationModule` 
 in Module `A`'s imports if it depends on components within that module. 
 If you are affected by this it will be obvious when you start your server and see a message similar to `Nest can't resolve dependencies of MyProvider (?).  Please make sure that the argument XX at index [0] is available in the YY context`

## 7.0.0-rc.1 (2020-04-29)
 - Update to NestJS 7
 
### Breaking changes
Notes removed and rolled up into the above release candidate. 

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
