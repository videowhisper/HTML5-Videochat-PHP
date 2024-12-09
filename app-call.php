<?php
//app-call.php : called by app to communicate with web server (login, config, status, interactions)
//This is sample code for demostrating some features. Not designed for production.
//Integrate with own platform login and database system.
//For a functional turnkey integration see PaidVideochat.com turnkey site solution and plugin source code https://plugins.svn.wordpress.org/ppv-live-webcams/trunk/inc/h5videochat.php .

include_once 'settings.php';

include_once 'app-functions.php';

//session info received trough VideoWhisper POST var
if ($VideoWhisper = $_POST['VideoWhisper'] )
{
	$userID = intval($VideoWhisper['userID']);
	$sessionID = intval($VideoWhisper['sessionID']);
	$roomID = intval($VideoWhisper['roomID']);
	$sessionKey = intval($VideoWhisper['sessionKey']);

	$privateUID = intval($VideoWhisper['privateUID'] ?? 0);
	$roomActionID = intval($VideoWhisper['roomActionID'] ?? 0);
}

$response['VideoWhisper'] = 'https://videowhisper.com';


$task = $_POST['task'];


if ($task != 'login')
{
	//verify user login, session validty
}

if ($task == 'login')
{

	//user session parameters and info, updates
	$response['user'] = [
	'ID'=> intval($userID),
	'name'=> (($userID>10000)?'Performer':'User') . $userID,
	'sessionID'=> intval($sessionID),
	'loggedIn' => true,
	'balance' => 100,
	'avatar' => VW_H5V_URL .'images/avatar.png',
	];


	//on login check if any private request was active to restore
	//return private room/session if active, depending on integration
	$response['room'] = appPublicRoom($roomID, $userID, $options, 'Login success!');

	//config params, const
	$response['config'] = [
	'serverType' => $options['serverType'],
	'vwsSocket' => $options['vwsSocket'],
	'vwsToken' => $options['vwsToken'],

	'wss' => $options['wsURLWebRTC'],
	'application' => $options['applicationWebRTC'],

	'videoCodec' =>  $options['webrtcVideoCodec'],
	'videoBitrate' =>  $options['webrtcVideoBitrate'],
	'audioBitrate' =>  $options['webrtcAudioBitrate'],
	'audioCodec' =>  $options['webrtcAudioCodec'],

	'snapshotInterval' => 180,
	'snapshotDisable' => true,

//	'autoBroadcast' => false,
	'actionFullscreen' => true,
	'actionFullpage' => false,

	'serverURL' =>  VW_H5V_CALL,
	'modeVersion' => '',

	];

	$response['config']['text'] = appText(); //translations
	$response['config']['sfx'] = appSfx();

	$response['config']['exitURL'] = VW_H5V_URL . 'info.php?i=exit';
	$response['config']['balanceURL'] =  VW_H5V_URL . 'info.php?i=wallet' ;

	//pass app setup config parameters
	if (is_array($options['appSetup']))
		if (array_key_exists('Config', $options['appSetup']))
			if (is_array($options['appSetup']['Config']))
				foreach ($options['appSetup']['Config'] as $key => $value)
					$response['config'][$key] = $value;


				if (VW_DEVMODE)
				{
				//	$response['config']['cameraAutoBroadcast'] = '0';
				//	$response['config']['videoAutoPlay '] = '0';

				}

			//if (!$isPerformer) $response['config']['cameraAutoBroadcast'] = '0';

	$response['config']['loaded'] = true;

}
//end: task==login


//room
$roomName = 'Room' . $roomID;
$userName = (($userID>10000)?'Performer':'User') . $userID;
$ztime = time();

//create/update session in room session list

$sessions = arrayLoad($roomID . '_sessions');
if (array_key_exists($sessionID, $sessions)) $session = $sessions[$sessionID];
else $session = array(
		'id' => $sessionID,
		'uid' => $userID,
		'sdate' => time(),
		'madeBy' => 'access',
	);

$session['edate'] = time();

$sessions[$sessionID] = $session;

varSave($roomID . '_sessions', $sessions);


//update private session if in private mode

$needUpdate = array();

//process app task (other than login)
switch ($task)
{
case 'snapshot':
	break;

case 'login':
	break;

case 'tick':
	break;

case 'options':
	break;

case 'update':
	//something changed - let everybody know : update room
	$update = filter_var($_POST['update'], FILTER_SANITIZE_STRING);


	$room = arrayLoad($roomID . '_room');
	$room['updated_' . $update] = time();

	varSave($roomID . '_room', $room);
	$needUpdate[$update] = 1;
	break;

case 'media':
	//notify user media (streaming) updates

	$connected = ($_POST['connected'] == 'true'?true:false);

	if ($session['meta'])
		if (!is_array($userMeta = unserialize($session['meta']))) $userMeta = array();

		$userMeta['connected'] = $connected;
	$userMeta['connectedUpdate'] = time();

	$userMetaS = serialize($userMeta);

	$sessions = arrayLoad($roomID . '_sessions');
	if (!array_key_exists($sessionID, $sessions)) $sessions[$sessionID] = array('id' =>$sessionID, 'sdate' => time(),
			'madeBy'=>'media');
	$sessions[$sessionID]['meta'] = $userMetaS;

	varSave($roomID . '_sessions', $sessions);
	break;


case 'message':

	$message = $_POST['message']; //array

	if ($message)
	{
		$response['message'] = $message;
	}

	$messageText = filter_var( $message['text'], FILTER_SANITIZE_STRING);
	$messageUser = filter_var( $message['userName'], FILTER_SANITIZE_STRING);
	$messageUserAvatar = filter_var( $message['userAvatar'], FILTER_SANITIZE_URL);

	$meta = array(
		'notification'=>  filter_var($message['notification'],FILTER_SANITIZE_STRING),
		'userAvatar' => $messageUserAvatar,
		'mentionMessage' => intval($message['mentionMessage']),
		'mentionUser'=> filter_var($message['mentionUser'],FILTER_SANITIZE_STRING),
	);
	$metaS = serialize($meta);

	if (!$privateUID)  $privateUID = 0; //public room

	$messages = arrayLoad($roomID . '_messages');
	$ix = count($messages)+1;


	$messageNew = array(
		'id' => $ix,
		'username' => $messageUser,
		'room' => $roomName,
		'room_id' => $roomID,
		'message' => $messageText,
		'mdate' => $ztime,
		'type' => 2,
		'user_id' => $userID,
		'meta' => $metaS,
		'private_uid' => $privateUID
	);


	$messages[$ix] = $messageNew;
	$response['messageNew'] = $messageNew;

	varSave($roomID . '_messages', $messages);

	break;


case 'recorder_upload':


	if (!$roomName) appFail('No room for recording.');
	if (strstr($filename, ".php")) appFail('Bad uploader!');


	$mode = $_POST['mode'];   // video/audio
	$scenario = $_POST['scenario'];  // chat/standalone

	if (!$privateUID)  $privateUID = 0; //public room

	//generate same private room folder for both users
	if ($privateUID)
	{
		if ($isPerformer) $proom = $userID . "_" . $privateUID; //performer id first
		else $proom = $privateUID ."_". $userID;
	}

	$destination = 'uploads';
	if (!file_exists($destination)) mkdir($destination);

	$destination.="/$roomName";
	if (!file_exists($destination)) mkdir($destination);

	if ($proom)
	{
		$destination.="/$proom";
		if (!file_exists($destination)) mkdir($destination);
	}

	$response['_FILES'] = $_FILES;


	$allowed = array('mp3', 'ogg', 'opus', 'mp4', 'webm', 'mkv');

	$uploads = 0;
	$filename = '';

	if ($_FILES) if (is_array($_FILES))
			foreach ($_FILES as $ix => $file)
			{

				$filename = filter_var( $file['name'], FILTER_SANITIZE_STRING);

				$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
				$response['uploadRecLastExt'] = $ext;
				$response['uploadRecLastF'] = $filename;

				$filepath = $destination . '/' . $filename;

				if (in_array($ext, $allowed))
					if (file_exists($file['tmp_name']))
					{
						move_uploaded_file($file['tmp_name'], $filepath);
						$response['uploadRecLast'] = $destination . $filename;
						$uploads++;
					}
			}

		$response['uploadCount'] = $uploads;


	if (!file_exists($filepath))
	{
		$response['warning'] = 'Recording upload failed!';
	}



	if ( !$response['warning'] && $scenario == 'chat' )
	{
		$url = path2url($filepath);

		$response['recordingUploadSize'] = filesize($filepath);
		$response['recordingUploadURL'] = $url;

		$messageText = '';
		$messageUser = $userName;
		$userAvatar = VW_H5V_URL .'images/avatar.png';
		$messageUserAvatar = $userAvatar;

		$meta = array(
			'userAvatar' => $messageUserAvatar,
		);

		if ($mode == 'video') $meta['video']= $url;
		else $meta['audio']= $url;

		$metaS = serialize($meta);


		$messages = arrayLoad($roomID . '_messages');
		$ix = count($messages)+1;

		$messageNew = array(
			'id' => $ix,
			'username' => $messageUser,
			'room' => $roomName,
			'room_id' => $roomID,
			'message' => $messageText,
			'mdate' => $ztime,
			'type' => 2,
			'user_id' => $userID,
			'meta' => $metaS,
			'private_uid' => $privateUID
		);
		$messages[$ix] = $messageNew;

		varSave($roomID . '_messages', $messages);

		$response['messageNew'] = $messageNew;

		//also update chat log file
		/*
		if ($roomName)
		{
			$messageText = strip_tags($messageText, '<p><a><img><font><b><i><u>');
			$messageText = date("F j, Y, g:i a", $ztime) . " <b>$userName</b>: $messageText <video controls src='$url'></video>";
			$day=date("y-M-j", time());
			$dfile = fopen($destination . "/Log$day.html", "a");
			fputs($dfile, $messageText."<BR>");
			fclose($dfile);
		}
		*/
	}
	break;

default:
	$response['warning'] = 'Not implemented in this integration: ' . $task;

}


//update time
$lastMessage = intval($_POST['lastMessage'] ?? 0);
$lastMessageID = intval($_POST['lastMessageID'] ?? 0);

//retrieve only messages since user came online / updated
$sdate = 0;
if ($session) $sdate = $session['sdate'];
$startTime = max($sdate, $lastMessage);

$response['startTime'] = $startTime;


//!messages

$messages = arrayLoad($roomID . '_messages');

//clean old chat logs
$closeTime = time() - 900; //only keep for 15min
foreach ($messages as $key => $message) if ($message['mdate'] < $closeTime) unset($messages[$key]);
	varSave($roomID . '_messages', $messages);



//sort by key (time)
ksort($messages);


$items = array();
$idMax = 0;


foreach ($messages as $key => $message)
{
	$show = 1;

	//chat message or own notification (type 3)
	if ($message['type'] > 3) $show = 0;
	if ($message['type'] == 3 && ($message['user_id'] != $userID && $message['username'] != $userName) ) $show = 0;


	if (!$privateUID) if ($message['private_uid'] != 0) $show = 0; //private messages only in private

		if ($privateUID)
		{
			if ($message['private_uid'] != $privateUID)  $show = 0; //not in this private
			if ($message['user_id'] != $userID && $message['user_id'] != $privateUID) $show = 0; //not for user or other
		}


	//enable this to show only messages after entering $startTime:
	//if ($message['mdate'] < $startTime || $message['mdate'] > $ztime) $show = 0;

	if ($message['id'] <= $lastMessageID) $show = 0;

	$idMax = 0;
	if ($show)
	{
		$item = [];

		$item['ID'] = intval($message['id']);
		if ($item['ID']>$idMax) $idMax = $item['ID'];

		$item['userName'] = $message['username'];
		$item['userID'] = intval($message['user_id']);

		$item['text'] = $message['message'];
		$item['time'] = intval($message['mdate'] * 1000); //time in ms for js

		$item['userAvatar'] = VW_H5V_URL .'images/avatar.png';

		//meta
		if ($message['meta'])
		{
			$meta = unserialize($message['meta']);
			foreach ($meta as $key=>$value) $item[$key] = $value;

			$item['notification'] =  (isset($meta['notification']) && $meta['notification'] == 'true' ? true : false );
		}

		if ($message['type'] == 3) $item['notification'] = true;

		$items[] = $item;
	}

}


$response['messages'] = $items; //messages list

$response['timestamp'] = $ztime; //update time
///update message

$response['lastMessageID'] = $idMax;

$response['roomUpdate']['users'] = appRoomUsers($roomID, $options);


//send response to app
echo json_encode($response);
