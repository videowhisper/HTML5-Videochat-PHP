<?php
//app functions needed by app calls, depend on integration

//For more advanced implementations see WordPress plugin and its php source code:
//https://wordpress.org/plugins/ppv-live-webcams/
//https://plugins.svn.wordpress.org/ppv-live-webcams/trunk/inc/h5videochat.php 


//demo setup saves variables in plain files in uploads folder: integration should use framework database

		function varSave($path, $var)
		{
			if (!file_exists('uploads')) mkdir('uploads');
			file_put_contents('uploads/' . $path, serialize($var));
		}

		function varLoad($path)
		{
			if (!file_exists('uploads/' . $path)) return false;

			return unserialize(file_get_contents('uploads/' . $path));
		}
		
		function arrayLoad($path)
		{
			$res = varLoad($path);
			
			if (is_array($res)) return $res;
			else return array();
		}
		
// app parameter functions

	function __(  $text,  $domain = 'default' )
	{
		return 	$text;
	}
	
	function appText()
	{
		//implement translations

		//returns texts
		return array(
			'Send' => __('Send', 'ppv-live-webcams'),
			'Type your message' => __('Type your message', 'ppv-live-webcams'),

			'Chat' => __('Chat', 'ppv-live-webcams'),
			'Camera' => __('Camera', 'ppv-live-webcams'),
			'Users' => __('Users', 'ppv-live-webcams'),
			'Options' => __('Options', 'ppv-live-webcams'),
			'Files' => __('Files', 'ppv-live-webcams'),
			'Presentation' => __('Presentation', 'ppv-live-webcams'),

			'Tap for Sound' => __('Tap for Sound', 'ppv-live-webcams'),
			'Enable Audio' => __('Enable Audio', 'ppv-live-webcams'),
			'Mute' => __('Mute', 'ppv-live-webcams'),
			'Reload' => __('Reload', 'ppv-live-webcams'),

			'Broadcast' => __('Broadcast', 'ppv-live-webcams'),
			'Stop Broadcast' => __('Stop Broadcast', 'ppv-live-webcams'),
			'Make a selection to start!' => __('Make a selection to start!', 'ppv-live-webcams'),

			'Lights On' => __('Lights On', 'ppv-live-webcams'),
			'Dark Mode' => __('Dark Mode', 'ppv-live-webcams'),
			'Enter Fullscreen' => __('Enter Fullscreen', 'ppv-live-webcams'),
			'Exit Fullscreen' => __('Exit Fullscreen', 'ppv-live-webcams'),

			'Site Menu' => __('Site Menu', 'ppv-live-webcams'),

			'Request Private' => __('Request Private', 'ppv-live-webcams'),
			'Request Private 2 Way Videochat Show' => __('Request Private 2 Way Videochat Show', 'ppv-live-webcams'),
			'Performer Disabled Private Requests' => __('Performer Disabled Private Requests', 'ppv-live-webcams'),
			'Performer is Busy in Private' => __('Performer is Busy in Private', 'ppv-live-webcams'),
			'Performer is Not Online' => __('Performer is Not Online', 'ppv-live-webcams'),
			'Nevermind' => __('Nevermind', 'ppv-live-webcams'),
			'Accept' => __('Accept', 'ppv-live-webcams'),
			'Decline' => __('Decline', 'ppv-live-webcams'),
			'Close Private' => __('Close Private', 'ppv-live-webcams'),

			'Next' => __('Next', 'ppv-live-webcams'),
			'Next: Random Videochat Room' => __('Next: Random Videochat Room', 'ppv-live-webcams'),

			'Name' => __('Name', 'ppv-live-webcams'),
			'Size' => __('Size', 'ppv-live-webcams'),
			'Age' => __('Age', 'ppv-live-webcams'),
			'Upload: Drag and drop files here, or click to select files' =>  __('Upload: Drag and drop files here, or click to select files', 'ppv-live-webcams'),
			'Uploading. Please wait...' =>  __('Uploading. Please wait...', 'ppv-live-webcams'),
			'Open' => __('Open', 'ppv-live-webcams'),
			'Delete' => __('Delete', 'ppv-live-webcams'),

			'Media Displayed' => __('Media Displayed', 'ppv-live-webcams'),
			'Remove' => __('Remove', 'ppv-live-webcams'),
			'Default' => __('Default', 'ppv-live-webcams'),
			'Empty' => __('Empty', 'ppv-live-webcams'),

			'Profile' => __('Profile', 'ppv-live-webcams'),
			'Show' => __('Show', 'ppv-live-webcams'),
		);
	}


function appRoomUsers($roomID, $options)
	{
		
		$sessions = arrayLoad($roomID . '_sessions');
		
		foreach ($sessions as $key => $session)
			{
				if (!is_array($userMeta = unserialize($session['meta']))) $userMeta = array();

				$item = [];
				$item['userID'] = intval($session['uid']);
				$item['userName'] = $session['username'];
				if (!$item['userName']) $item['userName'] = '#' . $session['uid'];
				
				$item['sdate'] = intval($session['sdate']);
				$item['meta'] = $userMeta;
				$item['updated'] = intval($session['edate']);
				$item['avatar'] =  VW_H5V_URL .'images/avatar.png';
				$item['url'] = 'https://videowhisper.com/tickets_submit.php';

				$items[intval($session['uid'])] = $item;
			}
			
			return $items;
	}

	
 function appTipOptions($options)
	{

		$tipOptions = stripslashes($options['tipOptions']);
		if ($tipOptions)
		{
			$p = xml_parser_create();
			xml_parse_into_struct($p, trim($tipOptions), $vals, $index);
			$error = xml_get_error_code($p);
			xml_parser_free($p);

			if (is_array($vals)) return $vals;
		}

		return array();

	}


function appStream($userID, $roomID, $options)
{
	$key = $options['webKey'] . $roomID; //a secret key to implement stream verification

	return 'stream' . $userID . '?channel_id=' . $roomID . '&userID=' . urlencode($userID) . '&key=' . urlencode($key) . '&ip=' . urlencode($_SERVER['REMOTE_ADDR']) . '&transcoding=0&room=Room' . $roomID. '&privateUID=0';

}

function appPublicRoom($roomID, $userID, $options, $welcome ='')
{
	//public room parameters, specific for this user
	//depends on integration

	$room = array();

	$room['ID'] = $roomID;
	$room['name'] = 'Room' . $roomID;

	$room['performer'] = 'Performer' . (10000+$roomID);
	$room['performerID'] = (10000+$roomID);

	$collaboration = $options['collaboration'];
	if (VW_DEVMODE && VW_DEVMODE_COLLABORATION) $collaboration = true;

	$isPerformer = ($userID == (10000+$roomID));

	//screen
	if ($isPerformer) $roomScreen = 'BroadcastScreen';
	else $roomScreen = 'PlaybackScreen';
	if ($collaboration) $roomScreen = 'CollaborationScreen';
	$room['screen'] = $roomScreen;

	$room['streamBroadcast'] = appStream($userID, $roomID, $options);

	$room['streamUID'] = intval($room['performerID']);
	$room['streamPlayback'] = appStream($room['performerID'], $roomID, $options);

	$room['actionPrivate'] = !$isPerformer;
	$room['actionPrivateClose'] = false;
	$room['privateUID'] = 0;

	$room['actionID'] = 0;

	$room['welcome'] = sprintf('Welcome to public room "%s", user #%s!', $room['name'] , $userID);
	$room['welcomeImage'] = VW_H5V_URL . 'images/chat.png';



	if ($isPerformer) //member: performer
		{
		$room['welcome'] .= "\n". 'You are room owner / performer.';
	}
	else //member: client
		{
		$room['welcome'] .= "\n".'You are invited participant.';
		}

	
	if ($options['videochatNext']) if (!$isPerformer) $room['next'] = true;

			if ($welcome) $room['welcome'] .= "\n" . $welcome;

			//configure tipping options for clients
			$room['tips'] = false;
		if ($options['tips'])
			if (!$session->broadcaster)
			{
				$tipOptions = appTipOptions($options);
				if (count($tipOptions))
				{
					$room['tipOptions'] = $tipOptions;
					$room['tips'] = true;
					$room['tipsURL'] = VW_H5V_URL . 'tips/';
				}
			}

		//offline snapshot (poster) and video 
		$room['snapshot'] = VW_H5V_URL . 'images/no-picture.png';
		$room['videoOffline'] = VW_H5V_URL . 'videos/hamsterad.mp4';;		

		return $room;
}

