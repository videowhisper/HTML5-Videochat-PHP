import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Multimedia from '../containers/Multimedia';
import Camera from '../components/Camera';
import Actions from '../components/Actions';

import Panel from '../components/Panel';

export default class PiP extends Panel {
    //displays multimedia + camera + actions

    static propTypes = {
        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,
        appSfx: PropTypes.func.isRequired,  

        actions: PropTypes.array.isRequired,
        serverUpdate: PropTypes.func.isRequired,
    };
    
    constructor(props) {
        super(props);
        this.componentActions = React.createRef();
    }

    render() {
        const { state, props } = this;    
        
        return (
            <div className="panel" ref={container => (this.state.container = container)}>

                <div className="videoPiP"><Multimedia appState={props.appState} appStateUpdate={props.appStateUpdate} config={props.config} room={props.room} user={props.user} /></div>

                <div className="cameraPiP"><Camera 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} room={props.room} user={props.user} serverUpdate={props.serverUpdate} /></div>
                
                <div className="actionsPiP"><Actions ref={this.componentActions} 
                appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} user={props.user} room={props.room} actions={props.actions} serverUpdate={props.serverUpdate}/></div>

            </div>
            );
    }
}