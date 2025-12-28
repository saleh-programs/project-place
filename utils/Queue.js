
class Queue{
  constructor(data=null){
    this.queue = []
    this.head = -1;
    this.TRUNCATION_SIZE = 2000000
  }

  enqueue(data){
    this.queue.push(data)
    if (this.head > this.TRUNCATION_SIZE){
      this.queue = this.queue.slice(this.head + 1)
      this.head = -1
    }
  }
  dequeue(){
    if (this.head === this.queue.length - 1){
      return null
    }
    this.head += 1
    return this.queue[this.head]
  }
  isEmpty(){
    return this.head === this.queue.length - 1
  }
}

export default Queue