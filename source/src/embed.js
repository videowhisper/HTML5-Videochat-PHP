export const LEGACY_ROOT_ID = 'videowhisperVideochat';
export const LEGACY_CONFIG_NAME = 'VideoWhisper';

const INSTANCES_KEY = 'VideoWhisperInstances';
const STORES_KEY = 'VideoWhisperStores';
const MOUNTED_KEY = 'VideoWhisperMountedRoots';

const getWindowScope = () => (typeof window !== 'undefined' ? window : null);

const getDocumentScope = () => {
    const windowScope = getWindowScope();

    return windowScope ? windowScope.document : null;
};

const rootLookup = (rootId) => {
    const documentScope = getDocumentScope();

    if (!documentScope || !rootId) return null;

    return documentScope.getElementById(rootId);
};

const normalizeInstance = (instance = {}, index = 0) => {
    const windowScope = getWindowScope();
    const rootId = instance.rootId || instance.containerId || instance.appContainerId || '';
    const configName = instance.configName || instance.namespace || instance.globalName || '';
    const embedConfig = instance.config || (configName && windowScope ? windowScope[configName] : null);
    const rootElement = instance.rootElement || rootLookup(rootId);

    if (!rootElement) return null;

    if (embedConfig && configName && windowScope && !windowScope[configName]) {
        windowScope[configName] = embedConfig;
    }

    return {
        instanceId: instance.instanceId || rootId || `videowhisper-${index}`,
        rootId,
        rootElement,
        configName: configName || LEGACY_CONFIG_NAME,
        embedConfig,
    };
};

const getLegacyInstance = () => {
    const windowScope = getWindowScope();
    const rootElement = rootLookup(LEGACY_ROOT_ID);

    if (!rootElement) return null;

    return {
        instanceId: LEGACY_ROOT_ID,
        rootId: LEGACY_ROOT_ID,
        rootElement,
        configName: LEGACY_CONFIG_NAME,
        embedConfig: windowScope ? windowScope[LEGACY_CONFIG_NAME] : null,
    };
};

export const getVideoWhisperInstances = () => {
    const windowScope = getWindowScope();
    const rawInstances = windowScope && Array.isArray(windowScope[INSTANCES_KEY]) ? windowScope[INSTANCES_KEY] : [];
    const instances = [];
    const seenRoots = {};

    rawInstances.forEach((instance, index) => {
        const normalized = normalizeInstance(instance, index);

        if (!normalized || seenRoots[normalized.rootId]) return;

        seenRoots[normalized.rootId] = true;
        instances.push(normalized);
    });

    const legacyInstance = getLegacyInstance();

    if (legacyInstance && !seenRoots[legacyInstance.rootId]) {
        instances.unshift(legacyInstance);
    }

    return instances;
};

export const resolveInstanceConfig = (config = {}) => {
    const windowScope = getWindowScope();

    if (config.embedConfig) return config.embedConfig;

    if (config.configName && windowScope && windowScope[config.configName]) {
        return windowScope[config.configName];
    }

    return windowScope ? windowScope[LEGACY_CONFIG_NAME] : null;
};

export const resolveRootId = (config = {}) => config.rootId || LEGACY_ROOT_ID;

export const resolveRootElement = (config = {}) => rootLookup(resolveRootId(config));

export const isInstanceMounted = (instance) => {
    const windowScope = getWindowScope();

    if (!windowScope || !instance || !instance.rootId) return false;

    const mountedRoots = windowScope[MOUNTED_KEY] || {};

    if (mountedRoots[instance.rootId]) return true;
    if (!instance.rootElement) return false;

    return instance.rootElement.getAttribute('data-videowhisper-mounted') === '1';
};

export const markInstanceMounted = (instance) => {
    const windowScope = getWindowScope();

    if (!windowScope || !instance || !instance.rootId) return;

    windowScope[MOUNTED_KEY] = windowScope[MOUNTED_KEY] || {};
    windowScope[MOUNTED_KEY][instance.rootId] = true;

    if (instance.rootElement) {
        instance.rootElement.setAttribute('data-videowhisper-mounted', '1');
    }
};

export const registerInstanceStore = (instance, store, instanceCount) => {
    const windowScope = getWindowScope();

    if (!windowScope || !instance || !store) return;

    windowScope[STORES_KEY] = windowScope[STORES_KEY] || {};
    windowScope[STORES_KEY][instance.instanceId] = store;

    if (instanceCount === 1) {
        windowScope.store = store;
    }
};