import React, { Component } from 'react';
import { Icon, Button, Segment, Label, Header, Divider} from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';

export default class Presentation extends Panel {
    //camera

    static propTypes = {
        appState: PropTypes.object.isRequired,

        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        serverUpdate: PropTypes.func.isRequired,
    };

    constructor(props) {
 
         super(props);
         this.state = {
         };

         this.devMode = props.appState.devMode;
 
         if (this.devMode) console.log('components/Presentation constructor room:', props.room);
     }

      componentWillUnmount() {
        if (this.devMode) console.log('components/Presentation  componentWillUnmount');
    }

    removeMedia(e, { name, value }) {

      if (this.devMode) console.log("components/Presentation removeMedia", name, value, e);
      this.props.serverUpdate({task:'presentation_remove', placement: value});
    }

    render() 
    {
      const {props, txt} = this;

      var buffer = [];
      if (props.appState.media )
      for (var placement in props.appState.media)
      {
      var content = props.appState.media[placement];
      let warning = '';
      if (content.type === 'stream')
      {
       let playbackUser = this.props.room.users[content.userID]; 
        if (!playbackUser) warning = 'Not Available';
        else if (playbackUser.meta) if (!playbackUser.meta.connected) warning  = 'Not Broadcasting';
      }
      
      buffer.push(<div key={'presentationPlacement' + placement}>
      {content.default ? <Label pointing='right'>{txt('Default')}</Label> : (content.type === 'empty'?<Label pointing='right'>{txt('Empty')}</Label>:<Button className={props.appState.className} size="tiny" compact key={'removeMedia'+ placement} name={'removeMedia'+ placement} value={placement} color='red' onClick={this.removeMedia.bind(this)}> <Icon name="window close"/>Remove</Button>)} 
      <b>{placement}</b>: {content.type} <i>{content.name}</i> {warning}
      </div>)
      }  

       return ( 
                <div className="layScrollable" key="layPresentation" style={{backgroundColor: props.appState.backgroundColor}} ref={this.scrollableRef}>
                 <Segment className={props.appState.className}>
                 <Header className={props.appState.className} as='h4'>{txt('Media Displayed')}: {props.room.name}</Header>
                 <Divider />

                {buffer}
                </Segment>
                </div>
            );
    }
}