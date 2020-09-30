<?php

//Required Streaming Settings in $options : wsURLWebRTC, applicationWebRTC
//See https://videowhisper.com/?p=Requirements or get a turnkey streaming plan from https://webrtchost.com/hosting-plans/ 

$options = array(
	'wsURLWebRTC' => 'wss://-server-id-.streamlock.net:1937/webrtc-session.json', // * Required
	'applicationWebRTC' => '-application-name-', // * Required

	'webrtcVideoCodec' =>'VP8',
	'webrtcAudioCodec' =>'opus',

	'webrtcVideoBitrate' => 750, // demo mode limited to 750kbps, 480p
	'webrtcAudioBitrate' => 64,

	'appSetup' => unserialize('a:3:{s:6:"Config";a:12:{s:8:"darkMode";s:0:"";s:7:"tabMenu";s:4:"icon";s:19:"cameraAutoBroadcast";s:1:"1";s:22:"cameraAutoBroadcastAll";s:1:"1";s:14:"cameraControls";s:1:"1";s:13:"videoAutoPlay";s:0:"";s:16:"resolutionHeight";s:3:"480";s:7:"bitrate";s:3:"750";s:19:"maxResolutionHeight";s:4:"1080";s:10:"maxBitrate";s:4:"3500";s:12:"timeInterval";s:4:"5000";s:15:"recorderMaxTime";s:3:"300";}s:4:"Room";a:15:{s:16:"requests_disable";s:0:"";s:12:"room_private";s:0:"";s:10:"room_audio";s:0:"";s:9:"room_text";s:0:"";s:15:"room_conference";s:0:"";s:15:"conference_auto";s:1:"1";s:10:"room_slots";s:1:"4";s:19:"vw_presentationMode";s:0:"";s:10:"calls_only";s:0:"";s:14:"group_disabled";s:0:"";s:5:"party";s:0:"";s:14:"party_reserved";s:1:"0";s:13:"stream_record";s:0:"";s:21:"stream_record_private";s:0:"";s:17:"stream_record_all";s:0:"";}s:4:"User";a:5:{s:7:"h5v_sfx";s:0:"";s:8:"h5v_dark";s:0:"";s:9:"h5v_audio";s:0:"";s:10:"h5v_reveal";s:0:"";s:17:"h5v_reveal_warmup";s:2:"30";}}'),

	'collaboration' => 0,
	'webKey' => 'VideoWhisper',

	'videochatNext' =>1,

	'tips' => 1,
	'tipOptions' => '<tips>
<tip amount="1" label="1$ Tip" note="Like!" sound="coins1.mp3" image="gift1.png" color="#33FF33"/>
<tip amount="2" label="2$ Tip" note="Big Like!" sound="coins2.mp3" image="gift2.png" color="#33FF33"/>
<tip amount="5" label="5$ Gift" note="Great!" sound="coins2.mp3" image="gift3.png" color="#33FF33"/>
<tip amount="10" label="10$ Gift" note="Excellent!" sound="register.mp3" image="gift4.png" color="#33FF33"/>
<tip amount="20" label="20$ Gift" note="Ultimate!" sound="register.mp3" image="gift5.png"  color="#33FF33"/>
<tip amount="custom" label="Custom Tip!" note="Custom Tip" sound="coins1.mp3" image="gift1.png" color="#33FF33"/>
</tips>'
);

//installation url & integration calls
const VW_H5V_URL = ''; //leave blank if loading from same folder, ex: https://yoursite.com/html5-videochat/
const VW_H5V_CALL = VW_H5V_URL . 'app-call.php?v=1';

//development & debugging
define('VW_DEVMODE', 1);
define('VW_DEVMODE_COLLABORATION', 0);
define('VW_DEVMODE_CLIENT', 0);

if (VW_DEVMODE)
{
	ini_set('display_errors', 1);
	error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT);
}