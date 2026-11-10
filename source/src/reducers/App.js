import { UPDATE_USER, SET_ROOM, UPDATE_ROOM, SET_CONFIG, ADD_HISTORY, ADD_MESSAGE, SET_ACTIONS, SET_HISTORY } from "../constants/ActionTypes";
//import { fromJS } from 'immutable'; //fuk immutable, for now

const INITIAL_STATE = {
  
  //updated
  user: {
  ID: 0,
  sessionID: 0,
  sessionKey: '',
  name: 'User.0',
  loggedIn: false,
  warning: 'Please wait for login..',
  balance: 0,
  },


  //set on change
  room: {
  
  ID: 0,
  name: 'Room.0', 
 
  screen: 'LoginScreen',

  streamBroadcast: 'Room',
  streamPlayback: 'Room',

  privateUID: 0,

  actionPrivate: false,
  actionPrivateClose: false,
  actionID: 0,

  performer: '',
  performerID: 0,

  welcome: 'Welcome to default room!',
  },

  //set once on start
  config: {
    wss: '',
    application: '',
    videoCodec:  'h264',
    videoBitrate:  '400', 
    videoFramerae:  '29.97',
    audioCodec: 'opus',
    audioBitrate: '64',
    autoBroadcast: false,
    exitURL: 'https://videowhisper.com',
    errorURL: 'https://videowhisper.com/tickets_submit.php',
    actionFullpage: false,
    actionFullscreen: true,
    rootId: 'videowhisperVideochat',
    configName: 'VideoWhisper',
    embedConfig: null,
    instanceId: 'legacy',
    loaded: false,
  },
  
  messages: [],
  actions: [],
  
  lastMessageTimestamp: 0, //update only new messages
};

function appReducer(state = INITIAL_STATE, action = {}) {

  //console.log('reducers/App appReducer original state:', action, state);

  var newState;

  switch (action.type) {

    case UPDATE_USER:
    newState = Object.assign({}, state, {
      user: Object.assign({}, state.user, action.payload.user), //user is updated (ie balance)
    })
    break;

    case SET_ROOM:
    newState = Object.assign({}, state, {
      room: Object.assign({}, action.payload.room),  //room is set (change)
    })
    break;

    case UPDATE_ROOM:
      newState = Object.assign({}, state, {
        room: Object.assign({}, state.room, action.payload.room), //room can be updated (status)
      })
      break;

    case SET_CONFIG:
    newState = Object.assign({}, state, {
      config: Object.assign({}, state.config, action.payload.config), //cfg is set while preserving embed metadata
    })
    break;

    case ADD_MESSAGE:
    newState = Object.assign({}, state, {
    messages : [...state.messages, action.payload.message], //create new array and push the new element into it https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
    })
    break;
   
    case ADD_HISTORY:
    newState = Object.assign({}, state, {
      lastMessageTimestamp: action.payload.timestamp,
      messages: state.messages.concat(action.payload.messages), //concat returns a new array https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat
    })
    break;

    case SET_ACTIONS:
    newState = Object.assign({}, state, {
      lastMessageTimestamp: action.payload.timestamp, 
      actions: [...action.payload.actions],  //set
    })  
    break;

    case SET_HISTORY:
    newState = Object.assign({}, state, {
      lastMessageTimestamp: action.payload.timestamp,
      messages: [...action.payload.messages], //set (ie new room)
    })
    break;


    default:
    newState = Object.assign({}, state);
    }
   
  //  console.log('reducers/App new state and last action:', newState, action);

    return newState;

}
 export default appReducer;