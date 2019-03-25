"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
exports.userInviteEmail = (title, link) => {
    const content = `
      <div>
        <p>Welcome,</p>
        <p>You have been invited as a new user. Please click the button below to activate your account.</p>
      </div>
      <div>
            ${base_1.mainButton('Activate Account', link)}
      </div>
  `;
    return base_1.standardEmail(title, content);
};
//# sourceMappingURL=invite.js.map