import React, { Component } from 'react';
import { Icon, Segment, Table, Dropdown } from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';

import _ from 'lodash';

import Dropzone from 'react-dropzone';
import request from "superagent";
//import qs from "qs";

export default class Files extends Panel {
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
            column: null,
            data: null,
            direction: null,
            uploading: false,
         };

         this.devMode = props.appState.devMode;

         this.scrollableRef  = React.createRef();
         this.fileInputRef = React.createRef();

         if (props.room.files) this.state.data = props.room.files;
 
         if (this.devMode) console.log('components/Files constructor room:', props.room);
     }


     handleSort = clickedColumn => () => {
      this.sortBy(clickedColumn, false);
      }

      sortBy(clickedColumn, reset)
      {
        if (reset)
        {
          this.state.column = null;
          this.state.direction = null;
        }

        const { column, data, direction } = this.state;
    
        if (!data) return;

        const sortBy = (clickedColumn == 'age'?'time':clickedColumn);
        console.log('components/Files handleSort', clickedColumn, sortBy, direction, reset);

        if (column !== clickedColumn) {
          this.setState({
            column: clickedColumn,
            data: _.sortBy(data, [sortBy]).reverse(),
            direction: 'descending',
          })
    
          return
        }
    
        this.setState({
          data: direction === 'descending'?_.sortBy(data, [sortBy]):_.sortBy(data, [sortBy]).reverse(),
          direction: direction === 'ascending' ? 'descending' : 'ascending',
        })
      }

      componentDidMount() {
        this.sortBy('age', true);
      }

      componentWillUnmount() {
        console.log('components/Files  componentWillUnmount');
    }

    
    shouldComponentUpdate(nextProps, nextState){
       // if (_.isEqual(nextProps.room.files,this.props.room.files) && _.isEqual(nextState,this.state)) return false;
      
       // if (this.devMode)  console.log('components/Files shouldComponentUpdate', nextProps, nextState);
       if (!_.isEqual(nextProps.room.files,this.props.room.files)) 
       {
         this.state.data = nextProps.room.files;
         this.sortBy('age', true);
       }

        return true;
  
      }
      
    fileClick = file => (event, data) => 
    {
    console.log('components/Files fileClick',  file, data, event);

    /*
    const response = {
        file: file.url,
      };
      // server sent the url to the file!
      // now, let's download:
      window.open(response.file);
      */

      if (file && data.action)
      switch (data.action)
      {
          case 'open':
                const response = { file: file.url };
                window.open(response.file);
              break;

         case 'delete':
              this.props.serverUpdate({task:'file_delete', file_name: file.name});
             break;
       
        case 'presentation':
                this.props.serverUpdate({task:'file_presentation', file_name: file.name, placement: data.placement});
        break;

      }

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
    }

    render() {
      //  console.log('components/Files  render');
        const {props, state, txt} = this;

        var { column, data, direction } = this.state;
        var filePane, fileList, menu;    

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
          ); else menu = '';

        if (data) 
        {
            fileList = data.map((file) => {

            
              let options = [];
              options.push({ key: 'filemenuOpen_'+file.name, onClick: this.fileClick(file), icon:'file', text: txt('Open'),  action:'open' });
              if (this.props.room.filesDelete) options.push({key: 'filemenuDelete_'+file.name, onClick: this.fileClick(file), icon: 'trash', text: txt('Delete'), action: 'delete'});

            if (this.props.room.filesPresentation )
            for (var placement in this.props.appState.media)
            options.push ({key: 'filemenuPresentation_' + placement+file.name, onClick: this.fileClick(file), icon: 'pointing left',  text: txt('Show') + ': ' + placement,  action: 'presentation', placement: placement});

                var dropdown = (<Dropdown key={'filemenu'+file.name} text={file.name} options = {options} className={props.appState.className} />);

                return (
                    <Table.Row key={file.name}>
                        <Table.Cell >{dropdown}</Table.Cell>
                        <Table.Cell>{file.size}</Table.Cell>
                        <Table.Cell>{file.age}</Table.Cell>
                    </Table.Row>
                  );
            })
        }else fileList = (
            <Table.Row key="No_Files">
                <Table.Cell colSpan="3" warning>No files.</Table.Cell>
            </Table.Row>
          );

        filePane = (     
            <Table celled selectable striped sortable key="File_Pane" className={props.appState.className}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell 
                sorted={column === 'name' ? direction : null}
                onClick={this.handleSort('name')}
              >{txt('Name')}</Table.HeaderCell>
                <Table.HeaderCell 
                sorted={column === 'size' ? direction : null}
                onClick={this.handleSort('size')}
            >{txt('Size')}</Table.HeaderCell>
                <Table.HeaderCell 
                sorted={column === 'age' ? direction : null}
                onClick={this.handleSort('age')}
            >{txt('Age')}</Table.HeaderCell>            
              </Table.Row>
            </Table.Header>
            <Table.Body>
                {fileList}
            </Table.Body>
            </Table>
        );
//onScroll={this.onScroll.bind(this)} 
        return ( 
                <div className="layoutList" key="layoutList" style={{backgroundColor: props.appState.backgroundColor}}>
                <div className="layScrollable" key="layScrollable" ref={this.scrollableRef} >{filePane}</div>
                <div className="layMenu">{menu}</div>
                </div>
            );
    }
}
