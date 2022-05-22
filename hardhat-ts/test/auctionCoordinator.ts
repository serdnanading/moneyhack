import { ethers, network } from 'hardhat';
import { use, expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';

use(solidity);

describe('AuctionCoordinator tests', function () {
    this.timeout(180000);

    let auctionCoordinator: Contract;

    describe('AuctionCoordinator', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        //const startTime = 29014;//Math.floor(new Date().getTime() / 1000);
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const biddingPrice = 2;
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auctionCoordinator = await ethers.getContractAt('AuctionCoordinator', contractAddress);
                console.log('Connected to external contract', auctionCoordinator.address);
            });
        } else {
            it('Should deploy AuctionCoordinator', async function () {
                //const YourCollectible = await ethers.getContractFactory('YourCollectible');
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');

                const [owner] = await ethers.getSigners();

                auctionCoordinator = await AuctionCoordinator.deploy()
            });
        }

        describe('getActiveBid()', function () {
            it('Get the correct active bid', async function () {
                const Bid = await ethers.getContractFactory('Bid');
                const [owner] = await ethers.getSigners();
                const firstBidder = owner.address;
                const firstBidTime = 29015;
                const secondBidder = '0xDEE7796E89C82C36BAdd1375076f39D69FafE252';
                const secondBidTime = 29016;
                const tokenId = 1;
                var firstBid = await Bid.deploy(firstBidder, firstBidTime, itemAddress, biddingPrice);
                var secondBid = await Bid.deploy(secondBidder, secondBidTime, itemAddress, biddingPrice);
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                const AuctionItem = await ethers.getContractFactory('AuctionItem');

                await auctionCoordinator.setUpAuction(itemAddress, tokenId, originalOwnerAddress, 30, biddingPrice);

                await (await AuctionItem.attach(await auctionCoordinator.getActiveAuction(itemAddress, tokenId))).makeNewBid(firstBid.address);
                await (await AuctionItem.attach(await auctionCoordinator.getActiveAuction(itemAddress, tokenId))).makeNewBid(secondBid.address);

                var retrievedBidAddress = await (await AuctionItem.attach(await auctionCoordinator.getActiveAuction(itemAddress, tokenId))).getCurrentBid();

                var activeBid = await Bid.attach(retrievedBidAddress);

                console.log('\tBid address: ' + activeBid.address);
                console.log('\tCurrent time: ' + (await auctionCoordinator.getAuctionItemCurrentTime(itemAddress, tokenId)));
                console.log('\tCurrent cycle start time: ' + (await auctionCoordinator.getAuctionItemCycleStartTime(itemAddress, tokenId)));
                console.log('\tCurrent cycle end time: ' + (await auctionCoordinator.getAuctionItemCycleEndTime(itemAddress, tokenId)));

                var initialBidPrice = await auctionCoordinator.getAuctionItemInitialBidPrice(itemAddress, tokenId);
                console.log('\tInitial bid price: ' + initialBidPrice);
                var activeBidPrice = await auctionCoordinator.getAuctionItemCurrentBidPrice(itemAddress, tokenId);
                console.log('\tCurrently active bid price: ' + activeBidPrice);
                expect(await activeBidPrice).to.equal(biddingPrice * 3);

                expect(await activeBid.getBidderAddress()).to.equal(secondBidder);
            })
        });

        describe('getActiveAuction()', function () {
            it('Get the correct active item', async function () {
                const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
                const tokenId = 7;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                await auctionCoordinator.setUpAuction(itemAddress, tokenId, originalOwnerAddress, 0, biddingPrice);
                const AuctionItem = await ethers.getContractFactory('AuctionItem');

                var retrievedAuctionItem = await AuctionItem.attach(await auctionCoordinator.getActiveAuction(itemAddress, tokenId));

                expect(await retrievedAuctionItem.getItemAddress()).to.equal(itemAddress);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the correct active item', async function () {
                const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
                const tokenId = 7;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                await auctionCoordinator.setUpAuction(itemAddress, tokenId, originalOwnerAddress, 0, biddingPrice);
                const AuctionItem = await ethers.getContractFactory('AuctionItem');

                var retrievedAuctionItem = await AuctionItem.attach(await auctionCoordinator.getActiveAuction(itemAddress, tokenId));

                expect(await retrievedAuctionItem.getOriginalOwner()).to.equal(originalOwnerAddress);
            })
        });

        describe('settleAuction()', function () {
            it('Get the correct active item', async function () {
                const YourCollectible = await ethers.getContractFactory('YourCollectible');
                var auctionNft = await YourCollectible.deploy();
                const tokenId = 1;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                const itemAddress = auctionNft.address;//'0xE5C1E03225Af47391E51b79D6D149987cde5B222';
                const [owner] = await ethers.getSigners();
                await auctionNft.mintItem(auctionCoordinator.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');

                await auctionCoordinator.setUpAuction(itemAddress, tokenId, originalOwnerAddress, 0, biddingPrice);
                const AuctionItem = await ethers.getContractFactory('AuctionItem');

                var retrievedAuctionItem = await AuctionItem.attach(await auctionCoordinator.getActiveAuction(itemAddress, tokenId));
                var auctionStatusBeforeClosing = await retrievedAuctionItem.isFinished();

                await auctionCoordinator.makeBid(itemAddress, owner.address, tokenId);

                await auctionCoordinator.settleAuction(itemAddress, tokenId);

                var auctionStatusAfterClosing = await retrievedAuctionItem.isFinished();

                expect(auctionStatusBeforeClosing).to.equal(false);
                expect(auctionStatusAfterClosing).to.equal(true);
            })
        });
    });
});
