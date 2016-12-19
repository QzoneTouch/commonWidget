#photoCompress

`photoCompress` is a solution for compress image in mobile browser, compatible with major browser.

##Environment && dependences
photoCompress work with:

1. [zepto](https://github.com/madrobby/zepto) for basic dom manipulating
2. [seajs](https://github.com/seajs/seajs) for module manager
3. [megapiximage](https://github.com/stomita/ios-imagefile-megapixel) for fixing ios6 big pictur rendering in canvas
4. [jpegmeta](https://code.google.com/p/jsjpegmeta/source/browse/jpegmeta.js) for getting the meta infomation of pictures
5. [jpegEncoder](http://www.bytestrom.eu) for fixing android machine's canvas.toDataUrl does not support jpeg output

Compatible with both ios(5,6,7) and android(2.3~4.2)

##Usage

```html
<input type="file" onchange="change(event)">
```

```javascript
	seajs.config({
		base: '../src/',
		alias: {
			'zepto': '../../public/zepto'
		}
	});

	function change(event) {
		var file = event.target.files[0];
		seajs.use(['zepto', 'compress'], function ($, compresser) {
			compresser.compress(file, {
				maxWidth: 800,
				maxHeight: 600,
				quality: .7,
				type: 'image/jpeg'
			}, function (dataUrl) {
				$(document.body).append('<p><img src="' + dataUrl + '"></p>');
			});
		});
	}
```

##api
`compress(file, option, callback)`

1. `file`: the file user selected
2. `option`: a object contains key/value pairs to set `maxWidth`/`maxHeight`/`quality`/`type`
3. `callback`: callback while compress done. you would get a param `result`, which is the base64 data url for the compressed image.


##License
MIT
