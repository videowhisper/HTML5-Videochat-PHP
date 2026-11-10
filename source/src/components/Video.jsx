import React, { Component } from 'react';
import { Label, Form, Button, Icon, Divider } from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';

import { io } from "socket.io-client";
import { requestSocketAuth, socketSessionKey, socketStreamName, playbackStream } from "../services/socketAuth";


export default class Video extends Panel {
    //camera

    static propTypes = {
        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        appState: PropTypes.object.isRequired,
		appStateUpdate: PropTypes.func.isRequired,
         
        content: PropTypes.object,

        meta: PropTypes.string,
        videoConfig: PropTypes.object, //not .isRequired
    };

    constructor(props) {

        super(props);

        this.devMode = props.appState.devMode;
        //this.devMode = true; //force
        
        this._isMounted = false;

        if (this.devMode) console.log('components/Video constructor', props);

        this.audioInterface = false; // audio only interface
        if (props.videoConfig) this.audioInterface = props.videoConfig.audioInterface;
        
        this.playStarted = false;
        this.retriesLeft = 5;
        this.retryTimeout = 5000;
        this.retryIfTimeoutSet = false;
        this.wsWaited=0;

        this.remoteVideo = React.createRef();

        this.wsConnection = null;
        this.peerConnection = null;
        //this.localStream = null;
        this.peerConnectionConfig = { 'iceServers': [] };
        this.vwsPeerConfig =  this.peerConnectionConfig;

        //  this.enhanceData = {};
        //  this.SDPOutput = {};

        //this.streamInfo = { streamName: '', userName: '' };
        this.userData = {};

        this.startTime = null;

        this.stats = {
            video: { timestamp: 0, bandwidth: 0, bitrate: 0, packetsLost: 0, qualityLimitationReason : 'none', framesReceived:0, fps:0, frameWidth:0, frameHeight:0 },
            audio: { timestamp: 0, bandwidth: 0, bitrate: 0, packetsLost: 0}
        };
        
       this.streamInfo = { applicationName: props.config.application, streamName: playbackStream(props), userName: props.room.performer, sessionId: '[empty]' };

        this.state = {

            gotVideo: false,
            gotAudio: false,

            packetLoss: false,
            
            panelType: 'Video',
            meta: props.meta,
            bitrateInfo: (<><Icon name="eye slash" />Detecting</>),
            videoMuted: 'muted', //for autoplay to work
            videoMutedMessage: 'Tap for Sound', //for autoplay to work

            fullscreen: false,

            available: false,
            connected: false,
            connecting: false,

            autoRetries: 3,

            statusInfo: 'Waiting...',
            buttonContent: 'Connecting',
            buttonDisabled: true,

            videoWidth: 640,
            videoHeight: 360,
            videoAspectRatio: 1.77,

            retryCount: 0,
            retrying: false,
        }


    }


    interfaceReady() {

        //when comp mounts
        var { props, state } = this;

      //  const remoteVideo = this.remoteVideo.current;

        //detect safari: muted
        //  var videoMuted = '';
        /*
        var userAgent = navigator.userAgent.toLowerCase(); 
        if (userAgent.indexOf('safari') != -1) { 
          if (userAgent.indexOf('chrome') > -1) {
            // Chrome
          } else {
            // Safari
            state.videoMuted = 'muted';
          }
        }
        */


       this.streamInfoReset();
       if (this.devMode) console.log('components/Video - interfaceReady', this.streamInfo);

        //autostart without broadcast notification
        if (props.config.videoAutoPlay === '1' || state.available) this.startStreamPlay();

    }



    onLoadedData = (data) => {
        const remoteVideo = this.remoteVideo.current;

        if (this.devMode) console.log('components/Video - loadeddata');

        this.updateVideoSize('onLoadedData');

       if (remoteVideo) if (remoteVideo.paused && remoteVideo.currentTime == 0) {
            console.log('components/Video loadeddata : video paused on load - try to play', remoteVideo.src, data);
            //paused, at beginning and just loaded: try to play
            this.videoPlay();
            //this.setState({ statusInfo: 'Autoplay not available', settingsActive: true, buttonDisabled: false, buttonContent: "Tap to Play", connecting: false, connected: false });
        }
    }

    updateVideoSize(whereSeen) {


        //video dimensions videoWidth!=width video display dimensions 
        var remoteVideo = this.remoteVideo.current;

        if (this.devMode) console.log('components/Video updateVideoSize', whereSeen, remoteVideo);

        var { state } = this;

        let videoAspectRatio;

        if (remoteVideo) if (remoteVideo.videoHeight) {
            //innerText = 'Actual video dimensions: ' + remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px.';

            if (state.videoWidth !== remoteVideo.videoWidth
                || state.videoHeight !== remoteVideo.videoHeight) {
                state.videoWidth = remoteVideo.videoWidth;
                state.videoHeight = remoteVideo.videoHeight;
                if (!state.videoHeight) state.videoHeight = 1;

                this.setState({ 'videoWidth': remoteVideo.videoWidth, 'videoHeight': remoteVideo.videoHeight });
            }

            videoAspectRatio = remoteVideo.videoWidth / remoteVideo.videoHeight;
            if (state.videoAspectRatio !== videoAspectRatio) this.setState({ 'videoAspectRatio': videoAspectRatio });

            // We'll use the first onsize callback as an indication that video has started playing out.
            if (this.startTime) {
                const elapsedTime = window.performance.now() - this.startTime;
                if (this.devMode) console.log('components/Video updateVideoSize Remote Video playback setup time: ' + elapsedTime.toFixed(3) + 'ms');
                this.startTime = null;
            }

        } else {
        }

        if (this.devMode) console.log('components/Video updateVideoSize ' + whereSeen, state.videoWidth, state.videoHeight, videoAspectRatio);
    }

    componentDidMount() {
        if (this.devMode) console.log('components/Video componentDidMount');
        this._isMounted = true;
        super.componentDidMount();
        this.interfaceReady();
    }

    componentWillUnmount() {
        if (this.devMode) console.log('components/Video stopStreamPlay');
        this._isMounted = false;
        this.stopStreamPlay();
        super.componentWillUnmount();
    }


/*
    static getDerivedStateFromProps(props, state) {
        //detect if user becomes available and start

        var newState = {};

        //newState.streamInfo = this.streamInfo;
     
        var playbackUser; //detect user being played in this video

        //playback user
        var nowAvailable = false;
        if (props.room.users) 
        { //user list available


            if (props.content) //video content prop: use this
            { 
                playbackUser = props.room.users[props.content.userID];
             }
            else  //no content: using default room streamPlayback
            { 
                playbackUser = props.room.users[props.room.streamUID];
            }

            if (playbackUser) if (playbackUser.meta) {
                if (playbackUser.meta.connected) if (playbackUser.sdate < playbackUser.meta.connectedUpdate) {
                    nowAvailable = true;
                }
            }

        }

        if (nowAvailable !== state.available) {
            newState.available = nowAvailable;
            if (props.appState.devMode) console.log('components/Video - getDerivedStateFromProps nowAvailable', newState, playbackUser);

            return newState;
        }


        return null;
    }
*/

    componentDidUpdate(prevProps, prevState, snapshot) {

        //start playing
        const { state, props } = this;

        this.devMode = props.appState.devMode;

        if (socketSessionKey(prevProps) !== socketSessionKey(props)) {
            const resume = state.connected || state.connecting || state.available || props.config.videoAutoPlay === '1';
            this.vwsRetryBlocked = false;
            this.stopStreamPlay();
            if (this.vwsSocket) { this.vwsSocket.removeAllListeners(); this.vwsSocket.disconnect(); this.vwsSocket = null; }
            this.streamInfoReset();
            if (resume) this.startStreamPlay();
            return;
        }


        if (state.available && !this.vwsRetryBlocked) if (!state.connected && !state.connecting && !state.retrying) {
            if (this.devMode) console.log('components/Video - componentDidUpdate: startStreamPlay');
            this.startStreamPlay(); //try playback
        }

                //clear video src
                if (prevProps.room.videoOffline != props.room.videoOffline)
                {
                    if (this.devMode) console.log('components/Video - componentDidUpdate: props.room.videoOffline');

                    var remoteVideo = this.remoteVideo.current;
                    if (!remoteVideo.paused) 
                    {
                        remoteVideo.pause();
                        remoteVideo.removeAttribute('src'); // empty source
                        remoteVideo.load();
                    }
                }

        //Use this as an opportunity to operate on the DOM when the component has been updated.
        //componentDidUpdate() will not be invoked if shouldComponentUpdate() returns false.
    }

    /*
    componentWillReceiveProps(nextProps) {

        const { state } = this;

        //playback user
        var nowAvailable = false;
        if (nextProps.room.users) {

            var playbackUser;
            if (nextProps.content) {
                playbackUser = nextProps.room.users[nextProps.content.userID];
                if (playbackUser) this.streamInfo.streamName = nextProps.content.stream;

            }
            else {
                //using default room streamPlayback
                playbackUser = nextProps.room.users[nextProps.room.streamUID];
                if (playbackUser) this.streamInfo.streamName = nextProps.room.streamPlayback;
            }

            if (playbackUser) if (playbackUser.meta) {
                if (playbackUser.meta.connected) if (playbackUser.sdate < playbackUser.meta.connectedUpdate) {
                    nowAvailable = true;
                    this.streamInfo.userName = playbackUser.name;
                }
            }

            // if (this.devMode) console.log('components/Video - componentWillReceiveProps streamName:', this.streamInfo.streamName );


        }

        //if (this.devMode) console.log('components/Video - componentWillReceiveProps', nowAvailable, state.available, nextProps.content, nextProps.room.users);

        if (nowAvailable !== state.available) {
            this.setState({ available: nowAvailable }); //update if changed
            if (nowAvailable) if (!state.connected && !state.connecting && !state.retrying) this.startStreamPlay(); //try playback
            //if (!nowAvailable) this.stopStreamPlay();
        }

    }
    */


    //Timer to update stats
    timerStart() {
        this.stats['video'].bitrate = 0;
		this.stats['audio'].bitrate = 0;

		this.stats['video'].packetsLost = 0;
		this.stats['audio'].packetsLost = 0;

        this.stats['video'].fps = 0;
        this.stats['video'].frameWidth = 0;
        this.stats['video'].frameHeight = 0;

		this.stats['video'].qualityLimitationReason = 'none';

        this.timer = setInterval(this.timerTick.bind(this), 1000);
        if (this.devMode) console.log('components/Video timerStart');

        this.setState({packetLoss: false});
    }

    timerStop() {
        clearInterval(this.timer);
        if (this.devMode) console.log('components/Video timerStop');

        this.setState({packetLoss: false});
    }

    timerTick() {

        if (!this._isMounted) return;

        const { state, props } = this;

        this.devMode = props.appState.devMode;


        //get stats

        if (!this.state.connected) return;
        if (!this.peerConnection) return;

 
        
        //getStats for all tracks
        this.peerConnection.getReceivers().forEach(track => {
            track.getStats().then(res => {
                res.forEach(report => {

                   // if (this.devMode) console.log('components/Video timerTick report', report);

                   if (this.devMode) 
                   if (report.packetsLost) if (report.packetsLost>0) console.log('components/Video packetsLost ', report.packetsLost, report); // inbound-rtp

                   	//audio/video
					var kind = report.kind;
                    if (kind === undefined) kind = report.mediaType; //Safari
                    if (!kind) return;

					//measure packet loss for sent stream (remote)
					if (report.type == 'inbound-rtp') 
					{
                        if (!this.stats[kind]) this.stats[kind] = {};
						this.stats[kind].packetsLost = report.packetsLost;
						this.stats[kind].roundTripTime = report.roundTripTime;
						this.stats[kind].jitter = report.jitter;

						this.stats[kind].timestampRemote = report.timestamp;
					}              

                    if (report.type !== 'inbound-rtp') return;
                    if (report.isRemote) return;
                    if (kind !== 'video' && kind !== 'audio') return;

                    var deltaTimestamp = report.timestamp - this.stats[kind].timestamp;

                    if (deltaTimestamp > 0 && deltaTimestamp < 6000) //max between samples to calc stats
                        if (report.bytesReceived >= this.stats[kind].bytesReceived) //should be more
                        {
                          if (kind == 'video' )  this.stats[kind].fps = Math.round((report.framesReceived - this.stats[kind].framesReceived) * 1000 / deltaTimestamp);                          
                            this.stats[kind].bitrate = (report.bytesReceived - this.stats[kind].bytesReceived) * 8 / deltaTimestamp;                          
                        }


                    //update
                    this.stats[kind].timestamp = report.timestamp;
                    this.stats[kind].bytesReceived = report.bytesReceived;
                    if (kind == 'video' )  
                    {
                        this.stats[kind].framesReceived = report.framesReceived;
                        this.stats[kind].frameWidth = report.frameWidth;
                        this.stats[kind].frameHeight = report.frameHeight;

                    }
                
                    this.stats[kind].qualityLimitationReason = report.qualityLimitationReason;

                });
            });

        });

        var codeVideo = (<>
        <Icon name="video" />{Math.round(this.stats['video'].bitrate)} kbps 
							{(this.stats['video'].qualityLimitationReason !== 'none' && this.stats['video'].qualityLimitationReason !== undefined) ? '(limited: ' + this.stats['video'].qualityLimitationReason + ')' : ''} 
							{ (this.stats['video'].roundTripTime) > 0 ? (<> <Icon name="clock" />{this.stats['video'].roundTripTime} </>): '' }
							{ (this.stats['video'].jitter > 0) ? (<> <Icon name="circle notch" />{Math.round((this.stats['video'].jitter + Number.EPSILON) * 1000) / 1000} jitter </>) : ''}
							{ (this.stats['video'].packetsLost) > 0 ? (<> <Icon name="exclamation circle" />{this.stats['video'].packetsLost} packets lost </>)  : '' }
							{<> <Icon name="expand" />{this.stats['video'].frameWidth?this.stats['video'].frameWidth:this.remoteVideo.current.videoWidth}x{this.stats['video'].frameHeight?this.stats['video'].frameHeight:this.remoteVideo.current.videoHeight}@{this.stats['video'].fps} </>}	
							<br />	

        </>);

        if (this.props.room.audioOnly || this.audioInterface) codeVideo = '';

        var connectionInfo = (<> <Icon name="broken chain" />Socket Not Connected</>);
        if (this.wsConnection) connectionInfo = (<> <Icon name="chain" />{this.wsConnection.readyState}</>);
        if (this.vwsSocket) connectionInfo = (<> <Icon name={this.vwsSocket.connected? "chain" : "unlink"} /> </>);

        var peerInfo = (<> <Icon name="stop circle" />Peer Not Connected</>);
        if (this.peerConnection) peerInfo = (<> <Icon name="play circle" />{this.peerConnection.connectionState}/{this.peerConnection.iceConnectionState}/{this.peerConnection.iceGatheringState}/{this.peerConnection.signalingState}</>);


        let bitrateInfo = (<><Icon name="wait" />Measuring...</>);

        if (this.stats['video'].bitrate > 0 || this.stats['audio'].bitrate > 0)
            bitrateInfo = (<div>
                {codeVideo} 
                <Icon name='microphone' />{Math.round(this.stats['audio'].bitrate)} kbps 
				{(this.stats['audio'].qualityLimitationReason !== 'none' && this.stats['audio'].qualityLimitationReason !== undefined) ? '(limited: ' + this.stats['audio'].qualityLimitationReason + ')' : ''} 
							{ (this.stats['audio'].roundTripTime) > 0 ? (<> <Icon name="clock" />{this.stats['audio'].roundTripTime} </>): '' }
							{ (this.stats['audio'].jitter > 0) ? (<> <Icon name="circle notch" />{Math.round((this.stats['audio'].jitter + Number.EPSILON) * 1000) / 1000} jitter </>) : ''}
							{ (this.stats['audio'].packetsLost) > 0 ? (<> <Icon name="exclamation circle" />{this.stats['audio'].packetsLost} packets lost </>)  : '' }
				<br />{connectionInfo} {peerInfo}
		</div>
            );

        if (this.state.settingsActive || this.audioInterface) this.setState({ 'bitrateInfo': bitrateInfo });

        //update got status
        if (this.state.gotAudio && this.stats['audio'].bitrate == 0) this.setState({gotAudio: false});
        if (!this.state.gotAudio && this.stats['audio'].bitrate > 0) this.setState({gotAudio: true});
        if (this.state.gotVideo && this.stats['video'].bitrate == 0) this.setState({gotVideo: false});
        if (!this.state.gotVideo && this.stats['video'].bitrate > 0) this.setState({gotVideo: true});
      
        //warn about packet loss
		if (this.stats['audio'].packetsLost || this.stats['video'].packetsLost)
        if (!this.state.packetLoss) this.setState({packetLoss: true});
        
    }

    detectStreamChange() {
        const { state, props } = this;

        this.devMode = props.appState.devMode;

      //detect if stream changed 
      var streamChanged = 0;
      var streamName = playbackStream(props);
      var nowAvailable = false;

      if (props.room.users) //user list available: configure
      { 
          var playbackUser; //detect user being played in this video
  
          if (props.content) //video content prop: use this
          { 
              playbackUser = props.room.users[props.content.userID];
              streamName = playbackStream(props);
          }
          else  //no content: using default room streamPlayback
          { 
              playbackUser = props.room.users[props.room.streamUID];
              streamName = playbackStream(props);
          }
      }

          if (this.streamInfo) if (this.streamInfo.streamName != streamName) streamChanged = 1;
      
          if (playbackUser) if (playbackUser.meta) 
        {
            if (playbackUser.meta.connected) if (playbackUser.sdate < playbackUser.meta.connectedUpdate) {
                nowAvailable = true;
            }
        }

        if (state.available != nowAvailable) 
        {
            // Schedule the render/update that starts playback when the PHP
            // room metadata first reports an active broadcaster.
            this.setState({ available: nowAvailable });
            if (this.devMode) console.log('components/Video detectStreamChange available', nowAvailable, this.state.available);

        }

      if (streamChanged)
      {
          if (this.devMode) console.log('components/Video detectStreamChange', streamName, this.streamInfo.streamName);
  
          //stop incorrect stream
          this.stopStreamPlay();

          //reconnect if needed
          if (this.serverVideowhisper) if (this.vwsSocket) if (this.vwsSocket.connected) this.vwsSocket.disconnect();

          this.streamInfoReset();
          if (streamName) if (props.config.videoAutoPlay === '1' || state.available) this.startStreamPlay();
      }

    }


    render() {
        const { state, props, txt } = this;

        this.devMode = props.appState.devMode;

        this.detectStreamChange();

        var videoStyle = {};

        if (!this.audioInterface)
        {
        //detect and update panel size / aspect if incorrect
		if (state.container) {
			let width = state.container.clientWidth;
			let height = state.container.clientHeight;

			if (state.width !== width || state.height !== height) {
                if (!height) height = 1;
				const aspectRatio = width / height;

                this.state.aspectRatio = aspectRatio;
                this.state.width = width;
                this.state.height = height;
				if (this.devMode) console.log('components/Video - render: container size update');
			}
        }
        
        //zoom video background to container
        let videoWidth = state.videoWidth;
        let videoHeight = state.videoHeight;
        let videoOffsetX = 0;
        let videoOffsetY = 0;

        if (state.width && state.aspectRatio && state.videoAspectRatio) {
            if (state.videoAspectRatio > state.aspectRatio) //video is wider: full width, remains height
            {
                videoWidth = state.width;
                videoHeight = videoWidth / state.videoAspectRatio;
                videoOffsetY = (state.height - videoHeight) / 2;
            }
            else {
                videoHeight = state.height;
                videoWidth = videoHeight * state.videoAspectRatio;
                videoOffsetX = (state.width - videoWidth) / 2;
            }
        }
         videoStyle = { position: 'absolute', left: videoOffsetX, top: videoOffsetY, width: videoWidth, height: videoHeight };
    }

    var audioStyle = {borderRadius: '3px', padding: '2px', margin: '2px'};


        var streamIcon = 'eye';
        if (props.room.audioOnly || this.audioInterface) streamIcon = 'microphone';

        var streamName = "";
		if(this.streamInfo) if (this.streamInfo.streamName) streamName = this.streamInfo.streamName.split("?")[0];
     
        var controlSettings = "";
        if (state.settingsActive)
            controlSettings = (
                <div className="controlsTop vwsVideoControls">
                    <Form>
                        <Label color='black' pointing='right'>{state.statusInfo}</Label>
                        <Divider hidden vertical />
                        <Button compact size="small" name="reload" onClick={this.onClick.bind(this)} loading={state.buttonDisabled} disabled={state.buttonDisabled} icon labelPosition='right' inverted >
                            {state.buttonContent}
                            <Icon name='redo' />
                        </Button>
                    </Form>
                    <Label color='black'>{this.streamInfo.userName? (<><Icon name="user" />{this.streamInfo.userName}</>): (<><Icon name="users" /> {props.room.name}</>)} 
        {streamName?(<>  <Icon name='play' />{streamName} </>):''} {state.connected ? state.bitrateInfo : (<><Icon name="eye slash" />Not Streaming</>)}</Label>
                </div>
            );

        var warnIcon = '';
        if (state.packetLoss) warnIcon = (<span data-tooltip={this.txt('Packet Loss: Download Connection Issue')} data-position="left center"><Icon inverted name="exclamation circle" size='large'  /></span>);

        var statusIcon = (<Button compact name="status" size="small" inverted={(this.audioInterface?props.appState.darkMode:true)} icon data-tooltip="Not Available" data-position="bottom center"><Icon inverted color='black' name={streamIcon + ' slash'} /></Button>);
        if (state.available) statusIcon = (<Button  compact name="status" size="small" inverted={(this.audioInterface?props.appState.darkMode:true)} icon data-tooltip="Available" data-position="bottom center"><Icon inverted color='green' name={streamIcon} /></Button>);
        if (state.connecting) statusIcon = (<Button  compact name="status" size="small" inverted={(this.audioInterface?props.appState.darkMode:true)} icon data-tooltip="Connecting" data-position="bottom center"><Icon inverted loading name='spinner' /></Button>);
        if (state.connected) statusIcon = (<Button  compact name="status" size="small" inverted={(this.audioInterface?props.appState.darkMode:true)} icon data-tooltip="Streaming" data-position="bottom center"><Icon inverted name={streamIcon} /></Button>);
        if (state.connected && !state.available) statusIcon = (<Button compact name="status" size="small" inverted={(this.audioInterface?props.appState.darkMode:true)} icon data-tooltip="Terminated" data-position="bottom center"><Icon inverted color='orange' name={streamIcon} /></Button>);

        //offline video
        var videoSource = (<></>);
        if (props.room.videoOffline) 
        if (!state.available && !state.connected) {
            videoSource = (<source src={props.room.videoOffline} type="video/mp4"></source>);
        };




        //    console.log('components/Video - render', videoSource);

        var gotIcon = '';
        var fullscreenB = '';
        if (!props.appState.minMode) 
        {
            gotIcon = (<><Button compact name="gotAudio" size="small" inverted icon data-tooltip={state.gotAudio?txt('Receiving Audio'):txt('No Audio')} data-position="bottom center"><Icon inverted name={state.gotAudio?'microphone':'microphone slash'}/></Button> <Button compact name="gotVideo" size="small" inverted icon data-tooltip={state.gotVideo?txt('Receiving Video'):txt('No Video')} data-position="bottom center"><Icon inverted name={state.gotVideo?'video':'eye slash'}/></Button></>);


            fullscreenB = (<Button compact name="fullscreen" size="small" inverted icon toggle onClick={this.onClick.bind(this)} data-tooltip={txt('Enter Fullscreen')} data-position="bottom center">
            <Icon name='expand' />
         </Button>);
        }
   
        //ref={video => (this.remoteVideo = video)}

        if (!this.audioInterface)  return (
            <div className="panel vwsVideo" ref={container => (this.state.container = container)}>

                <div className="backgroundVideo">
                    <video style={videoStyle} id="remoteVideo" poster={props.room.snapshot} ref={this.remoteVideo} className="remoteVideo" muted={state.videoMuted} autoPlay loop playsInline controls={state.settingsActive} onLoadedData={this.onLoadedData} onLoadedMetadata={() => this.updateVideoSize('loadedmetadata')}>
                        {videoSource}
                    </video>

                </div>

                <div className="controlsIcons">
                    {warnIcon}
                    {statusIcon}
                    {gotIcon}
                    <Button compact name="settings" size="small" inverted icon toggle active={state.settingsActive} onClick={this.onClick.bind(this)} data-tooltip={txt('Toggle Controls')} data-position="bottom center">
                        <Icon name='setting' />
                    </Button>

                    <Button compact name="mute" size="small" inverted icon toggle onClick={this.onClick.bind(this)} data-tooltip={state.videoMuted ? txt('Enable Audio') : txt('Mute')} data-position="bottom center">
                        <Icon name={state.videoMuted ? 'volume off' : 'volume up'} /> {state.videoMutedMessage}
                    </Button>
                    
                    {fullscreenB}
                </div>

                {controlSettings}

            </div>
        ); 
        else 
        return (
            <div className="panel" ref={container => (this.state.container = container)}>
                		
                 		<Form>
			            <Form.Group inline>

                        <Form.Field inline><Icon inverted={props.appState.darkMode} name='volume up'/></Form.Field>

                        <Form.Field><Button compact name="mute" size="small" inverted={props.appState.darkMode} icon toggle onClick={this.onClick.bind(this)} data-tooltip={state.videoMuted ? txt('Enable Audio') : txt('Mute')} data-position="bottom center" >
                        <Icon name={state.videoMuted ? 'volume off' : 'volume up'} /> {state.videoMutedMessage}
                        </Button></Form.Field>

                        <Form.Field><audio style={audioStyle} id="remoteVideo" poster={props.room.snapshot} ref={this.remoteVideo} className="remoteVideo" muted={state.videoMuted} autoPlay loop playsInline  onLoadedData={this.onLoadedData}>
                        </audio></Form.Field>
	
                        <Form.Field><Button compact size='small' name="reload" onClick={this.onClick.bind(this)} loading={state.buttonDisabled} disabled={state.buttonDisabled} icon labelPosition='right' inverted={props.appState.darkMode} >
                            <Icon name='redo' />
                            {state.buttonContent}
                        </Button></Form.Field>

                        <Form.Field inline>{warnIcon}</Form.Field>
                        <Form.Field inline><Label size='tiny'><Icon name="user" />{this.streamInfo.userName} {state.connected ? state.bitrateInfo : (<><Icon name="eye slash" />Not Streaming</>)}</Label></Form.Field>

                        </Form.Group>
                        </Form>
            </div>
        );
//                        <Form.Field>{statusIcon}</Form.Field>

    }

    onClick(e, { name, value }) {

        const { txt } = this;

        if (name == "reload")
            // eslint-disable-next-line default-case
            switch (this.state.buttonContent) {
                case txt('Tap to Play'):
                    this.remoteVideo.current.play();

                    //playing preview/stream
                    if (this.state.connected) this.setState({ statusInfo: 'Streaming', settingsActive: false, buttonDisabled: false, buttonContent: "Reload", videoMuted: '', videoMutedMessage: '' });
                    else if (this.state.connecting) this.setState({ statusInfo: 'Preview. Connecting...', videoMuted: '', videoMutedMessage: '' });
                    else this.setState({ statusInfo: 'Preview', buttonContent: txt('Reload'), videoMuted: '', videoMutedMessage: '' });

                    break;
                case txt('Reload'):
                    this.setState({ buttonDisabled: true, buttonContent: txt("Reloading"), connecting: true, connected: false }); 
                    this.stopStreamPlay();
                    this.startStreamPlay();
                    break;
            }

        if (name == "fullscreen") {
            let newFullscreen = !this.state.fullscreen;

            e.preventDefault();
            this.requestFullscreen(this.remoteVideo.current);

        }

        if (name == "mute") {
            if (this.state.videoMuted) this.remoteVideo.current.muted = false; //try to unmute
            this.setState({ videoMuted: !this.state.videoMuted, videoMutedMessage: '' });

            //setTimeout(() => this.setState({videoMuted: !this.state.videoMuted, videoMutedMessage:'' }), 1000);
        }

        super.onClick(e, { name, value });
    }

    retryIfTimeout()
    {

        if (!this.state.connected)  if (!this.playStarted)	if (this.retriesLeft > 0)
		{	
        if (this.devMode) console.log("components/Video retryIfTimeout #", this.retriesLeft);

		this.retriesLeft --;
        this.stopStreamPlay();
        this.setState({ buttonDisabled: true, buttonContent: "Auto Retry...", connecting: true, connected: false });
        this.startStreamPlay();
        }

        //completed
        this.retryIfTimeoutSet = false;
    }

    //fullscreen
    requestFullscreen(ele) {

        var supported = true;

        if (ele.requestFullscreen) {
            ele.requestFullscreen();
        } else if (ele.webkitRequestFullscreen) {
            ele.webkitRequestFullscreen();
        } else if (ele.mozRequestFullScreen) {
            ele.mozRequestFullScreen();
        } else if (ele.msRequestFullscreen) {
            ele.msRequestFullscreen();
        } else {
            console.log('components/Video Fullscreen API is not supported.');
            supported = false;
        }

        this.setState({ fullscreen: supported });
    };



    //webrtc
    streamInfoReset()
    {
        const { props, state } = this;

        //reset stream
        this.streamInfo = { applicationName: props.config.application, streamName: playbackStream(props), userName: '', sessionId: '[empty]' };
            
        if (props.room.users) //user list available: configure
        { 
            var playbackUser; //detect user being played in this video

            if (props.content) //video content prop: use this
            { 
                playbackUser = props.room.users[props.content.userID];
                this.streamInfo.streamName = playbackStream(props);
            }
            else  //no content: using default room streamPlayback
            { 
                playbackUser = props.room.users[props.room.streamUID];
                this.streamInfo.streamName = playbackStream(props);
            }

            if (playbackUser)  {
                this.streamInfo.userName = playbackUser.userName;

                //check if available on connect
                if (playbackUser.meta) if (playbackUser.meta.connected) if (playbackUser.sdate < playbackUser.meta.connectedUpdate)
                {
                    state.available = true; 
                }

                this.streamInfo.userName = playbackUser.userName;

            }
        }
    }


    async vwsConnect() {
        if (this.vwsAuthRequest || (this.vwsSocket && this.vwsSocket.connected)) return;
        const session = socketSessionKey(this.props);
        const request = new AbortController();
        this.vwsAuthRequest = request;
        try {
            const auth = await requestSocketAuth(this.props, this.props.user.name + '_play', request.signal);
            if (this._isMounted && this.vwsAuthRequest === request && session === socketSessionKey(this.props)) this.vwsConnectReady(auth);
        } catch (error) {
            if (this._isMounted && this.vwsAuthRequest === request && session === socketSessionKey(this.props) && error.name !== 'AbortError') {
                this.vwsRetryBlocked = true;
                this.setState({ statusInfo: 'Session authentication failed. Reload the page and try again.', connecting: false, connected: false, buttonDisabled: false, settingsActive: true, buttonContent: 'Reload' });
            }
        } finally {
            if (this.vwsAuthRequest === request) this.vwsAuthRequest = null;
        }
    }

    vwsConnectReady(auth) {
      
        const { props, state } = this;

        //connect to socket
		this.vwsPeerId = auth.user;
        this.vwsChannel = socketStreamName((props.content && props.content.stream) || props.room.streamPlaybackName || playbackStream(props));

        if (!this.vwsSocket)
        {
        this.vwsSocket = new io(props.config.vwsSocket, {
            'auth': auth ,
			'transports': ['websocket'],		
			'secure':true,
            'autoConnect': false, // disables auto connection, by default the client would connect to the server as soon as the io() object is instatiated
            'reconnection': false, // disables auto reconnection, this can occur when for example the host server disconnects. When set to true, the client would keep trying to reconnect
            // for a complete list of the available options, see https://socket.io/docs/v4/client-api/#new-Manager-url-options
        });

        if (this.devMode) console.log("components/Video vwsSocket ", this.vwsPeerId, this.vwsChannel, props.config.vwsSocket);

        this.vwsSocket.on("connect", () => {
           if (this.devMode) console.log("components/Video vwsSocket Connected #", this.vwsSocket.id);
            this.vwsSocket.emit( "subscribe", this.vwsPeerId, this.vwsChannel );
        });

        this.vwsSocket.on("disconnect", () => {
            console.log("components/Video vwsSocket Disconnected");
            this.setState({ statusInfo: this.txt( 'Disconnected' ), buttonDisabled: false, settingsActive: true, buttonContent: this.txt("Reload"), connecting: false, connected: false });
        });

        this.vwsSocket.on("connect_failed", (error) => {
            this.vwsRetryBlocked = true;
            console.log("components/Video vwsSocket Connection failed", error.message);
            this.setState({ buttonDisabled: false, buttonContent: this.txt('Reload'), settingsActive: true, statusInfo: error.message, connecting: false, connected: false });
        });

        this.vwsSocket.on("connect_error", (error) => {
            this.vwsRetryBlocked = true;
            console.log("components/Video vwsSocket Connection error", error.message);
            this.setState({ buttonDisabled: false, buttonContent: this.txt('Reload'), settingsActive: true, statusInfo: error.message, connecting: false, connected: false });
        });

        this.vwsSocket.on("message", (message) => {
            if (this.devMode) console.log("components/Video vwsSocket.on(message", message.type ? message.type : message);

			if (message.from === this.vwsPeerId) 
            {
                if (this.devMode) console.log('components/Video vwsSocket.on(message) ignore own message', message);
                return; //ignore own messages
            }

			if (message.type === "offer") {

                this.vwsPeerIdTarget = message.from;

                if (message.peerConfig) this.vwsPeerConfig = message.peerConfig;

                if (this.devMode) console.log('components/Video offer creating peerConnection', this.vwsPeerConfig, message );

//create the connection (only one as it plays one stream from 1 broadcaster)
this.peerConnection = new RTCPeerConnection(this.vwsPeerConfig);

//add event listeners
this.peerConnection.addEventListener('icecandidate', e => this.icecandidate(this.peerConnection, e));
this.peerConnection.addEventListener('track', this.track.bind(this));  

this.peerConnection.onconnectionstatechange =  (e) => this.onconnectionstatechange(e);
this.peerConnection.onsignalingstatechange =  (e) => this.onsignalingstatechange(e);
this.peerConnection.oniceconnectionstatechange = (e) => this.iceconnectionstatechange(this.peerConnection, e);
this.peerConnection.onnegotiationneeded = this.onnegotiationneeded.bind(this);

this.peerConnection.setRemoteDescription(message.content).then(this.peerCreateAnswer.bind(this)).catch(this.errorHandler.bind(this));

			}

            if (message.type === "candidate" ) {

               if (message.candidate) this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate)).then(
                    () => {                    
                        if (this.devMode) console.log('components/Video peerConnection.addIceCandidate Success', message.target, message );
                    }
                )
                .catch( (e) =>
                {
                    console.log('components/Video peerConnection.addIceCandidate Error', e, message );
                }
                );
            }

		} );

        this.vwsSocket.on("uniquenessError", (error) => {
            this.vwsRetryBlocked = true;
            console.error(`components/Video vwsSocket Error: ${error.message}`);

            this.setState({ buttonDisabled: false, buttonContent: this.txt('Reload'), settingsActive: true, statusInfo: error.message, connecting: false, connected: false });

        });

        this.vwsSocket.on("subscribeError", (error) => {
            this.vwsRetryBlocked = true;

            console.error(`components/Video vwsSocket subscribeError: ${error.message}`);

            this.setState({ buttonDisabled: false, buttonContent: this.txt('Reload'), settingsActive: true, statusInfo: error.message, connecting: false, connected: false });

        });

        }

        this.vwsSocket.auth = auth;
        if (!this.vwsSocket.connected) this.vwsSocket.connect();
   
    }

    wsConnect() {
        // websocket connect to Wowza SE
        const { props, state } = this;

        this.devMode = props.appState.devMode;
         
        if (this.devMode) console.log("components/Video wsConnect: ", state.connected, props.appState.wsOpen, this.wsConnection, this.wsWaited);

        if (state.connected) 
        {
            console.log("components/Video wsConnect: already connected, skip");
            return;
        }


        if (this.props.appState.wsOpen)
        {
            if (this.devMode) console.log("components/Video wsConnect:  websocket busy,  retry later", this.props.appState.wsComponent, " waited: " + this.wsWaited, this.wsConnection);
            
            if (this.wsConnection) 
            {
                 if (this.wsConnection.readyState<2) 
                 if (this.wsWaited > 1) //already waited: close
                 {
                   this.wsConnection.close();
                   if (this.peerConnection) this.peerConnection.close();
                   this.wsWaited = 0;
                 } else this.wsWaited++; //waited this time, will close later
            }

            setTimeout(()=>this.wsConnect(), 2000);
           //console.log("components/Video wsConnect:  websocket busy, not retrying in devMode");

            return;
        }
    
		//websocket available: mark it as busy
		this.props.appStateUpdate({wsOpen: true, wsComponent: 'Video'});


        this.userData = { param1: "value1", "videowhisper": "webrtc-playback" };

        if (this.wsConnection) if (this.wsConnection.readyState<2)
		{
            console.log('components/Video wsConnect previous websocket (close)', this.wsConnection);
            this.wsConnection.close();      
            if (this.peerConnection) this.peerConnection.close();
		}

        this.wsConnection = new WebSocket(props.config.wss);
        this.wsConnection.binaryType = 'arraybuffer';

        this.wsConnection.onopen = this.onopen.bind(this); //pass context with .bind(this)

        this.wsConnection.onmessage = (e) => this.onmessage(e);

        this.wsConnection.onclose = () => {
            if (this.devMode) console.log("components/Video wsConnection.onclose");
            this.props.appStateUpdate({wsOpen: false});
        }

        this.wsConnection.onerror = (evt) => {
            console.log("components/Video ERROR wsConnection.onerror: ", evt);
           // this.wsConnection.close();
            this.props.appStateUpdate({wsOpen: false});
            this.setState({ settingsActive: true, buttonDisabled: false, buttonContent: "Retry", statusInfo: evt.message } );	

        }
    }


    onopen = function (e) {
        var { state } = this;

        if (this.devMode) console.log("components/Video wsConnection.onopen wsConnection.readyState:", this.wsConnection.readyState, e, this.state);
		this.props.appStateUpdate({wsOpen: true, wsComponent: 'Video onopen'});

        if (this.wsConnection.readyState != 1) return;

        state.retrying = false; //success

        this.peerConnection = new RTCPeerConnection(this.peerConnectionConfig);
        this.peerConnection.addEventListener('icecandidate', e => this.icecandidate(this.peerConnection, e));

        this.peerConnection.onconnectionstatechange =  (e) => this.onconnectionstatechange(e);
        this.peerConnection.onsignalingstatechange =  (e) => this.onsignalingstatechange(e);

        this.peerConnection.oniceconnectionstatechange = (e) => this.iceconnectionstatechange(this.peerConnection, e);
		this.peerConnection.onnegotiationneeded = this.onnegotiationneeded.bind(this);

        this.peerConnection.addEventListener('track', this.track.bind(this));

        if (this.wsConnection)
        if (this.wsConnection.readyState == 1) this.sendPlayOffer();
        else console.log("components/Video wsConnection not open for sendPlayOffer wsConnection.readyState:", this.wsConnection.readyState);
        else console.log("components/Video wsConnection not available");
    }

     mungeSDPPlay = function (sdpStr) {

        // For greatest playback compatibility, 
        // force H.264 playback to constrained baseline (42e01f).
      
        let sdpLines = sdpStr.split(/\r\n/);
        let sdpStrRet = '';
      
        for (var sdpIndex in sdpLines) {
          var sdpLine = sdpLines[sdpIndex];
      
          if (sdpLine.length === 0)
            continue;
      
          if (sdpLine.includes("profile-level-id")) {
            // The profile-level-id string has three parts: XXYYZZ, where
            //   XX: 42 baseline, 4D main, 64 high
            //   YY: constraint
            //   ZZ: level ID
            // Look for codecs higher than baseline and force downward.
            let profileLevelId = sdpLine.substr(sdpLine.indexOf("profile-level-id")+17,6);
            let profile = Number('0x'+profileLevelId.substr(0,2));
            let constraint = Number('0x'+profileLevelId.substr(2,2));
            let level = Number('0x'+profileLevelId.substr(4,2));
            if (profile > 0x42)
            {
              profile = 0x42;
              constraint = 0xE0;
              level = 0x1F;
            }
            if (constraint === 0x00)
            {
              constraint = 0xE0;
            }
            let newProfileLevelId = ("00" + profile.toString(16)).slice(-2).toLowerCase() +
              ("00" + constraint.toString(16)).slice(-2).toLowerCase() +
              ("00" + level.toString(16)).slice(-2).toLowerCase();
      
            sdpLine = sdpLine.replace(profileLevelId,newProfileLevelId);
          }
      
          sdpStrRet += sdpLine;
          sdpStrRet += '\r\n';
        }
        if (this.devMode) console.log("components/Video mungeSDPPlay", sdpStrRet);

        return sdpStrRet;  
      }

      
    onmessage = function (evt) {
        var { state } = this;

        if (this.devMode) console.log("components/Video onmessage", evt);

        var msgJSON = JSON.parse(evt.data);

        var msgStatus = Number(msgJSON['status']);
        var msgCommand = msgJSON['command'];

        let statusInfo = '';
        state.retryCount++;

        if (msgStatus != 200) //missing (usually 502)
        {
            //502: stream not live

            //always retry:
             //502: Live stream is not running
            //504: waiting for stream
            //514: repeater stream not ready

            statusInfo = msgJSON['statusDescription'];

            //retry if reported as available
            if (state.available && ( msgStatus === 504 || msgStatus === 514 || (state.retryCount < state.autoRetries && this.props.config.videoAutoPlay === '1'))) {

                if (this.wsConnection.readyState == 1) {
                    if (this.devMode) console.log("components/Video onmessage - Not ready: scheduling sendPlayOffer", msgStatus, statusInfo);

                    setTimeout(this.sendPlayOffer.bind(this), 1500);
                    statusInfo = statusInfo + ' (retry #' + state.retryCount + ')';
                    this.setState({ buttonDisabled: true, buttonContent: "Auto Retry", statusInfo: statusInfo, connecting: true, connected: false });
                }
                else {
                    console.log("components/Video onmessage - wsConnection Not open for sendPlayOffer wsConnection.readyState:", this.wsConnection.readyState);
                    this.setState({ buttonDisabled: false, buttonContent: "Retry", statusInfo: statusInfo, connecting: false, connected: false });
                }

            }
            else {
                //stop
                this.stopStreamPlay();
            }

            this.setState({ 'statusInfo': statusInfo });

        }
        else {
            //msgStatus == 200
            //jQuery("#sdpDataTag").html("");
           if (this.devMode) console.log('components/Video onmessage 200 msgJSON', msgJSON);

            var streamInfoResponse = msgJSON['streamInfo'];
            if (streamInfoResponse !== undefined) {

                this.streamInfo.sessionId = streamInfoResponse.sessionId;
            }

            var sdpData = msgJSON['sdp'];
            if (sdpData !== undefined) {
                if (this.devMode) console.log('components/Video onmessage: setRemoteDescription sdp: ' + JSON.stringify(msgJSON['sdp']));


                msgJSON.sdp.sdp = this.mungeSDPPlay(msgJSON.sdp.sdp);
                //console.log('gotDescription: enhanceSDP: '+JSON.stringify({'sdp': msgJSON.sdp}));

                this.peerConnection.setRemoteDescription(msgJSON.sdp).then(this.peerCreateAnswer.bind(this)).catch(this.errorHandler.bind(this));
                /*
                                this.peerConnection.setRemoteDescription(new RTCSessionDescription(msgJSON.sdp), 
                              //  this.peerCreateAnswer.bind(this)
                              () => {
                                console.log('components/Video setRemoteDescription answer !!!');
                                this.this.peerConnection.createAnswer(this.gotDescription.bind(this), this.errorHandler.bind(this));
                                    }
                                , this.errorHandler);*/
            }

            var iceCandidates = msgJSON['iceCandidates'];
            //       console.log('msgJSON iceCandidates: ', iceCandidates);

            if (iceCandidates !== undefined) {
                for (var index in iceCandidates) {
                    if (this.devMode) console.log('addIceCandidate: ' + JSON.stringify(iceCandidates[index]));

                    //peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidates[index]));	
                    this.peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidates[index])).then(() => this.onAddIceCandidateSuccess(this.peerConnection), err => this.onAddIceCandidateError(this.peerConnection, err));

                }
            }


        
        //release wss after getting message
        if ('sendResponse'.localeCompare(msgCommand) == 0) {
            if (this.wsConnection) if (this.wsConnection.readyState < 2) this.wsConnection.close();
        }

        }


    }

    peerCreateAnswer() {
        const { state } = this;
        if (this.devMode) console.log('components/Video peerCreateAnswer');
        //   this.peerConnection.createAnswer(this.gotDescription.bind(this), this.errorHandler);
        this.peerConnection.createAnswer().then(this.gotDescription.bind(this)).catch(this.errorHandler.bind(this));
    }

    errorHandler(error) {
        console.log(error);
    }

    async icecandidate(pc, event)  //gotIceCandidate/onicecandidate
    {
        if (!event.candidate) 
        {
            if (this.devMode) console.log('components/Video icecandidate end (null event.candidate):', pc);
            return;
        }

        if (this.devMode) console.log('components/Video icecandidate (onicecandidate):', event);

        try {
          //  this.onAddIceCandidateSuccess(pc);

            if (this.serverVideowhisper) 
			{
                const message = { type: 'candidate', candidate: event.candidate, from: this.vwsPeerId, target: this.vwsPeerIdTarget };

                if (this.devMode) if (event.candidate.type !== 'relay') {
                    console.log('components/Video icecandidate: Ignoring non-relay candidate in devMode', event.candidate );
                    return;
                  } else console.log('components/Video icecandidate vwsSocket.emit("messagePeer"', message);

                this.vwsSocket.emit("messagePeer", message);
			}

        } catch (e) {
            this.onAddIceCandidateError(pc, e);
        }
    }

    onAddIceCandidateSuccess(pc) {
        if (this.devMode) console.log(`components/Video onAddIceCandidateSuccess success`,  pc);
    }

    onAddIceCandidateError(pc, error) {
        if (this.devMode) console.log(`components/Video onAddIceCandidateError failed to add ICE Candidate: ${error}`);
    }

    onnegotiationneeded() {
		if (this.devMode) console.log('components/Video peerConnection onnegotiationneeded');
	    //this.peerConnection.createOffer(this.offerOptions).then(this.gotDescription.bind(this), this.errorHandler);
	}

    onsignalingstatechange() //stateCallback2
    {
        if (!this._isMounted) return;

        let state;

        if (this.peerConnection) {
            state = this.peerConnection.signalingState;
            if (this.devMode) console.log(`components/Video onsignalingstatechange , state: ${state}`, this.retryTimeout);

            if (this.serverWowza)
            if (state == 'have-remote-offer' || state == 'stable') 
			{
				this.setState({ buttonDisabled: false, buttonContent: this.txt('Reload')});
				this.props.appStateUpdate({videoStatus: 'pending'});

                if (!this.retryIfTimeoutSet) 
                {
                    setTimeout( () => this.retryIfTimeout(), this.retryTimeout);
                    this.retryIfTimeoutSet = true;
                }
            }
            
            //jQuery("#sdpDataTag").html('Peer: ' + state);
        }
    }

    videoPlay() {
        //tries to play remoteVideo element
        const remoteVideo = this.remoteVideo.current;
        const { txt } = this;

        this.playStarted = false; //starting play

        if (remoteVideo) remoteVideo.play().then( accept => {
            if (this.devMode) console.log('components/Video Autoplay started accept/paused/src', accept, remoteVideo.paused, remoteVideo.src);
            this.playStarted = true;

            if (this.props.appState.muted) this.props.appStateUpdate({muted: false});

            if (this.state.connected) this.setState({ statusInfo: 'Streaming', settingsActive: false, buttonDisabled: false, buttonContent: txt('Reload'), connecting: false });
            else if (this.state.connecting) this.setState({ statusInfo: 'Preview. Connecting...', settingsActive: true, buttonDisabled: true, buttonContent: "Connecting" })
            else this.setState({ statusInfo: 'Preview', buttonDisabled: false, buttonContent: txt('Reload'), settingsActive: false });

        }, reject => {
            console.log('components/Video Autoplay reject:' + reject, reject, remoteVideo.src);
            //  Show UX element to let the user manually start playback
            this.setState({ statusInfo: 'Autoplay not available', settingsActive: true, buttonDisabled: false, buttonContent: txt('Tap to Play'), videoMuted: '', videoMutedMessage: '' });
        }).catch(error => {
            console.log('components/Video Autoplay error:' + error, error);
            //  Show UX element to let the user manually start playback
            this.setState({ statusInfo: 'Autoplay not available', settingsActive: true, buttonDisabled: false, buttonContent: txt('Tap to Play') });
        });

    }

    updatedConnection(connectionState)
    {
        //onconnectionstatechange/iceconnectionstatechange

        var { state, txt } = this;

        if (!state.connected) //connect?
        if (connectionState == "connected") {
            this.setState({ connected: true, connecting: false });
            this.videoPlay();
        }

        //retry
        if (state.connected) //disconnect?
        if (connectionState == "disconnected" || connectionState == "failed" || connectionState == "closed") {

            if (this.props.config.videoAutoPlay === '1')
            if (!state.retrying) {
                setTimeout(() => {
                    state.retrying = true;
                    this.stopStreamPlay();
                    this.startStreamPlay();
                    this.setState({ statusInfo: connectionState, buttonDisabled: true, buttonContent: txt("Auto Retry") });
                },
                    3300)
            }

            this.setState({ settingsActive: true, connected: false, connecting: false, buttonDisabled: false, buttonContent: txt('Reload') });
        }
    }

    onconnectionstatechange(e)
    {
		if (this.devMode) console.log('components/Video onconnectionstatechange', e);

        if (this.peerConnection) {
            let connectionState = this.peerConnection.connectionState;
            if (this.devMode) console.log("components/Video onconnectionstatechange:", connectionState);

            this.updatedConnection(connectionState);
        }
    }

    iceconnectionstatechange(pc, event) //onIceStateChange
    {

      //  const remoteVideo = this.remoteVideo.current;

        let iceState;
        if (pc) {
            iceState = pc.iceConnectionState;
            if (this.devMode) console.log(`components/Video iceconnectionstatechange: ${pc.iceConnectionState}`, event);
            this.updatedConnection(iceState);
        }
    }


    track(event) 
    {
        //recive track from peer connection
        const { state } = this; 
        var remoteVideo = this.remoteVideo.current;

        if (this.devMode) console.log('components/Video peer track (gotRemoteTrack) kind:' + event.track.kind + ' stream:' + event.streams[0]);

        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            if (this.devMode) console.log('components/Video peer track: playback peer received new remote stream', event);
        }

    }

    sendPlayOffer() {

        if (this.devMode) console.log("components/Video sendPlayOffer");
        
        if (this.state.connected && this.playStarted)  if (this.devMode) console.log("components/Video sendPlayOffer: playStarted skip");
        
        if (this.serverVideowhisper)
        {
            //create offer to play
            if (this.peerConnection) this.peerConnection.createAnswer().then(this.gotDescription.bind(this)).catch(this.errorHandler.bind(this));
            else console.log("components/Video sendPlayOffer: peerConnection not available");
        }

        if (this.serverWowza)
        {
            //send play message
        if (this.wsConnection) 
        if (this.wsConnection.readyState == 1) 
        {
        this.wsConnection.send('{"direction":"play", "command":"getOffer", "streamInfo":' + JSON.stringify(this.streamInfo) + ', "userData":' + JSON.stringify(this.userData) + '}');
        this.setState({ statusInfo: 'Starting Playback', settingsActive: false, buttonDisabled: false, buttonContent: this.txt('Reload'), gotVideo: false, gotAudio: false });
        }
        else {
            console.log("components/Video sendPlayOffer wsConnection not ready to .send", this.wsConnection);
            this.setState({ statusInfo: 'Not Ready', settingsActive: true, buttonDisabled: false, buttonContent: this.txt('Reload'), gotVideo: false, gotAudio: false });
        }

        if (!this.retryIfTimeoutSet)
        {
            setTimeout( () => this.retryIfTimeout(), this.retryTimeout);
            this.retryIfTimeoutSet = true;
        }

        }
    }

    startStreamPlay() {
        this.vwsRetryBlocked = false;
        const { props } = this;
        
        this.devMode = this.props.appState.devMode;
        if (this.devMode) console.log('components/Video startStreamPlay');

        this.state.retryCount = 0;
        this.wsWaited = 0;

        this.state.connecting = true;

        let serverType = props.config.serverType;
		if (props.room.serverType) serverType = props.room.serverType;

        if ( serverType == 'videowhisper' ) 
		{
			this.serverVideowhisper = true;
			this.vwsConnect();
		}
		else 
		{
			this.serverWowza = true;
			this.wsConnect();
		}

        this.timerStart();
    }

    stopStreamPlay() {
        if (this.vwsAuthRequest) this.vwsAuthRequest.abort();
        this.vwsAuthRequest = null;
        if (this.devMode) console.log("components/Video stopStreamPlay");

        this.timerStop();

        var remoteVideo = this.remoteVideo.current;

        var { props } = this;

        if (this.peerConnection) this.peerConnection.close();
        this.peerConnection = null;

        if (this.wsConnection) if (this.wsConnection.readyState < 2) this.wsConnection.close();
       // this.wsConnection = null;

        if (this.vwsSocket) this.vwsSocket.disconnect();

        if (remoteVideo) remoteVideo.srcObject = null;
        if (remoteVideo) if (remoteVideo.src != props.room.videoOffline || !props.room.videoOffline) remoteVideo.src = ""; // this seems like a chrome bug - if set to null it will make HTTP request
        //remoteVideo.srcObject = null; //2

        //play offline video
        // if (props.room.videoOffline) if (remoteVideo.src != props.room.videoOffline) remoteVideo.src = props.room.videoOffline;

        this.setState({ buttonDisabled: false, buttonContent: this.txt('Reload'), connecting: false, connected: false, gotVideo: false, gotAudio: false});
        this.playStarted = false;
    }


    gotDescription(description) {
        if (this.devMode)  console.log('components/Video gotDescription', description);

        this.peerConnection.setLocalDescription(description)
            .then(
                () => {
                    
                    if (this.serverWowza) if (this.wsConnection.readyState == 1 ) this.wsConnection.send('{"direction":"play", "command":"sendResponse", "streamInfo":' + JSON.stringify(this.streamInfo) + ', "sdp":' + JSON.stringify(description) + ', "userData":' + JSON.stringify(this.userData) + '}');
                    else console.log("components/Video gotDescription: wsConnection not ready to .send", this.wsConnection);

                    if (this.serverVideowhisper) 
                    {
                        const message = { 'from': this.vwsPeerId, 'target': this.vwsPeerIdTarget, 'type': 'answer', 'content': description };
						if (this.devMode) console.log('components/Video gotDescription > vwsSocket.emit answer after setLocalDescription ', message, this.vwsSocket);
						this.vwsSocket.emit("messagePeer", message );
                    }
                }
            )
            .catch(
                (e) => { console.log('components/Video gotDescription, setLocalDescription error', e) }
            );


    }



}
