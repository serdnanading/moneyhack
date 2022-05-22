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
import { syncBuiltinESMExports } from 'module';

use(solidity);

describe('AuctionItem tests', function () {
    this.timeout(180000);

    let auctionItem: Contract;

    // console.log("hre:",Object.keys(hre)) // <-- you can access the hardhat runtime env here

    //describe('YourCollectible', function () {
    describe('AuctionItem', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        //const startTime = 29014;//Math.floor(new Date().getTime() / 1000);
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const auctionStartTime = 29014;
        const auctionSpeed = 30;
        const initialPrice = 16;
        const biddingPrice = 2;
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auctionItem = await ethers.getContractAt('AuctionItem', contractAddress);
                console.log('Connected to external contract', auctionItem.address);
            });
        } else {
            it('Should deploy AuctionItem', async function () {
                //const YourCollectible = await ethers.getContractFactory('YourCollectible');
                const AuctionItem = await ethers.getContractFactory('AuctionItem');

                const [owner] = await ethers.getSigners();

                auctionItem = await AuctionItem.deploy(itemAddress, auctionStartTime, auctionSpeed, initialPrice, 5, originalOwnerAddress)

                //                bid = await Bid.deploy(owner.address, startTime, itemAddress, bidPrice);
            });
        }

        describe('getItemAddress()', function () {
            it('Get the correct item address', async function () {
                console.log('\t', 'Expected address: ', itemAddress);

                var result = await auctionItem.getItemAddress();
                expect(result).to.equal(itemAddress);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the correct original owner address', async function () {
                console.log('\t', 'Expected address: ', originalOwnerAddress);

                var result = await auctionItem.getOriginalOwner();
                expect(result).to.equal(originalOwnerAddress);
            })
        });

        describe('getAuctionStartTime()', function () {
            it('Get the correct auction starting time', async function () {
                const [owner] = await ethers.getSigners();

                console.log('\t', 'Expected starting time: ', auctionStartTime);

                var result = await auctionItem.getAuctionStartTime();
                expect(result).to.equal(auctionStartTime);
            })
        });

        describe('getAuctionSpeed()', function () {
            it('Get the correct auction speed', async function () {
                const [owner] = await ethers.getSigners();

                console.log('\t', 'Expected starting time: ', auctionSpeed);

                var result = await auctionItem.getAuctionSpeed();
                expect(result).to.equal(auctionSpeed);
            })
        });

        describe('getInitialPrice()', function () {
            it('Get the initial price', async function () {
                console.log('\t', 'Expected initial price: ', initialPrice);

                var result = await auctionItem.getInitialPrice();
                expect(result).to.equal(initialPrice);
            })
        });

        describe('getCurrentCycleStartTime()', function () {
            it('Get the cycle start time', async function () {
                console.log('\t', 'Expected initial price: ', initialPrice);
                const bidderAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';


                var initialStartTime = await auctionItem.getCurrentCycleStartTime();
                expect(initialStartTime).to.equal(0);

                var firstTimeStop = new Date(await auctionItem.getCurrentBlockTime() * 1000);
                await auctionItem.makeNewBid(bidderAddress);
                var secondTimeStop = new Date(await auctionItem.getCurrentBlockTime() * 1000);

                var cycleStartTimeAfterBidMade = await auctionItem.getCurrentCycleStartTime();
                var retrievedCycleTimestamp = new Date(cycleStartTimeAfterBidMade * 1000);


                console.log("\tBlock time: " + retrievedCycleTimestamp);
                console.log("\tFirst time stop: " + firstTimeStop)
                console.log("\tSecond time stop: " + secondTimeStop)

                var diffInSecondsForBlockTime = Math.abs((firstTimeStop.getTime() - secondTimeStop.getTime()) / 1000);
                expect(diffInSecondsForBlockTime).lessThanOrEqual(10);

                expect(retrievedCycleTimestamp).lessThanOrEqual(secondTimeStop);
                expect(firstTimeStop).lessThanOrEqual(retrievedCycleTimestamp);
            })
        });

        describe('getCurrentActivePrice()', function () {
            it('Get the current price', async function () {
                const AuctionItem = await ethers.getContractFactory('AuctionItem');
                const auctionItemTemp = await AuctionItem.deploy(itemAddress, auctionStartTime, auctionSpeed, initialPrice, 5, originalOwnerAddress)


                console.log('\t', 'Expected initial price: ', initialPrice);
                const bidderAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
                var firstBidPrice = await auctionItemTemp.getActivePrice();
                console.log('\t', 'Initial price: ', firstBidPrice);
                await auctionItemTemp.makeNewBid(bidderAddress);

                var secondBidPrice = await auctionItemTemp.getActivePrice();
                console.log('\t', 'Price after bid: ', secondBidPrice);

                expect(firstBidPrice).to.equal(initialPrice);
                expect(secondBidPrice).to.equal(initialPrice * 2);
            })
        });

        describe('getCurrentCycleEndTime()', function () {
            it('Get the cycle end time', async function () {
                console.log('\t', 'Expected initial price: ', initialPrice);
                const bidderAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';


                await auctionItem.makeNewBid(bidderAddress);
                var cycleStartTimeAfterBidMade = await auctionItem.getCurrentCycleStartTime();
                var retrievedCycleStartTimestamp = new Date(cycleStartTimeAfterBidMade * 1000);

                var cycleEndTimeAfterBidMade = await auctionItem.getCurrentCycleEndTime();
                var retrievedCycleEndingTimestamp = new Date(cycleEndTimeAfterBidMade * 1000);


                console.log("\tCycle start time: " + retrievedCycleStartTimestamp);
                console.log("\tCycle end time: " + retrievedCycleEndingTimestamp)

                var diffInSecondsForBlockTime = Math.abs((retrievedCycleEndingTimestamp.getTime() - retrievedCycleStartTimestamp.getTime()) / 1000);
                expect(diffInSecondsForBlockTime).lessThanOrEqual(35);
            })
        });

        describe('isFinished()', function () {
            it('Get whether the auction is finished', async function () {
                const AuctionItem = await ethers.getContractFactory('AuctionItem');
                const auctionItemTemp = await AuctionItem.deploy(itemAddress, auctionStartTime, 0, initialPrice, 5, originalOwnerAddress)

                var isFinishedBeforeEnd = await auctionItemTemp.isFinished();
                console.log('\t', 'isFinished status before end: ', isFinishedBeforeEnd);
                await auctionItemTemp.makeNewBid('0xDEE7796E89C82C36BAdd1375076f39D69FafE252');

                await auctionItemTemp.stopAuction();
                var isFinishedAfterEnd = await auctionItemTemp.isFinished();
                console.log('\t', 'isFinished status after end: ', isFinishedAfterEnd);

                expect(isFinishedBeforeEnd).to.equal(false);
                expect(isFinishedAfterEnd).to.equal(true);
            })
        });

        describe('getCurrentBid()', function () {
            it('Make sure only the currently active bid is returned', async function () {
                const Bid = await ethers.getContractFactory('Bid');
                const [owner] = await ethers.getSigners();
                const firstBidder = owner.address;
                const firstBidTime = 29015;
                const secondBidder = '0xDEE7796E89C82C36BAdd1375076f39D69FafE252';
                const secondBidTime = 29016;
                var firstBid = await Bid.deploy(firstBidder, firstBidTime, itemAddress, biddingPrice);
                var secondBid = await Bid.deploy(secondBidder, secondBidTime, itemAddress, biddingPrice);

                await auctionItem.makeNewBid(firstBid.address);
                var activeFirstBidAddress = await auctionItem.getCurrentBid();
                var activeFirstBid = await Bid.attach(activeFirstBidAddress);
                await auctionItem.makeNewBid(secondBid.address);
                var activeSecondBidAddress = await auctionItem.getCurrentBid();
                var activeSecondBid = await Bid.attach(activeSecondBidAddress);

                expect(await activeFirstBid.getBidderAddress()).to.equal(firstBidder);
                expect(await activeSecondBid.getBidderAddress()).to.equal(secondBidder);
            })
        });


    });
});
