## 7.1.0-rc.1 (2020-05-12)
 - Use cls-hooked to have thread-local-like functionality within app. First real usage is to allow context to be retrieved with `getContext()`

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
