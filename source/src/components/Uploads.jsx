import React, { Component } from 'react';
import { Icon, Segment, Dropdown } from 'semantic-ui-react'

import PropTypes from 'prop-types';
import _ from 'lodash';

import Dropzone from 'react-dropzone';
import request from "superagent";
//import qs from "qs";

export default class Uploads extends Component {
    //camera

    static propTypes = {
        appState: PropTypes.object.isRequired,

        user: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,

        serverUpdate: PropTypes.func.isRequired,

        uploadsStatus: PropTypes.func.isRequired,

        options: PropTypes.object,
    };

    constructor(props) {
 
         super(props);
         this.state = {
            uploading: false,
         };

         this.devMode = props.appState.devMode;

         this.fileInputRef = React.createRef();
 
         if (this.devMode) console.log('components/Files constructor room:', props.room);
     }


      componentWillUnmount() {
        console.log('components/Files  componentWillUnmount');
    }

    
    txt = (text) => {
      //handle text translations from config
      const { props } = this;
      if (text in props.config.text) return props.config.text[text];
  
      return text;
    }


    onDrop = (files) => {

       const {props} = this;

        //https://visionmedia.github.io/superagent/#multipart-requests 

        if (!props.config.serverURL) 
        {
          console.log('components/Files onDrop missing serverURL', props.config.serverURL, props.config);
          return;
        }
        const req = request.post(props.config.serverURL);
        req.field('task', 'file_upload');

        req.field('VideoWhisper[userID]', props.user.ID);
        req.field('VideoWhisper[sessionID]', props.user.sessionID);
        req.field('VideoWhisper[sessionKey]', props.user.sessionKey);
        req.field('VideoWhisper[nonce]', props.config.nonce);

       if (!props.room.ID) 
       { 
           console.log('components/Files onDrop room', props.room, props.user, props.config.serverURL);
    } else
    {
        req.field('VideoWhisper[roomID]', props.room.ID);
        req.field('VideoWhisper[privateUID]', props.room.privateUID);
    }

        var filelist = [];
        files.forEach(file => {
          req.attach(file.name, file, file.name);
          filelist.push(file.name);
        });

        req.field('files[]', filelist);
    

        req.then(this.uploadCompleted.bind(this));
        console.log('components/Files onDrop', files, req);

        this.setState({uploading: true});

        //event.stopPropagation();
      }
      

    uploadCompleted(e)
    {
        console.log('components/Files uploadCompleted',e);
        this.props.serverUpdate({task:'update', 'update':'files'});

        this.setState({uploading: false});
        this.props.uploadsStatus('uploadCompleted');
    }

    render() {
      //  console.log('components/Files  render');
        const {props, state, txt} = this;

        var menu;    

        if (this.props.room.filesUpload) menu = (
            <Dropzone onDrop={this.onDrop}>
  {({getRootProps, getInputProps}) => (
    <Segment className={props.appState.className}>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <p><Icon name='upload' loading={state.uploading}/> {state.uploading? txt('Uploading. Please wait...'): txt("Upload: Drag and drop files here, or click to select files")}</p>
      </div>
    </Segment>
  )}
</Dropzone>
          ); else menu = txt('File upload disabled.');

        return menu;
    }
}
