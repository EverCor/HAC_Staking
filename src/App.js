import './App.css';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from 'react';
import 'sf-font';
import axios from 'axios';
import ABI from './ABI.json';
import VAULTABI from './VAULTABI.json';
import TOKENABI from './TOKENABI.json';
import { NFTCONTRACT, STAKINGCONTRACT, etherscanapi, moralisapi } from './config';
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import WalletLink from "walletlink";
import Web3 from 'web3';
import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import styled from "styled-components"

var account = null;
var contract = null;
var vaultcontract = null;
var web3 = null;

const Web3Alc = createAlchemyWeb3("https://eth-rinkeby.alchemyapi.io/v2/8AX5AP2TU6G45ctsOXNt8K4Fz_BkhhZG");

const moralisapikey = "pC41kxQ1eakXfyd0ME3DEgmGGkTxQnF0iLLygWMeeDni2mLrGoKmNw5hxUKWIWHC";
const etherscanapikey = "TEZKFS8M7ZK4ZHPHEATRNGDCSFMD6CCJSH";

const providerOptions = {
  binancechainwallet: {
    package: true
  },
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: "3cf2d8833a2143b795b7796087fff369"
    }
  },
  walletlink: {
    package: WalletLink,
    options: {
      appName: "Net2Dev NFT Minter",
      infuraId: "3cf2d8833a2143b795b7796087fff369",
      rpc: "",
      chainId: 4,
      appLogoUrl: null,
      darkMode: true
    }
  },
};

const web3Modal = new Web3Modal({
  network: "rinkeby",
  theme: "dark",
  cacheProvider: true,
  providerOptions
});

export const StyledLogo = styled.img`
  width: 160px;
  @media (min-width: 767px) {
    width: 200px;
  }
  transition: width 0.5s;
  transition: height 0.5s;
`;

export const StyledPic = styled.img`
  width: 330px;
  @media (min-width: 767px) {
    width: 400px;
  }
`;

class App extends Component {
  constructor() {
    super();
    this.state = {
      balance: [],
      nftdata: [],
      rawearn: [],
    };
  }

  handleModal() {
    this.setState({ show: !this.state.show })
  }

  handleNFT(nftamount) {
    this.setState({ outvalue: nftamount.target.value });
  }

  async componentDidMount() {

    await axios.get((etherscanapi + `?module=stats&action=tokensupply&contractaddress=${NFTCONTRACT}&apikey=${etherscanapikey}`))
      .then(outputa => {
        this.setState({
          balance: outputa.data
        })
        console.log(outputa.data)
      })
    let config = { 'X-API-Key': moralisapikey, 'accept': 'application/json' };
    await axios.get((moralisapi + `/nft/${NFTCONTRACT}/owners?chain=mumbai&format=decimal`), { headers: config })
      .then(outputb => {
        const { result } = outputb.data
        this.setState({
          nftdata: result
        })
        console.log(outputb.data)
      })
  }


  render() {
    const { outvalue } = this.state;

    const sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    const expectedBlockTime = 10000;

    async function connectwallet() {
      var provider = await web3Modal.connect();
      web3 = new Web3(provider);
      await provider.send('eth_requestAccounts');
      var accounts = await web3.eth.getAccounts();
      account = accounts[0];
      document.getElementById('wallet-address').textContent = account;
      contract = new web3.eth.Contract(ABI, NFTCONTRACT);
      vaultcontract = new web3.eth.Contract(VAULTABI, STAKINGCONTRACT);
      var getstakednfts = await vaultcontract.methods.tokensOfOwner(account).call();
      document.getElementById('yournfts').textContent = getstakednfts;
      var getbalance = Number(await vaultcontract.methods.balanceOf(account).call());
      document.getElementById('stakedbalance').textContent = getbalance;
      const arraynft = Array.from(getstakednfts.map(Number));
      const tokenid = arraynft.filter(Number);
      var rwdArray = [];
      tokenid.forEach(async (id) => {
        var rawearn = await vaultcontract.methods.earningInfo(account, [id]).call();
        var array = Array.from(rawearn.map(Number));
        console.log(array);
        array.forEach(async (item) => {
          var earned = String(item).split(",")[0];
          var earnedrwd = Web3.utils.fromWei(earned);
          var rewardx = Number(earnedrwd).toFixed(2);
          var numrwd = Number(rewardx);
          console.log(numrwd);
          rwdArray.push(numrwd);
        });
      });
      function delay() {
        return new Promise(resolve => setTimeout(resolve, 300));
      }
      async function delayedLog(item) {
        await delay();
        var sum = item.reduce((a, b) => a + b, 0);
        var formatsum = Number(sum).toFixed(2);
        document.getElementById('earned').textContent = formatsum;
      }
      async function processArray(rwdArray) {
        for (const item of rwdArray) {
          await delayedLog(item);
        }
      }
      return processArray([rwdArray]);
    }

    async function claimit() {
      var tokenids = Number(document.querySelector("[name=claimid]").value);
      vaultcontract.methods.claim([tokenids]).send({ from: account });
    }

    async function stakeit() {
      var tokenids = Number(document.querySelector("[name=stkid]").value);
      vaultcontract.methods.stake([tokenids]).send({ from: account });
    }

    async function unstakeit() {
      var tokenids = Number(document.querySelector("[name=stkid]").value);
      vaultcontract.methods.unstake([tokenids]).send({ from: account });
    }

    async function enable() {
      contract.methods.setApprovalForAll(STAKINGCONTRACT, true).send({ from: account });
    }
    async function verify() {
      var getbalance = Number(await vaultcontract.methods.balanceOf(account).call());
      document.getElementById('stakedbalance').textContent = getbalance;
      console.log(getbalance)
    }

    async function rewardinfo() {
      var tokenid = Number(document.querySelector("[name=claimid]").value);
      var rawearn = await vaultcontract.methods.earningInfo(account, ([tokenid])).call();
      var earned = String(rawearn).split(",")[0];
      var earnedrwd = Web3.utils.fromWei(earned);
      var rewards = Number(earnedrwd).toFixed(2);
      document.getElementById('earned').textContent = rewards;
    }

    async function mint0() {
      var _pid = "0";
      var erc20address = await contract.methods.getCryptotoken(_pid).call();
      var currency = new web3.eth.Contract(TOKENABI, erc20address);
      var mintRate = await contract.methods.getNFTCost(_pid).call();
      var _mintAmount = Number(outvalue);
      var totalAmount = mintRate * _mintAmount;
      await Web3Alc.eth.getMaxPriorityFeePerGas().then((tip) => {
        Web3Alc.eth.getBlock('pending').then((block) => {
          var baseFee = Number(block.baseFeePerGas);
          var maxPriority = Number(tip);
          var maxFee = maxPriority + baseFee;
          currency.methods.approve(NFTCONTRACT, String(totalAmount))
            .send({
              from: account
            })
            .then(currency.methods.transfer(NFTCONTRACT, String(totalAmount))
              .send({
                from: account,
                maxFeePerGas: maxFee,
                maxPriorityFeePerGas: maxPriority
              },
                async function (error, transactionHash) {
                  console.log("Transfer Submitted, Hash: ", transactionHash)
                  let transactionReceipt = null
                  while (transactionReceipt == null) {
                    transactionReceipt = await web3.eth.getTransactionReceipt(transactionHash);
                    await sleep(expectedBlockTime)
                  }
                  window.console = {
                    log: function (str) {
                      var out = document.createElement("div");
                      out.appendChild(document.createTextNode(str));
                      document.getElementById("txout").appendChild(out);
                    }
                  }
                  console.log("Transfer Complete", transactionReceipt);
                  contract.methods.mintpid(account, _mintAmount, _pid)
                    .send({
                      from: account,
                      maxFeePerGas: maxFee,
                      maxPriorityFeePerGas: maxPriority
                    });
                }));
        });
      });
    }

    return (
      <div className="App nftapp">
        <nav class="navbar navbarfont navbarglow navbar-expand-md navbar-dark bg-dark mb-4">
          <div class="container-fluid" style={{ fontFamily: "SF Pro Display" }}>
            <a class="navbar-brand px-5" style={{ fontWeight: "800", fontSize: '25px' }} href="#"></a><StyledLogo alt={"HAC"} src={"logo.webp"} />
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarCollapse">
              <ul class="navbar-nav me-auto mb-2 px-3 mb-md-0" style={{ fontSize: "25px" }}>
                <li class="nav-item">
                  <a class="nav-link active" aria-current="page" href="#">Dashboard</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="https://nftkey.app/collections/horrorapeclub/">Trade NFTs</a>
                </li>
              </ul>
            </div>
          </div>
          <div className='px-5'>
            <input id="connectbtn" type="button" className="connectbutton" onClick={connectwallet} style={{ fontFamily: "SF Pro Display" }} value="Connect Your Wallet" />
          </div>
        </nav>
        <div className='container container-style' style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
          <div className='col'>
            <body className='nftstaker border-0'>
              <form style={{ fontFamily: "SF Pro Display" }} >
                <h2 style={{ borderRadius: '14px', fontWeight: "300", fontSize: "25px" }}>HAC NFT Staking Vault </h2>
                <h6 style={{ fontWeight: "300" }}>First time staking?</h6>
                <Button onClick={enable} className="btn" style={{ backgroundColor: "#ffffff10", boxShadow: "1px 1px 5px #000000" }} >Authorize Your Wallet</Button>
                <br/>
                <div className="row px-3">
                <StyledPic alt={"HAC"} src={"art.png"} />
                  <div className="col">
                    <br/><br/><br/>
                    <form class="stakingrewards" style={{ borderRadius: "25px", boxShadow: "1px 1px 15px #ffffff" }}>
                      <h5 style={{ color: "#FFFFFF", fontWeight: '300' }}>Your Vault Activity</h5>
                      <h6 style={{ color: "#FFFFFF" }}>Verify Staked Amount</h6>
                      <Button style={{ backgroundColor: "#ffffff10", boxShadow: "1px 1px 5px #000000" }} >Verify</Button>
                      <table className='table mt-3 mb-5 px-3 table-dark'>
                        <tr>
                          <td style={{ fontSize: "19px" }}>Your Staked NFTs:
                            <span style={{ backgroundColor: "#ffffff00", fontSize: "21px", color: "#147aff", fontWeight: "500", textShadow: "1px 1px 2px #000000" }} id='yournfts'></span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: "19px" }}>Total Staked NFTs:
                            <span style={{ backgroundColor: "#ffffff00", fontSize: "21px", color: "#147aff", fontWeight: "500", textShadow: "1px 1px 2px #000000" }} id='stakedbalance'></span>
                          </td>
                        </tr>
                      </table>
                    </form>
                  </div>
                  
             <form>
                <div className="row pt-3">
                  <div>
                    <h1 className="pt-2" style={{ fontWeight: "30" }}>HAC Staking</h1>
                  </div>
                  <h6>Your Wallet Address</h6>
                  <div className="pb-3" id='wallet-address' style={{
                    color: "#147aff",
                    fontWeight: "400",
                    textShadow: "1px 1px 1px black",
                  }}>
                    <label for="floatingInput">Please Connect Wallet</label>
                  </div>
                </div>
                <h4 style={{ color: "#FFFFFF" }}>Staking Vault</h4>
                <div class="card" style={{ marginTop: "3px", boxShadow: "1px 1px 4px #000000"}}>
                  <input type="number" name="stkid" placeholder='Input NFT ID' style={{ textAlign: "center" }} />
                  <Button onClick={stakeit} className='mb-3' style={{ backgroundColor: "purple", boxShadow: "1px 1px 5px #000000" }} >STAKE</Button>
                  <Button onClick={unstakeit} className='mb-3' style={{ backgroundColor: "purple", boxShadow: "1px 1px 5px #000000" }} > UNSTAKE</Button>
                </div>
                <br/>
                <br/>
              </form>


                  <div className="col">

                    <form class="stakingrewards" style={{ borderRadius: "25px", boxShadow: "1px 1px 15px #ffffff" }}>
                      <h5 style={{ color: "#FFFFFF" }}> Staking Rewards</h5>
                      <Button onClick={rewardinfo} className='mb-3' style={{ backgroundColor: "#ffffff10", boxShadow: "1px 1px 5px #000000" }} >Earned HAC Tickets</Button>
                      <div id='earned' style={{ color: "#147aff", marginTop: "5px", fontSize: '25px', fontWeight: 'bold', textShadow: "1px 1px 2px #000000" }}><p style={{ fontSize: "20px" }}>Earned Tokens</p></div>
                      <input name="claimid" style={{ color: "#147aff", fontSize: '25px', fontWeight: 'bold', textShadow: "1px 1px 2px #000000", width: '50px', backgroundColor: '#00000000' }} />
                      <label className="col-4" style={{ color: 'white' }}>NFT ID</label>
                      <div className='col-12 mt-2'>
                        <div style={{ color: 'white' }}>Claim Rewards</div>
                        <Button onClick={claimit} className='mb-3' style={{ backgroundColor: "#ffffff10", boxShadow: "1px 1px 5px #000000" }} >Claim</Button>
                      </div>
                    </form>
                  </div>
                </div>
                <div className="row px-4 pt-2">
                  <div class="header">
                    <div style={{ fontSize: '25px', borderRadius: '14px', color: "#ffffff", fontWeight: "300" }}>HAC NFT Staking Pool Active Rewards</div>
                    <table className='table px-3 table-bordered table-dark'>
                      <thead className='thead-light'>
                        <tr>
                          <th scope="col">Collection</th>
                          <th scope="col">Rewards Per Day</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>HAC 3333 Collection</td>
                          <td class="amount" data-test-id="rewards-summary-ads">
                            <span class="amount">10</span>&nbsp;<span class="currency">HACT</span>&nbsp;<span class="currency">PER NFT</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            </body>
          </div>
        </div>
      </div>
    )
  }
}
export default App;
