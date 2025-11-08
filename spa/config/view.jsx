var Config = React.createClass({
    render() {
        var _this = this;
        var [toggle, setToggle] = useState(false);
        var [nodeUrl, setNodeUrl] = useState(window.localStorage.nodeUrl);
        var [privateKey, setPrivateKey] = useState(window.localStorage.privateKey);
        var [contractAddress, setContractAddress] = useState(window.localStorage.contractAddress);
        var [usdcDecimals, setUSDCDecimals] = useState(window.localStorage.usdcDecimals);
        var [tolerance, setTolerance] = useState(window.localStorage.tolerance);
        var [curveLength, setCurveLength] = useState(window.localStorage.curveLength);
        var [timeout, setTimeout] = useState(window.localStorage.timeout);
        var submit = function submit() {
            window.localStorage.setItem("nodeUrl", nodeUrl);
            window.localStorage.setItem("privateKey", privateKey);
            window.localStorage.setItem("contractAddress", contractAddress);
            window.localStorage.setItem("usdcDecimals", usdcDecimals);
            window.localStorage.setItem("tolerance", isNaN(tolerance) ? 0 : tolerance);
            window.localStorage.setItem("curveLength", isNaN(curveLength) ? 0 : curveLength);
            window.localStorage.setItem("timeout", isNaN(timeout) ? 0 : timeout);
            _this.emit('configUpdate');
        };
        useEffect(() => {
            setNodeUrl(window.localStorage.nodeUrl);
            setPrivateKey(window.localStorage.privateKey);
            setContractAddress(window.localStorage.contractAddress);
            setUSDCDecimals(window.localStorage.usdcDecimals);
            setTolerance(window.localStorage.tolerance);
            setCurveLength(window.localStorage.curveLength);
            setTimeout(window.localStorage.timeout);
        }, [toggle]);
        return (
            <div className="w3-theme-dark w3-bar w3-card-2">
                {!toggle &&  <label className="w3-bar-item">
                    <input type="submit" value="Configuration" onClick={() => setToggle(true)}/>
                </label>}
                {toggle && <>
                    <label className="w3-bar-item">
                        Node URL:
                        <input type="text" value={nodeUrl} onChange={e => setNodeUrl(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        Private Key:
                        <input type="text" value={privateKey} onChange={e => setPrivateKey(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        Contract address:
                        <input type="text" value={contractAddress} onChange={e => setContractAddress(e.currentTarget.value)}/>
                    </label>
                    <label className="w3-bar-item">
                        USDC Decimals:
                        <input type="number" value={usdcDecimals} onChange={e => setUSDCDecimals(parseInt(e.currentTarget.value))}/>
                    </label>
                    <label className="w3-bar-item">
                        Tolerance:
                        <input type="number" min={0} max={100} step={1} value={tolerance} onChange={e => setTolerance(parseInt(e.currentTarget.value))}/>
                    </label>
                    <label className="w3-bar-item">
                        Curve Length:
                        <input type="number" min={0} max={100} step={1} value={curveLength} onChange={e => setCurveLength(parseInt(e.currentTarget.value))}/>
                    </label>
                    <label className="w3-bar-item">
                        Timeout:
                        <input type="number" value={timeout} onChange={e => setTimeout(parseInt(e.currentTarget.value))}/>
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