import React from 'react';

import PropTypes from 'prop-types';

import Panel from '../components/Panel';
import Media from '../containers/Media';

export default class Multimedia extends Panel {
    //displays multiple media items in slots

    static propTypes = {
        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,
        
        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
    };

    constructor(props) {

        super(props);

        this.state = {
            panelType: 'Multimedia',
        }

        this.devMode = props.appState.devMode;

        this.mediaItems = 1;
        //if (props.room.mediaItems) this.mediaItems = props.room.mediaItems;

        if (this.devMode)  console.log('containers/Multimedia constructor', props);

    }

    render() {
        const { state, props } = this;    

        var showContent = [];

        var splits = Object.keys(this.props.appState.media).length;

        var i=0;
        for (var placement in this.props.appState.media)
        {
            //include type to determine update on hls change

                var content = props.appState.media[placement];
                var type = 'none';
                if (content) type = content.type;

                if (type == 'user')
                if (props.room.users) 
                { 
                    //user list available
   
                    var playbackUser = props.room.users[content.userID];   //detect user being played in this video            
        
                    var showHLS = false;
                    if (playbackUser) if (playbackUser.meta) {
                        if (playbackUser.meta.external)
                        {
                            showHLS = true;

                            //disable HLS if WebRTC stream connected more recently
                            if (playbackUser.meta.connected) if (playbackUser.meta.connectedUpdate > playbackUser.meta.externalUpdate)  showHLS = false;
                        }
                    }

                    if (showHLS) type = 'hls';
                }

            showContent.push(<div className={'slot'+i} key={'slot_'+placement}><Media appState={props.appState} appStateUpdate={props.appStateUpdate} config={props.config} room={props.room} user={props.user} placement={placement} type={type} meta={i + '/' + splits}/></div>);
            i++;
        }
        this.mediaItems = i;

        var orientation = 'V';
        if (state.aspectRatio > 1.77) orientation = 'H';
        var layoutClass = 'panel split0';
        if (this.mediaItems > 1) layoutClass = 'panel split' + orientation + this.mediaItems;

        return (
        <div className={layoutClass} ref={container => (this.state.container = container)}>
            {showContent}
        </div>
        );
    }

}