let Adapter = null;
let TextMessage = null;
let User = null;

try {
  Adapter = require('hubot/src/adapter');
  TextMessage = require('hubot').TextMessage;
  User = require('hubot').User;

} catch (e) {
  // workaround when `npm link`'ed for development
  const prequire = require('parent-require');

  Adapter = prequire('hubot/src/adapter');
  TextMessage = prequire('hubot').TextMessage;
  User = prequire('hubot').User;
}

const Mime = require('mime');
const crypto = require('crypto');

const {
  FacebookMessagingAPIClient,
  FacebookMessageParser
} = require('fb-messenger-bot-api');


/**
 * Hubot Facebook Messenger adapter.
 *
 * @author Chris Spiliotopoulos
 */

class FacebookMessengerAdapter extends Adapter {

  /**
   * Constructor
   */
  constructor(robot) {

    super(robot);

    // default FB API version
    this.fbApiVersion = 3.2;

    this.page_id = process.env.FB_PAGE_ID;
    this.app_id = process.env.FB_APP_ID;
    this.app_secret = process.env.FB_APP_SECRET;
    this.token = process.env.FB_PAGE_TOKEN;

    // enfore required environment variables
    this._checkRequiredVariables();

    this.vtoken = process.env.FB_VERIFY_TOKEN || crypto.randomBytes(16).toString('hex');

    this.routeURL = process.env.FB_ROUTE_URL || '/hubot/fb';
    this.webhookURL = process.env.FB_WEBHOOK_BASE + this.routeURL;

    this.sendImages = process.env.FB_SEND_IMAGES;

    if (typeof this.sendImages === 'undefined') {
      this.sendImages = true;
    } else {
      this.sendImages = this.sendImages === 'true';
    }

    this.autoHear = process.env.FB_AUTOHEAR === 'true';

    this.apiURL = `https://graph.facebook.com/v${this.fbApiVersion}`;
    this.pageURL = `${this.apiURL}/${this.page_id}`;
    this.messageEndpoint = `${this.pageURL}/messages?access_token=${this.token}`;
    this.subscriptionEndpoint = `${this.pageURL}/subscribed_apps?access_token=${this.token}`;
    this.appAccessTokenEndpoint = `https://graph.facebook.com/oauth/access_token?client_id=${this.app_id}&client_secret=${this.app_secret}&grant_type=client_credentials`;
    this.setWebhookEndpoint = `${this.pageURL}/subscriptions`;

    this.msg_maxlength = 320;

    this.dataQueue = [];

    /*
     * Facebook clients
     */
    this.fb = {
      messageClient: new FacebookMessagingAPIClient(this.token)
    };

  }

  /**
   * Checks for required environment variables.
   *
   * @param  {[type]} if [description]
   * @return {[type]}    [description]
   */
  _checkRequiredVariables() {

    if (typeof this.token === 'undefined') {
      throw new Error('The environment variable "FB_PAGE_TOKEN" is required.');
    }

    if (typeof this.page_id === 'undefined') {
      throw new Error('The environment variable "FB_PAGE_ID" is required.');
    }

    if (typeof this.app_id === 'undefined') {
      throw new Error('The environment variable "FB_APP_ID" is required.');
    }

    if (typeof this.app_secret === 'undefined') {
      throw new Error('The environment variable "FB_APP_SECRET" is required.');
    }

    if (typeof process.env.FB_WEBHOOK_BASE === 'undefined') {
      throw new Error('The environment variable "FB_WEBHOOK_BASE" is required.');
    }
  }


  /**
   * Sends a message to the user.
   *
   * @param  {[type]} envelope [description]
   * @param  {[type]} strings  [description]
   * @return {[type]}          [description]
   */
  async send(envelope, ...strings) {

    // check the type of message
    if ((typeof envelope.fb !== 'undefined') && (envelope.fb.richMsg !== 'undefined')) {
      // send a rich media message
      await this._sendRich(envelope.user.id, envelope.fb.richMsg);
    } else {

      for (const msg of strings) {
        try {

          // send a text message
          await this._sendText(envelope.user.id, msg);

        } catch (e) {
          this.robot.logger.error(`Failed to send message [${e.message}]`);
        }
      }
    }
  }

  /**
   * Sends a text message to the API.
   *
   * @param  {[type]} user [description]
   * @param  {[type]} msg  [description]
   * @return {[type]}      [description]
   */
  async _sendText(user, msg) {

    // send images enabled?
    if (this.sendImages) {

      // get the MIME type
      const mime = Mime.getType(msg);

      if ((mime === 'image/jpeg') || (mime === 'image/png') || (mime === 'image/gif')) {

        // send an image message
        await this.fb.messageClient.sendImageMessage(user, msg);

      } else {
        // send a text message
        await this.fb.messageClient.sendTextMessage(user, msg);
      }
    } else {
      // send a text message
      await this.fb.messageClient.sendTextMessage(user, msg);
    }
  }


  /**
   * Sends a rich media message.
   *
   * @param  {[type]} user    [description]
   * @param  {[type]} richMsg [description]
   * @return {[type]}         [description]
   */
  async _sendRich(user, richMsg) {

    const data = {
      recipient: {
        id: user
      },
      message: richMsg
    };

    // send the data through the API
    await this._sendData(data);
  }

  /**
   * Sends all messages in the queue.
   *
   * @return {[type]} [description]
   */
  _sendData(data) {

    return new Promise(((resolve, reject) => {

      const self = this;

      // call the send message API
      this.robot.http(this.messageEndpoint)
        .query({
          access_token: self.token
        })
        .header('Content-Type', 'application/json')
        .post(JSON.stringify(data))((error, response, body) => {

          if (error) {
            reject(error);
          } else if (response.statusCode > 300) {
            reject(new Error(body));
          } else {
            resolve();
          }
        });
    }));
  }

  /**
   * Replies to the user.
   *
   * @param  {[type]} envelope [description]
   * @param  {[type]} strings  [description]
   * @return {[type]}          [description]
   */
  reply(envelope, ...strings) {

    // forward
    this.send(envelope, ...strings);
  }


  /**
   * Processes incoming messages.
   *
   * @param  {[type]} message [description]
   * @return {[type]}         [description]
   */
  async _receiveAPI(event) {

    const self = this;

    let user = this.robot.brain.data.users[event.sender.id];

    if (!user) {

      const userId = event.sender.id;
      const page = event.recipient.id;

      // get the user details from the Facebook API
      user = await this._getUser(userId, page);
    }

    // dispatch the event
    self._dispatch(event, user);
  }

  /**
   * Dispatches an event,
   *
   * @param  {[type]} event [description]
   * @param  {[type]} user  [description]
   * @return {[type]}       [description]
   */
  _dispatch(event, user) {

    const envelope = {
      event,
      user,
      room: event.recipient.id
    };

    if (typeof event.message !== 'undefined') {
      this._processMessage(event, envelope);
    } else if (typeof event.postback !== 'undefined') {
      this._processPostback(event, envelope);
    } else if (typeof event.delivery !== 'undefined') {
      this._processDelivery(event, envelope);
    } else if (typeof event.optin !== 'undefined') {
      this._processOptin(event, envelope);
    }

  }

  /**
   * Processes a message event.
   *
   * @param  {[type]} event    [description]
   * @param  {[type]} envelope [description]
   * @return {[type]}          [description]
   */
  _processMessage(event, envelope) {

    if (typeof event.message.attachments !== 'undefined') {

      /*
       * with attachments
       */
      envelope.attachments = event.message.attachments;
      this.robot.emit('fb_richMsg', envelope);

      for (const attachment of envelope.attachments) {
        this._processAttachment(event, envelope, attachment);
      }

    } else if (typeof event.message.text !== 'undefined') {

      /*
       * plain text
       */

      let text = event.message.text;

      if (this.autoHear) {
        text = this._autoHear(event.message.text, envelope.room);
      }

      // create a new text message instance
      const msg = new TextMessage(envelope.user, text, event.message.mid);

      // pass the message to the scripts
      this.receive(msg);

      this.robot.logger.debug(`Reply message to room/message: ${envelope.user.name}/${event.message.mid}`);
    }

  }

  /**
   * Autohear processor.
   *
   * @param  {[type]} text   [description]
   * @param  {[type]} chatId [description]
   * @return {[type]}        [description]
   */
  _autoHear(text, chatId) {

    // If it is a private chat, automatically
    // prepend the bot name if it does not exist already.
    if (chatId > 0) {
      // Strip out the stuff we don't need.
      text = text.replace(new RegExp(`^@?${this.robot.name.toLowerCase()}`, 'gi'), '');
      text = text.replace(new RegExp(`^@?${this.robot.alias.toLowerCase()}`, 'gi'), '');
      text = `${this.robot.name} ${text}`;
    }

    return text;
  }

  /**
   * Handles an attachment.
   *
   * @param  {[type]} event      [description]
   * @param  {[type]} envelope   [description]
   * @param  {[type]} attachment [description]
   * @return {[type]}            [description]
   */
  _processAttachment(event, envelope, attachment) {
    const uniqueEnvelope = {
      event,
      user: envelope.user,
      room: envelope.room,
      attachment
    };

    this.robot.emit(`fb_richMsg_${attachment.type}`, uniqueEnvelope);
  }

  /**
   * Handles a post back event.
   *
   * @param  {[type]} event    [description]
   * @param  {[type]} envelope [description]
   * @return {[type]}          [description]
   */
  _processPostback(event, envelope) {
    envelope.payload = event.postback.payload;
    this.robot.emit('fb_postback', envelope);
  }

  /**
   * Handles a message delivery event.
   *
   * @param  {[type]} event    [description]
   * @param  {[type]} envelope [description]
   * @return {[type]}          [description]
   */
  _processDelivery(event, envelope) {
    this.robot.emit('fb_delivery', envelope);
  }

  /**
   * Handles an opt-in event.
   *
   * @param  {[type]} event    [description]
   * @param  {[type]} envelope [description]
   * @return {[type]}          [description]
   */
  _processOptin(event, envelope) {
    envelope.ref = event.optin.ref;
    this.robot.emit('fb_optin', envelope);
    this.robot.emit('fb_authentication', envelope);
  }

  /**
   * Fetches a user's details.
   *
   * @param  {[type]} userId [description]
   * @param  {[type]} page   [description]
   * @return {[type]}        [description]
   */
  async _getUser(userId, page) {

    const self = this;

    const profile = await this.fb.messageClient.getUserProfile(userId, ['first_name', 'last_name', 'profile_pic']);

    profile.name = profile.first_name;
    profile.room = page;

    // create a new user instance
    const user = new User(userId, profile);

    // remember this user
    self.robot.brain.data.users[userId] = user;

    // return the user instance
    return user;
  }

  /**
   * Checks whether an incoming payload is
   * coming from a valid source.
   *
   * @param  {[type]} xHubSignature     [description]
   * @param  {[type]} applicationSecret [description]
   * @param  {[type]} body              [description]
   * @return {[type]}                   [description]
   */
  isMessageSourceValid(xHubSignature, applicationSecret, body) {

    if (!xHubSignature || Object.prototype.toString.call(xHubSignature) !== '[object String]') {
      this.robot.logger.error('Missing x-hub-signature header');
      return false;
    }

    if (typeof applicationSecret === 'undefined') {
      this.robot.logger.error('Missing FB application token');
      return false;
    }

    // split the header value at '=' char
    const xHubSignatureValueParts = xHubSignature.split('=');

    // the header should contain 2 parts
    if (xHubSignatureValueParts.length !== 2) {
      this.robot.logger.error('Invalid x-hub-signature value');
      return false;
    }

    // get the raw string payload
    const payload = JSON.stringify(body);

    // encode all 3 parts
    const authenticationCode = crypto.createHmac(xHubSignatureValueParts[0], applicationSecret).update(payload).digest('hex');

    // check if the calculated code matches the given one
    if (authenticationCode === xHubSignatureValueParts[1]) {
      return true;
    }

    return false;
  }

  /**
   * Starts the adapter.
   *
   * @return {[type]} [description]
   */
  run() {

    const self = this;

    this.robot.logger.info('Starting Faceboog Messenger adapter');

    /*
     * call FB API to subscribe the application
     * to the Facebook page
     */
    this.robot.http(this.subscriptionEndpoint)
      .query({
        access_token: self.token
      })
      .query({
        subscribed_fields: 'messaging_optins, messages, message_deliveries, messaging_postbacks'
      })
      .post()((error, response, body) => {

        // parse the response body
        const json = JSON.parse(body);

        if (typeof json.error !== 'undefined') {
          // an error occured - stop the app
          this.robot.logger.error(`Failed to subscribe app to page [${json.error.message}]`);
          process.exit(1);
        }

        // app has been subscribed to page
        this.robot.logger.info('Subcribed app to Facebook page');
      });

    /*
     * GET /hubot/fb
     *
     */
    this.robot.router.get(this.routeURL, (req, res) => {

      /*
       * token verification challenge
       */
      if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === self.vtoken) {
        res.send(req.query['hub.challenge']);
        self.robot.logger.info('Webhook endpoint has been verified');
      } else {
        res.send(400);
      }
    });

    /*
     * POST /hubot/fb
     */
    this.robot.router.post(this.routeURL, (req, res) => {

      // check if the message source is valid
      const isValid = self.isMessageSourceValid(req.headers['x-hub-signature'], this.app_secret, req.body);

      if (!isValid) {

        // return a forbidden status
        res.sendStatus(403);
      } else {

        // payload received
        const payload = req.body;

        // parse the payload into dstinct messages
        const messages = FacebookMessageParser.parsePayload(payload);

        // process each message
        for (const message of messages) {
          self._receiveAPI(message);
        }

        // acknowledged
        res.sendStatus(200);
      }

    });

    // request an access token
    this.robot.http(this.appAccessTokenEndpoint).get()((error, response, body) => {

      // parse and store the returned access token
      self.app_access_token = JSON.parse(body).access_token;

      // subscribe a webhook to the page
      self.robot.http(self.setWebhookEndpoint).query({
        object: 'page',
        callback_url: self.webhookURL,
        fields: 'messaging_optins, messages, message_deliveries, messaging_postbacks',
        verify_token: self.vtoken,
        access_token: self.app_access_token
      })
        .post()((error, response, body) => {

          // parse the payload
          const json = JSON.parse(body);

          if (typeof json.error !== 'undefined') {
            this.robot.logger.error(`Failed to set FB page webhook [${json.error.message}]`);
            process.exit(1);
          }

          // we're done
          self.robot.logger.info('Facebook page webhook has been set');
          self.robot.logger.info('Facebook adapter successfully initialized');

          // broadcast the 'connected' event
          this.emit('connected');
        });
    });
  }


}

// create and export a new instance of the adapter
exports.use = robot => new FacebookMessengerAdapter(robot);
