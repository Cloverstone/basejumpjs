//BaseJump

// gform.collections =  new gform.collectionManager()
"use strict";
const baseJump =  (options) => {
    const worker = new Worker('assets/js/_jWorker.js')

    const _eventBus = function() {
        let handlers = {};
        this.on = (event, handler, options) => {
            if(typeof options == 'number'){
                options = {count:options}
            }
            if(typeof event !== 'undefined'){
                var events = event.split(' ');
                events.forEach(event => {
                    handlers[event] = handlers[event] ||[];
                    if(typeof handler !== 'function') throw "Event handler must be a function"
                    handlers[event].push({handler:handler, id:_j.uid,...options});
                });
            }
            return handlers;
        };

        this.off = (event, id) => {
            handlers[event].splice(handlers[event].findIndex(elem => elem.id = id),1)
        };

        this._handlers = () => handlers;
        this.dispatch = (e, data) => {
            let a = data || {};
            let pd = true;
            let propagate = true;
            a.preventDefault = () => { pd = true; }
            a.stopPropagation = () => { propagate = false; }

            let events = [];
            if(typeof e == 'string'){
                e = e.split(' ');
            }
            if(typeof e !== 'object' || !Array.isArray(e)) throw 'Event must be a string or array'
            events = events.concat(e)

            events.forEach((event) => {
                a.event = event;
                let f = (handler) => {
                    if(typeof handler.handler == 'function'){
                        a.id = handler.id;
                        handler.handler(a);
                        if(typeof handler.count !== 'undefined'){
                            handler.count--;
                            if(!handler.count){
                                handlers[event].splice(handlers[event].findIndex(elem => elem.id = handler.id),1)
                            }
                        }
                    }
                    return propagate;
                }
                if(event in handlers)handlers[event].every(f);
                if('*' in handlers)handlers['*'].every(f);
            })
            return a;
        }
    }
    const eb = new _eventBus(),
    // const broadcastOptions = options.broadcast||{};
    _genuuid = () => {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }
     
      
    //   postData('https://example.com/answer', { answer: 42 })
    //     .then(data => {
    //       console.log(data); // JSON data parsed by `data.json()` call
    //     });

    let api =  {
        router: (url = '', data = {}, method = "GET") => {
            // Default options are marked with *
            debugger;
            const response = await fetch(url, {
              method: method, // *GET, POST, PUT, DELETE, etc.
              mode: 'cors', // no-cors, *cors, same-origin
              cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
              credentials: 'same-origin', // include, *same-origin, omit
              headers: {
                'Content-Type': 'application/json'
                // 'Content-Type': 'application/x-www-form-urlencoded',
              },
              redirect: 'follow', // manual, *follow, error
              referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
              body: JSON.stringify({_token:options._token,...data}) // body data type must match "Content-Type" header
            });
            return response.json(); // parses JSON response into native JavaScript objects
          },
        findEl: elem => {
            if(typeof elem == 'string'){
                elem = document.querySelector(elem);
            }
            if( !(elem instanceof Element || elem instanceof HTMLDocument)) throw 'Target must be an element or element selector';
            return elem||false;
        },
        create: text => document.createRange().createContextualFragment(text).firstChild,
        attach: (elem, content, append=true) => {
            elem = _j.findEl(elem)
            if(!append){
                while (elem.firstChild) {
                    elem.removeChild(elem.firstChild);
                }
            }
            let child = _j.create(content);
            elem.appendChild(child);
            return child;
        },
        addClass: (elem, cls) => {
            elem = _j.findEl(elem)   
            if(typeof cls == 'string'){
                cls = cls.split(' ')
            }
            if(!Array.isArray(cls)) throw 'Classes must be a string or an array';
            elem.classList.add(...cls);
        },
        removeClass: (elem, cls) => {
            elem = _j.findEl(elem)
      
            if(typeof cls == 'string'){
                cls = cls.split(' ')
            }
            if(!Array.isArray(cls)) throw 'Classes must be a string or an array';
            elem.classList.remove(...cls);
        },
        hasClass: (elem, cls) => {
            elem = _j.findEl(elem)

            return  (elem.className.indexOf(cls) !== -1);
        },
        toggleClass: (elem, cls, status) => {
            elem = _j.findEl(elem)

            if((typeof status == 'boolean')?status:_j.hasClass(cls)){
                _j.addClass(elem, cls)
            }else{
                _j.removeClass(elem, cls)
            }      
        },
        // layout: options => {

        // },
        // intervalTask:(actions,interval)=>{
        //     let actions = actions||[];
        //     let myinterval = setInterval(function(){
        //       if(actions.length){
        //         if(typeof actions[0] == "function"){
        //           actions.shift().call(this)
        //         }else{actions.shift()}
        //       }
        //       if(!actions.length){
        //         clearInterval(myinterval);
        //       }
        //     },interval||1000)
        //     return myinterval;
        // },
        // eventbus:  
        version: '0.0.0.1',
        schedule: (method, interval,) => {
            let options = {limit:0}
            let count  = 0;
            eb.on('schedule',(e) => {
                if(!(e.ticks%interval)) {
                    e.count = ++count;
                    method.call(null,e);
                    if(options.limit && e.count >= options.limit) {
                        eb.off('schedule', e.id)
                    }
                }
            })
        },
        incrementer: function* (prefix) {
            let i = 0;
            while (true) {
                yield ((typeof prefix !== 'undefined')?prefix:0) + i++;
            }
        },
        broadcast: message => {
            let packet = {data:{...message,...(options.broadcast||{}),id:api.uid}};
            eb.dispatch('broadcast', packet)
            let encodedMessage = JSON.stringify(packet.data);
            window.localStorage.setItem("_j_broadcast", encodedMessage)
        },
        fetchJSON: files => {
            return Promise.all(
              files.map(file => fetch(file.url, {
                method: file.method||'get',
            }))
            )
            .then(
              responses => Promise.all(
                responses.map(response => {
                  return response.json();
                })
              )
            ).then(results =>
              results.reduce((files, result, idx) => {
                files[idx].content = result;
                switch (files[idx].format){
                    case 'csv':
                        // __.processData(_.csvToArray(result, files[idx]),files[idx]);
                        //break;
                    default:
                        files[idx].data = result;
                }
                return files;
              }, files)
            );
        },
        csv:{
            parse: (csvString,options) => {
                options = _.extend({skip:0},options)
                var trimQuotes = function (stringArray) {
                  if(stringArray == null)return [];
                  for (var i = 0; i < stringArray.length; i++) {
                      // stringArray[i] = _.trim(stringArray[i], '"');
                      if(stringArray[i][0] == '"' && stringArray[i][stringArray[i].length-1] == '"'){
                        stringArray[i] = stringArray[i].substr(1,stringArray[i].length-2)
                      }
                      stringArray[i] = stringArray[i].split('""').join('"')
                  }
                  return stringArray;
                }
                var csvRowArray    = csvString.split('﻿')[0].split(/\n/);
                csvRowArray.splice(0,options.skip);
                
                // csvRowArray.shift()
                var keys = (options.keys)?options.keys:trimQuotes(csvRowArray.shift().match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g));
                var objectArray     = [];
                
                while (csvRowArray.length) {
                    var rowCellArray = trimQuotes(csvRowArray.shift().match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g));
                    if(rowCellArray.length){
                    //   var rowObject    = _.zipObject(keys, rowCellArray);

                var source = rowCellArray
                var rowObject = keys.reduce((result,label,index)=>{result[label] = source[index]||'';return result;},{})
                      objectArray.push(rowObject);
                    }
                }
                return(objectArray);
              },
              unparse: (data, columns) => {
            
                var csv = '"'+_.map(columns,'label').join('","')+'"\n';
                labels = _.map(columns,'name')
                // var empty = _.zipObject(labels, _.map(labels, function() { return '';}))
                // let empty = labels.map((label)=>  )
                var empty = labels.reduce((result,label)=>{result[label] = '';return result;},{})

                csv += _.map(data,function(d){
                    return JSON.stringify(_.map(_.values(_.extend(empty,_.pick(d,labels))),function(item){
                      if(typeof item == 'string'){
                        return item.split('"').join('""');
                      }else{return item}
                    }))
                    //return JSON.stringify(_.values(_.extend(empty,_.pick(d,labels))))
                },this)
                .join('\n') 
                .replace(/(^\[)|(\]$)/mg, '')

                // api.download({
                //     url: (title||"GrapheneDataGrid"),
                //     data: csv,
                //     extension:'csv'
                // })
                return true;
              }
        },
        download: function(options){
            if(typeof options == 'string'){
              if(jsZip !== null){
                jsZip.generateAsync({type:"blob"}).then(function (content) {
                    content = URL.createObjectURL(content);
                    api.download({url:content, label: options, extension: "zip"});
                    jsZip = null;
                });
              }
              return;
            }
            if(typeof options.data == 'object'){
              options.data = JSON.stringify(options.data)
            }
            if(typeof options.data !== 'string' && typeof options.url !== 'string'){
              console.error("Download data must be string")
              return false;
            }
            
            switch(options.extension){
              // case 'svg':
              //   options.url = "data:image/svg+xml;charset=utf-8,";
              //   break;
              case 'png':
                options.url = options.url||"data:image/png;charset=utf-8,"
                break;
              case 'json':
                options.url = options.url||"data:application/json;charset=utf-8,"
                break;
                case 'csv':
                options.url = options.url||"data:text/csv;charset=utf-8,"
                break;
              default:
                options.extension = options.extension||'json'
                options.url = options.url||"";
            }
            let fileName =  (options.label||"data")+'.'+options.extension;
      
      
            if(jsZip == null || options.extension == 'zip'){
              var link = document.createElement("a");
              link.setAttribute("href", (typeof options.data !== 'undefined' && options.data.indexOf('data:')!== 0)?options.url + encodeURIComponent(options.data):options.url);
          
              link.setAttribute("download", fileName);
          
              document.body.appendChild(link); // Required for FF
              link.click();
              document.body.removeChild(link);
              return(true);
            }else{
              folder.file(fileName, (options.data)?btoa(options.data):getBase64String(options.url), {base64 : true});
            }
        },
        ...eb
    }
    api.data = (refObject => {
        let collections = refObject||{};
        let _add = (name,value) => {
            collections[name] = value;
            if(typeof api.data[name] == 'undefined'){
                Object.defineProperty(api.data, name, {
                    get: () => collections[name].value,
                    set: data => {
                        collections[name].value = data;
                        eb.dispatch(name+' change:'+name, {...collections[name]});
                    }
                });
                eb.dispatch('add '+name+' change:'+name, {...collections[name]});
            }
        }
        let collectionApi = {
            add: (name, data) => {
                if(typeof name == 'object'){
                    collections[name.name] = {value: null, status: false};
                    api.fetchJSON([name]).then(result => {
                        
                        _add(result[0].name,result[0].data)
                        eb.dispatch(name+' status:'+name, collections[name]);

                    })
                }
                _add(name,{value: data, status: true})
            },
            get: name => collections[name].value,
            set: (name, data) => {
                if(typeof data !== 'undefined') {
                    collections[name].value = data;
                    eb.dispatch(name+' change:'+name, collections[name]);
                }
            },
            has:search => search?search in collections:Object.keys(collections)
            
        }
        Object.defineProperty(collectionApi, 'status',{
            get: () => Object.keys(collections).reduce((status, item) => {status[item] = collections[item].status;return status;}, {})
        });
        return collectionApi;
    })(),

    worker.onmessage = (message)=>{
        eb.dispatch('schedule', message.data)
    }
    // const schedule = api.incrementer();
    // setInterval(() => {
    //     eb.dispatch('schedule',{ticks: schedule.next().value})
    // }, 1000)

    // const genUid = api.incrementer('_j')
    Object.defineProperty(api, 'uid',{
        get: () => _genuuid()//genUid.next().value
    });

    window.addEventListener('storage', (event) => {
        if (event.storageArea != localStorage) return;
        if (event.key === '_j_broadcast') {
            if(event.newValue !== ""){
                eb.dispatch('broadcast', {data:JSON.parse(event.newValue)});
            }
        }
    });
    

    return api;
}
export const _j = baseJump({broadcast:{app:"custom"},_token:document.querySelector('[name=csrf-token]').content});

window.onload = ()=> {
    if(window.localStorage.getItem("_j_broadcast") !== null && window.localStorage.getItem("_j_broadcast") !== ""){
        _j.dispatch('broadcast', {data:JSON.parse(window.localStorage.getItem("_j_broadcast"))});
    }
}


// _j.fetchJSON([
//     {url: './assets/data/months.json', name: 'Months'}
// ]).then(result => {
// // debugger;
//     // resources.chart.waiting = __.yieldArray(result);
//     // __.chartFile(resources.chart.waiting.next().value)
//   })

// _j.schedule((message) => {
//     console.log('tick:'+message.id)
// },3,{limit:3})

// _j.schedule((message) => {
//     console.log('tock:'+message.count)
// },7)

//collections
//state
//forms (gforms)
//lists/grids (grapheneGrid)
//fetch
//layout (cob)


// const temp = new Promise((resolve,reject) =>{
//     debugger;
//     resolve ('hello');
// } ).then((data)=> {
//     return new Promise((resolve,reject) => {
//         debugger;
//         resolve('another'+data)
//     })
// }).then(
//     (e,r,r2)=>{
//         debugger;
//         console.log(e)
//         return 'second'+e;
//     }
// ).then(stuff =>{
//     console.log('third:'+stuff)
//     return "- from third"
// }).then(stuff =>{
//     console.log('fourth:'+stuff)
// }).finally(
//     data => {
//         console.log("finally:"+data)
//     }
// )
