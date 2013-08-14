/**
 * Localcache
 * (c) 2012-2013 dollydeng@qzone
 * Distributed under the MIT license.
 */
define("seajs-localcache", ['../demo/manifest'], function(require){
    if(!window.localStorage || seajs.data.debug) return

    var module = seajs.Module,
        data = seajs.data,
        fetch = module.prototype.fetch,
        defaultSyntax = ['??',',']
    var remoteManifest = require('manifest')

    var storage = {
        get: function(key, parse){
            var val
            try{
                val = localStorage.getItem(key)
            }catch(e){
                return undefined
            }
            if(val){
                return parse? JSON.parse(val):val
            }else{
                return undefined
            }
        },
        set: function(key, val){
            try{
                localStorage.setItem(key,val)
            }catch(e){
                /**
                 * Default localstorage clean
                 * delete localstorage items which are not in latest manifest
                 */
                var len = localStorage.length
                var prefix = (data.localcache && data.localcache.prefix) || 'http:'
                for(var i=len-1;i>=0;i--){
                    var key = localStorage.key(i)
                    if(key.indexOf(prefix) != 0) continue
                    if(!remoteManifest[key]){
                        localStorage.remove(key)
                    }
                }
            }
        }
    }

    var localManifest = storage.get('manifest',true) || {}

    if(!localManifest && !remoteManifest){
        //failed to fetch latest version and local version is broken.
        return
    }

    /**
     * Check whether the code is complete and clean
     * @param url
     * @param code
     * @return {Boolean}
     */
    var validate = (data.localcache && data.localcache.validate) || function(url, code){
        if(code && code.indexOf('define') >= 0) return true
        else return false
    }

    var fetchAjax = function(url, callback){
        (function(_callback){
            var xhr = new window.XMLHttpRequest()
            var timer = setTimeout(function(){
                xhr.abort()
                _callback(null)
            }, (data.localcache && data.localcache.timeout) || 30000)
            xhr.open('GET',url,true)
            xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                    clearTimeout(timer)
                    if(xhr.status === 200){
                        _callback(xhr.responseText)
                    }else{
                        _callback(null)
                    }
                }
            }
            xhr.send(null)

        })(callback)
    }

    /**
     * run code in window environment
     * @param url
     * @param code
     */
    var use = function(url, code){
        code += '//@ sourceURL='+ url  //for chrome debug
        if(code && /\S/.test(code)){
            (window.execScript || function(data){ window['eval'].call(window,data)})(code)
        }
    }

    var isCombo = function(url){
        var sign = (data.comboSyntax && data.comboSyntax[0]) || '??'
        return url.indexOf(sign) >= 0
    }

    var splitComboUrl = function(url){
        var syntax = data.comboSyntax || defaultSyntax
        var arr = url.split(syntax[0])
        if(arr.length != 2) return url
        var host = arr[0]
        var urls = arr[1].split(syntax[1])
        var result = {}
        result.host = host
        result.files = []
        for(var i= 0,len = urls.length;i<len;i++){
            result.files.push(urls[i])
        }
        return result
    }

    /**
     * Warning: rewrite this function to fit your combo file structure
     * Default: split by define(function(){})
     * @param code
     */
    var splitCombo = (data.localcache && data.localcache.splitCombo) || function(code){
        var arr = code.split('define')
        var result = []
        for(var i= 0,len = arr.length;i<len;i++){
            if(arr[i]){
                result.push('define'+arr[i])
            }
        }
        return result
    }


    var fetchingList = {}
    var onLoad = function(url){
        var mods = fetchingList[url]
        delete fetchingList[url]
        while ((m = mods.shift())) m.load()
    }

    module.prototype.fetch = function(requestCache){
        var mod = this
        seajs.emit('fetch',mod)
        var url = mod.requestUri || mod.uri
        var isComboUrl = isCombo(url)

        if(fetchingList[url]){
            fetchingList[url].push(mod)
            return
        }
        fetchingList[url] = [mod]

        if(remoteManifest[url] && !isComboUrl){
            //in version control
            var cached = storage.get(url)
            var cachedValidated = validate(url, cached)
            if(remoteManifest[url] == localManifest[url] && cachedValidated){
                //cached version is ready to go
                use(url, cached)
                onLoad(url)
            }else{
                //otherwise, get latest version from network
                fetchAjax(url + '?v='+Math.random().toString(), function(resp){
                    if(resp && validate(url, resp)){
                        localManifest[url] = remoteManifest[url]
                        storage.set('manifest', JSON.stringify(localManifest))  //update one by one
                        storage.set(url, resp)
                        use(url, resp)
                        onLoad(url)
                    }else{
                        delete fetchingList[url]
                        fetch.call(mod, requestCache)
                    }
                })
            }
        }else if(isComboUrl){
            //try to find available code cache
            var splited = splitComboUrl(url), needFetchAjax = false
            for(var i= splited.files.length - 1;i>=0;i--){
                var file = splited.host + splited.files[i]
                var cached = storage.get(file)
                var cachedValidated = validate(file, cached)
                if(remoteManifest[file]){
                    needFetchAjax = true
                    if(remoteManifest[file] == localManifest[file] && cachedValidated) {
                      use(file, cached)
                      splited.files.splice(i,1)  //remove from combo
                    }
                }
            }
            if(splited.files.length == 0){
                onLoad(url)  //all cached
                return
            }
            // call fetch directly if all combo files are not under version control
            if(!needFetchAjax) {
                delete fetchingList[url]
                fetch.call(mod, requestCache)
                return
            }
            var syntax = data.comboSyntax || defaultSyntax,
                comboUrl = splited.host + syntax[0] + splited.files.join(syntax[1])
            fetchAjax(comboUrl + '?v='+Math.random().toString(), function(resp){
                if(!resp){
                    delete fetchingList[url]
                    fetch.call(mod, requestCache)
                    return
                }
                var splitedCode = splitCombo(resp)
                if(splited.files.length == splitedCode.length){
                    //ensure they are matched with each other
                    for(var i= 0,len = splited.files.length;i<len;i++){
                        var file = splited.host + splited.files[i]
                        localManifest[file] = remoteManifest[file]
                        storage.set(file, splitedCode[i])
                        use(file, splitedCode[i])
                    }
                    storage.set('manifest', JSON.stringify(localManifest))
                    onLoad(url)
                }else{
                    //filenames and codes not matched, fetched code is broken at somewhere.
                    delete fetchingList[url]
                    fetch.call(mod, requestCache)
                }
            })
        }else{
            //not in version control, use default fetch method
            delete fetchingList[url]
            fetch.call(mod, requestCache)
        }
    }


})
