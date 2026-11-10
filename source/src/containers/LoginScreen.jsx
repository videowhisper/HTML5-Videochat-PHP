import React, { Component } from 'react';
//import ReactDOM from 'react-dom';

import { Header, Segment } from 'semantic-ui-react'
import PropTypes from 'prop-types';
import { resolveInstanceConfig } from '../embed';


export default class LoginScreen extends Component {
    static propTypes = {
        user: PropTypes.object.isRequired,
        serverUpdate: PropTypes.func.isRequired,

        checkMode: PropTypes.func.isRequired,
        appState: PropTypes.object.isRequired,
    }

    constructor(props) {
        super(props);

        this.devMode = props.appState.devMode;

        this.state = {
            loggedin: false,
            modeServers: ['videowhisper', 'videowhispers', 'ateom'],
        }
    }

    txt = (text) => {
		//handle text translations from config
		const { props } = this;
		if (text in props.config.text) return props.config.text[text];

		return text;
    }

    getVideoWhisper = () => resolveInstanceConfig(this.props.config)
    
    componentDidMount() {

        const { props, state } = this;
        if (this.devMode) console.log('VideoWhisper/containers/LoginScreen componentDidMount', props.appState.parametersRetrieved, props.appState.checkWait, props, state, window, this.getVideoWhisper());

        if (!state.loggedin)
        if (props.appState.parametersRetrieved)
                if (!props.user.loggedIn && !props.user.failed && !props.appState.checkWait) //no wait
                {
                    const VideoWhisper = this.getVideoWhisper();

                        props.serverUpdate({
                            task: 'login',
                            'VideoWhisper': VideoWhisper,
                        });
                        this.state.loggedin = true;
                }

        if (this.devMode) setTimeout(() => state.modeServers.forEach(props.checkMode), 3000); else
            state.modeServers.forEach(props.checkMode);

    }

    componentDidUpdate(prevProps, prevState, snapshot) {

        if (this.devMode) console.log('VideoWhisper/containers/LoginScreen componentDidUpdate parametersRetrieved checkWait loggedin', prevProps.appState.parametersRetrieved, prevProps.appState.checkWait, prevState.loggedin);
      
        if (!prevState.loggedin)
        if (prevProps.appState.parametersRetrieved)
                if (!prevProps.user.loggedIn && !prevProps.user.failed && !prevProps.appState.checkWait) //direct login (no wait)
                {
                    const VideoWhisper = this.getVideoWhisper();

                        prevProps.serverUpdate({
                            task: 'login',
                            'VideoWhisper': VideoWhisper,
                        });
                        this.state.loggedin = true;
                }
    }

    render() {
        const { props, state } = this;

        let info;
        if (props.user.loggedIn) info = "Logged in as " + props.user.name;
        else info = "Not logged in, yet. ";
        if (props.user.warning) info = info + props.user.warning;

        var modeMessage = (
            <p>Entering the <a href="https://consult.videowhisper.com">HTML5 Videochat</a></p>
        );

        if (props.appState.whitelabel || (!props.appState.parametersRetrieved && !props.appState.error ) ) modeMessage = (
            <p>Entering Videochat</p>
        );

        if (props.appState.checked) {
            if (!props.appState.mode.status) if (props.appState.mode.text) modeMessage = props.appState.mode.text;
            else modeMessage = 'This is server connection screen.'

            if (props.appState.whitelabel)
                if ( ( props.appState.whitelabel != props.appState.mode.whitelabel ) && ( props.appState.modeVersion != props.appState.version ) )
                    modeMessage = (
                        <p><a href="https://consult.videowhisper.com">Contact</a> for attribution removal assistance!</p>
                    )
        }

        return (
            <Segment className={props.appState.className}>
                <p> Logged in: {info} </p>
                <p> {props.user.error} </p>
                {modeMessage}
            </Segment>
        );
    }
}