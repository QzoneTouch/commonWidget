define("seajs-localcache", ['manifest'], function(require){
    if(!window.localStorage) return
    if(seajs.data.debug) return
    var module = seajs.Module,
        data = seajs.data,
        fetch = module.prototype.fetch
    var remoteManifest = require('manifest')

    var storage = {
        get: function(key, parse){
            var val;
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
                //localstroage full
            }
        }
    }

    var validate = function(url, code){
        if(code) return true
        else return false
    }

    var fetchAjax = function(url, callback){
        var xhr = new window.XMLHttpRequest()
        xhr.open('GET',url,true)
        xhr.onreadystatechange = function(){
            if(xhr.readyState === 4){
                if(xhr.status === 200){
                    callback(xhr.responseText)
                }else{
                    callback(null)
                }
            }
        }
        xhr.send(null)
    }

    var run = function(code){
        if(code && /\S/.test(code)){
            (window.execScript || function(data){ window['eval'].call(window,data)})(code)
        }
    }

    var use = function(url, code){
        code += '//@ sourceURL='+ url  //for chrome debug
        run(code)
    }

    var isCombo = function(url){
        var sign = (data.comboSyntax && data.comboSyntax[0]) || '??'
        return url.indexOf(sign) >= 0
    }

    var localManifest = storage.get('manifest',true) || remoteManifest
    module.prototype.fetch = function(){
        var mod = this
        seajs.emit('fetch',mod)
        var url = mod.requestUri || mod.url
        var isComboUrl = isCombo(url)
        var cached = storage.get(url)
        var cachedValidated = validate(url, cached)
        if(remoteManifest && remoteManifest[url]){
            //in version control
            if(localManifest && remoteManifest[url] == localManifest[url] && cachedValidated){
                //cached version is ready to go
                use(url, cached)
                mod.load()
            }else{
                //otherwise, get latest version from network
                fetchAjax(url + '?v='+Math.random().toString(), function(resp){
                    if(resp && validate(url, resp)){
                        localManifest[url] = remoteManifest[url]
                        storage.set('manifest', JSON.stringify(localManifest))  //update one by one
                        storage.set(url, resp)
                        use(url, resp)
                        mod.load()
                    }else{
                        fetch.call(mod)
                    }
                })
            }
        }else{
            //not in version control, use default fetch method
            fetch.call(mod)
        }
    }


})