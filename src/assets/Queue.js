
class Node{
  constructor(data=null){
    this.data = data
    this.next = null
    this.prev = null
  }
}

class Queue {
  constructor() {
    this.head = null
    this.tail = null
  }

  enqueue(data){
    const newValue = new Node(data)
    if (this.head === null){
      this.head = newValue
      this.tail = newValue
      return
    }
    this.head.prev = newValue
    newValue.next = this.head
    this.head = newValue 
  }
  dequeue(){
    if (this.head === null){
      return null
    }
    if (this.head === this.tail){
      const value = this.tail.data
      this.head = null
      this.tail = null
      return value
    }
    const value = this.tail.data
    this.tail = this.tail.prev
    this.tail.next = null
    return value
  }
  isEmpty(){
    return this.head === null
  }
}

export default Queue