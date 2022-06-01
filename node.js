// regular queue
// the engine is synchronous and deterministic
import {Net} from './net.js'

class Eng {
    constructor() {
        this.log = []
        this.state = null
    }
    step(msg) {
        console.log("STEP", msg)
        this.log.push(msg.value)
        let [next, outs] = this.turn(this.state, msg.value)
        this.state = next
        return outs
    }
    turn(state, msg) {
        // implementation
        if (msg == null ) return [state, []]
        const data = msg.data === "kbrav\\n" ? "moldy" : "nikolai"
        return [state, [{type: undefined, peer: msg.peer, data}]]
    }
    repr() {
        return [ this.state, this.log ]
    }
}

// the node is a kind of supervisor of the net/bus/eng abstraction
// it is async and nondeterministic because it interacts with net, its job
// is to route messages into and out of the deterministic engine
export class Node {
    constructor(peers) {
        this.net = new Net(peers)
        this.eng = new Eng()
        this.blocks = undefined
    }

    send(msg) {
        if (msg.length != 2) {
            console.log('send: bad message', msg)
            return
        }

        const peer  = msg[0]
        const mail  = msg[1]
        const proto = mail[0]
        const data  = mail[1]

        this.net.oq.enq({proto, peer, data})
    }

    async run() {
        // block fmt: hdr txns
        this.blocks = [[]]
        await this.net.listen_net()
        this.net.start()
        const poller = this.net.poll()
        setInterval(
            async () => {
                const msg = await poller.next()
                if (msg.value == null) {
                    return
                }
                const outs = this.eng.step(msg)
                for (let out of outs) {
                    this.net.oq.enq(out)
                }
            },
            1000
        )
    }

    repr() {
        return [
            this.net.repr(),
            this.eng.repr()
        ]
    }
}

// Create a new libp2p node with the given multi-address

const node = new Node([])
//await node.net.listen_net()
node.run()
// emit a block every 60s
//setInterval(async () => {node.step()}, 1000)
