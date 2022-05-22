pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

import './Bid.sol';
import './AuctionItem.sol';

contract AuctionCoordinator {
  mapping(address => mapping(uint256 => AuctionItem)) private _auctions;

  constructor() {}

  /*
    Bidder needs to make a bid on an existing item
    a new Bid would need to be created
  */
  function makeBid(
    address item,
    address bidder,
    uint256 tokenId
  ) public {
    AuctionItem(_auctions[item][tokenId]).makeNewBid(address(new Bid(bidder, block.timestamp, item, 15)));
  }

  /*
    Return the currently active bid
  */
  function getActiveBid(address item, uint256 tokenId) public view returns (Bid) {
    return AuctionItem(_auctions[item][tokenId]).getCurrentBid();
  }

  function getActiveBidderAddress(address item, uint256 tokenId) public view returns (address) {
    if (address(_auctions[item][tokenId]) != address(0x0)) {
      if (address(AuctionItem(_auctions[item][tokenId]).getCurrentBid()) != address(0x0)) {
        return Bid(AuctionItem(_auctions[item][tokenId]).getCurrentBid()).getBidderAddress();
      }
    }
    return item;
    //return Bid(AuctionItem(_auctions[item]).getCurrentBid()).getBidderAddress();
  }

  function getOriginalOwner(address item, uint256 tokenId) public view returns (address) {
    return AuctionItem(_auctions[item][tokenId]).getOriginalOwner();
  }

  function getAuctionItemCycleStartTime(address item, uint256 tokenId) public view returns (uint256) {
    return AuctionItem(_auctions[item][tokenId]).getCurrentCycleStartTime();
  }

  function getAuctionItemCycleEndTime(address item, uint256 tokenId) public view returns (uint256) {
    return AuctionItem(_auctions[item][tokenId]).getCurrentCycleEndTime();
  }

  function getAuctionItemCurrentTime(address item, uint256 tokenId) public view returns (uint256) {
    return AuctionItem(_auctions[item][tokenId]).getCurrentBlockTime();
  }

  function getAuctionItemCurrentBidPrice(address item, uint256 tokenId) public view returns (uint256) {
    return AuctionItem(_auctions[item][tokenId]).getActivePrice();
  }

  function getAuctionItemInitialBidPrice(address item, uint256 tokenId) public view returns (uint256) {
    return AuctionItem(_auctions[item][tokenId]).getInitialPrice();
  }

  /*
    Return the currently active auction
  */
  function getActiveAuction(address item, uint256 tokenId) public view returns (AuctionItem) {
    return _auctions[item][tokenId];
  }

  function getActiveAuctionTokenId(address item, uint256 tokenId) public view returns (uint256) {
    if (address(_auctions[item][tokenId]) != address(0x0) && !_auctions[item][tokenId].isFinished()) return _auctions[item][tokenId].getTokenId();
    return 0;
  }

  /*
    Seller needs to set up NFT and transfer ownership to contract.
    The contract should start the auction process.
  */
  function setUpAuction(
    address itemAddress,
    uint256 tokenId,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice
  ) public {
    _auctions[itemAddress][tokenId] = new AuctionItem(itemAddress, block.timestamp, auctionSpeed, initialBidPrice, tokenId, originalOwner);
  }

  // receive income
  function settleAuction(address item, uint256 itemId) public {
    AuctionItem(_auctions[item][itemId]).stopAuction();
    ERC721(item).approve(Bid(AuctionItem(_auctions[item][itemId]).getCurrentBid()).getBidderAddress(), itemId);
    ERC721(item).transferFrom(address(this), Bid(AuctionItem(_auctions[item][itemId]).getCurrentBid()).getBidderAddress(), itemId);
  }
}
