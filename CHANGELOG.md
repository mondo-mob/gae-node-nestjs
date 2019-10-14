## 6.0.0-rc1 (2020-03-00)

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

## 5.1.2 (2020-01-31)

- Fix typings to support multiple query predicates for arrays of primitives and union types.

## 5.1.1 (2019-12-17)

- Audit fix one moderate security issue related to "serialize-javascript". Internal minor dependency updates.

## 5.1.0 (2019-12-16)

- Allow multiple predicates per field when querying search service

## 5.0.1 (2-19-12-10)

 - Update some internal dependencies to get vulnerabilities down to one moderate from 12,763

## 5.0.0 (2-19-12-10)

 - Allow users with existing (enabled) User entity to login with external auth. Previous code assumed that if we don't have a LoginCredential stored then we always need to create a user. 
 This caused errors when we had a user record already but that user had not logged in (in most cases resulting in an endless redirect loop). Updated solution allows existing user to login.

### Breaking changes:

 - `UserService` interface has an additional method to `createOrUpdate`. Most implementations that extend `AbstractUserService` should remain unaffected.


## 4.0.0 (2019-12-06)

- Pass Context to repository beforePersist hook
- Allow custom props in Context

### Breaking changes:

- Any existing beforePersist hooks need to update to use the new signature:

```
protected beforePersist(context: Context, entities: OneOrMany<T>): OneOrMany<T>;
```

## 3.2.0 (2019-11-29)

- Log graphql errors as warning severity
- Log non-fatal errors as warning severity in transactions

## 3.1.0 (2019-11-27)

- Automatically filter undefined entries from search results
- Delete search indexes when entities deleted
- Add changelog

## 3.0.0 (2019-10-18)

- Update all gcloud dependencies
- Allow fake login in deployed environments. A secret is required for deployed environments it logs a warn level message that fake login is enabled. 
- Add email whitelist option to mail devhooks
- Email prefix can be added without enabling diversion
- [Bug] Respect local login enabled flag

### Breaking changes:

1. Update jest config for server code with "testEnvironment": "node" or run with jest --env node
2. Fake login config has changed to use following form:
```
auth: {
    fake?: {
      enabled?: boolean;
      secret?: string;
    }
}
```

## 2.4.0 (2019-10-14)

- Update passport auth service to raise authentication errors on failed logins
- Update dev dependencies
- Use uuid instead of node-uuid lib
- Add prettier as dependency and fixup lint/format conflicts

No breaking changes.

## 2.3.1 (2019-10-03)

- Reject login attempts if local backed user has been explicitly disabled.

## 2.3.0 (2019-10-02)

- Update local signout to be a GET request instead of a POST. Existing method still there but logs a deprecation warning.

## 2.2.0 (2019-09-18)
- Static assets can be configured before session handling by passing configuration to configureExpress function. 
By default will also not serve index.html if you request the site root (required for next change to work correctly).
So instead of:
 ```
 app.useStaticAssets('public');
 ```
Do this:
 ```
 configureExpress(expressApp, {
    session: {...},
    staticAssets: {
      root: 'public',
    },
  });
```

- Session will be saved before index.html is returned to browser. Depends on previous change so that the index.html won’t be served by the static middleware. Instead will always be served by the Nest catch all exception handler in filter.ts (i.e. the catch all route to enable client side routing).

## 2.1.1 (2019-09-26)

- Update @google-cloud/storage to 2.5.0

## 2.1.0 (2019-09-18)

- Enable configuration of federated auth failureRedirect url. No changes required as defaults to / to match existing behaviour.

## 2.0.0 (2019-09-16)

- Ensure all LoginCredentials entities are always saved with lowercase id and retrieved with lowercase id in auth service. This could be breaking if you have existing LoginCredentials entities stored with mixed case.
- Add `beforePersist()` hook on Repository so that you can intercept and optionally transform entities before one of the many "save" methods: save update insert upsert.

## 1.6.0 (2019-09-11)

- Add fake login option for local development environment only

## 1.15.1 (2019-09-10)

- Add ability to sign-in with okta using oidc (Open ID Connect) protocol. 
- Add option `overwriteExisting` so that if someone previously registered/logged in with username/password it will overwrite their existing credentials to be oidc and re-use the user with pre-existing roles.

## 1.14.3 (2019-08-29)

- Default session timeout can be overridde

## 1.14.2 (2019-06-21)

- [Bug] Auth Controller activateAccount service hanging

## 1.14.1 (2019-06-14)

- Add query for checking activation code

## 1.14.0 (2019-06-14)

- [Bug] Fix csrf maxage

## 1.13.0 (2019-06-14)

- [Bug] Set a (very long) max age on the csrf token cookie, to fix bug where session cookie can still be valid (now that we are setting a maxage on them) but the csrf token is gone

## 1.12.3 (2019-06-13)

- [Bug] reinstate activate endpoint (oops)

## 1.12.2 (2019-06-13)

- Disallow adding super role when editing users so its consistent with inviting

## 1.12.1 (2019-06-12)

- Support paged queries with the search service

## 1.12.0 (2019-06-12)

- Improve expired activation code message copy and move activationExpiryInMinutes configuration to a more meaningful place

## 1.11.2 (2019-06-12)

- Add configurable copy to activation email to indicate when link will expire
- Remove auto-login after activate because it hasnt been done properly

## 1.11.1 (2019-06-07)

- Add img-src directive for gravatar as it's widely used

## 1.11.0 (2019-06-07)

- Add an auth listener so library consumers can listen for login events (breaking change)

## 1.10.0 (2019-06-06)

- Default session timeout to 2 hours, and enable rolling sessions (so maxAge gets reset when there is activity)

## 1.9.10 (2019-06-05)

- Add endpoint to redirect to auth0 logout page

## 1.9.9 (2019-05-27)

- Include profile scope for auth0 integration and set name on user

## 1.9.8 (2019-05-27)

- fix manifest-src error


