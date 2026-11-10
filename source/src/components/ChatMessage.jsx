import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {Image, Button, Icon, Progress, Label, Flag} from 'semantic-ui-react';

import axios from 'axios';
import qs from "qs"; //post to php w/o file_get_contents('php://input');

export default class ChatMesage extends Component {
    //renders a message

    static propTypes = {
        message: PropTypes.object.isRequired,
        userID: PropTypes.number.isRequired, //current user id
        previousUser: PropTypes.string.isRequired,     
        previousTime: PropTypes.number.isRequired,
        darkMode: PropTypes.bool,

        messageClick: PropTypes.func.isRequired,
        messageScroll: PropTypes.func.isRequired,
        messageRef: PropTypes.object.isRequired,
        txt: PropTypes.func.isRequired, 
        
        selectedID: PropTypes.number,

        config: PropTypes.object.isRequired,    
        user: PropTypes.object.isRequired,
        appState: PropTypes.object.isRequired,
    };

    constructor(props) {
         super(props);
 
         this.devMode = props.appState.devMode;
 
         this.state = {
             translation: '',
             language: '',
             flag: '',
             updating: false,
         };
 
        this.axiosConfig = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 
            }
        }
     }
 
     translationUpdate = (e) => {

        e.stopPropagation();

        const { props, state } = this;

        if (!props.appState.serverURL2)
        {
            console.log('VideoWhisper/components/ChatMessage translationUpdate: missing serverURL2');
            return;
        }

        var data = {}; //POST data

        if (props.user.loggedIn) //include session info if loggedin
        {
            const VideoWhisper =
            {
                userID: props.user.ID,
                sessionID: props.user.sessionID,
                sessionKey: props.user.sessionKey,
            };
            data['VideoWhisper'] = VideoWhisper;
            data['message'] = props.message;
            data['language'] = props.appState.language;
            data['flag'] = props.appState.flag;
        }

        data['devMode'] = this.devMode;
        
        var self = this;

        axios.post(props.appState.serverURL2 + 'translate.php', qs.stringify(data), this.axiosConfig)
            .then(function (response) {
                self.translationReceived(response);
            })
            .catch( (error) => this.translationError(error, data) );

        this.setState({updating: true});
    }

    translationReceived(response) {
        const { state } = this;
        const data = response.data;

        if (data.translation)
        {
            this.setState({translation: data.translation, language: data.language, flag: data.flag, updating: false});
        }else this.setState({updating: false});
    }

    translationError(error, data) {
        console.log('VideoWhisper/components/ChatMessage translationError:', error, data);
        this.setState({ updating: false});
    }



    render() {

        const {props, state} = this;

        const message = props.message;

        const isNotification = message.notification;
        const isOwnMessage = (message.userID === props.userID && !isNotification);
        const sameUser = ( props.previousUser == ( message.userName + '#' + message.userID ) );
        const sameTime = ((message.time - props.previousTime) < 60000); //in ms

        var avatar = (message.userAvatar?  (<Image className="avatar" data-tooltip={message.userName} avatar src={message.userAvatar} size="mini" rounded />) : '');

        //console.log('components/ChatMesage render', message, message.notification, isNotification, sameUser && !isNotification);

        const messageDate = new Date(message.time);
        const messageDateTime = messageDate.toLocaleDateString() + ' at ' + messageDate.toLocaleTimeString();

        var className = 'chatMessage ' + (props.darkMode?'dark ':'') +' '+ (isNotification ? 'notification' : 'user' )+' '+(isOwnMessage ? 'own ' : '') +' '+ (message.automated ? 'automated' : '');
        var outputUser = (sameUser || isNotification ) ? '' : ( <strong> {avatar} {message.userName}</strong>);
        var outputTime = (sameUser && sameTime) ? '' : (<i>{messageDateTime}</i>); //hide time if same user and same time
        var outPutHead =  (outputUser || outputTime) ? (<>{outputUser} {outputTime}:<br/></>) : '';

        var outputImage = '';
        if (message.image) outputImage =  (<Image src={message.image}  size="mini" rounded floated="left" verticalAlign="middle"/>); 
        if (message.picture) outputImage =  (<Image src={message.picture}  size="small" rounded floated="left" verticalAlign="middle"/>); 

        var multilanguageCode = '';
        if (props.config.multilanguage) multilanguageCode =  ( message.flag ? ( message.flag != props.appState.flag ? ( state.flag == props.appState.flag ? (<div> <Flag name={message.flag}/> <br/> {state.translation.split("\n").map((i,key) => {return <div key={key}>{i}</div>; })} <Flag name={state.flag}/></div>) : ( props.config.translations ? <Button onClick={this.translationUpdate} compact basic size='tiny' disabled={state.updating} loading={state.updating} className={(props.darkMode?'inverted ':'')}><Flag name={message.flag}/> → <Flag name={props.appState.flag}/></Button> : <Flag name={message.flag}/> ) ) : <Flag name={message.flag}/> ): '' );
            return (
                <li className={className} key={message.ID} ref={props.messageRef}>
                    {outPutHead}
                    { (message.mentionMessage != 0 &&  message.mentionMessage != undefined) ? <Button data-tooltip={props.txt('Scrool to Message')} onClick={ (e) => props.messageScroll(e, message.mentionMessage) } size='tiny' className={(props.darkMode?'inverted ':'')} target="_blank"  compact icon> <Icon name='arrow up' size='small'/> </Button>: ''}
                    { (message.mentionUser != '' &&  message.mentionUser != undefined) ? (<span> @{message.mentionUser}<br/></span>) : ''}

{message.video ? (<div><video style={{maxWidth:'75%'}} src={message.video} controls></video></div>):''}
{message.audio ? (<div><audio src={message.audio} controls></audio></div>):''}

{props.selectedID == message.ID ? <span><Icon name='arrow right' /></span> : '' }
{props.selectedID == -1 ? <span><Icon name='caret right' /></span> : '' }

        <label className="messageText" style={message.progressTotal ? {minWidth:'45%'}:{}} id={'m' + message.ID} onClick={(e) => props.messageClick(e, message.ID, message.userName)}>
        {outputImage}
            {message.text.split("\n").map((i,key) => {return <div key={key}>{i}</div>; })}
        {multilanguageCode}
        {message.progressTotal ? (<div><Progress style={{minWidth:'40%'}} className={(props.darkMode?'inverted ':'')}  value={message.progressValue} total={message.progressTotal} indicating progress='ratio' size='small'>{message.progressDetails}</Progress></div>):''}
        {message.url? ( 
        <Button className={(props.darkMode?'inverted ':'')} target="_blank" href={message.url} compact icon>
    <Icon name='linkify' />
  </Button>):''} 
  {message.count ? <Label><Icon name='mail' /> {message.count}</Label>: ''} 
  {message.attachmentsCount ? <Label><Icon name='file' /> {message.attachmentsCount}</Label>: ''}
  {message.recordingsCount ? <Label><Icon name='file video' /> {message.recordingsCount}</Label>: ''}
  {message.file_name? ( 
      <span> {message.file_name} {message.file_size} <Button className={(props.darkMode?'inverted ':'')} target="_blank" href={message.file_url} compact icon>
    <Icon name='download' />
  </Button> </span>):''}
        </label>
                </li>
            );
    }

}