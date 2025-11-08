var Config = React.createClass({
    render() {
        var _this = this;
        var [toggle, setToggle] = useState(false);
        var [nodeUrl, setNodeUrl] = useState(window.localStorage.nodeUrl);
        var [privateKey, setPrivateKey] = useState(window.localStorage.privateKey);
        var [contractAddress, setContractAddress] = useState(window.localStorage.contractAddress);
        var [referenceTokenAddress, setreferenceTokenAddress] = useState(window.localStorage.referenceTokenAddress);
        var [timeout, setTimeout] = useState(window.localStorage.timeout);
        var [profitAndLoss, setProfitAndLoss] = useState(window.localStorage.profitAndLoss);
        var [rebalanceMinutes, setRebalanceMinutes] = useState(window.localStorage.rebalanceMinutes);
        var submit = function submit() {
            window.localStorage.setItem("nodeUrl", nodeUrl);
            window.localStorage.setItem("privateKey", privateKey);
            window.localStorage.setItem("contractAddress", contractAddress);
            window.localStorage.setItem("referenceTokenAddress", referenceTokenAddress);
            window.localStorage.setItem("timeout", isNaN(timeout) ? 0 : timeout);
            window.localStorage.setItem("profitAndLoss", isNaN(profitAndLoss) ? 0 : profitAndLoss);
            window.localStorage.setItem("rebalanceMinutes", isNaN(rebalanceMinutes) ? 0 : rebalanceMinutes);
            _this.emit('configUpdate');
        };
        useEffect(() => {
            setNodeUrl(window.localStorage.nodeUrl);
            setPrivateKey(window.localStorage.privateKey);
            setContractAddress(window.localStorage.contractAddress);
            setreferenceTokenAddress(window.localStorage.referenceTokenAddress);
            setTimeout(window.localStorage.timeout);
            setProfitAndLoss(window.localStorage.profitAndLoss);
            setRebalanceMinutes(window.localStorage.rebalanceMinutes);
        }, [toggle]);
        return (
            <div className="w3-theme-dark w3-bar w3-card-2">
                {!toggle &&  <label className="w3-bar-item">
                    <input type="submit" value="Configuration" onClick={() => setToggle(true)}/>
                </label>}
                {toggle && <>
                    <label className="w3-bar-item">
                        Node URL:
                        <input type="password" value={nodeUrl} onChange={e => setNodeUrl(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        Private Key:
                        <input type="password" value={privateKey} onChange={e => setPrivateKey(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        Contract address:
                        <input type="text" value={contractAddress} onChange={e => setContractAddress(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        Reference Token address:
                        <input type="text" value={referenceTokenAddress} onChange={e => setreferenceTokenAddress(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        Timeout:
                        <input type="number" value={timeout} onChange={e => setTimeout(parseInt(e.currentTarget.value))}/>
                    </label>
                    <label className="w3-bar-item">
                        Profit And Loss:
                        <input type="number" value={profitAndLoss} onChange={e => setProfitAndLoss(parseInt(e.currentTarget.value))}/>
                    </label>
                    <label className="w3-bar-item">
                        Rebalance minutes:
                        <input type="number" value={rebalanceMinutes} onChange={e => setRebalanceMinutes(parseInt(e.currentTarget.value))}/>
                    </label>
                    <label className="w3-bar-item">
                        <input type="submit" onClick={submit}/>
                    </label>
                    <label className="w3-bar-item">
                        <input type="submit" value="Close" onClick={() => setToggle(false)}/>
                    </label>
                </>}
            </div>
        );
    }
});