<?php
//app-call.php : called by app to communicate with web server (login, config, status, interactions)

include_once('settings.php');

include_once('app-functions.php');

//session info received trough VideoWhisper POST var
if ($VideoWhisper = $_POST['VideoWhisper'])
{
	$userID = intval($VideoWhisper['userID']);
	$sessionID = intval($VideoWhisper['sessionID']);
	$roomID = intval($VideoWhisper['roomID']);
	$sessionKey = intval($VideoWhisper['sessionKey']);

	$privateUID = intval($VideoWhisper['privateUID']);
	$roomActionID = intval($VideoWhisper['roomActionID']);
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
	'wss' => $options['wsURLWebRTC'],
	'application' => $options['applicationWebRTC'],

	'videoCodec' =>  $options['webrtcVideoCodec'],
	'videoBitrate' =>  $options['webrtcVideoBitrate'],
	'audioBitrate' =>  $options['webrtcAudioBitrate'],
	'audioCodec' =>  $options['webrtcAudioCodec'],
	'autoBroadcast' => false,
	'actionFullscreen' => true,
	'actionFullpage' => false,

	'serverURL' =>  VW_H5V_CALL,

	];

	$response['config']['text'] = appText(); //translations

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
					$response['config']['cameraAutoBroadcast'] = '0';
					$response['config']['videoAutoPlay '] = '0';

				}

			if (!$isPerformer) $response['config']['cameraAutoBroadcast'] = '0';

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
			if (!array_key_exists($sessionID, $sessions)) $sessions[$sessionID]	= array('id' =>$sessionID, 'sdate' => time(),
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

			$messageText = filter_var ( $message['text'], FILTER_SANITIZE_STRING);
			$messageUser = filter_var ( $message['userName'], FILTER_SANITIZE_STRING);
			$messageUserAvatar = filter_var ( $message['userAvatar'], FILTER_SANITIZE_URL);

			$meta = array( 'notification'=>$message['notification'], 'userAvatar' => $messageUserAvatar);
			$metaS = serialize($meta);

			if (!$privateUID)  $privateUID = 0; //public room

			$messages = arrayLoad($roomID . '_messages');
			
			$message = array(
				
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

			$messages[$ztime . '-'. $userID] = $message;

			varSave($roomID . '_messages', $messages);
			break;	
		}

		//update time
		$lastMessage = intval($_POST['lastMessage']);

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
		
		//<= startTime to also skip message that was just submitted
		if ($message['mdate'] <= $startTime || $message['mdate'] > $ztime) $show = 0;	

			if ($show)
			{
				$item = [];

				$item['ID'] = intval($message['id']);

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

					$item['notification'] =  ($meta['notification'] == 'true'?true:false);
				}

				if ($message['type'] == 3) $item['notification'] = true;

				$items[] = $item;
			}
	
	}
	

		$response['messages'] = $items; //messages list

		$response['timestamp'] = $ztime; //update time
		///update message

		$response['roomUpdate']['users'] = appRoomUsers($roomID, $options);


//send response to app
echo json_encode($response);
