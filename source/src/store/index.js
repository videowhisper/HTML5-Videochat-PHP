import { createStore } from "redux";
import rootReducer from "../reducers/index";

const getInitialState = () => rootReducer(undefined, { type: '@@INIT' });

const mergePreloadedState = (preloadedState = {}) => {
	const initialState = getInitialState();

	return {
		...initialState,
		...preloadedState,
		app: {
			...initialState.app,
			...(preloadedState.app || {}),
			config: {
				...initialState.app.config,
				...((preloadedState.app || {}).config || {}),
			},
		},
	};
};

export const createAppStore = (preloadedState = {}) => createStore(rootReducer, mergePreloadedState(preloadedState));

export default createAppStore;