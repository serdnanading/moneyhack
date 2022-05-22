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

describe('Auction', function () {
    this.timeout(180000);

    let auctionNft: Contract;

    // console.log("hre:",Object.keys(hre)) // <-- you can access the hardhat runtime env here

    describe('Sample Auction', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auctionNft = await ethers.getContractAt('YourCollectible', contractAddress);
                console.log('     🛰 Connected to external contract', auctionNft.address);
            });
        } else {
            it('Should deploy YourCollectible', async function () {
                const YourCollectible = await ethers.getContractFactory('YourCollectible');
                auctionNft = await YourCollectible.deploy();
            });
        }

        /*
        Create auction coordinator.
        3 players - item owner, 2 bidders
        owner owns the NFT
        owner creates auction
        1st bidder places bid
        2nd bidder places bid
        1st bidder places bid
        auction finishes
        1st bidder transfers NFT ownership to themselves
        old owner doesn't own item anymore
        */
        describe('Test out auction process()', function () {
            it('NFT should be owned by winner of auction', async function () {
                //const itemOwner = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                const AuctionItem = await ethers.getContractFactory('AuctionItem');
                const Bid = await ethers.getContractFactory('Bid');
                var auctionCoordinator = await AuctionCoordinator.deploy()
                var auctionSpeed = 2;
                var initialBidPrice = 3;

                const [owner, bidder1, bidder2] = await ethers.getSigners();

                console.log('\t', 'Tester Address: ', owner.address);
                console.log('\t', 'Bidder1 Address: ', bidder1.address);
                console.log('\t', 'Bidder2 Address: ', bidder2.address);

                const startingNftBalance = await auctionNft.balanceOf(owner.address);
                console.log('\t', 'Starting balance: ', startingNftBalance.toNumber());

                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                /*
                    Owner will own the NFT
                */
                console.log('\t', 'Minting...');
                const mintResult = await auctionNft.mintItem(owner.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');
                var tokenId = startingNftBalance.add(1);
                var nftOwner = await auctionNft.ownerOf(tokenId);
                // Make sure we have correct owner.
                expect(owner.address).to.equal(nftOwner);
                console.log('\t', 'Correct owner has been set up!');

                /*
                    Start auction
                */
                await auctionCoordinator.setUpAuction(auctionNft.address, tokenId, originalOwnerAddress, auctionSpeed, initialBidPrice);
                await auctionNft.approve(auctionCoordinator.address, tokenId);
                await auctionNft.transferFrom(owner.address, auctionCoordinator.address, tokenId);
                // Make sure ownership has been transferred
                expect(await auctionNft.ownerOf(tokenId)).to.equal(auctionCoordinator.address);
                expect(await auctionCoordinator.getActiveAuctionTokenId(auctionNft.address, tokenId)).to.equal(tokenId);
                console.log('\t', 'Auction has started');

                /*
                    Simulate a bidding war
                */
                auctionCoordinator.makeBid(auctionNft.address, bidder1.address, tokenId);
                auctionCoordinator.makeBid(auctionNft.address, bidder2.address, tokenId);
                console.log('\t', 'Bidding has finished');
                console.log('\tCurrent time before pausing: ' + new Date((await auctionCoordinator.getAuctionItemCurrentTime(auctionNft.address, tokenId)) * 1000));
                console.log('\tCurrent cycle start time before pausing: ' + new Date((await auctionCoordinator.getAuctionItemCycleStartTime(auctionNft.address, tokenId)) * 1000));
                console.log('\tCurrent cycle end time before pausing: ' + new Date((await auctionCoordinator.getAuctionItemCycleEndTime(auctionNft.address, tokenId)) * 1000));
                const date = Date.now();
                let currentDate = null;
                do {
                    currentDate = Date.now();
                } while (currentDate - date < (auctionSpeed * 10) * 1000);

                /*
                    Finish auction
                */
                console.log('\t', 'Coordinator address: ', auctionCoordinator.address);
                console.log('\t', 'NFT owner: ', await auctionNft.ownerOf(tokenId));
                await auctionCoordinator.settleAuction(auctionNft.address, tokenId);
                console.log('\t', 'Auction has been closed!');
                console.log('\tCurrent time after pausing: ' + new Date((await auctionCoordinator.getAuctionItemCurrentTime(auctionNft.address, tokenId)) * 1000));
                console.log('\tCurrent cycle start time after pausing: ' + new Date((await auctionCoordinator.getAuctionItemCycleStartTime(auctionNft.address, tokenId)) * 1000));
                console.log('\tCurrent cycle end time after pausing: ' + new Date((await auctionCoordinator.getAuctionItemCycleEndTime(auctionNft.address, tokenId)) * 1000));

                /*
                    Check correct ownership has been transferred
                */
                var originalOwnership = await auctionCoordinator.getOriginalOwner(auctionNft.address, tokenId);
                expect(originalOwnership).to.equal(originalOwnerAddress);
                var retrievedBidAddress =
                    await (await Bid.attach(
                        await (
                            await AuctionItem.attach(
                                await auctionCoordinator.getActiveAuction(auctionNft.address, tokenId)
                            )
                        ).getCurrentBid()
                    )
                    ).getBidderAddress();
                expect(retrievedBidAddress).to.equal(bidder2.address);
                var retrievedBidAddressThroughCoordinator = await auctionCoordinator.getActiveBidderAddress(auctionNft.address, tokenId);
                expect(retrievedBidAddressThroughCoordinator).to.equal(bidder2.address);
                console.log('\t', 'Correct bidder won the auction!');

                var isAuctionFinished =
                    await (
                        await AuctionItem.attach(
                            await auctionCoordinator.getActiveAuction(auctionNft.address, tokenId)
                        )
                    ).isFinished();
                expect(isAuctionFinished).to.equal(true);
                var finalBidPrice = await auctionCoordinator.getAuctionItemCurrentBidPrice(auctionNft.address, tokenId);
                console.log('\t', 'Final price for the item: ' + finalBidPrice);
                expect(finalBidPrice).to.equal(initialBidPrice * 3);
                console.log('\t', 'The auction was finished');
                var nftOwnerAfterAuction = await auctionNft.ownerOf(tokenId);
                console.log('\t', 'Final owner: ', nftOwnerAfterAuction);
                expect(nftOwnerAfterAuction).to.equal(bidder2.address);
                console.log('\t', 'Ownership of the NFT was correctly transferred!');
            });
        });
    });
});
