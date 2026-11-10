import React, { Component } from 'react';
import { Icon, Image, Segment, Table, Dropdown, Flag } from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';
import _ from 'lodash';


export default class Users extends Panel {
  //camera

  static propTypes = {
    appState: PropTypes.object.isRequired,
    appStateUpdate: PropTypes.func.isRequired,
    appSfx: PropTypes.func.isRequired,

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
    this.data = [];
    this.usersLeft = [];
    this.usersJoined = [];
    this.userCount = 0;

    this.scrollableRef = React.createRef();

    if (props.room.users) this.data = _.sortBy(props.room.users, 'order');

    if (this.devMode) console.log('components/Users constructor room:', props.room);
  }



  componentDidMount() {
  }

  componentWillUnmount() {
    console.log('components/Users componentWillUnmount');
  }



  userClick = user => (event, data) => {
    console.log('components/User userClick', user, data, event);

    if (user && data.action)
      switch (data.action) {

        case 'profile':
          const response = { file: user.url };
          window.open(response.file);
          break;

        case 'presentation':
          this.props.serverUpdate({ task: 'user_presentation', userID: user.userID, userName: user.userName, placement: data.placement });
          break;

          case 'kick':
            this.props.serverUpdate({ task: 'user_kick', userID: user.userID, userName: user.userName });
            break;  
          case 'ban':
              this.props.serverUpdate({ task: 'user_ban', userID: user.userID, userName: user.userName });
          break;                        
      }

  }

  shouldComponentUpdate(nextProps, nextState) {
    // if (_.isEqual(nextProps.room.users, this.props.room.users) && _.isEqual(nextState,this.state)) return false;


    if (!_.isEqual(nextProps.room.users, this.props.room.users)) {
      this.data = _.sortBy(nextProps.room.users, 'order');
    }

    return true;

  }


  render() {

   //  if (this.devMode) console.log('components/Users render:', this.data);

    const { props, state, txt } = this;
    this.devMode = props.appState.devMode; //also update devMode on rendering updates


    //

    var userPane, menu;
    var userList = []
    var userCount = 0;

    if (this.props.room.usersMenu) menu = (
      <Segment className={props.appState.className}>
        Users Menu
    </Segment>
    ); else menu = '';
  

    if (this.data)
      for (var ix in this.data) {

        if (!this.data[ix].hasOwnProperty('userID')) 
        {
          console.log('components/Users missing userID', ix, this.data);
          continue;
        }

        var user = this.data[ix];
        if (user) 
        if (user.userName)
        if (!user.hide) //some hidden: in private, offline, voyeur
        {
          var userID = user.userID;

          userCount++;
          var options = [];
          options.push({ key: 'usermenuProfile_' + userID, onClick: this.userClick(user), icon: 'address card', text: txt('Profile'), action: 'profile' });

          if (this.props.room.usersPresentation)
            for (var placement in this.props.appState.media)
              options.push({ key: 'usermenuPresentation_' + placement + userID, onClick: this.userClick(user), icon: 'pointing left', text: txt('Show') +': ' + placement, action: 'presentation', placement: placement });
  
              let userDropdown = (<Dropdown compact key={'usermenu' + userID} text={user.userName} options={options} className={props.appState.className + " v-select"} />);

              if (this.props.room.usersModerator)
              {
              options.push({ key: 'usermenuKick_' + userID, onClick: this.userClick(user), icon: 'sign-out', text: txt('Kick'), action: 'kick' });
              options.push({ key: 'usermenuBan_' + userID, onClick: this.userClick(user), icon: 'ban', text: txt('Ban'), action: 'ban' });
              }
              /*
          var userItem = (
            <Header as='h5' image key={'userItem' + userID}>
              <Image src={user.avatar} rounded size='mini' />
              <Header.Content>
                {user.userName}
                <Header.Subheader>
                  {user.userID === props.room.performerID ? <Icon name='star' /> : ''}
                  {user.meta.connected ? <Icon name='video' /> : ''}
                  {userDropdown}
                </Header.Subheader>
              </Header.Content>
            </Header>
          )
*/

//external broadcast
let externalOn = false;
 if (user.meta) {
  if (user.meta.external)
  {
    externalOn = true;
    if (user.meta.connected) if (user.meta.connectedUpdate > user.meta.externalUpdate) //more recent web publish
    {
            externalOn = false; 
    }
  }
  }   

var userItem = (<span>
  <Image src={user.avatar} rounded size='mini' verticalAlign='middle' />
  {user.userName === props.room.performer ? <Icon name='star' /> : ''}
  {user.flag && props.config.multilanguage ? <Flag name={user.flag} /> : '' } 
  {user.meta.connected ? <Icon name='video' /> : ''}
  {externalOn ? <Icon name='rss' /> : ''} 
  {userDropdown}
  </span>
);
          userList.push(
            <Table.Row key={'userRow' +userID}>
              <Table.Cell>
                {userItem}
              </Table.Cell>
            </Table.Row>
          );
        }


      }
    else userList = (
      <Table.Row key="No_Users">
        <Table.Cell colSpan="1" warning>No users.</Table.Cell>
      </Table.Row>
    );

    userPane = (
      <Table celled selectable sortable key="User_Pane" className={props.appState.className}>
        <Table.Body>
          {userList}
        </Table.Body>
      </Table>
    );

    this.userCount = userCount;

    return (
      <div className="layoutList" key="layoutList" style={{ backgroundColor: props.appState.backgroundColor }}>
        <div className="layScrollable" key="layScrollable" ref={this.scrollableRef} >{userPane}</div>
        <div className="layMenu">{menu}</div>
      </div>
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot)
  {


    //if (this.userCount != this.props.appState.userCount) this.props.appStateUpdate({userCount: this.userCount});
  }

}