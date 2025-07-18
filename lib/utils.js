/**
 * Copyright 2019 Huawei Technologies Co.,Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use
 * this file except in compliance with the License.  You may obtain a copy of the
 * License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations under the License.
 *
 */

const crypto = require('crypto');
const fs = require('fs');
const events = require('events');
const httpLib = require('http');
const httpsLib = require('https');
const { XMLParser } = require('fast-xml-parser')
const urlLib = require('url');
const pathLib = require('path');
const streamLib = require('stream');
const obsModel = require('./obsModel');
const v2Model = require('./v2Model');
const enums = require('./enums');
const options = {
	ignoreAttributes: true,
	parseTagValue: false,
	trimValues: false
};
const {
	IAM_DOMAIN_PATH_EXTENSION
} = enums;
const parser = new XMLParser(options);
const DEFAULT_SHADOW_EXPIRES = 15 * 60;
const CONTENT_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const OBS_SDK_VERSION = '3.24.12';

const mimeTypes = {
    '7z' : 'application/x-7z-compressed',
    'aac' : 'audio/x-aac',
    'ai' : 'application/postscript',
    'aif' : 'audio/x-aiff',
    'asc' : 'text/plain',
    'asf' : 'video/x-ms-asf',
    'atom' : 'application/atom+xml',
    'avi' : 'video/x-msvideo',
    'bmp' : 'image/bmp',
    'bz2' : 'application/x-bzip2',
    'cer' : 'application/pkix-cert',
    'crl' : 'application/pkix-crl',
    'crt' : 'application/x-x509-ca-cert',
    'css' : 'text/css',
    'csv' : 'text/csv',
    'cu' : 'application/cu-seeme',
    'deb' : 'application/x-debian-package',
    'doc' : 'application/msword',
    'docx' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'dvi' : 'application/x-dvi',
    'eot' : 'application/vnd.ms-fontobject',
    'eps' : 'application/postscript',
    'epub' : 'application/epub+zip',
    'etx' : 'text/x-setext',
    'flac' : 'audio/flac',
    'flv' : 'video/x-flv',
    'gif' : 'image/gif',
    'gz' : 'application/gzip',
    'htm' : 'text/html',
    'html' : 'text/html',
    'ico' : 'image/x-icon',
    'ics' : 'text/calendar',
    'ini' : 'text/plain',
    'iso' : 'application/x-iso9660-image',
    'jar' : 'application/java-archive',
    'jpe' : 'image/jpeg',
    'jpeg' : 'image/jpeg',
    'jpg' : 'image/jpeg',
    'js' : 'text/javascript',
    'mjs' : 'text/javascript',
    'json' : 'application/json',
    'latex' : 'application/x-latex',
    'log' : 'text/plain',
    'm4a' : 'audio/mp4',
    'm4v' : 'video/mp4',
    'mid' : 'audio/midi',
    'midi' : 'audio/midi',
    'mov' : 'video/quicktime',
    'mp3' : 'audio/mpeg',
    'mp4' : 'video/mp4',
    'mp4a' : 'audio/mp4',
    'mp4v' : 'video/mp4',
    'mpe' : 'video/mpeg',
    'mpeg' : 'video/mpeg',
    'mpg' : 'video/mpeg',
    'mpg4' : 'video/mp4',
    'oga' : 'audio/ogg',
    'ogg' : 'audio/ogg',
    'ogv' : 'video/ogg',
    'ogx' : 'application/ogg',
    'pbm' : 'image/x-portable-bitmap',
    'pdf' : 'application/pdf',
    'pgm' : 'image/x-portable-graymap',
    'png' : 'image/png',
    'pnm' : 'image/x-portable-anymap',
    'ppm' : 'image/x-portable-pixmap',
    'ppt' : 'application/vnd.ms-powerpoint',
    'pptx' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ps' : 'application/postscript',
    'qt' : 'video/quicktime',
    'rar' : 'application/x-rar-compressed',
    'ras' : 'image/x-cmu-raster',
    'rss' : 'application/rss+xml',
    'rtf' : 'application/rtf',
    'sgm' : 'text/sgml',
    'sgml' : 'text/sgml',
    'svg' : 'image/svg+xml',
    'swf' : 'application/x-shockwave-flash',
    'tar' : 'application/x-tar',
    'tif' : 'image/tiff',
    'tiff' : 'image/tiff',
    'torrent' : 'application/x-bittorrent',
    'ttf' : 'application/x-font-ttf',
    'txt' : 'text/plain',
    'wav' : 'audio/x-wav',
    'webm' : 'video/webm',
    'wma' : 'audio/x-ms-wma',
    'wmv' : 'video/x-ms-wmv',
    'woff' : 'application/x-font-woff',
    'wsdl' : 'application/wsdl+xml',
    'xbm' : 'image/x-xbitmap',
    'xls' : 'application/vnd.ms-excel',
    'xlsx' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xml' : 'application/xml',
    'xpm' : 'image/x-xpixmap',
    'xwd' : 'image/x-xwindowdump',
    'yaml' : 'text/yaml',
    'yml' : 'text/yaml',
    'zip' : 'application/zip',	
};


const allowedResourceParameterNames = [        
	'acl',
	'backtosource',
    'policy',
    'torrent',
    'logging',
    'location',
    'storageinfo',
    'quota',
    'storageclass',
    'storagepolicy',
    'requestpayment',
    'versions',
    'versioning',
    'versionid',
    'uploads',
    'uploadid',
    'partnumber',
    'website',
    'notification',
    'replication',
    'lifecycle',
    'deletebucket',
    'delete',
    'cors',
    'restore',
    'tagging',
    'append',
    'position',
    'response-content-type',
    'response-content-language',
    'response-expires',
    'response-cache-control',
    'response-content-disposition',
    'response-content-encoding',
    'x-image-process',
    'x-oss-process',
    'x-image-save-object',
    'x-image-save-bucket',
	'encryption',
	'directcoldaccess',
	'rename',
	'name',
	'requestPayment',
	'metadata',
	'modify',
	'attname',
	'truncate',
	'x-obs-security-token',

	// workflow api
	'x-workflow-prefix',
	'x-workflow-start',
	'x-workflow-limit',
	'x-workflow-template-name',
	'x-workflow-graph-name',
	'x-workflow-execution-state',
	'x-workflow-execution-type',
	'x-workflow-next-marker',
	'obsworkflowtriggerpolicy',

	// virtual bucket api
	'obsbucketalias',
	'obsalias',
	'publicaccessblock',
	'bucketstatus',
	'policystatus',

	'customdomain'
];


const allowedResponseHttpHeaderMetadataNames = [
    'content-type',
    'content-md5',
    'content-length',
    'content-language',
    'expires',
    'origin',
    'cache-control',
    'content-disposition',
    'content-encoding',
    'x-default-storage-class',
    'location',
    'date',
    'etag',
    'host',
    'last-modified',
    'content-range',
    'x-reserved',
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-max-age',
    'access-control-allow-methods',
    'access-control-expose-headers',
    'connection'
];

const commonHeaders = {
	'content-length' : 'ContentLength',
	'date' : 'Date',
	'x-reserved' : 'Reserved'
};

const obsAllowedStorageClass = ['STANDARD', 'WARM', 'COLD', 'DEEP_ARCHIVE', 'INTELLIGENT_TIERING', 'HIGH_PERFORMANCE'];

// 服务端暂不支持S3协议的INTELLIGENT_TIERING、INTELLIGENT_TIERING
const v2AllowedStorageClass = ['STANDARD', 'STANDARD_IA', 'GLACIER', 'DEEP_ARCHIVE', 'INTELLIGENT_TIERING', 'HIGH_PERFORMANCE'];

const obsAllowedAcl = ['private', 'public-read', 'public-read-write', 'public-read-delivered', 'public-read-write-delivered','bucket-owner-full-control'];

const v2AllowedAcl = ['private', 'public-read', 'public-read-write', 'authenticated-read', 'bucket-owner-read', 'bucket-owner-full-control', 'log-delivery-write'];

const obsAllowedUri = ['Everyone', 'Logdelivery'];

const v2AllowedUri = ['http://acs.amazonaws.com/groups/global/AllUsers', 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers', 'http://acs.amazonaws.com/groups/s3/LogDelivery'];

const obsAllowedEvent = ['ObjectCreated:*', 'ObjectCreated:Put', 'ObjectCreated:Post', 'ObjectCreated:Copy', 
    'ObjectCreated:CompleteMultipartUpload', 'ObjectRemoved:*', 'ObjectRemoved:Delete', 'ObjectRemoved:DeleteMarkerCreated'];
const v2AllowedEvent = ['s3:ObjectCreated:*', 's3:ObjectCreated:Put', 's3:ObjectCreated:Post', 's3:ObjectCreated:Copy', 
    's3:ObjectCreated:CompleteMultipartUpload', 's3:ObjectRemoved:*', 's3:ObjectRemoved:Delete', 's3:ObjectRemoved:DeleteMarkerCreated'];

const negotiateMethod = 'HeadApiVersion';

const customDomainCertificateMethod = 'SetBucketCustomDomain'

const obsSignatureContext = {
	signature :	'obs',
	headerPrefix : 'x-obs-',
	headerMetaPrefix : 'x-obs-meta-',
	authPrefix : 'OBS',
	stsToken: 'x-obs-security-token',
};

const v2SignatureContext = {
	signature :	'v2',
	headerPrefix : 'x-amz-',
	headerMetaPrefix : 'x-amz-meta-',
	authPrefix : 'AWS',
	stsToken: 'x-amz-security-token',
};

class TimedOutError extends Error {
    constructor(host) {
        super('connect ETIMEDOUT ' + host);
        this.errno = 'ETIMEDOUT';
        this.code = 'ETIMEDOUT';
        Error.captureStackTrace(this, TimedOutError);
    }
}

function encodeURIWithSafe(str, safe, skipEncoding){
	str = String(str);
	if (str.length === 0) {
		return '';
	}
	if (skipEncoding) {
		return str;
	}
	let ret;
	if (safe) {
		ret = [];
		for (const element of str) {
			ret.push(safe.indexOf(element) >= 0 ? element : encodeURIComponent(element));
		}
		ret = ret.join('');
	} else {
		ret = encodeURIComponent(str);
	}
	return ret.replace(/!/g, '%21')
		.replace(/\*/g, '%2A')
		.replace(/'/g, '%27')
		.replace(/\(/g, '%28')
		.replace(/\)/g, '%29');
}

function headerTostring(obj){
	return JSON ? JSON.stringify(obj) : '';
}

function parseObjectFromHeaders(sentAs, headers){
	let metadata = {};
	for(let key in headers){
		if ({}.hasOwnProperty.call(headers, key)) {
			let k = String(key).toLowerCase();
			if (k.indexOf(sentAs) === 0) {
				metadata[k.slice(sentAs.length)] = headers[key];
			}
		}
	}
	return metadata;
}

function mkdirsSync(dirname) {
	if (fs.existsSync(dirname)) {
		return true;
	}
	if (mkdirsSync(pathLib.dirname(dirname))) {
		fs.mkdirSync(dirname);
		return true;
	}
	return false;
}

function isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}

function isObject(obj) {
	return Object.prototype.toString.call(obj) === '[object Object]';
}


function makeObjFromXml(xml, methodName, log, bc){
	
	try {
		const result = parser.parse(xml, options);
		if(result === null || result === undefined){
			if(log.isLevelEnabled('error')){
				log.runLog('error', methodName, 'xml [' + xml + '] is not well-format');
			}
			return bc(new Error('xml is not well format'), null);
		}
		
		bc(null, result);
	} catch (err) {
		return bc(err, null);
	}
}

function getExpireDate(utcDateStr){
	let date = new Date(Date.parse(utcDateStr));
	let hour = date.getUTCHours();
	let min = date.getUTCMinutes();
	let sec = date.getUTCSeconds();
	let day = date.getUTCDate();
	let moth = date.getUTCMonth() + 1;
	let year = date.getUTCFullYear();
	let expireDate = '';
	expireDate += year + '-';
	
	if(moth < 10){
		expireDate += '0';
	}
	expireDate += moth + '-';
	
	if(day < 10){
		expireDate += '0';
	}
	expireDate += day + 'T';
	
	if(hour < 10){
		expireDate += '0';
	}
	expireDate += hour + ':';
	
	if(min < 10){
		expireDate += '0';
	}
	expireDate += min + ':';
	
	if(sec < 10){
		expireDate += '0';
	}
	expireDate += sec + 'Z';
	return expireDate;
}

function getDates(utcDateStr){
	let date = new Date(Date.parse(utcDateStr));
	let hour = date.getUTCHours();
	let min = date.getUTCMinutes();
	let sec = date.getUTCSeconds();
	let day = date.getUTCDate();
	let moth = date.getUTCMonth() + 1;
	let year = date.getUTCFullYear();
	let shortDate = '';
	let longDate = '';
	shortDate += year;
	
	if(moth < 10){
		shortDate += '0';
	}
	shortDate += moth;
	
	if(day < 10){
		shortDate += '0';
	}
	shortDate += day;
	
	longDate += shortDate + 'T';
	if(hour < 10){
		longDate += '0';
	}
	longDate +=  hour;
	
	if(min < 10){
		longDate += '0';
	}
	longDate +=  min;
	
	if(sec < 10){
		longDate += '0';
	}
	longDate +=  sec + 'Z';
	return [shortDate, longDate];
}

function getSignedAndCanonicalHeaders(header){
	let arrheadKey = [];
	let arrhead = {};
	for(let key in header){
		if ({}.hasOwnProperty.call(header, key)){
			arrheadKey.push(key.toLowerCase());
			arrhead[key.toLowerCase()] = header[key];
		}
	}
	arrheadKey = arrheadKey.sort();
	let signedHeaders = '';
	let canonicalHeaders = '';
	for(let i = 0; i < arrheadKey.length; i++){
		if(i !== 0){
			signedHeaders += ';';
		}
		signedHeaders += arrheadKey[i];
		canonicalHeaders +=  arrheadKey[i] + ':' + arrhead[arrheadKey[i]] + '\n';
	}
	return [signedHeaders, canonicalHeaders];
}

function createV4Signature(shortDate, sk, region, stringToSign){
	let dateKey = crypto.createHmac('sha256', 'AWS4' + sk).update(shortDate).digest();
	let dateRegionKey = crypto.createHmac('sha256', dateKey).update(region).digest();
	let dateRegionServiceKey = crypto.createHmac('sha256', dateRegionKey).update('s3').digest();
	let signingKey = crypto.createHmac('sha256',dateRegionServiceKey).update('aws4_request').digest();
	return crypto.createHmac('sha256',signingKey).update(stringToSign).digest('hex');
}

function getV4Signature(shortDate, longDate, sk, region, canonicalRequest){
	let scop = shortDate + '/' + region + '/s3/aws4_request';
	let stringToSign = 'AWS4-HMAC-SHA256\n';
	stringToSign += longDate + '\n';
	stringToSign += scop + '\n';
	stringToSign += crypto.createHash('sha256').update(canonicalRequest).digest('hex');
	return createV4Signature(shortDate, sk, region, stringToSign);
}



function getXSdkDateIAMCloud() { // To get the x-sdk-date for Iamcloud
  const now = new Date(); 
  const year = now.getUTCFullYear(); 
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0'); 
  const hours = String(now.getUTCHours()).padStart(2, '0'); 
  const minutes = String(now.getUTCMinutes()).padStart(2, '0'); 
  const seconds = String(now.getUTCSeconds()).padStart(2, '0'); 

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function Utils(logger) {
	this.log = logger;
	this.ak = null;
	this.sk = null;
	this.permanentAk = null;
	this.permanentSk = null;
	this.securityToken = null;
	this.isSecure = true; 
	this.server = null;
	this.pathStyle = false;
	this.signatureContext = null;
	this.isSignatureNegotiation = true;
	this.bucketSignatureCache = {};
	this.region = 'region';
	this.port = null;
	this.maxRetryCount = 3;
	this.timeout = 60;
	this.sslVerify = false;
	this.httpAgent = false;
	this.httpsAgent = false;
	this.noProxyList = [];
	this.obsSdkVersion = OBS_SDK_VERSION;
	this.isCname = false;
	this.bucketEventEmitters = {};
	this.maxConnections = 1000;
	this.userAgent = 'obs-sdk-js/' + this.obsSdkVersion;
	this.iam_domain = null;
	this.shadow_expires = DEFAULT_SHADOW_EXPIRES;
	this.is_shadow_client = false;
	this.shadow_expires_at = null
	this.shadow_expires_at_milliseconds = null
	this.is_shadow_client_ready = false
}

Utils.prototype.encodeURIWithSafe = encodeURIWithSafe;

Utils.prototype.mimeTypes = mimeTypes;

Utils.prototype.close = function(){
	if(this.httpAgent){
		this.httpAgent = null;
	}
	if(this.httpsAgent){
		this.httpsAgent = null;
	}
	if (this.thirdHttpLib) {
		this.thirdHttpLib = null;
	}
};

Utils.prototype.refresh = async function (ak, sk, securityToken, is_shadow_client) {
	this.ak = ak ? String(ak).trim() : null;
	this.sk = sk ? String(sk).trim(): null;
	this.securityToken = securityToken ? String(securityToken).trim() : null;
	
	if (is_shadow_client) {
		await this.getTemporaryKeysFromCloudAlliance(this.ak, this.sk,this.iam_domain, this.shadow_expires)
	}
};

Utils.prototype.initFactory = function (ak, sk, isSecure,
	server, pathStyle, signature, region, port, maxRetryCount, timeout, sslVerify, longConnection, securityToken,
	isSignatureNegotiation, isCname, maxConnections, httpAgent, httpsAgent, userAgent, thirdHttpLib, noProxyList, is_shadow_client, iam_domain, shadow_expires) {

	this.is_shadow_client = is_shadow_client
	this.iam_domain = iam_domain
		
	shadow_expires = Number(shadow_expires)

	if (shadow_expires && (shadow_expires < (15 * 60) || shadow_expires > (60 * 60 * 24))) {
		throw new Error('Expire time is not valid!');
	}

	if (shadow_expires) {
		this.shadow_expires = shadow_expires
	}

	if (httpAgent !== undefined) {
		this.httpAgent = httpAgent;
	}
	
	if (httpsAgent !== undefined) {
		this.httpsAgent = httpsAgent;
	}

	this.refresh(ak, sk, securityToken, is_shadow_client);

	if (!server) {
		throw new Error('Server is not set');
	}

	if (is_shadow_client === true && !iam_domain) {
		throw new Error('iam_domain is not set');
	}

	server = String(server).trim();
	
	if (server.indexOf('https://') === 0) {
		server = server.slice('https://'.length);
		isSecure = true;
	} else if (server.indexOf('http://') === 0) {
		server = server.slice('http://'.length);
		isSecure = false;
	}
	
	let index = server.lastIndexOf('/');
	while (index >= 0) {
		server = server.slice(0, index);
		index = server.lastIndexOf('/');
	}
	
	index = server.indexOf(':');
	if (index >= 0) {
		port = server.slice(index + 1);
		server = server.slice(0, index);
	}
	this.server = server;
	
	if (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(this.server)) {
		pathStyle = true;
	}
	
	if (isSecure !== undefined) {
		this.isSecure = isSecure;
	}
	if (pathStyle !== undefined) {
		this.pathStyle = pathStyle;
	}
	
	if (signature !== undefined) {
		signature = String(signature).trim().toLowerCase();
	} else {
		signature = 'obs';
	}
	
	if (isSignatureNegotiation !== undefined) {
		this.isSignatureNegotiation = isSignatureNegotiation;
	}

	this.isCname = isCname;
	
	if (this.pathStyle || this.isCname) {
		this.isSignatureNegotiation = false;
		if (signature === 'obs') {
			signature = 'v2';
		}
	}
	
	this.signatureContext = signature === 'obs' ? obsSignatureContext : v2SignatureContext;
	
	if (region !== undefined) {
		this.region = String(region).trim();
	}
	
	this.port = port ? parseInt(port, 10) : (this.isSecure ? 443 : 80);
	
	if (maxRetryCount !== undefined) {
		this.maxRetryCount = parseInt(maxRetryCount, 10);
	}
	
	if (timeout !== undefined) {
		this.timeout = parseInt(timeout, 10);
	}
	
	if (sslVerify !== undefined) {
		this.sslVerify = sslVerify;
	}
	
	if (maxConnections !== undefined) {
		this.maxConnections = parseInt(maxConnections, 10);
	}
	
	if (userAgent) {
		this.userAgent = userAgent;
	}

	if (noProxyList) {
		if (typeof noProxyList === 'string') {
			this.noProxyList = noProxyList.split(',');
		}
		if (Array.isArray(noProxyList)) {
			this.noProxyList = noProxyList;
		}
	}

	if (thirdHttpLib) {
		this.thirdHttpLib = thirdHttpLib;
	}
	
	if (longConnection !== undefined && Number(longConnection) >= 0) {
		if (!this.httpAgent) {
			this.httpAgent = new httpLib.Agent({ keepAlive: true, keepAliveMsecs: Number(longConnection) * 1000, maxSockets: this.maxConnections, maxFreeSockets: this.maxConnections });
		}
		if (!this.httpsAgent) {
			this.httpsAgent = new httpsLib.Agent({ keepAlive: true, keepAliveMsecs: Number(longConnection) * 1000, maxSockets: this.maxConnections, maxFreeSockets: this.maxConnections });
		}
	}

	
}

function generateSignatureCloudAlliance(request, ak, sk) {
	let access = ak;
	let secret = sk;
	let rawHost = request.host;
	let rawUri = request.path;
	let rawBody = request.body || "";
	let rawQueryString = request.queryString || "";


	const XSdkDate = getXSdkDateIAMCloud()
	const HTTPRequestMethod = request.method;
	const CanonicalURI = rawUri + "/";
	const CanonicalQueryString = rawQueryString;
	const CanonicalHeaders = `content-type:application/json\nhost:${rawHost}\nx-sdk-date:${XSdkDate}\n`;
	const SignedHeaders = "content-type;host;x-sdk-date";

	const HashedRequestPayload = crypto.createHash('sha256').update(rawBody).digest('hex');
	const CanonicalRequest = `${HTTPRequestMethod}\n${CanonicalURI}\n${CanonicalQueryString}\n${CanonicalHeaders}\n${SignedHeaders}\n${HashedRequestPayload}`;
	const HashedCanonicalRequest = crypto.createHash('sha256').update(CanonicalRequest).digest('hex');

	const Algorithm = "SDK-HMAC-SHA256";
	const StringToSign = `${Algorithm}\n${XSdkDate}\n${HashedCanonicalRequest}`;
	const Signature = crypto.createHmac('sha256', secret).update(StringToSign).digest('hex');

	return {
			Host: rawHost,
			XSdkDate,
			Authorization: `${Algorithm} Access=${access}, SignedHeaders=${SignedHeaders}, Signature=${Signature}`
	};
}

function parseExpirationTime(expiresAtStr) {
    return new Date(expiresAtStr).getTime(); // Convert to milliseconds
}

Utils.prototype.waitForCloudAllianceGetsReady = async function() {
	const startTime = Date.now();
	const timeout = 60 * 1000; // 60 seconds
	
	while (!this.is_shadow_client_ready) {
		if (Date.now() - startTime > timeout) {
    	throw new Error("Timeout: Shadow client not ready");
		}
		await new Promise(resolve => setTimeout(resolve, 1000)); 
	}		
}

Utils.prototype.refreshShadowClient = async function () {
	await this.waitForCloudAllianceGetsReady();

	if (!this.permanentAk || !this.permanentSk) {
		throw new Error("Initialization: Shadow client not ready");
	}
	this.is_shadow_client_ready = false
	await this.getTemporaryKeysFromCloudAlliance(this.permanentAk,this.permanentSk,this.iam_domain, this.shadow_expires)
}

Utils.prototype.checkKeysExpiredAndRefresh = async function() {
	const now = Date.now();
	const timeLeft = this.shadow_expires_at_milliseconds - now
	let log = this.log

	if (timeLeft <= 5 * 60 * 1000) { // checks if 5 min left to expire or not
		this.is_shadow_client_ready = false
		log.runLog('warn', 'CloudAllianceTempKeys', 'Temp keys will expire soon, refreshing');
		await this.getTemporaryKeysFromCloudAlliance(this.permanentAk,this.permanentSk,this.iam_domain, this.shadow_expires)
	}
}


Utils.prototype.getTemporaryKeysFromCloudAlliance = async function(ak,sk,iam_domain,shadow_expires) {
	//If is_shadow_client true, call iam-domain and get temp ak-sk
	const request = {
		method: 'POST',
		host: iam_domain, 
		path: IAM_DOMAIN_PATH_EXTENSION,
		body: JSON.stringify({
			auth: {
				identity: {
					methods: ["token"],
					token: {
						duration_seconds: String(shadow_expires)
					}
				}
			}
		})
	};

	
	const validAk = this.permanentAk ? this.permanentAk : ak
	const validSk = this.permanentSk ? this.permanentSk : sk

	const { Host, XSdkDate, Authorization } = generateSignatureCloudAlliance(request, validAk, validSk);

	const options = {
		hostname: Host,
		path: request.path + (request.queryString ? `?${request.queryString}` : ''),
		method: request.method,
		headers: {
			'Content-Type': 'application/json',
			'Host': Host,
			'X-Sdk-Date': XSdkDate,
			'Authorization': Authorization
		}
	};

	if (this.httpsAgent) {
		options.agent = this.httpsAgent
	}
	let log = this.log

	const req = await httpsLib.request(options, (res) => {
		
		let responseData = '';
		res.on('data', (chunk) => {
			responseData += chunk;
		});

		res.on('end', () => {
			const response = JSON.parse(responseData)
			if (res.statusCode >= 200 && res.statusCode < 300) {
				const validResponse = response.credential
				this.permanentAk = validAk
				this.permanentSk = validSk
				this.ak = validResponse.access
				this.sk = validResponse.secret
				this.securityToken = validResponse.securitytoken
				this.shadow_expires_at = validResponse.expires_at
				this.shadow_expires_at_milliseconds = parseExpirationTime(validResponse.expires_at);
				this.refresh(validResponse.access, validResponse.secret, this.securityToken, false);
				this.is_shadow_client_ready = true
				log.runLog('info', 'CloudAllianceTempKeys', 'response statusCode:' + res.statusCode );
			} else {
				req.removeAllListeners('abort');
				req.abort();
				if(log.isLevelEnabled('error')){
					log.runLog('error', '', 'read file to send error [' + headerTostring(response.error) + ']');
				}

				throw new Error(response.error.message);
			}
		})
	});
	
	req.on('error', (err => {
		req.removeAllListeners('abort');
		req.abort();
		if(log.isLevelEnabled('error')){
			log.runLog('error', '', 'read file to send error [' + headerTostring(err) + ']');
		}
		log.runLog('error', '', 'read file to send error [' + headerTostring(err) + ']');
		if(log.isLevelEnabled('warn')){
				log.runLog('warn', '', err);
		}

		throw new Error(err);
	}));

	req.write(request.body);
	req.end();
		
}
Utils.prototype.SseKmsAdapter = function(value, signatureContext){
	value = value || '';
	value = String(value);
	let index = value.indexOf('aws:');
	if(signatureContext.signature === 'obs'){
		return index === 0 ? value.slice(4) : value;
	}
	return index === 0 ? value : 'aws:' + value;
};

Utils.prototype.BucketAdapter = function(value, signatureContext){
	value = value || '';
	value = String(value);
	let index = value.indexOf('arn:aws:s3:::');
	if(signatureContext.signature === 'obs'){
		return index === 0 ? value.slice('arn:aws:s3:::'.length) : value;
	}
	return index === 0 ? value : 'arn:aws:s3:::' + value;
};


Utils.prototype.EventAdapter = function(value, signatureContext){
	value = value || '';
	value = String(value);
	if(signatureContext.signature === 'obs'){
		if(obsAllowedEvent.indexOf(value) >= 0){
			return value;
		}
		if(v2AllowedEvent.indexOf(value) >= 0){
			return value.substring(3);
		}
		return '';
	}
	if(v2AllowedEvent.indexOf(value) >= 0){
		return value;
	}
	if(obsAllowedEvent.indexOf(value) >= 0){
		return 's3:' + value;
	}
	return '';
};

Utils.prototype.URIAdapter = function(value, signatureContext){
	value = value || '';
	value = String(value);
	if(signatureContext.signature === 'obs'){
		if(obsAllowedUri.indexOf(value) >= 0){
			return value;
		}
		if(value === 'AllUsers' || value === 'http://acs.amazonaws.com/groups/global/AllUsers'){
			return 'Everyone';
		}
		if (value === 'LogDelivery' || value === 'http://acs.amazonaws.com/groups/s3/LogDelivery') {
			return 'LogDelivery'
		}
		return '';
		
	}
	if(v2AllowedUri.indexOf(value) >= 0){
		return value;
	}
	if(value === 'Everyone' || value === 'AllUsers'){
		return 'http://acs.amazonaws.com/groups/global/AllUsers';
	}
	if(value === 'AuthenticatedUsers'){
		return 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers';
	}
	if(value === 'LogDelivery'){
		return 'http://acs.amazonaws.com/groups/s3/LogDelivery';
	}
	return '';
};


Utils.prototype.StorageClassAdapter = function(value, signatureContext){
	value = value || '';
	value = String(value).toUpperCase();
	if(signatureContext.signature === 'obs'){
		if(obsAllowedStorageClass.indexOf(value) >= 0){
			return value;
		}
		if(value === 'STANDARD_IA'){
			return 'WARM';
		}
		if(value === 'GLACIER'){
			return 'COLD';
		}
		return '';
	}
	
	if(v2AllowedStorageClass.indexOf(value) >= 0){
		if(value === 'INTELLIGENT_TIERING'){
			this.log.runLog('warn', 'Intelligent tiering supports only OBS signature');
		}
		return value;
	}
	if(value === 'WARM'){
		return 'STANDARD_IA';
	}
	if(value === 'COLD'){
		return 'GLACIER';
	}
	return '';
};

Utils.prototype.ACLAdapter = function(value, signatureContext){
	value = value || '';
	value = String(value).toLowerCase();
	if(signatureContext.signature === 'obs'){
		if(obsAllowedAcl.indexOf(value) >= 0){
			return value;
		}
		
		return '';
	}
	
	if(value === 'public-read-delivered'){
		value = 'public-read';
	}else if(value === 'public-read-write-delivered'){
		value = 'public-read-write';
	}
	
	if(v2AllowedAcl.indexOf(value) >= 0){
		return value;
	}
	return '';
};

Utils.prototype.doExec = function(funcName, param, callback){
	let opt = this.makeParam(funcName, param);
	if('err' in opt){
		return callback(opt.err, null);
	}
	this.sendRequest(funcName, opt, callback);
};

Utils.prototype.doNegotiation = function(funcName, param, callback, checkBucket, checkCache, setCache){
	let o = null;
	let that = this;
	if(checkCache && param.Bucket){
		let item = that.bucketSignatureCache[param.Bucket];
		if(item && item.signatureContext && item.expireTime > new Date().getTime()){
			param.signatureContext = item.signatureContext;
			let opt = that.makeParam(funcName, param);
			if('err' in opt){
				return callback(opt.err, null);
			}
			opt.signatureContext = item.signatureContext;
			return that.sendRequest(funcName, opt, callback);
		}
		
		o = this.bucketEventEmitters[param.Bucket];
		if(!o){
			o = {
				s : 0,
			};
			this.bucketEventEmitters[param.Bucket] = o;
		}
		
		if(o.s){
			o.e.once('done', () => {
				that.doNegotiation(funcName, param, callback, checkBucket, checkCache, setCache);
			});
			return;
		}
		o.e = new events.EventEmitter();
		o.s = 1;
	}
	this.doExec(negotiateMethod, checkBucket ? {Bucket:param.Bucket} : {},  function(err, result){
		if(err){
			callback(err, null);
			if(o){
				o.s = 0;
				o.e.emit('done');
			}
			return;
		}
		if((checkBucket && result.CommonMsg.Status === 404) || result.CommonMsg.Status >= 500){
			callback(err, result);
			if(o){
				o.s = 0;
				o.e.emit('done');
			}
			return;
		}
		let signatureContext = v2SignatureContext;
		if(result.CommonMsg.Status < 300 && result.InterfaceResult && result.InterfaceResult.ApiVersion >= '3.0'){
			signatureContext = obsSignatureContext;
		}
		
		if(setCache){
			that.bucketSignatureCache[param.Bucket] = {
				signatureContext : signatureContext,
				expireTime : new Date().getTime() + 15 + (Math.ceil(Math.random()*5)) * 60 * 1000
			};
		}
		if(o){
			o.s = 0;
			o.e.emit('done');
		}
		param.signatureContext = signatureContext;
		let opt = that.makeParam(funcName, param);
		if('err' in opt){
			return callback(opt.err, null);
		}
		opt.signatureContext = signatureContext;
		that.sendRequest(funcName, opt, callback);
	});
};

Utils.prototype.exec = function(funcName, param, callback){
	let that = this;
	if(that.isSignatureNegotiation && funcName !== negotiateMethod){
		if(funcName === 'ListBuckets'){
			that.doNegotiation(funcName, param, callback, false, false, false);
		}else if(funcName === 'CreateBucket'){
			let _callback = function(err, result){
				if(!err && result.CommonMsg.Status === 400 &&
						result.CommonMsg.Message === 'Unsupported Authorization Type' &&
						param.signatureContext && 
						param.signatureContext.signature === 'v2'){
					param.signatureContext = v2SignatureContext;
					let opt = that.makeParam(funcName, param);
					if('err' in opt){
						return callback(opt.err, null);
					}
					opt.signatureContext = param.signatureContext;
					that.sendRequest(funcName, opt, callback);
					return;
				}
				callback(err, result);
			};
			
			that.doNegotiation(funcName, param, _callback, false, true, false);
		}else if(funcName === 'DeleteObjects' && param.EncodingType === 'url'){
			param.Objects.map( e =>{
				e.Key = encodeURIComponent(e.Key)
				return e
			})
			that.doNegotiation(funcName, param, callback, true, true, true);
		 }else{
			that.doNegotiation(funcName, param, callback, true, true, true);
		}
		return;
	}
	that.doExec(funcName, param, callback);
};


Utils.prototype.toXml = function(mXml, xmlMeta, root, sentAs, signatureContext){
	let xml = '';
	if(root !== null){
		xml += this.buildXml(mXml, xmlMeta, root, sentAs, signatureContext);
		return xml;
	}
	for (let key in xmlMeta){
		if(key in mXml){
			let meta = xmlMeta[key];
			xml += this.buildXml(mXml, meta, key, meta.sentAs || key, signatureContext);
		}
	}
	return xml;
};

Utils.prototype.buildXml = function(mXml, xmlMeta, key, sentAs, signatureContext){
	let xml = '';
	let type = xmlMeta.type;
	if(type === 'array'){
		for(let i = 0; i < mXml[key].length; i++){
			if(xmlMeta.items.type === 'object'){
				if (!mXml[key][i]) {
					return xml;
				}
				let result = this.toXml(mXml[key][i], xmlMeta.items.parameters, null, null, signatureContext);
				if(result !== ''){
					xml += '<' + sentAs + '>'+ result + '</' + sentAs + '>';
				}
			}else if(xmlMeta.items.type === 'adapter'){
				xml += '<' + sentAs + '>' + String(this[key + 'Adapter'](mXml[key][i], signatureContext)).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;') + '</' + sentAs + '>';
			}else if(xmlMeta.items.type !== 'array'){
				xml += '<' + sentAs + '>'+ String(mXml[key][i]).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;') + '</' + sentAs +'>';
			}
		}
	}else if(type === 'object'){
		if (!mXml[key]) {
			return xml;
		}
		let result = this.toXml(mXml[key], xmlMeta.parameters, null, null, signatureContext);
		if(result !== ''){
			xml += '<' + sentAs;
			if('data' in xmlMeta){
				if('xsiNamespace' in xmlMeta.data){
					xml += ' xmlns:xsi="' +  xmlMeta.data.xsiNamespace + '"';
				}
				if('xsiType' in xmlMeta.data){
					xml += ' xsi:type="' + mXml[key][xmlMeta.data.xsiType] + '"';
				}
			}
			xml += '>';
			xml += result + '</' + sentAs + '>';
		}
		
	}else if(!xmlMeta.notAllowEmpty || String(mXml[key]) !== ''){
		if(type === 'adapter'){
			xml += '<' + sentAs + '>' + String(this[key + 'Adapter'](mXml[key], signatureContext)).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;') + '</' + sentAs + '>';
		}else if(type !== 'ignore'){
			xml += '<' + sentAs + '>' + String(mXml[key]).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;') + '</' + sentAs + '>';
		}
	}
	if(xml && xmlMeta.wrapper){
		let _wrapper = xmlMeta.wrapper;
		xml = '<' + _wrapper + '>' + xml + '</' + _wrapper + '>';
	}
	return xml;
};



Utils.prototype.jsonToObject = function(model, obj, root, ifRootXMlDecode){
	let opt = {};
	if(root !== null){
		this.buildObject(model, obj, root, opt, ifRootXMlDecode);
	}else{
		for(let key in model){
			if ({}.hasOwnProperty.call(model, key)) {
				this.buildObject(model, obj, key, opt, ifRootXMlDecode);
			}
		}
	}
	return opt;
};

Utils.prototype.buildObject = function(model, obj, key, opt, ifRootXMlDecode){

	let setValue = function (value) {
		return value && model[key].decode && ifRootXMlDecode
		? decodeURIComponent(value.replace(/\+/g, '%20'))
		: value;
	}

	if(isObject(obj)){
		let flag = true;
		let wrapper = model[key].wrapper;
		if(wrapper && wrapper in obj){
			obj = obj[wrapper];
			flag = isObject(obj);
		}
		if(flag){
			let sentAs = model[key].sentAs || key;
			if(sentAs in obj){
				if(model[key].type === 'object'){
					opt[key] = this.jsonToObject(model[key].parameters, obj[sentAs], null, ifRootXMlDecode);
				}else if(model[key].type === 'array'){
					let arr = [];
					if(!isArray(obj[sentAs])){
						arr[0] = model[key].items.type === 'object' ? this.jsonToObject(model[key].items.parameters, obj[sentAs], null, ifRootXMlDecode) : setValue(obj[sentAs] || '');
					}else{
						for (let i = 0; i < obj[sentAs].length; i++ ){
							arr[i] = model[key].items.type === 'object' ? this.jsonToObject(model[key].items.parameters, obj[sentAs][i], null, ifRootXMlDecode) : setValue(obj[sentAs][i]);
						}
					}
					opt[key] = arr;
				}else{
					opt[key] = setValue(obj[sentAs]);
				}
			}
		}
	}
	
	if(opt[key] === undefined){
		if(model[key].type === 'object'){
			opt[key] = model[key].parameters ? this.jsonToObject(model[key].parameters, null, null, ifRootXMlDecode) : {};
		}else if(model[key].type === 'array'){
			opt[key] = [];
		}else{
			opt[key] = '';
		}
	}
};

Utils.prototype.makeParam = function (methodName, param) {
	

	let signatureContext = param.signatureContext || this.signatureContext;
	let model = signatureContext.signature === 'obs' ? obsModel[methodName] : v2Model[methodName];
	let method = model.httpMethod;
	let uri = '/';
	let urlPath = '';
	let xml = '';
	let exheaders = {};
	let opt = {};
	opt.$requestHook = param.RequestHook;
	opt.$pipeHook = param.PipeHook;
	opt.$responseHook = param.ResponseHook;
	opt.$highWaterMark = param.HighWaterMark;
	
	//If the method is setBucketCustomDomain, check the certificate params
	if (methodName === customDomainCertificateMethod&&param.DomainBody) {
		checkCustomDomainCertificateParams(param.DomainBody,this.log,methodName,opt)
	}

	if ('urlPath' in model){
		urlPath += '?';
		urlPath += model.urlPath;
	}
	for (let key in model.parameters){
		if ({}.hasOwnProperty.call(model.parameters, key)) {
			let meta = model.parameters[key];
			if(key === 'Bucket' && this.isCname){
				continue;
			}

			let _value = param[key];
			if (meta.required && (_value === null || _value === undefined || (Object.prototype.toString.call(_value) === '[object String]' && _value === ''))){
				opt.err = key + ' is a required element!';
				if(this.log.isLevelEnabled('warn')){
					this.log.runLog('warn', methodName, opt.err);
				}
				return opt;
			}

			if(_value !== null && _value !== undefined){
				if(meta.type === 'srcFile' || meta.type === 'dstFile'){
					opt[meta.type] = _value;
					continue;
				}

				if(meta.type === 'plain'){
					opt[key] = _value;
				}

				let sentAs = meta.sentAs || key;

				if(meta.withPrefix){
					sentAs = signatureContext.headerPrefix + sentAs;
				}

				if(meta.location === 'uri'){
					if(uri !== '/'){
						uri += '/';
					}
					uri += _value;
				}else if(meta.location === 'header'){
					let safe = meta.encodingSafe || ' ;/?:@&=+$,';
					if(meta.type === 'object'){
						if(signatureContext.headerMetaPrefix === sentAs){
							for(let item in _value){
								if ({}.hasOwnProperty.call(_value, item)) {
									let value = _value[item];
									item = String(item).trim().toLowerCase();
									exheaders[item.indexOf(sentAs) === 0 ? item: sentAs + item] = encodeURIWithSafe(value, safe);
								}
							}
						}
					}else if(meta.type === 'array'){
						let arr = [];
						for(let i=0;i<_value.length;i++){
							arr.push(encodeURIWithSafe(_value[i], safe));
						}
						exheaders[sentAs] = arr;
					}else if(meta.type === 'password'){
						exheaders[sentAs] = Buffer.from(_value,'utf8').toString('base64');
						let pwdSentAs = sentAs + '-MD5';
						exheaders[pwdSentAs] = this.bufMD5(_value);
					}else if(meta.type === 'number' && Number(_value)){
						exheaders[sentAs] = encodeURIWithSafe(String(_value), safe);
					}else if(meta.type === 'boolean'){
						exheaders[sentAs] = encodeURIWithSafe(_value ? 'true' : 'false', safe);
					}else if(meta.type === 'adapter'){
						let val = this[key + 'Adapter'](_value, signatureContext);
						if(val){
							exheaders[sentAs] = encodeURIWithSafe(String(val), safe);
						}
					}else {
						exheaders[sentAs] = encodeURIWithSafe(String(_value), safe, meta.skipEncoding);
					}
				}else if(meta.location === 'urlPath'){
					let sep = urlPath === '' ? '?' : '&';
					let value = _value;
					if(meta.type !== 'number' || (meta.type === 'number' && Number(value) >= 0)){
						urlPath += sep + encodeURIWithSafe(sentAs, '/') + '=' + encodeURIWithSafe(String(value), '/');
					}
				}else if(meta.location === 'xml'){
					let mxml = this.toXml(param, meta, key, sentAs, signatureContext);
					if(mxml){
						xml += mxml;
					}
				}else if(meta.location === 'body'){
					xml = _value;
				}
			}
		}
	}
	
	if('data' in model && 'xmlRoot' in model.data){
		if(xml || model.data.xmlAllowEmpty){
			let xmlRoot = model.data.xmlRoot;
			xml = '<' + xmlRoot + '>' + xml + '</' + xmlRoot + '>';
		}
	}
	
	exheaders.Host = this.server;
	if(!this.pathStyle && !this.isCname){
		let uriList = uri.split('/');
		if(uriList.length >= 2 && uriList[1]){
			exheaders.Host = uriList[1] + '.' + exheaders.Host;
			let requestUri = uri.replace(uriList[1], '');
			if(requestUri.indexOf('//') === 0){
				requestUri = requestUri.slice(1);
			}
			
			if(signatureContext.signature === 'v4'){
				uri = requestUri;
			}else if(requestUri === '/'){
				uri += '/';
			}
			opt.requestUri = encodeURIWithSafe(requestUri, '/');
		}
	}
	
	opt.method = method;
	opt.uri = encodeURIWithSafe(uri, '/');
	opt.urlPath = urlPath;
	if(xml){
		if(!(xml instanceof streamLib.Readable)){
			let body = Buffer.from(String(xml), 'utf8');
			if(model.data && model.data.md5){
				exheaders['Content-MD5'] = this.bufMD5(body);
			}
			exheaders['Content-Length'] = body.length === 0 ? '0' : String(body.length);
		}
		opt.xml = xml;
		if(this.log.isLevelEnabled('debug')){
			this.log.runLog('debug', methodName, 'request content:' + xml);
		}
	}
	opt.headers = exheaders;
	
	if('srcFile' in opt){
		if (!fs.existsSync(opt.srcFile)) {
			opt.err = 'the file [' + opt.srcFile + '] is not exist!';
			if(this.log.isLevelEnabled('error')){
				this.log.runLog('error', methodName, opt.err);
			}
			return opt;
		}
		
		let fileSize = fs.statSync(opt.srcFile).size;
		if ('Content-Length' in opt.headers || 'PartSize' in opt || 'Offset' in opt) {
			let offset = opt.Offset;
			offset = (offset && offset >= 0 && offset < fileSize) ? offset : 0;
			let partSize;
			if('PartSize' in opt){
				partSize = opt.PartSize;
			}else if('Content-Length' in opt.headers){
				partSize = parseInt(opt.headers['Content-Length'], 10);
			}else{
				partSize = fileSize;
			}
			partSize = (partSize && partSize > 0 && partSize <= fileSize - offset) ? partSize : fileSize - offset;
			opt.PartSize = partSize;
			opt.Offset = offset;
			opt.headers['Content-Length'] = String(opt.PartSize);
		}
	}else if('PartSize' in opt){
		opt.headers['Content-Length'] = String(opt.PartSize);
	}

	return opt;
};

Utils.prototype.sendRequest = function(funcName, opt, bc, retryCount){
	if(retryCount === undefined){
		retryCount = 1;
	}
	let that = this;
	let readable = opt.xml instanceof streamLib.Readable || opt.ProgressCallback;
	that.makeRequest(funcName, opt, retryCount, function(err, msg){
		if(err){
			if(err.message === 'redirect'){
				let uri = urlLib.parse(err.location);
				opt.headers.Host = uri.hostname;
				opt.protocol = uri.protocol;
				opt.port = uri.port || ((opt.protocol && opt.protocol.toLowerCase().indexOf('https') === 0) ? 443 : 80);
				that.sendRequest(funcName, opt, bc, retryCount + 1);
				return;
			}
			
			if(err.message !== 'pause' && !readable && msg !== 'PREMATURE_END' && msg !== 'SELF_SIGNED_CERT_IN_CHAIN' && msg !== 'DEPTH_ZERO_SELF_SIGNED_CERT' && retryCount <= that.maxRetryCount){
				that.sendRequest(funcName, opt, bc, retryCount + 1);
				return;
			}
		}
		bc(err, msg);
	});
};

Utils.prototype.doAuth = function(opt, methodName, signatureContext) {
	let interestHeader = ['Content-MD5', 'Content-Type', 'Date'];
	let log = this.log;
	
	let hasSecurityToken = false;
	let securityToken = '';

	let stringToSign = opt.method + '\n';
	for(let i=0;i<interestHeader.length;i++){
		if(interestHeader[i] in opt.headers){
			stringToSign += opt.headers[interestHeader[i]];
		}
		stringToSign += '\n';
	}

	let temp = [];
	for(let originKey of Object.keys(opt.headers)){
		let lowerKey = originKey.toLowerCase();
		if (lowerKey.indexOf(signatureContext.headerPrefix) === 0){
			temp.push({
				key: lowerKey,
				value: opt.headers[originKey]
			});
		}
		// 单独处理SecurityToken
		if (!hasSecurityToken && lowerKey === signatureContext.stsToken) {
			hasSecurityToken = true;
			securityToken = opt.headers[originKey];
		}
	}
	temp = temp.sort(function (obj1, obj2) {
		if (obj1.key < obj2.key) {
			return -1;
		}
		if (obj1.key > obj2.key) {
			return 1;
		}
		return 0;
	});
	for(let i=0;i<temp.length;i++){
		let key = temp[i].key;
		let val = key.indexOf(signatureContext.headerMetaPrefix) === 0  ? temp[i].value.trim() : temp[i].value;
		stringToSign += key + ':' + val + '\n';
	}

	let path = opt.uri;
	if(this.isCname){
		if(path === '/'){
			path += opt.headers.Host + '/';
		}else if(path.indexOf('/') === 0){
			path = '/' + opt.headers.Host + path;
		}
	}
	if(opt.urlPath){
		let _path = opt.urlPath.slice(1);
		let arrPath = _path.split('&').sort();
		let urlPath = '';
		for(let i=0;i<arrPath.length;i++){
			let listvar = arrPath[i].split('=');
			let key = decodeURIComponent(listvar[0]);
			if(allowedResourceParameterNames.indexOf(key.toLowerCase()) >= 0){
				urlPath += urlPath === '' ?  '?' : '&';
				urlPath += key;
				if(listvar.length === 2 && listvar[1]){
					urlPath += '=' + decodeURIComponent(listvar[1]);
				}
			}
		}
		path += urlPath;
	}
	stringToSign += path;

	let logStringToSign = stringToSign;
	if (hasSecurityToken) {
		logStringToSign = logStringToSign.replace(securityToken, '*****');
	}

	if(log.isLevelEnabled('debug')){
		log.runLog('debug',methodName, 'stringToSign:' + logStringToSign);
	}
	opt.headers.Authorization = signatureContext.authPrefix + ' ' + this.ak + ':' + crypto.createHmac('sha1', this.sk).update(stringToSign).digest('base64');
};

Utils.prototype.v4Auth = function(opt, methodName, signatureContext){
	opt.headers[signatureContext.headerPrefix + 'content-sha256'] = CONTENT_SHA256;
	let header = opt.headers;
	let log = this.log;
	let shortDate = null;
	let longDate = null;
	
	if(signatureContext.headerPrefix + 'date' in header){
		longDate = header[signatureContext.headerPrefix + 'date'];
		shortDate = longDate.slice(0, longDate.indexOf('T'));
	}else{
		let dates = getDates(header.Date);
		shortDate = dates[0];
		longDate = dates[1];
	}
	
	let credential = this.ak + '/' + shortDate + '/' + this.region + '/s3/aws4_request';
	
	let signedAndCanonicalHeaders = getSignedAndCanonicalHeaders(header);
	
	let signedHeaders = signedAndCanonicalHeaders[0];
	let canonicalHeaders = signedAndCanonicalHeaders[1];
	
	let canonicalQueryString = '';
	if(opt.urlPath){
		let path = opt.urlPath.slice(1);
		let arrPath = path.split('&').sort();
		for(let i=0;i<arrPath.length;i++){
			canonicalQueryString += arrPath[i];
			if(arrPath[i].indexOf('=') === -1){
				canonicalQueryString += '=';
			}
			if(i !== arrPath.length -1){
				canonicalQueryString += '&';
			}
		}
	}
	let canonicalRequest = opt.method + '\n';
	canonicalRequest += opt.uri +  '\n';
	canonicalRequest += canonicalQueryString + '\n';
	canonicalRequest +=  canonicalHeaders + '\n';
	canonicalRequest += signedHeaders + '\n';
	canonicalRequest += CONTENT_SHA256;
	
	if(log.isLevelEnabled('debug')){
		log.runLog('debug',methodName, 'canonicalRequest:' + canonicalRequest);
	}
	let signature = getV4Signature(shortDate, longDate, this.sk, this.region, canonicalRequest);
	
	opt.headers.Authorization = 'AWS4-HMAC-SHA256 Credential=' + credential + ',SignedHeaders=' + signedHeaders + ',Signature=' + signature;
};

Utils.prototype.parseCommonHeaders = function(opt, headers, signatureContext){
	for(let key in commonHeaders){
		if ({}.hasOwnProperty.call(commonHeaders, key)) {
			opt.InterfaceResult[commonHeaders[key]] = headers[key];
		}
	}
	opt.InterfaceResult.RequestId = headers[signatureContext.headerPrefix + 'request-id'];
	opt.InterfaceResult.Id2 = headers[signatureContext.headerPrefix + 'id-2'];
	opt.CommonMsg.RequestId = opt.InterfaceResult.RequestId;
	opt.CommonMsg.Id2 = opt.InterfaceResult.Id2;
};

Utils.prototype.contrustCommonMsg = function(opt, obj, headers, methodName, signatureContext){
	opt.InterfaceResult = {};
	let log = this.log;
	this.parseCommonHeaders(opt, headers, signatureContext);
	
	if(log.isLevelEnabled('info')){
		log.runLog('info', methodName, 'request finished with request id:' + opt.InterfaceResult.RequestId);
	}
	for (let key in obj){
		if(obj[key].location !== 'header'){
			continue;
		}
		let sentAs = obj[key].sentAs || key;
		
		if(obj[key].withPrefix){
			sentAs = signatureContext.headerPrefix + sentAs;
		}
		
		if(obj[key].type === 'object'){
			opt.InterfaceResult[key] = parseObjectFromHeaders(sentAs, headers);
			continue;
		}
		let val = headers[sentAs];
		
		
		if(val === undefined){
			val = headers[sentAs.toLowerCase()];
		}
		if(val !== undefined){
			opt.InterfaceResult[key] = val;
		}
	}
};

Utils.prototype.getRequest = function(methodName, serverback, dstFile, saveAsStream, readable, signatureContext, retryCount, doAbort, bc, progressCallback){
	let opt = {};
	let log = this.log;
	let model = signatureContext.signature === 'obs' ? obsModel[methodName + 'Output'] : v2Model[methodName + 'Output'];
	model = model || {};
	let obj = model.parameters || {};
    let headers = serverback.headers;
	opt.CommonMsg = {
		Status : serverback.statusCode,
		Code : headers[signatureContext.headerPrefix + 'error-code'] || '',
		Message : headers[signatureContext.headerPrefix + 'error-message'] || '',
		HostId : '',
		RequestId : '',
		InterfaceResult : null
	};
	if (this.thirdHttpLib) {
		for (let key in headers){
		    if ({}.hasOwnProperty.call(headers, key)){
		    	if (isArray(headers[key]) && headers[key].length === 1) {
		    		headers[key] = headers[key][0];
		    	}
		    }
		}
	}
	if(log.isLevelEnabled('info')){
		log.runLog('info', methodName, 'get response start, statusCode:' + serverback.statusCode);
	}
	if(log.isLevelEnabled('debug')){
		log.runLog('debug', methodName, 'response msg :statusCode:' + serverback.statusCode + ', headers:' + headerTostring(headers));
	}
	
	let doLog = function(){
		if(log.isLevelEnabled('debug')){
			let logMsg = 'Status:' + opt.CommonMsg.Status + ', Code:' + opt.CommonMsg.Code + ', Message:' + opt.CommonMsg.Message;
			log.runLog('debug', methodName, 'exec interface ' + methodName + ' finish, ' + logMsg);
		}
		bc(null,opt);
	};
	let that = this;
	
	if(serverback.statusCode >= 300 && serverback.statusCode < 400 && serverback.statusCode !== 304 && !readable && retryCount <= that.maxRetryCount){
		let location = headers.location || headers.Location;
		if(location){
			serverback.req.removeAllListeners('abort');
			serverback.req.abort();
			doAbort();
			if(log.isLevelEnabled('warn')){
				let err = 'http code is 3xx, need to redirect to ' + location;
				log.runLog('warn', methodName, err);
			}
			let redirectErr = new Error('redirect');
			redirectErr.location = location;
			return bc(redirectErr);
		}
		if(log.isLevelEnabled('error')){
			log.runLog('error', methodName, 'get redirect code 3xx, but no location in headers');
		}
	} 
	
	if(serverback.statusCode < 300){
		let getCount = 0
		let objectTotalSize = headers['content-length']
		let writeStart = new Date().getTime();
		let progressListener = null
		if(dstFile){
			let fileDir = pathLib.dirname(dstFile);
			if(!mkdirsSync(fileDir)){
				return bc(new Error('failed to create file:' + dstFile), null);
			}
			// 下载进度回调
			if(progressCallback){
				progressListener = function(data){
					getCount += data.length;
					progressCallback(getCount, objectTotalSize, (new Date().getTime()-writeStart)/1000, data);
				};
				serverback.on('data', progressListener)
			}
			
			let stream = fs.createWriteStream(dstFile);
			stream.once('close', function(){
				if(opt.InterfaceResult && opt.InterfaceResult.ContentLength !== undefined && fs.existsSync(dstFile)){
					let fstat = fs.statSync(dstFile);
					if(fstat.size !== parseInt(opt.InterfaceResult.ContentLength, 10)){
						return bc(new Error('premature end of Content-Length delimiter message body (expected:' + opt.InterfaceResult.ContentLength + '; received:' + fstat.size + ')'), 'PREMATURE_END');
					}
				}
				doLog();
			}).once('error', function(err){
				if(log.isLevelEnabled('error')){
					log.runLog('error', methodName, 'get response stream error [' + headerTostring(err) + ']');
				}
				bc(err, null);
			});
			
			serverback.once('error', function(err){
				stream.end();
				if(log.isLevelEnabled('error')){
					log.runLog('error', methodName, 'get response stream error [' + headerTostring(err) + ']');
				}
				bc(err, null);
			}).once('end', function(){
				stream.end();
				that.contrustCommonMsg(opt, obj, headers, methodName, signatureContext);
				if(log.isLevelEnabled('debug')){
					log.runLog('debug', methodName, 'exec interface ' + methodName + ' finish, Status:' + opt['CommonMsg']['Status'] + ', Code: ,Message: ');
				}
			}).pipe(stream);
			return;
		}
		if(('data' in model) && saveAsStream){
			// 下载进度回调
			if(progressCallback){
				progressListener = function(data){
					getCount += data.length;
					progressCallback(getCount, objectTotalSize, (new Date().getTime()-writeStart)/1000, data);
				};
				serverback.on('data', progressListener)
			}
			that.contrustCommonMsg(opt, obj, headers, methodName, signatureContext);
			if(log.isLevelEnabled('debug')){
				let respMsg = 'Status: ' + opt.CommonMsg.Status + ', headers: ' +  headerTostring(headers);
				log.runLog('debug', methodName, respMsg);
			}
			
			for (let key in obj){
				if(obj[key].location !== 'body'){
					continue;
				}
				opt.InterfaceResult[key] = serverback;
				break;
			}
			return doLog();
		}
	}
	
	let body = [];
	serverback.on('data', function(data) {
		body.push(data);
	}).once('error', function(err){
		if(log.isLevelEnabled('error')){
			log.runLog('error', methodName, 'get response stream error [' + headerTostring(err) + ']');
		}
		bc(err, null);
	}).once('end', function() {
		body = Buffer.concat(body);
		
		if(serverback.statusCode < 300){
			if(log.isLevelEnabled('debug')){
				let respMsg = 'Status: ' + opt.CommonMsg.Status + ', headers: ' +  headerTostring(headers);
				if(body.length > 0){
					respMsg += 'body length: ' + body.length;
					log.runLog('debug', methodName, 'response body length:' + body.length);
				}
				log.runLog('debug', methodName, respMsg);
			}
			that.contrustCommonMsg(opt, obj, headers, methodName, signatureContext);
			
			if(body.length > 0 && ('data' in model)){
				if(model.data.type === 'xml'){
					return makeObjFromXml(body, methodName, log, function(err, result){
						if(err){
							if(log.isLevelEnabled('error')){
								log.runLog('error', methodName, 'change xml to json err [' + headerTostring(err) + ']' );
							}
							return bc(err, null);
						}
						let tempResult = result;
						if(model.data.xmlRoot && (model.data.xmlRoot in tempResult)){
							tempResult = result[model.data.xmlRoot];
						}
						let ifRootXMlDecode = tempResult.EncodingType ? true : false;
						if(isObject(tempResult)){
							for (let key in obj){
								if(obj[key].location === 'xml'){
									opt.InterfaceResult[key] = that.jsonToObject(obj, tempResult, key, ifRootXMlDecode)[key];
								}
							}
						}
						doLog();
					});
				}
				
				if(model.data.type === 'body'){
					for (let key in obj){
						if(obj[key].location === 'body'){
							opt.InterfaceResult[key] = body.toString('utf8');
							break;
						}
					}
				}
			}
			return doLog();
		}
		
		if(log.isLevelEnabled('debug')){
			let respMsg = 'Status: ' + opt.CommonMsg.Status + ', headers: ' +  headerTostring(headers);
			if(body.length > 0){
				respMsg += 'body: ' + body;
				log.runLog('debug', methodName, 'response body:' + body);
			}
			log.runLog('debug', methodName, respMsg);
		}
		
		opt.CommonMsg.RequestId = headers[signatureContext.headerPrefix + 'request-id'];
		opt.CommonMsg.Id2 = headers[signatureContext.headerPrefix + 'id2'];
		opt.CommonMsg.Indicator = headers['x-reserved-indicator'];
		if(log.isLevelEnabled('error')){
			log.runLog('error', methodName, 'request error with http status code:' + serverback.statusCode);
		}
		
		if(log.isLevelEnabled('info')){
			log.runLog('info', methodName, 'request finished with request id:' + opt.CommonMsg.RequestId);
		}
		
		if(body.length === 0){
			return doLog();
		}
		
		return makeObjFromXml(body, methodName, log, function(err, re){
			if(err){
				if(log.isLevelEnabled('error')){
					log.runLog('error', methodName, 'change xml to json err [' + headerTostring(err) + ']' );
				}
				opt.CommonMsg.Message = err.message;
			}else if(re && 'Error' in re){
				let errMsg = re.Error;
				opt.CommonMsg.Code = errMsg.Code;
				opt.CommonMsg.Message = errMsg.Message;
				opt.CommonMsg.HostId = errMsg.HostId;
				if(errMsg.RequestId){
					opt.CommonMsg.RequestId = errMsg.RequestId;
				}
				if(log.isLevelEnabled('error')){
					log.runLog('error', methodName, 'request error with error code:' + opt.CommonMsg.Code + ', error message:' + opt.CommonMsg.Message + ', request id:' + opt.CommonMsg.RequestId);
				}
			}
			doLog();
		});
	});
	
};

function isMatchingPattern(host, pattern) {
	const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
	return regex.test(host);
}

function isValidStringInKb(str) {
	const byte = new TextEncoder().encode(str).length;
	// we convert bytes to KB
	const kb = byte / 1024;
	return kb
}

function checkCustomDomainCertificateParams(params,log,methodName,opt) {
	//Validate Name
	if (!params.Name || typeof params.Name !== 'string') {
		opt.err =  !params.Name ? 'Name should be defined!' : 'Name should be string!';
		if(log.isLevelEnabled('warn')){
			log.runLog('warn', methodName, opt.err);
		}
		return opt;
	}
	if (params.Name.length < 3 || params.Name.length > 63) {
		opt.err =  'The length of the Name should be between 3 and 63!';
		if(log.isLevelEnabled('warn')){
			log.runLog('warn', methodName, opt.err);
		}
		return opt;

	}

	//Validate CertificateId
	if (params.CertificateId !== undefined) {
		if (typeof params.CertificateId !== 'string') {
			opt.err =  'CertificateId should be string!';
			if(log.isLevelEnabled('warn')){
				log.runLog('warn', methodName, opt.err);
			}
			return opt;
		}
		if (params.CertificateId.length !== 16) {
			opt.err =  'The length of the CertificateId should be exacly 16!';
			if(log.isLevelEnabled('warn')){
				log.runLog('warn', methodName, opt.err);
			}
			return opt;
		}
	}

	//Validate Certificate
	if (!params.Certificate || typeof params.Certificate !== 'string') {
		opt.err =  !params.Certificate ? 'Certificate should be defined!' : 'Certificate should be string!';
			if(log.isLevelEnabled('warn')){
				log.runLog('warn', methodName, opt.err);
			}
			return opt;
	}

	//Validate CertificateChain
	if (params.CertificateChain !== undefined) {

		if (typeof params.CertificateChain !== 'string') {
			opt.err =  'CertificateChain should be string!';
			if(log.isLevelEnabled('warn')){
				log.runLog('warn', methodName, opt.err);
			}
			return opt;
		}
	}

	//Validate PrivateKey
	if (!params.PrivateKey || typeof params.PrivateKey !== 'string') {
		opt.err = !params.PrivateKey ? 'PrivateKey should be defined!' : 'PrivateKey should be string!';
			if(log.isLevelEnabled('warn')){
				log.runLog('warn', methodName, opt.err);
			}
			return opt;
	}
}

Utils.prototype.shouldUseProxy = function(requestUrl) {
	if (this.noProxyList.length === 0) {
		return true
	}
	return !this.noProxyList.some(pattern => isMatchingPattern(requestUrl, pattern));
}

Utils.prototype.makeRequest = async function (methodName, opt, retryCount, bc) {
	if (this.is_shadow_client) {
		try {
			await this.waitForCloudAllianceGetsReady();
			await this.checkKeysExpiredAndRefresh()
		} catch (error) {
			return bc(error);
		}
	}

	let log = this.log;
	let body = opt.xml;
	let readable = body instanceof streamLib.Readable;
	let signatureContext = opt.signatureContext || this.signatureContext;
	let nowDate = new Date();
	opt.headers.Date = nowDate.toUTCString();
	delete opt.headers.Authorization;// retry bug fix
	
	let ex = opt.headers;
	let path = (opt.requestUri ? opt.requestUri : opt.uri) + opt.urlPath;
	let method = opt.method;
	
	if (methodName === customDomainCertificateMethod && opt.xml !== undefined) {
		if (isValidStringInKb(opt.xml) > 40) {
			const err =  'Total XML body of Certificate should be equal or less than 40KB!';
			if(log.isLevelEnabled('warn')){
				log.runLog('warn', methodName, opt.err);
			}
			return bc(err);
		}
	}
	if(this.ak && this.sk && methodName !== negotiateMethod){
		if(this.securityToken){
			opt.headers[signatureContext.headerPrefix + 'security-token'] = this.securityToken;
		}
	    if(signatureContext.signature === 'v4'){
	    	this.v4Auth(opt, methodName, signatureContext); 
	    }else{
	    	this.doAuth(opt, methodName, signatureContext);
	    }
	}

	ex['User-Agent'] = this.userAgent;
	
	if(log.isLevelEnabled('info')){
		log.runLog('info', methodName, 'prepare request parameters ok, then start to send request to service');
	}
	if(log.isLevelEnabled('debug')){
		let header_msg = {};
		for (let key in ex){
			if ({}.hasOwnProperty.call(ex, key)){
				header_msg[key] = ex[key];
			}
		}
		header_msg.Authorization = '****';
		
		if (header_msg[signatureContext.stsToken]) {
			header_msg[signatureContext.stsToken] = '****';
		}
		
		let msg = 'method:' + method + ', path:' + path + 'headers:' + headerTostring(header_msg);
		if (body && !readable) {
			msg += 'body:' + body;
		}
		log.runLog('debug', methodName, 'request msg:' + msg);
	}
	
	let ca = null;
	if(this.sslVerify && this.sslVerify !== true && fs.existsSync(String(this.sslVerify))){
		ca = fs.readFileSync(String(this.sslVerify));
	}
	
	let reopt = {
		method : method,
		host : ex.Host,
		port : opt.port || this.port,
		path : path,
		ca : ca,
		checkServerIdentity: function (host, cert) {
		    return undefined; // do not verify hostname
		},
		rejectUnauthorized : this.sslVerify || false,
		headers : ex,
		highWaterMark : opt.$highWaterMark || null,
	};

	let requestPath = reopt.host + ':' + reopt.port + reopt.path;
	
	let start = nowDate.getTime();
	
	let _isSecure = opt.protocol ? opt.protocol.toLowerCase().indexOf('https') === 0 : this.isSecure;
	
	reopt.agent = _isSecure ? this.httpsAgent : this.httpAgent;
	if (!this.shouldUseProxy(reopt.host) && reopt.agent.proxyUri) {
		reopt.agent = null;
	}
	
	let _http = _isSecure ? httpsLib : httpLib;
	if (this.thirdHttpLib) {
		_http = this.thirdHttpLib;
	}
	let req = _http.request(reopt);

	if(opt.$requestHook){
		opt.$requestHook(req);
	}
	
	let that = this;
	
	let progressListener;
	let errorListener;
	let doAbort = function(){
		if(body && (body instanceof streamLib.Readable)){
			if(progressListener){
				body.removeListener('data', progressListener);
			}
			if(errorListener){
				body.removeListener('error', errorListener);
			}
			body.destroy();
		}
	};

	if (!this.thirdHttpLib) {
		req.setNoDelay(true);
		req.setTimeout(this.timeout * 1000, function () {
			doAbort();
			bc(new TimedOutError(ex.Host));
		});
	}

	req.once('response', function(serverback) {
		if(log.isLevelEnabled('info')){
			log.runLog('info', methodName, 'get http response for ' + requestPath +  ' cost ' +  (new Date().getTime() - start) + ' ms');
		}
		
		if(opt.$responseHook){
			opt.$responseHook(serverback);
		}
		that.getRequest(methodName, serverback, opt.dstFile, opt.SaveAsStream, readable, signatureContext, retryCount, doAbort, bc, opt.ProgressCallback);
	}).once('error', function(err){
		if(log.isLevelEnabled('error')){
			log.runLog('error', methodName, 'Send request to service error [' + headerTostring(err) + ']');
		}
		if(log.isLevelEnabled('info')){
			log.runLog('info', methodName, 'get http response for ' + requestPath + ' cost ' +  (new Date().getTime() - start) + ' ms');
		}
		if(!req.aborted){
			bc(err);
		}
	}).once('abort', function(){
		doAbort();
		bc(new Error('pause'));
	});
	
	if(log.isLevelEnabled('info')){
		req.once('socket', function(socket){
			if(log.isLevelEnabled('debug')){
				socket.once('connect', function(){
					log.runLog('debug', methodName, 'do http connect for ' + requestPath + ' cost ' +  (new Date().getTime() - start) + ' ms');
				}).once('lookup', function(){
					log.runLog('debug', methodName, 'dns resolve for ' + requestPath + ' cost ' +  (new Date().getTime() - start) + ' ms');
				});
			}
			log.runLog('info', methodName, 'get tcp socket for ' + requestPath + ' cost ' +  (new Date().getTime() - start) + ' ms');
		});
	}
	
	if(['GET', 'HEAD', 'OPTIONS'].includes(method)){
		return req.end();
	}
	
	let progressCallback = opt.ProgressCallback;
	let writeCount = 0;
	let writeStart = new Date().getTime();

	if(body){
		if(!readable){
			let data = String(body);
			return req.end(data, function(){
				if(progressCallback){
					progressCallback(data.length, data.length, (new Date().getTime()-writeStart)/1000, data);
				}
			});
		}
		
		errorListener = function(err){
			req.removeAllListeners('abort');
			req.abort();
			doAbort();
			if(log.isLevelEnabled('error')){
				log.runLog('error', methodName, 'read file to send error [' + headerTostring(err) + ']');
			}
			bc(err);
		};
		
		body.once('error', errorListener);
		
		let contentLength = ('ContentLength' in opt) ? parseInt(opt.ContentLength, 10) : -1;
		
		if(contentLength > 0 && body.end === Infinity){
			body.end =  (body.start ? body.start : 0) + contentLength - 1;
		}
		
		if(progressCallback){
			progressListener = function(data){
				writeCount += data.length;
				progressCallback(writeCount, contentLength, (new Date().getTime()-writeStart)/1000, data);
			};
			body.on('data', progressListener);
		}
		
		if(opt.$pipeHook){
			return opt.$pipeHook(body, req);
		}
		return body.pipe(req);
	}
	
	if(!('srcFile' in opt)){
		return req.end();
	}
	
	let stream = null;
	let offset = opt.Offset >= 0 ? opt.Offset : 0;
	if('PartSize' in opt){
		stream = fs.createReadStream(opt.srcFile, {start:offset, end:offset + Math.max(parseInt(opt.PartSize, 10)-1, 0)});
	}else if('ContentLength' in opt){
		stream = fs.createReadStream(opt.srcFile, {start:offset, end:offset+Math.max(parseInt(opt.ContentLength, 10)-1, 0)});
	}
	
	if(!stream){
		stream = fs.createReadStream(opt.srcFile);
	}
	body = stream;
	if(progressCallback){
		let fileSize = fs.statSync(opt.srcFile).size;
		progressListener = function(data){
			writeCount += data.length;
			progressCallback(writeCount, fileSize, (new Date().getTime()-writeStart)/1000);
		}; 
		stream.on('data', progressListener);
	}
	errorListener = function(err){
		req.removeAllListeners('abort');
		req.abort();
		doAbort();
		if(log.isLevelEnabled('error')){
			log.runLog('error', methodName, 'read file to send error [' + headerTostring(err) + ']');
		}
		bc(err);
	};
	
	stream.once('error', errorListener);
	
	if(opt.$pipeHook){
		return opt.$pipeHook(stream, req);
	}
	stream.pipe(req);
};

Utils.prototype.bufMD5 = function(buf) {
	return crypto.createHash('md5').update(buf).digest('base64');
};

Utils.prototype.fileMD5 = function (filePath, bc){
	let stream = fs.createReadStream(filePath);
	let sha = crypto.createHash('md5');
	sha.on('finish', ()=>{
		bc(null, sha.digest('base64'));
	});
	
	stream.on('error',function(err){
		sha.destroy();
		bc(err);
	}).on('data', function(data){
		sha.update(data);
	});
};


Utils.prototype.createSignedUrlSync = function(param){
	return this.signatureContext.signature === 'v4' ? this.createV4SignedUrlSync(param) : this.createV2SignedUrlSync(param);
};

Utils.prototype.createV2SignedUrlSync = function(param){
	param = param || {};
	
	let method = param.Method ? String(param.Method) : 'GET';
	let bucketName = param.Bucket ? String(param.Bucket) : null;
	let objectKey = param.Key ? String(param.Key) : null;
	let specialParam = param.SpecialParam ? String(param.SpecialParam) : null;
	
	if(this.signatureContext.signature === 'obs' && specialParam === 'storagePolicy'){
		specialParam = 'storageClass';
	}else if(this.signatureContext.signature === 'v2' && specialParam === 'storageClass'){
		specialParam = 'storagePolicy';
	}

	let policy = param.Policy ?  Buffer.from(String(param.Policy),'utf8').toString('base64') : null;
	let prefix = param.Prefix ? String(param.Prefix) : null;
	let expires = param.Expires ? parseInt(param.Expires, 10) : 300;
	let headers = {};
	if(param.Headers && (param.Headers instanceof Object) && !(param.Headers instanceof Array)){
		for(let key in param.Headers){
			if ({}.hasOwnProperty.call(param.Headers, key)) {
				headers[key] = param.Headers[key];
			}
		}
	}
	
	let queryParams = {};
	if(param.QueryParams && (param.QueryParams instanceof Object) && !(param.QueryParams instanceof Array)){
		for(let key in param.QueryParams){
			if ({}.hasOwnProperty.call(param.QueryParams, key)) {
				queryParams[key] = param.QueryParams[key];
			}
		}
	}
	
	if(this.securityToken && !queryParams[this.signatureContext.headerPrefix + 'security-token']){
		queryParams[this.signatureContext.headerPrefix + 'security-token'] = this.securityToken;
	}

	let isShareFolder = policy && prefix;
	let result = '';
	let resource = '';
	let host = this.server;
	if(this.isCname){
		resource += '/' + host + '/';
	}else if(bucketName){
		resource += '/' + bucketName;
		if(this.pathStyle){
			result += '/' + bucketName;
		}else{
			host = bucketName + '.' + host;
			resource += '/';
		}
	}
	
	headers.Host = host;
	
	if(objectKey){
		objectKey = encodeURIWithSafe(objectKey, '/');
		result += '/' + objectKey;
		if(resource.lastIndexOf('/') !== resource.length - 1){
			resource += '/';
		}
		resource += objectKey;
	}
	
	if(resource === ''){
		resource = '/';
	}
	
	result += '?';
	
	if(specialParam){
		queryParams[specialParam] = '';
	}
	
	if(this.signatureContext.signature === 'v2'){
		queryParams.AWSAccessKeyId = this.ak;
	}else{
		queryParams.AccessKeyId = this.ak;
	}
	
	if(expires < 0){
		expires = 300;
	}
	expires = parseInt(new Date().getTime() / 1000, 10) + expires;

	if (isShareFolder) {
		queryParams.Policy = policy;
		queryParams.prefix = prefix;
	} else {
		queryParams.Expires = String(expires);
	}

	let interestHeaders = {};
	for(let name in headers){
		if ({}.hasOwnProperty.call(headers, name)) {
			let key = String(name).toLowerCase();
			if(key === 'content-type' || key === 'content-md5' || key.length > this.signatureContext.headerPrefix.length && key.slice(0,this.signatureContext.headerPrefix.length) === this.signatureContext.headerPrefix){
				interestHeaders[key] = headers[name];
			}
		}
	}
	
	let queryParamsKeys = [];
	for(let key in queryParams){
		if ({}.hasOwnProperty.call(queryParams, key)) {
			queryParamsKeys.push(key);
		}
	}
	queryParamsKeys.sort();
	let flag = false;
	let _resource = [];
	let safeKey = isShareFolder ? '': '/';
	for(let i=0;i<queryParamsKeys.length;i++){
		let key = queryParamsKeys[i];
		let val = queryParams[key];
		key = encodeURIWithSafe(key, safeKey);
		val = encodeURIWithSafe(val, safeKey);
		result += key;
		if(val){
			result += '=' + val;
		}
		result += '&';
		if (isShareFolder && key.toLocaleLowerCase() === 'policy') {
			continue;
		}
		if(allowedResourceParameterNames.indexOf(key.toLowerCase())>=0 || key.toLowerCase().indexOf(this.signatureContext.headerPrefix) === 0){
			flag = true;
			let _val = val ? key + '=' + decodeURIComponent(val) : key;
			_resource.push(_val);
		}
	}
	_resource = _resource.join('&');
	if(flag){
		_resource = '?' + _resource;
	}
	resource += _resource;

	let stringToSign = [method];
	stringToSign.push('\n');
	
	if('content-md5' in interestHeaders){
		stringToSign.push(interestHeaders['content-md5']);
	}
	stringToSign.push('\n');
	
	if('content-type' in interestHeaders){
		stringToSign.push(interestHeaders['content-type']);
	}

	stringToSign.push('\n');
	if (isShareFolder) {
		stringToSign.push(policy);
	} else {
		stringToSign.push(String(expires));
	}

	stringToSign.push('\n');

	let temp = [];
	let i = 0;
	for(let key in interestHeaders){
		if ({}.hasOwnProperty.call(interestHeaders, key)){
			if (key.length > this.signatureContext.headerPrefix.length && key.slice(0, this.signatureContext.headerPrefix.length) === this.signatureContext.headerPrefix){
				temp[i++] = key;
			}
		}
	}
	temp = temp.sort();
	for(let j=0;j<temp.length;j++){
		stringToSign.push(temp[j]);
		stringToSign.push(':');
		stringToSign.push(interestHeaders[temp[j]]);
		stringToSign.push('\n');
	}

	if (!isShareFolder) {
		stringToSign.push(resource);
	} else {
		stringToSign.push(_resource);
	}

	let hmac = crypto.createHmac('sha1', this.sk);
	hmac.update(stringToSign.join(''));
	if (policy && prefix) {
		result += 'Signature=' + encodeURIWithSafe(hmac.digest('base64'));
	} else {
		result += 'Signature=' + encodeURIWithSafe(hmac.digest('base64'), '/');
	}

	return {
		ActualSignedRequestHeaders : headers,
		SignedUrl : (this.isSecure ? 'https' : 'http') + '://' + host + ':' + this.port + result
	};
};

Utils.prototype.createV4SignedUrlSync = function(param){
	param = param || {};

	let method = param.Method ? String(param.Method) : 'GET';
	let bucketName = param.Bucket ? String(param.Bucket) : null;
	let objectKey = param.Key ? String(param.Key) : null;
	let specialParam = param.SpecialParam ? String(param.SpecialParam) : null;
	
	if(specialParam === 'storageClass'){
		specialParam = 'storagePolicy';
	}

	let expires = param.Expires ? parseInt(param.Expires, 10) : 300;
	let headers = {};
	if(param.Headers && (param.Headers instanceof Object) && !(param.Headers instanceof Array)){
		for(let key in param.Headers){
			if ({}.hasOwnProperty.call(param.Headers, key)) {
				headers[key] = param.Headers[key];
			}
		}
	}
	
	let queryParams = {};
	if(param.QueryParams && (param.QueryParams instanceof Object) && !(param.QueryParams instanceof Array)){
		for(let key in param.QueryParams){
			if ({}.hasOwnProperty.call(param.QueryParams, key)) {
				queryParams[key] = param.QueryParams[key];
			}
		}
	}
	
	if(this.securityToken && !queryParams[this.signatureContext.headerPrefix + 'security-token']){
		queryParams[this.signatureContext.headerPrefix + 'security-token'] = this.securityToken;
	}
			
	let result = '';
	let resource = '';
	let host = this.server;
	if(bucketName){
		if(this.pathStyle){
			result += '/' + bucketName;
			resource += '/' + bucketName;
		}else{
			host = bucketName + '.' + host;
		}
	}
	
	if(objectKey){
		objectKey = encodeURIWithSafe(objectKey, '/');
		result += '/' + objectKey;
		resource += '/' + objectKey;
	}
	
	if(resource === ''){
		resource = '/';
	}
	
	result += '?';
	
	if(specialParam){
		queryParams[specialParam] = '';
	}
	
	if(expires < 0){
		expires = 300;
	}

	let utcDateStr = headers.date || headers.Date || new Date().toUTCString();
	
	let dates = getDates(utcDateStr);
	let shortDate = dates[0];
	let longDate = dates[1];
	
	headers.Host = host + ((this.port === 80 || this.port === 443) ? '' : ':' + this.port);
	
	
	queryParams['X-Amz-Algorithm'] = 'AWS4-HMAC-SHA256';
	queryParams['X-Amz-Credential'] = this.ak + '/' + shortDate + '/' + this.region + '/s3/aws4_request';
	queryParams['X-Amz-Date'] = longDate;
	queryParams['X-Amz-Expires'] = String(expires);
	
    let signedAndCanonicalHeaders = getSignedAndCanonicalHeaders(headers);
	
	queryParams['X-Amz-SignedHeaders'] = signedAndCanonicalHeaders[0];
	
	let _queryParams = {};
	let queryParamsKeys = [];
	for(let key in queryParams){
		if ({}.hasOwnProperty.call(queryParams, key)){
			let val = queryParams[key];
			key = encodeURIWithSafe(key, '/');
			val = encodeURIWithSafe(val);
			_queryParams[key] = val;
			queryParamsKeys.push(key);
			result += key;
			if(val){
				result += '=' + val;
			}
			result += '&';
		}
	}
	
	let canonicalQueryString = '';
	
	queryParamsKeys.sort();
	
	for(let i=0;i<queryParamsKeys.length;){
		canonicalQueryString += queryParamsKeys[i] + '=' + _queryParams[queryParamsKeys[i]];
		if(++i !== queryParamsKeys.length){
			canonicalQueryString += '&';
		}
	}
	
	let canonicalRequest = method + '\n';
	canonicalRequest += resource +  '\n';
	canonicalRequest += canonicalQueryString + '\n';
	canonicalRequest += signedAndCanonicalHeaders[1] + '\n';
	canonicalRequest += signedAndCanonicalHeaders[0] + '\n';
	canonicalRequest += 'UNSIGNED-PAYLOAD';
	
	let signature = getV4Signature(shortDate, longDate, this.sk, this.region, canonicalRequest);
	
	result += 'X-Amz-Signature=' + encodeURIWithSafe(signature);
	
	return {
		ActualSignedRequestHeaders : headers,
		SignedUrl : (this.isSecure ? 'https' : 'http') + '://' + host + ':' + this.port + result
	};
			
};


Utils.prototype.createPostSignatureSync = function(param){
	
	if(this.signatureContext.signature === 'v4'){
		return this.createV4PostSignatureSync(param);
	}
	
	param = param || {};
	let bucketName = param.Bucket ? String(param.Bucket) : null;
	let objectKey = param.Key ? String(param.Key) : null;
	let expires = param.Expires ? parseInt(param.Expires, 10) : 300;
	let formParams = {};
	
	if(param.FormParams && (param.FormParams instanceof Object) && !(param.FormParams instanceof Array)){
		for(let key in param.FormParams){
			if ({}.hasOwnProperty.call(param.FormParams, key)){
				formParams[key] = param.FormParams[key];
			}
		}
	}
	
	if(this.securityToken && !formParams[this.signatureContext.headerPrefix + 'security-token']){
		formParams[this.signatureContext.headerPrefix + 'security-token'] = this.securityToken;
	}
	
	let expireDate = new Date();
	expireDate.setTime(parseInt(new Date().getTime(), 10) + expires * 1000);
	expireDate = getExpireDate(expireDate.toUTCString());
	
	if(bucketName){
		formParams.bucket = bucketName;
	}
	
	if(objectKey){
		formParams.key = objectKey;
	}
	
	let policy = [];
	policy.push('{"expiration":"');
	policy.push(expireDate);
	policy.push('", "conditions":[');
	
	let matchAnyBucket = true;
	let matchAnyKey = true;
	
	let conditionAllowKeys = ['acl', 'bucket', 'key', 'success_action_redirect', 'redirect', 'success_action_status'];
	
	for(let key in formParams){
		if ({}.hasOwnProperty.call(formParams, key)){
			if(!key){
				continue;
			}
			let val = formParams[key];
			key = String(key).toLowerCase();

			if(key === 'bucket'){
				matchAnyBucket = false;
			}else if(key === 'key'){
				matchAnyKey = false;
			}

			if(allowedResponseHttpHeaderMetadataNames.indexOf(key) < 0 && conditionAllowKeys.indexOf(key) < 0 && key.indexOf(this.signatureContext.headerPrefix) !== 0){
				continue;
			}

			policy.push('{"');
			policy.push(key);
			policy.push('":"');
			policy.push(val !== null ? String(val) : '');
			policy.push('"},');
		}
	}
	
	
	if(matchAnyBucket){
		policy.push('["starts-with", "$bucket", ""],');
	}
	
	if(matchAnyKey){
		policy.push('["starts-with", "$key", ""],');
	}
	
	// 去除末尾的逗号
	let originPolicy = policy.join('').replace(/,$/, '') + ']}';
	
	policy = Buffer.from(originPolicy,'utf8').toString('base64');
	
	let signature = crypto.createHmac('sha1', this.sk).update(policy).digest('base64');
	
	return {
		OriginPolicy : originPolicy,
		Policy : policy,
		Signature : signature,
		Token : this.ak + ':' + signature + ':' + policy
	};
};


Utils.prototype.createV4PostSignatureSync = function(param){
	param = param || {};
	
	let bucketName = param.Bucket ? String(param.Bucket) : null;
	let objectKey = param.Key ? String(param.Key) : null;
	let expires = param.Expires ? parseInt(param.Expires, 10) : 300;
	let formParams = {};
	
	if(param.FormParams && (param.FormParams instanceof Object) && !(param.FormParams instanceof Array)){
		for(let key in param.FormParams){
			if ({}.hasOwnProperty.call(param.FormParams, key)) {
				formParams[key] = param.FormParams[key];
			}
		}
	}
	
	if(this.securityToken && !formParams[this.signatureContext.headerPrefix + 'security-token']){
		formParams[this.signatureContext.headerPrefix + 'security-token'] = this.securityToken;
	}
	
	let utcDateStr = new Date().toUTCString();
	let dates = getDates(utcDateStr);
	let shortDate = dates[0];
	let longDate = dates[1];
	
	let credential = this.ak + '/' + shortDate + '/' + this.region + '/s3/aws4_request';
	
	let expireDate = new Date();
	expireDate.setTime(parseInt(new Date().getTime(), 10) + expires * 1000);
	
	expireDate = getExpireDate(expireDate.toUTCString());
	
	formParams['X-Amz-Algorithm'] = 'AWS4-HMAC-SHA256';
	formParams['X-Amz-Date'] = longDate;
	formParams['X-Amz-Credential'] = credential;
	
	if(bucketName){
		formParams.bucket = bucketName;
	}
	
	if(objectKey){
		formParams.key = objectKey;
	}
	
	let policy = [];
	policy.push('{"expiration":"');
	policy.push(expireDate);
	policy.push('", "conditions":[');
	
	let matchAnyBucket = true;
	let matchAnyKey = true;
	
	let conditionAllowKeys = ['acl', 'bucket', 'key', 'success_action_redirect', 'redirect', 'success_action_status'];
	
	for(let key in formParams){
		if(!key){
			continue;
		}
		let val = formParams[key];
		key = String(key).toLowerCase();
		
		if(key === 'bucket'){
			matchAnyBucket = false;
		}else if(key === 'key'){
			matchAnyKey = false;
		}
		
		if(allowedResponseHttpHeaderMetadataNames.indexOf(key) < 0 && conditionAllowKeys.indexOf(key) < 0 && key.indexOf(this.signatureContext.headerPrefix) !== 0){
			continue;
		}
		
		policy.push('{"');
		policy.push(key);
		policy.push('":"');
		policy.push(val !== null ? String(val) : '');
		policy.push('"},');
	}
	
	if(matchAnyBucket){
		policy.push('["starts-with", "$bucket", ""],');
	}
	
	if(matchAnyKey){
		policy.push('["starts-with", "$key", ""],');
	}
	
	policy.push(']}');
	
	let originPolicy = policy.join('');
	
	policy = Buffer.from(originPolicy,'utf8').toString('base64');
	
	let signature = createV4Signature(shortDate, this.sk, this.region, policy);
	
	return {
		OriginPolicy : originPolicy,
		Policy : policy,
		Algorithm : formParams['X-Amz-Algorithm'],
		Credential : formParams['X-Amz-Credential'],
		Date : formParams['X-Amz-Date'],
		Signature : signature
	};
};

module.exports = Utils;
