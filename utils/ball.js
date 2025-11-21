function distanceBetween(p1, p2){
    return Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2)
}
function normalize(p){
    const magnitude = Math.sqrt((p.x)**2 + (p.y)**2)
    return {x: p.x / magnitude, y: p.y / magnitude}
}
function dot(p1, p2){
    return p1.x * p2.x + p1.y * p2.y
}
function multiply(p, scalar){
    return {x: p.x * scalar, y: p.y * scalar}
}
function divide(p, scalar){
    return {x: p.x / scalar, y: p.y / scalar}
}
function subtract(p1, p2){
    return {x: p1.x - p2.x, y: p1.y - p2.y}
}
function add(p1, p2){
    return {x: p1.x + p2.x, y: p1.y + p2.y}
}

class Ball{
    constructor(origin, circle_group, width, height, image=null){
        this.circle_group = circle_group

        this.WIDTH = width
        this.HEIGHT = height
        this.image = image

        this.acceleration = {x: 0, y: .0000005}
        this.elasticity = .8
        this.radius = 20
        this.mass = 1  
 
        this.pos = {...origin} 
        this.pastpos = {x: origin.x + (-8 + Math.random()*16 ), y: origin.y + (-8 + Math.random()*16 )}
        this.currentpos = {...origin}
    }
    moveLinear(dt){
        this.currentpos = {...this.pos}

        this.pos.x += (this.pos.x - this.pastpos.x) + this.acceleration.x * dt*dt
        this.pos.y += (this.pos.y - this.pastpos.y) + this.acceleration.y * dt*dt
        this.blockCollisions()

        this.pastpos = {...this.currentpos}
    }
    blockCollisions(){
        const diff = {x: this.pos.x - this.currentpos.x, y: this.pos.y - this.currentpos.y}

        if (this.pos.x > this.WIDTH - this.radius){
            this.pos.x = this.WIDTH - this.radius
            this.currentpos.x = this.pos.x + diff.x * this.elasticity
        }
        if (this.pos.x < this.radius){
            this.pos.x = this.radius
            this.currentpos.x = this.pos.x + diff.x * this.elasticity
        }
        if (this.pos.y > this.HEIGHT - this.radius){
            this.pos.y = this.HEIGHT  - this.radius
            this.currentpos.y = this.pos.y + diff.y * this.elasticity
        }
        if (this.pos.y < this.radius){
            this.pos.y = this.radius
            this.currentpos.y = this.pos.y + diff.y * this.elasticity
        }
    }
    circleCollisions(){
        for (let circle of this.circle_group){
            if (this != circle){
                const collision = distanceBetween(circle.pos, this.pos) < (this.radius + circle.radius)

                if (collision){
                    const collisionNormal = normalize(subtract(circle.pos, this.pos))
                    const separation = (this.radius + circle.radius) - distanceBetween(this.pos, circle.pos)

                    const Vrelative = subtract(
                        subtract(circle.pos, circle.pastpos),
                        subtract(this.pos, this.pastpos)
                    )

                    const approaching = dot(Vrelative, collisionNormal)

                    this.pos = subtract(this.pos, multiply(collisionNormal, separation/2))
                    this.pastpos = subtract(this.pastpos, multiply(collisionNormal, separation/2))

                    circle.pos = add(circle.pos, multiply(collisionNormal, separation/2))
                    circle.pastpos = add(circle.pastpos, multiply(collisionNormal, separation/2))

                    const j = (-1 * (1 + this.elasticity) * approaching) / ((1 / this.mass) + (1 / circle.mass))

                    this.pos = subtract(this.pos, multiply(collisionNormal, j / this.mass))
                    circle.pos = add(circle.pos, multiply(collisionNormal, j / circle.mass))
                }
            }
        }
    }
    update(dt){
        dt /= 2
        this.circleCollisions()
        this.moveLinear(dt)
    }
}

export default Ball