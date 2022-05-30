
// regular queue
import {createFromJSON, createFromPubKey} from "@libp2p/peer-id-factory";
import peerIdDialerJson from "./peer-id-dialer.js";
import peerIdListenerJson from "./peer-id-listener.js";
import {createLibp2p} from "./libp2p.js";
import {Multiaddr} from "@multiformats/multiaddr";
import {stdinToStream, streamToConsole, streamToBus, stringToStream} from "./stream.js";
import {pipe} from "it-pipe";
import * as lp from "it-length-prefixed";
import map from "it-map";
import assert from 'assert'


class Q {
    constructor() { this.q = [] }
    enq(v) {
        this.q.push(v)
    }
    deq() {
        if (this.q.length == 0) {
            return null
        } else {
            const head = this.q[0]
            this.q = this.q.slice(1)
            return head
        }
    }
    repr() {
        return this.q
    }
}

// net mediates interactions between the bus and the network
class Net {
    // net takes a peerDB
    // net is async and nondeterministic
    constructor(peerDB) {
        this.iq = new Q()
        this.oq = new Q()
        this.peerDB = peerDB
    }

    // connect to peers from peerDB
    //   on ann/peer, add it
    async listen_net(node) {

        // Log a message when a remote peer connects to us
        node.connectionManager.addEventListener('peer:connect', (evt) => {
            const connection = evt.detail
            console.log('connected to: ', connection.remotePeer.toString())
        })

        // Handle messages for the protocol
        await node.handle('/req/1.0.0', async ({ connection, stream }) => {
            // Send stdin to the stream
            streamToBus('/req/1.0.0', connection, stream, this.iq)
        })

        // Start listening
        await node.start()

        // Output listen addresses to the console
        console.log('Listener ready, listening on:')
        node.getMultiaddrs().forEach((ma) => {
            console.log(ma.toString())
        })
    }

    async write_peer(node, msg) {
        const peer = new Multiaddr(msg.peer)
        const {stream} = await node.dialProtocol(peer, msg.proto)
        stringToStream(msg.data.toString(), stream)
    }

    // TODO this will fail when bus gets big
    async flush_bus(node) {
        let msg
        while ((msg = this.oq.deq()) != null) {

            switch (msg.proto) {
                case '/ann/1.0.0': {
                    console.log("unimplemented: ann")
                    break
                }
                case '/req/1.0.0': {
                    console.log("REQ")
                    // this is the stupidest node in the world
                    let peersCopy = JSON.parse(JSON.stringify(this.peers))
                    for (let i = 0; i < peersCopy.length; i++) {
                        msg.peer = peersCopy[i]
                        await this.write_peer(node, msg)
                    }
                    break
                }
                case '/res/1.0.0': {
                    console.log("RES")
                    await this.write_peer(node, msg)
                    break
                }
                case '/end/1.0.0': {
                    const peer = proto.data;
                    const peeridx = this.peers.indexOf(peer)
                    this.peers.remove(peeridx)
                    // TODO ban?
                    assert(this.peers.indexOf(peer) == -1)
                    break
                }
                default: {
                    console.log("Unknown pulled msg protocol")
                    break
                }
            }
        }
    }

    async start() {
        // Create a new libp2p node with the given multi-address
        const id = await createFromJSON(peerIdListenerJson)
        const node = await createLibp2p({
            peerId: id,
            addresses: {
                listen: ['/ip4/0.0.0.0/tcp/10333']
            }
        })

        await this.listen_net(node)
        setInterval(async () => {
            this.flush_bus(node)
        }, 1000)

        // for each peer
        //   await peer.on msg
        //     iq.enq(msg)
        // loop msg = this.oq.pop()
        //   yield if msg is null
        //   if msg.type == end
        //     msg.from.ban()
        //   else
        //     msg.from.send(msg)
    }

    async poll() {
        return this.iq.deq()
    }
}

// the engine is synchronous and deterministic
class Eng {
    constructor() {
        this.log = []
        this.state = null
    }
    step(msg) {
        this.log.push(msg)
        let [next, outs] = this.turn(this.state, msg)
        this.state = next
        return outs
    }
    turn(state, msg) {
        // implementation
        if (msg == null ) return [state, []]
        const data = msg.data === "kbrav\\n" ? "moldy" : "nikolai"
        return [state, [{proto: '/res/1.0.0', peer: msg.peer, data}]]
    }
    repr() {
        return [ this.state, this.log ]
    }
}

// the node is a kind of supervisor of the net/bus/eng abstraction
// it is async and nondeterministic because it interacts with net, its job
// is to route messages into and out of the deterministic engine
class Node {
    constructor(peers) {
        this.net = new Net(peers)
        this.eng = new Eng()
    }
    async run() {
        this.net.start()
        setInterval(async () => {
            let msg = await this.net.poll()
            let outs = this.eng.step(msg)
            for (let out of outs) {
                this.net.oq.enq(out)
            }
        }, 1000)
    }
    repr() {
        return [
            this.net.repr(),
            this.eng.repr()
        ]
    }
}

const node = new Node([])
await node.run()
// emit a block every 60s
//setInterval(async () => {node.step()}, 1000)