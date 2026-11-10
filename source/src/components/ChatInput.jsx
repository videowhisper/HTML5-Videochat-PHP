import React, { Component } from 'react';
import PropTypes from 'prop-types';

import 'emoji-mart/css/emoji-mart.css';
import { Picker } from 'emoji-mart';

import { checkText } from 'smile2emoji';

import { Popup, Button, Dropdown, Input, Form, Image, Modal, Header, Icon, TextArea, Flag } from 'semantic-ui-react';

import Recorder from './Recorder';
import Uploads from './Uploads';


export default class ChatInput extends Component {

    static propTypes = {

        config: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,    
    
        appState: PropTypes.object.isRequired,
        appStateUpdate: PropTypes.func.isRequired,
        
        sendMessage: PropTypes.func.isRequired,

        serverUpdate: PropTypes.func.isRequired,

        options: PropTypes.object
    };

    constructor(props) {
       // console.log('components/ChatInput constructor', props);
        super(props);

        this.devMode = props.appState.devMode;

        this.state = {
            message: '',
            messageLong: '',
            mention: 'replyat',
            container: null,
            emojiModalShow: false,
            recordModalShow: false,
            textModalShow: false,
            uploadModalShow: false,
            languageModalShow: false,
        };

        this.inputRef = React.createRef();

        this.onChange = this.onChange.bind(this);
    }

    // Helper function to get button size based on mobile/desktop state
    getButtonSize = () => {
      return this.props.appState.isMobile || this.props.appState.minMode ? "tiny" : "small";
    }

    txt = (text) =>
    {
      //handle text translations from config
      const { props } = this;
      if (!props.config) return text;
      if (text in props.config.text) return props.config.text[text];
  
      return text;
    }

    componentDidMount() {
      //  console.log('components/ChatInput componentDidMount', this.state);
    }

    onSubmit = (e) => {

        if (e) e.preventDefault();

        const {props, state} = this;

        if (this.devMode) console.log('ChatInput onSubmit', this.state);

        // Check if the message is empty
        if (!this.state) return;

        const message = this.state.message;
        if (message.length === 0) {
            return;
        }

        //app commands
        switch (message)
        {
            case '/vws dev':
            props.appStateUpdate({devMode: true});
            console.log('components/ChatInput devMode Enabled', this.state);

            break;
        }

        // Build a message object and send it
        var messageObj = {
            userID: props.user.ID,
            userName: props.user.name,
            userAvatar: props.user.avatar,
          
            notification: false,
           
            text: message,
            
            language: props.appState.language,
            flag: props.appState.flag,

            time: new Date().valueOf(),

            mentionMessage: 0,
            mentionUser: '',

            ID: new Date().valueOf(),
        };

        if (props.appState.chatMentionMessage !=0) if (state.mention == 'message' || state.mention == 'replyat') messageObj['mentionMessage'] = props.appState.chatMentionMessage;
        if (props.appState.chatMentionUser != '') if (state.mention == 'user' || state.mention == 'replyat') messageObj['mentionUser'] = props.appState.chatMentionUser;

        props.sendMessage(messageObj);
        this.setState({message: ''});
        props.appStateUpdate({chatMentionMessage: 0, chatMentionUser: ''});

    };

    onChange(event) {
        const target = event.target;
        var value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        // https://www.npmjs.com/package/smile2emoji
        if ( name == 'message' || name == 'messageLong' ) value = checkText(value);

        var longTextLength = 20;
        if (this.props.config.longTextLength) longTextLength = this.props.config.longTextLength;

        if ( name == 'message' && value.length >= longTextLength ) this.setState({
          message : value, messageLong : value, textModalShow: true
      });
      else
        this.setState({
            [name]: value
        });

        // console.log('ChatInput onChange', name, value, this.inputRef.current.value);
    }

   
    emojiModalClose = () => this.setState({ emojiModalShow: false })
    recordModalClose = () => this.setState({ recordModalShow: false })
    uploadModalClose = () => this.setState({ uploadModalShow: false })
    languageModalClose = () => this.setState({ languageModalShow: false })

    textModalClose = () => this.setState({ textModalShow: false, message: '', messageLong: '' })
    textModalSend= (e) => 
    {
      this.setState(
      { textModalShow: false, message: this.state.messageLong, messageLong: '' }
            , (e) => this.onSubmit(e) );
    }

    textModalKeep= () => 
    {
      this.setState(
      { textModalShow: false, message: this.state.messageLong, messageLong: '' }
            );
    }

    onEmojiButton = () => this.setState({ emojiModalShow: true})
    onRecordButton = () => this.setState({ recordModalShow: true})
    onUploadButton = () => this.setState({ uploadModalShow: true})
    onLanguageButton = () => this.setState({ languageModalShow: true})

    addEmoji = (emoji) =>
    {
      if (this.devMode) console.log('components/ChatInput addEmoji', emoji);
      var message ;

      if (this.state.textModalShow)
      {
        message = this.state.messageLong;
        if (emoji) if (emoji.native) message = message + emoji.native;
        this.setState({ 'emojiModalShow': false, 'messageLong': message});
      }
      else 
      {
          message = this.state.message;
          if (emoji) if (emoji.native) message = message + emoji.native;
          this.setState({ 'emojiModalShow': false, 'message': message});
      }
    }

    onMentionChange = (event, data) =>
    {
      if (this.devMode) console.log('components/ChatInput onMentionChange', data);
     
      if (data.value == 'cancel')  this.props.appStateUpdate({chatMentionMessage: 0, chatMentionUser: ''});
      else this.setState({mention: data.value});

    }

    recorderStatus = (status) =>
    {
      if (this.devMode) console.log('components/ChatInput recorderStatus', status);

      switch (status)
      {
          case 'uploadCompleted':
          this.recordModalClose();
          break;
      }

    }

    uploadsStatus = (status) =>
    {
      if (this.devMode) console.log('components/ChatInput uploadsStatus', status);

      switch (status)
      {
          case 'uploadCompleted':
          this.uploadModalClose();
          break;
      }

    }

    /*
    static getDerivedStateFromProps(props, state)
  {
    if ( !props.config || !props.config.languages) return { language: props.appState.language, flag: props.appState.flag };

    const field = props.config.languages;
    if (props.appState) if (props.appState.devMode) console.log('Components/ChatInput getDerivedStateFromProps', field, props, state);


    return { language: field.value, flag: field.flag };
  }
  */

    language2flag(lang){
      const flags = { 'en-us':'us', 'en-gb':'gb', 'pt-br':'br', 'pt-pt':'pt', 'zh':'cn', 'ja':'jp', 'el':'gr', 'da':'dk' };
      if (flags[lang]) return flags[lang];
      return lang;
    }

    onLanguageChange(event, data) {

      if (this.devMode)  console.log('Components/ChatInput onLanguageChange', data, event);

      this.props.serverUpdate({task:'options', 'name': data.name, 'value': data.value});

      this.setState({
        language: data.value,
        flag: this.language2flag(data.value),
        languageModalShow: false,
    });

      this.props.appStateUpdate( { language : data.value, flag: this.language2flag(data.value) } );
  }

    render() {
        const { props, onSubmit, state, onChange, txt } = this;

        var showButtons = true;
        if (state.message.length > 4) showButtons = false;

        var uploadModalCode = '';
        var codeUpload = '';
        var languageModalCode = '';

        if (this.props.room.filesUpload && showButtons)
        {
        codeUpload = (<Button compact size={this.getButtonSize()} icon type="button" color='teal' data-tooltip={txt('Upload')} onClick={this.onUploadButton} inverted={props.appState.darkMode}><Icon name='upload' /></Button> );

         uploadModalCode = (
          <Modal key='uploadModal' closeIcon
          open={state.uploadModalShow}
          onClose={this.uploadModalClose}
          size='small' basic={props.appState.darkMode}
        >
          <Header icon='upload' content={txt("Upload")} />
          <Modal.Content>
          <Uploads appState={props.appState} appSfx={props.appSfx} user={props.user} config={props.config} room={props.room} serverUpdate={props.serverUpdate} uploadsStatus={this.uploadsStatus} />
          </Modal.Content>
          <Modal.Actions>
        
            <Button size={this.getButtonSize()} inverted={props.appState.darkMode}  color='red' onClick={this.uploadModalClose}>
              <Icon name='remove' /> {txt('Nevermind')}
            </Button>

          </Modal.Actions>
        </Modal>
          );

        }
        if (props.options) if (props.options.uploadDisable) codeUpload = '';

        const textModalCode = (
          <Modal key='textModal' closeIcon
          open={state.textModalShow}
          onClose={this.textModalSend}
          size='small' basic={props.appState.darkMode}
        >
          <Header icon='text width' content={txt("Long Text")} />
          <Modal.Content>
          <Form>
          <TextArea fluid name='messageLong' value={state.messageLong} onChange={onChange} />
          </Form>
          </Modal.Content>
          <Modal.Actions>
          
          <Button size={this.getButtonSize()} inverted={props.appState.darkMode}  type="button" color='yellow' data-tooltip={txt('Emoticons')} onClick={this.onEmojiButton}>
            <Icon name='smile' /> {txt('Emoticons')}
            </Button> 

            <Button size={this.getButtonSize()} inverted={props.appState.darkMode}  color='blue' onClick={this.textModalSend}>
              <Icon name='send' /> {txt('Send')}
            </Button>

            <Button size={this.getButtonSize()} inverted={props.appState.darkMode}  color='green' onClick={this.textModalKeep}>
              <Icon name='check' /> {txt('Keep')}
            </Button>

            <Button size={this.getButtonSize()} inverted={props.appState.darkMode}  color='red' onClick={this.textModalClose}>
              <Icon name='remove' /> {txt('Erase')}
            </Button>

            
          </Modal.Actions>
        </Modal>
          );

        const emojiModalCode = (
        <Modal key='emojiModal' closeIcon
        open={state.emojiModalShow}
        onClose={this.emojiModalClose}
        size='small' basic={props.appState.darkMode}
      >
        <Header icon='smile' content={txt("Emoji")} />
        <Modal.Content>
        <Picker onSelect={this.addEmoji} darkMode={props.appState.darkMode} native perLine={16} />
        </Modal.Content>
        <Modal.Actions>
          <Button size={this.getButtonSize()} inverted={props.appState.darkMode}  color='red' onClick={this.emojiModalClose}>
            <Icon name='remove' /> {txt('Nevermind')}
          </Button>
        </Modal.Actions>
      </Modal>
        );

        var recordModalCode = '';
        var codeRecorder = '';
        var codeLanguage = '';

        if (!props.config.recorderDisable && showButtons)  
        {
        codeRecorder = (<Button compact size={this.getButtonSize()} icon type="button" color='orange' data-tooltip={txt('Record')} onClick={this.onRecordButton} inverted={props.appState.darkMode}><Icon name='microphone' /></Button> );

        recordModalCode = (
          <Modal key='recordModal' closeIcon
          open={state.recordModalShow}
          onClose={this.recordModalClose}
          size='small' basic={props.appState.darkMode}
        >
          <Header icon='file video' content={txt("Record")} />
          <Modal.Content>
          <Recorder config={props.config} user={props.user} room={props.room}
                appState={props.appState} appStateUpdate={props.appStateUpdate} 
                serverUpdate={props.serverUpdate} recorderStatus={this.recorderStatus}
                options={{scenario: ( props.options ? props.options.scenario : 'chat' ) }}
                />
          </Modal.Content>
          <Modal.Actions> 
            <Button compact size={this.getButtonSize()} inverted={props.appState.darkMode}  color='red' onClick={this.recordModalClose}>
              <Icon name='remove' /> {txt('Nevermind')}
            </Button>
          </Modal.Actions>
        </Modal>
          );
        }
        if (props.options) if (props.options.recordDisable) codeRecorder = '';


        if ( props.config.multilanguage && showButtons && props.config.languages )  
        {
        codeLanguage = (<Button compact size={this.getButtonSize()} icon type="button" color='grey' data-tooltip={txt('Language')} onClick={this.onLanguageButton} inverted={props.appState.darkMode}><Flag name={props.appState.flag} /></Button> );

        const field = props.config.languages;

         languageModalCode = (
          <Modal key='languageModal' closeIcon
          open={state.languageModalShow}
          onClose={this.languageModalClose}
          size='small' basic={props.appState.darkMode}
        >
          <Header icon='flag' content={txt("Chat Language")} />
          <Modal.Content>
          <Form>
          <Dropdown name={field.name} selection compact fluid size={this.getButtonSize()}
                 className={props.appState.className + " v-select"} data-position="right center" 
                 value={props.appState.language} options={field.options} flag={props.appState.flag}
                 onChange={(e, data)=>this.onLanguageChange(e, data)} />
            <div>{field.details}</div>
          </Form>
          </Modal.Content>
        </Modal>
          );
         

        }

        //Mention
        var mentionCode = '';

        if (props.appState.chatMentionMessage != 0 || props.appState.chatMentionUser != '')
        {
          const mentionOptions = [
            { key: 1, text: <Icon name='arrow up' />, value: 'message' }, //text: txt('Reply')
            { key: 2, text: <Icon name='at' />, value: 'user'}, //text: '@' + props.appState.chatMentionUser
            { key: 3, text: <Icon name='reply' />, value: 'replyat'},                       //text: txt('Reply') + ' @'
            { key: 4, text: <Icon name='close' />, value: 'cancel'},           // text: txt('Cancel')
          ]          
          mentionCode = ( <Dropdown className={props.appState.className} compact inline size={this.getButtonSize()} options={mentionOptions} defaultValue={state.mention} selection onChange={this.onMentionChange} /> );
        }
  //          <Input size="small" fluid label={props.user.name} action={txt('Send')} focus name="message" value={state.message} onChange={onChange} type="text" placeholder={txt('Type your message')} />
      //icon={<Icon name='smile' link onClick={this.onEmojiButton}/>} 
      
        var codeUser = '';
        if (showButtons && !props.appState.minMode) codeUser = (<span key='codeUser'><Image src={props.user.avatar} verticalAlign='middle' avatar data-tooltip={props.user.name} /> <label><small>{props.user.name} {props.options && props.options.targetUser ? (<div><span><Icon name='arrow right' /></span>{props.options.targetUser} </div> ):''} {props.options && props.options.price ? (<div><span><Icon name='money' /></span>{props.options.price} </div> ):''}</small> </label> &nbsp; </span> );

        return (
            <div className="panel" style={{backgroundColor: props.appState.backgroundColor}} ref={container => (this.state.container = container)}> 

            <div className="controlsBottom">
            <Form id="chatInputSubmitForm" onSubmit={onSubmit} className={props.appState.className} autoComplete="off">

            <Form.Group inline unstackable>
            <Input inverted={props.appState.darkMode} attached='left' fluid focus name="message" value={state.message} onChange={onChange} type="text" placeholder={txt('Type your message')} >
            {codeUser}
            <div style={ {zIndex:4} } >{mentionCode}</div>
            
          <Popup inverted={props.appState.darkMode}
          trigger={<Button compact size={this.getButtonSize()} icon type="button" color='grey' data-tooltip={txt('Insert')} inverted={props.appState.darkMode}><Icon name='plus' /></Button>}
          content={
              <Button.Group vertical>
            {codeUpload}
            {codeRecorder}
            {codeLanguage}
            <Button compact size={this.getButtonSize()} icon type="button" color='yellow' data-tooltip={txt('Emoticons')} onClick={this.onEmojiButton} inverted={props.appState.darkMode}><Icon name='smile' /></Button>
              </Button.Group>
          }
          on='click'
          position='top center'
            /> 

             <input ref={this.inputRef} />
             <Button compact size={this.getButtonSize()} primary icon type='submit' data-tooltip={txt('Send')} inverted={props.appState.darkMode}><Icon name='send' /></Button>
             </Input>
            </Form.Group>

            </Form>
            </div>
            {emojiModalCode}
            {recordModalCode}
            {textModalCode}
            {uploadModalCode}
            {languageModalCode}
            </div>

        );
    }

}