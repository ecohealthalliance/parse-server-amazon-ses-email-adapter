import 'babel-polyfill'
import AmazonSESAdapter from '../src/AmazonSESAdapter';
import { expect } from 'chai';
import sinon from 'sinon';
import path from 'path';

// Mock Parse.User object
const Parse = {
  User: class User {
    get() {
      return 'foo'
    }
  }
};
const user = new Parse.User();
const config = {
  fromAddress: 'SuperCoolApp <noreply@supercoolapp.com>',
  accessKeyId: 'Your AWS IAM Access Key ID',
  secretAccessKey: 'Your AWS IAM Secret Access Key',
  region: 'Your AWS Region',
  templates: {
    passwordResetEmail: {
      subject: 'Reset your password',
      pathPlainText: path.join(__dirname, 'email-templates/password_reset_email.txt'),
      pathHtml: path.join(__dirname, 'email-templates/password_reset_email.html'),
      callback: (user) => {}
    },
    verificationEmail: {
      subject: 'Confirm your account',
      pathPlainText: path.join(__dirname, 'email-templates/verification_email.txt'),
      pathHtml: path.join(__dirname, 'email-templates/verification_email.html'),
      callback: (user) => {}
    },
    customEmail: {
      subject: 'Test custom email template',
      pathPlainText: path.join(__dirname, 'email-templates/custom_email.txt'),
      pathHtml: path.join(__dirname, 'email-templates/custom_email.html'),
    },
  }
};

const optionsErrorMessage = 'AmazonSESAdapter requires valid fromAddress, accessKeyId, secretAccessKey, region.';
const templatesErrorMessage = 'AmazonSESAdapter templates are not properly configured.';
const templateCallbackErrorMessage = 'AmazonSESAdapter template callback is not a function.';

describe('AmazonSESAdapter', () => {
  describe('creating a new instance', () => {
    it('should fail if not called with required options', () => {
      try {
        new AmazonSESAdapter({
          accessKeyId: '.',
          fromAddress: '.'
        });
      } catch (error) {
        expect(error.message.trim()).to.equal(optionsErrorMessage);
      }
      try {
        new AmazonSESAdapter({
          accessKeyId: '.',
          fromAddress: '.'
        });
      } catch (error) {
        expect(error.message.trim()).to.equal(optionsErrorMessage);
      }
      try {
        new AmazonSESAdapter({
          accessKeyId: '.',
          region: '.'
        });
      } catch (error) {
        expect(error.message.trim()).to.equal(optionsErrorMessage);
      }
    });

    it('should fail without properly configured templates option', () => {
      try {
        new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
        });
      } catch (error) {
        expect(error.message).to.equal(templatesErrorMessage);
      }

      try {
        new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
          templates: {
            passwordResetEmail: {},
            verificationEmail: {}
          }
        });
      } catch (error) {
        expect(error.message.trim()).to.equal(templatesErrorMessage);
      }

      try {
        new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
          templates: {
            passwordResetEmail: {
              subject: '.'
            },
            verificationEmail: {
              subject: '.'
            }
          }
        });
      } catch (error) {
        expect(error.message).to.equal(templatesErrorMessage);
      }

      try {
        new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
          templates: {
            passwordResetEmail: {
              pathPlainText: '.'
            },
            verificationEmail: {
              pathPlainText: '.'
            }
          }
        });
      } catch (error) {
        expect(error.message).to.equal(templatesErrorMessage);
      }

      try {
        new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
          templates: {
            passwordResetEmail: {
              pathPlainText: '.'
            },
            verificationEmail: {
              pathPlainText: '.'
            }
          }
        });
      } catch (error) {
        expect(error.message).to.equal(templatesErrorMessage);
      }

      try {
        new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
          templates: {
            passwordResetEmail: {
              subject: 'Reset your password',
              pathPlainText: '.',
              callback: ''
            },
            verificationEmail: {
              subject: 'Confirm your email',
              pathPlainText: '.'
            }
          }
        });
      } catch (error) {
        expect(error.message).to.equal(templateCallbackErrorMessage);
      }
    });

    it('should succeed with properly configured templates option', (done) => {
      try {
        const adapter = new AmazonSESAdapter({
          fromAddress: '.',
          accessKeyId: '.',
          secretAccessKey: '.',
          region: '.',
          templates: {
            passwordResetEmail: {
              subject: 'Reset your password',
              pathPlainText: '.'
                // pathHtml and callback are optional
            },
            verificationEmail: {
              subject: 'Confirm your email',
              pathPlainText: '.'
                // pathHtml and callback are optional
            }
          }
        });
        expect(adapter).to.be.an.instanceof(AmazonSESAdapter);
        done();
      } catch (e) {
        done();
      }
    });
  });

  describe('#sendPasswordResetEmail()', () => {
    let _sendMail;

    before(() => {
      _sendMail = sinon.spy(AmazonSESAdapter.prototype, '_sendMail');
    });

    after(() => {
      _sendMail.restore();
    });

    it('should invoke #_sendMail() with the correct arguments', () => {
      const adapter = new AmazonSESAdapter(config);
      const link = 'http://password-reset-link';
      const appName = 'SuperCoolApp';
      const templateConfig = adapter.templates.passwordResetEmail;

      const options = {
        link,
        appName,
        user
      };
      const expectedArguments = {
        link,
        appName,
        user,
        templateConfig
      };

      // The Parse Server will invoke this adapter method with similar options
      adapter.sendPasswordResetEmail(options);

      sinon.assert.calledWith(_sendMail, expectedArguments);
    });
  });

  describe('#sendVerificationEmail()', () => {
    let _sendMail;


    before(() => {
      _sendMail = sinon.spy(AmazonSESAdapter.prototype, '_sendMail');
    });

    after(() => {
      _sendMail.restore();
    });

    it('should invoke #_sendMail() with the correct arguments', () => {
      const adapter = new AmazonSESAdapter(config);
      const link = 'http://verify-account-link';
      const appName = 'SuperCoolApp';
      const templateConfig = adapter.templates.verificationEmail;

      const options = {
        link,
        appName,
        user
      };
      const expectedArguments = {
        link,
        appName,
        user,
        templateConfig
      };

      // The Parse Server will invoke this adapter method with similar options
      adapter.sendVerificationEmail(options);

      sinon.assert.calledWith(_sendMail, expectedArguments);
    });
  });

  describe('#sendCustomEmail()', () => {
    let _sendMail;

    before(() => {
      _sendMail = sinon.spy(AmazonSESAdapter.prototype, '_sendMail');
    });

    after(() => {
      _sendMail.restore();
    });

    it('should invoke #_sendMail() with the correct arguments', () => {
      const adapter = new AmazonSESAdapter(config);
      const templateName = 'customEmail';
      const fromAddress = config.fromAddress;
      const recipient = 'test@supercoolapp.com'
      const variables = {
        appName: 'SuperCoolApp'
      };
      const options = {
        templateName,
        fromAddress,
        recipient,
        variables
      };

      const promise = adapter.send(options);
      expect(promise).to.be.an.instanceof(Promise);
    });
  });
});
