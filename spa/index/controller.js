var IndexController = function(view) {
    var context = this;
    context.view = view;

    var tickerConverter = {
        "EURC" : "€",
        "USDC" : "$"
    }

    context.rebalance = function rebalance() {
        return prepareAndSendTx(context.manager.methods.rebalance(context.toRebalance));
    }

    context.claimReward = function claimReward() {
        return prepareAndSendTx(context.manager.methods.claimReward(window.localStorage.referenceTokenAddress));
    }

    async function prepareAndSendTx(method) {
        context.timeout && clearTimeout(context.timeout);
        var account = web3.eth.accounts.privateKeyToAccount(window.localStorage.privateKey);
        var gas = await method.estimateGas({from : account.address});
        gas = parseInt(gas) * 1.3;
        gas = parseInt(gas);
        gas = numberToString(gas);
        gas = web3.utils.numberToHex(gas);
        var tx = {
            to: method._parent.options.address,
            data: method.encodeABI(),
            gas,
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
            context.manager = context.manager || new web3.eth.Contract(window.context.ManagerABI, window.localStorage.contractAddress);
            context.codeAddress = context.codeAddress || await context.manager.methods.code().call();
            context.from = context.from || web3.eth.accounts.privateKeyToAccount(window.localStorage.privateKey).address;
            context.toRebalance = [];
            var manager = context.manager;
            var from = context.from;
            var rebalanceMinutes = parseInt(window.localStorage.rebalanceMinutes);
            var {oldTimestamp, oldBlockNumber, rebalanceSeconds} = await retrieveOldBlockNumberAndTimestamp(rebalanceMinutes);
            var referenceTokenAddress = window.localStorage.referenceTokenAddress;
            var referenceTokenDecimals = abi.decode(["uint8"], await call(referenceTokenAddress, "decimals"))[0];
            var referenceTokenTicker = abi.decode(["string"], await call(referenceTokenAddress, "symbol"))[0];
            referenceTokenTicker = (tickerConverter[referenceTokenTicker] || referenceTokenTicker) + " ";
            var profitAndLoss = web3.utils.toBN(toDecimals(parseFloat(window.localStorage.profitAndLoss || 0), referenceTokenDecimals));

            var historicalData;
            var globalStatus = await manager.methods.status(referenceTokenAddress).call();
            var data = globalStatus.statuses;
            try {
                historicalData = await manager.methods.status(referenceTokenAddress).call(undefined, web3.utils.numberToHex(oldBlockNumber));
                historicalData = historicalData.statuses;
            } catch(e) {}

            var claimRewardResult = await manager.methods.claimReward(referenceTokenAddress).call({from});

            var perc = parseFloat(fromDecimals(claimRewardResult.participationPercentage, 18, true));
            
            var nextSeasonReward = globalStatus.nextSeasonReward;
            nextSeasonReward = parseInt(nextSeasonReward) * perc;
            nextSeasonReward = numberToString(nextSeasonReward).split('.')[0];
            
            var nextRebalanceDate = new Date(globalStatus.nextRebalanceEvent * 1000);
            var nextRebalance = timeRemaining(nextRebalanceDate);
            nextRebalance = `${[(nextRebalance.days && (nextRebalance.days + " day" + (nextRebalance.days === 1 ? "" : "s"))), (nextRebalance.hours && (nextRebalance.hours + " hour" + (nextRebalance.hours === 1 ? "" : "s"))), (nextRebalance.minutes && (nextRebalance.minutes + " minute" + (nextRebalance.minutes === 1 ? "" : "s")))].filter(it => it !== 0).join(', ')} (${formatDate(nextRebalance.targetDate)})`;
            nextRebalance = nextRebalance.split(' (-)').join('');

            var claimableReward = claimRewardResult.claimedReward;
            var profitAndLoss = claimRewardResult.updatedProfitAndLoss;
            var heritage = '0';
            if(claimRewardResult.participationPercentage !== '0') {
                var removeLiquidityResult = await manager.methods.removeLiquidity(numberToString(1e18), referenceTokenAddress).call({from});
                claimableReward = removeLiquidityResult.claimedReward;
                profitAndLoss = removeLiquidityResult.updatedProfitAndLoss;
                heritage = removeLiquidityResult.removedAmount;
            }

            var rebalance = false;
            var claimReward = claimableReward != '0';

            var daily = parseFloat(fromDecimals(nextSeasonReward, referenceTokenDecimals, true));
            nextRebalanceDate = dateInfo(nextRebalanceDate);
            daily /= nextRebalanceDate.daysPassed;
            var weekly = daily * 6.65;
            var monthly = weekly * 4.33;
            var yearly = monthly * 12;

            var balance = fromDecimals(abi.decode(["uint256"], await call(referenceTokenAddress, "balanceOf(address)", context.from))[0].toString(), referenceTokenDecimals, true);
            var balanceOfETH = fromDecimals(await manager.methods.ethValueOf(context.from, referenceTokenAddress).call(), referenceTokenDecimals, true);

            var messages = [];

            for(var i in data) {
                var warningZoneTimeout = false;
                if(data[i].result !== '0') {
                    rebalance = true;
                    context.toRebalance.push(data[i].poolAddress);
                }
                if(data[i].result !== '0' && (parseInt(oldTimestamp) - parseInt(data[i].positionTime) >= rebalanceSeconds) && historicalData && historicalData[i].result === data[i].result) {
                    warningZoneTimeout = true;
                }
                var statusResult = parseInt(data[i].result);
                var bounds = [...data[i].bounds].sort((a,b) => parseInt(web3.utils.toBN(a).sub(web3.utils.toBN(b))));
                var lowerBound = bounds[0];
                var upperBound = bounds[bounds.length - 1];
                data[i].currentPrice !== '0' && bounds.push(data[i].currentPrice);
                data[i].positionPrice !== '0' && bounds.push(data[i].positionPrice);
                data[i].leftBound !== '0' && bounds.push(data[i].leftBound);
                data[i].rightBound !== '0' && bounds.push(data[i].rightBound);
                bounds = bounds.filter((it, i, arr) => arr.indexOf(it) === i).sort((a,b) => parseInt(web3.utils.toBN(a).sub(web3.utils.toBN(b))));
                var prices = bounds.map(() => '0');
                try {
                    prices = await sqrtToOutputPrice(manager.options.address, data[i].poolAddress, bounds, referenceTokenAddress);
                } catch(e) {}
                var reverse = parseInt(prices[0]) > parseInt(prices[prices.length - 1]);
                if(reverse) {
                    bounds = bounds.reverse();
                    prices = prices.reverse();
                    statusResult *= -1;
                }
                prices = prices.map(it => fromDecimals(it, referenceTokenDecimals));
                var token0 = abi.decode(["address"], await call(data[i].poolAddress, "token0"))[0];
                var symbol0 = abi.decode(["string"], await call(token0, "symbol"))[0];
                var token1 = abi.decode(["address"], await call(data[i].poolAddress, "token1"))[0];
                var symbol1 = abi.decode(["string"], await call(token1, "symbol"))[0];
                var message = "";
                var sqrtPriceX96Message = "";
                var leftBound = "[(";
                var rightBound = ")]";
                for(var z in bounds) {
                    var sqrtPriceX96 = bounds[z = parseInt(z)];
                    var price = prices[z] === '0' ? sqrtPriceX96 : referenceTokenTicker + prices[z];
                    message += putSpaceBefore(message);
                    sqrtPriceX96Message += putSpaceBefore(sqrtPriceX96Message);

                    if(sqrtPriceX96 === lowerBound || sqrtPriceX96 === upperBound) {
                        message += price;
                        sqrtPriceX96Message += sqrtPriceX96;
                    } else if(sqrtPriceX96 === data[i].leftBound) {
                        message += ((reverse ? "(" : "") + price + (reverse ? "" : ")"));
                        sqrtPriceX96Message += ((reverse ? "(" : "") + sqrtPriceX96 + (reverse ? "" : ")"));
                    } else if(sqrtPriceX96 === data[i].currentPrice) {
                        if(z === bounds.length - 1) {
                            message += (rightBound + " ");
                            sqrtPriceX96Message += (rightBound + " ");
                            rightBound = "";
                        }
                        message += ("-> " + price + " <-");
                        sqrtPriceX96Message += ("-> " + sqrtPriceX96 + " <-");
                        if(z === 0) {
                            message += (" " + leftBound);
                            sqrtPriceX96Message += (" " + leftBound);
                            leftBound = "";
                        }
                    } else if(sqrtPriceX96 === data[i].positionPrice) {
                        message += ("{" + price + "}");
                        sqrtPriceX96Message += ("{" + sqrtPriceX96 + "}");   
                    } else if(sqrtPriceX96 === data[i].rightBound) {
                        message += ((reverse ? "" : "(") + price + (reverse ? ")" : ""));
                        sqrtPriceX96Message += ((reverse ? "" : "(") + sqrtPriceX96 + (reverse ? ")" : ""));
                    }
                }
                
                message = leftBound + message + rightBound;
                sqrtPriceX96Message = leftBound + sqrtPriceX96Message + rightBound;
                //console.log(symbol0 + "/" + symbol1, data[i].poolAddress, "Status:", statusResult, "\n\n", message, "\n\n", sqrtPriceX96Message, "\n");

                messages.push(`${data[i].poolAddress} ${reverse ? symbol1 : symbol0}/${reverse ? symbol0 : symbol1} Status: ${(statusResult !== 0 ? "<b>" : "") + statusResult + (statusResult !== 0 ? "</b>" : "") + (warningZoneTimeout ? " <b><u>[WARNING ZONE TIMEOUT]</u></b>" : "")}<br/>${message.split('-> ').join('<b>-> ').split(' <-').join(' <-</b>')}`);
            }
            
            var summary = {
                "Next season in" : nextRebalance,
                "Collecting approx." : `${referenceTokenTicker}${formatMoney(yearly)}/y, ${referenceTokenTicker}${formatMoney(monthly)}/m, ${referenceTokenTicker}${formatMoney(weekly)}/w, ${referenceTokenTicker}${formatMoney(daily)}/d (${referenceTokenTicker + formatMoney(fromDecimals(nextSeasonReward, referenceTokenDecimals, true), 4)})`,
                "Balance" : `${referenceTokenTicker + formatMoney(balance, 2)} - ETH ${referenceTokenTicker + formatMoney(balanceOfETH, 2)}`,
                "Your farming position" : formatMoney(perc * 100, 2) + "%",
                "Your heritage" : referenceTokenTicker + fromDecimals(heritage, referenceTokenDecimals),
                "Claimable reward" : referenceTokenTicker + fromDecimals(claimableReward, referenceTokenDecimals, true),
                "Your P&L" : referenceTokenTicker + fromDecimals(profitAndLoss, referenceTokenDecimals)
            };
            //console.log(summary);
            summary = JSON.stringify(summary, null, 4).split('\n').join('<br/>').split(' ').join('&nbsp;');
        
            context.view.emit('initRefresh', [messages, summary, rebalance, claimReward]);
        } catch(e) {
            console.log(e);
        }
        context.timeout = setTimeout(context.init, (parseInt(window.localStorage.timeout) || 5) * 1000);
    };

    async function call(to, method) {
        var args = [];
        for(var i in arguments) {
            if(parseInt(i) < 2) {
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

    async function sqrtToOutputPrice(to, poolAddress, prices, outputTokenAddress) {
        try {
            var data = (web3.utils.sha3("sqrtToOutputPrice(address,uint160[],address)").substring(0, 10)) + abi.encode(["address", "uint160[]", "address"], [poolAddress, prices, outputTokenAddress]).substring(2);
            data = await web3.eth.call({
                to,
                data
            });
            data = abi.decode(["uint256[]"], data)[0];
            data = [...data].map(it => it.toString());
            return data;
        } catch(e) {
            console.log("PoolAddress", poolAddress, "prices", prices);
            console.trace(e);
            throw e;
        }
    }
    
    function putSpaceBefore(message) {
        return message !== '' && message[message.length - 1] !== ' ' ? " " : "";
    }

    async function retrieveOldBlockNumberAndTimestamp(rebalanceMinutes) {
        var rebalanceSeconds = rebalanceMinutes * 60;
        var blockNumber = await web3.eth.getBlock('latest');
        var actualTimestamp = parseInt(blockNumber.timestamp);
        blockNumber = parseInt(blockNumber.number);
        var times = 30;
        var oldBlockNumber;
        var oldTimestamp;
        while(true) {
            var oldBlockNumber = await web3.eth.getBlock(blockNumber - times);
            var oldTimestamp = parseInt(oldBlockNumber.timestamp);
            oldBlockNumber = parseInt(oldBlockNumber.number);
            var timestampDifference = actualTimestamp - oldTimestamp;
            if(timestampDifference >= rebalanceSeconds) {
                break;
            }
            times += parseInt(rebalanceSeconds / (timestampDifference / (blockNumber - oldBlockNumber)));
        }
        return {oldBlockNumber, oldTimestamp, rebalanceSeconds};
    }

    function timeRemaining(targetDate) {
        var diff = targetDate.getTime() - new Date().getTime();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
        var minutes = Math.floor(diff / 60000);
        var days = Math.floor(minutes / 1440);
        minutes -= days * 1440;
        var hours = Math.floor(minutes / 60);
        minutes -= hours * 60;
        return { targetDate, days, hours, minutes };
    }

    function dateInfo(d){
        var sevenDaysBefore = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
        var now = new Date();
        var daysPassed = (now.getTime() - sevenDaysBefore.getTime()) / (24 * 60 * 60 * 1000);
        return {
            original : d,
            sevenDaysBefore : sevenDaysBefore,
            daysPassed : daysPassed
        };
    }

    function formatDate(dateInput) {
        var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        var dd = String(dateInput.getDate()).padStart(2,"0");
        var mm = String(dateInput.getMonth() + 1).padStart(2,"0");
        var yyyy = dateInput.getFullYear();
        var hh = String(dateInput.getHours()).padStart(2,"0");
        var min = String(dateInput.getMinutes()).padStart(2,"0");
        return days[dateInput.getDay()] + ", " + dd + "/" + mm + "/" + yyyy + " " + hh + ":" + min;
    }

    function weeksToEndOfYear(d){
        var shifted = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
        var endOfYear = new Date(shifted.getFullYear(), 11, 31, 23, 59, 59, 999);
        var weeksRemaining = Math.ceil((endOfYear.getTime() - shifted.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return {original : d, shiftedDate : shifted, weeksRemaining : weeksRemaining};
    }

    var wasHidden;
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    function handleVisibility() {
        if(document.visibilityState === 'hidden' && !wasHidden) {
            return wasHidden = true;
        }
        if(document.visibilityState === 'visible' && wasHidden) {
            wasHidden = false;
            context.init();
        }
    }
};