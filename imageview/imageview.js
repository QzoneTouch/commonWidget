/**
 * ImageView
 * (c) 2012-2013 dollydeng@qzone
 * Distributed under the MIT license.
 */
//create by jsc
(function(){
var mods = [],version = parseFloat(seajs.version);
define("",[],function(require,exports,module){

	var uri		= module.uri || module.id,
		m		= uri.split('?')[0].match(/^(.+\/)([^\/]*?)(?:\.js)?$/i),
		root	= m && m[1],
		name	= m && ('./' + m[2]),
		i		= 0,
		len		= mods.length,
		curr,args,
		undefined;
	
	//unpack
	for(;i<len;i++){
		args = mods[i];
		if(typeof args[0] === 'string'){
			name === args[0] && ( curr = args[2] );
			args[0] = root + args[0].replace('./','');
			(version > 1.0) &&	define.apply(this,args);
		}
	}
	mods = [];
	require.get = require;
	return typeof curr === 'function' ? curr.apply(this,arguments) : require;
});
define.pack = function(){
	mods.push(arguments);
	(version > 1.0) || define.apply(null,arguments);
};
})();
//all file list:
//imageview/src/init.js
//imageview/src/item.tmpl.html

//js file list:
//imageview/src/init.js
define.pack("./init",["./tmpl"],function(require, exports, module){
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
         * @param photos
         * @param index
         * @param config{
         *      count:全部照片总数
         *      idx_space:photos里第一张对应在全局的index
         *      onRequestMore:浮层获取左右两侧更多图的请求入口
         *      onIndexChange:index变化回调
         *      onClose:关闭回调
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

            //设置了count，则重新组织photos
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

            setTimeout(function(){
                self.clearStatus();
                self.render(true);
                self.bind();
                self.changeIndex(self.index, true);
            },0);
        },

        //清除各种状态量
        clearStatus: function(){
            this.width = Math.max(window.innerWidth,document.body.clientWidth);//android兼容
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
                    'height': this.height + 2 +'px',
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
            //旋转和缩放
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
            var target = $(e.target);
            if(target.hasClass('zoom')){
                if(!target.hasClass('disabled')){
                    this.onDoubleTap();
                    return;
                }
            }
            var pa = target.parents('.photo-meta');
            if(!pa.size()){
                this.close(e);
            }
        },
        getDist: function(x1,y1,x2,y2){
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2), 2);
        },
        doubleZoomOrg: 1,
        doubleDistOrg: 1,
        isDoubleZoom: false,
        onTouchStart: function(e){
            if(this.advancedSupport && e.touches && e.touches.length >=2){
                //双指逻辑
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
                //只有一张图，不允许左右滑动
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
                //双指逻辑
                var newDist = this.getDist(e.touches[0].pageX,e.touches[0].pageY,e.touches[1].pageX,e.touches[1].pageY);
                this.zoom = newDist * this.doubleZoomOrg / this.doubleDistOrg;
                var img = this.getImg();
                img.style.webkitTransitionDuration = '0';
                if(this.zoom < 1){
                    this.zoom = 1;
                    this.zoomX = 0;
                    this.zoomY = 0;
                    img.style.webkitTransitionDuration = '200ms'; //使图片在任意位置平滑地回到原处
                }else if(this.zoom > this.getScale(img)*2){
                    this.zoom = this.getScale(img)*2;
                }
                img.style.webkitTransform = "scale("+this.zoom+") translate("+this.zoomX+"px,"+this.zoomY+"px)";
                return;
            }
            //双指状态下禁止move
            if(this.isDoubleZoom){
                return;
            }
            e = e.touches ? e.touches[0] : e;
            if(!this.hasMoved && (Math.abs(e.pageX - this.orgX)>5 || Math.abs(e.pageY - this.orgY)>5)){
                this.hasMoved = true;
            }
            //放大状态
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
                //边界约束,弹性处理
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
                //长短图，XY约束
                if((this.photos.length == 1 && newWidth < this.width)){
                    this.zoomX = 0;
                }else if(newHeight < this.height){
                    this.zoomY = 0;
                }
                img.style.webkitTransform = "scale("+this.zoom+") translate("+this.zoomX+"px,"+this.zoomY+"px)";
            }else{
                //左右拖动状态
                if(!this.slide){
                    return;
                }
                var deltaX = e.pageX - this.startX;
                if(this.transX > 0 || this.transX < -this.width*(this.photos.length-1)){
                    deltaX /= 4; // 1/4屏边界
                }
                this.transX = -this.index*this.width+deltaX;
                this.el.find('.pv-inner').css('-webkitTransform','translateX('+this.transX+'px)');
            }
        },
        onTouchEnd: function(e){
            //双指状态一律不过end事件
            if(this.isDoubleZoom){
                this.zoomIconFix(this.getImg());
                return;
            }
            //5px认为是点击状态
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
                //边界超过一定值，切换图片
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
                //边界约束
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
                    return;  //保证长图上下滚动体验
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
        //返回最小放大倍数
        getScale: function(img){
            //长图
            if(this.isLongPic(img)){
                return this.width / img.width; //强制缩放到屏幕宽度
            }else{
                //其他图
                //如果长宽都小于窗口，会返回1
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
            //防止过快触发
            var now = new Date();
            if(now - this.lastTapDate < 500){
                return;
            }
            this.lastTapDate = now;
            var img = this.getImg();
            if(!img){
                return;
            }
            if(this.zoom != 1){//还原
                this.scaleDown(img);
            }else{//放大
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
            //长图定位到最顶部
            if(this.zoom > 1 && this.isLongPic(img)){
                var newHeight = img.height * this.zoom;
                var borderY = (newHeight - this.height) /2 / this.zoom;
                if(borderY > 0){
                    this.zoomY = borderY;
                    img.style.webkitTransform = "scale("+this.zoom+") translate(0px,"+borderY+"px)";
                }
            }
            this.zoomIconFix(img);
        },
        isLongPic: function(img){
            return img.height / img.width >= 3.5
        },
        //根据状态重置icon样式
        zoomIconFix: function(img){
            var icon = this.el.find('.zoom');
            var zoom = this.zoom;
            if(!icon.size()){
                return;
            }
            var cls = "zoom";
            if(zoom == 1){
                cls += " in";
            }else{
                cls += " out";
            }
            if(img.naturalWidth <= this.width && img.naturalHeight <= this.height){
                cls += " disabled";
            }
            icon.attr('class', cls);
        },
        resizeTimer : null,
        resize: function(e){
            clearTimeout(this.resizeTimer);
            var self =this;
            this.resizeTimer = setTimeout(function(){
                document.body.style.minHeight = window.innerHeight + 1 +'px';
                if(self.zoom != 1){
                    //取消缩放
                    self.scaleDown(self.getImg());
                }
                self.clearStatus();
                self.render();  //重渲染一次比逐个修改节点更快

                self.el.height(self.height).css('top',window.scrollY+'px');
                self.changeIndex(self.index, true);
            },600);
        },
        //执行图片切换
        changeIndex: function(index, force){
            if(this.indexChangeLock){
                return;
            }
            //卷动
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
            //加载当前帧的img
            var li = inner.find('li').eq(index);
            var imgs = li.find('img');
            var self = this;
            if(!imgs.size()){
                this.el.find('#J_loading').show();
                if(typeof this.photos[index] != 'undefined'){
                    var img = new Image();
                    img.onload = function(){
                        if(self.el == null){
                            return;  //浮层已经关闭，才拉到图
                        }
                        img.onload = null;
                        img.setAttribute('data-lazy',''); //加载成功才清除
                        self.el.find('#J_loading').hide();
                        img.style.webkitTransform = '';
                        img.style.opacity = '';
                        self.zoomIconFix(img);
                        if(self.isLongPic(img)){
                            setTimeout(function(){
                                self.scaleUp(img);
                            },0);
                        }
                    };
                    img.ontimeout = img.onerror = function(){
                        li.html('<i style="color:white;">图片加载失败，请重试</i>');
                        self.el.find('#J_loading').hide();
                    }
                    if(this.advancedSupport){
                        img.style.webkitBackfaceVisibility = 'hidden';
                    }
                    img.style.opacity='0';
                    img.src = this.getImgUrl(index);
                    li.html('').append(img);
                    //预判批量加载url数据
                    if(this.config.onRequestMore && this.index > 0 && typeof this.photos[index-1] == 'undefined'){
                        this.config.onRequestMore(this.photos[index],-1, index);
                    }else if(this.config.onRequestMore && this.index < this.photos.length -1 && typeof this.photos[this.index+1] == 'undefined'){
                        this.config.onRequestMore(this.photos[index],1, index);
                    }
                    this.preload(index-1);
                    this.preload(index+1);
                }else{
                    //锁住加载状态
                    this.indexChangeLock = true;
                }
            }else{
                this.zoomIconFix(imgs[0]);
            }
            //更新页码
            if(changed || force){
                this.el.find('#J_index').html((index+1)+'/'+this.photos.length);
                this.config.onIndexChange && this.config.onIndexChange(img, this.photos, index);
            }
            setTimeout(function(){
                self.memoryClear();
            },0);
        },
        //采用默认策略，清理[0, index - 10] && [index+10, max]的图片
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
        /**
         * 拿到缓存的图片url
         */
        getImgUrl: function(index, useOrg){
            if(index<0 || index>= this.photos.length || !this.photos[index]){
                return "";
            }

            return this.photos[index];
        },
        //预加载，会判断图片是否存在
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
        //一组图片，填充到this.photos
        //要求index是全局中photos第一张的序号
        update:function(photos,index){
            if(index < this.photos.length){
                var len = photos.length;
                for(var i = index;i<index + len;i++){
                    this.photos[i] = photos[i-index];
                }
                //已经锁住了才强制刷新index，否则静默添加缓存数据
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

//tmpl file list:
//imageview/src/item.tmpl.html
define.pack("./tmpl",[],function(require, exports, module){
var tmpl = { 
'item': function(data){

var __p=[],_p=function(s){__p.push(s)};
with(data||{}){
__p.push('<ul class="pv-inner" style="line-height:');
_p(height);
__p.push('px;">');
for(var i=0;i<photos.length;i++){__p.push('<li class="pv-img" style="width:');
_p(width);
__p.push('px;height:');
_p(height);
__p.push('px;"></li>');
}__p.push('</ul>    <span class="ui-loading white" id="J_loading"><i class="t1"></i><i class="t2"></i><i class="t3"></i></span><p class="counts"><span class="value" id="J_index">');
_p(index+1);
__p.push('/');
_p(photos.length);
__p.push('</span></p>');

}
return __p.join("");
}
};
return tmpl;
});
