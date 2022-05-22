//
// this script executes when you run 'yarn test'
//
// you can also test remote submissions like:
// CONTRACT_ADDRESS=0x43Ab1FCd430C1f20270C2470f857f7a006117bbb yarn test --network rinkeby
//
// you can even run mint commands if the tests pass like:
// yarn test && echo "PASSED" || echo "FAILED"
//

import { ethers, network } from 'hardhat';
import { use, expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';

use(solidity);

describe('Bid contract', function () {
    this.timeout(180000);

    let bid: Contract;

    // console.log("hre:",Object.keys(hre)) // <-- you can access the hardhat runtime env here

    //describe('YourCollectible', function () {
    describe('Bid', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const startTime = 29014;//Math.floor(new Date().getTime() / 1000);
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const bidPrice = 16;
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                bid = await ethers.getContractAt('Bid', contractAddress);
                console.log('     🛰 Connected to external contract', bid.address);
            });
        } else {
            it('Should deploy Bid', async function () {
                //const YourCollectible = await ethers.getContractFactory('YourCollectible');
                const Bid = await ethers.getContractFactory('Bid');

                const [owner] = await ethers.getSigners();

                bid = await Bid.deploy(owner.address, startTime, itemAddress, bidPrice);
            });
        }

        describe('getBidderAddress()', function () {
            it('Get the bidder`s address', async function () {
                const [owner] = await ethers.getSigners();

                console.log('\t', 'Tester Address: ', owner.address);

                var result = await bid.getBidderAddress();
                console.log('\t', 'Checking setter worked: ', result);
                expect(await result).to.equal(owner.address);
            });
        });

        describe('getStartTime()', function () {
            it('Get the correct starting time', async function () {
                const [owner] = await ethers.getSigners();

                console.log('\t', 'Expected starting time: ', startTime);

                var result = await bid.getStartTime();
                expect(result).to.equal(startTime);
            })
        });

        describe('getItemAddress()', function () {
            it('Get the correct item address', async function () {
                console.log('\t', 'Expected address: ', itemAddress);

                var result = await bid.getItemAddress();
                expect(result).to.equal(itemAddress);
            })
        });

        describe('getBidPrice()', function () {
            it('Get the bid price', async function () {
                console.log('\t', 'Expected bid price: ', bidPrice);

                var result = await bid.getBidPrice();
                expect(result).to.equal(bidPrice);
            })
        });
    });
});
