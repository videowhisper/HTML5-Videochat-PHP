import { combineReducers } from 'redux';

import appReducer from './App';

const rootReducer = combineReducers({
    app: appReducer, //store as state.app.var
});

export default rootReducer;