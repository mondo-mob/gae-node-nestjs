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
- Follow official migration guide: [https://docs.nestjs.com/migration-guide]
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
