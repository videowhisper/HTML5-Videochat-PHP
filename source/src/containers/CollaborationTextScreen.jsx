import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Multimedia from './Multimedia';

import Actions from '../components/Actions';

import Tabs from '../containers/Tabs';
import _ from 'lodash';

export default class CollaborationTextScreen extends Component {

    static propTypes = {
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,

        messages: PropTypes.array.isRequired,

        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,
        appSfx: PropTypes.func.isRequired,

        actions: PropTypes.array.isRequired,

        fetchHistory: PropTypes.func.isRequired,
        sendMessage: PropTypes.func.isRequired,
        serverUpdate: PropTypes.func.isRequired,
    };


    constructor(props) {
        super(props);
        this.componentActions = React.createRef();
    }

    componentWillUnmount() {
        console.log('containers/CollaborationTextScreen componentWillUnmount');
    }

    render() {
        const { props } = this;

        return (
            <div className="layoutCollaborationText" style={{ backgroundColor: props.appState.backgroundColor }}>
                <div className="layActions"><Actions ref={this.componentActions} appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} user={props.user} room={props.room} actions={props.actions} serverUpdate={props.serverUpdate} /></div>
                <div className="layTabs"><Tabs appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} messages={props.messages} fetchHistory={props.fetchHistory} sendMessage={props.sendMessage} serverUpdate={props.serverUpdate} /></div>
            </div>
        );
    }
}