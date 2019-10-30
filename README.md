# PHP-HTML5-Videochat

[PHP HTML5 Videochat](https://videowhisper.com/demos/html5-videochat/)

![PHP Live Streaming Webcam](/snapshots/h5a-2w-c.png)


Before installing, test the simple setup in the live demo:
[PHP HTML5 Videochat - Live Demo](https://videowhisper.com/demos/html5-videochat/)

This plain php edition includes code and minimal scripts tp embed a HTML5 Videochat app and test/showcase some features. This edition is for integrating/using application with own scripts/framework.
This edition showcases streaming from 1 broadcaster to multiple viewers and chat.
For a complete implementation of advanced capabilities, see [Turnkey HTML5 Videochat Site](https://paidvideochat.com/html5-videochat/) edition, available as WordPress plugin with full php source. The turnkey site edition implements pay per minute videochat (group and private 2 way video calls) with membership, billing, advanced tools.

## Simple PHP Edition Features
 * Automatically create a room as broadcaster on access and show link to invite participants that will access as viewers
 * Broadcast and playback live video using HTML5 WebRTC
 * Simple implementation of signaling broadcast (to connect automatically) and text chat, using plain files
 

##  Key Features for HTML5 Videochat 
Warning: some of these features are not active/implemented in this simplified edition, but can be enabled as in turnkey site edition.
 * 1 way to many live video streaming, in public lobby
 * 2 way videochat, in private (1 to 1) shows with request/approve interaction
 * live wallet balance display (updates from tips and other transfers)
 * tips with multiple customizable options, gift images
 * WebRTC relayed streaming (reliable and scalable to many clients from streaming server, independent of broadcaster upload connection)
 * group / private  paid videochat, pay per minute
 * random videochat with Next button to move to different performer room
 * fullscreen for videochat interface or playback video
 * collaboration mode with file sharing
 * adaptive target video bitrate (depending on cam resolution) and configuration in resolution change
 * broadcasting/playback stats (open controls and stats should show in few seconds)
 * dark mode / lights on: each user can toggle interface mode live at runtime
 * translation support

## Installation Instructions
 * Before installing, make sure your hosting environment meets all [requirements](https://videowhisper.com/?p=Requirements) including for a HTML5 WebRTC streaming relay. Production implementations should also involve Session Control. 
  
 1. If you don't use a [turnkey webrtc relay streaming hosting](https://webrtchost.com/hosting-plans/), configure WebRTC and SSL with Wowza SE.
 2. Deploy files to your web installation location. (Example: yoursite.domain/html5-videochat/)
 3. Fill your streaming settings in settings.php file
 4. If you don't have SuPHP, enable write permissions (0777) for folder "uploads", required to save session and chat info.

## Plain PHP Edition Limitations
 * The plain php edition refers to minimal scripts for configuring and accessing videochat room, so developers can integrate with own scripts. 
 * Plain php edition does not involve database and systems to manage members, rooms, billing. These depend on framework you want to integrate, plugins, database, member system. 
 * Applications reads parameters, wallet balance and other data with ajax calls from framework/integration scripts (that need to be implemented depending on framework, database, user scripts).
 * A complete implementation of features is available for WordPress framework. See [Turnkey HTML5 Videochat Site](https://paidvideochat.com/html5-videochat/) edition, available as WordPress plugin with full php source. Includes user role management (performers/clients), pay per minute, integrates billing wallets.
 * Plain edition implements 1 way streaming and chat with broadcast / playback screens for broadcaster and other participants. Application supports but this edition does not implement signaling for requesting 2 way video calls or parameters and content for conference/collaborations.

## Main Integration Scripts
 * index.php embeds the html5 application: accessed directly creates a room and shows room link to invite others
 * app-call.php is called by application to retrieve parameters, interact with web server, update status and chat (ajax calls)
 * app-functions.php functions implementing features for app-call.php , including translated texts, app settings
 * settings.php settings and options, including streaming settings and url for calls (when integrating with own framework)

Scripts also contain comments for clarifications/suggestions. 

This is a simple setup showcasing easy app deployment and integration with other PHP scripts. 
For a quick setup, see [VideoWhisper Turnkey Stream Hosting Plans](https://webrtchost.com/hosting-plans/) that include requirements for all features and free installation.

For assistance and clarifications, [Contact VideoWhisper Support](https://videowhisper.com/tickets_submit.php).


For a more advanced setup, see this turnkey site solution based on WP: 
[HTML5 Paid Videochat Site Software](https://paidvideochat.com/html5-videochat/) 

