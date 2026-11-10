import React, { Component } from 'react';

import { Header, Segment, Button, Icon } from 'semantic-ui-react'
import PropTypes from 'prop-types';

import Panel from './Panel';


//Lobby screen: Initiating private call

export default class Lobby extends Panel {
    static propTypes = {
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,

        appState: PropTypes.object.isRequired,

        serverUpdate: PropTypes.func.isRequired,
    }

    constructor(props) {
        super(props);

        this.devMode = props.appState.devMode;

        this.state = {
            privateUnavailable: true,
            requestStatus : 'Not available',
        }
    }


    
    componentDidMount() {

        const { props, state } = this;
        if (this.devMode) console.log('VideoWhisper/containers/LobbyScreen componentDidMount');


    }

    componentDidUpdate(prevProps, prevState, snapshot) {

        const {txt} = this;
       // if (this.devMode) console.log('VideoWhisper/containers/LobbyScreen componentDidUpdate');

              // Private 2 Way
    
    //available if not disabled and user online
    var privateUnavailable = true;
    var requestTooltip = txt("Waiting for user to accept call");

    if (!prevProps.room)
    requestTooltip = txt("Room is not ready");
    else if (prevProps.room.actionPrivateDisable)
    requestTooltip = txt("User disabled private requests");
    else if (prevProps.room.actionPrivateBusy)
    requestTooltip = txt("User is currently busy in private");
    else if (prevProps.room.users) 
    { 
        var playbackUser; 
        playbackUser = prevProps.room.users[prevProps.appState.requestUID];

        if (playbackUser) privateUnavailable = false;
        else requestTooltip = txt("User is not online, yet");
    }
    else requestTooltip = txt("User list is not available");

    if (prevProps.appState.requestAID) requestTooltip = txt("Private call ended.");

    this.state.requestStatus = requestTooltip;

    //just became available
    if (prevState.privateUnavailable && !privateUnavailable)
    {
        this.state.privateUnavailable = false;

        //request (if other is in group room)

        if (!prevProps.room.privateUID && !prevProps.appState.requestAID) //if not already in room or after private
        if (prevProps.room.privateUID !== prevProps.appState.requestUID) //not already in private with that user
        {
           var meta = {
            userName: prevProps.user.name,
          }
  
         var action = {
            action: 'privateRequest',
            userID: prevProps.user.ID,
            roomID: prevProps.room.ID,
            targetID: prevProps.appState.requestUID,
            meta: meta,
          }
          prevProps.serverUpdate({ task: 'interaction', interaction: action });  

          if (this.devMode) console.log('VideoWhisper/containers/LobbyScreen componentDidUpdate Available',  prevProps.room);
        } else if (this.devMode) console.log('VideoWhisper/containers/LobbyScreen componentDidUpdate Available but requestAID', prevProps.appState.requestAID);
    }

    }

    render() {
        const { props, txt, state } = this;

        return (
            <Segment className={props.appState.className}>
                <Header>{txt('Private Call')}</Header>
                <p>{props.user.name} - {props.appState.requestUsername} (#{props.appState.requestUID}) / {props.room.name} <br/> <b>{state.requestStatus}</b></p>
                
                <Button className={props.appState.className} size="small" key='exit' name='videowhisper' color='red' target='_top' href={props.config.exitURL}>
                <i class="arrow alternate circle left icon"></i> {txt('Exit')}
                 </Button>
            </Segment>
        );
    }
}
