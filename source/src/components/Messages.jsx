import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import PropTypes from 'prop-types';

import Panel from './Panel';

import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

import { Icon} from 'semantic-ui-react';

export default class Messages extends Panel {

  //props (expected component properties)
  static propTypes = {
    config: PropTypes.object.isRequired,
    
    user: PropTypes.object.isRequired,
    appState: PropTypes.object.isRequired,
		appStateUpdate: PropTypes.func.isRequired,

    messages: PropTypes.array.isRequired,

    serverUpdate: PropTypes.func.isRequired,
  };



  constructor(props) {
     super(props);

     this.devMode = props.appState.devMode;
     
     this.messageRefs = {};

     this.state = {
         container: null,
     };

 }


 txt = (text) =>
 {
   //handle text translations from config
   const { props } = this;
   if (!props.config) return text;
   if (text in props.config.text) return props.config.text[text];

   return text;
 }


  scrollToBottom = () => {
    const { messageList } = this.refs;
    const scrollHeight = messageList.scrollHeight;
    const height = messageList.clientHeight;
    const maxScrollTop = scrollHeight - height;
    ReactDOM.findDOMNode(messageList).scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
  }

  messageClick = (e, messageID, userName) =>
  {
  if(this.devMode) console.log('components/Messages messageClick',messageID, userName, this.devMode, e);
  e.stopPropagation();

  const { props } = this;
  if (props.appState.messageSelected != messageID || props.appState.messageUser != userName) 
  props.appStateUpdate({messageSelected: messageID, messageUser: userName});
  }


  replyClick = (e, messageID, userName) =>
  {
  }

  messageScroll = (e, messageID) =>
  {
    if(this.devMode) console.log('components/Messages messageScroll', messageID, this.messageRefs[messageID]);
    e.stopPropagation();
    
    if (this.messageRefs) if (this.messageRefs[messageID]) if (this.messageRefs[messageID].current)
    this.messageRefs[messageID].current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  componentDidMount() {
   // console.log('components/ChatHistory componentDidMount', this.props);
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }



  sendReply = (message) => {
   
    this.props.serverUpdate({ task: 'questions_message', message: message, messageSelected: this.props.appState.messageSelected });

    if (this.devMode) console.log('VideoWhisper/components/Messages sendReply:', message, this.props, this.state);
  }

  sendQuestion = (message) => {
   
    this.props.serverUpdate({ task: 'questions_question', message: message});

    if (this.devMode) console.log('VideoWhisper/components/Messages sendQuestion:', message, this.props, this.state);
  }

  render() {
    const { props } = this;

    this.devMode = props.appState.devMode;

  // console.log('components/ChatHistory render', this.props.messages);


  //demo mode
  var modeText = false;
  if (props.appState.modeVersion != props.appState.version )
  if (!props.appState.checked || (props.appState.checked && props.appState.mode.text)) modeText = true;

    let messageList; 
    var previousUser = '';
    var previousTime = 0;
    var previousID = 0;

    this.messageRefs = {};

    var repliesList = '';
    const infoClass = 'chatMessage ' + (props.darkMode?'dark ':'') + ' notification' + ' automated';

    if (props.messages.length>0)
     messageList = (<ul className="chatMessageList" ref="messageList">
      {props.messages.map( (messageObj) => {

          if (modeText) if (messageObj.modeText) 
          {
            messageObj.text = props.appState.tooltip;
            messageObj.url = props.appState.tooltipURL;
            messageObj.image = props.appState.tooltipImage;
          }

          if (!this.messageRefs[messageObj.ID]) this.messageRefs[messageObj.ID] = React.createRef();
        
          const output = <ChatMessage config={props.config} user={props.user} appState={props.appState}  txt={this.txt} messageRef={this.messageRefs[messageObj.ID]} messageClick={this.messageClick} messageScroll={this.messageScroll} darkMode={props.appState.darkMode} userID={props.user.ID} message={messageObj} key={messageObj.ID} previousUser={previousUser} previousTime={previousTime} selectedID = {props.appState.messageSelected}/>

          previousUser = messageObj.userName + '#' + messageObj.userID;
          previousTime = messageObj.time;

          //replies
          repliesList = '';
          if (props.appState.messageSelected) 
          if (messageObj.ID == props.appState.messageSelected) 
          if (messageObj.count) if (messageObj.replies)
          
          repliesList = messageObj['replies'].map( (replyObj) => {

          const outputR = <ChatMessage config={props.config} user={props.user} appState={props.appState}  txt={this.txt} messageRef={this.messageRefs[replyObj.ID]} messageClick={this.replyClick} messageScroll={this.messageScroll} darkMode={props.appState.darkMode} userID={props.user.ID} message={replyObj} key={replyObj.ID} previousUser={previousUser} previousTime={previousTime} selectedID = {-1} />

          //skip duplicate
          if (previousID === replyObj.ID) return ''; 
          previousID = replyObj.ID;

          return outputR;
          });
        

          //skip modeText if not active
          if (messageObj.modeText) if (!modeText) return '';
          
          //skip duplicate
          if (previousID === messageObj.ID) return ''; 
          previousID = messageObj.ID;

         //output
         if (repliesList) return [output, repliesList];
         return output;
      })
      }
  <li className={infoClass} key="i1">  
  <span><Icon name='info circle' /> {props.room.questionsInfo}</span>
  </li>
      </ul>);
    else messageList = (
<ul className="chatMessageList" ref="messageList" >
  <li className="chatMessage" key="i0">  
      <span>{this.txt('No Messages.')}</span>
  </li>
  <li className={infoClass} key="i1">  
  <span><Icon name='info circle' /> {props.room.questionsInfo}</span>
  </li>
</ul>);

var chatInput = '';

if (props.room.questionsAnswer && props.appState.messageSelected) chatInput = ( 
<ChatInput config={props.config} 
  appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} room={props.room} sendMessage={this.sendReply} serverUpdate={props.serverUpdate} options={{scenario: 'reply', targetUser: props.appState.messageUser, uploadDisable: true, recordDisable: true}} />
  )

  if (props.room.questionsQuestion) chatInput = ( 
    <ChatInput config={props.config} 
      appState={props.appState} appStateUpdate={props.appStateUpdate} appSfx={props.appSfx} user={props.user} room={props.room} sendMessage={this.sendQuestion} serverUpdate={props.serverUpdate} options={{scenario: 'question', price: props.room.questionsPrice, uploadDisable: true, recordDisable: true}} />
      )

  return (
    <div className="layoutList" key="layoutList" style={{ backgroundColor: props.appState.backgroundColor }}>
      <div className="layScrollable" key="layScrollable" ref={this.scrollableRef} >{messageList} </div>
      <div className="layMenu">{chatInput}</div>
    </div>
  );

  }

}