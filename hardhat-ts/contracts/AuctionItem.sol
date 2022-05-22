pragma solidity >=0.8.0 <0.9.0;

import './Bid.sol';

contract AuctionItem {
  address private _item;
  uint256 private _auctionStartTime;
  uint256 private _currentCycleStartTime;
  uint256 private _currentCycleEndTime;
  uint256 private _auctionSpeed;
  uint256 private _initialPrice;
  uint256 private _activePrice;
  uint256 private _tokenId;
  mapping(address => Bid) private _bids;
  Bid private _activeBid;
  bool private _isFinished;
  address private _originalOwner;

  constructor(
    address item,
    uint256 auctionStartTime,
    uint256 auctionSpeed,
    uint256 initialPrice,
    uint256 tokenId,
    address originalOwner
  ) {
    _item = item;
    _auctionStartTime = auctionStartTime;
    _auctionSpeed = auctionSpeed;
    _initialPrice = initialPrice;
    _isFinished = false;
    _tokenId = tokenId;
    _originalOwner = originalOwner;
    _currentCycleStartTime = 0;
    _activePrice = initialPrice;
  }

  function getItemAddress() public view returns (address) {
    return _item;
  }

  function getOriginalOwner() public view returns (address) {
    return _originalOwner;
  }

  function getAuctionStartTime() public view returns (uint256) {
    return _auctionStartTime;
  }

  function getAuctionSpeed() public view returns (uint256) {
    return _auctionSpeed;
  }

  function getInitialPrice() public view returns (uint256) {
    return _initialPrice;
  }

  function getActivePrice() public view returns (uint256) {
    return _activePrice;
  }

  function makeNewBid(address newBidAddress) public {
    if (block.timestamp <= _currentCycleEndTime || _currentCycleStartTime == 0) {
      _activeBid = Bid(newBidAddress);
      _currentCycleStartTime = block.timestamp;
      _currentCycleEndTime = block.timestamp + _auctionSpeed;
      _activePrice = (_activePrice + _initialPrice);
    }
  }

  function getCurrentBlockTime() public view returns (uint256) {
    return block.timestamp;
  }

  function getCurrentBid() public view returns (Bid) {
    return _activeBid;
  }

  function stopAuction() public {
    if (block.timestamp > _currentCycleEndTime) {
      _isFinished = true;
    }
  }

  function isFinished() public view returns (bool) {
    return _isFinished;
  }

  function getTokenId() public view returns (uint256) {
    return _tokenId;
  }

  function getCurrentCycleStartTime() public view returns (uint256) {
    return _currentCycleStartTime;
  }

  function getCurrentCycleEndTime() public view returns (uint256) {
    return _currentCycleEndTime;
  }
}
