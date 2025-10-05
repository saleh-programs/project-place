#!/bin/bash

site(){
    gnome-terminal -- bash -c "npm run dev; exec bash" &
    sitePID=$!
}
db(){
    gnome-terminal -- bash -c "cd backend && source venv/bin/activate && python3 -u server.py; exec bash" &
    dbPID=$!
}
ws(){
    gnome-terminal -- bash -c "cd backend/wsServer && node wsServer.js; exec bash" &
    wsPID=$!
}

site
db
ws
# while true; do
#     read input
#     case $input in 
#         restart)
#             kill $sitePID
#             site
#             kill $dbPID
#             db
#             kill $wsPID
#             ws
#             ;;
#         site)
#             kill $sitePID
#             site
#             ;;
#         db)
#             kill $dbPID
#             db
#             ;;
#         ws)
#             kill $wsPID
#             ws
#             ;;
#         q)
#             kill $sitePID
#             kill $dbPID
#             kill $wsPID
#             break
#             ;;
#     esac
# done
    

        


