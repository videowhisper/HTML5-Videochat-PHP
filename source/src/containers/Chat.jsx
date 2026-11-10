import React, { Component } from 'react';

import PropTypes from 'prop-types';

import ChatInput from '../components/ChatInput';
import ChatHistory from '../components/ChatHistory';

export default class Chat extends Component {
   //text chat and input
    static propTypes = {  
    
        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,
        appSfx: PropTypes.func.isRequired,
        
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
   
        messages: PropTypes.array.isRequired,

        fetchHistory: PropTypes.func.isRequired,
        sendMessage: PropTypes.func.isRequired,
    };

    render() {
        const { props } = this;

        return ( 
                <div className="layoutChat" key="layoutChat" style={{backgroundColor: props.appState.backgroundColor}}>
                <div className="layHistory"><ChatHistory config={props.config} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} messages={props.messages} fetchHistory={props.fetchHistory}/></div>
                <div className="laySend"><ChatInput config={props.config} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} room={props.room} sendMessage={props.sendMessage} serverUpdate={props.serverUpdate} /></div>
                </div>
            );
    }
}