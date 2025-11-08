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
        _this.setStateVar('submitEnabled', false);
        this.controller.init();
    },
    initRefresh(result) {
        var [messages, summary, rebalance] = result;
        this.setStateVar('messages', messages);
        this.setStateVar('summary', summary);
        this.setStateVar('submitEnabled', rebalance || false);
    },
    render() {
        var _this = this;
        var [messages] = useState([], "messages");
        var [summary] = useState(null, "summary");
        var [submitEnabled, setSubmitEnabled] = useState(false, "submitEnabled");
        useEffect(() => _this.init(), [])
        function onSubmit() {
            if(!confirm("Confirm")) {
                return;
            }
            setSubmitEnabled(false);
            _this.controller.submit();
        }
        return (<>
            <Config />
            {messages.length === 0 && <span>Loading...</span>}
            {messages.map(it => <><span ref={ref => ref && (ref.innerHTML = it)}></span><br/><br/></>)}
            <input type="submit" value="Rebalance" disabled={!submitEnabled} onClick={onSubmit}/>
            {'\u00a0'}
            <a target="_blank" href={"https://basescan.org/address/" + window.localStorage.contractAddress}>Contract</a>
            <br/>
            <br/>
            {summary && <span ref={ref => ref && (ref.innerHTML = summary)}></span>}
        </>
        );
    }
});