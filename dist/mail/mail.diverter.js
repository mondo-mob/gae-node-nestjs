"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const logging_1 = require("../gcloud/logging");
let MailDiverter = class MailDiverter {
    constructor(mailSender, configurationProvider) {
        this.mailSender = mailSender;
        this.configurationProvider = configurationProvider;
        this.logger = logging_1.createLogger('mail-diverter');
        this.divertAddresses = (actualAddresses) => {
            if (!lodash_1.isEmpty(actualAddresses)) {
                const divertedFromAddresses = this.getDivertedFromAddressesAsString(actualAddresses);
                return this.configurationProvider.devHooks.divertEmailTo.map(divertToAddress => {
                    return {
                        name: divertedFromAddresses,
                        address: divertToAddress,
                    };
                });
            }
            return [];
        };
        this.getDivertedFromAddressesAsString = (actualAddress) => {
            let addressList = [actualAddress];
            if (actualAddress instanceof Array) {
                addressList = actualAddress;
            }
            const justAddresses = addressList.map(address => {
                if (typeof address === 'string') {
                    return address.trim();
                }
                return address.address.trim();
            }).join(', ');
            const deAttedAddresses = lodash_1.replace(justAddresses, /@/g, '.at.');
            return `Diverted from ${deAttedAddresses}`;
        };
        const { devHooks } = this.configurationProvider;
        if (!devHooks || lodash_1.isEmpty(devHooks.divertEmailTo)) {
            throw new Error('No divert-to email address(es) defined');
        }
        this.subjectPrefix = devHooks.emailSubjectPrefix && `${devHooks.emailSubjectPrefix}: ` || '';
        this.logger.info('MailSender instance is MailDiverter');
        this.logger.info(`Configuring mail diversion with subject prefix '${this.subjectPrefix}' to: ${devHooks.divertEmailTo}`);
    }
    async send(context, mailOptions) {
        const diversionOverrides = {
            to: this.divertAddresses(mailOptions.to),
            cc: this.divertAddresses(mailOptions.cc),
            bcc: this.divertAddresses(mailOptions.bcc),
            subject: `${this.subjectPrefix}${mailOptions.subject}`,
        };
        this.logger.info('Diverting mail with overrides: ', diversionOverrides);
        return this.mailSender.send(context, Object.assign({}, mailOptions, diversionOverrides));
    }
};
MailDiverter = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject(configuration_1.CONFIGURATION)),
    tslib_1.__metadata("design:paramtypes", [Object, Object])
], MailDiverter);
exports.MailDiverter = MailDiverter;
//# sourceMappingURL=mail.diverter.js.map