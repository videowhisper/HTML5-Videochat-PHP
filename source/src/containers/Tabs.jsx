import React, { Component } from 'react';
import { Menu, Icon, Label, Dropdown } from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from '../components/Panel';

import Chat from './Chat';

import Camera from '../components/Camera';
import Broadcast from '../components/Broadcast';

import Users from '../components/Users';
import Files from '../components/Files';
import Presentation from '../components/Presentation';
import Options from '../components/Options';
import Goals from '../components/Goals';

import Messages from '../components/Messages';

export default class Tabs extends Panel {
    //displays multiple panels in tabs
    static propTypes = {

        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,
        appSfx: PropTypes.func.isRequired,

        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        fetchHistory: PropTypes.func.isRequired,
        sendMessage: PropTypes.func.isRequired,
        serverUpdate: PropTypes.func.isRequired,
    };

    constructor(props) {

        super(props);

        this.devMode = props.appState.devMode;

        if (this.devMode) console.log('containers/Tabs constructor', props);

        this.state = {
            menus: [],
            panes: [],
            selected: '',
        }

        this.updatePanes(props);
    }

    static getDerivedStateFromProps(props, state) {
        if (props.room) if (!state.selected && props.room.panelCamera) return { selected: "Cam" };


        return null;
    }
    /*
        componentWillReceiveProps(nextProps){
    
            //switch to camera when enabled
            if (this.props.room) if (!this.props.room.panelCamera && nextProps.room.panelCamera) this.state.selected = "Camera";
    
            this.updatePanes(nextProps);
        }
        */

    componentWillUnmount() {
        if (this.devMode) console.log('containers/Tabs componentWillUnmount');
    }

    updatePanes(props) {

        const { state, txt } = this;

        //panes to render
        var menus = [];
        var panes = [];

        var newMenu = "";

        //default
        if (!this.state.selected) this.state.selected = txt("Chat");

        if (props.appState.publishRequired) if (props.room.panelCamera) this.state.selected = txt("Cam");
        if (props.appState.external) if (this.state.selected == txt("Cam") ) this.state.selected = txt("Broadcast");

        if (this.state.selected == txt("Chat") && this.props.appState.chatNew)
        {
            //seen
            this.props.appStateUpdate({chatNew: false});
        }
        // if (this.devMode) console.log('containers/Tabs updatePanes', state.selected, props.room);

        newMenu = txt("Chat");
        menus.push({
            key: newMenu, active: (state.selected == newMenu), name: newMenu,
            content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='chat' /> : ''}
            {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''} {this.props.appState.chatNew?(<Icon size='tiny' name='star' color='green' /> ):''}</div>)
        });

        //chat always rendered
        panes.push(<div key="paneChat" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Chat 
        appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} messages={props.messages} fetchHistory={props.fetchHistory} sendMessage={props.sendMessage} serverUpdate={props.serverUpdate}/></div>);

        if (!props.room.textOnly) 
        if (!props.appState.pipMode) //hide when picture in picture mode
        if (props.room.panelCamera && !props.appState.external) {

            var streamIcon = 'video';
            newMenu = txt("Cam");

            if (props.room.audioOnly || props.appState.audioMode ) 
            {
                newMenu = txt("Mic");
                streamIcon = 'microphone';

                if (this.state.selected == txt("Cam")) this.state.selected = txt("Mic")
            }
    
            //this.props.appState cameraStatus: off/pending/live/error
            const streamIcons = {
                'off' : <Icon size='tiny' name='stop' /> ,
                'pending' : <Icon size='tiny' color='orange' name='sync' />,
                'live' : <Icon size='tiny' color='green' name='circle' />,
                'error' : <Icon size='tiny' color='red' name='exclamation triangle' />,
            };
            const streamStatus = streamIcons[props.appState.cameraStatus];

            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name={streamIcon} /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''} {streamStatus}</div>)
            });
            //camera always rendered when not external      
            panes.push(<div key="paneCamera" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Camera 
            appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} config={props.config} room={props.room} user={props.user} serverUpdate={props.serverUpdate} /></div>);
        }

        if (!props.room.textOnly)
        if (props.room.panelBroadcast) {
            newMenu = txt("Broadcast");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='rss' /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''}</div>)
            });
            if (state.selected == newMenu) panes.push(<div key="paneBroadcast" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Broadcast 
            appState={props.appState} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} /></div>);

        }

        if (props.room.panelUsers) {
            newMenu = txt("Users");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='users' /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''} <Label className={props.appState.className} size='tiny' pointing='left'>{props.appState.userCount}</Label></div>)
            });
            if (state.selected == newMenu) panes.push(<div key="paneUsers" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Users 
            appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} /></div>);
        }

        if (props.room.panelGoals) {
            newMenu = props.config.goals_label ? props.config.goals_label : txt("Goals");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name={props.config.goals_icon ? props.config.goals_icon : 'gift' } /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''}</div>)
            });
            if (state.selected == newMenu) panes.push(<div key="paneGoals" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Goals 
            appState={props.appState} appStateUpdate={props.appStateUpdate}  appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} /></div>);
        }


        if (props.room.panelFiles) {
            newMenu = txt("Files");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='file' /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''}</div>)
            });
            if (state.selected == newMenu) panes.push(<div key="paneFiles" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Files 
            appState={props.appState} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} /></div>);
        }

        if (props.room.panelPresentation) {
            newMenu = txt("Presentation");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='hand point left' /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''}</div>)
            });
            if (state.selected == newMenu) panes.push(<div key="panePresentation" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Presentation 
            appState={props.appState} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} /> </div>);
        }


        if (props.room.panelOptions) {
            newMenu = txt("Options");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='settings' /> : ''}
                    {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''}</div>)
            });
            if (state.selected == newMenu) panes.push(<div key="paneOptions" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Options 
            appState={props.appState} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} /> </div>);
        }

        if (props.room.questions)
        {
            newMenu = txt("Questions");
            menus.push({
                key: newMenu, active: (state.selected == newMenu), name: newMenu,
                content: (<div data-tooltip={newMenu} data-position="bottom center"> {(!props.config.tabMenu || props.config.tabMenu === 'icon' || props.config.tabMenu === 'full') ? <Icon name='mail' /> : ''}
                {(!props.config.tabMenu || props.config.tabMenu === 'text' || props.config.tabMenu === 'full') ? newMenu : ''}</div>)
            });
    
            if (state.selected == newMenu) panes.push(<div key="paneMessages" className={state.selected == newMenu ? "paneActive" : "paneInactive"}><Messages appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} messages={props.room.questionsMessages} serverUpdate={props.serverUpdate}/></div>);

        }

        this.state.menus = menus;
        this.state.panes = panes;

        // this.setState({panes: panes});
        //return panes;
    }

    onClick(e, item) {

        if (this.devMode) console.log("containers/Tabs onClick", item);

        if (this.state.selected != item.name) {
            this.state.selected = item.name;
            this.updatePanes(this.props);
            this.setState({ selected: item.name });
        }
    }

    onDropdownChange(e, { value }) {
        if (this.devMode) console.log("containers/Tabs onDropdownChange", value);

        if (this.state.selected != value) {
            this.state.selected = value;
            this.updatePanes(this.props);
            this.setState({ selected: value });
        }
    }

    /* 
     shouldComponentUpdate(nextProps, nextState){
         if (nextProps.config == this.props.config && nextProps.user == this.props.user && nextProps.room == this.props.room  && nextState == this.state) return false;
       
          console.log('components/Tabs shouldComponentUpdate', nextProps == this.props, nextProps.user == this.props.user, nextProps.config == this.props.config,  nextProps.room == this.props.room, nextState == this.state);
         return true;
       }
 */
    render() {
        const { state, props } = this;

        this.updatePanes(props);

        // Use centralized mobile detection from appState
        const isMobile = props.appState.isMobile;

        // Create dropdown options from menus for mobile
        const dropdownOptions = state.menus.map(menu => ({
            key: menu.key,
            value: menu.name,
            text: menu.name,
            content: menu.content
        }));

        // Find the selected menu for dropdown display
        const selectedMenu = state.menus.find(menu => menu.name === state.selected);
        const dropdownTrigger = selectedMenu ? selectedMenu.content : state.menus[0]?.content;

        return (
            <div className="layoutTabs" style={{ backgroundColor: props.appState.backgroundColor }}>
                <div className="layMenu">
                    {isMobile ? (
                        <Dropdown
                            fluid
                            selection
                            value={state.selected}
                            options={dropdownOptions}
                            onChange={this.onDropdownChange.bind(this)}
                            trigger={dropdownTrigger}
                            className={props.appState.className}
                        />
                    ) : (
                        <Menu 
                            stackable 
                            fluid 
                            size='small' 
                            className={props.appState.className} 
                            items={state.menus} 
                            onItemClick={this.onClick.bind(this)} 
                        />
                    )}
                </div>
                <div className="layPane">{state.panes}</div>
            </div>
        );
    }

}