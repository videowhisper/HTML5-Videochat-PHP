//Camera + Microphone
import React, { Component } from 'react';

import { Label, Dropdown, Form, Button, Icon } from 'semantic-ui-react'
import PropTypes from 'prop-types';

import Panel from './Panel';

import adapter from 'webrtc-adapter';

import { io } from "socket.io-client";
import { requestSocketAuth, socketSessionKey, socketStreamName } from "../services/socketAuth";

import sdpTransform from 'sdp-transform';


export default class Camera extends Panel {
	//camera
	_isMounted = false;

	static propTypes = {
		appState: PropTypes.object.isRequired,

		config: PropTypes.object.isRequired,
		room: PropTypes.object.isRequired,
		user: PropTypes.object.isRequired,

		serverUpdate: PropTypes.func.isRequired,
		appStateUpdate: PropTypes.func.isRequired,

		cameraConfig: PropTypes.object, //not .isRequired
	};

	constructor(props) {
		super(props);

		this.devMode = props.appState.devMode;

		if (this.devMode) console.log('components/Camera constructor', props);

		this.serverVideowhisper = false;
		this.serverWowza = false;

		this.audioInterface = false; // audio only interface
		if (props.cameraConfig) this.audioInterface = props.cameraConfig.audioInterface;

		this.tChecked = false;

		this.retriesLeft = 5;
        this.retryTimeout = 5500;
        this.retryIfTimeoutSet = false;
		this.retryIfBusy = true;

		this.wsConnection = null;
		this.peerConnection = null;
		//https://stackoverflow.com/questions/31003928/what-do-each-of-these-experimental-goog-rtcpeerconnectionconstraints-do

		this.peerConnectionConfig = { 'iceServers': [], 
		optional: [{ "googSuspendBelowMinBitrate": false, "googImprovedWifiBwe": true}] 
		};

		this.vwsPeerConfig = this.peerConnectionConfig;

		this.localStream = null;

		this.streamInfo = null;
		this.userData = null;

		this.SDPOutput = {};
		this.offerOptions = {
			offerToReceiveAudio: 1,
			offerToReceiveVideo: 1,
		};

		this.localVideo = React.createRef();

        this.stats = {
            video: { timestamp: 0, bandwidth: 0, bitrate: 0, packetsLost: 0, qualityLimitationReason : 'none' },
            audio: { timestamp: 0, bandwidth: 0, bitrate: 0, packetsLost: 0}
        };

		this.videoIndex = -1;
		this.audioIndex = -1;

		this.changedBy = '';

		this.enhanceData = {};

		this.tWarn = '';
		//https://developers.google.com/media/vp9/settings/vod#recommended_settings //30fps
		this.resolutions = {
			"4K": {
				"label": "4K",
				"width": 3840,
				"height": 2160,
				"ratio": "16:9",
				"bitrate": 16000, //30000
			},
			"1440p": {
				"label": "1440p",
				"width": 2560,
				"height": 1440,
				"ratio": "16:9",
				"bitrate": 6000, //15000
			},
			"1080p": {
				"label": "1080p",
				"width": 1920,
				"height": 1080,
				"ratio": "16:9",
				"bitrate": 4000, //5000
			},
			"720p": {
				"label": "720p",
				"width": 1280,
				"height": 720,
				"ratio": "16:9",
				"bitrate": 1600, //3000
			},
			"SVGA": {
				"label": "SVGA",
				"width": 800,
				"height": 600,
				"ratio": "4:3",
				"bitrate": 800, //2500
			},
			"480p": {
				"label": "480p",
				"width": 854,
				"height": 480,
				"ratio": "16:9",
				"bitrate": 800, //2500
			},
			"VGA": {
				"label": "VGA",
				"width": 640,
				"height": 480,
				"ratio": "4:3",
				"bitrate": 600, //1200
			},
			"360p": {
				"label": "360p",
				"width": 640,
				"height": 360,
				"ratio": "16:9",
				"bitrate": 500, //500
			},
			"240p": {
				"label": "240p",
				"width": 426,
				"height": 240,
				"ratio": "16:9",
				"bitrate": 300, //300
			},
			"CIF": {
				"label": "CIF",
				"width": 352,
				"height": 288,
				"ratio": "4:3",
				"bitrate": 200, //200
			},
			"QVGA": {
				"label": "QVGA",
				"width": 320,
				"height": 240,
				"ratio": "4:3",
				"bitrate": 180, //180
			}
			,
			"180p": {
				"label": "180p",
				"width": 320,
				"height": 180,
				"ratio": "16:9",
				"bitrate": 160, //160
			},
			"90p": {
				"label": "90p",
				"width": 160,
				"height": 90,
				"ratio": "16:9",
				"bitrate": 100, //100
			}
		};

		this.state = {

			screenShare: false,
		
			audioOn: true,
			videoOn: true,

			hasError: false,
			errorMessage: 'Check JS console.',

			packetLoss: false,

			revealed: true,

			tapRequired: false,

			connected: false,
			connecting: false,

			settingsActive: false,

			statusInfo: 'Connecting...',
			buttonContent: 'Connecting',
			buttonDisabled: true,

			bitrateInfo: (<><Icon name="eye slash" />Detecting</>),

			videoWidth: 640,
			videoHeight: 360,
			videoAspectRatio: 1.73,

			camera: null,
			cameraOptions: [],
			videoSource: null,

			microphone: null,
			microphoneOptions: [],
			audioSource: null,

			maxBitrate: 750, //demo default
			maxResolutionHeight: 360, //demo default
			maxFrameRate: 15, //demo default

			bitrate: 500, //default
			audioBitrate: 48, //default (demo limited to 32)
			bitrateOptions: [{key: 500, value: 500, text: '500 kbps'}],
			frameRateOptions: [{key: 10, value: 10, text: '10 fps'}],

			frameRate: 15, //default

			resolution: '360p',
			resolutionOptions: [],
			
		};

		this.onChange = this.onChange.bind(this);
	}

	// Helper function to get button size based on mobile/desktop state
	getButtonSize = () => {
		return this.props.appState.isMobile || this.props.appState.minMode ? "tiny" : "small";
	}

	static getDerivedStateFromError(error) {    
		// Update state so the next render will show the fallback UI.    
		console.log('components/Camera getDerivedStateFromError', error);
		return { hasError: true , errorMessage: error.toString() };  
	}

	componentDidCatch(error, errorInfo) {    
		// You can also log the error to an error reporting service    
		console.log('components/Camera componentDidCatch', error, errorInfo);
	}

	componentDidMount() {
	
		if (this.devMode) console.log('components/Camera componentDidMount');
		this._isMounted = true;

		super.componentDidMount();
		this.interfaceReady();
	}

	componentWillUnmount() {

		if (this.devMode) console.log('components/Camera componentWillUnmount');
		
		this.stopSnapshots();

		this.props.serverUpdate({ task: 'media', connected: false });

		this._isMounted = false;

		this.stopPublisher();

		if (this.vwsSocket) this.vwsSocket.disconnect(); //disconnect from vws socket

		var { state } = this;
		if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());

		super.componentWillUnmount();
	}


    componentDidUpdate(prevProps) {
        if (socketSessionKey(prevProps) === socketSessionKey(this.props)) return;
        const resume = this.serverVideowhisper && this.localStream && (this.state.connected || this.state.connecting || this.vwsPublish);
        this.stopPublisher();
        if (this.vwsSocket) { this.vwsSocket.removeAllListeners(); this.vwsSocket.disconnect(); this.vwsSocket = null; }
        this.setState({ connected: false, connecting: !!resume });
        if (resume) this.startPublisher();
    }

	//Timer to update stats
	timerStart() {
		this.stats['video'].bitrate = 0;
		this.stats['audio'].bitrate = 0;

		this.stats['video'].packetsLost = 0;
		this.stats['audio'].packetsLost = 0;

		this.stats['video'].qualityLimitationReason = 'none';

		this.timer = setInterval(this.timerTick.bind(this), 2500);

		this.setState({packetLoss: false});
	}

	timerStop() {
		clearInterval(this.timer);

		this.setState({packetLoss: false});
	}

	timerTick() {

		var streamChanged = 0;
		if (this.state.connected)  if (this.streamInfo) if (this.streamInfo.streamName != this.props.room.streamBroadcast) streamChanged = 1;

	 // publish/republish required
	 if (this.props.appState.publishRequired || streamChanged) 
	 if (this.state.connected || this.props.config.cameraAutoBroadcast  == '1')
	 {

			if (this.devMode) console.log('components/Camera timerTick publishRequired', this.props.appState.publishRequired, streamChanged, this.streamInfo );

				this.props.appStateUpdate({publishRequired: false});

				this.setState({ buttonDisabled: true, buttonContent: this.txt("Closing") });
				this.stopPublisher();

				//restart required
				if (this.serverVideowhisper) if (this.vwsSocket) if (this.vwsSocket.connected) this.vwsSocket.disconnect(); //disconnect from vws socket

				this.setState({ buttonDisabled: true, buttonContent: this.txt("Restarting Broadcast"), statusInfo: this.txt("Restarting Broadcast"),  connecting: true, connected: false });
				this.buildStream(); //builds stream and publishes

	 }

	 if (this.serverVideowhisper)
	 {
			 
		if (this.state.settingsActive || this.audioInterface) 
		{
			this.connectionInfo = (<> <Icon name="broken chain" />Socket Not Connected</>);
			if (this.wsConnection) this.connectionInfo = (<> <Icon name="chain" />{this.wsConnection.readyState}</>);
			if (this.vwsSocket) this.connectionInfo = (<> <Icon name={this.vwsSocket.connected? "chain" : "unlink"} /> </>);
	
			this.peerInfo = (<> <Icon name="play circle" />{this.vwsChannel}: {Object.keys(this.vwsPeers || {}).length} Peers</>);
			
			this.bitrateInfo = (<>{this.connectionInfo} {this.peerInfo}</>);
   
			this.setState({ 'bitrateInfo': this.bitrateInfo  });
		}

	 }
		//get stats
		if (!this.state.connected) return;
		if (!this.peerConnection) return;

		//getStats for all tracks
		this.peerConnection.getSenders().forEach(track => {
			track.getStats().then(res => {
				res.forEach(report => {

					//	if (this.devMode) console.log('components/Camera timerTick report', report);


					//audio/video
					var kind = report.kind;
					if (kind === undefined) kind = report.mediaType; //Safari
					if (!kind) return;
					
					if (this.devMode)  if (report.packetsLost>0) console.log('components/Camera packetsLost ', report.packetsLost, kind, report); //remote-inbound-rtp

					//measure packet loss for sent stream (remote)
					if (report.type == 'remote-inbound-rtp') 
					{

						if (!this.stats[kind]) this.stats[kind] = {};
						this.stats[kind].packetsLost = report.packetsLost;
						this.stats[kind].roundTripTime = report.roundTripTime;
						this.stats[kind].jitter = report.jitter;

						this.stats[kind].timestampRemote = report.timestamp;
					}

					if (report.type !== 'outbound-rtp') return;
					if (report.isRemote) return;

					if (kind !== 'video' && kind !== 'audio') return;

					//	if (this.devMode) console.log('components/Camera timerTick report', report);


					var deltaTimestamp = report.timestamp - this.stats[kind].timestamp;

					if (deltaTimestamp > 0 && deltaTimestamp < 6000) //max between samples
						if (report.bytesSent >= this.stats[kind].bytesSent) //should be more
						{
							this.stats[kind].bitrate = (report.bytesSent - this.stats[kind].bytesSent) * 8 / deltaTimestamp;
						}

					//update
					this.stats[kind].timestamp = report.timestamp;
					this.stats[kind].bytesSent = report.bytesSent;
					this.stats[kind].qualityLimitationReason = report.qualityLimitationReason;

				});
			});

		});

		var codeVideo = '';
		
		if (!this.audioInterface && !this.props.room.audioOnly && !this.props.appState.audioMode && !(this.props.appState.screen=='Way2Screen' && this.props.appState.revealMode && !this.props.appState.revealed)) codeVideo = (<>
							<Icon name="video camera" />{Math.round(this.stats['video'].bitrate)} kbps 
							{(this.stats['video'].qualityLimitationReason !== 'none' && this.stats['video'].qualityLimitationReason !== undefined) ? '(limited: ' + this.stats['video'].qualityLimitationReason + ')' : ''} 
							{ (this.stats['video'].roundTripTime) > 0 ? (<> <Icon name="clock" />{this.stats['video'].roundTripTime} </>): '' }
							{ (this.stats['video'].jitter > 0) ? (<> <Icon name="circle notch" />{Math.round((this.stats['video'].jitter + Number.EPSILON) * 1000) / 1000} jitter </>) : ''}
							{ (this.stats['video'].packetsLost) > 0 ? (<> <Icon name="exclamation circle" />{this.stats['video'].packetsLost} packets lost </>)  : '' }
							{<> <Icon name="expand" />{this.state.videoWidth}x{this.state.videoHeight} </>}	
							<br />	
		</>);

		this.connectionInfo = (<> <Icon name="broken chain" />Socket Not Connected</>);
		if (this.wsConnection) this.connectionInfo = (<> <Icon name="chain" />{this.wsConnection.readyState}</>);
		if (this.vwsSocket) this.connectionInfo = (<> <Icon name={this.vwsSocket.connected? "chain" : "unlink"} /> </>);

		this.peerInfo = (<> <Icon name="stop circle" />Peer Not Connected</>);
		if (this.peerConnection) this.peerInfo = (<> <Icon name="play circle" />{this.peerConnection.connectionState}/{this.peerConnection.iceConnectionState}/{this.peerConnection.iceGatheringState}/{this.peerConnection.signalingState}</>);

		var bitrateInfo = (<><Icon name="wait" />Measuring...</>);

		var streamName = "";
		if(this.streamInfo) if (this.streamInfo.streamName) streamName = this.streamInfo.streamName.split("?")[0];

		if (this.stats['video'].bitrate > 0 || this.stats['audio'].bitrate > 0)
			 bitrateInfo = (<div>
				<Icon name='user' /> {streamName} <br />
				 {codeVideo}
				<Icon name='microphone' />{Math.round(this.stats['audio'].bitrate)} kbps 
				{(this.stats['audio'].qualityLimitationReason !== 'none' && this.stats['audio'].qualityLimitationReason !== undefined) ? '(limited: ' + this.stats['audio'].qualityLimitationReason + ')' : ''} 
							{ (this.stats['audio'].roundTripTime) > 0 ? (<> <Icon name="clock" />{this.stats['audio'].roundTripTime} </>): '' }
							{ (this.stats['audio'].jitter > 0) ? (<> <Icon name="circle notch" />{Math.round((this.stats['audio'].jitter + Number.EPSILON) * 1000) / 1000} jitter </>) : ''}
							{ (this.stats['audio'].packetsLost) > 0 ? (<> <Icon name="exclamation circle" />{this.stats['audio'].packetsLost} packets lost </>)  : '' }
				<br />{this.connectionInfo} {this.peerInfo}
		</div>
			);

		if (this.state.settingsActive || this.audioInterface) this.setState({ 'bitrateInfo': bitrateInfo  });

		//warn about packet loss
		if (this.stats['audio'].packetsLost || this.stats['video'].packetsLost)
		if (!this.state.packetLoss) this.setState({packetLoss: true});
	}



	render() {

		if (this.state.hasError) {      
			// You can render any custom fallback UI      
			return <h1>Something went wrong: {this.state.errorMessage} </h1>;   
		}

		const { state, props, onChange } = this;
        this.devMode = props.appState.devMode; //also update devMode on rendering updates
	

		//
		var videoStyle = {};

		if (!this.audioInterface) 
		{
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
		//console.log('components/Camera render', videoWidth, videoHeight, state);

		var tapButton = "";
		if (state.tapRequired) tapButton = (
			<Form.Field><Button inverted name="tap" content="Tap to Show" onClick={this.onClick.bind(this)} />
				<Label pointing='left' color='black'>Gesture is required to show preview</Label>
			</Form.Field>
		);

		var codeScreen = '';
		var codeCamera = '';
		var codeVideo = '';
		var streamIcon = 'microphone';

		if (!this.audioInterface && !props.room.audioOnly && !props.appState.audioMode && !(props.appState.screen=='Way2Screen' && props.appState.revealMode && !props.appState.revealed))
		{
			streamIcon = 'video';

			if (typeof navigator.mediaDevices.getDisplayMedia === "function") //toggle screen sharing
			codeScreen = (
			<Form.Field inline><Button compact inverted={props.appState.darkMode} size='small' name="screenShare" content={this.txt('Screen Share')} onClick={this.onClick.bind(this)} /> {state.videoSource == '_screen' ? <Icon color="green" name="eye" /> : ''}
			</Form.Field> )

			if (!state.screenShare) //hide camera when screen sharing
			codeCamera = (
			<Form.Field><Dropdown upward compact className="inverted tiny v-select" name="camera" value={state.camera} placeholder='Camera' selection onChange={this.onChange} options={state.cameraOptions} /> {state.videoSource == state.camera && state.videoSource != '_disabled' ? <Icon color="green" name="eye" /> : ''} </Form.Field>
			);

		
			codeVideo = ( <>
				<Form.Field><Dropdown upward compact className="inverted tiny v-select" name="resolution" value={state.resolution} onChange={onChange} placeholder='Video Resolution' selection options={state.resolutionOptions} /></Form.Field>

				<Form.Field><Dropdown upward compact className="inverted tiny v-select" name="bitrate" value={state.bitrate} onChange={onChange} placeholder='Video Bitrate' selection options={state.bitrateOptions} /></Form.Field>

				<Form.Field><Dropdown upward compact className="inverted tiny v-select" name="frameRate" value={state.frameRate} onChange={onChange} placeholder='Video Frame Rate' selection options={state.frameRateOptions} /></Form.Field>
				</>);
		}

		if (!this.tChecked) this.updateBitrates(); //only until with checked

		var controlSettings = "";
		if (state.settingsActive)
		{
			this.connectionInfo = (<> <Icon name="broken chain" />Socket Not Connected</>);
			if (this.wsConnection) this.connectionInfo = (<> <Icon name="chain" />{this.wsConnection.readyState}</>);
	
			this.peerInfo = (<> <Icon name="stop circle" />Peer Not Connected</>);
			if (this.peerConnection) this.peerInfo = (<> <Icon name="play circle" />{this.peerConnection.connectionState}/{this.peerConnection.iceConnectionState}/{this.peerConnection.iceGatheringState}/{this.peerConnection.signalingState}</>);
	
			// Use centralized mobile detection from appState
			const isMobile = props.appState.isMobile;
			
			if (isMobile) {
				// Mobile compact layout - group controls horizontally
				controlSettings = (
					<div className="controlsBottom vwsCameraControls vwsCameraControlsMobile">
						<Label size='tiny' color='black'>{this.tWarn}</Label>
						
						{/* Top row: Screen Share + Camera */}
						<div className="vwsControlRow">
							{codeScreen}
							{codeCamera}
						</div>
						
						{/* Middle row: Microphone + Video settings */}
						<div className="vwsControlRow">
							<Form.Field><Dropdown upward compact key="microphone" className="inverted tiny v-select" name="microphone" value={state.microphone} onChange={this.onChange} placeholder='Microphone' selection options={state.microphoneOptions} /></Form.Field>
							{codeVideo}
						</div>
						
						{/* Bottom row: Broadcast button */}
						<div className="vwsControlRow">
							<Form.Field><Button compact inverted name="broadcast" content={state.buttonContent} onClick={this.onClick.bind(this)} disabled={state.buttonDisabled} />
								<Label pointing='left' color='black'>{state.statusInfo}</Label>
							</Form.Field>
							{tapButton}
						</div>
						
						<Label color='black'>{state.connected ? state.bitrateInfo : (<><Icon name={(streamIcon=='microphone'?'microphone':'eye') + ' slash'} />Not Broadcasting {this.connectionInfo} {this.peerInfo} </>)}</Label>
					</div>
				);
			} else {
				// Desktop layout - original vertical layout
				controlSettings = (
					<div className="controlsBottom vwsCameraControls">
						<Label size='tiny' color='black'>{this.tWarn}</Label>
						{codeScreen}
						{codeCamera}
						<Form.Field><Dropdown upward compact key="microphone" className="inverted tiny v-select" name="microphone" value={state.microphone} onChange={this.onChange} placeholder='Microphone' selection options={state.microphoneOptions} /></Form.Field>

						{codeVideo}
						<Form.Field><Button compact inverted name="broadcast" content={state.buttonContent} onClick={this.onClick.bind(this)} disabled={state.buttonDisabled} />
				<Label pointing='left' color='black'>{state.statusInfo}</Label>
						</Form.Field>
						{tapButton}
				<Label color='black'>{state.connected ? state.bitrateInfo : (<><Icon name={(streamIcon=='microphone'?'microphone':'eye') + ' slash'} />Not Broadcasting {this.connectionInfo} {this.peerInfo} </>)}</Label>
					</div>
				);
			}
		} 
		else if (this.tWarn.length>0) controlSettings = (<div className="controlsBottom"><Label size='tiny' pointing='left' color='black'>{this.tWarn}</Label></div>);


		var warnIcon = '';
		if (state.packetLoss) warnIcon = (<span data-tooltip={this.txt('Packet Loss: Upload Connection Issue')} data-position="left center"><Icon inverted name="exclamation circle" size='large'  /></span>);

		var statusIcon = (<Icon inverted color='black' name={(streamIcon=='microphone'?'microphone':'eye') + ' slash'} size='large' />);
		if (state.connecting) statusIcon = (<Icon inverted loading name='spinner' size='large' />);
		if (state.connected) statusIcon = (<Icon inverted name={streamIcon} size='large' />);
		
		//toggle buttons
		var audioButton = (<Button compact name="audioToggle" size={this.getButtonSize()} inverted icon toggle active={state.audioOn} onClick={this.onClick.bind(this)} data-tooltip={state.audioOn?this.txt('Mute Microphone'):this.txt('Enable Microphone')} data-position="left center"> <Icon name='microphone' /></Button>);
		var videoButton = (<Button compact name="videoToggle" size={this.getButtonSize()} inverted icon toggle active={state.videoOn} onClick={this.onClick.bind(this)} data-tooltip={state.videoOn?this.txt('Hide Camera'):this.txt('Enable Camera')} data-position="left center"><Icon name='video' /></Button>);
		if (streamIcon=='microphone') videoButton = '';

		if (!this.audioInterface)
		return (
			<div className="panel vwsCamera" ref={container => (this.state.container = container)}>

				<div className="backgroundVideo">
					<video poster={props.config.cameraSnapshot?props.config.cameraSnapshot:props.room.snapshot} style={videoStyle} id="localVideo" ref={this.localVideo} className="localVideo" autoPlay playsInline muted
						onLoadedMetadata={() => {
							this.updateVideoSize('loadedmetadata');
							this.videoPlay();
						}}
					>

					</video>
				</div>

				<div className="controlsIcons">
					{warnIcon}
					{statusIcon}
					{audioButton}
					{videoButton}
					<Button compact name="settings" size={this.getButtonSize()} inverted icon toggle active={state.settingsActive} onClick={this.onClick.bind(this)} data-tooltip="Toggle Controls" data-position="left center">
						<Icon name='settings' />
					</Button>
				</div>

				{controlSettings}

			</div>
		);
		else return(

			<div className="panel vwsMicrophone" style={{ backgroundColor: props.appState.backgroundColor }} ref={container => (this.state.container = container)}>

			<Form>
			<Form.Group inline>

			<Form.Field inline><Icon inverted={props.appState.darkMode} name='microphone'/></Form.Field>

			<Form.Field inline><Button compact inverted={props.appState.darkMode} size='small' name="broadcast" content={state.buttonContent} onClick={this.onClick.bind(this)} disabled={state.buttonDisabled} />
			</Form.Field>

			<Form.Field inline><Dropdown compact className={`v-select ${props.appState.className}`} size='small' key="microphone" name="microphone" value={state.microphone} onChange={this.onChange} placeholder='Microphone' selection options={state.microphoneOptions} />
			</Form.Field>
			<Form.Field inline><Label pointing='left' color={props.appState.darkMode?'black':'grey'}>{state.statusInfo}</Label></Form.Field>

			<Form.Field inline>{warnIcon}</Form.Field>

			<Form.Field inline><Label size='tiny'>{state.connected ? state.bitrateInfo : (<><Icon name={(streamIcon=='microphone'?'microphone':'eye') + ' slash'} />Not Broadcasting {this.connectionInfo} {this.peerInfo} </>)}</Label></Form.Field>

			</Form.Group>
			</Form>
	
		  </div>
		)
	
	} 

	onChange(e, { name, value }) {

		if (this.state[name] === value) return; // not changed

		//changed controls
		this.setState({
			[name]: value
		}, () => {
			this.changedBy = name;

			if (this.devMode) console.log('components/Camera onChange', name, value, e);

			navigator.mediaDevices.enumerateDevices().then(this.gotDevicesPublish.bind(this)).catch(this.handleError.bind(this));	//updates devices (with new selection) and publishes
		});

		/*
		 if (name === 'bitrate') if (this.state.connected) 
		 {
			 this.changeBandwidth(value);
			 return;
		 }
		 */

	}

	onClick(e, { name, value }) {

		const {txt, props, state} = this;

		if (this.devMode) console.log('components/Camera onClick', name, value, e);

		if (name === 'screenShare')
		{
			if (!state.screenShare) this.setState({videoSource: '_screen', screenShare: true}, () => this.buildStream() );
			else this.setState({videoSource: state.camera, screenShare: false }, () => this.buildStream() );
		}

		if (name === 'tap') {
			this.videoPlay();
		}

		if (name === 'audioToggle')
		{
			this.setState({audioOn: !state.audioOn}, () => this.buildStream());
		}

		if (name === 'videoToggle')
		{
			this.setState({videoOn: !state.videoOn}, () => this.buildStream());
		}

		if (name === 'broadcast')
			switch (this.state.buttonContent) {
				case txt("Broadcast"):
					this.retriesLeft = 5;
					this.setState({ buttonDisabled: true, buttonContent: txt("Starting Broadcast"), statusInfo: txt("Starting Broadcast"), connecting: true, connected: false });
					this.buildStream(); //builds stream and publishes		
					break;

				case txt("Stop Broadcast"):
					this.retriesLeft = 0;
					this.setState({ buttonDisabled: true, buttonContent: txt("Ending"), statusInfo: txt("Ending") });
					//this.setState({ buttonDisabled: false, buttonContent: txt("Broadcast"), statusInfo: "Stopped Broadcast", connecting: false, connected: false });
					this.stopPublisher();
					this.setState({ buttonDisabled: false, buttonContent: txt("Broadcast"), statusInfo: txt("Stopped Broadcast"), connecting: false, connected: false });

					//notify
					props.serverUpdate({ task: 'media', connected: false });
					props.appStateUpdate({cameraStatus: 'off'});
					this.stopSnapshots();

					break;
			}

		super.onClick(e, { name, value });
	}

	retryIfTimeout()
	{	
		if (this.devMode)
		{
			console.log('components/Camera retryIfTimeout skipped on devMode');
			this.retryIfTimeoutSet = false;
			return;
		}
		
	
		//retry if did not connect
		if (!this.state.connected) 	if (this.retriesLeft > 0)
		{	
			this.retriesLeft --;
			this.stopPublisher();
			this.setState({ buttonDisabled: true, buttonContent: this.txt("Auto Retry"), statusInfo:this.txt("Auto Retry"), connecting: true, connected: false });
			this.buildStream(); 	
		}

		//completed
		this.retryIfTimeoutSet = false;
	}

	bitrateOptions = (recommendedBitrate) => {
		var options = [];

		options.push({
			key: 'bitrate-title',
			text: (
				<span>
					<strong>Video Bitrate</strong> {this.state.maxBitrate?' <' + this.state.maxBitrate +'kbps':''}
			  </span>
			),
			disabled: true,
		})

		var maxBitrate = this.state.maxBitrate;

		var multipliers = [ 
			{value: 0.35, label: 'Very Low'}, 
			{value: 0.5, label: 'Low'}, 
			{value: 0.75, label: 'Medium'}, 
			{value: 1, label: 'Good'}, 
			{value: 1.25, label: 'High'}, 
			{value: 1.5, label: 'Very High'}
		];

		let limitIncluded = false;
		multipliers.forEach(multi => {

			var mBitrate = Math.round(multi.value * recommendedBitrate);
			if (mBitrate === maxBitrate) limitIncluded = true;

			if (mBitrate <= maxBitrate)
				options.push({
					key: mBitrate,
					value: mBitrate,
					text: mBitrate + ' kbps ' + multi.label,
				});
		})

		if (options.length === 0 || (!limitIncluded && 1.5*recommendedBitrate > maxBitrate))
			options.push({
				key: maxBitrate,
				value: maxBitrate,
				text: maxBitrate + ' kbps Limit'
			});

		return options;
	}

	updateBitrates()
	{
		const {props} = this;
		
		this.bitrate = Number(props.config.bitrate);
		if (!this.bitrate ) this.bitrate  = 500; //defaut bitrate

		this.audioBitrate =  Number(this.props.config.audioBitrate);
		if (!this.audioBitrate) this.audioBitrate = 32; //default audio bitrate in demo

		this.resolutionHeight = Number(props.config.resolutionHeight);
		if (!this.resolutionHeight) this.resolutionHeight = 360; //default resolution

		this.videoBitrate = Number(props.config.videoBitrate);  //app config
		this.maxBitrate = Number(props.config.maxBitrate); // bitrate limit from server
		if (this.videoBitrate < this.maxBitrate) this.maxBitrate = this.videoBitrate; //configured lower
		
		if (!this.maxBitrate) this.maxBitrate = 0;

		this.maxResolutionHeight = Number(props.config.maxResolutionHeight); //app config
		if (!this.maxResolutionHeight) this.maxResolutionHeight = 0;

		this.frameRate = Number(props.config.frameRate);
		if (!this.frameRate) this.frameRate = 15;
		if (this.maxFrameRate < this.frameRate) this.frameRate = this.maxFrameRate;

		this.tWarn = '';

		//demo mode
		//if (props.appState.version != props.appState.modeVersion ) //activate modeVersion
		if ( !props.appState.checked  || (props.appState.checked && props.appState.mode.text) )
		{
			//limit
			if (this.resolutionHeight > 360) this.resolutionHeight = 360;
			if (this.bitrate > 750) this.bitrate = 750;

			if (this.maxResolutionHeight > 360) this.maxResolutionHeight = 360;
			if (!this.maxResolutionHeight) this.maxResolutionHeight = 360;

			if (this.maxBitrate > 750) this.maxBitrate = 750;
			if (!this.maxBitrate) this.maxBitrate = 750;

			if (this.maxFrameRate > 15) this.maxFrameRate = 15;
			if (!this.maxFrameRate) this.maxFrameRate = 15;
			if (!this.frameRate) this.frameRate = 15;
			if (this.frameRate > this.maxFrameRate) this.frameRate = this.maxFrameRate;

			if (this.bitrate > this.maxBitrate) this.bitrate = this.maxBitrate;
			if (this.resolutionHeight > this.maxResolutionHeight) this.resolutionHeight = this.maxResolutionHeight;

			if (this.audioBitrate > 32) this.audioBitrate = 32;

			this.tWarn = 'Demo Mode Configured: Broadcasting Resolution, Bitrate, FPS is Limited';
		}

		this.state.maxBitrate = this.maxBitrate;
		this.state.maxResolutionHeight = this.maxResolutionHeight;
		this.state.maxFrameRate = this.maxFrameRate;

		this.resolutionOptions = [{
			key: 'res-title',
			text: (
				<span>
					 <strong>{this.txt('Video Resolution')}</strong>{this.state.maxResolutionHeight ? ' <' + this.state.maxResolutionHeight +'p':''}
			  </span>
			),
			disabled: true,
		}];

		this.frameRateOptions = [{
			key: 'fps-title',
			text: (
				<span>
					 <strong>{this.txt('Video Frame Rate')}</strong>{this.state.maxFrameRate ? ' <' + this.state.maxFrameRate + this.txt('fps'):''}
			</span>
			),
			disabled: true,
		}];	

		if (this.resolutions)
			for (var key in this.resolutions)
				if (this.maxBitrate === 0 || this.resolutions[key]['bitrate'] * 0.35 <= this.maxBitrate) 
				if (this.maxResolutionHeight === 0 || this.resolutions[key]['height'] <= this.maxResolutionHeight)
				{
					this.resolutionOptions.push({
						key: key,
						value: key,
						text: this.resolutions[key]['label'] + ' ' + this.resolutions[key]['width'] + 'x' + this.resolutions[key]['height'] + ' ' + this.resolutions[key]['ratio'],
					});
				}

				for (var fps of [5, 10, 15, 24, 30, 48, 60, 120] )
				if (this.maxFrameRate === 0 || fps <= this.maxFrameRate) 
				{
					this.frameRateOptions.push({
						key: fps,
						value: fps,
						text: fps + ' ' + this.txt('fps'),
					}); 
				}	

		//options = [{key: 'val1', text: 'Text', value: 'value'}];

		this.state.resolutionOptions = this.resolutionOptions;
		this.state.bitrateOptions = this.bitrateOptions(this.bitrate);
		this.state.frameRateOptions = this.frameRateOptions;

		this.state.resolution = this.resolutionHeight.toString() +'p';

		this.state.maxBitrate = this.maxBitrate;
		this.state.bitrate = this.bitrate;
		this.state.audioBitrate = this.audioBitrate;
		this.state.frameRate = this.frameRate;

		if (props.appState.checked) this.tChecked = true; //updated with checked

	//	if (this.devMode) console.log("components/Camera updateBitrates", this.state.frameRateOptions, this.state.bitrateOptions);
	}

	interfaceReady() {

		//when comp mounts
		var { state } = this;
		const {props} = this;

		//when it starts it's not connected
		// Clear stale room metadata before auto-publishing. A delayed reset can
		// otherwise arrive after a fast publish and hide a live broadcaster.
		this.props.serverUpdate({ task: 'media', connected: false });

		this.updateBitrates();

		this.setState({ resolutionOptions: this.resolutionOptions, resolution: this.resolutionHeight.toString() +'p', bitrateOptions: this.bitrateOptions(this.bitrate), maxBitrate: this.maxBitrate, bitrate: this.bitrate, settingsActive: (this.props.config.cameraControls == '1') });
		//const  localVideo = this.localVideo.current;

		const { cameraAutoBroadcast } = this.props.config;
		const { txt } = this;

		if (!navigator.mediaDevices) {
			if (this.devMode) console.log("components/Camera interfaceReady navigator.mediaDevices", navigator.mediaDevices);
			this.setState({ settingsActive: true, buttonDisabled: false, buttonContent: txt("Broadcast"), statusInfo: "Navigator media devices not available!", connecting: false, connected: false });
			return;
		}

		if (cameraAutoBroadcast == '1' && !this.props.appState.external) {
			navigator.mediaDevices.enumerateDevices().then(this.gotDevicesPublish.bind(this)).catch(this.handleError.bind(this));
			this.setState({ statusInfo: "Connecting...", connecting: true, connected: false });
			this.props.appStateUpdate({cameraStatus: 'pending'});			
		}
		else {
			var sInfo = txt("Make a selection to start!");
			if (this.props.appState.external) sInfo = txt("External broadcast detected.");
			navigator.mediaDevices.enumerateDevices().then(this.gotDevices.bind(this)).catch(this.handleError.bind(this));
			this.setState({ buttonDisabled: false, buttonContent: txt("Broadcast"), statusInfo: sInfo, connecting: false, connected: false });
			this.props.appStateUpdate({cameraStatus: 'off'});
		}

		if (this.devMode) console.log("components/Camera interfaceReady ", cameraAutoBroadcast, this.maxBitrate, this.maxResolutionHeight, this.maxFrameRate );

	}


	videoPlay() {
		const localVideo = this.localVideo.current;
		var { state } = this;

		var playFailed = false;
		var promise = localVideo.play();

		if (promise !== undefined) {
			promise.catch(error => {
				playFailed = true;
				console.log('components/Camera Auto play error:' + error, error);
				this.setState({ tapRequired: true, settingsActive: true });

				// Show a UI element to let the user manually start playback
			}).then(() => {
				if (!playFailed) {
					this.setState({ tapRequired: false });
					if (state.connected) this.setState({ settingsActive: false });

				}
			});
		}
	}

	composedStream([micStream, screenStream]) 
	{

				  var composedStream = new MediaStream();

				  if (this.devMode) console.log("components/Camera/composedStream : ", micStream, screenStream, composedStream);

				  //added the video stream from the screen
				  screenStream.getVideoTracks().forEach(function(videoTrack) {
					composedStream.addTrack(videoTrack);
				  });

				  //if system audio has been shared
				  if (screenStream.getAudioTracks().length > 0) {
					//merge the system audio with the mic audio
					var context = new AudioContext();
					var audioDestination = context.createMediaStreamDestination();

					const systemSource = context.createMediaStreamSource(screenStream);
					const systemGain = context.createGain();
					systemGain.gain.value = 1.0;
					systemSource.connect(systemGain).connect(audioDestination);
					if (this.devMode) console.log("composedStream added system audio");

					if (micStream && micStream.getAudioTracks().length > 0) {
					  const micSource = context.createMediaStreamSource(micStream);
					  const micGain = context.createGain();
					  micGain.gain.value = 1.0;
					  micSource.connect(micGain).connect(audioDestination);
					  if (this.devMode)  console.log("composedStream added mic audio");
					}

					audioDestination.stream.getAudioTracks().forEach(function(audioTrack) {
						composedStream.addTrack(audioTrack);
					  });
				  } else {
					//add just the mic audio
					micStream.getAudioTracks().forEach(function(micTrack) {
					  composedStream.addTrack(micTrack);
					});
				  }
				  
				  if (this.devMode) console.log("components/Camera/composedStream : ", micStream, screenStream, composedStream);

				return composedStream;
	  }


	takeSnapshot()
	{
		var { props } = this;

		const video = this.localVideo.current;
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d').drawImage(video, 0, 0);
		const data = canvas.toDataURL('image/png');
		props.serverUpdate({ task: 'snapshot', data: data });
		canvas.remove();
	}

	startSnapshots()
	{
		var { props } = this;

		if (this.timerSnap) clearInterval(this.timerSnap);

		if (props.config.snapshotDisable) return;
		if (props.room.snapshotDisable) return;

		var snapshotInterval = Number(props.config.snapshotInterval);
		if (snapshotInterval < 10) snapshotInterval = 300;

		this.takeSnapshot();

		this.timerSnap = setInterval(this.takeSnapshot.bind(this), 1000 * snapshotInterval);
	}

	stopSnapshots()
	{
		if (this.timerSnap) clearInterval(this.timerSnap);

	}

	buildStream() {
		//select devices, builds stream and gotStream publishes
		if (!this._isMounted) 
		{
			console.log('components/Camera buildStream not mounted');
			return;
		}

		var { state, props } = this;

		if (window.stream) {
			window.stream.getTracks().forEach(track => {
				track.stop();
			});
		}

		if (!this.audioInterface) this.localVideo.current.srcObject = null;

		//size of selected res
		for (var key in this.resolutions)
			if (key == state.resolution) {
				state.videoWidth = this.resolutions[key]['width'];
				state.videoHeight = this.resolutions[key]['height'];

				if (this.changedBy !== 'bitrate')
					if (state.maxBitrate === 0 || this.resolutions[key]['bitrate'] <= state.maxBitrate) state.bitrate = this.resolutions[key]['bitrate'];
					else state.bitrate = state.maxBitrate;

				state.bitrateOptions = this.bitrateOptions(this.resolutions[key]['bitrate']);
			}

		//https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints

		this.constraints = {};
			if (state.audioOn && state.audioSource != '_disabled') this.constraints['audio'] = { deviceId: state.audioSource ? { exact: state.audioSource } : undefined };
		else this.constraints['audio'] = false;

		if (this.audioInterface || props.room.audioOnly || props.appState.audioMode || (props.appState.screen=='Way2Screen' && props.appState.revealMode && !props.appState.revealed)) this.constraints['video'] = false;
		else
			if (state.videoOn && state.videoSource != '_disabled' && !state.screenShare) this.constraints['video'] = { deviceId: state.videoSource ? { exact: state.videoSource } : undefined, width: {  ideal: state.videoWidth, max: state.videoWidth }, height: { ideal: state.videoHeight , max: state.videoHeight }, frameRate: { ideal: state.frameRate, max: state.frameRate } };
		else this.constraints['video'] = false;

		//detect firefox browser and remove max contraints if defined, as firefox does not downscale webcam video
		if (navigator.userAgent.indexOf("Firefox") > 0) {
			if (this.constraints['video']) {
				delete this.constraints['video']['width']['max'];
				delete this.constraints['video']['height']['max'];
				delete this.constraints['video']['frameRate']['max'];
			}
		}
	
		if (state.videoSource === '_screen')
		{
			var constraintsScreen = {
				video: true, // or pass HINTS
				audio: true,
				systemAudio: 'include',
			};
			
			if(navigator.mediaDevices.getDisplayMedia) {
		
				if (this.constraints['audio']) //compose with audio if present
				{
					const promiseScreen = navigator.mediaDevices.getDisplayMedia(constraintsScreen).catch(this.handleError.bind(this));
					const promiseAudio = navigator.mediaDevices.getUserMedia(this.constraints).catch(this.handleError.bind(this));

					console.log("components/Camera/buildStrea Promise.all fc", promiseScreen, promiseAudio)

					Promise.all([promiseAudio, promiseScreen]).then( (values) => this.composedStream(values) ).then(this.gotStream.bind(this)).then(this.gotDevices.bind(this)).catch(this.handleError.bind(this));
				} else navigator.mediaDevices.getDisplayMedia(constraintsScreen).then(this.gotStream.bind(this)).then(this.gotDevices.bind(this)).catch(this.handleError.bind(this)); 

			} else console.log("components/Camera/buildStream getDisplayMedia not supported");

			if (this.devMode) console.log("components/Camera/buildStream screen videoSource: ", state.videoSource, "  constraintsScreen=", constraintsScreen, "  constraints=", this.constraints);

			return; 
		}

		//after getting stream also updates devices (get names after permission)
		if ( (state.audioOn && state.audioSource != '_disabled' && state.videoSource != '_screen' ) || (state.videoOn && state.videoSource != '_disabled' && !state.screenShare) ) navigator.mediaDevices.getUserMedia(this.constraints).then(this.gotStream.bind(this)).then(this.gotDevices.bind(this)).catch(this.handleError.bind(this));
		else console.log("Camera/buildStream NO SOURCE enabled", state.videoSource, state.audioSource, state.videoOn, state.audioOn);

		if (this.devMode) console.log("components/Camera/buildStream videoSource: ", state.videoSource, "  constraints=", this.constraints);
	};

	handleError(error) {
		console.log('components/Camera navigator.mediaDevices handleError: ', error, ' this._isMounted=' + this._isMounted);

		if (!this._isMounted) return;

		var extraInfo = '';
		switch (error.name) {
			case "OverconstrainedError":
				extraInfo = ' (' + error.constraint + ')';
				break;
		}

		this.setState({ settingsActive: true, 'statusInfo': 'Media Error: ' + error.name + extraInfo, buttonDisabled: false, buttonContent: this.txt('Broadcast'), connecting: false, connected: false });
		this.props.appStateUpdate({cameraStatus: 'error'});

		//jQuery("#sdpDataTag").html('getUserMedia Error: ' + error.toString());

 		//TROUBLESHOOTING:
		if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
			console.log("components/Camera navigator.mediaDevices handleError - enumerateDevices() - not supported");
		  }
		  
		  // List cameras and microphones.	  
		  navigator.mediaDevices.enumerateDevices()
		  .then(function(devices) {
			devices.forEach(function(device) {
			  console.log("components/Camera navigator.mediaDevices handleError enumerateDevices " +  device.kind + ": " + device.label +
						  " id = " + device.deviceId);
			});
		  })
		  .catch(function(err) {
			console.log("components/Camera navigator.mediaDevices handleError enumerateDevices error: " + err.name + ": " + err.message);
		  });


	};


	gotStream(stream) {

		const state = this.state;
		//gets stream and publishes with startPublisher()

		//window.stream = stream; // make stream available to console
		if (!this.audioInterface) this.localVideo.current.srcObject = stream;

		const videoTrack = stream.getVideoTracks()[0];
		let videoCapabilities = "no video track";
		if (videoTrack) {
			if (navigator.userAgent.toLowerCase().indexOf('firefox') === -1) {
				videoCapabilities = videoTrack.getCapabilities();
			} else {
				videoCapabilities = "capabilities not supported in Firefox";
			}
		}
		
		if (this.devMode) console.log("components/Camera/gotStream after getUserMedia", videoCapabilities, stream);

		if (videoTrack) videoTrack.applyConstraints( { width: { min: Math.floor(state.videoWidth*0.8), ideal: state.videoWidth, max: Math.floor(state.videoWidth*1.1) }, height: { min: Math.floor(state.videoHeight*0.8), ideal: state.videoHeight, max: Math.floor(state.videoHeight*1.1) }, frameRate: { ideal: state.frameRate, max: state.frameRate } } );

		this.localStream = stream;

		//close prev stream (to restart publishing)
		if (this.localStream != null) this.stopPublisher();

		//publish
		this.startPublisher();

		// Refresh button list in case labels have become available (usually after receiving permissions)
		return navigator.mediaDevices.enumerateDevices();
	}


	startPublisher() {
		if (this.devMode) console.log("components/Camera startPublisher", this.props);

		const {props, state} = this;

		let serverType = props.config.serverType;
		if (props.room.serverType) serverType = props.room.serverType;

		if ( serverType == 'videowhisper' ) 
		{
			this.serverVideowhisper = true;
			this.vwsPublish = true;

			//update publish params
			this.streamParams = { width: state.videoWidth, height: state.videoHeight, bitrate: state.bitrate, frameRate: state.frameRate, audioBitrate: state.audioBitrate };

			//update stream info for change checks
			this.streamInfo = { applicationName: props.config.application, streamName: props.room.streamBroadcast, sessionId: '[empty]' };

			//update channel in case changed
			this.vwsChannel = socketStreamName(props.room.streamBroadcastName || props.room.streamBroadcast);

			if (!this.vwsSocket || !this.vwsSocket.connected) this.vwsConnect();
			else 
			{
				this.vwsSocket.emit( "publish", this.vwsPeerId, this.vwsChannel, this.streamParams );
			}
		}
		else 
		{
			this.serverWowza = true;
			this.wsConnect();
		}

		this.timerStart();
	}

	stopPublisher() {
        if (this.vwsAuthRequest) this.vwsAuthRequest.abort();
        this.vwsAuthRequest = null;

		this.timerStop();
		this.stopSnapshots();


		if (this.serverWowza)
		{
		if (this.peerConnection) this.peerConnection.close();
		//this.peerConnection = null;

		if (this.wsConnection) if (this.wsConnection.readyState < 2) this.wsConnection.close();
		//this.wsConnection = null;

		if (this.devMode) console.log("components/Camera stopPublisher", this.wsConnection, this.peerConnection );
		}

		if (this.serverVideowhisper)
		{		
		this.vwsPublish = false; 

		//close peers
		for (const peerID in this.vwsPeers) this.vwsPeers[peerID].close();
		if (this.devMode) console.log("components/Camera stopPublisher closing vwsPeers");
		//		this.vwsSocket.disconnect();
		}

	}


	gotDevices(deviceInfos) {
		//called with promise from navigator.mediaDevices.enumerateDevices
		// Handles being called several times to update labels. Preserve values.

		var { state } = this;

		var cameraOptions = [{
			key: 'cam-title',
			text: (
				<span>
					Select <strong>Camera</strong>:
			  </span>
			),
			disabled: true,
		},
		{ text: 'No Camera', value: '_disabled' }
		];

		var microphoneOptions = [{
			key: 'mic-title',
			text: (
				<span>
					Select <strong>Microphone</strong>:
			  </span>
			),
			disabled: true,
		}]; //{text:'Disable Sound', value: '_disabled'}

		//Screen Share
		if (typeof navigator.mediaDevices.getDisplayMedia === "function" && state.screenShare)
		cameraOptions.push({key: 'screen', text: this.txt('Screen Share'), 'value': '_screen' });

		let videoValid = false;
		let audioValid = false;

		for (let i = 0; i !== deviceInfos.length; ++i) {
			const deviceInfo = deviceInfos[i];

			var option = { value: deviceInfo.deviceId };
			//  console.log('components/Camera gotDevices Device: ', deviceInfo);

			if (deviceInfo.kind === 'audioinput') {
				option.text = deviceInfo.label || `Microphone ${microphoneOptions.length + 1}`;
				microphoneOptions.push(option);

				if (!state.microphone) state.microphone = deviceInfo.deviceId; //select first mic
				if (deviceInfo.deviceId === state.microphone) audioValid = true; //selected id valid

			} else if (deviceInfo.kind === 'videoinput') {
				option.text = deviceInfo.label || `Camera ${cameraOptions.length + 1}`;
				cameraOptions.push(option);
				if (!state.camera) state.camera = deviceInfo.deviceId; //select first cam
				if (deviceInfo.deviceId === state.camera) videoValid = true; //selected id valid

			} else {
				//	console.log('Some other kind of source/device: ', deviceInfo);
			}
		}

		//updating videoSource, audioSource only if still valid because Safari changes deviceID 
		if (!state.screenShare) if (videoValid || state.camera === '_disabled') state.videoSource = state.camera;
		if (audioValid || state.microphone === '_disabled') state.audioSource = state.microphone;

		//warn user if selection could not be applied
		if (state.camera !== state.videoSource || state.microphone !== state.audioSource) //changing (selected)
			if (!videoValid || !audioValid) {
				if (this.devMode) console.log('components/Camera gotDevices: deviceID changed videoValid:' + state.camera + ' videoSelected: ' + state.microphone + ' audioValid:' + audioValid);
				//  jQuery("#sdpDataTag").html('Media DeviceID changed: Please select again!' );
				this.setState({ settingsActive: true, 'statusInfo': 'Media DeviceID changed: Please select again!', buttonDisabled: false, buttonContent: this.txt('Broadcast') });
			}

		if (this.devMode) console.log('gotDevices: verified videoSource: ' + state.videoSource + ' changed videoValid: ' + videoValid);

		//update options
		if (this._isMounted) this.setState({ cameraOptions: cameraOptions, microphoneOptions: microphoneOptions });
	}

	gotDevicesPublish(deviceInfos) {
		//updates devices, then publishes stram
		this.gotDevices(deviceInfos);
		this.buildStream(); //builds stream and publishes
	}

	updateVideoSize(whereSeen) {
		//video dimensions videoWidth!=width video display dimensions 
		const localVideo = this.localVideo.current;

		var { state } = this;

		//let innerText = '';
		let videoAspectRatio;

		if (localVideo.videoHeight) {

			//innerText = 'Actual video dimensions: ' + localVideo.videoWidth + 'x' + localVideo.videoHeight + 'px.';

			if (state.videoWidth !== localVideo.videoWidth
				|| state.videoHeight !== localVideo.videoHeight) {
				state.videoWidth = localVideo.videoWidth;
				state.videoHeight = localVideo.videoHeight;
				if (!state.videoHeight) state.videoHeight = 1;
				//	jQuery("#sdpDataTag").html(innerText);
			}

			videoAspectRatio = localVideo.videoWidth / localVideo.videoHeight;
			if (state.videoAspectRatio !== videoAspectRatio) this.setState({ 'videoAspectRatio': videoAspectRatio });

		} else {
			//innerText = 'Video dimensions: not ready';
		}

		//console.log('updateVideoSize:' + whereSeen + ': ' + innerText, videoAspectRatio);
	}

	//videowhisper socket connect
    async vwsConnect() {
        if (this.vwsAuthRequest || (this.vwsSocket && this.vwsSocket.connected)) return;
        const session = socketSessionKey(this.props);
        const request = new AbortController();
        this.vwsAuthRequest = request;
        try {
            const auth = await requestSocketAuth(this.props, this.props.user.name, request.signal);
            if (this._isMounted && this.vwsAuthRequest === request && session === socketSessionKey(this.props)) this.vwsConnectReady(auth);
        } catch (error) {
            if (this._isMounted && this.vwsAuthRequest === request && session === socketSessionKey(this.props) && error.name !== 'AbortError') {
                this.setState({ statusInfo: 'Session authentication failed. Reload the page and try again.', connecting: false, connected: false, buttonDisabled: false, settingsActive: true, buttonContent: 'Broadcast' });
            }
        } finally {
            if (this.vwsAuthRequest === request) this.vwsAuthRequest = null;
        }
    }

	vwsConnectReady(auth)
	{
		const { props, txt } = this;
		var { state } = this;

		if (this.devMode) console.log("components/Camera vwsConnect (VideoWhisper socket server)", props.config.vwsSocket);

		//get tracks
		var videoTracks = null;
		if (!this.audioInterface) videoTracks = this.localStream.getVideoTracks();
		const audioTracks = this.localStream.getAudioTracks();

		if (!this.audioInterface) if (videoTracks.length > 0) {
			if (this.devMode) console.log(`components/Camera vwsConnect Using Video device: ${videoTracks[0].label}`);
		}

		if (audioTracks.length > 0) {
			if (this.devMode) console.log(`components/Camera vwsConnect Using Audio device: ${audioTracks[0].label}`);
		}

		if (!this.vwsSocket)
		{
		//connect to socket
		this.vwsPeerId = props.user.name;
		this.vwsChannel = socketStreamName(props.room.streamBroadcastName || props.room.streamBroadcast);
		this.vwsPeers = [];


			this.vwsSocket = new io(props.config.vwsSocket, {
            'auth': auth ,
			'transports': ['websocket'],		
			'secure':true,
            'autoConnect': false, // disables auto connection, by default the client would connect to the server as soon as the io() object is instatiated
            'reconnection': false, // disables auto reconnection, this can occur when for example the host server disconnects. When set to true, the client would keep trying to reconnect
            // for a complete list of the available options, see https://socket.io/docs/v4/client-api/#new-Manager-url-options
       	 });

		this.vwsSocket.on("connect", () => {
			const { state } = this;

			//update publishing params
			this.streamParams = { width: state.videoWidth, height: state.videoHeight, bitrate: state.bitrate, frameRate: state.frameRate, audioBitrate: state.audioBitrate };

			if (this.devMode) console.log("components/Camera vwsSocket Connected with id", this.vwsSocket.id, this.streamParams);
			this.vwsSocket.emit( "publish", this.vwsPeerId, this.vwsChannel, this.streamParams ); //players join channel, broadcaster publish to channel
        });

        this.vwsSocket.on("disconnect", () => {
			if (this.devMode) console.log("components/Camera vwsSocket Disconnected");

			this.setState({ settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), statusInfo: 'Disconnected', connecting: false, connected: false, bitrateInfo: <Icon name="eye slash" />});
			props.serverUpdate({ task: 'media', connected: false });
			props.appStateUpdate({cameraStatus: 'off'});
			this.stopSnapshots();
        });

        this.vwsSocket.on("connect_error", (error) => {
            console.log("components/Camera vwsSocket Connection error", error);
			this.setState({ 'statusInfo': 'Connection error: ' + error.message, settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), connecting: false, connected: false });
        });

		this.vwsSocket.on("connect_failed", (error) => {
            console.log("components/Camera vwsSocket Connection failed", error);
			this.setState({ 'statusInfo': 'Connection failed: ' + error.message, settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), connecting: false, connected: false });
        });

        this.vwsSocket.on("message", (message) => {
			if (this.devMode) console.log("components/Camera vwsSocket.on(message", message);
			if (message.from == this.vwsPeerId) return; //ignore own messages 

			if (message.type == "answer") {

				if (this.vwsPeers[message.from])
				this.vwsPeers[message.from].setRemoteDescription(message.content)
					.then(
						() => {	
							if (this.devMode)  console.log('components/Camera peerConnection.setRemoteDescription Success', message.target, message );
						}
					)
					.catch( (e) => 
					{
						console.log('components/Camera peerConnection.setRemoteDescription Error', e, message );
					} 
					);
				else console.log('components/Camera peerConnection.setRemoteDescription Error: peer not found', message.from, this.vwsPeers );

			}

			if ( message.type == "peer")
			{
				//add peers only while already published, otherwise add all on "peers" after publish
				if (this.vwsPublish) if (message.peerID) this.vwsAddPeer(message.peerID);
			}

			if (message.type == "peers")
			{
				if (message.peerConfig) this.vwsPeerConfig = message.peerConfig;

				if (message.peers)
				message.peers.forEach( (peer) => {
					 this.vwsAddPeer(peer.peerID);
				});	
				
			}

			if ( message.type == "peer" || message.type == "peers"  )
			{ 
				if (this.devMode) console.log('components/Camera peer(s) received', state.connecting, state.connected );

				//peer(s) received to make offers
				if (!state.connected)
				{
					this.setState({ settingsActive: false, buttonDisabled: false, buttonContent: txt('Stop Broadcast'), statusInfo: txt('Broadcasting'), connecting: false, connected: true, bitrateInfo: <Icon name="clock" />});
					props.serverUpdate({ task: 'media', connected: true });
					props.appStateUpdate({publishRequired: false, cameraStatus: 'live'});
					this.startSnapshots();
				}

			}

			if (message.type === "candidate") {
				if (this.vwsPeers[message.from] && message.candidate )
				{
				const iceCandidate = new RTCIceCandidate(message.candidate);
				this.vwsPeers[message.from].addIceCandidate(iceCandidate)
				.then(() => {
					if (this.devMode) console.log('components/Camera peerConnection.addIceCandidate Success', message.target, message);
				})
				.catch((error) => {
					console.error('components/Camera peerConnection.addIceCandidate Error:', error);
					console.log('RTCIceCandidate(', message.candidate, iceCandidate);
					console.log('peer', message.from, this.vwsPeers[message.from]);
				});
				} else console.log('components/Camera peerConnection.addIceCandidate Error: peer or message.candidate not found', message.from, message );

			}

		} );

        this.vwsSocket.on("uniquenessError", (error) => {

            console.error(`components/Camera vwsSocket uniquenessError: ${error.message}`);

			this.setState({ settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), statusInfo: error.message, connecting: false, connected: false, bitrateInfo: <Icon name="clock" />});

        });

		this.vwsSocket.on("publishError", (error) => {

            console.error(`components/Camera vwsSocket publishError: ${error.message}`);

			this.setState({ settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), statusInfo: error.message, connecting: false, connected: false, bitrateInfo: <Icon name="clock" />});

        });

		}

        this.vwsSocket.auth = auth;
        if (!this.vwsSocket.connected) this.vwsSocket.connect();

		if (this.devMode) console.log("components/Camera vwsConnect connecting", this.vwsSocket );

	}

	transformSdp(sdp, enhanceData) {

		// Limit the maximum resolution and frame rate
		const maxResolution = enhanceData.resolutionHeight; // Example: max 360 p
		const maxFrameRate = enhanceData.frameRate; // Example: max 15 fps
		const maxBitrate= enhanceData.videoBitrate;

		if (this.devMode) console.log("components/Camera transformSdp", enhanceData );

		const parsedSdp = sdpTransform.parse(sdp);
		const videoMedia = parsedSdp.media.find(media => media.type === 'video');
	  
		if (videoMedia) {
		  videoMedia.fmtp.forEach((videoFmtp, index) => {
			const videoCodec = videoMedia.rtp[index].codec;
			const codecParameters = sdpTransform.parseParams(videoFmtp.config);
	  
			codecParameters['max-fs'] = maxResolution;
			codecParameters['max-fr'] = maxFrameRate;
			codecParameters['max-mbps'] = maxResolution * maxFrameRate; //maximum macroblocks per second

			videoFmtp.config = Object.entries(codecParameters).map(([key, value]) => `${key}=${value}`).join(';');

			// Add bitrate limitation using b=AS attribute
			videoMedia.bandwidth = [{type: 'AS', limit: maxBitrate}];
		  });
		}
	  
		return sdpTransform.write(parsedSdp);
	  }

	mungeDescription(description) {
		const { state, props } = this;

		this.enhanceData = {};
		if (props.config.audioBitrate !== undefined) this.enhanceData.audioBitrate = Number(state.audioBitrate);
		if (state.bitrate !== undefined) this.enhanceData.videoBitrate = Number(state.bitrate);
		if (state.frameRate !== undefined) this.enhanceData.frameRate = Number(state.frameRate);
		this.enhanceData.resolutionHeight = this.resolutionHeight ? this.resolutionHeight : 360; 

		if (this.serverVideowhisper || state.videoSource == '_screen') 
		{
			//description.sdp = this.setBitrateLimits(description.sdp, this.enhanceData.audioBitrate , this.enhanceData.videoBitrate );
			description.sdp = this.transformSdp(description.sdp, this.enhanceData);
		}
		else description.sdp = this.mungeSDPPublish(description.sdp, this.enhanceData); //Wowza

		if (this.devMode) console.log('components/Camera mungeDescription', this.enhanceData, description );

		return description;
	}

	/*
	setBitrateLimits(sdp, audioBitrateLimit, videoBitrateLimit) {
		let modifiedSdp = sdp;
	  
		// Set the audio bitrate limit
		const audioRegex = new RegExp('(m=audio.*\r\n)');
		const audioMatch = modifiedSdp.match(audioRegex);
		if (audioMatch) {
		  const audioSdp = audioMatch[1];
		  const audioBitrateAttr = 'b=AS:' + audioBitrateLimit + '\r\n';
		  modifiedSdp = modifiedSdp.replace(audioRegex, audioSdp + audioBitrateAttr);
		}
	  
		// Set the video bitrate limits for VP8 and H.264
		const videoCodecs = ['VP8', 'H264'];
		videoCodecs.forEach(codec => {
		  const videoRegex = new RegExp('(a=rtpmap:\\d+ ' + codec + '/90000.*\r\n)');
		  const videoMatch = modifiedSdp.match(videoRegex);
		  if (videoMatch) {
			const videoSdp = videoMatch[1];
			const videoPayloadTypeRegex = new RegExp('(a=rtpmap:(\\d+) ' + codec + '/90000.*\r\n)');
			const videoPayloadTypeMatch = modifiedSdp.match(videoPayloadTypeRegex);
			if (videoPayloadTypeMatch) {
			  const videoPayloadType = videoPayloadTypeMatch[2];
			  const videoBitrateAttr = 'a=fmtp:' + videoPayloadType + ' x-google-max-bitrate=' + videoBitrateLimit + '\r\nb=AS:' + videoBitrateLimit + '\r\n';
			  modifiedSdp = modifiedSdp.replace(videoRegex, videoSdp + videoBitrateAttr);
			}
		  }
		});
	  
		// Add bitrate limits to video 'm=' line
		const videoMLineRegex = new RegExp('(m=video.*\r\n)');
		const videoMLineMatch = modifiedSdp.match(videoMLineRegex);
		if (videoMLineMatch) {
		  const videoMLine = videoMLineMatch[1];
		  const videoBitrateAttr = 'b=AS:' + videoBitrateLimit + '\r\n';
		  modifiedSdp = modifiedSdp.replace(videoMLineRegex, videoMLine + videoBitrateAttr);
		}
	  
		// Remove any remaining sprop-parameter-sets attributes, which can cause problems in some browsers
		const spropRegex = new RegExp('(a=fmtp:\\d+ sprop-parameter-sets=.*\r\n)');
		modifiedSdp = modifiedSdp.replace(spropRegex, '');
	  
		return modifiedSdp;
	  }
	*/	

	vwsAddPeer(peerID)
	{


	if (peerID == this.vwsPeerId) return; //ignore own peerID (broadcasting)

	if (this.devMode) console.log('components/Camera vwsAddPeer new', peerID, this.vwsPeerConfig);

	if (!peerID) return; //ignore empty peerID

	//adds a peer connection for each playing client
	var peerConnection = new RTCPeerConnection(this.vwsPeerConfig );

	peerConnection.onicecandidate = (event) => {
		if (event.candidate) {

			if (this.devMode) if (event.candidate.type !== 'relay') {
				console.log('components/Camera vwsAddPeer peerConnection.onicecandidate: Ignoring non-relay candidate in devMode', peerID, event.candidate );
				return;
			  }

			this.vwsSocket.emit("messagePeer", { from: this.vwsPeerId, target: peerID, type: "candidate", candidate: event.candidate });
			if (this.devMode) console.log('components/Camera vwsAddPeer peerConnection.onicecandidate', peerID, event.candidate);
		}
		else if (this.devMode) console.log('components/Camera vwsAddPeer peerConnection.onicecandidate: End of candidates.', peerID);
	}
			
	peerConnection.onsignalingstatechange = (event) => {
		if (this.devMode) console.log('components/Camera vwsAddPeer peerConnection.onsignalingstatechange', peerID, event, peerConnection.signalingState);
		}	

	peerConnection.oniceconnectionstatechange = (event) => {
		if (this.devMode) console.log('components/Camera vwsAddPeer peerConnection.oniceconnectionstatechange', peerID, event, peerConnection.iceConnectionState);
		}

	peerConnection.onnegotiationneeded = (event) => {
		if (this.devMode) console.log('components/Camera vwsAddPeer peerConnection.onnegotiationneeded', peerID, event);

		peerConnection.createOffer(this.offerOptions)
			.then( (description) => {
				
				description = this.mungeDescription(description); //adjust bitrate before setting local description

				peerConnection.setLocalDescription(description)
					.then(
						() => {				
							const message = {'target': peerID, 'type': 'offer', 'content': description, from: this.vwsPeerId, target: peerID, 'peerConfig': this.vwsPeerConfig };
							if (this.devMode) console.log('components/Camera vwsAddPeer/createOffer/setLocalDescription', message);
							this.vwsSocket.emit("messagePeer", message );						}
					)
					.catch( (e) =>
					{
						console.log('components/Camera peerConnection.setLocalDescription Error', e, description )
					}
					)
			})
			.catch( (e) => 
			{
				console.log('components/Camera peerConnection.createOffer Error', e, this.offerOptions )
			}
			)
		}

	peerConnection.onconnectionstatechange = (event) => {
		if (this.devMode) console.log('components/Camera vwsAddPeer peerConnection.onconnectionstatechange', peerID, event, peerConnection.connectionState);
		
			//set bitrate limit
			if (peerConnection.connectionState == 'connected')
			try {
				 this.setPeerBitrate( this.vwsPeers[peerID] , Number(this.state.audioBitrate), Number(this.state.bitrate),  Number(this.state.frameRate));
				 if (this.devMode) console.log('components/Camera vwsAddPeer bitrate', Number(this.state.audioBitrate), Number(this.state.bitrate));
			  } catch (error) {
				console.error('Failed to set bitrate limits:', error, Number(this.state.audioBitrate), Number(this.state.bitrate));
			  }
	}
		
		//add media to peer connection, which should trigger the negotiationneeded event

		//Safari order: audio first, then video
		const audioTracks = this.localStream.getAudioTracks();
		audioTracks.forEach(track => peerConnection.addTrack(track, this.localStream))
		
		if (!this.audioInterface) 
		{
		const videoTracks = this.localStream.getVideoTracks();
		videoTracks.forEach(track => peerConnection.addTrack(track, this.localStream))
		}

		//add peer connection to list
		this.vwsPeers[peerID] = peerConnection;

		if (this.devMode) console.log('components/Camera vwsAddPeer count', Object.keys(this.vwsPeers || {}).length, this.vwsPeers);
	}

	 setPeerBitrate(peerConnection, audioBitrateLimit, videoBitrateLimit, maxFramerate) {

		if (this.devMode) console.log('components/Camera setPeerBitrate', audioBitrateLimit, videoBitrateLimit, maxFramerate, peerConnection);

		return new Promise(async (resolve, reject) => {
		  try {
			const senders = peerConnection.getSenders();
	  
			// Set audio bitrate limit
			const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
			if (audioSender) {
			  const audioParameters = audioSender.getParameters();
			  if (this.devMode) console.log('components/Camera setPeerBitrate audioParameters', audioParameters);
			  if (audioParameters.encodings && audioParameters.encodings.length > 0) {
				audioParameters.encodings[0].maxBitrate = audioBitrateLimit * 1000;
				await audioSender.setParameters(audioParameters);
			  }
			}
			
			// Set video bitrate limit
			const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
			if (videoSender) {
			const videoParameters = videoSender.getParameters();
			if (this.devMode) console.log('components/Camera setPeerBitrate videoParameters', videoParameters);
			if (videoParameters.encodings && videoParameters.encodings.length > 0) {
				videoParameters.encodings[0].maxBitrate = videoBitrateLimit * 1000;
				videoParameters.encodings[0].maxFramerate = maxFramerate;
				await videoSender.setParameters(videoParameters);
			}
			}
	  
			resolve();
		  } catch (error) {
			console.log('components/Camera setPeerBitrate error', error)
			reject(error);
		  }
		});
	  }
	  

	//wowza socket connect
	wsConnect()
	{

		//websocket connect to Wowza SE
		const { props } = this;
		var { state } = this;

		this.devMode = props.appState.devMode;

		if (this.devMode) console.log('components/Camera wsConnect', this.props.appState.wsOpen, props.appState.wsComponent);

		if (this.props.appState.wsOpen)
        {
			if (this.devMode) console.log("components/Camera wsConnection websocket busy, retrying later", this.props.appState.wsComponent);
			if (this.wsConnection) if (this.wsConnection.readyState < 2) this.wsConnection.close();
            setTimeout(()=>this.wsConnect(), 1000);
            return;
		}

		//websocket available: mark it as busy
		this.props.appStateUpdate({wsOpen: true, wsComponent: 'Camera'});

		this.SDPOutput = {};

		var videoTracks = null;
		if (!this.audioInterface) videoTracks = this.localStream.getVideoTracks();
		const audioTracks = this.localStream.getAudioTracks();

		if (!this.audioInterface) if (videoTracks.length > 0) {
			if (this.devMode) console.log(`components/Camera wsConnect Using Video device: ${videoTracks[0].label}`);
		}
		if (audioTracks.length > 0) {
			if (this.devMode) console.log(`components/Camera wsConnect Using Audio device: ${audioTracks[0].label}`);
		}


		this.streamInfo = { applicationName: props.config.application, streamName: props.room.streamBroadcast, sessionId: '[empty]' };
		this.userData = { param1: "value1", "videowhisper": "webrtc-broadcast" };

		if (this.devMode) console.log('components/Camera wsConnect', '_isMounted=' + this._isMounted , this.streamInfo, this.userData, this.props, this.state);


		if (this.wsConnection) 
		{
			console.log('components/Camera wsConnect previous websocket (to close)', this.wsConnection);
			if (this.wsConnection.readyState < 2) this.wsConnection.close();
		}

		this.wsConnection = new WebSocket(props.config.wss);
		this.wsConnection.binaryType = 'arraybuffer';

		this.wsConnection.onopen = this.onopen.bind(this); //pass context with .bind(this)

		this.wsMessaged = false;
		this.wsConnection.onmessage = (e) => this.onWsMessage(e);

		this.wsConnection.onclose =  () => {			
			if (this.devMode) console.log("components/Camera wsConnection.onclose");
			this.props.appStateUpdate({wsOpen: false});
			//this.props.appStateUpdate({cameraStatus: 'off'}); //only socket
		}

		this.wsConnection.onerror =  (evt) => {
			console.log("components/Camera wsConnection.onerror: ", evt);
			//this.props.appStateUpdate({cameraStatus: 'error'});
            //this.wsConnection.close();
			//this.props.appStateUpdate({wsOpen: false});		
			this.setState({ buttonDisabled: false});	
		}
	}

	onopen = function (e) //wsConnection.onopen
	{
		if (this.devMode) console.log("components/Camera wsConnection.onopen ", this.wsConnection.readyState, e, this.state);
		this.wsMessaged = false;
		this.props.appStateUpdate({wsOpen: true, wsComponent: 'Camera onopen'});

		if (this.wsConnection.readyState != 1) return;
		

		this.peerConnection = new RTCPeerConnection(this.peerConnectionConfig );

		this.peerConnection.onicecandidate = this.onicecandidate.bind(this);
		this.peerConnection.onsignalingstatechange = this.onsignalingstatechange.bind(this);
		this.peerConnection.oniceconnectionstatechange = this.oniceconnectionstatechange.bind(this);

		this.peerConnection.onnegotiationneeded = this.onnegotiationneeded.bind(this);
		this.peerConnection.onconnectionstatechange = this.onconnectionstatechange.bind(this);

		//Safari order: audio first, then video
		const audioTracks = this.localStream.getAudioTracks();
		audioTracks.forEach(track => this.peerConnection.addTrack(track, this.localStream))
		
		if (!this.audioInterface) 
		{
		const videoTracks = this.localStream.getVideoTracks();
		videoTracks.forEach(track => this.peerConnection.addTrack(track, this.localStream))
		}

		/*
		const tracks = this.localStream.getTracks();
		if (this.devMode) console.log("components/Camera wsConnection.onopen localStream.getTracks", tracks);
		tracks.forEach(track => this.peerConnection.addTrack(track, this.localStream));
		*/

		//console.log('wsConnection.onopen Adding Local Stream to peer connection', this.peerConnection, this.peerConnection);


		if (this.devMode) console.log("components/Camera wsConnection.onopen setting wsMessagedCheck");

		setTimeout(() => this.wsMessagedCheck(), 6000);

				//set bitrate limit
				try {
					this.setPeerBitrate(this.peerConnection, Number(this.state.audioBitrate), Number(this.state.bitrate), Number(this.state.frameRate));
				 } catch (error) {
				   console.error('Failed to set bitrate limits:', error, Number(this.state.audioBitrate), Number(this.state.bitrate));
				 }
	}

	onnegotiationneeded() {
		if (this.devMode) console.log('components/Camera peerConnection onnegotiationneeded');
		this.peerConnection.createOffer(this.offerOptions).then(this.gotDescription.bind(this), this.errorHandler);
	}

	onicecandidate(event) //gotIceCandidate
	{
		if (event.candidate) {

			if (this.devMode) console.log('components/Camera gotIceCandidate: ' + JSON.stringify({ 'ice': event.candidate }));
		}
	}

	onsignalingstatechange() //stateCallback1
	{

		const { txt } = this;

		let state;
		if (this.peerConnection) {
			state = this.peerConnection.signalingState;
			if (this.devMode) console.log(`components/Camera onsignalingstatechange state, peerConnection, wsConnection  ${state}`, this.peerConnection.signalingState, this.peerConnection.readyState, this.peerConnection, this.wsConnection);

			//have local offer
			//if (this.peerConnection.iceConnectionState == 'completed') 
			//this.setState({ 'statusInfo': 'Peer connection signaling: ' + state });

			//sometimes freezes
			if (state == 'have-local-offer' && this.peerConnection.iceConnectionState == 'new' ) // || (state == 'stable' && this.peerConnection.iceConnectionState == 'completed') 
			{
				this.setState({ buttonDisabled: false, buttonContent: txt('Stop Broadcast'), statusInfo: txt('Broadcasting')});
				this.props.appStateUpdate({cameraStatus: 'pending'});

				if (!this.retryIfTimeoutSet)
				{
				setTimeout( () => this.retryIfTimeout(), this.retryTimeout);
				this.retryIfTimeoutSet = true;
				}
			}

			//jQuery("#sdpDataTag").html('Peer: ' + state);
		}
	}
	
	connectionUpdated(connectionState)
	{
		const { props, txt, state } = this;

		if (this.devMode) console.log('components/Camera connectionUpdated ', connectionState, state.connected);

		if (!state.connected) //connect?
		if ( connectionState === "connected")
		{
		   //streaming success
		   this.setState({ settingsActive: false, buttonDisabled: false, buttonContent: txt('Stop Broadcast'), statusInfo: txt('Broadcasting'), connecting: false, connected: true, bitrateInfo: <Icon name="clock" />});
		   props.serverUpdate({ task: 'media', connected: true });
		   props.appStateUpdate({publishRequired: false, cameraStatus: 'live'});
		   this.startSnapshots();

		   //set track parameters (bitrate)
		   if (this.peerConnection)
			   this.peerConnection.getSenders().forEach(track => {
				   if (track.track) { //has video/audio
					   var parameters = track.getParameters();

					   if (!parameters.encodings) {
						   parameters.encodings = [{}];
					   }

					   if (track.track.kind == 'audio' && this.enhanceData.audioBitrate)
						   parameters.encodings[0].maxBitrate = this.enhanceData.audioBitrate * 1000;

					   if (track.track.kind == 'video' && this.enhanceData.videoBitrate)
						   parameters.encodings[0].maxBitrate = this.enhanceData.videoBitrate * 1000;

					   track.setParameters(parameters)
					   if (this.devMode) console.log('components/Camera connectionUpdated ', track.track.kind, parameters);
				   }
			   })
	   }

	   if (state.connected) //disconnect?
	   if ( connectionState === "failed" || connectionState === "disconnected" || connectionState === "closed")
		{
		   //streaming success
		   this.setState({ settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), statusInfo: connectionState, connecting: false, connected: false, bitrateInfo: <Icon name="eye slash" />});
		   props.serverUpdate({ task: 'media', connected: false });
		   props.appStateUpdate({cameraStatus: 'off'});
		   this.stopSnapshots();

		//	if (this.props.config.cameraAutoBroadcast  == '1');
	   }

	}

	onconnectionstatechange() 
	{
		// https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onconnectionstatechange
		//.connectionState = connected/disconnected/failed/closed
		const { props, txt, state } = this;

		let connectionState;
		if (this.peerConnection) 
		{
			connectionState = this.peerConnection.connectionState;
			if (this.devMode) console.log(`components/Camera onconnectionstatechange peerConnection.onconnectionstatechange ${connectionState}`, this.peerConnection.iceConnectionState, this.peerConnection.iceGatheringState,  this.peerConnection.readyState );

			this.connectionUpdated(connectionState);
		}

			
		}

	oniceconnectionstatechange() //iceStateCallback1
	{
		// https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
		//.iceConnectionState = failed/disconnected/closed
		const { props, txt } = this;

		let iceState;
		if (this.peerConnection) {
			iceState = this.peerConnection.iceConnectionState;
			if (this.devMode) console.log(`components/Camera oniceconnectionstatechange peerConnection.iceConnectionState ${iceState}`, this.peerConnection.iceConnectionState, this.peerConnection.iceGatheringState,  this.peerConnection.readyState );
		
			this.connectionUpdated(iceState);
		}
	}


	// 
	wsMessagedCheck = () => {
		if (this.devMode) console.log("components/Camera wsConnection wsMessagedCheck", this.wsMessaged);

		if (!this.wsMessaged) 
		{
			this.setState({ buttonDisabled: false, buttonContent: this.txt("Broadcast"), statusInfo: 'Websocked did not reply' });
			console.log("components/Camera wsMessagedCheck", 'Websocked did not reply with ice candidates', this.wsConnection );
			if (!this.retryIfTimeoutSet) this.retryIfTimeout();
		}
	}

	onWsMessage =  (evt) => {
		this.wsMessaged = true;
		if (this.devMode) console.log("components/Camera wsConnection.onWsMessage", evt);

		var msgJSON = JSON.parse(evt.data);

		var msgStatus = Number(msgJSON['status']);
		var msgCommand = msgJSON['command'];

		if (msgStatus === 504) {
			// as new streams join and we don't want to break the connection over it
			console.log("components/Camera wsConnection.onWsMessage status=504 New stream connecting to WSE");
		  }
		else if (msgStatus === 503) 
		{
			//stream name already in use
			if (this.retryIfBusy) setTimeout(() => this.buildStream(), 2500);
			this.retryIfBusy = false; //already retried
			console.log('components/Camera wsConnection.onWsMessage 503 error busy, retry:', msgStatus, msgJSON['statusDescription'], this.retryIfBusy);

			this.setState({ buttonDisabled: true, buttonContent: this.txt("Auto Retry"), statusInfo: msgJSON['statusDescription'], connecting: true, connected: false });
			this.props.appStateUpdate({cameraStatus: 'error'});
		}
		else if (msgStatus != 200) 
		{
			// jQuery("#sdpDataTag").html(msgJSON['statusDescription']);
			console.log('components/Camera wsConnection.onWsMessage error sdp:', msgStatus, msgJSON['statusDescription'], this.streamInfo);


			this.stopPublisher();
			this.setState({ buttonDisabled: false, buttonContent: this.txt("Broadcast"), statusInfo: msgJSON['statusDescription'], connecting: false, connected: false });
			this.props.appStateUpdate({cameraStatus: 'error'});

			//error: no retries
			this.retriesLeft = 0;
			this.retryIfBusy  = true;
		} 
		else { //200
			//jQuery("#sdpDataTag").html("");

			var sdpData = msgJSON['sdp'];
			if (sdpData !== undefined) {
				if (this.devMode) console.log('components/Camera wsConnection.onWsMessage 200 sdp:', msgJSON['sdp']);

				//	this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData), function () {}, this.errorHandler);

				this.peerConnection.setRemoteDescription(sdpData)
					.then(
						() => {	
							if (this.devMode) console.log('components/Camera peerConnection.setRemoteDescription: ', this.peerConnection, sdpData );
						}
					)
					.catch( (e) => 
					{
						var sdp = sdpData.sdp;
						var lastChars = sdp.substring(sdp.length - 2);
						console.log('components/Camera peerConnection.setRemoteDescriptionError', e, sdp, lastChars, (lastChars=="\r\n") )
					} 
					)
			}

			var iceCandidates = msgJSON['iceCandidates'];
			if (this.devMode) console.log('components/Camera wsConnection msgJSON iceCandidates: ', iceCandidates);

			if (iceCandidates !== undefined) {
				for (var index in iceCandidates) {
					if (this.devMode) console.log('components/Camera wsConnection iceCandidate: ', index, iceCandidates[index] );

					this.peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidates[index]))
						.then(
							() => this.onAddIceCandidateSuccess(this.peerConnection),
							err => this.onAddIceCandidateError(this.peerConnection, err));
				}

			  //close after receiving candidates
			  if (this.wsConnection) if (this.wsConnection.readyState < 2) this.wsConnection.close();
			  //  this.wsConnection = null;

			}

			this.retryIfBusy = true;
		}


	}

	onAddIceCandidateSuccess(e) {
		if (this.devMode) console.log('components/Camera onAddIceCandidateSuccess success.', e);
	}

	onAddIceCandidateError(pC, error) {
		 console.log('components/Camera onAddIceCandidateError', error, pC );
	}


	gotDescription(description) //gotDescription 
	{
		//create offer after ws onconnect
		const { props, state, txt } = this;
		if (this.devMode) console.log('components/Camera gotDescription: original', description, this.serverWowza, this.serverVideowhisper );

		description = this.mungeDescription(description);

		if (!this.peerConnection) console.log('components/Camera gotDescription: Error no this.peerConnection', state);

		this.peerConnection.setLocalDescription(description)
			.then(
				() => 
				{ 
					if (this.serverWowza) 
					{
					const sendMsg = '{"direction":"publish", "command":"sendOffer", "streamInfo":' + JSON.stringify(this.streamInfo) + ', "sdp":' + JSON.stringify(description) + ', "userData":' + JSON.stringify(this.userData) + '}';
					if (this.devMode) console.log('components/Camera gotDescription > wsConnection.send after setLocalDescription ', this.wsConnection, sendMsg);
					if (this.wsConnection) if (this.wsConnection.readyState == 1) this.wsConnection.send(sendMsg);
										else console.log('components/Camera gotDescription > wsConnection.send / wsConnection not ready - readyState:', this.wsConnection.readyState);
					}

					if (this.serverVideowhisper)
					{						

					}
				}
			)
			.catch(
				(error) => {
					console.log('components/Camera gotDescription, setLocalDescription error, description.sdp', error, description.sdp);
					this.setState({ 'statusInfo': 'Stream setup error: Retry!', settingsActive: true, buttonDisabled: false, buttonContent: txt('Broadcast'), connecting: false, connected: false });
					this.props.appStateUpdate({cameraStatus: 'error'});
				}
			);

	}
	//


	/*
	setMediaBitrateSDP = (sdp, media, bitrate) => {

		//https://community.cisco.com/t5/collaboration-voice-and-video/understand-video-signaling-with-sdp-debugs/ta-p/3158964 

		//media=video/audio
		//Skip lines until we find m=audio or m=video  (depending on which one we’re setting)
		//Skip i and c lines
		//If we’re on a b line, replace it
		//If we’re not on a b line, add a new b  line

		let modifier = 'AS';

		let useTIAS = false;
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) useTIAS = true;
		//useTIAS = true;

		//chrome video bitrate fix
		//if (media == 'video' && navigator.userAgent.toLowerCase().indexOf('chrome') > -1) bitrate = bitrate * 1.1;

		if (useTIAS) {
			bitrate = (bitrate >>> 0) * 1000;
			modifier = 'TIAS';
		}

		bitrate = Math.round(bitrate);

		var lines = sdp.split("\n");
		var line = -1;
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].indexOf("m=" + media) === 0) {
				line = i;
				break;
			}
		}
		if (line === -1) {
			//console.debug("Could not find the m line for", media);
			return sdp;
		}
		//console.debug("Found the m line for", media, "at line", line);

		// Pass the m line
		line++;

		// Skip i and c lines
		while (lines[line].indexOf("i=") === 0 || lines[line].indexOf("c=") === 0) {
			line++;
		}

		// If we're on a b line, replace it
		if (lines[line].indexOf("b") === 0) {
			//console.debug("Replaced b line at line", line);
			lines[line] = "b=" + modifier + ":" + bitrate;
			return lines.join("\n");
		}

		// Add a new b line
		//console.debug("Adding new b line before line", line);
		var newLines = lines.slice(0, line)
		newLines.push("b=" + modifier + ":" + bitrate)
		newLines = newLines.concat(lines.slice(line, lines.length));


		if (this.devMode) console.log('components/Camera setMediaBitrateSDP', media, bitrate, newLines.join("\n") );

		return newLines.join("\n")
	}
*/

	/*
	addAudio(sdpStr, audioLine) {
		var sdpLines = sdpStr.split(/\r\n/);
		var sdpSection = 'header';
		var hitMID = false;
		var sdpStrRet = '';
		var done = false;

		for (var sdpIndex in sdpLines) {
			var sdpLine = sdpLines[sdpIndex];

			if (sdpLine.length <= 0)
				continue;


			sdpStrRet += sdpLine;
			sdpStrRet += '\r\n';

			if ('a=rtcp-mux'.localeCompare(sdpLine) == 0 && done == false) {
				sdpStrRet += audioLine;
				done = true;
			}


		}
		return sdpStrRet;
	}


	addVideo(sdpStr, videoLine) {
		var sdpLines = sdpStr.split(/\r\n/);
		var sdpSection = 'header';
		var hitMID = false;
		var sdpStrRet = '';
		var done = false;

		var rtcpSize = false;
		var rtcpMux = false;

		for (var sdpIndex in sdpLines) {
			var sdpLine = sdpLines[sdpIndex];

			if (sdpLine.length <= 0)
				continue;

			if (sdpLine.includes("a=rtcp-rsize")) {
				rtcpSize = true;
			}

			if (sdpLine.includes("a=rtcp-mux")) {
				rtcpMux = true;
			}

		}

		for (var sdpIndex in sdpLines) {
			var sdpLine = sdpLines[sdpIndex];

			sdpStrRet += sdpLine;
			sdpStrRet += '\r\n';

			if (('a=rtcp-rsize'.localeCompare(sdpLine) == 0) && done == false && rtcpSize == true) {
				sdpStrRet += videoLine;
				done = true;
			}

			if ('a=rtcp-mux'.localeCompare(sdpLine) == 0 && done == true && rtcpSize == false) {
				sdpStrRet += videoLine;
				done = true;
			}

			if ('a=rtcp-mux'.localeCompare(sdpLine) == 0 && done == false && rtcpSize == false) {
				done = true;
			}

		}
		return sdpStrRet;
	}
*/

 
//4wowzaa


	  addAudio(sdpStr, audioLine) {
	let sdpLines = sdpStr.split(/\r\n/);
	let sdpSection = '';
	let sdpStrRet = '';
	let done = false;
  
	for (let sdpIndex in sdpLines) {
	  let sdpLine = sdpLines[sdpIndex];
  
	  if (sdpLine.length <= 0)
		continue;
  
	  if (sdpLine.indexOf('m=audio') === 0) {
		sdpSection = 'audio';
	  } else if (sdpLine.indexOf('m=video') === 0) {
		sdpSection = 'video';
	  }
	
	  sdpStrRet += sdpLine;
	  sdpStrRet += '\r\n';
  
	  if (sdpSection === 'audio') {
		if ('a=rtcp-mux'.localeCompare(sdpLine) === 0 && done === false) {
		  sdpStrRet += audioLine;
		  done = true;
		}
	  }
	}
	return sdpStrRet;
  }
  
	 addVideo(sdpStr, videoLine) {
		let sdpLines = sdpStr.split(/\r\n/);
		let sdpStrRet = '';
		let done = false;
	  
		let rtcpSize = false;
	  
		for (let sdpIndex in sdpLines) {
		  let sdpLine = sdpLines[sdpIndex];
	  
		  if (sdpLine.length <= 0)
			continue;
	  
		  if (sdpLine.includes("a=rtcp-rsize")) {
			rtcpSize = true;
		  }
	  
		}
	  
		for (let sdpIndex in sdpLines) {
		  let sdpLine = sdpLines[sdpIndex];
	  
		  sdpStrRet += sdpLine;
		  sdpStrRet += '\r\n';
	  
		  if (('a=rtcp-rsize'.localeCompare(sdpLine) === 0) && done === false && rtcpSize === true) {
			sdpStrRet += videoLine;
			done = true;
		  }
	  
		  if ('a=rtcp-mux'.localeCompare(sdpLine) === 0 && done === true && rtcpSize === false) {
			sdpStrRet += videoLine;
			done = true;
		  }
	  
		  if ('a=rtcp-mux'.localeCompare(sdpLine) === 0 && done === false && rtcpSize === false) {
			done = true;
		  }
	  
		}
		return sdpStrRet;
	  }


mungeSDPPublish(sdpStr, mungeData) {

	const { config } = this.props;
	const browserDetails = adapter.browserDetails;

	this.SDPOutput = {};
	var videoChoice = "42e01f"; 
	var audioChoice = "opus";
	this.videoIndex = -1;
	this.audioIndex = -1;
  
	let sdpLines = sdpStr.split(/\r\n/);
  
	let sdpSection = 'header';
	let hitMID = false;
	let sdpStrRet = '';
  
	if (mungeData.videoCodec != null && mungeData.videoCodec !== '')
	  videoChoice = mungeData.videoCodec;
	if (mungeData.audioCodec != null && mungeData.audioCodec !== '')
	  audioChoice = mungeData.audioCodec;
  
	// Deliver the requested codecs
	for (let sdpIndex in sdpLines) {
	  let sdpLine = sdpLines[sdpIndex];
  
	  if (sdpLine.length <= 0)
		continue;
  
		if(sdpLine.includes("urn:3gpp:video-orientation")) //skip orientation signaling
		continue;

	  let doneCheck = this.checkLine(sdpLine);
	  if (!doneCheck)
		continue;
  
	  sdpStrRet += sdpLine;
	  sdpStrRet += '\r\n';
  
	}
	sdpStrRet = this.addAudio(sdpStrRet, this.deliverCheckLine(audioChoice, "audio"));
	sdpStrRet = this.addVideo(sdpStrRet, this.deliverCheckLine(videoChoice, "video"));
	sdpStr = sdpStrRet;
	sdpLines = sdpStr.split(/\r\n/);
	sdpStrRet = '';
  
	for (let sdpIndex in sdpLines) {
	  let sdpLine = sdpLines[sdpIndex];
  
	  if (sdpLine.length <= 0)
		continue;
  
	  if (browserDetails.browser === 'chrome') {
		let audioMLines;
		if (sdpLine.indexOf("m=audio") === 0 && this.audioIndex !== -1) {
		  audioMLines = sdpLine.split(" ");
		  sdpStrRet += audioMLines[0] + " " + audioMLines[1] + " " + audioMLines[2] + " " + this.audioIndex + "\r\n";
		  continue;
		}
  
		if (sdpLine.indexOf("m=video") === 0 && this.videoIndex !== -1) {
		  audioMLines = sdpLine.split(" ");
		  sdpStrRet += audioMLines[0] + " " + audioMLines[1] + " " + audioMLines[2] + " " + this.videoIndex + "\r\n";
		  continue;
		}
	  }
  
	  sdpStrRet += sdpLine;
  
	  if (sdpLine.indexOf("m=audio") === 0) {
		sdpSection = 'audio';
		hitMID = false;
	  }
	  else if (sdpLine.indexOf("m=video") === 0) {
		sdpSection = 'video';
		hitMID = false;
	  }
	  else if (sdpLine.indexOf("a=rtpmap") === 0) {
		sdpSection = 'bandwidth';
		hitMID = false;
	  }
  
	  if (browserDetails.browser === 'chrome') {
		if (sdpLine.indexOf("a=mid:") === 0 || sdpLine.indexOf("a=rtpmap") === 0) {
		  if (!hitMID) {
			if ('audio'.localeCompare(sdpSection) === 0) {
			  if (mungeData.audioBitrate !== undefined) {
				sdpStrRet += '\r\nb=CT:' + (mungeData.audioBitrate);
				sdpStrRet += '\r\nb=AS:' + (mungeData.audioBitrate);
			  }
			  hitMID = true;
			}
			else if ('video'.localeCompare(sdpSection) === 0) {
			  if (mungeData.videoBitrate !== undefined) {
				sdpStrRet += '\r\nb=CT:' + (mungeData.videoBitrate);
				sdpStrRet += '\r\nb=AS:' + (mungeData.videoBitrate);
				if (mungeData.frameRate !== undefined) {
				  sdpStrRet += '\r\na=framerate:' + mungeData.frameRate;
				}
			  }
			  hitMID = true;
			}
			else if ('bandwidth'.localeCompare(sdpSection) === 0) {
			  let rtpmapID;
			  rtpmapID = this.getrtpMapID(sdpLine);
			  if (rtpmapID !== null) {
				let match = rtpmapID[2].toLowerCase();
				if (('vp9'.localeCompare(match) === 0) || ('vp8'.localeCompare(match) === 0) || ('h264'.localeCompare(match) === 0) ||
				  ('red'.localeCompare(match) === 0) || ('ulpfec'.localeCompare(match) === 0) || ('rtx'.localeCompare(match) === 0)) {
				  if (mungeData.videoBitrate !== undefined) {
					sdpStrRet += '\r\na=fmtp:' + rtpmapID[1] + ' x-google-min-bitrate=' + (mungeData.videoBitrate) + ';x-google-max-bitrate=' + (mungeData.videoBitrate);
				  }
				}
  
				if (('opus'.localeCompare(match) === 0) || ('isac'.localeCompare(match) === 0) || ('g722'.localeCompare(match) === 0) || ('pcmu'.localeCompare(match) === 0) ||
				  ('pcma'.localeCompare(match) === 0) || ('cn'.localeCompare(match) === 0)) {
				  if (mungeData.audioBitrate !== undefined) {
					sdpStrRet += '\r\na=fmtp:' + rtpmapID[1] + ' x-google-min-bitrate=' + (mungeData.audioBitrate) + ';x-google-max-bitrate=' + (mungeData.audioBitrate);
				  }
				}
			  }
			}
		  }
		}
	  }
  
	  if (browserDetails.browser === 'firefox' || browserDetails.browser === 'safari') {
		if ( sdpLine.indexOf("c=IN") === 0 )
		{
		  if ('audio'.localeCompare(sdpSection) === 0)
		  {
			if (mungeData.audioBitrate !== '') {
			  let audioBitrate = parseInt(mungeData.audioBitrate) * 1000;
			  let audioBitrateTIAS = parseInt(mungeData.audioBitrate) * 1000 * 0.95 - (50 * 40 * 8);
			  sdpStrRet += "\r\nb=TIAS:"+audioBitrateTIAS+"\r\n";
			  sdpStrRet += "b=AS:"+audioBitrate+"\r\n";
			  sdpStrRet += "b=CT:"+audioBitrate+"\r\n";
			}
			continue;
		  }
		  if ('video'.localeCompare(sdpSection) === 0)
		  {
			if (mungeData.videoBitrate !== '') {
			  let videoBitrate = parseInt(mungeData.videoBitrate) * 1000;
			  let videoBitrateTIAS = parseInt(mungeData.videoBitrate) * 1000 * 0.95 - (50 * 40 * 8);
			  sdpStrRet += "\r\nb=TIAS:"+videoBitrateTIAS+"\r\n";
			  sdpStrRet += "b=AS:"+videoBitrate+"\r\n";
			  sdpStrRet += "b=CT:"+videoBitrate+"\r\n";
			}
			continue;
		  }
		}
	  }
  
	  sdpStrRet += '\r\n';
	}

	const isSafari = navigator.userAgent.toLowerCase().indexOf('safari/') > -1;
	if (isSafari) sdpStrRet = sdpStrRet.replace(/UDP\/TLS\/RTP\/SAVPF/gi, "RTP/SAVPF");

	return sdpStrRet;
  }



// Filter codec offerings
 deliverCheckLine(profile, type) {
  for (let line in this.SDPOutput) {
    let lineInUse = this.SDPOutput[line];
    if (lineInUse.includes(profile)) {
      if (profile.includes("VP9") || profile.includes("VP8")) {
        let output = "";
        let outputs = lineInUse.split(/\r\n/);
        for (let position in outputs) {
          let transport = outputs[position];
          output += transport;
          output += "\r\n";
        }

        if (type.includes("audio")) {
          this.audioIndex = line;
        }

        if (type.includes("video")) {
          this.videoIndex = line;
        }

        return output;
      }
      if (type.includes("audio")) {
        this.audioIndex = line;
      }

      if (type.includes("video")) {
        this.videoIndex = line;
      }

      return lineInUse;
    }
  }
  return '';
}


 checkLine(line) {
	if (line.startsWith("a=rtpmap") || line.startsWith("a=rtcp-fb") || line.startsWith("a=fmtp")) {
	  let res = line.split(":");
  
	  if (res.length > 1) {
		let number = res[1].split(" ");
		if (!isNaN(number[0])) {
		  if (!number[1].startsWith("http") && !number[1].startsWith("ur")) {
			let currentString = this.SDPOutput[number[0]];
			if (!currentString) {
			  currentString = "";
			}
			currentString += line + "\r\n";
			this.SDPOutput[number[0]] = currentString;
			return false;
		  }
		}
	  }
	}
  
	return true;
  }
  
	getrtpMapID(line) {
		var findid = new RegExp('a=rtpmap:(\\d+) (\\w+)/(\\d+)');
		var found = line.match(findid);
		return (found && found.length >= 3) ? found : null;
	}

	
	//end wowza

	errorHandler = (error) => {
		if (this.devMode) console.log('components/Camera', error );
	}


}
