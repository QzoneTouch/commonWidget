#Localcache
'Inspired by seajs-storage 1.3'
###Environment
Localcache work with [seajs](https://github.com/seajs/seajs)>=2.0
Compatible with both ios(5,6,7) and android(2.3~4.2)

###Usage
####case 1
1.Import seajs in your project
~~~~html
<script type="text/javascript" src="sea.js"></script>
~~~~
2.Seajs config
~~~~javascript
Seajs.config({
    preload:['seajs-localcache'],
    localcache:{
        timeout: 30000
    }
});
~~~~

Available config items:
*validate: {Function} check the integrity of code get from xhr.
*splitCombo: {Function} split combo file into single code sections.
*timeout: {Number} timeout of xhr request.
*prefix: {String} public prefix of all manifest items, used to determine whether a localstorage item should be recognised as manifest item or not.

3.Prepare manifest file
Manifest is a seajs module named with default name "manifest", read demo/manifest.js for format reference.

~~~~javascript
seajs.use('imageview',function(imageview){
  var view = iamgeview.get('./init');
  view.init([Array  of target photo urls], 0);
});
~~~~
####case2: with combo
Change step 2 like:
~~~~javascript
Seajs.config({
    preload:['seajs-combo','seajs-localcache']
    comboSync:['??',',']
});
~~~~
See [seajs-combo](https://github.com/seajs/seajs-combo) for more details.

###License
MIT
