import { anything, instance, mock, reset, verify, when } from 'ts-mockito';
import { LoginIdentifier, LoginIdentifierRepository } from './login-identifier.repository';
import { AbstractUserService } from './user.service';
import { mockContext } from '../_test/mocks';
import { Context, IUser, IUserCreateRequest, IUserUpdates } from '../datastore/context';

// NOTE: Latest typescript broke some of the mockito spies - so these bits have been updated to use jest mocks instead.
describe('UserService', () => {
  const loginIdentifierRepository = mock(LoginIdentifierRepository);
  const context = mockContext();
  let userService: TestUserService;

  beforeEach(() => {
    reset(loginIdentifierRepository);
    userService = new TestUserService(instance(loginIdentifierRepository));
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
      const createUserSpy = jest.spyOn<any, any>(userService, 'createUser');
      const updateUserSpy = jest.spyOn<any, any>(userService, 'updateUser');

      await userService.createOrUpdate(context, request);

      expect(createUserSpy).toHaveBeenCalledWith(context, expect.anything());
      verify(loginIdentifierRepository.save(context, anything())).once();
      expect(updateUserSpy).not.toHaveBeenCalled();
    });

    it('updates user when user exists by email', async () => {
      const createUserSpy = jest.spyOn<any, any>(userService, 'createUser');
      const updateUserSpy = jest.spyOn<any, any>(userService, 'updateUser');
      jest.spyOn(userService, 'get').mockResolvedValue(existingUser);
      when(loginIdentifierRepository.get(context, 'foo@bar.com')).thenResolve(loginIdentifier);

      await userService.createOrUpdate(context, request);

      expect(updateUserSpy).toHaveBeenCalledWith(context, existingUser, expect.anything());
      expect(createUserSpy).not.toHaveBeenCalled();
      verify(loginIdentifierRepository.save(context, anything())).never();
    });

    it('calls beforeUpdate before performing update on an existing user by email', async () => {
      const updateUserSpy = jest.spyOn<any, any>(userService, 'updateUser');
      when(loginIdentifierRepository.get(context, 'foo@bar.com')).thenResolve(loginIdentifier);
      jest.spyOn(userService, 'get').mockResolvedValue(existingUser);

      await expect(
        userService.createOrUpdate(context, request, () => {
          throw new Error('test error');
        }),
      ).rejects.toHaveProperty('message', 'test error');

      expect(updateUserSpy).not.toHaveBeenCalled();
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
