
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, Label, Modal, Header, Grid, Popup, Image, Dropdown, Menu } from 'semantic-ui-react';
import { resolveRootElement } from '../embed';


export default class Actions extends Component {

  //actions bar
  //inter-actions

  static propTypes = {

    appState: PropTypes.object.isRequired,
    appStateUpdate: PropTypes.func.isRequired,
    appSfx: PropTypes.func.isRequired,  

    config: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    room: PropTypes.object.isRequired,

    actions: PropTypes.array.isRequired,

    serverUpdate: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {

      tipLast: 0, //tip flood (5000ms)
      fullpage: false,

      fullscreenRecommended: true, //already recommended or set true to disable
      fullscreen: false,

      tipsOpen: false,
      privateModalShow: false,
      privateLoading: false,

      requestModalShow: false,
      requestDetails: 'Details for request modal: No action meta info!',
      requestAction: { ID: 0 },

      displayTime: '00:00',
    }

    this.devMode = props.appState.devMode;
  }

  txt = (text) =>
  {
    //handle text translations from config
    const { props } = this;
    if (text in props.config.text) return props.config.text[text];

    return text;
  }

  getRootElement = () => resolveRootElement(this.props.config)

  privateModalClose = () => this.setState({ privateModalShow: false })
  fullscreenModalClose = () => this.setState({ fullscreenRecommended: true })

  updateTime(time) {
    this.setState({ displayTime: this.toHHMMSS(Math.floor(time / 1000)) });
  }

  onClick(e, { name, value }) {
    const { state, props } = this;

    if (this.devMode) console.log("components/Actions onClick", name, value, e, "props:", props);
    var action;

    switch (name) {

      case 'voteButton':
        if (this.devMode) console.log("components/Actions voteButton", props.room.voteOptions);
        props.serverUpdate({task:'vote', 'category': 0}); 
        break;

      case 'tipsButton':
      case 'menuButton':
        if (state.fullscreen) this.exitFullscreen();
        break;
        
      case 'fullpage':
        const fullpage = !state.fullpage;
        this.setState({ fullpage: fullpage });
        this.fullpage();
        break;

      case 'sfx':
        var newSfx = !props.appState.sfx;
        if (newSfx) props.appSfx('message', null, true);
        props.appStateUpdate({ sfx: newSfx });
        props.serverUpdate({task:'options', 'name': 'h5v_sfx', 'value': newSfx}); //update option
        break;

      case 'darkMode':
        var newDark = !props.appState.darkMode;
        props.appStateUpdate({ darkMode: newDark });
        props.serverUpdate({task:'options', 'name': 'h5v_dark', 'value': newDark}); //update option
        break;

       case 'pipMode':
          var newPip = !props.appState.pipMode;
          props.appStateUpdate({ pipMode: newPip });
          props.serverUpdate({task:'options', 'name': 'h5v_pip', 'value': newPip}); //update option
          break;

        case 'recMode':
            var newRec = !props.appState.recMode;
            props.appStateUpdate({ recMode: newRec });
            props.serverUpdate({task:'options', 'name': 'stream_record_all', 'value': newRec}); //update option
          break;

      case 'fullscreenRecommended':
        if (props.config.actionFullpage) {
          this.setState({ fullpage: true });
          this.fullpage();
        }
      case 'fullscreen':
        this.state.fullscreenRecommended = true;

        if (!state.fullscreen) {
          const documentRoot = this.getRootElement();
          if (documentRoot) this.requestFullscreen(documentRoot);
        }
        else this.exitFullscreen();

        break;

      case 'tip':
        if (typeof value === 'undefined') break; //unidentified

        const tipIndex = parseInt(value);

        if (props.room.tips) if (props.room.tipOptions.length > 0) if (props.room.tipOptions.length > tipIndex) {
          const tipOption = props.room.tipOptions[tipIndex];
          props.serverUpdate({ task: 'tip', tip: tipOption, tipsURL: props.room.tipsURL, targetID: props.room.performerID });
          this.setState({ tipsOpen: false, tipLast: Date.now() });

          console.log("components/Actions sending tip", tipOption, tipIndex);

        }
        break;

      case 'next':
        props.serverUpdate({ task: 'next', targetID: props.room.performerID });
        break;

        case 'party_return':
          props.serverUpdate({ task: 'party_return' });
        break;

        case 'party_leave':
          props.serverUpdate({ task: 'party_leave' });
        break;

      case 'reveal':
        props.appStateUpdate({revealed:true, publishRequired: true});          
      break;

      case 'private':
        this.setState({ privateModalShow: true });
        break;

      case 'privateClose':

        action = {
          action: 'privateRequest',
          ID: props.room.actionID,
          privateUID: props.room.privateUID,
          status: 7,
        }
        props.serverUpdate({ task: 'interaction-close', interaction: action });
        break;

      case 'privateRequest':
        this.setState({ privateLoading: true, privateModalShow: false });

        var meta = {
          userName: props.user.name,
        }

        action = {
          action: 'privateRequest',
          userID: props.user.ID,
          roomID: props.room.ID,
          targetID: props.room.performerID,
          meta: meta,
        }
        props.serverUpdate({ task: 'interaction', interaction: action });
        break;

      case 'declineRequest':
        this.setState({ requestModalShow: false });

        action = {
          ID: state.requestAction.ID,
          answer: 0,
          status: 2, //recipient answered
        }
        props.serverUpdate({ task: 'interaction-answer', interaction: action });

        break;

      case 'acceptRequest':
        this.setState({ requestModalShow: false });

        action = {
          ID: state.requestAction.ID,
          answer: 1,
          status: 2, //recipient answered
        }
        props.serverUpdate({ task: 'interaction-answer', interaction: action });

        break;


      default:
        console.log("components/Actions onClick UNHANDLED", name, value, e);
        break;
    }

  }

  fullpage() {
    const documentRoot = this.getRootElement();

    if (!documentRoot) return;

    if (this.state.fullpage) {
      documentRoot.style.position = "fixed";
      documentRoot.style.top = "0";
      documentRoot.style.left = "0";
      //documentRoot.style['z-index'] = "1001";
    }
    else {
      documentRoot.style.position = "absolute";
    }

    console.log("components/Actions fullpage", this.state.fullpage, documentRoot.style.position);

  }
  componentDidMount() {

    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange, false)
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange, false)
    document.addEventListener('msfullscreenchange', this.handleFullscreenChange, false)
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange, false) //IE11
    document.addEventListener('fullscreenchange', this.handleFullscreenChange, false)
  }

  componentWillUnmount() {
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('msfullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange)
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
  }

  handleFullscreenChange = (e) => {

    var inFullscreen = false;

    if (
      document.fullscreenElement || /* Standard syntax */
      document.webkitFullscreenElement || /* Chrome, Safari and Opera syntax */
      document.mozFullScreenElement ||/* Firefox syntax */
      document.msFullscreenElement /* IE/Edge syntax */
    ) inFullscreen = true;

    this.setState({ fullscreen: inFullscreen });

    /* 

      if (window.innerHeight == window.screen.height) inFullscreen = true;
      if( (window.screen.availHeight || window.screen.height-30) <= window.innerHeight) inFullscreen = true;

      this.setState({fullscreen: inFullscreen});
      console.log('components/Actions updateFullscreen', inFullscreen, document.fullscreenElement, e );

      this.fullpage();
      */
  }

  requestFullscreen(ele) {

    var supported = true;
    this.state.fullscreen = supported;

    if (ele.requestFullscreen) {
      ele.requestFullscreen();
    } else if (ele.webkitRequestFullscreen) {
      ele.webkitRequestFullscreen();
    } else if (ele.mozRequestFullScreen) {
      ele.mozRequestFullScreen();
    } else if (ele.msRequestFullscreen) {
      ele.msRequestFullscreen();
    } else {
      console.log('components/Video Fullscreen API is not supported.');
      supported = false;
      this.state.fullscreen = false;
    }

    this.setState({ fullscreen: supported });
  };


  exitFullscreen() {
    this.setState({ fullscreen: false });

    if (!(
      document.fullscreenElement || /* Standard syntax */
      document.webkitFullscreenElement || /* Chrome, Safari and Opera syntax */
      document.mozFullScreenElement ||/* Firefox syntax */
      document.msFullscreenElement /* IE/Edge syntax */
    )) return; //not in fullscreen

    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else {
      console.log('components/Actions Fullscreen API is not supported.');
    }

  };

  //fullscreen end

  componentDidUpdate(prevProps) {
    if (prevProps.actions !== this.props.actions) {
      this.processActions(); //any actions/requests to show?
    }
  }
  processActions() {
    //process actions list before rendering
    //td: only on props.actions change

    const { props, state } = this;
    // console.log("components/Actions processActions", props.actions);

    if (props.actions.length > 0)
      props.actions.forEach((action) => {

        //monitor both own requests (sender) and from others (recipient)
        if (action) {
          if (action.userID === props.user.ID) //I am the sender
          {
            if (action.action === 'privateRequest') {
              if (action.status === 3 && action.answer === 1) {
                //confirm
                var action = {
                  ID: state.requestAction.ID,
                  status: 5, //sender executed
                }
                props.serverUpdate({ task: 'interaction-confirm', interaction: action });
              }

              if (action.status >= 3 && action.status < 7 && action.answer === 1) //sender is in 2w
              {
              }


            }
          }
          else //I am the recipient
          {
            if (action.action === 'privateRequest') {

              if (action.status < 2) //open
              if (props.room.privateUID !== action.userID) //if not already in private with that sender
              {
                if (typeof props.appSfx === "function") props.appSfx('call');

                state.requestModalShow = true; //called from render, no need to call setState again
                if (action.meta) this.setState({ requestDetails: 'User "' + action.meta.userName + '" requested starting a private call.' });
                state.requestAction = action;
              }

              if (action.status === 2 && action.answer === 1) //answered
              {
                //start private
                //server update, execute action (switch to private room)
                var action = {
                  ID: state.requestAction.ID,
                  status: 3, //recipient executed
                }
                props.serverUpdate({ task: 'interaction-answer', interaction: action });
              }

              if (action.status >= 3 && action.status < 7 && action.answer === 1) //recipient is in 2w
              {
              }

            }
            //
          }
        }

      });
  }

  toHHMMSS = function (sec_num) {
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours > 0 && hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    return (hours ? hours + ':': '' ) + minutes + ':' + seconds;
  }

  modesClick = (e, data) =>
  {
    const { props } = this;

    if (this.devMode) console.log("components/Actions modesClick", data, props.room);

    this.setState({ modesOpen: false })

    props.serverUpdate( {task:'modesSet', 'mode': data.name} );
  }

  streamsClick = (e, data) =>
{
  const { props } = this;

  if (this.devMode) console.log("components/Actions streamsClick", data, props.room);

   this.setState({ streamsOpen: false })

   if (props.room.streamsAdmin) 
   {
    if (data.placement) props.serverUpdate({ task: 'streamPresentation',  'streamName': data.stream, 'streamAddress': data.address, 'placement': data.placement });
    else props.serverUpdate( {task:'streamsSet', 'streamName': data.stream, 'streamAddress': data.address} );
   }
   else props.appStateUpdate( {'streamName': data.stream, 'streamAddress': data.address} );
   
}
  componentWillReceiveProps(nextProps) {
    // pre-render
  }


  render() {
    const { props, state, txt } = this;

    // Determine button size based on mobile state and minMode
    const getButtonSize = () => {
      if (props.appState.minMode || props.appState.isMobile) {
        return "tiny";
      }
      return "small";
    };

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var Android = navigator.userAgent.toLowerCase().indexOf("android") > -1; //&& ua.indexOf("mobile");
    
    var buffer = [];

    //recommend fullscreen
    if (!iOS && !Android)
      if (!state.fullscreenRecommended)
        if (window.innerWidth < 500) {

          buffer.push(<Modal key='recommendFullscreen' closeIcon
            open
            onClose={this.fullscreenModalClose}
            size='small'
          >
            <Header icon='star' content='FullScreen Recommended' />
            <Modal.Content>
              <h3>When available space is small, fullscreen is recommended to access interface more easily.</h3>
            </Modal.Content>
            <Modal.Actions>

              <Button color='orange' onClick={this.fullscreenModalClose}>
                <Icon name='remove' /> Nevermind
      </Button>

              <Button color='green' name='fullscreenRecommended' onClick={this.onClick.bind(this)}>
                <Icon name='expand' /> Go Fullscreen
        </Button>
            </Modal.Actions>
          </Modal>
          );

        }

    //BUTTONS

    if (props.config.siteMenu) {
      var menuItems = [];
      var parentID = 0;
      var submenuItems = [];
      var parent = null;

      props.config.siteMenu.forEach((menu) => {

        if (!menu.parentID) //new parent menu
        {
          
          if (!submenuItems.length) //add previous as simple item (no submenus)
          {
          if (parent) menuItems.push( <Menu.Item key={parent.ID} href={parent.url} target="_blank"> {parent.title} </Menu.Item> );
          }
          else
          {
            //add previous with submenu
            menuItems.push( <Dropdown className={props.appState.className} item key={parent.ID} text={parent.title}>
              <Dropdown.Menu>
            {submenuItems}
            </Dropdown.Menu>
            </Dropdown>);
            submenuItems = []; //and clear
          }

          parent = menu; //set working parent menu

        }
        else //new submenu
        {
          submenuItems.push( <Dropdown.Item key={menu.ID} href={menu.url} target="_blank"> {menu.title} </Dropdown.Item> );
        }
      });

      buffer.push(
        <Popup className={props.appState.className} on={['hover', 'click']} key='siteMenu' trigger={<Button name="menuButton" onClick={this.onClick.bind(this)} compact className={props.appState.className} icon size={getButtonSize()}><Icon name='align justify' /></Button>} flowing hoverable>
          <Menu vertical className={props.appState.className}>
          <Menu.Item header>{txt('Site Menu')}</Menu.Item>
            {menuItems}
          </Menu>
        </Popup>
      );
    }
    //wallet balance

    var pendingCode ='';
    if (props.user.balance != props.user.balancePending) pendingCode = (<Label data-tooltip={txt('Pending Balance')}  className={props.appState.className} as='a' color={props.appState.darkMode ? 'black' : 'grey'} > <Icon name='notched circle loading icon' /> {props.user.balancePending}</Label>);


    if (props.config.balanceURL || props.user.balance)
    buffer.push(
      <Button compact className={props.appState.className} size={getButtonSize()} key='balance' name='balance' as='div' labelPosition='right'>
        <Button data-tooltip={txt('Wallet')} compact className={props.appState.className} size={getButtonSize()} color='green' target='_balance' href={props.config.balanceURL}>
          <Icon name='money' />
            </Button>
        <Label data-tooltip={txt('Balance')} className={props.appState.className} as='a' color={props.appState.darkMode ? 'black' : 'grey'} target='_balance' href={props.config.balanceURL}>
          {props.user.balance}
        </Label>
        {pendingCode}
      </Button>
    );

    // Tips
    if (props.room.tips) if (props.room.tipOptions.length > 0) {
      var tipNumber = 0;

      const tipOptions = (<>
        {props.room.tipOptions.map((tipOption, tipIndex) => {

          if (tipOption['tag'] === 'TIP')
            if (tipOption['attributes']['AMOUNT'] !== 'custom') {
              tipNumber++;
              return (<Grid.Column className={props.appState.className} key={'tip' + tipIndex} textAlign='center'>

                <Header as='h4' className={props.appState.className}>
            {tipOption['attributes']['IMAGE']?<Image src={props.room.tipsURL + tipOption['attributes']['IMAGE']} size="mini" rounded verticalAlign="middle" />:''} {tipOption['attributes']['AMOUNT']}
                </Header>

                <b>{tipOption['attributes']['LABEL']}</b>
                <div>{tipOption['attributes']['NOTE']}</div>
                <div >
                  <Button compact className={props.appState.className} size={getButtonSize()} color="olive" name={'tip'} value={tipIndex} onClick={this.onClick.bind(this)}>{txt('Gift')}</Button>
                 </div>
              </Grid.Column>);
            }
        })
        }
      </>);
      buffer.push(
        <Popup className={props.appState.className} on={['hover', 'click']} key='tipsPopup' trigger={<Button icon compact className={props.appState.className} size={getButtonSize()} key='tipsButton' name='tipsButton' onClick={this.onClick.bind(this)} color='olive' disabled={ (Date.now() - state.tipLast < 5000) }> <Icon name='gift' /> {(props.appState.minMode || props.appState.isMobile) ? '' : txt('Gifts')}</Button>} flowing hoverable open={this.state.tipsOpen} onOpen={() => this.setState({ tipsOpen: true })} onClose={() => this.setState({ tipsOpen: false })} >
          <Grid className={props.appState.className} stackable centered divided columns={tipNumber} style={{overflow: 'auto', maxHeight: 180, maxWidth: 480 }}>
            {tipOptions}
          </Grid>
        </Popup>
      );
    }

    // Private 2 Way
    
    //available if not disabled and user online
    var privateUnavailable = true;
    var requestTooltip = txt("Request Private Session");

    
    if (props.room.actionPrivateDisable)
    requestTooltip = txt("Performer Disabled Private Requests");
    else if (props.room.actionPrivateBusy)
    requestTooltip = txt("Performer is Busy in Private");
    else if (props.room.users) 
    { 
        var playbackUser; 
        playbackUser = props.room.users[props.room.performerID];
        if (playbackUser) privateUnavailable = false;
        else requestTooltip = txt("Performer is Not Online");
    }

    if (props.room.actionPrivate) //if enabled
      buffer.push(<span  key='private' data-tooltip={requestTooltip}><Button compact className={props.appState.className} size={getButtonSize()} name='private' color='orange' loading={state.privateLoading} disabled={state.privateLoading||privateUnavailable} onClick={this.onClick.bind(this)}> <Icon name="star" /> {txt('Private')}</Button></span>);
    
   

    if (props.room.actionPrivateClose) //in private
      buffer.push(<Button compact className={props.appState.className} size={getButtonSize()} key='privateClose' name='privateClose' color='red' onClick={this.onClick.bind(this)} ><Icon name="window close" /> {txt('Close Private')}</Button>);

    buffer.push(<Modal key='privateModal' closeIcon
      open={state.privateModalShow}
      onClose={this.privateModalClose}
      size='small'
    >
      <Header icon='star' content={txt("Request Private 2 Way Videochat Show")} />
      <Modal.Content>
        <h3>{props.room.performer}</h3>
      </Modal.Content>
      <Modal.Actions>

        <Button color='red' onClick={this.privateModalClose}>
          <Icon name='remove' /> {txt('Nevermind')}
        </Button>

        <Button color='green' name='privateRequest' onClick={this.onClick.bind(this)} loading={state.privateLoading} disabled={state.privateLoading}>
          <Icon name='star' /> {txt('Request Private')}
          </Button>
      </Modal.Actions>
    </Modal>
    );

    /*
    buffer.push ( 
      <Button key='requests' name='requests' onClick={this.onClick.bind(this)} as='div' labelPosition='right'>
      <Button color='red'>
        <Icon name='alarm' />
        Requests
      </Button>
      <Label as='a' basic color='red' pointing='left'>
        0
      </Label>
    </Button>
    );
    */

    buffer.push(<Modal key='requestModal'
      open={state.requestModalShow}
      closeOnEscape={false}
      closeOnDimmerClick={false}
      size='small'
    >
      <Header icon='star' content='Answer Private Show Request' />
      <Modal.Content>
        <h3>{state.requestDetails}</h3>
      </Modal.Content>
      <Modal.Actions>

        <Button color='red' name='declineRequest' onClick={this.onClick.bind(this)} >
          <Icon name='remove' /> {txt('Decline')}
     </Button>

        <Button color='green' name='acceptRequest' onClick={this.onClick.bind(this)}  >
          <Icon name='star' /> {txt('Accept')}
       </Button>
      </Modal.Actions>
    </Modal>
    );

    // Next
    if (props.room.next) {
      buffer.push(
        <Button compact className={props.appState.className} icon size={getButtonSize()} key='next' name='next' color='teal' data-tooltip={props.room.nextTooltip ? props.room.nextTooltip: txt('Next: Random Videochat Room')} onClick={this.onClick.bind(this)} disabled={props.appState.roomLoading}>
          {txt('Next')} <Icon name='arrow right' />
        </Button>
      );
    }

    if (props.room.partyHost) {
      buffer.push(
        <Button compact className={props.appState.className} icon size={getButtonSize()} key='party_return' name='party_return' color='teal' data-tooltip={txt('Return Party to Start Room')} onClick={this.onClick.bind(this)} disabled={props.appState.roomLoading}>
          {txt('Return')} <Icon name='arrow circle left' />
        </Button>
      );
    } else 
    if (props.room.party)
    {
      buffer.push(
      <Button compact className={props.appState.className} icon size={getButtonSize()} key='party_leave' name='party_leave' color='teal' data-tooltip={txt('Leave Party')} onClick={this.onClick.bind(this)} disabled={props.appState.roomLoading}>
      {txt('Leave')} <Icon name='close' />
    </Button>
          );
    }

    if (props.appState.revealMode && !props.appState.audioMode && !props.room.audioOnly && !props.appState.revealed && props.appState.screen == 'Way2Screen') {

      var countdown = props.appState.revealWarmup - props.appState.screenTime;

      var revealDisabled = true;
      if (countdown<=0) 
      {
        countdown = '';
        revealDisabled = false;
      } else countdown = (<><Icon name='clock' /> {countdown} </>);

      buffer.push(
        <span data-tooltip={txt('Reveal Webcam')}><Button compact className={props.appState.className} icon size={getButtonSize()} key='reveal' name='reveal' color='olive' onClick={this.onClick.bind(this)} disabled={revealDisabled}>
          <Icon name='video' /> {txt('Reveal')} {countdown}
        </Button></span>
      );
    }

    if (props.room.voteOptions)
    {

    const voteOption = props.room.voteOptions[0];
    
    buffer.push(
      <Button compact className={props.appState.className} icon size={getButtonSize()} key='voteButton' name='voteButton' color='teal' data-tooltip={ txt('Vote') + ' (' + voteOption.cost + ')' } onClick={this.onClick.bind(this)} disabled={voteOption.voted}>
      <Icon name='thumbs up' /> {voteOption.votes}
    </Button> );

    }


    //performer can switch room mode quickly
    if (props.room.modes)
    {
      var  modesCode = [];
      for (var modeKey in props.room.modes)
      {
        const stream = props.room.modes[modeKey];

        modesCode.push( 
          <Menu.Item
          key = {stream.key}
          name= {stream.name}
          active = { (props.room.mode == stream.name ) }
          onClick={this.modesClick}
        >
          <Icon name= {stream.icon} />
          {stream.name}
        </Menu.Item>
        )
    } 

    buffer.push(
      <Popup className={props.appState.className} on={['hover', 'click']} key='modesPopup' trigger={<Button icon compact className={props.appState.className} size={getButtonSize()} key='modesButton' name='modesButton' onClick={this.onClick.bind(this)} color='blue' data-tooltip={props.room.mode} data-position='right center'> <Icon name='users' /> {props.appState.minMode ? '' : txt('Mode')}</Button>} flowing hoverable open={this.state.modesOpen} onOpen={() => this.setState({ modesOpen: true })} onClose={() => this.setState({ modesOpen: false })} >

      <Menu className={props.appState.className} vertical>
      {modesCode}
      </Menu>
     </Popup>
      );
  }

    //only admin can configure in min mode
    if (props.room.streams && (!props.appState.minMode || props.room.streamsAdmin) )
    {
      var  streamsCode = [];

      var cameraAvailable = false;
      var cameraName =  this.txt('Webcam');

      //detect playback camera user
      if (props.room.users) //user list available: configure
        { 
            var playbackUser; //detect user being displayed
            if (props.content) //video content prop: use this
            { 
                playbackUser = props.room.users[props.content.userID];
            }
            else  //no content: using default room streamPlayback
            { 
                playbackUser = props.room.users[props.room.streamUID];
            }

            if (playbackUser)  {
                //check if available on connect
                if (playbackUser.meta) if (playbackUser.meta.connected) if (playbackUser.sdate < playbackUser.meta.connectedUpdate)
                {
                  cameraAvailable = true; 
                }

                cameraName = playbackUser.userName;
            }
        }

       streamsCode.push( 
          <Menu.Item
          key = 'streamsCamera'
          name= ''
          address = ''
          stream = {cameraName}
          active = { false || ( props.room.streamsAdmin && !props.room.streamAddress) || ( !props.room.streamsAdmin && props.appState.streamName && !props.appState.streamAddress )  }
          onClick={this.streamsClick}
        >
          <Icon name='user' />
          { cameraAvailable ? <Icon size='tiny' color='green' name='circle' /> : <Icon size='tiny' name='stop' /> }
          { cameraName }
        </Menu.Item>
        )

      if ( !props.room.streamsAdmin )  streamsCode.push( 
        <Menu.Item
        key = 'streamsDefault'
        name= ''
        address = ''
        stream = ''
        active = {  !props.appState.streamName && !props.room.streamAddress  }
        onClick={this.streamsClick}
      >
        <Icon name='users' />
        { this.txt('Room Default')  }
      </Menu.Item>
      )


      for (var streamKey in props.room.streams)
      {
        const stream = props.room.streams[streamKey];

        streamsCode.push( 
          <Menu.Item
          key = {stream.key}
          name= {stream.name}
          address = {stream.address}
          stream = {stream.stream}
          active = { (props.room.streamsAdmin && props.room.streamName == stream.stream ) || (!props.room.streamsAdmin && props.appState.streamAddress ==  stream.address ) || (!props.room.streamsAdmin && !props.appState.streamName && props.room.streamAddress == stream.address )}
          onClick={this.streamsClick}
        >
          <Icon name='camera video' />
          {stream.name}
        </Menu.Item>
        )

          //presentation
              if (props.room.streamsAdmin && props.room.usersPresentation)
              for (var placement in props.appState.media)
              streamsCode.push( 
              <Menu.Item
              key = {placement + stream.key}
              name= {placement+ stream.name}
              address = {stream.address}
              stream = {stream.stream}
              placement = {placement}
              onClick={this.streamsClick}
            >
              <Icon name='pointing up' />
              {placement}: {stream.name}
            </Menu.Item>
              );       
      }

       buffer.push(
      <Popup className={props.appState.className} on={['hover', 'click']} key='streamsPopup' trigger={<Button compact className={props.appState.className} size={getButtonSize()} key='streamsButton' name='streamsButton' onClick={this.onClick.bind(this)} color='pink'> <Icon name='video camera' /> {txt('Views')}</Button>} flowing hoverable open={this.state.streamsOpen} onOpen={() => this.setState({ streamsOpen: true })} onClose={() => this.setState({ streamsOpen: false })} >

      <Menu className={props.appState.className} vertical >
      {streamsCode}
      </Menu>
     </Popup>
      );
      }

    //fullscreen not supported in ios (except for homepage urls)
    if (!props.appState.minMode)  if (!iOS) if (props.config.actionFullscreen) buffer.push(
      <Button compact className={props.appState.className} icon size={getButtonSize()} floated="right" key='fullscreen' name='fullscreen' color='grey' data-tooltip={state.fullscreen ? txt('Exit Fullscreen') : txt('Enter Fullscreen')} onClick={this.onClick.bind(this)}>
        <Icon name={state.fullscreen ? 'compress' : 'expand'} />
      </Button>
    );

    if (!props.appState.minMode)  if (props.config.actionFullpage)
      buffer.push(
        <Button compact className={props.appState.className} icon size={getButtonSize()} floated="right" key='fullpage' name='fullpage' color='grey' data-tooltip={state.fullpage ? 'Zoom Out of Full Page' : 'Zoom Into Full Page'} onClick={this.onClick.bind(this)}>
          <Icon name={state.fullpage ? 'zoom-out' : 'zoom-in'} />
        </Button>
      );

        //record
        if (!props.appState.minMode) if (props.config.recordAction) buffer.push(
          <Button compact className={props.appState.className} icon size={getButtonSize()} floated="right" key='recMode' name='recMode' color={props.appState.recMode ? 'red' : 'black'} data-tooltip={props.appState.recMode ? txt('Stop Recording') : txt('Enable Recording')} onClick={this.onClick.bind(this)}>
          <Icon name={props.appState.recMode ? 'stop' : 'record'} />
                        </Button>
            );

      //sfx
      if (!props.appState.minMode)  buffer.push(
        <Button compact className={props.appState.className} icon size={getButtonSize()} floated="right" key='sfx' name='sfx' color={props.appState.sfxError?'red':(props.appState.sfx ? 'green' : 'yellow')} data-tooltip={props.appState.sfxError? txt('Tap to Play'): (props.appState.sfx ? txt('Sfx On') : txt('Sfx Off'))} onClick={this.onClick.bind(this)}>
          <Icon name={props.appState.sfxError?'deaf':(props.appState.sfx ? 'bell' : 'bell slash')} />
        </Button>
      );

      //pipmode for users with camera
      if (!props.appState.minMode) if (props.room.panelCamera ) buffer.push(
            <Button compact className={props.appState.className} icon size={getButtonSize()} floated="right" key='pipMode' name='pipMode' color={props.appState.pipMode ? 'grey' : 'black'} data-tooltip={props.appState.pipMode ? txt('Disable Picture in Picture') : txt('Enable Picture in Picture')} onClick={this.onClick.bind(this)}>
              <Icon name={props.appState.pipMode ? 'window restore' : 'window maximize'} />
            </Button>
          );

      //darkmode
    if (!props.appState.minMode) buffer.push(
      <Button compact className={props.appState.className} icon size={getButtonSize()} floated="right" key='darkMode' name='darkMode' color={props.appState.darkMode ? 'yellow' : 'black'} data-tooltip={props.appState.darkMode ? txt('Lights On') : txt('Dark Mode')} onClick={this.onClick.bind(this)}>
        <Icon name={props.appState.darkMode ? 'sun' : 'moon'} />
      </Button>
    );

    //0/1/2 = demo/full/suspended
 //   if (props.appState.modeVersion != props.appState.version)  //activate modeVersion
    if (!props.appState.checked || (props.appState.checked && props.appState.mode.text)) {
      buffer.push(
        <Button compact icon className={props.appState.className} size={getButtonSize()} floated="right" key='videowhisper' name='videowhisper' color={['red', 'blue', 'orange', 'olive', 'green', 'pink', 'violet'][Math.floor(Math.random() * 7)]} target='_videowhisper' href={props.appState.tooltipURL} data-tooltip={props.appState.tooltip}>
          <Icon name={['eye', 'audio description', 'bullhorn', 'tag', 'question circle', 'at'][Math.floor(Math.random() * 6)]} />
        </Button>
      );
    }

    buffer.push(
      <Label size={getButtonSize()} key="labelDuration" data-tooltip={txt('Session Duration') + (props.room.mode? ': ' + props.room.mode: '')} className={props.appState.className} color={props.appState.darkMode ? 'black' : 'grey'}>
       <Icon name='time' />
        {state.displayTime}
      </Label>
  );

    if (props.user.cost>0) buffer.push(<Label key="labelCost" size={getButtonSize()} data-tooltip={ ( props.user.other ? props.user.other + ': '  : '' ) + txt('Session Cost') } className={props.appState.className} color={props.appState.darkMode ? 'black' : 'grey'} > <Icon name='money' /> {props.user.cost}</Label>);

    if (props.user.earn>0) buffer.push(<Label key="labelEarn" size={getButtonSize()} data-tooltip={ ( props.user.other ? props.user.other + ': ' : '' ) + txt('Session Earning') } className={props.appState.className} color={props.appState.darkMode ? 'black' : 'grey'} > <Icon name='money' /> {props.user.earn}</Label>);

    //custom buttons

    if (props.room.actionButtons)
    for (var buttonKey in props.room.actionButtons)
    {
      var button = props.room.actionButtons[buttonKey];
 //   console.log("components/Actions render ", buttonKey, button);
      buffer.push(
        <Button compact className={props.appState.className} icon size={getButtonSize()} floated={button.floated} key={button.name} name={button.name} color={button.color} target={'_' + button.target} href={button.url} data-tooltip={button.tooltip}>
        <Icon name={button.icon} /> {button.text}
      </Button>
      );
    }

    return (
      //style={{ backgroundColor: props.appState.backgroundColor }}
      <div className="panel" ref={container => (this.state.container = container)}>

        <div className="controlsBottom vwsActions">
          {buffer}
        </div>

      </div>
    );

  }
}
