var IndexController = function(view) {
    var context = this;
    context.view = view;

    context.submit = async function submit() {
        context.timeout && clearTimeout(context.timeout);
        var account = web3.eth.accounts.privateKeyToAccount(window.localStorage.privateKey);
        
        var tolerance = window.localStorage.tolerance;
        var size = window.localStorage.curveLength;
        var txData = context.code.methods.perform(tolerance, size).encodeABI();
        var tx = {
            to: context.code.options.address,
            data: txData,
            gas: await context.code.methods.perform(tolerance, size).estimateGas({from: account.address}),
            gasPrice: await web3.eth.getGasPrice()
        };
        var signed = await web3.eth.accounts.signTransaction(tx, window.localStorage.privateKey);
        try {
            var receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
            console.log(receipt);
            await new Promise(ok => setTimeout(ok, 2000));
            window.open('https://basescan.org/tx/' + receipt.transactionHash, '_blank');
        } catch(e) {
            console.log(e);
            alert("Error: " + (e.message || e).toString());
        }        
        context.init();
    }

    context.init = async function init() {
        context.timeout && clearTimeout(context.timeout);
        try {
            !web3.currentProvider && web3.setProvider(new web3.providers.HttpProvider(window.localStorage.nodeUrl)); 
            context.code = context.code || new web3.eth.Contract(window.context.CodeABI, window.localStorage.contractAddress);
            context.from = context.from || web3.eth.accounts.privateKeyToAccount(window.localStorage.privateKey).address;
            var code = context.code;
            var from = context.from;
            var tolerance = window.localStorage.tolerance;
            var usdcDecimals = window.localStorage.usdcDecimals;
            var data = await code.methods.ticksDiagnostic(tolerance).call();

            var investment = web3.utils.toBN('0');
            var heritage = web3.utils.toBN('0');

            var rebalance = false;

            var messages = [];

            for(var i in data) {
                var result = await code.methods.facade(data[i].poolAddress, 0, 0, 0, 0, 0).call({ from });
                investment = investment.add(web3.utils.toBN(result.investment));
                heritage = heritage.add(web3.utils.toBN(result.heritage));
                rebalance = rebalance || (data[i].tickStatus !== '0');
                var invert = data[i].invert;
                var tickStatus = data[i].tickStatus === '0' ? 0 : parseInt(data[i].tickStatus) * (invert ? -1 : 1);
                var sortedTicks = [...data[i].sortedTicks].filter((it, i, arr) => arr.indexOf(it) === i);
                var t = [...sortedTicks, data[i].currentTick];
                data[i].leftBound !== '0' && t.push(data[i].leftBound);
                data[i].rightBound !== '0' && t.push(data[i].rightBound);
                data[i].positionTick !== '0' && t.push(data[i].positionTick);
                t = t.map(it => parseInt(it)).sort((a,b) => invert ? b - a : a - b).map(it => it.toString()).filter((it, i, arr) => arr.indexOf(it) === i);
                var message = "";
                var prices = await ticksToUSDC(code, data[i].poolAddress, t);
                prices = prices.map(it => fromDecimals(it, usdcDecimals));
                var tickMessage = "";
                var token0 = abi.decode(["address"], await call(data[i].poolAddress, "token0"))[0];
                var symbol0 = abi.decode(["string"], await call(token0, "symbol"))[0];
                var token1 = abi.decode(["address"], await call(data[i].poolAddress, "token1"))[0];
                var symbol1 = abi.decode(["string"], await call(token1, "symbol"))[0];
                for(var z in t) {
                    var tick = t[z];
                    var price = prices[z];
                    message += putSpaceBefore(message);
                    tickMessage += putSpaceBefore(tickMessage);

                    if(tick === sortedTicks[0] || tick === sortedTicks[sortedTicks.length - 1]) {
                        message += "$" + price;
                        tickMessage += tick;
                    } else if(tick === data[i].leftBound) {
                        message += ((invert ? "(" : "") + "$" + price + (invert ? "" : ")"));
                        tickMessage += ((invert ? "(" : "") + tick + (invert ? "" : ")"));
                    } else if(tick === data[i].currentTick) {
                        message += ("-> " + "$" + price + " <-");
                        tickMessage += ("-> " + tick + " <-");   
                    } else if(tick === data[i].positionTick) {
                        message += ("{" + "$" + price + "}");
                        tickMessage += ("{" + tick + "}");   
                    } else if(tick === data[i].rightBound) {
                        message += ((invert ? "" : "(") + "$" + price + (invert ? ")" : ""));
                        tickMessage += ((invert ? "" : "(") + tick + (invert ? ")" : ""));
                    }
                }
            
                message = "[(" + message + ")]";
                tickMessage = "[(" + tickMessage + ")]";
                //console.log(symbol0 + "/" + symbol1, data[i].poolAddress, "Status:", tickStatus, "\n\n", message, "\n\n", tickMessage, "\n");

                messages.push(`${data[i].poolAddress} ${invert ? symbol1 : symbol0}/${invert ? symbol0 : symbol1} Status: ${tickStatus}<br/>${message.split('-> ').join('<b>-> ').split(' <-').join(' <-</b>')}`);
            }
            
            var summary = {
                investment : "$" + fromDecimals(investment.toString(), usdcDecimals),
                heritage : "$" + fromDecimals(heritage.toString(), usdcDecimals),
                difference : "$" + fromDecimals(heritage.sub(investment).toString(), usdcDecimals, true)
            };
            //console.log(summary);
            summary = JSON.stringify(summary, null, 4).split('\n').join('<br/>').split(' ').join('&nbsp;');
        
            context.view.emit('initRefresh', [messages, summary, rebalance]);
        } catch(e) {
            console.log(e);
        }
        context.timeout = setTimeout(context.init, (parseInt(window.localStorage.timeout) || 5) * 1000);
    };

    async function call(to, method) {
        var args = [];
        for(var i in arguments) {
            if(parseInt(i) < 3) {
                continue;
            }
            args.push(arguments[i]);
        }
        if(method[method.length - 1] !== ')') {
            method += '()';
        }
        var data = web3.utils.sha3(method).substring(0, 10);
        if(method[method.length - 2] !== '(') {
            var argsList = method.split('(')[1];
            argsList = argsList.substring(0, argsList.length - 1);
            argsList = argsList.split(',');
            data += abi.encode(argsList, args).substring(2);
            args = args.splice(argsList.length + 1);
        }
        var callOptions = {
            to,
            data
        };
        args.length != 0 && (callOptions.from = args[args.length - 1]);
        var response = await web3.eth.call(callOptions);
        return response;
    }

    async function ticksToUSDC(code, poolAddress, ticks) {
        var data = (web3.utils.sha3("ticksToUSDC(address,int24[])").substring(0, 10)) + abi.encode(["address", "int24[]"], [poolAddress, ticks]).substring(2);
        data = await web3.eth.call({
            to : code.options.address,
            data
        });
        data = abi.decode(["uint256[]"], data)[0];
        data = [...data].map(it => it.toString());
        return data;
    }
    
    function putSpaceBefore(message) {
        return message !== '' && message[message.length - 1] !== ' ' ? " " : "";
    }
};