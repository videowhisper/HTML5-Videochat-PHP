import React, { Component } from 'react';
import { Segment, Header, Button, Icon, Divider} from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from '../components/Panel';

import Video from '../components/Video';
import ReactPlayer from 'react-player';

export default class Media extends Panel {
    //displays media: video (live) or file (picture, video file, html?)

    static propTypes = {
        placement: PropTypes.string.isRequired, //layout placements as multiple can be used
        meta: PropTypes.string.isRequired, //layout placements as multiple can be used
        type: PropTypes.string.isRequired, //content type to determine render changes

        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,

        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
    };

    constructor(props) {

        super(props);

        this.state = {
            placement: props.placement,
            meta: props.meta,
            panelType: 'Media',
            mediaWidth: 0,
            mediaHeight: 1,
            mediaStyle: { position: 'absolute', width: '100%', height: '100%' },
            mediaAspectRatio: 1,
        }

        this.devMode = props.appState.devMode;

        this.mediaContent = React.createRef();

        this.extensionsImg = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'gif', 'ico', 'cur', 'bmp', 'png', 'svg'];
        this.extensionsVideo = ['mp4', 'webm', 'ogg'];
        this.extensionsAudio = ['mp3'];

        if (this.devMode) console.log('containers/Media constructor', props);
    }

    updateMediaSize(tag) {
        var { state } = this;

        if (!state.mediaHeight) state.mediaHeight = 1;

        state.mediaAspectRatio = state.mediaWidth / state.mediaHeight;

        //zoom video background to container
        let mediaWidth = state.mediaWidth;
        let mediaHeight = state.mediaHeight;
        let mediaOffsetX = 0;
        let mediaOffsetY = 0;

        if (state.width && state.aspectRatio && state.mediaAspectRatio) {
            if (state.mediaAspectRatio > state.aspectRatio) //video is wider: full width, remains height
            {
                mediaWidth = state.width;
                mediaHeight = mediaWidth / state.mediaAspectRatio;
                mediaOffsetY = (state.height - mediaHeight) / 2;
            }
            else {
                mediaHeight = state.height;
                mediaWidth = mediaHeight * state.mediaAspectRatio;
                mediaOffsetX = (state.width - mediaWidth) / 2;
            }
        }

        let mediaStyle = { position: 'absolute', left: mediaOffsetX, top: mediaOffsetY, width: mediaWidth, height: mediaHeight, border: 'solid 1px #555' };
        this.setState({ 'mediaStyle': mediaStyle });

        if (this.devMode) console.log('containers/Media updateMediaSize', tag, state.aspectRatio, state.mediaAspectRatio,  mediaStyle, state);
    }

    onImgLoad({ target: img }) {
        this.state.mediaWidth = img.naturalWidth;
        this.state.mediaHeight = img.naturalHeight;
        if (this.devMode) console.log('containers/Media onImgLoad', img.naturalWidth, img.naturalHeight);

        this.updateMediaSize('img');
    }

    onVideoLoadedMetadata({ target: video }) {
        this.state.mediaWidth = video.videoWidth;
        this.state.mediaHeight = video.videoHeight;
        if (this.devMode) console.log('containers/Media onVideoLoadedMetadata', video.videoWidth, video.videoHeight);

        this.updateMediaSize('video');
    }

    playerError = (e) =>
    {
        console.log('containers/Media playerError', e);
    }

    render() {

        const { state, props } = this;

        /*
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
				if (this.devMode) console.log('components/Media - render: container size update');
			}
        }
*/

    var showContent = (<Segment className={props.appState.className}>{props.placement} / {props.type} - No Content.</Segment>);
    var hideLogo= false;

        if (props.placement) if (props.appState.media) {
            var content = props.appState.media[props.placement];

            if (content) {
                content.placement = props.meta + ' ' + props.placement;
                switch (content.type) 
                {
                    case 'user':

                    //handle stream type of user
                    if (props.room.users) 
                    { 
                        //user list available
                        var playbackUser; //detect user being played in this video            
                        if (content.userID !== undefined) //this slot identifies its playback user
                        { 
                            playbackUser = props.room.users[content.userID];
                        }
                        else  //no content: using default room streamPlayback
                        { 
                            playbackUser = props.room.users[props.room.streamUID];
                        }

                        var showHLS = false;

                        if (playbackUser) if (playbackUser.meta) {
                            if (playbackUser.meta.external)
                            {
                                showHLS = true;
                                //webrtc available and more recent
                                if (playbackUser.meta.connected) if (playbackUser.meta.connectedUpdate > playbackUser.meta.externalUpdate)  showHLS = false;
                            }
                        }

                        if (showHLS) if (playbackUser.hls) showContent = (
                        <ReactPlayer 
                        style={state.mediaStyle} ref={this.mediaContent} 
                        url={playbackUser.hls} 
                        muted={props.appState.muted}
                        playing controls playsinline 
                        width='100%'
                        height='100%'
                        onError={this.playerError.bind(this)}
                        />);
                        else showContent = (<Segment className={props.appState.className}className={props.appState.className}>{props.placement} - HLS not available for user #{content.userID}</Segment>);

                        if (!showHLS) showContent = (<Video user={props.user} appState={props.appState} appStateUpdate={props.appStateUpdate} config={props.config} room={props.room} content={content} meta={props.meta} />);
                    }

                    break;

                    case 'stream':
                    case 'video':
                        showContent = (<Video user={props.user} appState={props.appState} appStateUpdate={props.appStateUpdate} config={props.config} room={props.room} content={content} meta={props.meta} />);
                        break;

                    case 'hls':
                        showContent = (
                            <ReactPlayer 
                            style={state.mediaStyle} ref={this.mediaContent} 
                            url={content.url} 
                            muted={props.appState.muted}
                            playing controls playsinline 
                            width='100%'
                            height='100%'
                            onError={this.playerError.bind(this)}
                            />);
                    break;

                    case 'file':
                    hideLogo = true;
                     if (this.extensionsImg.includes(content.ext)) showContent = (<img style={state.mediaStyle} ref={this.mediaContent} onLoad={this.onImgLoad.bind(this)} src={content.url} />);
                     else
                     if (this.extensionsVideo.includes(content.ext) || this.extensionsAudio.includes(content.ext)) 
                     showContent = (
                     <ReactPlayer 
                     style={state.mediaStyle} ref={this.mediaContent} 
                     url={content.url} 
                     playing controls playsinline loop 
                     onError={this.playerError.bind(this)}
                     width='100%'
                     height='100%'/>
                     );
                     else showContent = (<Segment className={props.appState.className}>{this.txt('File')}: <b>{content.name}</b> ({content.userName})<Divider /> <Button className={props.appState.className} icon labelPosition='right' target='_blank' href={content.url}> {this.txt('Open')} <Icon size='large' name='folder open' /> </Button> </Segment>);

                                          /*
                        if (this.extensionsVideo.includes(content.ext)) showContent = (
                            <video style={state.mediaStyle} ref={this.mediaContent} onLoadedMetadata={this.onVideoLoadedMetadata.bind(this)} controls autoplay loop>
                                <source src={content.url} type="video/mp4" /></video>);
                                */


                        break;

                    case 'empty':
                        showContent = (<Segment className={props.appState.className}><Header>{props.placement}: Empty Content Area</Header> Room owner can assign content or adjust number of content areas.</Segment>);

                        break;

                    default:
                        showContent = (<Segment className={props.appState.className}>{props.placement} - Unknown type: {content.type} / {props.type}</Segment>);
                }
            }
        }

        var showLogo = '';
        if (!hideLogo && props.config.logo) showLogo = (<img className='videowhisperAppLogo' src={props.config.logo} />);

        return (
            <div className="panel" ref={container => (this.state.container = container)}>
                {showContent}
                {showLogo}
            </div>
        );
    }

}