import mysql.connector
import json, os
from os import environ as env
from urllib.parse import quote_plus, urlencode
from random import randint, choice
from PIL import Image
import io
from functools import wraps

from authlib.integrations.flask_client import OAuth
from authlib.jose import jwt, JsonWebKey
import requests
from flask import Flask, Response, request, jsonify, redirect, render_template, session, url_for
from flask_cors import CORS
import uuid
from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

# create flask app and register with the Auth0 service
app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

JWKS = requests.get(f"https://{env.get('AUTH0_DOMAIN')}/.well-known/jwks.json").json()

oauth = OAuth(app)
oauth.register(
  "auth0",
  client_id = env.get("AUTH0_CLIENT_ID"),
  client_secret = env.get("AUTH0_CLIENT_SECRET"),
  client_kwargs = {
    "scope": "openid profile email",
  },
  server_metadata_url = f'https://{env.get("AUTH0_DOMAIN")}/.well-known/openid-configuration'
)

#context manager for opening/closing connection and cursor easily
class AccessDatabase:
  def __init__(self):
    self.conn = None
    self.cursor = None
  def __enter__(self):
    self.conn = mysql.connector.connect(
      host= "localhost", #localhost cuz we started it on our computer
      user="root",  #the user can be root (the admin) or a user we added
      passwd= f"{os.getenv('DB_PASSWORD')}", #whatever pass
      database= "projectplace" #the database u work with
    )
    self.cursor = self.conn.cursor()
    return self.cursor
  def __exit__(self, exc_type, exc_value, exc_tb):
    self.conn.commit()
    self.cursor.close()
    self.conn.close()
  
# Creates a decorator with the given error message. 
# Now can easily wrap endpoints in a try/catch and send message on failure
def handleError(errorMessage):
  def decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
      try:
        decodedToken = jwt.decode(session["user"]["access_token"], JsonWebKey.import_key_set(JWKS))
        decodedToken.validate()
        return func(*args, **kwargs)
      except Exception as e:
        print(e)
        return jsonify({"success": False, "message": errorMessage}), 500
    return wrapper
  return decorator


with AccessDatabase() as cursor:
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS users (
      userID VARCHAR(100) PRIMARY KEY,
      username VARCHAR(70),
      currentAvatar VARCHAR(50),
      imageIDs JSON
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roomID VARCHAR(10),
      content TEXT,
      username VARCHAR(70),
      timestamp BIGINT,
      messageID VARCHAR(50)
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roomID VARCHAR(10),
      roomName VARCHAR(70),
      users JSON
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS canvases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      canvas BLOB,
      instructions JSON,
      roomID VARCHAR(10)
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image MEDIUMBLOB,
      mimeType VARCHAR(100),      
      imageID TEXT,
      accessType VARCHAR(100),
      owner VARCHAR(70)
    )
    '''
  )
   


# 
'''
DONT FORGET !!!!!!!!!! ------------------------------------------------------------------------------: 
changed data to content. 
changed urls. 
changed room ids. 
will load pfps from memory instead.
actual data is another layer in.
Not tracking email anymore (until later)
!!!!!!!!!!!!!!!!!!
 '''


#----------- Room Resources (include messages, canvases)
@app.route("/rooms", methods=["POST"])
@handleError("failed to create room")
def createRoom():
  data = request.get_json()
  roomName = data["roomName"]
  username = data["username"]
  with AccessDatabase() as cursor:
    exists = True
    while (exists):
      roomID = generateRoomCode()
      cursor.execute("SELECT 1 from rooms WHERE roomID=%s",(roomID,))
      exists = cursor.fetchone() is not None

    cursor.execute("INSERT INTO rooms (roomID, roomName, users) VALUES (%s, %s, %s)",(roomID, roomName, json.dumps([username])))

    canvasImg = Image.new(mode = "RGBA", size=(1000,1000), color=(0,0,0,0))
    buffer = io.BytesIO()
    canvasImg.save(buffer, format="PNG")
    canvasBytes = buffer.getvalue()
    cursor.execute("INSERT INTO canvases (canvas, instructions, roomID) VALUES (%s,%s,%s)", (canvasBytes, "[]", roomID))
  return jsonify({"success": True, "data": {"roomID": roomID}}), 200


@app.route("/rooms/<roomID>/exists", methods=["GET"])
@handleError("failed to validate room")
def checkRoomExists(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT * FROM rooms where roomID=%s",(roomID,))
    exists = cursor.fetchone() is not None
  return jsonify({"success":True,"data": {"exists": exists}}), 200


@app.route("/rooms/<roomID>/messages", methods=["POST"])
@handleError("failed to create message")
def createMessage(roomID):
  data = request.get_json()
  username = data["username"]
  content = data["content"]
  timestamp = data["metadata"]["timestamp"]
  messageID = data["metadata"]["messageID"]
  with AccessDatabase() as cursor:
    cursor.execute("INSERT INTO messages (roomID, username, content, timestamp, messageID) VALUES (%s, %s, %s, %s, %s)", (roomID, username, content, timestamp, messageID))
    
  return jsonify({"success":True}),200

@app.route("/rooms/<roomID>/messages", methods=["GET"])
@handleError("Failed to get room messages")
def getMessages(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT username, content, timestamp, messageID FROM messages WHERE roomID = %s", (roomID,))
    messages = cursor.fetchall()
    jsonMessages = [
      {
        "username": lst[0],
        "content": lst[1],
        "metadata": {
          "timestamp": lst[2],
          "messageID": lst[3] 
        }
      } for lst in messages
    ]
  return jsonify({"success": True, "data": {"messages": jsonMessages} }), 200


@app.route("/rooms/<roomID>/users", methods=["PUT"])
@handleError("failed to add room user")
def addRoomUser(roomID):
  data = request.get_json()
  username = data["username"]

  with AccessDatabase() as cursor:
    cursor.execute('''
    UPDATE rooms SET users = JSON_ARRAY_APPEND(users, '$', %s)
    WHERE roomID = %s AND JSON_CONTAINS(users, %s, '$') = 0''',(username, roomID, f'"{username}"'))

  return jsonify({"success": True}), 200

@app.route("/rooms/<roomID>/users", methods=["GET"])
@handleError("Failed to get room users")
def getRoomUsers(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT users FROM rooms WHERE roomID = %s", (roomID,))
    users = json.loads(cursor.fetchone()[0])
  return jsonify({"success":True,"data": {"users": users}}), 200

@app.route("/rooms/<roomID>/canvas/snapshot", methods=["PUT"])
@handleError("failed to update canvas snapshot")
def updateCanvasSnapshot(roomID):
  canvasBytes = request.get_data()
  with AccessDatabase() as cursor:
    cursor.execute("UPDATE canvases SET canvas = %s WHERE roomID = %s", (canvasBytes, roomID))
  return {"success": True}, 200

@app.route("/rooms/<roomID>/canvas/snapshot", methods=["GET"])
@handleError("failed to get canvas snapshot")
def getCanvasSnapshot(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT canvas FROM canvases WHERE roomID = %s",(roomID,))
    canvasBytes = cursor.fetchone()[0]
  return Response(canvasBytes, mimetype='application/octet-stream', status=200)

@app.route("/rooms/<roomID>/canvas/instructions", methods=["PUT"])
@handleError("failed to update canvas instructions")
def updateCanvasInstructions(roomID):
  data = request.get_json()
  instructions = data["instructions"]
  with AccessDatabase() as cursor:
    cursor.execute("UPDATE canvases SET instructions = %s WHERE roomID = %s", (json.dumps(instructions), roomID))
  return {"success": True}, 200

@app.route("/rooms/<roomID>/canvas/instructions", methods=["GET"])
@handleError("failed to get canvas instructions")
def getCanvasInstructions(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT instructions FROM canvases WHERE roomID = %s",(roomID,))
    instructions = loads(cursor.fetchone()[0])
  return {"success": True, "data": {"instructions": instructions}}, 200


# ----------User Resources (include images)
@app.route("/users", methods=["GET"])
@handleError("getting user info failed")
def getUserInfo():
  with AccessDatabase() as cursor:
    cursor.execute("SELECT (username, currentAvatar, imageIDs) FROM users WHERE userID = %s", (session["userID"],))

    columns = cursor.column_names
    values = cursor.fetchone()
    userInfo = {columns[i]: values[i] for i in range(len(keys))}

  return jsonify({"success": True, "data": {"userInfo": userInfo}}), 200

@app.route("/users", methods=["PUT"])
@handleError("Failed to modify user info")
def updateUser(username):
  data = request.get_json()
  modifiedFields = ", ".join(f"{col} = %s" for col in data.keys())
  newValues = tuple(list(data.values()) + [session["userID"]])

  with AccessDatabase() as cursor:
    cursor.execute(f"UPDATE users SET {modifiedFields} WHERE userID = %s", newValues)

  return jsonify({"success":True}), 200

@app.route("/users/<username>/images", methods=["POST"])
@handleError("failed to upload image")
def uploadImage(username):
  rawImageData = request.get_data()
  imageType = request.content_type
  imageID = str(uuid.uuid4())
  with AccessDatabase() as cursor:
    cursor.execute("INSERT INTO images (image, mimeType, imageID, owner) VALUES (%s, %s, %s,%s)", (rawImageData, imageType, newImageID, username))
  return {"success": True, "data": {"imageID": imageID}}, 200

@app.route("/users/<username>/images/<imageID>", methods=["GET"])
@handleError("failed to get image")
def getImage(username, imageID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT image, mimeType FROM images where imageID = %s",(imageID,))
    imageInfo = cursor.fetchone()
  return Response(imageInfo[0], mimetype=imageInfo[1], status=200)


# Backend only functions
def createUser():
  with AccessDatabase() as cursor:
    userID = session["userID"]
    cursor.execute("SELECT 1 FROM users WHERE userID = %s", userID)
    exists = cursor.fetchone() is not None

    if (not exists):
      cursor.execute("INSERT INTO users (userID, username, currentAvatar, imageIDs) VALUES (%s, %s, %s, %s)", (userID, None, "willow", "[]"))


#-----------------AUTH0 STUFF------------------

# Redirects user to auth0 login page
@app.route("/login")
def login():
  # HARDCODE THE URL FOR REDIRECT_URI IF YOU WANT TO TEST MOBILE MURAD
  return oauth.auth0.authorize_redirect(
    redirect_uri = url_for("callback",_external=True)
  )
 
# Redirects user to home page (or page after authentication)
@app.route("/callback", methods=["GET", "POST"])
def callback():
  token = oauth.auth0.authorize_access_token()
  
  session["user"] = token
  session["userID"] = jwt.decode(session["user"]["id_token"], options={"verify_signature": False})["sub"]

  createUser()

  return redirect("http://localhost:3000/platform")

# Ends the user's session, and redirects them to home page.
@app.route("/logout")
def logout():
  session.clear()
  return redirect(
    "https://"
    + env.get("AUTH0_DOMAIN")
    + "/v2/logout?"
    + urlencode(
        {
          "returnTo": "http://localhost:3000", 
          "client_id": env.get("AUTH0_CLIENT_ID"),
        },
        quote_via=quote_plus,
    )
  )

# returns random 6 digit string. [A-Z]or [0-9]. Letters more likely
def generateRoomCode():
  code = []
  for _ in range(6):
    letterRand = randint(65, 90)
    numberRand = randint(48, 57)
    value = choice([letterRand, letterRand, letterRand, numberRand])
    code.append(chr(value))
  
  return "".join(code)


if __name__ == "__main__":
  app.run(host="0.0.0.0",port=5000,debug=True)