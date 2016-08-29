'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _MailAdapter = require('parse-server/lib/Adapters/Email/MailAdapter');

var _MailAdapter2 = _interopRequireDefault(_MailAdapter);

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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * MailAdapter implementation used by the Parse Server to send
 * password reset and email verification emails though AmazonSES
 * @class
 */
var AmazonSESAdapter = function (_MailAdapter$default) {
  _inherits(AmazonSESAdapter, _MailAdapter$default);

  function AmazonSESAdapter() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, AmazonSESAdapter);

    var _this = _possibleConstructorReturn(this, (AmazonSESAdapter.__proto__ || Object.getPrototypeOf(AmazonSESAdapter)).call(this, options));

    var accessKeyId = options.accessKeyId;
    var secretAccessKey = options.secretAccessKey;
    var region = options.region;
    var fromAddress = options.fromAddress;

    if (!accessKeyId || !secretAccessKey || !region || !fromAddress) {
      throw new Error('AmazonSESAdapter requires valid fromAddress, accessKeyId, secretAccessKey, region.');
    }

    var _options$templates = options.templates;
    var templates = _options$templates === undefined ? {} : _options$templates;

    ['passwordResetEmail', 'verificationEmail'].forEach(function (key) {
      var _ref = templates[key] || {};

      var subject = _ref.subject;
      var pathPlainText = _ref.pathPlainText;
      var callback = _ref.callback;

      if (typeof subject !== 'string' || typeof pathPlainText !== 'string') throw new Error('AmazonSESAdapter templates are not properly configured.');

      if (callback && typeof callback !== 'function') throw new Error('AmazonSESAdapter template callback is not a function.');
    });

    _this.ses = new _amazonSesMailer2.default(accessKeyId, secretAccessKey, region);
    _this.fromAddress = fromAddress;
    _this.templates = templates;
    return _this;
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


  _createClass(AmazonSESAdapter, [{
    key: '_sendMail',
    value: function _sendMail(options) {
      var loadEmailTemplate = this.loadEmailTemplate;
      var message = {},
          templateVars = {},
          pathPlainText = void 0,
          pathHtml = void 0;

      if (options.templateName) {
        var templateName = options.templateName;
        var subject = options.subject;
        var fromAddress = options.fromAddress;
        var recipient = options.recipient;
        var variables = options.variables;

        var _template = this.templates[templateName];

        if (!_template) throw new Error('Could not find template with name ' + templateName);
        if (!subject && !_template.subject) throw new Error('Cannot send email with template ' + templateName + ' without a subject');
        if (!recipient) throw new Error('Cannot send email with template ' + templateName + ' without a recipient');

        pathPlainText = _template.pathPlainText;
        pathHtml = _template.pathHtml;

        templateVars = variables;

        message = {
          from: fromAddress || this.fromAddress,
          to: recipient,
          subject: subject || _template.subject
        };
      } else {
        var link = options.link;
        var appName = options.appName;
        var user = options.user;
        var templateConfig = options.templateConfig;
        var callback = templateConfig.callback;

        var userVars = void 0;

        if (callback && typeof callback === 'function') {
          userVars = callback(user);
          // If custom user variables are not packaged in an object, ignore it
          var validUserVars = userVars && userVars.constructor && userVars.constructor.name === 'Object';
          userVars = validUserVars ? userVars : {};
        }

        pathPlainText = templateConfig.pathPlainText;
        pathHtml = templateConfig.pathHtml;

        templateVars = Object.assign({
          link: link,
          appName: appName,
          username: user.get('username'),
          email: user.get('email')
        }, userVars);

        message = {
          from: this.fromAddress,
          to: user.get('email'),
          subject: templateConfig.subject
        };
      }

      return (0, _co2.default)(regeneratorRuntime.mark(function _callee() {
        var plainTextEmail, htmlEmail, compiled;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                plainTextEmail = void 0, htmlEmail = void 0, compiled = void 0;

                // Load plain-text version

                _context.next = 3;
                return loadEmailTemplate(pathPlainText);

              case 3:
                plainTextEmail = _context.sent;

                plainTextEmail = plainTextEmail.toString('utf8');

                // Compile plain-text template
                compiled = (0, _lodash2.default)(plainTextEmail, {
                  interpolate: /{{([\s\S]+?)}}/g
                });
                // Add processed text to the message object
                message.text = compiled(templateVars);

                // Load html version if available

                if (!pathHtml) {
                  _context.next = 13;
                  break;
                }

                _context.next = 10;
                return loadEmailTemplate(pathHtml);

              case 10:
                htmlEmail = _context.sent;

                // Compile html template
                compiled = (0, _lodash2.default)(htmlEmail, {
                  interpolate: /{{([\s\S]+?)}}/g
                });
                // Add processed HTML to the message object
                message.html = compiled(templateVars);

              case 13:
                return _context.abrupt('return', {
                  from: this.fromAddress,
                  to: [message.to],
                  subject: message.subject,
                  body: {
                    text: message.text,
                    html: message.html
                  }
                });

              case 14:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      })).then(function (payload) {
        return new Promise(function (resolve, reject) {
          ses.send(payload, function (error, data) {
            if (error) reject(error);
            resolve(data);
          });
        });
      }, function (error) {
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

  }, {
    key: 'sendPasswordResetEmail',
    value: function sendPasswordResetEmail(_ref2) {
      var link = _ref2.link;
      var appName = _ref2.appName;
      var user = _ref2.user;

      return this._sendMail({
        link: link,
        appName: appName,
        user: user,
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

  }, {
    key: 'sendVerificationEmail',
    value: function sendVerificationEmail(_ref3) {
      var link = _ref3.link;
      var appName = _ref3.appName;
      var user = _ref3.user;

      return this._sendMail({
        link: link,
        appName: appName,
        user: user,
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

  }, {
    key: 'send',
    value: function send(_ref4) {
      var templateName = _ref4.templateName;
      var subject = _ref4.subject;
      var fromAddress = _ref4.fromAddress;
      var recipient = _ref4.recipient;
      var _ref4$variables = _ref4.variables;
      var variables = _ref4$variables === undefined ? {} : _ref4$variables;

      return this._sendMail({
        templateName: templateName,
        subject: subject,
        fromAddress: fromAddress,
        recipient: recipient,
        variables: variables
      });
    }

    /**
     * Simple Promise wrapper to asynchronously fetch the contents of a template.
     * @param {string} path
     * @returns {promise}
     */

  }, {
    key: 'loadEmailTemplate',
    value: function loadEmailTemplate(path) {
      return new Promise(function (resolve, reject) {
        _fs2.default.readFile(path, function (err, data) {
          if (err) reject(err);
          resolve(data);
        });
      });
    }
  }]);

  return AmazonSESAdapter;
}(_MailAdapter2.default.default);

module.exports = AmazonSESAdapter;