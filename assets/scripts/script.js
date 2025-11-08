window.voidEthereumAddress = '0x0000000000000000000000000000000000000000';
window.voidBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
window.oldUrlRegex = new RegExp("(https?:\\/\\/[^\s]+)", "gs");
window.urlRegex = new RegExp("(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$", "gs");
window.solidityImportRule = new RegExp("import( )+\"(\\d+)\"( )*;", "gs");
window.pragmaSolidityRule = new RegExp("pragma( )+solidity( )*(\\^|>)\\d+.\\d+.\\d+;", "gs");
window.base64Regex = new RegExp("data:([\\S]+)\\/([\\S]+);base64", "gs");

window.web3util = new Web3Browser();
window.web3 = new Web3Browser();
window.abi = new window.ethers.utils.AbiCoder();

if ('WebSocket' in window) {
    var OldWebSocket = WebSocket;
    WebSocket = function(address) {
        window.webSocket = new OldWebSocket(address);
        setTimeout(function() {
            var oldOnMessage = window.webSocket.onmessage;
            window.webSocket.onmessage = function onnessage(msg) {
                if (msg.data === 'connected') {
                    return;
                }
                if (msg.data == 'refreshcss') {
                    return oldOnMessage(msg);
                }
                var regex = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/`
                var requiredScripts = document.getElementsByXPath('//script[contains(@src, "assets/scripts/script.js") or @data-src or (contains(@src, "spa/") and not(contains(@src, "spa/boot.js")))]').map(it => ((it.parentNode.removeChild(it).dataset && it.dataset.src) || it.src).split(regex).join(''));
                window.scriptsLoaded = !window.scriptsLoaded ? undefined : window.scriptsLoaded.filter(it => requiredScripts.indexOf(it.split(regex).join('')) === -1);
                delete ReactModuleLoader.promises;
                window.loadedModules && Object.keys(window.loadedModules).forEach(it => {
                    delete window[it];
                    delete window["_" + it];
                    delete window[it + "Controller"];
                    delete window["_" + it + "Controller"];
                });
                delete window.loadedModules;
                delete window.controllerPool;
                ScriptLoader.load({
                    scripts: requiredScripts,
                    callback: function() {
                        try {
                            window.refreshReactRootInstances();
                        } catch (e) {
                            return oldOnMessage(msg);
                        }
                    }
                });
            }
        }, 300);
        return window.webSocket;
    }
}

window.onload = function onload() {
    window.loadContext().then(Boot);
};

window.deepCopy = function deepCopy(data, extension) {
    data = data || {};
    extension = extension || {};
    var keys = Object.keys(extension);
    for (var i in keys) {
        var key = keys[i];
        if (!data[key]) {
            data[key] = extension[key];
            continue;
        }
        try {
            if (Object.keys(data[key]).length > 0 && Object.keys(extension[key]).length > 0) {
                data[key] = deepCopy(data[key], extension[key]);
                continue;
            }
        } catch (e) {}
        data[key] = extension[key];
    }
    return data;
};

window.AJAXRequest = function AJAXRequest(link, timeout, toU) {
    var toUpload = toU !== undefined && toU !== null && typeof toU !== 'string' ? JSON.stringify(toU) : toU;
    var xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
    return new Promise(function(ok, ko) {
        var going = true;
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                if (going) {
                    going = false;
                    var response = xmlhttp.responseText;
                    try {
                        response = JSON.parse(response);
                    } catch (e) {}
                    ok(response);
                }
                try {
                    xmlhttp.abort();
                } catch (e) {
                    console.error(e);
                }
            }
        }
        xmlhttp.onloadend = function onloadend() {
            if (!xmlhttp.status || xmlhttp.status >= 300) {
                return ko(xmlhttp.status);
            }
        };
        xmlhttp.open(toUpload ? 'POST' : 'GET', link + (link.indexOf('?') === -1 ? '?' : '&') + ('cached_' + new Date().getTime()) + '=' + (new Date().getTime()), true);
        try {
            toUpload ? xmlhttp.send(toUpload) : xmlhttp.send();
        } catch (e) {
            return ko(e);
        }
        (timeout !== undefined && timeout !== null) && setTimeout(function() {
            if (!going) {
                return;
            }
            going = false;
            try {
                xmlhttp.abort();
            } catch (e) {
                console.error(e);
            }
            ko();
        }, timeout);
    });
};

window.getEtherscanAddress = function getEtherscanAddress(postFix, chainId) {
    chainId = chainId || window.chainId;
    var address = 'http://etherscan.io';
    if (chainId) {
        address = 'http://';
        if (chainId === 8453) {
            address += 'basescan.org';
        } else if (chainId === 56) {
            address += 'bscscan.com';
        } else if (chainId === 146) {
            address += 'sonicscan.org';
        } else {
            var idToNetwork = {
                1: '',
                3: 'ropsten',
                4: 'rinkeby',
                5: 'goerli',
                10: 'optimistic',
                42: 'kovan'
            }
            var prefix = idToNetwork[chainId];
            prefix && (prefix += '.');
            address += prefix || '';
            address += 'etherscan.io';
        }
    }
    postFix && (address += ('/' + postFix));
    return address;
};

window.loadContext = async function loadContext() {
    var context = await window.AJAXRequest('data/context.json');
    var localContext = {};
    try {
        localContext = await window.AJAXRequest('data/context.local.json');
    } catch (e) {
        console.clear && console.clear();
    }
    return window.context = window.deepCopy(context, localContext);
};

window.onEthereumUpdate = function onEthereumUpdate(millis) {
    window.ethereum && (window.ethereum.enable = () => window.ethereum.request({ method: 'eth_requestAccounts' }));
    window.ethereum && window.ethereum.autoRefreshOnNetworkChange && (window.ethereum.autoRefreshOnNetworkChange = false);
    window.ethereum && window.ethereum.on && (!window.ethereum._events || !window.ethereum._events.accountsChanged || window.ethereum._events.accountsChanged.length === 0) && window.ethereum.on('accountsChanged', window.onEthereumUpdate);
    window.ethereum && window.ethereum.on && (!window.ethereum._events || !window.ethereum._events.chainChanged || window.ethereum._events.chainChanged.length === 0) && window.ethereum.on('chainChanged', window.onEthereumUpdate);
    return new Promise(function(ok) {
        setTimeout(async function() {
            var reset = false;
            if (!window.networkId || window.networkId !== parseInt(window.ethereum.chainId)) {
                delete window.contracts;
                window.web3 = await window.createWeb3(window.context.blockchainConnectionString || window.ethereum);
                window.networkId = await window.web3.eth.net.getId();
                window.web3ForLogs = await window.createWeb3(window.getNetworkElement("blockchainConnectionForLogString") || window.web3.currentProvider);
                var network = window.context.ethereumNetwork[window.networkId];
                if (network === undefined || network === null) {
                    return alert('This network is actually not supported!');
                }
                reset = true;
            }
            delete window.walletAddress;
            try {
                window.walletAddress = (await window.web3.eth.getAccounts())[0];
            } catch (e) {}
            window.publish('ethereum/update', reset);
            return ok(window.web3);
        }, !isNaN(millis) ? millis : 550);
    });
};

window.createWeb3 = async function createWeb3(connectionProvider) {
    var web3 = new window.Web3Browser(connectionProvider);
    web3.currentProvider.setMaxListeners && web3.currentProvider.setMaxListeners(0);
    web3.eth.transactionBlockTimeout = 999999999;
    web3.eth.transactionPollingTimeout = new Date().getTime();
    web3.startBlock = await web3.eth.getBlockNumber();
    return web3;
};

window.getAddress = async function getAddress() {
    await window.ethereum.enable();
    return (window.walletAddress = window.context.walletAddress || (await window.web3.eth.getAccounts())[0]);
};

window.getSendingOptions = function getSendingOptions(transaction, value) {
    return new Promise(async function(ok, ko) {
        var lastGasLimit = (await window.web3.eth.getBlock('latest')).gasLimit;
        if (transaction) {
            var from = await window.getAddress();
            var nonce = await window.web3.eth.getTransactionCount(from);
            return window.bypassEstimation ? ok({
                nonce,
                from,
                gas: window.gasLimit || lastGasLimit,
                value
            }) : transaction.estimateGas({
                    nonce,
                    from,
                    value,
                    gas: lastGasLimit,
                    gasLimit: lastGasLimit
                },
                function(error, gas) {
                    if (error) {
                        return ko(error.message || error);
                    }
                    return ok({
                        nonce,
                        from,
                        gas: gas || window.gasLimit || lastGasLimit,
                        value
                    });
                });
        }
        return ok({
            from: window.walletAddress || null,
            gas: window.gasLimit || lastGasLimit
        });
    });
};

window.createContract = async function createContract(abi, data) {
    var args = [];
    if (arguments.length > 2) {
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
    }
    var from = await window.getAddress();
    data = window.newContract(abi).deploy({
        data,
        arguments: args,
    });
    var nonce = await window.web3.eth.getTransactionCount(from);
    nonce = parseInt(window.numberToString(nonce) + '');
    var contractAddress = window.getNextContractAddress && window.getNextContractAddress(from, nonce === 0 ? undefined : nonce);
    try {
        contractAddress = (await window.sendBlockchainTransaction(undefined, window.web3.eth.sendTransaction({
            from,
            data: data.encodeABI(),
            gasLimit: await data.estimateGas({ from })
        }))).contractAddress;
    } catch (e) {
        try {
            if (!contractAddress || (e.message || e).indexOf("The contract code couldn't be stored, please check your gas") === -1) {
                throw e;
            }
        } catch (a) {
            throw e;
        }
    }
    return window.newContract(abi, contractAddress);
};

window.blockchainCall = async function blockchainCall(value, oldCall) {
    var args = [];
    var call = value !== undefined && isNaN(value) ? value : oldCall;
    for (var i = value === call ? 1 : 2; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    value = isNaN(value) ? undefined : value;
    var method = (call.implementation ? call.get : call.new ? call.new : call).apply(call, args);
    return await (method._method.stateMutability === 'view' || method._method.stateMutability === 'pure' ? method.call(await window.getSendingOptions()) : window.sendBlockchainTransaction(value, method));
};

window.sendBlockchainTransaction = function sendBlockchainTransaction(value, transaction) {
    return new Promise(async function(ok, ko) {
        var handleTransactionError = function handleTransactionError(e) {
            e !== undefined && e !== null && (e.message || e).indexOf('not mined within') === -1 && ko(e);
        }
        try {
            (transaction = transaction.send ? transaction.send(await window.getSendingOptions(transaction, value), handleTransactionError) : transaction).on('transactionHash', transactionHash => {
                window.publish('transaction/start');
                var stop = function() {
                    window.unsubscribe('transaction/stop', stop);
                    handleTransactionError('stopped');
                };
                window.subscribe('transaction/stop', stop);
                var timeout = async function() {
                    var receipt = await window.web3.eth.getTransactionReceipt(transactionHash);
                    if (!receipt || !receipt.blockNumber || parseInt(await window.web3.eth.getBlockNumber()) < (parseInt(receipt.blockNumber) + (window.context.transactionConfirmations || 0))) {
                        return window.setTimeout(timeout, window.context.transactionConfirmationsTimeoutMillis);
                    }
                    window.unsubscribe('transaction/stop', stop);
                    return transaction.then(ok);
                };
                window.setTimeout(timeout);
            }).catch(handleTransactionError);
        } catch (e) {
            return handleTransactionError(e);
        }
    });
};

window.getNetworkElement = function getNetworkElement(element) {
    var network = window.context.ethereumNetwork && window.context.ethereumNetwork[window.networkId];
    if (network === undefined || network === null) {
        return;
    }
    return window.context[element + network];
};

window.isEthereumAddress = function isEthereumAddress(ad) {
    if (ad === undefined || ad === null) {
        return false;
    }
    var address = ad.split(' ').join('');
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        return true;
    } else {
        address = address.replace('0x', '');
        var addressHash = window.web3.utils.sha3(address.toLowerCase());
        for (var i = 0; i < 40; i++) {
            if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
                //return false;
            }
        }
    }
    return true;
};

window.newContract = function newContract(abi, address) {
    window.contracts = window.contracts || {};
    var key = window.web3.utils.sha3(JSON.stringify(abi));
    var contracts = (window.contracts[key] = window.contracts[key] || {});
    address = address || window.voidEthereumAddress;
    key = address.toLowerCase();
    contracts[key] = contracts[key] || new window.web3.eth.Contract(abi, address === window.voidEthereumAddress ? undefined : address);
    return contracts[key];
};

window.fromDecimals = function fromDecimals(n, d, noFormat) {
    n = (n && n.value || n);
    d = (d && d.value || d);
    if (!n || !d) {
        return "0";
    }
    var decimals = (typeof d).toLowerCase() === 'string' ? parseInt(d) : d;
    var symbol = window.toEthereumSymbol(decimals);
    if (symbol) {
        var result = window.web3.utils.fromWei(((typeof n).toLowerCase() === 'string' ? n : window.numberToString(n)).split('.')[0], symbol);
        return noFormat === true ? result : window.formatMoney(result);
    }
    var number = (typeof n).toLowerCase() === 'string' ? parseInt(n) : n;
    if (!number || this.isNaN(number)) {
        return '0';
    }
    var nts = parseFloat(window.numberToString((number / (decimals < 2 ? 1 : Math.pow(10, decimals)))));
    nts = window.numberToString(nts);
    return noFormat === true ? nts : window.formatMoney(nts);
};

window.toDecimals = function toDecimals(n, d) {
    n = (n && n.value || n);
    d = (d && d.value || d);
    if (!n || !d) {
        return "0";
    }
    var decimals = (typeof d).toLowerCase() === 'string' ? parseInt(d) : d;
    var symbol = window.toEthereumSymbol(decimals);
    if (symbol) {
        return window.web3.utils.toWei((typeof n).toLowerCase() === 'string' ? n : window.numberToString(n), symbol);
    }
    var number = (typeof n).toLowerCase() === 'string' ? parseFloat(n) : n;
    if (!number || this.isNaN(number)) {
        return "0";
    }
    return window.numberToString(number * (decimals < 2 ? 1 : Math.pow(10, decimals)));
};

window.numberToString = function numberToString(num, locale) {
    if (num === undefined || num === null) {
        num = 0;
    }
    if ((typeof num).toLowerCase() === 'string') {
        return num;
    }
    let numStr = String(num);

    if (Math.abs(num) < 1.0) {
        let e = parseInt(num.toString().split('e-')[1]);
        if (e) {
            let negative = num < 0;
            if (negative) num *= -1
            num *= Math.pow(10, e - 1);
            numStr = '0.' + (new Array(e)).join('0') + num.toString().substring(2);
            if (negative) numStr = "-" + numStr;
        }
    } else {
        let e = parseInt(num.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            num /= Math.pow(10, e);
            numStr = num.toString() + (new Array(e + 1)).join('0');
        }
    }
    if (locale === true) {
        var numStringSplitted = numStr.split(' ').join('').split('.');
        return parseInt(numStringSplitted[0]).toLocaleString() + (numStringSplitted.length === 1 ? '' : (Utils.decimalsSeparator + numStringSplitted[1]))
    }
    return numStr;
};

window.asNumber = function asNumber(value) {
    if (typeof value === 'undefined' || value === '') {
        return 0;
    }
    try {
        value = value.split(',').join('');
    } catch (e) {}
    return parseFloat(window.numberToString(value));
};

window.formatNumber = function formatNumber(value) {
    return parseFloat(window.numberToString(value).split(',').join(''));
};

window.formatMoneyUniV3 = function formatMoneyUniV3(value, decimals) {
    var str = window.numberToString(value).split('.');
    if (str[1] && str[1].indexOf('0') === 0) {
        var n = str[1];
        for (var i = 0; i < n.length; i++) {
            if (n[i] !== '0') {
                str[1] = str[1].substring(0, i + 1);
                break;
            }
        }
    } else {
        return window.formatMoney(value, decimals);
    }
    var newN = window.formatMoney(str[0]) + (str.length === 1 ? '' : ('.' + str[1]));
    return newN;
};

window.formatMoney = function formatMoney(value, dcp, thouSeparator, decSeparator) {
    var decPlaces = window.formatNumber(dcp);
    value = (typeof value).toLowerCase() !== 'number' ? window.asNumber(value) : value;
    var n = value,
        decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces,
        decSeparator = decSeparator == undefined ? "." : decSeparator,
        thouSeparator = thouSeparator == undefined ? "," : thouSeparator,
        sign = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(decPlaces)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    var result = sign + (j ? i.substr(0, j) + thouSeparator : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : "");
    return window.eliminateFloatingFinalZeroes(result, decSeparator);
};

window.toEthereumSymbol = function toEthereumSymbol(decimals) {
    var symbols = {
        "noether": "0",
        "wei": "1",
        "kwei": "1000",
        "Kwei": "1000",
        "babbage": "1000",
        "femtoether": "1000",
        "mwei": "1000000",
        "Mwei": "1000000",
        "lovelace": "1000000",
        "picoether": "1000000",
        "gwei": "1000000000",
        "Gwei": "1000000000",
        "shannon": "1000000000",
        "nanoether": "1000000000",
        "nano": "1000000000",
        "szabo": "1000000000000",
        "microether": "1000000000000",
        "micro": "1000000000000",
        "finney": "1000000000000000",
        "milliether": "1000000000000000",
        "milli": "1000000000000000",
        "ether": "1000000000000000000",
        "kether": "1000000000000000000000",
        "grand": "1000000000000000000000",
        "mether": "1000000000000000000000000",
        "gether": "1000000000000000000000000000",
        "tether": "1000000000000000000000000000000"
    };
    var d = "1" + (new Array(decimals + 1)).join('0');
    var values = Object.entries(symbols);
    for (var i in values) {
        var symbol = values[i];
        if (symbol[1] === d) {
            return symbol[0];
        }
    }
};

window.eliminateFloatingFinalZeroes = function eliminateFloatingFinalZeroes(value, decSeparator) {
    decSeparator = decSeparator || '.';
    if (value.indexOf(decSeparator) === -1) {
        return value;
    }
    var split = value.split(decSeparator);
    while (split[1].endsWith('0')) {
        split[1] = split[1].substring(0, split[1].length - 1);
    }
    return split[1].length === 0 ? split[0] : split.join(decSeparator);
};

window.addTokenToMetamask = async function addTokenToMetamask(address, imageURI) {
    var token = window.newContract(window.context.ERC20ABI, address);
    window.web3.currentProvider.request({
        method: 'wallet_watchAsset',
        params: {
            type: "ERC20",
            options: {
                address,
                symbol : await window.blockchainCall(token.methods.symbol),
                decimals : await window.blockchainCall(token.methods.decimals),
                image : imageURI || window.context.trustwalletImgURLTemplate.format(address),
            },
        },
        id: Math.round(Math.random() * 100000),
    }, (err, added) => {
        console.log('provider returned', err, added)
    });
};

window.shortenWord = function shortenWord(word, charsAmount) {
    return word ? word.substring(0, word.length < (charsAmount = charsAmount || window.context.defaultCharsAmount) ? word.length : charsAmount) + (word.length < charsAmount ? '' : '...') : "";
};

window.permit = async function permit(tokenAddress, spender, value, deadline) {
    isNaN(deadline) && (deadline = window.numberToString((new Date().getTime() / 1000) + 300).split('.')[0]);

    var token = tokenAddress.options ? tokenAddress : window.newContract(window.context.ERC20ABI, tokenAddress);
    var owner = window.walletAddress;

    var nonce = await token.methods.nonces(owner).call();

    var EIP712Domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
    ];

    var domainSeparatorName = "Item";
    var domainSeparatorVersion = "1";

    try {
        var domainSeparatorData = await token.methods.EIP712_PERMIT_DOMAINSEPARATOR_NAME_AND_VERSION().call();
        domainSeparatorName = domainSeparatorData[0];
        domainSeparatorVersion = domainSeparatorData[1];
    } catch(e) {
    }

    var domain = {
        name: domainSeparatorName,
        version: domainSeparatorVersion,
        chainId: await web3.eth.getChainId(),
        verifyingContract: token.options.address
    };

    var Permit = [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
    ];

    var message = {
        owner,
        spender,
        value,
        nonce,
        deadline
    };

    var data = {
        types: {
            EIP712Domain,
            Permit
        },
        domain,
        primaryType: 'Permit',
        message
    };

    return await new Promise(async function(ok, ko) {
        await web3.currentProvider.sendAsync({
            method: 'eth_signTypedData_v4',
            params: [owner, JSON.stringify(data)],
            from: owner
        }, function(e, signature) {
            if (e) {
                return ko(e);
            }
            signature = signature.result.substring(2);
            return ok({
                r: '0x' + signature.slice(0, 64),
                s: '0x' + signature.slice(64, 128),
                v: web3.utils.toDecimal('0x' + signature.slice(128, 130)),
                ...message
            });
        });
    });
}