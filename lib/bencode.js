/* This code is a courtesy of Demon (www.demon.tw) */


/*
 * Author: Demon
 * Website: http://demon.tw
 * Email: 380401911@qq.com
 */
function decode_int(x, f) {
    f++;
    var newf = x.indexOf('e', f);
    var n = parseInt(x.substring(f,newf));
    if (x.charAt(f) == '-' && x.charAt(f+1) == '0') {
        throw("ValueError");
    } else if (x.charAt(f) == '0' && newf != f+1) {
        throw("ValueError");
    }
    return [n, newf+1];
}

function decode_string(x, f) {
    var colon = x.indexOf(':', f);
    var n = parseInt(x.substring(f,colon));
    if (x.charAt(f) == '0' && colon != f+1) {
        throw("ValueError");
    }
    colon++;
    return [x.substring(colon,colon+n), colon+n];
}

function decode_list(x, f) {
    var r = []; f++;
    while (x.charAt(f) != 'e') {
        var a = decode_func[x.charAt(f)](x, f);
        var v = a[0]; f = a[1];
        r.push(v);
    }
    return [r, f + 1];
}

function decode_dict(x, f) {
    var r = {}; f++;
    while (x.charAt(f) != 'e') {
        var a = decode_string(x, f);
        var k = a[0]; f = a[1];
        a = decode_func[x.charAt(f)](x, f)
        r[k] = a[0]; f = a[1];
    }
    return [r, f + 1];
}

decode_func = {};
decode_func['l'] = decode_list;
decode_func['d'] = decode_dict;
decode_func['i'] = decode_int;
decode_func['0'] = decode_string;
decode_func['1'] = decode_string;
decode_func['2'] = decode_string;
decode_func['3'] = decode_string;
decode_func['4'] = decode_string;
decode_func['5'] = decode_string;
decode_func['6'] = decode_string;
decode_func['7'] = decode_string;
decode_func['8'] = decode_string;
decode_func['9'] = decode_string;

// x is a string containing bencoded data, 
// where each charCodeAt value matches the byte of data
exports.decode = function bdecode(x) {
    try {
        var a = decode_func[x.charAt(0)](x, 0);
        var r = a[0]; var l = a[1];
    } catch(e) {
        throw("not a valid bencoded string");
    }
    if (l != x.length) {
        throw("invalid bencoded value (data after valid prefix)");
    }
    return r;
}

/*
 * Author: Demon
 * Website: http://demon.tw
 * Email: 380401911@qq.com
 */

function encode_int(x,r) {
    r.push('i'); r.push(x+''); r.push('e');
}

function encode_string(x,r) {
    r.push(x.length+''); r.push(':'); r.push(x);
}

function encode_list(x,r) {
    r.push('l');
    for (var i in x){
        var type = typeof(x[i]);
        type = (type == 'object') ? ((x[i] instanceof Array) ? 'list' : 'dict') : type;
        encode_func[type](x[i], r)
    }
    r.push('e');
}

function encode_dict(x,r) {
    r.push('d');
    var keys = [], ilist = {};
    for (var i in x) {
        keys.push(i);
    }
    keys.sort();
    for (var j in keys) {
        ilist[keys[j]] = x[keys[j]];
    }
    for (var k in ilist) {
        r.push(k.length+''); r.push(':'); r.push(k);
        var v = ilist[k];
        var type = typeof(v);
        type = (type == 'object') ? ((v instanceof Array) ? 'list' : 'dict') : type;
        encode_func[type](v, r);
    }
    r.push('e');
}

encode_func = {};
encode_func['number']  = encode_int;
encode_func['string']  = encode_string;
encode_func['list']    = encode_list;
encode_func['dict']    = encode_dict;

exports.encode = function bencode(x) {
    var r = [];
    var type = typeof(x);
    type = (type == 'object') ? ((x instanceof Array) ? 'list' : 'dict') : type;
    encode_func[type](x, r);
    return r.join('');
}


