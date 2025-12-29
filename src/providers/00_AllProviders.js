"use client"
import UserProvider from "./01_UserProvider";
import AppearanceProvider from "./02_AppearanceProvider";
import RoomProvider from "./03_RoomProvider";
import PeersProvider from "./04_PeersProvider";
import ChatProvider from "./05_ChatProvider";
import VideoChatProvider from "./05_VideoChatProvider";
import WhiteboardProvider from "./05_WhiteboardProvider";
import WebSocketProvider from "./06_WebSocketProvider";

function AllProviders({children, initialUserInfo}){

    // This separates the app into layers that are easy to work with. Somewhat self-explanatory but
    // provided is a brief description of the layers:

    // UserProvider:           Anything related to User logged in.
    // AppearanceProvider:     Anything related to site appearance.
    // RoomProvider:           Anything related to the current room
    // PeersProvider:          Anything related to peers within the room.
    // Chat/VideoChat/Whiteboard Provider:           Anything related to Chat, Videochat or Whiteboard (logically equal in hierarchy)
    // WebSocketProvider:      Anything related to WebSocket connecion for room. Its message event handler uses many values from parent providers.

    return (
    <UserProvider initialUserInfo={initialUserInfo}>
        <AppearanceProvider>
            <RoomProvider>
                <PeersProvider>
                    <ChatProvider>
                        <VideoChatProvider>
                            <WhiteboardProvider>
                                <WebSocketProvider>
                                    {children}
                                </WebSocketProvider> 
                            </WhiteboardProvider>
                        </VideoChatProvider>
                    </ChatProvider>
                </PeersProvider>
            </RoomProvider>
        </AppearanceProvider>
    </UserProvider>
    )
}
export default AllProviders