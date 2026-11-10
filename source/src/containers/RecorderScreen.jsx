import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Recorder from '../components/Recorder';

import { Button, Modal, Header, Icon, Label} from 'semantic-ui-react';

//config: recordStay, recordMultiple, recordClosed

export default class RecorderScreen extends Component {
   
    static propTypes = {  
        config: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        appStateUpdate: PropTypes.func.isRequired,
        appState: PropTypes.object.isRequired,

        serverUpdate: PropTypes.func.isRequired,
    };


constructor(props) {
    super(props);

    this.devMode = props.appState.devMode;

    this.configLoaded = false;
    this.sentCount = 0;
    
    this.state =
    {
        recordModalShow: false,
    }
   // this.componentActions = React.createRef();
}

txt = (text) =>
{
  //handle text translations from config
  const { props } = this;
  if (!props.config) return text;
  if (text in props.config.text) return props.config.text[text];

  return text;
}

recorderStatus = (status) =>
{
  if (this.devMode) console.log('components/RecorderScreen recorderStatus', status, this.props.config);

  switch (status)
  {
      case 'uploadCompleted':
      if (!this.props.config.recordStay) window.location.href = this.props.config.exitURL;
      this.sentCount++;
      if (this.devMode) console.log('components/RecorderScreen recorderStatus sentCount', this.sentCount);
      this.recordModalClose();
      break;
  }

}

recordModalClose = () => this.setState({ recordModalShow: false })
recordModalOpen = () => this.setState({ recordModalShow: true })

    render() {
        const { props, txt, state } = this;

        this.devMode = props.appState.devMode; //update on render

        //show after loading config if not closed
        if (!this.configLoaded)
        if (props.config.loaded) 
        {
          this.configLoaded = true;
          if (! props.config.recordClosed ) this.state.recordModalShow = true;

          if (this.devMode) console.log('components/RecorderScreen configLoaded', this.props.config);
        }

        var buffer = [];
        if ( this.sentCount>0)
        buffer.push(
          <Label compact className={props.appState.className} icon size="small" key='sentCount' name='sentCount' color='green' >
          <Icon name='file video' /> { this.sentCount}
        </Label>
        );
 
        if (this.props.config.recordMultiple) if (!this.state.recordModalShow)
buffer.push(
  <Button compact className={props.appState.className} icon size="small" key='addRecoding' name='addRecoding' color='red' onClick={this.recordModalOpen.bind(this)}>
  <Icon name='video' /> {txt('Add Recording')}
</Button>
);

if (props.room.actionButtons)
for (var buttonKey in props.room.actionButtons)
{
  var button = props.room.actionButtons[buttonKey];
//   console.log("components/Actions render ", buttonKey, button);
  buffer.push(
    <Button compact className={props.appState.className} icon size="small" floated={button.floated} key={button.name} name={button.name} color={button.color} target={'_' + button.target} href={button.url} data-tooltip={button.tooltip}>
    <Icon name={button.icon} /> {button.text}
  </Button>
  );
}

    //0/1/2 = trial/full/suspended
    if (!props.appState.checked || (props.appState.checked && props.appState.mode.text)) {
      buffer.push(
        <Button compact icon className={props.appState.className} size="small" floated="right" key='videowhisper' name='videowhisper' color={['red', 'blue', 'orange', 'olive', 'green', 'violet', 'pink'][Math.floor(Math.random() * 7)]} target='_videowhisper' href={props.appState.tooltipURL} data-tooltip={props.appState.tooltip}>
          <Icon name={['eye', 'audio description', 'bullhorn', 'tag', 'question circle', 'at'][Math.floor(Math.random() * 6)]} />
        </Button>
      );
    }

        return ( <div className="layoutRecorder" style={{backgroundColor: props.appState.backgroundColor}}>
                
        <Modal key='recordModal'
          open={state.recordModalShow}
          closeIcon
          onClose={this.recordModalClose}
          size='small' basic={props.appState.darkMode}
        >
          <Header icon='file video' content={txt("Record")} />
          <Modal.Content>
          <Recorder config={props.config} user={props.user} room={props.room}
                appState={props.appState} appStateUpdate={props.appStateUpdate} 
                serverUpdate={props.serverUpdate} recorderStatus={this.recorderStatus}
                options={{scenario: 'standalone'}}
                />
          </Modal.Content>

          <Modal.Actions> 
            <Button compact inverted={props.appState.darkMode}  color='red' onClick={this.recordModalClose}>
              <Icon name='remove' /> {txt('Nevermind')}
            </Button>
          </Modal.Actions>

        </Modal>

            {buffer}

                </div>
            );
    }
}