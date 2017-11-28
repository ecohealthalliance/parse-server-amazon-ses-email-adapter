'use strict';

var _MailAdapter = require('parse-server/lib/Adapters/Email/MailAdapter');

var _amazonSesMailer = require('amazon-ses-mailer');

var _amazonSesMailer2 = _interopRequireDefault(_amazonSesMailer);

var _lodash = require('lodash.template');

var _lodash2 = _interopRequireDefault(_lodash);

var _co = require('co');

var _co2 = _interopRequireDefault(_co);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * MailAdapter implementation used by the Parse Server to send
 * password reset and email verification emails though AmazonSES
 * @class
 */
class AmazonSESAdapter extends _MailAdapter.MailAdapter {
  constructor(options = {}) {
    super(options);

    const {
      accessKeyId,
      secretAccessKey,
      region,
      fromAddress
    } = options;
    if (!accessKeyId || !secretAccessKey || !region || !fromAddress) {
      throw new Error('AmazonSESAdapter requires valid fromAddress, accessKeyId, secretAccessKey, region.');
    }

    const {
      templates = {}
    } = options;
    ['passwordResetEmail', 'verificationEmail'].forEach(key => {
      const {
        subject,
        pathPlainText,
        callback
      } = templates[key] || {};
      if (typeof subject !== 'string' || typeof pathPlainText !== 'string') throw new Error('AmazonSESAdapter templates are not properly configured.');

      if (callback && typeof callback !== 'function') throw new Error('AmazonSESAdapter template callback is not a function.');
    });

    this.ses = new _amazonSesMailer2.default(accessKeyId, secretAccessKey, region);
    this.fromAddress = fromAddress;
    this.templates = templates;
  }

  /**
   * Method to send emails via AmazonSESAdapter
   *
   * @param {object} options, options object with the following parameters:
   * @param {string} options.subject, email's subject
   * @param {string} options.link, to reset password or verify email address
   * @param {object} options.user, the Parse.User object
   * @param {string} options.pathPlainText, path to plain-text version of email template
   * @param {string} options.pathHtml, path to html version of email template
   * @returns {promise}
   */
  _sendMail(options) {
    const loadEmailTemplate = this.loadEmailTemplate;
    let message = {},
        templateVars = {},
        pathPlainText,
        pathHtml;

    if (options.templateName) {
      const {
        templateName,
        subject,
        fromAddress,
        recipient,
        variables
      } = options;
      let template = this.templates[templateName];

      if (!template) throw new Error(`Could not find template with name ${templateName}`);
      if (!subject && !template.subject) throw new Error(`Cannot send email with template ${templateName} without a subject`);
      if (!recipient) throw new Error(`Cannot send email with template ${templateName} without a recipient`);

      pathPlainText = template.pathPlainText;
      pathHtml = template.pathHtml;

      templateVars = variables;

      message = {
        from: fromAddress || this.fromAddress,
        to: recipient,
        subject: subject || template.subject
      };
    } else {
      const {
        link,
        appName,
        user,
        templateConfig
      } = options;
      const {
        callback
      } = templateConfig;
      let userVars;

      if (callback && typeof callback === 'function') {
        userVars = callback(user);
        // If custom user variables are not packaged in an object, ignore it
        const validUserVars = userVars && userVars.constructor && userVars.constructor.name === 'Object';
        userVars = validUserVars ? userVars : {};
      }

      pathPlainText = templateConfig.pathPlainText;
      pathHtml = templateConfig.pathHtml;

      templateVars = Object.assign({
        link,
        appName,
        username: user.get('username'),
        email: user.get('email')
      }, userVars);

      message = {
        from: this.fromAddress,
        to: user.get('email'),
        subject: templateConfig.subject
      };
    }

    return (0, _co2.default)(function* () {
      let plainTextEmail, htmlEmail, compiled;

      // Load plain-text version
      plainTextEmail = yield loadEmailTemplate(pathPlainText);
      plainTextEmail = plainTextEmail.toString('utf8');

      // Compile plain-text template
      compiled = (0, _lodash2.default)(plainTextEmail, {
        interpolate: /{{([\s\S]+?)}}/g
      });
      // Add processed text to the message object
      message.text = compiled(templateVars);

      // Load html version if available
      if (pathHtml) {
        htmlEmail = yield loadEmailTemplate(pathHtml);
        // Compile html template
        compiled = (0, _lodash2.default)(htmlEmail, {
          interpolate: /{{([\s\S]+?)}}/g
        });
        // Add processed HTML to the message object
        message.html = compiled(templateVars);
      }

      return {
        from: message.from,
        to: [message.to],
        subject: message.subject,
        body: {
          text: message.text,
          html: message.html
        }
      };
    }).then(payload => {
      return new Promise((resolve, reject) => {
        this.ses.send(payload, (error, data) => {
          if (error) reject(error);
          resolve(data);
        });
      });
    }, error => {
      console.error(error);
    });
  }

  /**
   * _sendMail wrapper to send an email with password reset link
   * @param {object} options, options object with the following parameters:
   * @param {string} options.link, to reset password or verify email address
   * @param {string} options.appName, the name of the parse-server app
   * @param {object} options.user, the Parse.User object
   * @returns {promise}
   */
  sendPasswordResetEmail({ link, appName, user }) {
    return this._sendMail({
      link,
      appName,
      user,
      templateConfig: this.templates.passwordResetEmail
    });
  }

  /**
   * _sendMail wrapper to send an email with an account verification link
   * @param {object} options, options object with the following parameters:
   * @param {string} options.link, to reset password or verify email address
   * @param {string} options.appName, the name of the parse-server app
   * @param {object} options.user, the Parse.User object
   * @returns {promise}
   */
  sendVerificationEmail({ link, appName, user }) {
    return this._sendMail({
      link,
      appName,
      user,
      templateConfig: this.templates.verificationEmail
    });
  }

  /**
   * _sendMail wrapper to send general purpose emails
   * @param {object} options, options object with the following parameters:
   * @param {object} options.templateName, name of template to be used
   * @param {object} options.subject, overrides the default value
   * @param {object} options.fromAddress, overrides the default from address
   * @param {object} options.recipient, email's recipient
   * @param {object} options.variables, an object whose property names represent
   *   template variables,vand whose values will replace the template variable
   *   placeholders
   * @returns {promise}
   */
  send({ templateName, subject, fromAddress, recipient, variables = {} }) {
    return this._sendMail({
      templateName,
      subject,
      fromAddress,
      recipient,
      variables
    });
  }

  /**
   * Simple Promise wrapper to asynchronously fetch the contents of a template.
   * @param {string} path
   * @returns {promise}
   */
  loadEmailTemplate(path) {
    return new Promise((resolve, reject) => {
      _fs2.default.readFile(path, (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    });
  }

}

module.exports = AmazonSESAdapter;