import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Video from '../components/Video';
import Camera from '../components/Camera';
import ChatInput from '../components/ChatInput';
import ChatHistory from '../components/ChatHistory';
import Actions from '../components/Actions';

export default class Way2Screen extends Component {

    static propTypes = {
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,

        appStateUpdate: PropTypes.func.isRequired,  
        appSfx: PropTypes.func.isRequired,  

        messages: PropTypes.array.isRequired,
  
        appState: PropTypes.object.isRequired,
        actions: PropTypes.array.isRequired,

        fetchHistory: PropTypes.func.isRequired,
        sendMessage: PropTypes.func.isRequired,
        serverUpdate: PropTypes.func.isRequired,

    };

    render() {
        const { props } = this;
        this.componentActions = React.createRef();

        return (
            <div className="layoutWay2" style={{backgroundColor: props.appState.backgroundColor}}>
                <div className="layVideo"><Video user={props.user} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} room={props.room} /></div>
                <div className="layCamera"><Camera 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} room={props.room} user={props.user} serverUpdate={props.serverUpdate} /></div>
                <div className="layHistory"><ChatHistory config={props.config} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} messages={props.messages} fetchHistory={props.fetchHistory} /></div>
                <div className="layActions"><Actions ref={this.componentActions} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} user={props.user} room={props.room} actions={props.actions} serverUpdate={props.serverUpdate}/></div>
                <div className="laySend"><ChatInput config={props.config} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} room={props.room} sendMessage={props.sendMessage} serverUpdate={props.serverUpdate} /></div>            
            </div>
        );
    }
}