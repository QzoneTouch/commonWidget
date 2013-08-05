define('manifest',function(){
    var mod = {
        'foo.js': 1,
        'bar.js': 1
    }
    var manifest = {}
    for(var key in mod){
        manifest['http://localhost/seajs-plugin/'+key] = mod[key]
    }
    return manifest
})