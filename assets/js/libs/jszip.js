/**

JSZip - A Javascript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2012 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See LICENSE.markdown.

**/

var JSZip=function(data,options){this.files={};this.root="";if(data)this.load(data,options)};JSZip.signature={LOCAL_FILE_HEADER:"PK\u0003\u0004",CENTRAL_FILE_HEADER:"PK\u0001\u0002",CENTRAL_DIRECTORY_END:"PK\u0005\u0006",ZIP64_CENTRAL_DIRECTORY_LOCATOR:"PK\u0006\u0007",ZIP64_CENTRAL_DIRECTORY_END:"PK\u0006\u0006",DATA_DESCRIPTOR:"PK\u0007\b"};JSZip.defaults={base64:false,binary:false,dir:false,date:null};
JSZip.prototype=function(){var ZipObject=function(name,data,options){this.name=name;this.data=data;this.options=options};ZipObject.prototype={asText:function(){var result=this.data;if(result===null)return result;if(this.options.base64)result=JSZipBase64.decode(result);if(this.options.binary)result=JSZip.prototype.utf8decode(result);return result},asBinary:function(){var result=this.data;if(result===null)return result;if(this.options.base64)result=JSZipBase64.decode(result);if(!this.options.binary)result=
JSZip.prototype.utf8encode(result);return result},asUint8Array:function(){return JSZip.utils.string2Uint8Array(this.asBinary())},asArrayBuffer:function(){return JSZip.utils.string2Uint8Array(this.asBinary()).buffer}};var decToHex=function(dec,bytes){var hex="",i;for(i=0;i<bytes;i++){hex+=String.fromCharCode(dec&255);dec=dec>>>8}return hex};var extend=function(){var result={},i,attr;for(i=0;i<arguments.length;i++)for(attr in arguments[i])if(arguments[i].hasOwnProperty(attr)&&typeof result[attr]===
"undefined")result[attr]=arguments[i][attr];return result};var prepareFileAttrs=function(o){o=o||{};if(o.base64===true&&o.binary==null)o.binary=true;o=extend(o,JSZip.defaults);o.date=o.date||new Date;return o};var fileAdd=function(name,data,o){var parent=parentFolder(name);if(parent)folderAdd.call(this,parent);o=prepareFileAttrs(o);if(o.dir)data=null;else if(JSZip.support.uint8array&&data instanceof Uint8Array){o.base64=false;o.binary=true;data=JSZip.utils.uint8Array2String(data)}else if(JSZip.support.arraybuffer&&
data instanceof ArrayBuffer){o.base64=false;o.binary=true;var bufferView=new Uint8Array(data);data=JSZip.utils.uint8Array2String(bufferView)}else if(o.binary&&!o.base64){if(o.optimizedBinaryString!==true)data=JSZip.utils.string2binary(data);delete o.optimizedBinaryString}return this.files[name]=new ZipObject(name,data,o)};var parentFolder=function(path){if(path.slice(-1)=="/")path=path.substring(0,path.length-1);var lastSlash=path.lastIndexOf("/");return lastSlash>0?path.substring(0,lastSlash):""};
var folderAdd=function(name){if(name.slice(-1)!="/")name+="/";if(!this.files[name]){var parent=parentFolder(name);if(parent)folderAdd.call(this,parent);fileAdd.call(this,name,null,{dir:true})}return this.files[name]};var prepareLocalHeaderData=function(file,utfEncodedFileName,compressionType){var useUTF8=utfEncodedFileName!==file.name,data=file.asBinary(),o=file.options,dosTime,dosDate;dosTime=o.date.getHours();dosTime=dosTime<<6;dosTime=dosTime|o.date.getMinutes();dosTime=dosTime<<5;dosTime=dosTime|
o.date.getSeconds()/2;dosDate=o.date.getFullYear()-1980;dosDate=dosDate<<4;dosDate=dosDate|o.date.getMonth()+1;dosDate=dosDate<<5;dosDate=dosDate|o.date.getDate();var hasData=data!==null&&data.length!==0;var compression=JSZip.compressions[compressionType];var compressedData=hasData?compression.compress(data):"";var header="";header+="\n\x00";header+=useUTF8?"\x00\b":"\x00\x00";header+=hasData?compression.magic:JSZip.compressions["STORE"].magic;header+=decToHex(dosTime,2);header+=decToHex(dosDate,
2);header+=hasData?decToHex(this.crc32(data),4):"\x00\x00\x00\x00";header+=hasData?decToHex(compressedData.length,4):"\x00\x00\x00\x00";header+=hasData?decToHex(data.length,4):"\x00\x00\x00\x00";header+=decToHex(utfEncodedFileName.length,2);header+="\x00\x00";return{header:header,compressedData:compressedData}};return{load:function(stream,options){throw new Error("Load method is not defined. Is the file jszip-load.js included ?");},filter:function(search){var result=[],filename,relativePath,file,
fileClone;for(filename in this.files){if(!this.files.hasOwnProperty(filename))continue;file=this.files[filename];fileClone=new ZipObject(file.name,file.data,extend(file.options));relativePath=filename.slice(this.root.length,filename.length);if(filename.slice(0,this.root.length)===this.root&&search(relativePath,fileClone))result.push(fileClone)}return result},file:function(name,data,o){if(arguments.length===1)if(name instanceof RegExp){var regexp=name;return this.filter(function(relativePath,file){return!file.options.dir&&
regexp.test(relativePath)})}else return this.filter(function(relativePath,file){return!file.options.dir&&relativePath===name})[0]||null;else{name=this.root+name;fileAdd.call(this,name,data,o)}return this},folder:function(arg){if(!arg)return this;if(arg instanceof RegExp)return this.filter(function(relativePath,file){return file.options.dir&&arg.test(relativePath)});var name=this.root+arg;var newFolder=folderAdd.call(this,name);var ret=this.clone();ret.root=newFolder.name;return ret},remove:function(name){name=
this.root+name;var file=this.files[name];if(!file){if(name.slice(-1)!="/")name+="/";file=this.files[name]}if(file)if(!file.options.dir)delete this.files[name];else{var kids=this.filter(function(relativePath,file){return file.name.slice(0,name.length)===name});for(var i=0;i<kids.length;i++)delete this.files[kids[i].name]}return this},generate:function(options){options=extend(options||{},{base64:true,compression:"STORE",type:"base64"});var compression=options.compression.toUpperCase();var directory=
[],files=[],fileOffset=0;if(!JSZip.compressions[compression])throw compression+" is not a valid compression method !";for(var name in this.files){if(!this.files.hasOwnProperty(name))continue;var file=this.files[name];var utfEncodedFileName=this.utf8encode(file.name);var fileRecord="",dirRecord="",data=prepareLocalHeaderData.call(this,file,utfEncodedFileName,compression);fileRecord=JSZip.signature.LOCAL_FILE_HEADER+data.header+utfEncodedFileName+data.compressedData;dirRecord=JSZip.signature.CENTRAL_FILE_HEADER+
"\u0014\x00"+data.header+"\x00\x00"+"\x00\x00"+"\x00\x00"+(this.files[name].options.dir===true?"\u0010\x00\x00\x00":"\x00\x00\x00\x00")+decToHex(fileOffset,4)+utfEncodedFileName;fileOffset+=fileRecord.length;files.push(fileRecord);directory.push(dirRecord)}var fileData=files.join("");var dirData=directory.join("");var dirEnd="";dirEnd=JSZip.signature.CENTRAL_DIRECTORY_END+"\x00\x00"+"\x00\x00"+decToHex(files.length,2)+decToHex(files.length,2)+decToHex(dirData.length,4)+decToHex(fileData.length,4)+
"\x00\x00";var zip=fileData+dirData+dirEnd;switch(options.type.toLowerCase()){case "uint8array":return JSZip.utils.string2Uint8Array(zip);case "arraybuffer":return JSZip.utils.string2Uint8Array(zip).buffer;case "blob":return JSZip.utils.string2Blob(zip);case "base64":return options.base64?JSZipBase64.encode(zip):zip;default:return zip}},crc32:function(str,crc){if(str===""||typeof str==="undefined")return 0;var table=[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,
2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,
671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,
3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,
426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,
3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,936918E3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,
3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117];if(typeof crc=="undefined")crc=0;var x=0;var y=0;crc=crc^-1;for(var i=0,iTop=str.length;i<iTop;i++){y=(crc^str.charCodeAt(i))&255;x=table[y];crc=crc>>>8^x}return crc^-1},clone:function(){var newObj=new JSZip;for(var i in this)if(typeof this[i]!=="function")newObj[i]=this[i];return newObj},utf8encode:function(string){string=string.replace(/\r\n/g,"\n");var utftext="";for(var n=
0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128)utftext+=String.fromCharCode(c);else if(c>127&&c<2048){utftext+=String.fromCharCode(c>>6|192);utftext+=String.fromCharCode(c&63|128)}else{utftext+=String.fromCharCode(c>>12|224);utftext+=String.fromCharCode(c>>6&63|128);utftext+=String.fromCharCode(c&63|128)}}return utftext},utf8decode:function(utftext){var string="";var i=0;var c=0,c1=0,c2=0,c3=0;while(i<utftext.length){c=utftext.charCodeAt(i);if(c<128){string+=String.fromCharCode(c);i++}else if(c>
191&&c<224){c2=utftext.charCodeAt(i+1);string+=String.fromCharCode((c&31)<<6|c2&63);i+=2}else{c2=utftext.charCodeAt(i+1);c3=utftext.charCodeAt(i+2);string+=String.fromCharCode((c&15)<<12|(c2&63)<<6|c3&63);i+=3}}return string}}}();JSZip.compressions={"STORE":{magic:"\x00\x00",compress:function(content){return content},uncompress:function(content){return content}}};
JSZip.support={arraybuffer:function(){return typeof ArrayBuffer!=="undefined"&&typeof Uint8Array!=="undefined"}(),uint8array:function(){return typeof Uint8Array!=="undefined"}(),blob:function(){if(typeof ArrayBuffer==="undefined")return false;var buffer=new ArrayBuffer(0);try{return(new Blob([buffer],{type:"application/zip"})).size===0}catch(e){}try{var builder=new (window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder);builder.append(buffer);return builder.getBlob("application/zip").size===
0}catch(e){}return false}()};
JSZip.utils={string2binary:function(str){var result="";for(var i=0;i<str.length;i++)result+=String.fromCharCode(str.charCodeAt(i)&255);return result},string2Uint8Array:function(str){if(!JSZip.support.uint8array)throw new Error("Uint8Array is not supported by this browser");var buffer=new ArrayBuffer(str.length);var bufferView=new Uint8Array(buffer);for(var i=0;i<str.length;i++)bufferView[i]=str.charCodeAt(i);return bufferView},uint8Array2String:function(array){if(!JSZip.support.uint8array)throw new Error("Uint8Array is not supported by this browser");var result=
"";for(var i=0;i<array.length;i++)result+=String.fromCharCode(array[i]);return result},string2Blob:function(str){if(!JSZip.support.blob)throw new Error("Blob is not supported by this browser");var buffer=JSZip.utils.string2Uint8Array(str).buffer;try{return new Blob([buffer],{type:"application/zip"})}catch(e){}try{var builder=new (window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder);builder.append(buffer);return builder.getBlob("application/zip")}catch(e){}throw new Error("Bug : can't construct the Blob.");
}};
var JSZipBase64=function(){var _keyStr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";return{encode:function(input,utf8){var output="";var chr1,chr2,chr3,enc1,enc2,enc3,enc4;var i=0;while(i<input.length){chr1=input.charCodeAt(i++);chr2=input.charCodeAt(i++);chr3=input.charCodeAt(i++);enc1=chr1>>2;enc2=(chr1&3)<<4|chr2>>4;enc3=(chr2&15)<<2|chr3>>6;enc4=chr3&63;if(isNaN(chr2))enc3=enc4=64;else if(isNaN(chr3))enc4=64;output=output+_keyStr.charAt(enc1)+_keyStr.charAt(enc2)+_keyStr.charAt(enc3)+_keyStr.charAt(enc4)}return output},
decode:function(input,utf8){var output="";var chr1,chr2,chr3;var enc1,enc2,enc3,enc4;var i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(i<input.length){enc1=_keyStr.indexOf(input.charAt(i++));enc2=_keyStr.indexOf(input.charAt(i++));enc3=_keyStr.indexOf(input.charAt(i++));enc4=_keyStr.indexOf(input.charAt(i++));chr1=enc1<<2|enc2>>4;chr2=(enc2&15)<<4|enc3>>2;chr3=(enc3&3)<<6|enc4;output=output+String.fromCharCode(chr1);if(enc3!=64)output=output+String.fromCharCode(chr2);if(enc4!=64)output=
output+String.fromCharCode(chr3)}return output}}}();