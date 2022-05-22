import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { FC, useEffect, useState } from 'react';
import { YourCollectible, AuctionCoordinator } from '~~/generated/contract-types';
import { useAppContracts } from '~~/app/routes/main/hooks/useAppContracts';
import { useContractLoader, useContractReader } from 'eth-hooks';
import { useEthersContext } from 'eth-hooks/context';
import { BigNumber, ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { Button, Card, List } from 'antd';
import { Address, AddressInput } from 'eth-components/ant';
import { TTransactor } from 'eth-components/functions';
import { mintJson } from './mint';
import { RightCircleFilled } from '@ant-design/icons';

import { Framework, SuperToken } from "@superfluid-finance/sdk-core";

export interface IYourCollectibleProps {
  mainnetProvider: StaticJsonRpcProvider;
  blockExplorer: string;
  tx?: TTransactor;
}

const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
});
const getFromIPFS = async (cid: string) => {
  const decoder = new TextDecoder();
  let content = '';
  for await (const chunk of ipfs.cat(cid)) {
    content += decoder.decode(chunk);
  }
  return content;
};



export const YourCollectibles: FC<IYourCollectibleProps> = (props: IYourCollectibleProps) => {
  const ethersContext = useEthersContext();
  const appContractConfig = useAppContracts();
  const readContracts = useContractLoader(appContractConfig);
  const writeContracts = useContractLoader(appContractConfig, ethersContext?.signer);
  const { mainnetProvider, blockExplorer, tx } = props;

  const YourCollectibleRead = readContracts['YourCollectible'] as YourCollectible;
  const YourCollectibleWrite = writeContracts['YourCollectible'] as YourCollectible;

  const AuctionCoordinatorRead = readContracts['AuctionCoordinator'] as AuctionCoordinator;
  const AuctionCoordinatorWrite = writeContracts['AuctionCoordinator'] as AuctionCoordinator;

  const balance = useContractReader<BigNumber[]>(YourCollectibleRead, {
    contractName: 'YourCollectible',
    functionName: 'balanceOf',
    functionArgs: [ethersContext.account],
  });
  console.log('balance', balance);
  //
  // 🧠 This effect will update yourCollectibles by polling when your balance changes
  //
  const [yourCollectibles, setYourCollectibles] = useState<any>([]);
  const [biddableItems, setYourBiddables] = useState<any>([]);
  const [minting, setMinting] = useState<boolean>(false);
  const [transferToAddresses, setTransferToAddresses] = useState<{ [key: string]: string }>({});

  const [superfluid, setSuperFluid] = useState<any>();
  const [provider, setProvider] = useState<any>();
  const [DAIx, setDAIx] = useState<any>();
  const biddingPrice = 10;



  useEffect(() => {

    //let timerId = setInterval(() => console.log('10 seconds delay here!'), 5000);
    //setTimeout(() => { clearInterval(timerId); console.log('Timer stops!'); }, 5000);


    const updateYourCollectibles = async () => {
      const collectibleUpdate = [];
      const biddableItems = [];
      if (!balance) return;
      const yourBalance = balance[0]?.toNumber() ?? 0;
      for (let tokenIndex = 0; tokenIndex < yourBalance; tokenIndex++) {
        try {
          console.log('Getting token index', tokenIndex);
          const tokenId = await YourCollectibleRead.tokenOfOwnerByIndex(ethersContext.account ?? '', tokenIndex);
          console.log('tokenId', tokenId);
          const tokenURI = await YourCollectibleRead.tokenURI(tokenId);
          console.log('tokenURI', tokenURI);

          const ipfsHash = tokenURI.replace('https://ipfs.io/ipfs/', '');
          console.log('ipfsHash', ipfsHash);

          const content = await getFromIPFS(ipfsHash);

          try {
            const ipfsObject = JSON.parse(content);
            console.log('ipfsObject', ipfsObject);
            collectibleUpdate.push({ id: tokenId, uri: tokenURI, owner: ethersContext.account, ...ipfsObject });
          } catch (e) {
            console.log(e);
          }
        } catch (e) {
          console.log(e);
        }
      }
      setYourCollectibles(collectibleUpdate);

      var activeTokens = Array();
      for (let i = 1; i < 20; i++) {
        var foundResult = await AuctionCoordinatorRead.getActiveAuctionTokenId(YourCollectibleRead.address, i);
        if (!foundResult.eq(0)) {
          activeTokens.push(i);
          //          console.log("Added: " + foundResult);
        }
        //        console.log("For token " + i + " found " + foundResult);
      }
      for (let tokenIndex = 0; tokenIndex < activeTokens.length; tokenIndex++) {
        try {
          const currentHighestBidder = await AuctionCoordinatorRead.getActiveBidderAddress(YourCollectibleRead.address, activeTokens[tokenIndex]);
          const userIsHighestBidder = currentHighestBidder == ethersContext.account;
          const tokenURI = await YourCollectibleRead.tokenURI(activeTokens[tokenIndex]);
          console.log('tokenURI', tokenURI);

          const ipfsHash = tokenURI.replace('https://ipfs.io/ipfs/', '');
          console.log('ipfsHash', ipfsHash);

          const content = await getFromIPFS(ipfsHash);

          var originalOwner = (await AuctionCoordinatorRead.getOriginalOwner(YourCollectibleWrite.address, activeTokens[tokenIndex])) == ethersContext.account;

          var currentTime = new Date(Number(await AuctionCoordinatorRead.getAuctionItemCurrentTime(YourCollectibleWrite.address, activeTokens[tokenIndex])) * 1000).getTime();
          var endTime = new Date(Number(await AuctionCoordinatorRead.getAuctionItemCycleEndTime(YourCollectibleWrite.address, activeTokens[tokenIndex])) * 1000).getTime();
          var distance = endTime - currentTime;
          var auctionWinner = false;
          if (distance < 0 && userIsHighestBidder) {
            auctionWinner = true;
          }

          try {
            const ipfsObject = JSON.parse(content);
            console.log('ipfsObject', ipfsObject);
            biddableItems.push({
              id: activeTokens[tokenIndex], originalOwner: originalOwner, userIsHighestBidder: userIsHighestBidder,
              highestBidder: currentHighestBidder, auctionWinner: auctionWinner, uri: tokenURI, owner: ethersContext.account, ...ipfsObject
            });
          } catch (e) {
            console.log(e);
          }
        } catch (e) {
          console.log(e);
        }
      }
      // Set up superfluid
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const sf = await Framework.create({
        chainId: Number(chainId),
        provider: provider,
      });
      const DAIxContract = await sf.loadSuperToken("fDAIx");
      const DAIx = DAIxContract.address;

      setSuperFluid(sf);
      setProvider(provider);
      setDAIx(DAIx);
      setYourBiddables(biddableItems);


    };
    updateYourCollectibles();
    //altCall();
    //    altFlow(/*ethersContext.account*/"0x119117fb67285be332c3511E52b25441172cf129", 20);
    //    createNewFlow(ethersContext.account, 20);
  }, [ethersContext.account, balance]);

  async function createFlow(recipient, flowRate) {
    try {
      const signer = provider.getSigner();
      const createFlowOperation = superfluid.cfaV1.createFlow({
        receiver: recipient,
        flowRate: flowRate,
        superToken: DAIx
      });

      console.log("Creating your stream...");

      const result = await createFlowOperation.exec(signer);
      console.log(result);

      console.log(
        `Congrats - you've just created a money stream!
                View Your Stream At: https://app.superfluid.finance/dashboard/${recipient}
                Network: Kovan
                Super Token: DAIx
                Sender: 0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721
                Receiver: ${recipient},
                FlowRate: ${flowRate}
                `
      );
    } catch (error) {
      console.log(
        "Hmmm, your transaction threw an error. Make sure that this stream does not already exist, and that you've entered a valid Ethereum address!"
      );
      console.error(error);
    }
  }

  const [mintCount, setMintCount] = useState<number>(0);
  const mintItem = async () => {
    if (!tx || !ethersContext.account) return;

    // upload to ipfs
    const uploaded = await ipfs.add(JSON.stringify(mintJson[mintCount]));
    setMintCount(mintCount + 1);
    console.log('Uploaded Hash: ', uploaded);
    await tx(YourCollectibleWrite.mintItem(ethersContext.account, uploaded.path), (update) => {
      console.log('📡 Transaction Update:', update);
      if (update && (update.status === 'confirmed' || update.status === 1)) {
        console.log(' 🍾 Transaction ' + update.hash + ' finished!');
        console.log(
          ' ⛽️ ' +
          update.gasUsed +
          '/' +
          (update.gasLimit || update.gas) +
          ' @ ' +
          parseFloat(update.gasPrice) / 1000000000 +
          ' gwei'
        );
      }
    });
  };

  async function beneficiaryAddress(itemAddress, tokenId) {
    var address = await AuctionCoordinatorRead.getActiveBidderAddress(itemAddress, tokenId);
    if (address == YourCollectibleRead.address) {
      return await AuctionCoordinatorRead.getOriginalOwner(itemAddress, tokenId);
    } else {
      return await AuctionCoordinatorRead.getActiveBidderAddress(itemAddress, tokenId);
    }
  }

  return (
    <>
      <div style={{ width: 640, margin: 'auto', marginTop: 32, paddingBottom: 32 }}>

      </div>
      <div><p>Your items:</p></div>
      <div style={{ width: 640, margin: 'auto', marginTop: 32, paddingBottom: 32, }}>
        <List
          bordered
          dataSource={yourCollectibles}
          renderItem={(item: any) => {
            const id = item.id.toNumber();
            return (
              <List.Item key={id + '_' + item.uri + '_' + item.owner}>
                <Card
                  title={
                    <div>
                      <span style={{ fontSize: 16, marginRight: 8 }}>#{id}</span> {item.name}
                    </div>
                  }>
                  <div>
                    <img src={item.image} style={{ maxWidth: 150 }} />
                  </div>
                  <div>{item.description}</div>
                </Card>

                <div>
                  <Button
                    shape="round"
                    size="large"
                    onClick={async () => {
                      await YourCollectibleWrite.approve(AuctionCoordinatorWrite.address, id);
                      //                      await YourCollectibleWrite.transferFrom(item.owner, AuctionCoordinatorWrite.address, id);
                      await AuctionCoordinatorWrite.setUpAuction(YourCollectibleWrite.address, id, ethersContext.account, 40, 1000);
                    }}>
                    Start auction
                  </Button>

                  <Button
                    shape="round"
                    size="large"
                    onClick={async () => {
                      await YourCollectibleWrite.transferFrom(item.owner, AuctionCoordinatorWrite.address, id);
                    }}>
                    Transfer
                  </Button>
                </div>
              </List.Item>
            );
          }}
        />
      </div>
      <div><p>Auction items:</p></div>
      <div style={{ width: 640, margin: 'auto', marginTop: 32, paddingBottom: 32 }}>
        <List
          bordered
          dataSource={biddableItems}
          renderItem={(item: any) => {
            const id = item.id;
            let timerId = setInterval(async (tokenId, nftAddress) => {
              const currentHighestBidder = await AuctionCoordinatorRead.getActiveBidderAddress(nftAddress, tokenId);
              const userIsHighestBidder = currentHighestBidder == ethersContext.account;

              var currentTime = new Date(Number(await AuctionCoordinatorRead.getAuctionItemCurrentTime(nftAddress, tokenId)) * 1000).getTime();
              var endTime = new Date(Number(await AuctionCoordinatorRead.getAuctionItemCycleEndTime(nftAddress, tokenId)) * 1000).getTime();
              var distance = endTime - currentTime

              var flowInfo = await superfluid.cfaV1.getNetFlow({
                account: ethersContext.account,
                providerOrSigner: provider,
                superToken: DAIx
              })

              // Time calculations for days, hours, minutes and seconds
              var days = Math.floor(distance / (1000 * 60 * 60 * 24));
              var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              var seconds = Math.floor((distance % (1000 * 60)) / 1000);
              var flowPaymentHtml = userIsHighestBidder ? "<p>You're currently paying " + (flowInfo * -1) + " DAIx a month.</p>" : ""
              var highestBidderHtml = userIsHighestBidder ? "<p>You are the current highest bidder</p>" : "";
              var activeBid = Number((await AuctionCoordinatorRead.getAuctionItemCurrentBidPrice(nftAddress, tokenId))) / 1000000000000000000;
              var bidStep = Number((await AuctionCoordinatorRead.getAuctionItemInitialBidPrice(nftAddress, tokenId))) / 1000000000000000000;
              var bidMessage = "<p>Current bid at " + activeBid + " - next bid will move it to " + (activeBid + bidStep) + "</p>";
              document.getElementById(tokenId + nftAddress).innerHTML = flowPaymentHtml + bidMessage + highestBidderHtml + "<p>Time left: " + hours + "h " + minutes + "m " + seconds + "s</p>";
              if (distance < 0) {
                var finalHtml = userIsHighestBidder ? "<p>You've won</p>" : "Expired - you didn't win";
                if (nftAddress == await AuctionCoordinatorRead.getActiveBidderAddress(nftAddress, tokenId)) {
                  finalHtml = "<p>No bids have been placed!<p/>";
                }
                document.getElementById(tokenId + nftAddress).innerHTML = finalHtml;
              }
            }, 10000, id, YourCollectibleWrite.address);
            return (
              <List.Item key={id + '_' + item.uri + '_' + item.owner}>
                <Card
                  title={
                    <div>
                      <span style={{ fontSize: 16, marginRight: 8 }}>#{id}</span> {item.name}
                    </div>
                  }>
                  <div>
                    <img src={item.image} style={{ maxWidth: 150 }} />
                  </div>
                  <div>{item.description}</div>
                </Card>

                <div>
                  {(() => {
                    if (!item.originalOwner) {
                      if (!item.userIsHighestBidder) {
                        return (<Button
                          //disabled={minting || mintCount >= mintJson.length - 1}
                          shape="round"
                          size="large"
                          onClick={async () => {
                            var nextBeneficiaryAddress = await beneficiaryAddress(YourCollectibleWrite.address, id);
                            await AuctionCoordinatorWrite.makeBid(YourCollectibleWrite.address, ethersContext.account!, id);
                            //await createFlow(AuctionCoordinatorWrite.address, biddingPrice);
                            await createFlow(nextBeneficiaryAddress, biddingPrice);
                          }}>
                          Bid (Open a stream for 10 DAIx)
                        </Button>)
                      }
                    }
                  })()}

                  {(() => {
                    if (item.auctionWinner) {
                      return (<Button
                        shape="round"
                        size="large"
                        onClick={async () => {
                          var originalOwner = await AuctionCoordinatorRead.getOriginalOwner(YourCollectibleWrite.address, id);
                          var winningBid = await AuctionCoordinatorRead.getAuctionItemCurrentBidPrice(YourCollectibleWrite.address, id);
                          await createFlow(originalOwner, biddingPrice);
                          const tx = {
                            from: ethersContext.account!,
                            to: originalOwner,
                            value: winningBid,
                            nonce: provider.getTransactionCount(ethersContext.account!, "latest"),
                            gasLimit: 1000000,
                            gasPrice: 500000,
                          }
                          await ethersContext?.signer.sendTransaction(tx).then((transaction) => {
                            console.dir(transaction)
                          })
                          await AuctionCoordinatorWrite.settleAuction(YourCollectibleWrite.address, id);

                        }}>
                        Close Auction
                      </Button>)
                    }
                  })()}
                  <div id={id + YourCollectibleWrite.address}>
                    <p>Loading remaining time...</p>
                  </div>


                </div>
              </List.Item>
            );
          }}
        />
      </div>
    </>
  );
};
