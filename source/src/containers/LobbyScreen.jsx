import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Lobby from '../components/Lobby';
import Actions from '../components/Actions';

export default class LobbyScreen extends Component {
   
    static propTypes = {  
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
   
        appStateUpdate: PropTypes.func.isRequired,
        appSfx: PropTypes.func.isRequired,
        
        appState: PropTypes.object.isRequired,
        actions: PropTypes.array.isRequired,   
    };


constructor(props) {
    super(props);
    this.componentActions = React.createRef();
}
    render() {
        const { props } = this;
        return (  <div className="layoutList" key="layoutList" style={{backgroundColor: props.appState.backgroundColor}}>
                <div className="layScrollable" key="layScrollable"><Lobby 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} room={props.room} user={props.user} actions={props.actions} serverUpdate={props.serverUpdate} /></div>
                <div className="layMenu" key="layMenu"><Actions ref={this.componentActions} appState={props.appState} appStateUpdate={props.appStateUpdate} config={props.config} user={props.user} room={props.room} actions={props.actions} serverUpdate={props.serverUpdate}/></div>
            </div>
            );
    }
}