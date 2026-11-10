import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
//import * as serviceWorker from './serviceWorker';

import { Provider } from "react-redux";
import { createAppStore } from "./store/index";

import App from './containers/App';
import {
    getVideoWhisperInstances,
    isInstanceMounted,
    markInstanceMounted,
    registerInstanceStore,
} from './embed';

const mountVideoWhisperInstances = () => {
    const instances = getVideoWhisperInstances();

    instances.forEach((instance) => {
        if (!instance.rootElement || isInstanceMounted(instance)) return;

        const store = createAppStore({
            app: {
                config: {
                    rootId: instance.rootId,
                    configName: instance.configName,
                    embedConfig: instance.embedConfig,
                    instanceId: instance.instanceId,
                },
            },
        });

        const element = (
            <Provider store={store}>
                <App />
            </Provider>
        );

        ReactDOM.render(element, instance.rootElement);
        markInstanceMounted(instance);
        registerInstanceStore(instance, store, instances.length);
    });
};

if (typeof window !== 'undefined') {
    window.VideoWhisperMountAll = mountVideoWhisperInstances;

    if (!window.__videoWhisperMountListener) {
        window.addEventListener('videowhisper:mount', mountVideoWhisperInstances);
        window.__videoWhisperMountListener = true;
    }
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVideoWhisperInstances, { once: true });
}

mountVideoWhisperInstances();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
//serviceWorker.unregister();
