// Renew before every new socket connection: page-login PINs may have expired.
export async function requestSocketAuth(props, peerID, signal) {
  const data = new URLSearchParams();
  data.set('task', 'socket_auth');
  const session = {
    userID: props.user.ID,
    sessionID: props.user.sessionID,
    sessionKey: props.user.sessionKey,
    roomID: props.room.ID,
    nonce: props.config.nonce || '',
    privateUID: props.room.privateUID || 0,
    roomActionID: props.room.actionID || 0,
  };
  Object.entries(session).forEach(([key, value]) => data.set('VideoWhisper[' + key + ']', value == null ? '' : value));
  const response = await fetch(props.config.serverURL, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: data,
  });
  const result = await response.json();
  if (!response.ok || !result.vwsAuth || !result.vwsAuth.account || !result.vwsAuth.pin) {
    throw new Error('Session authentication failed. Reload the page and try again.');
  }
  return { account: result.vwsAuth.account, user: peerID, pin: result.vwsAuth.pin };
}


// A session/room change invalidates pending renewal and existing socket identity.
// Keep this in memory only; it contains the application bearer credential.
export function socketSessionKey(props) {
  const user = props.user || {}, room = props.room || {}, config = props.config || {};
  return JSON.stringify([user.ID, user.name, user.sessionID, user.sessionKey,
    room.ID, room.privateUID || 0, config.serverURL, config.vwsSocket,
    config.vwsAuth && config.vwsAuth.account]);
}

export function socketStreamName(stream) {
  return typeof stream === 'string' ? stream.split('?')[0] : '';
}

export function playbackStream(props) {
  return (props.content && props.content.stream) || props.room.streamPlayback || props.room.streamPlaybackName || '';
}
