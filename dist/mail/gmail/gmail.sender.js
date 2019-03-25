"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const gmail_configurer_1 = require("./gmail.configurer");
const nodemailer_1 = require("nodemailer");
const configuration_1 = require("../../configuration");
const logging_1 = require("../../gcloud/logging");
let GmailSender = class GmailSender {
    constructor(gmailConfigurer, configurationProvider) {
        this.gmailConfigurer = gmailConfigurer;
        this.configurationProvider = configurationProvider;
        this.logger = logging_1.createLogger('gmail-sender');
        this.logger.info('Created GmailSender');
    }
    async send(context, mailOptions) {
        const credential = await this.gmailConfigurer.getCredential(context);
        if (!credential) {
            this.logger.error('Gmail OAuth is not configured yet. No StoredCredential entity with id "gmail-credential"');
        }
        else if (!this.configurationProvider.auth.google) {
            this.logger.error('Gmail OAuth is not configured yet. No environment configuration exists for "auth.google"');
        }
        else {
            const auth = {
                type: 'oauth2',
                user: this.configurationProvider.gmailUser,
                clientId: this.configurationProvider.auth.google.clientId,
                clientSecret: this.configurationProvider.auth.google.secret,
                refreshToken: credential.value,
            };
            const transport = {
                service: 'gmail',
                auth,
            };
            const transporter = nodemailer_1.createTransport(transport);
            this.logger.info({
                logDetails: {
                    to: mailOptions.to,
                    cc: mailOptions.cc,
                    bcc: mailOptions.bcc,
                },
            }, 'Sending email (see logDetails property for to, cc, bcc) with subject: %s', mailOptions.subject);
            await new Promise((resolve, reject) => transporter.sendMail(Object.assign({ from: auth.user }, mailOptions), (err, res) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            }));
        }
    }
};
GmailSender = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject(configuration_1.CONFIGURATION)),
    tslib_1.__metadata("design:paramtypes", [gmail_configurer_1.GmailConfigurer, Object])
], GmailSender);
exports.GmailSender = GmailSender;
//# sourceMappingURL=gmail.sender.js.map