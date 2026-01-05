import mysql.connector
import json, os
from os import environ as env
from urllib.parse import quote_plus, urlencode
from random import randint, choice
from PIL import Image
import io
from functools import wraps
import bcrypt
import boto3

from authlib.integrations.flask_client import OAuth
from authlib.jose import JsonWebToken, JsonWebKey
import requests
from flask import Flask, Response, request, jsonify, redirect, render_template, session, url_for, send_file
from flask_cors import CORS
import uuid
from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")

S3_BUCKET_ACCESSKEY = env.get("S3_BUCKET_ACCESSKEY")
S3_BUCKET_SECRET_ACCESSKEY = env.get("S3_BUCKET_SECRET_ACCESSKEY")
S3_BUCKET_REGION = env.get("S3_BUCKET_REGION")
S3_BUCKET_NAME = env.get("S3_BUCKET_NAME")

APP_SECRET_KEY = env.get("APP_SECRET_KEY")

AUTH0_DOMAIN = env.get('AUTH0_DOMAIN')
AUTH0_CLIENT_ID = env.get("AUTH0_CLIENT_ID"),
AUTH0_CLIENT_SECRET = env.get("AUTH0_CLIENT_SECRET")
AUTH0_API_AUDIENCE = env.get("AUTH0_API_AUDIENCE")


DB_PASSWORD = env.get("DB_PASSWORD")

FRONTEND_URL = env.get("FRONTEND_URL")


s3 = boto3.client(
    "s3",
    aws_access_key_id=S3_BUCKET_ACCESSKEY,
    aws_secret_access_key=S3_BUCKET_SECRET_ACCESSKEY,
    region_name=S3_BUCKET_REGION
)


# create flask app and register with the Auth0 service
app = Flask(__name__)
app.secret_key = APP_SECRET_KEY
CORS(app, supports_credentials=True, origins=[FRONTEND_URL])

jwt = JsonWebToken(["RS256"])
JWKS = JsonWebKey.import_key_set(
    requests.get(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json").json()
)

oauth = OAuth(app)
oauth.register(
  "auth0",
  client_id = AUTH0_CLIENT_ID,
  client_secret = AUTH0_CLIENT_SECRET,
  client_kwargs = {"scope": "openid profile email"},
  server_metadata_url = f'https://{AUTH0_DOMAIN}/.well-known/openid-configuration'
)

#context manager for opening/closing connection and cursor easily
class AccessDatabase:
  def __init__(self):
    self.conn = None
    self.cursor = None
  def __enter__(self):
    self.conn = mysql.connector.connect(
      host= "localhost",
      user="root",  
      passwd= f"{DB_PASSWORD}", 
      database= "projectplace"
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
        return func(*args, **kwargs)
      except Exception as e:
        print(e)
        return jsonify({"success": False, "message": errorMessage}), 500
    return wrapper
  return decorator

def authenticateClient(func):
  @wraps(func)
  def wrapper(*args, **kwargs):
    decodedToken = jwt.decode(session["user"]["access_token"], key=JWKS)
    decodedToken.validate()
    return func(*args, **kwargs)
  return wrapper
def authenticateServer(func):
  @wraps(func)
  def wrapper(*args, **kwargs):
    token = request.headers.get("authorization").split(" ")[1]
    decodedToken = jwt.decode(token, key=JWKS)
    decodedToken.validate()
    return func(*args, **kwargs)
  return wrapper


with AccessDatabase() as cursor:
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS users (
      userID VARCHAR(100) PRIMARY KEY,
      username VARCHAR(70) UNIQUE,
      images JSON,
      rooms JSON
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER AUTO_INCREMENT PRIMARY KEY,
      messageID VARCHAR(50) UNIQUE,
      roomID VARCHAR(10),
      text TEXT,
      username VARCHAR(70),
      timestamp BIGINT,
      edited BOOLEAN,
      files JSON,
      dimensions JSON,
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS rooms (
      roomID VARCHAR(10) PRIMARY KEY,
      roomName VARCHAR(70),
      users JSON,
      password VARBINARY(100) NULL
    )
    '''
  )
  cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS canvases (
      roomID VARCHAR(10) PRIMARY KEY,
      canvas VARCHAR(1000),
      instructions JSON
    )
    '''
  )




# ----------User Resources (include images)
@app.route("/users", methods=["GET"])
@handleError("getting user info failed")
@authenticateClient
def getUserInfo():
  with AccessDatabase() as cursor:
    cursor.execute("SELECT username, images FROM users WHERE userID = %s", (session["userID"],))

    images = json.loads(values[2])
    urls = []
    for imgKey in images:
      url = getS3Url(imgKey)
      urls.append(url)

    values = cursor.fetchone()
    userInfo = {
      "username": values[0],
      "images": urls
    }
  return jsonify({"success": True, "data": {"userInfo": userInfo}}), 200

@app.route("/users", methods=["PUT"])
@handleError("Failed to update user info")
@authenticateClient
def updateUserInfo():
  data = request.get_json()
  fields = data["fields"]

  modifiedFields = []
  allowedToModify = {"images", "rooms"}
  for col in fields.keys():
    if col not in allowedToModify:
      return {"success": False}, 500
    modifiedFields.append(f"{col} = %s")
  modifiedFields = ", ".join(modifiedFields)

  newValues = tuple(list(fields.values()) + [session["userID"]])

  with AccessDatabase() as cursor:
    cursor.execute(f"UPDATE users SET {modifiedFields} WHERE userID = %s", newValues)

  return jsonify({"success":True}), 200

@app.route("/users/<username>", methods=["GET"])
@handleError("Failed to validate username")
@authenticateClient
def validateUsername(username):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT 1 FROM users WHERE username = %s", (username,))
    if cursor.fetchone() is not None:
      return jsonify({"success":True}), 200

  return jsonify({"success":True, "data": {"username": username}}), 200


@app.route("/users/rooms", methods=["GET"])
@handleError("Failed to get user's rooms")
@authenticateClient
def getUserRooms():
  rooms = []
  with AccessDatabase() as cursor:
    cursor.execute("SELECT rooms FROM users WHERE userID = %s", (session["userID"],))
    result = cursor.fetchone()
    if result is None:
      return jsonify({"success": True, "data": {"rooms": []}}), 200
    values = json.loads(result[0])

    for roomID in values:
      cursor.execute("SELECT roomName FROM rooms WHERE roomID = %s", (roomID,))
      result = cursor.fetchone()
      if result is None:
        continue
      roomName = result[0]
      rooms.append({
        "roomID": roomID,
        "roomName": roomName
      })
  return jsonify({"success": True, "data": {"rooms": rooms}}), 200


@app.route("/users/images", methods=["POST"])
@handleError("failed to upload image")
@authenticateClient
def uploadImage():
  imageFile = request.files["img"]
 
  extension = imageFile.filename.split(".")[-1].lower()
  allowedExtensions = ["png", "jpg", "jpeg", "webp"]
  if extension not in allowedExtensions or len(extension) == len(imageFile.filename):
    return {"success": False}, 500

  imageID = "userImages/" + str(uuid.uuid4()) + f".{extension}"
  s3Upload(imageFile, imageID)
  url = getS3Url(imageID)

  return {"success": True, "data": {"path": url}}, 200

# @app.route("/users/images/public/<imageID>", methods=["GET"])
# @handleError("failed to get public image")
# @authenticateClient
# def getPublicImage(imageID):
#   if not os.path.exists(f"images/public/{imageID}"):
#     return {"success": False}, 500
#   return send_file(f"images/public/{imageID}"), 200

# @app.route("/users/images/<imageID>", methods=["GET"])
# @handleError("failed to get image")
# @authenticateClient
# def getImage(imageID):
#   relativeURL = None
#   with AccessDatabase() as cursor:
#     cursor.execute("SELECT avatar FROM users WHERE username = %s", (imageID,))
#     relativeURL = cursor.fetchone()

#     #in case frontend makes imageID the username
#     if (relativeURL is not None):
#       relativeURL = relativeURL[0][relativeURL[0].find("images/"):]
#     else:
#       relativeURL = f"images/{imageID}"
  
#   print(relativeURL)
#   if not os.path.exists(relativeURL):
#     return {"success": False}, 500
  
#   return send_file(relativeURL), 200



#----------- Room Resources (include messages, canvases)
@app.route("/rooms", methods=["POST"])
@handleError("failed to create room")
@authenticateClient
def createRoom():
  data = request.get_json()
  roomName = data["roomName"]
  password = data["password"]
  if password:
    salt = bcrypt.gensalt()
    passBytes = password.encode("utf-8")
    password = bcrypt.hashpw(passBytes, salt)

  roomID = None
  with AccessDatabase() as cursor:
    exists = True
    while (exists):
      roomID = generateRoomCode()
      cursor.execute("SELECT 1 from rooms WHERE roomID=%s",(roomID,))
      exists = cursor.fetchone() is not None
    cursor.execute("INSERT INTO rooms (roomID, roomName, users, password) VALUES (%s, %s, %s, %s)",(roomID, roomName, json.dumps([session["userID"]]), password))
    cursor.execute("UPDATE users SET rooms = JSON_ARRAY_APPEND(rooms,'$',%s) WHERE userID = %s", (roomID, session["userID"]))

    # store empty canvas 
    canvasImg = Image.new(mode = "RGBA", size=(1000,1000), color=(0,0,0,0))
    buffer = io.BytesIO()
    canvasImg.save(buffer, format="PNG")

    key = "canvases/" + str(uuid.uuid4()) + ".png"
    s3Upload(buffer, key)
    cursor.execute("INSERT INTO canvases (canvas, instructions, roomID) VALUES (%s,%s,%s)", (buffer, "[]", roomID))
  return jsonify({"success": True, "data": {"roomID": roomID}}), 200

@app.route("/rooms/files", methods=["POST"])
@handleError("failed to upload files")
@authenticateClient
def uploadFiles():
  files = request.files.getlist("files")
  urls = []
  dimensions = []
  for file in files:
    extension = file.filename.split(".")[-1].lower()
    allowedExtensions = {"png", "jpg", "jpeg", "webp", "docx", "doc", "txt", "csv", "pdf", "odt", "md","gif","mp3","mp4","html","zip"}
    if extension not in allowedExtensions or len(extension) == len(file.filename):
      return {"success": False}, 500

    fileID = "chatImages/" +  str(uuid.uuid4()) + f".{extension}"
    s3Upload(file, fileID)
    url = getS3Url(fileID)
    urls.append(url)

    fileType = file.mimetype.split("/")[0]
    if (fileType == "image"):
      with Image.open(localPath) as img:
        w,h = img.size
        dimensions.append([w, h])
    else:
      dimensions.append(None)
    
  return jsonify({"success":True, "data": {"paths": urls, "dimensions": dimensions}}),200

# @app.route("/rooms/files/<fileID>", methods=["GET"])
# @handleError("failed to get file")
# @authenticateClient
# def getFile(fileID):
#   if not os.path.exists(f"files/{fileID}"):
#     return {"success": False}, 500
#   return send_file(f"files/{fileID}")

@app.route("/rooms/<roomID>/exists", methods=["GET"])
@handleError("failed to validate room")
@authenticateClient
def checkRoomExists(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT roomName, password FROM rooms where roomID=%s",(roomID,))
    result = cursor.fetchone()
    if result is None:
        return jsonify({"success": True}), 200
  roomInfo = {
    "roomName": result[0],
    "needsPassword": result[1] is not None
  }
  return jsonify({"success":True,"data": {"roomInfo": roomInfo}}), 200

@app.route("/rooms/<roomID>/users", methods=["PUT"])
@handleError("failed to add room user")
@authenticateClient
def addRoomUser(roomID):
  data = request.get_json()
  userPassword = data["password"] 

  with AccessDatabase() as cursor:
    cursor.execute("SELECT roomName, password, users FROM rooms WHERE roomID = %s", (roomID,))
    result = cursor.fetchone()
    roomName = result[0]
    passwordHash = result[1] if session["userID"] not in json.loads(result[2]) else None
    
    if passwordHash is not None:
      passwordsMatch = bcrypt.checkpw(userPassword.encode("utf-8"), passwordHash)
      if not passwordsMatch:
        return jsonify({"success": True}), 200

    cursor.execute('''
    UPDATE rooms SET users = JSON_ARRAY_APPEND(users, '$', %s)
    WHERE roomID = %s AND NOT JSON_CONTAINS(users, %s)''',(session["userID"], roomID, json.dumps(session["userID"])))
    cursor.execute('''
    UPDATE users SET rooms = JSON_ARRAY_APPEND(rooms,'$',%s)
    WHERE userID = %s AND NOT JSON_CONTAINS(rooms, %s)''', (roomID, session["userID"], json.dumps(roomID)))

  return jsonify({"success": True, "data": {"roomName": roomName}}), 200

@app.route("/rooms/<roomID>/users", methods=["GET"])
@handleError("Failed to get room users")
@authenticateServer
def getRoomUsers(roomID):
  with AccessDatabase() as cursor:    
    cursor.execute("SELECT users FROM rooms WHERE roomID = %s", (roomID,))
    users = json.loads(cursor.fetchone()[0])

  return jsonify({"success":True,"data": {"users": users}}), 200

# Uses users table but liked it in rooms area
@app.route("/rooms/<roomID>/users/<username>", methods=["GET"])
@handleError("failed to validate room user")
@authenticateServer
def validateRoomUser(roomID, username):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT 1 FROM users WHERE username = %s AND JSON_CONTAINS(rooms, %s)", (username, json.dumps(roomID)))
    if (cursor.fetchone() is None):
      return jsonify({"success": True}), 200

  return jsonify({"success": True, "data": {"username": username}}), 200

 
@app.route("/rooms/<roomID>/messages", methods=["POST"])
@handleError("failed to create message")
@authenticateServer
def storeMessage(roomID):
  data = request.get_json()
  message = data["message"]
  with AccessDatabase() as cursor:  
    cursor.execute("INSERT INTO messages (username, text, files, dimensions, messageID, timestamp, roomID) VALUES (%s, %s, %s, %s,%s, %s, %s)", 
    (message["username"], message["text"], json.dumps(message["files"]),json.dumps(message["metadata"]["dimensions"]), message["metadata"]["messageID"], message["metadata"]["timestamp"], roomID))

  return jsonify({"success":True}),200


@app.route("/rooms/<roomID>/messages", methods=["PATCH"])
@handleError("failed to edit message")
@authenticateServer
def editMessage(roomID):
  data = request.get_json()
  messageID = data["messageID"]
  text = data["text"]
  with AccessDatabase() as cursor:  
    cursor.execute("UPDATE messages SET text = %s, edited = TRUE WHERE messageID = %s", (text, messageID))
    
  return jsonify({"success":True}),200

@app.route("/rooms/<roomID>/messages", methods=["DELETE"])
@handleError("failed to delete message")
@authenticateServer
def deleteMessage(roomID):
  data = request.get_json()
  messageID = data["messageID"]
  with AccessDatabase() as cursor:  
    cursor.execute("SELECT files FROM messages WHERE messageID = %s", (messageID,))
    files = cursor.fetchone()
    if (files):
      files = json.loads(files[0])
      for f in files:
        s3Delete(f)
    cursor.execute("DELETE FROM messages WHERE messageID = %s", (messageID,))
    
  return jsonify({"success":True}),200

@app.route("/rooms/<roomID>/messages", methods=["GET"])
@handleError("Failed to get room messages")
@authenticateServer
def getMessages(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT username, text, files, dimensions,timestamp, messageID FROM messages WHERE roomID = %s ORDER BY id DESC LIMIT 100", (roomID,))
    messages = cursor.fetchall()
    jsonMessages = []
    for i in range(len(messages)-1,-1,-1):
      tpl = messages[i]
      files = json.loads(tpl[2])
      urls = []
      for f in files:
        url = getS3Url(f)
        urls.append(url)

      jsonMessages.append({
        "username": tpl[0],
        "text": tpl[1],
        "files": urls,
        "metadata": {
          "dimensions": json.loads(tpl[3]),
          "timestamp": tpl[4],
          "messageID": tpl[5],
        }
      })
  return jsonify({"success": True, "data": {"messages": jsonMessages} }), 200

@app.route("/rooms/<roomID>/messages/more", methods=["GET"])
@handleError("Failed to get more room messages")
@authenticateClient
def getMoreMessages(roomID):
  with AccessDatabase() as cursor:
    messageID = request.args.get("messageID")

    cursor.execute("SELECT id FROM messages WHERE messageID = %s", (messageID,))
    lastID = cursor.fetchone()[0]
    cursor.execute("SELECT username, text, files, dimensions, timestamp, messageID FROM messages WHERE roomID = %s AND id < %s ORDER BY id DESC LIMIT 100", (roomID, lastID))
    messages = cursor.fetchall()

    jsonMessages = []
    for i in range(len(messages)-1,-1,-1):
      tpl = messages[i]
      files = json.loads(tpl[2])
      urls = []
      for f in files:
        url = getS3Url(f)
        urls.append(url)
      jsonMessages.append({
        "username": tpl[0],
        "text": tpl[1],
        "files": urls,
        "metadata": {
          "dimensions": json.loads(tpl[3]),
          "timestamp": tpl[4],
          "messageID": tpl[5] 
        }
      })
  return jsonify({"success": True, "data": {"messages": jsonMessages} }), 200



@app.route("/rooms/<roomID>/canvas/snapshot", methods=["PUT"])
@handleError("failed to update canvas snapshot")
@authenticateServer
def updateCanvasSnapshot(roomID):
  canvasBytes = request.get_data()
  fileObj = io.BytesIO(canvasBytes)
  with AccessDatabase() as cursor:    
    cursor.execute("SELECT canvas FROM canvases WHERE roomID = %s", (roomID,))
    result = cursor.fetchone()
    if result is None:
      return {"success": False, "message": "canvas does not exist"}, 500
    canvasKey = result[0]
    s3Upload(fileObj, canvasKey)
  return {"success": True}, 200

@app.route("/rooms/<roomID>/canvas/snapshot", methods=["GET"])
@handleError("failed to get canvas snapshot")
@authenticateServer
def getCanvasSnapshot(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT canvas FROM canvases WHERE roomID = %s",(roomID,))
    result = cursor.fetchone()
    if result is None:
      return {"success": False, "message": "canvas does not exist"}, 500
    canvasKey = result[0]
    url = getS3Url(canvasKey)

  return {"success": True, "data": {"url": url}}, 200

@app.route("/rooms/<roomID>/canvas/instructions", methods=["PUT"])
@handleError("failed to update canvas instructions")
@authenticateServer
def updateCanvasInstructions(roomID):
  data = request.get_json()
  instructions = data["instructions"]
  with AccessDatabase() as cursor:
    cursor.execute("UPDATE canvases SET instructions = %s WHERE roomID = %s", (json.dumps(instructions), roomID))
  return {"success": True}, 200

@app.route("/rooms/<roomID>/canvas/instructions", methods=["GET"])
@handleError("failed to get canvas instructions")
@authenticateServer
def getCanvasInstructions(roomID):
  with AccessDatabase() as cursor:
    cursor.execute("SELECT instructions FROM canvases WHERE roomID = %s",(roomID,))
    instructions = json.loads(cursor.fetchone()[0])
  return {"success": True, "data": {"instructions": instructions}}, 200

# Backend only functions
def createUser():
  with AccessDatabase() as cursor:
    cursor.execute("SELECT 1 FROM users WHERE userID = %s", (session["userID"],))
    exists = cursor.fetchone() is not None

    if (not exists):
      cursor.execute("INSERT INTO users (userID, username, avatar, images, rooms) VALUES (%s, %s, %s, %s, %s)", (session["userID"], None, "http://localhost:5000/users/images/public/willow.png", "[]","[]"))

#-----------------AUTH0 STUFF------------------

# Redirects user to auth0 login page
@app.route("/login")
def login():
  # HARDCODE THE URL FOR REDIRECT_URI IF YOU WANT TO TEST MOBILE MURAD
  return oauth.auth0.authorize_redirect(
    redirect_uri = url_for("callback",_external=True),
    audience= AUTH0_API_AUDIENCE
  )
 
# Redirects user to home page (or page after authentication)
@app.route("/callback", methods=["GET", "POST"])
def callback():
  token = oauth.auth0.authorize_access_token()
  
  session["user"] = token
  session["userID"] = jwt.decode(token["id_token"], key=JWKS)["sub"]
  createUser()

  return redirect("http://localhost:3000/platform")

# Ends the user's session, and redirects them to home page.
@app.route("/logout")
def logout():
  session.clear()
  return redirect(
    "https://"
    + AUTH0_DOMAIN
    + "/v2/logout?"
    + urlencode(
        {
          "returnTo": "http://localhost:3000", 
          "client_id": AUTH0_CLIENT_ID,
        },
        quote_via=quote_plus,
    )
  )

# -----------------S3 STUFF (TEMPLATES THAT I USE IN A SECOND)--------------------
# All are called within handleError

def s3Upload(fileObj, key):
  s3.upload_fileobj(fileObj, S3_BUCKET_NAME, key)

def getS3Url(key):
  url = s3.generate_presigned_url(
    "get_object", 
    Params={"Bucket": S3_BUCKET_NAME, "Key", key}, 
    ExpiresIn=3600)  return

  return url

def s3Delete(key):
  s3.delete_object(Bucket=S3_BUCKET_NAME, Key=key)

# -------------------Miscellaneous------
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