# hubot-fb



A [Hubot](https://hubot.github.com) adapter for the [Facebook Messenger Platform](https://messengerplatform.fb.com/).
This adapter fully supports everything the v2.6 Messenger platform API is capable of:
- Token validation and botside autosetup
- Resolving user profiles (name and profile pictures from ids)
- Send and receive text messages
- Send templates and images (jpgs; pngs; animated gifs)
- Receive images, location, and other attachments
- Template postbacks


## Installation
[See detailed installation instructions here.](/INSTALL.md)
- For setting up a Hubot instance, [see here](https://hubot.github.com/docs/)
- Create a [Facebook page](https://www.facebook.com/pages/create/) and [App](https://developers.facebook.com/quickstarts/?platform=web) (you can skip Quick Start after you create an App ID and enter your email), or use existing ones.
- Install hubot-fb into your Hubot instance using by running ```npm install -save hubot-fb``` in your Hubot's root.
- [Configure](#configuration) hubot-fb. Setting up webhooks and subscribing to pages will be done automatically by hubot-fb.
- Set hubot-fb as your adapter by launching with ```bin/hubot -a fb```. (Edit your Procfile to do the same on Heroku.)
