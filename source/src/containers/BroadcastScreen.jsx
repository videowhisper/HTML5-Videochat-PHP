import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Camera from '../components/Camera';
import ChatInput from '../components/ChatInput';
import ChatHistory from '../components/ChatHistory';
import Actions from '../components/Actions';


export default class BroadcastScreen extends Component {
   
    static propTypes = {  
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
   
        messages: PropTypes.array.isRequired,

        fetchHistory: PropTypes.func.isRequired,
        sendMessage: PropTypes.func.isRequired,

        appState: PropTypes.object.isRequired,
        actions: PropTypes.array.isRequired,   
    };


constructor(props) {
    super(props);
    this.componentActions = React.createRef();
}

    render() {
        const { props } = this;
        return ( <div className="layoutBroadcast" style={{backgroundColor: props.appState.backgroundColor}}>
                
                <div className="layCamera"><Camera appState={props.appState} 
                appStateUpdate={props.appStateUpdate} config={props.config} room={props.room} user={props.user} serverUpdate={props.serverUpdate} /></div>
                <div className="layActions"><Actions ref={this.componentActions} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} user={props.user} room={props.room} actions={props.actions} serverUpdate={props.serverUpdate}/></div>
                <div className="layHistory"><ChatHistory config={props.config} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} messages={props.messages} fetchHistory={props.fetchHistory}/></div>
                <div className="laySend"><ChatInput config={props.config} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} room={props.room} sendMessage={props.sendMessage} serverUpdate={props.serverUpdate} /></div>
                </div>
            );
    }
}