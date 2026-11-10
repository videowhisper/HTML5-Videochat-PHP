import React, { Component } from 'react';
import { Icon, Form, Divider, Segment, Input, Label, Header, Button} from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';

export default class Broadcast extends Panel {
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
 
         if (this.devMode) console.log('components/Broadcast constructor room:', props.room);
     }

      componentWillUnmount() {
        if (this.devMode) console.log('components/Broadcast componentWillUnmount');
    }

    copyToClipboard = (e) =>
    {
      console.log('components/Broadcast copyToClipboard', e.target.value);
      e.target.select();
       if (navigator.clipboard) if (navigator.clipboard.writeText) navigator.clipboard.writeText(e.target.value);
    }


    onClick(e, { name, value }) {

      if (this.devMode) console.log("components/Broadcast onClick", name, value, e);
      const { state, props } = this;
      var action;
  
      switch (name) {
        case 'closed':
            this.props.serverUpdate({ task: 'external', external: false});
          break;

      }
    }

    render() 
    {
      const {props, txt} = this;

      var buffer = [];

      if (!props.room.broadcastSettings) buffer.push(<p>No broadcast settings available</p>);
      else
      for (var groupname in props.room.broadcastSettings)
      if (groupname !== 'meta')
      {
        var group = props.room.broadcastSettings[groupname];   
        var bufferF = [];
      for (var fieldname in group.fields)
      {
        var field = group.fields[fieldname];

        switch (field.type)
        {
          case 'text':
              bufferF.push(<Form.Field key={field.name} >
                <label>{field.description}</label>
                <Input
    fluid
    readOnly
    onClick={this.copyToClipboard}    
    iconPosition='left'
    defaultValue={field.value}
  >
         <Icon name='copy' />
      <input />
    </Input>
                <br/><small>{field.details}</small>
                </Form.Field>);
          break;

          case 'link':
            bufferF.push(<Form.Field key={field.name} >
<Button className={props.appState.className} size="small" name={field.name} color={field.color?field.color:'blue'} target='_blank' href={field.url}>
          <Icon name={field.icon?field.icon:'cloud download'} /> {field.description}
        </Button>
              <br/><small>{field.details}</small>
              </Form.Field>);
            break;
        }
      }
  

      buffer.push(<div key={groupname}>
        <Header className={props.appState.className} as='h4'>{group.name}</Header>
        {group.details}
        <Divider />
        <Form className={props.appState.className}>{bufferF}</Form>
        <Divider hidden/>
        </div>)
     }
   
 //user info
 var userInfo = 'User list not available.';
 var showHLS = false;

     if (props.room.users) 
     { 
         //user list available
         var playbackUser; //detect user being played in this video            
         if (props.room) //video content prop: use this
         { 
             playbackUser = props.room.users[props.user.ID];
             userInfo = 'User info available.';
         }
         else userInfo = 'Not in user list.';

         var broadcastInfo = txt('Not Available');

         //console.log('components/Broadcast render playbackUser',playbackUser);

         if (playbackUser) if (playbackUser.meta) {
             if (playbackUser.meta.external)
             {
                 broadcastInfo = 'Started';
                 showHLS = true;
                 if (playbackUser.meta.connected) if (playbackUser.meta.connectedUpdate > playbackUser.meta.externalUpdate)  
                 {
                   showHLS = false; 
                   broadcastInfo = 'Web Broadcast More Recent';
                 }
             }
         }

         if (showHLS) if (playbackUser.hls) userInfo = txt('Streaming');
         else userInfo = 'HLS not available.';

         if (!showHLS) userInfo = broadcastInfo;
     }

  

const closeButton = (showHLS ? (<div key='closed'> <Button className={props.appState.className} icon size="small"  name='closed' color='red' onClick={this.onClick.bind(this)} >
<Icon name='close' /> {txt('Closed')}
</Button> <small>{txt('Use after ending external broadcast, to faster restore web based webcam interface.')}</small> </div>):'');

       return ( 
<div className="layoutScrollable" key="layoutBroadcastScroll" style={{backgroundColor: props.appState.backgroundColor}}>
<div className="layScrollable" key="layBroadcast" ref={this.scrollableRef}>
 <Segment className={props.appState.className} >
 <Header className={props.appState.className} as='h4'>{txt('External Broadcast')}</Header>
 <Label color={(showHLS?'green':'yellow')}>{userInfo}</Label>
 {closeButton} 
 <small><br/>{props.room.broadcastSettings.meta.description?props.room.broadcastSettings.meta.description:txt('External Broadcast')}</small>
 <Divider />
   {buffer}
</Segment>
</div>
</div>

            );
    }
}