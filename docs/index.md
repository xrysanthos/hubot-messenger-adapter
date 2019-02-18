---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
title: Hubot Messenger adapter
---

{% include base.html %}

<div class="container">

    <section class="header">

      <h2 class="title">{{site.title}}</h2>

      <h4>A Hubot adapter for the Facebook Messenger platform</h4>

      <a class="button button-primary" href="#introduction">Get started</a>
      <a class="button" href="{{ site.github }}" target="_blank"><i class="fab fa-github"></i> Github Project</a>

      <div class="value-props row">
        <div class="four columns value-prop">
          <img class="value-img" src="https://hubot.github.com/assets/images/layout/hubot-avatar.png">
          Built on top of the <a href="https://hubot.github.com/" target="_blank">Hubot</a> chatbot framework.
        </div>
        <div class="four columns value-prop">
        <span style="font-size: 72px; color: Dodgerblue; display: block;" >
          <i class="fab fa-facebook-messenger"></i>
        </span>
          Integrates your bot with the Facebook Messenger platform.
        </div>
        <div class="four columns value-prop">
          <span style="font-size: 72px; display: block;" >
            <i class="fab fa-js-square"></i>
          </span>
          Written in pure Node JavaScript.
        </div>
      </div>

  </section>


</div>


<div class="container">



<div class="docs-section"  markdown="1">

# Table of contents

* [Introduction](#introduction)
* [Installation](#installation)
* [Configuration](#configuration)

</div>



<div class="docs-section"  markdown="1">

## Introduction

A [Hubot](https://hubot.github.com) adapter for the [Facebook Messenger Platform](https://messengerplatform.fb.com/).
This project is a port of the [hubot-fb](https://github.com/chen-ye/hubot-fb){: target="_blank"}
adapter originally developed by **Chen Ye** in CoffeeScript and converted into pure Node JavaScript.

The adapter is compatible with the **v3.2** Messenger platform API including:

- Token validation and automatic webhook setup
- Resolution of user profiles (name and profile pictures from ids)
- Sending and receiving text messages
- Sending templates and images (jpgs; pngs; animated gifs)
- Receiving images, location, and other attachments
- Template postbacks

<a class="button" href="https://github.com/chen-ye/hubot-fb" target="_blank"><i class="fab fa-github"></i> Original Project</a>

</div>



<div class="docs-section"  markdown="1">

## Installation instructions {#installation}

### Setup Hubot and install hubot-messenger-adapter
- For setting up a Hubot instance, [see here](https://hubot.github.com/docs/)
- Install the adapter into your Hubot instance using by running `npm install -save hubot-messenger-adapter` in your Hubot's root.

### Setup Facebook Page + App, and configure hubot-messenger-adapter
Now we'll create the Facebook Page your bot will send and receive as, and the Facebook App that will be used to manage it from Facebook's end.

#### Create a Facebook Page [here](https://www.facebook.com/pages/create/)

Set your `FB_PAGE_ID` from `https://www.facebook.com/<YOUR PAGE USERNAME>/info?tab=page_info`.

#### Create a Facebook App [here](https://developers.facebook.com/quickstarts/?platform=web).

- After you create an app ID and enter you email, press
  *Skip Quick Start*
- Go to your app dashboard, and set your `FB_APP_ID` and `FB_APP_SECRET` from there
- Click "Messenger" on the App Dashboard sidebar
- Under "Token Generation", select a page, and copy the page access token that is generated
- Set your `FB_PAGE_TOKEN` environment variable as the page access token you copied. This will allow your bot to send as your page.
- Pick an alphanumeric string and set it as your `FB_VERIFY_TOKEN`.

### Launch hubot-fb
- Launch your hubot instance using hubot-fb by running `bin/hubot -a messenger-adapter`
- You're now set up to send and receive messages to your hubot instance from Facebook Messenger.


</div>


<div class="docs-section"  markdown="1">

## Configuration {#configuration}

Required variables are in **bold**.

| config variable           | type    | default   | description                                                                                                                                                                                                                               |
|---------------------------|---------|-----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **`FB_PAGE_ID`**   | string  | -         | Your Facebook Page ID. You can find it at `https://www.facebook.com/<YOUR PAGE USERNAME>/info?tab=page_info`.                                           |
| **`FB_APP_ID`, `FB_APP_SECRET`**   | string  | -         | Your App ID and App Secret. You can find them at `https://developers.facebook.com/apps/`.                                           |
| **`FB_WEBHOOK_BASE`**        | string  | - | The base url for a Facebook webhook subscription. This will be joined with `FB_ROUTE_URL`, e.g. `FB_WEBHOOK_BASE=https://mybot.com` and `FB_ROUTE_URL=/hubot/fb` will be passed to Facebook as `https://mybot.com/hubot/fb`. Note that the URL must use `https`.                                                                                                                                                                                        |
| `FB_ROUTE_URL`        | string  | `/hubot/fb` | The webhook route path hubot-fb monitors for new message events.                                                                                                                                                                                         |
| **`FB_PAGE_TOKEN`**   | string  | -         | Your [page access token](https://developers.facebook.com/docs/messenger-platform/implementation#page_access_token). You can get one at `https://developers.facebook.com/apps/<YOUR APP ID>/messenger/`.                                           |
| `FB_VERIFY_TOKEN` | string  | -         | Your [verification token](https://developers.facebook.com/docs/graph-api/webhooks#setup). This is the string your app expects when you modify a webhook subscription at `https://developers.facebook.com/apps/<YOUR APP ID>/webhooks/`. One will be automatically set for you if you do not specify a token. |
| `FB_AUTOHEAR`        | boolean  | `false` | Prepend a `@<robot.name>` to all dirrect messages to your robot, so that it'll respond to a direct message even if not explicitly invoked. E.g., for a robot named "hubot", both "ping" and "@hubot ping" will be passed as "@hubot ping" |
| `FB_SEND_IMAGES`      | boolean | `true`      | Whether or not hubot-fb should automatically convert compatible urls into image attachments                                                                                                                                               |


</div>

<div class="docs-section"  markdown="1">

## Usage {#usage}

### Sending Rich Messages (templates, images)
_Note: If you just want to send images, you can also send a standard image url in your message text with `FB_SEND_IMAGES` set to `true`._
To send rich messages, include in your envelope
```
envelope =
{
    fb: {
        richMsg: [RICH_MESSAGE]
    },
    user[...]
}
```

In a response, this would look something like:

```
robot.hear /getting chilly/i, (res) ->
    res.envelope.fb = {
      richMsg: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: "Do you wanna build a snowman?",
            buttons: [
              {
                type: "web_url",
                url: "http://www.dailymotion.com/video/x1fa7w8_frozen-do-you-wanna-build-the-snowman-1080p-official-hd-music-video_music",
                title: "Yes"
              },
              {
                type: "web_url",
                title: "No",
                url: "http://wallpaper.ultradownloads.com.br/275633_Papel-de-Parede-Meme-Okay-Face_1600x1200.jpg"
              }
            ]
          }
        }
      }
    }
    res.send()
```


See Facebook's API reference [here](https://developers.facebook.com/docs/messenger-platform/send-api-reference#guidelines) for further examples of rich messages.

### Events
Events allow you react to input that Hubot doesn't natively support. This adapter emits `fb_postback`, `fb_delivery`, `fb_richMsg`, and `fb_richMsg_[ATTACHMENT_TYPE]` events.

Register a listener using `robot.on [EVENT_NAME] [CALLBACK]`.

| event name                     | description                                                                                                                                                                |
|--------------------------------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `fb_postback`                  | Emitted when a postback is triggered.                                                                                                                                      |
| `fb_delivery`                  | Emitted when a delivery confirmation is sent.                                                                                                                              |
| `fb_richMsg`                   | Emitted when a message with an attachment is sent. Contains all attachments within that message.                                                                           |
| `fb_richMsg_[ATTACHMENT.TYPE]` | Emitted when a message with an attachment is sent. Contains a single attachment of type [ATTACHMENT.TYPE], and multiple are emitted in messages with multiple attachments. |
| `fb_optin` or `fb_authentication` | Emitted when an [authentication event](https://developers.facebook.com/docs/messenger-platform/plugin-reference#send_to_messenger) is triggered

#### `fb_postback` example

Responding to an event is a bit more manual—here's an example.  

```
# You need this to manually compose a Response
{Response} = require 'hubot'

module.exports = (robot) ->

  # This can exist alongside your other hooks
  robot.on "fb_postback", (envelope) ->
    res = new Response robot, envelope, undefined
    if envelope.payload is "send_ok_face"
      res.send "http://wallpaper.ultradownloads.com.br/275633_Papel-de-Parede-Meme-Okay-Face_1600x1200.jpg"
```

Of course, postbacks can do anything in your application—not just trigger responses.  


</div>


</div>
