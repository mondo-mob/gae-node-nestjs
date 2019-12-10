import { anything, instance, mock, reset, spy, verify, when } from 'ts-mockito';
import { Context, IUser, IUserCreateRequest, IUserUpdates, LoginIdentifierRepository } from '../..';
import { LoginIdentifier } from '../login-identifier.repository';
import { AbstractUserService } from '../user.service';
import { mockContext } from './auth.service.spec';

describe('UserService', () => {
  const loginIdentifierRepository = mock(LoginIdentifierRepository);
  const context = mockContext();
  let userService: TestUserService;
  let userServiceSpy: TestUserService;

  beforeEach(() => {
    reset(loginIdentifierRepository);
    userService = new TestUserService(instance(loginIdentifierRepository));
    userServiceSpy = spy(userService);
  });

  describe('createOrUpdate', () => {
    let request: IUserCreateRequest;
    let loginIdentifier: LoginIdentifier;
    let existingUser: IUser;

    beforeEach(() => {
      request = {
        email: 'foo@bar.com',
        name: 'Foo bar',
        roles: ['user'],
        enabled: true,
      };
      loginIdentifier = {
        id: '123',
        userId: 'user-123',
        createdAt: new Date(),
      };
      existingUser = {
        id: loginIdentifier.userId,
        email: request.email,
        enabled: request.enabled!,
        roles: request.roles!,
      };
    });

    it('creates a user when user does not exist by email', async () => {
      when(loginIdentifierRepository.get(context, 'foo@bar.com')).thenResolve(undefined);

      await userService.createOrUpdate(context, request);

      // @ts-ignore
      verify(userServiceSpy.createUser(context, anything())).once();
      verify(loginIdentifierRepository.save(context, anything())).once();
      // @ts-ignore
      verify(userServiceSpy.updateUser(context, anything(), anything())).never();
    });

    it('updates user when user exists by email', async () => {
      when(loginIdentifierRepository.get(context, 'foo@bar.com')).thenResolve(loginIdentifier);
      when(userServiceSpy.get(context, loginIdentifier.userId)).thenResolve(existingUser);

      await userService.createOrUpdate(context, request);

      // @ts-ignore
      verify(userServiceSpy.updateUser(context, existingUser, anything())).once();
      // @ts-ignore
      verify(userServiceSpy.createUser(context, anything())).never();
      verify(loginIdentifierRepository.save(context, anything())).never();
    });

    it('calls beforeUpdate before performing update on an existing user by email', async () => {
      when(loginIdentifierRepository.get(context, 'foo@bar.com')).thenResolve(loginIdentifier);
      when(userServiceSpy.get(context, loginIdentifier.userId)).thenResolve(existingUser);

      await expect(
        userService.createOrUpdate(context, request, () => {
          throw new Error('test error');
        }),
      ).rejects.toHaveProperty('message', 'test error');

      // @ts-ignore
      verify(userServiceSpy.updateUser(context, existingUser, anything())).never();
    });
  });
});

class TestUserService extends AbstractUserService<IUser> {
  constructor(protected readonly loginIdentifierRepository: LoginIdentifierRepository) {
    super(loginIdentifierRepository);
  }

  get(context: Context, userId: string): Promise<IUser | undefined> {
    return Promise.resolve(undefined);
  }

  protected createUser(context: Context, user: IUserCreateRequest & IUserUpdates): Promise<IUser> {
    return Promise.resolve({ ...user } as IUser);
  }

  protected updateUser(context: Context<IUser>, user: IUser, updates: IUserUpdates): Promise<IUser> {
    return Promise.resolve({ ...user } as IUser);
  }
}
