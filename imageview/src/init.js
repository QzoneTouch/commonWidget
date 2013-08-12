/**
 * ImageView
 * (c) 2012-2013 dollydeng@qzone
 * Distributed under the MIT license.
 */
define(function(require, exports, module){
    var tmpl = require('./tmpl');

    var ImageView = {
        photos: null,
        index:0,
        el: null,
        config: null,
        lastContainerScroll: 0,
        zoom:1,
        advancedSupport : false,
        lastTapDate: 0,
        /**
         *
         * @param photos {Array} photo url list
         * @param index {Number} display photo at this index as default
         * @param config{
         *      count: global photo count, leave blank while {photos} is enough for displaying.
         *      idx_space: global index of the first photo in given photo array, leave blank in the same condition above.
         *      onRequestMore: callback when lacking of photos
         *      onIndexChange:callback at index changes
         *      onClose: callback at close
         * }
         */
        init : function(photos, index, config){
            var self = this;
            index = +index || 0;
            this.config = $.extend({
                fade: true
            },config);

            this.lastContainerScroll = document.body.scrollTop;
            if($.os.iphone || ($.os.android && parseFloat($.os.version)>=4.0)){
                this.advancedSupport = true;
            }

            //rebuild photos array based on global count
            if(this.config.count){
                this.photos = new Array(this.config.count);
                var len = photos.length,
                    start = this.config.idx_space || 0;
                for(var i=start;i<start+len;i++){
                    this.photos[i] = photos[i - start];
                }
                this.index = start + index;
            }else{
                this.photos = photos || [];
                this.index = index || 0;
            }

            //do size calculation in next tick, leave time to browser for any size related changes to take place.
            setTimeout(function(){
                self.clearStatus();
                self.render(true);
                self.bind();
                self.changeIndex(self.index, true);
            },0);
        },

        //reset sizes.
        clearStatus: function(){
            this.width = Math.max(window.innerWidth,document.body.clientWidth);//android compatibility
            this.height = window.innerHeight;
            this.zoom = 1;
            this.zoomX = 0;
            this.zoomY = 0;
        },
        render: function(first){
            this.el = $('#imageView');
            this.el.html(tmpl.item({
                photos: this.photos,
                index: this.index,
                width: this.width,
                height: this.height
            }));
            if(first){
                this.el.css({
                    'opacity':0,
                    'height': this.height + 2 +'px',  //2px higher
                    'top':this.lastContainerScroll - 1 +'px'
                }).show().animate({
                    'opacity':1
                },300);
            }

        },
        topFix: function(){
            if(!ImageView.el) return;
            ImageView.el.css('top', window.scrollY + 'px');
        },
        bind : function(){
            var self = this;
            this.unbind();
            $(window).on('scroll',this.topFix);
            this.el.on('touchstart touchmove touchend touchcancel',function(e){
                self.handleEvent(e);
            });
            this.el.on('singleTap',function(e){
                e.preventDefault();
                var now = new Date();
                if(now - this.lastTapDate < 500){
                    return;
                }
                this.lastTapDate = now;
                self.onSingleTap(e);
            }).on('doubleTap', function(e){
                e.preventDefault();
                self.onDoubleTap(e);
            });

            'onorientationchange' in window ? window.addEventListener('orientationchange', this, false) : window.addEventListener('resize', this, false);
        },
        unbind: function(){
            this.el.off();
            $(window).off('scroll',this.topFix);
            'onorientationchange' in window ? window.removeEventListener('orientationchange', this, false) : window.removeEventListener('resize', this, false);
        },
        handleEvent: function(e) {
            switch (e.type) {
                case 'touchstart':
                    this.onTouchStart(e);
                    break;
                case 'touchmove':
                    e.preventDefault();
                    this.onTouchMove(e);
                    break;
                case 'touchcancel':
                case 'touchend':
                    this.onTouchEnd(e);
                    break;
                case 'orientationchange':
                case 'resize':
                    this.resize(e);
                    break;
            }
        },
        onSingleTap: function(e){
            this.close(e);
        },
        getDist: function(x1,y1,x2,y2){
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2), 2);
        },
        doubleZoomOrg: 1,
        doubleDistOrg: 1,
        isDoubleZoom: false,
        onTouchStart: function(e){
            if(this.advancedSupport && e.touches && e.touches.length >=2){
                var img = this.getImg();
                img.style.webkitTransitionDuration= '0';
                this.isDoubleZoom = true;
                this.doubleZoomOrg = this.zoom;
                this.doubleDistOrg  = this.getDist(e.touches[0].pageX,e.touches[0].pageY,e.touches[1].pageX,e.touches[1].pageY);
                return;
            }
            e = e.touches ? e.touches[0] : e;
            this.isDoubleZoom = false;
            this.startX = e.pageX;
            this.startY = e.pageY;
            this.orgX = e.pageX;
            this.orgY = e.pageY;
            this.hasMoved = false;
            if(this.zoom != 1){
                this.zoomX = this.zoomX || 0;
                this.zoomY = this.zoomY || 0;
                var img = this.getImg();
                if(img){
                    img.style.webkitTransitionDuration = '0';
                }
                this.drag = true;
            }else{
                //disable movement with single photo
                if(this.photos.length == 1){
                    return;
                }
                this.el.find('.pv-inner').css('-webkitTransitionDuration','0');
                this.transX = -this.index*this.width;
                this.slide = true;
            }
        },

        onTouchMove: function(e){
            if(this.advancedSupport && e.touches && e.touches.length >=2){
                var newDist = this.getDist(e.touches[0].pageX,e.touches[0].pageY,e.touches[1].pageX,e.touches[1].pageY);
                this.zoom = newDist * this.doubleZoomOrg / this.doubleDistOrg;
                var img = this.getImg();
                img.style.webkitTransitionDuration = '0';
                if(this.zoom < 1){
                    this.zoom = 1;
                    this.zoomX = 0;
                    this.zoomY = 0;
                    img.style.webkitTransitionDuration = '200ms';
                }else if(this.zoom > this.getScale(img)*2){
                    this.zoom = this.getScale(img)*2;
                }
                img.style.webkitTransform = "scale("+this.zoom+") translate("+this.zoomX+"px,"+this.zoomY+"px)";
                return;
            }
            //disable movement at double status.
            if(this.isDoubleZoom){
                return;
            }
            e = e.touches ? e.touches[0] : e;
            //move distance larger than 5px
            if(!this.hasMoved && (Math.abs(e.pageX - this.orgX)>5 || Math.abs(e.pageY - this.orgY)>5)){
                this.hasMoved = true;
            }
            //zoom status
            if(this.zoom != 1){
                var deltaX = (e.pageX - this.startX) / this.zoom;
                var deltaY = (e.pageY - this.startY) / this.zoom;
                this.startX = e.pageX;
                this.startY = e.pageY;

                var img = this.getImg();
                var newWidth = img.width * this.zoom,
                    newHeight = img.height * this.zoom;
                var borderX = (newWidth - this.width) / 2 / this.zoom,
                    borderY = (newHeight - this.height) /2 / this.zoom;
                //edge status
                if(borderX >= 0){
                    if(this.zoomX < -borderX || this.zoomX > borderX){
                        deltaX /= 3;
                    }
                }
                if(borderY > 0){
                    if(this.zoomY < -borderY || this.zoomY > borderY){
                        deltaY /= 3;
                    }
                }
                this.zoomX += deltaX;
                this.zoomY += deltaY;
                //long image status
                if((this.photos.length == 1 && newWidth < this.width)){
                    this.zoomX = 0;
                }else if(newHeight < this.height){
                    this.zoomY = 0;
                }
                img.style.webkitTransform = "scale("+this.zoom+") translate("+this.zoomX+"px,"+this.zoomY+"px)";
            }else{
                //slide status
                if(!this.slide){
                    return;
                }
                var deltaX = e.pageX - this.startX;
                if(this.transX > 0 || this.transX < -this.width*(this.photos.length-1)){
                    deltaX /= 4;
                }
                this.transX = -this.index*this.width+deltaX;
                this.el.find('.pv-inner').css('-webkitTransform','translateX('+this.transX+'px)');
            }
        },
        onTouchEnd: function(e){
            if(this.isDoubleZoom){
                return;
            }

            if(!this.hasMoved){
                return;
            }
            if(this.zoom != 1){
                if(!this.drag){
                    return;
                }
                var img = this.getImg();
                img.style.webkitTransitionDuration= '200ms';

                var newWidth = img.width * this.zoom,
                    newHeight = img.height * this.zoom;
                var borderX = (newWidth - this.width) / 2 / this.zoom,
                    borderY = (newHeight - this.height) /2 / this.zoom;
                //index change conditions
                var len = this.photos.length;
                if(len > 1 && borderX>=0){
                    var updateDelta = 0;
                    var switchDelta = this.width / 6;
                    if(this.zoomX < -borderX - switchDelta/this.zoom && this.index < len-1){
                        updateDelta = 1;
                    }else if(this.zoomX > borderX + switchDelta/this.zoom && this.index > 0){
                        updateDelta = -1;
                    }
                    if(updateDelta != 0){
                        this.scaleDown(img);
                        this.changeIndex(this.index + updateDelta);
                        return;
                    }
                }
                //edge
                if(borderX >= 0){
                    if(this.zoomX < -borderX){
                        this.zoomX = -borderX;
                    }else if(this.zoomX > borderX){
                        this.zoomX = borderX;
                    }
                }
                if(borderY > 0){
                    if(this.zoomY < -borderY){
                        this.zoomY = -borderY;
                    }else if(this.zoomY > borderY){
                        this.zoomY = borderY;
                    }
                }
                if(this.isLongPic(img) && Math.abs(this.zoomX) < 10){
                    img.style.webkitTransform = "scale("+this.zoom+") translate(0px,"+this.zoomY+"px)";
                    return;
                }else{
                    img.style.webkitTransform = "scale("+this.zoom+") translate("+this.zoomX+"px,"+this.zoomY+"px)";
                }
                this.drag = false;

            }else{
                if(!this.slide){
                    return;
                }
                var deltaX = this.transX - (-this.index*this.width);
                var updateDelta = 0;
                if(deltaX > 50){
                    updateDelta = -1;
                }else if(deltaX < -50){
                    updateDelta = 1;
                }
                this.changeIndex(this.index + updateDelta);
                this.slide = false;
            }
        },
        getImg: function(index){
            var img = this.el.find('li').eq(index || this.index).find('img');
            if(img.size() == 1){
                return img[0];
            }else{
                return null;
            }
        },
        //return default zoom factor
        getScale: function(img){
            //long images
            if(this.isLongPic(img)){
                return this.width / img.width; //scale to fit window
            }else{
                //other images
                //return 1 if image is smaller than window
                var h = img.naturalHeight,
                    w = img.naturalWidth;
                var hScale = h/img.height,
                    wScale = w/img.width;
                if(hScale > wScale){
                    return wScale;
                }else{
                    return hScale;
                }
            }
        },
        onDoubleTap: function(e){
            var now = new Date();
            if(now - this.lastTapDate < 500){
                return;
            }
            this.lastTapDate = now;
            var img = this.getImg();
            if(!img){
                return;
            }
            if(this.zoom != 1){
                this.scaleDown(img);
            }else{
                this.scaleUp(img);
            }
            this.afterZoom(img);
        },

        scaleUp: function(img){
            var scale = this.getScale(img);
            if(scale > 1){
                img.style.webkitTransform = "scale("+scale+")";
                img.style.webkitTransition= "200ms";
            }
            this.zoom = scale;
            this.afterZoom(img);
        },

        scaleDown: function(img){
            this.zoom = 1;
            this.zoomX = 0;
            this.zoomY = 0;
            this.doubleDistOrg = 1;
            this.doubleZoomOrg = 1;
            img.style.webkitTransform = "";
            this.afterZoom(img);
        },
        afterZoom: function(img){
            //reposition: top of image.
            if(this.zoom > 1 && this.isLongPic(img)){
                var newHeight = img.height * this.zoom;
                var borderY = (newHeight - this.height) /2 / this.zoom;
                if(borderY > 0){
                    this.zoomY = borderY;
                    img.style.webkitTransform = "scale("+this.zoom+") translate(0px,"+borderY+"px)";
                }
            }
        },
        isLongPic: function(img){
            return img.height / img.width >= 3.5
        },
        resizeTimer : null,
        resize: function(e){
            clearTimeout(this.resizeTimer);
            var self =this;
            this.resizeTimer = setTimeout(function(){
                document.body.style.minHeight = window.innerHeight + 1 +'px';
                if(self.zoom != 1){
                    //cancel zoom status
                    self.scaleDown(self.getImg());
                }
                self.clearStatus();
                self.render();  //re-render is faster than nodes modification.

                self.el.height(self.height).css('top',window.scrollY+'px');
                self.changeIndex(self.index, true);
            },600);
        },

        changeIndex: function(index, force){
            if(this.indexChangeLock){
                return;
            }
            if(index<0){
                index = 0;
            }else if(index >= this.photos.length){
                index = this.photos.length - 1;
            }
            var changed = this.index != index;
            this.index = index;
            var inner = this.el.find('.pv-inner');
            inner.css({
                '-webkitTransitionDuration':force?'0':'200ms',
                '-webkitTransform':'translateX(-'+index*this.width+'px)'
            });
            //load image at current index
            var li = inner.find('li').eq(index);
            var imgs = li.find('img');
            var self = this;
            if(!imgs.size()){
                this.el.find('#J_loading').show();
                if(typeof this.photos[index] != 'undefined'){
                    var img = new Image();
                    img.onload = function(){
                        if(self.el == null){
                            return;
                        }
                        img.onload = null;
                        self.el.find('#J_loading').hide();
                        img.style.webkitTransform = '';
                        img.style.opacity = '';
                        if(self.isLongPic(img)){
                            setTimeout(function(){
                                self.scaleUp(img);
                            },0);
                        }
                    };
                    img.ontimeout = img.onerror = function(){
                        li.html('<i style="color:white;">This image is broken, try again later.</i>');
                        self.el.find('#J_loading').hide();
                    }
                    if(this.advancedSupport){
                        img.style.webkitBackfaceVisibility = 'hidden';
                    }
                    img.style.opacity='0';
                    img.src = this.getImgUrl(index);
                    li.html('').append(img);
                    //do we have enough photos
                    if(this.config.onRequestMore && this.index > 0 && typeof this.photos[index-1] == 'undefined'){
                        this.config.onRequestMore(this.photos[index],-1, index);
                    }else if(this.config.onRequestMore && this.index < this.photos.length -1 && typeof this.photos[this.index+1] == 'undefined'){
                        this.config.onRequestMore(this.photos[index],1, index);
                    }
                    this.preload(index-1);
                    this.preload(index+1);
                }else{
                    this.indexChangeLock = true;
                }
            }
            if(changed || force){
                this.el.find('#J_index').html((index+1)+'/'+this.photos.length);
                this.config.onIndexChange && this.config.onIndexChange(img, this.photos, index);
            }
            setTimeout(function(){
                self.memoryClear();
            },0);
        },
        //defaule memory clear，remove nodes at index between [0, index - 10] && [index+10, max]
        memoryClear: function(){
            var li = this.el.find('.pv-img');
            var i = this.index - 10;
            while(i>=0){
                if(li.eq(i).html() == '') break;
                li.eq(i).html('');
                i--;
            }
            i = this.index + 10;
            while(i< li.size()){
                if(li.eq(i).html() == '') break;
                li.eq(i).html('');
                i++;
            }
        },

        getImgUrl: function(index, useOrg){
            if(index<0 || index>= this.photos.length || !this.photos[index]){
                return "";
            }

            return this.photos[index];
        },

        preload: function(index){
            if(index<0 || index>= this.photos.length || !this.getImg(index)){
                return;
            }
            var url = this.getImgUrl(index);
            if(url){
                var img = new Image();
                img.src = url;
            }
        },
        /**
         * update photos at given index
         * @param photos {Array}
         * @param index {Number} global index of first photo in given array
         */
        update:function(photos,index){
            if(index < this.photos.length){
                var len = photos.length;
                for(var i = index;i<index + len;i++){
                    this.photos[i] = photos[i-index];
                }

                if(this.indexChangeLock){
                    this.indexChangeLock = false;
                    this.changeIndex(this.index);
                }
            }
        },

        destroy: function(){
            if(this.el){
                var self = this;
                this.unbind();
                this.el.animate({
                    'opacity':0
                },300,'linear',function(){
                    if(self.el){
                        self.el.html('').hide();
                        self.el = null;
                    }
                });
                this.config.onClose && this.config.onClose(this.img, this.photos, this.index);
            }
        },

        close: function(){
            this.destroy();
        }
    };

    return ImageView;
});
