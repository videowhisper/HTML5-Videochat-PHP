import React, { Component } from 'react';
import { Header, Form, Checkbox, Divider, Segment, Label, Dropdown } from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';

export default class Options extends Panel {
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
           panelType: 'Options',
           time: 0,
           updating: false,
         };

         this.devMode = props.appState.devMode; 
         if (this.devMode) console.log('components/Options constructor room:', props.room);
     }

      componentWillUnmount() {
        if (this.devMode) console.log('components/Options componentWillUnmount');
    }

    
     static getDerivedStateFromProps(props, state)
    {

      //update state if got new
      if (props.room.options) 
      if (props.room.options.meta)
      if (props.room.options.meta.time > state.time ) 
      {
        if (props.appState.devMode) console.log('components/Options getDerivedStateFromProps', state);
        return Options.propsToOptions(props); 
      }

      //else
      return null;
    }

    static propsToOptions(props)
    {
      var newState = {};

      if (props.room.options) 
      for (var groupname in props.room.options)
      if (groupname !== 'meta')
      {
        var group = props.room.options[groupname];   

        for (var fieldname in group.fields)
        {
          var field = group.fields[fieldname];
          if (field) if (field.name)  newState[field.name] = field.value;
        }
      }

      //update time
      if (props.room.options) 
      if (props.room.options.meta)
      newState.time = props.room.options.meta.time;

      //update complete
      newState.updating = false;

        if (props.appState.devMode) console.log('components/Options propsToOptions', newState);

        return newState;
    }

    onChange(event, data) {

      const value = data.type === 'checkbox' ? data.checked : data.value;
      const name = data.name;

      if (this.devMode)  console.log('Components/Options onChange', name, value, data);
      this.props.serverUpdate({task:'options', 'name': name, 'value': value});

     if (name) this.setState({
        [name]: value,
        updating: true
    });

  }

    render() 
    {
      const {props, state} = this;

      var buffer = [];

      if (!props.room.options) buffer.push(<p>No options</p>);
      else
      for (var groupname in props.room.options)
      if (groupname !== 'meta')
      {
        var group = props.room.options[groupname];   
        var bufferF = [];
      for (var fieldname in group.fields)
      {
        var field = group.fields[fieldname];
        switch (field.type)
        {
          case 'toggle':
              bufferF.push(<Form.Field key={field.name} >
                <label>{field.description}</label>
                <Checkbox name={field.name} data-position="right center" toggle disabled={state.updating} checked={state[field.name]} onChange={(e, data)=>this.onChange(e, data)} />
                <br/><small>{field.details}</small>
                </Form.Field>);
              break;

          case 'dropdown':
              bufferF.push(<Form.Group key={field.name}>
                <Form.Field>
                <label>{field.description}</label>
                <Dropdown name={field.name} selection compact
                 className={props.appState.className + " v-select"} data-position="right center" 
                 value={state[field.name]} disabled={state.updating} options={field.options} 
                 onChange={(e, data)=>this.onChange(e, data)} />
                  <br/><small>{field.details}</small>
                 </Form.Field>
               </Form.Group>);
            break;
            
          default:
              bufferF.push(<p key="noFields">{field.name} Unknown Type: {field.type}</p>);
        }
      }

      buffer.push(<div key={groupname}>
        <Header className={props.appState.className} as='h4'>{group.name}</Header>
        <Divider />
        <Form className={props.appState.className}>{bufferF}</Form>
        <Divider hidden/>
        </div>)
     }
     
       return ( 

        <div className="layoutScrollable" key="layoutOptionsScroll" style={{backgroundColor: props.appState.backgroundColor}}>
                <div className="layScrollable" key="layOptions" ref={this.scrollableRef}>
                 <Segment className={props.appState.className} >
                {buffer}
                </Segment>
                </div>
        </div>
            );
    }
}