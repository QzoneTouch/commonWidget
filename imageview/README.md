#ImageView
###Environment
Imageview work with [zepto](https://github.com/madrobby/zepto) and [seajs](https://github.com/seajs/seajs)

Compatible with both ios(5,6,7) and android(2.3~4.2)

###Usage
####case 1
Display cached photos
~~~~javascript
seajs.use('imageview',function(imageview){
  var view = iamgeview.get('./init');
  view.init([Array  of target photo urls], 0);
});
~~~~

Try open demo/imageview.html on your phone or in simulator(chrome with dev tool) to see the result.
####case 2
Display fetched photos
~~~~javascript
seajs.use('imageview',function(imageview){
  var view = iamgeview.get('./init');
  view.init([], 0, {
    onRequestMore: function(photo, delta, index){
      $.get('getPhotoUrl',function(photos){
        view.update(photos, index);
      });
    }
  });
});
~~~~
###License
MIT
