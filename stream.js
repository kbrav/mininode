/* eslint-disable no-console */

import { pipe } from 'it-pipe'
import * as lp from 'it-length-prefixed'
import map from 'it-map'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

export function stdinToStream(stream) {
  // Read utf-8 from stdin
  process.stdin.setEncoding('utf8')
  pipe(
    // Read from stdin (the source)
    process.stdin,
    // Turn strings into buffers
    (source) => map(source, (string) => uint8ArrayFromString(string)),
    // Encode with length prefix (so receiving side knows how much data is coming)
    lp.encode(),
    // Write to the stream (the sink)
    stream.sink
  )
}

export function streamToConsole(stream) {
    pipe(
    // Read from the stream (the source)
    stream.source,
    // Decode length-prefixed data
    lp.decode(),
    // Turn buffers into strings
    (source) => map(source, (buf) => uint8ArrayToString(buf)),
    // Sink function
    async function (source) {
      // For each chunk of data
        console.log("msg:", await source.next())
      }
    )
}

export function streamToBus(proto, connection, stream, q) {
    pipe(
        // Read from the stream (the source)
        stream.source,
        // Decode length-prefixed data
        lp.decode(),
        // Turn buffers into strings
        (source) => map(source, (buf) => uint8ArrayToString(buf)),
        // Sink function
        async function (source) {
            console.log('putting on bus...')
            const msg = await source.next()
            console.log(msg)
            const peer = '/p2p/' + connection.remotePeer.toString()
            q.enq({proto, peer, data: msg.value})
            console.log("put on bus: ", msg.value)
        }
    )
}

export function stringToStream(str, stream) {
    pipe(
        // Read from stdin (the source)
        [str],
        // Turn strings into buffers
        (source) => map(source, (string) => {
                return uint8ArrayFromString(string)
            }
        ),
        // Encode with length prefix (so receiving side knows how much data is coming)
        lp.encode(),
        // Write to the stream (the sink)
        stream.sink
    )
}
