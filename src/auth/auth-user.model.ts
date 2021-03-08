import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
class Credentials {
  @Field()
  username: string;
  @Field()
  type: string;
}

@ObjectType()
export class AuthUser {
  @Field()
  credentials?: Credentials;
  @Field(() => [String!])
  roles: readonly string[];
}
