import {expect as want} from 'chai'
import {Net} from '../net.js'

describe('net', () => {
    let ali, bob
    beforeEach(async () => {
        ali = new Net([])
        bob = new Net([])
        await ali.listen_net('10333')
        await bob.listen_net('10334')
    })
    afterEach(async () => {
        await ali.stop()
        await bob.stop()
    })

    it('basic', async () => {
    })

    describe('ann/tx', () => {
        it('empty', async () => {
            console.log(ali.p2p.peerId)
            console.log(bob.p2p.peerId)
            ali.send([["ann/tx", []]])
        })
    })
})