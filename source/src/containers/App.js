import React from 'react';
//import ReactDOM from 'react-dom';

import { connect } from 'react-redux';
import { setUser, setRoom, updateRoom, setConfig, addMessage, addHistory, setActions, setHistory } from '../actions/App';

import { Button, Icon, Modal, Header, Label } from 'semantic-ui-react';

//https://medium.com/@fomantic/setting-up-fomantic-ui-with-react-f701b68f736c
//https://fomantic-ui.com/modules/dropdown.html#inverted 
import '../assets/fomantic/dist/semantic.css';

//Screens
import LoginScreen from './LoginScreen';

import BroadcastScreen from './BroadcastScreen';
import BroadcastAudioScreen from './BroadcastAudioScreen';

import PlaybackScreen from './PlaybackScreen';
import PlaybackAudioScreen from './PlaybackAudioScreen';

import Way2Screen from './Way2Screen';
import Way2AudioScreen from './Way2AudioScreen';

import CollaborationScreen from './CollaborationScreen';
import CollaborationPiPScreen from './CollaborationPiPScreen';

import TextScreen from './TextScreen';

import CollaborationTextScreen from './CollaborationTextScreen';

import LobbyScreen from './LobbyScreen';

import RecorderScreen from './RecorderScreen';


//import Counter from '../counter';
import PropTypes from 'prop-types';

import axios from 'axios';
import qs from "qs"; //post to php w/o file_get_contents('php://input');
import { resolveInstanceConfig } from '../embed';

// Global styles
import '../styles/Layouts.css';
import '../styles/Controls.css';
import '../styles/Interface.css';

class App extends React.Component {

    version = '2026.11.10';

    //set false before build
    devMode = false;
    versionMode = false;
  
  //devServer = 'https://demo.paidvideochat.com/wp-admin/admin-ajax.php?action=vmls_app';
  //devServer2 = 'https://demo.paidvideochat.com/wp-content/plugins/ppv-live-webcams/server/';

    devServer = 'https://videolivesupport.com/wp-admin/admin-ajax.php?action=vmls_app';
    devServer2 = 'https://videolivesupport.com/wp-content/plugins/ppv-live-webcams/server/';

    devModeTimer = true;
    //devModeRequest = 1; //1:ppvcamdemo

   //https://demo.paidvideochat.com/wp-admin/admin-ajax.php?action=vmls_app
   //https://demo.paidvideochat.com/wp-admin/admin-ajax.php?action=vw_2w_app&match=1

   //devScreen = 'CollaborationPiPScreen'; // CollaborationScreen / RecorderScreen / BroadcastScreen / PlaybackScreen / BroadcastAudioScreen / CollaborationScreen  / Way2AudioScreen / Way2Screen / TextScreen / CollaborationTextScreen

    static propTypes = {
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,

        messages: PropTypes.array.isRequired,
        actions: PropTypes.array.isRequired,

        lastMessageTimestamp: PropTypes.number.isRequired,

        setUser: PropTypes.func.isRequired,

        setRoom: PropTypes.func.isRequired,
        updateRoom: PropTypes.func.isRequired,

        addHistory: PropTypes.func.isRequired,
        addMessage: PropTypes.func.isRequired,
        setHistory: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.componentScreen = React.createRef();
        this.timeLocal = 0;

        this.lastServerUpdate = 0;
        this.lastRoomUpdate = 0;
        this.lastMessageID = 0;

        this.componentMounted = false;

        this.timeInterval= 5000;
        this.serverUpdating =  false;
        this.serverTask = 'init';

        //vars that usually involve rendering or component updates when changed

        this.checkedSources = 0;


        this.state = {

            version: this.version,
            username: 'unavailable',

            streamName: '', //local HLS playback
            streamAddress: '',

            langugage: 'en-us',
            flag: 'us',
        
            chatMentionMessage: 0,
            chatMentionUser: '',

            muted: true,
            optionsLoaded: false,

            wsOpen: false,
            wsComponent: 'none',

            chatNew: false,

            cameraStatus: 'off',
            userCount: 0,

            screen: 'LoginScreen',
            screenTime: 0,

            requestAID: 0,
            requestUID: 0,
            requestUsername: 'User',

            parametersRetrieved: false,
            whitelabel: false,
            checkWait: false,

            devMode: this.devMode,

            media: { Main: {} },  //media to show in different placements

            minMode: false,
            pipMode: false,
            recMode: false,
            darkMode: false,
            sfx: false,
            sfxError: false,
            audioMode: false, //user audio only publishing
            isMobile: typeof window !== 'undefined' ? window.innerWidth <= 800 : false, //mobile screen detection

            revealMode: false,
            revealWarmup: 30,
            revealed: false,

            publishRequired: false,

            className: '',
            backgroundColor: '#EEEEEE',

            error: '',
            errorTask: '',
            warning: '',
            timerOn: false,

            // time: 0,

            serverURL: '', //?
            serverURL2: '',

            mode: null, //lic mode
            checked: false, //lic chk
            tooltip: 'Demo Mode: This setup is in demo mode. Contact if you need assistance with configuration.',
            tooltipURL: 'https://consult.videowhisper.com',
            tooltipImage: 'https://videowhisper.com/media/logo64.png',

            roomLoading: true,
        };

        this.retrieveParameters(); //window.VideoWhisper

        this.timerTimeStart = Date.now();

        this.sessionTime = 0;
        this.sessionUpdate = this.timerTimeStart;

        this.appStateUpdate = this.appStateUpdate.bind(this); //update state from child components
        this.appSfx = this.appSfx.bind(this); //sfx from child components

        this.tipsRecent = [];

        if (this.devMode) console.log('VideoWhisper/containers/App constructor', props, this.state);

    }

    txt = (text) => {
        //handle text translations from config
        const { props } = this;
        if (!props.config) return text;
        if (!props.config.text) return text;
  
        if (text in props.config.text) return props.config.text[text];
        return text;
    }

    getVideoWhisper = () => resolveInstanceConfig(this.props.config)

    appStateUpdate(newState) {
        if (this.devMode) console.log('VideoWhisper/containers/App appStateUpdate', newState, this.state);
        this.setState(newState, () =>
        {
           if (newState.streamName != undefined) this.updateMedia(); 
        });

    }

    appSfx(sound_name, sound_source=null, force = false)
    {

        if (!this.state.sfx && !force) return;
        if (!this.props.config.loaded && !force) return;
        if (!this.state.optionsLoaded && !force) return;

        var sound_src = '';
        if (sound_source == null)
        {
        if (!this.props.config) return; //not ready
        if (!this.props.config.sfx) return; //no sfx defined
        if (!this.props.config.sfx[sound_name]) { console.log('VideoWhisper/containers/App appSfx not found:', sound_name, this.props.config.sfx, this.props.config); return;}
        sound_src = this.props.config.sfx[sound_name];
        } else sound_src = sound_source;

        if (this.devMode) console.log('VideoWhisper/containers/App appSfx', sound_name, sound_src, this.state, this.props.config);

                 const soundPlayer = document.createElement('audio');

				 soundPlayer.setAttribute("src", sound_src);
				
				 soundPlayer.addEventListener("canplay", () =>
				 {
				  var promise = soundPlayer.play();	
				  
				  if (promise !== undefined) 
				  {
				    promise.catch( (error) => {
					   console.log('VideoWhisper/containers/App appSfx ERROR', error, sound_src, this.state, this.props.config);					  
                       
                       if (soundPlayer.parentNode) try {
                       soundPlayer.parentNode.removeChild(soundPlayer); //remove after play
                       } catch (error) {
                        console.log('VideoWhisper/containers/App appSfx error soundPlayer removeChild', error);					  
                        }

                       this.setState({sfx: false, sfxError:true});					   
				    }).then(() => {
                        this.setState({sfxError:false});	
                        if (this.state.muted) this.state.muted = false;
				        // Auto-play started
				    });
				 }

                 });
                 
                 soundPlayer.addEventListener('ended', function() 
                 {
                    if (soundPlayer.parentNode) try {
                        soundPlayer.parentNode.removeChild(soundPlayer); //remove after play
                        } catch (error) {
                         console.log('VideoWhisper/containers/App soundPlayer ended removeChild', error);					  
                         }
 
                 }, false);	
    }

    //Timer to update server
    timerStart() {
        if (this.devMode) if (!this.devModeTimer) return; //no timer in test mode?

        const {props} = this;
        if (props.config) if (props.config.timeInterval) if (Number(props.config.timeInterval) >= 2000)  this.timeInterval = Number(props.config.timeInterval);

        this.timer = setInterval(this.timerTick.bind(this), this.timeInterval); //timer to call webserver for web update (tick)
        this.timerLocal = setInterval(this.timerTickLocal.bind(this), 1000); //local timer display seconds

        this.setState({ timerOn: true });
    }

    timerErrorStart()
    {
        const {props} = this;
        this.timerError = setInterval(this.timerTickError.bind(this), 1000); //countdown timer
        this.state.reloadTime = 15;
    }

    timerStop() {
        clearInterval(this.timer);
        clearInterval(this.timerLocal);

        this.setState({ timerOn: false });
    }

    timerTick() {

        if (!this.serverUpdating) if (Date.now() - this.lastServerUpdate > 1500) this.serverUpdate({ task: 'tick' }); //skip tick if already updating or just updated
        let timePassed = Date.now() - this.timerTimeStart;

        this.state.time = timePassed;
        this.timeLocal = timePassed;
        // this.setState({time: timePassed, timeLocal: timePassed}); //render
    }

    timerTickLocal() {

        const {state} = this;

        // this.setState({timeLocal: Date.now() - this.timerTimeStart});
        this.timeLocal = Date.now() - this.timerTimeStart;

        this.displayTime = this.sessionTime + Date.now()  - this.sessionUpdate;

        if (this.componentScreen.current) if (this.componentScreen.current.componentActions)
            if (typeof this.componentScreen.current.componentActions.current.updateTime !== "undefined" )
            this.componentScreen.current.componentActions.current.updateTime(this.displayTime);
            else if (this.componentScreen.current.componentActions.current.componentActions)
            if (typeof this.componentScreen.current.componentActions.current.componentActions.current.updateTime !== "undefined" )
            this.componentScreen.current.componentActions.current.componentActions.current.updateTime(this.displayTime);


        this.state.screenTime++;

        //if (state.screen === 'Way2Screen') if (state.revealMode && !state.revealed) ;
    }

    errorRetry = () =>{
        if (this.devMode) console.log('VideoWhisper/containers/App errorRetry', this.state);

        clearInterval(this.timerError);

        this.setState( { error: '', errorMore: '', errorURL: '', errorType: '', errorTask: '' } );
        this.serverUpdate( { task: (this.state.errorTask ? this.state.errorTask : 'retry_task_missing' ) }); 

        this.timerStart();
    }

    timerTickError()
    {
        if (this.state.reloadTime > 0) this.setState({ reloadTime: this.state.reloadTime -1 });
        else
        {
            clearInterval(this.timerError);

            if (this.state.errorTask) 
            { 
              this.errorRetry();
            }
            else window.location.reload(false);
        }
    }

    //Axios AJAX
    axiosConfig = {
        headers: {
            'Accept': 'application/json',
            // 'Content-Type': 'multipart/form-data; charset=UTF-8',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', // 
        }
    }

    //app mode

    checkMode = (server) => {
        const { state } = this;
        const self = this;

        if (this.devMode) console.log('VideoWhisper/containers/App checkMode:', server);

        axios.post('https://' + server + '.com/l.php?j=1&pn=HTML5+Videochat&ps=Web&pu=' + escape(window.location.href) + '&u=' + escape(window.location.href) + '&pv=' + this.version, qs.stringify(null), this.axiosConfig)
            .then(function (response) {
                self.modeProcess(response);
            })
            .catch(this.modeError.bind(this));
    }

    modeProcess(response) {
        const { state } = this;

        this.setState({ 'mode': response.data, 'checked': true }, () => {
            this.checkedSources++;
        });

        if (this.devMode) console.log('VideoWhisper/containers/App modeProcess:', response, this.state);

        var whitelabelMatch= true; 
        if (this.state.whitelabel) if (this.state.whitelabel != response.data.whitelabel) whitelabelMatch = false;

       // if (state.modeVersion == state.version) whitelabelMatch = true; //self activation

        if (response.data.text) this.state.tooltip = response.data.text;
        if (response.data.link) this.state.tooltipURL = response.data.link;
        if (response.data.image) this.state.tooltipImage = response.data.image;

        if (this.state.checkWait) //server after mode, on process
        if (whitelabelMatch) 
        {
            const VideoWhisper = this.getVideoWhisper();
            this.serverUpdate({
                task: 'login',
                'VideoWhisper': VideoWhisper,
            });
        } else console.log('VideoWhisper/containers/App modeProcess: checkWait but not Whitelabel', this.state.whitelabel, response.data.whitelabel);

        if (response.data.status == 2) //suspended
        {
            this.setState({ 'error': 'Mode Error: ' + this.state.mode.message, errorMore: 'Contact Support', errorURL: 'https://consult.videowhisper.com' });
        }
    }

    modeError(error) {
        this.checkedSources++;

        console.log('VideoWhisper/containers/App checkMode modeError:', error);
        if (this.state.checked) return; //checked from different source

        //3 errors        
        if (this.checkedSources>2) this.setState({ 'error': 'Mode check error!', errorMore: 'Contact Support', errorURL: 'https://consult.videowhisper.com' });
    }

    //web server

    serverProcess(response) {
        const { state } = this;
        this.serverUpdating = false; //received data, updating completed
        this.serverTask = 'serverProcess';

        //process web server data

        //  console.log('containers/App serverProcess', response);
        const data = response.data;

        if (this.devMode) if (data.task !== 'tick') console.log('containers/App serverProcess', response);

        if (!data.VideoWhisper) {
            console.log('VideoWhisper/containers/App serverProcess Error: no data.VideoWhisper from web server', response);
            return;
        }

        if (data.error) {
            //error stops timer
            console.log('VideoWhisper/containers/App serverProcess Error: data.error', data.error);
            this.timerStop();
            this.timerErrorStart();
            var eTask = '';
            if (data.errorTask) eTask = data.errorTask;
            this.setState({ error: data.error, errorType: 'data', errorTask: eTask });
        }

        if (data.warning) {
            if (this.devMode) console.log('VideoWhisper/containers/App serverProcess Warning', data.warning);
            this.setState({ warning: data.warning });

            if (data['task'] === 'next') this.setState({ roomLoading: false });
        }

        //update state username
        if (data.user) if (data.user.name) if (state.username != data.user.name ) this.setState({ username: data.user.name });

        if (data.user) {
            //updates user login status, balance
            if (!data.user.loggedIn) {
                data.user.failed = true;
                data.user.warning = 'Login failed!';
            }
            else if (data.config) //only on login: get config, start timer
            {

                this.props.setConfig(data.config);
                this.timerStart();

                if (data.config.darkMode) this.setState({ darkMode: true });
                if (data.config.pipMode) this.setState({ pipMode: true });
                if (data.config.minMode) this.setState({ minMode: true });
                if (data.config.sfx) if (!this.state.sfxError) this.setState({ sfx: true });

                if (data.config.devMode) 
                {
                    this.devMode = true;
                    this.setState({ devMode: true });
                    if (this.devMode) console.log('VideoWhisper/containers/App serverProcess devMode enabled by server config');
                }

                if (data.config.modeVersion)
                {
                   if (!state.modeVersion) 
                   {
                    this.setState({ modeVersion: data.config.modeVersion });
                   }
                }

                //enable external JS to send notifications
                const VideoWhisper = this.getVideoWhisper();
                if (VideoWhisper) 
                {
                    VideoWhisper.chatNotification = this.chatNotification;
                    VideoWhisper.chatServer = this.chatServer;
                }
            }

            //update if options changed
            if (data.user.options)
            {
                if (typeof data.user.options.h5v_dark !== "undefined") if (state.darkMode != data.user.options.h5v_dark ) this.setState({ darkMode: data.user.options.h5v_dark });                
                if (typeof data.user.options.h5v_pip !== "undefined") if (state.pipMode != data.user.options.h5v_pip ) this.setState({ pipMode: data.user.options.h5v_pip }); 
                if (typeof data.user.options.h5v_min !== "undefined") if (state.minMode != data.user.options.h5v_min ) this.setState({ minMode: data.user.options.h5v_min }); 

                if (typeof data.user.options.h5v_language !== "undefined") if (state.language != data.user.options.h5v_language ) this.setState({ language: data.user.options.h5v_language }); 
                if (typeof data.user.options.h5v_flag !== "undefined") if (state.flag != data.user.options.h5v_flag ) this.setState({ flag: data.user.options.h5v_flag }); 

                if (typeof data.user.options.h5v_sfx !== "undefined") 
                if (this.state.sfx != data.user.options.h5v_sfx ) 
                if (! this.state.sfxError || this.state.sfx ) 
                {
                    this.setState({ sfx: data.user.options.h5v_sfx }); 
                }             

                if (typeof data.user.options.h5v_audio !== "undefined") if (state.audioMode != data.user.options.h5v_audio ) this.setState({ audioMode: data.user.options.h5v_audio });         
               
                if (typeof data.user.options.h5v_reveal !== "undefined") if (state.revealMode != data.user.options.h5v_reveal ) this.setState({ revealMode: data.user.options.h5v_reveal });         
                if (typeof data.user.options.h5v_reveal_warmup !== "undefined") if (state.revealWarmup != data.user.options.h5v_reveal_warmup ) this.setState({ revealWarmup: data.user.options.h5v_reveal_warmup});       

                if (!this.state.optionsLoaded) this.setState({optionsLoaded: true}); //from server

                if (this.devMode) console.log('VideoWhisper/containers/App serverProcess data.user.options', data.user.options, this.state.sfx, this.state);

            }

            //process recent tips
            if (data.user.tipsRecent)
            for (var key in data.user.tipsRecent)
            {
                const tip = data.user.tipsRecent[key];

                if  (this.tipsRecent.indexOf(key) >= 0) break; //already processed 

                this.tipsRecent.push(key);

                //externall JS call
                 const VideoWhisper = this.getVideoWhisper();
                 if (VideoWhisper) if (typeof VideoWhisper.performerTip != "undefined" ) VideoWhisper.performerTip(tip.amount, tip.client);
                     else if (this.devMode) console.log('containers/App performerTip missing', VideoWhisper);
  
            this.serverUpdate({
                task: 'tipProcessed',
                'key': key,
            });

            }

            this.props.setUser(data.user);
        }

        if (data.user) if (data.user.time)
        {
            this.sessionTime = data.user.time * 1000;
            this.sessionUpdate = Date.now();
        }


        if (data.room) {
            //room changes and cotains mode, layout, streams

            if (data.room.options) if (data.room.options.stream_record_all !== undefined) this.setState({ recMode: data.room.options.stream_record_all });

            this.updateUsers(data.room.users);

            if (data.room.actionID) this.state.requestAID = data.room.actionID;

            this.props.setRoom(data.room);
            this.setState({ roomLoading: false });

            if (this.devMode) console.log('VideoWhisper/containers/App serverProcess data.room props.room', data.room, this.props.room);

            var buffer = [];

            var img = '';
          //  if (state.version != state.modeVersion) //activate modeVersion
            if (!state.checked || (state.checked && state.mode.text )) {
                var tooltip = state.tooltip;
                if (state.mode) if (state.mode.text) tooltip = state.mode.text;
                img = '';
                if (state.mode) if (state.mode.image) img = state.mode.image;

                buffer.push({
                    userID: -1,
                    userName: 'VideoWhisper.com',
                    notification: true,
                    text: tooltip,
                    image: img,
                    modeText: true,
                    time: new Date().valueOf() - 1,
                    ID: 1000000000001,
                });

            }
            img = '';
            if (this.props.room.welcomeImage) img = this.props.room.welcomeImage;

            buffer.push({
                userID: -1,
                userName: this.props.room.name,
                notification: true,
                text: this.props.room.welcome,
                progressValue: this.props.room.welcomeProgressValue,
                progressTotal: this.props.room.welcomeProgressTotal,
                progressDetails: this.props.room.welcomeProgressDetails,
                image: img,
                time: new Date().valueOf(),
                ID: 1000000000002,
            })

            this.props.setHistory(buffer, 0);

            this.updateMedia();
        }

        if (data.roomUpdate) {
            this.updateUsers(data.roomUpdate.users);

            this.props.updateRoom(data.roomUpdate);
            if (data.roomUpdate.media || data.roomUpdate.name || data.roomUpdate.ID) this.updateMedia(); //media or different room
            this.lastRoomUpdate = data.roomUpdate.updated;

            if (data.roomUpdate.actionID) this.state.requestAID = data.roomUpdate.actionID;

            if (data.roomUpdate.options) if (data.roomUpdate.options.stream_record_all !== undefined )  this.setState({ recMode: data.roomUpdate.options.stream_record_all });
        }

        if (data.room || data.roomUpdate) this.updateExternal(); //update own external broadcast status

        //timestamp is updated anytime there is new content
        if (data.messages) if (data.messages.length > 0) {
            //add messages
            this.props.addHistory(data.messages, data.timestamp);
        }

        //lastMessageID updated when returning recent messages, prevents duplicates (multiple messages can have same timestamp)
        
        if (typeof data.lastMessageID!== "undefined")
        if (data.lastMessageID > this.lastMessageID) //new message
        {
            this.appSfx('message');
            this.setState({'chatNew':true});
            if (this.devMode) console.log('VideoWhisper/containers/App serverProcess new message', data.lastMessageID , this.lastMessageID  );
        }

        if (typeof data.lastMessageID!== "undefined") if (data.lastMessageID > this.lastMessageID) this.lastMessageID = data.lastMessageID;

        if (data.actions) if (data.actions.length > 0) {
            //request updates (own and from others)
            this.props.setActions(data.actions, data.timestamp);
        }

        this.lastServerUpdate = Date.now();
        //serverProcess end
    }

    updateUsers(newUsers)
    {
    
     if (newUsers == null) return;

     const {props} = this;

      var userCount = 0;
      var user;
      for (var userID in newUsers)
      if (!newUsers[userID].hide) userCount++;
  
      this.setState({ 'userCount': userCount }); 
 //     if (this.devMode) console.log('VideoWhisper/containers/App updateExternal userCount', userCount, props.room.users);
  


        // for 1 if not in 2         if (props.appState.sfx) props.appState('hello');  // for 2 if not in 1 //leave
        var nextUser;
        var thisUser;

        //update joined/left

        this.usersJoined = [];
        if (newUsers) for (var nextUserID in newUsers)
        {
          nextUser = newUsers[nextUserID];
  
          var found = false;       
          if (props.room.users) for (var thisUserID in props.room.users)
          {
            thisUser = props.room.users[thisUserID];
            if (nextUser.userName == thisUser.userName && nextUser.userID == thisUser.userID) found = true;
          }
  
          if (!found) {
              this.usersJoined.push(nextUser);
             // if (this.devMode) console.log('VideoWhisper/containers/App updateExternal usersJoined', nextUser, props.room.users);
          }
        };

        this.usersLeft = [];
        if (props.room.users) for (var thisUserID in props.room.users)
        {
          thisUser = props.room.users[thisUserID];
  
          var found = false;       
          if (newUsers) for (var nextUserID in newUsers)
          {
            nextUser = newUsers[nextUserID];
            if (nextUser.userName == thisUser.userName && nextUser.userID == thisUser.userID) found = true;
          }
  
          if (!found) this.usersLeft.push(nextUser);
        };

        //notify
        if (userCount>1) //other user in addition to this one
        if (this.usersJoined) 
        if (this.usersJoined.length>0)
        {
             if (this.devMode) console.log('VideoWhisper/containers/App updateExternal usersJoined', this.usersJoined, props.room.users);
          this.appSfx('hello');
          this.usersJoined = [];

          
        }
    
        if (this.usersLeft) 
        if (this.usersLeft.length>0)
        {
          this.appSfx('leave');
          this.usersLeft = [];
        }
    }


    updateExternal()
    {
	//detect if external broadcast

    const { props } = this;
    
//external broadcast
	var externalOn = false;

	if (props.room.users && props.user.ID) 
	{ 
	

	//user list available
	var playbackUser; //detect user being played in this video            
	playbackUser = props.room.users[props.user.ID];

	if (playbackUser) if (playbackUser.meta) {
		if (playbackUser.meta.external)
		{
			externalOn = true;
			if (playbackUser.meta.connected) if (playbackUser.meta.connectedUpdate > playbackUser.meta.externalUpdate) //more recent web publish
			{
                externalOn = false; 
			}
		}
    }   
    }

    if (externalOn != this.state.external)  
    {
    if (this.devMode) console.log('VideoWhisper/containers/App updateExternal', externalOn);
     this.setState({ external: externalOn }); //notify about update

     //this.serverUpdate({ task: 'external', external: externalOn, userID: props.user.ID, userName: props.user.name});
    }
}
    
    updateMedia = () => {
        //updates media to display depending on room setup and app state (setup of  user)

        const { props } = this;
        var { state } = this;

        if (props.room.media) state.media = props.room.media; //overwrite (full moderation for now)

        //set room streamUID as default
        if (!state.media.Main) state.media.Main = {};

        //locally removed
        if (!state.streamAddress && state.media.Main.local ) state.media.Main.type = 'empty';

        if (props.room.streamAddress && !state.streamAddress && !state.streamName) // (unless locally set)
        if (!state.media.Main.type || state.media.Main.type === 'empty') {
            state.media.Main.type = 'hls';
            state.media.Main.userID = props.room.streamUID;
            state.media.Main.url = props.room.streamAddress;
            state.media.Main.name = props.room.streamName;
            state.media.Main.default = true;
        }

        if (state.streamAddress) //local view change override: stream
        {
            state.media.Main.type = 'hls';
            state.media.Main.userID = props.room.streamUID;
            state.media.Main.url = state.streamAddress;
            state.media.Main.name = state.streamName;
            state.media.Main.default = true;
            state.media.Main.local = true;
        }

        if (state.streamName && !state.streamAddress) //local view change override: cam
        {
            state.media.Main.type = 'user';
            state.media.Main.userID = props.room.streamUID;
            state.media.Main.stream = props.room.streamPlayback;
            state.media.Main.name = props.room.performer;
            state.media.Main.default = true;
            state.media.Main.local = true;
        }

        if (props.room.streamUID) //default: room stream
        if (!state.media.Main.type || state.media.Main.type === 'empty') {
            state.media.Main.type = 'user';
            state.media.Main.userID = props.room.streamUID;
            state.media.Main.stream = props.room.streamPlayback;
            state.media.Main.name = props.room.performer;
            state.media.Main.default = true;
        }

        this.setState({ media: state.media }); //notify about update
        if (this.devMode) console.log('VideoWhisper/containers/App updateMedia', props.room.media, state.media, state.streamName);
    }

    retrieveParameters = () => {
        const { state, devMode } = this;

        const configName = this.props.config.configName || 'VideoWhisper';
        var VideoWhisper = this.getVideoWhisper();

        if (!VideoWhisper && !devMode) {

            this.state.error = 'Missing embed parameters: window.' + configName + '! devMode?';
            this.state.errorMore = 'Contact Support';
            this.state.errorURL = 'https://consult.videowhisper.com';

            return;
        }

        if (devMode) if (!VideoWhisper) {
            VideoWhisper = { serverURL: this.devServer, serverURL2: this.devServer2};

            if (this.devModeRequest) VideoWhisper.requestUID = this.devModeRequest; 
           // VideoWhisper.whitelabel = 1;      
        }
        
        var serverURL='';
        var serverURL2='';
        var checkWait=false;
        var whitelabel=false;
        var modeVersion = '';

        if (VideoWhisper) {
            serverURL = VideoWhisper.serverURL;
            serverURL2 = VideoWhisper.serverURL2;

            if (VideoWhisper.checkWait) checkWait = VideoWhisper.checkWait;

            if (VideoWhisper.whitelabel) {
                whitelabel = VideoWhisper.whitelabel;
                checkWait = true;
            }

            if (VideoWhisper.modeVersion) modeVersion = VideoWhisper.modeVersion;
        }

      //  this.setState({ 'serverURL': serverURL, parametersRetrieved: true, 'checkWait': checkWait, 'whitelabel': whitelabel });
      this.state.serverURL = serverURL;
      this.state.serverURL2 = serverURL2;

      this.state.parametersRetrieved = true;
      this.state.checkWait = checkWait;
      this.state.whitelabel = whitelabel;
      this.state.modeVersion = modeVersion;

      this.state.requestUID = VideoWhisper.requestUID;
      if (VideoWhisper.requestUsername) this.state.requestUsername = VideoWhisper.requestUsername; 

      if (VideoWhisper.devMode) 
      {
        this.devMode = VideoWhisper.devMode;
        this.state.devMode = this.devMode;
      }

    if (this.devMode) console.log('VideoWhisper/containers/App retrieveParameters', VideoWhisper, configName, devMode, state);

      if (!whitelabel) console.log('VideoWhisper.com / HTML5 Videochat', this.version, this.versionMode, devMode ); else console.log('HTML5 Videochat', this.version, this.versionMode, devMode);
    }

     serverUpdate = (data) => {
        const { state } = this;

        if (!state.serverURL) this.retrieveParameters();

        if (!state.serverURL) //check again
        {
            if (this.devMode) console.log('VideoWhisper/containers/App serverUpdate : missing serverURL', state, this.devMode);
            return;
        }

        if (!data) data = {};

        const { props } = this;

        if (props.user.loggedIn) //include session info if loggedin
        {
            const VideoWhisper =
            {
                userID: props.user.ID,
                sessionID: props.user.sessionID,
                sessionKey: props.user.sessionKey,
                nonce: props.config.nonce,

                roomID: props.room.ID,
                privateUID: props.room.privateUID,
                roomActionID: props.room.actionID,
            };
            data['VideoWhisper'] = VideoWhisper;

            data['lastMessage'] = props.lastMessageTimestamp;
            data['lastRoomUpdate'] = this.lastRoomUpdate;

            data['lastMessageID'] = this.lastMessageID;
        }

        data['devMode'] = this.devMode;

        data['requestUID'] = this.state.requestUID;
        data['alreadyUpdating'] = this.serverUpdating;
        data['alreadyTask'] = this.serverTask;
        
        var self = this;

        //console.log('containers/App serverUpdate', data);

        var sleep = 100;
        if (this.serverUpdating) 
        {
            if (this.devMode) console.log('containers/App serverUpdate WARNING: Already Updating now, prev', data['task'], this.serverTask );
            sleep = 1500; //wait more time to allow processing of previous request, prevent rate limiting issues
        }

        if (data['task'] == 'next') this.setState({ roomLoading: true });
        this.serverUpdating = true; //already updating: do not tick
        this.serverTask = data['task'];

        //  formData.append('data', qs.stringify(data));
        setTimeout( () => 
        axios.post(this.state.serverURL, qs.stringify(data), this.axiosConfig)
            .then(function (response) {
                //   console.log('containers/App serverUpdate Response', response);
                self.serverProcess(response);
            })
            .catch( (error) => this.serverError(error, data) )
            , sleep);
    }

    serverError(error, data) {
        console.log('containers/App serverUpdate Error:', error, data);
        
        //only task requests
        if (data) if (data['task'] != 'tick' ) this.setState({ 'error': 'An error occured on web request. [' + data['task'] + '] '+ error.toString(), 'errorType': 'web', 'errorTask':'' });

        this.serverUpdating = false; //error, not updating anymore
        this.serverTask = 'serverError';
    }

    componentDidMount() {

        this.componentMounted = true;

        //componentDidMount() is invoked immediately after a component is mounted (inserted into the tree). Initialization that requires DOM nodes should go here. If you need to load data from a remote endpoint, this is a good place to instantiate the network request.


        // this.props.setUser({ID: 1, session: 1, name: 'DevUser', loggedIn: true}); 
        if (this.devMode) console.log('VideoWhisper/containers/App componentDidMount', this.props);

        // Add resize listener for mobile detection
        this.handleResize = this.handleResize.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.handleResize);
        }

        // this.fetchHistory(); //includes this.serverUpdate(data);
        //connect to ws

        /*  const data = {
              VideoWhisper: 'VideoWhisper.com',
              lastUpdate: this.props.lastMessageTimestamp,
          };
          */

    }

    componentWillUnmount() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.handleResize);
        }
    }

    handleResize() {
        const isMobile = window.innerWidth <= 800;
        if (this.state.isMobile !== isMobile) {
            this.setState({ isMobile });
        }
    }

    /*
    static getDerivedStateFromProps(props, state)
    {
        //getDerivedStateFromProps is invoked right before calling the render method, both on the initial mount and on subsequent updates. It should return an object to update the state, or null to update nothing.
       
      if (state.devMode)  console.log('containers/App getDerivedStateFromProps', state, props);

        return state;

    }
    */

    onClick(e, { name, value }) {

        if (this.devMode) console.log('VideoWhisper/containers/App onClick', name, value, e);

        switch (name) {
            case 'closeError':
                clearInterval(this.timerError);
                this.setState({ error: '', errorMore: '', errorURL: '', errorType: '', errorTask: '' });
                this.timerStart();
                break;

            case 'reloadError':
                window.location.reload();
            break;

            case 'closeWarning':
                clearInterval(this.timerError);
                this.setState({ warning: '', warningMore: '', warningURL: '', errorType: '' });
                break;

            default:
                if (this.devMode) console.log('VideoWhisper/containers/App onClick UNHANDLED', name, value, e);
                break;
        }

    }





    screenRouter() {
        //select what screen to render
        const { sendMessage, fetchHistory, props, serverUpdate, state, checkMode } = this;

        let screen = 'LoginScreen';

        if (props.user.loggedIn) {
            if (props.room.screen) screen = props.room.screen;
            else screen = 'Way2Screen';

            //after login force screen (get info first)
            if (this.devMode) if (this.devScreen) screen = this.devScreen;

            //requesting private, not in private yet : lobby to wait for start
            if (state.requestUID && !props.room.privateUID) screen = 'LobbyScreen';

        }

       // if (this.devMode) console.log('containers/App screenRouter:', screen, props.room);

        if (this.state.screen != screen) //screen change
        {
            this.state.screenTime = 0;

            if (screen == 'Way2Screen' ) if (state.revealMode) this.state.publishRequired = true;

            if (this.devMode) console.log('VideoWhisper/containers/App screenRouter change', screen, this.state.screen);
        }

        this.state.screen = screen;

 

        switch (screen) {
            case 'LoginScreen':
                return (<LoginScreen ref={this.componentScreen} user={props.user} serverUpdate={serverUpdate} checkMode={checkMode} 
                    appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} key='screen' />);
                break;

            case 'BroadcastScreen':
                return (<BroadcastScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                    appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                break;

            case 'BroadcastAudioScreen':
                    return (<BroadcastAudioScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                        appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                    break;
            case 'PlaybackScreen':
                return (<PlaybackScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                    appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                break;

            case 'PlaybackAudioScreen':
                    return (<PlaybackAudioScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                        appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                break;
    
            case 'LobbyScreen':
                    return (<LobbyScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} actions={props.actions}
                        appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} serverUpdate={serverUpdate} key='screen' />);
                    break;

            case 'Way2Screen':
                return (<Way2Screen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                    appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                break;

           case 'Way2AudioScreen':
                    return (<Way2AudioScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                        appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                    break;

            case 'TextScreen':
                        return (<TextScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                            appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                    break;
        
            case 'CollaborationScreen':
                if (state.pipMode && props.room.panelCamera && !state.external ) return (<CollaborationPiPScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                    appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                else return (<CollaborationScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                    appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                break;
     
            case 'CollaborationPiPScreen':
                    return (<CollaborationPiPScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                        appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
                    break;

            case 'CollaborationTextScreen':
                    return (<CollaborationTextScreen ref={this.componentScreen} user={props.user} config={props.config} room={props.room} messages={props.messages} actions={props.actions}
                        appState={state} appStateUpdate={this.appStateUpdate} appSfx={this.appSfx} fetchHistory={fetchHistory} sendMessage={sendMessage} serverUpdate={serverUpdate} key='screen' />);
            break;

            case 'RecorderScreen':
                return (<RecorderScreen user={props.user} config={props.config} room={props.room}
                    appState={state} appStateUpdate={this.appStateUpdate} serverUpdate={serverUpdate} key='screen' />);
            break;

            default:
                console.log("containers/App Error: unknown screen", screen);
        }


    }

    preRender() {
        //pre-render processing
        var { state } = this;

        if (state.darkMode) {
            state.className = 'inverted';
            state.backgroundColor = '#333333';

        } else {
            state.className = '';
            state.backgroundColor = '#EEEEEE';
        }
    }

    render() {

        this.preRender();

        const { state, props, txt } = this;

        this.devMode = state.devMode;

        var buffer = [];

        //show error dialog
        if (state.error !== '') {
            var moreButton = '';

            if (state.errorMore) {
                moreButton = (
                    <Button color='blue' name='more' target='_more' href={state.errorURL} >
                        <Icon name='help' />{state.errorMore}
                    </Button>
                );
            }

           var  buttonReload = ( <Button name='reloadError' as='div' labelPosition='right' onClick={this.onClick.bind(this)}>
            <Button color='green'>
            <Icon name='sync' />  {txt('Reload')} 
            </Button>
            <Label as='a' basic pointing='left'>{state.reloadTime > 0 ? state.reloadTime : '' }</Label>
        </Button> );

            if (state.errorTask) buttonReload = ( <Button name='retryError' as='div' labelPosition='right' onClick={ () => this.errorRetry() }>
            <Button color='green'>
            <Icon name='sync' />  {txt('Retry')} 
            </Button>
            <Label as='a' basic pointing='left'>{state.reloadTime > 0 ? state.reloadTime : '' }</Label>
      </Button> );

            var buttonIgnore = ( <Button color='yellow' name='closeError' onClick={this.onClick.bind(this)}>
            <Icon name='check' /> {txt('Ignore')} 
            </Button> );

            var buttonExit = ( <Button color='red' name='exitError' target='_top' href={props.config.exitURL} >
            {txt('Exit')} <Icon name='arrow right' />
            </Button> );

            if (state.errorType == 'data')
            {
                //can't ignore data error (i.e session ended)
                buttonIgnore = ''; 
            }

            buffer.push(<Modal key='error'
                open
                size='small'
            >
                <Header icon='warning sign' content={ state.errorType == 'data' ? txt('Server') : txt('Error') }  />
                <Modal.Content>
                    {this.state.error}
                </Modal.Content>
                <Modal.Actions> 
                    {moreButton}

                    {buttonReload}

                    {buttonIgnore}

                    {buttonExit}

                </Modal.Actions>
            </Modal>
            );
        }


        //show error warning
        if (state.warning !== '') {
            var moreButton = '';

            if (state.warningMore) {
                moreButton = (
                    <Button color='orange' name='more' target='_more' href={state.warningURL} >
                        <Icon name='help' />{state.warningMore}
                    </Button>
                );
            }

            buffer.push(<Modal key='warning'
                open
                size='small'
            >
                <Header icon='warning sign' content={txt('Warning')} />
                <Modal.Content>
                    {this.state.warning}
                </Modal.Content>
                <Modal.Actions>
                    {moreButton}
                    <Button color='green' name='closeWarning' onClick={this.onClick.bind(this)}>
                        <Icon name='check' /> {txt('Close')}
           </Button>
                </Modal.Actions>
            </Modal>
            );
        }



        buffer.push(this.screenRouter());

        const appContainerClass = this.state.isMobile ? 'mobile-layout' : '';

        return (<div id="appContainer" className={appContainerClass} style={{ backgroundColor: this.state.backgroundColor }}>
            {buffer}
        </div>
        );
    }

    sendMessage = (message) => {
        //echo  msg to store
        //  this.props.addMessage(message);

        //state echo (local)
        /*
        this.setState({ 
            messages: this.state.messages.concat(message) 
          }); 
*/
        this.serverUpdate({ task: 'message', message: message });

        if (this.devMode) console.log('VideoWhisper/containers/App sendMessage:', message, this.props);
    }

    chatNotification = (messageText) =>
    {
        const { props } = this;

        var messageObj = {
            userID: props.user.ID,
            userName: props.user.name,
            userAvatar: props.user.avatar,
          
            notification: true,
           
            text: messageText.toString(), //cast external parameter

            time: new Date().valueOf(),

            mentionMessage: 0,
            mentionUser: '',

            ID: new Date().valueOf(),
        };

        this.sendMessage(messageObj);
    }

    chatServer = (action, data) =>
    {
        this.serverUpdate({ 'task': 'externaljs', 'action': action, 'data': data });
    }

    fetchHistory = () => {
        const { props } = this;

        //update messages from ws
        this.serverUpdate({});

        //test message
        const messageObj = {
            userID: -1,
            userName: 'Test',
            text: 'Test History',
            time: new Date().valueOf(),
            ID: new Date().valueOf(),
        };

        props.addHistory(new Array(messageObj), new Date().valueOf());
        if (this.devMode) console.log('VideoWhisper/containers/App fetchHistory', props, props.messages);
    }

}


const mapDispatchToProps = function (dispatch) {
    //bind this App functions to actions (dispatch from actions/App)
    if (this.devMode) console.log('VideoWhisper/containers/App mapDispatchToProps', dispatch);

    return {
        setUser: (user) => dispatch(setUser(user)),
        setConfig: (config) => dispatch(setConfig(config)),

        setRoom: (room) => dispatch(setRoom(room)),
        updateRoom: (room) => dispatch(updateRoom(room)),

        addMessage: (message) => dispatch(addMessage(message)),
        addHistory: (messages, timestamp) => dispatch(addHistory(messages, timestamp)),
        setActions: (actions, timestamp) => dispatch(setActions(actions, timestamp)),
        setHistory: (messages, timestamp) => dispatch(setHistory(messages, timestamp)),
    };
}

const mapStateToProps = function (state) {
    //reducers/App - props in sync with store updates (subscribed to store), required
    // console.log('containers/App mapStateToProps', state);

    return {

        config: state.app.config,
        user: state.app.user,
        room: state.app.room,

        messages: state.app.messages,
        actions: state.app.actions,

        lastMessageTimestamp: state.app.lastMessageTimestamp,
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(App);
