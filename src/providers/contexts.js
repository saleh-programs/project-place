import { createContext } from 'react';

const AppearanceContext = createContext(null);
const UserContext = createContext(null)
const RoomContext = createContext(null)
const PeersContext = createContext(null)
const ChatContext = createContext(null)
const VideoChatContext = createContext(null)
const WhiteboardContext = createContext(null)

export {AppearanceContext, UserContext, RoomContext, PeersContext, ChatContext, VideoChatContext, WhiteboardContext}; 
