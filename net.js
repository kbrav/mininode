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
export class Net {
    // net takes a peerDB
    // net is async and nondeterministic
    constructor(peerDB) {
        this.iq = new Q()
        this.oq = new Q()
        this.peerDB = peerDB
    }

    async stop() {
        await this.p2p.stop()
    }

    // connect to peers from peerDB
    //   on ann/peer, add it
    async listen_net(port) {
        const id = await createFromJSON(peerIdListenerJson)
        this.p2p = await createLibp2p({
            peerId: id,
            addresses: {
                listen: ['/ip4/0.0.0.0/tcp/' + port]
            }
        })

        // Log a message when a remote peer connects to us
        this.p2p.connectionManager.addEventListener('peer:connect', (evt) => {
            const connection = evt.detail
            console.log('connected to: ', connection.remotePeer.toString())
        })

        // Handle messages for the protocol
        await this.p2p.handle('/cash/1.0.0', async ({ connection, stream }) => {
            // Send stdin to the stream
            streamToBus('/cash/1.0.0', connection, stream, this.iq)
        })

        // Start listening
        await this.p2p.start()

        // Output listen addresses to the console
        console.log('Listener ready, listening on:')
        this.p2p.getMultiaddrs().forEach((ma) => {
            console.log(ma.toString())
        })
    }

    async write_peer(msg) {
        console.log(msg.peer)
        const peer = new Multiaddr(msg.peer)
        const {stream} = await this.p2p.dialProtocol(peer, msg.type)
        stringToStream(msg.data.toString(), stream)
    }

    // TODO this will fail when bus gets big
    async flush_bus() {
        let msg
        while ((msg = this.oq.deq()) != null) {

            switch (msg.type) {
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
                        await this.write_peer(msg)
                    }
                    break
                }
                case '/res/1.0.0': {
                    console.log("RES", msg)
                    await this.write_peer(msg)
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
                    assert(false)
                    break
                }
            }
        }
    }

    start() {
        setInterval(async () => {
            this.flush_bus()
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

    async *poll() {
        while (true) {
            yield this.iq.deq()
        }
    }
}