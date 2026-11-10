import React, { Component } from 'react';

import PropTypes from 'prop-types';
import RecordRTC from 'recordrtc';
import { resolveInstanceConfig } from '../embed';

import { Button, Icon, Label, Divider, Form, Modal, Header, Grid, Popup, Image, Segment, Dropdown, Menu } from 'semantic-ui-react';
import request from "superagent";


export default class Recorder extends Component {

    //props (expected component properties)
    static propTypes = {
        config: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,

        serverUpdate: PropTypes.func.isRequired,

        recorderStatus: PropTypes.func.isRequired,

        options: PropTypes.object.isRequired,
    };



    constructor(props) {
        super(props);

        this.devMode = props.appState.devMode;
        this._isMounted = false;

        this.videoWidth = 480;
        this.videoHeight = 320;

        this.state = {

			camera: null,
			cameraOptions: [],
			videoSource: null,

			microphone: null,
			microphoneOptions: [],
			audioSource: null,

            mode: 'video',
            mediaRecorder: false,
            buttonStart: false,
            buttonStop: false,
            buttonDiscard: false,
            buttonSend: false,
            statusInfo: '',
            uploading: false,
            displayTime: '0:00',

        };

        this.info = '';
        this.maxTime = 0;

        this.audioPlayback = React.createRef();
        this.videoPlayback = React.createRef();

        this.videoPreview = React.createRef();

        this.recorderData = null;

        this.mimeType = 'video/mp4';
        this.fileExtension = 'mp4';

        this.resolutions = {
			"4K": {
				"label": "4K",
				"width": 3840,
				"height": 2160,
				"ratio": "16:9",
				"bitrate": 12000, //30000
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
				"bitrate": 3000, //5000
			},
			"720p": {
				"label": "720p",
				"width": 1280,
				"height": 720,
				"ratio": "16:9",
				"bitrate": 1800, //3000
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
				"width": 858,
				"height": 480,
				"ratio": "16:9",
				"bitrate": 750, //2500
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
				"bitrate": 400, //400
			},
			"240p": {
				"label": "240p",
				"width": 426,
				"height": 240,
				"ratio": "16:9",
				"bitrate": 220, //500
			},
			"CIF": {
				"label": "CIF",
				"width": 352,
				"height": 288,
				"ratio": "4:3",
				"bitrate": 200, //450
			},
			"QVGA": {
				"label": "QVGA",
				"width": 320,
				"height": 240,
				"ratio": "4:3",
				"bitrate": 180, //400
			}
			,
			"180p": {
				"label": "180p",
				"width": 320,
				"height": 180,
				"ratio": "16:9",
				"bitrate": 160, //300
			},
			"90p": {
				"label": "90p",
				"width": 160,
				"height": 90,
				"ratio": "16:9",
				"bitrate": 100, //150
			}
		};
    }


    txt = (text) => {
        //handle text translations from config
        const { props } = this;
        if (!props.config) return text;
        if (text in props.config.text) return props.config.text[text];

        return text;
    }


    timerStart() {
        const { props } = this;

        this.timerTimeStart = Date.now();
        this.timerLocal = setInterval(this.timerTick.bind(this), 1000); //local timer display seconds
        //this.setState({ timerOn: true });
    }

    timerStop() {
        clearInterval(this.timerLocal);
        //this.setState({ timerOn: false });

        //final update
        this.timeLocal = Date.now() - this.timerTimeStart;
        this.setState({ displayTime: this.toMMSS(Math.floor(this.timeLocal / 1000)) });
    }

    timerTick() {
        this.timeLocal = Date.now() - this.timerTimeStart;

        if (this.props.appState.checked) if (this.props.appState.mode.time) if (this.maxTime == 0 || this.maxTime > this.props.appState.mode.time) this.maxTime = this.props.appState.mode.time;

        this.setState({ displayTime: this.toMMSS(Math.floor(this.timeLocal / 1000)) });

        //stop on limit
        if (this.maxTime > 0) if (this.timeLocal >= this.maxTime * 1000) this.recordingStop();
    }

    toMMSS = function (sec_num) {
        var minutes = Math.floor(sec_num / 60);
        var seconds = sec_num - (minutes * 60);

        //if (minutes < 10) { minutes = "0" + minutes; }
        if (seconds < 10) { seconds = "0" + seconds; }
        return minutes + ':' + seconds;
    }

    componentDidMount() {
        this._isMounted = true;
        if (this.devMode) console.log('components/Recorder componentDidMount', this.props);
        //super.componentDidMount();
        this.setupInterface();
    }

    componentWillUnmount() {
		if (this.devMode) console.log('components/Recorder componentWillUnmount');
		this._isMounted = false;
        this.recordingDiscard();
        this.timerStop();
		//super.componentWillUnmount();
    }
    
    setupInterface() {

        this.isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        this.recorderRTC = null;
        this.stream = null;

        this.setState({ statusInfo: this.txt('Ready to Start') });

        if (this.props.config.recorderMaxTime) this.maxTime = this.props.config.recorderMaxTime;
        if (this.props.config.recorderMode) this.setState({ mode: this.props.config.recorderMode });


        //this.maxTime = 10; //test

        this.getMedia();

        if (this.devMode) console.log("components/Recorder/setupInterface");

    }

    getVideoWhisper = () => resolveInstanceConfig(this.props.config)

    componentDidUpdate() {
    }

    composedStream([micStream, screenStream]) 
	{

				  var composedStream = new MediaStream();

				  if (this.devMode) console.log("components/Recorder/composedStream : ", micStream, screenStream, composedStream);

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
				  
				  if (this.devMode) console.log("components/Recorder/composedStream : ", micStream, screenStream, composedStream);

				return composedStream;
	  }


    getMedia() {

        //if (!this._isMounted) return;

        const {state, props} = this;

        if (!this._isMounted)
        {
            if (this.devMode) console.log("components/Recorder/getMedia not _isMounted", this._isMounted );
            return;
        }

        //video recording available?
        if (this.state.mediaRecorder && typeof(MediaRecorder) == 'undefined') 
        {
            this.setState({mediaRecorder:false, mode: 'audio'});
        }

        if (!this.state.mediaRecorder && typeof(MediaRecorder) != 'undefined') 
        {
            this.setState({mediaRecorder:true});
        }

        if (typeof(MediaRecorder) !== 'undefined') //not available in Safari 
        if (typeof MediaRecorder.isTypeSupported === "function")
        {   
            var fileTypes; 
            if (this.state.mode === 'audio') fileTypes = { mp3: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg' }
            else fileTypes = { mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska' }

            this.mimeType = Object.values(fileTypes).filter(MediaRecorder.isTypeSupported)[0];
            this.fileExtension = Object.keys(fileTypes).find(key => fileTypes[key] === this.mimeType);

            if (this.devMode) console.log("components/Recorder/getMedia MediaRecorder", this.mimeType, this.fileExtension, this.state.mode);

        }
              //default, safari
              if (this.state.mode === 'audio')
              {
                if (!this.mimeType) this.mimeType = 'audio/mp4';
                if (!this.fileExtension) this.fileExtension = 'mp3';
              }
              else
              {
                if (!this.mimeType)  this.mimeType = 'video/mp4';
                if (!this.fileExtension)  this.fileExtension = 'mp4';    
              }

       //get resoluton
        for (var key in this.resolutions)
        if (key == state.resolution) {
            this.videoWidth = this.resolutions[key]['width'];
            this.videoHeight = this.resolutions[key]['height'];
        }

        ///constraints
        var constraints = {};

        if (state.audioSource != '_disabled') constraints['audio'] = { deviceId: state.audioSource ? { exact: state.audioSource } : undefined };
		else constraints['audio'] = false;

        if (!this.isEdge && constraints['audio'])  constraints['audio']['echoCancellation'] = false; //disable in Edge

        if (state.videoSource != '_disabled' && state.mode != 'audio') constraints['video'] = { deviceId: state.videoSource ? { exact: state.videoSource } : undefined, width: { ideal: this.videoWidth }, height: { ideal: this.videoHeight } };
		else constraints['video'] = false;


        //screen sharing 

        if (state.mode === 'screen')
		{
			var constraintsScreen = {
				video: true, 
				audio: true
			};
			
			if(navigator.mediaDevices.getDisplayMedia) {
		
			if ( constraints['audio'] ) //compose with audio if present
			{
				const promiseScreen = navigator.mediaDevices.getDisplayMedia(constraintsScreen).catch(this.handleError.bind(this));
				const promiseAudio = navigator.mediaDevices.getUserMedia(constraints).catch(this.handleError.bind(this));

				console.log("components/Recorder/getMedia screen Promise.all fc", promiseScreen, promiseAudio)

				Promise.all([promiseAudio, promiseScreen]).then( (values) => this.composedStream(values) ).then(this.gotStream.bind(this)).then(this.gotDevices.bind(this)).catch(this.handleError.bind(this));
			} else navigator.mediaDevices.getDisplayMedia(constraintsScreen).then(this.gotStream.bind(this)).then(this.gotDevices.bind(this)).catch(this.handleError.bind(this)); 

			} else console.log("No navigator.mediaDevices.getDisplayMedia!");
		
			if (this.devMode) console.log("components/Recorder/getMedia screen videoSource: ", state.videoSource, "  constraintsScreen=", constraintsScreen, "  constraints=", constraints);

			return; 
		}
        
     
        if (this.devMode) console.log("components/Recorder getUserMedia:", constraints, this.state);

        navigator.mediaDevices.getUserMedia(constraints).then(this.gotStream.bind(this)).then(this.gotDevices.bind(this)).catch(this.handleError.bind(this));

    }

    gotStream(stream) {

        if (!this._isMounted) return;

        //gets stream 
        this.stream = stream;

        if (this.state.mode != 'audio') this.videoPreview.current.srcObject = stream;

        if (this.devMode) console.log("components/Recorder gotStream", stream, this.videoPreview.current);


        this.setState({ buttonStart: true });

        // Refresh button list in case labels have become available (usually after receiving permissions)
        return navigator.mediaDevices.enumerateDevices();
    }

    gotDevices(deviceInfos) {
        if (!this._isMounted) return;

		//called with promise from navigator.mediaDevices.enumerateDevices

        if (this.devMode) console.log("components/Recorder gotDevices after getUserMedia", deviceInfos);

		var { state, props } = this;

		var cameraOptions = [{
			key: 'cam-title',
			text: (
				<span>
					Select <strong>Camera</strong>:
			  </span>
			),
			disabled: true,
		}
//		{ text: 'No Camera', value: '_disabled' }
		];

		var microphoneOptions = [{
			key: 'mic-title',
			text: (
				<span>
					Select <strong>Microphone</strong>:
			  </span>
			),
			disabled: true,
        }
        ]; 

		let videoValid = false;
		let audioValid = false;

		for (let i = 0; i !== deviceInfos.length; ++i) {
			const deviceInfo = deviceInfos[i];

			var option = { value: deviceInfo.deviceId };

			if (deviceInfo.kind === 'audioinput') {
				option.text = deviceInfo.label || `microphone ${microphoneOptions.length + 1}`;
				microphoneOptions.push(option);

				if (!state.microphone) state.microphone = deviceInfo.deviceId; //select first mic
				if (deviceInfo.deviceId === state.microphone) audioValid = true; //selected id valid

			} else if (deviceInfo.kind === 'videoinput') {
				option.text = deviceInfo.label || `camera ${cameraOptions.length + 1}`;
				cameraOptions.push(option);
				if (!state.camera) state.camera = deviceInfo.deviceId; //select first cam
				if (deviceInfo.deviceId === state.camera) videoValid = true; //selected id valid

			} else {
				//	console.log('Some other kind of source/device: ', deviceInfo);
			}
		}

		//updating videoSource, audioSource only if still valid because Safari changes deviceID 
		if (videoValid || state.camera === '_disabled') state.videoSource = state.camera;
		if (audioValid || state.microphone === '_disabled') state.audioSource = state.microphone;

		//warn user if selection could not be applied
		if (state.camera !== state.videoSource || state.microphone !== state.audioSource) //changing (selected)
			if (!videoValid || !audioValid) {
				console.log('components/Camera gotDevices: deviceID changed videoValid:' + state.camera + ' videoSelected: ' + state.microphone + ' audioValid:' + audioValid);
				this.setState({ 'statusInfo': 'Media DeviceID changed: Please select again!' });
			}

		if (this.devMode) console.log('gotDevices: verified videoSource: ' + state.videoSource + ' changed videoValid: ' + videoValid);



            //update max time for demo mode
            var modeText = false;
        //    if (props.appState.modeVersion != props.appState.version) //activate modeVersion
            if (!props.appState.checked || (props.appState.checked && props.appState.mode.text)) {
                modeText = true;
                if (props.appState.checked) if (props.appState.mode.time) if (this.maxTime == 0 || this.maxTime > props.appState.mode.time) this.maxTime = props.appState.mode.time;
            }
            this.modeText = modeText;
    
            // update resolutions
            this.resolutionHeight = Number(props.config.resolutionHeight);
            if (!this.resolutionHeight) this.resolutionHeight = 480; //default resolution
    
            this.maxResolutionHeight = Number(props.config.maxResolutionHeight); //app config
            if (!this.maxResolutionHeight) this.maxResolutionHeight = 0;
    
    
            this.tWarn = '';
            //demo mode
          //  if (props.appState.modeVersion != props.appState.version) //activate modeVersion
            if ( !props.appState.checked  || (props.appState.checked && props.appState.mode.text) )
            {
                //limit
                if (this.resolutionHeight > 480) this.resolutionHeight = 480;
    
                if (this.maxResolutionHeight > 480) this.maxResolutionHeight = 480;
                if (!this.maxResolutionHeight) this.maxResolutionHeight = 480;
    
                if (this.resolutionHeight > this.maxResolutionHeight) this.resolutionHeight = this.maxResolutionHeight;
    
                this.tWarn = 'Demo Mode Configured: Limited resolution and recording time.';
            }
    
            this.state.maxResolutionHeight = this.maxResolutionHeight;
    
            this.resolutionOptions = [{
                key: 'res-title',
                text: (
                    <span>
                         <strong>{this.txt('Video Resolution')}</strong>{this.state.maxResolutionHeight ? ' <' + this.state.maxResolutionHeight +'p':''}
                  </span>
                ),
                disabled: true,
            }];
    
            if (this.resolutions)
                for (var key in this.resolutions)
                    if (this.maxResolutionHeight === 0 || this.resolutions[key]['height'] <= this.maxResolutionHeight)
                    {
                        this.resolutionOptions.push({
                            key: key,
                            value: key,
                            text: this.resolutions[key]['label'] + ' ' + this.resolutions[key]['width'] + 'x' + this.resolutions[key]['height'] + ' ' + this.resolutions[key]['ratio'],
                        });
                    }
    
    
            this.state.resolutionOptions = this.resolutionOptions;
            
            if (!state.resolution) this.state.resolution = this.resolutionHeight.toString() +'p';

            if (props.appState.checked) this.tChecked = true; //updated with checked
    
         
		//update options
		if (this._isMounted) this.setState({ cameraOptions: cameraOptions, microphoneOptions: microphoneOptions });
    }
    

    handleError(error) {
        console.log('components/Recorder getMedia handleError: ', error);
        this.setState({ 'statusInfo': 'Error: ' + error });
    }


    SaveToDisk(fileURL, fileName) {
        // for non-IE
        if (!window.ActiveXObject) {
            var save = document.createElement('a');
            save.href = fileURL;
            save.download = fileName || 'unknown';
            save.style = 'display:none;opacity:0;color:transparent;';
            (document.body || document.documentElement).appendChild(save);

            if (typeof save.click === 'function') {
                save.click();
            } else {
                save.target = '_blank';
                var event = document.createEvent('Event');
                event.initEvent('click', true, true);
                save.dispatchEvent(event);
            }

            (window.URL || window.webkitURL).revokeObjectURL(save.href);
        }

        // for IE
        else if (!!window.ActiveXObject && document.execCommand) {
            var _window = window.open(fileURL, '_blank');
            _window.document.close();
            _window.document.execCommand('SaveAs', true, fileName || fileURL)
            _window.close();
        }

        this.props.recorderStatus('fileSaved');
    }

    getRandomString() {
        if (window.crypto && window.crypto.getRandomValues && navigator.userAgent.indexOf('Safari') === -1) {
            var a = window.crypto.getRandomValues(new Uint32Array(3)),
                token = '';
            for (var i = 0, l = a.length; i < l; i++) {
                token += a[i].toString(36);
            }
            return token;
        } else {
            return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
        }
    }

    getFileName(fileExtension) {
        var d = new Date();
        var year = d.getFullYear();
        var month = d.getMonth();
        var date = d.getDate();
        return 'VideoWhisper-' + year + month + date + '-' + this.getRandomString() + '.' + fileExtension;
    }

    uploadCompleted(e) {
        if (this.devMode) console.log('components/Recorder uploadCompleted', e);
        this.setState({ uploading: false, statusInfo: this.txt('Upload completed.') });

        if (this.props.options) if (this.props.options.scenario == 'chat') this.props.serverUpdate({ task: 'update', 'update': 'chat' });

        //notify
        this.props.recorderStatus('uploadCompleted');

        //externall call
        const VideoWhisper = this.getVideoWhisper();
        if (VideoWhisper && typeof VideoWhisper.recoderUploadCompleted != "undefined" ) VideoWhisper.recoderUploadCompleted(this.filename);
        else if (this.devMode) console.log('components/Recorder uploadCompleted recoderUploadCompleted missing', VideoWhisper ? typeof VideoWhisper.recoderUploadCompleted : 'undefined', window.recorderUploadCompleted, VideoWhisper);
    }

    recordingStop() {
        if (this.devMode) console.log("components/Recorder recordingStop", this.recorderRTC);

        if (this.mediaRecorder) this.mediaRecorder.stop();

        if (this.recorderRTC) this.recorderRTC.stopRecording(
            () => {
                this.recorderData = URL.createObjectURL(this.recorderRTC.getBlob());

                if (this.devMode) console.log("components/Recorder this.recorderData", this.recorderData);

                if (this.state.mode === 'audio') 
                {
                    this.audioPlayback.current.src = this.recorderData;
                    this.audioPlayback.current.play().then( accept => {
                        if (this.devMode) console.log('components/Recorder Audio Autoplay started', accept);
                            }, reject => {
                        console.log('components/Recorder Audio Autoplay reject:', reject);
                      }).catch(error => {
                        console.log('components/Recorder Audio Autoplay error:', error);
                     });
                }
                else 
                {
                    this.videoPlayback.current.src = this.recorderData;
                    this.videoPlayback.current.play().then( accept => {
                        if (this.devMode) console.log('components/Recorder Video Autoplay started', accept);
                            }, reject => {
                        console.log('components/Recorder Video Autoplay reject:', reject);
                      }).catch(error => {
                        console.log('components/Recorder Video Autoplay error:', error);
                     });
                }
            }
        )

        //disable preview but only if not recording audio only
        if (this.state.mode != 'audio') this.videoPreview.current.srcObject = null;


        this.stream.stop();

        this.timerStop();

        this.setState({ buttonStart: false, buttonStop: false, buttonDiscard: true, buttonSend: true, statusInfo: this.txt('Recorded: Send, Download or Discard') });
    }

    recordingDiscard()
    {
        this.recorderData = null;

        //stop previous stream
        if (this.stream) this.stream.getTracks().forEach(track => {
            track.stop();
            if (this.devMode) console.log("components/Recorder buttonDiscard closed track", track);

        });

        this.setState({ buttonStart: true, buttonStop: false, buttonDiscard: false, buttonSend: false, statusInfo: this.txt('Ready to Start'), displayTime: '0:00' });

        //new stream
        this.getMedia();
    }

    onChange = (e, { name, value }) => {

        if (this.state[name] == value) return; // not changed


		//changed controls
		this.setState({
			[name]: value
        }, ()=>  //async
        {
        this.changedBy = name;
        
        this.recordingDiscard();

        //updates devices (with new selection)
        navigator.mediaDevices.enumerateDevices().then(this.gotDevices.bind(this)).catch(this.handleError.bind(this));        
        }
        );


		if (this.devMode) console.log('components/Recorder onChange', name, value, e);

	}


    onClick(e, { name, value }) {
        const { state, props } = this;

        if (this.devMode) console.log("components/Recorder onClick", name, value, e, state);


        switch (name) {

            case 'buttonDetect':
                this.getMedia();
            break;

            case 'buttonAudio':
                if (state.mode == 'audio') break;
                this.setState({ mode: 'audio' }, () => this.recordingDiscard()); //async

                break;

            case 'buttonVideo':
                if (!state.mediaRecorder) break;
                if (state.mode === 'video') break;
                this.setState({ mode: 'video' }, () => this.recordingDiscard());
                break;

            case 'buttonScreen':
                    if (!state.mediaRecorder) break;
                    if (state.mode === 'screen') break;
                    this.setState({ mode: 'screen' }, () => this.recordingDiscard());
            break;

            case 'buttonStart':

                //cleanup
                if (this.mediaRecorder) {
                    this.mediaRecorder.stop();
                    this.mediaRecorder = null;
                }
                if (this.recorderRTC) {
                    this.recorderRTC.destroy();
                    this.recorderRTC = null;
                }
                
                this.filename = '';

                //mediaRecorder or recorderRTC ?     
                //only for testing

                this.directMediaRecorder = false;
               // if (this.isSafari) if (state.mode === 'video') this.directMediaRecorder = true;

                if (this.directMediaRecorder )
                {

                    this.fileExtension = 'mp4';
                    this.mimeType = 'video/mp4';

                   //MediaRecorder setup
                    this.mediaRecorder = new MediaRecorder(this.stream, {mimeType: this.mimeType});
                    this.chunks = [];

                    this.mediaRecorder.ondataavailable = (e)=> {
                       // if (this.devMode) console.log('components/Recorder mediaRecorder.ondataavailable, e.data.size=' + e.data.size);
                        this.chunks.push(e.data);
                    };
            
                    this.mediaRecorder.onerror = (e)=> {
                        console.log('components/Recorder MediaRecorder.onerror: ' + e);
                    };

                    this.mediaRecorder.onwarning = (e)=> {
                        console.log('components/Recorder mediaRecorder.onwarning: ' + e);
                    };
            
                    this.mediaRecorder.onstop = ()=> {
            
                        if (this.devMode)  console.log('components/Recorder mediaRecorder.onstop');

                        var blob = new Blob(this.chunks, {type: "video/mp4"});
                        this.chunks = [];
            
                        this.recorderData = URL.createObjectURL(blob);

                        this.videoPlayback.current.src = this.recorderData;
                        this.videoPlayback.current.play().then( accept => {
                            if (this.devMode) console.log('components/Recorder mediaRecorder Video Autoplay started', accept);
                                }, reject => {
                            console.log('components/Recorder mediaRecorder Video Autoplay reject:', reject);
                          }).catch(error => {
                            console.log('components/Recorder mediaRecorder Video Autoplay error:', error);
                         });;
                    };

                    this.mediaRecorder.onstart = ()=> {
                        if (this.devMode) console.log('components/Recorder mediaRecorder.onstart', this.mimeType );
                    }

                    this.mediaRecorder.start();

                }
                else
                {

                //RecorderRTC setup
                var options = {
                    type: this.state.mode == 'audio' ? 'audio' : 'video',
                    mimeType: this.mimeType,
                    numberOfAudioChannels: this.isEdge ? 1 : 2,
                    checkForInactiveTracks: true,
                    bufferSize: 16384,
                    disableLogs: !this.devMode,
                    recorderType:  RecordRTC.MediaStreamRecorder,
                };

                if (this.isSafari || this.isEdge) {
                    if (state.mode === 'audio') options.recorderType = RecordRTC.StereoAudioRecorder;
                }

                //if (this.isSafari && state.mode === 'video') options.recorderType = RecordRTC.WhammyRecorder;
                

                if (navigator.platform && navigator.platform.toString().toLowerCase().indexOf('win') === -1) {
                    options.sampleRate = 48000; // or 44100 or remove this line for default
                }

                if (this.isSafari) {
                    options.sampleRate = 44100;
                    options.bufferSize = 4096;
                    options.numberOfAudioChannels = 2;
                }

                this.recorderRTC = RecordRTC(this.stream, options);

                if (this.devMode) console.log("components/Recorder buttonStart", options, this.recorderRTC );

                this.recorderRTC.startRecording();

                }

                this.timerStart();

                this.setState({ buttonStart: false, buttonStop: true, buttonDiscard: false, buttonSend: false, statusInfo: this.txt('Recording') + " " + this.mimeType + " ." + this.fileExtension });


                break;

            case 'buttonStop':

                this.recordingStop();

                break;

            case 'buttonDiscard':
                this.recordingDiscard();

                break;

            case 'buttonDownload':

                if (this.devMode) console.log("components/Recorder buttonDownload", this.recorderRTC );


                if (this.mediaRecorder)
                {
                    this.SaveToDisk(this.recorderData, this.getFileName(this.fileExtension));
                    break;
                }

                if (!this.recorderRTC || !this.recorderRTC.getBlob()) break;

                if (this.isSafari) {
                    this.recorderRTC.getDataURL((dataURL) => {
                        this.SaveToDisk(dataURL, this.getFileName(this.fileExtension));
                    });
                    break;
                }

                //default
                var blob = this.recorderRTC.getBlob();
                var file = new File([blob], this.getFileName(this.fileExtension), {
                    type: this.mimeType
                });

                RecordRTC.invokeSaveAsDialog(file);

                break;

            case 'buttonSend':

                //https://visionmedia.github.io/superagent/#multipart-requests 

                if (!props.config.serverURL) {
                    console.log('components/Recorder  missing serverURL', props.config.serverURL, props.config);
                    return;
                }
                const req = request.post(props.config.serverURL);
                req.field('task', 'recorder_upload');
                req.field('mode', this.state.mode == 'audio' ? 'audio' : 'video' );
                req.field('scenario', props.options.scenario);
                req.field('duration', state.displayTime );

                req.field('VideoWhisper[userID]', props.user.ID);
                req.field('VideoWhisper[sessionID]', props.user.sessionID);
                req.field('VideoWhisper[sessionKey]', props.user.sessionKey);
                req.field('VideoWhisper[nonce]', props.config.nonce);

                if (!props.room.ID) {
                    console.log('components/Recorder missing room ID', props.room, props.user, props.config.serverURL);
                } else {
                    req.field('VideoWhisper[roomID]', props.room.ID);
                    req.field('VideoWhisper[privateUID]', props.room.privateUID);
                }

                var filelist = [];

                //add recording
                const filename = this.getFileName(this.fileExtension);
                this.filename = filename;

                var blob = this.recorderRTC.getBlob();

                var file = new File([blob], filename, {
                    type: this.mimeType
                });

                req.attach(filename, file, filename);
                filelist.push(filename);

                req.field('files[]', filelist);

                req.then( (res) => this.uploadCompleted(res) ).catch(err => {
                    // err.message, err.response
                    console.log('components/Recorder request error', err);
                 });

                if (this.devMode) console.log('components/Recorder uploading ...', filelist, req);

                this.setState({ uploading: true, statusInfo: this.txt('Uploading. Please wait...') });
                break;
        }

        this.props.recorderStatus(name);
    }

    render() {
        const { props, state, txt } = this;

        this.devMode = props.appState.devMode;

        // console.log('components/ChatHistory render', this.props.messages);

        var modeSelect = ( <Button.Group key="modeSelect">
            <Button icon name="buttonAudio" onClick={this.onClick.bind(this)} color={state.mode == 'audio' ? 'black' : 'grey'} data-tooltip={txt('Audio')} > <Icon name='microphone' /> </Button>
            <Button icon name="buttonVideo" onClick={this.onClick.bind(this)} color={state.mode == 'video' ? 'black' : 'grey'} data-tooltip={txt('Video')} > <Icon name='video' disabled={!state.mediaRecorder} /> </Button>
            <Button icon name="buttonScreen" onClick={this.onClick.bind(this)} color={state.mode == 'screen' ? 'black' : 'grey'} data-tooltip={txt('Screen')} > <Icon name='desktop' disabled={!state.mediaRecorder} /> </Button>
        </Button.Group> );

        if (this.props.config.recorderModeDisable)  modeSelect = '';

        return (

            <div key="recorderControls">
            {modeSelect}

         {!state.mediaRecorder ? <Label pointing='left' color='black'>Video recording is not available in this browser.</Label>: ''}
   
            <Divider hidden />

{this.isSafari && !state.mediaRecorder ? <Segment size='small' compact className={props.appState.className}>How To Enable Webcam Recording in Latest Safari:
<br/>1. Show Develop menu from Safari &gt; Preferences &gt; Advanced menu. 
<br/>2. Toggle Develop &gt; Experimental Features &gt; MediaRecorder menu to enable video recording.
<br/>3. Reload page to activate feature.</Segment>: ''}

                <Segment compact className={props.appState.className}>

                    <Button icon name="buttonStart" onClick={this.onClick.bind(this)} disabled={!state.buttonStart} color="red" data-tooltip={txt('Start')} > <Icon name='circle' /> </Button>
                    <Button icon name="buttonStop" onClick={this.onClick.bind(this)} disabled={!state.buttonStop} color="blue" data-tooltip={txt('Stop')} > <Icon name='square' /> </Button>

                    <Button icon name="buttonDiscard" onClick={this.onClick.bind(this)} disabled={!state.buttonDiscard} color="orange" data-tooltip={txt('Discard')} > <Icon name='trash' /> </Button>
                    <Button icon name="buttonDownload" onClick={this.onClick.bind(this)} disabled={!state.buttonSend} color="olive" data-tooltip={txt('Download')} > <Icon name='download' /> </Button>
                    <Button icon name="buttonSend" onClick={this.onClick.bind(this)} disabled={!state.buttonSend} color="green" loading={state.uploading} data-tooltip={txt('Send')} > <Icon name='send' /> </Button>
                    
                    {this.modeText ? <Button icon href={props.appState.tooltipURL} data-tooltip={props.appState.tooltip} color={['red', 'blue', 'orange', 'olive', 'green', 'grey', 'black'][Math.floor(Math.random() * 7)]}  > <Icon name={['eye', 'audio description', 'bullhorn', 'tag', 'question circle', 'at'][Math.floor(Math.random() * 6)]} /> </Button> : ''}
          
                    <Divider hidden />

					<Dropdown compact key="microphone" className={props.appState.className + " tiny"} name="microphone" value={state.microphone} onChange={this.onChange} placeholder='Microphone' selection options={state.microphoneOptions} />
					
                    {state.mode == 'video' ? <span>
                    <Dropdown compact key="camera" className={props.appState.className + " tiny"} name="camera" value={state.camera} onChange={this.onChange} placeholder='Camera' selection options={state.cameraOptions} /> 
                    <Dropdown compact className={props.appState.className + " tiny"} name="resolution" value={state.resolution} onChange={this.onChange} placeholder='Video Resolution' selection options={state.resolutionOptions} />
                    {this.tWarn ? <div><Label size='small' color={props.appState.darkMode?'black':'grey'}>{this.tWarn}</Label></div>:''}
</span>: ''}

                    {state.mode != 'audio' && ! state.buttonSend ? (<div><br /> <video style={{maxWidth:'100%'}} id="videoPreview" ref={this.videoPreview} autoPlay muted playsInline></video></div>) : ''}       
                </Segment>

                <Label color="black">{state.displayTime}{this.maxTime ? ' / ' + this.toMMSS(this.maxTime) : ''}</Label>
                <Label color="black">{state.statusInfo}</Label>

                <br />

                <Segment compact className={props.appState.className} style={{ visibility: state.buttonSend ? 'visible' : 'hidden' }} >
                {this.txt('Recorded: Playback')} <br />
                {state.mode != 'audio' ?
                <video style={{ maxWidth:'100%', visibility: state.buttonSend ? 'visible' : 'hidden' }} id="videoPlayback" ref={this.videoPlayback} controls autoPlay playsInline></video>
                :
                <audio style={{ maxWidth:'100%', visibility: state.buttonSend ? 'visible' : 'hidden' }} id="audioPlayback" ref={this.audioPlayback} controls autoPlay playsInline></audio>
}

{!this.isSafari ? <div><Label size='small' color={props.appState.darkMode?'black':'grey'}>Safari may not play recordings from other browsers. Record using Safari if available.</Label></div>:''}

                 </Segment>
                           </div>

        );
    }

}
