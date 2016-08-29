# Parse Server Amazon SES Email Adapter [![CircleCI](https://circleci.com/gh/ecohealthalliance/parse-server-amazon-ses-email-adapter.svg?style=svg)](https://circleci.com/gh/ecohealthalliance/parse-server-amazon-ses-email-adapter)
Used to send Parse Server emails with Amazon SES.
(based on [`parse-server-mailgun`](https://github.com/sebsylvester/parse-server-mailgun))

## AmazonSES node module
[`amazon-ses-mailer`](https://github.com/antoinerousseau/node-amazon-ses)


## Install
```sh
$ npm install parse-server-amazon-ses-email-adapter --save
```

## Usage
Replace the config with your info.  You can find your AWS SES credentials here: http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSGettingStartedGuide/AWSCredentials.html

In addition, you also need to configure the **templates** you want to use.
You must provide at least a plain-text version for each template. The html versions are optional.

```js
//...otherOptions,
emailAdapter: {
  module: 'parse-server-amazon-ses-email-adapter',
  options: {
    // The address that your emails come from
    fromAddress: 'Your Name <noreply@supercoolapp.com>',
    accessKeyId: 'Your AWS IAM Access Key ID',
    secretAccessKey: 'Your AWS IAM Secret Access Key',
    region: 'Your AWS Region',
    // The template section
    templates: {
      passwordResetEmail: {
        subject: 'Reset your password',
        pathPlainText: resolve(__dirname, 'path/to/templates/password_reset_email.txt'),
        pathHtml: resolve(__dirname, 'path/to/templates/password_reset_email.html'),
        callback: (user) => {
            return {
              firstName: user.get('firstName')
            }
          }
          // Now you can use {{firstName}} in your templates
      },
      verificationEmail: {
        subject: 'Confirm your account',
        pathPlainText: resolve(__dirname, 'path/to/templates/verification_email.txt'),
        pathHtml: resolve(__dirname, 'path/to/templates/verification_email.html'),
        callback: (user) => {
            return {
              firstName: user.get('firstName')
            }
          }
          // Now you can use {{firstName}} in your templates
      },
      customEmailAlert: {
        subject: 'Urgent notification!',
        pathPlainText: resolve(__dirname, 'path/to/templates/custom_alert.txt'),
        pathHtml: resolve(__dirname, 'path/to/templates/custom_alert.html'),
      }
    }
  }
}
```


### Templates
The Parse Server uses the AmazonSESAdapter for only two use cases: password reset and email address verification.
With a few lines of code, it's also possible to use the AmazonSESAdapter directly, so that you can send any other template-based email, provided it has been configured as shown in the example configuration above.

```js
// Get access to Parse Server's cache
// With ES2015 syntax:
const { AppCache } = require('parse-server/lib/cache');
// Or with old-school JS:
const AppCache = require('parse-server/lib/cache').AppCache;
// Get a reference to the AmazonSESAdapter
const AmazonSESAdapter = AppCache.get('yourAppId')['userController']['adapter'];
// Invoke the send method with an options object
AmazonSESAdapter.send({
  templateName: 'customEmailAlert',
  // Optional override of your configuration's subject
  subject: 'Important: action required',
  // Optional override of the adapter's fromAddress
  fromAddress: 'Alerts <noreply@yourapp.com>',
  recipient: 'user@email.com',
  variables: { alert: 'New posts' } // {{alert}} will be compiled to 'New posts'
});
```


### Sample templates and template variables
In the test directory, there are a few examples to get you started.

For password reset and address verification messages, you can use the following template variables by default:
* `{{link}}` - the reset or verification link provided by the Parse Server
* `{{appName}}` - as is defined in your Parse Server configuration object
* `{{username}}` - the Parse.User object's username property
* `{{email}}` - the Parse.User object's email property

Additional variables can be introduced by adding a callback.
An example is shown in the configuration above. The relevant Parse.User object is passed as an argument. The return value must be a plain object where the property names exactly match their template counterparts.
Note: the callback options only applies to the password reset and email address verification use cases.

For any other use case, you use the ```AmazonSESAdapter``` directly and pass any variable you need to the ```send``` method as explained in the code sample above.
