import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { Header, Segment } from 'semantic-ui-react'
import PropTypes from 'prop-types';

import ChatMessage from './ChatMessage';

/*
import { connect } from "react-redux";

const mapStateToProps = state => {
  
  console.log('ChatHistory mapStateToProps', state);
  return { 
    messages: state.messages,
    user: state.user,
    room: state.room,
   };
 
};
*/

export default class ChatHistory extends Component {

  //props (expected component properties)
  static propTypes = {
    config: PropTypes.object.isRequired,
    
    user: PropTypes.object.isRequired,
    appState: PropTypes.object.isRequired,
		appStateUpdate: PropTypes.func.isRequired,

    messages: PropTypes.array.isRequired,
      
    fetchHistory: PropTypes.func.isRequired,
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
 
  onScroll = () => {
 
    const { refs } = this;
    const scrollTop = refs.messageList.scrollTop;
   
       // TODO: call fetchHistory when scrolled to the top
//       console.log('ChatHistory onScroll', scrollTop);

    if (scrollTop === 0) {
  //    props.fetchHistory();
    }

  };

  scrollToBottom = () => {
    const { messageList } = this.refs;
    const scrollHeight = messageList.scrollHeight;
    const height = messageList.clientHeight;
    const maxScrollTop = scrollHeight - height;
    ReactDOM.findDOMNode(messageList).scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
  }

  messageClick = (e, messageID, userName) =>
  {
  if(this.devMode) console.log('components/ChatHistory messageClick',messageID, userName, this.devMode, e);
  e.stopPropagation();

  const { props } = this;
  if (props.appState.chatMentionMessage != messageID || props.appState.chatMentionUser != userName) 
  props.appStateUpdate({chatMentionMessage: messageID, chatMentionUser: userName});
  }

  messageScroll = (e, messageID) =>
  {
    if(this.devMode) console.log('components/ChatHistory messageScroll', messageID, this.messageRefs[messageID]);
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
  
  render() {
    const { props, onScroll } = this;

    this.devMode = props.appState.devMode;

  // console.log('components/ChatHistory render', this.props.messages);


  var modeText = false;
  if (!props.appState.checked || (props.appState.checked && props.appState.mode.text)) modeText = true;

    let messageList; 
    var previousUser = '';
    var previousTime = 0;
    var previousID = 0;

    this.messageRefs = {};
    this.mIDs = [];

    if (props.messages.length>0)
     messageList = (<ul className="chatMessageList" ref="messageList" onScroll={onScroll}>
      {props.messages.map( (messageObj) => {

          if (modeText) if (messageObj.modeText) 
          {
            messageObj.text = props.appState.tooltip;
            messageObj.url = props.appState.tooltipURL;
            messageObj.image = props.appState.tooltipImage;
          }

          if (!this.messageRefs[messageObj.ID]) this.messageRefs[messageObj.ID] = React.createRef();
        
          const output = <ChatMessage config={props.config} user={props.user} appState={props.appState} txt={this.txt} messageRef={this.messageRefs[messageObj.ID]} messageClick={this.messageClick} messageScroll={this.messageScroll} darkMode={props.appState.darkMode} userID={props.user.ID} message={messageObj} key={messageObj.ID} previousUser={previousUser} previousTime={previousTime}/>

          previousUser = messageObj.userName + '#' + messageObj.userID;
          previousTime = messageObj.time;

          //skip modeText if not active
          if (messageObj.modeText) if (!modeText) return '';
          
          //skip duplicate
          if (previousID === messageObj.ID) return '';  //previous
          if  (this.mIDs.indexOf(messageObj.ID) >= 0) return ''; //already show
          previousID = messageObj.ID;

          //output
         this.mIDs.push(previousID); //remember displayed
         return output;

      })
      }
    </ul>);
    else messageList = (
<ul className="chatMessageList" ref="messageList" onScroll={onScroll}>
  <li className="chatMessage" key="0">  
      <span>No Messages.</span>
  </li>
</ul>);

    return (
      <div className="panel" style={{backgroundColor: props.appState.backgroundColor}} ref={container => (this.state.container = container)}> 

       <div className="controls">
            {messageList}
      </div>

      </div>
    );
  }

}