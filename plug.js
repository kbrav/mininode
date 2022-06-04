
// transport plugin
import http from 'http'
import Debug from 'debug'
const debug = Debug('test::plug')


export class Plug {
    constructor(port) {
        this.port = port
        this.peers = {}
        this.actives = []
        this.pubkey = String(Math.floor(Math.random() * 1000000000))
        debug(`created plug with pubkey ${this.pubkey}`)
    }
    setPeer(pk, addr, port) { this.peers[pk] = [addr, port] }
    drop(p) {
        this.peers[p] = undefined
        this.actives = this.actives.filter(p => p != peer)
    }
    setServers(actives) { this.actives = actives }
    stop() {
        if (this.server == undefined) {
            console.error('stop: no listener open')
        }
        this.server.close()
    }
    // when( mailbox : msg -> () )
    when(mailbox) {
        this.server = http.createServer(function (req, res) {
            //debug(req)
            let mail
            req.on('data', (chunk) => {
                mail = JSON.parse(chunk)
                mailbox(mail)
            })
            res.end()
        }).listen(this.port)
        // http.server.onMessage(msg => { mailbox(msg) } )
    }
    send(mail) {
        // http.request(..., mail)

        const json = JSON.stringify(mail)
        const post = (addr, port) => {
            const options = {
                hostname: addr,
                port,
                method: 'POST',
                headers: {
                    'Content-type': 'application/json',
                    'Content-Length': json.length
                }
            }
            const req = http.request(options, res => {
                debug(`statusCode: ${res.statusCode}`)
            })
            req.on('error', error => {
                console.error(error)
            })
            req.write(json)
            req.end()
        }

        const peer = mail[0]
        const type = mail[1]
        switch(type.slice(0, 3)) {
            case 'end': {
                let [addr, port] = this.peers[peer]

                if (peer.indexOf(',') != -1) {
                    console.error('end: can only drop one peer at a time')
                }
                post(addr, port)
                // drop peer
                this.drop(peer)
                break
            }
            case 'ann': {
                if (peer != '') {
                    console.error('ann: peer should be empty string')
                    break
                }
                for (let pk of Object.keys(this.peers)) {
                    const [addr, port] = this.peers[pk]
                    post(addr, port)
                }
                break
            }
            case 'req': {
                let [addr, port] = this.peers[peer]

                const peers = peer.split(',')
                for (let peer in peers) {
                    const [addr, port] = this.peers[pk]
                    post(addr, port)
                }
                break
            }
            case 'res': {
                let [addr, port] = this.peers[peer]

                if (peer.indexOf(',') != -1) {
                    console.error('res: can only drop one peer at a time')
                }
                post(addr, port)
            }
        }
    }
}
