  function getGroupedMessages(messageList){
    const delay = 30000
    const groupedMessages = []
    let group = null;
    let i = 0
    while (i < messageList.length){
      const msg = messageList[i]
      const [user, timestamp, data] = [msg["username"], msg["metadata"]["timestamp"], msg["data"]]
      group = {
        "username": user,
        "timestamp": timestamp,
        "messages": [data]
      }
      i += 1
      while (i < messageList.length){
        const nextMsg = messageList[i]
        const [nextUser, nextTimestamp, nextData] = [nextMsg["username"], nextMsg["metadata"]["timestamp"], nextMsg["data"]]
        if (user === nextUser && nextTimestamp - timestamp < delay){
          group["messages"].push(nextMsg["data"])
          i += 1
        }else{
          groupedMessages.push(group)
          group = null
          break
        }
      }
    }
    if (group){
      groupedMessages.push(group)
    }
    return groupedMessages
  }


  function testGetGroupedMessages(){
    let messages
    let expected
    const theTime = 50000
    // test case 1 (unique users sent messages fast, 3 groups)
    messages = [
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "hey man!",
      "metadata":{
        "timestamp": theTime + 5000,
        "messageID": "1"
      }
    },
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "boss123",
      "data": "yo bud",
      "metadata":{
        "timestamp": theTime + 15000,
        "messageID": "2"
      }
    },
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "sarah93",
      "data": "hey guys!",
      "metadata":{
        "timestamp": theTime + 20000,
        "messageID": "3"
      }
    }
    ]
    expected = [
      {
        "username": "crzyMan1",
        "timestamp": theTime + 5000,
        "messages": ["hey man!"]
      },
      {
        "username": "boss123",
        "timestamp": theTime + 15000,
        "messages": ["yo bud"]
      },
      {
        "username": "sarah93",
        "timestamp": theTime + 20000,
        "messages": ["hey guys!"]
      }
    ]
    if (JSON.stringify(expected) === JSON.stringify(getGroupedMessages(messages))){
      console.log("Test case 1 passed")
    }else{
      console.log("Test case 1 failed")

    }
    // test case 2 (1 users sends messages fast, 2 groups)
    messages = [
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "hey man!",
      "metadata":{
        "timestamp": theTime + 5000,
        "messageID": "1"
      }
    },
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "guys?",
      "metadata":{
        "timestamp": theTime + 15000,
        "messageID": "2"
      }
    },
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "um",
      "metadata":{
        "timestamp": theTime + 20000,
        "messageID": "3"
      }
    }
    ]
    expected = [
      {
        "username": "crzyMan1",
        "timestamp": theTime + 5000,
        "messages": ["hey man!", "guys?", "um"]
      }
    ]
        if (JSON.stringify(expected) === JSON.stringify(getGroupedMessages(messages))){
      console.log("Test case 2 passed")
    }else{
      console.log("Test case 2 failed")
    }
    // test case 3 (1 users sends messages over period of time, 2 groups)
    messages = [
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "hey man!",
      "metadata":{
        "timestamp": theTime + 5000,
        "messageID": "1"
      }
    },
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "guys?",
      "metadata":{
        "timestamp": theTime + 15000,
        "messageID": "2"
      }
    },
    {
      "origin": "chat",
      "type": "newMessage",
      "username": "crzyMan1",
      "data": "WHERE ARE YOU",
      "metadata":{
        "timestamp": theTime + 40000,
        "messageID": "3"
      }
    }
    ]
    expected = [
      {
        "username": "crzyMan1",
        "timestamp": theTime + 5000,
        "messages": ["hey man!", "guys?"]
      },
      {
        "username": "crzyMan1",
        "timestamp": theTime + 40000,
        "messages": ["WHERE ARE YOU"]
      }
    ]
    if (JSON.stringify(expected) === JSON.stringify(getGroupedMessages(messages))){
      console.log("Test case 3 passed")
    }else{
      console.log("Test case 3 failed")
    }
  }

  testGetGroupedMessages()