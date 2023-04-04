## PHP-HTML5-Videochat / Live Streaming - Standalone PHP


### Live Demos for PHP Live Streaming / HTML5 Videochat : Broadcast & Playback Live Video
[HTML5 Live Video Streaming using WowzaSE](https://demo.videowhisper.com/html5-videochat-php/)
[HTML5 Live Video Streaming using VideoWhisper WebRTC](https://demo.videowhisper.com/vws-html5-livestreaming/)

![PHP Live Streaming Webcam](/snapshots/h5a-playback.jpg)


Before installing, test the simple setup in the live demos above.

This edition showcases streaming from 1 broadcaster to multiple viewers and chat.
This plain php edition includes code and minimal scripts to embed a HTML5 Videochat app and test/showcase some features. This edition is for integrating/using application with own scripts/framework.
For a complete implementation of advanced capabilities, see [Turnkey HTML5 Videochat Site](https://paidvideochat.com/html5-videochat/) edition, available as WordPress plugin with full php source. The turnkey site edition implements pay per minute videochat (group and private 2 way video calls) with membership, billing, advanced tools.

### Simple PHP Edition Features: Live Streaming: Broadcast & Playback
 * [x] Automatically create a room as broadcaster on access and show link to invite participants that will access as viewers
 * [x] Embed app to broadcast and playback live video using HTML5 WebRTC
 * [x] Simple implementation of signaling broadcast (to connect automatically) and text chat, using plain files
 
###  Key Features for HTML5 Videochat / Live Streaming: Broadcast & Playback
 * [x] 1 way to many live video streaming, in public lobby
 * [x] WebRTC relayed streaming (reliable and scalable to many clients from Wowza SE streaming server, independent of broadcaster upload connection)
 * [x] select camera, microphone, resolution, bitrate
 * [x] screen sharing toggle, with microphone track mixed
 * [x] video/audio recorder, emoticons, mentions in text chat
 * [x] fullscreen for videochat interface or playback video
 * [x] adaptive target video bitrate (depending on cam resolution) and configuration in resolution change
 * [x] broadcasting/playback stats (open controls and stats should show in few seconds)
 * [x] dark mode / lights on: each user can toggle interface mode live at runtime, SFX (sound effects)
 * [x] translation and text change support
 * [ ] request private 2 way calls / shows from group chat
 * [ ] random videochat with Next button to move to different performer room
 * [ ] live wallet balance display (updates from tips and other transfers)
 * [ ] tips with multiple customizable options, gift images
 
Warning: some of these features are not active/implemented in this simplified edition, but can be enabled as in turnkey site edition.

## Installation Instructions
Before installing, make sure your hosting environment meets all [requirements](https://videowhisper.com/?p=Requirements) including the Wowza SE as HTML5 WebRTC streaming relay and/or the [VideoWhisper WebRTC signaling server](https://github.com/videowhisper/videowhisper-webrtc/). Production implementations should also involve Session Control for security and website integration (like list of live channels).
  
 1. If you don't use a [turnkey webrtc relay streaming host](https://webrtchost.com/hosting-plans/), configure WebRTC and SSL with Wowza SE or the VideoWhisper WebRTC server.
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

### VideoWhisper HTML5 Project Demos
 * [Video Call PHP / HTML5 Videochat on Wowza SE](https://demo.videowhisper.com/videocall-html5-videochat-php/)
 * [Video Call PHP / HTML5 Videochat on VideoWhisper WebRTC](https://demo.videowhisper.com/p2p-html5-videocall/)
 * [Live Streaming PHP / HTML5 Videochat on Wowza SE](https://demo.videowhisper.com/html5-videochat-php/)
 * [Live Streaming PHP / HTML5 Videochat on VideoWhisper WebRTC](https://demo.videowhisper.com/vws-html5-livestreaming/)
 * [Cam/Mic Recorder HTML5 - Standalone](https://demo.videowhisper.com/cam-recorder-html5-video-audio/)
 * [PaidVideochat Turnkey Site](https://paidvideochat.com/demo/)

 ### VideoWhisper HTML5 Project Downloads
 * [Video Call - HTML5 Videochat - GitHub](https://github.com/videowhisper/VideoCall-HTML5-Videochat-PHP)
 * [Live Streaming - HTML5 Videochat - GitHub](https://github.com/videowhisper/HTML5-Videochat-PHP)
 * [Cam/Mic Recorder HTML5 - GitHub](https://github.com/videowhisper/Cam-Recorder-HTML5-Video-Audio)
 * [PaidVideochat Turnkey Site - WordPress](https://wordpress.org/plugins/ppv-live-webcams/)
 * [VideoWhisper WebRTC](https://github.com/videowhisper/videowhisper-webrtc/)

For a free consultation [Consult VideoWhisper](https://consult.videowhisper.com) or [Submit Ticket](https://videowhisper.com/tickets_submit.php) related to commercial services like turnkey platforms, compatible hosting, custom development services.

