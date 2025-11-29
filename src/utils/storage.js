/**
 * LocalStorage 工具函数
 */
export const storage = {
  getUserId() {
    return localStorage.getItem('turtle_uid');
  },
  
  setUserId(uid) {
    localStorage.setItem('turtle_uid', uid);
  },
  
  removeUserId() {
    localStorage.removeItem('turtle_uid');
  },
  
  getNickname() {
    return localStorage.getItem('turtle_nickname');
  },
  
  setNickname(nickname) {
    localStorage.setItem('turtle_nickname', nickname);
  },
  
  removeNickname() {
    localStorage.removeItem('turtle_nickname');
  },
  
  getSessionId() {
    return localStorage.getItem('turtle_session_id');
  },
  
  setSessionId(sessionId) {
    localStorage.setItem('turtle_session_id', sessionId);
  },
  
  removeSessionId() {
    localStorage.removeItem('turtle_session_id');
  },
  
  getRole() {
    return localStorage.getItem('turtle_role');
  },
  
  setRole(role) {
    localStorage.setItem('turtle_role', role);
  },
  
  removeRole() {
    localStorage.removeItem('turtle_role');
  },
  
  persistRole(isHost) {
    this.setRole(isHost ? 'host' : 'player');
  }
};
