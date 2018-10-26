"use strict";
const md5 = require('./md5.js');
const Fly = require("../libs/flyio/wx.umd.min.js");
const Promise = require('./es6-promise.js').Promise;
const fly = new Fly();
/**
 * version:1.0.0
 * author:yfsoftcom
 * date:2018-10-26ß
 */
module.exports = (function() {
    var E = {
        Object:{
            CREATE_ERROR:{errno:-1,code:'CREATE_ERROR',message:'create function should be called by a new object'},
            SAVE_ERROR:{errno:-2,code:'SAVE_ERROR',message:'save function should be called behind get or create'},
            REMOVE_ERROR:{errno:-3,code:'REMOVE_ERROR',message:'remove function should be called behind get or create'},
            OBJECT_ID_NOT_FIND:{errno:-4,code:'OBJECT_ID_NOT_FIND',message:'Object does not find by id or more rows'},
        },
        Hook:{
          BEFORE_HOOK_REJECT:{errno:-301,code:'BEFORE_HOOK_REJECT',message:'before hook reject'},
          AFTER_HOOK_REJECT:{errno:-302,code:'AFTER_HOOK_REJECT',message:'after hook reject'},
          UNCATCH_HOOK_REJECT:{errno:-303,code:'UNCATCH_HOOK_REJECT',message:'uncatch exception:'}
        }
    };

    function clone(obj) {
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;

        // Handle Date
        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; ++i) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    }

    var _ = {
      isObject: function(obj){
        return Object.prototype.toString.call(obj) === '[Object Object]';
      },
      isFunction: function(func){
        return typeof func === 'function';
      },
      isString: function( str ){
        return typeof str === 'string';
      },
      extend: function( src, des){
        return Object.assign(src, des);
      },
      clone: function(src){
        return clone(src);
      },
      contains: function( arr, key){
        return key in arr;
      },
      now: function(){
        return new Date().getTime();
      }
    }

    function signParams (args){
        var ks = [];
        for(var k in args){
            ks.push(k);
        }
        ks = ks.sort();
        var strArgs = [];
        ks.forEach(function(item){
            var val = args[item];
            if(_.isObject(val)){
                val = JSON.stringify(val);
            }
            strArgs.push(item+'='+encodeURIComponent(val));
        });
        var content = strArgs.join('&');
        var d = md5(content);
        return d;

    }
    return (function (http) {
        var _options = {
            mode:'DEV',
            appkey:'',
            masterKey:'',
            v:'0.0.1',
            endpoint:'http://localhost:8080/api'
        };
        var endpoint = _options.endpoint;
        var _ping = function(){
          console.log(endpoint.replace(/api$/, 'ping'))
          return http.get(endpoint.replace(/api$/, 'ping'));
        }
        var _exec = function(action,args){
          delete args.scope;
          //这里如果 action 传入的是object 带有版本号，则需要进行转换
          var v = _options.v;
          if(_.isObject(action)){
            v = action.v || v;
            action = action.action;
          }else if(_.isString(action)){
            var pos = action.indexOf('@');
            if(pos > 1){
              v = action.substr(pos + 1);
              action = action.substr(0,pos);
            }
          }
          var arr = {method:action,appkey:_options.appkey,masterKey:_options.masterKey,timestamp: _.now(),param: JSON.stringify(args),v:v};
          var sign = signParams(arr);
          arr.sign = sign;
          delete arr.masterKey;
          return new Promise( function(resolve, reject){
            http.post(endpoint, arr)
            //   {
            //   url: ,
            //   method: 'POST',
            //   headers: {
            //     'Content-Type': 'application/json; charset=UTF-8'
            //   },
            //   data: arr
            // })
              .then(function(rsp){
                var data = rsp.data;
                if(data.errno === 0){
                    resolve(data.data);
                }else{
                    reject(data);
                }
            }).catch(function(err){
                reject(err);
            });
          })
        };

        var _Object = function(t,d){
            if(!_.isString(t)){
                throw new Error('Object Class should be String');
            }
            this._t = t;
            this._d = d||{};
            this.objectId = this._d.id||undefined;
        };

        _Object.prototype.toJson = function(){
            return this._d;
        };

        _Object.prototype.print = function(){
            console.log("id="+this.objectId);
            console.log("createAt="+this._d.createAt);
            console.log("updateAt="+this._d.updateAt);
            console.log("data="+JSON.stringify(this._d));
        };

        _Object.prototype.set = function(k,v){
            //直接传递了对象
            if(_.isObject(k)){
                this._d = _.extend(this._d,k);
            }else{
                this._d[k] = v;
            }
            return this;
        };

        /**
         * 获取参数
         * @param k 键值
         * @returns {*}
         */
        _Object.prototype.get = function(k){
            if(k){
                return this._d[k];
            }
            return this._d;
        };

        _Object.prototype.getById = function(id){
            this.objectId = id;
            var THIS = this;
            var arg = {table:this._t,id:id};
            return new Promise(function(resolve, reject){
              _exec('common.get',arg).then(function(data){
                  THIS._d = data;
                  resolve(THIS);
              }).catch(function(err){
                  reject(err);
              });
            });
        };

        _Object.prototype.save = function(d){
            //WARING:没有objectid的不允许进行保存
            if(this.objectId === undefined){
              return new Promise(function(resolve, reject){
                reject(E.Object.SAVE_ERROR);
              });
            }
            if(d){
                this._d = d;
            }
            this._d.updateAt = new Date().getTime();
            var THIS = this;
            var arg = {table:this._t,condition:' id = '+this.objectId,row:this._d};
            return new Promise(function(resolve, reject){
              _exec('common.update',arg).then(function(){
                  resolve(THIS);
              }).catch(function(err){
                  reject(err);
              });
            });
        };

        _Object.prototype.remove = function(){
            //WARING:没有objectid的不允许进行删除
            if(this.objectId === undefined){
              return new Promise(function(resolve, reject){
                reject(E.Object.REMOVE_ERROR);
              });
            }
            var arg = {table:this._t,id:this.objectId};
            return new Promise(function(resolve, reject){
              _exec('common.remove',arg).then(function(){
                    resolve(1);
                }).catch(function(err){
                    reject(err);
                });
            });
        };

        _Object.prototype.create = function(d){
            //WARING:有objectid的不允许进行重复的创建
            if(this.objectId !== undefined){
              return new Promise(function(resolve, reject){
                reject(E.Object.CREATE_ERROR);
              });
            }
            if(d){
                this._d = d;
            }
            //生成创建时间
            this._d.updateAt = this._d.createAt = new Date().getTime();
            var THIS = this;
            var arg = {table:this._t,row:this._d};
            return new Promise(function(resolve, reject){
              _exec('common.create',arg).then(function(data){
                  THIS.objectId = data.insertId;
                  THIS._d.id = THIS.objectId;
                  resolve(THIS);
              }).catch(function(err){
                  reject(err);
              });
            });
        };



        //################Query###################

        var _Query = function(t){
            if(!_.isString(t)){
                throw new Error('Class should be String');
            }
            this._t = t;         //table
            this._s = 'id-';    //sort
            this._l = 100;       //limit
            this._k = 0;        //skip
            this._c = ' 1=1 ';  //condition
            this._f = '*';      //fields
        };

        _Query.prototype.sort = function(s){
            this._s = s;
            return this;
        };

        _Query.prototype.page = function(p,l){
            this._l = l||100;
            this._k = (p-1) * this._l;
            return this;
        };

        _Query.prototype.condition = function(c){
            this._c = c;
            return this;
        };

        _Query.prototype.and = function(a){
            this._c = this._c +' and ' + a;
            return this;
        }

        _Query.prototype.or = function(o){
            this._c = this._c +' or ' + o;
            return this;
        }

        //设定查询的字段
        _Query.prototype.select = function(f){
            //主动包含ID，createAt,updateAt
            if(_.isString(f)){
                f = f.split(',');
            }
            if(!_.contains(f,'id')){
                f.push('id');
            }
            if(!_.contains(f,'createAt')){
                f.push('createAt');
            }
            if(!_.contains(f,'updateAt')){
                f.push('updateAt');
            }
            f = f.join(',');
            this._f = f;
            return this;
        };

        _Query.prototype.count = function(){
            var arg = {table:this._t,condition:this._c};
            return _exec('common.count',arg);
        };

        _Query.prototype.findAndCount = function(){
            var THIS = this;
            var arg = {table:this._t,condition:this._c,sort:this._s,limit:this._l,skip:this._k,fields:this._f};
            return new Promise(function(resolve, reject){
              _exec('common.findAndCount',arg).then(function(data){
                  //将数据转换成列表
                  //TODO:check是否没有数据
                  var list = [];
                  if(!_.isEmpty(data)){
                      _.each(data.rows,function(item){
                          var o = new _Object(THIS._t,item);
                          list.push(o);
                      })
                  }
                  data.rows = list;
                  resolve(data);
              }).catch(function(err){
                  reject(err);
              });
            });
        };

        _Query.prototype.first = function(){
            var THIS = this;
            var arg = {table:this._t,condition:this._c,sort:this._s,limit:this._l,skip:this._k,fields:this._f};
            return new Promise(function(resolve, reject){
              _exec('common.first',arg).then(function(data){
                  var o;
                  //未搜索到数据的判断
                  if(_.isArray(data)){
                      if(data.length === 0){
                          //nodata
                          o = new _Object(THIS._t);
                          resolve(o);
                      }
                  }else if(_.isObject(data)){
                      //找到了数据
                      o = new _Object(THIS._t,data);
                      resolve(o);
                  }

              }).catch(function(err){
                  reject(err);
              });
            });
        };

        _Query.prototype.find = function(){
            var THIS = this;
            var arg = {table:this._t,condition:this._c,sort:this._s,limit:this._l,skip:this._k,fields:this._f};
            return new Promise(function(resolve, reject){
              _exec('common.find',arg).then(function(data){
                  //将数据转换成列表
                  var list = [];
                  if(!_.isEmpty(data)){
                      _.each(data,function(item){
                          var o = new _Object(THIS._t,item);
                          list.push(o);
                      })
                  }
                  resolve(list);
              }).catch(function(err){
                  reject(err);
              });
            });
        };

        _Query.prototype.clear = function(){
            var arg = {table:this._t,condition:this._c};
            return _exec('common.clear',arg);
        };

        var _Function = function(f){
            this._f = f;
        };

        _Function.prototype.invoke = function(args){
            return _exec(this._f,args);
        };

        return {
            init: function (options) {
                options = options || {};
                for(var k in options){
                    _options[k] = options[k];
                }
                endpoint = _options.endpoint;
            },
            Object:_Object,

            Query:_Query,

            Function:_Function,

            ping: _ping,


        };

      })(fly);

})();