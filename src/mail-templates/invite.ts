import { mainButton, standardEmail } from './base';

export const userInviteEmail = (
  title: string,
  link: string,
  invitationCopy: string,
  expiryCopy: string | undefined,
) => {
  const content = /*html*/ `
      <div>
        <p>Welcome,</p>
        <p>${invitationCopy} Please click the button below to activate your account.
        ${expiryCopy ? ` This link will expire in ${expiryCopy}.` : ''}</p>
      </div>
      <div>
            ${mainButton('Activate Account', link)}
      </div>
  `;

  return standardEmail(title, content);
};
