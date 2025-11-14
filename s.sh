#!/bin/bash


site(){
    gnome-terminal --working-directory="/home/willow/JSProjects/ProjectPlace" -- bash -c 'echo $$ > /tmp/site.pid && npm run dev;exec bash;'
    wmctrl -r :ACTIVE: -e 0,0,0,-1,-1
}
db(){
    gnome-terminal --working-directory="/home/willow/JSProjects/ProjectPlace/backend" -- bash -c 'echo $$ > /tmp/db.pid && source venv/bin/activate && python3 -u server.py; exec bash;'
    wmctrl -r :ACTIVE: -e 0,680,0,-1,-1
}
ws(){
    gnome-terminal --working-directory="/home/willow/JSProjects/ProjectPlace/backend/wsServer" -- bash -c 'echo $$ > /tmp/ws.pid && node wsServer.js; exec bash;'
    wmctrl -r :ACTIVE: -e 0,300,460,-1,-1
}


site
db
ws

while true; do
read input
 case $input in 
     restart)
         kill -1 "$(cat /tmp/site.pid)"
         kill -1 "$(cat /tmp/db.pid)"
         kill -1 "$(cat /tmp/ws.pid)"
         site
         db
         ws
         ;;
     site)
         kill -1 "$(cat /tmp/site.pid)"
         site
         ;;
     db)
         kill -1 "$(cat /tmp/db.pid)"
         db
         ;;
     ws)
         kill -1 "$(cat /tmp/ws.pid)"
         ws
         ;;
     q)
         kill -1 "$(cat /tmp/site.pid)"
         kill -1 "$(cat /tmp/db.pid)"
         kill -1 "$(cat /tmp/ws.pid)"
         break
         ;;
 esac
done
    

        


