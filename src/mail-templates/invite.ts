import { mainButton, standardEmail } from './base';

export const userInviteEmail = (title: string, link: string) => {
  const content = /*html*/ `
      <div>
        <p>Welcome,</p>
        <p>You have been invited as a new user. Please click the button below to activate your account.</p>
      </div>
      <div>
            ${mainButton('Activate Account', link)}
      </div>
  `;

  return standardEmail(title, content);
};
