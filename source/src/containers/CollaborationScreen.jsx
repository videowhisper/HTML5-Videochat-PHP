import React, { Component } from 'react';

import PropTypes from 'prop-types';

//import Video from '../components/Video';
import Multimedia from './Multimedia';

//import Camera from '../components/Camera';
//import ChatInput from '../components/ChatInput';
//import ChatHistory from '../components/ChatHistory';
import Actions from '../components/Actions';

import Tabs from '../containers/Tabs';
import _ from 'lodash';

export default class CollaborationScreen extends Component {

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

    /*
    getDerivedStateFromProps(props, state) {
        console.log('containers/CollaborationScreen getDerivedStateFromProps');

      }

      getSnapshotBeforeUpdate(prevProps, prevState) {
       // console.log('containers/CollaborationScreen getSnapshotBeforeUpdate');

      }

      shouldComponentUpdate(nextProps) {
      //  console.log('containers/CollaborationScreen shouldComponentUpdate', _.isEqual(nextProps,this.props ), _.isEqual(nextProps.appState,this.props.appState ));
      //  return (_.isEqual(nextProps,this.props ));
        return true;
    }
*/

    constructor(props) {
        super(props);
        this.componentActions = React.createRef();
    }

    componentWillUnmount() {
        console.log('containers/CollaborationScreen componentWillUnmount');
    }

    render() {
        const { props } = this;

        return (
            <div className="layoutCollaboration" style={{ backgroundColor: props.appState.backgroundColor }}>
                <div className="layVideo"><Multimedia appState={props.appState} appStateUpdate={props.appStateUpdate} config={props.config} room={props.room} user={props.user} /></div>
                <div className="layActions"><Actions ref={this.componentActions} appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} user={props.user} room={props.room} actions={props.actions} serverUpdate={props.serverUpdate} /></div>
                <div className="layTabs"><Tabs appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} messages={props.messages} fetchHistory={props.fetchHistory} sendMessage={props.sendMessage} serverUpdate={props.serverUpdate} /></div>
            </div>
        );
    }
}