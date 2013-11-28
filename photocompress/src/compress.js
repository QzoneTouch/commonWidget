/**
 * Mobile Photo Compress Solution
 *
 * Fixes iOS6 Safari's image file rendering issue for large size image (over mega-pixel),
 * which causes unexpected subsampling when drawing it in canvas.
 * By using this library, you can safely render the image with proper stretching.
 *
 * compress image in mobile browser which is file-api and canvas supported.
 * be compatible with these certain situation
 * 1. some android phones that do not support jpeg format output form canvas
 * 2. fix ios image render in canvas
 *
 * Copyright (c) 2013 QZone Touch Team <tedzhou@tencent.com>
 * Released under the MIT license
 */

define(function (require) {
	var $ = require("zepto");
	var JpegMeta = require("jpegMeta");
	var JPEGEncoder = require("jpegEncoder");
	var MegaPixImage = require("megapiximage");

	function getImageMeta(file, callback) {
		var r = new FileReader;
		var err = null;
		var meta = null;
		r.onload = function (event) {
			if (file.type === "image/jpeg") {
				try {
					meta = new JpegMeta.JpegFile(event.target.result, file.name)
				} catch (ex) {
					err = ex
				}
			}
			callback(err, meta)
		};
		r.onerror = function (event) {
			callback(event.target.error, meta)
		};
		r.readAsBinaryString(file)
	}

	function compress(file, picParam, callback) {

		var mpImg = new MegaPixImage(file);

		// defautl config
		var param = $.extend({
			type: "image/jpeg",
			maxHeight: 800,
			maxWidth: 600,
			quality: .8
		}, picParam);

		getImageMeta(file, function (err, meta) {

			// if file is a jpeg image,
			// using exif messagees
			// to transform the iamge at right orientation
			if (meta && meta.tiff && meta.tiff.Orientation) {
				param = $.extend({orientation: meta.tiff.Orientation.value}, param);
			}

			var canvas = document.createElement('canvas');

			mpImg.onrender = function () {
				var base64Str = "";
				if ($.os.android && param.type == "image/jpeg") {
					// using jpegEncoder to fix android machine does not support jpeg
					var ctx = canvas.getContext('2d');
					var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					var encoder = new JPEGEncoder(param.quality * 100);
					base64Str = encoder.encode(imgData);
					encoder = null
				} else {
					base64Str = canvas.toDataURL(picParam.type, picParam.quality);
				}
				callback(base64Str);
			};

			mpImg.render(canvas, param);

		});

	}

	return {compress: compress};
});
