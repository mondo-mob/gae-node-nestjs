"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const logging_1 = require("../gcloud/logging");
const htmlToText = require("html-to-text");
let LoggingMailSenderStub = class LoggingMailSenderStub {
    constructor() {
        this.logger = logging_1.createLogger('local-mail-logger');
        this.logger.info('MailSender instance is LocalMailLogger');
    }
    async send(context, mailOptions) {
        if (!mailOptions.to && !mailOptions.cc && !mailOptions.bcc) {
            throw new Error('No recipients defined');
        }
        const content = mailOptions.text ||
            (typeof mailOptions.html === 'string' && htmlToText.fromString(mailOptions.html)) ||
            '-body not loggable-';
        this.logger.info('Logging email send\n\n' +
            'to:          %s\n' +
            'cc:          %s\n' +
            'bcc:         %s\n' +
            'attachments: %s\n' +
            'subject:     %s\n' +
            '\n' +
            '%s\n' +
            '\n\n', this.stringify(mailOptions.to), this.stringify(mailOptions.cc), this.stringify(mailOptions.bcc), (mailOptions.attachments && mailOptions.attachments.length) || 0, this.stringify(mailOptions.subject), content);
    }
    stringify(source) {
        if (!source) {
            return '';
        }
        return typeof source === 'string' ? source : JSON.stringify(source);
    }
};
LoggingMailSenderStub = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [])
], LoggingMailSenderStub);
exports.LoggingMailSenderStub = LoggingMailSenderStub;
//# sourceMappingURL=mail.logging.stub.js.map