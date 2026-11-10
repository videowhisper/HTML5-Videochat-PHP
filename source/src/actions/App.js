import { UPDATE_USER, SET_ROOM, UPDATE_ROOM, SET_CONFIG, ADD_MESSAGE, ADD_HISTORY, SET_ACTIONS, SET_HISTORY }  from '../constants/ActionTypes';

// create action objects

export function setUser(user) {
  return {
      type: UPDATE_USER,
      payload: {
        user,
    },      
  };
}

export function setRoom(room) {
  return {
      type: SET_ROOM,
      payload: {
        room,
    },      
  };
}

export function updateRoom(room) {
  return {
      type: UPDATE_ROOM,
      payload: {
        room,
    },      
  };
}

export function setConfig(config) {
 // console.log('actions/App setConfig', config);

  return {
      type: SET_CONFIG,
      payload: {
        config,
    },      
  };
}

export function addMessage(message) {
 // console.log('actions/App addMessage', message);

  return {
      type: ADD_MESSAGE,
      payload: {
        message,
      },
  };
}

export function addHistory(messages, timestamp) {
 // console.log('actions/App addHistory', messages, timestamp);

  return {
      type: ADD_HISTORY,
      payload: {
          messages,
          timestamp,
      },
  };
}

export function setHistory(messages, timestamp) {
//  console.log('actions/App setHistory', messages, timestamp);

  return {
      type: SET_HISTORY,
      payload: {
          messages,
          timestamp,
      },
  };
}

export function setActions(actions, timestamp) {
 // console.log('actions/App setActions', actions, timestamp);

  return {
      type: SET_ACTIONS,
      payload: {
           actions,
          timestamp,
      },
  };
}