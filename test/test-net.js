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
        want(1).to.eql(2)
    })
})