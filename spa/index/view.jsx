var Index = React.createClass({
    requiredModules: [
        'spa/config'
    ],
    getDefaultSubscriptions() {
        return {
            'configUpdate': this.init,
            'initRefresh' : this.initRefresh
        }
    },
    init() {
        var _this = this;
        _this.setStateVar('rebalanceEnabled', false);
        this.controller.init();
    },
    initRefresh(result) {
        var [messages, summary, rebalance, claimReward] = result;
        this.setStateVar('messages', messages);
        this.setStateVar('summary', summary);
        this.setStateVar('rebalanceEnabled', rebalance || false);
        this.setStateVar('claimRewardEnabled', claimReward || false);
    },
    render() {
        var _this = this;
        var [messages] = useState([], "messages");
        var [summary] = useState(null, "summary");
        var [rebalanceEnabled, setRebalanceEnabled] = useState(false, "rebalanceEnabled");
        var [claimRewardEnabled, setClaimRewardEnabled] = useState(false, "claimRewardEnabled");
        useEffect(() => _this.init(), [])
        function onRebalance() {
            if(!confirm("Rebalance?")) {
                return;
            }
            setRebalanceEnabled(false);
            _this.controller.rebalance();
        }
        function onClaimReward() {
            if(!confirm("Claim reward?")) {
                return;
            }
            setClaimRewardEnabled(false);
            _this.controller.claimReward();
        }
        return (<>
            <Config />
            {summary && <>
                <span ref={ref => ref && (ref.innerHTML = summary)}></span>
                <br/><br/>
                <input type="submit" value="Claim reward" disabled={!claimRewardEnabled} onClick={onClaimReward}/>
            </>}
            {'\u00a0'}
            <input type="submit" value="Rebalance" disabled={!rebalanceEnabled} onClick={onRebalance}/>
            {'\u00a0'}
            <a target="_blank" href={"https://basescan.org/address/" + (_this.controller.manager && _this.controller.manager.options.address)}>Manager</a>
            {"\u00a0"}
            <a target="_blank" href={"https://basescan.org/address/" + (_this.controller.code && _this.controller.code.options.address)}>Code</a>
            <br/>
            <br/>
            {messages.length === 0 && <span>Loading...</span>}
            {messages.map(it => <><span ref={ref => ref && (ref.innerHTML = it)}></span><br/><br/></>)}
        </>
        );
    }
});